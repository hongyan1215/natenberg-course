"""Lab 02 測試：到期損益、損益兩平、斜率。"""
import math

import numpy as np
import pytest

from conftest import load_lab

lab = load_lab("lab02_payoffs")

BULL = [{"kind": "call", "K": 50, "qty": 1, "price": 3.2},
        {"kind": "call", "K": 55, "qty": -1, "price": 1.1}]
SHORT_STRADDLE = [{"kind": "call", "K": 50, "qty": -1, "price": 2.4},
                  {"kind": "put", "K": 50, "qty": -1, "price": 2.1}]
COVERED_CALL = [{"kind": "stock", "qty": 1, "price": 48.0},
                {"kind": "call", "K": 52, "qty": -1, "price": 1.5}]


def test_payoffs_vectorized():
    S = np.array([40.0, 50.0, 60.0])
    np.testing.assert_allclose(lab.call_payoff(S, 50), [0, 0, 10])
    np.testing.assert_allclose(lab.put_payoff(S, 50), [10, 0, 0])
    # call − put = S − K（到期時的 parity）
    np.testing.assert_allclose(lab.call_payoff(S, 47) - lab.put_payoff(S, 47), S - 47)


def test_intrinsic_and_time_value():
    assert lab.intrinsic_and_time_value(6.3, 53, 48, "call") == pytest.approx((5.0, 1.3))
    assert lab.intrinsic_and_time_value(1.2, 53, 48, "put") == pytest.approx((0.0, 1.2))


def test_round_to_tick():
    assert lab.round_to_tick(1.234, 0.05, "bid") == pytest.approx(1.20)
    assert lab.round_to_tick(1.234, 0.05, "ask") == pytest.approx(1.25)
    # 已在網格上（含浮點誤差）不應被移動
    assert lab.round_to_tick(0.1 + 0.2, 0.1, "ask") == pytest.approx(0.3)
    assert lab.round_to_tick(0.3, 0.1, "bid") == pytest.approx(0.3)


def test_classify_moneyness():
    assert lab.classify_moneyness(53, 50, "call") == "ITM"
    assert lab.classify_moneyness(53, 50, "put") == "OTM"
    assert lab.classify_moneyness(50.2, 50, "put", atm_tol=0.25) == "ATM"
    assert lab.classify_moneyness(47, 50, "put") == "ITM"


def test_exercise_settlement():
    assert lab.exercise_settlement("call", 50, 54, 3, 100) == pytest.approx({"shares": 300, "cash": -15000})
    assert lab.exercise_settlement("put", 50, 46, 2, 100) == pytest.approx({"shares": -200, "cash": 10000})
    # 賣方被指派
    assert lab.exercise_settlement("call", 50, 54, -1, 100) == pytest.approx({"shares": -100, "cash": 5000})
    # 價外不履約
    assert lab.exercise_settlement("put", 50, 54, 2, 100) == pytest.approx({"shares": 0, "cash": 0})
    # 現金交割 = 內含價值
    assert lab.exercise_settlement("call", 50, 54, 3, 100, physical=False) == pytest.approx({"shares": 0, "cash": 1200})


def test_leg_and_position_pnl():
    assert lab.leg_pnl(57.0, BULL[0]) == pytest.approx(3.8)
    assert lab.position_pnl(57.0, BULL) == pytest.approx(5 - 2.1)
    assert lab.position_pnl(40.0, BULL) == pytest.approx(-2.1)
    S = np.linspace(30, 80, 11)
    assert lab.position_pnl(S, COVERED_CALL).shape == S.shape
    assert lab.position_pnl(60.0, COVERED_CALL) == pytest.approx(52 - 48 + 1.5)


def test_breakevens():
    assert lab.breakevens(BULL, 30, 80) == pytest.approx([52.1], abs=1e-4)
    assert lab.breakevens(SHORT_STRADDLE, 30, 80) == pytest.approx([45.5, 54.5], abs=1e-4)
    assert lab.breakevens(COVERED_CALL, 30, 80) == pytest.approx([46.5], abs=1e-4)


def test_slope_profile():
    prof = lab.slope_profile(SHORT_STRADDLE)
    assert [p[2] for p in prof] == pytest.approx([1.0, -1.0])
    assert prof[0][0] == 0.0 and prof[-1][1] == math.inf
    butterfly = [{"kind": "call", "K": 45, "qty": 1, "price": 6.0},
                 {"kind": "call", "K": 50, "qty": -2, "price": 3.0},
                 {"kind": "call", "K": 55, "qty": 1, "price": 1.0}]
    assert [p[2] for p in lab.slope_profile(butterfly)] == pytest.approx([0, 1, -1, 0])
    assert [p[2] for p in lab.slope_profile(COVERED_CALL)] == pytest.approx([1, 0])


def test_max_profit_loss():
    mx, mn = lab.max_profit_loss(BULL)
    assert mx == pytest.approx(5 - 2.1) and mn == pytest.approx(-2.1)
    mx, mn = lab.max_profit_loss(SHORT_STRADDLE)
    assert mx == pytest.approx(4.5) and mn == -math.inf
    long_call = [{"kind": "call", "K": 50, "qty": 1, "price": 2.0}]
    assert lab.max_profit_loss(long_call) == (math.inf, pytest.approx(-2.0))
