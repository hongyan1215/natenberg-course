"""Lab 09 測試：CRR 二元樹、收斂、樹上 Greeks、美式提前履約、股利。"""
import math

import numpy as np
import pytest

import optlib
from conftest import load_lab

lab = load_lab("lab09_binomial_american")


def test_crr_parameters():
    u, d, p = lab.crr_parameters(0.3, 0.05, 0.0, 1 / 252)
    assert u == pytest.approx(math.exp(0.3 / math.sqrt(252)))
    assert u * d == pytest.approx(1.0)
    assert 0 < p < 1
    # 風險中性：一步的期望成長 = e^{(r−q)dt}
    assert p * u + (1 - p) * d == pytest.approx(math.exp(0.05 / 252))


def test_stock_tree():
    tree = lab.stock_tree(50, 1.1, 1 / 1.1, 3)
    assert tree.shape == (4, 4)
    assert tree[0, 0] == 50
    assert tree[3, 3] == pytest.approx(50 * 1.1**3)
    assert tree[2, 1] == pytest.approx(50)  # 一上一下回到原點（重組樹）
    assert np.isnan(tree[1, 2])


@pytest.mark.parametrize("kind", ["call", "put"])
def test_european_matches_reference_tree_and_bs(kind):
    args = (45, 50, 0.75, 0.3, 0.06, 0.01)
    v = lab.binomial_price(*args, n=400, kind=kind)
    assert v == pytest.approx(optlib.binomial_price(*args, n_steps=400, kind=kind), abs=1e-10)
    assert v == pytest.approx(optlib.bs_price(*args, kind=kind), abs=0.02)


def test_american_put_known_value():
    v = lab.binomial_price(100, 100, 1.0, 0.2, 0.05, 0.0, 500, "put", american=True)
    assert v == pytest.approx(6.0888, abs=2e-3)


def test_american_vs_european():
    # 無股利的美式 call = 歐式 call
    a = lab.binomial_price(45, 50, 0.75, 0.3, 0.06, 0.0, 300, "call", True)
    e = lab.binomial_price(45, 50, 0.75, 0.3, 0.06, 0.0, 300, "call", False)
    assert a == pytest.approx(e, abs=1e-10)
    prem = lab.early_exercise_premium(45, 50, 0.75, 0.3, 0.06, 0.0, 300, "put")
    assert prem > 0.05
    # 利率為 0 的 put 沒有提前履約價值
    assert lab.early_exercise_premium(45, 50, 0.75, 0.3, 0.0, 0.0, 300, "put") == pytest.approx(0, abs=1e-10)
    # 利率越高，put 的提前履約權利金越大
    assert lab.early_exercise_premium(45, 50, 0.75, 0.3, 0.10, 0.0, 300, "put") > prem


def test_convergence():
    errs = lab.binomial_convergence(45, 50, 0.75, 0.3, 0.06, 0.0, "call", ns=(10, 50, 200, 800))
    assert errs[-1] < errs[0]
    assert errs[-1] < 0.01


@pytest.mark.parametrize("kind", ["call", "put"])
def test_tree_greeks_match_bs(kind):
    g = lab.binomial_greeks(45, 50, 0.75, 0.3, 0.06, 0.0, 800, kind)
    ref = optlib.bs_greeks(45, 50, 0.75, 0.3, 0.06, 0.0, kind)
    assert g["delta"] == pytest.approx(ref["delta"], abs=2e-3)
    assert g["gamma"] == pytest.approx(ref["gamma"], rel=0.02)
    assert g["theta"] == pytest.approx(ref["theta"], rel=0.03)
    assert g["price"] == pytest.approx(lab.binomial_price(45, 50, 0.75, 0.3, 0.06, 0.0, 800, kind))


def test_american_put_delta_more_negative():
    am = lab.binomial_greeks(45, 50, 0.75, 0.3, 0.06, 0.0, 400, "put", american=True)
    eu = lab.binomial_greeks(45, 50, 0.75, 0.3, 0.06, 0.0, 400, "put", american=False)
    assert am["delta"] < eu["delta"]


def test_early_exercise_boundary_properties():
    times, b = lab.early_exercise_boundary(50, 1.0, 0.3, 0.06, n=400)
    assert len(times) == len(b) == 400
    valid = ~np.isnan(b)
    assert valid.sum() > 300
    assert np.all(b[valid] < 50)
    # 越接近到期，邊界越接近 K（比較前 1/4 與後 1/4 的平均）
    early, late = np.nanmean(b[:100]), np.nanmean(b[-100:])
    assert late > early
    assert b[-1] > 48.5
    # 在邊界下方的股價，美式 put 價值 = 內含價值
    S_low = np.nanmin(b) - 2
    assert lab.binomial_price(S_low, 50, 1.0, 0.3, 0.06, 0.0, 400, "put", True) == pytest.approx(50 - S_low, abs=1e-6)


def test_no_boundary_when_rate_zero():
    _, b = lab.early_exercise_boundary(50, 1.0, 0.3, 0.0, n=200)
    assert np.all(np.isnan(b))


def test_american_call_with_dividends():
    S, K, t, s, r = 52, 50, 0.5, 0.25, 0.03
    divs = [(0.4, 1.5)]
    eu = lab.american_call_with_dividends(S, K, t, s, r, divs, 400, american=False)
    s_star = S - 1.5 * math.exp(-r * 0.4)
    assert eu == pytest.approx(optlib.bs_price(s_star, K, t, s, r), abs=0.01)
    am = lab.american_call_with_dividends(S, K, t, s, r, divs, 400)
    assert am == pytest.approx(optlib.binomial_price(S, K, t, s, r, 0.0, 400, "call", True, divs), abs=1e-8)
    assert am > eu + 0.05  # 大額股利 → 有提前履約價值
    # 無股利：美式 call = 歐式 call
    assert lab.american_call_with_dividends(S, K, t, s, r, [], 400) == pytest.approx(
        lab.binomial_price(S, K, t, s, r, 0.0, 400, "call"), abs=1e-10)
    # 很小的股利：不值得提前履約
    tiny = [(0.4, 0.01)]
    assert lab.american_call_with_dividends(S, K, t, s, r, tiny, 400) == pytest.approx(
        lab.american_call_with_dividends(S, K, t, s, r, tiny, 400, american=False), abs=1e-6)


def test_call_early_exercise_rule():
    # 深價內 call：put 幾乎沒價值，股利大於利息成本 → 履約
    ok, margin = lab.call_early_exercise_check(K=40, D=1.5, r=0.03, t_remaining=0.1, put_value=0.01)
    assert ok and margin == pytest.approx(1.5 - 0.01 - 40 * (1 - math.exp(-0.003)))
    ok2, _ = lab.call_early_exercise_check(K=50, D=0.2, r=0.03, t_remaining=0.1, put_value=0.8)
    assert not ok2


def test_put_early_exercise_rule_consistent_with_tree():
    S, K, t, s, r = 60, 100, 0.5, 0.2, 0.08
    C = optlib.bs_price(S, K, t, s, r)
    ok, margin = lab.put_early_exercise_check(K, r, t, C)
    assert ok and margin > 3
    # 樹也同意：美式 put 價值 = 內含價值
    assert lab.binomial_price(S, K, t, s, r, 0.0, 300, "put", True) == pytest.approx(K - S, abs=1e-8)
    ok2, _ = lab.put_early_exercise_check(K, 0.0, t, 1.0)
    assert not ok2
