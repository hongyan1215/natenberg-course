"""optlib — Natenberg 自學課程的參考函式庫（reference library）。

給 Lab 解答（solutions/）與 Capstone 共用。學生在 exercises/ 裡自己實作的函式，
都可以拿這裡的版本對答案；後面的 Lab 也可以直接 `import optlib` 當積木使用。

單位慣例（整個課程統一）：
- 時間 t：年（year）。交易日換算用 252，日曆日換算用 365。
- 利率 r、股利率 q、波動率 sigma：年化、連續複利，小數表示（20% → 0.20）。
- theta：`per="year"` 為每年，`per="day"` 為每日曆日（÷365）。
- vega：每 1 個波動率點（1 vol point = 0.01）的價格變化。
- rho：每 1 個百分點利率（0.01）的價格變化。

內容：
1. Black-Scholes（股票，連續股利率 q）與 Black-76（期貨）定價
2. Greeks：delta / gamma / theta / vega / rho（含 Black-76 版本）
3. 隱含波動率求解（Brent 法）
4. CRR 二元樹（歐式 / 美式，可選離散現金股利）
5. 到期 payoff、`Leg` / `Position` 策略類別（彙總價值、Greeks、到期損益）
6. 歷史波動率估計：close-to-close、Parkinson、Garman-Klass
7. 幾何布朗運動（GBM）路徑模擬
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable, Iterable, Sequence

import numpy as np
from scipy.optimize import brentq
from scipy.stats import norm

TRADING_DAYS = 252
CALENDAR_DAYS = 365

__all__ = [
    "TRADING_DAYS", "CALENDAR_DAYS", "N", "n", "d1_d2",
    "bs_price", "bs_delta", "bs_gamma", "bs_vega", "bs_theta", "bs_rho", "bs_greeks",
    "black76_price", "black76_greeks", "implied_vol", "implied_vol_black76",
    "binomial_price", "call_payoff", "put_payoff", "payoff",
    "Leg", "Position", "log_returns", "close_to_close_vol", "parkinson_vol",
    "garman_klass_vol", "simulate_gbm", "round_to_tick", "demo_print",
]


# ---------------------------------------------------------------------------
# 小工具
# ---------------------------------------------------------------------------
def _kind(kind: str) -> str:
    """把 'c'/'C'/'call' 等寫法統一成 'call' 或 'put'。"""
    k = str(kind).strip().lower()
    if k in ("c", "call"):
        return "call"
    if k in ("p", "put"):
        return "put"
    raise ValueError(f"未知的選擇權種類：{kind!r}（請用 'call' 或 'put'）")


def _out(x):
    """0 維陣列回傳 float，其餘回傳 ndarray，讓純量輸入得到純量輸出。"""
    x = np.asarray(x, dtype=float)
    return float(x) if x.ndim == 0 else x


def N(x):
    """標準常態累積分配函數 N(x)。"""
    return _out(norm.cdf(x))


def n(x):
    """標準常態機率密度函數 n(x) = exp(-x²/2)/√(2π)。"""
    return _out(norm.pdf(x))


def round_to_tick(price: float, tick: float, side: str = "nearest") -> float:
    """把價格對齊到 tick 網格。

    side='bid' 向下取（買價不要多付）、'ask' 向上取、'nearest' 四捨五入。
    用 round(..., 10) 消除浮點誤差（例如 0.1+0.2）。
    """
    x = price / tick
    if side == "bid":
        k = math.floor(round(x, 9))
    elif side == "ask":
        k = math.ceil(round(x, 9))
    else:
        k = round(x)
    return round(k * tick, 10)


# ---------------------------------------------------------------------------
# Black-Scholes
# ---------------------------------------------------------------------------
def d1_d2(S, K, t, sigma, r=0.0, q=0.0):
    """回傳 (d1, d2)。

    d1 = [ln(S/K) + (r − q + σ²/2) t] / (σ√t)，d2 = d1 − σ√t
    """
    S, K, t, sigma = (np.asarray(v, dtype=float) for v in (S, K, t, sigma))
    vs = sigma * np.sqrt(t)
    d1 = (np.log(S / K) + (r - q + 0.5 * sigma**2) * t) / vs
    return _out(d1), _out(d1 - vs)


def _prep(S, K, t, sigma, r, q):
    S, K, t, sigma, r, q = np.broadcast_arrays(
        *(np.asarray(v, dtype=float) for v in (S, K, t, sigma, r, q))
    )
    live = (t > 0) & (sigma > 0)
    t_safe = np.where(live, t, 1.0)
    s_safe = np.where(live, sigma, 1.0)
    with np.errstate(divide="ignore", invalid="ignore"):
        vs = s_safe * np.sqrt(t_safe)
        d1 = (np.log(S / K) + (r - q + 0.5 * s_safe**2) * t_safe) / vs
    d2 = d1 - vs
    return S, K, t, sigma, r, q, live, t_safe, s_safe, d1, d2


def bs_price(S, K, t, sigma, r=0.0, q=0.0, kind="call"):
    """Black-Scholes（含連續股利率 q）歐式選擇權價格。

    Call = S e^{−qt} N(d1) − K e^{−rt} N(d2)
    Put  = K e^{−rt} N(−d2) − S e^{−qt} N(−d1)
    t ≤ 0 或 σ ≤ 0 時退化為「折現後的遠期內含價值」。支援 numpy 廣播。
    """
    kind = _kind(kind)
    S, K, t, sigma, r, q, live, _, _, d1, d2 = _prep(S, K, t, sigma, r, q)
    dfr, dfq = np.exp(-r * t), np.exp(-q * t)
    if kind == "call":
        val = S * dfq * norm.cdf(d1) - K * dfr * norm.cdf(d2)
        dead = np.maximum(S * dfq - K * dfr, 0.0)
    else:
        val = K * dfr * norm.cdf(-d2) - S * dfq * norm.cdf(-d1)
        dead = np.maximum(K * dfr - S * dfq, 0.0)
    return _out(np.where(live, val, dead))


def bs_delta(S, K, t, sigma, r=0.0, q=0.0, kind="call"):
    """Delta = ∂V/∂S。Call: e^{−qt}N(d1)；Put: e^{−qt}(N(d1) − 1)。"""
    kind = _kind(kind)
    S, K, t, sigma, r, q, live, _, _, d1, _ = _prep(S, K, t, sigma, r, q)
    dfq = np.exp(-q * t)
    if kind == "call":
        val = dfq * norm.cdf(d1)
        dead = (S > K).astype(float)
    else:
        val = dfq * (norm.cdf(d1) - 1.0)
        dead = -(S < K).astype(float)
    return _out(np.where(live, val, dead))


def bs_gamma(S, K, t, sigma, r=0.0, q=0.0):
    """Gamma = ∂²V/∂S² = e^{−qt} n(d1) / (S σ √t)（call、put 相同）。"""
    S, K, t, sigma, r, q, live, t_s, s_s, d1, _ = _prep(S, K, t, sigma, r, q)
    val = np.exp(-q * t) * norm.pdf(d1) / (S * s_s * np.sqrt(t_s))
    return _out(np.where(live, val, 0.0))


def bs_vega(S, K, t, sigma, r=0.0, q=0.0):
    """Vega（每 1 個波動率點）= S e^{−qt} n(d1) √t / 100（call、put 相同）。"""
    S, K, t, sigma, r, q, live, t_s, _, d1, _ = _prep(S, K, t, sigma, r, q)
    val = S * np.exp(-q * t) * norm.pdf(d1) * np.sqrt(t_s) / 100.0
    return _out(np.where(live, val, 0.0))


def bs_theta(S, K, t, sigma, r=0.0, q=0.0, kind="call", per="year"):
    """Theta = ∂V/∂(日曆時間)，即 −∂V/∂t。per='year' 每年；per='day' 每日曆日（÷365）。

    Call: −S e^{−qt} n(d1) σ/(2√t) − r K e^{−rt} N(d2) + q S e^{−qt} N(d1)
    Put : −S e^{−qt} n(d1) σ/(2√t) + r K e^{−rt} N(−d2) − q S e^{−qt} N(−d1)
    """
    kind = _kind(kind)
    S, K, t, sigma, r, q, live, t_s, s_s, d1, d2 = _prep(S, K, t, sigma, r, q)
    dfr, dfq = np.exp(-r * t), np.exp(-q * t)
    decay = -S * dfq * norm.pdf(d1) * s_s / (2.0 * np.sqrt(t_s))
    if kind == "call":
        val = decay - r * K * dfr * norm.cdf(d2) + q * S * dfq * norm.cdf(d1)
    else:
        val = decay + r * K * dfr * norm.cdf(-d2) - q * S * dfq * norm.cdf(-d1)
    val = np.where(live, val, 0.0)
    if per == "day":
        val = val / CALENDAR_DAYS
    elif per != "year":
        raise ValueError("per 必須是 'year' 或 'day'")
    return _out(val)


def bs_rho(S, K, t, sigma, r=0.0, q=0.0, kind="call"):
    """Rho（每 1 個百分點利率）。Call: K t e^{−rt} N(d2)/100；Put: −K t e^{−rt} N(−d2)/100。"""
    kind = _kind(kind)
    S, K, t, sigma, r, q, live, _, _, _, d2 = _prep(S, K, t, sigma, r, q)
    dfr = np.exp(-r * t)
    if kind == "call":
        val = K * t * dfr * norm.cdf(d2) / 100.0
    else:
        val = -K * t * dfr * norm.cdf(-d2) / 100.0
    return _out(np.where(live, val, 0.0))


def bs_greeks(S, K, t, sigma, r=0.0, q=0.0, kind="call") -> dict:
    """一次回傳 price / delta / gamma / vega / theta（每日）/ theta_year / rho。"""
    return {
        "price": bs_price(S, K, t, sigma, r, q, kind),
        "delta": bs_delta(S, K, t, sigma, r, q, kind),
        "gamma": bs_gamma(S, K, t, sigma, r, q),
        "vega": bs_vega(S, K, t, sigma, r, q),
        "theta": bs_theta(S, K, t, sigma, r, q, kind, per="day"),
        "theta_year": bs_theta(S, K, t, sigma, r, q, kind, per="year"),
        "rho": bs_rho(S, K, t, sigma, r, q, kind),
    }


def black76_price(F, K, t, sigma, r=0.0, kind="call"):
    """Black-76 期貨選擇權（期貨式以外、權利金立即支付）：等同 bs_price(S=F, q=r)。

    Call = e^{−rt}[F N(d1) − K N(d2)]，d1 = [ln(F/K) + σ²t/2]/(σ√t)
    """
    return bs_price(F, K, t, sigma, r=r, q=r, kind=kind)


def black76_greeks(F, K, t, sigma, r=0.0, kind="call") -> dict:
    """Black-76 Greeks。delta 為對期貨價格 F 的敏感度；rho 在 F 固定下 = −t·V/100。"""
    g = bs_greeks(F, K, t, sigma, r=r, q=r, kind=kind)
    g["rho"] = _out(-np.asarray(t, dtype=float) * np.asarray(g["price"]) / 100.0)
    return g


# ---------------------------------------------------------------------------
# 隱含波動率
# ---------------------------------------------------------------------------
def implied_vol(price, S, K, t, r=0.0, q=0.0, kind="call", lo=1e-6, hi=5.0, tol=1e-10):
    """用 Brent 法反解 Black-Scholes 隱含波動率。

    價格若不在無套利區間 (折現內含價值, 上界) 之內，回傳 nan。
    上界：call 為 S e^{−qt}，put 為 K e^{−rt}。
    """
    kind = _kind(kind)
    dfr, dfq = math.exp(-r * t), math.exp(-q * t)
    if kind == "call":
        lower, upper = max(S * dfq - K * dfr, 0.0), S * dfq
    else:
        lower, upper = max(K * dfr - S * dfq, 0.0), K * dfr
    if not (lower < price < upper) or t <= 0:
        return float("nan")

    def f(s):
        return bs_price(S, K, t, s, r, q, kind) - price

    if f(lo) > 0 or f(hi) < 0:
        return float("nan")
    return float(brentq(f, lo, hi, xtol=tol, maxiter=200))


def implied_vol_black76(price, F, K, t, r=0.0, kind="call", **kw):
    """Black-76 版本的隱含波動率（以 F 代 S、q=r）。"""
    return implied_vol(price, F, K, t, r=r, q=r, kind=kind, **kw)


# ---------------------------------------------------------------------------
# CRR 二元樹
# ---------------------------------------------------------------------------
def binomial_price(S, K, t, sigma, r=0.0, q=0.0, n_steps=200, kind="call",
                   american=False, dividends: Sequence[tuple[float, float]] | None = None):
    """Cox-Ross-Rubinstein 二元樹定價。

    u = e^{σ√Δt}, d = 1/u, p = (e^{(r−q)Δt} − d)/(u − d)，每步折現 e^{−rΔt}。

    dividends：離散現金股利 [(除息時間(年), 金額), ...]，採「託管股利」（escrowed
    dividend）模型：樹建在 S* = S − PV(未來股利) 上，節點的實際股價 = S* + 該時點
    之後剩餘股利的現值。時間點嚴格大於節點時間的股利才算「剩餘」，因此除息前最後一個
    節點的股價仍含息，美式 call 可在此提前履約。
    """
    kind = _kind(kind)
    dt = t / n_steps
    u = math.exp(sigma * math.sqrt(dt))
    d = 1.0 / u
    disc = math.exp(-r * dt)
    p = (math.exp((r - q) * dt) - d) / (u - d)
    divs = [(float(ti), float(D)) for ti, D in (dividends or []) if 0 < ti < t]

    def pv_divs(tau: float) -> float:
        return sum(D * math.exp(-r * (ti - tau)) for ti, D in divs if ti > tau + 1e-12)

    s_star0 = S - pv_divs(0.0)
    sign = 1.0 if kind == "call" else -1.0

    j = np.arange(n_steps + 1)
    ST = s_star0 * u ** j * d ** (n_steps - j)
    values = np.maximum(sign * (ST - K), 0.0)
    for i in range(n_steps - 1, -1, -1):
        values = disc * (p * values[1:] + (1.0 - p) * values[:-1])
        if american:
            jj = np.arange(i + 1)
            Si = s_star0 * u ** jj * d ** (i - jj) + pv_divs(i * dt)
            values = np.maximum(values, sign * (Si - K))
    return float(values[0])


# ---------------------------------------------------------------------------
# 到期 payoff 與策略類別
# ---------------------------------------------------------------------------
def call_payoff(S, K):
    """買權到期價值 max(S − K, 0)。"""
    return _out(np.maximum(np.asarray(S, dtype=float) - K, 0.0))


def put_payoff(S, K):
    """賣權到期價值 max(K − S, 0)。"""
    return _out(np.maximum(K - np.asarray(S, dtype=float), 0.0))


def payoff(kind, S, K=None):
    """通用 payoff：kind ∈ {'call','put','stock'}；stock 的 payoff 就是 S。"""
    if str(kind).lower() in ("stock", "underlying", "s", "future"):
        return _out(np.asarray(S, dtype=float))
    return call_payoff(S, K) if _kind(kind) == "call" else put_payoff(S, K)


_STOCK_KINDS = ("stock", "underlying", "s", "future")


@dataclass
class Leg:
    """策略的一隻腳（leg）。

    kind  : 'call' / 'put' / 'stock'
    qty   : 數量，正=買進（long）、負=賣出（short）
    strike: 履約價（stock 免填）
    expiry: 到期時間（年，從「現在」起算；stock 免填）
    price : 成交價（每單位）；計算損益時需要
    sigma : 這隻腳專屬的波動率（可選，例如有 skew 時各履約價不同）
    """

    kind: str
    qty: float
    strike: float | None = None
    expiry: float | None = None
    price: float | None = None
    sigma: float | None = None

    @property
    def is_stock(self) -> bool:
        return str(self.kind).lower() in _STOCK_KINDS

    def _vol(self, sigma):
        v = self.sigma if self.sigma is not None else sigma
        if v is None:
            raise ValueError("需要提供 sigma（或在 Leg 中指定）")
        return v

    def value(self, S, sigma=None, r=0.0, q=0.0, elapsed=0.0):
        """每單位理論價值（不乘 qty）。elapsed：自建倉起經過的年數。"""
        if self.is_stock:
            return _out(np.asarray(S, dtype=float))
        t = max(self.expiry - elapsed, 0.0)
        return bs_price(S, self.strike, t, self._vol(sigma), r, q, self.kind)

    def greeks(self, S, sigma=None, r=0.0, q=0.0, elapsed=0.0) -> dict:
        """每單位 Greeks（不乘 qty）。"""
        if self.is_stock:
            S = np.asarray(S, dtype=float)
            one, zero = _out(np.ones_like(S)), _out(np.zeros_like(S))
            return {"delta": one, "gamma": zero, "vega": zero, "theta": zero, "rho": zero}
        t = max(self.expiry - elapsed, 0.0)
        g = bs_greeks(S, self.strike, t, self._vol(sigma), r, q, self.kind)
        return {k: g[k] for k in ("delta", "gamma", "vega", "theta", "rho")}

    def payoff(self, S_T):
        """每單位到期價值。"""
        return payoff(self.kind, S_T, self.strike)


@dataclass
class Position:
    """多隻腳組成的部位，彙總價值、Greeks 與損益。"""

    legs: list[Leg] = field(default_factory=list)

    def add(self, leg: Leg) -> "Position":
        self.legs.append(leg)
        return self

    def value(self, S, sigma=None, r=0.0, q=0.0, elapsed=0.0):
        """部位理論價值 Σ qty × 每單位價值。"""
        return _out(sum(leg.qty * np.asarray(leg.value(S, sigma, r, q, elapsed)) for leg in self.legs))

    def greeks(self, S, sigma=None, r=0.0, q=0.0, elapsed=0.0) -> dict:
        """部位 Greeks（delta, gamma, vega, theta(每日), rho）。"""
        tot: dict = {}
        for leg in self.legs:
            for k, v in leg.greeks(S, sigma, r, q, elapsed).items():
                tot[k] = tot.get(k, 0.0) + leg.qty * np.asarray(v)
        return {k: _out(v) for k, v in tot.items()}

    def cost(self) -> float:
        """建倉淨成本 Σ qty × price（正數 = 淨支出 debit）。"""
        if any(leg.price is None for leg in self.legs):
            raise ValueError("每隻腳都要有成交價 price 才能計算成本")
        return float(sum(leg.qty * leg.price for leg in self.legs))

    def pnl(self, S, sigma=None, r=0.0, q=0.0, elapsed=0.0):
        """到期前的理論損益 = 目前理論價值 − 建倉成本。"""
        return _out(np.asarray(self.value(S, sigma, r, q, elapsed)) - self.cost())

    def expiry_pnl(self, S_T):
        """到期損益（假設所有選擇權同時到期）= Σ qty × (payoff − price)。"""
        S_T = np.asarray(S_T, dtype=float)
        return _out(sum(leg.qty * (np.asarray(leg.payoff(S_T)) - leg.price) for leg in self.legs))

    def breakevens(self, S_lo: float, S_hi: float, n_grid: int = 20001) -> list[float]:
        """在 [S_lo, S_hi] 上找到期損益為 0 的點（格點變號後線性內插）。"""
        S = np.linspace(S_lo, S_hi, n_grid)
        y = np.asarray(self.expiry_pnl(S))
        out = []
        for i in range(len(S) - 1):
            if y[i] == 0.0:
                out.append(float(S[i]))
            elif y[i] * y[i + 1] < 0:
                out.append(float(S[i] - y[i] * (S[i + 1] - S[i]) / (y[i + 1] - y[i])))
        return out


# ---------------------------------------------------------------------------
# 歷史波動率
# ---------------------------------------------------------------------------
def log_returns(prices) -> np.ndarray:
    """對數報酬 ln(P_i / P_{i−1})。"""
    p = np.asarray(prices, dtype=float)
    return np.diff(np.log(p))


def close_to_close_vol(closes, periods_per_year: int = TRADING_DAYS, demean: bool = True) -> float:
    """收盤對收盤（close-to-close）年化波動率。

    demean=True：樣本標準差（ddof=1）；False：假設平均報酬為 0，σ² = mean(r²)。
    """
    r = log_returns(closes)
    var = r.var(ddof=1) if demean else np.mean(r**2)
    return float(math.sqrt(var * periods_per_year))


def parkinson_vol(high, low, periods_per_year: int = TRADING_DAYS) -> float:
    """Parkinson 高低價波動率：σ² = Σ ln(H/L)² / (4 n ln2)，再年化。"""
    hl = np.log(np.asarray(high, dtype=float) / np.asarray(low, dtype=float))
    var = np.mean(hl**2) / (4.0 * math.log(2.0))
    return float(math.sqrt(var * periods_per_year))


def garman_klass_vol(open_, high, low, close, periods_per_year: int = TRADING_DAYS) -> float:
    """Garman-Klass 波動率：σ² = mean[ ½ ln(H/L)² − (2ln2 − 1) ln(C/O)² ]，再年化。"""
    o, h, l, c = (np.asarray(v, dtype=float) for v in (open_, high, low, close))
    var = np.mean(0.5 * np.log(h / l) ** 2 - (2 * math.log(2) - 1) * np.log(c / o) ** 2)
    return float(math.sqrt(var * periods_per_year))


# ---------------------------------------------------------------------------
# GBM 模擬
# ---------------------------------------------------------------------------
def simulate_gbm(S0, mu, sigma, t, n_steps, n_paths=1, seed=None, rng=None) -> np.ndarray:
    """幾何布朗運動精確離散化：S_{k+1} = S_k exp((μ − σ²/2)Δt + σ√Δt Z)。

    回傳形狀 (n_paths, n_steps + 1)，第 0 欄為 S0。
    """
    rng = rng if rng is not None else np.random.default_rng(seed)
    dt = t / n_steps
    z = rng.standard_normal((n_paths, n_steps))
    incr = (mu - 0.5 * sigma**2) * dt + sigma * math.sqrt(dt) * z
    logS = np.concatenate([np.zeros((n_paths, 1)), np.cumsum(incr, axis=1)], axis=1)
    return S0 * np.exp(logS)


# ---------------------------------------------------------------------------
# Lab demo 輔助
# ---------------------------------------------------------------------------
def demo_print(label: str, func: Callable, *args, **kwargs):
    """執行 func 並印出結果；若尚未實作（NotImplementedError）則印出提示而不中斷 demo。"""
    try:
        result = func(*args, **kwargs)
    except NotImplementedError:
        print(f"{label}: （TODO：尚未實作）")
        return None
    if isinstance(result, float):
        print(f"{label}: {result:.6f}")
    else:
        print(f"{label}: {result}")
    return result
