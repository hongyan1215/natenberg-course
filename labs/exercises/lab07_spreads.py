"""Lab 07（練習版）：策略建構器、組合 Greeks、價差分類（對應 ch10–ch13）

請在 exercises/ 這份檔案中，把每個 `raise NotImplementedError("TODO")` 換成你的實作，
再執行對應的 pytest 檢查（見 labs/README.md）。函式由易到難排列。

目標：
- 寫出常見價差的建構函式：跨式、勒式、垂直價差、蝶式、時間價差、比例價差
- 計算組合的理論價值與 Greeks，並依 Greeks 正負號把價差分類
  （多頭 / 空頭方向、買波動率 long vol / 賣波動率 short vol / 時間價差型 mixed）
- 求 delta 中立比例、以及一個價差的「損益兩平波動率」（breakeven volatility，也就是價差的隱含波動率）

一隻腳（leg）用 dict 表示：
    {"kind": "call"|"put", "K": 履約價, "qty": 數量(正買負賣), "expiry": 到期(年)}
    可選 "sigma"：這隻腳專屬的波動率（覆蓋全域 sigma，用來表達 skew）
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from optlib import bs_delta, bs_gamma, bs_price, bs_theta, bs_vega  # noqa: E402


def make_leg(kind: str, K: float, qty: float, expiry: float) -> dict:
    """建立一隻腳：回傳 {"kind", "K", "qty", "expiry"}。"""
    raise NotImplementedError("TODO")


def straddle(K: float, expiry: float, qty: float = 1) -> list[dict]:
    """跨式（straddle）：同履約價的 call 與 put 各 qty 口（qty>0 買跨式）。順序：[call, put]。"""
    raise NotImplementedError("TODO")


def strangle(K_put: float, K_call: float, expiry: float, qty: float = 1) -> list[dict]:
    """勒式（strangle）：K_put 的 put 與 K_call 的 call 各 qty 口（通常 K_put < K_call）。順序：[put, call]。"""
    raise NotImplementedError("TODO")


def vertical_spread(kind: str, K_low: float, K_high: float, expiry: float, bullish: bool = True,
                    qty: float = 1) -> list[dict]:
    """垂直價差：同種類、同到期、不同履約價。順序：[K_low 腳, K_high 腳]。

    bullish=True （多頭價差）：買 K_low、賣 K_high（call 或 put 都一樣）
    bullish=False（空頭價差）：賣 K_low、買 K_high
    """
    raise NotImplementedError("TODO")


def butterfly(kind: str, K1: float, K2: float, K3: float, expiry: float, qty: float = 1) -> list[dict]:
    """蝶式（butterfly）：買 1 K1、賣 2 K2、買 1 K3（乘以 qty）。順序：[K1, K2, K3]。"""
    raise NotImplementedError("TODO")


def calendar_spread(kind: str, K: float, t_near: float, t_far: float, qty: float = 1) -> list[dict]:
    """時間價差（calendar / time spread）：買遠月、賣近月（qty>0 稱為 long calendar）。順序：[近月, 遠月]。"""
    raise NotImplementedError("TODO")


def ratio_spread(kind: str, K_long: float, K_short: float, expiry: float, ratio: float = 2,
                 qty: float = 1) -> list[dict]:
    """比例價差：買 qty 口 K_long、賣 ratio×qty 口 K_short。順序：[K_long, K_short]。

    qty<0 時即為反向的「backspread」（賣少買多）。
    """
    raise NotImplementedError("TODO")


def _leg_sigma(leg: dict, sigma: float) -> float:
    return leg.get("sigma", sigma)


def position_value(legs: list[dict], S: float, sigma: float, r: float = 0.0, q: float = 0.0,
                   elapsed: float = 0.0) -> float:
    """組合理論價值 Σ qty × BS(S, K, expiry − elapsed, σ_leg)。σ_leg = leg.get("sigma", sigma)。"""
    raise NotImplementedError("TODO")


def position_greeks(legs: list[dict], S: float, sigma: float, r: float = 0.0, q: float = 0.0,
                    elapsed: float = 0.0) -> dict:
    """組合 Greeks：{"delta","gamma","vega"(每點),"theta"(每日)}，各腳 qty 加權加總。

    可用 optlib 的 bs_delta / bs_gamma / bs_vega / bs_theta(per="day")。
    """
    raise NotImplementedError("TODO")


def classify_spread(greeks: dict, delta_tol: float = 0.05, tol: float = 1e-6) -> dict:
    """依 Greeks 正負號分類。回傳 {"direction": …, "volatility": …}。

    direction ：delta > delta_tol → "bullish"；< −delta_tol → "bearish"；否則 "neutral"
    volatility：gamma > tol 且 vega > tol   → "long_vol"（如買跨式、backspread）
                gamma < −tol 且 vega < −tol → "short_vol"（如賣跨式、買蝶式、比例價差）
                gamma 與 vega 符號相反         → "mixed"（時間價差的特徵）
                其他                         → "neutral"
    """
    raise NotImplementedError("TODO")


def delta_neutral_ratio(delta_long: float, delta_short: float) -> float:
    """買 1 口 delta_long 的選擇權，需要賣幾口 delta_short 的選擇權才能 delta 中立？

    1·delta_long − x·delta_short = 0 ⇒ x = delta_long / delta_short
    """
    raise NotImplementedError("TODO")


def breakeven_volatility(legs: list[dict], market_cost: float, S: float, r: float = 0.0, q: float = 0.0,
                         lo: float = 0.01, hi: float = 3.0) -> float:
    """價差的「損益兩平波動率」：找 σ 使 position_value(legs, S, σ) = market_cost（市場成交的淨成本）。

    用 scipy.optimize.brentq 在 [lo, hi] 求根；若區間端點同號（無解）raise ValueError。
    若你預期未來實現波動率高於此值，買進（long vol）此價差有正的期望值，反之亦然。
    """
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    from optlib import demo_print

    S, sig, r = 100.0, 0.25, 0.02
    fly = [{"kind": "call", "K": 95, "qty": 1, "expiry": 0.25}, {"kind": "call", "K": 100, "qty": -2, "expiry": 0.25},
           {"kind": "call", "K": 105, "qty": 1, "expiry": 0.25}]
    cal = [{"kind": "call", "K": 100, "qty": -1, "expiry": 0.1}, {"kind": "call", "K": 100, "qty": 1, "expiry": 0.35}]
    strad = [{"kind": "call", "K": 100, "qty": 1, "expiry": 0.25}, {"kind": "put", "K": 100, "qty": 1, "expiry": 0.25}]
    demo_print("跨式", straddle, 100, 0.25)
    demo_print("勒式", strangle, 95, 105, 0.25)
    demo_print("多頭 put 價差", vertical_spread, "put", 95, 105, 0.25)
    demo_print("蝶式", butterfly, "call", 95, 100, 105, 0.25)
    demo_print("時間價差", calendar_spread, "call", 100, 0.1, 0.35)
    demo_print("1x2 call 比例價差", ratio_spread, "call", 100, 110, 0.25)
    demo_print("蝶式價值", position_value, fly, S, sig, r)
    demo_print("時間價差 Greeks", position_greeks, cal, S, sig, r)
    demo_print("時間價差分類", lambda: classify_spread(position_greeks(cal, S, sig, r)))
    demo_print("delta 中立比例", delta_neutral_ratio, 0.55, 0.22)
    demo_print("跨式損益兩平波動率（成本 10.2）", breakeven_volatility, strad, 10.2, S, r)
