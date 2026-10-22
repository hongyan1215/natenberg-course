"""Render narrated, animated Chinese lessons without a browser or slide service.

The public build entry point is build_videos.py. Audio is measured before video
frames are generated, so MP4, WebVTT and burned subtitles share one timeline.
"""
from __future__ import annotations

import asyncio
from bisect import bisect_right
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
HEAD_SECONDS = 0.2
COLORS = {
    "cream": "#F5F2E9", "paper": "#FFFDF7", "green": "#205E53",
    "soft": "#E5EFE7", "ink": "#213E37", "muted": "#687A71",
    "line": "#D6DFD4", "orange": "#AC5C38", "pale": "#EEE9DD",
}
VISUAL_TYPES = {"cards", "payoff", "bars", "timeline", "curve", "tree"}
POSITIONS = {"long-call", "long-put", "short-call", "short-put"}


@dataclass(frozen=True)
class RenderConfig:
    width: int = 960
    height: int = 540
    fps: int = 12
    voice: str = "zh-TW-HsiaoChenNeural"
    rate: str = "-8%"
    tts_engine: str = "edge"
    minimum_seconds: float = 60.0
    crf: int = 26

    def validate(self) -> None:
        if (self.width, self.height) != (960, 540):
            raise ValueError("This readable layout requires 960×540 output")
        if not 4 <= self.fps <= 30:
            raise ValueError("fps must be between 4 and 30")
        if self.tts_engine not in {"edge", "say"}:
            raise ValueError("tts_engine must be edge or say")
        if not re.fullmatch(r"[+-]?\d+%", self.rate):
            raise ValueError("rate must be a percentage such as -8%")
        if not -50 <= int(self.rate.rstrip("%")) <= 100:
            raise ValueError("rate must be between -50% and +100%")
        if not 1 <= self.minimum_seconds <= 300:
            raise ValueError("minimum_seconds must be between 1 and 300")

    def voice_metadata(self) -> dict[str, str]:
        if self.tts_engine == "edge":
            return {"name": self.voice, "engine": "edge-tts", "rate": self.rate, "locale": "zh-TW"}
        return {"name": self.voice, "engine": "macOS say", "rate": f"{self.say_rate()} words/min", "locale": "zh-TW"}

    def say_rate(self) -> int:
        return round(180 * (1 + int(self.rate.rstrip("%")) / 100))


def _finite_numbers(value: Any, label: str) -> list[float]:
    if not isinstance(value, list) or any(isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n) for n in value):
        raise ValueError(f"{label} must contain finite numbers")
    return value


def validate_episode(episode: Any) -> None:
    if not isinstance(episode, dict) or not re.fullmatch(r"(?:ch\d{2}|appB)", str(episode.get("id", ""))):
        raise ValueError("Every episode needs a safe chapter id such as ch01 or appB")
    key = episode["id"]
    for field in ("chapter", "title", "summary"):
        if not isinstance(episode.get(field), str) or not episode[field].strip():
            raise ValueError(f"{key}.{field} must be nonempty text")
    scenes = episode.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise ValueError(f"{key} needs at least one narrated scene")
    for index, scene in enumerate(scenes):
        prefix = f"{key}.scenes[{index}]"
        if not isinstance(scene, dict):
            raise ValueError(f"{prefix} must be an object")
        for field in ("title", "narration"):
            if not isinstance(scene.get(field), str) or not scene[field].strip():
                raise ValueError(f"{prefix}.{field} must be nonempty text")
        bullets = scene.get("bullets", [])
        if not isinstance(bullets, list) or len(bullets) > 3 or any(not isinstance(item, str) or not item.strip() for item in bullets):
            raise ValueError(f"{prefix}.bullets must have at most three text items")
        visual = scene.get("visual", {})
        if not isinstance(visual, dict) or visual.get("type") not in VISUAL_TYPES:
            raise ValueError(f"{prefix}.visual.type is unsupported")
        labels = visual.get("labels", [])
        if not isinstance(labels, list) or any(not isinstance(item, str) for item in labels):
            raise ValueError(f"{prefix}.visual.labels must be text")
        values = _finite_numbers(visual.get("values", []), prefix + ".visual.values")
        if visual["type"] in {"bars", "curve"} and (len(values) < 2 or len(labels) != len(values)):
            raise ValueError(f"{prefix}: bars and curves need aligned labels and values")
        if visual["type"] == "curve" and "x" in visual:
            coordinates = _finite_numbers(visual["x"], prefix + ".visual.x")
            if len(coordinates) != len(values) or any(right <= left for left, right in zip(coordinates, coordinates[1:])):
                raise ValueError(f"{prefix}: curve x coordinates must align with values and strictly increase")
        if visual["type"] == "bars" and len(values) > 4:
            raise ValueError(f"{prefix}: readable bars support at most four rows")
        if visual["type"] in {"cards", "timeline"} and not 1 <= len(labels) <= 5:
            raise ValueError(f"{prefix}: cards and timelines need one to five labels")
        if visual["type"] == "tree" and (len(values) != 3 or len(labels) != 3):
            raise ValueError(f"{prefix}: tree needs start, down and up labels and values")
        if visual["type"] == "payoff":
            if visual.get("position", "long-call") not in POSITIONS:
                raise ValueError(f"{prefix}: unknown payoff position")
            for field, default in (("strike", 100), ("premium", 5)):
                value = visual.get(field, default)
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                    raise ValueError(f"{prefix}.{field} must be a finite nonnegative number")
            spots = _finite_numbers(visual.get("spots", [60, 100, 140]), prefix + ".visual.spots")
            if len(spots) < 2 or min(spots) < 0 or max(spots) <= min(spots):
                raise ValueError(f"{prefix}: payoff spots need a nonnegative price range")
        if visual["type"] in {"payoff", "curve"} and "focus" in visual:
            focus = visual["focus"]
            coordinates = visual.get("spots", [60, 100, 140]) if visual["type"] == "payoff" else visual.get("x", list(range(len(values))))
            if isinstance(focus, bool) or not isinstance(focus, (int, float)) or not math.isfinite(focus) or not min(coordinates) <= focus <= max(coordinates):
                raise ValueError(f"{prefix}: focus must be a finite coordinate inside the plotted range")
    question = episode.get("question", {})
    if not isinstance(question, dict):
        raise ValueError(f"{key}.question must be an object")
    choices = question.get("choices", []) if isinstance(question, dict) else []
    answer = question.get("answer") if isinstance(question, dict) else None
    if not isinstance(question.get("prompt"), str) or not isinstance(choices, list) or len(choices) < 2 or any(not isinstance(choice, str) for choice in choices) or isinstance(answer, bool) or not isinstance(answer, int) or not 0 <= answer < len(choices) or not isinstance(question.get("explanation"), str):
        raise ValueError(f"{key}.question needs a prompt, choices, valid answer index and explanation")
    if not isinstance(episode.get("sources"), list) or any(not isinstance(url, str) or not url.startswith("https://") for url in episode["sources"]):
        raise ValueError(f"{key}.sources must be HTTPS references")


def load_episodes(path: Path) -> list[dict[str, Any]]:
    source = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(source, dict) or source.get("version") != 1 or not isinstance(source.get("episodes"), list) or not source["episodes"]:
        raise ValueError("Video source must have version 1 and a nonempty episodes list")
    episodes = source["episodes"]
    for episode in episodes:
        validate_episode(episode)
    if len({episode["id"] for episode in episodes}) != len(episodes):
        raise ValueError("Episode ids must be unique")
    return episodes


def input_hash(episode: dict[str, Any], config: RenderConfig) -> str:
    sources = Path(__file__).read_bytes() + (Path(__file__).parent / "build_videos.py").read_bytes()
    data = json.dumps({"episode": episode, "config": config.__dict__}, ensure_ascii=False, sort_keys=True).encode()
    return hashlib.sha256(sources + data).hexdigest()


def expiry_profit(position: str, spot: float, strike: float = 100, premium: float = 5) -> float:
    if position not in POSITIONS:
        raise ValueError("Unknown option position")
    intrinsic = max(spot - strike, 0) if position.endswith("call") else max(strike - spot, 0)
    return intrinsic - premium if position.startswith("long") else premium - intrinsic


def curve_value(coordinates: list[float], values: list[float], focus: float) -> float:
    """Interpolate against real x distances, never ordinal positions of labels."""
    index = min(len(coordinates) - 2, max(0, bisect_right(coordinates, focus) - 1))
    fraction = (focus - coordinates[index]) / (coordinates[index + 1] - coordinates[index])
    return values[index] + (values[index + 1] - values[index]) * fraction


def probe_media(path: Path) -> dict[str, Any]:
    command = ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,pix_fmt,sample_rate", "-of", "json", str(path)]
    return json.loads(subprocess.check_output(command, text=True))


def audio_duration(path: Path) -> float:
    duration = float(probe_media(path)["format"]["duration"])
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError(f"Audio has invalid duration: {path}")
    return duration


def scene_seconds(audio_seconds: float, minimum: float, fps: int) -> float:
    if not math.isfinite(audio_seconds) or audio_seconds <= 0:
        raise ValueError("Narration duration must be positive")
    requested = min(minimum, audio_seconds + HEAD_SECONDS + 2)
    return math.ceil(max(audio_seconds + HEAD_SECONDS + 0.35, requested) * fps) / fps


def split_narration(text: str, limit: int = 28) -> list[str]:
    clauses = re.findall(r"[^，。！？；：、,.!?;:\n]+[，。！？；：、,.!?;:]?", text.strip())
    return [clause.strip()[start:start + limit] for clause in clauses for start in range(0, len(clause.strip()), limit) if clause.strip()[start:start + limit]]


def subtitle_cues(text: str, audio_seconds: float, total_seconds: float, offset: float = 0) -> list[dict[str, Any]]:
    phrases = split_narration(text)
    weights = [max(1, len(re.sub(r"\W", "", phrase))) for phrase in phrases]
    total_weight = sum(weights)
    cursor = offset + HEAD_SECONDS
    cues = []
    for index, (phrase, weight) in enumerate(zip(phrases, weights)):
        end = cursor + audio_seconds * weight / total_weight
        if index == len(phrases) - 1:
            end = offset + total_seconds - 0.08
        cues.append({"start": cursor, "end": end, "text": phrase})
        cursor = end
    return cues


def vtt_timestamp(seconds: float) -> str:
    milliseconds = round(max(0, seconds) * 1000)
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    whole, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{whole:02}.{milliseconds:03}"


def write_vtt(path: Path, cues: list[dict[str, Any]]) -> None:
    lines = ["WEBVTT", ""]
    for cue in cues:
        lines.extend([f"{vtt_timestamp(cue['start'])} --> {vtt_timestamp(cue['end'])}", cue["text"].replace("-->", "→"), ""])
    path.write_text("\n".join(lines), encoding="utf-8")


def _checked_run(command: list[str]) -> None:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"{command[0]} failed: {result.stderr[-4000:]}")


def synthesize_audio(text: str, config: RenderConfig, cache_dir: Path) -> Path:
    identity = json.dumps({"text": text, "voice": config.voice_metadata()}, ensure_ascii=False, sort_keys=True)
    suffix = ".mp3" if config.tts_engine == "edge" else ".aiff"
    audio_path = cache_dir / (hashlib.sha256(identity.encode()).hexdigest() + suffix)
    if audio_path.is_file() and audio_path.stat().st_size > 100:
        audio_duration(audio_path)
        return audio_path
    cache_dir.mkdir(parents=True, exist_ok=True)
    temporary = audio_path.with_suffix(".partial" + suffix)
    if config.tts_engine == "edge":
        import edge_tts

        async def generate() -> None:
            await edge_tts.Communicate(text, config.voice, rate=config.rate, connect_timeout=20, receive_timeout=60).save(str(temporary))

        failure = None
        for attempt in range(3):
            try:
                asyncio.run(generate())
                failure = None
                break
            except Exception as error:
                failure = error
                if attempt < 2:
                    time.sleep(attempt + 1)
        if failure is not None:
            raise RuntimeError("Neural narration failed; no fallback voice was substituted. Retry edge or explicitly select --tts-engine say.") from failure
    else:
        if not shutil.which("say"):
            raise RuntimeError("The explicitly selected local say engine is unavailable")
        _checked_run(["say", "-v", config.voice, "-r", str(config.say_rate()), "-o", str(temporary), text])
    audio_duration(temporary)
    os.replace(temporary, audio_path)
    return audio_path


def find_font() -> Path:
    candidates = [os.environ.get("NATENBERG_VIDEO_FONT", ""), "/System/Library/Fonts/STHeiti Medium.ttc", "/System/Library/Fonts/PingFang.ttc", "/System/Library/Fonts/Supplemental/Arial Unicode.ttf", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return Path(candidate)
    raise RuntimeError("A Chinese font is required; set NATENBERG_VIDEO_FONT to a TTF or TTC path")


class ScenePainter:
    """Cache all text/layout once; only geometry and one subtitle band change per frame."""

    def __init__(self, episode: dict[str, Any], scene: dict[str, Any], index: int, total: int, config: RenderConfig, cues: list[dict[str, Any]]) -> None:
        self.scene, self.config, self.cues = scene, config, cues
        self.font_path = str(find_font())
        self.fonts = {size: ImageFont.truetype(self.font_path, size) for size in (24, 26, 28, 32, 34)}
        self.base = Image.new("RGB", (config.width, config.height), COLORS["cream"])
        draw = ImageDraw.Draw(self.base)
        self.text(draw, (40, 21), episode["title"], 26, max_width=720)
        self.text(draw, (824, 23), f"{index + 1:02}/{total:02}", 24, COLORS["muted"])
        self.text(draw, (40, 67), scene["title"], 34, max_width=880)
        for bullet_index, bullet in enumerate(scene.get("bullets", [])):
            self.text(draw, (45, 122 + bullet_index * 32), "· " + bullet, 26, max_width=870)
        self.bounds = (48, 134 + len(scene.get("bullets", [])) * 32, 912, 421)
        draw.rounded_rectangle(self.bounds, radius=16, fill=COLORS["paper"], outline=COLORS["line"], width=2)
        self.visual = scene["visual"]
        self.subtitle_images = [self.subtitle_image(cue["text"]) for cue in cues]
        self.static_visual(draw)

    def text(self, draw: ImageDraw.ImageDraw, xy: tuple[float, float], text: str, size: int = 24, color: str | None = None, max_width: float | None = None, center: bool = False) -> None:
        font = self.fonts[size]
        value = str(text)
        if max_width:
            while value and draw.textlength(value, font=font) > max_width:
                value = value[:-2] + "…" if not value.endswith("…") else value[:-2] + "…"
        if center:
            xy = (xy[0] - draw.textlength(value, font=font) / 2, xy[1])
        draw.text(xy, value, font=font, fill=color or COLORS["ink"])

    def wrapped(self, draw: ImageDraw.ImageDraw, text: str, width: float, size: int = 24) -> list[str]:
        lines, line = [], ""
        for char in str(text):
            if char == "\n" or (line and draw.textlength(line + char, font=self.fonts[size]) > width):
                lines.append(line)
                line = "" if char == "\n" else char
            else:
                line += char
        if line:
            lines.append(line)
        return lines

    def subtitle_image(self, text: str) -> Image.Image:
        band = Image.new("RGB", (960, 96), COLORS["cream"])
        draw = ImageDraw.Draw(band)
        draw.line((40, 1, 920, 1), fill=COLORS["line"], width=1)
        lines = self.wrapped(draw, text, 864, 28)
        if len(lines) > 2:
            raise ValueError("A subtitle exceeds two readable lines; shorten narration phrases")
        y = 13 if len(lines) == 2 else 27
        for line in lines:
            self.text(draw, (480, y), line, 28, center=True)
            y += 35
        return band

    def static_visual(self, draw: ImageDraw.ImageDraw) -> None:
        visual = self.visual
        x0, y0, x1, y1 = self.bounds
        caption = visual.get("caption", "")
        if caption:
            self.text(draw, (480, y1 - 31), str(caption), 24, COLORS["muted"], max_width=800, center=True)
        self.chart_box = (x0 + 65, y0 + 35, x1 - 44, y1 - 68)
        if visual["type"] in {"payoff", "curve"}:
            left, top, right, bottom = self.chart_box
            if visual["type"] == "payoff":
                spots = visual.get("spots", [60, 100, 140])
                lo, hi = min(spots), max(spots)
                self.chart_x = [lo + (hi - lo) * index / 120 for index in range(121)]
                self.chart_y = [expiry_profit(visual.get("position", "long-call"), spot, visual.get("strike", 100), visual.get("premium", 5)) for spot in self.chart_x]
            else:
                self.chart_x = visual.get("x", list(range(len(visual["values"]))))
                self.chart_y = visual["values"]
            self.focus_x = visual.get("focus", self.chart_x[-1])
            self.focus_y = expiry_profit(visual.get("position", "long-call"), self.focus_x, visual.get("strike", 100), visual.get("premium", 5)) if visual["type"] == "payoff" else curve_value(self.chart_x, self.chart_y, self.focus_x)
            lo_y, hi_y = min(0, *self.chart_y), max(0, *self.chart_y)
            if lo_y == hi_y:
                hi_y = lo_y + 1
            padding = (hi_y - lo_y) * 0.15
            self.xy = lambda x, y: (left + (x - self.chart_x[0]) / (self.chart_x[-1] - self.chart_x[0]) * (right - left), bottom - (y - lo_y + padding) / (hi_y - lo_y + 2 * padding) * (bottom - top))
            zero = self.xy(self.chart_x[0], 0)[1]
            draw.line((left, top, left, bottom), fill=COLORS["line"], width=2)
            draw.line((left, zero, right, zero), fill=COLORS["line"], width=2)
            self.text(draw, (left - 34, zero - 14), "0", 24, COLORS["muted"])
            labels = visual.get("labels", [])
            first = f"{self.chart_x[0]:g}" if visual["type"] == "payoff" else labels[0]
            last = f"{self.chart_x[-1]:g}" if visual["type"] == "payoff" else labels[-1]
            self.text(draw, (left, bottom + 4), first, 24, COLORS["muted"], max_width=220)
            self.text(draw, (right, bottom + 4), last, 24, COLORS["muted"], max_width=220, center=True)
            if visual["type"] == "payoff":
                self.text(draw, (x0 + 18, y0 + 4), "到期淨損益", 24, COLORS["muted"])
                self.text(draw, (480, bottom + 4), "到期股價 →", 24, COLORS["muted"], center=True)
                self.focus_label = f"股價{self.focus_x:g}｜損益{self.focus_y:+g}{visual.get('unit', '元')}"
            else:
                focus_index = next((index for index, value in enumerate(self.chart_x) if math.isclose(value, self.focus_x)), None)
                focus_label = labels[focus_index] if focus_index is not None else f"{self.focus_x:g}"
                self.focus_label = f"{focus_label}｜{self.focus_y:g}{visual.get('unit', '')}"
                axis = visual.get("xLabel") or ("標的價格 →" if labels[0].startswith("S") else "履約價 →" if labels[0].startswith("K") else "時間 →" if labels[0] == "現在" else "橫軸 →")
                self.text(draw, (x0 + 18, y0 + 4), visual.get("yLabel", "數值"), 24, COLORS["muted"])
                self.text(draw, (480, bottom + 4), axis, 24, COLORS["muted"], center=True)
            self.text(draw, (x1 - 235, y0 + 4), self.focus_label, 24, COLORS["green"], max_width=440, center=True)
            draw.line([self.xy(x, y) for x, y in zip(self.chart_x, self.chart_y)], fill=COLORS["pale"], width=4)
        useful_bottom = y1 - (43 if caption else 20)
        labels, values = visual.get("labels", []), visual.get("values", [])
        if visual["type"] == "cards":
            self.card_states = []
            for active in range(len(labels)):
                cached = self.base.copy()
                self.draw_cards(ImageDraw.Draw(cached), active)
                self.card_states.append(cached)
        elif visual["type"] == "bars":
            row_height = (useful_bottom - y0 - 15) / len(values)
            for index, (label, value) in enumerate(zip(labels, values)):
                y = y0 + 12 + index * row_height
                self.text(draw, (x0 + 18, y), label, 24, max_width=190)
                self.text(draw, (x1 - 115, y), f"{value:g}{visual.get('unit', '')}", 24, max_width=105)
        elif visual["type"] == "timeline":
            middle = (y0 + useful_bottom) / 2
            self.timeline_x = [x0 + 80 + index * (x1 - x0 - 160) / max(1, len(labels) - 1) for index in range(len(labels))]
            for index, (x, label) in enumerate(zip(self.timeline_x, labels)):
                for row, line in enumerate(self.wrapped(draw, label, 165, 24)[:2]):
                    self.text(draw, (x, middle + 18 + row * 27), line, 24, center=True)
                if index < len(values):
                    self.text(draw, (x, middle - 44), f"{values[index]:g}{visual.get('unit', '')}", 26, COLORS["green"], center=True)
        elif visual["type"] == "tree":
            middle = (y0 + useful_bottom) / 2
            self.tree_xy = [(x0 + 190, middle), (x1 - 210, middle + 35), (x1 - 210, middle - 35)]
            self.tree_states = []
            for active in range(3):
                cached = self.base.copy()
                cached_draw = ImageDraw.Draw(cached)
                for index, ((x, y), label, value) in enumerate(zip(self.tree_xy, labels, values)):
                    cached_draw.rounded_rectangle((x - 100, y - 30, x + 100, y + 30), radius=12, fill=COLORS["soft"] if index == active else COLORS["paper"], outline=COLORS["green"], width=2)
                    self.text(cached_draw, (x, y - 27), label, 24, max_width=190, center=True)
                    self.text(cached_draw, (x, y), f"{value:g}{visual.get('unit', '')}", 26, center=True)
                self.tree_states.append(cached)

    def draw_cards(self, draw: ImageDraw.ImageDraw, active: int) -> None:
        visual = self.visual
        x0, y0, x1, y1 = self.bounds
        labels, values = visual.get("labels", []), visual.get("values", [])
        useful_bottom = y1 - (43 if visual.get("caption") else 20)
        width = (x1 - x0 - 36) / len(labels)
        for index, label in enumerate(labels):
            left, right = x0 + 15 + index * width, x0 + 9 + (index + 1) * width
            box = (left, y0 + 16, right, useful_bottom - 6)
            draw.rounded_rectangle(box, radius=10, fill=COLORS["soft"] if index == active else COLORS["paper"], outline=COLORS["green"] if index == active else COLORS["line"], width=3 if index == active else 1)
            for row, line in enumerate(self.wrapped(draw, label, width - 25, 26)[:2]):
                self.text(draw, ((left + right) / 2, y0 + 33 + row * 31), line, 26, center=True)
            if index < len(values):
                self.text(draw, ((left + right) / 2, useful_bottom - 48), f"{values[index]:g}{visual.get('unit', '')}", 28, COLORS["green"], center=True)

    def frame(self, elapsed: float, duration: float, episode_progress: float) -> Image.Image:
        progress = min(1.0, max(0.0, elapsed / duration))
        visual, kind = self.visual, self.visual["type"]
        labels, values = visual.get("labels", []), visual.get("values", [])
        if kind == "cards":
            frame = self.card_states[min(len(labels) - 1, int(progress * len(labels)))].copy()
        elif kind == "tree":
            frame = self.tree_states[min(2, int(progress * 3))].copy()
        else:
            frame = self.base.copy()
        draw = ImageDraw.Draw(frame)
        x0, y0, x1, y1 = self.bounds
        useful_bottom = y1 - (43 if visual.get("caption") else 20)
        if kind == "bars":
            maximum = max(abs(value) for value in values) or 1
            mixed = min(values) < 0
            bar_left, bar_right = x0 + 245, x1 - 130
            origin = (bar_left + bar_right) / 2 if mixed else bar_left
            extent = (bar_right - bar_left) / 2 if mixed else bar_right - bar_left
            row_height = (useful_bottom - y0 - 15) / len(values)
            for index, (label, value) in enumerate(zip(labels, values)):
                y = y0 + 12 + index * row_height
                length = value / maximum * extent * min(1, progress * 1.8)
                draw.rounded_rectangle((min(origin, origin + length), y + 4, max(origin, origin + length) + 1, y + 26), radius=5, fill=COLORS["green"] if value >= 0 else COLORS["orange"])
            draw.line((origin, y0 + 8, origin, useful_bottom), fill=COLORS["line"], width=2)
        elif kind in {"payoff", "curve"}:
            end = min(len(self.chart_x) - 1 - 1e-9, progress * (len(self.chart_x) - 1))
            index = min(len(self.chart_x) - 2, int(end))
            fraction = end - index
            current_x = self.chart_x[index] + (self.chart_x[index + 1] - self.chart_x[index]) * fraction
            current_y = self.chart_y[index] + (self.chart_y[index + 1] - self.chart_y[index]) * fraction
            points = [self.xy(x, y) for x, y in zip(self.chart_x[:index + 1], self.chart_y[:index + 1])]
            points.append(self.xy(current_x, current_y))
            draw.line(points, fill=COLORS["green"], width=5)
            px, py = self.xy(self.focus_x, self.focus_y)
            radius = 7 + 1.5 * math.sin(elapsed * math.pi)
            draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=COLORS["orange"])
        elif kind == "timeline":
            middle = (y0 + useful_bottom) / 2
            coordinates = self.timeline_x
            draw.line((coordinates[0], middle, coordinates[-1], middle), fill=COLORS["line"], width=5)
            draw.line((coordinates[0], middle, coordinates[0] + progress * (coordinates[-1] - coordinates[0]), middle), fill=COLORS["green"], width=5)
            for index, (x, label) in enumerate(zip(coordinates, labels)):
                active = index <= progress * max(1, len(labels) - 1)
                draw.ellipse((x - 9, middle - 9, x + 9, middle + 9), fill=COLORS["green"] if active else COLORS["line"])
        elif kind == "tree":
            coordinates = self.tree_xy
            for index in (1, 2):
                start = (coordinates[0][0] + 100, coordinates[0][1])
                end = (coordinates[index][0] - 100, coordinates[index][1])
                portion = min(1, progress * 2)
                draw.line((start, (start[0] + (end[0] - start[0]) * portion, start[1] + (end[1] - start[1]) * portion)), fill=COLORS["green"], width=4)
        cue_index = next((index for index, cue in enumerate(self.cues) if cue["start"] <= elapsed < cue["end"]), None)
        if cue_index is not None:
            frame.paste(self.subtitle_images[cue_index], (0, 443))
        draw = ImageDraw.Draw(frame)
        draw.rectangle((0, 536, round(960 * episode_progress), 539), fill=COLORS["green"])
        return frame


def verify_mp4(path: Path) -> float:
    metadata = probe_media(path)
    video = next((stream for stream in metadata.get("streams", []) if stream.get("codec_type") == "video"), {})
    audio = next((stream for stream in metadata.get("streams", []) if stream.get("codec_type") == "audio"), {})
    if video.get("codec_name") != "h264" or video.get("pix_fmt") != "yuv420p" or audio.get("codec_name") != "aac":
        raise RuntimeError(f"Video is not browser-compatible H.264 / yuv420p / AAC: {path}")
    return float(metadata["format"]["duration"])


def render_episode(episode: dict[str, Any], config: RenderConfig, output_dir: Path, work_dir: Path) -> dict[str, Any]:
    validate_episode(episode)
    config.validate()
    identity = input_hash(episode, config)
    work = work_dir / episode["id"] / identity[:16]
    work.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    timing, cues, painters, durations = [], [], [], []
    offset = 0.0
    scene_count = len(episode["scenes"])
    for index, scene in enumerate(episode["scenes"]):
        audio = synthesize_audio(scene["narration"], config, work_dir / "audio")
        spoken = audio_duration(audio)
        duration = scene_seconds(spoken, config.minimum_seconds / scene_count, config.fps)
        local_cues = subtitle_cues(scene["narration"], spoken, duration)
        cues.extend(subtitle_cues(scene["narration"], spoken, duration, offset))
        timing.append({"title": scene["title"], "start": round(offset, 3), "end": round(offset + duration, 3), "narration": scene["narration"]})
        padded = work / f"scene-{index:02}.wav"
        _checked_run(["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-af", f"adelay={round(HEAD_SECONDS * 1000)}:all=1,apad", "-t", str(duration), "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", str(padded)])
        painters.append(ScenePainter(episode, scene, index, scene_count, config, local_cues))
        durations.append(duration)
        offset += duration
    audio_list = work / "audio-list.txt"
    audio_list.write_text("".join(f"file '{(work / f'scene-{index:02}.wav').as_posix().replace(chr(39), chr(39) + chr(92) + chr(39) + chr(39))}'\n" for index in range(scene_count)), encoding="utf-8")
    combined = work / "narration.wav"
    _checked_run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(audio_list), "-c:a", "pcm_s16le", str(combined)])
    video_path = work / "episode.mp4"
    log_path = work / "ffmpeg.log"
    command = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pixel_format", "rgb24", "-video_size", f"{config.width}x{config.height}", "-framerate", str(config.fps), "-i", "pipe:0", "-i", str(combined), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "fast", "-crf", str(config.crf), "-threads", "2", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-ar", "24000", "-movflags", "+faststart", "-shortest", str(video_path)]
    with log_path.open("wb") as log:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=log)
        try:
            completed = 0.0
            for painter, duration in zip(painters, durations):
                for frame_index in range(round(duration * config.fps)):
                    elapsed = frame_index / config.fps
                    frame = painter.frame(elapsed, duration, (completed + elapsed) / offset)
                    process.stdin.write(frame.tobytes())
                completed += duration
            process.stdin.close()
            return_code = process.wait()
        except BaseException:
            process.kill()
            process.wait()
            raise
    if return_code:
        raise RuntimeError(f"Video encoder failed: {log_path.read_text()[-4000:]}")
    duration = verify_mp4(video_path)
    if abs(duration - offset) > 0.3:
        raise RuntimeError(f"Encoded duration differs from the subtitle timeline: {duration} vs {offset}")
    poster = work / "poster.jpg"
    preview = work / "scene-01.png"
    painters[0].frame(min(3.0, durations[0] / 2), durations[0], 0).save(poster, quality=90)
    painters[0].frame(min(3.0, durations[0] / 2), durations[0], 0).save(preview)
    captions = work / "captions.vtt"
    write_vtt(captions, cues)
    for source, suffix in ((video_path, ".mp4"), (poster, ".jpg"), (captions, ".vtt")):
        os.replace(source, output_dir / (episode["id"] + suffix))
    return {"id": episode["id"], "chapter": episode["chapter"], "title": episode["title"], "summary": episode["summary"], "src": f"assets/videos/{episode['id']}.mp4", "captions": f"assets/videos/{episode['id']}.vtt", "poster": f"assets/videos/{episode['id']}.jpg", "duration": round(duration, 3), "scenes": timing, "question": episode["question"], "sources": episode["sources"], "inputHash": identity}
