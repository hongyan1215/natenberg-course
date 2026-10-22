# Natenberg《Option Volatility and Pricing》完整自學課程

以 Natenberg 第 2 版（2014）的 25 章 + 附錄 B 為範圍，重新編寫的繁中課程。原書是涵蓋範圍的依據；講解、例題與練習全部自編，不是翻譯。講義依原書每個小節的順序完整涵蓋，**不需要讀原書也能學完**；原書只當遇到疑問時的參考。每章讀完講義後，用練習與 Lab 驗證自己真的會。

**線上互動版（平板、手機可用）：<https://hongyan1215.github.io/natenberg-course/>**——含章末互動測驗、學習進度、互動圖表工具。

## 教材組成

| 資料夾 | 內容 | 怎麼用 |
|---|---|---|
| [`lessons/`](lessons/) | 每章一份講義：學習目標、核心概念、交易員視角、常見誤區、重點摘要、A–D 四級練習（附完整解答）、自我檢核清單 | 先自己作答，再展開 `解答` |
| [`labs/`](labs/) | 12 個 Python Lab：在 `exercises/` 實作函式，用 pytest 自動判分 | 見 [labs/README.md](labs/README.md) |
| [`quiz/`](quiz/) | 各章題庫 + 測驗程式，記錄錯題、間隔複習 | `.venv/bin/python quiz/quiz.py ch05` |
| [`capstone/`](capstone/) | 結業專題：離線選擇權做市模擬器，寫出自己的報價與避險策略 | 見 [capstone/README.md](capstone/README.md) |

環境：所有指令都在 `natenberg_course/` 底下執行，Python 用 `.venv/bin/python`（已裝 numpy、scipy、pandas、matplotlib、pytest）。

## Optiver 培訓準備

[`prep/`](prep/) 有 13 份培訓準備講義（高階 Greeks、曲面無套利、到期日、心算、機率、造市、逆向選擇、庫存偏移、跨市場定價、風控紀律、模擬交易），搭配網站上的心算速練、套利偵測、教練拍肩問、波動率曲面編輯器、模擬造市遊戲與兩份自編模擬考。

## 學習路線（8 個模組，約 12 週）

每週 5–8 小時。打勾代表**自我檢核清單全部做得到、Lab 測試全過、題庫該章正確率 ≥ 85%**。

### 模組 1　基礎：合約、遠期與到期損益（第 1–2 週）
- [ ] [第 1 章 金融合約](lessons/ch01_financial_contracts.md)
- [ ] [第 2 章 遠期定價](lessons/ch02_forward_pricing.md) → Lab 01
- [ ] [第 3 章 合約規格與選擇權術語](lessons/ch03_contract_specs.md)
- [ ] [第 4 章 到期損益](lessons/ch04_expiration_pnl.md) → Lab 02

### 模組 2　定價模型與波動率（第 3–4 週）
- [ ] [第 5 章 理論定價模型](lessons/ch05_pricing_models.md) → Lab 03
- [ ] [第 6 章 波動率](lessons/ch06_volatility.md) → Lab 04
- [ ] [附錄 B 實用數學](lessons/appB_useful_math.md)（第 6 章卡住時先讀）

### 模組 3　風險指標與動態避險（第 5–6 週）★ 做市核心
- [ ] [第 7 章 風險衡量 I](lessons/ch07_risk_measurement_1.md) → Lab 05
- [ ] [第 8 章 動態避險](lessons/ch08_dynamic_hedging.md) → Lab 06
- [ ] [第 9 章 風險衡量 II](lessons/ch09_risk_measurement_2.md) → Lab 05（Lambda、Greeks 的動態）

### 模組 4　價差策略（第 7–8 週）
- [ ] [第 10 章 價差入門](lessons/ch10_intro_spreading.md)
- [ ] [第 11 章 波動率價差](lessons/ch11_volatility_spreads.md) → Lab 07
- [ ] [第 12 章 多空價差](lessons/ch12_bull_bear_spreads.md)
- [ ] [第 13 章 風險考量](lessons/ch13_risk_considerations.md)

### 模組 5　合成部位、套利與提前履約（第 9 週）
- [ ] [第 14 章 合成部位](lessons/ch14_synthetics.md) → Lab 08
- [ ] [第 15 章 選擇權套利](lessons/ch15_option_arbitrage.md) → Lab 08
- [ ] [第 16 章 美式選擇權提前履約](lessons/ch16_early_exercise.md) → Lab 09

### 模組 6　避險應用與模型數學（第 10 週）
- [ ] [第 17 章 以選擇權避險](lessons/ch17_hedging_with_options.md) → Lab 10
- [ ] [第 18 章 Black-Scholes 模型](lessons/ch18_black_scholes.md) → Lab 03
- [ ] [第 19 章 二元樹定價](lessons/ch19_binomial.md) → Lab 09

### 模組 7　波動率進階與部位分析（第 11 週）
- [ ] [第 20 章 再談波動率](lessons/ch20_volatility_revisited.md) → Lab 04
- [ ] [第 21 章 部位分析](lessons/ch21_position_analysis.md) → Lab 10

### 模組 8　指數、模型的極限、Skew 與波動率商品（第 12 週）
- [ ] [第 22 章 股價指數期貨與選擇權](lessons/ch22_stock_index.md) → Lab 11
- [ ] [第 23 章 模型與真實世界](lessons/ch23_models_real_world.md)
- [ ] [第 24 章 波動率偏斜](lessons/ch24_volatility_skews.md) → Lab 11
- [ ] [第 25 章 波動率合約](lessons/ch25_volatility_contracts.md) → Lab 12

### 結業
- [ ] [Capstone：做市模擬](capstone/README.md)
- [ ] 全題庫隨機 50 題正確率 ≥ 90%：`.venv/bin/python quiz/quiz.py -n 50`

## 輕鬆路線（推薦先走這條）

講義太長、讀不下去時，每章只做三件事（約 30 分鐘）：

1. 讀開頭的 **⚡ 懶人包**（一句話重點、3–5 件要記住的事、必背卡）。
2. 做 **⭐ 必做題**（3–4 題，每題有「提示」，卡住先看提示再看解答）。
3. 做該章測驗：`.venv/bin/python quiz/quiz.py chNN`（或網站章末測驗）。

正文每一節開頭有「💡 一句話」，平常當字典查。其他練習、Lab 都是選做；整套輕鬆路線走完一輪後，再用下面的完整循環補強。

## 完整路線：每章的學習循環

1. **讀**：課程講義「核心概念」（原書選讀，卡住時再查）。遇到公式，先用自己的話講一次它在說什麼。
2. **算**：B 計算題一定要自己動手（紙筆或 Python）算，算完才看解答。
3. **判斷**：C 情境題先寫下決策與理由，再對照解答。這部分最接近面試與實際交易。
4. **寫程式**：做對應 Lab，`pytest` 全綠才算完成。
5. **測**：`quiz.py chNN`，答錯的題隔天用 `--review` 再考，連對 2 次才離開複習清單。
6. **教**：拿著「重點摘要」，不看筆記對著空氣講 5 分鐘。講不順的地方就是還沒學會的地方。

## 常用指令

```bash
.venv/bin/python quiz/quiz.py ch07 ch08 -n 10
```

```bash
.venv/bin/python quiz/quiz.py --review
```

```bash
.venv/bin/python quiz/quiz.py --stats
```

```bash
cd labs && ../.venv/bin/python -m pytest tests/test_lab05_greeks.py -q
```

## 與 Optibook 的連結

模組 3（delta/gamma/theta/vega、動態避險）與模組 7（部位分析、做市）直接對應 Optibook 的 `options_market_making` 挑戰；第 2、15 章的遠期定價與套利對應 `stock_future`、`etf_future`、`dual_listing`。Capstone 模擬器刻意沿用 Optibook 的部位限制、tick size 與限價/IOC 概念，練完可以把策略邏輯搬到真實的 Optibook bot。

## 網站維護

網站用 MkDocs Material 由 `lessons/`、`quiz/bank/`、`site_src/` 產生，推送到 `main` 後 GitHub Actions 會自動重建並發布。本機預覽：

```bash
.venv/bin/python tools/build_site.py && .venv/bin/mkdocs serve
```

**術語用詞**：新手導讀與新增教材以中文為主，第一次出現附英文，後續保留易讀的中文。網站的「中英術語小辭典」可對照完整講義的英文用語。`tools/apply_glossary.py` 是舊版的英文優先轉換工具，不要對新教材執行。

**新版學習入口**：`site_src/start/` 提供從零開始的短課；`site_src/assets/learning/course.json` 保存每章目標、直覺、算例、常見誤解與先備章節。首頁時間設定、閱讀偏好與個人筆記儲存在 `nq:learning`，可在「我的學習」連同舊進度一起匯出。既有講義、題庫、Lab 與網址全部保留。
