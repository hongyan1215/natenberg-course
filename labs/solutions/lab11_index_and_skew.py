"""Lab 11（解答版）：指數計算、隱含波動率求解、skew、隱含分配（對應 ch22–ch24）

目標：
- 計算價格加權與市值加權指數，處理成分股變動時的除數（divisor）調整
- 量測報酬分配的偏態（skewness）與超額峰態（excess kurtosis）—— 真實世界與對數常態的差距
- 自己寫隱含波動率求解器（Brent 法），把選擇權價格轉成 smile / skew
- 用二次式擬合 skew 的水準、斜率、曲率
- 用蝶式價差（butterfly）近似風險中性機率密度（Breeden–Litzenberger）
- 比較 sticky strike 與 sticky moneyness 兩種 skew 動態假設

慣例：連續複利；F = S·e^{(r−q)t}；vol 以小數表示。
"""
from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Sequence

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from optlib import bs_price  # noqa: E402


def price_weighted_index(prices: Sequence[float], divisor: float) -> float:
    """價格加權指數 = Σ 成分股價格 / divisor。"""
    return float(np.sum(prices) / divisor)


def cap_weighted_index(prices: Sequence[float], shares: Sequence[float], base_mcap: float,
                       base_value: float = 100.0) -> float:
    """市值加權指數 = Σ(價格 × 股數) / 基期總市值 × 基期指數值。"""
    mcap = float(np.dot(prices, shares))
    return mcap / base_mcap * base_value


def adjust_divisor(old_divisor: float, old_sum: float, new_sum: float) -> float:
    """成分股替換或分割時，調整除數讓指數在變動當下不跳動：

      old_sum / old_divisor = new_sum / new_divisor ⇒ new_divisor = old_divisor × new_sum / old_sum
    （old_sum、new_sum 為變動前後的成分股價格總和或總市值）
    """
    return old_divisor * new_sum / old_sum


def index_forward(I: float, r: float, q: float, t: float) -> float:
    """指數期貨理論價格（連續股利率 q）：F = I·e^{(r − q)t}。"""
    return I * math.exp((r - q) * t)


def sample_skew_kurtosis(returns: Sequence[float]) -> tuple[float, float]:
    """報酬的樣本偏態與超額峰態（母體動差版本，不做小樣本修正）：

      m = mean(x)，s² = mean((x−m)²)
      skew = mean((x−m)³) / s³
      excess_kurtosis = mean((x−m)⁴) / s⁴ − 3     （常態分配為 0；肥尾 > 0）
    """
    x = np.asarray(returns, dtype=float)
    d = x - x.mean()
    s2 = np.mean(d**2)
    return float(np.mean(d**3) / s2**1.5), float(np.mean(d**4) / s2**2 - 3.0)


def implied_vol(price: float, S: float, K: float, t: float, r: float = 0.0, q: float = 0.0,
                kind: str = "call", lo: float = 1e-6, hi: float = 5.0) -> float:
    """用 scipy.optimize.brentq 反解 BS 隱含波動率。

    先檢查無套利邊界：call 需在 (max(S e^{−qt} − K e^{−rt}, 0), S e^{−qt}) 之間，
    put 需在 (max(K e^{−rt} − S e^{−qt}, 0), K e^{−rt}) 之間；否則回傳 np.nan。
    可使用 optlib.bs_price 作為定價函式。
    """
    from scipy.optimize import brentq

    dq, dr = math.exp(-q * t), math.exp(-r * t)
    if kind == "call":
        lower, upper = max(S * dq - K * dr, 0.0), S * dq
    else:
        lower, upper = max(K * dr - S * dq, 0.0), K * dr
    if not (lower < price < upper):
        return float("nan")
    f = lambda s: bs_price(S, K, t, s, r, q, kind) - price  # noqa: E731
    if f(lo) * f(hi) > 0:
        return float("nan")
    return float(brentq(f, lo, hi, xtol=1e-12))


def implied_vol_curve(prices: Sequence[float], strikes: Sequence[float], S: float, t: float,
                      r: float = 0.0, q: float = 0.0, kind: str = "call") -> np.ndarray:
    """對一串（同種類、同到期）選擇權價格逐一求隱含波動率，回傳 np.ndarray。"""
    return np.array([implied_vol(p, S, k, t, r, q, kind) for p, k in zip(prices, strikes)])


def otm_implied_vols(strikes: Sequence[float], call_prices: Sequence[float], put_prices: Sequence[float],
                     S: float, t: float, r: float = 0.0, q: float = 0.0) -> np.ndarray:
    """只用價外（OTM）選擇權求 smile：K < F 用 put，K ≥ F 用 call（F = S e^{(r−q)t}）。

    價外選擇權流動性較好、且不含內含價值，隱含波動率比較穩定。
    """
    F = S * math.exp((r - q) * t)
    return np.array([implied_vol(p, S, k, t, r, q, "put") if k < F else implied_vol(c, S, k, t, r, q, "call")
                     for k, c, p in zip(strikes, call_prices, put_prices)])


def skew_fit(strikes: Sequence[float], vols: Sequence[float], F: float, t: float) -> dict:
    """以標準化價性 x = ln(K/F)/√t 做二次迴歸 σ(x) ≈ a + b·x + c·x²（忽略 nan）。

    回傳 {"atm": a, "slope": b, "curvature": c}。股票指數通常 slope < 0（put 較貴）、curvature > 0（smile）。
    提示：np.polyfit(x, vols, 2) 回傳 [c, b, a]。
    """
    K = np.asarray(strikes, dtype=float)
    v = np.asarray(vols, dtype=float)
    ok = ~np.isnan(v)
    x = np.log(K[ok] / F) / math.sqrt(t)
    c, b, a = np.polyfit(x, v[ok], 2)
    return {"atm": float(a), "slope": float(b), "curvature": float(c)}


def butterfly_density(strikes: Sequence[float], call_prices: Sequence[float], r: float, t: float
                      ) -> tuple[np.ndarray, np.ndarray]:
    """Breeden–Litzenberger：風險中性密度 f(K) = e^{rt} ∂²C/∂K²。

    用等距履約價（間距 h）的蝶式近似：f(K_i) ≈ e^{rt} (C_{i−1} − 2C_i + C_{i+1}) / h²
    回傳 (內部履約價 K_1..K_{n−2}, 密度)。若履約價不等距，raise ValueError。
    直覺：買 1 個蝶式（K−h, K, K+h）÷ h 的到期 payoff 是一個面積為 h 的三角形，
    所以蝶式價格 / h² ≈ 「到期落在 K 附近」的機率密度（折現後）。
    """
    K = np.asarray(strikes, dtype=float)
    C = np.asarray(call_prices, dtype=float)
    h = np.diff(K)
    if not np.allclose(h, h[0]):
        raise ValueError("履約價必須等距")
    dens = math.exp(r * t) * (C[:-2] - 2 * C[1:-1] + C[2:]) / h[0] ** 2
    return K[1:-1], dens


def density_summary(K: np.ndarray, f: np.ndarray) -> dict:
    """用梯形法（np.trapezoid）計算密度的 {"total": ∫f, "mean": ∫K f / total, "std": √(∫(K−mean)² f / total)}。"""
    total = float(np.trapezoid(f, K))
    mean = float(np.trapezoid(K * f, K) / total)
    std = float(math.sqrt(np.trapezoid((K - mean) ** 2 * f, K) / total))
    return {"total": total, "mean": mean, "std": std}


def smile_vol_after_move(K: float, S_new: float, S_old: float, strikes: Sequence[float],
                         vols: Sequence[float], rule: str = "sticky_strike") -> float:
    """標的價格從 S_old 移到 S_new 後，履約價 K 的隱含波動率（用 np.interp 在舊 smile 上內插）。

    rule="sticky_strike"   ：同一個履約價的 vol 不變 → interp(K, strikes, vols)
    rule="sticky_moneyness"：同一個價性 K/S 的 vol 不變 → interp(K × S_old / S_new, strikes, vols)
    其他 rule raise ValueError。
    """
    if rule == "sticky_strike":
        k_eff = K
    elif rule == "sticky_moneyness":
        k_eff = K * S_old / S_new
    else:
        raise ValueError("rule 必須是 'sticky_strike' 或 'sticky_moneyness'")
    return float(np.interp(k_eff, strikes, vols))


if __name__ == "__main__":
    from optlib import demo_print

    S, t, r, q = 100.0, 0.25, 0.03, 0.01
    F = S * math.exp((r - q) * t)
    strikes = np.arange(70.0, 131.0, 5.0)
    true_vols = 0.22 - 0.05 * np.log(strikes / F) / math.sqrt(t) + 0.02 * (np.log(strikes / F) / math.sqrt(t)) ** 2
    calls = np.array([bs_price(S, k, t, v, r, q, "call") for k, v in zip(strikes, true_vols)])
    puts = np.array([bs_price(S, k, t, v, r, q, "put") for k, v in zip(strikes, true_vols)])
    rets = np.random.default_rng(0).standard_t(4, 5000) * 0.01
    demo_print("價格加權指數", price_weighted_index, [52.0, 118.0, 33.5], 1.8)
    demo_print("市值加權指數", cap_weighted_index, [52.0, 118.0, 33.5], [1e6, 4e5, 2e6], 1.6e8)
    demo_print("新除數", adjust_divisor, 1.8, 203.5, 190.0)
    demo_print("指數遠期", index_forward, S, r, q, t)
    demo_print("t 分配報酬的偏態/峰態", sample_skew_kurtosis, rets)
    demo_print("隱含波動率", implied_vol, calls[6], S, strikes[6], t, r, q)
    demo_print("OTM smile", otm_implied_vols, strikes, calls, puts, S, t, r, q)
    demo_print("skew 擬合", lambda: skew_fit(strikes, otm_implied_vols(strikes, calls, puts, S, t, r, q), F, t))
    demo_print("蝶式密度 summary", lambda: density_summary(*butterfly_density(strikes, calls, r, t)))
    demo_print("sticky strike vol(K=95, S→105)", smile_vol_after_move, 95, 105, 100, strikes, true_vols)
    demo_print("sticky moneyness vol(K=95, S→105)", smile_vol_after_move, 95, 105, 100, strikes, true_vols,
               "sticky_moneyness")
