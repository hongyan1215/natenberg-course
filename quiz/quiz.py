"""Natenberg 課程題庫測驗（含錯題複習）。

用法（在 natenberg_course/ 底下）:
    .venv/bin/python quiz/quiz.py                 # 全部章節隨機 15 題
    .venv/bin/python quiz/quiz.py ch05 ch06 -n 10 # 指定章節
    .venv/bin/python quiz/quiz.py --review        # 只考答錯過、尚未連續答對 2 次的題目
    .venv/bin/python quiz/quiz.py --stats         # 各章正確率
"""
import argparse
import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
BANK = HERE / "bank"
PROGRESS = HERE / "progress.json"


def load_bank(chapters):
    questions = []
    for path in sorted(BANK.glob("*.json")):
        if chapters and path.stem not in chapters:
            continue
        for q in json.loads(path.read_text(encoding="utf-8")):
            q["chapter"] = path.stem
            questions.append(q)
    return questions


def load_progress():
    if PROGRESS.exists():
        return json.loads(PROGRESS.read_text(encoding="utf-8"))
    return {}


def save_progress(progress):
    PROGRESS.write_text(json.dumps(progress, ensure_ascii=False, indent=1), encoding="utf-8")


def ask(q):
    print(f"\n[{q['id']}] {q['q']}")
    if q["type"] == "mc":
        for letter, choice in zip("ABCD", q["choices"]):
            print(f"  {letter}. {choice}")
        reply = input("答案 (A-D): ").strip().upper()
        return reply == str(q["answer"]).upper()
    if q["type"] == "tf":
        reply = input("對或錯 (o/x): ").strip().lower()
        return (reply in ("o", "t", "y", "對", "true")) == bool(q["answer"])
    reply = input("數值答案: ").strip().replace(",", "")
    try:
        return abs(float(reply) - float(q["answer"])) <= float(q.get("tol", 1e-6))
    except ValueError:
        return False


def show_stats(progress, questions):
    by_chapter = {}
    for q in questions:
        rec = progress.get(q["id"])
        stats = by_chapter.setdefault(q["chapter"], [0, 0, 0])
        stats[2] += 1
        if rec:
            stats[0] += rec["seen"]
            stats[1] += rec["right"]
    print(f"{'章節':<8}{'題數':>6}{'作答':>6}{'正確率':>8}")
    for chapter, (seen, right, total) in sorted(by_chapter.items()):
        rate = f"{right / seen:.0%}" if seen else "-"
        print(f"{chapter:<8}{total:>6}{seen:>6}{rate:>8}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("chapters", nargs="*", help="例如 ch05 ch06 appB；省略代表全部")
    parser.add_argument("-n", type=int, default=15, help="題數")
    parser.add_argument("--review", action="store_true", help="只考需要複習的題目")
    parser.add_argument("--stats", action="store_true")
    args = parser.parse_args()

    questions = load_bank(set(args.chapters))
    progress = load_progress()
    if args.stats:
        show_stats(progress, questions)
        return
    if args.review:
        questions = [q for q in questions if progress.get(q["id"], {}).get("streak", 2) < 2]
        if not questions:
            print("沒有待複習的題目。")
            return
    random.shuffle(questions)
    questions = questions[: args.n]

    score = 0
    for q in questions:
        correct = ask(q)
        rec = progress.setdefault(q["id"], {"seen": 0, "right": 0, "streak": 0})
        rec["seen"] += 1
        if correct:
            score += 1
            rec["right"] += 1
            rec["streak"] += 1
            print("✅ 正確")
        else:
            rec["streak"] = 0
            print(f"❌ 正解：{q['answer']}")
        print(f"   解析：{q.get('explain', '')}")
        save_progress(progress)
    print(f"\n得分 {score}/{len(questions)}。答錯的題目可用 --review 再練。")


if __name__ == "__main__":
    main()
