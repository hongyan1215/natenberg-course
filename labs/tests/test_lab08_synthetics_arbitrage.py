"""Lab 08 測試：平價、合成部位、conversion/reversal、box、jelly roll、套利掃描、pin risk。"""
import math

import pytest

import optlib
from conftest import load_lab

lab = load_lab("lab08_synthetics_arbitrage")
S, K, T, R, Q, SIG = 71.5, 70.0, 0.5, 0.04, 0.01, 0.3


def _bs(kind, k=K, t=T, q=Q):
    return optlib.bs_price(S, k, t, SIG, R, q, kind)


def test_parity_residual_zero_for_model_prices():
    assert lab.parity_residual(_bs("call"), _bs("put"), S, K, T, R, Q) == pytest.approx(0, abs=1e-10)
    assert lab.parity_residual(_bs("call") + 0.25, _bs("put"), S, K, T, R, Q) == pytest.approx(0.25)


def test_synthetic_forward():
    C, P = _bs("call", q=0), _bs("put", q=0)
    assert lab.synthetic_forward_price(C, P, K, T, R) == pytest.approx(S * math.exp(R * T))


def test_synthetic_call_put():
    C, P = _bs("call"), _bs("put")
    assert lab.synthetic_call(P, S, K, T, R, Q) == pytest.approx(C)
    assert lab.synthetic_put(C, S, K, T, R, Q) == pytest.approx(P)
    # 含離散股利（以現值表示）
    assert lab.synthetic_put(5.0, S, K, T, R, 0.0, div_pv=1.0) - lab.synthetic_put(5.0, S, K, T, R) == pytest.approx(1.0)


def test_conversion_reversal_profit():
    C, P = _bs("call", q=0), _bs("put", q=0)
    assert lab.conversion_profit(C, P, S, K, T, R) == pytest.approx(0, abs=1e-10)
    assert lab.conversion_profit(C + 0.3, P, S, K, T, R) == pytest.approx(0.3)
    # 與到期價值一致：conversion 在到期必定變成 K
    profit = lab.conversion_profit(6.1, 4.3, S, K, T, R)
    assert profit == pytest.approx(6.1 - 4.3 - S + K * math.exp(-R * T))


def test_box_value_and_implied_rate():
    bv = lab.box_value(65, 75, T, R)
    assert bv == pytest.approx(10 * math.exp(-R * T))
    assert lab.implied_rate_from_box(bv, 65, 75, T) == pytest.approx(R)
    # 用模型價格組 box，應等於理論值
    box = (_bs("call", 65) - _bs("call", 75)) + (_bs("put", 75) - _bs("put", 65))
    assert box == pytest.approx(bv)


def test_implied_dividend():
    div_pv = 0.8 * math.exp(-R * 0.2)
    # 0.2 年後付 0.8 元股利；用「託管股利」模型（S − PV(D)）產生一致的 call/put 價格
    Sx = S - div_pv
    C, P = optlib.bs_price(Sx, K, T, SIG, R), optlib.bs_price(Sx, K, T, SIG, R, kind="put")
    assert lab.implied_dividend_pv(C, P, S, K, T, R) == pytest.approx(div_pv)
    assert lab.parity_residual(C, P, S, K, T, R, 0.0, div_pv) == pytest.approx(0, abs=1e-10)


def test_jelly_roll():
    t1, t2 = 0.25, 0.75
    v = lab.jelly_roll_value(S, K, t1, t2, R)
    assert v == pytest.approx(K * (math.exp(-R * t1) - math.exp(-R * t2)))
    # 與模型價格組出的 jelly roll 一致（無股利）
    jr = (optlib.bs_price(S, K, t2, SIG, R) - optlib.bs_price(S, K, t2, SIG, R, kind="put")) - \
         (optlib.bs_price(S, K, t1, SIG, R) - optlib.bs_price(S, K, t1, SIG, R, kind="put"))
    assert jr == pytest.approx(v)
    # 期間內的股利讓 jelly roll 變便宜；期間外的股利不影響
    v_div = lab.jelly_roll_value(S, K, t1, t2, R, [(0.5, 0.8), (0.1, 5.0)])
    assert v - v_div == pytest.approx(0.8 * math.exp(-R * 0.5))


def test_scan_parity_arbitrage():
    chain = []
    for k in (65, 70, 75):
        c, p = _bs("call", k, q=0), _bs("put", k, q=0)
        chain.append({"K": k, "call_bid": c - 0.05, "call_ask": c + 0.05, "put_bid": p - 0.05, "put_ask": p + 0.05})
    assert lab.scan_parity_arbitrage(chain, S, T, R) == []  # 公平報價、有價差 → 無套利
    chain[1]["call_bid"] += 0.4   # 70 call 被抬高 → conversion
    chain[1]["call_ask"] += 0.4
    chain[2]["put_bid"] += 0.3    # 75 put 被抬高 → reversal
    chain[2]["put_ask"] += 0.3
    opp = lab.scan_parity_arbitrage(chain, S, T, R)
    assert [(o["K"], o["strategy"]) for o in opp] == [(70, "conversion"), (75, "reversal")]
    assert opp[0]["profit"] == pytest.approx(0.4 - 0.1)
    assert opp[1]["profit"] == pytest.approx(0.3 - 0.1)
    # 交易成本 0.25 吃掉 75 的 reversal（0.2），只剩 70 的 conversion（0.3 − 0.25）
    opp_cost = lab.scan_parity_arbitrage(chain, S, T, R, cost=0.25)
    assert len(opp_cost) == 1 and opp_cost[0]["K"] == 70
    assert opp_cost[0]["profit"] == pytest.approx(0.05)


def test_scan_respects_cost():
    c, p = _bs("call", 70, q=0), _bs("put", 70, q=0)
    chain = [{"K": 70, "call_bid": c + 0.2, "call_ask": c + 0.3, "put_bid": p - 0.05, "put_ask": p + 0.05}]
    opp = lab.scan_parity_arbitrage(chain, S, T, R)
    assert len(opp) == 1 and opp[0]["profit"] == pytest.approx(0.15)
    assert lab.scan_parity_arbitrage(chain, S, T, R, cost=0.2) == []


def test_conversion_expiry_stock_pin_risk():
    assert lab.conversion_expiry_stock(70, 75, 10) == 0
    assert lab.conversion_expiry_stock(70, 65, 10) == 0
    assert lab.conversion_expiry_stock(70, 70, 10, call_assigned=True) == 0
    assert lab.conversion_expiry_stock(70, 70, 10, call_assigned=False) == 10
    with pytest.raises(ValueError):
        lab.conversion_expiry_stock(70, 70, 10)
