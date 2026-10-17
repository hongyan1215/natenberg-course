"""Lab 01 測試：遠期價格、股利與套利。"""
import math

import pytest

from conftest import load_lab

lab = load_lab("lab01_forward_pricing")
DIVS = [(0.25, 1.0), (0.75, 1.0)]


def test_future_value_known():
    assert lab.future_value(100, 0.05, 1) == pytest.approx(105.127109637602)
    assert lab.future_value(100, 0.05, 2, "simple") == pytest.approx(110.0)
    with pytest.raises(ValueError):
        lab.future_value(100, 0.05, 1, "weekly")


def test_present_value_inverts_future_value():
    for comp in ("continuous", "simple"):
        fv = lab.future_value(123.4, 0.07, 1.7, comp)
        assert lab.present_value(fv, 0.07, 1.7, comp) == pytest.approx(123.4)


def test_pv_dividends_ignores_after_expiry():
    pv = lab.pv_dividends(DIVS + [(1.5, 3.0)], 0.04, 1.0)
    expected = math.exp(-0.04 * 0.25) + math.exp(-0.04 * 0.75)
    assert pv == pytest.approx(expected)
    assert lab.pv_dividends([], 0.04, 1.0) == 0.0


def test_forward_stock_no_dividend_and_with_dividend():
    assert lab.forward_price_stock(80, 0.04, 1.0) == pytest.approx(80 * math.exp(0.04))
    f = lab.forward_price_stock(80, 0.04, 1.0, DIVS)
    assert f == pytest.approx((80 - lab.pv_dividends(DIVS, 0.04, 1.0)) * math.exp(0.04))
    assert f < lab.forward_price_stock(80, 0.04, 1.0)  # 股利讓遠期變便宜


def test_forward_simple_close_to_continuous():
    f_simple = lab.forward_price_simple(80, 0.04, 1.0, DIVS)
    assert f_simple == pytest.approx(80 * 1.04 - 1.0 * (1 + 0.04 * 0.75) - 1.0 * (1 + 0.04 * 0.25))
    assert abs(f_simple - lab.forward_price_stock(80, 0.04, 1.0, DIVS)) < 0.1


def test_forward_yield_and_commodity():
    assert lab.forward_price_yield(18000, 0.03, 0.02, 0.5) == pytest.approx(18000 * math.exp(0.005))
    assert lab.forward_price_yield(100, 0.03, 0.03, 2.0) == pytest.approx(100.0)
    f = lab.forward_price_commodity(60, 0.04, 0.5, 1.2)
    assert f == pytest.approx(61.2 * math.exp(0.02))
    # 便利殖利率高到一定程度 → 逆價差（backwardation）
    assert lab.forward_price_commodity(60, 0.04, 0.5, 0.0, 0.10) < 60


def test_futures_variation_margin():
    cash = lab.futures_variation_margin([100, 101.5, 99.0, 100.2], 2, 50)
    assert cash == pytest.approx([150.0, -250.0, 120.0])
    assert sum(cash) == pytest.approx(2 * 50 * (100.2 - 100))
    short = lab.futures_variation_margin([100, 101.5], -3, 10)
    assert short == pytest.approx([-45.0])


def test_implied_repo_round_trip():
    assert lab.implied_repo_rate(100, 100 * math.exp(0.03 * 0.5), 0.5) == pytest.approx(0.03)
    f = lab.forward_price_stock(80, 0.045, 1.0, DIVS)
    assert lab.implied_repo_rate(80, f, 1.0, DIVS) == pytest.approx(0.045, abs=1e-9)


def test_implied_dividend_pv():
    f = lab.forward_price_stock(80, 0.04, 1.0, DIVS)
    assert lab.implied_dividend_pv(80, f, 0.04, 1.0) == pytest.approx(lab.pv_dividends(DIVS, 0.04, 1.0))


def test_cash_and_carry_directions():
    fair = lab.forward_price_stock(80, 0.04, 1.0, DIVS)
    rich = lab.cash_and_carry_arbitrage(80, fair + 0.5, 0.04, 1.0, DIVS)
    assert rich["action"] == "cash_and_carry"
    assert rich["fair_forward"] == pytest.approx(fair)
    assert rich["profit_at_expiry"] == pytest.approx(0.5)
    cheap = lab.cash_and_carry_arbitrage(80, fair - 0.3, 0.04, 1.0, DIVS)
    assert cheap["action"] == "reverse_cash_and_carry"
    assert cheap["mispricing"] == pytest.approx(-0.3)
    assert cheap["profit_at_expiry"] == pytest.approx(0.3)
    flat = lab.cash_and_carry_arbitrage(80, fair, 0.04, 1.0, DIVS)
    assert flat["action"] == "none" and flat["profit_at_expiry"] == 0.0


def test_no_arbitrage_band():
    lo, hi = lab.no_arbitrage_band(79.95, 80.05, 0.05, 0.03, 1.0, DIVS, 0.02)
    mid_fair = lab.forward_price_stock(80, 0.04, 1.0, DIVS)
    assert lo < mid_fair < hi
    assert hi == pytest.approx(lab.forward_price_stock(80.05, 0.05, 1.0, DIVS) + 0.02)
    assert lo == pytest.approx(lab.forward_price_stock(79.95, 0.03, 1.0, DIVS) - 0.02)
    # 沒有價差、沒有利差、沒有成本 → 區間退化成一點
    lo2, hi2 = lab.no_arbitrage_band(80, 80, 0.04, 0.04, 1.0, DIVS)
    assert lo2 == pytest.approx(hi2)
