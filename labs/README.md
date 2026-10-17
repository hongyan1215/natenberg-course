# Python Lab 實作軌

12 個 Lab，把講義裡的公式變成會跑、可驗證的程式。每個 Lab 都是「一份待完成的程式 + 一份自動判分的測試」：你在 `exercises/` 填函式，`pytest` 告訴你哪裡錯。

## 資料夾結構

```
labs/
├── optlib.py        # 參考函式庫：BS / Black-76、Greeks、隱含波動率、CRR 二元樹、Leg/Position、歷史波動率、GBM
├── exercises/       # ← 你要寫的地方。函式本體都是 raise NotImplementedError("TODO")
├── solutions/       # 參考解答（先自己寫，卡住再看）
├── tests/           # pytest 測試；conftest.py 依 LAB_TARGET 決定測哪一份
└── pytest.ini
```

每個 `exercises/labNN_*.py` 都有：
- 6–12 個函式，**由易到難排列**，docstring 寫清楚要算什麼、公式提示、單位
- `if __name__ == "__main__":` 示範區：直接執行會印出各函式的結果，尚未實作的會顯示「（TODO：尚未實作）」

## 怎麼跑

以下指令都在 `labs/` 目錄下執行：

```bash
cd labs
```

測你自己的實作（預設 `LAB_TARGET=exercises`）：

```bash
../.venv/bin/python -m pytest tests/test_lab01_forward_pricing.py
```

只跑某一個測試、失敗就停：

```bash
../.venv/bin/python -m pytest tests/test_lab05_greeks.py -x -k finite_difference
```

執行示範區，看看數字長什麼樣：

```bash
../.venv/bin/python exercises/lab01_forward_pricing.py
```

確認參考解答全部通過（換成 `solutions/`）：

```bash
LAB_TARGET=solutions ../.venv/bin/python -m pytest -q
```

還沒實作的函式會讓測試以 `NotImplementedError: TODO` 失敗——這是正常的，代表「輪到你了」。

### 規則與建議

- **一次只做一個函式**：寫完就跑測試（`-k 函式名稱`），綠了再往下。
- 後面的 Lab 可以 `from optlib import ...` 當積木（檔案開頭已經把 `labs/` 加進 `sys.path`）。Lab 03、05 這種「主題就是自己寫公式」的 Lab，docstring 會註明不要直接呼叫 optlib 的同名函式。
- 測試會檢查已知數值、買賣權平價、單調性、數值差分一致性、邊界條件。測試失敗時先讀 assertion 的註解，它通常就是提示。
- 單位：時間用年；`vega` 是每 1 個 vol 點；`theta` 預設每日曆日（÷365）；`rho` 是每 1 個百分點。
- 模擬類測試都固定了亂數種子，結果可重現。

## 建議順序與對應講義

| 順序 | Lab | 主題 | 對應講義 |
|---|---|---|---|
| 1 | [lab01_forward_pricing](exercises/lab01_forward_pricing.py) | 終值/現值、股票/指數/商品遠期、隱含 repo、cash-and-carry、無套利區間 | [ch01](../lessons/ch01_financial_contracts.md)、[ch02](../lessons/ch02_forward_pricing.md) |
| 2 | [lab02_payoffs](exercises/lab02_payoffs.py) | 到期價值、內含/時間價值、tick 對齊、履約交割、組合損益、損益兩平、斜率 | [ch03](../lessons/ch03_contract_specs.md)、[ch04](../lessons/ch04_expiration_pnl.md) |
| 3 | [lab03_pricing_models](exercises/lab03_pricing_models.py) | 期望值定價、N(x) 與多項式近似、Black-Scholes、Black-76、蒙地卡羅 | [ch05](../lessons/ch05_pricing_models.md)、[ch18](../lessons/ch18_black_scholes.md) |
| 4 | [lab04_volatility](exercises/lab04_volatility.py) | √t 縮放、對數常態、跨式估 vol、close-to-close / Parkinson / Garman-Klass、波動率錐 | [ch06](../lessons/ch06_volatility.md)、[ch20](../lessons/ch20_volatility_revisited.md) |
| 5 | [lab05_greeks](exercises/lab05_greeks.py) | 解析 Greeks、中央差分驗證、lambda、ATM 近似、vanna/volga、泰勒損益 | [ch07](../lessons/ch07_risk_measurement_1.md)、[ch09](../lessons/ch09_risk_measurement_2.md) |
| 6 | [lab06_dynamic_hedging](exercises/lab06_dynamic_hedging.py) | 離散 delta 避險模擬、gamma rent、P&L ≈ Σ½ΓS²(σ²_real−σ²_impl)dt、避險頻率 vs 變異數 | [ch08](../lessons/ch08_dynamic_hedging.md) |
| 7 | [lab07_spreads](exercises/lab07_spreads.py) | 策略建構器、組合 Greeks、價差分類、delta 中立比例、損益兩平波動率 | [ch10](../lessons/ch10_intro_spreading.md)–[ch13](../lessons/ch13_risk_considerations.md) |
| 8 | [lab08_synthetics_arbitrage](exercises/lab08_synthetics_arbitrage.py) | 平價、合成部位、conversion/reversal、box、jelly roll、套利掃描、pin risk | [ch14](../lessons/ch14_synthetics.md)、[ch15](../lessons/ch15_option_arbitrage.md) |
| 9 | [lab09_binomial_american](exercises/lab09_binomial_american.py) | CRR 樹、收斂、樹上 Greeks、美式 put 履約邊界、股利與美式 call | [ch16](../lessons/ch16_early_exercise.md)、[ch19](../lessons/ch19_binomial.md) |
| 10 | [lab10_hedging_portfolio](exercises/lab10_hedging_portfolio.py) | protective put、covered call、collar、零成本 collar、情境矩陣、gamma/vega 中和 | [ch17](../lessons/ch17_hedging_with_options.md)、[ch21](../lessons/ch21_position_analysis.md) |
| 11 | [lab11_index_and_skew](exercises/lab11_index_and_skew.py) | 指數與除數、偏態/峰態、隱含波動率求解、skew 擬合、Breeden–Litzenberger 密度、sticky 規則 | [ch22](../lessons/ch22_stock_index.md)–[ch24](../lessons/ch24_volatility_skews.md) |
| 12 | [lab12_volatility_contracts](exercises/lab12_volatility_contracts.py) | 實現變異數、變異數/波動率交換、1/K² 選擇權組合複製、VIX 式內插、盯市、凸性 | [ch25](../lessons/ch25_volatility_contracts.md) |

Lab 03 與 Lab 05 是後面所有 Lab 的地基；Lab 06（動態避險）是做市的核心，務必親手跑模擬看數字。全部完成後，接著做 [Capstone 做市模擬](../capstone/README.md)。

## 各 Lab 的「一定要看到」的結果

- **Lab 03**：蒙地卡羅價格落在 Black-Scholes 的 4 個標準誤之內；N(x) 多項式近似誤差 < 1e-7。
- **Lab 05**：解析 Greeks 與中央差分一致；只用 delta 近似的損益誤差明顯大於 delta-gamma-theta-vega。
- **Lab 06**：σ_real = σ_impl 時避險損益平均 ≈ 0；σ_real > σ_impl 時平均 ≈ 理論優勢；避險間隔放大 16 倍，標準差約放大 4 倍（∝ √Δt）；逐路徑 gamma 公式與實際避險損益相關係數 > 0.98。
- **Lab 09**：美式 put 履約邊界 < K 且越接近到期越接近 K；r = 0 時邊界不存在；大額股利讓美式 call 值得提前履約。
- **Lab 11**：平坦波動率下，蝶式密度積分 ≈ 1、平均 ≈ 遠期價格、形狀 = 對數常態；負斜率 skew 讓左尾機率變大。
- **Lab 12**：平坦波動率下，1/K² 選擇權組合複製出的變異數履約價開根號 ≈ σ；有 skew 時高於 ATM vol。

## 撰寫者備註

`exercises/` 是由 `solutions/` 自動產生的（保留簽名與 docstring，本體換成 `raise NotImplementedError("TODO")`）。修改解答後重新產生：

```bash
.venv/bin/python tools/make_exercises.py            # 在 natenberg_course/ 執行；會覆蓋 exercises/
```

注意：這會覆蓋學生寫在 `exercises/` 的內容，學習者請勿執行。
