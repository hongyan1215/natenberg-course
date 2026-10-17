"""student_strategy.py — 你的做市策略（Capstone）。

執行：
    .venv/bin/python capstone/mm_sim.py --strategy student_strategy

模擬器每一步會呼叫：
    1. strategy.quote(state)  → 回傳每個選擇權的報價
    2. （雜訊交易者可能打到你的報價）
    3. strategy.hedge(state)  → 回傳要買賣的標的數量（int，正=買、負=賣）

`state`（MarketState）裡有什麼（完整定義見 mm_sim.py）：
    state.S                  目前標的價格
    state.S_history          到目前為止的標的價格序列（numpy，唯讀）
    state.dt                 每步的年數（用來年化波動率）
    state.options            {id: OptionSpec(id, kind, strike, expiry_days)}，id 例如 "C100"、"P095"
    state.t_to_expiry        {id: 剩餘年數}
    state.market_bid/ask     {id: 競爭做市商的 bid / ask}（bid 可能是 None）
    state.positions          {id: 部位}，標的的 key 是 "UND"
    state.cash, state.recent_fills（你上一步以來的成交）
    state.option_tick        選擇權價格 tick（價格必須在網格上，否則報價被拒）
    state.option_limit       每個選擇權的部位上限（±）；state.underlying_limit 標的上限
    state.max_quote_volume   單邊報價數量上限
    state.r, state.steps_per_day, state.days_per_year

quote() 的回傳格式：
    {
        "C100": {"bid": 2.35, "bid_volume": 5, "ask": 2.55, "ask_volume": 5},
        "P095": {"ask": 1.10, "ask_volume": 3},      # 只掛單邊也可以
        ...
    }
規則（違反會被拒絕並記在評分裡）：
    - 價格 > 0 且在 option_tick 網格上（用 optlib.round_to_tick：bid 向下、ask 向上）
    - bid < ask（交叉報價整筆拒絕）
    - 數量 ≤ max_quote_volume
    - 部位 + bid_volume ≤ option_limit；部位 − ask_volume ≥ −option_limit
    - hedge 之後 |標的部位| ≤ underlying_limit
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "labs"))
from optlib import bs_delta, bs_price, bs_vega, implied_vol, round_to_tick  # noqa: E402,F401

UNDERLYING = "UND"


class Strategy:
    def __init__(self):
        # TODO：放你需要跨步驟記住的東西，例如波動率估計、上一次的隱含波動率……
        pass

    # ------------------------------------------------------------------
    # 建議拆成幾個小函式，各自用 Lab 的知識完成
    # ------------------------------------------------------------------
    def estimate_vol(self, state) -> float:
        """TODO（Lab 04、Lab 06）：估計標的的實現波動率（年化）。

        提示：對 state.S_history 取對數報酬，用 EWMA 或滾動視窗，再除以 dt 年化。
        資料不足時可以先用市場 ATM 隱含波動率。
        """
        raise NotImplementedError("TODO")

    def market_implied_vols(self, state) -> dict:
        """TODO（Lab 11）：由競爭者報價的 mid 反推每個選擇權的隱含波動率。

        提示：optlib.implied_vol(mid, S, K, t, r, 0, kind)；為了速度可以只每 N 步算一次，
        或用「上次的估計 + (mid − 模型價) / vega」做一步 Newton 更新。
        """
        raise NotImplementedError("TODO")

    def theo(self, state, option_id: str, vol: float) -> float:
        """TODO（Lab 03）：用 Black-Scholes 算理論價值。"""
        raise NotImplementedError("TODO")

    def portfolio_delta(self, state) -> float:
        """TODO（Lab 05、Lab 10）：部位總 delta = 標的部位 + Σ 選擇權部位 × delta。"""
        raise NotImplementedError("TODO")

    # ------------------------------------------------------------------
    # 模擬器呼叫的兩個方法
    # ------------------------------------------------------------------
    def quote(self, state) -> dict:
        """TODO：回傳報價 dict。

        建議步驟：
        1. 每個選擇權算 theo（先用市場隱含波動率，之後再加入你自己的波動率觀點）
        2. edge = 幾個 vol 點 × vega（至少一個 tick）；競爭者大約是 theo ± 1.5 vol 點
        3. 依庫存平移報價（庫存多 → 兩邊都往下，比較容易賣出）
        4. round_to_tick、確認 bid < ask、數量不超過部位上限
        目前回傳空 dict（不報價），模擬器仍可執行，PnL 為 0。
        """
        return {}

    def hedge(self, state) -> int:
        """TODO（Lab 06）：回傳要交易的標的數量，讓部位 delta 回到 0 附近。

        建議：|delta| 超過某個容忍帶才避險（避險有成本）；別超過 underlying_limit。
        """
        return 0
