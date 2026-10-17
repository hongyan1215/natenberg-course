"""Lab 05 測試：解析 Greeks、差分驗證、lambda、二階 Greeks、泰勒展開。"""
import math

import numpy as np
import pytest

import optlib
from conftest import load_lab

lab = load_lab("lab05_greeks")

CASES = [
    (48.0, 50.0, 0.25, 0.32, 0.03, 0.01),
    (100.0, 90.0, 1.0, 0.20, 0.05, 0.0),
    (100.0, 115.0, 0.08, 0.45, 0.0, 0.02),
]


@pytest.mark.parametrize("S,K,t,s,r,q", CASES)
@pytest.mark.parametrize("kind", ["call", "put"])
def test_analytic_greeks_match_reference(S, K, t, s, r, q, kind):
    assert lab.delta(S, K, t, s, r, q, kind) == pytest.approx(optlib.bs_delta(S, K, t, s, r, q, kind), abs=1e-12)
    assert lab.gamma(S, K, t, s, r, q) == pytest.approx(optlib.bs_gamma(S, K, t, s, r, q), abs=1e-12)
    assert lab.vega(S, K, t, s, r, q) == pytest.approx(optlib.bs_vega(S, K, t, s, r, q), abs=1e-12)
    assert lab.theta(S, K, t, s, r, q, kind) == pytest.approx(
        optlib.bs_theta(S, K, t, s, r, q, kind, per="day"), abs=1e-12)
    assert lab.theta(S, K, t, s, r, q, kind, per_day=False) == pytest.approx(
        optlib.bs_theta(S, K, t, s, r, q, kind, per="year"), abs=1e-10)
    assert lab.rho(S, K, t, s, r, q, kind) == pytest.approx(optlib.bs_rho(S, K, t, s, r, q, kind), abs=1e-12)


def test_known_textbook_values():
    assert lab.delta(100, 100, 1, 0.2, 0.05, 0, "call") == pytest.approx(0.636830651, abs=1e-8)
    assert lab.gamma(100, 100, 1, 0.2, 0.05) == pytest.approx(0.018762017, abs=1e-8)
    assert lab.vega(100, 100, 1, 0.2, 0.05) == pytest.approx(0.375240347, abs=1e-8)


@pytest.mark.parametrize("S,K,t,s,r,q", CASES)
@pytest.mark.parametrize("kind", ["call", "put"])
def test_finite_difference_agrees_with_analytic(S, K, t, s, r, q, kind):
    fd = lab.finite_difference_greeks(S, K, t, s, r, q, kind)
    # 中央差分的截斷誤差是 O(h²)，所以容差不能設成機器精度
    assert fd["delta"] == pytest.approx(optlib.bs_delta(S, K, t, s, r, q, kind), abs=2e-5)
    assert fd["gamma"] == pytest.approx(optlib.bs_gamma(S, K, t, s, r, q), rel=1e-3)
    assert fd["vega"] == pytest.approx(optlib.bs_vega(S, K, t, s, r, q), rel=1e-5)
    assert fd["theta"] == pytest.approx(optlib.bs_theta(S, K, t, s, r, q, kind, per="day"), rel=1e-4)
    assert fd["rho"] == pytest.approx(optlib.bs_rho(S, K, t, s, r, q, kind), rel=1e-5)


def test_greek_properties():
    S, K, t, s, r, q = 48.0, 50.0, 0.25, 0.32, 0.03, 0.01
    # call delta − put delta = e^{−qt}
    assert lab.delta(S, K, t, s, r, q, "call") - lab.delta(S, K, t, s, r, q, "put") == pytest.approx(math.exp(-q * t))
    # gamma 在價平附近最大
    strikes = np.arange(30, 71, 1.0)
    g = [lab.gamma(S, k, t, s, r, q) for k in strikes]
    assert abs(strikes[int(np.argmax(g))] - S) <= 3
    # 時間越長，價平 vega 越大
    assert lab.vega(50, 50, 1.0, 0.3) > lab.vega(50, 50, 0.25, 0.3)
    # 無股利時價平 call 的 theta < 0
    assert lab.theta(50, 50, 0.25, 0.3, 0.02, 0.0, "call") < 0


def test_lambda():
    lam_call = lab.lambda_elasticity(48, 50, 0.25, 0.32, 0.03, 0.01, "call")
    lam_put = lab.lambda_elasticity(48, 50, 0.25, 0.32, 0.03, 0.01, "put")
    assert lam_call > 1  # call 是槓桿多頭
    assert lam_put < -1
    # 越價外，彈性越高
    assert lab.lambda_elasticity(48, 60, 0.25, 0.32, 0.03, 0.01, "call") > lam_call


def test_atm_approximation():
    S, t, s = 50.0, 0.25, 0.32
    approx = lab.atm_greeks_approx(S, t, s)
    assert approx["price"] == pytest.approx(optlib.bs_price(S, S, t, s), rel=0.03)
    assert approx["gamma"] == pytest.approx(optlib.bs_gamma(S, S, t, s), rel=0.03)
    assert approx["vega"] == pytest.approx(optlib.bs_vega(S, S, t, s), rel=0.03)
    assert approx["theta"] == pytest.approx(optlib.bs_theta(S, S, t, s, per="day"), rel=0.03)


@pytest.mark.parametrize("S,K,t,s,r,q", CASES)
def test_vanna_volga_vs_finite_difference(S, K, t, s, r, q):
    h = 1e-4
    fd_vanna = (optlib.bs_delta(S, K, t, s + h, r, q) - optlib.bs_delta(S, K, t, s - h, r, q)) / (2 * h) / 100
    fd_volga = (optlib.bs_vega(S, K, t, s + h, r, q) - optlib.bs_vega(S, K, t, s - h, r, q)) / (2 * h) / 100
    assert lab.vanna(S, K, t, s, r, q) == pytest.approx(fd_vanna, rel=1e-5, abs=1e-10)
    assert lab.volga(S, K, t, s, r, q) == pytest.approx(fd_volga, rel=1e-5, abs=1e-10)


def test_volga_positive_on_wings():
    assert lab.volga(50, 70, 0.25, 0.3) > 0
    assert lab.volga(50, 32, 0.25, 0.3) > 0


def test_taylor_pnl_vs_full_revaluation():
    S, K, t, s, r = 48.0, 50.0, 0.25, 0.32, 0.03
    g = optlib.bs_greeks(S, K, t, s, r, 0.0, "call")
    dS, days, dv = 0.8, 1.0, 1.0
    approx = lab.taylor_pnl(g, dS, days, dv)
    full = optlib.bs_price(S + dS, K, t - days / 365, s + dv / 100, r, 0.0) - g["price"]
    assert approx == pytest.approx(full, abs=0.01)
    # 只有 delta 的近似誤差應該比較大（凸性）
    delta_only = g["delta"] * dS
    assert abs(approx - full) < abs(delta_only + g["theta"] * days + g["vega"] * dv - full)
