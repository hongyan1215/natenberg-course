"""Financial and timing contracts for generated narrated lesson media."""
import importlib.util
import json
import math
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("video_render", ROOT / "tools/video_render.py")
video = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = video
spec.loader.exec_module(video)


@pytest.fixture
def episode():
    return {"id": "ch01", "chapter": "ch01", "title": "第一個選擇權", "summary": "分清價值與損益。", "scenes": [{"title": "方向對了也可能賠錢", "narration": "買權給你買進的權利，但還要扣除權利金。標的漲到一百零三，履約價一百，權利金五元，到期仍然虧損兩元。", "bullets": ["履約價 100", "權利金 5"], "visual": {"type": "payoff", "position": "long-call", "spots": [60, 100, 140]}}], "question": {"prompt": "到期價格 103，淨損益是多少？", "choices": ["3", "−2"], "answer": 1, "explanation": "3 − 5 = −2。"}, "sources": ["https://example.com/options"]}


def test_four_option_positions_include_premium_and_have_correct_tails():
    for spot in (0, 95, 100, 103, 105, 110, 1000):
        for kind in ("call", "put"):
            long = video.expiry_profit(f"long-{kind}", spot)
            short = video.expiry_profit(f"short-{kind}", spot)
            assert long + short == 0
            assert long >= -5
    assert video.expiry_profit("long-call", 103) == -2
    assert video.expiry_profit("long-put", 0) == 95
    assert video.expiry_profit("short-put", 0) == -95
    assert video.expiry_profit("short-call", 1000) == -895


def test_source_validation_rejects_invalid_answers_and_nonfinite_charts(episode):
    video.validate_episode(episode)
    episode["question"]["answer"] = 5
    with pytest.raises(ValueError, match="answer index"):
        video.validate_episode(episode)
    episode["question"]["answer"] = 1
    episode["scenes"][0]["visual"]["spots"] = [100, math.nan]
    with pytest.raises(ValueError, match="finite"):
        video.validate_episode(episode)


def test_script_load_rejects_duplicate_chapters(tmp_path, episode):
    source = tmp_path / "lessons.json"
    source.write_text(json.dumps({"version": 1, "episodes": [episode, episode]}, ensure_ascii=False))
    with pytest.raises(ValueError, match="unique"):
        video.load_episodes(source)


def test_scene_timeline_never_truncates_audio_and_aligns_to_frames():
    for audio in (0.5, 12.123, 15.1, 23.874):
        duration = video.scene_seconds(audio, 15, 12)
        assert duration >= audio + video.HEAD_SECONDS + 0.35
        assert duration <= audio + video.HEAD_SECONDS + 2 + 1 / 12
        assert duration * 12 == pytest.approx(round(duration * 12))
    with pytest.raises(ValueError):
        video.scene_seconds(math.nan, 15, 12)


def test_subtitles_are_ordered_inside_measured_scene_duration(episode, tmp_path):
    narration = episode["scenes"][0]["narration"]
    cues = video.subtitle_cues(narration, 12.5, 15, offset=30)
    assert cues[0]["start"] == pytest.approx(30.2)
    assert cues[-1]["end"] < 45
    assert "".join(cue["text"] for cue in cues) == narration
    for left, right in zip(cues, cues[1:]):
        assert left["start"] < left["end"] == pytest.approx(right["start"])
    assert all(len(cue["text"]) <= 28 for cue in cues)
    path = tmp_path / "captions.vtt"
    video.write_vtt(path, cues)
    assert path.read_text().startswith("WEBVTT\n\n00:00:30.200 -->")
    assert video.vtt_timestamp(3661.125) == "01:01:01.125"


def test_build_hash_changes_with_content_or_voice(episode):
    initial = video.input_hash(episode, video.RenderConfig())
    assert initial == video.input_hash(episode, video.RenderConfig())
    episode["scenes"][0]["narration"] += "請自己算一次。"
    assert initial != video.input_hash(episode, video.RenderConfig())
    assert video.input_hash(episode, video.RenderConfig()) != video.input_hash(episode, video.RenderConfig(rate="-5%"))


@pytest.mark.parametrize("visual", [
    {"type": "payoff", "position": "long-call", "spots": [60, 100, 140]},
    {"type": "cards", "labels": ["權利", "義務"], "values": [1, 0]},
    {"type": "bars", "labels": ["到期給付", "權利金"], "values": [3, -5]},
    {"type": "timeline", "labels": ["今天", "到期"], "values": [100, 105]},
    {"type": "curve", "labels": ["低", "中", "高"], "values": [-2, 0, 3]},
    {"type": "tree", "labels": ["今天", "下跌", "上漲"], "values": [100, 80, 120]},
])
def test_scene_is_actually_animated_without_changing_layout(episode, visual):
    episode["scenes"][0]["visual"] = visual
    config = video.RenderConfig()
    cues = video.subtitle_cues(episode["scenes"][0]["narration"], 12.5, 15)
    painter = video.ScenePainter(episode, episode["scenes"][0], 0, 1, config, cues)
    first = painter.frame(1, 15, 0.1)
    later = painter.frame(11, 15, 0.7)
    assert first.size == later.size == (960, 540)
    assert first.crop(painter.bounds).tobytes() != later.crop(painter.bounds).tobytes()


def test_bar_charts_reject_unreadable_row_counts(episode):
    episode["scenes"][0]["visual"] = {"type": "bars", "labels": list("ABCDE"), "values": [1, 2, 3, 4, 5]}
    with pytest.raises(ValueError, match="at most four"):
        video.validate_episode(episode)


def test_quantitative_curves_use_actual_spacing_and_fixed_scenario(episode):
    visual = {"type": "curve", "labels": ["S80", "S90", "S95", "S97", "S100", "S110"], "values": [-7, -7, -2, 0, 3, 3], "x": [80, 90, 95, 97, 100, 110], "focus": 95, "unit": "元"}
    episode["scenes"][0]["visual"] = visual
    video.validate_episode(episode)
    painter = video.ScenePainter(episode, episode["scenes"][0], 0, 1, video.RenderConfig(), [])
    assert painter.chart_x == visual["x"]
    assert painter.focus_x == 95 and painter.focus_y == -2
    assert painter.focus_label == "S95｜-2元"
    assert video.curve_value(visual["x"], visual["values"], 96) == -1
    assert (painter.xy(95, 0)[0] - painter.xy(90, 0)[0]) / (painter.xy(97, 0)[0] - painter.xy(95, 0)[0]) == pytest.approx(2.5)
    visual["x"] = [80, 90, 95, 95, 100, 110]
    with pytest.raises(ValueError, match="strictly increase"):
        video.validate_episode(episode)


def test_payoff_focus_value_stays_aligned_with_narrated_example(episode):
    episode["scenes"][0]["visual"]["focus"] = 110
    painter = video.ScenePainter(episode, episode["scenes"][0], 0, 1, video.RenderConfig(), [])
    assert painter.focus_x == 110 and painter.focus_y == 5
    assert painter.focus_label == "股價110｜損益+5元"


def test_voice_metadata_never_claims_local_speech_is_neural():
    assert video.RenderConfig().voice_metadata()["engine"] == "edge-tts"
    local = video.RenderConfig(tts_engine="say", voice="Meijia").voice_metadata()
    assert local["engine"] == "macOS say"
    assert local["name"] == "Meijia"
    assert local["rate"] == "166 words/min"
