"""Lab 04 測試：波動率縮放、對數常態、歷史波動率估計。"""
import math

import numpy as np
import pytest

import optlib
from conftest import load_lab

lab = load_lab("lab04_volatility")


def _ohlc_paths(sigma=0.25, days=300, intraday=400, seed=3):
    """用細格 GBM 產生日 OHLC，供估計量測試。"""
    rng = np.random.default_rng(seed)
    path = optlib.simulate_gbm(100.0, 0.0, sigma, days / 252, days * intraday, rng=rng)[0]
    blocks = path[1:].reshape(days, intraday)
    opens = path[:-1:intraday]
    highs = np.maximum(blocks.max(axis=1), opens)
    lows = np.minimum(blocks.min(axis=1), opens)
    closes = blocks[:, -1]
    return opens, highs, lows, closes


def test_scale_and_annualize():
    assert lab.scale_vol(0.32, 1) == pytest.approx(0.32 / math.sqrt(252))
    assert lab.scale_vol(0.32, 63) == pytest.approx(0.16)
    assert lab.annualize_vol(0.02, 252) == pytest.approx(0.02 * math.sqrt(252))
    assert lab.annualize_vol(lab.scale_vol(0.27, 5), 252 / 5) == pytest.approx(0.27)


def test_one_sd_range_lognormal_asymmetry():
    lo, hi = lab.one_sd_range(50, 0.30, 5)
    s = 0.30 * math.sqrt(5 / 252)
    assert (lo, hi) == pytest.approx((50 * math.exp(-s), 50 * math.exp(s)))
    assert hi - 50 > 50 - lo
    assert lo * hi == pytest.approx(50**2)


def test_atm_vol_from_straddle_close_to_true_iv():
    S, t, sigma = 50.0, 30 / 365, 0.35
    straddle = optlib.bs_price(S, S, t, sigma, 0, 0, "call") + optlib.bs_price(S, S, t, sigma, 0, 0, "put")
    assert lab.atm_vol_from_straddle(straddle, S, t) == pytest.approx(sigma, rel=0.01)


def test_log_returns():
    np.testing.assert_allclose(lab.log_returns([100, 110, 99]), [math.log(1.1), math.log(0.9)])


def test_lognormal_mean_median():
    mean, median = lab.lognormal_mean_median(50, 0.08, 0.30, 1.0)
    assert mean == pytest.approx(50 * math.exp(0.08))
    assert median == pytest.approx(50 * math.exp(0.08 - 0.045))
    assert median < mean


def test_prob_above():
    assert lab.prob_above(50, 50, 0.045, 0.30, 1.0) == pytest.approx(0.5)  # μ = σ²/2 → 中位數 = S
    p = lab.prob_above(50, 60, 0.08, 0.30, 1.0)
    rng = np.random.default_rng(0)
    ST = optlib.simulate_gbm(50, 0.08, 0.30, 1.0, 1, 200_000, rng=rng)[:, -1]
    assert p == pytest.approx((ST > 60).mean(), abs=0.005)


def test_close_to_close_vol():
    closes = optlib.simulate_gbm(100, 0.0, 0.25, 4.0, 1008, seed=11)[0]
    est = lab.close_to_close_vol(closes)
    assert est == pytest.approx(optlib.close_to_close_vol(closes))
    assert est == pytest.approx(0.25, abs=0.02)
    assert lab.close_to_close_vol(closes, demean=False) == pytest.approx(
        math.sqrt(np.mean(np.diff(np.log(closes)) ** 2) * 252))


def test_range_estimators_unbiased_and_match_reference():
    o, h, l, c = _ohlc_paths()
    pk = lab.parkinson_vol(h, l)
    gk = lab.garman_klass_vol(o, h, l, c)
    assert pk == pytest.approx(optlib.parkinson_vol(h, l))
    assert gk == pytest.approx(optlib.garman_klass_vol(o, h, l, c))
    # 離散取樣會低估真正的高低價範圍（看不到兩個取樣點之間的極值），容忍 8%
    assert pk == pytest.approx(0.25, rel=0.08)
    assert gk == pytest.approx(0.25, rel=0.08)


def test_range_estimators_more_efficient():
    """Parkinson / GK 的估計誤差應比 close-to-close 小（多次試驗的標準差）。"""
    cc, pk = [], []
    for seed in range(12):
        o, h, l, c = _ohlc_paths(days=60, intraday=50, seed=100 + seed)
        cc.append(lab.close_to_close_vol(np.concatenate([[o[0]], c])))
        pk.append(lab.parkinson_vol(h, l))
    assert np.std(pk) < np.std(cc)


def test_rolling_vol_shape_and_values():
    closes = optlib.simulate_gbm(100, 0.0, 0.2, 1.0, 252, seed=5)[0]
    rv = lab.rolling_vol(closes, 20)
    assert rv.shape == closes.shape
    assert np.all(np.isnan(rv[:20])) and not np.isnan(rv[20])
    assert rv[-1] == pytest.approx(optlib.close_to_close_vol(closes[-21:]))


def test_vol_cone():
    closes = optlib.simulate_gbm(100, 0.0, 0.2, 2.0, 504, seed=9)[0]
    cone = lab.vol_cone(closes, [10, 60])
    for w in (10, 60):
        c = cone[w]
        assert c["min"] <= c["p25"] <= c["median"] <= c["p75"] <= c["max"]
    # 短窗口的波動率估計分散較大 → 錐口較寬
    assert cone[10]["max"] - cone[10]["min"] > cone[60]["max"] - cone[60]["min"]
