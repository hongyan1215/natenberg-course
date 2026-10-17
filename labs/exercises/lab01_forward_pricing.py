"""Lab 01（練習版）：遠期價格、股利與套利（對應 ch01–ch02）

請在 exercises/ 這份檔案中，把每個 `raise NotImplementedError("TODO")` 換成你的實作，
再執行對應的 pytest 檢查（見 labs/README.md）。函式由易到難排列。

目標：
- 熟悉單利 / 連續複利的終值與現值
- 計算股票、指數（連續股利率）、商品、外匯的遠期價格
- 從市場價格反推隱含利率（implied repo）與隱含股利
- 判斷 cash-and-carry / reverse cash-and-carry 套利方向與利潤
- 考慮借貸利差下的無套利區間

慣例：時間單位為年；利率為年化小數。dividends 皆為 [(付息時間(年), 金額), ...]。
"""
from __future__ import annotations

import math
from typing import Sequence

Dividends = Sequence[tuple[float, float]]


def future_value(pv: float, r: float, t: float, compounding: str = "continuous") -> float:
    """把今天的金額 pv 滾到 t 年後的終值。

    compounding='continuous'：FV = pv · e^{rt}
    compounding='simple'    ：FV = pv · (1 + r t)
    其他值請 raise ValueError。
    """
    raise NotImplementedError("TODO")


def present_value(fv: float, r: float, t: float, compounding: str = "continuous") -> float:
    """把 t 年後的金額 fv 折現回今天（future_value 的反函數）。

    continuous：PV = fv · e^{−rt}；simple：PV = fv / (1 + r t)。
    """
    raise NotImplementedError("TODO")


def pv_dividends(dividends: Dividends, r: float, t: float) -> float:
    """在 [0, t] 之間（0 < t_i ≤ t）支付的所有股利，以連續複利折現到今天的總和。

    PV = Σ D_i · e^{−r t_i}（t_i > t 的股利不計入）
    """
    raise NotImplementedError("TODO")


def forward_price_stock(S: float, r: float, t: float, dividends: Dividends = ()) -> float:
    """有離散現金股利的股票遠期價格（連續複利）。

    F = (S − PV(股利)) · e^{rt}
    直覺：買現股要付資金成本，但能領到到期前的股利。
    """
    raise NotImplementedError("TODO")


def forward_price_simple(S: float, r: float, t: float, dividends: Dividends = ()) -> float:
    """單利版本的股票遠期價格（交易員心算常用）。

    F = S(1 + r t) − Σ D_i (1 + r (t − t_i))
    （每筆股利從領到那天起，以單利再投資到到期日）
    """
    raise NotImplementedError("TODO")


def forward_price_yield(S: float, r: float, q: float, t: float) -> float:
    """連續股利率 q 的指數 / 外匯遠期價格：F = S · e^{(r − q)t}。

    外匯時 r 為本國利率、q 為外國利率。
    """
    raise NotImplementedError("TODO")


def forward_price_commodity(S: float, r: float, t: float, storage_cost_pv: float = 0.0,
                            convenience_yield: float = 0.0) -> float:
    """實物商品遠期價格。

    F = (S + U) · e^{(r − y)t}
    U：倉儲 / 保險等持有成本的現值（storage_cost_pv）；y：便利殖利率（convenience yield）。
    """
    raise NotImplementedError("TODO")


def futures_variation_margin(settle_prices: Sequence[float], qty: int, multiplier: float) -> list[float]:
    """期貨每日結算（mark-to-market）的現金流。

    settle_prices[0] 為成交價，其後為每日結算價；回傳每日的變動保證金
    cash_i = qty · multiplier · (P_i − P_{i−1})，長度 = len(settle_prices) − 1。
    qty 為正代表多單、負代表空單。
    """
    raise NotImplementedError("TODO")


def implied_repo_rate(S: float, F: float, t: float, dividends: Dividends = ()) -> float:
    """由現貨與遠期價格反推隱含融資利率（implied repo rate）。

    由 F = (S − PV(D)) e^{rt} 解 r。注意 PV(D) 本身與 r 有關，
    請用數值方法（例如固定點迭代或 scipy.optimize.brentq，r 在 [−0.5, 1.0] 內）求解。
    無股利時有封閉解 r = ln(F/S)/t。
    """
    raise NotImplementedError("TODO")


def implied_dividend_pv(S: float, F: float, r: float, t: float) -> float:
    """由遠期價格反推市場隱含的股利現值：PV(D) = S − F · e^{−rt}。"""
    raise NotImplementedError("TODO")


def cash_and_carry_arbitrage(S: float, F_market: float, r: float, t: float,
                             dividends: Dividends = ()) -> dict:
    """判斷遠期是否錯價，以及套利方向與每單位到期利潤。

    回傳 dict：
      'fair_forward' : 理論遠期價格（forward_price_stock）
      'mispricing'   : F_market − fair_forward
      'action'       : 'cash_and_carry'（遠期太貴：借錢買現貨、賣遠期）
                       'reverse_cash_and_carry'（遠期太便宜：放空現貨、買遠期）
                       'none'（|mispricing| < 1e-9）
      'profit_at_expiry': 每單位在到期日鎖定的利潤（≥ 0），= |mispricing|
    """
    raise NotImplementedError("TODO")


def no_arbitrage_band(S_bid: float, S_ask: float, r_borrow: float, r_lend: float, t: float,
                      dividends: Dividends = (), cost_per_unit: float = 0.0) -> tuple[float, float]:
    """考慮買賣價差、借貸利差與交易成本的遠期無套利區間 (F_low, F_high)。

    - 上界（做 cash-and-carry 的門檻）：以 S_ask 買現貨、用借款利率 r_borrow 融資，
      股利以 r_borrow 折現：F_high = (S_ask − PV_borrow(D)) e^{r_borrow t} + cost
    - 下界（做 reverse 的門檻）：以 S_bid 放空現貨、所得以 r_lend 存放，
      股利以 r_lend 折現：F_low = (S_bid − PV_lend(D)) e^{r_lend t} − cost
    遠期價格落在區間內則無套利機會。
    """
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from optlib import demo_print

    divs = [(0.25, 1.0), (0.75, 1.0)]
    demo_print("FV(100, 5%, 1y, 連續)", future_value, 100, 0.05, 1)
    demo_print("PV(105, 5%, 1y, 單利)", present_value, 105, 0.05, 1, "simple")
    demo_print("股利現值", pv_dividends, divs, 0.04, 1.0)
    demo_print("股票遠期（連續）", forward_price_stock, 80, 0.04, 1.0, divs)
    demo_print("股票遠期（單利）", forward_price_simple, 80, 0.04, 1.0, divs)
    demo_print("指數遠期 q=2%", forward_price_yield, 18000, 0.03, 0.02, 0.5)
    demo_print("商品遠期", forward_price_commodity, 60, 0.04, 0.5, 1.2)
    demo_print("期貨每日結算", futures_variation_margin, [100, 101.5, 99.0, 100.2], 2, 50)
    demo_print("隱含 repo", implied_repo_rate, 80, 81.3, 1.0, divs)
    demo_print("隱含股利現值", implied_dividend_pv, 80, 81.3, 0.04, 1.0)
    demo_print("套利判斷", cash_and_carry_arbitrage, 80, 82.0, 0.04, 1.0, divs)
    demo_print("無套利區間", no_arbitrage_band, 79.95, 80.05, 0.05, 0.03, 1.0, divs, 0.02)
