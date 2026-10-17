"""reference_strategy.py — Capstone 參考策略（先自己寫 student_strategy.py，再來對照）。

思路（對應課程章節）
--------------------
1. **市場隱含波動率**（ch20、ch24）：從競爭者報價的 mid 反推每個選擇權的隱含波動率。
   用「上一步的估計 + 一步 Newton（÷ vega）」更新，比每步都跑 Brent 便宜很多。
2. **實現波動率估計**（ch06、ch20）：對標的的每步對數報酬做 EWMA，年化成 σ_real 的估計。
3. **理論價值**（ch05、ch18）：theo = 用市場 smile（每檔的隱含波動率）定價 —— 也就是盯市用的價格。
   不直接把 theo 往自己的波動率觀點搬（那會讓你每筆都「付太多」，實測會虧）。
4. **波動率觀點 → vega 目標**（ch08、ch11）：σ_real 估計 > 市場 ATM vol 時想要「多 vega / 多 gamma」，
   反之想要空。目標 vega = VEGA_LIMIT × clip((σ_real估計 − ATM) / VIEW_SCALE, −1, 1) × 信心度。
5. **報價**（ch21、做市）：bid/ask = theo ∓ edge，edge 以 vol 點 × vega 表示；
   再依「該檔庫存」與「整體 vega 距離目標多遠」把兩邊一起往下/往上移（inventory skew）：
   vega 低於目標 → 報價上移（比較容易買到），高於目標 → 下移（比較容易賣掉）。
   價格對齊 tick（bid 向下、ask 向上），數量不超過部位上限。
6. **Delta 避險**（ch07、ch08）：部位 delta 超過容忍帶就用標的打回 0，且不超過標的上限。
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "labs"))
from optlib import bs_delta, bs_price, bs_vega, round_to_tick  # noqa: E402

UNDERLYING = "UND"


class Strategy:
    # ---- 參數（可以調整看看效果）----
    EDGE_VOL_PTS = 0.75        # 單邊 edge（vol 點），競爭者是 1.5
    INVENTORY_SKEW_PTS = 1.0   # 單檔庫存滿載時，報價平移的 vol 點
    VEGA_SKEW_PTS = 1.0        # 整體 vega 偏離目標 VEGA_LIMIT 時，報價平移的 vol 點
    VEGA_LIMIT = 40.0          # 自訂的整體 vega 風險上限（每 vol 點的 PnL）
    VIEW_SCALE = 0.04          # σ_real 估計比 ATM 高/低這麼多（4 vol 點）時，vega 目標拉滿
    EWMA_HALFLIFE_DAYS = 5.0
    BASE_VOLUME = 5
    DELTA_BAND = 3.0           # |delta| 超過才避險

    def __init__(self):
        self.ids = None
        self.iv = None             # 每檔的市場隱含波動率估計
        self.ewma_var = None       # 每步報酬平方的 EWMA
        self.n_obs = 0
        self.last_vols = None

    # ------------------------------------------------------------------
    def _setup(self, state):
        self.ids = list(state.options)
        self.K = np.array([state.options[i].strike for i in self.ids])
        self.is_call = np.array([state.options[i].kind == "call" for i in self.ids])
        self.iv = np.full(len(self.ids), 0.2)
        steps = self.EWMA_HALFLIFE_DAYS * state.steps_per_day
        self.lam = 0.5 ** (1.0 / steps)

    def _price(self, S, tau, vols, r):
        return np.where(self.is_call, bs_price(S, self.K, tau, vols, r), bs_price(S, self.K, tau, vols, r, kind="put"))

    def _update_market_iv(self, state, tau):
        mids = []
        for i in self.ids:
            b, a = state.market_bid[i], state.market_ask[i]
            mids.append(0.5 * (b + a) if b is not None else np.nan)
        mids = np.array(mids)
        iters = 8 if state.step == 0 else 1
        for _ in range(iters):
            model = self._price(state.S, tau, self.iv, state.r)
            vega = np.maximum(np.asarray(bs_vega(state.S, self.K, tau, self.iv, state.r)) * 100, 1e-6)
            step = np.where(np.isnan(mids), 0.0, (mids - model) / vega)
            self.iv = np.clip(self.iv + np.clip(step, -0.05, 0.05), 0.02, 2.0)

    def _update_realized(self, state):
        h = state.S_history
        if len(h) < 2:
            return
        r2 = math.log(h[-1] / h[-2]) ** 2
        self.ewma_var = r2 if self.ewma_var is None else self.lam * self.ewma_var + (1 - self.lam) * r2
        self.n_obs += 1

    def theo_vols(self, state, tau):
        """理論波動率 = 市場 smile（每檔的隱含波動率估計）。"""
        return self.iv.copy()

    def vega_target(self, state) -> float:
        """由「實現 vs 隱含」的觀點決定想持有的總 vega；樣本少時信心度低。"""
        if self.ewma_var is None:
            return 0.0
        atm = float(np.interp(state.S, self.K[self.is_call], self.iv[self.is_call]))
        real = math.sqrt(self.ewma_var / state.dt)
        confidence = min(1.0, self.n_obs / (2.0 * state.steps_per_day))
        return self.VEGA_LIMIT * float(np.clip((real - atm) / self.VIEW_SCALE, -1, 1)) * confidence

    # ------------------------------------------------------------------
    def quote(self, state) -> dict:
        if self.ids is None:
            self._setup(state)
        tau = np.array([state.t_to_expiry[i] for i in self.ids])
        self._update_market_iv(state, tau)
        self._update_realized(state)
        vols = self.theo_vols(state, tau)
        self.last_vols = vols
        theo = self._price(state.S, tau, vols, state.r)
        vega = np.asarray(bs_vega(state.S, self.K, tau, vols, state.r))
        pos = np.array([state.positions[i] for i in self.ids], dtype=float)
        total_vega = float(np.sum(pos * vega))
        vega_gap = np.clip((total_vega - self.vega_target(state)) / self.VEGA_LIMIT, -1, 1)

        tick, lim = state.option_tick, state.option_limit
        out = {}
        for k, oid in enumerate(self.ids):
            edge = max(self.EDGE_VOL_PTS * vega[k], tick)
            shift = -(self.INVENTORY_SKEW_PTS * pos[k] / lim
                      + self.VEGA_SKEW_PTS * vega_gap) * vega[k]
            bid = round_to_tick(theo[k] - edge + shift, tick, "bid")
            ask = round_to_tick(theo[k] + edge + shift, tick, "ask")
            if ask <= bid:
                ask = round(bid + tick, 10)
            bid_vol = int(min(self.BASE_VOLUME, lim - pos[k], state.max_quote_volume))
            ask_vol = int(min(self.BASE_VOLUME, lim + pos[k], state.max_quote_volume))
            q = {}
            if bid >= tick and bid_vol > 0:
                q.update(bid=bid, bid_volume=bid_vol)
            if ask_vol > 0:
                q.update(ask=ask, ask_volume=ask_vol)
            if q:
                out[oid] = q
        return out

    def portfolio_delta(self, state) -> float:
        tau = np.array([state.t_to_expiry[i] for i in self.ids])
        vols = self.last_vols if self.last_vols is not None else self.iv
        d = np.where(self.is_call, bs_delta(state.S, self.K, tau, vols, state.r),
                     bs_delta(state.S, self.K, tau, vols, state.r, kind="put"))
        pos = np.array([state.positions[i] for i in self.ids], dtype=float)
        return float(state.positions[UNDERLYING] + np.sum(pos * d))

    def hedge(self, state) -> int:
        if self.ids is None:
            return 0
        delta = self.portfolio_delta(state)
        if abs(delta) <= self.DELTA_BAND:
            return 0
        cur = state.positions[UNDERLYING]
        target = int(np.clip(cur - round(delta), -state.underlying_limit, state.underlying_limit))
        return target - cur
