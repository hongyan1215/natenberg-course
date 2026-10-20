# 第 15 章　選擇權套利（Option Arbitrage）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：同一樣東西不能有兩個價錢。「買權（call） − 賣權（put）」合成（synthetic）出來的標的（underlying），價格必須跟真的 underlying 對得上（買賣權平價（put-call parity））；對不上就有人來套利（arbitrage），而所謂「無風險 arbitrage」其實也藏著好幾種風險。

**你只需要先記住這 5 件事**

1. **put-call parity：call − put = 遠期價（forward price） − 履約價（strike price）（再折現）。** 期貨型結算（futures-type settlement）的期貨選擇權（futures option）最簡單：C − P = F − X，不用折現。例：250C 12.40、250P 7.15 → 期貨（futures）應為 255.25。
2. **combo（C − P）太貴 → conversion（買 underlying、賣 call、買賣權）；太便宜 → reversal（反過來）。** 記法：在便宜的市場買、在貴的市場賣。
3. **股票快速心算：C − P ≈ 股價 − strike + strike 的利息 − 股利（dividend）。** 平價看起來不平，先懷疑自己的利率或 dividend 假設，再想 arbitrage。
4. **arbitrage 不是零風險。** 五種風險：執行（補不到腿）、pin（到期剛好在 strike，不知道會不會被指派（assign / assignment））、結算（settlement）方式不同、利率、dividend。現金結算（cash settlement）沒有 pin risk。
5. **盒式（box） = strike 差的現值，等於一筆借貸；roll = 兩個日曆價差（calendar spread）的「差」。** box 是兩個垂直價差（vertical spread）的「和」，別記反。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 平價（futures-type settlement） | C − P = F − X |
| 平價（股票型結算（stock-type settlement）） | C − P = (F − X) ÷ (1 + rt) |
| 股票遠期 | F = S × (1 + rt) − dividend |
| 股票快速近似 | C − P ≈ S − X + X × r × t − dividend |
| box 價值 | strike 差 ÷ (1 + rt) |
| synthetic futures delta（stock-type settlement 選擇權（option）） | 100 ÷ (1 + rt) |

**必做練習（約 20 分鐘）**：A1、B1、B3、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[套利偵測練習](https://hongyan1215.github.io/natenberg-course/tools/arbitrage-spotter/)，看報價（quote）表找平價、box 等 arbitrage 機會，練到幾十秒內判斷。

---

## 本章定位

第 14 章說明合成部位（synthetic position）「長得像」真實合約；本章要回答「它應該值多少」。答案就是**put-call parity**，以及由它衍生的轉換（conversion）、逆轉換（reversal）、box、捲式（roll / jelly roll）與時間盒式（time box）。最後會看到這些 arbitrage 結構其實不是「無風險」：執行、pin、settlement、利率與 dividend 都可能咬你一口。前置：[ch02](ch02_forward_pricing.md)（forward price）、[ch03](ch03_contract_specs.md)（股票型 vs futures-type settlement）、[ch14](ch14_synthetics.md)。

## 學習目標

1. 能從現金流推導 put-call parity，並寫出 futures（futures-type settlement、stock-type settlement）與股票（含 dividend）三種版本。
2. 能判斷價格偏離時應做 conversion 還是 reversal，並計算 arbitrage 利潤。
3. 能用快速近似式 $C - P \approx S - X + Xrt - D$ 估算 combo，並反推隱含利率、隱含股利（implied dividend）。
4. 能說明 conversion/reversal 的五種風險：執行、pin、settlement、利率、dividend，並計算 stock-type settlement futures option synthetic position 的 delta $100/(1+rt)$。
5. 能計算 box、roll（jelly roll）、time box 的理論價值（theoretical value），並把它們拆解成 vertical spread、calendar spread 或對角價差（diagonal spread）。
6. 能利用 synthetic 關係，在有買賣價差（bid-ask spread）的市場中找出執行跨式（straddle）或蝶式（butterfly）的最便宜方式。

## 核心概念

### 15.1 合成空頭 vs 直接賣標的；conversion 與 reversal

> 💡 **一句話**：synthetic underlying 和真 underlying 一買一賣就是 conversion／reversal：combo 太貴做 conversion，太便宜做 reversal。

**直覺**：underlying 76.00。你想放空，可以直接賣 underlying，也可以「賣 12 月 75C 收 4.30、買 12 月 75P 付 3.30」：淨收 1.00。到期時一定以 75 賣出 underlying，加上收到的 1.00，等於以 76.00 放空。只要 75C 比 75P 剛好貴 1.00（且不考慮利息、dividend），兩種放空方式損益完全相同。

**組合起來**：若你已有合成空頭（synthetic short）（−75C、+75P），可以買進 underlying 來對沖：

| 名稱 | 組成 | 白話 |
|---|---|---|
| **conversion（轉換）** | 買 underlying + 賣 call + 買賣權 | 在 underlying 市場買、在 option 市場 synthetic 賣 |
| **reversal / reverse conversion（reversal）** | 賣 underlying + 買 call + 賣 put | 在 underlying 市場賣、在 option 市場 synthetic 買 |

（call、put 同 strike、同到期。synthetic 部分「call − put」常被交易員稱為 **combo**。）

- synthetic 部分（combo）相對 underlying**太貴** → 賣 combo、買 underlying → **conversion**。
- synthetic 部分**太便宜** → 買 combo、賣 underlying → **reversal**。

### 15.2 從現金流推導買賣權平價

> 💡 **一句話**：把 conversion 的收入和支出列出來令它相等，就得到 C − P = (F − X) 的現值。

做一個 conversion（股票 underlying、持有到到期、單利 $r$、期間 $t$）：

| 收入 | 支出 |
|---|---|
| 賣 call 收 $C$ | 買賣權付 $P$ |
| $C$ 的利息 $Crt$ | 借錢買賣權的利息 $Prt$ |
| 持有股票領 dividend $D$ | 買股票付 $S$ |
| 到期以 $X$ 賣出股票（履約（exercise）put 或被 assign call） | 借錢買股票的利息 $Srt$ |

無 arbitrage → 收入 = 支出：

$$C(1+rt) + D + X = P(1+rt) + S(1+rt)$$

移項：$(C-P)(1+rt) = S(1+rt) - D - X$。右邊的 $S(1+rt) - D$ 正是股票 forward price $F$：

$$\boxed{C - P = \frac{F - X}{1 + rt}}$$

**put-call parity**：歐式同 strike、同到期的 call 與 put 價差，等於「forward price 減 strike」的現值。交易員也稱之為 combo value、synthetic relationship 或 conversion market。

### 15.3 期貨選擇權

> 💡 **一句話**：futures-type settlement C − P = F − X；stock-type settlement 要再除以 (1 + rt)。

**(a) futures-type settlement**（美國以外多數 futures 交易所）：買賣 futures 或 option 都不需付現，有效利率為 0；futures 也沒有 dividend：

$$C - P = F - X$$

**例題 15-1**　12 月 250C = 12.40、12 月 250P = 7.15。futures 應為 $250 + 12.40 - 7.15 =$ **255.25**。

若 futures 實際在 255.60：$12.40 - 7.15 = 5.25 \ne 255.60 - 250 = 5.60$。synthetic 比 futures 便宜 → 人人都想做 **reversal**：買 250C、賣 250P、賣 futures，鎖定 0.35 的利潤。

市場壓力會讓價格回到平價，可能是：
- call 被買到 12.75（12.75 − 7.15 = 5.60），或
- put 被賣到 6.80（12.40 − 6.80 = 5.60），或
- futures 被賣到 255.25，或三者組合。

交易所每日結算價（settlement price）也會刻意維持平價。**示意 settlement 表**（自創，futures-type settlement，futures 131.20）：

| strike | call | put | C − P | F − X |
|---|---|---|---|---|
| 129 | 2.68 | 0.48 | 2.20 | 2.20 |
| 130 | 1.92 | 0.72 | 1.20 | 1.20 |
| 131 | 1.29 | 1.09 | 0.20 | 0.20 |
| 132 | 0.80 | 1.60 | −0.80 | −0.80 |
| 133 | 0.46 | 2.26 | −1.80 | −1.80 |

**(b) stock-type settlement**（北美多數 futures 交易所）：option 要付現，必須折現：

$$C - P = \frac{F - X}{1 + rt}$$

**例題 15-2**　4 個月、利率 4.5%、12 月 futures 248.00、12 月 250C = 6.10。

$$C - P = \frac{248 - 250}{1 + 0.045 \times 4/12} = \frac{-2}{1.015} = -1.97$$

$P = 6.10 + 1.97 =$ **8.07**。

### 15.4 漲跌停鎖死的期貨市場（Locked Futures Markets）

> 💡 **一句話**：futures 漲停鎖死時，可以從 C − P + X 看出 futures「真正」該在哪裡。（可先跳過）

futures 碰到漲跌停時無法成交，但 option 市場可能仍開放——可以透過 synthetic position「在漲停價之外」交易 futures，價格由 $F = C - P + X$ 推得。

**例題 15-3**（自創）futures 每日漲跌幅限 10，昨收 480，今日漲停 490 鎖死。option（futures-type settlement、無利息）quote：

| strike | call | put | synthetic futures $C - P + X$ |
|---|---|---|---|
| 480 | 19.10 | 2.80 | 496.30 |
| 485 | 15.40 | 4.15 | 496.25 |
| 490 | 12.10 | 5.75 | 496.35 |
| 495 | 9.20 | 7.90 | 496.30 |
| 500 | 6.85 | 10.60 | 496.25 |
| 505 | 4.95 | 13.65 | 496.30 |

若 futures 能自由交易，大概在 496.25–496.35。想買 futures 的人可以買 C、賣 P synthetic 買進；想賣的人反向操作。小幅差異可能來自 bid-ask spread 未列出或 quote 時間不同。

### 15.5 股票選擇權

> 💡 **一句話**：股票先算 forward price（加利息、扣 dividend），再套平價。

先算遠期，再套平價。

**例題 15-4**　股價 84.20、5 個月、利率 3.6%、到期前 dividend 0.60、80C = 7.35。求 80P。

$$F = 84.20 \times (1 + 0.036 \times 5/12) - 0.60 = 85.463 - 0.60 = 84.863$$
$$C - P = \frac{84.863 - 80}{1.015} = 4.791$$
$$P = 7.35 - 4.79 = \textbf{2.56}$$

### 15.6 股票選擇權的快速近似

> 💡 **一句話**：C − P ≈ S − X + Xrt − D 可秒算；不平時也可能是利率或 dividend 假設錯了。

在交易廳需要秒算時，可以把平價展開：

$$C - P = \frac{S(1+rt) - D - X}{1+rt} = S - \frac{D}{1+rt} - \frac{X}{1+rt}$$

近似：dividend 相對小 → $\frac{D}{1+rt} \approx D$；$\frac{X}{1+rt} \approx X - Xrt$。於是

$$\boxed{C - P \approx S - X + Xrt - D}$$

白話：**combo ≈ 股價 − strike + strike 的利息 − dividend**。

**例題 15-5**　同例題 15-4：$84.20 - 80 + 80 \times 0.036 \times 5/12 - 0.60 = 4.80$，與精確值 4.79 只差約 0.01。利率高、dividend 大、天期長時誤差變大，但短天期很好用。

**反推隱含利率與 implied dividend**：平價有三個價格（C、P、S）與兩個假設（r、D）。價格「看起來不平」時，未必是 arbitrage，可能是你的假設錯了。

**例題 15-6**　60C = 5.10、60P = 1.25、3 個月、你假設 r = 5%、D = 0.35。

$$S \approx C - P + X - Xrt + D = 5.10 - 1.25 + 60 - 0.75 + 0.35 = 63.45$$

但股票實際在 63.30。

- 若價格與 dividend 都對，**隱含利率**：$r = \dfrac{(C - P - S + X + D)/X}{t} = \dfrac{(3.85 - 63.30 + 60 + 0.35)/60}{0.25} = \dfrac{0.015}{0.25} =$ **6.0%**
- 若價格與利率都對，**implied dividend**：$D = S - C + P - X + Xrt = 63.30 - 3.85 - 60 + 0.75 =$ **0.20**

市場可能在預期公司減息（0.35 → 0.20），或你的資金成本假設偏低。

### 15.7 套利風險（Arbitrage Risk）

> 💡 **一句話**：arbitrage 有執行、pin、settlement、利率、dividend 五種風險；大部位（position）別帶著價平（at-the-money, ATM）空頭進到期。

conversion/reversal 常被說成「無風險」，但幾乎沒有策略真的零風險。

#### (1) 執行風險（Execution Risk）

沒人會一次把有利可圖的三腿送到你面前，你常要先做一兩腿、再等最後一腿。例如先買賣權與股票，打算稍後賣 call 完成 conversion——若 call 價格下跌，可能永遠無法以有利價格完成。**任何分腿執行的策略，都承擔補腿前價格不利變動的風險。**

#### (2) Pin 風險（Pin Risk）

假設你持有 300 組 75 conversion（−75C、+75P、+股票）。到期時：

- underlying > 75：被 assign call，股票交出 → 無 position。
- underlying < 75：exercise put，股票賣出 → 無 position。
- **underlying 剛好 75.00**：你要不要 exercise put？取決於 call 會不會被 assign——但 assign 通知隔天才知道，那時 put 已經到期。

ATM 到期的 option**常常會被 exercise**：想建立 underlying position 的持有人，exercise 的成本通常比在市場上買賣 underlying 低。

- 猜「會被 assign」而不 exercise put → 若沒被 assign，隔天多出 300 口不想要的多頭股票。
- 猜「不會被 assign」而 exercise put → 若被 assign，隔天多出 300 口空頭股票。

conversion/reversal 往往規模很大，猜錯的代價很高。

**對策**：
- 到期前 underlying 接近 strike 時，**縮小 position**；不要帶著大量 ATM 空頭 option 進入到期。
- 臨到期仍有剩餘時，可以直接平倉（但要吃 bid-ask spread），或者找持有反向 position 的人以**平價（even money）**互相交叉平倉——雙方都消除 pin risk，利潤早在開倉時就鎖定了。
- **cash settlement**的 option（如多數指數 option）到期不產生 underlying position，**沒有 pin risk**。

#### (3) 結算風險（Settlement Risk）

當**option 與 underlying 的 settlement 方式不同**時出現（stock-type settlement 的 option + futures-type settlement 的 futures）。

**例題 15-7**　futures 151、150 strike、6 個月、利率 6%、option stock-type settlement。合理 combo = $1/(1 + 0.06 \times 0.5) = 0.971$。你賣 150C 收 8.75、買 150P 付 7.75（combo 收 1.00）、買 futures 151 → 鎖定約 0.03 的 conversion 利潤。

- futures 隨後跌到 145：option position（synthetic short）有 6.00 的**未實現**獲利；futures position 卻**立刻**被扣 6.00 的變動保證金（variation margin）。為這 6.00 融資半年要約 $6 \times 0.06 \times 0.5 = 0.18$ 的利息——遠超過 0.03 的預期利潤。若資金不足還可能被迫平倉。
- futures 漲到 157：futures 立刻入帳 6.00 可生息，option 虧損未實現 → 額外賺利息。

所以這個 conversion 其實偏多。以 Black 模型（波動率（volatility） 20%）：

| position | delta |
|---|---|
| 賣 150C | −53 |
| 買 150P | −44 |
| 買 futures | +100 |
| 合計 | **+3** |

一般公式：stock-type settlement 的 futures option，synthetic futures position 的 delta 為

$$\Delta_{\text{synthetic}} = \frac{100}{1 + rt}\quad（\text{本例 } 100/1.03 = 97.1）$$

利率越高、天期越長，偏離 100 越多。做 300 組時，+2.9 × 300 ≈ +870 delta，相當於多出約 9 口 futures 的方向 position。若兩者 settlement 方式相同（都股票型或都 futures 型），就沒有這個風險。（用 futures 避險（hedge）現貨 position 時也有類似問題，稱為 tailing。）

#### (4) 利率與股利風險（Interest and Dividend Risk）

股票 conversion（−C、+P、+股票）整體是**付出**約等於 strike 的金額，需要融資：

- 利率上升 → 融資成本上升 → conversion 價值下降 → **conversion 的 rho 為負**。
- reversal 賣股票收現金生息 → **rho 為正**。
- conversion 持有股票 → dividend 增加有利（**正 dividend 風險**）；reversal 相反。

（股票 option 中 call rho 為正、put rho 為負；conversion 是賣 call、買賣權，兩者 rho 同號相加。）

**例題 15-8**　沿用例題 15-5 的近似：combo = 4.80。
- 利率由 3.6% 升到 4.6%：$84.20 - 80 + 80 \times 0.046 \times 5/12 - 0.60 = 5.13$（combo 上升 0.33，賣出 combo 的 conversion 受損）。
- dividend 由 0.60 提高到 0.80：combo = 4.60（下降 0.20，conversion 受益）。

（融資通常是浮動利率，所以利率風險真實存在。）

**三方組合（three-way）**：conversion/reversal 的風險來自「synthetic position vs 真實 underlying」的差異。可以把真實 underlying 換成**深價內（deep in-the-money, deep ITM）option**：

- conversion：−C、+P、+deep ITM call；或 −C、+P、−deep ITM put。

這消除了股票 position 的融資、dividend 或 settlement 問題，但若 underlying 往 deep ITM 那張的 strike 移動，它不再像 underlying，整個 position 也不再像 conversion。

### 15.8 盒式價差（Boxes）

> 💡 **一句話**：box 到期一定值 strike 差，今天值它的現值；買 box = 放款、賣 box = 借款。

把真實 underlying 換成「另一個 strike 的 synthetic position」：

- 6 月 150 conversion：−150C、+150P、+underlying
- 6 月 140 reversal：+140C、−140P、−underlying

underlying 抵銷 →

| 左側（140 合成多頭（synthetic long）） | 右側（150 synthetic short） |
|---|---|
| +1 140C | −1 150C |
| −1 140P | +1 150P |

這就是**多頭 140/150 box**：低 strike synthetic long、高 strike synthetic short。反過來是空頭 box。它在 140 strike 市場買、在 150 strike 市場賣，同一 underlying，所以是 arbitrage。

**價值**：到期時一定在 140 買、在 150 賣，價值恆為 10（不計 pin risk）。
- futures-type settlement：今天就值 10。
- stock-type settlement：今天值現值。4 個月、利率 6%：$10/(1+0.06 \times 4/12) = 9.804$。

**box = 借貸**：歐式、cash settlement 時，買 box = 放款、賣 box = 借款。以 9.75 賣出上述 box 等於借錢，隱含年利率 $(10/9.75 - 1)/(4/12) =$ **7.69%**。賣得越便宜，借款利率越高。交易公司缺短期資金時，有時會賣 box 籌資（但仍有保證金（margin）與交易成本）。

**上下拆解**：

| 上半部 | +140C / −150C → 多頭買權價差（bull call spread） |
|---|---|
| 下半部 | −140P / +150P → 空頭賣權價差（bear put spread） |

**多頭 box = bull call spread + bear put spread**，兩個 vertical spread 的價格和必等於 box 價值。

**例題 15-9　用 box quote**　140/150 box 值 9.80（取整），140/150 call 價差市場 6.35。有人問 140/150 put 價差的 quote：中心價 = 9.80 − 6.35 = **3.45**，報 3.40–3.50。
- 若你以 3.40 買到 put 價差，再以 6.35 買 call 價差 → 9.75 買到值 9.80 的 box。
- 若你以 3.50 賣出 put 價差，再以 6.35 賣出 call 價差 → 9.85 賣出值 9.80 的 box。

box 比 conversion/reversal 更低風險（沒有 underlying position）。

### 15.9 捲式（Rolls / Jelly Rolls）

> 💡 **一句話**：roll ≈ strike 的利息 − dividend，等於 call calendar spread 減 put calendar spread。（可先跳過）

box 是同月份、不同 strike 的 conversion + reversal；**roll**是同 strike、不同月份：

| 近月（6 月） | 遠月（9 月） |
|---|---|
| +1 6 月 70C | −1 9 月 70C |
| −1 6 月 70P | +1 9 月 70P |
| （−underlying） | （+underlying） |

underlying 抵銷的前提是兩個月份的 underlying 相同——股票 option 成立；futures option 各月份對應不同 futures，不是真正的 roll。

**多頭 roll**（本書定義：買遠月 synthetic、賣近月 synthetic；業界常稱 **jelly roll**）：

$$\text{價值} = (C_l - P_l) - (C_s - P_s)$$

（$l$ 遠月、$s$ 近月）。無 dividend 時 $C - P = S - X/(1+rt)$，所以

$$\text{roll} = \frac{X}{1 + r_s t_s} - \frac{X}{1 + r_l t_l} - D$$

$D$ 為兩次到期之間的 dividend（忽略 dividend 的利息）。通常為正：近月的 strike 折現較少。

**例題 15-10**　6 月（3 個月）/9 月（6 個月）70 roll，利率 5%，兩到期間 dividend 0.50：

$$\frac{70}{1.0125} - \frac{70}{1.025} - 0.50 = 69.136 - 68.293 - 0.50 = \textbf{0.343}$$

**快速近似**：持有 roll 的人（賣近月 synthetic、買遠月 synthetic）會在近月到期以 X 賣出股票、遠月到期以 X 買回，期間等於放空股票：賺 X 的利息、付 dividend：

$$\text{roll} \approx X \cdot r \cdot (t_l - t_s) - D = 70 \times 0.05 \times 0.25 - 0.50 = 0.375$$

誤差約 0.03。

**用 calendar spread 表示**：

| 上半部 | −6 月 70C / +9 月 70C → 多頭 call calendar spread |
|---|---|
| 下半部 | +6 月 70P / −9 月 70P → 空頭 put calendar spread |

**多頭 roll = 買 call calendar spread + 賣 put calendar spread**，所以兩個 calendar spread 的**差**等於 roll：

- 70 call calendar spread 2.60 → 70 put calendar spread = 2.60 − 0.343 ≈ **2.26**。
- 70 put calendar spread 2.10 → 70 call calendar spread ≈ 2.44。

一般利息大於 dividend，所以 roll 為正、call calendar spread 較貴；dividend 大於利息時 roll 為負，關係反轉。（注意：box = 兩個 vertical spread 的**和**；roll = 兩個 calendar spread 的**差**。）

**不同 strike 的 roll**：dividend 對同到期的 roll 都一樣，差別只在 strike 的利息：

$$\text{roll}_{60} \approx \text{roll}_{70} - (70 - 60) \times 0.05 \times 0.25 = 0.343 - 0.125 = 0.218$$

（精確值 0.223。）roll 只消除到近月到期為止的 underlying 風險；近月到期時會實際買賣股票，所以 roll 對利率與 dividend 變化敏感，兩到期日（expiration date）相隔越久越敏感。

### 15.10 時間盒式（Time Boxes / Diagonal Rolls）

> 💡 **一句話**：time box = box ± roll，也能拆成兩個 diagonal spread。（可先跳過）

不同月份**且**不同 strike：

| 近月 | 遠月 |
|---|---|
| +1 6 月 70C | −1 9 月 80C |
| −1 6 月 70P | +1 9 月 80P |

（6 月 synthetic 買進 70、9 月 synthetic 賣出 80。）

$$\text{價值} = (C_{s,70} - P_{s,70}) - (C_{l,80} - P_{l,80}) = \frac{X_l}{1 + r_l t_l} + D - \frac{X_s}{1 + r_s t_s}$$

**例題 15-11**　同例題 15-10 條件：

$$\frac{80}{1.025} + 0.50 - \frac{70}{1.0125} = 78.049 + 0.50 - 69.136 = \textbf{9.413}$$

正值代表建立此 position 要**付出** 9.41（6 月以 70 買、9 月以 80 賣，當然要先付錢）。

**拆成兩個 diagonal spread**：call 對角（+6 月 70C、−9 月 80C）與 put 對角（−6 月 70P、+9 月 80P）。put 那組一定是付出（9 月 80P 一定比 6 月 70P 貴），call 那組可付可收（低 strike 使 6 月較貴、長時間使 9 月較貴）。不論如何，兩者合計為 9.41：若 call 對角成交 3.10，put 對角應為 6.31。

**time box = box ± roll**：

| 拆法 | 計算 |
|---|---|
| 買 6 月 70/80 box + 賣 6/9 月 80 roll | $\frac{10}{1.0125} - \left(\frac{80}{1.0125} - \frac{80}{1.025} - 0.50\right) = 9.877 - 0.464 = 9.413$ |
| 買 9 月 70/80 box + 賣 6/9 月 70 roll | $\frac{10}{1.025} - 0.343 = 9.756 - 0.343 = 9.413$ |

即：**買近月 box + 賣較高 strike 的 roll**，或**買遠月 box + 賣較低 strike 的 roll**，結果相同。

### 15.11 在波動率價差中運用合成

> 💡 **一句話**：真 arbitrage 很少，但用 synthetic 可以把 straddle、butterfly 買得更便宜一點。

真正的 arbitrage 機會很少、很小、很短，通常只有交易成本極低的專業交易員吃得到。但懂得 arbitrage 關係，可以讓你用**更好的價格**執行原本就想做的策略。

**例題 15-12　最便宜的 straddle**（3 個月、利率 4%、dividend 0.30）

| | Bid | Ask |
|---|---|---|
| 股票 | 63.40 | 63.45 |
| 60C | 5.05 | 5.15 |
| 60P | 1.30 | 1.35 |

近似平價：$C - P \approx S - 60 + 60 \times 0.04 \times 0.25 - 0.30 = S - 59.70$。

- 直接買：5.15 + 1.35 = **6.50**
- synthetic put（買 60C、賣股票 63.40）：$5.15 - P = 63.40 - 59.70 = 3.70$ → synthetic put 成本 1.45 > 1.35，較差。
- synthetic call（買 60P、買股票 63.45）：$C - 1.35 = 63.45 - 59.70 = 3.75$ → synthetic call 成本 **5.10** < 5.15。
- 以 synthetic call 買 straddle（買 2 張 60P、買股票）：5.10 + 1.35 = **6.45**，省 0.05。

但沒有 arbitrage：
- conversion（賣 60C 5.05、買 60P 1.35、買股票 63.45）：synthetic 賣出價 3.70 < 買進成本 3.75。
- reversal（買 60C 5.15、賣 60P 1.30、賣股票 63.40）：synthetic 買進價 3.85 > 賣出價 3.70。

0.05 值不值得？專業交易員大量交易、手續費低，會很高興；散戶多一腿的手續費與執行難度，可能讓直接買 straddle 更實際。

**例題 15-13　最便宜的 butterfly**（同條件，55/60/65）

| | Bid | Ask |
|---|---|---|
| 55C | 9.20 | 9.35 |
| 55P | 0.55 | 0.60 |
| 60C | 5.05 | 5.15 |
| 60P | 1.30 | 1.35 |
| 65C | 2.20 | 2.30 |
| 65P | 3.40 | 3.55 |

- call butterfly：−9.35 + 2×5.05 − 2.30 = 付 **1.55**
- put butterfly：−0.60 + 2×1.30 − 3.55 = 付 **1.55**
- 賣鐵蝶式（iron butterfly）：賣 60C 5.05、賣 60P 1.30、買 55P 0.60、買 65C 2.30 → 收 **3.45**

butterfly + iron butterfly = $5/(1 + 0.04 \times 0.25) = 4.950$。以 3.45 賣 iron butterfly ≡ 以 4.95 − 3.45 = **1.50** 買 butterfly，比直接買便宜 0.05。（可自行驗證：此 quote 下各 conversion、reversal、box 都沒有 arbitrage。）

> 每次執行策略前問自己：**有沒有哪一部分可以用 synthetic 方式做得更便宜？** 通常沒有，但一輩子累積下來，小小的節省也很可觀。

### 15.12 套利關係總表（歐式、不計股利利息）

> 💡 **一句話**：所有平價、box、roll 公式的對照表，忘了再回來查。

| 關係 | 單利 | 連續複利 | 近似 |
|---|---|---|---|
| 平價（futures，stock-type settlement） | $C - P = \frac{F - X}{1 + rt}$ | $(F - X)e^{-rt}$ | — |
| 平價（futures，futures-type settlement） | $C - P = F - X$ | 同左 | — |
| 平價（股票） | $C - P = S - \frac{X}{1+rt} - D$ | $S - Xe^{-rt} - D$ | $S - X + Xrt - D$ |
| box | $\frac{X_h - X_l}{1 + rt}$ | $(X_h - X_l)e^{-rt}$ | $(X_h - X_l)(1 - rt)$ |
| roll（股票） | $\frac{X}{1 + r_s t_s} - \frac{X}{1 + r_l t_l} - D$ | $Xe^{-r_s t_s} - Xe^{-r_l t_l} - D$ | $X r (t_l - t_s) - D$ |
| time box（股票） | $\frac{X_l}{1 + r_l t_l} + D - \frac{X_s}{1 + r_s t_s}$（買近月 $X_s$ synthetic、賣遠月 $X_l$ synthetic） | 對應連續版 | — |

組成：多頭 box = bull call spread + bear put spread；多頭 roll = 多頭 call 日曆 + 空頭 put 日曆；time box = 兩個 diagonal spread = box ± roll。

## 交易員視角

- **Optibook 的雙掛牌（dual listing）與 ETF/futures 挑戰** 本質上就是本章的 arbitrage 思維：同一經濟曝險在兩個市場有兩個價格。option 做市（market making）時，把每個 strike 的 call、put、underlying quote 綁在平價上，你的 quote 就不會被對手用 synthetic position「套」。
- **先做哪一腿？** 執行風險在 Optibook 很真實：其他隊伍的 bot 速度很快。若你發現 combo 偏貴，先在流動性最差的那腿掛限價單，成交後立刻用 IOC 打流動性好的腿（通常是 underlying）。
- **部位上限（position limit） = arbitrage 的天花板**：conversion/reversal 吃 option 與 underlying 兩邊的額度；box 只吃 option 額度。若 underlying 已滿倉，可以考慮用 box 或三方組合。
- **「Positions never expire」**：Optibook 的 position 不會自動平掉（與真實市場不同），但若有到期結構，pin risk 的教訓仍然適用——不要把大量 ATM 空頭帶到到期。
- **delta 不是 0**：本章的 settlement 風險說明，看似中性的 arbitrage position 可能帶有方向；大規模 position 要用真實的 delta（例如 $100/(1+rt)$）hedge。

## 常見誤區

1. **誤解**：「conversion、reversal、box 是無風險 arbitrage。」→ **正解**：有執行、pin、settlement、利率、dividend 風險；box 較低但仍有 pin 與（美式時的）提前履約（early exercise）風險。
2. **誤解**：「平價不成立就一定有 arbitrage。」→ **正解**：可能是你的利率或 dividend 假設錯；先算隱含利率與 implied dividend。
3. **誤解**：「ATM option 到期一定不會被 exercise。」→ **正解**：exercise 常比在市場買賣 underlying 便宜，很多 ATM option 會被 exercise，這正是 pin risk 的來源。
4. **誤解**：「stock-type settlement 的 futures option，synthetic futures delta 就是 100。」→ **正解**：是 $100/(1+rt)$；搭配真實 futures 的 conversion 有淨 delta。
5. **誤解**：「box 等於兩個 calendar spread 的差，roll 等於兩個 vertical spread 的和。」→ **正解**：剛好相反——box = vertical spread 的和；roll = calendar spread 的差。
6. **誤解**：「有 synthetic 價格更好就是有 arbitrage。」→ **正解**：有 bid-ask spread 時，synthetic 可以讓你更便宜地建立 position，但不代表可以無風險獲利（例題 15-12）。

## 重點摘要

| 項目 | 規則 |
|---|---|
| conversion | +underlying −C +P；combo 太貴時做 |
| reversal | −underlying +C −P；combo 太便宜時做 |
| 平價（一般式） | $C - P = (F - X)/(1+rt)$ |
| 股票遠期 | $F = S(1+rt) - D$ |
| 快速近似 | $C - P \approx S - X + Xrt - D$ |
| 隱含利率 | $r = \frac{(C - P - S + X + D)/X}{t}$ |
| implied dividend | $D = S - C + P - X + Xrt$ |
| synthetic futures delta（stock-type settlement option） | $100/(1+rt)$ |
| conversion（股票）| rho 負、dividend 正 |
| box | 價值 = strike 差現值；= 借貸；= call 價差 + put 價差 |
| roll（jelly roll） | $X/(1+r_st_s) - X/(1+r_lt_l) - D \approx Xr\Delta t - D$；= call 日曆 − put 日曆 |
| time box | = box ± roll；= 兩個 diagonal spread |
| pin risk | 實物交割、到期剛好在 strike；cash settlement 無 |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B1、B3、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ combo（C − P）相對 underlying 偏貴時，應做 conversion 還是 reversal？寫出三腿。

<details><summary>提示</summary>

combo 偏貴就要「賣 combo」。賣 combo = 賣 call + 買賣權（synthetic short），那真的 underlying 要買還是賣才能對沖？

</details>

<details><summary>解答</summary>

conversion：賣 call、買賣權（賣出偏貴的 combo，即 synthetic 賣出 underlying），同時買進真實 underlying。

</details>

**A2.** 為什麼 cash settlement 的指數 option 沒有 pin risk？

<details><summary>解答</summary>

到期時只以現金支付 strike 與 settlement price 的差額，不產生任何 underlying position。pin risk 的本質是「不知道會不會被 assign，因而不知道隔天會不會多出 underlying position」，cash settlement 沒有這個不確定性。

</details>

**A3.** 一個 conversion 用的是 stock-type settlement 的 futures option 與（futures-type settlement 的）futures。為什麼它偏多？

<details><summary>解答</summary>

futures 的損益每日以 cash settlement，option 的損益要到平倉或到期才實現。futures 上漲時，futures position 立刻入帳、可以生息，而 option（synthetic short）的虧損只是帳面；下跌時則要為 futures 的 variation margin 融資，option 獲利卻未實現。所以上漲對 position 較有利，淨 delta 為正，約 $100 - 100/(1+rt)$。

</details>

**A4.** 為什麼賣出 box 等於借錢？

<details><summary>解答</summary>

賣出 box 今天收到（約）strike 差的現值，到期時必須支付恰好等於 strike 差的金額（歐式、cash settlement 時沒有其他不確定性）。今天收錢、未來付固定金額，就是借款；隱含利率由 box 成交價決定。

</details>

**A5.** box 可以拆成哪兩個價差？roll 呢？各是「和」還是「差」？

<details><summary>解答</summary>

多頭 box = 多頭 call vertical spread + 空頭 put vertical spread（價格相加）。多頭 roll = 多頭 call calendar spread + 空頭 put calendar spread，以價格而言等於「call calendar spread − put calendar spread」（價格相減）。

</details>

**A6.** 什麼是三方組合（three-way）？它解決了什麼問題、又帶來什麼新問題？

<details><summary>解答</summary>

把 conversion/reversal 中的真實 underlying 換成 delta 接近 100 的 deep ITM option（多頭時買 deep ITM call 或賣 deep ITM put）。它消除了持有真實 underlying 的融資、dividend 與 settlement 方式差異等風險。但若 underlying 往那張 deep ITM option 的 strike 移動，它不再像 underlying，整個 position 不再像純 arbitrage。

</details>

### B. 計算題

**B1.** ⭐ futures-type settlement 的 futures option：105C = 4.80、105P = 2.15、futures 107.90。是否有 arbitrage？怎麼做、賺多少？

<details><summary>提示</summary>

futures-type settlement 用 C − P = F − X。先算「應該的」F − X 和實際的 C − P，比較哪一邊便宜，就買便宜那邊、賣貴那邊。

</details>

<details><summary>解答</summary>

平價：C − P 應 = F − X = 2.90。實際 C − P = 2.65 < 2.90，combo 便宜 → reversal：買 105C、賣 105P、賣 futures 107.90。利潤 = 2.90 − 2.65 = **0.25**。

</details>

**B2.** stock-type settlement futures option：futures 512、500C = 21.40、利率 5%、3 個月（單利）。500P 應為多少？

<details><summary>解答</summary>

C − P = (512 − 500)/(1 + 0.05 × 0.25) = 12/1.0125 = 11.852。P = 21.40 − 11.85 = **9.55**。

</details>

**B3.** ⭐ 股價 47.30、4 個月、利率 6%、dividend 0.40、45P = 1.25。用精確平價（先算遠期）求 45C；再用快速近似求 45C。

<details><summary>提示</summary>

精確：先算遠期 F = S × (1 + rt) − dividend，再算 (F − X) ÷ (1 + rt)，最後 C = P + (C − P)。近似：直接用 S − X + X × r × t − dividend。

</details>

<details><summary>解答</summary>

精確：F = 47.30 × (1 + 0.06 × 4/12) − 0.40 = 47.30 × 1.02 − 0.40 = 47.846；C − P = (47.846 − 45)/1.02 = 2.790；C = 1.25 + 2.79 = **4.04**。
近似：C − P ≈ 47.30 − 45 + 45 × 0.02 − 0.40 = 2.80；C ≈ **4.05**。

</details>

**B4.** 80C = 4.60、80P = 2.95、3 個月，你假設 r = 4%、D = 0.50，股票實際 82.05。求 implied dividend（假設利率正確）與隱含利率（假設 dividend 正確）。

<details><summary>解答</summary>

implied dividend D = S − C + P − X + Xrt = 82.05 − 4.60 + 2.95 − 80 + 80 × 0.04 × 0.25 = 82.05 − 1.65 − 80 + 0.80 = **1.20**。
隱含利率 r = (C − P − S + X + D)/X/t = (1.65 − 82.05 + 80 + 0.50)/80/0.25 = 0.10/20 = **0.5%**。
（兩種解讀：市場預期 dividend 大增到 1.20，或資金成本只有 0.5%——前者通常比較可能，例如有特別 dividend 傳聞。）

</details>

**B5.** stock-type settlement futures option，利率 8%、9 個月。synthetic futures position 的 delta 是多少？做 200 組 conversion，淨 delta 約多少？

<details><summary>解答</summary>

100/(1 + 0.08 × 0.75) = 100/1.06 = 94.34。conversion = +futures 100 − synthetic 94.34 = +5.66 每組；200 組約 **+1,132 delta**（約 11 口 futures）。

</details>

**B6.** 90/100 box，stock-type settlement、5 個月、利率 4.8%（單利）。theoretical value？若有人以 9.70 賣出該 box，隱含借款年利率？

<details><summary>解答</summary>

價值 = 10/(1 + 0.048 × 5/12) = 10/1.02 = **9.804**。隱含利率 = (10/9.70 − 1)/(5/12) = 0.030928/0.41667 = **7.42%**。

</details>

**B7.** 股票 roll：4 月（2 個月）/7 月（5 個月）50 roll，利率 6%，兩到期間 dividend 0.30。精確值與近似值各為多少？若 50 call calendar spread 1.85，50 put calendar spread 應為多少？

<details><summary>解答</summary>

精確：50/(1 + 0.06 × 2/12) − 50/(1 + 0.06 × 5/12) − 0.30 = 50/1.01 − 50/1.025 − 0.30 = 49.505 − 48.780 − 0.30 = **0.424**。
近似：50 × 0.06 × 3/12 − 0.30 = 0.75 − 0.30 = **0.45**。
put calendar spread = 1.85 − 0.424 ≈ **1.43**。

</details>

**B8.** 同 B7 條件，求「買 4 月 45 synthetic、賣 7 月 50 synthetic」的 time box 價值，並用「買 4 月 45/50 box + 賣 50 roll」驗證。

<details><summary>解答</summary>

直接：50/1.025 + 0.30 − 45/1.01 = 48.780 + 0.30 − 44.554 = **4.526**。
驗證：4 月 45/50 box = 5/1.01 = 4.950；50 roll = 0.424；4.950 − 0.424 = **4.526** ✔。

</details>

### C. 交易情境題

**C1.** ⭐ 到期前一天，你持有 400 組 120 reversal（+120C、−120P、−股票），股票收在 120.05，波動不大。你會怎麼處理？

<details><summary>提示</summary>

這是 pin risk：股價就貼在 strike。想想你空的是哪一張 option？如果沒被 assign、你也沒 exercise，會留下什麼 position？再想怎麼提前縮小規模。

</details>

<details><summary>解答</summary>

這是典型的 pin risk：你空 120P，若到期剛好在 120，不知道會不會被 assign。若被 assign（買進股票）而你沒 exercise call，股票空頭被抵銷沒問題；若沒被 assign 而你也沒 exercise call，就留下 400 口裸空股票。處理：(1) 今天就主動縮小規模，例如找持有 120 conversion 的交易員以平價交叉平倉；(2) 或在市場上分批平掉 reversal（接受 bid-ask spread 成本）；(3) 剩餘 position 在到期後第一時間檢查 assign，用股票立即修正。不要賭到期價格。

</details>

**C2.** 你在 Optibook 為某股票 option market making，股票 bid/ask 31.95/32.00，30C 你打算報 2.40/2.50。利率與 dividend 可忽略、天期很短。30P 應該報多少附近？若有人在你的 30P 賣價上大量買進，你如何 hedge？

<details><summary>解答</summary>

利率、dividend 忽略時 C − P ≈ S − X。中心：S ≈ 31.975 → C − P ≈ 1.975；C 中心 2.45 → P 中心 ≈ 0.475，可報 0.43/0.53 左右（寬度與 call 相近）。若有人在 0.53 買走大量 30P，你空 30P：最直接的 hedge 是組成 reversal 的一部分——買 30C（在 2.50 或更好）並賣股票，或者至少先賣股票對沖 delta，再找機會買回 30C。重點是把空頭 put 的 gamma/vega 用 call 抵銷，delta 用股票處理。

</details>

### D. 挑戰題

**D1.** 證明「time box = 買近月 box + 賣較高 strike roll」，並說明在**futures option**市場這個等式為何可能不成立。

<details><summary>解答</summary>

記 $\text{Syn}(m, X) = C_{m,X} - P_{m,X}$。time box $= \text{Syn}(s, X_1) - \text{Syn}(l, X_2)$。
近月 box $= \text{Syn}(s, X_1) - \text{Syn}(s, X_2)$；$X_2$ 的多頭 roll $= \text{Syn}(l, X_2) - \text{Syn}(s, X_2)$。
近月 box − roll $= \text{Syn}(s, X_1) - \text{Syn}(s, X_2) - \text{Syn}(l, X_2) + \text{Syn}(s, X_2) = \text{Syn}(s, X_1) - \text{Syn}(l, X_2)$ ✔。
在 futures option 市場，近月與遠月 option 的 underlying 通常是**不同**的期貨合約（futures contract）。roll 中的近月 synthetic long 與遠月 synthetic short 到期時交割的是兩種不同的 futures，underlying 不會互相抵銷，所以「roll」不是純粹的利率/dividend 結構，而包含兩個 futures 月份的價差風險；上述等式在代數上仍成立，但 roll 與 time box 的價值不再只由利率與 dividend 決定。

</details>

## 自我檢核清單

- [ ] 能從現金流表推導 $C - P = (F - X)/(1+rt)$。
- [ ] 能寫出 futures-type settlement、stock-type settlement、股票（含 dividend）三種平價。
- [ ] 能判斷 conversion 或 reversal 並算出利潤。
- [ ] 能用快速近似秒算 combo，並反推隱含利率與 dividend。
- [ ] 能說明 pin risk 的成因與三種對策。
- [ ] 能算出 synthetic futures delta $100/(1+rt)$ 並解釋 conversion 的淨 delta。
- [ ] 能說出 conversion 的 rho 與 dividend 風險方向。
- [ ] 能計算 box、roll、time box，並把它們拆成垂直、日曆、diagonal spread。
- [ ] 能在有 bid-ask spread 的 quote 中找出 straddle 或 butterfly 的最便宜執行方式。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab08_synthetics_arbitrage.py`](../labs/exercises/lab08_synthetics_arbitrage.py)：實作 `parity_residual`、`synthetic_forward_price`、`synthetic_call`、`synthetic_put`、`conversion_profit`、`box_value`、`implied_rate_from_box`、`implied_dividend_pv`、`jelly_roll_value`、`scan_parity_arbitrage`、`conversion_expiry_stock`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab08_synthetics_arbitrage.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab08_synthetics_arbitrage**（[../labs/](../labs/)）：實作 `parity_combo(S or F, X, r, t, D, settlement)`、`implied_rate`、`implied_dividend`、`box_value`、`roll_value`、`time_box_value`，用本章例題 15-1 到 15-11 當測試；再寫一個掃描器，輸入一整條 bid/ask quote 鏈，自動檢查所有 conversion、reversal、box 是否有 arbitrage，並找出 straddle、butterfly 的最便宜執行組合（重現例題 15-12、15-13）。
