"""Lab 07 測試：策略建構、組合 Greeks、價差分類、損益兩平波動率。"""
import math

import pytest

import optlib
from conftest import load_lab

lab = load_lab("lab07_spreads")
S, SIG, R = 100.0, 0.25, 0.02


def _qtys(legs):
    return [(l["kind"], l["K"], l["qty"], l["expiry"]) for l in legs]


def test_builders_structure():
    assert lab.make_leg("put", 95, -2, 0.5) == {"kind": "put", "K": 95, "qty": -2, "expiry": 0.5}
    assert _qtys(lab.straddle(100, 0.25, 3)) == [("call", 100, 3, 0.25), ("put", 100, 3, 0.25)]
    assert _qtys(lab.strangle(95, 105, 0.25)) == [("put", 95, 1, 0.25), ("call", 105, 1, 0.25)]
    assert _qtys(lab.vertical_spread("call", 95, 105, 0.25)) == [("call", 95, 1, 0.25), ("call", 105, -1, 0.25)]
    assert _qtys(lab.vertical_spread("put", 95, 105, 0.25, bullish=False)) == [("put", 95, -1, 0.25), ("put", 105, 1, 0.25)]
    assert _qtys(lab.butterfly("put", 90, 100, 110, 0.5, 2)) == [("put", 90, 2, 0.5), ("put", 100, -4, 0.5), ("put", 110, 2, 0.5)]
    assert _qtys(lab.calendar_spread("call", 100, 0.1, 0.3)) == [("call", 100, -1, 0.1), ("call", 100, 1, 0.3)]
    assert _qtys(lab.ratio_spread("call", 100, 110, 0.25, 3)) == [("call", 100, 1, 0.25), ("call", 110, -3, 0.25)]


def test_position_value_matches_reference_and_bounds():
    legs = lab.vertical_spread("call", 95, 105, 0.5)
    v = lab.position_value(legs, S, SIG, R)
    ref = optlib.bs_price(S, 95, 0.5, SIG, R) - optlib.bs_price(S, 105, 0.5, SIG, R)
    assert v == pytest.approx(ref)
    assert 0 < v < 10 * math.exp(-R * 0.5)
    assert lab.position_value(lab.butterfly("call", 95, 100, 105, 0.25), S, SIG, R) > 0
    # elapsed：時間經過後重新定價
    v_later = lab.position_value(lab.straddle(100, 0.25), S, SIG, R, elapsed=0.2)
    assert v_later == pytest.approx(optlib.bs_price(S, 100, 0.05, SIG, R) + optlib.bs_price(S, 100, 0.05, SIG, R, kind="put"))


def test_leg_specific_sigma():
    legs = lab.strangle(90, 110, 0.25)
    legs[0]["sigma"] = 0.35  # put 翼較貴（skew）
    v = lab.position_value(legs, S, SIG, R)
    assert v == pytest.approx(optlib.bs_price(S, 90, 0.25, 0.35, R, kind="put") + optlib.bs_price(S, 110, 0.25, SIG, R))


def test_position_greeks_vs_finite_difference():
    legs = lab.calendar_spread("put", 100, 0.1, 0.4) + lab.vertical_spread("call", 95, 110, 0.25)
    g = lab.position_greeks(legs, S, SIG, R)
    h = 0.01
    up, dn, mid = (lab.position_value(legs, x, SIG, R) for x in (S + h, S - h, S))
    assert g["delta"] == pytest.approx((up - dn) / (2 * h), abs=1e-6)
    assert g["gamma"] == pytest.approx((up - 2 * mid + dn) / h**2, rel=1e-3)
    vup, vdn = lab.position_value(legs, S, SIG + 1e-4, R), lab.position_value(legs, S, SIG - 1e-4, R)
    assert g["vega"] == pytest.approx((vup - vdn) / 2e-4 / 100, rel=1e-5)
    th = (lab.position_value(legs, S, SIG, R, elapsed=1e-5) - mid) / 1e-5 / 365
    assert g["theta"] == pytest.approx(th, rel=1e-3)


@pytest.mark.parametrize("builder,expected_vol", [
    (lambda: lab.straddle(100, 0.25), "long_vol"),
    (lambda: lab.straddle(100, 0.25, -1), "short_vol"),
    (lambda: lab.strangle(90, 110, 0.25), "long_vol"),
    (lambda: lab.butterfly("call", 90, 100, 110, 0.25), "short_vol"),
    (lambda: lab.ratio_spread("call", 100, 110, 0.25, 2), "short_vol"),
    (lambda: lab.ratio_spread("call", 100, 110, 0.25, 2, qty=-1), "long_vol"),  # backspread
    (lambda: lab.calendar_spread("call", 100, 0.1, 0.4), "mixed"),
])
def test_classify_volatility_type(builder, expected_vol):
    g = lab.position_greeks(builder(), S, SIG, R)
    assert lab.classify_spread(g)["volatility"] == expected_vol


def test_classify_direction():
    bull = lab.position_greeks(lab.vertical_spread("call", 95, 105, 0.25), S, SIG, R)
    bear = lab.position_greeks(lab.vertical_spread("put", 95, 105, 0.25, bullish=False), S, SIG, R)
    assert lab.classify_spread(bull)["direction"] == "bullish"
    assert lab.classify_spread(bear)["direction"] == "bearish"
    assert lab.classify_spread({"delta": 0.01, "gamma": 0.0, "vega": 0.0}) == {"direction": "neutral", "volatility": "neutral"}


def test_delta_neutral_ratio_builds_neutral_spread():
    d_long = optlib.bs_delta(S, 100, 0.25, SIG, R)
    d_short = optlib.bs_delta(S, 110, 0.25, SIG, R)
    x = lab.delta_neutral_ratio(d_long, d_short)
    legs = lab.ratio_spread("call", 100, 110, 0.25, ratio=x)
    assert lab.position_greeks(legs, S, SIG, R)["delta"] == pytest.approx(0.0, abs=1e-12)


def test_breakeven_volatility_round_trip():
    legs = lab.straddle(100, 0.25)
    cost = lab.position_value(legs, S, 0.31, R)
    assert lab.breakeven_volatility(legs, cost, S, R) == pytest.approx(0.31, abs=1e-8)
    fly = lab.butterfly("call", 90, 100, 110, 0.25, qty=-1)  # 賣蝶式 = 買波動率
    cost_fly = lab.position_value(fly, S, 0.22, R)
    assert lab.breakeven_volatility(fly, cost_fly, S, R, lo=0.05, hi=0.6) == pytest.approx(0.22, abs=1e-6)
    with pytest.raises(ValueError):
        lab.breakeven_volatility(legs, 1000.0, S, R)
