"""Lab 06 測試：離散 delta 避險、gamma 損益公式、避險頻率與變異數。"""
import math

import numpy as np
import pytest

import optlib
from conftest import load_lab

lab = load_lab("lab06_dynamic_hedging")

S0, K, T = 100.0, 100.0, 0.25
S_IMPL, S_REAL = 0.20, 0.28
N_STEPS, N_PATHS = 252, 2000


@pytest.fixture(scope="module")
def paths_high_vol():
    return lab.simulate_paths(S0, 0.0, S_REAL, T, N_STEPS, N_PATHS, seed=1)


@pytest.fixture(scope="module")
def paths_fair_vol():
    return lab.simulate_paths(S0, 0.0, S_IMPL, T, N_STEPS, N_PATHS, seed=2)


def test_hedge_shares():
    assert lab.hedge_shares(10, 0.4) == pytest.approx(-4.0)
    assert lab.hedge_shares(-5, -0.3) == pytest.approx(-1.5)  # 賣 put（delta 為負）→ 要放空標的


def test_gamma_rent_balances_theta_atm():
    g = optlib.bs_greeks(100, 100, 0.25, 0.2, 0.0, 0.0)
    rent = lab.gamma_rent(g["gamma"], 100, 0.2, 1 / 365)
    assert rent == pytest.approx(-g["theta"], rel=1e-9)  # r=0：gamma 租金 = theta


def test_breakeven_move():
    g = optlib.bs_greeks(100, 100, 0.25, 0.2)
    mv = lab.breakeven_move(g["gamma"], g["theta"])
    assert mv == pytest.approx(100 * 0.2 / math.sqrt(365), rel=1e-6)  # 一日一個標準差


def test_simulate_paths_shape_and_moments():
    p = lab.simulate_paths(100, 0.0, 0.3, 1.0, 50, 4000, seed=0)
    assert p.shape == (4000, 51)
    assert np.allclose(p[:, 0], 100)
    assert p[:, -1].mean() == pytest.approx(100, rel=0.02)  # μ=0 → 鞅


def test_fair_vol_hedge_pnl_near_zero(paths_fair_vol):
    pnl = lab.delta_hedge_pnl(paths_fair_vol, K, T, S_IMPL)
    st = lab.pnl_stats(pnl)
    assert abs(st["mean"]) < 4 * st["stderr"] + 0.01
    premium = optlib.bs_price(S0, K, T, S_IMPL)
    assert st["std"] < 0.1 * premium  # 頻繁避險 → 損益非常集中


def test_long_gamma_earns_edge(paths_high_vol):
    pnl = lab.delta_hedge_pnl(paths_high_vol, K, T, S_IMPL)
    st = lab.pnl_stats(pnl)
    edge = lab.theoretical_edge(S0, K, T, S_REAL, S_IMPL)
    assert edge == pytest.approx(optlib.bs_price(S0, K, T, S_REAL) - optlib.bs_price(S0, K, T, S_IMPL))
    assert abs(st["mean"] - edge) < 4 * st["stderr"]
    assert st["sharpe"] > 1


def test_short_option_is_mirror(paths_high_vol):
    long_ = lab.delta_hedge_pnl(paths_high_vol, K, T, S_IMPL, kind="put", position=1)
    short = lab.delta_hedge_pnl(paths_high_vol, K, T, S_IMPL, kind="put", position=-1)
    np.testing.assert_allclose(long_, -short, atol=1e-9)
    assert short.mean() < 0


def test_put_and_call_hedged_pnl_equal(paths_high_vol):
    """避險後 call 與 put 的損益應幾乎相同（parity：兩者只差一個線性部位，而它已被避險掉）。"""
    c = lab.delta_hedge_pnl(paths_high_vol, K, T, S_IMPL, kind="call")
    p = lab.delta_hedge_pnl(paths_high_vol, K, T, S_IMPL, kind="put")
    np.testing.assert_allclose(c, p, atol=1e-8)


def test_pathwise_gamma_formula_tracks_hedge_pnl(paths_high_vol):
    pnl = lab.delta_hedge_pnl(paths_high_vol, K, T, S_IMPL)
    approx = lab.gamma_pnl_pathwise(paths_high_vol, K, T, S_IMPL)
    assert np.corrcoef(pnl, approx)[0, 1] > 0.98
    assert np.mean(np.abs(pnl - approx)) < 0.1 * np.std(pnl)


def test_expected_formula_matches_mean(paths_high_vol):
    pnl = lab.delta_hedge_pnl(paths_high_vol, K, T, S_IMPL)
    expected = lab.gamma_pnl_expected(paths_high_vol, K, T, S_IMPL, S_REAL)
    st = lab.pnl_stats(pnl)
    assert abs(expected.mean() - st["mean"]) < 4 * st["stderr"]
    assert np.all(expected > 0)  # σ_real > σ_impl 時每條路徑的期望項都為正


def test_hedging_at_realized_vol_reduces_dispersion(paths_high_vol):
    at_impl = lab.delta_hedge_pnl(paths_high_vol, K, T, S_IMPL)
    at_real = lab.delta_hedge_pnl(paths_high_vol, K, T, S_IMPL, sigma_hedge=S_REAL)
    assert at_real.std() < 0.6 * at_impl.std()
    edge = lab.theoretical_edge(S0, K, T, S_REAL, S_IMPL)
    assert abs(at_real.mean() - edge) < 4 * at_real.std() / math.sqrt(len(at_real))


def test_variance_shrinks_with_hedge_frequency():
    res = lab.hedge_frequency_experiment(S0, K, T, S_IMPL, S_IMPL, 252, [1, 4, 16, 63], n_paths=1500, seed=3)
    stds = [res[h] for h in (1, 4, 16, 63)]
    assert all(a < b for a, b in zip(stds, stds[1:]))
    # 離散避險誤差 ∝ √Δt：間隔放大 16 倍，標準差約放大 4 倍
    assert 2.5 < res[16] / res[1] < 5.5


def test_pnl_stats():
    st = lab.pnl_stats(np.array([1.0, 2.0, 3.0, 4.0]))
    assert st["mean"] == pytest.approx(2.5)
    assert st["std"] == pytest.approx(np.std([1, 2, 3, 4], ddof=1))
    assert st["stderr"] == pytest.approx(st["std"] / 2)
    assert st["min"] == 1.0 and st["max"] == 4.0
    assert st["sharpe"] == pytest.approx(2.5 / st["std"])
