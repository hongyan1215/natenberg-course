"""Lab 12 測試：實現變異數、變異數/波動率交換、選擇權組合複製、VIX 式內插、盯市、凸性。"""
import math

import numpy as np
import pytest

import optlib
from conftest import load_lab

lab = load_lab("lab12_volatility_contracts")

S, T, R = 100.0, 30 / 365, 0.03
F = S * math.exp(R * T)


def test_realized_variance():
    path = optlib.simulate_gbm(100, 0.0, 0.3, 4.0, 1008, seed=4)[0]
    rv = lab.realized_variance(path)
    r = np.diff(np.log(path))
    assert rv == pytest.approx(252 * np.sum(r**2) / len(r))
    assert rv == pytest.approx(0.09, rel=0.08)


def test_notional_and_payoffs():
    assert lab.variance_notional(100_000, 20) == pytest.approx(2500)
    assert lab.variance_swap_payoff(25, 20, 100_000) == pytest.approx(2500 * (625 - 400))
    assert lab.vol_swap_payoff(25, 20, 100_000) == pytest.approx(500_000)
    # 在履約價附近，兩者每 vol 點損益相同
    assert lab.variance_swap_payoff(20.01, 20, 100_000) == pytest.approx(lab.vol_swap_payoff(20.01, 20, 100_000), rel=1e-3)


@pytest.mark.parametrize("realized", [5.0, 15.0, 20.0, 28.0, 60.0])
def test_variance_swap_convexity(realized):
    """多方變異數交換的損益永遠 ≥ 同 vega notional 的波動率交換：差額 = N·(σ−K)²/(2K)。"""
    diff = lab.variance_swap_payoff(realized, 20, 1000) - lab.vol_swap_payoff(realized, 20, 1000)
    assert diff == pytest.approx(1000 * (realized - 20) ** 2 / 40)
    assert diff >= 0


def test_strike_deltas():
    np.testing.assert_allclose(lab.strike_deltas([80, 85, 90, 100]), [5, 5, 7.5, 10])


def test_select_otm_quotes():
    K = [90.0, 95.0, 100.0, 105.0]
    c = [11.0, 7.0, 3.5, 1.2]
    p = [0.8, 1.9, 3.3, 6.1]
    K0, Q = lab.select_otm_quotes(K, c, p, F=101.2)
    assert K0 == 100.0
    np.testing.assert_allclose(Q, [0.8, 1.9, 3.4, 1.2])


def test_fair_strike_flat_vol_replicates_sigma():
    K = np.arange(40.0, 200.0, 1.0)
    calls = optlib.bs_price(S, K, T, 0.24, R, 0.0, "call")
    puts = optlib.bs_price(S, K, T, 0.24, R, 0.0, "put")
    var = lab.variance_swap_fair_strike(K, calls, puts, F, R, T)
    assert math.sqrt(var) == pytest.approx(0.24, abs=0.002)


def test_fair_strike_above_atm_with_skew():
    """有 skew / smile 時，價外選擇權較貴 → 變異數履約價 > 以 ATM vol 平坦定價的變異數履約價
    （這就是為什麼 VIX 常高於 ATM 隱含波動率）。"""
    K = np.arange(40.0, 200.0, 1.0)

    def fair(vols):
        c = optlib.bs_price(S, K, T, vols, R, 0.0, "call")
        p = optlib.bs_price(S, K, T, vols, R, 0.0, "put")
        return lab.variance_swap_fair_strike(K, c, p, F, R, T)

    x = np.log(K / F) / math.sqrt(T)
    skewed = np.clip(0.22 - 0.05 * x + 0.02 * x**2, 0.05, 2.0)
    assert math.sqrt(fair(skewed)) > math.sqrt(fair(np.full_like(K, 0.22))) + 0.001


def test_fair_strike_coarse_strikes_underestimate():
    """履約價範圍太窄（截斷尾部）會低估變異數。"""
    K_wide = np.arange(40.0, 200.0, 1.0)
    K_narrow = np.arange(90.0, 111.0, 1.0)
    vals = []
    for K in (K_wide, K_narrow):
        c = optlib.bs_price(S, K, T, 0.24, R, 0.0, "call")
        p = optlib.bs_price(S, K, T, 0.24, R, 0.0, "put")
        vals.append(lab.variance_swap_fair_strike(K, c, p, F, R, T))
    assert vals[1] < vals[0]


def test_vix_style_index():
    assert lab.vix_style_index(0.04, 20 / 365, 0.04, 45 / 365) == pytest.approx(20.0)
    v = lab.vix_style_index(0.22**2, 23 / 365, 0.25**2, 51 / 365)
    assert 22 < v < 25
    # 目標天期剛好等於近月 → 就是近月的 vol
    assert lab.vix_style_index(0.22**2, 30 / 365, 0.25**2, 58 / 365) == pytest.approx(22.0)


def test_variance_swap_mtm():
    assert lab.variance_swap_mtm(0, 0.0, 400, 1.0, 400, 2500) == pytest.approx(0.0)
    end = lab.variance_swap_mtm(30**2, 1.0, 999, 1.0, 20**2, 2500, r=0.05)
    assert end == pytest.approx(2500 * (900 - 400))
    mid = lab.variance_swap_mtm(30**2, 0.5, 22**2, 1.0, 20**2, 2500, r=0.03)
    assert mid == pytest.approx(2500 * math.exp(-0.015) * (0.5 * 900 + 0.5 * 484 - 400))


def test_vol_swap_convexity_approx():
    rng = np.random.default_rng(7)
    V = 400.0 * np.exp(0.3 * rng.standard_normal(400_000) - 0.045)  # 平均 400 vol 點² 的隨機變異數
    approx = lab.vol_swap_convexity_approx(V.mean(), V.var())
    assert approx < math.sqrt(V.mean())
    assert approx == pytest.approx(np.sqrt(V).mean(), rel=0.003)
