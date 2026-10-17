"""Lab 09（練習版）：CRR 二元樹與美式提前履約（對應 ch16、ch19）

請在 exercises/ 這份檔案中，把每個 `raise NotImplementedError("TODO")` 換成你的實作，
再執行對應的 pytest 檢查（見 labs/README.md）。函式由易到難排列。

目標：
- 實作 Cox-Ross-Rubinstein（CRR）二元樹，定價歐式與美式選擇權，並觀察收斂
- 從樹上直接讀出 delta、gamma、theta
- 畫出美式 put 的提前履約邊界（early-exercise boundary）：股價低於邊界就該履約
- 用託管股利（escrowed dividend）模型處理離散現金股利，觀察股利如何讓美式 call 提前履約
- 用平價推導的簡易法則判斷「現在該不該提前履約」

樹的索引：節點 (i, j) 表示第 i 步、上漲 j 次，股價 = S·u^j·d^(i−j)，0 ≤ j ≤ i。
"""
from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Sequence

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from optlib import bs_price  # noqa: E402


def crr_parameters(sigma: float, r: float, q: float, dt: float) -> tuple[float, float, float]:
    """CRR 參數：u = e^{σ√dt}、d = 1/u、p = (e^{(r−q)dt} − d)/(u − d)。回傳 (u, d, p)。"""
    raise NotImplementedError("TODO")


def stock_tree(S: float, u: float, d: float, n: int) -> np.ndarray:
    """回傳 (n+1)×(n+1) 陣列，tree[i, j] = S·u^j·d^(i−j)（j ≤ i），其餘位置填 np.nan。"""
    raise NotImplementedError("TODO")


def _payoff(kind, S, K):
    return np.maximum(S - K, 0.0) if kind == "call" else np.maximum(K - S, 0.0)


def binomial_price(S: float, K: float, t: float, sigma: float, r: float = 0.0, q: float = 0.0,
                   n: int = 200, kind: str = "call", american: bool = False) -> float:
    """CRR 二元樹價格。

    1. dt = t/n，取得 u, d, p；每步折現因子 e^{−r dt}
    2. 到期節點價值 = payoff(S u^j d^(n−j))
    3. 由後往前：V = e^{−r dt}[p V_up + (1−p) V_down]；american=True 時再與立即履約價值取 max
    """
    raise NotImplementedError("TODO")


def early_exercise_premium(S: float, K: float, t: float, sigma: float, r: float = 0.0, q: float = 0.0,
                           n: int = 200, kind: str = "put") -> float:
    """提前履約權利金 = 美式價格 − 歐式價格（同一棵樹）。永遠 ≥ 0。"""
    raise NotImplementedError("TODO")


def binomial_convergence(S: float, K: float, t: float, sigma: float, r: float = 0.0, q: float = 0.0,
                         kind: str = "call", ns: Sequence[int] = (10, 50, 100, 400)) -> list[float]:
    """歐式二元樹價格與 Black-Scholes 的絕對誤差，依 ns 順序回傳 list。"""
    raise NotImplementedError("TODO")


def binomial_greeks(S: float, K: float, t: float, sigma: float, r: float = 0.0, q: float = 0.0,
                    n: int = 400, kind: str = "call", american: bool = False) -> dict:
    """從樹的前兩步讀出 Greeks（不需要重算整棵樹）：

      delta = (V[1,1] − V[1,0]) / (S[1,1] − S[1,0])
      gamma = [ (V[2,2]−V[2,1])/(S[2,2]−S[2,1]) − (V[2,1]−V[2,0])/(S[2,1]−S[2,0]) ] / ((S[2,2] − S[2,0])/2)
      theta = (V[2,1] − V[0,0]) / (2 dt) / 365     （每日；CRR 中 S[2,1] = S）
    回傳 {"price", "delta", "gamma", "theta"}。
    提示：倒推時把第 2 步與第 1 步的節點價值存下來。
    """
    raise NotImplementedError("TODO")


def early_exercise_boundary(K: float, t: float, sigma: float, r: float, q: float = 0.0,
                            n: int = 400, S_ref: float | None = None) -> tuple[np.ndarray, np.ndarray]:
    """美式 put 的提前履約邊界。

    以 S_ref（預設 K）為根建樹並倒推美式 put。對每一步 i = 0..n−1，找出
    「立即履約價值 > 繼續持有價值 + 1e-9」（嚴格較好，容差避免浮點誤差）的節點中最高的股價，
    作為該時點的邊界 S*(t_i)；若該步沒有任何節點應履約，填 np.nan。
    （樹的前幾步節點少，可能還碰不到邊界，因此也會是 nan。）
    回傳 (times, boundary)，times[i] = i·dt，長度皆為 n。

    性質：S* < K；越接近到期 S* 越接近 K；r = 0 且 q = 0 時美式 put 永不提前履約（全為 nan）。
    """
    raise NotImplementedError("TODO")


def american_call_with_dividends(S: float, K: float, t: float, sigma: float, r: float,
                                 dividends: Sequence[tuple[float, float]], n: int = 400,
                                 american: bool = True) -> float:
    """有離散現金股利的（美式）call，使用「託管股利」模型：

    1. S* = S − Σ D_i e^{−r t_i}（只計 0 < t_i < t 的股利），用 S* 與 σ 建 CRR 樹
    2. 節點 (i, j) 的實際股價 = S*·u^j·d^(i−j) + Σ_{t_k > i·dt} D_k e^{−r (t_k − i·dt)}
       （尚未除息的股利現值；除息前最後一個節點仍含息）
    3. 到期 payoff 用 S*（股利都已付完）；american=True 時每個節點與 (實際股價 − K) 取 max
    american=False 時結果應等於 Black-Scholes(S*, …)。
    """
    raise NotImplementedError("TODO")


def call_early_exercise_check(K: float, D: float, r: float, t_remaining: float, put_value: float) -> tuple[bool, float]:
    """除息前一刻，美式 call 該不該提前履約？

    履約得到 S − K；不履約則持有一張除息後的 call，由平價 C ≈ P + (S − D) − K e^{−rt}。
    比較兩者：履約較好 ⇔ D > P + K(1 − e^{−rt})
    回傳 (是否該履約, margin)，margin = D − P − K(1 − e^{−rt})（> 0 代表該履約）。
    t_remaining 為除息後到到期的剩餘時間；put_value 為同履約價 put 的價值。
    """
    raise NotImplementedError("TODO")


def put_early_exercise_check(K: float, r: float, t_remaining: float, call_value: float,
                             div_pv: float = 0.0) -> tuple[bool, float]:
    """美式 put 該不該現在提前履約？

    履約得到 K − S（並可把 K 拿去賺利息）；不履約則由平價 P ≈ C − S + K e^{−rt} + PV(D)。
    履約較好 ⇔ K(1 − e^{−rt}) > C + PV(D)
    回傳 (是否該履約, margin)，margin = K(1 − e^{−rt}) − C − div_pv。
    """
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    from optlib import demo_print

    demo_print("CRR 參數 (σ=30%, dt=1/252)", crr_parameters, 0.30, 0.05, 0.0, 1 / 252)
    demo_print("3 步股價樹", stock_tree, 50, 1.1, 1 / 1.1, 3)
    demo_print("歐式 put", binomial_price, 45, 50, 0.75, 0.3, 0.06, 0.0, 400, "put")
    demo_print("美式 put", binomial_price, 45, 50, 0.75, 0.3, 0.06, 0.0, 400, "put", True)
    demo_print("提前履約權利金", early_exercise_premium, 45, 50, 0.75, 0.3, 0.06)
    demo_print("收斂誤差", binomial_convergence, 45, 50, 0.75, 0.3, 0.06)
    demo_print("樹上 Greeks", binomial_greeks, 45, 50, 0.75, 0.3, 0.06, 0.0, 400, "put", True)
    demo_print("履約邊界（前 5 個時點）", lambda: early_exercise_boundary(50, 0.75, 0.3, 0.06, n=200)[1][:5])
    demo_print("美式 call（除息 1.5 元）", american_call_with_dividends, 52, 50, 0.5, 0.25, 0.03, [(0.4, 1.5)])
    demo_print("歐式 call（除息 1.5 元）", american_call_with_dividends, 52, 50, 0.5, 0.25, 0.03, [(0.4, 1.5)], 400, False)
    demo_print("call 提前履約檢查", call_early_exercise_check, 50, 1.5, 0.03, 0.1, 0.4)
    demo_print("put 提前履約檢查", put_early_exercise_check, 50, 0.06, 0.5, 0.05)
