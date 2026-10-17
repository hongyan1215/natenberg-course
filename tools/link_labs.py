"""在每章「對應 Lab」段落開頭插入自動判分 Lab 的連結、測試指令與函式清單，並修正失效連結。"""
import ast, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAB_OF = {
    "ch01": ["lab01_forward_pricing"], "ch02": ["lab01_forward_pricing"],
    "ch03": ["lab02_payoffs"], "ch04": ["lab02_payoffs"],
    "ch05": ["lab03_pricing_models"], "ch18": ["lab03_pricing_models"],
    "ch06": ["lab04_volatility"], "ch20": ["lab04_volatility"], "appB": ["lab01_forward_pricing", "lab04_volatility"],
    "ch07": ["lab05_greeks"], "ch09": ["lab05_greeks"], "ch08": ["lab06_dynamic_hedging"],
    "ch10": ["lab07_spreads"], "ch11": ["lab07_spreads"], "ch12": ["lab07_spreads"], "ch13": ["lab07_spreads"],
    "ch14": ["lab08_synthetics_arbitrage"], "ch15": ["lab08_synthetics_arbitrage"],
    "ch16": ["lab09_binomial_american"], "ch19": ["lab09_binomial_american"],
    "ch17": ["lab10_hedging_portfolio"], "ch21": ["lab10_hedging_portfolio"],
    "ch22": ["lab11_index_and_skew"], "ch23": ["lab11_index_and_skew"], "ch24": ["lab11_index_and_skew"],
    "ch25": ["lab12_volatility_contracts"],
}
MARK = "<!-- auto-lab-block -->"


def todo_functions(lab):
    tree = ast.parse((ROOT / "labs/exercises" / f"{lab}.py").read_text(encoding="utf-8"))
    return [n.name for n in tree.body if isinstance(n, ast.FunctionDef) and not n.name.startswith("_")]


def block(labs):
    lines = [MARK, "**自動判分的 Lab（必做）**", ""]
    for lab in labs:
        funcs = "、".join(f"`{f}`" for f in todo_functions(lab))
        lines += [
            f"- [`labs/exercises/{lab}.py`](../labs/exercises/{lab}.py)：實作 {funcs}",
            f"  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_{lab}.py -q`",
        ]
    lines += ["", "**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**", ""]
    return "\n".join(lines)


for path in sorted((ROOT / "lessons").glob("*.md")):
    key = path.stem.split("_")[0]
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"\n" + re.escape(MARK) + r".*?選做，不在自動測驗內；以下函式名稱只是建議）\*\*\n\n", "\n", text, flags=re.S)
    text = re.sub(r"\]\(\.\./labs/(lab\d\d_[a-z_]+)\)", r"](../labs/exercises/\1.py)", text)
    head = "## 對應 Lab\n"
    assert head in text, path
    text = text.replace(head, head + "\n" + block(LAB_OF[key]) + "\n", 1)
    path.write_text(text, encoding="utf-8")
    print("updated", path.name)
