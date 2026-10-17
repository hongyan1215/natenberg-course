"""Lab 05（練習版）：解析 Greeks vs 數值差分、Lambda（對應 ch07、ch09）

請在 exercises/ 這份檔案中，把每個 `raise NotImplementedError("TODO")` 換成你的實作，
再執行對應的 pytest 檢查（見 labs/README.md）。函式由易到難排列。

目標：
- 實作 Black-Scholes（含股利率 q）的 delta、gamma、vega、theta、rho
- 用中央差分（central difference）驗證解析公式 —— 這是交易系統上線前一定要做的檢查
- 計算 lambda（彈性 elasticity）與二階 Greeks：vanna、volga
- 用泰勒展開（delta-gamma-theta-vega）近似部位損益，並與完整重新定價比較

單位（與 optlib 一致）：
- vega：每 1 個波動率點（σ 變動 0.01）的價格變化
- theta：預設每「日曆日」（年化 theta ÷ 365）
- rho：每 1 個百分點利率（r 變動 0.01）

可以使用 optlib.bs_price 與 optlib.d1_d2 作為積木；但本 Lab 的 Greeks 請自己寫。
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

from scipy.stats import norm

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from optlib import bs_price, d1_d2  # noqa: E402


def delta(S, K, t, sigma, r=0.0, q=0.0, kind="call") -> float:
    """Delta：call = e^{−qt} N(d1)；put = e^{−qt}(N(d1) − 1)。"""
    raise NotImplementedError("TODO")


def gamma(S, K, t, sigma, r=0.0, q=0.0) -> float:
    """Gamma：e^{−qt} n(d1) / (S σ √t)。call 與 put 相同。"""
    raise NotImplementedError("TODO")


def vega(S, K, t, sigma, r=0.0, q=0.0) -> float:
    """Vega（每 1 vol 點）：S e^{−qt} n(d1) √t / 100。"""
    raise NotImplementedError("TODO")


def theta(S, K, t, sigma, r=0.0, q=0.0, kind="call", per_day=True) -> float:
    """Theta（時間經過造成的價值變化，通常為負）。

    年化：
      call: −S e^{−qt} n(d1) σ/(2√t) − r K e^{−rt} N(d2) + q S e^{−qt} N(d1)
      put : −S e^{−qt} n(d1) σ/(2√t) + r K e^{−rt} N(−d2) − q S e^{−qt} N(−d1)
    per_day=True 時除以 365。
    """
    raise NotImplementedError("TODO")


def rho(S, K, t, sigma, r=0.0, q=0.0, kind="call") -> float:
    """Rho（每 1 個百分點）：call = K t e^{−rt} N(d2)/100；put = −K t e^{−rt} N(−d2)/100。"""
    raise NotImplementedError("TODO")


def lambda_elasticity(S, K, t, sigma, r=0.0, q=0.0, kind="call") -> float:
    """Lambda（槓桿彈性）= delta × S / 選擇權價格：標的漲 1% 時選擇權漲幾 %。"""
    raise NotImplementedError("TODO")


def atm_greeks_approx(S, t, sigma) -> dict:
    """價平（r=q=0）的心算近似，0.4 ≈ 1/√(2π)：

      price ≈ 0.4 S σ√t
      gamma ≈ 0.4 / (S σ √t)
      vega  ≈ 0.4 S √t / 100            （每 vol 點）
      theta ≈ −0.4 S σ / (2√t) / 365   （每日）
    回傳 {"price", "gamma", "vega", "theta"}。請用 0.4 這個常數。
    """
    raise NotImplementedError("TODO")


def finite_difference_greeks(S, K, t, sigma, r=0.0, q=0.0, kind="call") -> dict:
    """用 optlib.bs_price 的中央差分估計 Greeks，回傳 {"delta","gamma","vega","theta","rho"}，單位與上面相同。

    建議步長：hS = 1e-3·S（delta、gamma）、hσ = 1e-4、ht = 1e-5（年）、hr = 1e-5。
      delta ≈ [V(S+h) − V(S−h)] / 2h
      gamma ≈ [V(S+h) − 2V(S) + V(S−h)] / h²
      vega  ≈ [V(σ+h) − V(σ−h)] / 2h / 100
      theta ≈ −[V(t+h) − V(t−h)] / 2h / 365   （剩餘時間變少 = 日曆時間前進）
      rho   ≈ [V(r+h) − V(r−h)] / 2h / 100
    """
    raise NotImplementedError("TODO")


def vanna(S, K, t, sigma, r=0.0, q=0.0) -> float:
    """Vanna = ∂delta/∂σ = −e^{−qt} n(d1) d2 / σ（每單位 σ）。

    請回傳「波動率上升 1 點時 delta 的變化」，即上式 ÷ 100。call、put 相同。
    """
    raise NotImplementedError("TODO")


def volga(S, K, t, sigma, r=0.0, q=0.0) -> float:
    """Volga（vomma）= ∂vega/∂σ。以「每點 vega」對「1 vol 點」的變化表示：

      volga = vega_每點 × d1 × d2 / σ / 100
    價平附近 volga ≈ 0；深價外 / 深價內為正（vega 隨波動率上升而增加）。
    """
    raise NotImplementedError("TODO")


def taylor_pnl(greeks: dict, dS: float, days: float = 0.0, dvol_points: float = 0.0) -> float:
    """用 Greeks 近似損益：

      ΔV ≈ delta·dS + ½·gamma·dS² + theta·days + vega·dvol_points
    greeks 需含 "delta"、"gamma"、"theta"（每日）、"vega"（每點）。
    """
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    from optlib import demo_print

    args = (48.0, 50.0, 0.25, 0.32, 0.03, 0.01)
    demo_print("call delta", delta, *args, "call")
    demo_print("put delta", delta, *args, "put")
    demo_print("gamma", gamma, *args)
    demo_print("vega (每點)", vega, *args)
    demo_print("call theta (每日)", theta, *args, "call")
    demo_print("call rho (每 1%)", rho, *args, "call")
    demo_print("call lambda", lambda_elasticity, *args, "call")
    demo_print("ATM 近似", atm_greeks_approx, 50.0, 0.25, 0.32)
    demo_print("差分 Greeks", finite_difference_greeks, *args, "call")
    demo_print("vanna", vanna, *args)
    demo_print("volga", volga, *args)
    demo_print("泰勒損益 (dS=+1, 1 天, +2 vol)", taylor_pnl,
               {"delta": 0.45, "gamma": 0.05, "theta": -0.03, "vega": 0.09}, 1.0, 1, 2)
