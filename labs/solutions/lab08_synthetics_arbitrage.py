"""Lab 08（解答版）：買賣權平價、conversion / reversal、box、jelly roll（對應 ch14–ch15）

目標：
- 用買賣權平價（put-call parity）組合合成部位（synthetic）並找出錯價
- 計算 conversion / reversal 的鎖定利潤、box 與 jelly roll 的理論價值
- 從市場價格反推隱含利率、隱含股利
- 在有買賣價差的選擇權鏈上掃描可執行的套利
- 了解 pin risk：到期時標的剛好落在履約價附近，你不知道會不會被指派

慣例：歐式選擇權、連續複利；股利以「現值」或 [(時間, 金額)] 表示。
平價關係：C − P = S·e^{−qt} − PV(D) − K·e^{−rt}
"""
from __future__ import annotations

import math
from typing import Sequence


def parity_residual(C: float, P: float, S: float, K: float, t: float, r: float = 0.0,
                    q: float = 0.0, div_pv: float = 0.0) -> float:
    """平價殘差 = (C − P) − (S e^{−qt} − div_pv − K e^{−rt})。

    > 0：call 相對 put 太貴（做 conversion 賺錢）；< 0：put 相對太貴（做 reversal）。
    """
    return (C - P) - (S * math.exp(-q * t) - div_pv - K * math.exp(-r * t))


def synthetic_forward_price(C: float, P: float, K: float, t: float, r: float = 0.0) -> float:
    """由同履約價的 call、put 價格推出市場隱含的遠期價格：F = K + (C − P)·e^{rt}。"""
    return K + (C - P) * math.exp(r * t)


def synthetic_call(P: float, S: float, K: float, t: float, r: float = 0.0, q: float = 0.0,
                   div_pv: float = 0.0) -> float:
    """合成 call 的價值 = 買 put + 買股票 − 借 PV(K)：P + S e^{−qt} − div_pv − K e^{−rt}。"""
    return P + S * math.exp(-q * t) - div_pv - K * math.exp(-r * t)


def synthetic_put(C: float, S: float, K: float, t: float, r: float = 0.0, q: float = 0.0,
                  div_pv: float = 0.0) -> float:
    """合成 put 的價值 = 買 call + 放空股票 + 存 PV(K)：C − S e^{−qt} + div_pv + K e^{−rt}。"""
    return C - S * math.exp(-q * t) + div_pv + K * math.exp(-r * t)


def conversion_profit(C: float, P: float, S: float, K: float, t: float, r: float = 0.0,
                      div_pv: float = 0.0) -> float:
    """Conversion（買股票 + 賣 call + 買 put）今天鎖定的利潤（以現值表示）。

    到期時不論 S_T 為何，部位都以 K 賣出股票 → 價值 PV(K)。期間還領到股利。
    利潤 = C − P − S + K e^{−rt} + div_pv。Reversal 的利潤就是它的相反數。
    """
    return C - P - S + K * math.exp(-r * t) + div_pv


def box_value(K1: float, K2: float, t: float, r: float = 0.0) -> float:
    """Box（K1 < K2：買 K1 call、賣 K2 call、買 K2 put、賣 K1 put）到期必定值 K2 − K1，

    今天的理論價值 = (K2 − K1)·e^{−rt}。
    """
    return (K2 - K1) * math.exp(-r * t)


def implied_rate_from_box(box_price: float, K1: float, K2: float, t: float) -> float:
    """由 box 的市場價格反推無風險利率：r = −ln(box_price / (K2 − K1)) / t。"""
    return -math.log(box_price / (K2 - K1)) / t


def implied_dividend_pv(C: float, P: float, S: float, K: float, t: float, r: float = 0.0) -> float:
    """由平價反推市場隱含的股利現值（q=0）：div_pv = S − K e^{−rt} − (C − P)。"""
    return S - K * math.exp(-r * t) - (C - P)


def jelly_roll_value(S: float, K: float, t1: float, t2: float, r: float = 0.0,
                     dividends: Sequence[tuple[float, float]] = ()) -> float:
    """Jelly roll = 買遠月合成多頭（t2：+call −put）、賣近月合成多頭（t1：−call +put），同履約價 K。

    價值 = [S − PV(D 到 t2) − K e^{−r t2}] − [S − PV(D 到 t1) − K e^{−r t1}]
         = K (e^{−r t1} − e^{−r t2}) − PV(t1 < 除息時間 ≤ t2 的股利)
    dividends 為 [(時間, 金額)]，以 e^{−r·時間} 折現。
    """
    pv_between = sum(D * math.exp(-r * ti) for ti, D in dividends if t1 < ti <= t2)
    return K * (math.exp(-r * t1) - math.exp(-r * t2)) - pv_between


def scan_parity_arbitrage(chain: list[dict], S: float, t: float, r: float = 0.0, div_pv: float = 0.0,
                          cost: float = 0.0) -> list[dict]:
    """掃描選擇權鏈，找出「用買賣價成交後仍有利潤」的 conversion / reversal。

    chain 每列：{"K", "call_bid", "call_ask", "put_bid", "put_ask"}；股票以 S 成交（忽略股票價差）。
      conversion：賣 call @bid、買 put @ask、買股票 → 利潤 = call_bid − put_ask − S + K e^{−rt} + div_pv − cost
      reversal  ：買 call @ask、賣 put @bid、放空股票 → 利潤 = −call_ask + put_bid + S − K e^{−rt} − div_pv − cost
    回傳利潤 > 0 的機會 list：{"K", "strategy": "conversion"|"reversal", "profit"}，依 profit 由大到小排序。
    """
    out = []
    for row in chain:
        pvk = row["K"] * math.exp(-r * t)
        conv = row["call_bid"] - row["put_ask"] - S + pvk + div_pv - cost
        rev = -row["call_ask"] + row["put_bid"] + S - pvk - div_pv - cost
        if conv > 0:
            out.append({"K": row["K"], "strategy": "conversion", "profit": conv})
        if rev > 0:
            out.append({"K": row["K"], "strategy": "reversal", "profit": rev})
    return sorted(out, key=lambda d: d["profit"], reverse=True)


def conversion_expiry_stock(K: float, S_T: float, qty: int, call_assigned: bool | None = None) -> int:
    """持有 qty 組 conversion（+qty 股、−qty call、+qty put，同履約價 K）到期後剩下的股票部位。

    - S_T > K：call 被指派交出股票 → 0
    - S_T < K：你履約 put 賣出股票 → 0
    - S_T == K（pin）：你不會履約 put；call 是否被指派由對手決定 → 由 call_assigned 決定
        call_assigned=True → 0；False → +qty（你意外地仍持有股票，週末跳空風險）
        call_assigned=None 且 S_T == K → raise ValueError（資訊不足）
    """
    if S_T > K or S_T < K:
        return 0
    if call_assigned is None:
        raise ValueError("S_T == K 時必須指定 call 是否被指派")
    return 0 if call_assigned else qty


if __name__ == "__main__":
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from optlib import demo_print

    C, P, S, K, t, r = 6.10, 4.30, 71.5, 70.0, 0.5, 0.04
    chain = [{"K": 65, "call_bid": 9.2, "call_ask": 9.4, "put_bid": 1.6, "put_ask": 1.7},
             {"K": 70, "call_bid": 6.0, "call_ask": 6.2, "put_bid": 3.1, "put_ask": 3.2},
             {"K": 75, "call_bid": 3.4, "call_ask": 3.6, "put_bid": 5.7, "put_ask": 5.9}]
    demo_print("平價殘差", parity_residual, C, P, S, K, t, r)
    demo_print("合成遠期", synthetic_forward_price, C, P, K, t, r)
    demo_print("合成 call", synthetic_call, P, S, K, t, r)
    demo_print("合成 put", synthetic_put, C, S, K, t, r)
    demo_print("conversion 利潤", conversion_profit, C, P, S, K, t, r)
    demo_print("box(65,75)", box_value, 65, 75, t, r)
    demo_print("box 隱含利率", implied_rate_from_box, 9.78, 65, 75, t)
    demo_print("隱含股利現值", implied_dividend_pv, C, P, S, K, t, r)
    demo_print("jelly roll", jelly_roll_value, S, K, 0.25, 0.75, r, [(0.5, 0.8)])
    demo_print("套利掃描", scan_parity_arbitrage, chain, S, t, r)
    demo_print("pin：未被指派時的股票", conversion_expiry_stock, 70, 70, 10, False)
