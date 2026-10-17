"""Lab 04（解答版）：波動率縮放、對數常態、歷史波動率估計（對應 ch06、ch20）

目標：
- 用「波動率 ∝ √時間」把年化波動率換成每日 / 每週的一個標準差價格區間
- 理解對數常態（lognormal）分配：中位數 < 平均數，價格永遠為正
- 由 ATM 跨式價格快速估計隱含波動率（交易員心算公式）
- 實作 close-to-close、Parkinson、Garman-Klass 歷史波動率，以及滾動波動率與波動率錐（volatility cone）

慣例：年化交易日 252；periods_per_year 參數代表一年有幾個觀察期。
"""
from __future__ import annotations

import math
from typing import Sequence

import numpy as np
from scipy.stats import norm


def scale_vol(sigma_annual: float, days: float, days_per_year: int = 252) -> float:
    """把年化波動率換成 days 天期間的波動率：σ_period = σ_annual × √(days / days_per_year)。"""
    return sigma_annual * math.sqrt(days / days_per_year)


def annualize_vol(sigma_period: float, periods_per_year: float) -> float:
    """scale_vol 的反向：σ_annual = σ_period × √periods_per_year。"""
    return sigma_period * math.sqrt(periods_per_year)


def one_sd_range(S: float, sigma_annual: float, days: float, days_per_year: int = 252) -> tuple[float, float]:
    """對數常態下 days 天後的「一個標準差」價格區間 (S e^{−σ√t}, S e^{+σ√t})，t = days/days_per_year。

    （忽略漂移項。注意區間對 S 不對稱：上漲幅度 > 下跌幅度。）
    """
    s = sigma_annual * math.sqrt(days / days_per_year)
    return S * math.exp(-s), S * math.exp(s)


def atm_vol_from_straddle(straddle_price: float, S: float, t: float) -> float:
    """由 ATM 跨式價格反推隱含波動率的近似公式。

    ATM call ≈ ATM put ≈ 0.4 × S × σ√t（0.4 ≈ 1/√(2π)）
    ⇒ straddle ≈ 0.8 × S × σ√t ⇒ σ ≈ straddle / (0.8 S √t)
    （精確常數用 √(2/π) ≈ 0.7979，這裡請用 √(2/π)。）
    """
    return straddle_price / (math.sqrt(2.0 / math.pi) * S * math.sqrt(t))


def log_returns(prices: Sequence[float]) -> np.ndarray:
    """對數報酬 r_i = ln(P_i / P_{i−1})，長度比 prices 少 1。"""
    p = np.asarray(prices, dtype=float)
    return np.diff(np.log(p))


def lognormal_mean_median(S: float, mu: float, sigma: float, t: float) -> tuple[float, float]:
    """若 ln(S_t/S) ~ N((μ − σ²/2)t, σ²t)，回傳 (平均數 E[S_t], 中位數)。

    平均數 = S e^{μt}；中位數 = S e^{(μ − σ²/2)t}。
    """
    return S * math.exp(mu * t), S * math.exp((mu - 0.5 * sigma**2) * t)


def prob_above(S: float, K: float, mu: float, sigma: float, t: float) -> float:
    """對數常態下 P(S_t > K) = N( [ln(S/K) + (μ − σ²/2)t] / (σ√t) )。"""
    z = (math.log(S / K) + (mu - 0.5 * sigma**2) * t) / (sigma * math.sqrt(t))
    return float(norm.cdf(z))


def close_to_close_vol(closes: Sequence[float], periods_per_year: int = 252, demean: bool = True) -> float:
    """收盤對收盤年化波動率。

    demean=True ：樣本標準差（ddof=1）× √periods_per_year
    demean=False：假設平均報酬為 0，σ = √(mean(r²) × periods_per_year)（交易員常用）
    """
    r = log_returns(closes)
    var = r.var(ddof=1) if demean else float(np.mean(r**2))
    return math.sqrt(var * periods_per_year)


def parkinson_vol(high: Sequence[float], low: Sequence[float], periods_per_year: int = 252) -> float:
    """Parkinson（1980）高低價估計：σ² = mean( ln(H/L)² ) / (4 ln 2)，再年化取根號。

    只用每日最高、最低價，效率約為 close-to-close 的 5 倍（在 GBM 假設下）。
    """
    hl = np.log(np.asarray(high, dtype=float) / np.asarray(low, dtype=float))
    return math.sqrt(np.mean(hl**2) / (4 * math.log(2)) * periods_per_year)


def garman_klass_vol(open_: Sequence[float], high: Sequence[float], low: Sequence[float],
                     close: Sequence[float], periods_per_year: int = 252) -> float:
    """Garman-Klass 估計：σ² = mean[ ½ ln(H/L)² − (2 ln2 − 1) ln(C/O)² ]，再年化取根號。"""
    o, h, l, c = (np.asarray(v, dtype=float) for v in (open_, high, low, close))
    var = np.mean(0.5 * np.log(h / l) ** 2 - (2 * math.log(2) - 1) * np.log(c / o) ** 2)
    return math.sqrt(var * periods_per_year)


def rolling_vol(closes: Sequence[float], window: int, periods_per_year: int = 252) -> np.ndarray:
    """滾動 close-to-close 波動率（demean=True），長度與 closes 相同。

    第 i 個值使用 closes[i−window : i+1]（即 window 個報酬）；前 window 個值設為 np.nan。
    """
    c = np.asarray(closes, dtype=float)
    out = np.full(len(c), np.nan)
    for i in range(window, len(c)):
        out[i] = close_to_close_vol(c[i - window: i + 1], periods_per_year)
    return out


def vol_cone(closes: Sequence[float], windows: Sequence[int], periods_per_year: int = 252) -> dict:
    """波動率錐：對每個 window 計算滾動波動率的分位數。

    回傳 {window: {"min":…, "p25":…, "median":…, "p75":…, "max":…}}（忽略 nan）。
    交易員用它判斷「目前隱含波動率在歷史上算高還是低」。
    """
    out = {}
    for w in windows:
        v = rolling_vol(closes, w, periods_per_year)
        v = v[~np.isnan(v)]
        out[w] = {"min": float(v.min()), "p25": float(np.percentile(v, 25)),
                  "median": float(np.median(v)), "p75": float(np.percentile(v, 75)),
                  "max": float(v.max())}
    return out


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from optlib import demo_print, simulate_gbm

    closes = simulate_gbm(50.0, 0.0, 0.30, 2.0, 504, seed=7)[0]
    demo_print("年化 30% → 1 天", scale_vol, 0.30, 1)
    demo_print("每日 1.5% → 年化", annualize_vol, 0.015, 252)
    demo_print("一個標準差區間 (5 天)", one_sd_range, 50, 0.30, 5)
    demo_print("跨式估波動率", atm_vol_from_straddle, 3.4, 50, 30 / 365)
    demo_print("平均數 / 中位數", lognormal_mean_median, 50, 0.08, 0.30, 1.0)
    demo_print("P(S_1 > 60)", prob_above, 50, 60, 0.08, 0.30, 1.0)
    demo_print("close-to-close vol（真值 0.30）", close_to_close_vol, closes)
    demo_print("Parkinson（範例資料）", parkinson_vol, [51, 52, 50.5], [49, 50.2, 49.1])
    demo_print("Garman-Klass（範例資料）", garman_klass_vol, [50, 50.8, 51.5], [51, 52, 51.9],
               [49, 50.2, 50.1], [50.8, 51.5, 50.6])
    demo_print("最後一個 20 日滾動波動率", lambda: float(rolling_vol(closes, 20)[-1]))
    demo_print("波動率錐", vol_cone, closes, [20, 60])
