# 第 20 章　再論波動率（Volatility Revisited）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：模型裡的波動率（volatility）要填「未來實際會晃多大」的預測。本章教你從歷史資料算 volatility、怎麼預測它，以及怎麼比較不同到期月份的隱含波動率（implied volatility），找出哪個月份相對便宜或貴。

**你只需要先記住這 5 件事**

1. **持有越久，實現波動率（realized volatility）越重要。** 持有到期時，只有標的（underlying）實際晃多大決定損益；IV 慢慢上升也可能虧錢（時間衰減吃掉 vega 利得）。
2. **歷史波動率（historical volatility）：每日對數報酬 → 標準差（standard deviation） → × √252。** 實務多用樣本（除以 n − 1）、假設平均數為 0；各種算法差異通常不大，怎麼解讀比較重要。
3. **volatility 會均值回歸（mean reversion）。** 短期 volatility 範圍很寬、長期會收斂到平均（波動率錐（volatility cone））；評價長天期選擇權（option）要更貼近長期均值。
4. **IV 平常偏貴，而且落後 realized volatility。** 像保險費一定高於期望理賠；但危機時 IV 也可能嚴重低估。
5. **不同月份的 vega 不能直接相加。** 遠月 IV 動得比近月少，要乘上「連動係數」再加總；遠期波動率（forward volatility）要用變異數（σ² × t）相減，不能直接拿 volatility 相減。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 年化 historical volatility | 日報酬 standard deviation × √252 |
| 預測加權 | 和 option 天期最接近的歷史期間給最大權重；超長天期 → 長期均值 |
| 調整後 vega | 各月 vega × 連動係數，再加總 |
| forward volatility | √[(σ2² × t2 − σ1² × t1) ÷ (t2 − t1)] |
| 日曆價差（calendar spread）implied volatility（近似） | 價差價格 ÷ 價差 vega |

**必做練習（約 20 分鐘）**：A1、B1、B5、B6（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[動態避險模擬](https://hongyan1215.github.io/natenberg-course/tools/hedging-simulator/)工具，把隱含與 realized volatility 設成不同值，看持有到期的避險（hedge）損益怎麼由 realized volatility 決定。

---

## 本章定位

模型裡那個「σ」到底該填什麼？歷史的還是未來的？實現的還是隱含的？短期還是長期？本章從「realized volatility 最終決定損益」出發，介紹 historical volatility 的各種估計法、volatility 的統計特性（序列相關、mean reversion、期限結構）、預測方法（加權、EWMA、GARCH），最後談 implied volatility 的期限結構與 forward volatility，用來找出「哪個月份相對便宜／貴」。
前置章節：[ch06](ch06_volatility.md)（volatility 基礎）、[ch08](ch08_dynamic_hedging.md)（動態避險（dynamic hedging））、[ch09](ch09_risk_measurement_2.md)（vega 特性）、[ch11](ch11_volatility_spreads.md)（calendar spread）。

## 學習目標

1. 能用情境數字說明：部位（position）持有越久，realized volatility 越重要、implied volatility 越不重要。
2. 能用收盤價計算樣本／母體、零均值／實際均值的年化 historical volatility，並計算 Parkinson 與 Garman-Klass 估計值。
3. 能解釋序列相關、mean reversion、volatility cone（期限結構）與趨勢性，並據以設計加權預測。
4. 能計算 EWMA 權重與變異數預測，說明 GARCH 比 EWMA 多了哪些成分。
5. 能說明 implied volatility 作為預測指 underlying 偏誤，以及 option「通常偏貴」的原因。
6. 能用期限結構模型（主月份、均值、連動係數）調整各月份 vega，算出真正的 implied volatility 風險。
7. 能計算 forward volatility 與 calendar spread implied volatility，並據此辨識 time butterfly 機會。

## 核心概念

### 20.1 實現波動率 vs. 隱含波動率：誰說了算？

> 💡 **一句話**：IV 上升也可能虧、下跌也可能賺；持有越久，越是由 realized volatility 決定損益。

**自創情境。** underlying 50、6 週到期、利率 0、implied volatility 25%。以 IV 25% 的價格買進 50 straddle：**3.382**。

| 情境 | straddle 值 | 損益 |
|---|---|---|
| IV 立刻升到 28%，其他不變 | 3.788 | **+0.406** |
| IV 在 2 週內慢慢升到 28%，underlying 仍 50 | 3.093 | **−0.289** |
| IV 立刻跌到 22%，underlying 不變 | 2.977 | **−0.406** |
| IV 立刻跌到 22%，但 underlying 跳到 53 | 3.955 | **+0.573** |
| IV 立刻跌到 22%，但 underlying 跌到 47 | 3.826 | **+0.443** |

觀察：IV 上升卻虧錢（時間衰減吃掉了 vega 利得）；IV 下跌卻賺錢（正 gamma 的利得蓋過 vega 損失）。

> **原則：** position 持有越久，underlying 的**realized volatility**越重要，implied volatility 越不重要；若持有到期，只有 realized volatility 決定結果。

這不代表 IV 不重要——價格決定期間的現金流與保證金（margin）需求；但做決策需要同時知道「價格」（IV）與「價值」（對未來實現波動率（future realized volatility）的預測）。

### 20.2 歷史波動率的計算

> 💡 **一句話**：用收盤價算對數報酬，取 standard deviation 再 × √252；各種算法差異不大，解讀比較重要。

**母體 vs. 樣本。**
$$
\sigma_{\text{pop}}=\sqrt{\frac{1}{n}\sum(x_i-\mu)^2},\qquad
\sigma_{\text{sample}}=\sqrt{\frac{1}{n-1}\sum(x_i-\mu)^2}
$$
樣本容易漏掉極端值，用 $n$ 會低估母體 standard deviation；改除以 $n-1$ 修正。historical volatility 通常拿來估計**未來**，所以多用樣本 standard deviation。

**報酬的定義。** 百分比變化 $(p_n-p_{n-1})/p_{n-1}$，或更常用的**對數報酬** $\ln(p_n/p_{n-1})$。

**零均值假設。** 若某 underlying 連續 10 天每天都漲 1%，以實際均值計算的 volatility 是 0（從未偏離平均）——這不符合交易員直覺。多數實務計算假設 $\mu=0$。上例以零均值、252 日年化約為 16.65%。

**年化與交易日。** 通常只計交易日（一年約 250–260 天），乘以 $\sqrt{252}$；也可以用 365 天並把非交易日報酬記 0（比較不同交易日曆的市場時有用）。兩者差異通常不大。

**自創例題：** 11 個收盤價（10 個報酬）

| 日 | 收盤 | 對數報酬 |
|---|---|---|
| 0 | 50.00 | |
| 1 | 50.60 | +0.011929 |
| 2 | 49.80 | −0.015937 |
| 3 | 50.30 | +0.009990 |
| 4 | 51.20 | +0.017734 |
| 5 | 50.70 | −0.009814 |
| 6 | 51.50 | +0.015656 |
| 7 | 51.10 | −0.007797 |
| 8 | 52.00 | +0.017459 |
| 9 | 51.40 | −0.011606 |
| 10 | 51.90 | +0.009681 |

報酬和 $=0.037296$，均值 $\mu=0.0037296$；$\sum x_i^2=0.0017460$；$\sum(x_i-\mu)^2=0.0016069$。

| 方法 | 每日 σ | 年化（×√252） |
|---|---|---|
| 母體、實際均值 | $\sqrt{0.0016069/10}=0.012676$ | 20.12% |
| 母體、零均值 | $\sqrt{0.0017460/10}=0.013214$ | 20.98% |
| 樣本、實際均值 | $\sqrt{0.0016069/9}=0.013362$ | 21.21% |
| 樣本、零均值 | $\sqrt{0.0017460/9}=0.013928$ | **22.11%** |

樣本估計永遠大於母體估計；零均值通常略大於實際均值（因為 $\sum x^2=\sum(x-\mu)^2+n\mu^2$）。

**日報酬 vs. 週報酬。** 用週報酬算出的 volatility 走勢與日報酬相似，但較跳動——資料點少（3 個月只有 13 個週報酬 vs. 約 63 個日報酬）。日報酬資料多、估計較穩，所以最常用。若 underlying 天天大波動，週、月也同樣波動。

**盤中波動：極值法。** 若 underlying 盤中大起大落卻收平盤，只看收盤價會低估波動。

- **Parkinson（高低價法）：**
$$
\sigma=\frac{1}{\sqrt{\Delta t}}\sqrt{\frac{1}{4n\ln2}\sum_{i=1}^n\left(\ln\frac{h_i}{l_i}\right)^2}
$$
- **Garman-Klass（開高低收）：**
$$
\sigma=\frac{1}{\sqrt{\Delta t}}\sqrt{\frac{1}{2n}\sum\left(\ln\frac{h_i}{l_i}\right)^2-\frac{2\ln2-1}{n}\sum\left(\ln\frac{c_i}{o_i}\right)^2}
$$
其中 $\Delta t$ 是每個區間的年數（日資料 $=1/252$，等同乘 $\sqrt{252}$）。

**自創 5 日 OHLC 例題：**

| 日 | 開 | 高 | 低 | 收 | $\ln(h/l)$ | $\ln(c/o)$ |
|---|---|---|---|---|---|---|
| 1 | 100.0 | 101.8 | 99.5 | 101.1 | 0.02285 | +0.01094 |
| 2 | 101.2 | 102.0 | 99.4 | 99.8 | 0.02582 | −0.01393 |
| 3 | 99.6 | 100.9 | 98.7 | 100.5 | 0.02204 | +0.00900 |
| 4 | 100.4 | 102.5 | 100.0 | 101.9 | 0.02469 | +0.01483 |
| 5 | 102.0 | 103.1 | 100.8 | 101.3 | 0.02256 | −0.00689 |

$\sum(\ln h/l)^2=0.0027937$，$\sum(\ln c/o)^2=0.0006620$。

- Parkinson：$\sqrt{0.0027937/(4\times5\times0.6931)}=0.014196$／日 → 年化 **22.54%**
- Garman-Klass：$\sqrt{0.0027937/10-0.3863\times0.0006620/5}=0.015107$／日 → 年化 **23.98%**
- 對照：以前一日收盤 99.9 起算的收盤對收盤（樣本、零均值）→ **19.20%**

**只交易部分時段的市場。** 極值法只能看到開盤時段的波動；收盤後的波動看不到，所以常低估。可依「開盤時數佔一天的比例」對極值法與收盤法加權，例如每天開 6.5 小時：$0.271\times23.98\%+0.729\times19.20\%=20.50\%$。但極值法在連續交易時更精確，實務上簡單地各給一半權重（21.59%）也是合理折衷。

**最重要的提醒：** 不同方法差異通常不大；比起方法細節，**解讀** historical volatility 更重要——它只是預測 future realized volatility 的指引。

### 20.3 波動率的特性（以天氣類比）

> 💡 **一句話**：volatility 有序列相關、會 mean reversion、短期範圍寬長期收斂（volatility cone），也有趨勢。

1. **序列相關（serial correlation）。** 只知道今天最高溫時，明天最好的猜測是「跟今天差不多」。volatility 也是：下一期常接近上一期（**相同長度**的期間比較）。
2. **mean reversion。** 若還知道「這個季節的平均氣溫」，高於平均時明天多半會低一點。volatility 有長期均值：高於均值傾向回落、低於均值傾向回升。價格可以一路走一個方向很多年；volatility 則在某個均衡區間來回擺盪。
3. **期限結構／volatility cone。** 計算每一段 2 週、4 週…300 週的 realized volatility 的最小、最大與平均，會得到「錐形」：短期間範圍很寬、長期間收斂到均值。

```
 波動率
  |\ 最大
  | \__
  |    ‾‾‾‾‾‾────────────
  |------------------------- 平均（長期均值）
  |    ____────────────
  | /‾‾ 最小
  |/
  +--------------------------> 計算期間長度
   短                       長
```

   推論：**長期 volatility 比短期好預測**，因為大小波動在長期互相抵銷。但長天期 option vega 大，一點點預測誤差就被放大；長天期 2–3 個點的誤差，金額可能大於短天期 5–6 個點的誤差。
4. **趨勢性。** volatility 圖表也會出現大小趨勢，可借用技術分析，但要記得 volatility≠價格（例如它有 mean reversion），規則需要調整。

### 20.4 波動率預測

> 💡 **一句話**：和 option 天期最接近的歷史期間給最大權重；EWMA、GARCH 是更系統化的加權法。（公式可先跳過）

**自創歷史資料：**

| 期間 | 4 週 | 13 週 | 26 週 | 52 週 |
|---|---|---|---|---|
| historical volatility | 31% | 25% | 22% | 20% |

| 方法 | 權重（4/13/26/52 週） | 預測 |
|---|---|---|
| 簡單平均 | 25/25/25/25 | 24.50% |
| 最近資料加倍 | 40/20/20/20 | 25.80% |
| 遞減加權（regressive） | 40/30/20/10 | 26.30% |
| 評價 **6 個月** option（26 週最重） | 10/25/40/25 | 23.15% |
| 評價 **3 個月** option（13 週最重） | 20/40/25/15 | 24.70% |

邏輯：
- 「越新越重要」對短天期 option 合理；但對長天期 option，mean reversion 會讓短期擾動不重要——**極長天期的最佳預測就是長期均值**。
- 結合序列相關：給**與 option 存續期間最接近**的歷史期間最大權重。
- 資料越多（例如剛好 3 個月、6 個月的 historical volatility），越能精確對應。

**時間序列模型。** 上面那些 historical volatility 彼此重疊（52 週包含了 26、13、4 週），不是獨立的時間序列；改用**報酬本身**做資料點，才能套用時間序列模型。

**EWMA（指數加權移動平均）。** 下一期變異數：
$$
\sigma^2=\sum_{i=1}^n\alpha_i r_i^2,\qquad \alpha_i=\frac{\lambda^{i-1}(1-\lambda)}{1-\lambda^n}
$$
（此處 $i=1$ 為**最新**的報酬）。權重總和為 1、越新越大。$\lambda$ 越小越偏重近期；$\lambda\to1$ 時所有權重趨近 $1/n$。風控系統常用 $\lambda\approx0.94$。

自創例：最近 5 日報酬（新→舊）$+1.2\%,-0.8\%,+2.1\%,-0.5\%,+0.9\%$，$\lambda=0.94$：

| $i$ | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| $\alpha_i$ | 0.2255 | 0.2120 | 0.1992 | 0.1873 | 0.1760 |

$\sigma^2=0.00015284$，日 σ $=1.236\%$，年化 **19.63%**（等權 19.51%；$\lambda=0.80$ 時 19.81%）。

**ARCH／GARCH。** EWMA 忽略了兩件事：(1) 報酬大小的相關（大波動後常接大波動）；(2) mean reversion。Engle 提出的 ARCH 與後續的 GARCH 家族包含三個成分：一個波動估計（類似 EWMA）、報酬大小的相關成分、回歸均值的速度。最常見的 GARCH(1,1)：
$$
\sigma^2_{t+1}=\gamma V_L+\alpha r_t^2+\beta\sigma_t^2,\qquad \gamma+\alpha+\beta=1
$$
$V_L$ 為長期變異數。$k$ 天後的預期變異數 $=V_L+(\alpha+\beta)^k(\sigma^2_{t+1}-V_L)$——mean reversion 自動內建。

自創例：長期均值 20%、目前 30%、$\alpha=0.08$、$\beta=0.90$、昨天報酬 2.5%：明日年化約 30.72%；21 天後約 27.49%；63 天後約 23.50%；252 天後約 20.08%。

### 20.5 隱含波動率能預測未來嗎？

> 💡 **一句話**：IV 平常比之後的 realized volatility 高（像保險費），而且落後 realized volatility。

若市場有效（價格反映所有資訊），IV 應是 future realized volatility 的最佳預測。實際比較「當時的 3 個月 IV」與「之後 3 個月的 realized volatility」通常發現：

- **realized volatility 領先、IV 落後**：underlying 變得劇烈，IV 才跟著升；underlying 平靜，IV 才跟著降。期限越長（12 個月）落後越明顯。
- **平常 IV 偏高**：多數時間 IV 比後來的實現值高出數個百分點（option 偏貴）；但偶爾在危機中 IV 嚴重低估（實現值暴衝數十個百分點），也可能在恐慌高點嚴重高估。
- 為什麼平常偏貴？(1) **保險類比**：買方願意多付溢價換取極端事件的保護，就像保費一定高於期望理賠；(2) 做市商（market maker）dynamic hedging 有成本，會轉嫁給客戶；(3) 定價模型本身的缺陷。

### 20.6 隱含波動率的期限結構

> 💡 **一句話**：遠月 IV 動得比近月少，各月 vega 要乘連動係數再加總，不然「零 vega」position 也會虧。

雖然持有到期時只有 realized volatility 重要，但多數 position 會提早平倉（已達目標、風險太大、資金另有用途），而提早平倉的主因往往是 **IV 的變化**。因此要認真看 IV 風險。

**mean reversion 讓遠月 IV 動得比近月少。** 自創：均值 30%，三個月份目前都在 30%。

| 情境 | 1 月 | 3 月 | 6 月 |
|---|---|---|---|
| 現在 | 30% | 30% | 30% |
| underlying 轉劇烈 | 36% | 34% | 32% |
| underlying 轉平靜 | 25% | 26.5% | 28% |

```
 IV
  |\                      近月 IV 高於均值時：向下傾斜
  | \___
  |     ‾‾‾───────── 均值
  |  ___───
  | /                     近月 IV 低於均值時：向上傾斜
  +----------------------> 到期時間
```

**加總 vega 為 0 不代表沒有 IV 風險。** 自創 position（均值 30%）：

| 月份 | 3 月 | 5 月 | 7 月 | 9 月 |
|---|---|---|---|---|
| 到期 | 1 個月 | 3 個月 | 5 個月 | 7 個月 |
| 原始 vega | +20 | −45 | −10 | +38 |
| 相對 3 月的連動係數 | 1.00 | 0.70 | 0.50 | 0.35 |

原始合計 $+20-45-10+38=+3$，看似接近中性。但若 3 月 IV 升 4 點，其他月份依序升 2.8、2.0、1.4 點：

$$
\text{損益}=20\times4-45\times2.8-10\times2.0+38\times1.4=80-126-20+53.2=-12.8
$$

**調整後 vega**（以主月份 3 月 IV 為單位）：$+20-45\times0.7-10\times0.5+38\times0.35=20-31.5-5+13.3=-3.2$。position 其實是**短 vega**，$-3.2\times4=-12.8$ ✓。

**期限結構模型的三個輸入：**
1. **主月份**（primary month）：其他月份都以它為基準。常是交易最活躍的近月，但農產品可能選播種／收成相關月份。
2. **均值**：IV 傾向回歸的水準。
3. **連動係數**（whippiness）：其他月份 IV 相對主月份變動的比例。

另外，近月 IV 常在接近到期時變得不穩、與其他月份不一致，許多交易員會把近月單獨管理，主月份改選第二個月。

**期限結構的演變。** 實務上會看到：近月 IV 高時曲線向下傾斜；underlying 轉平靜後 IV 下降、曲線翻轉向上；再度大波動又翻回向下；之後趨於平坦。也常見近月與整條曲線「脫節」。

**季節性。** 有些市場 IV 不只受近期波動與均值影響：
- 農產品：夏季（乾旱、高溫風險）月份的 IV 常年偏高。
- 能源：冬季供暖、夏季空調需求讓特定月份偏高。
- 天然氣：涵蓋颶風旺季的月份（如在 9 月底附近到期的合約）IV 持續偏高。
這類市場很難建立可靠的期限結構模型，必須單獨處理季節月份。

### 20.7 遠期波動率與日曆價差的隱含波動率

> 💡 **一句話**：用變異數相減算 forward volatility，找出相對便宜或貴的月份，再用 time butterfly 交易。

除了「整體 IV 太高或太低」，還可以問：**某個月份相對其他月份是否定價錯誤？** 這對應 calendar spread 交易。

**calendar spread 的 implied volatility：** 用**同一個** volatility 評價兩個月份，使價差理論值等於市場價差，該 volatility 即為價差的 implied volatility。

**快速近似**（價平（at-the-money, ATM）option vega 對 volatility 近乎常數）：
$$
\text{價差隱含波動率}\approx\frac{O_2-O_1}{V_2-V_1}\quad(\text{價差價格}\div\text{價差 vega})
$$

**forward volatility：** 變異數與時間成正比（不是 volatility），所以
$$
\sigma_f^2(t_2-t_1)=\sigma_2^2t_2-\sigma_1^2t_1\;\Rightarrow\;
\sigma_f=\sqrt{\frac{\sigma_2^2t_2-\sigma_1^2t_1}{t_2-t_1}}
$$
推廣：若各段 forward volatility $\sigma_i$ 覆蓋 $t_{i-1}$ 到 $t_i$，則整段的 volatility $=\sqrt{\sum\sigma_i^2(t_i-t_{i-1})/(t_n-t_0)}$。

**兩個月份的例子（自創）。** 3 個月 IV 28%、6 個月 IV 25%（$S=X=100$、$r=0$）：
- forward volatility $=\sqrt{(0.0625\times0.5-0.0784\times0.25)/0.25}=21.59\%$
- ATM 買權（call）：3 個月 5.581、6 個月 7.043，價差 1.463
- 價差 implied volatility（精確）$=17.73\%$；近似 $=1.463/(0.2810-0.1990)=17.83\%$
- 驗算組合：$\sqrt{(0.28^2\times0.25+0.2159^2\times0.25)/0.5}=25\%$ ✓

**多月份例子（自創，$S=100$、$r=0$、ATM call）：**

| 到期（天） | IV | call 價 | vega |
|---|---|---|---|
| 30 | 29.0% | 3.316 | 0.114 |
| 60 | 27.8% | 4.494 | 0.162 |
| 91 | 26.0% | 5.176 | 0.199 |
| 152 | 26.4% | 6.788 | 0.257 |
| 243 | 25.2% | 8.189 | 0.324 |

| calendar spread | 價差價格 | 價差 IV（精確） | 近似 | forward volatility |
|---|---|---|---|---|
| 30/60 | 1.178 | 24.90% | 24.96% | 26.55% |
| 60/91 | 0.681 | **18.21%** | 18.27% | **22.10%** |
| 91/152 | 1.613 | **27.78%** | 27.94% | **26.99%** |
| 152/243 | 1.400 | 20.63% | 20.81% | 23.06% |

IV 曲線看起來只是「平滑下降」，但價差 IV 與 forward volatility 像放大鏡：91 天月份明顯**偏便宜**（進入它的價差 IV 很低、離開它的價差 IV 很高）。策略：**買 60/91 calendar spread**（賣 60、買 91）並**賣 91/152 calendar spread**（賣 152、買 91）——合起來是 **time butterfly**（賣 60、買 2×91、賣 152）。

觀察：曲線向下傾斜時，價差 IV 都落在曲線下方；向上傾斜時落在上方；若所有月份都落在平滑曲線上，價差 IV 曲線也會平滑，沒有明顯錯價。

最後提醒：每個市場（利率、外匯、股票、商品）都有自己的波動特性，熟悉該市場本身與實戰經驗，和懂 volatility 的技術特性一樣重要。

## 交易員視角

- **Optibook 做市（market making）的 σ 來源**：機器人可以在線上用最近 N 筆成交價的對數報酬計算 realized volatility，再用 EWMA 平滑；把它與市場報價（quote）反推的 IV 比較，決定偏向買或賣 vega。
- **短期持有看 IV、長期持有看實現**：若你的策略是「賺價差、快速出場」，IV 變動是主要風險；若是長期 delta hedge，關鍵是 underlying 實際會動多少。
- **不要只看總 vega**：多月份 position 要用期限結構調整後的 vega；近月一點 IV 變化可能把「零 vega」position 打成大虧。
- **historical volatility 資料只從你連線開始**（Optibook 沒有歷史快照）：剛上線時樣本很少，估計非常不穩——此時應更靠近長期均值或 IV，而非迷信短期樣本。
- **forward volatility 找錯價**：calendar spread IV 或 forward volatility 出現「凹洞」或「尖峰」時，用 time butterfly 交易相對價值，比賭整體 IV 方向更穩健。
- **季節月份單獨管理**：在有季節性的商品，把特殊月份從期限結構模型剔除，避免它扭曲其他月份的公平價。

## 常見誤區

1. **誤解**：買進後 IV 上升就一定賺錢。→ **正解**：若上升得慢，theta 損失可能超過 vega 利得；持有越久越取決於 realized volatility。
2. **誤解**：用 $n$ 或 $n-1$、日或週報酬，對結果影響很大。→ **正解**：差異通常不大；更重要的是如何解讀與預測。
3. **誤解**：最新的資料永遠最重要。→ **正解**：要看 option 天期；長天期 option 應更接近長期均值，並以與存續期間相近的歷史期間為主。
4. **誤解**：IV 是未來 volatility 的無偏預測。→ **正解**：IV 通常落後 realized volatility，且平時偏高（保險溢價、hedge 成本、模型缺陷）。
5. **誤解**：各月份 vega 加總為 0 就沒有 IV 風險。→ **正解**：近月 IV 變動較大，要用期限結構連動係數調整。
6. **誤解**：forward volatility 可以用 $(\sigma_2t_2-\sigma_1t_1)/(t_2-t_1)$。→ **正解**：要用變異數（$\sigma^2t$）相減再開根號。

## 重點摘要

| 項目 | 公式／規則 |
|---|---|
| 樣本 standard deviation | $\sqrt{\sum(x_i-\mu)^2/(n-1)}$；historical volatility 常設 $\mu=0$ |
| 年化 | 日 σ × √252（或 ÷ $\sqrt{\Delta t}$） |
| Parkinson | $\sqrt{\sum(\ln h/l)^2/(4n\ln2)}/\sqrt{\Delta t}$ |
| Garman-Klass | $\sqrt{\frac{1}{2n}\sum(\ln h/l)^2-\frac{2\ln2-1}{n}\sum(\ln c/o)^2}/\sqrt{\Delta t}$ |
| volatility 特性 | 序列相關、mean reversion、錐形期限結構、趨勢 |
| 預測加權 | 與 option 天期最接近的資料給最大權重；超長天期 → 長期均值 |
| EWMA | $\alpha_i=\lambda^{i-1}(1-\lambda)/(1-\lambda^n)$，$\lambda\approx0.94$ |
| GARCH(1,1) | $\sigma^2_{t+1}=\gamma V_L+\alpha r_t^2+\beta\sigma_t^2$ |
| IV 偏誤 | 落後實現值、平時偏高 |
| 調整 vega | 各月 vega × 相對主月份連動係數 |
| forward volatility | $\sqrt{(\sigma_2^2t_2-\sigma_1^2t_1)/(t_2-t_1)}$ |
| 價差 IV 近似 | 價差價格 ÷ 價差 vega |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B1、B5、B6）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ 為什麼說「持有到期時只有 realized volatility 重要」？那 IV 在什麼情況下仍然關鍵？

<details><summary>提示</summary>

回想 20.1 的表：持有到期時，損益來自 gamma 利得和 theta 成本，這取決於 underlying 實際怎麼動。再想：如果中途就平倉，出場價格又是由什麼決定？

</details>

<details><summary>解答</summary>

持有到期並持續 delta hedge 時，損益由 underlying 實際移動（gamma 利得 vs. theta 成本）決定，IV 只影響期間的評價。但 IV 決定中途的市值、margin 與現金流；若提前平倉（多數 position 如此），IV 變化直接決定出場損益。

</details>

**A2.** 為什麼 historical volatility 常用樣本 standard deviation 且假設零均值？

<details><summary>解答</summary>

historical volatility 用來估計未來（母體），有限樣本容易漏掉極端值而低估，所以除以 $n-1$。零均值是因為若 underlying 穩定單向上漲，以實際均值計算會得到接近 0 的 volatility，不符合交易員對「價格在動」的直覺；而且短期均值估計本身噪音很大。

</details>

**A3.** 為什麼 Parkinson／Garman-Klass 對只在部分時段交易的指數常算出比收盤對收盤更低的 volatility？如何修正？

<details><summary>解答</summary>

極值法只觀察開盤時段的價格範圍，收盤後到隔日開盤之間的波動（例如隔夜跳空）看不到，因此低估。修正：依開盤時數比例對極值法與收盤法加權，或簡單各給一半權重。

</details>

**A4.** volatility cone 告訴我們長期 volatility 比較好預測，那為什麼長天期 option 反而不一定比較好評價？

<details><summary>解答</summary>

長天期 option 的 vega 大，同樣 1 個百分點的預測誤差造成的金額誤差更大。即使長期預測誤差的「點數」較小，乘上較大的 vega 後，金額誤差可能超過短天期 option。

</details>

**A5.** 為什麼遠月 IV 對近月 IV 的變動反應較小？這對 vega 風險有何意義？

<details><summary>解答</summary>

volatility mean reversion，長期間內更可能回到均值，所以遠月 IV 較貼近均值、變動較小。意義：不同月份的 vega 不能直接相加，應乘上相對主月份的連動係數再加總，否則可能誤判為中性。

</details>

**A6.** EWMA 和 GARCH 的主要差別是什麼？

<details><summary>解答</summary>

EWMA 只是對過去報酬平方做遞減加權，沒有長期均值，預測會無限期停留在目前水準。GARCH 加入長期變異數項（mean reversion 速度）與報酬大小相關結構，預測會隨時間收斂到長期均值。

</details>

### B. 計算題

**B1.** ⭐ 6 個收盤價：80.0、81.2、80.4、82.0、81.0、81.8。以樣本、零均值、252 日計算年化 historical volatility。

<details><summary>提示</summary>

第一步算 5 個 ln(今天 ÷ 昨天)；第二步把它們平方相加，除以 4（樣本：5 − 1）再開根號，得到每日 σ；最後乘 √252。

</details>

<details><summary>解答</summary>

對數報酬：$\ln(81.2/80)=0.014889$、$\ln(80.4/81.2)=-0.009901$、$\ln(82/80.4)=0.019705$、$\ln(81/82)=-0.012270$、$\ln(81.8/81)=0.009828$。
平方和 $=0.0002217+0.0000980+0.0003883+0.0001506+0.0000966=0.0009551$。
日 σ $=\sqrt{0.0009551/4}=0.015452$；年化 $=0.015452\times\sqrt{252}=24.53\%$。

</details>

**B2.** 3 日資料：(高, 低) = (52.0, 50.5)、(51.8, 50.2)、(52.6, 51.0)。求 Parkinson 年化 volatility（252 日）。

<details><summary>解答</summary>

$\ln(52/50.5)=0.029270$、$\ln(51.8/50.2)=0.031375$、$\ln(52.6/51)=0.030891$。
平方和 $=0.0008567+0.0009844+0.0009543=0.0027954$。
日 σ $=\sqrt{0.0027954/(4\times3\times0.693147)}=\sqrt{0.00033608}=0.018332$；年化 $=29.10\%$。

</details>

**B3.** historical volatility：1 個月 35%、3 個月 28%、6 個月 24%、12 個月 22%。要評價 3 個月 option，權重 20/40/25/15。預測為多少？若評價 2 年 option，你會怎麼調整？

<details><summary>解答</summary>

$0.2\times35+0.4\times28+0.25\times24+0.15\times22=7+11.2+6+3.3=27.5\%$。
2 年 option：mean reversion 主導，應把大部分權重放在 12 個月（或更長的長期均值），預測接近 22% 甚至更貼近長期平均。

</details>

**B4.** EWMA，$\lambda=0.90$、$n=4$。求四個權重（$i=1$ 最新）。若報酬（新→舊）為 2%、−1%、1%、−1%，日 volatility 是多少？

<details><summary>解答</summary>

分母 $1-0.9^4=0.3439$。
$\alpha_1=0.1/0.3439=0.2908$，$\alpha_2=0.09/0.3439=0.2617$，$\alpha_3=0.081/0.3439=0.2355$，$\alpha_4=0.0729/0.3439=0.2120$。
$\sigma^2=0.2908\times0.0004+(0.2617+0.2355+0.2120)\times0.0001=0.00011632+0.00007092=0.00018724$；日 σ $=1.368\%$。

</details>

**B5.** ⭐ 2 個月 IV 30%、5 個月 IV 26%。求 2–5 個月之間的 forward volatility。

<details><summary>提示</summary>

要用變異數，不是 volatility；時間用年（2/12、5/12）。先算 0.26² × 5/12 和 0.30² × 2/12，相減後除以 3/12，再開根號。

</details>

<details><summary>解答</summary>

$t_1=2/12$、$t_2=5/12$。$\sigma_f=\sqrt{(0.0676\times5/12-0.09\times2/12)/(3/12)}=\sqrt{(0.028167-0.015)/0.25}=\sqrt{0.052667}=22.95\%$。

</details>

**B6.** ⭐ position：4 月 vega +30、6 月 −50、9 月 +25；相對 4 月連動係數 1.0、0.6、0.4。(a) 調整後 vega？(b) 4 月 IV 跌 5 點，預期損益？

<details><summary>提示</summary>

(a) 每個月的 vega 乘上自己的連動係數，再相加。(b) 4 月 IV 變動 −5 點，用調整後 vega × (−5)。

</details>

<details><summary>解答</summary>

(a) $30-50\times0.6+25\times0.4=30-30+10=+10$。
(b) $+10\times(-5)=-50$。（原始 vega 合計 +5，會誤估為 −25。）

</details>

**B7.** calendar spread：近月 ATM call 3.20（vega 0.12）、遠月 5.10（vega 0.20）。估計價差 implied volatility。

<details><summary>解答</summary>

$(5.10-3.20)/(0.20-0.12)=1.90/0.08=23.75$，即約 23.75%。

</details>

### C. 交易情境題

**C1.** 你在 Optibook 上剛連線 30 分鐘，用成交價算出的「realized volatility」是 45%，而市場 IV 是 28%。長期來看這檔 underlying volatility 在 25–30%。你會大量買進 option 嗎？

<details><summary>解答</summary>

不宜大量買進。(1) 樣本極短，估計噪音大（序列相關只對相同長度期間有意義）；(2) mean reversion 意味短期高波動傾向回落；(3) 若 option 天期較長，應更重視長期均值。合理做法：小量偏多 vega／gamma（例如買近月 ATM 並 delta hedge），同時持續累積資料、用 EWMA 觀察是否持續；嚴守部位上限（position limit），避免因單一短期估計而重押。

</details>

**C2.** 期限結構（ATM IV）：1 個月 32%、2 個月 30%、3 個月 26%、4 個月 27%、6 個月 25.5%。你懷疑 3 個月合約定價錯誤。如何驗證並交易？

<details><summary>解答</summary>

計算 forward volatility：1→2 月 $\sqrt{(0.09\times2-0.1024)/1}=27.86\%$（以月為單位），2→3 月 $\sqrt{0.0676\times3-0.09\times2}=\sqrt{0.0228}=15.10\%$，3→4 月 $\sqrt{0.0729\times4-0.0676\times3}=\sqrt{0.0888}=29.80\%$，4→6 月 $\sqrt{(0.065025\times6-0.0729\times4)/2}=\sqrt{0.04928}=22.20\%$。2→3 月極低、3→4 月偏高 → 3 個月合約相對便宜。交易：買 2/3 月 calendar spread（賣 2 月、買 3 月）並賣 3/4 月 calendar spread（賣 4 月、買 3 月）＝ time butterfly（賣 2 月、買 2×3 月、賣 4 月），調整口數使 vega 大致中性。注意確認 quote 是真實可成交價（不是過時的結算價（settlement price））。

</details>

### D. 挑戰題

**D1.** (a) 證明零均值變異數 $\frac1n\sum x_i^2$ 等於母體變異數加 $\mu^2$。(b) 用 20.2 的例子驗證。(c) 若一檔股票 21 個交易日每天都漲 0.5%，以零均值計算的年化 volatility 是多少？這個數字合理嗎？與第 6 章「volatility 衡量的是偏離」有何衝突？

<details><summary>解答</summary>

(a) $\sum x_i^2=\sum(x_i-\mu+\mu)^2=\sum(x_i-\mu)^2+2\mu\sum(x_i-\mu)+n\mu^2=\sum(x_i-\mu)^2+n\mu^2$（中間項為 0）。除以 $n$ 即得。
(b) $0.0016069+10\times0.0037296^2=0.0016069+0.0001391=0.0017460$ ✓
(c) $x=\ln1.005=0.0049875$；零均值母體 σ $=0.0049875$；年化 $=0.0049875\times\sqrt{252}=7.92\%$（樣本版本再乘 $\sqrt{21/20}$ 得 8.11%）。以實際均值計算則為 0。哪個合理取決於用途：若相信漂移會持續，0 才是「隨機性」的正確估計；但交易員通常認為短期均值不可靠、價格移動本身就有 option 價值（例如對 delta hedge position，單向移動仍產生 gamma 利得），所以採零均值。這說明「volatility」在實務上混合了趨勢與隨機兩種成分。

</details>

## 自我檢核清單

- [ ] 能用數字說明 IV 上升也可能虧錢、IV 下跌也可能賺錢
- [ ] 能手算四種版本（母體／樣本 × 實際／零均值）的 historical volatility
- [ ] 能寫出並計算 Parkinson 與 Garman-Klass
- [ ] 能說出 volatility 四大特性並畫出 volatility cone
- [ ] 能依 option 天期設計加權預測
- [ ] 能計算 EWMA 權重並說明 $\lambda$ 的效果
- [ ] 能解釋 IV 為何通常高於後來的 realized volatility
- [ ] 能用連動係數算出期限結構調整後的 vega
- [ ] 能算 forward volatility 與 calendar spread IV，並據以構建 time butterfly

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab04_volatility.py`](../labs/exercises/lab04_volatility.py)：實作 `scale_vol`、`annualize_vol`、`one_sd_range`、`atm_vol_from_straddle`、`log_returns`、`lognormal_mean_median`、`prob_above`、`close_to_close_vol`、`parkinson_vol`、`garman_klass_vol`、`rolling_vol`、`vol_cone`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab04_volatility.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`lab04_volatility`](../labs/)：實作收盤法（四種版本）、Parkinson、Garman-Klass、EWMA，並以模擬資料比較估計誤差；畫出 volatility cone。
- 延伸：[`lab11_index_and_skew`](../labs/) 的 implied volatility 求解器可用來計算 calendar spread IV 與 forward volatility。
