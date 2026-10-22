"""Release checks for the complete, portable chapter video series."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "site_src/assets/videos"


def load_manifest():
    return json.loads((ASSETS / "manifest.json").read_text())


def test_all_core_chapters_have_real_video_caption_and_poster_files():
    manifest = load_manifest()
    expected = {f"ch{i:02d}" for i in range(1, 26)} | {"appB"}
    episodes = manifest["episodes"]
    assert len(episodes) == 26
    assert {episode["chapter"] for episode in episodes} == expected
    assert len({episode["id"] for episode in episodes}) == 26
    assert manifest["voice"]["locale"] == "zh-TW"
    for episode in episodes:
        assert 30 <= episode["duration"] <= 300, episode["id"]
        for field, suffix in [("src", ".mp4"), ("captions", ".vtt"), ("poster", ".jpg")]:
            rel = episode[field]
            assert re.fullmatch(r"assets/videos/[A-Za-z0-9_-]+" + re.escape(suffix), rel)
            file = ROOT / "site_src" / rel
            assert file.is_file() and file.stat().st_size > 100
        assert (ROOT / "site_src" / episode["src"]).stat().st_size < 40 * 1024 * 1024
        assert (ROOT / "site_src" / episode["poster"]).read_bytes().startswith(b"\xff\xd8")


def test_scene_seek_points_and_reflection_questions_are_valid():
    for episode in load_manifest()["episodes"]:
        scenes = episode["scenes"]
        assert len(scenes) == 6
        previous = 0
        for scene in scenes:
            assert previous <= scene["start"] < scene["end"] <= episode["duration"] + 0.25
            assert scene["title"].strip() and scene["narration"].strip()
            previous = scene["end"]
        q = episode["question"]
        assert q["prompt"].strip() and q["explanation"].strip()
        assert len(q["choices"]) >= 2 and 0 <= q["answer"] < len(q["choices"])


def test_published_transcripts_match_current_storyboards():
    scripts = json.loads((ROOT / "video_src/lessons.json").read_text())
    by_id = {episode["id"]: episode for episode in scripts["episodes"]}
    for episode in load_manifest()["episodes"]:
        script = by_id[episode["id"]]
        assert episode["title"] == script["title"]
        assert episode["summary"] == script["summary"]
        assert episode["question"] == script["question"]
        assert [scene["narration"] for scene in episode["scenes"]] == [scene["narration"] for scene in script["scenes"]]


def test_subtitles_are_nonempty_timed_and_inside_video():
    def seconds(text):
        parts = text.split(":")
        return float(parts[-1]) + int(parts[-2]) * 60 + (int(parts[-3]) * 3600 if len(parts) == 3 else 0)

    for episode in load_manifest()["episodes"]:
        text = (ROOT / "site_src" / episode["captions"]).read_text()
        assert text.startswith("WEBVTT")
        cues = re.findall(r"(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})", text)
        assert len(cues) >= 6
        previous = 0
        for start, end in cues:
            a, b = seconds(start), seconds(end)
            assert previous <= a < b <= episode["duration"] + 0.25
            previous = b
