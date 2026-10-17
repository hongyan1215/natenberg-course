"""Lab 03（解答版）：機率期望值定價、Black-Scholes、N(x)（對應 ch05、ch18）

目標：
- 用「機率 × 結果」的期望值觀念為選擇權定價（理論價值 = 折現後的期望到期價值）
- 自己寫出 N(x)：先用 math.erf，再用多項式近似（體會模型實作的細節）
- 實作 Black-Scholes（股票，連續股利率 q）與 Black-76（期貨選擇權）
- 用買賣權平價由 call 推 put、用蒙地卡羅驗證解析解、計算風險中性價內機率

本 Lab 不准呼叫 scipy.stats.norm 或 optlib 的定價函式（測試會拿它們對答案）。
"""
from __future__ import annotations

import math
from typing import Sequence

import numpy as np


def norm_pdf(x: float) -> float:
    """標準常態密度 n(x) = exp(−x²/2) / √(2π)。"""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def norm_cdf(x: float) -> float:
    """標準常態累積分配 N(x)，用 math.erf：N(x) = ½ [1 + erf(x/√2)]。"""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def norm_cdf_approx(x: float) -> float:
    """N(x) 的多項式近似（Abramowitz & Stegun 26.2.17，誤差 < 7.5e-8）。

    對 x ≥ 0：k = 1/(1 + 0.2316419 x)
        N(x) ≈ 1 − n(x)(a1 k + a2 k² + a3 k³ + a4 k⁴ + a5 k⁵)
        a1=0.319381530, a2=−0.356563782, a3=1.781477937, a4=−1.821255978, a5=1.330274429
    對 x < 0：利用對稱性 N(x) = 1 − N(−x)。
    """
    if x < 0:
        return 1.0 - norm_cdf_approx(-x)
    a = (0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429)
    k = 1.0 / (1.0 + 0.2316419 * x)
    poly = sum(ai * k ** (i + 1) for i, ai in enumerate(a))
    return 1.0 - norm_pdf(x) * poly


def expected_value(outcomes: Sequence[float], probs: Sequence[float]) -> float:
    """離散期望值 Σ p_i x_i。若機率總和與 1 的差距 > 1e-9，raise ValueError。"""
    if abs(sum(probs) - 1.0) > 1e-9:
        raise ValueError("機率總和必須為 1")
    return float(sum(p * x for p, x in zip(probs, outcomes)))


def option_value_from_distribution(prices: Sequence[float], probs: Sequence[float], K: float,
                                   kind: str = "call", r: float = 0.0, t: float = 0.0) -> float:
    """給定標的到期價格的離散分配，計算選擇權理論價值。

    理論價值 = e^{−rt} × Σ p_i × payoff(prices_i)
    payoff：call 為 max(S−K,0)、put 為 max(K−S,0)。
    """
    pay = [max(s - K, 0.0) if kind == "call" else max(K - s, 0.0) for s in prices]
    return math.exp(-r * t) * expected_value(pay, probs)


def d1_d2(S: float, K: float, t: float, sigma: float, r: float = 0.0, q: float = 0.0) -> tuple[float, float]:
    """d1 = [ln(S/K) + (r − q + σ²/2) t] / (σ√t)；d2 = d1 − σ√t。"""
    vs = sigma * math.sqrt(t)
    d1 = (math.log(S / K) + (r - q + 0.5 * sigma * sigma) * t) / vs
    return d1, d1 - vs


def bs_call(S: float, K: float, t: float, sigma: float, r: float = 0.0, q: float = 0.0) -> float:
    """Black-Scholes 買權：C = S e^{−qt} N(d1) − K e^{−rt} N(d2)。請使用你寫的 norm_cdf。"""
    d1, d2 = d1_d2(S, K, t, sigma, r, q)
    return S * math.exp(-q * t) * norm_cdf(d1) - K * math.exp(-r * t) * norm_cdf(d2)


def bs_put(S: float, K: float, t: float, sigma: float, r: float = 0.0, q: float = 0.0) -> float:
    """Black-Scholes 賣權：P = K e^{−rt} N(−d2) − S e^{−qt} N(−d1)。"""
    d1, d2 = d1_d2(S, K, t, sigma, r, q)
    return K * math.exp(-r * t) * norm_cdf(-d2) - S * math.exp(-q * t) * norm_cdf(-d1)


def put_from_call_parity(call: float, S: float, K: float, t: float, r: float = 0.0, q: float = 0.0) -> float:
    """由買賣權平價（put-call parity）用 call 價格推 put：P = C − S e^{−qt} + K e^{−rt}。"""
    return call - S * math.exp(-q * t) + K * math.exp(-r * t)


def black76(F: float, K: float, t: float, sigma: float, r: float = 0.0, kind: str = "call") -> float:
    """Black-76 期貨選擇權：
        d1 = [ln(F/K) + σ² t / 2] / (σ√t)，d2 = d1 − σ√t
        Call = e^{−rt}[F N(d1) − K N(d2)]；Put = e^{−rt}[K N(−d2) − F N(−d1)]
    """
    vs = sigma * math.sqrt(t)
    d1 = (math.log(F / K) + 0.5 * sigma * sigma * t) / vs
    d2 = d1 - vs
    df = math.exp(-r * t)
    if kind == "call":
        return df * (F * norm_cdf(d1) - K * norm_cdf(d2))
    return df * (K * norm_cdf(-d2) - F * norm_cdf(-d1))


def prob_itm(S: float, K: float, t: float, sigma: float, r: float = 0.0, q: float = 0.0,
             kind: str = "call") -> float:
    """風險中性測度下到期價內的機率：call 為 N(d2)，put 為 N(−d2)。"""
    _, d2 = d1_d2(S, K, t, sigma, r, q)
    return norm_cdf(d2) if kind == "call" else norm_cdf(-d2)


def monte_carlo_price(S: float, K: float, t: float, sigma: float, r: float = 0.0, q: float = 0.0,
                      kind: str = "call", n_paths: int = 200_000, seed: int = 0) -> tuple[float, float]:
    """蒙地卡羅定價，回傳（價格估計, 標準誤）。

    風險中性下 S_T = S exp((r − q − σ²/2)t + σ√t Z)，Z ~ N(0,1)
    使用 np.random.default_rng(seed).standard_normal(n_paths)。
    價格 = e^{−rt} mean(payoff)；標準誤 = e^{−rt} std(payoff, ddof=1)/√n_paths。
    """
    z = np.random.default_rng(seed).standard_normal(n_paths)
    ST = S * np.exp((r - q - 0.5 * sigma**2) * t + sigma * math.sqrt(t) * z)
    pay = np.maximum(ST - K, 0.0) if kind == "call" else np.maximum(K - ST, 0.0)
    df = math.exp(-r * t)
    return float(df * pay.mean()), float(df * pay.std(ddof=1) / math.sqrt(n_paths))


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from optlib import demo_print

    demo_print("n(0)", norm_pdf, 0.0)
    demo_print("N(1.0)", norm_cdf, 1.0)
    demo_print("N(1.0) 近似", norm_cdf_approx, 1.0)
    demo_print("期望值", expected_value, [90, 100, 110], [0.25, 0.5, 0.25])
    demo_print("離散分配 call(K=100)", option_value_from_distribution,
               [80, 90, 100, 110, 120], [0.1, 0.2, 0.4, 0.2, 0.1], 100, "call", 0.03, 0.5)
    demo_print("d1, d2", d1_d2, 62, 60, 0.4, 0.28, 0.02, 0.01)
    demo_print("BS call", bs_call, 62, 60, 0.4, 0.28, 0.02, 0.01)
    demo_print("BS put", bs_put, 62, 60, 0.4, 0.28, 0.02, 0.01)
    demo_print("Parity put（call=4.3）", put_from_call_parity, 4.3, 62, 60, 0.4, 0.02, 0.01)
    demo_print("Black-76 call", black76, 2450, 2500, 0.25, 0.18, 0.03, "call")
    demo_print("價內機率 call", prob_itm, 62, 60, 0.4, 0.28, 0.02, 0.01)
    demo_print("MC call (價格, 標準誤)", monte_carlo_price, 62, 60, 0.4, 0.28, 0.02, 0.01)
