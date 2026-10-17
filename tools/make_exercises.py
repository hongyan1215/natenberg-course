"""從 labs/solutions/*.py 產生 labs/exercises/*.py（撰寫者工具，學習者可忽略）。

規則：
- 頂層、名稱不以底線開頭的函式：保留簽名與 docstring，函式本體換成
  `raise NotImplementedError("TODO")`。
- def 那一行若帶有 `# [given]` 註解，該函式原樣保留（提供給學生的輔助函式）。
- 底線開頭的私有函式、常數、`if __name__ == "__main__":` demo 原樣保留。
- 模組 docstring 的「（解答版）」改成「（練習版）」並加上作答說明。

用法：.venv/bin/python _spec/make_exercises.py [lab01_forward_pricing ...]
"""
from __future__ import annotations

import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "labs"
SOL, EXE = ROOT / "solutions", ROOT / "exercises"
NOTE = ("請在 exercises/ 這份檔案中，把每個 `raise NotImplementedError(\"TODO\")` 換成你的實作，\n"
        "再執行對應的 pytest 檢查（見 labs/README.md）。函式由易到難排列。\n")


def convert(src: str) -> str:
    tree = ast.parse(src)
    lines = src.splitlines(keepends=True)
    edits = []  # (start_idx, end_idx_exclusive, replacement)
    for node in tree.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if node.name.startswith("_"):
            continue
        def_line = lines[node.lineno - 1]
        if "# [given]" in def_line:
            continue
        body = node.body
        has_doc = (isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant)
                   and isinstance(body[0].value.value, str))
        start = body[0].end_lineno if has_doc else body[0].lineno - 1  # 0-based index of first line to drop
        indent = " " * body[0].col_offset
        edits.append((start, node.end_lineno, f'{indent}raise NotImplementedError("TODO")\n'))
    for start, end, rep in sorted(edits, reverse=True):
        lines[start:end] = [rep]
    out = "".join(lines)
    out = out.replace("（解答版）", "（練習版）", 1)
    # 在模組 docstring 第一段後插入作答說明
    first_break = out.find("\n\n")
    if first_break != -1:
        out = out[: first_break + 2] + NOTE + "\n" + out[first_break + 2:]
    return out


def main(names: list[str]) -> None:
    EXE.mkdir(parents=True, exist_ok=True)
    files = [SOL / f"{n}.py" for n in names] if names else sorted(SOL.glob("lab*.py"))
    for f in files:
        dst = EXE / f.name
        dst.write_text(convert(f.read_text(encoding="utf-8")), encoding="utf-8")
        print(f"產生 {dst.relative_to(ROOT.parent)}")


if __name__ == "__main__":
    main(sys.argv[1:])
