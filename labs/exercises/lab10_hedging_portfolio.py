"""Lab 10（練習版）：保護性策略、collar、部位情境分析（對應 ch17、ch21）

請在 exercises/ 這份檔案中，把每個 `raise NotImplementedError("TODO")` 換成你的實作，
再執行對應的 pytest 檢查（見 labs/README.md）。函式由易到難排列。

目標：
- 計算 protective put、covered call、collar 的到期損益與保護範圍
- 找出零成本 collar（zero-cost collar）的 call 履約價
- 對含股票與多個選擇權（各自不同波動率）的部位計算 Greeks
- 做「價格 × 波動率」情境矩陣（scenario grid）與 Greeks 階梯（ladder）—— 這是做市商每天看的風險報表
- 用兩個選擇權 + 標的，同時把 gamma、vega、delta 中和

部位用 list of dict 表示：
    選擇權：{"kind": "call"|"put", "K", "qty", "expiry"(年), "sigma"}
    標的  ：{"kind": "stock", "qty"}
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from optlib import bs_delta, bs_gamma, bs_price, bs_theta, bs_vega  # noqa: E402


def protective_put_pnl(S_T, S0: float, K: float, put_premium: float):
    """保護性賣權（買股 + 買 put）到期每股損益 = (S_T − S0) + max(K − S_T, 0) − put_premium（支援陣列）。"""
    raise NotImplementedError("TODO")


def covered_call_pnl(S_T, S0: float, K: float, call_premium: float):
    """掩護性買權（買股 + 賣 call）到期每股損益 = (S_T − S0) − max(S_T − K, 0) + call_premium。"""
    raise NotImplementedError("TODO")


def collar_pnl(S_T, S0: float, K_put: float, K_call: float, put_premium: float, call_premium: float):
    """Collar（買股 + 買 K_put put + 賣 K_call call）到期每股損益。"""
    raise NotImplementedError("TODO")


def collar_bounds(S0: float, K_put: float, K_call: float, put_premium: float, call_premium: float) -> dict:
    """Collar 的最大損失與最大獲利（每股）。

    net = put_premium − call_premium（淨支出）
    max_loss = K_put − S0 − net（通常為負）；max_gain = K_call − S0 − net
    回傳 {"max_loss", "max_gain"}。
    """
    raise NotImplementedError("TODO")


def zero_cost_collar_call_strike(S: float, K_put: float, t: float, sigma: float, r: float = 0.0,
                                 q: float = 0.0, sigma_call: float | None = None) -> float:
    """找 call 履約價 K_call，使 BS call(K_call) = BS put(K_put)（賣 call 的錢剛好付 put）。

    sigma_call 為 call 使用的波動率（預設與 sigma 相同，可用來表達 skew）。
    call 價格隨 K 遞減，在 [0.01·S, 10·S] 用 brentq 求根即可。
    """
    raise NotImplementedError("TODO")


def portfolio_value(legs: list[dict], S: float, r: float = 0.0, q: float = 0.0, elapsed: float = 0.0,
                    vol_shift: float = 0.0) -> float:
    """部位理論價值。stock 腳價值 = qty × S；選擇權用 BS(S, K, expiry − elapsed, sigma + vol_shift)。

    vol_shift 以「小數」表示（+2 個 vol 點 = 0.02），套用到每隻腳。
    """
    raise NotImplementedError("TODO")


def portfolio_greeks(legs: list[dict], S: float, r: float = 0.0, q: float = 0.0, elapsed: float = 0.0) -> dict:
    """部位 Greeks：{"delta","gamma","vega"(每點),"theta"(每日)}。stock 腳只貢獻 delta = qty。"""
    raise NotImplementedError("TODO")


def scenario_grid(legs: list[dict], S0: float, price_moves_pct, vol_moves_pts, r: float = 0.0,
                  q: float = 0.0, days_forward: float = 0.0) -> pd.DataFrame:
    """情境矩陣：列 = 標的價格變動（%），欄 = 波動率變動（vol 點），值 = 相對於「現在」的損益。

    情境價值 = portfolio_value(legs, S0·(1 + move/100), r, q, elapsed=days_forward/365, vol_shift=pts/100)
    損益 = 情境價值 − portfolio_value(legs, S0, r, q)
    回傳 DataFrame（index=list(price_moves_pct)、columns=list(vol_moves_pts)）。
    """
    raise NotImplementedError("TODO")


def greeks_ladder(legs: list[dict], S_grid, r: float = 0.0, q: float = 0.0) -> pd.DataFrame:
    """Greeks 階梯：對每個標的價格計算 portfolio_greeks。

    回傳 DataFrame，index = S_grid，columns = ["delta","gamma","vega","theta"]。
    """
    raise NotImplementedError("TODO")


def worst_case(grid: pd.DataFrame) -> tuple[float, float, float]:
    """回傳情境矩陣中的最差損益與其位置：(最小損益, 價格變動%, 波動率變動點)。"""
    raise NotImplementedError("TODO")


def gamma_vega_neutral_hedge(position: dict, opt_a: dict, opt_b: dict) -> tuple[float, float, float]:
    """用選擇權 A、B 各 n_a、n_b 口把部位的 gamma 與 vega 歸零，再用標的把 delta 歸零。

    解聯立方程：
        n_a·Γ_a + n_b·Γ_b = −Γ_pos
        n_a·V_a + n_b·V_b = −V_pos
    標的數量 = −(Δ_pos + n_a·Δ_a + n_b·Δ_b)
    各參數為含 "delta","gamma","vega" 的 dict。回傳 (n_a, n_b, n_stock)。
    """
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    from optlib import demo_print

    book = [{"kind": "stock", "qty": 4},
            {"kind": "call", "K": 105, "qty": -5, "expiry": 0.25, "sigma": 0.24},
            {"kind": "put", "K": 95, "qty": 3, "expiry": 0.25, "sigma": 0.29},
            {"kind": "call", "K": 100, "qty": -2, "expiry": 0.5, "sigma": 0.26}]
    demo_print("保護性賣權 @[85,100,115]", protective_put_pnl, np.array([85, 100, 115]), 100, 95, 2.1)
    demo_print("掩護性買權 @[85,100,115]", covered_call_pnl, np.array([85, 100, 115]), 100, 105, 2.4)
    demo_print("collar @[85,100,115]", collar_pnl, np.array([85, 100, 115]), 100, 95, 105, 2.1, 2.4)
    demo_print("collar 上下限", collar_bounds, 100, 95, 105, 2.1, 2.4)
    demo_print("零成本 collar 的 call 履約價", zero_cost_collar_call_strike, 100, 92, 0.5, 0.25, 0.03)
    demo_print("部位價值", portfolio_value, book, 100.0)
    demo_print("部位 Greeks", portfolio_greeks, book, 100.0)
    demo_print("情境矩陣（7 天後）", lambda: "\n" + str(
        scenario_grid(book, 100.0, [-10, -5, 0, 5, 10], [-5, 0, 5], days_forward=7).round(2)))
    demo_print("Greeks 階梯", lambda: "\n" + str(greeks_ladder(book, [90, 95, 100, 105, 110]).round(3)))
    demo_print("最差情境", lambda: worst_case(scenario_grid(book, 100.0, [-10, -5, 0, 5, 10], [-5, 0, 5], days_forward=7)))
    demo_print("gamma/vega 中和", gamma_vega_neutral_hedge, {"delta": 0.1, "gamma": -0.124, "vega": -0.955},
               {"delta": 0.52, "gamma": 0.031, "vega": 0.20}, {"delta": 0.55, "gamma": 0.022, "vega": 0.28})
