"""Lab 03 測試：期望值定價、N(x)、Black-Scholes、Black-76、蒙地卡羅。"""
import math

import numpy as np
import pytest
from scipy.stats import norm

import optlib
from conftest import load_lab

lab = load_lab("lab03_pricing_models")


@pytest.mark.parametrize("x", [-3.0, -1.2, 0.0, 0.5, 1.96, 4.0])
def test_norm_pdf_cdf(x):
    assert lab.norm_pdf(x) == pytest.approx(norm.pdf(x), rel=1e-12)
    assert lab.norm_cdf(x) == pytest.approx(norm.cdf(x), abs=1e-12)


def test_norm_cdf_approx_accuracy_and_symmetry():
    xs = np.linspace(-6, 6, 241)
    err = max(abs(lab.norm_cdf_approx(float(x)) - norm.cdf(x)) for x in xs)
    assert err < 1e-7
    assert lab.norm_cdf_approx(0.7) + lab.norm_cdf_approx(-0.7) == pytest.approx(1.0, abs=1e-12)


def test_expected_value():
    assert lab.expected_value([90, 100, 110], [0.25, 0.5, 0.25]) == pytest.approx(100.0)
    with pytest.raises(ValueError):
        lab.expected_value([1, 2], [0.3, 0.3])


def test_option_value_from_distribution():
    prices, probs = [80, 90, 100, 110, 120], [0.1, 0.2, 0.4, 0.2, 0.1]
    c = lab.option_value_from_distribution(prices, probs, 100, "call")
    assert c == pytest.approx(0.2 * 10 + 0.1 * 20)
    p = lab.option_value_from_distribution(prices, probs, 95, "put", r=0.04, t=0.5)
    assert p == pytest.approx(math.exp(-0.02) * (0.2 * 5 + 0.1 * 15))


def test_d1_d2_known():
    d1, d2 = lab.d1_d2(100, 100, 1.0, 0.2, 0.05)
    assert d1 == pytest.approx(0.35)
    assert d2 == pytest.approx(0.15)


def test_bs_known_values():
    # 教科書經典值：S=K=100, t=1, σ=20%, r=5%
    assert lab.bs_call(100, 100, 1.0, 0.2, 0.05) == pytest.approx(10.450583572185565, abs=1e-10)
    assert lab.bs_put(100, 100, 1.0, 0.2, 0.05) == pytest.approx(5.573526022256971, abs=1e-10)


@pytest.mark.parametrize("S,K,t,sig,r,q", [(62, 60, 0.4, 0.28, 0.02, 0.01), (45, 55, 1.5, 0.45, 0.05, 0.03),
                                           (100, 80, 0.05, 0.15, 0.0, 0.0)])
def test_bs_matches_reference_and_parity(S, K, t, sig, r, q):
    c, p = lab.bs_call(S, K, t, sig, r, q), lab.bs_put(S, K, t, sig, r, q)
    assert c == pytest.approx(optlib.bs_price(S, K, t, sig, r, q, "call"), abs=1e-10)
    assert p == pytest.approx(optlib.bs_price(S, K, t, sig, r, q, "put"), abs=1e-10)
    assert lab.put_from_call_parity(c, S, K, t, r, q) == pytest.approx(p, abs=1e-10)


def test_bs_bounds_and_monotonicity():
    S, K, t, r, q = 50, 52, 0.5, 0.03, 0.0
    vols = [0.1, 0.2, 0.3, 0.5]
    calls = [lab.bs_call(S, K, t, v, r, q) for v in vols]
    assert all(b > a for a, b in zip(calls, calls[1:]))  # 波動率越高越貴
    for c in calls:
        assert max(S - K * math.exp(-r * t), 0) <= c <= S  # 無套利邊界
    strikes = [40, 45, 50, 55, 60]
    cs = [lab.bs_call(S, k, t, 0.3, r) for k in strikes]
    assert all(b < a for a, b in zip(cs, cs[1:]))  # call 隨履約價遞減


def test_black76():
    F, K, t, s, r = 2450, 2500, 0.25, 0.18, 0.03
    assert lab.black76(F, K, t, s, r, "call") == pytest.approx(optlib.black76_price(F, K, t, s, r, "call"), abs=1e-8)
    c, p = lab.black76(F, K, t, s, r, "call"), lab.black76(F, K, t, s, r, "put")
    assert c - p == pytest.approx(math.exp(-r * t) * (F - K), abs=1e-8)  # 期貨版 parity


def test_prob_itm():
    pc = lab.prob_itm(62, 60, 0.4, 0.28, 0.02, 0.01, "call")
    pp = lab.prob_itm(62, 60, 0.4, 0.28, 0.02, 0.01, "put")
    assert pc + pp == pytest.approx(1.0)
    d2 = optlib.d1_d2(62, 60, 0.4, 0.28, 0.02, 0.01)[1]
    assert pc == pytest.approx(norm.cdf(d2))


def test_monte_carlo_agrees_with_bs():
    price, se = lab.monte_carlo_price(62, 60, 0.4, 0.28, 0.02, 0.01, "call", 200_000, seed=1)
    exact = optlib.bs_price(62, 60, 0.4, 0.28, 0.02, 0.01, "call")
    assert 0 < se < 0.05
    assert abs(price - exact) < 4 * se
    price_p, se_p = lab.monte_carlo_price(62, 60, 0.4, 0.28, 0.02, 0.01, "put", 200_000, seed=2)
    assert abs(price_p - optlib.bs_price(62, 60, 0.4, 0.28, 0.02, 0.01, "put")) < 4 * se_p
