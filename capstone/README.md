# Capstone：離線選擇權做市模擬

把整門課的工具串起來：估計波動率、用模型定價、在 tick 網格上報價、管理庫存、做 delta 避險。模擬器刻意沿用 Optibook 的規則（部位上限、tick size、違規單被拒），練完可以把邏輯搬到真實的 Optibook bot。

## 檔案

| 檔案 | 內容 |
|---|---|
| [`mm_sim.py`](mm_sim.py) | 模擬器：GBM 標的、選擇權鏈、競爭做市商、雜訊交易者、成交撮合、評分 |
| [`student_strategy.py`](student_strategy.py) | **你的策略**（TODO 骨架；原樣執行不會報價，得分 0） |
| [`reference_strategy.py`](reference_strategy.py) | 參考策略：市場隱含波動率 theo + vol 觀點決定 vega 目標 + 庫存 skew + delta 避險 |

## 怎麼跑

在 `natenberg_course/` 底下：

```bash
.venv/bin/python capstone/mm_sim.py --strategy student_strategy
```

```bash
.venv/bin/python capstone/mm_sim.py                       # 參考策略（預設 3 個種子，約 3 秒）
```

```bash
.venv/bin/python capstone/mm_sim.py --strategy student_strategy --sigma-real 0.15 --seeds 5 --plot capstone/run.png
```

常用參數：`--seeds N`（跑幾個種子）、`--seed-offset`、`--sigma-real`、`--sigma-mkt`、`--skew`、`--days`、`--plot 檔名.png`。也可以在 Python 裡呼叫 `run_simulation(Strategy(), SimConfig(seed=7, sigma_real=0.3))` 拿到 `SimResult` 自己分析（`result.mtm`、`result.delta`、`result.fills`）。

## 專題說明（Project brief）

### 市場

- **標的**：起始 100，走 GBM，**實現波動率 `sigma_real`**（預設 25%）。每天 50 步，共 20 個交易日。
- **選擇權鏈**：履約價 90 / 95 / 100 / 105 / 110 的 call 與 put，共 10 檔，模擬開始時剩 60 個交易日到期（模擬結束時仍未到期）。代號如 `C100`、`P095`。
- **市場隱含波動率**：期初 ATM 為 `sigma_mkt`（預設 20%），帶負斜率 skew：σ(K) = ATM + skew·ln(K/S)。ATM 會**慢慢向實現波動率靠攏**（`vol_learning_days`=30）並帶有隨機波動（`vol_of_vol`）。你看不到這個數字，只能從競爭者的報價反推。
- **競爭做市商**：在市場 theo ± 1.5 個 vol 點（× vega）掛單，對齊 tick。
- **雜訊交易者**：每檔每步以 Poisson(0.08) 到達，隨機買或賣 1–5 口。他們找最好的價格：你的報價**比競爭者好**（一樣好時擲硬幣）且在他們的容忍範圍內（市場 theo ± 指數分配的若干 vol 點 × vega）才會成交在你身上。
- **盯市（mark-to-market）**：選擇權用「市場 theo」（市場隱含波動率）計價，標的用 mid。所以你的損益 = 成交時賺到的價差 + gamma/theta 實現的損益 + vega 部位隨市場 vol 變動的損益 − 避險成本。

### 規則（仿 Optibook）

| 規則 | 數值 | 違反時 |
|---|---|---|
| 選擇權價格 tick | 0.05 | 該邊報價被拒，記一次「無效報價」 |
| 每檔選擇權部位上限 | ±50 | 可能突破上限的那一邊報價被拒，記一次「違規」 |
| 標的部位上限 | ±200 | 避險單整筆被拒，記一次「違規」 |
| 單邊報價數量上限 | 10 | 被拒，記「無效報價」 |
| 交叉報價（bid ≥ ask） | — | 整筆被拒，記「無效報價」 |
| 避險成交 | mid ± 0.02 | 每股付 0.02 成本 |

報價每一步都重新整理（沒有掛單簿殘留），沒有成交通知以外的回報 —— 從 `state.recent_fills` 與 `state.positions` 得知成交。

### 你要實作

`student_strategy.py` 的 `Strategy` 類別：

- `quote(state) -> dict`：`{option_id: {"bid", "bid_volume", "ask", "ask_volume"}}`，可只掛單邊。
- `hedge(state) -> int`：要交易的標的數量（正買負賣）。

建議路線（每一步都對應一個 Lab）：

1. **能報價**：用市場隱含波動率當 theo（Lab 11 求隱含波動率、Lab 03 定價），theo ± edge 報價、對齊 tick（Lab 02 `round_to_tick`）、遵守部位上限。先求「零違規、有成交、PnL 為正」。
2. **能避險**：計算部位 delta（Lab 05、Lab 10），超過容忍帶就用標的打回（Lab 06）。觀察 max |delta| 與避險成本的取捨。
3. **管庫存**：庫存越多，兩邊報價一起往不利於再增加庫存的方向移（inventory skew）。
4. **有觀點**：估計實現波動率（Lab 04），和隱含比較；想做多 vol 就讓報價偏向買進，反之偏向賣出（Lab 06、Lab 07 的 gamma/vega 概念）。
5. **跑不同情境**：`--sigma-real 0.15 / 0.20 / 0.30`，確認策略在各種市場都不會大虧。

## 評分標準（Rubric，滿分 100）

以 `mm_sim.py` 預設情境、種子 0–4（`--seeds 5`）的平均計分；模擬器會自動印出分數。

| 項目 | 配分 | 計算方式 |
|---|---|---|
| PnL | 40 | 平均期末盯市損益；0 → 0 分，≥ 150 → 滿分，中間線性 |
| PnL Sharpe | 25 | 每日損益的年化 Sharpe（平均 / 標準差 × √252）；0 → 0 分，≥ 10 → 滿分 |
| 風險控管：max \|delta\| | 20 | 各種子「避險後部位 delta 絕對值最大值」的平均；≤ 10 滿分，≥ 100 為 0 分 |
| 紀律：違規次數 | 15 | 15 − (部位上限違規 + 無效報價) 總次數，最低 0 |

- 風險與紀律兩項只有在「平均每個種子成交 ≥ 100 口」時才給分 —— 不交易不能拿分。
- 參考策略在預設情境、種子 0–4 約 80 分（平均 PnL ≈ 90、Sharpe ≈ 9、max |delta| ≈ 3、零違規；只跑預設 3 個種子約 69 分）。超過它就是很好的成績。
- 書面報告（自評，不計入自動分數）：用 1 頁說明你的 theo、edge、skew、避險規則，以及在 `--sigma-real 0.15 / 0.25 / 0.30` 三種情境下的表現與原因。

> Sharpe 在這個玩具市場裡會比真實世界高很多（雜訊交易者沒有資訊優勢）。重點是比較策略之間的相對好壞，而不是絕對數字。

## 進階挑戰（Stretch goals）

1. **波動率估計**：比較 close-to-close EWMA、不同半衰期、Parkinson（自己用步內價格組 OHLC）對 PnL 的影響。實現 vol 估計的雜訊會讓你在錯的方向建立 vega 部位 —— 如何設定信心度？
2. **Skew**：市場有負斜率 skew，而且是 sticky moneyness（Lab 11）。用全鏈 OTM 隱含波動率擬合 skew（`skew_fit`），找出某些檔被競爭者報得相對便宜/貴的時刻。試試 `--skew -0.3` 或 `--skew 0`。
3. **Gamma 管理**：限制總 gamma 與總 vega（不只 delta），用 Lab 10 的 gamma/vega 中和概念決定要在哪一檔多報、哪一檔少報。
4. **避險頻率**：固定容忍帶 vs 依 gamma 調整的容忍帶（例如帶寬 ∝ √(成本/gamma)）；比較避險成本與 max |delta|。
5. **情境壓力測試**：`--sigma-real 0.40`、`--days 40`、改 `SimConfig.arrival_rate` 或 `competitor_half_spread_vol_pts`，看策略是否穩健。
6. **搬到 Optibook**：把 `quote` / `hedge` 的邏輯改寫成 Optibook bot（`insert_order`、`delete_orders`、`poll_new_trades`），注意 rate limit 與「沒有成交通知」。

## 對應課程

- 定價與隱含波動率：[ch05](../lessons/ch05_pricing_models.md)、[ch18](../lessons/ch18_black_scholes.md)、[ch24](../lessons/ch24_volatility_skews.md)
- Greeks 與動態避險：[ch07](../lessons/ch07_risk_measurement_1.md)、[ch08](../lessons/ch08_dynamic_hedging.md)、[ch09](../lessons/ch09_risk_measurement_2.md)
- 波動率估計：[ch06](../lessons/ch06_volatility.md)、[ch20](../lessons/ch20_volatility_revisited.md)
- 部位分析與風險：[ch13](../lessons/ch13_risk_considerations.md)、[ch21](../lessons/ch21_position_analysis.md)
- Lab：[labs/README.md](../labs/README.md)（特別是 Lab 04、05、06、10、11）
