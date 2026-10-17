"""mm_sim.py — 離線選擇權做市模擬器（Capstone）。

情境
----
- 標的價格走幾何布朗運動（GBM），**實現波動率 sigma_real** 可以和市場的**隱含波動率 sigma_mkt** 不同。
- 市場上有一條小型選擇權鏈（5 個履約價 × call/put）。「市場 theo」用市場隱含波動率加上一點 skew 計算，
  市場隱含波動率從 sigma_mkt 出發，會慢慢向實現波動率靠攏（市場在學習），並帶有隨機波動（vol of vol），
  另有一個競爭做市商（competitor）在 theo 兩側掛出報價，就像 Optibook 上其他隊伍的 bot。
- 雜訊交易者（noise traders）隨機到達，買或賣幾口選擇權。他們會找最好的價格成交：
  如果你的報價比競爭者好（或一樣好時擲硬幣贏了），而且在他們願意接受的價格之內，就會成交在你的報價上。
- 你的策略每一步要回答兩件事：
  1. `quote(state)`：每個選擇權的 bid / ask 價格與數量
  2. `hedge(state)`：要買賣多少標的（正=買、負=賣，以市價成交，付半個價差）
- 規則仿照 Optibook：每個商品有部位上限（position limit），價格必須在 tick 網格上，
  違規的報價或避險單會被拒絕並記錄。

用法（在 natenberg_course/ 底下）
--------------------------------
    .venv/bin/python capstone/mm_sim.py                                  # 參考策略，3 個種子
    .venv/bin/python capstone/mm_sim.py --strategy student_strategy      # 你的策略
    .venv/bin/python capstone/mm_sim.py --sigma-real 0.18 --seeds 5      # 改變市場情境
    .venv/bin/python capstone/mm_sim.py --plot capstone/run.png          # 存一張 PnL / delta 圖

也可以在程式裡呼叫：`run_simulation(Strategy(), SimConfig(seed=1))` 取得 `SimResult`。
"""
from __future__ import annotations

import argparse
import importlib
import math
import sys
import time
from dataclasses import dataclass, field, replace
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "labs"))
sys.path.insert(0, str(HERE))
from optlib import bs_delta, bs_gamma, bs_price, bs_vega  # noqa: E402

UNDERLYING = "UND"


# ---------------------------------------------------------------------------
# 資料結構
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class OptionSpec:
    """一個選擇權商品。expiry_days 為從模擬開始起算的交易日。"""

    id: str
    kind: str  # 'call' | 'put'
    strike: float
    expiry_days: float


@dataclass
class SimConfig:
    """模擬參數。所有波動率為年化小數。"""

    S0: float = 100.0
    mu: float = 0.0                    # 標的漂移
    sigma_real: float = 0.25           # 標的實際（實現）波動率
    sigma_mkt: float = 0.20            # 期初市場 ATM 隱含波動率（雜訊交易者與競爭者的定價依據）
    vol_learning_days: float = 30.0    # 市場隱含波動率向實現波動率靠攏的時間尺度（交易日；0 = 不學習）
    vol_of_vol: float = 0.006          # 市場 ATM 隱含波動率每日隨機變動的標準差（小數；0.006 = 0.6 vol 點）
    skew_slope: float = -0.15          # 市場 smile：σ(K) = sigma_mkt + skew_slope·ln(K/S)
    r: float = 0.0
    n_days: int = 20                   # 模擬交易日數
    steps_per_day: int = 50            # 每日步數
    days_per_year: int = 252
    expiry_days: float = 60.0          # 選擇權到期（交易日，從模擬開始算）
    strikes: tuple = (90.0, 95.0, 100.0, 105.0, 110.0)
    option_tick: float = 0.05
    underlying_half_spread: float = 0.02   # 避險單的成交成本（每股）
    option_limit: int = 50             # 每個選擇權的部位上限（±）
    underlying_limit: int = 200        # 標的部位上限（±）
    max_quote_volume: int = 10         # 單邊報價數量上限
    arrival_rate: float = 0.08         # 每個選擇權每步的雜訊交易者到達率（Poisson）
    max_trade_size: int = 5
    tolerance_vol_pts: float = 1.0     # 雜訊交易者願意多付 / 少收的程度（vol 點，指數分配平均）
    competitor_half_spread_vol_pts: float = 1.5
    seed: int = 0

    @property
    def n_steps(self) -> int:
        return self.n_days * self.steps_per_day

    @property
    def dt(self) -> float:
        return 1.0 / (self.days_per_year * self.steps_per_day)


@dataclass
class Fill:
    """你的一筆成交。side='buy' 代表你買進（打到你的 bid）。"""

    step: int
    option_id: str
    side: str
    price: float
    volume: int


@dataclass
class MarketState:
    """每一步傳給策略的市場狀態（唯讀；請不要修改裡面的內容）。"""

    step: int
    n_steps: int
    time: float                         # 已經過的年數
    dt: float                           # 每步的年數
    S: float                            # 目前標的價格（mid）
    S_history: np.ndarray               # 到目前為止的標的價格（含現在），唯讀
    options: dict                       # id → OptionSpec
    t_to_expiry: dict                   # id → 剩餘年數
    market_bid: dict                    # id → 競爭者 bid（None 表示沒有）
    market_ask: dict                    # id → 競爭者 ask
    positions: dict                     # id → 部位（含 UNDERLYING）
    cash: float
    recent_fills: list                  # 上一步以來你的成交（list[Fill]）
    r: float
    option_tick: float
    underlying_half_spread: float
    option_limit: int
    underlying_limit: int
    max_quote_volume: int
    steps_per_day: int
    days_per_year: int


@dataclass
class SimResult:
    """一次模擬的結果。"""

    config: SimConfig
    mtm: np.ndarray                     # 每步（交易前）的盯市損益，最後一個元素為期末
    delta: np.ndarray                   # 每步避險後的部位 delta（以市場 vol 計算）
    fills: list
    final_positions: dict
    limit_breaches: int
    invalid_quotes: int
    hedge_volume: int
    hedge_cost: float
    edge_captured: float                # Σ 成交時相對市場 theo 的優勢
    runtime_s: float

    @property
    def pnl(self) -> float:
        return float(self.mtm[-1])

    def daily_pnl(self) -> np.ndarray:
        spd = self.config.steps_per_day
        marks = self.mtm[::spd]
        if (len(self.mtm) - 1) % spd != 0:
            marks = np.append(marks, self.mtm[-1])
        return np.diff(marks)

    @property
    def sharpe(self) -> float:
        d = self.daily_pnl()
        sd = d.std(ddof=1) if len(d) > 1 else 0.0
        return float(d.mean() / sd * math.sqrt(self.config.days_per_year)) if sd > 1e-12 else 0.0

    @property
    def max_abs_delta(self) -> float:
        return float(np.max(np.abs(self.delta))) if len(self.delta) else 0.0

    @property
    def mean_abs_delta(self) -> float:
        return float(np.mean(np.abs(self.delta))) if len(self.delta) else 0.0

    def summary(self) -> dict:
        vol = sum(f.volume for f in self.fills)
        return {
            "pnl": self.pnl,
            "sharpe": self.sharpe,
            "max_abs_delta": self.max_abs_delta,
            "mean_abs_delta": self.mean_abs_delta,
            "limit_breaches": self.limit_breaches,
            "invalid_quotes": self.invalid_quotes,
            "option_trades": len(self.fills),
            "option_volume": vol,
            "edge_captured": self.edge_captured,
            "hedge_volume": self.hedge_volume,
            "hedge_cost": self.hedge_cost,
            "runtime_s": self.runtime_s,
        }


# ---------------------------------------------------------------------------
# 工具
# ---------------------------------------------------------------------------
def make_chain(cfg: SimConfig) -> dict:
    chain = {}
    for K in cfg.strikes:
        for kind in ("call", "put"):
            oid = f"{kind[0].upper()}{int(round(K)):03d}"
            chain[oid] = OptionSpec(oid, kind, float(K), cfg.expiry_days)
    return chain


def on_tick(price: float, tick: float) -> bool:
    x = price / tick
    return abs(x - round(x)) < 1e-6


def market_vols(cfg: SimConfig, S: float, strikes: np.ndarray, atm_vol: float | None = None) -> np.ndarray:
    """市場 smile（sticky moneyness）：σ(K) = atm_vol + skew_slope·ln(K/S)，下限 5%。"""
    atm = cfg.sigma_mkt if atm_vol is None else atm_vol
    return np.maximum(atm + cfg.skew_slope * np.log(strikes / S), 0.05)


def market_atm_path(cfg: SimConfig, rng) -> np.ndarray:
    """市場 ATM 隱含波動率的路徑（每步一個值，長度 n_steps + 1）。

    σ_t = sigma_real + (sigma_mkt − sigma_real)·e^{−t/learning} + vol_of_vol·W_t（t 以交易日計），下限 5%。
    """
    days = np.arange(cfg.n_steps + 1) / cfg.steps_per_day
    if cfg.vol_learning_days > 0:
        drift = cfg.sigma_real + (cfg.sigma_mkt - cfg.sigma_real) * np.exp(-days / cfg.vol_learning_days)
    else:
        drift = np.full_like(days, cfg.sigma_mkt)
    dW = rng.standard_normal(cfg.n_steps) * math.sqrt(1.0 / cfg.steps_per_day)
    noise = np.concatenate([[0.0], np.cumsum(cfg.vol_of_vol * dW)])
    return np.maximum(drift + noise, 0.05)


def _parse_side(q: dict, side: str):
    price = q.get(side)
    vol = q.get(f"{side}_volume", 0) or 0
    if price is None or vol <= 0:
        return None
    return float(price), int(vol)


# ---------------------------------------------------------------------------
# 模擬主迴圈
# ---------------------------------------------------------------------------
def run_simulation(strategy, cfg: SimConfig | None = None) -> SimResult:
    """用給定策略跑一次模擬。strategy 需有 quote(state) 與 hedge(state) 兩個方法。"""
    cfg = cfg or SimConfig()
    t0 = time.perf_counter()
    rng_path = np.random.default_rng([cfg.seed, 1])
    rng_flow = np.random.default_rng([cfg.seed, 2])

    n, dt = cfg.n_steps, cfg.dt
    z = rng_path.standard_normal(n)
    logS = np.concatenate([[0.0], np.cumsum((cfg.mu - 0.5 * cfg.sigma_real**2) * dt
                                            + cfg.sigma_real * math.sqrt(dt) * z)])
    path = cfg.S0 * np.exp(logS)
    path.flags.writeable = False
    atm_path = market_atm_path(cfg, np.random.default_rng([cfg.seed, 3]))

    chain = make_chain(cfg)
    ids = list(chain)
    kinds = np.array([chain[i].kind for i in ids])
    strikes = np.array([chain[i].strike for i in ids])
    is_call = kinds == "call"
    positions = {i: 0 for i in ids}
    positions[UNDERLYING] = 0
    cash = 0.0
    fills: list[Fill] = []
    recent: list[Fill] = []
    breaches = invalid = hedge_volume = 0
    hedge_cost = edge = 0.0
    mtm = np.zeros(n + 1)
    deltas = np.zeros(n)

    def theo_and_greeks(S, step):
        tau = np.full(len(ids), max((cfg.expiry_days - step / cfg.steps_per_day) / cfg.days_per_year, 1e-8))
        vols = market_vols(cfg, S, strikes, atm_path[step])
        call_p = bs_price(S, strikes, tau, vols, cfg.r)
        put_p = bs_price(S, strikes, tau, vols, cfg.r, kind="put")
        price = np.where(is_call, call_p, put_p)
        delta = np.where(is_call, bs_delta(S, strikes, tau, vols, cfg.r),
                         bs_delta(S, strikes, tau, vols, cfg.r, kind="put"))
        vega = bs_vega(S, strikes, tau, vols, cfg.r)
        return np.atleast_1d(price), np.atleast_1d(delta), np.atleast_1d(vega), tau

    def mark(S, theo):
        return cash + positions[UNDERLYING] * S + float(sum(positions[i] * theo[k] for k, i in enumerate(ids)))

    tick = cfg.option_tick
    for step in range(n):
        S = float(path[step])
        theo, delta, vega, tau = theo_and_greeks(S, step)
        mtm[step] = mark(S, theo)

        half = cfg.competitor_half_spread_vol_pts * vega
        comp_bid = np.floor(np.round((theo - half) / tick, 9)) * tick
        comp_ask = np.ceil(np.round((theo + half) / tick, 9)) * tick
        comp_ask = np.maximum(comp_ask, comp_bid + tick)
        mb = {i: (round(float(comp_bid[k]), 10) if comp_bid[k] > 0 else None) for k, i in enumerate(ids)}
        ma = {i: round(float(comp_ask[k]), 10) for k, i in enumerate(ids)}

        state = MarketState(
            step=step, n_steps=n, time=step * dt, dt=dt, S=S, S_history=path[: step + 1],
            options=dict(chain), t_to_expiry={i: float(tau[k]) for k, i in enumerate(ids)},
            market_bid=mb, market_ask=ma, positions=dict(positions), cash=cash, recent_fills=list(recent),
            r=cfg.r, option_tick=tick, underlying_half_spread=cfg.underlying_half_spread,
            option_limit=cfg.option_limit, underlying_limit=cfg.underlying_limit,
            max_quote_volume=cfg.max_quote_volume, steps_per_day=cfg.steps_per_day,
            days_per_year=cfg.days_per_year,
        )
        recent = []

        # ---- 1. 報價驗證 ----
        raw = strategy.quote(state) or {}
        book = {}
        for oid, q in raw.items():
            if oid not in chain or not isinstance(q, dict):
                invalid += 1
                continue
            bid, ask = _parse_side(q, "bid"), _parse_side(q, "ask")
            for side_name, side in (("bid", bid), ("ask", ask)):
                if side is None:
                    continue
                p, v = side
                if p <= 0 or not on_tick(p, tick) or v > cfg.max_quote_volume:
                    invalid += 1
                    if side_name == "bid":
                        bid = None
                    else:
                        ask = None
            if bid is not None and ask is not None and bid[0] >= ask[0]:
                invalid += 1  # 交叉報價（crossed）整筆拒絕
                bid = ask = None
            pos = positions[oid]
            if bid is not None and pos + bid[1] > cfg.option_limit:
                breaches += 1
                bid = None
            if ask is not None and pos - ask[1] < -cfg.option_limit:
                breaches += 1
                ask = None
            book[oid] = [list(bid) if bid else None, list(ask) if ask else None]

        # ---- 2. 雜訊交易者 ----
        arrivals = rng_flow.poisson(cfg.arrival_rate, len(ids))
        for k, oid in enumerate(ids):
            for _ in range(arrivals[k]):
                buyer = rng_flow.random() < 0.5
                size = int(rng_flow.integers(1, cfg.max_trade_size + 1))
                tol = rng_flow.exponential(cfg.tolerance_vol_pts) * vega[k]
                coin = rng_flow.random() < 0.5
                q = book.get(oid)
                if q is None:
                    continue
                if buyer:  # 他買 → 打你的 ask
                    side = q[1]
                    if side is None or side[1] <= 0:
                        continue
                    p = side[0]
                    better = p < ma[oid] - 1e-9 or (abs(p - ma[oid]) < 1e-9 and coin)
                    if not (better and p <= theo[k] + tol):
                        continue
                    vol = min(size, side[1])
                    side[1] -= vol
                    positions[oid] -= vol
                    cash += p * vol
                    edge += (p - theo[k]) * vol
                    f = Fill(step, oid, "sell", p, vol)
                else:      # 他賣 → 打你的 bid
                    side = q[0]
                    if side is None or side[1] <= 0:
                        continue
                    p = side[0]
                    cb = mb[oid] if mb[oid] is not None else -math.inf
                    better = p > cb + 1e-9 or (abs(p - cb) < 1e-9 and coin)
                    if not (better and p >= theo[k] - tol):
                        continue
                    vol = min(size, side[1])
                    side[1] -= vol
                    positions[oid] += vol
                    cash -= p * vol
                    edge += (theo[k] - p) * vol
                    f = Fill(step, oid, "buy", p, vol)
                fills.append(f)
                recent.append(f)

        # ---- 3. 避險 ----
        state.positions = dict(positions)
        state.cash = cash
        state.recent_fills = list(recent)
        order = int(strategy.hedge(state) or 0)
        if order != 0:
            if abs(positions[UNDERLYING] + order) > cfg.underlying_limit:
                breaches += 1
            else:
                positions[UNDERLYING] += order
                cost = abs(order) * cfg.underlying_half_spread
                cash -= order * S + cost
                hedge_volume += abs(order)
                hedge_cost += cost
        deltas[step] = positions[UNDERLYING] + float(sum(positions[i] * delta[k] for k, i in enumerate(ids)))

    S_end = float(path[n])
    theo_end, *_ = theo_and_greeks(S_end, n)
    mtm[n] = mark(S_end, theo_end)
    return SimResult(cfg, mtm, deltas, fills, dict(positions), breaches, invalid, hedge_volume,
                     hedge_cost, edge, time.perf_counter() - t0)


# ---------------------------------------------------------------------------
# 評分
# ---------------------------------------------------------------------------
def _lin(x, lo, hi):
    """x 在 [lo, hi] 間線性映射到 [0, 1]。"""
    return float(min(max((x - lo) / (hi - lo), 0.0), 1.0))


def score(results: list[SimResult]) -> dict:
    """依 capstone/README.md 的評分規則，把多個種子的結果換算成分數（滿分 100）。"""
    pnl = float(np.mean([r.pnl for r in results]))
    sharpe = float(np.mean([r.sharpe for r in results]))
    max_delta = float(np.mean([r.max_abs_delta for r in results]))
    violations = sum(r.limit_breaches + r.invalid_quotes for r in results)
    # 至少要真的做市（平均每個種子成交 ≥ 100 口），風險與紀律分數才算數，避免「不交易」拿分
    active = float(np.mean([sum(f.volume for f in r.fills) for r in results])) >= 100
    parts = {
        "PnL (40)": 40 * _lin(pnl, 0.0, 150.0),
        "Sharpe (25)": 25 * _lin(sharpe, 0.0, 10.0),
        "風險 max|delta| (20)": 20 * (1 - _lin(max_delta, 10.0, 100.0)) if active else 0.0,
        "紀律 違規次數 (15)": float(max(15 - violations, 0)) if active else 0.0,
    }
    parts["總分"] = sum(parts.values())
    return parts


def print_report(name: str, results: list[SimResult]) -> None:
    keys = ["pnl", "sharpe", "max_abs_delta", "mean_abs_delta", "limit_breaches", "invalid_quotes",
            "option_trades", "option_volume", "edge_captured", "hedge_volume", "hedge_cost", "runtime_s"]
    labels = {"pnl": "PnL", "sharpe": "PnL Sharpe（年化）", "max_abs_delta": "max |delta|",
              "mean_abs_delta": "平均 |delta|", "limit_breaches": "部位上限違規", "invalid_quotes": "無效報價",
              "option_trades": "選擇權成交筆數", "option_volume": "選擇權成交口數",
              "edge_captured": "成交優勢（vs 市場 theo）", "hedge_volume": "避險股數", "hedge_cost": "避險成本",
              "runtime_s": "執行秒數"}
    cfg = results[0].config
    print(f"\n=== 策略：{name} ===")
    print(f"情境：S0={cfg.S0}, sigma_real={cfg.sigma_real:.0%}, 期初 sigma_mkt={cfg.sigma_mkt:.0%}, "
          f"learning={cfg.vol_learning_days} 天, vol-of-vol={cfg.vol_of_vol:.3f}, skew={cfg.skew_slope}, "
          f"{cfg.n_days} 天 × {cfg.steps_per_day} 步, 選擇權 {len(cfg.strikes) * 2} 檔")
    header = f"{'指標':<22}" + "".join(f"{'seed ' + str(r.config.seed):>12}" for r in results) + f"{'平均':>12}"
    print(header)
    for k in keys:
        vals = [r.summary()[k] for r in results]
        fmt = (lambda v: f"{v:12.0f}") if isinstance(vals[0], int) else (lambda v: f"{v:12.2f}")
        print(f"{labels[k]:<22}" + "".join(fmt(v) for v in vals) + fmt(float(np.mean(vals))))
    print("期末部位（seed {}）：{}".format(results[0].config.seed,
                                         {k: v for k, v in results[0].final_positions.items() if v}))
    sc = score(results)
    print("評分：" + "，".join(f"{k} {v:.1f}" for k, v in sc.items()))


def plot_results(results: list[SimResult], path: str) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(2, 1, figsize=(9, 6), sharex=True)
    for r in results:
        days = np.arange(len(r.mtm)) / r.config.steps_per_day
        axes[0].plot(days, r.mtm, label=f"seed {r.config.seed}")
        axes[1].plot(days[:-1], r.delta, lw=0.8)
    axes[0].set_ylabel("Mark-to-market PnL")
    axes[0].legend()
    axes[1].set_ylabel("Portfolio delta")
    axes[1].set_xlabel("Trading day")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    print(f"已存圖：{path}")


def main(argv=None) -> list[SimResult]:
    ap = argparse.ArgumentParser(description="選擇權做市模擬器")
    ap.add_argument("--strategy", default="reference_strategy",
                    help="capstone/ 下的策略模組名稱（需定義 Strategy 類別），預設 reference_strategy")
    ap.add_argument("--seeds", type=int, default=3, help="跑幾個種子（0, 1, 2, …）")
    ap.add_argument("--seed-offset", type=int, default=0)
    ap.add_argument("--sigma-real", type=float, default=None)
    ap.add_argument("--sigma-mkt", type=float, default=None)
    ap.add_argument("--skew", type=float, default=None, help="skew_slope")
    ap.add_argument("--days", type=int, default=None)
    ap.add_argument("--plot", default=None, help="把 PnL / delta 圖存成 PNG")
    args = ap.parse_args(argv)

    module = importlib.import_module(args.strategy)
    base = SimConfig()
    overrides = {k: v for k, v in (("sigma_real", args.sigma_real), ("sigma_mkt", args.sigma_mkt),
                                   ("skew_slope", args.skew), ("n_days", args.days)) if v is not None}
    base = replace(base, **overrides)
    results = []
    for s in range(args.seed_offset, args.seed_offset + args.seeds):
        results.append(run_simulation(module.Strategy(), replace(base, seed=s)))
    print_report(args.strategy, results)
    if args.plot:
        plot_results(results, args.plot)
    return results


if __name__ == "__main__":
    main()
