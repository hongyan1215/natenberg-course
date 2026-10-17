"""Lab 12（練習版）：變異數交換複製、VIX 式計算（對應 ch25）

請在 exercises/ 這份檔案中，把每個 `raise NotImplementedError("TODO")` 換成你的實作，
再執行對應的 pytest 檢查（見 labs/README.md）。函式由易到難排列。

目標：
- 計算實現變異數（realized variance），以及變異數交換（variance swap）、波動率交換（volatility swap）的損益
- 理解 vega notional 與 variance notional 的換算，以及變異數交換相對波動率交換的凸性
- 用一串價外選擇權（權重 ∝ 1/K²）複製變異數交換的公平履約價 —— 這就是 VIX 的計算方法
- 兩個到期日的總變異數內插成 30 天指數、變異數交換的盯市（mark-to-market）
- 波動率交換的凸性調整（convexity adjustment）

單位慣例：
- realized_variance / variance_swap_fair_strike 回傳「年化變異數（小數²）」，例如 20% vol → 0.04
- 交換合約的 payoff 使用「vol 點」，例如 20% → 20.0；變異數用 vol 點²（400）
"""
from __future__ import annotations

import math
from typing import Sequence

import numpy as np


def realized_variance(prices: Sequence[float], periods_per_year: int = 252) -> float:
    """市場慣例的年化實現變異數（不扣平均）：σ² = periods_per_year / n × Σ ln(P_i/P_{i−1})²，n = 報酬個數。"""
    raise NotImplementedError("TODO")


def variance_notional(vega_notional: float, strike_vol: float) -> float:
    """Variance notional = vega notional / (2 × K_vol)（K_vol 用 vol 點）。

    意義：在履約價附近，實現 vol 每高 1 點，變異數交換約賺 vega_notional。
    """
    raise NotImplementedError("TODO")


def variance_swap_payoff(realized_vol: float, strike_vol: float, vega_notional: float) -> float:
    """變異數交換（多方）到期損益 = variance_notional × (σ_real² − K²)，σ 與 K 皆用 vol 點。"""
    raise NotImplementedError("TODO")


def vol_swap_payoff(realized_vol: float, strike_vol: float, vega_notional: float) -> float:
    """波動率交換（多方）到期損益 = vega_notional × (σ_real − K)，皆用 vol 點。"""
    raise NotImplementedError("TODO")


def strike_deltas(strikes: Sequence[float]) -> np.ndarray:
    """VIX 公式中的 ΔK_i：內部用 (K_{i+1} − K_{i−1})/2，兩端用與相鄰履約價的差。"""
    raise NotImplementedError("TODO")


def select_otm_quotes(strikes: Sequence[float], call_prices: Sequence[float], put_prices: Sequence[float],
                      F: float) -> tuple[float, np.ndarray]:
    """選出每個履約價要用的價外報價 Q(K)。

    K0 = 不超過 F 的最大履約價。K < K0 用 put、K > K0 用 call、K = K0 用 (call + put)/2。
    回傳 (K0, Q 陣列)。
    """
    raise NotImplementedError("TODO")


def variance_swap_fair_strike(strikes: Sequence[float], call_prices: Sequence[float],
                              put_prices: Sequence[float], F: float, r: float, t: float) -> float:
    """以 VIX 公式用價外選擇權組合複製變異數交換的公平履約價（年化變異數，小數²）：

      σ² = (2/t) Σ_i (ΔK_i / K_i²) e^{rt} Q(K_i) − (1/t) (F/K0 − 1)²
    直覺：持有權重 ∝ 1/K² 的選擇權組合，其 vega（對變異數的曝險）與標的價格無關。
    """
    raise NotImplementedError("TODO")


def vix_style_index(var_near: float, t_near: float, var_next: float, t_next: float,
                    target_days: float = 30.0, days_per_year: float = 365.0) -> float:
    """把近月、次月的年化變異數，在「總變異數」上線性內插成固定天期（預設 30 天），再年化開根號 × 100。

      τ = target_days / days_per_year
      w = t_near·var_near·(t_next − τ)/(t_next − t_near) + t_next·var_next·(τ − t_near)/(t_next − t_near)
      index = 100 × √(w / τ)
    """
    raise NotImplementedError("TODO")


def variance_swap_mtm(realized_var: float, t_elapsed: float, implied_var_remaining: float, t_total: float,
                      strike_var: float, var_notional: float, r: float = 0.0) -> float:
    """變異數交換（多方）期中盯市價值。所有變異數用 vol 點²（例如 20% → 400）。

      預期最終變異數 = (t/T)·σ²_已實現 + ((T−t)/T)·σ²_剩餘期間隱含
      價值 = var_notional × e^{−r(T−t)} × (預期最終變異數 − strike_var)
    """
    raise NotImplementedError("TODO")


def vol_swap_convexity_approx(strike_var: float, var_of_variance: float) -> float:
    """波動率交換公平履約價的二階近似（Jensen 不等式：E[√V] < √E[V]）：

      K_vol ≈ √K_var − Var(V) / (8 · K_var^{3/2})
    strike_var = E[V]；var_of_variance = Var(V)（V 為實現變異數）。單位一致即可。
    """
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from optlib import bs_price, demo_print, simulate_gbm

    S, t, r = 100.0, 30 / 365, 0.03
    F = S * math.exp(r * t)
    K = np.arange(50.0, 160.0, 2.5)
    calls = bs_price(S, K, t, 0.24, r, 0.0, "call")
    puts = bs_price(S, K, t, 0.24, r, 0.0, "put")
    path = simulate_gbm(100, 0.0, 0.3, 1.0, 252, seed=4)[0]
    demo_print("實現變異數（真值 0.09）", realized_variance, path)
    demo_print("variance notional", variance_notional, 100_000, 20)
    demo_print("變異數交換損益（實現 25 vs 20）", variance_swap_payoff, 25, 20, 100_000)
    demo_print("波動率交換損益（實現 25 vs 20）", vol_swap_payoff, 25, 20, 100_000)
    demo_print("ΔK", strike_deltas, [80, 85, 90, 100])
    demo_print("K0 與 OTM 報價", lambda: select_otm_quotes(K, calls, puts, F)[0])
    demo_print("公平變異數履約價 → vol（真值 0.24）", lambda: math.sqrt(variance_swap_fair_strike(K, calls, puts, F, r, t)))
    demo_print("VIX 式指數", vix_style_index, 0.22**2, 23 / 365, 0.25**2, 51 / 365)
    demo_print("期中盯市", variance_swap_mtm, 30**2, 0.5, 22**2, 1.0, 20**2, 2500, r)
    demo_print("波動率交換凸性近似", vol_swap_convexity_approx, 400.0, 160**2)
