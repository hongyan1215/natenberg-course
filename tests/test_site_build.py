"""Verify that the learning layer preserves complete lessons and valid course data."""
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build_site", ROOT / "tools/build_site.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def test_all_chapters_have_complete_guides_and_valid_dependencies():
    course = json.loads((ROOT / "site_src/assets/learning/course.json").read_text())
    expected = {f"ch{i:02d}" for i in range(1, 26)} | {"appB"}
    assert set(course["chapters"]) == expected
    keys = [key for module in course["modules"] for key in module["keys"]]
    assert set(keys) == expected and len(keys) == len(set(keys))
    assert len(course["modules"]) == 8
    for key, guide in course["chapters"].items():
        for field in ("question", "goal", "intuition", "example", "misconception"):
            assert isinstance(guide[field], str) and guide[field].strip(), (key, field)
        assert set(guide["prerequisites"]) <= expected - {key}
        if guide.get("tool"):
            assert (ROOT / "site_src" / (guide["tool"].rstrip("/") + ".md")).exists()


def test_guide_insertion_preserves_full_chapter_and_checklist():
    for path in (ROOT / "lessons").glob("*.md"):
        key, title, text = build.convert_lesson(path)
        assert text.count('class="nq-lesson-guide"') == 1
        assert f'data-chapter="{key}"' in text
        assert text.index('nq-lesson-guide') < text.index("## ")
        original = path.read_text()
        assert text.count("- [ ]") == original.count("- [ ]")
        assert "## 核心概念" in text and "## 自我檢核清單" in text
        assert f'data-chapters="{key}"' in text
        assert 'id="chapter-quiz"' in text and 'id="chapter-checklist"' in text


def test_local_markdown_links_exist_after_build():
    for path in (ROOT / "docs").rglob("*.md"):
        for target in re.findall(r"\]\(([^\s)]+\.md)(?:#[^)]*)?\)", path.read_text()):
            if not target.startswith(("http:", "https:")):
                assert (path.parent / target).resolve().exists(), (path, target)
