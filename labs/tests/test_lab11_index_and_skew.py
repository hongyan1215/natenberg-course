"""Lab 11 測試：指數、偏態峰態、隱含波動率、skew 擬合、Breeden–Litzenberger 密度、sticky 規則。"""
import math

import numpy as np
import pytest
from scipy.stats import lognorm

import optlib
from conftest import load_lab

lab = load_lab("lab11_index_and_skew")

S, T, R, Q = 100.0, 0.25, 0.03, 0.01
F = S * math.exp((R - Q) * T)
A, B, C = 0.22, -0.05, 0.02  # 測試用 smile：σ(x) = A + B x + C x²，x = ln(K/F)/√t


def smile(K):
    x = np.log(np.asarray(K, dtype=float) / F) / math.sqrt(T)
    return A + B * x + C * x**2


def test_price_weighted_index_and_divisor():
    assert lab.price_weighted_index([52.0, 118.0, 33.5], 1.8) == pytest.approx(203.5 / 1.8)
    # 第二檔股票 2 拆 1：價格 118 → 59，指數不應改變
    new_div = lab.adjust_divisor(1.8, 203.5, 52.0 + 59.0 + 33.5)
    assert lab.price_weighted_index([52.0, 59.0, 33.5], new_div) == pytest.approx(203.5 / 1.8)


def test_cap_weighted_index():
    prices, shares = [52.0, 118.0, 33.5], [1e6, 4e5, 2e6]
    base = float(np.dot(prices, shares))
    assert lab.cap_weighted_index(prices, shares, base) == pytest.approx(100.0)
    up = [p * 1.1 for p in prices]
    assert lab.cap_weighted_index(up, shares, base, 1000.0) == pytest.approx(1100.0)


def test_index_forward():
    assert lab.index_forward(S, R, Q, T) == pytest.approx(F)


def test_skew_kurtosis():
    rng = np.random.default_rng(1)
    sk, ku = lab.sample_skew_kurtosis(rng.standard_normal(200_000))
    assert abs(sk) < 0.03 and abs(ku) < 0.05
    sk_t, ku_t = lab.sample_skew_kurtosis(rng.standard_t(5, 200_000))
    assert ku_t > 2  # t(5) 的理論超額峰態 = 6
    sk_ln, _ = lab.sample_skew_kurtosis(np.exp(0.5 * rng.standard_normal(200_000)))
    assert sk_ln > 1  # 對數常態右偏


@pytest.mark.parametrize("kind", ["call", "put"])
@pytest.mark.parametrize("K,vol", [(80, 0.35), (100, 0.2), (125, 0.18)])
def test_implied_vol_round_trip(kind, K, vol):
    p = optlib.bs_price(S, K, T, vol, R, Q, kind)
    assert lab.implied_vol(p, S, K, T, R, Q, kind) == pytest.approx(vol, abs=1e-8)


def test_implied_vol_out_of_bounds_is_nan():
    assert math.isnan(lab.implied_vol(0.0, S, 100, T, R, Q, "call"))
    assert math.isnan(lab.implied_vol(S * 1.01, S, 100, T, R, Q, "call"))
    intrinsic = S * math.exp(-Q * T) - 80 * math.exp(-R * T)
    assert math.isnan(lab.implied_vol(intrinsic - 0.01, S, 80, T, R, Q, "call"))


def test_implied_vol_curve_and_otm_smile():
    K = np.arange(70.0, 131.0, 5.0)
    vols = smile(K)
    calls = optlib.bs_price(S, K, T, vols, R, Q, "call")
    puts = optlib.bs_price(S, K, T, vols, R, Q, "put")
    np.testing.assert_allclose(lab.implied_vol_curve(calls, K, S, T, R, Q, "call"), vols, atol=1e-7)
    np.testing.assert_allclose(lab.otm_implied_vols(K, calls, puts, S, T, R, Q), vols, atol=1e-8)


def test_skew_fit_recovers_coefficients():
    K = np.arange(70.0, 131.0, 5.0)
    fit = lab.skew_fit(K, smile(K), F, T)
    assert fit == pytest.approx({"atm": A, "slope": B, "curvature": C}, abs=1e-8)
    with_nan = smile(K).copy()
    with_nan[0] = np.nan
    assert lab.skew_fit(K, with_nan, F, T)["slope"] == pytest.approx(B, abs=1e-8)


def test_butterfly_density_flat_vol_is_lognormal():
    K = np.arange(30.0, 220.0, 0.5)
    calls = optlib.bs_price(S, K, T, 0.25, R, Q, "call")
    Kin, f = lab.butterfly_density(K, calls, R, T)
    assert len(Kin) == len(K) - 2
    summ = lab.density_summary(Kin, f)
    assert summ["total"] == pytest.approx(1.0, abs=1e-3)
    assert summ["mean"] == pytest.approx(F, abs=0.05)  # 風險中性平均 = 遠期價格
    assert summ["std"] == pytest.approx(F * math.sqrt(math.exp(0.25**2 * T) - 1), rel=0.01)
    exact = lognorm.pdf(Kin, s=0.25 * math.sqrt(T), scale=F * math.exp(-0.5 * 0.25**2 * T))
    assert np.max(np.abs(f - exact)) < 1e-3


def test_butterfly_density_with_skew_has_fatter_left_tail():
    K = np.arange(40.0, 200.0, 0.5)
    flat = optlib.bs_price(S, K, T, 0.22, R, Q, "call")
    skewed = optlib.bs_price(S, K, T, np.clip(smile(K), 0.05, None), R, Q, "call")
    Kin, f_flat = lab.butterfly_density(K, flat, R, T)
    _, f_skew = lab.butterfly_density(K, skewed, R, T)
    left = Kin < 0.80 * F  # 大跌 20% 以上的機率：負斜率 skew 下明顯較高
    assert np.trapezoid(f_skew[left], Kin[left]) > 1.3 * np.trapezoid(f_flat[left], Kin[left])
    assert np.all(f_skew > -1e-6)  # 無蝶式套利 → 密度非負
    with pytest.raises(ValueError):
        lab.butterfly_density([90, 95, 101], [12, 8, 4], R, T)


def test_smile_vol_after_move():
    K = np.arange(70.0, 131.0, 5.0)
    vols = smile(K)
    ss = lab.smile_vol_after_move(95, 105, 100, K, vols, "sticky_strike")
    sm = lab.smile_vol_after_move(95, 105, 100, K, vols, "sticky_moneyness")
    assert ss == pytest.approx(np.interp(95, K, vols))
    assert sm == pytest.approx(np.interp(95 * 100 / 105, K, vols))
    assert sm > ss  # 負斜率 skew：標的上漲後，在 sticky moneyness 下 95 變得更價外 → vol 更高
    with pytest.raises(ValueError):
        lab.smile_vol_after_move(95, 105, 100, K, vols, "sticky_delta_v2")
