"""把講義與題庫的專有名詞改成「首次出現：中文（English），之後：English」。

用法：python tools/apply_glossary.py [--check]
術語表在 tools/glossary.tsv；標題、程式碼、數學式、連結網址、HTML 標籤不會改動。
可重複執行：已轉成英文的地方不會再變。
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from build_site import split_math  # noqa: E402

SKIP = ["買賣權類型", "買賣權"]  # 有歧義（buy put / call 與 put），保留中文


def load_glossary():
    terms = []
    for line in (ROOT / "tools" / "glossary.tsv").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        cols = line.split("\t")
        zh, en = cols[0], cols[1]
        note = cols[2] if len(cols) > 2 and cols[2] else en
        terms.append((zh, en, note))
    return terms


TERMS = load_glossary()
EN = {zh: en for zh, en, _ in TERMS}
NOTE = {zh: note for zh, _, note in TERMS}
WORDS = sorted(set(SKIP) | set(EN), key=len, reverse=True)
TERM_RE = re.compile("(?<!目)(?:" + "|".join(map(re.escape, WORDS)) + r")((?:\*\*)?（[A-Za-z][^（）一-鿿]*）)?")
# 文字中不能動的片段：行內程式碼、連結（含文字）、HTML 標籤、網址
PROTECT = re.compile(r"`[^`]*`|\[[^\]]*\]\([^)]*\)|<[^>]+>|https?://\S+")
SPACE_BEFORE = re.compile(r"[一-鿿A-Za-z0-9%)\]]")


class Doc:
    def __init__(self):
        self.seen = set()

    def sub_text(self, s):
        out, pos = [], 0
        for m in PROTECT.finditer(s):
            out.append(self.sub_plain(s[pos:m.start()], "".join(out)))
            out.append(m.group(0))
            pos = m.end()
        out.append(self.sub_plain(s[pos:], "".join(out)))
        return "".join(out)

    def sub_plain(self, s, before=""):
        res = []
        pos = 0
        for m in TERM_RE.finditer(s):
            zh, paren = m.group(0)[: len(m.group(0)) - len(m.group(1) or "")], m.group(1)
            res.append(s[pos:m.start()])
            pos = m.end()
            if zh in SKIP:
                res.append(m.group(0))
                continue
            key = EN[zh]
            if key not in self.seen:
                self.seen.add(key)
                res.append(m.group(0) if paren else f"{zh}（{NOTE[zh]}）")
                continue
            en = key
            bold_end = "**" if paren and paren.startswith("**") else ""  # 保留粗體結尾，丟掉括號
            prev = ("".join(res) or before)[-1:] if ("".join(res) or before) else ""
            nxt = s[pos:pos + 1]
            ctx = "".join(res) or before
            if prev and SPACE_BEFORE.match(prev):
                en = " " + en
            elif ctx.endswith("**") and re.search(r"[\u4e00-\u9fff]\*\*$", ctx) and ctx.count("**") % 2 == 0:
                en = " " + en  # 收尾的粗體後面接英文
            if nxt and re.match(r"[一-鿿A-Za-z0-9]", nxt):
                en = en + " "
            res.append(en.rstrip() + bold_end + (" " if en.endswith(" ") else "") if bold_end else en)
        res.append(s[pos:])
        return "".join(res)

    def sub_line(self, line):
        out = []
        for is_math, seg in split_math_raw(line):
            out.append(seg if is_math else self.sub_text(seg))
        return "".join(out)


def split_math_raw(line):
    """和 build_site.split_math 同樣的判斷，但回傳原始字串（含 $）。"""
    parts, i, start = [], 0, 0
    while i < len(line):
        ch = line[i]
        if ch == "\\":
            i += 2
            continue
        if ch == "$" and not line.startswith("$$", i):
            j = i + 1
            while j < len(line) and not (line[j] == "$" and line[j - 1] != "\\"):
                j += 1
            pieces = split_math(line[i:j + 1]) if j < len(line) else [(False, "")]
            if any(m for m, _ in pieces):
                parts.append((False, line[start:i]))
                parts.append((True, line[i:j + 1]))
                i = start = j + 1
                continue
        i += 1
    parts.append((False, line[start:]))
    return parts


def convert_md(text):
    doc, out, in_code, in_display = Doc(), [], False, False
    for line in text.split("\n"):
        body = line.strip().lstrip("> ").strip()
        if body.startswith("```"):
            in_code = not in_code
        if in_code or body.startswith("```") or line.startswith("#") or body.startswith("<!--"):
            out.append(line)
            continue
        if body == "$$":
            in_display = not in_display
            out.append(line)
            continue
        if in_display or (body.startswith("$$") and body.endswith("$$") and len(body) > 4):
            out.append(line)
            continue
        out.append(doc.sub_line(line))
    return "\n".join(out)


def convert_quiz(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    doc = Doc()

    def walk(x):
        if isinstance(x, str):
            return "\n".join(doc.sub_line(l) for l in x.split("\n"))
        if isinstance(x, list):
            return [walk(v) for v in x]
        if isinstance(x, dict):
            return {k: (v if k in ("id", "type", "answer", "tol") else walk(v)) for k, v in x.items()}
        return x

    items = walk(data)
    return "[\n" + ",\n".join("  " + json.dumps(o, ensure_ascii=False) for o in items) + "\n]\n", data


def math_signature(text):
    return [[s for m, s in split_math(l) if m] for l in text.split("\n")]


def main():
    check = "--check" in sys.argv
    md = sorted((ROOT / "lessons").glob("*.md")) + sorted((ROOT / "prep").glob("*.md"))
    md += [p for p in sorted((ROOT / "site_src").rglob("*.md"))]
    changed = 0
    for p in md:
        old = p.read_text(encoding="utf-8")
        new = convert_md(old)
        assert math_signature(old) == math_signature(new), f"數學式被動到：{p}"
        if new != old:
            changed += 1
            if not check:
                p.write_text(new, encoding="utf-8")
    for p in sorted((ROOT / "quiz" / "bank").glob("*.json")):
        raw = p.read_text(encoding="utf-8")
        new, _ = convert_quiz(p)
        if json.loads(new) != json.loads(raw):
            changed += 1
            if not check:
                p.write_text(new, encoding="utf-8")
    print(f"{'需要更新' if check else '已更新'} {changed} 個檔案")


if __name__ == "__main__":
    main()
