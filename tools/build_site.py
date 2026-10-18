"""把課程素材組成 MkDocs 的 docs/ 目錄。用法：.venv/bin/python tools/build_site.py"""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
REPO_BLOB = "https://github.com/hongyan1215/natenberg-course/blob/main/"
QUIZ_HOOK = "## 本章題庫測驗\n\n點選答案立即看解析，作答紀錄存在這台裝置的瀏覽器裡（首頁可看各章進度）。\n\n<div class=\"nq-quiz\" data-chapters=\"{key}\"></div>\n\n"


CJK = re.compile(r"[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]")


def split_math(line):
    """把一行切成 [(是否為行內數學, 文字)]；含中文的「$…$」視為貨幣符號而非數學。"""
    parts, buf, i = [], "", 0
    while i < len(line):
        ch = line[i]
        if ch == "\\" and i + 1 < len(line):
            buf += line[i : i + 2]
            i += 2
            continue
        if ch == "$" and not line.startswith("$$", i):
            j = i + 1
            while j < len(line) and not (line[j] == "$" and line[j - 1] != "\\"):
                j += 1
            inner = line[i + 1 : j]
            if j < len(line) and inner.strip() and not (CJK.search(inner) and "\\text" not in inner):
                parts.append((False, buf))
                parts.append((True, inner))
                buf, i = "", j + 1
                continue
            buf += "\\$"
            i += 1
            continue
        buf += ch
        i += 1
    parts.append((False, buf))
    return parts


PREFIX = re.compile(r"^(\s*(?:>\s?)*)")


def escape_currency(text):
    """講義前處理：
    - 貨幣用的 $ 改成 \\$，避免和行內數學配對錯誤；
    - $$ 公式區塊前後補空行（含引言 > 與清單縮排），arithmatex 才認得；
    - 表格列裡數學的 | 改成 \\vert，避免切斷儲存格。
    """
    out, in_code, in_display, blank_next = [], False, False, None

    def ensure_blank(prefix):
        if out and out[-1].strip() not in ("", prefix.strip()):
            out.append(prefix.rstrip())

    for line in text.split("\n"):
        prefix = PREFIX.match(line).group(1)
        body = line[len(prefix):].strip()
        if ">" not in prefix and 0 < len(prefix) < 4:
            prefix = "    "  # Python-Markdown 的清單續行需要 4 格縮排
        if body.startswith("```"):
            in_code = not in_code
        if in_code:
            out.append(line)
            continue
        if blank_next is not None and body:
            out.append(blank_next.rstrip())
        blank_next = None
        if len(body) > 4 and body.startswith("$$") and body.endswith("$$") and not in_display:
            if prefix.strip() == "" and prefix:  # 清單內：改用行內 displaystyle，避免破壞清單結構
                out.append(f"{line[: len(line) - len(line.lstrip())]}$\\displaystyle {body[2:-2].strip()}$")
                continue
            ensure_blank(prefix)
            out += [prefix + "$$", prefix + body[2:-2].strip(), prefix + "$$"]
            blank_next = prefix
            continue
        if body == "$$":
            if not in_display:
                ensure_blank(prefix)
            else:
                blank_next = prefix
            in_display = not in_display
            out.append(line)
            continue
        if in_display or "$$" in line:
            out.append(line)
            continue
        in_table = body.startswith("|")
        pieces = []
        for is_math, s in split_math(line):
            if is_math:
                s = s.strip()
                if in_table:
                    s = re.sub(r"(?<!\\)\|", r"\\vert{}", s)
                pieces.append(f"${s}$")
            else:
                pieces.append(s)
        out.append("".join(pieces))
    return "\n".join(out)


def quiz_math(s):
    """題庫字串：行內數學改成 \\(…\\)，$$…$$ 改成 \\[…\\]，貨幣 $ 保留原樣。"""
    s = re.sub(r"\$\$(.+?)\$\$", lambda m: f"\\[{m.group(1)}\\]", s, flags=re.S)
    return "".join(f"\\({x.strip()}\\)" if is_math else x.replace("\\$", "$") for is_math, x in split_math(s))


def rewrite_repo_links(text, depth):
    """把指向 labs/、capstone/ 原始檔的相對連結改成 GitHub 網址或站內頁面。"""
    up = "../" * depth
    text = text.replace(f"]({up}labs/)", f"]({up}labs.md)")
    text = text.replace(f"]({up}capstone/README.md)", f"]({up}capstone.md)")
    text = text.replace(f"]({up}labs/README.md)", f"]({up}labs.md)")
    return re.sub(
        r"\]\(" + re.escape(up) + r"((?:labs|capstone|quiz)/[^)\s]+)\)",
        lambda m: f"]({REPO_BLOB}{m.group(1)})",
        text,
    )


def convert_lesson(path):
    key = path.stem.split("_")[0]
    text = escape_currency(path.read_text(encoding="utf-8"))
    text = text.replace("<details><summary>", '<details class="answer" markdown="1"><summary>')
    text = rewrite_repo_links(text, depth=1)
    marker = "## 自我檢核清單"
    hook = QUIZ_HOOK.format(key=key)
    text = text.replace(marker, hook + marker, 1) if marker in text else text + "\n" + hook
    title = re.sub(r"（[^）]*）$", "", text.splitlines()[0].lstrip("# ").replace("　", " ")).strip()
    return key, title, text


def convert_readme(src, intro):
    text = src.read_text(encoding="utf-8")
    text = re.sub(r"\]\(\.\./lessons/([^)\s]+)\)", r"](lessons/\1)", text)
    text = re.sub(r"\]\((?!https?://|#|lessons/)([^)\s]+)\)", lambda m: f"]({REPO_BLOB}{src.parent.name}/{m.group(1)})", text)
    return intro + text


def main():
    if DOCS.exists():
        shutil.rmtree(DOCS)
    shutil.copytree(ROOT / "site_src", DOCS)

    chapters = []
    for folder, order in (("lessons", lambda p: (p.stem.startswith("appB"), p.stem)), ("prep", lambda p: p.stem)):
        (DOCS / folder).mkdir(exist_ok=True)
        for path in sorted((ROOT / folder).glob("*.md"), key=order):
            key, title, text = convert_lesson(path)
            (DOCS / folder / path.name).write_text(text, encoding="utf-8")
            chapters.append({"key": key, "title": title, "url": f"{folder}/{path.stem}/"})

    bank = {}
    for path in sorted((ROOT / "quiz" / "bank").glob("*.json")):
        questions = json.loads(path.read_text(encoding="utf-8"))
        for q in questions:
            for field in ("q", "explain"):
                q[field] = quiz_math(q.get(field, ""))
            if q.get("choices"):
                q["choices"] = [quiz_math(c) for c in q["choices"]]
        bank[path.stem] = questions
    quiz_dir = DOCS / "assets" / "quiz"
    quiz_dir.mkdir(parents=True)
    (quiz_dir / "bank.json").write_text(json.dumps(bank, ensure_ascii=False), encoding="utf-8")
    (quiz_dir / "chapters.json").write_text(json.dumps(chapters, ensure_ascii=False), encoding="utf-8")

    note = "!!! info \"Lab 要在電腦上做\"\n    Lab 需要 Python 環境，請在 Mac 上執行。下方連結會開啟 GitHub 上的原始檔，平板上可以先讀題目。\n\n"
    (DOCS / "labs.md").write_text(convert_readme(ROOT / "labs" / "README.md", note), encoding="utf-8")
    (DOCS / "capstone.md").write_text(convert_readme(ROOT / "capstone" / "README.md", note.replace("Lab 要", "專題要")), encoding="utf-8")

    print(f"docs/ 建置完成：{len(chapters)} 章，{sum(map(len, bank.values()))} 題")


if __name__ == "__main__":
    main()
