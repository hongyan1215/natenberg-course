# 第 14 章　合成部位（Synthetics）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：選擇權（option）像樂高——買權（call）、賣權（put）、標的（underlying）三塊積木，任兩塊拼起來就能「變出」第三塊。看懂這個，很多看起來陌生的部位（position）一拆就認得。

**你只需要先記住這 5 件事**

1. **買 call + 賣 put（同履約價（strike price）、同到期）= 合成多頭標的（synthetic long underlying）。** 到期時不管 underlying 在哪，你都會用 strike 買進 underlying。反過來就是合成空頭（synthetic short）。
2. **口訣：一張 option + 用 underlying 避險（hedge） = 它的伴隨選擇權（companion option）。** 例：買 call 再賣 underlying hedge，等於持有同 strike 的 put。
3. **call delta − put delta ≈ 100。** 例：50 call delta 63 → 50 put delta 約 −37。
4. **同 strike、同到期的 call 和 put，gamma、vega 完全一樣。** 波動率（volatility）風險只看 strike 和到期日（expiration date），不看是 call 還是 put。theta 可能不同（股票要算利息成本）。
5. **換個寫法，策略就現形。** call 價差 + put 價差 = strike 間距；買傳統蝶式（butterfly） = 賣鐵蝶式（iron butterfly）；2 張 call − 1 underlying = 買跨式（straddle）。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| synthetic long underlying | 買 call + 賣 put |
| 合成多頭（synthetic long）call | 買 underlying + 買賣權 |
| synthetic long put | 賣 underlying + 買 call |
| 伴隨 put delta | call delta − 100 |
| call 價差 + put 價差（同 strike 對） | 無利息時 = strike 間距 |
| butterfly + iron butterfly | 無利息時 = strike 間距 |

**必做練習（約 20 分鐘）**：A2、B1、B4、C2（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[策略損益建構器](https://hongyan1215.github.io/natenberg-course/tools/strategy-builder/)，組「買 50 call + 賣 50 put」，對照直接買 underlying，看兩條損益線是不是一樣。

---

## 本章定位

option 可以彼此組合、或與 underlying 組合，複製出另一個合約的特性。這種「合成（synthetic）」關係是後面所有套利（arbitrage）定價（[ch15](ch15_option_arbitrage.md)）、提前履約（early exercise）分析（[ch16](ch16_early_exercise.md)）與 hedge（[ch17](ch17_hedging_with_options.md)）的基礎。前置：到期損益與 parity graph（[ch04](ch04_expiration_pnl.md)）、Greeks（[ch07](ch07_risk_measurement_1.md)）、價差分類（[ch10](ch10_intro_spreading.md)–[ch12](ch12_bull_bear_spreads.md)）。

## 學習目標

1. 能寫出六種基本合成部位（synthetic position）（underlying 多/空、call 多/空、put 多/空）的組成。
2. 能用「單一 option + underlying hedge = companion option」口訣快速判斷 synthetic 結果。
3. 能說明伴隨 call 與 put 的 delta、gamma、vega、theta 關係，以及 theta 何時不相等。
4. 能用 synthetic 關係證明 call 價差與 put 價差的價值和等於 strike 間距（的現值）。
5. 能把看似陌生的 position（如 2 call − 1 underlying、聖誕樹價差）改寫成熟悉的策略。
6. 能計算 butterfly 與 iron butterfly、禿鷹（condor）與鐵禿鷹（iron condor）之間的價格關係。

## 核心概念

### 14.1 合成標的（Synthetic Underlying）

> 💡 **一句話**：買 call + 賣 put（同 strike、同到期）到期一定以 strike 買進 underlying；delta 合計約 100。

**直覺**：考慮歐式選擇權（European option）（不能 early exercise）：

- 買 1 張 6 月 50 call、賣 1 張 6 月 50 put。

到期時：

- underlying > 50：put 作廢，你履約（exercise）call → **以 50 買進 underlying**（自願）。
- underlying < 50：call 作廢，你被指派（assign / assignment）put → **以 50 買進 underlying**（被迫）。

除了剛好等於 50 的特殊情況，**不論 underlying 在哪裡，你都會以 50 買進 underlying**。這就是**synthetic long underlying**。反過來，賣 call、買賣權就是**合成空頭標的（synthetic short underlying）**。

$$\text{合成多頭標的} \approx \text{買買權} + \text{賣賣權}$$
$$\text{合成空頭標的} \approx \text{賣買權} + \text{買賣權}$$

條件：**同 strike、同到期**。任何 strike 都可以：買 55C + 賣 55P 一樣是 synthetic long，只是到期時以 55 買進。用「≈」而非「=」，因為它到期才真正變成 underlying；更精確的名稱是**合成遠期**（synthetic forward），其定價取決於遠期價值（forward value）（下一章）。

**Parity graph**：

```
買 50C            賣 50P            合成多頭標的
     /                 ____               /
    /             ... /                  /
___/              /                     /
   50            50                   50
（斜率 0→+1）    （斜率 +1→0）     （斜率處處 +1）
```

**delta 推論**：underlying 漲 1 點，synthetic long 約漲 1 點 → synthetic position delta ≈ 100：

$$\Delta_{\text{call}} - \Delta_{\text{put}} \approx 100 \quad\text{（即 } |\Delta_{\text{call}}| + |\Delta_{\text{put}}| \approx 100\text{）}$$

**例題 14-1**　6 月 50 call delta 63 → 6 月 50 put delta ≈ −37。若 6 月 50 put delta −71 → 6 月 50 call delta ≈ 29。

結算（settlement）方式、利率、early exercise 會讓總和略偏離 100（第 15、16 章），例如股票型結算（stock-type settlement）的期貨選擇權（futures option）：$\Delta_c - \Delta_p = e^{-rt}$，3 個月、利率 5% 時約 98.8。

### 14.2 合成選擇權（Synthetic Options）

> 💡 **一句話**：一張 option 用 underlying hedge，就變成它的 companion option；特性看斜率，不看成交價。

把 synthetic underlying 的組成移項，得到四個合成選擇權（synthetic option）：

| synthetic position | ≈ 組成 |
|---|---|
| synthetic long call | 買 underlying + 買賣權 |
| synthetic short call | 賣 underlying + 賣 put |
| synthetic long put | 賣 underlying + 買 call |
| synthetic short put | 買 underlying + 賣 call |

（皆需同 strike、同到期。）

**口訣**：**交易一張 option 並用 underlying hedge，等於 synthetic 地持有它的 companion option**（companion option：同 strike、同到期、相反類型）。

- 買 call + 賣 underlying hedge → synthetic**買賣權**
- 賣 call + 買 underlying hedge → synthetic**賣 put**
- 買賣權 + 買 underlying hedge → synthetic**買 call**
- 賣 put + 賣 underlying hedge → synthetic**賣 call**

**為什麼 underlying 成交價不重要？** synthetic position 的「特性」來自各合約的**斜率**，不是價格。例如以 52 買進 underlying、同時買 50 put：parity graph 是一條在 50 以下水平、50 以上斜率 +1 的折線——就是 50 call 的形狀（只是上下平移）。價格只影響「這樣做划不划算」，那是下一章的主題。

### 14.3 六種合成關係與風險特性

> 💡 **一句話**：伴隨 call 和 put gamma、vega 一樣；theta 只在沒有持有成本（cost of carry）時才一樣。

以 6 月 50 為例：

| 合約 | synthetic 等價 |
|---|---|
| 多頭 underlying | +1 6 月 50C、−1 6 月 50P |
| 空頭 underlying | −1 6 月 50C、+1 6 月 50P |
| 多頭 6 月 50C | +1 underlying、+1 6 月 50P |
| 空頭 6 月 50C | −1 underlying、−1 6 月 50P |
| 多頭 6 月 50P | −1 underlying、+1 6 月 50C |
| 空頭 6 月 50P | +1 underlying、−1 6 月 50C |

**gamma 與 vega**：underlying 的 gamma、vega 都是 0。既然「call − put = underlying」，

$$\Gamma_{\text{call}} - \Gamma_{\text{put}} = 0,\quad \text{vega}_{\text{call}} - \text{vega}_{\text{put}} = 0$$

**伴隨 call、put 的 gamma、vega 完全相同。**

**例題 14-2**（股票 50、strike 50、3 個月、利率 5%、volatility 30%、無股利（dividend），Black-Scholes）

| | 50C | 50P |
|---|---|---|
| 價格 | 3.29 | 2.67 |
| delta | +0.563 | −0.437 |
| gamma | 0.0525 | 0.0525 |
| vega | 0.0985 | 0.0985 |
| theta（每日） | −0.0196 | −0.0128 |

- delta 差 = 0.563 − (−0.437) = 1.000 ✔
- gamma、vega 相同 ✔
- theta 不同：差額 −0.0068 = $-rKe^{-rt}/365$，正是「借錢持有股票的利息成本」。

**意涵**：專注 volatility 的交易員不區分同 strike、同到期的 call 與 put——它們的 volatility 特性完全一樣。持有 call 卻想要 put？賣出 underlying 即可；持有 put 想要 call？買進 underlying 即可。**position 的 volatility 風險取決於 strike 與 expiration date 的組合，而不是 call 或 put。**

**為什麼 theta 不一定相同？** 來自 cost of carry：

| 情況 | 伴隨買賣權 theta 是否相同 | 原因 |
|---|---|---|
| 股票 option | 否 | 持有股票要付利息；synthetic underlying 的 theta 反映這個成本 |
| futures option、stock-type settlement（買 option 要付現） | 價平（at-the-money, ATM）時相同；兩者價格不同時不同 | option 本身有資金成本，價格不同 → cost of carry 不同 |
| futures option、期貨型結算（futures-type settlement） | 相同 | underlying 與 option 都沒有 cost of carry |

（futures-type settlement 驗證：期貨（futures） 50、strike 45、3 個月、利率 5%、volatility 30%、stock-type settlement 時，45C theta −0.0112、45P theta −0.0118，差額 = $r(C-P)/365$ = 0.00068；若改成 futures-type settlement（等同利率 0），兩者 theta 相同。）

### 14.4 用合成解釋垂直價差

> 💡 **一句話**：多頭買權價差（bull call spread） = 多頭賣權價差（bull put spread）換個寫法；兩者價值相加 = strike 間距（或現值）。

第 12 章說「不論 call 或 put，買低賣高就是多頭」。用 synthetic 改寫：

| bull call spread | synthetic 等價 |
|---|---|
| +1 6 月 60C | +1 6 月 60P、+1 underlying |
| −1 6 月 65C | −1 6 月 65P、−1 underlying |

underlying 一多一空抵銷，剩下 +1 60P、−1 65P——**正是 bull put spread**。

兩者特性相同，差別在現金流：call 價差是付出（debit），put 價差是收入（credit）。到期時：

$$\text{買權價差價值} + \text{賣權價差價值（以收入額計）} = K_H - K_L$$

**例題 14-3**　60/65 call 價差 3.10。
- 無利息：60/65 put 價差應為 5 − 3.10 = **1.90**。
- stock-type settlement、利率 4%、6 個月：兩者今日價值和 = $5/(1+0.04\times0.5) = 4.902$ → put 價差 = 4.902 − 3.10 = **1.80**。

### 14.5 在價差策略中使用合成

> 💡 **一句話**：2 張 call − 1 underlying 就是買 straddle；同一個策略有好幾種做法，挑最便宜的。

任何策略都能用 synthetic position 改寫，所以同一個策略常有多種做法。

**例題 14-4**　position：+2 張 6 月 50C、−1 underlying。

拆成 +1 50C 與（+1 50C、−1 underlying）。後者 = synthetic long 50P。所以整體 = +1 50C、+1 50P = **買 straddle**。

同理，+2 張 50P、+1 underlying = +1 50P +（+1 50P、+1 underlying）= +1 50P、+1 synthetic 50C = **買 straddle**。

**買 straddle 的三種方法**：

1. 買 call、買賣權；
2. 買 call、synthetic 買賣權（再買 1 張 call + 賣 underlying）；
3. 買賣權、synthetic 買 call（再買 1 張 put + 買 underlying）。

哪個最好取決於 synthetic position 與真實合約的相對價格（第 15 章例題）。

### 14.6 鐵蝶式與鐵禿鷹（Iron Butterflies and Iron Condors）

> 💡 **一句話**：買 butterfly = 賣 iron butterfly、買 condor = 賣 iron condor；兩者價值相加 = strike 間距。

**組合一個買勒式（strangle）與一個賣 straddle**：

- 買 6 月 45P、買 6 月 55C（strangle）
- 賣 6 月 50C、賣 6 月 50P（straddle）

把 put 都改寫成 synthetic call（P = C − underlying）：

| 原 position | synthetic 等價 |
|---|---|
| +1 45P | +1 45C、−1 underlying |
| −1 50C | −1 50C |
| −1 50P | −1 50C、+1 underlying |
| +1 55C | +1 55C |

underlying 抵銷 → +1 45C、−2 50C、+1 55C = **多頭 butterfly**。若全部改寫成 put，也會得到多頭 put butterfly——call butterfly 與 put butterfly 本質相同，一個是另一個的 synthetic 版本。

**iron butterfly**= straddle + strangle，straddle 位於 strangle 正中間。

- 傳統多頭 butterfly（買外側、賣中間）是付出 → 「long」。
- 等價的「買 strangle、賣 straddle」是**收入**（straddle 一定比 strangle 貴）→ 收錢就叫做**賣出 iron butterfly**。
- **買傳統 butterfly ≡ 賣 iron butterfly**：兩者都希望 underlying 停在中間 strike。

**價值關係**：到期時 butterfly + iron butterfly = strike 間距（今天則為其現值）。

**例題 14-5**　利率 0，45/50/55 butterfly 1.60 → 45/50/55 iron butterfly 應為 5 − 1.60 = **3.40**。不論以 1.60 買 butterfly 或以 3.40 賣 iron butterfly，損益輪廓相同：underlying 停在 50 時最大獲利 3.40。

**condor 也能這樣 synthetic**：買 6 月 40/60 strangle（+40P、+60C）+ 賣 6 月 45/55 strangle（−45P、−55C）：

| 原 position | synthetic 等價 |
|---|---|
| +1 40P | +1 40C、−1 underlying |
| −1 45P | −1 45C、+1 underlying |
| −1 55C | −1 55C |
| +1 60C | +1 60C |

→ +40C、−45C、−55C、+60C = **多頭 condor**。

**iron condor**= 一個 strangle 套在另一個 strangle 外面。傳統多頭 condor 付出；等價的「賣內側 strangle、買外側 strangle」收入 → 稱為**賣出 iron condor**。**買傳統 condor ≡ 賣 iron condor**。

**例題 14-6**　利率 0，40/45/55/60 condor 3.20 → iron condor 應為 5 − 3.20 = **1.80**（這裡 5 是內外 strike 間距 45−40）。兩者都希望 underlying 留在 45–55 之間。

**用 synthetic 看穿聖誕樹價差**（第 11 章）：多頭 call 聖誕樹 +1 45C、−1 50C、−1 55C。把 45C、50C 改寫成 put：

| 原 position | synthetic 等價 |
|---|---|
| +1 45C | +1 45P、+1 underlying |
| −1 50C | −1 50P、−1 underlying |
| −1 55C | −1 55C |

→ +1 45P、−1 50P、−1 55C。

- 看 50P 與 55C：一個賣出的 50/55 strangle，再加買一張更低的 45P 保護。
- 看 45P 與 50P：一個 bull put spread，再加賣一張更高的 55C。

兩種角度都說明：**下檔風險有限、上檔風險無限**。

## 交易員視角

- **報價（quote）一致性**：做市（market making）時，同 strike 的 call 與 put 必須透過 synthetic 關係一起 quote。若你把 50C 報低、50P 報高，對手可以組出便宜的 synthetic underlying，與實際 underlying 對做（下一章的 conversion/reversal）。
- **Optibook 的 delta hedge**：如果你手上是 call position 卻希望持有 put 的特性，不必在冷門的 put 委託簿上找流動性——直接賣出對應數量的 underlying 就完成了。反之亦然。
- **volatility position 看 strike，不看類型**：風險報表可以把同 strike、同到期的 call 與 put 合併成「該 strike 的總 gamma/vega」，再另外記錄 synthetic underlying 造成的 delta。
- **部位上限（position limit）**：synthetic underlying 會吃掉 option 的 position 額度。若 underlying position 已到上限，可以用 synthetic 方式取得 delta，但要注意兩邊的限制是否分開計算。

## 常見誤區

1. **誤解**：「call 和 put 的 volatility 風險相反。」→ **正解**：同 strike、同到期的伴隨 call 與 put gamma、vega 完全相同。
2. **誤解**：「synthetic underlying 就是 underlying，完全沒差。」→ **正解**：它到期才變成 underlying；settlement 方式、利率、dividend、early exercise 與 pin risk 都可能讓兩者不同（第 15、16 章）。
3. **誤解**：「伴隨 call 與 put theta 也一定相同。」→ **正解**：只有在無 cost of carry（例如 futures-type settlement）時才相同；股票 option 的 theta 差額等於 strike 的利息成本。
4. **誤解**：「iron butterfly 收錢，所以是『買進』。」→ **正解**：收入的 position 是賣出 iron butterfly；它等價於買進傳統 butterfly。
5. **誤解**：「synthetic position 的特性取決於 underlying 成交價。」→ **正解**：特性取決於斜率；價格只決定 synthetic 是否划算。

## 重點摘要

| 關係 | 公式 / 規則 |
|---|---|
| synthetic long underlying | $+C - P$（同 K、同到期） |
| synthetic long call | $+S + P$ |
| synthetic long put | $-S + C$ |
| 口訣 | 一張 option + underlying hedge = companion option |
| delta | $\Delta_C - \Delta_P \approx 1$（stock-type settlement futures option 為 $e^{-rt}$） |
| gamma、vega | 伴隨 call = 伴隨 put |
| theta | 股票：$\Theta_C - \Theta_P = -rKe^{-rt}/365$；futures-type settlement：相等 |
| 垂直價差（vertical spread） | call 價差 + put 價差 = $K_H - K_L$（或其現值） |
| butterfly vs iron butterfly | butterfly + iron butterfly = strike 間距（或現值）；買蝶 ≡ 賣鐵蝶 |
| condor vs iron condor | condor + iron condor = 內外 strike 間距（或現值）；買 condor ≡ 賣 iron condor |
| straddle 的三種買法 | C+P；C + synthetic P（2C − S）；P + synthetic C（2P + S） |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A2、B1、B4、C2）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 為什麼「買 50C、賣 50P」到期時一定會以 50 買進 underlying？

<details><summary>解答</summary>

underlying > 50 時 call 有價值，你主動 exercise 以 50 買進；underlying < 50 時 put 有價值，對手 exercise，你被 assign 以 50 買進。兩種情況都以 50 買進（只有剛好 50 時不確定）。

</details>

**A2.** ⭐ 用口訣判斷：賣出 1 張 70 put，並賣出 underlying hedge，synthetic 出什麼 position？

<details><summary>提示</summary>

套口訣：一張 option + underlying hedge = 同 strike、相反類型的 option。買或賣的方向和原來那張一樣。

</details>

<details><summary>解答</summary>

一張 option + underlying hedge = companion option。賣 put + 賣 underlying = synthetic**賣出 70 call**（−P − S = −C）。

</details>

**A3.** 為什麼專注 volatility 的交易員認為「同 strike 的 call 與 put 沒有差別」？

<details><summary>解答</summary>

call − put = synthetic underlying，而 underlying gamma、vega 為 0，所以伴隨買賣權的 gamma、vega 相同。要把一張換成另一張，只需買賣 underlying，不改變 volatility 特性。

</details>

**A4.** 股票 option 的伴隨 call 與 put theta 為什麼不同？futures-type settlement 的 futures option 為什麼相同？

<details><summary>解答</summary>

synthetic underlying（call − put）的 theta 必須反映持有 underlying 的成本。股票要用資金購買，有利息成本，所以 $\Theta_C - \Theta_P = -rKe^{-rt}$（每年）。futures-type settlement 下，futures 與 option 都不需付現，沒有 cost of carry，synthetic underlying theta 為 0，伴隨買賣權 theta 相同。

</details>

**A5.** 為什麼買傳統 butterfly 等價於賣 iron butterfly？

<details><summary>解答</summary>

把 iron butterfly（買 strangle、賣 straddle）的 put 用 synthetic call 改寫，underlying 抵銷後就是多頭 call butterfly。iron butterfly 是收入，所以「買 strangle、賣 straddle」被稱為賣出 iron butterfly；它與買進傳統 butterfly 有相同損益輪廓，都希望 underlying 停在中間 strike。

</details>

### B. 計算題

**B1.** ⭐ 某 55 call delta 0.42。依 synthetic 關係，55 put delta 約多少？若 position 是 +30 張 55C、−30 張 55P，總 delta 約多少口 underlying？

<details><summary>提示</summary>

用「call delta − put delta ≈ 1」先求 put delta。再算每組（+1 call、−1 put）的 delta，乘上 30。

</details>

<details><summary>解答</summary>

55P delta ≈ 0.42 − 1 = −0.58。position delta = 30 × (0.42 − (−0.58)) = 30 × 1.00 = 30 口 underlying（synthetic long 30 口）。

</details>

**B2.** 無利息時 80/90 put 價差（買 90P、賣 80P）值 6.35，80/90 call 價差應值多少？

<details><summary>解答</summary>

call 價差 + put 價差 = 10 → call 價差 = 10 − 6.35 = **3.65**。

</details>

**B3.** stock-type settlement、利率 6%、4 個月。100/110 call 價差 5.20，100/110 put 價差（以付出計，買 110P 賣 100P）應值多少？（單利）

<details><summary>解答</summary>

兩者和 = 10/(1 + 0.06 × 4/12) = 10/1.02 = 9.804。put 價差 = 9.804 − 5.20 = **4.60**。

</details>

**B4.** ⭐ 無利息時 95/100/105 iron butterfly quote 3.65，對應的傳統 butterfly 應值多少？若以 3.65 賣出 iron butterfly，underlying 到期在 100 時獲利多少？在 92 時呢？

<details><summary>提示</summary>

先用「butterfly + iron butterfly = strike 間距」求 butterfly。賣 iron butterfly = 買 95P、賣 100P、賣 100C、買 105C；到期在 100 和 92 時，逐張算每張值多少，再跟收到的 3.65 比。

</details>

<details><summary>解答</summary>

butterfly = 5 − 3.65 = **1.35**。賣 iron butterfly 收 3.65：到期 100 時所有 option 歸零，獲利 **+3.65**；到期 92 時，95P 值 3、100P 值 8（被 assign）、其餘 0 → position 價值 = +3 − 8 = −5，損益 = 3.65 − 5 = **−1.35**（等於買 butterfly 的最大損失）。

</details>

**B5.** 無利息時 30/35/45/50 iron condor 值 1.45，傳統 condor 應值多少？最大獲利與最大損失分別為何（以買傳統 condor 計）？

<details><summary>解答</summary>

condor = 5 − 1.45 = **3.55**。買 condor 最大獲利 = 5 − 3.55 = 1.45（underlying 在 35–45 之間）；最大損失 = 3.55（underlying ≤30 或 ≥50）。

</details>

**B6.** 股票 50、strike 50、利率 5%、3 個月（連續複利）。依 $\Theta_C - \Theta_P = -rKe^{-rt}/365$，伴隨 call 與 put 的每日 theta 差多少？

<details><summary>解答</summary>

$-0.05 \times 50 \times e^{-0.0125}/365 = -2.469/365 \approx$ **−0.00676**，與例題 14-2 的 −0.0196 − (−0.0128) 一致。

</details>

### C. 交易情境題

**C1.** 你在 Optibook 想對某股票的 100 strike 建立買 straddle 20 組。100P 的委託簿很薄，只有 5 張賣單；100C 與股票都很活絡。你會怎麼做？

<details><summary>解答</summary>

用 synthetic：買 5 張真實 100P，其餘 15 張 put 以「買 15 張 100C + 賣出 15 口（對應股數）股票」synthetic。總共買 35 張 100C、5 張 100P、賣 15 口股票，gamma/vega 等同 20 組 straddle。需確認 synthetic put 的隱含價格（第 15 章的 parity 計算）不比真實 put 差太多，並注意股票空頭部位（short position）是否受 position limit 或借券成本限制。

</details>

**C2.** ⭐ 同事說他的 position 是「+1 45C、−1 50C、−1 55C」，覺得它只是個略偏多的 call 價差，風險不大。你如何用 synthetic 說服他重新評估？

<details><summary>提示</summary>

用「call = put + underlying」把 45C、50C 改寫成 put，underlying 一多一空會抵銷。看剩下的 position，上檔有沒有一張沒被保護的賣出 call？

</details>

<details><summary>解答</summary>

把 45C、50C 改寫為 put：+1 45P + underlying、−1 50P − underlying，underlying 抵銷 → +1 45P、−1 50P、−1 55C。這等於賣出 50/55 strangle 再加一張 45P 保護：下檔損失有限（45P 保護），但上檔有一張未被覆蓋的賣出 55C，**上檔風險無限**。它是負 gamma、負 vega 的 volatility position，不只是方向價差。

</details>

### D. 挑戰題

**D1.** 證明在利率 0 下，任何「買 1 張 $K_1$P、賣 1 張 $K_2$C、賣 1 張 $K_2$P、買 1 張 $K_3$C」（$K_2 - K_1 = K_3 - K_2 = w$）的 iron butterfly，其價值加上同 strike call butterfly 的價值等於 $w$。進一步說明在 stock-type settlement、利率 $r$ 時改為 $w/(1+rt)$ 的理由。

<details><summary>解答</summary>

用 synthetic $P = C - S + K/(1+rt)$（無 dividend；利率 0 時為 $C - S + K$）。iron butterfly（以收入計）$= C_{K2} + P_{K2} - P_{K1} - C_{K3}$。代入 $P_{K2} - P_{K1} = (C_{K2} - C_{K1}) + (K_2 - K_1)/(1+rt)$：
iron butterfly $= C_{K2} + C_{K2} - C_{K1} - C_{K3} + w/(1+rt) = -(C_{K1} - 2C_{K2} + C_{K3}) + w/(1+rt)$。
所以 iron butterfly + call butterfly $= w/(1+rt)$，利率 0 時為 $w$。直覺：兩者合在一起，等於在 $K_1$ synthetic 買進、在 $K_2$ synthetic 賣出（一個 box），到期價值固定為 $w$，今天的價值是其現值。

</details>

## 自我檢核清單

- [ ] 不看筆記寫出六種 synthetic 關係。
- [ ] 能用口訣在 3 秒內判斷「option + underlying」等於什麼。
- [ ] 能說明伴隨買賣權 gamma、vega 相等而 theta 未必相等的原因。
- [ ] 能用 synthetic 證明 call 價差 + put 價差 = strike 間距（現值）。
- [ ] 能把 2C − S、2P + S 認出是 straddle。
- [ ] 能在 butterfly/iron butterfly、condor/iron condor 之間換算價格。
- [ ] 能把聖誕樹價差改寫並指出無限風險在哪一邊。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab08_synthetics_arbitrage.py`](../labs/exercises/lab08_synthetics_arbitrage.py)：實作 `parity_residual`、`synthetic_forward_price`、`synthetic_call`、`synthetic_put`、`conversion_profit`、`box_value`、`implied_rate_from_box`、`implied_dividend_pv`、`jelly_roll_value`、`scan_parity_arbitrage`、`conversion_expiry_stock`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab08_synthetics_arbitrage.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab08_synthetics_arbitrage**（[../labs/](../labs/)）：寫一個函式，輸入任意 position（call、put、underlying 的組合），自動把所有 put 改寫為「call + underlying」並合併，輸出等價的純 call 表示；用它驗證 14.5、14.6 的例子（2C − S = straddle、iron butterfly = butterfly、聖誕樹改寫）。再用 Black-Scholes 驗證例題 14-2 的 gamma/vega 相等與 theta 差額。
