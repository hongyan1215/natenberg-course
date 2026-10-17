"""Lab 02（練習版）：到期損益、parity graph、損益兩平（對應 ch03–ch04）

請在 exercises/ 這份檔案中，把每個 `raise NotImplementedError("TODO")` 換成你的實作，
再執行對應的 pytest 檢查（見 labs/README.md）。函式由易到難排列。

目標：
- 寫出 call / put 的到期價值（parity value），並能拆解內含價值與時間價值
- 依 Optibook 規則把價格對齊 tick
- 判斷價內 / 價平 / 價外，計算履約交割的結果
- 組合多隻腳的到期損益，找出損益兩平點、最大獲利與最大損失、各區段斜率

一隻腳（leg）用 dict 表示：{"kind": "call"|"put"|"stock", "K": 履約價, "qty": 數量, "price": 成交價}
qty 正=買進、負=賣出；stock 腳的 K 可省略，price 為股票成交價。
所有函式的 S / S_T 參數都要支援 numpy 陣列（向量化）。
"""
from __future__ import annotations

import math

import numpy as np


def call_payoff(S_T, K):
    """買權到期價值 max(S_T − K, 0)。請用 np.maximum 讓它支援陣列。"""
    raise NotImplementedError("TODO")


def put_payoff(S_T, K):
    """賣權到期價值 max(K − S_T, 0)。"""
    raise NotImplementedError("TODO")


def intrinsic_and_time_value(option_price: float, S: float, K: float, kind: str) -> tuple[float, float]:
    """把選擇權價格拆成（內含價值, 時間價值）。

    內含價值 = 現在立刻履約的價值（call: max(S−K,0)；put: max(K−S,0)）
    時間價值 = 選擇權價格 − 內含價值
    """
    raise NotImplementedError("TODO")


def round_to_tick(price: float, tick: float, side: str) -> float:
    """把價格對齊到 tick 網格（Optibook 不接受不在網格上的價格）。

    side='bid'：向下取整（買價寧低勿高）；side='ask'：向上取整。
    提示：先 round(price / tick, 9) 消除浮點誤差再 floor/ceil，最後乘回 tick 並 round(…, 10)。
    例：round_to_tick(1.234, 0.05, 'bid') = 1.20；'ask' → 1.25。
    """
    raise NotImplementedError("TODO")


def classify_moneyness(S: float, K: float, kind: str, atm_tol: float = 0.0) -> str:
    """回傳 'ITM'（價內）、'ATM'（價平）、'OTM'（價外）。

    |S − K| ≤ atm_tol 視為 ATM；否則 call 在 S > K 時為 ITM、put 在 S < K 時為 ITM。
    """
    raise NotImplementedError("TODO")


def exercise_settlement(kind: str, K: float, S_settle: float, qty: int, multiplier: float,
                        physical: bool = True) -> dict:
    """持有 qty 口（qty>0 為買方履約；qty<0 為賣方被指派）價內選擇權在到期時的交割結果。

    只有價內才會履約；價外則回傳全 0。
    physical=True（實物交割）：
        call 買方：拿到 +qty×multiplier 股、付出 K×qty×multiplier 現金
        put  買方：交出股票（股數 −qty×multiplier）、收到 K×qty×multiplier 現金
        賣方（qty<0）公式相同，符號自然反過來。
    physical=False（現金交割）：股數 0，現金 = qty × multiplier × 內含價值。
    回傳 {"shares": 股數變化, "cash": 現金變化}。
    """
    raise NotImplementedError("TODO")


def leg_pnl(S_T, leg: dict):
    """單一隻腳的到期損益 = qty × (到期價值 − 成交價)。stock 腳的到期價值就是 S_T。"""
    raise NotImplementedError("TODO")


def position_pnl(S_T, legs: list[dict]):
    """整個部位的到期損益 = 各腳 leg_pnl 加總（支援陣列）。"""
    raise NotImplementedError("TODO")


def breakevens(legs: list[dict], S_min: float, S_max: float, n: int = 20001) -> list[float]:
    """在 [S_min, S_max] 上找出到期損益 = 0 的價格（由小到大）。

    作法：在 n 個等距格點上算 position_pnl，找相鄰格點變號處做線性內插；
    剛好等於 0 的格點也要收錄。回傳四捨五入到 6 位小數的 list。
    """
    raise NotImplementedError("TODO")


def slope_profile(legs: list[dict]) -> list[tuple[float, float, float]]:
    """到期損益圖是折線；回傳各區段 (左端, 右端, 斜率)。

    區段由 0、所有履約價（排序去重）、math.inf 切開。
    斜率 = Σ 該區段內各腳對 S 的斜率 × qty：
        stock：1；call：S > K 時 1，否則 0；put：S < K 時 −1，否則 0。
    （提示：在每段的中點判斷，右端為 inf 時用 左端+1 判斷。）
    """
    raise NotImplementedError("TODO")


def max_profit_loss(legs: list[dict]) -> tuple[float, float]:
    """回傳（最大獲利, 最大損失），最大損失以負數表示。

    到期損益是折線，極值只會出現在 S=0、各履約價，或 S→∞（看最後一段斜率）：
      最後一段斜率 > 0 → 最大獲利 = math.inf；< 0 → 最大損失 = −math.inf。
    其他情況取 S ∈ {0, 各履約價} 上損益的最大值 / 最小值。
    """
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from optlib import demo_print

    bull = [{"kind": "call", "K": 50, "qty": 1, "price": 3.2},
            {"kind": "call", "K": 55, "qty": -1, "price": 1.1}]
    short_straddle = [{"kind": "call", "K": 50, "qty": -1, "price": 2.4},
                      {"kind": "put", "K": 50, "qty": -1, "price": 2.1}]
    demo_print("call payoff @[45,50,55]", call_payoff, np.array([45, 50, 55]), 50)
    demo_print("put payoff @[45,50,55]", put_payoff, np.array([45, 50, 55]), 50)
    demo_print("內含/時間價值", intrinsic_and_time_value, 6.3, 53, 48, "call")
    demo_print("tick 對齊 bid", round_to_tick, 1.234, 0.05, "bid")
    demo_print("價性", classify_moneyness, 53, 55, "put")
    demo_print("履約交割", exercise_settlement, "call", 50, 54, 3, 100)
    demo_print("牛市價差 @57", position_pnl, 57.0, bull)
    demo_print("牛市價差 損益兩平", breakevens, bull, 30, 80)
    demo_print("賣跨式 損益兩平", breakevens, short_straddle, 30, 80)
    demo_print("賣跨式 斜率", slope_profile, short_straddle)
    demo_print("牛市價差 最大獲利/損失", max_profit_loss, bull)
    demo_print("賣跨式 最大獲利/損失", max_profit_loss, short_straddle)
