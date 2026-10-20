# 第 16 章　美式選擇權的提前履約（Early Exercise of American Options）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：美式選擇權（American option）可以隨時履約（exercise），但通常「留著比較值錢」。只有在拿股利（dividend）、或提早拿到錢去生息，划算到超過放棄的保護時，才值得提前履約（early exercise）。

**你只需要先記住這 5 件事**

1. **沒有 dividend、沒有利息現金流，美式 = 歐式。** 例如期貨型結算（futures-type settlement）的期貨選擇權（futures option），掛名美式也不用 early exercise。
2. **選擇權（option）價值 = 內含價值（intrinsic value） + 波動率（volatility）價值 ± 利息 ± dividend。** 買權（call）：利息加、dividend 減；賣權（put）：利息減、dividend 加。volatility 價值用「伴隨的價外（out-of-the-money, OTM）option 價格」來估。
3. **股票 call：dividend > 伴隨 put 價格 + 履約價（strike price）的利息 → 候選，而且只在除息前一天 exercise。** 例：dividend 1.20 > 0.40 + 0.5625 → exercise 多賺約 0.24。
4. **股票 put：strike 的利息 > 伴隨 call 價格 + dividend → 候選，哪一天都可能。** 但除息前的「禁區」內別 exercise：禁區天數 = dividend ÷ 每天的利息。
5. **early exercise call = 賣出伴隨 put。** 擔心暴跌就在 exercise 時順便買回那張 OTM put，保護還在、成本更低。被指派（assign / assignment）前先自問：「我若持有，現在會 exercise 嗎？」

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 美式下限 | 至少 intrinsic value，也至少歐式下限 |
| 歐式股票 call 下限 | 股價 − strike ÷ (1 + rt) − dividend |
| call early exercise 條件 | dividend > 伴隨 put + strike × r × t |
| put early exercise 條件 | strike × r × t > 伴隨 call + dividend |
| put 禁區天數 | dividend ÷ (strike × r ÷ 365) |
| futures option（股票型結算（stock-type settlement））今天 exercise？ | 一天的 intrinsic value 利息 > 伴隨選擇權（companion option）一天的 theta |

**必做練習（約 20 分鐘）**：A2、B4、B5、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[二元樹視覺化](https://hongyan1215.github.io/natenberg-course/tools/binomial-tree/)，切到美式，看哪些節點會 early exercise。

---

## 本章定位

到目前為止我們假設部位（position）都持有到到期。但許多交易所 option 是美式，持有人可以隨時 exercise。本章回答三個問題：(1) 什麼情況下值得 early exercise？(2) 若值得，哪一天最好？(3) 美式比歐式多值多少？工具是第 15 章的平價關係（[ch15](ch15_option_arbitrage.md)）推出的**套利（arbitrage）邊界**，以及把 option 價值拆成「intrinsic value + volatility 價值 ± 利息價值 ± dividend 價值」的分解。前置：[ch03](ch03_contract_specs.md)（結算（settlement）方式）、[ch07](ch07_risk_measurement_1.md)（rho、theta）、[ch14](ch14_synthetics.md)。

## 學習目標

1. 能寫出美式與歐式 call、put 在期貨（futures）與股票上的上下 arbitrage 邊界，並在價格違反時構建 arbitrage。
2. 能說明為什麼沒有利息與 dividend 考量（例如 futures-type settlement）時，美式 = 歐式。
3. 能用「dividend > volatility 價值 + 利息價值」判斷股票 call 是否為 early exercise 候選，並指出唯一合理的 exercise 日。
4. 能用「利息 > volatility 價值 + dividend」判斷股票 put 是否為 early exercise 候選，並計算 dividend 前的「禁區」（blackout period）天數。
5. 能判斷 stock-type settlement futures option 的 early exercise 條件，並用 companion option 的 theta 決定「今天」是否該 exercise。
6. 能解釋 early exercise 等同「賣出 companion option」，並知道如何保留保護價值。
7. 能描述美式定價模型的發展、美式 delta 的特性，以及 dividend arbitrage、利息 arbitrage 的機制與風險。

## 核心概念

### 16.1 何時提前履約有意義？

> 💡 **一句話**：只有 dividend 或 exercise 後能生息的現金流讓你想要標的（underlying）時，early exercise 才有意義；都沒有就美式 = 歐式。

early exercise 代表「用 option position 換成 underlying position」。只有當**持有 underlying 比持有 option 更有利**時才值得：

- 股票會發**dividend**給股東，option 持有人拿不到；
- exercise 產生**正現金流**，可以生息。

若兩者都不存在：

$$\text{美式價值} = \text{歐式價值}$$

這正是 futures-type settlement 的 futures option（多數美國以外的 futures 交易所）的情況：futures 不配息，futures 與 option 交易都沒有現金流動，即使掛名美式，early exercise 也沒有價值。

### 16.2 套利邊界（Arbitrage Boundaries）

> 💡 **一句話**：美式至少值 intrinsic value，歐式至少值平價推出的下限；價格跌破下限就有 arbitrage。

**下限（lower arbitrage boundary）**：價格低於此值就有 arbitrage。

**(a) 美式至少值 intrinsic value**

**例題 16-1**　美式 80C 成交 11.85，underlying 92.00：買 call −11.85、賣 underlying +92.00、立即 exercise −80.00 → **+0.15** 無風險利潤。
**例題 16-2**　美式 60P 成交 7.70，underlying 52.10：買賣權 −7.70、買 underlying −52.10、立即 exercise +60.00 → **+0.20**。

$$\text{美式買權} \ge \max[0, S - X],\qquad \text{美式賣權} \ge \max[0, X - S]$$

（說「至少」，因為下限可能比 intrinsic value 還高。）

**(b) 歐式下限：由平價推得**

$C - P = (F - X)/(1+rt)$，put 最低為 0，所以

$$\text{歐式買權} \ge \frac{F - X}{1 + rt}\qquad \text{歐式賣權} \ge \frac{X - F}{1 + rt}$$

**futures（stock-type settlement）**：下限是 intrinsic value 的**現值**，因此**低於** intrinsic value。

**例題 16-3**　futures 2,450、9 個月、利率 5%。2,300 歐式 call 下限 = $150/(1 + 0.05 \times 0.75) = 150/1.0375 =$ **144.58**，低於 intrinsic value 150。

**股票**：以 $F = S(1+rt) - D$ 代入並忽略 dividend 的利息：

$$\text{歐式買權} \ge S - \frac{X}{1+rt} - D,\qquad \text{歐式賣權} \ge \frac{X}{1+rt} - S + D$$

**例題 16-4　OTM call 的下限可以大於 0**　股價 79.20、6 個月、利率 5%、無 dividend，80C（OTM）：

$$79.20 - \frac{80}{1.025} = 79.20 - 78.05 = 1.15$$

若 80C 只賣 1.00：買 call、放空股票、到期再用 call 買回：

| 現金流 | 金額 |
|---|---|
| 買 80C | −1.000 |
| 權利金（premium）的利息成本（1.00 × 2.5%） | −0.025 |
| 放空股票收入 | +79.200 |
| 放空收入的利息（79.20 × 2.5%） | +1.980 |
| 到期 exercise 買回股票（最多付 80） | −80.000 |
| **合計（到期時）** | **+0.155** |

這正是 (1.15 − 1.00) 的到期值。若到期股價低於 80，直接在市場買回更便宜，利潤更大——下限給的是最少能賺多少。

**(c) 美式下限 = max(intrinsic value, 歐式下限)**

美式永遠可以「不 early exercise」而變成歐式，所以：

$$\text{美式買權} \ge \max\left[0,\ S - X,\ S - \frac{X}{1+rt} - D\right]$$
$$\text{美式賣權} \ge \max\left[0,\ X - S,\ \frac{X}{1+rt} - S + D\right]$$

**例題 16-5**　股價 79.20、6 個月、利率 5%、兩次 dividend 共 1.80。72C 的歐式下限 = $79.20 - 72/1.025 - 1.80 = 7.16$；intrinsic value 7.20 較大 → 美式下限 **7.20**。
同條件、無 dividend 的 80P：歐式下限 $80/1.025 - 79.20 = -1.15$ → 0；美式下限 = intrinsic value **0.80**。

**邊界隨時間移動**：
- stock-type settlement futures option：現值隨時間逼近 intrinsic value，邊界**永遠上升**。
- 股票 option：若 $F > S$（利息 > dividend），call 邊界上升、put 邊界下降；若 $F < S$，反之。
- 歐式選擇權（European option）若價值低於 intrinsic value，隨時間會往 intrinsic value 靠近 → **正 theta**（第 7 章）。

```
歐式買權下限（股票，F > S）
價值│              ／ 內含價值 S−X
    │            ／／ 下限 S−X/(1+rt)−D（在內含價值上方）
    │          ／／
    │________／／____________ 股價
              X/(1+rt)+D  X
```

**上限（upper arbitrage boundary）**：

- underlying 不會低於 0 → 美式 put ≤ $X$；歐式 put ≤ $X/(1+rt)$（stock-type settlement）。
- 由平價與 put 上限：歐式 call ≤ $\frac{F - X}{1+rt} + \frac{X}{1+rt} = \frac{F}{1+rt}$。
  - futures（stock-type settlement）：$F/(1+rt)$；futures-type settlement：$F$。
  - 股票（忽略 dividend 利息）：$S - D$；美式股票 call：$S$。

**邊界總表**：

| 下限 | 美式 | 歐式 |
|---|---|---|
| futures call（stock-type settlement） | $\max[0, F - X]$ | $\max[0, (F - X)/(1+rt)]$ |
| futures put（stock-type settlement） | $\max[0, X - F]$ | $\max[0, (X - F)/(1+rt)]$ |
| 股票 call | $\max[0, S - X, S - X/(1+rt) - D]$ | $\max[0, S - X/(1+rt) - D]$ |
| 股票 put | $\max[0, X - S, X/(1+rt) - S + D]$ | $\max[0, X/(1+rt) - S + D]$ |

| 上限 | 美式 | 歐式 |
|---|---|---|
| futures call（stock-type settlement） | $F$ | $F/(1+rt)$ |
| futures put（stock-type settlement） | $X$ | $X/(1+rt)$ |
| 股票 call | $S$ | $S - D$ |
| 股票 put | $X$ | $X/(1+rt)$ |

### 16.3 股票買權的提前履約

> 💡 **一句話**：dividend > 伴隨 put + strike 利息時是候選，而且只該在除息前一天 exercise。

**價值分解**：

$$\text{買權價值} = \text{內含價值} + \text{波動率價值} + \text{利息價值} - \text{股利價值}$$

- **volatility 價值**：call 相對持有股票的保護價值（虧損止於 strike）。
- **利息價值**：call 代替股票，可以晚點付 strike，省下利息。
- **dividend 價值**：持有股票才拿得到 dividend，所以 dividend**降低** call 價值。

若 **dividend 價值 > volatility 價值 + 利息價值**，call 價值會低於 intrinsic value。歐式只能認了；美式則可以立刻 exercise 並賣出股票，收回 intrinsic value——成為**early exercise 候選**。

**如何估計三個成分**：
- dividend 價值 = option 存續期內的 dividend 總額。
- 利息價值 ≈ 持有 strike 到到期的利息 $X \cdot r \cdot t$（深價內（deep in-the-money, deep ITM）call 值約 intrinsic value，「賣 call、買股票」的融資額約等於 strike）。
- volatility 價值 ≈ **伴隨 put**（同 strike、同到期）的價格：兩者 vega 相同；OTM put 的利息、dividend 成分很小。

**例題 16-6**　股價 150、1 個月、利率 5%、10 天後配息 1.20、135P = 0.40。135C 是否為 early exercise 候選？

利息價值 = $135 \times 0.05 \times 1/12 = 0.5625$。

$$1.20 > 0.40 + 0.5625 = 0.9625$$

是候選。現在 exercise vs 持有到到期，前者多 **0.2375**。（歐式下限的轉折點在 $X/(1+rt) + D = 135/1.00417 + 1.20 \approx 135.64$。）

**哪一天 exercise？** 提前一天 exercise，你會失去一天的 volatility 價值與一天的利息——換來什麼？dividend 要 10 天後才發，**什麼也沒換到**。所以：

> **股票 call 唯一可能最佳的 early exercise 日，是除息日（ex-dividend date）的前一天。** 若存續期內沒有 dividend，美式股票 call 永遠不該 early exercise。

### 16.4 股票賣權的提前履約

> 💡 **一句話**：strike 利息 > 伴隨 call + dividend 時是候選；可在任何一天，但除息前的禁區內別 exercise。

$$\text{賣權價值} = \text{內含價值} + \text{波動率價值} - \text{利息價值} + \text{股利價值}$$

- 利息價值：exercise put 就能提早收到 strike 並生息 → **降低**持有 put 的價值。
- dividend 價值：dividend 會讓股價下跌，put 受益。

若 **利息價值 > volatility 價值 + dividend 價值** → early exercise 候選。volatility 價值 ≈ 伴隨（OTM）call 價格。

**例題 16-7**　股價 60、2 個月、利率 6%、dividend 0.30、75C = 0.15。75P？

利息 = $75 \times 0.06 \times 2/12 = 0.75$；$0.75 > 0.15 + 0.30 = 0.45$ → 候選，現在 exercise 比持有到到期多 **0.30**。

**但「今天」就 exercise 嗎？** 若 dividend 明天發放：今天 exercise 多賺一天利息 $75 \times 0.06/365 = 0.0123$，卻放棄 0.30 的 dividend（提早賣出股票就拿不到下跌補償）。顯然應等到 dividend 之後。

**禁區（blackout period）**：在 ex-dividend date 前若干天內，early exercise 賺到的利息不可能彌補失去的 dividend：

$$\text{禁區天數} = \frac{D}{X \cdot r / 365} = \frac{0.30}{0.0123} \approx 24.3 \text{ 天}$$

- ex-dividend date 在 24 天內 → 不要 exercise，等除息。
- ex-dividend date 在 40 天後 → 現在 exercise 可多賺 $40 \times 0.0123 = 0.49 > 0.30$；只要未來 40 天的 volatility 價值 < 0.19，現在 exercise 合理。

與 call 不同，**股票 put 可能在任何一天被最佳地 early exercise**（最常見的是除息當天）。

### 16.5 持有空頭股票對提前履約的影響

> 💡 **一句話**：已經放空股票的人更傾向 exercise call，沒股票的人更不傾向 exercise put。（可先跳過）

利率越低，call 越可能 early exercise（exercise 損失的利息小），put 越不可能（exercise 賺的利息少）。放空股票的實際利率較低（要扣借券成本），所以：

- **已經放空股票**的交易員：exercise call 可以消除空頭部位（short position） → 更傾向 early exercise call。
- **沒有股票**的交易員：exercise put 會產生空頭股票 → 更不傾向 early exercise put。

這與第 7 章的原則一致：**能避免就避免持有空頭股票。**

### 16.6 期貨選擇權的提前履約

> 💡 **一句話**：futures-type settlement 不用 early exercise；stock-type settlement 要比較「一天利息」和「companion option 一天 theta」。

exercise futures call → 以 strike 買進 futures，futures position 立刻產生等於 intrinsic value 的**變動保證金（variation margin）入帳**。

- **futures-type settlement 的 option**：option 消失時也被扣掉等於其價值的金額；若價格 = intrinsic value，一入一出抵銷，沒有現金流 → **early exercise 沒有好處**。
- **stock-type settlement 的 option**（美國 futures 交易所）：option 消失時沒有現金流，只有 futures 的入帳，可以生息 → 可能有好處。

條件：

$$\text{利息價值} > \text{波動率價值}$$

利息價值 = intrinsic value 的利息：call $(F - X) r t$，put $(X - F) r t$；volatility 價值 ≈ 伴隨 OTM option 價格。

**例題 16-8**　futures 500、3 個月、利率 6%、440P = 0.40。440C？

利息 = $60 \times 0.06 \times 0.25 = 0.90 > 0.40$ → 候選；現在 exercise 比持有到到期多 0.50。

**今天就 exercise 嗎？** 比較「多一天的利息」與「多一天的 volatility 價值」：

- 一天利息 = $60 \times 0.06/365 = 0.00986$。
- 一天 volatility 價值 ≈ 伴隨 put 的 theta。以 Black 模型，0.40 的 440P 隱含波動率（implied volatility）約 13.8%，theta ≈ −0.0125。

0.0125 > 0.00986 → 今天 exercise 會損失更多 → **還不是立即候選**。在 futures 與 volatility 不變下，約 15 天後 440P 的 theta 降到 0.0098 以下，那時才 exercise。（距離成為立即候選的天數，有時被稱為 *fugit*。）

**為什麼要為了 theta 而不 exercise？** 若 futures 不動，你確實白白損失利息加 theta；但若 futures 大動，正 gamma 對你有利——極端情況跌破 440，你會慶幸還握著 call 而不是 futures。伴隨 put 一天的 theta，就是市場對「明天出現足夠波動的機率」的定價。

**第三條路：賣掉 option、改持 underlying**。效果等同 exercise。若 option 成交價 > intrinsic value（且不計交易成本），賣掉比 exercise 好。但 deep ITM 的 option 通常流動性差、買賣價差（bid-ask spread）寬，實際能賣到的價格往往不高於 intrinsic value。

### 16.7 保護價值與提前履約

> 💡 **一句話**：exercise call 等於賣出伴隨 put；想保留保護就同時買回那張 put。

early exercise 就放棄了 strike 提供的保護。

**例題 16-9**　沿用例題 16-6，但 dividend**明天**發放：135C 是立即候選（1.20 > 0.40 + 0.5625）。

- exercise 135C 後你持有股票、沒有 option——等同「賣 call + 買股票」= **合成（synthetic）賣出 135P**。
- 你會後悔的情境：到期股價低於 135（與賣出 135P 一樣）。
- 你「以多少價格賣出」這張 put？exercise 多賺 0.2375，等於以 0.40 + 0.2375 ≈ **0.64** 賣出市價 0.40 的 put。

**保留保護的方法**：exercise call 的同時，**買進伴隨的 OTM put**（以 0.40 買 135P）。你得到與持有 135C 相同的保護，成本卻低了 0.24。是否真的買，取決於你對 implied volatility 的判斷：0.40 若偏便宜就買；偏貴則改用其他方式控制下檔。

### 16.8 美式選擇權的定價

> 💡 **一句話**：美式多出的價值 deep ITM 最大；美式 synthetic delta 可以超過 100。輸入對比模型更重要。（可先跳過細節）

除非利率為 0 且無 dividend，美式應比歐式值錢。差多少？

**歷史**：
- Black-Scholes 是歐式模型。早期交易員用調整法：**偽美式（pseudo-American）call** = max(「在除息前一天到期的 BS 值」, 「股價扣除 dividend 現值、正常到期的 BS 值」)；futures option 與股票 put 則把低於平價（parity）的 BS 值直接拉到平價。都不夠精確。
- 1979 年 Cox-Ross-Rubinstein 提出**二元樹（binomial tree）模型**：是一個迴圈演算法，步數越多越接近真值，直觀易懂（第 19 章詳述），但可能需要大量計算。
- 1987 年 Barone-Adesi 與 Whaley 提出**二次近似模型**：收斂快很多，但把所有現金流都視為連續累積的利息；dividend 是一次性支付，所以有離散 dividend 的股票較常用 binomial tree。

真正的美式模型會告訴你：**option 的理論值剛好等於平價、且 delta 剛好 100 時，就是最佳 early exercise 點。**

**例題 16-10**（自創；股票、100 strike、8 週到期、利率 5%、第 5 週配息 1.50、volatility 25%；binomial tree 800 步、託管 dividend 法）

| 股價 | 美式 call | 歐式 call | 差額 |
|---|---|---|---|
| 95 | 1.648 | 1.572 | 0.076 |
| 100 | 3.736 | 3.508 | 0.228 |
| 105 | 6.929 | 6.454 | 0.475 |
| 110 | 11.016 | 10.269 | 0.747 |
| 120 | 20.520 | 19.418 | 1.102 |
| 130 | 30.479 | 29.286 | 1.193 |

股價 110 時偽美式值 = max(10.82, 10.27) = 10.82，介於歐式 10.27 與 binomial tree 11.02 之間。

**差額隨 volatility**（股價 105 / 110 / 120 / 130 / 150）：

| volatility | 105 | 110 | 120 | 130 | 150 |
|---|---|---|---|---|---|
| 15% | 0.75 | 1.08 | 1.20 | 1.21 | 1.21 |
| 25% | 0.48 | 0.75 | 1.10 | 1.19 | 1.21 |
| 35% | 0.34 | 0.53 | 0.88 | 1.09 | 1.20 |

- 越 deep ITM，差額越大；volatility 越低，越早接近上限（越容易 early exercise）。
- 上限 ≈ **dividend − 除息前一天以 100 買股票並持有到到期的利息**：$1.50 - 100 \times 0.05 \times 22/365 \approx 1.20$（第 34 天 exercise，剩 22 天）。

同條件的 **100 put**，美式 − 歐式在 deep ITM 時趨近 **除息後到到期剩餘 21 天的 strike 利息**：$100 \times 0.05 \times 21/365 \approx 0.29$（樹狀結果在股價 70 時約 0.286）。

**美式的 synthetic delta 可以 > 100**：歐式股票 option $\Delta_C - \Delta_P = 100$；美式的價內（in-the-money, ITM）option 因可能 early exercise，delta 更快趨近 100，而 OTM companion option 仍保有一些 delta。同例條件下，100 合成部位（synthetic position）（美式 call delta − 美式 put delta）：

| 股價 | 85 | 90 | 95 | 100 | 105 | 110 | 115 |
|---|---|---|---|---|---|---|---|
| volatility 15% | 100.1 | 101.1 | 104.4 | 109.5 | 109.5 | 104.2 | 100.9 |
| volatility 25% | 101.0 | 101.9 | 103.3 | 105.0 | 106.0 | 105.4 | 103.6 |
| volatility 35% | 101.2 | 101.7 | 102.4 | 103.2 | 103.9 | 104.1 | 103.7 |

所以 American option 的 conversion、reversal、box、roll **未必 delta 中性**；規模大時這幾個 delta 不能忽略。

**不用模型估計美式盒式（box）**：

**例題 16-11**　30 天到期、利率 5%、第 12 天配息 0.80，100/110 box（買 100C、賣 100P、賣 110C、買 110P）。歐式值 $10/(1 + 0.05 \times 30/365) = 9.959$。各種 early exercise 情境：

| 情境 | 調整 | box 價值 |
|---|---|---|
| 1. 兩張 put 都 early exercise（ex-dividend date 當天，剩 18 天） | + 10 的 18 天利息 0.025 | 9.984 |
| 2. 兩張 call 都 early exercise（除息前一天，剩 19 天） | + 10 的 19 天利息 0.026 | 9.985 |
| 3. 只有 110P early exercise | + 110 的 18 天利息 0.271 | 10.230 |
| 4. 只有 100C early exercise | + dividend 0.80 − 100 的 19 天利息 0.260 | 10.499 |
| 5. 100C 與 110P 都 early exercise | + 0.80 + 0.271 − 0.260 | 10.770 |

股價極低（兩 put 都要 exercise）或極高（兩 call 都要 exercise）時，box 約 9.98–9.99；只有一張多頭 option 值得 exercise 時約 10.23–10.50；兩張多頭 option 都值得 exercise（兩者皆 ITM，股價約在 105 附近，且 volatility 要低）時最高約 10.77。

**futures option（stock-type settlement）也有 early exercise 價值**，但和股票不同，它**沒有上限**：deep ITM 時差額趨近 intrinsic value 的利息 $(F - X) r t$，越 ITM 越大。例：450 call、3 個月、利率 6%：futures 500 時上限約 0.75、550 時約 1.50（binomial tree 在 volatility 15% 時分別約 0.375、1.447，逐漸逼近）。

**模型不是最重要的**：輸入（volatility、利率、underlying 價格）錯了，美式模型一樣給錯的值。
- 股票 option：買股票的資金遠大於買 option，加上 dividend，early exercise 影響大，美式模型值得用。
- futures-type settlement 的 futures option：歐式模型就夠（美式 = 歐式）。
- stock-type settlement 的 futures option：option 價格相對 futures 很小，差異只在極 deep ITM 才重要；volatility 判斷、方向判斷與價差風險控管遠比模型選擇重要。
- 外匯 option：本國與外國利率差很大時，early exercise 也可能重要。

### 16.9 提前履約策略

> 💡 **一句話**：dividend arbitrage、利息 arbitrage 都在賭對手忘了 exercise；現在只有成本極低的專業交易員在做。（可先跳過）

**dividend arbitrage**

**例題 16-12**　股價 54.60、5 天到期、明天配息 0.70。美式 45C 應該今天被 exercise，所以約值平價 9.60。你賣 45C 收 9.60、同時買股票 54.60：

- **被 assign**（應該如此）：以 45 交出股票 → $9.60 - 54.60 + 45 = 0$，打平。
- **沒被 assign**：明天股票除息開在 53.90，45C 約 8.90：股票虧 0.70、call 賺 0.70，**另外領到 dividend 0.70** → 獲利約 0.70。

assign 是隨機的：未平倉量（open interest, OI）越大，你被 assign 的機率越低；市場越成熟，該 exercise 的人越不會忘記。早期市場這招很常見，如今只有交易成本極低的專業交易員才做，而且大部分仍會被 assign。

**利息 arbitrage**：放空股票 + 賣出應 early exercise 的 deep ITM 美式 put。若對手沒 exercise，你持續賺取 strike（放空收入 + premium）的利息；若 exercise，打平。futures option（stock-type settlement）也可以：買 futures + 賣 deep ITM call，或賣 futures + 賣 deep ITM put，但生息本金只有約 intrinsic value，獲利較小。

**用 deep ITM 價差執行**：若 40C 與 45C 都應在除息前 exercise，40/45 call 價差應恰好值 5.00。做市（market making）者可能報 **5.00 買 / 5.00 賣**：
- 有人賣給他價差（他買 40C、賣 45C）→ 他立刻 exercise 40C 取得股票，等於「空 45C + 多股票」的 dividend arbitrage；
- 有人跟他買價差（他賣 40C、買 45C）→ 他立刻 exercise 45C 取得股票，等於「空 40C + 多股票」的 dividend arbitrage。

他放棄 bid-ask spread 的優勢，換取對手忘記 exercise 時的 dividend。

### 16.10 提前履約風險

> 💡 **一句話**：自問「我若持有，現在會 exercise 嗎？」會的話就準備好被 assign。

被提前 assign 可能造成虧損，但它只是眾多風險之一，應該與價格、volatility 風險一樣事先準備。

- 清算機構的保證金（margin）規則通常要求保留足夠資金應付提前 assign，但不保證。
- 持有 deep ITM 空頭 option 時，突然被 assign 可能造成**資金排擠**；資金不足就可能被迫平倉——而被迫平倉幾乎總是虧錢的。

**自問一句就夠了**：「**如果我持有這張 option，我現在會 exercise 嗎？**」答案是「會」，就該準備好被 assign；答案是「不會」卻被 assign 了，通常是好事——對方白白放棄了利息或 volatility 價值，你收到了一份禮物。

## 交易員視角

- **Optibook 的 option 多半是歐式/現金式 settlement**，early exercise 問題可能不直接出現；但本章的 arbitrage 邊界是所有報價（quote）的健全性檢查：你的 bot 永遠不該以低於下限的價格賣出或高於上限的價格買進。在程式裡加入 `max(0, S - X/(1+rt) - D)` 這類檢查，可以擋掉模型或資料錯誤造成的離譜 quote。
- **價格跳動限制**：deep ITM option 接近下限時，quote 往往只能在幾個 tick 內移動；若你的理論值低於下限，代表模型或輸入有問題，而不是市場錯了。
- **American option market making**：dividend 前一天，大量 deep ITM call 的持有人會 exercise。若你持有空頭 deep ITM call，要預期被 assign、提前安排股票；反之，若你持有多頭，記得 exercise，否則就是把 dividend 送給別人。
- **delta 校正**：美式 synthetic position 的 delta 可以到 105 甚至 110；大規模 conversion/reversal 要用美式模型的 delta 避險（hedge）。

## 常見誤區

1. **誤解**：「OTM option 的下限一定是 0。」→ **正解**：歐式股票 call 下限是 $S - X/(1+rt) - D$，OTM 時也可能為正；美式下限至少等於這個值。
2. **誤解**：「美式 call 在 dividend 前任何一天 exercise 都一樣。」→ **正解**：只有除息前一天可能最佳；更早 exercise 只會損失利息與 volatility 價值。
3. **誤解**：「股票 put 也只在 dividend 前後才可能 early exercise。」→ **正解**：put 可能在任何一天最佳 exercise；只是在除息前的禁區內不該 exercise。
4. **誤解**：「futures option 都沒有 early exercise 價值。」→ **正解**：futures-type settlement 時沒有；stock-type settlement 時有，且 deep ITM 時差額隨 intrinsic value 增加而無上限。
5. **誤解**：「符合 early exercise 條件就該今天 exercise。」→ **正解**：還要比較一天的利息與一天的 volatility 價值（companion option 的 theta）。
6. **誤解**：「exercise 和賣出 option 改持 underlying 一樣，所以隨便選。」→ **正解**：若 option 能以高於 intrinsic value 的價格賣出，賣掉更好；只是 deep ITM 通常賣不到。

## 重點摘要

| 主題 | 公式 / 規則 |
|---|---|
| 美式 = 歐式 | 無 dividend、無利息現金流（futures-type settlement） |
| 美式下限 | 至少 intrinsic value，且至少歐式下限 |
| 歐式股票 call 下限 | $S - X/(1+rt) - D$ |
| 歐式股票 put 下限 | $X/(1+rt) - S + D$ |
| 上限 | 美式 put $X$；歐式 put $X/(1+rt)$；歐式股票 call $S - D$；美式股票 call $S$ |
| call 分解 | 內含 + volatility + 利息 − dividend |
| put 分解 | 內含 + volatility − 利息 + dividend |
| 股票 call exercise 條件 | $D > P_{\text{伴隨}} + Xrt$；只在除息前一天 |
| 股票 put exercise 條件 | $Xrt > C_{\text{伴隨}} + D$；可在任何一天，ex-dividend date 最常見 |
| 禁區天數 | $D / (X r / 365)$ |
| futures option（stock-type settlement） | $(F-X)rt > $ companion option 價格；今天 exercise 需 一天利息 > 伴隨 theta |
| early exercise call ≡ | 賣出伴隨 put（以「市價 + exercise 利得」的價格） |
| 美式最佳 exercise 點 | 理論值 = 平價、delta = 100 |
| 美式 synthetic delta | 可 > 100 |
| 被 assign 自問 | 「我若持有，現在會 exercise 嗎？」 |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A2、B4、B5、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 為什麼 futures-type settlement 的美式 futures option，價值等於歐式？

<details><summary>解答</summary>

early exercise 的好處只來自 dividend 或正現金流的利息。futures 不配息；futures-type settlement 下，exercise 時 futures 入帳的 intrinsic value 與 option 消失時被扣的價值抵銷，沒有淨現金流可生息。沒有任何好處，就沒有 early exercise 價值。

</details>

**A2.** ⭐ 為什麼美式股票 call 只可能在除息前一天 early exercise？

<details><summary>提示</summary>

early exercise 唯一的好處是什麼？要付出的代價（利息、volatility 價值）是不是每多早一天就多付一天？那什麼時候 exercise 最划算？

</details>

<details><summary>解答</summary>

early exercise 唯一的好處是拿到 dividend，而代價是失去 volatility 價值與 strike 的利息。在除息前一天之前 exercise，代價照付（多損失幾天的利息與 volatility 價值），好處卻不會因此增加；所以若要 exercise，越晚越好，最晚是除息前一天（之後就拿不到 dividend 了）。

</details>

**A3.** 為什麼伴隨 put 價格可以當作 call「volatility 價值」的估計？

<details><summary>解答</summary>

同 strike、同到期的 call 與 put vega 相同（synthetic 關係），所以對 volatility 的敏感度相同。OTM 的伴隨 put 幾乎全部是時間價值（time value），利息與 dividend 成分也很小，因此它的價格近似於 call 的 volatility 價值。

</details>

**A4.** early exercise 一張 deep ITM call，為什麼等於「賣出伴隨 put」？要如何保留保護？

<details><summary>解答</summary>

exercise 後你從「持有 call」變成「持有股票」。持有股票 = 持有 call + 賣出 put + ...（synthetic：S = C − P + 常數），所以把 C 換成 S 等於多賣了一張同 strike 的 put。保留保護的方法是同時買進那張伴隨 put，成本比持有 call 低（低的部分就是 early exercise 的利得）。

</details>

**A5.** 已經放空股票的交易員，相較於沒有股票 position 的交易員，更傾向還是更不傾向 early exercise call？為什麼？

<details><summary>解答</summary>

更傾向。exercise call 會買進股票，抵銷他的 short position；空頭股票的有效利率較低（扣除借券成本），exercise 損失的利息較少，所以 early exercise call 更划算。

</details>

**A6.** 為什麼 stock-type settlement 的 futures option，美式與歐式的差額在 deep ITM 時沒有上限，而股票 call 有上限？

<details><summary>解答</summary>

futures option 的 early exercise 價值是「intrinsic value 的利息」，intrinsic value 越大，利息越多，差額無上限。股票 call 的 early exercise 價值來自「dividend 減掉提早支付 strike 的利息」，dividend 是固定金額，所以差額有上限（約 dividend − 除息後剩餘期間的 strike 利息）。

</details>

### B. 計算題

**B1.** futures 1,180、6 個月、利率 4%、stock-type settlement。1,120 歐式 call 的下限？美式下限？

<details><summary>解答</summary>

歐式 = (1,180 − 1,120)/(1 + 0.04 × 0.5) = 60/1.02 = **58.82**；美式 = max(60, 58.82) = **60**。

</details>

**B2.** 股價 48.60、3 個月、利率 6%、無 dividend。50 歐式 call 的下限？若成交 0.50，是否存在 arbitrage？

<details><summary>解答</summary>

下限 = 48.60 − 50/1.015 = 48.60 − 49.261 = **−0.66** → 0。下限為 0，0.50 沒有違反，無 arbitrage。（注意：利率不夠高時，OTM call 下限仍為 0。）

</details>

**B3.** 股價 101、2 個月、利率 6%、無 dividend。95 歐式 call 的下限？若市價 6.80，到期 arbitrage 利潤約多少？

<details><summary>解答</summary>

下限 = 101 − 95/1.01 = 101 − 94.059 = **6.94**。以 6.80 買進、放空股票：到期利潤 ≈ (6.94 − 6.80) × 1.01 = **0.14**（買 −6.80，利息 −0.068；放空 +101，利息 +1.01；exercise −95 → +0.142）。

</details>

**B4.** ⭐ 股價 88、1 個月、利率 4.8%、8 天後配息 0.90。80P 市價 0.25。80C 是否為 early exercise 候選？若是，何時 exercise、多賺多少？

<details><summary>提示</summary>

先算利息價值 = strike × r × t（t 用 1/12），再比較：dividend vs 伴隨 put 價格 + 利息價值。是候選的話，想想 call 只在哪一天 exercise。

</details>

<details><summary>解答</summary>

利息價值 = 80 × 0.048 × 1/12 = 0.32。0.90 > 0.25 + 0.32 = 0.57 → 是候選。應在除息前一天（第 7 天）exercise；相較持有到到期多約 0.90 − 0.57 = **0.33**。

</details>

**B5.** ⭐ 股價 40、3 個月、利率 5%、dividend 0.25、55C 市價 0.05。55P 是否為 early exercise 候選？禁區天數？

<details><summary>提示</summary>

先算利息 = 55 × 5% × 0.25，和「伴隨 call + dividend」比。禁區天數 = dividend ÷ 每天的利息（55 × 5% ÷ 365）。

</details>

<details><summary>解答</summary>

利息 = 55 × 0.05 × 0.25 = 0.6875；0.6875 > 0.05 + 0.25 = 0.30 → 候選。每日利息 = 55 × 0.05/365 = 0.007534；禁區 = 0.25/0.007534 ≈ **33.2 天**：ex-dividend date 在 33 天內就等到除息後再 exercise。

</details>

**B6.** futures 820、4 個月、利率 6%、stock-type settlement，700P 市價 0.80。700C 是否為 early exercise 候選？今天 exercise 相對持有到到期的利得？若伴隨 put 每日 theta 為 −0.018，今天該 exercise 嗎？

<details><summary>解答</summary>

利息 = 120 × 0.06 × 4/12 = 2.40 > 0.80 → 候選，利得約 1.60。每日利息 = 120 × 0.06/365 = 0.0197 > 0.018 → 一天利息大於一天 volatility 價值，**今天 exercise**合理。

</details>

**B7.** 例題 16-11 的條件改為：25 天到期、利率 6%、第 10 天配息 0.50，90/100 美式 box（買 90C、賣 90P、賣 100C、買 100P）。計算歐式值，以及「你持有的 90C 與 100P 都 early exercise」情境的 box 價值（call 在除息前一天 exercise、put 在 ex-dividend date exercise）。

<details><summary>解答</summary>

歐式 = 10/(1 + 0.06 × 25/365) = 10/1.00411 = **9.959**。
90C 在第 9 天 exercise（剩 16 天）：+0.50 − 90 × 0.06 × 16/365 = 0.50 − 0.2367 = +0.2633。
100P 在第 10 天 exercise（剩 15 天）：+100 × 0.06 × 15/365 = +0.2466。
box ≈ 9.959 + 0.2633 + 0.2466 = **10.469**。

</details>

### C. 交易情境題

**C1.** ⭐ 你持有 50 張美式 deep ITM 60C（股價 72），明天除息 0.55，10 天後到期，利率 5%，60P 市價 0.02。你預期股價波動很小。該怎麼做？若你擔心股價暴跌呢？

<details><summary>提示</summary>

利息價值用剩下的 10 天算：60 × 5% × 10/365。和「dividend vs 伴隨 put + 利息」比；明天除息，今天就是除息前一天。擔心暴跌時，想想 exercise 等於賣出了哪一張 option。

</details>

<details><summary>解答</summary>

利息價值 = 60 × 0.05 × 10/365 = 0.082；0.55 > 0.02 + 0.082 = 0.10 → 今天（除息前一天）就是最佳 exercise 日，exercise 全部 50 張以拿到 dividend，多約 0.45/股。若擔心暴跌，exercise 同時買 50 張 60P（0.02），保留與持有 call 相同的保護，總成本仍比不 exercise 低約 0.43。若能以高於 intrinsic value 12.00 的價格賣出 60C 並買股票，更好，但 deep ITM 通常賣不到。

</details>

**C2.** 你是 market making 者，賣出了 200 張 deep ITM 美式 45C，股價 54.60，明天除息 0.70，到期還有 5 天。你該擔心什麼、怎麼準備？

<details><summary>解答</summary>

自問：「若我持有這張 45C，今天會 exercise 嗎？」dividend 0.70 遠大於幾天的利息與（幾乎為 0 的）volatility 價值，答案是會。所以應預期今晚被大量 assign：要嘛已持有 200 口對應股票（delta 本來就該接近 100 而持有股票 hedge），被 assign 時直接交出股票；要嘛確保有資金/借券安排，避免隔天出現大額空頭股票或資金排擠。若沒被 assign，你持有股票會領到 dividend（dividend arbitrage 的另一面）。

</details>

### D. 挑戰題

**D1.** 用 binomial tree（或任何美式模型）的觀點說明：為什麼「理論值等於平價且 delta = 100」就是最佳 exercise 點？再說明為什麼美式股票 call 在無 dividend 時永遠不該 early exercise（用下限 $S - X/(1+rt)$ 論證）。

<details><summary>解答</summary>

(1) 美式價值 = max(繼續持有的價值, 立即 exercise 的價值)。在最佳 exercise 區域內，繼續持有的價值 ≤ strike 值，所以 option 價值 = intrinsic value（平價），而 intrinsic value $S - X$ 對 S 的導數為 1，即 delta = 100。邊界處兩者相等（平滑接觸），理論值剛好等於平價、delta 剛好 100。
(2) 無 dividend 時，歐式 call 下限 $S - X/(1+rt) > S - X$（只要 $r > 0$、$t > 0$），美式至少值歐式，所以美式 call 價值嚴格大於 intrinsic value。early exercise 只拿到 $S - X$，等於放棄了大於 0 的 time value；不如賣掉（或乾脆持有）。所以無 dividend 的美式股票 call 永不 early exercise，美式 = 歐式。

</details>

## 自我檢核清單

- [ ] 能寫出邊界總表的 16 個格子。
- [ ] 能在價格違反下限時寫出 arbitrage 的每一筆現金流。
- [ ] 能分解 call、put 價值並判斷 early exercise 條件。
- [ ] 能說出股票 call 只在除息前一天 exercise 的理由。
- [ ] 能計算 put 的禁區天數。
- [ ] 能用 companion option theta 判斷 futures option 今天是否該 exercise。
- [ ] 能說明 early exercise = 賣出 companion option，並知道如何保留保護。
- [ ] 能解釋美式 synthetic delta 為何 > 100、美式 box 為何可能 > strike 差。
- [ ] 能說明 dividend arbitrage 與利息 arbitrage 的運作與限制。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab09_binomial_american.py`](../labs/exercises/lab09_binomial_american.py)：實作 `crr_parameters`、`stock_tree`、`binomial_price`、`early_exercise_premium`、`binomial_convergence`、`binomial_greeks`、`early_exercise_boundary`、`american_call_with_dividends`、`call_early_exercise_check`、`put_early_exercise_check`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab09_binomial_american.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab09_binomial_american**（[../labs/](../labs/)）：實作 CRR binomial tree（含離散 dividend 的託管 dividend 法），重現例題 16-10 的美式/歐式差額表與 synthetic delta 表；寫一個函式 `early_exercise_check(S, X, r, t, D, companion_price)` 回傳是否為候選與利得；並對 stock-type settlement futures option 找出「伴隨 theta < 一天利息」的第一天（重現例題 16-8 的約 15 天）。
