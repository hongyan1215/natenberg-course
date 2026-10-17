"""Lab 06（練習版）：動態避險模擬與 gamma rent（對應 ch08）

請在 exercises/ 這份檔案中，把每個 `raise NotImplementedError("TODO")` 換成你的實作，
再執行對應的 pytest 檢查（見 labs/README.md）。函式由易到難排列。

核心結論（請用模擬親眼驗證）：
1. 以隱含波動率 σ_impl 買進選擇權並做 delta 中立避險，到期損益近似為
       P&L ≈ Σ_k ½ Γ_k S_k² (σ_real² − σ_impl²) Δt
   （實際上每段的 (σ_real² Δt) 是「實現的」(ΔS/S)²，所以逐路徑地
       P&L ≈ Σ_k ½ Γ_k S_k² [ (ΔS_k/S_k)² − σ_impl² Δt ]）
   → 買 gamma 就是在賭實現波動率 > 隱含波動率；theta 是你付給市場的「gamma 租金」。
2. 平均而言 P&L ≈ 理論優勢（theoretical edge）= BS(σ_real) − BS(σ_impl)。
3. 避險頻率越高，P&L 的變異數越小（離散避險誤差 ∝ √Δt）。

慣例：本 Lab 的模擬預設 r = 0、μ = 0（讓公式最乾淨），一張選擇權 = 1 單位標的。
paths 的形狀為 (n_paths, n_steps + 1)，第 k 欄對應時間 t_k = k·T/n_steps。
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from optlib import bs_delta, bs_gamma, bs_price, simulate_gbm  # noqa: E402


def hedge_shares(option_qty: float, option_delta: float) -> float:
    """讓部位 delta 中立需要的標的數量：−option_qty × option_delta。

    例：買 10 口 delta 0.4 的 call → 要賣出 4 單位標的（回傳 −4）。
    """
    raise NotImplementedError("TODO")


def gamma_rent(gamma: float, S: float, sigma: float, dt: float) -> float:
    """在波動率 σ 下，持有 gamma 經過 dt（年）「應得」的期望凸性收益：½ Γ S² σ² dt。

    對 delta 中立的多 gamma 部位，若 σ 等於隱含波動率，這正好抵銷 theta（r=0 時）。
    """
    raise NotImplementedError("TODO")


def breakeven_move(gamma: float, theta_per_day: float) -> float:
    """多 gamma 部位一天內需要多大的標的價格變動 |dS| 才能賺回當天的 theta：

      ½ Γ dS² = |θ|  ⇒  dS = √(2|θ| / Γ)
    """
    raise NotImplementedError("TODO")


def simulate_paths(S0: float, mu: float, sigma: float, t: float, n_steps: int, n_paths: int,
                   seed: int | None = None) -> np.ndarray:
    """產生 GBM 路徑，形狀 (n_paths, n_steps+1)。可直接呼叫 optlib.simulate_gbm。"""
    raise NotImplementedError("TODO")


def delta_hedge_pnl(paths: np.ndarray, K: float, t: float, sigma_impl: float, r: float = 0.0,
                    kind: str = "call", position: int = 1, hedge_every: int = 1,
                    sigma_hedge: float | None = None) -> np.ndarray:
    """模擬「以 σ_impl 價格成交一張選擇權 + 離散 delta 避險」到期的損益（每條路徑一個數）。

    步驟（向量化處理所有路徑）：
      dt = t / n_steps；選擇權以 position × BS(S0, K, t, σ_impl) 成交（position=+1 買、−1 賣）
      在 k = 0, hedge_every, 2·hedge_every, …（k < n_steps）時，把標的部位調整成
          shares = −position × delta(S_k, t − t_k, σ_hedge)；σ_hedge 預設 = σ_impl
      現金帳戶：一開始 = −position×V0 − shares×S0；每步乘 e^{r dt}；每次調整用 S_k 買賣標的
      到期：P&L = position × payoff(S_T) + shares × S_T + cash
    """
    raise NotImplementedError("TODO")


def gamma_pnl_pathwise(paths: np.ndarray, K: float, t: float, sigma_impl: float, kind: str = "call",
                       position: int = 1, hedge_every: int = 1) -> np.ndarray:
    """逐路徑的 gamma 損益近似（假設 r=0）：

      Σ_k position × ½ Γ_k S_k² [ (ΔS_k / S_k)² − σ_impl² Δt_k ]
    k 走過每個避險時點（0, h, 2h, …），ΔS_k = S_{k+h} − S_k，Δt_k = 該段長度（最後一段可能較短），
    Γ_k = gamma(S_k, t − t_k, σ_impl)。（kind 在這裡不影響結果，因為 call/put 的 gamma 相同。）
    """
    raise NotImplementedError("TODO")


def gamma_pnl_expected(paths: np.ndarray, K: float, t: float, sigma_impl: float, sigma_real: float,
                       position: int = 1) -> np.ndarray:
    """講義公式版：Σ_k position × ½ Γ_k S_k² (σ_real² − σ_impl²) dt（每一步都算，r=0）。

    回傳每條路徑的值；它的平均應該接近 delta_hedge_pnl 的平均。
    """
    raise NotImplementedError("TODO")


def theoretical_edge(S0: float, K: float, t: float, sigma_real: float, sigma_impl: float,
                     r: float = 0.0, kind: str = "call", position: int = 1) -> float:
    """理論優勢 = position × [BS(σ_real) − BS(σ_impl)]：用「對的」波動率定價後，成交價便宜了多少。"""
    raise NotImplementedError("TODO")


def pnl_stats(pnl: np.ndarray) -> dict:
    """損益統計：{"mean", "std"(ddof=1), "stderr"(= std/√n), "min", "max", "sharpe"(= mean/std)}。"""
    raise NotImplementedError("TODO")


def hedge_frequency_experiment(S0: float, K: float, t: float, sigma_impl: float, sigma_real: float,
                               n_steps: int, hedge_everys: list[int], n_paths: int = 2000,
                               seed: int = 0, kind: str = "call", position: int = 1) -> dict:
    """同一組路徑（μ=0、r=0、σ_real）下，比較不同避險間隔的 P&L 標準差。

    回傳 {hedge_every: std}。hedge_every 越小 = 避險越頻繁 → std 應越小。
    """
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    from optlib import demo_print

    S0, K, T, s_impl, s_real = 100.0, 100.0, 0.25, 0.20, 0.28
    paths = simulate_gbm(S0, 0.0, s_real, T, 252, 2000, seed=1)  # 直接用 optlib，讓 demo 不依賴未完成的函式
    demo_print("買 10 口 delta 0.4 的 call 要避險", hedge_shares, 10, 0.4)
    demo_print("gamma rent（一天）", gamma_rent, 0.04, 100, 0.20, 1 / 365)
    demo_print("theta 損益兩平的每日波動", breakeven_move, 0.04, -0.022)
    demo_print("理論優勢", theoretical_edge, S0, K, T, s_real, s_impl)
    demo_print("避險損益統計", lambda: pnl_stats(delta_hedge_pnl(paths, K, T, s_impl)))
    demo_print("gamma 逐路徑近似 平均", lambda: float(gamma_pnl_pathwise(paths, K, T, s_impl).mean()))
    demo_print("公式期望值 平均", lambda: float(gamma_pnl_expected(paths, K, T, s_impl, s_real).mean()))
    demo_print("避險頻率 vs 標準差", hedge_frequency_experiment, S0, K, T, s_impl, s_impl, 252, [1, 4, 16, 63])
