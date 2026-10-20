# 第 13 章　風險考量（Risk Considerations）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：理論優勢（theoretical edge）是「猜對時賺多少」，本章問的是「猜錯時被打多痛」。好價差不是順利時賺最多的，而是出事時虧最少的。

**你只需要先記住這 5 件事**

1. **先把 theoretical edge 調到差不多，再比風險。** 優勢會跟著規模放大，不對齊就只是在比誰做得比較大。
2. **看整條損益曲線，不要只看當下的 Greeks。** 例：比率價差（ratio spread）目前 gamma 最小，但大漲時上檔虧損無限，反而虧最多。
3. **損益兩平波動率（breakeven volatility）和你的預估差多少，就是你的容錯空間。** 容錯大就做大，容錯小就做小。跨式（straddle）、勒式（strangle）是容錯最小的結構。
4. **調整 delta 優先用標的（underlying）。** underlying 沒有 gamma、theta、vega，只改 delta。賣出部位（position）一直「再賣選擇權（option）」來調，會越調越大：20×20 的 strangle 兩次調整後變成 168×53。
5. **gamma 的正負號決定你是順勢還是逆勢。** 負 gamma 調整 = 追漲殺跌（順勢）；正 gamma 調整 = 漲賣跌買（逆勢）。

**必背卡**

| 名詞 | 白話意思 |
|---|---|
| 五大風險 | delta（方向）、gamma（大波動）、theta（不動）、vega（波動率（volatility）估錯）、rho（利率） |
| breakeven volatility | 讓 position 理論損益剛好為 0 的 volatility，跟你的預估差距 = 容錯空間 |
| volga | vega 會不會跟著 volatility 變：蝶式（butterfly）為正（升波虧得慢），ratio spread 為負（升波虧得快） |
| 效率 | 正 gamma 要 gamma／theta 大；負 gamma 要小。利率 0、同一 volatility 時所有 position 都一樣 |
| 股票日曆價差（calendar spread） | 買權（call）日曆：利率升有利、股利（dividend）升不利；賣權（put）日曆相反 |
| 流動性 | 短天期、價平（at-the-money, ATM）或略價外（out-of-the-money, OTM）最好成交；option 和 underlying 都冷門最危險 |

**必做練習（約 20 分鐘）**：A1、B4、B5、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[策略損益建構器](https://hongyan1215.github.io/natenberg-course/tools/strategy-builder/)，比較賣 straddle、ratio spread、butterfly 的損益曲線，看哪一邊是無限風險。

---

## 本章定位

theoretical edge 告訴你「如果你對市場的判斷是對的，平均能賺多少」；本章回答另一半問題：「如果判斷錯了，會被傷多重？」我們會用一組自創的評價表，把幾個 theoretical edge 相近的價差並排比較它們對價格、volatility、時間、利率與 dividend 的敏感度，再談效率、調整、交易風格與流動性。前置：[ch09](ch09_risk_measurement_2.md)（volga 等高階 Greeks）、[ch11](ch11_volatility_spreads.md)（波動率價差（volatility spread）分類）、[ch12](ch12_bull_bear_spreads.md)。

## 學習目標

1. 能列出 option position 的五大風險（delta、gamma、theta、vega、rho）並說明各自意義。
2. 能把多個價差調整到 theoretical edge 相近，再比較它們對 underlying 大幅變動與 volatility 變動的損益輪廓。
3. 能計算或解讀 position 的 breakeven volatility，並用 volga 解釋 P&L–volatility 曲線的彎曲方向。
4. 能依容錯空間大小決定 position 規模。
5. 能判斷股票 option calendar spread 的利率（rho）與 dividend 風險方向。
6. 能計算 gamma/theta 效率並說明其限制。
7. 能比較用 underlying 與用 option 調整 delta 的差異，並辨識「越調越大」的陷阱。

## 核心概念

### 13.1 選擇權部位的基本風險

> 💡 **一句話**：position 有五種風險：delta、gamma、theta、vega、rho；正 gamma 一定配負 theta，反之亦然。

| 風險 | 意義 | 誰怕它 |
|---|---|---|
| **delta（方向）風險** | underlying 往某方向走 | 有淨 delta 的 position；delta 中性只在小範圍內有效 |
| **gamma（曲率）風險** | underlying 大幅移動，不論方向 | 負 gamma position；正 gamma position 反而受益 |
| **theta（時間）風險** | 時間流逝而 underlying 沒動 | 正 gamma（=負 theta）position：要問「多久不動就把優勢磨光？」 |
| **vega（volatility）風險** | 模型輸入的 volatility 錯了，或隱含波動率（implied volatility）改變 | 每個 position 都有：正 vega 怕降、負 vega 怕升 |
| **rho（利率）風險** | 利率在 option 存續期間改變 | 通常最不重要，除非 position 大、天期長 |

gamma 與 theta 一體兩面：**正 gamma 必伴隨負 theta，負 gamma 必伴隨正 theta**。

### 13.2 波動率風險：理論優勢相近，風險大不同

> 💡 **一句話**：優勢對齊後，三個價差面對大行情和 volatility 變動的虧損差很多；要看整條損益曲線。

**自創評價表**（期貨（futures） 80、利率 0、近月 42 天、遠月 98 天；你的 volatility 預估 20%；市場 implied volatility 約 23%–24%，所有 option 都偏貴）：

近月（42 天）：

| 履約價（strike price） | call 價格 | call 理論值 | delta | gamma | theta | vega | put 價格 | put 理論值 | delta |
|---|---|---|---|---|---|---|---|---|---|
| 72 | 8.28 | 8.13 | 94 | 2.09 | −0.0073 | 0.031 | 0.28 | 0.13 | −6 |
| 76 | 4.96 | 4.69 | 79 | 5.38 | −0.0189 | 0.079 | 0.96 | 0.69 | −21 |
| 80 | 2.49 | 2.16 | 51 | 7.35 | −0.0258 | 0.108 | 2.49 | 2.16 | −49 |
| 84 | 1.07 | 0.77 | 25 | 5.81 | −0.0204 | 0.086 | 5.07 | 4.77 | −75 |
| 88 | 0.42 | 0.21 | 9 | 2.87 | −0.0101 | 0.042 | 8.42 | 8.21 | −91 |

（gamma 以「每 1 點 delta 變化」表示；theta 每日；vega 每 1 個波動率點（vol point）。同 strike 的 call、put gamma/theta/vega 相同，因為利率 0、futures underlying。）

所有 option 偏貴 → 應找**負 vega** position：賣 straddle/strangle、賣多買少的 ratio spread、買 butterfly、賣 calendar spread。先只看近月，比較三個價差，並把規模調到 theoretical edge 相近：

| 價差 | 組成 | theoretical edge | delta | gamma | theta | vega |
|---|---|---|---|---|---|---|
| 1 賣 straddle | −10 張 80C、−10 張 80P | +6.50 | −27 | −146.9 | +0.515 | −2.16 |
| 2 call ratio spread | +25 張 80C、−50 張 84C | +6.93 | +51 | −107.0 | +0.375 | −1.58 |
| 3 買賣權 butterfly | +85 張 76P、−170 張 80P、+85 張 84P | +6.43 | +41 | −297.5 | +1.043 | −4.38 |

> theoretical edge 不是唯一考量：把價差 2 放大成 100×200，優勢變成約 4 倍，但風險也同步放大。所以先把**優勢對齊**，才能公平比較風險。

**(a) underlying 大幅移動（gamma 風險）**——在 20% volatility 下的理論損益：

| futures | 64 | 68 | 72 | 76 | 80 | 84 | 88 | 92 | 96 |
|---|---|---|---|---|---|---|---|---|---|
| 1 賣 straddle | −110.2 | −70.5 | −32.9 | −3.9 | +6.5 | −5.6 | −34.3 | −71.0 | −110.3 |
| 2 ratio spread | −8.7 | −8.5 | −6.5 | 0.0 | +6.9 | −3.2 | −46.3 | −120.1 | −211.4 |
| 3 butterfly | −88.6 | −82.7 | −58.6 | −16.9 | +6.4 | −12.5 | −49.2 | −74.9 | −85.5 |

- 價差 2 的 gamma 最小，**只在目前條件下**看似最安全；大漲時它的損失其實最大（上檔無限）。下檔損失封頂在開倉付出的 8.75。
- 價差 1 兩邊都無限。
- 價差 3 兩邊都封頂（butterfly 最大損失 = 付出的成本）。

結論取決於你怕什麼：怕暴跌選 2；不能接受任何方向的無限損失選 3。

**(b) volatility 估錯或 implied volatility 變動（vega 風險）**——breakeven volatility：

position 的**breakeven volatility**（= 這個 position 的 implied volatility）是讓理論損益剛好為 0 的 volatility：

| volatility | 10% | 15% | 20% | 25% | 30% | 35% | 40% | 損益兩平（breakeven） |
|---|---|---|---|---|---|---|---|---|
| 1 賣 straddle | +28.1 | +17.3 | +6.5 | −4.3 | −15.1 | −25.9 | −36.7 | ≈23.0% |
| 2 ratio spread | +13.6 | +13.1 | +6.9 | −2.1 | −12.7 | −24.3 | −36.5 | ≈23.75% |
| 3 butterfly | +81.1 | +34.3 | +6.4 | −11.5 | −24.0 | −33.0 | −39.9 | ≈21.5% |

用 volga（vega 對 volatility 的敏感度）解釋曲線形狀：

| position vega @ volatility | 10% | 15% | 20% | 30% | 40% | volga |
|---|---|---|---|---|---|---|
| 1 賣 straddle | −2.16 | −2.16 | −2.16 | −2.16 | −2.16 | ≈0（ATM vega 幾乎不隨 volatility 變） |
| 2 ratio spread | +0.73 | −0.80 | −1.58 | −2.24 | −2.49 | **負**：升波時 vega 更負（虧得更快），降波時 vega 變小甚至轉正（賺不動） |
| 3 butterfly | −12.19 | −7.05 | −4.38 | −2.10 | −1.21 | **正**：升波時虧損速度放緩，降波時獲利加速 |

- 價差 2 breakeven 最高，看似 volatility 風險最小；但 volatility 若大漲到 35%–40%，它的虧損追上賣 straddle；若 volatility 大降，它反而賺得最少。
- 價差 3 一開始升波虧得較快，但 volatility 暴漲時曲線趨平（butterfly 最大虧損有限）；降波時獲利加速。
- 若把橫軸理解為「implied volatility 突然跳動」，價差 3 在兩個極端都表現最好。

**為什麼要這麼在意風險？** 假設某策略一半機率賺 8,000、一半機率虧 6,000，長期期望值（expected value, EV） +1,000。但若你只有 5,000 資本，第一次就碰到虧損便出局，永遠等不到長期平均。交易員就像自己的財務長：穩定的現金流比劇烈擺盪更好管理，**先求不被短期壞運氣淘汰**。

### 13.3 實務考量

> 💡 **一句話**：還要看能不能成交：三腿難執行、量大吃價。經驗法則：straddle、strangle 風險最高。

就 gamma 與 vega 風險而言，價差 3（butterfly）的風險特性最好：兩方向損失有限、volatility 劇變時表現最佳。但它不是在所有情境都最好（例如 underlying 小幅上漲或任何下跌時，價差 2 表現較佳；volatility 溫和上升時價差 2 也有優勢）。而且：

- **三腿 vs 兩腿**：三腿價差較難一次成交，買賣價差（bid-ask）成本較高；分腿執行就要承擔補腿前的市場變動。
- **流動性與規模**：為了讓優勢追上其他價差，butterfly 要做到 85×170×85；若 76/80/84 put 撐不起這個量，後面成交價會越來越差，散戶還要付更多手續費。

若 butterfly 不可行，在賣 straddle 與 ratio spread 之間，**ratio spread 明顯勝出**——它在 underlying 變動（gamma）與 volatility 兩方面都有更大的容錯空間。

**跨月份的三個價差**（遠月 98 天表：80 call/put 價格 3.78、理論值 3.31；88 call 1.30、理論值 0.84；72 put 1.00、理論值 0.63）：

| 價差 | 組成 | theoretical edge | delta | gamma | theta | vega |
|---|---|---|---|---|---|---|
| 4 賣出 put calendar spread | +80 近月 80P、−80 遠月 80P | +11.9 | −57 | +203.3 | −0.713 | −4.56 |
| 5 call 對角價差（diagonal spread） | +75 近月 84C、−75 遠月 88C、−4 口 futures | +11.8 | +4 | +188.3 | −0.660 | −2.09 |
| 6 put 對角 ratio spread | +15 近月 80P、−50 遠月 72P | +13.4 | −17 | −25.8 | +0.090 | −3.05 |

（價差 5 加上 4 口空 futures 讓它接近 delta 中性；futures 沒有 gamma/theta/vega，不改變其他風險。）

- **volatility**：breakeven 約為 4：22.5%、5：24.5%、6：23.75%。價差 5 升波時虧最少，但它是負 volga（vega 在 10% 時轉正），降波時獲利很快就停滯；價差 6 的負 volga 更明顯。價差 4（ATM calendar spread）volga ≈ 0，升降波損益對稱。
- **underlying 變動**：價差 4、5 是正 gamma，大幅移動反而獲利（4 兩邊大致對稱、5 偏向上漲獲利較多；但 5 的 futures 避險（hedge）腿在極端大漲時最終會吃掉 option 部分有上限的獲利）。價差 6 是負 gamma：上漲時仍保有約 +12 的利潤，下跌時利潤迅速消失並轉為大額虧損（futures 64 時約 −170）。
- **時間**（futures 停在 80）：

| 經過天數 | 0 | 7 | 14 | 21 | 28 | 35 | 41 |
|---|---|---|---|---|---|---|---|
| 4 賣出 calendar spread | +11.9 | +6.4 | −0.3 | −8.8 | −20.4 | −38.2 | −71.8 |
| 5 diagonal spread | +11.8 | +7.0 | +1.8 | −3.8 | −9.1 | −12.7 | −10.3 |
| 6 對角 ratio spread | +13.4 | +13.9 | +14.1 | +13.8 | +12.9 | +10.6 | +4.9 |

價差 4 是典型 ATM 賣出 calendar spread：越接近近月到期衰減越快；價差 5 約兩週就磨光優勢，但近到期時衰減轉緩甚至回升；價差 6 一開始還小幅受益於時間，後段才開始衰減。

**沒有電腦時的經驗法則**：**straddle 與 strangle 是所有價差中風險最高的**，不論買或賣。買方以為風險有限就安全，但每天慢慢流血和一次被炸開，痛苦程度可能一樣。它們的容錯空間最小，經驗豐富的交易員會偏好風險特性較好的結構。

### 13.4 要多少容錯空間？

> 💡 **一句話**：反過來用容錯空間決定規模：breakeven 離你的預估越遠，可以做越大。

沒有標準答案：在某些市場 5 個 vol point 是很大的緩衝，在另一些市場幾乎等於沒有。更實用的做法是**反過來用容錯空間決定規模**：

- 你預估 volatility 22%，市場隱含偏低，你找正 vega position。
- 最好的候選 position breakeven volatility 20.5%（容錯只有 1.5 點）→ 小量做，例如 10×20。
- 若同類 position breakeven 在 15%（容錯 7 點），且你認為該市場很少低到 15% → 可以放大到 100×200。

> 規模應反映「出錯前還有多少空間」，而規模本身是相對的：對資本雄厚的老手，100×200 也可能只是小單。

### 13.5 股利與利率

> 💡 **一句話**：同到期時利率、dividend 風險小；calendar spread 兩腿遠期價（forward price）不同，就要注意。

所有 option 同到期時，利率與 dividend 的風險通常不大：它們改變 forward price，但同一個 forward price 同時作用在每個腿上。**calendar spread**則不同——近月與遠月用的是兩個不同的 forward price，對利率與 dividend 的反應不同。

股票 option 的方向（第 7 章）：

| 變化 | call | put |
|---|---|---|
| 利率上升 / dividend 下降 | 上漲 | 下跌 |
| 利率下降 / dividend 上升 | 下跌 | 上漲 |

且影響**對遠月比近月大**。所以買進遠月、賣出近月的 calendar spread：

**例題 13-1**（自創：股價 60、volatility 28%、利率 5%；季配息 0.40，第 3 週起每 13 週一次；近月 7 週、遠月 20 週，兩者之間多一次除息）

| position（各 10 組，60 strike） | 價值 | rho（每 +1% 利率） | dividend 敏感度（每次配息 +0.10） |
|---|---|---|---|
| 多頭 call calendar spread | 18.18 | **+0.71** | **−0.57** |
| 多頭 put calendar spread | 14.72 | **−0.77** | **+0.42** |

- call calendar spread：利率 1%→9% 時價值 15.46→21.11；dividend 0→0.80 時 20.52→15.99。
- put calendar spread：方向相反。

利率與 dividend 風險通常遠小於 gamma、vega 風險，但 position 很大或 dividend 有變動疑慮時（例如公司可能砍息）不能忽略。dividend 沒有專屬的 Greek，可以用電腦對 dividend 做敏感度試算。

### 13.6 什麼是好價差？

> 💡 **一句話**：好價差不是順利時賺最多，而是不利時虧最少的那個。

每個成功的交易員都碰過災難，差別在於能不能活下來。一個 theoretical edge 不錯、各方面容錯都大的價差，最後還是虧錢，並不代表選錯——換成容錯更小的價差，可能虧得更多、甚至無法翻身。

- 通過所有風險測試的價差，theoretical edge 大概小到不值得做。
- **好價差不一定是一切順利時賺最多的，而是情況不利時虧最少的。** 贏的交易自己會照顧自己；不把贏來的錢全部吐回去的輸單一樣重要。

### 13.7 效率（Efficiency）

> 💡 **一句話**：gamma／theta 比可快速比較，但利率 0、同一 volatility 時所有 position 都一樣，用處有限。（可先跳過）

**定義**：用 gamma/theta 比較「報酬與風險」：

- 正 gamma、負 theta：報酬是 gamma（移動時的獲利），風險是 theta（不動時的流失）→ 希望 $|\Gamma/\Theta|$ **越大越好**。
- 負 gamma、正 theta：報酬是 theta，風險是 gamma → 希望 $|\Gamma/\Theta|$ **越小越好**（每收一單位時間價值（time value），承擔越少曲率風險）。

**進階觀察（重要）**：對期貨選擇權（futures option）（利率 0），Black 模型滿足

$$\Theta_{\text{每年}} = -\tfrac12 \sigma^2 F^2 \Gamma$$

這對**每一張** option 都成立，所以只要所有腿都用同一個 volatility 計算，任何 position 的 $|\Gamma/\Theta|$ 都相同！本例 20% 下：

$$\left|\frac{\Gamma}{\Theta_{\text{每日}}}\right| = \frac{2 \times 365}{0.20^2 \times 80^2} = 2.852 \text{（gamma 以每點 delta×100 表示時為 285.2）}$$

價差 1–6 用 20% 計算的效率全部是 285.2。效率之所以會在實務中出現差異，來自：(1) 各腿用自己的 implied volatility 算 Greeks（波動率微笑（volatility smile）使比率不同）；(2) 股票 option 的持有成本（cost of carry）（利率、dividend）讓 theta 多出與 gamma 無關的項；(3) 混用不同 underlying。例如改用各 strike 的市場 implied volatility 計算，價差 1、2、3 的 $|\Gamma/\Theta|$ 分別約為 216、198、247。

所以效率只適合**同到期、優勢相近**的 position 做快速比較；跨月份時 vega 常常才是主要風險，需要更完整的分析。

### 13.8 調整（Adjustments）

> 💡 **一句話**：調 delta 優先用 underlying；一直賣更多 option 來調，position 會越滾越大。

delta 調整的工具不同，副作用也不同：

- **用 underlying 調整**：underlying 沒有 gamma、theta、vega，是「風險中性」的調整——只改 delta，其他風險不變。
- **用 option 調整**：同時改變 gamma、theta、vega，新手常忘記這點。

**例題 13-2　越調越大的陷阱**（futures 120，所有 option 偏貴，賣出 20 組 112/128 strangle，60 天到期、volatility 25%）

1. 開倉：112P delta −23、128C delta +28 → $(-20)(-23) + (-20)(+28) = -100$。
2. 一週後 futures 跌到 115：112P −37、128C +14 → $(-20)(-37) + (-20)(14) = +460$。

三個選擇：(a) 賣約 5 口 futures；(b) 再賣 call；(c) 買賣權。

- 買賣權能同時降低 gamma/vega 風險，但 option 仍偏貴，買進會吃掉 theoretical edge。（買 12 張 112P → 淨賣 8 張：$(-8)(-37) - 280 = +16$）
- 追求優勢的新手會**再賣 33 張 128C**：$(-20)(-37) + (-53)(14) = -2$。
3. 再一週 futures 反彈到 124：112P −12、128C +38 → $(-20)(-12) + (-53)(38) = -1{,}774$。
   追求優勢的做法是再賣 148 張 112P：$(-168)(-12) + (-53)(38) = +2$。

原本只打算做 20×20 的 strangle，兩次調整後變成 168×53。此時若出現劇烈行情，損失被放大好幾倍。

> **規則**：正 gamma/vega position 再買 option、負 gamma/vega position 再賣 option，都會**加大**風險。規模過大時只剩兩條路：(1) **縮小 position**，即使放棄部分優勢；(2) **用 underlying 調整**。新手尤其應避免會擴大 position 規模的調整。願意偶爾吞下自尊、買回先前賣出的 option，交易生涯才會長。

### 13.9 交易風格（A Question of Style）

> 💡 **一句話**：負 gamma 調整是順勢、正 gamma 調整是逆勢，挑配合自己習慣的組合。

純理論交易員假設價格隨機，不該有方向偏好；但很多人是從 underlying 交易起家，帶著「順勢」或「逆勢」的習慣。gamma 的符號決定了 delta 調整的方向：

| position | underlying 上漲時 delta | 為維持中性要做的調整 | 調整的性質 |
|---|---|---|---|
| 負 gamma（如賣 straddle） | 變負 | 買 underlying | **順勢**（漲追買、跌追賣） |
| 正 gamma（如買 straddle） | 變正 | 賣 underlying | **逆勢**（漲賣、跌買） |

搭配方式：

- **喜歡順勢**：正 gamma + 少調整（讓 position 自己跟著趨勢累積 delta），或負 gamma + 勤調整。
- **喜歡逆勢**：負 gamma + 少調整（position 本身就在押回檔），或正 gamma + 勤調整（每次調整都是逆勢獲利機會）。

### 13.10 流動性（Liquidity）

> 💡 **一句話**：進場前先問「我願意抱到到期嗎？」冷門市場要求更大的優勢。

每個未平倉 position 都有風險；要消除風險，通常得回市場買回空單、賣出多單（偶爾可透過提前履約（early exercise）或與反向 position 組成套利（arbitrage））。

- 流動性高的市場風險較低；含任何一腿冷門 option 的價差，風險就較高。進場前先問：**我願意一路抱到到期嗎？** 若是長天期且很冷門，你可能「與這個 position 綁在一起」很久，因此應要求更大的 theoretical edge 作為補償。
- 新手宜從流動市場開始，犯錯時容易出場；老練的做市（market making）者反而偏好冷門市場，因為 bid-ask spread 寬、每筆優勢大——前提是很少犯錯。
- 一般規律：**短天期、ATM 或略 OTM**的 option 最活躍、價差最窄；越長天期、越深價內（deep in-the-money, deep ITM），價差越寬、成交越稀。
- 也要看**underlying**流動性：option 冷門但 underlying 活絡，至少還能用 underlying 調整；兩者都冷門的市場最危險。

**示意表**（自創，指數 2,000 點）：

| strike | 近月 call bid–ask | 寬度 | 遠月 call bid–ask | 寬度 |
|---|---|---|---|---|
| 1,600（deep ITM） | 398.0–404.0 | 6.0 | 410.0–420.0 | 10.0 |
| 1,900 | 112.0–114.5 | 2.5 | 175.0–181.0 | 6.0 |
| 2,000（ATM） | 41.5–42.5 | 1.0 | 112.0–115.0 | 3.0 |
| 2,100 | 9.6–10.2 | 0.6 | 64.0–66.5 | 2.5 |

## 交易員視角

- **Optibook 的部位上限（position limit）就是你的「資本」**：例題 13-2 的越調越大，在 Optibook 上會先撞到 position limit，之後被迫用不利價格縮倉——這正是「強迫平倉永遠不會賺錢」的縮影。調整 delta 優先用 underlying（股票、futures 或 ETF），它不吃 option position 額度、也不改 gamma/vega。
- **market making position 的風險報表**：至少每個迴圈計算總 delta、gamma、vega，並掃描「underlying ±10%」「implied volatility ±5 點」的情境損益（就是本章的兩張表）。只看當下 Greeks 會低估負 volga、負 gamma position 的尾端風險。
- **分腿執行風險**：三腿 butterfly 在 Optibook 只能逐腿下單；第一腿成交後馬上用 IOC 補其他腿，或考慮能達到類似效果的兩腿結構。
- **流動性**：Optibook 上冷門 strike 的委託簿常是空的（記得檢查 `book.bids` 是否存在）。在那種地方開大 position，等於承諾持有到期。

## 常見誤區

1. **誤解**：「theoretical edge 最大的價差最好。」→ **正解**：優勢可以靠放大規模做大；先把優勢對齊再比較風險，好價差是出錯時虧最少的那個。
2. **誤解**：「目前 gamma 最小的 position，大行情時風險也最小。」→ **正解**：Greeks 只描述現況；要看整條損益曲線（例如 ratio spread 的上檔風險無限）。
3. **誤解**：「買 straddle/strangle 風險有限，所以很安全。」→ **正解**：每天流血的總損失可能與一次爆掉一樣大；straddle、strangle 是容錯最小的結構。
4. **誤解**：「調整 delta 時賣更多偏貴的 option，一舉兩得。」→ **正解**：會讓負 gamma/vega position 越滾越大，最終被一次大行情擊垮。
5. **誤解**：「gamma/theta 效率能精準排序所有 position。」→ **正解**：同一 volatility、利率 0 時所有 futures option position 效率都一樣；差異主要來自 volatility smile 與 cost of carry，跨月份時 vega 更重要。
6. **誤解**：「利率、dividend 只影響單一 option，價差會互相抵消。」→ **正解**：calendar spread 兩腿用不同 forward price，對利率、dividend 的敏感度不會抵消。

## 重點摘要

| 主題 | 要點 |
|---|---|
| 五大風險 | delta、gamma、theta、vega、rho；gamma 與 theta 符號相反 |
| 比較方法 | 先調規模使 theoretical edge 相近，再看「損益–價格」「損益–volatility」「損益–時間」三張圖 |
| breakeven volatility | 讓 position 理論損益為 0 的 volatility；與你的預估差距 = 容錯空間 |
| volga | ≈0：損益–volatility 近直線（ATM straddle、ATM 日曆）；負：升波加速虧、降波賺不動（ratio spread、diagonal spread）；正：反之（butterfly） |
| 規模 | 容錯大 → 可做大；容錯小 → 做小 |
| calendar spread（股票） | call 日曆：rho +、dividend −；put 日曆：rho −、dividend + |
| 效率 | 正 gamma 要 $|\Gamma/\Theta|$ 大；負 gamma 要小；利率 0、同 volatility 時全部相同 |
| 調整 | underlying 調整只改 delta；option 調整改所有 Greeks；避免越調越大 |
| 風格 | 負 gamma 調整 = 順勢；正 gamma 調整 = 逆勢 |
| 流動性 | 短天期、ATM/略 OTM 最活躍；option 與 underlying 都冷門最危險 |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B4、B5、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ 為什麼要先把幾個候選價差的 theoretical edge 調到相近，才比較它們的風險？

<details><summary>提示</summary>

想想：把同一個價差做 2 倍，theoretical edge 會怎樣？風險又會怎樣？

</details>

<details><summary>解答</summary>

theoretical edge 與規模成正比：任何價差放大 N 倍，優勢也放大 N 倍。若不對齊，「優勢大」可能只是因為規模大，而風險也同步放大。對齊後，比較的才是「每單位預期報酬承擔了多少、什麼樣的風險」。

</details>

**A2.** ATM 賣 straddle 的損益–volatility 曲線幾乎是直線，而 butterfly 的曲線向上彎（凸）。請用 volga 解釋。

<details><summary>解答</summary>

ATM option 的 vega 幾乎不隨 volatility 改變，volga ≈ 0，所以損益隨 volatility 線性變化。butterfly 是買兩翼、賣 ATM：升波時兩翼 vega 增加、抵銷賣出 ATM 的負 vega，position vega 變得較不負；降波時兩翼 vega 縮小，position vega 更負。也就是 position volga 為正，損益曲線呈凸形：升波虧得越來越慢、降波賺得越來越快。

</details>

**A3.** 負 gamma position 的交易員若「勤於調整 delta」，他實際上是在順勢還是逆勢交易？

<details><summary>解答</summary>

順勢。負 gamma 在上漲時 delta 變負，要買 underlying 才能回到中性；下跌時 delta 變正，要賣 underlying。每次調整都是追漲殺跌。

</details>

**A4.** 為什麼用 underlying 調整 delta 被稱為「風險中性」的調整？

<details><summary>解答</summary>

underlying（股票、futures）的 gamma、theta、vega 都是 0，加減 underlying 只改變 delta，其他風險特性維持不變。用 option 調整則會同時改變 gamma、theta、vega。

</details>

**A5.** 為什麼老練的 market making 者可能偏好冷門市場，而新手被建議從熱門市場開始？

<details><summary>解答</summary>

冷門市場 bid-ask spread 寬，market making 者每筆成交的 theoretical edge 大；但一旦做錯，很難以合理價格出場。新手犯錯機率高，在流動市場比較容易認錯止損；老手被期待少犯錯，所以能承受冷門市場的出場困難以換取較大優勢。

</details>

**A6.** 一位股票 option 交易員持有大量 call calendar spread（買遠月、賣近月），並預期公司下季會提高 dividend。這對他是好消息還是壞消息？

<details><summary>解答</summary>

壞消息。dividend 上升使 call 價值下降，且遠月（包含更多次除息）下降更多，所以多頭 call calendar spread 的 dividend 敏感度為負。

</details>

### B. 計算題

**B1.** 某策略 50% 機率賺 9,000、50% 機率虧 7,000。expected value 是多少？若資本只有 6,000，第一次就虧損會發生什麼事？

<details><summary>解答</summary>

expected value = 0.5×9,000 − 0.5×7,000 = +1,000。資本 6,000 < 單次最大虧損 7,000，第一次虧損就破產，expected value 再好也實現不了。

</details>

**B2.** 某 futures option position（利率 0）在 volatility 25%、futures 120 下 gamma（以每點 delta 表示）為 −0.80。用 $\Theta_{\text{每年}} = -\tfrac12\sigma^2F^2\Gamma$ 求每日 theta。（gamma −0.80 指每點 delta 變化 −0.80 個 delta 單位，即 −0.008 口 underlying）

<details><summary>解答</summary>

Γ（以 underlying 口數計）= −0.008。$\Theta_{\text{年}} = -0.5 \times 0.0625 \times 14{,}400 \times (-0.008) = +3.60$。每日 = 3.60/365 ≈ **+0.00986**。

</details>

**B3.** 承 B2，該 position 的效率 $|\Gamma/\Theta_{\text{每日}}|$（gamma 以每點 delta 單位表示）是多少？若另一個同 underlying、同 volatility 的 position gamma −2.40，效率是多少？

<details><summary>解答</summary>

0.80 / 0.00986 ≈ 81.1。另一 position gamma 三倍、theta 也三倍（0.0296），效率仍 ≈ 81.1。等於 $2\times365/(\sigma^2F^2)\times(1/100)$ 換算：$730/(0.0625\times14{,}400)=0.811$，乘以 100 得 81.1。同 volatility、利率 0 下效率與 position 無關。

</details>

**B4.** ⭐ 賣出 20 組 strangle，put delta −30、call delta +25。position delta？若想只用 call 調回中性，要再賣幾張 call？

<details><summary>提示</summary>

position delta = 口數 × 每張 delta 加總，賣出記負號：(−20)(−30) + (−20)(+25)。再設要多賣 n 張 call，讓總和 = 0。

</details>

<details><summary>解答</summary>

delta = (−20)(−30) + (−20)(25) = 600 − 500 = +100。再賣 n 張 call：100 − 25n = 0 → n = 4。總共賣 24 張 call、20 張 put。

</details>

**B5.** ⭐ 承 B4，之後 underlying 上漲，put delta −15、call delta +40。position delta？若要只用 put 調回中性，要再賣幾張 put？調整後 position 規模是多少？

<details><summary>提示</summary>

注意 call 現在已經是 24 張（B4 調整後）。用新的 delta 重算 position delta，再設多賣 m 張 put 讓總和 = 0，最後看 put、call 各幾張。

</details>

<details><summary>解答</summary>

delta = (−20)(−15) + (−24)(40) = 300 − 960 = −660。再賣 m 張 put：−660 + 15m = 0 → m = 44。position 變成 64 張 put × 24 張 call，遠大於原本的 20×20。

</details>

**B6.** 依例題 13-1，持有 30 組多頭 call calendar spread（每 10 組 rho +0.71、dividend 敏感度每 +0.10 為 −0.57）。若利率上升 0.5% 同時每次配息提高 0.05，position 價值大約變動多少？

<details><summary>解答</summary>

30 組 = 3 × 10 組。利率：3 × 0.71 × 0.5 = +1.065。dividend：3 × (−0.57) × 0.5 = −0.855。合計 ≈ **+0.21**。

</details>

### C. 交易情境題

**C1.** ⭐ 你預估某 futures volatility 22%，市場隱含 19%。最佳的正 vega position 是某個 1×2 call backspread，你算出它的 breakeven volatility 是 20.5%。另一個市場的類似 position breakeven 在 14%，而該市場過去三年實現波動率（realized volatility）從未低於 16%。你各要做多大？

<details><summary>提示</summary>

先各自算「你的預估 − breakeven volatility」= 容錯幾個點。再想：哪個市場跌到 breakeven 以下的機會比較小？

</details>

<details><summary>解答</summary>

第一個 position 容錯只有 22 − 20.5 = 1.5 個 vol point，應小量做（例如 10×20），甚至考慮放棄。第二個 position 容錯 8 點，且歷史上從未跌破 16%，可以放大規模（例如 50×100 以上，視資本與 position limit 而定）。規模反映容錯空間，而不是只看 theoretical edge。

</details>

**C2.** 你在 Optibook 賣出 40 組 ATM straddle，underlying 連續兩天下跌，position delta 已變成 +350，而你的 option position 已接近交易所上限。所有 option 仍偏貴。你會怎麼調整？

<details><summary>解答</summary>

不要再賣 call（會擴大負 gamma/vega，且很快撞上 position limit）。最佳選擇是用 underlying 調整：賣出約 3–4 口 underlying（或對應股數）使 delta 回到附近 0，不改變 gamma/vega，也不佔 option 額度。若認為風險已過大（例如一次大跌就超出可承受損失），應主動買回部分 straddle 縮小規模，即使犧牲部分 theoretical edge。

</details>

### D. 挑戰題

**D1.** (a) 從 Black 模型的偏微分方程（利率 0）$\frac{\partial V}{\partial t} + \tfrac12\sigma^2F^2\frac{\partial^2V}{\partial F^2} = 0$ 推導 $\Theta = -\tfrac12\sigma^2F^2\Gamma$（$\Theta$ 為每年 time value 流失，$t$ 為日曆時間）。(b) 說明為什麼股票 option（利率 $r>0$、無 dividend）的效率會因 position 不同而不同。（提示：股票 option 的 PDE 為 $\Theta + \tfrac12\sigma^2S^2\Gamma + rS\Delta - rV = 0$）

<details><summary>解答</summary>

(a) $\Theta \equiv \partial V/\partial t$（日曆時間前進的價值變化），代入 PDE 直接得 $\Theta = -\tfrac12\sigma^2F^2\Gamma$。此式對每張 option、也對任何線性組合成（synthetic）立，所以組合的 $\Gamma/\Theta = -2/(\sigma^2F^2)$ 與組合內容無關。
(b) 股票時 $\Theta = -\tfrac12\sigma^2S^2\Gamma - rS\Delta + rV$。多出的 $-rS\Delta + rV$ 與 gamma 無關（反映持有股票與 option 的資金成本差異），因此不同 position 即使 gamma 相同，theta 也可能不同，效率因而不同。例如 deep ITM call 的 $-rS\Delta + rV \approx -rK$，使 theta 明顯為負，即使 gamma 很小。

</details>

## 自我檢核清單

- [ ] 能說出五大風險並舉出最怕各風險的 position。
- [ ] 能把多個價差調到 theoretical edge 相近，並說明為什麼要這樣做。
- [ ] 能讀懂「損益–價格」「損益–volatility」「損益–時間」三張圖，指出無限風險在哪一邊。
- [ ] 能用 volga 解釋損益–volatility 曲線的彎曲方向。
- [ ] 能依容錯空間決定 position 規模。
- [ ] 能判斷股票 calendar spread 的 rho 與 dividend 敏感度符號。
- [ ] 能計算效率並說明它在同 volatility、利率 0 時為何失去鑑別力。
- [ ] 能說明為什麼調整時應避免擴大 position 規模。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab07_spreads.py`](../labs/exercises/lab07_spreads.py)：實作 `make_leg`、`straddle`、`strangle`、`vertical_spread`、`butterfly`、`calendar_spread`、`ratio_spread`、`position_value`、`position_greeks`、`classify_spread`、`delta_neutral_ratio`、`breakeven_volatility`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab07_spreads.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab07_spreads**（[../labs/](../labs/)）：用本章評價表參數（futures 80、近月 42 天、遠月 98 天、預估 20%、隱含約 23%）建立價差 1–6，重現三張情境表（價格、volatility、時間），並用求根法算出每個 position 的 breakeven volatility；再驗證所有 position 在 20% 下的 $|\Gamma/\Theta|$ 都等於 $2\times365/(\sigma^2F^2)$。
