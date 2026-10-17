"""Lab 10 測試：保護性策略、collar、部位 Greeks、情境矩陣、gamma/vega 中和。"""
import numpy as np
import pandas as pd
import pytest

import optlib
from conftest import load_lab

lab = load_lab("lab10_hedging_portfolio")

BOOK = [{"kind": "stock", "qty": 200},
        {"kind": "call", "K": 105, "qty": -5, "expiry": 0.25, "sigma": 0.24},
        {"kind": "put", "K": 95, "qty": 3, "expiry": 0.25, "sigma": 0.29},
        {"kind": "call", "K": 100, "qty": -2, "expiry": 0.5, "sigma": 0.26}]
ST = np.array([70.0, 85.0, 95.0, 100.0, 105.0, 115.0, 140.0])


def test_protective_put():
    pnl = lab.protective_put_pnl(ST, 100, 95, 2.1)
    assert pnl.min() == pytest.approx(95 - 100 - 2.1)  # 保護下限
    assert pnl[-1] == pytest.approx(40 - 2.1)          # 上檔不受限
    assert np.all(pnl >= -7.1 - 1e-12)


def test_covered_call():
    pnl = lab.covered_call_pnl(ST, 100, 105, 2.4)
    assert pnl.max() == pytest.approx(5 + 2.4)
    assert pnl[0] == pytest.approx(-30 + 2.4)


def test_collar_and_bounds():
    pnl = lab.collar_pnl(ST, 100, 95, 105, 2.1, 2.4)
    b = lab.collar_bounds(100, 95, 105, 2.1, 2.4)
    assert pnl.min() == pytest.approx(b["max_loss"])
    assert pnl.max() == pytest.approx(b["max_gain"])
    assert b == pytest.approx({"max_loss": -5 + 0.3, "max_gain": 5 + 0.3})
    # collar = protective put + covered call − 股票
    combo = lab.protective_put_pnl(ST, 100, 95, 2.1) + lab.covered_call_pnl(ST, 100, 105, 2.4) - (ST - 100)
    np.testing.assert_allclose(pnl, combo)


def test_zero_cost_collar():
    kc = lab.zero_cost_collar_call_strike(100, 92, 0.5, 0.25, 0.03)
    assert kc > 100
    assert optlib.bs_price(100, kc, 0.5, 0.25, 0.03) == pytest.approx(optlib.bs_price(100, 92, 0.5, 0.25, 0.03, kind="put"), abs=1e-8)
    # call 的隱含波動率較低（典型股票 skew）→ 要賣更靠近價平的 call 才夠付 put
    kc_skew = lab.zero_cost_collar_call_strike(100, 92, 0.5, 0.25, 0.03, sigma_call=0.20)
    assert kc_skew < kc


def test_portfolio_value_and_greeks():
    v = lab.portfolio_value(BOOK, 100.0)
    ref = 200 * 100 - 5 * optlib.bs_price(100, 105, 0.25, 0.24) + 3 * optlib.bs_price(100, 95, 0.25, 0.29, kind="put") \
        - 2 * optlib.bs_price(100, 100, 0.5, 0.26)
    assert v == pytest.approx(ref)
    g = lab.portfolio_greeks(BOOK, 100.0)
    h = 0.01
    fd_delta = (lab.portfolio_value(BOOK, 100 + h) - lab.portfolio_value(BOOK, 100 - h)) / (2 * h)
    fd_gamma = (lab.portfolio_value(BOOK, 100 + h) - 2 * v + lab.portfolio_value(BOOK, 100 - h)) / h**2
    fd_vega = (lab.portfolio_value(BOOK, 100, vol_shift=1e-4) - lab.portfolio_value(BOOK, 100, vol_shift=-1e-4)) / 2e-4 / 100
    assert g["delta"] == pytest.approx(fd_delta, abs=1e-6)
    assert g["gamma"] == pytest.approx(fd_gamma, rel=1e-3)
    assert g["vega"] == pytest.approx(fd_vega, rel=1e-6)
    fd_theta = (lab.portfolio_value(BOOK, 100, elapsed=1e-5) - v) / 1e-5 / 365
    assert g["theta"] == pytest.approx(fd_theta, rel=1e-3)


def test_scenario_grid():
    grid = lab.scenario_grid(BOOK, 100.0, [-10, -5, 0, 5, 10], [-5, 0, 5])
    assert isinstance(grid, pd.DataFrame)
    assert list(grid.index) == [-10, -5, 0, 5, 10] and list(grid.columns) == [-5, 0, 5]
    assert grid.loc[0, 0] == pytest.approx(0.0, abs=1e-9)
    assert grid.loc[5, 0] == pytest.approx(lab.portfolio_value(BOOK, 105.0) - lab.portfolio_value(BOOK, 100.0))
    # 時間經過：價格、波動率不變時的損益 ≈ theta × 天數
    g7 = lab.scenario_grid(BOOK, 100.0, [0], [0], days_forward=1)
    assert g7.loc[0, 0] == pytest.approx(lab.portfolio_greeks(BOOK, 100.0)["theta"], rel=0.02)
    # 部位 vega < 0 → 波動率上升會虧
    assert lab.portfolio_greeks(BOOK, 100.0)["vega"] < 0 and grid.loc[0, 5] < 0


def test_greeks_ladder_and_worst_case():
    lad = lab.greeks_ladder(BOOK, [90, 100, 110])
    assert list(lad.columns) == ["delta", "gamma", "vega", "theta"]
    assert lad.loc[100, "delta"] == pytest.approx(lab.portfolio_greeks(BOOK, 100.0)["delta"])
    grid = lab.scenario_grid(BOOK, 100.0, [-10, 0, 10], [-5, 0, 5])
    loss, pm, vm = lab.worst_case(grid)
    assert loss == pytest.approx(grid.to_numpy().min())
    assert grid.loc[pm, vm] == pytest.approx(loss)


def test_gamma_vega_neutral_hedge():
    pos = lab.portfolio_greeks(BOOK, 100.0)
    a = {"kind": "call", "K": 100, "expiry": 0.1, "sigma": 0.25}
    b = {"kind": "call", "K": 100, "expiry": 0.75, "sigma": 0.25}
    ga = lab.portfolio_greeks([{**a, "qty": 1}], 100.0)
    gb = lab.portfolio_greeks([{**b, "qty": 1}], 100.0)
    n_a, n_b, n_s = lab.gamma_vega_neutral_hedge(pos, ga, gb)
    hedged = BOOK + [{**a, "qty": n_a}, {**b, "qty": n_b}, {"kind": "stock", "qty": n_s}]
    g = lab.portfolio_greeks(hedged, 100.0)
    assert g["gamma"] == pytest.approx(0, abs=1e-10)
    assert g["vega"] == pytest.approx(0, abs=1e-10)
    assert g["delta"] == pytest.approx(0, abs=1e-9)
