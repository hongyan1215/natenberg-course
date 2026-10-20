# 第 17 章　用選擇權避險（Hedging with Options）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：選擇權（option）就是保險。買 option = 付保費買保單（履約價（strike price）離現價多遠就是自負額）；賣 option = 收一點錢換有限的保護。每種避險（hedge）都是「放棄一些好處，換掉一些風險」。

**你只需要先記住這 5 件事**

1. **保護一定有成本。** 現金保費、放棄的上檔，或某些情境下的額外風險，總要付一種。
2. **保護性選擇權（protective option）：持股 + 買賣權 = 合成（synthetic）買權（call）。** 最大損失 = (現價 − strike) + 保費。例：持股 120、買 110P 付 2.40 → 最多虧 12.40。
3. **掩護性賣出（covered write）：持股 + 賣 call = synthetic 賣出賣權（put）。** 只保護到「股價 − 權利金（premium）」，再跌下去照樣虧；上檔被封頂。
4. **領口（collar） = 持股 + 買賣權 + 賣 call = 多頭垂直價差（vertical spread）。** 上下都有限；兩張 premium 相等就是零成本 collar。
5. **隱含波動率（implied volatility）高 → 買越少越好、賣越多越好；低 → 反過來。** 用 delta 決定保護比例：想保一半就湊 −50 delta。另外，波動小本身就有價值：長期複利 ≈ 算術平均 − 變異數 ÷ 2。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 保護性賣權（protective put）最大損失 | (股價 − strike) + 保費 |
| 掩護性 call 保護到 | 股價 − premium |
| 掩護性 call 最大獲利 | strike − 股價 + premium |
| collar 最大損失／獲利 | 股價 − put strike ± 淨成本／call strike − 股價 ± 淨成本 |
| 現金擔保 put（歐式）存款 | strike ÷ (1 + rt) |
| 投資組合保險持股 | 虛擬 call delta × 原始持股 |

**必做練習（約 20 分鐘）**：A2、B2、B4、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[策略損益建構器](https://hongyan1215.github.io/natenberg-course/tools/strategy-builder/)，組「買股票 + 買賣權 + 賣 call」，看 collar 的損益線是不是跟多頭 vertical spread 一樣。

---

## 本章定位

期貨（futures）與 option 最初都是保險契約：把持有標的（underlying）的風險轉給別人。futures 幾乎把全部風險轉出，option 只轉出一部分，因此更像傳統保單。本章從 hedge 者的角度出發：protective option、covered write、collar、結合波動率（volatility）判斷的進階 hedge、降低報酬波動的價值，以及用動態避險（dynamic hedging）「自製」option 的投資組合保險。前置：[ch08](ch08_dynamic_hedging.md)（dynamic hedging）、[ch12](ch12_bull_bear_spreads.md)（vertical spread）、[ch14](ch14_synthetics.md)（合成部位（synthetic position））。

## 學習目標

1. 能分辨自然多頭與自然空頭，並說明任何 hedge 都是「放棄某些情境的利益，換取另一些情境的保護」。
2. 能計算保護性買權（protective call）/put 的成本、最差結果，並指出它等價於哪個合成選擇權（synthetic option）。
3. 能計算 covered write 的保護範圍、最大獲利，以及現金擔保 put 所需的存款。
4. 能建構 collar 並說明它等價於 vertical spread、其 Greeks 由 strike 位置決定，並找出零成本 collar。
5. 能依 implied volatility 高低選擇「買少賣多」或「買多賣少」的 hedge 結構，並用 delta 決定 hedge 比例。
6. 能用算術平均、幾何（複利）報酬、標準差（standard deviation）與夏普比率說明降低波動的價值。
7. 能說明投資組合保險（option 複製）的做法與 1987 年失效的原因。

## 核心概念

### 17.1 避險者與避險成本

> 💡 **一句話**：先搞清楚自己是自然多頭還是空頭；每個 hedge 都是放棄某些好處、換取某些保護。

**自然多頭與自然空頭**（natural long / natural short）：
- 商品生產者是自然多頭（價格漲，賣得多）；使用者是自然空頭（價格跌，買得便宜）。
- 利率方面：放款者是自然多頭（利率升有利），借款者是自然空頭。
- 也有人是自願建立部位（position）後想暫時降低風險：投機者、或預期短期下跌但不想賣出持股的基金經理（hedge 可能比賣出再買回便宜）。

**hedge 有成本**，可能是明顯的現金支出，也可能是喪失的獲利機會或某些情境下的額外風險。**每一個 hedge 決策都是取捨**：多頭 hedge 者想保護下檔，幾乎一定要放棄部分上檔；空頭 hedge 者想保護上檔，就要放棄部分下檔。

### 17.2 保護性買權與賣權（Protective Calls and Puts）

> 💡 **一句話**：買 option 當保險：strike 距離是自負額、premium 是保費；持股 + 買賣權 = synthetic call。

最簡單的 hedge：多頭部位（long position）買賣權、空頭部位（short position）買 call。
- strike 與現價的距離 ≈ 保單的**自負額**；
- option 價格 ≈ **保費**。

**例題 17-1**（自創）台灣某公司 6 個月後要支付 US$2,000,000 貨款，等於持有美元的 short position（美元升值就要付更多台幣）。現在 USD/TWD = 31.50。

- 若美元 6 個月後仍 31.50：成本 NT$63,000,000；升到 32.80：NT$65,600,000。
- **hedge**：買 6 個月、名目 US$2,000,000 的 32.00 美元 call，premium 0.30 → 保費 NT$600,000。
  - 到期美元 > 32.00：履約（exercise），以 32.00 買美元；含保費最多每美元 32.30，總成本上限 **NT$64,600,000**。
  - 到期美元 < 32.00：放棄 exercise，在市場買。例如 30.80：付 61,600,000 + 600,000 = **NT$62,200,000**，仍保留美元貶值的好處。

不同 strike 的取捨：

| 美元 call | premium | 保費（NT$） | 完全保護的起點 |
|---|---|---|---|
| 31.50 | 0.55 | 1,100,000 | 31.50 以上 |
| 32.00 | 0.30 | 600,000 | 32.00 以上 |
| 32.50 | 0.15 | 300,000 | 32.50 以上（之前自負） |

**利率版：上限（cap）與下限（floor）**
- 浮動利率借款者（利率空頭）買**利率 call = cap**：利率再高，借款成本不超過 exercise 利率。
- 浮動利率放款者（利率多頭）買**利率 put = floor**：利率再低，收益不低於 exercise 利率。

**synthetic 觀點**（第 14 章）：

$$\text{空頭標的} + \text{買買權} \approx \text{合成買賣權}$$
$$\text{多頭標的} + \text{買賣權} \approx \text{合成買買權}$$

例題 17-1 的公司（空美元 + 買 32.00 美元 call）等於持有一張 32.00 美元 put：上檔風險有限、下檔獲利開放。

```
多頭標的 + 保護性賣權 = 合成買權
損益│            ／
    │          ／
  0 │--------／------  標的
    │_______／  ← 最大損失 = (現價 − 履約價) + 保費
           X
```

選哪個 strike 取決於 hedge 者能承受的風險，但有一點確定：**保護一定有成本**。

### 17.3 掩護性賣出（Covered Writes）

> 💡 **一句話**：賣 option 收 premium，只保護到 premium 那麼多、上檔被封頂；持股 + 賣 call = synthetic 賣出 put。

不想付保費的 hedge 者，可以**賣出** option 對抗既有 position：立即收到 premium，提供**有限**保護，但不再有確定的最大損失。

**例題 17-2**（股價 80，3 個月，volatility 25%，利率 0）持股者擔心短期下跌：

| 賣出 | 收入 | 保護到（損益兩平（breakeven）） | 上檔 | 時間價值（time value） |
|---|---|---|---|---|
| 75C（價內（in-the-money, ITM）） | 6.87 | 73.13 | 被以 75 叫走；最多賺 1.87 | 1.87 |
| 85C（價外（out-of-the-money, OTM）） | 2.08 | 77.92 | 漲到 85 前都參與；最多賺 7.08 | 2.08 |

- ITM：保護多、上檔少；OTM：保護少、上檔多。
- 價平（at-the-money, ATM）：time value 最大，市場不動時增值最多，是最常見的選擇。

**synthetic 觀點**：

$$\text{多頭標的} + \text{賣買權} \approx \text{合成賣賣權}$$
$$\text{空頭標的} + \text{賣賣權} \approx \text{合成賣買權}$$

持股 + 賣 85C ≡ 賣 85P。

**Buy/write**：同時買股票、賣 call，可以當成單一價格報價（quote）（股價 − call 價）。股價 80、85C 2.08 → 85 buy/write = 77.92；做市（market making）者可能報 77.82–78.02（77.82 願意買股 put；78.02 願意賣股 call）。交易所甚至編製追蹤此策略的指數（例如每月賣出略 OTM 一個月指數 call 的 buy/write 指數）。

**用賣出 option 設定目標價**：
- 持股者願意在 85 賣出 → 賣 85C：漲到 85 就被叫走（本來就想賣），沒漲到則白賺 premium。
- 想在 70 買進的人 → 賣 70P：跌破 70 就被指派（assign / assignment）買進（本來就想買），沒跌則白賺 premium。公司買回庫藏股也常用這招。
- 差別在**擔保**：賣 call 以持股擔保；賣 put 需要**現金擔保**（cash-secured put），存入 strike；若是歐式不會提前履約（early exercise），只需存 strike 的現值 $X/(1+rt)$。例：70P、6 個月、利率 4% → 70/1.02 = **68.63**。

**買保護還是賣掩護？** 理論上與交易員一樣：比較價格與價值。implied volatility 偏低 → 買 protective option；偏高 → 賣掩護性 option。但實務常更重要：若某價位以外的行情會威脅公司生存，就該買那個 strike 的保護，即使理論上偏貴。（option 看起來「貴得離譜」時通常有原因。）

許多 hedge 者嫌保費「多半白付」——的確，大多數 protective option 到期都沒價值。但大多數人仍為房子、汽車買保險，而絕大多數保單也從未理賠；人們買保險是為了安心，不是為了賺錢。需要明確保護時，買 option 可能就是最好的選擇。

### 17.4 領口（Collars）

> 💡 **一句話**：買保護、賣掩護，就是一個 vertical spread：上下都有限，premium 互抵就是零成本 collar。

**同時買 protective option、賣掩護性 option**：以低成本取得明確保護，同時保留部分有利行情。又稱 fence、tunnel、cylinder、range forward、split-strike conversion。

- **多頭 collar**：多頭 underlying + 買賣權 + 賣 call。
- **空頭 collar**：空頭 underlying + 買 call + 賣 put。

**例題 17-3**　持股 80，買 75P（1.87）、賣 85C（2.08）：淨收 0.21。

| 到期股價 | 損益 |
|---|---|
| ≤ 75 | 75 − 80 + 0.21 = **−4.79**（下限） |
| 80 | +0.21 |
| ≥ 85 | 85 − 80 + 0.21 = **+5.21**（上限） |

**synthetic 觀點**：多頭 underlying + 買 75P = synthetic 75C；再賣 85C → **75/85 多頭 call vertical spread**。空頭 collar = 空頭 vertical spread。兩者都是有限風險、有限報酬。

既然是 vertical spread，就有第 12 章的特性：
- 多頭 collar delta 恆正，空頭 collar delta 恆負。
- underlying 較靠近**保護性** option → 通常正 gamma、負 theta、正 vega；較靠近**掩護性** option → 負 gamma、正 theta、負 vega。

| 股價 | delta | gamma | theta（每日） | vega |
|---|---|---|---|---|
| 76（靠近 75P） | +0.36 | +0.012 | −0.006 | +0.042 |
| 80（中間） | +0.38 | −0.003 | +0.002 | −0.011 |
| 84（靠近 85C） | +0.35 | −0.014 | +0.009 | −0.063 |

兩邊都不太遠時，Greeks 互相抵銷得很小；也可以刻意挑 strike 讓 collar 接近 gamma、theta 或 vega 中性。

**零成本 collar**：protective option 價格 = 掩護性 option 價格。本例要讓賣出 call 也收 1.87，strike 約 **85.8**。保護性較貴時，損益中段落在 underlying 損益線**之下**；較便宜時（本例淨收 0.21）落在**之上**。

**基本 hedge 策略總表**：

| position | hedge | 優點 | 缺點 |
|---|---|---|---|
| 多頭 underlying | 賣 futures/遠期 | 無下檔風險 | 無上檔獲利 |
| | 買 protective put | 下檔有限、上檔無限 | 保費 |
| | 賣掩護性 call | 部分下檔保護（= premium） | 下檔仍無限、上檔有限 |
| | 多頭 collar | 下檔有限 | 上檔有限 |
| 空頭 underlying | 買 futures/遠期 | 無上檔風險 | 無下檔獲利 |
| | 買 protective call | 上檔有限、下檔獲利無限 | 保費 |
| | 賣掩護性 put | 部分上檔保護（= premium） | 上檔仍無限、下檔獲利有限 |
| | 空頭 collar | 上檔有限 | 下檔獲利有限 |

### 17.5 進階避險策略（Complex Hedging Strategies）

> 💡 **一句話**：implied volatility 高就少買多賣、低就多買少賣，用 delta 決定保護比例。

多數 hedge 者不是專業 option 交易員，最常用的是單一 option。若願意分析 volatility 與 delta，就能設計更多樣的 hedge。先問三件事：

1. 需要防範**最壞情境**（災難保險）嗎？
2. 要消除目前方向風險的**多少比例**？
3. 願意承擔哪些**額外風險**？

**需要災難保險** → 只能買 option，剩下的問題是買哪個 strike、買幾張。

**例題 17-4　implied volatility 偏高時**（futures 100、3 個月；你認為合理 volatility 24%，市場隱含 30%）。多頭 hedge 者想保留一半多頭，即用總 delta −50 的 put hedge：

| 方案 | 總 delta | 理論上多付 |
|---|---|---|
| 買 1 張 100P（delta −47） | −47 | 1.19 |
| 買 2 張 92P（各 −26.4） | −52.8 | 2 × 0.94 = 1.89 |

買越多張高估的 option，多付越多。若完全不在乎上檔，而 option 偏貴，乾脆用 futures/遠期 hedge；要保留上檔，就盡量買少：想消除 75% 風險，買 1 張 delta −75 的 put，而不是 3 張 −25 的。

> **原則**：其他條件相同，**implied volatility 高 → 買越少越好、賣越多越好；implied volatility 低 → 買越多越好、賣越少越好。**

**比率賣出（ratio write）的代價**：隱含偏高時，若 hedge 者願意承擔掩護性 call 的下檔風險，理論上可以賣多張 OTM call 湊出 delta 50（而非 1 張 ATM）。但賣出的 call 超過持股，上檔也變成無限風險——大漲時所有 call 都會被 assign。多數 hedge 者只願意在「自然 position 的方向」承擔無限風險；兩邊都無限風險就是在做 volatility 交易了。這沒有錯，但真正的 hedge 者別忘了初衷：保護既有 position、壓低保護成本。

**用 1:1 波動率價差（volatility spread）hedge**：以 delta 選擇日曆價差（calendar spread）或蝶式（butterfly），提供某價格區間內的部分保護（整體仍保留無限的上檔風險與下檔獲利）。

- **隱含偏低**、underlying 100、保護**空頭** position：買 110 call calendar spread（買遠月、賣近月），正 delta 且低隱含使多頭 calendar spread 便宜。若 delta +25，想保護 50% → 每單位空頭 underlying 買 2 組。
- **隱含偏高**：改賣 calendar spread，就要選**較低** strike 才有正 delta：賣 90 call calendar spread（買近月、賣遠月）。delta +25、想保護 75% → 每單位賣 3 組。

**用 vertical spread hedge**：以 ATM option 為核心（第 12 章）。保護**多頭** position 要用空頭 vertical spread（買高、賣低）：
- 隱含偏高：**賣出 ATM**、買較高 strike（例如賣 100、買 110）。
- 隱含偏低：**買進 ATM**、賣較低 strike（例如買 100、賣 90）。

兩者都有負 delta，且因 ATM option 對 volatility 最敏感，都帶正理論優勢（theoretical edge）。

選擇太多會讓 hedge 者想放棄 option。較好的做法：挑 4–5 個合理策略，依自己的市場看法與願意承擔的風險比較風險報酬特性，再做決定。

### 17.6 以避險降低波動（Hedging to Reduce Volatility）

> 💡 **一句話**：波動越大，長期複利被拖得越多；平均報酬最高的人不一定最後賺最多。

hedge 除了防範不利行情，還能**降低 position 的波動**——這本身就有價值。

**例題 17-5**（自創，五年年報酬）

| 經理人 | 第 1 年 | 第 2 年 | 第 3 年 | 第 4 年 | 第 5 年 | 算術平均 | 五年總報酬 | standard deviation | 夏普比率 |
|---|---|---|---|---|---|---|---|---|---|
| A | +16% | −10% | +24% | −6% | +18% | 8.40% | **+43.59%** | 15.32% | 0.548 |
| B | +30% | −24% | +36% | −20% | +28% | 10.00% | +37.59% | 29.39% | 0.340 |
| C | +45% | +10% | −38% | +70% | −30% | 11.40% | +17.68% | 46.69% | 0.244 |
| D | +7.8% | +7.8% | +7.8% | +7.8% | +7.8% | 7.80% | **+45.58%** | 0 | — |

（總報酬 = 各年 (1 + 報酬) 連乘 − 1；standard deviation 為樣本 standard deviation。）

- C 的算術平均最高，五年下來卻最差：A 的總報酬比 C 多約 26 個百分點。
- 無聊的 D 平均最低，總報酬卻最高。
- 原因：複利成長率約等於 **算術平均 − 變異數/2**。波動越大，這個「波動拖累」越大。例如 C：$0.114 - 0.4176^2/2 \approx 2.7\%$/年（實際幾何平均約 3.3%）。

高波動也不是不能接受——只要平均報酬夠高來補償。這種取捨常用**夏普比率**（Sharpe ratio）衡量：

$$\text{Sharpe} = \frac{\text{平均報酬}}{\text{報酬標準差}}$$

（實務上常用超額報酬，即扣除無風險利率後的報酬。）越大代表每單位風險換到越多報酬。

### 17.7 投資組合保險（Portfolio Insurance）

> 💡 **一句話**：沒有 option 就用 dynamic hedging 自製；但 1987 年證明它在最需要時最貴。

**情境**：持有股票，想買 protective put，但市場上沒有這檔股票的 option。

持股 + put ≡ call。所以你真正想要的是**一張同 strike、同到期的 call position**——那就用 dynamic hedging**複製**它：

1. 自訂 strike 與到期日（expiration date）（沒有掛牌限制）；股價、利率取自市場；volatility 用歷史資料估計。
2. 用模型算出這張「虛擬 call」的 delta，把持股調整到 delta × 原始持股。
3. 定期重算 delta、調整持股；expiration date 買回到 100%。

**例題 17-6**　持有 2,000 股。
- 虛擬 call delta 0.70 → 持股應為 1,400 股 → 賣出 600 股。
- 之後股價下跌，delta 降為 0.58 → 持股應為 1,160 股 → 再賣 240 股。
- 股價回升時 delta 上升 → 買回。持續到到期。

這就是第 8 章的 dynamic hedging，只是目的不同：第 8 章是捕捉市場價格與理論值的差；這裡沒有 option 可以買賣，而是**複製 option 的特性**，理論上達到與買 protective put 相同的結果。

**基金規模的應用**：$2 億美元的投資組合，想保住 $1.8 億的下限 → 買「$1.8 億的 put」，或複製「$1.8 億的 call」。1987 年以前很盛行，尤其是追蹤大盤的投資組合；為降低交易成本，多半用**指數 futures**來調整總曝險，而不是買賣成分股。有些公司收費代為決定 volatility、模型並執行 futures 調整。

**1987 年股災後的教訓**：
- 只有在輸入（尤其 volatility）正確、模型假設符合現實時才有效。崩盤時 volatility 暴增，原先的 volatility 輸入嚴重錯誤；
- 價格跳空、流動性枯竭，連續調整的假設失效 → 複製成本遠高於預期；
- 有研究認為，保險機構在下跌中被迫賣出越來越多 futures，加劇了崩盤。

此後投資組合保險大多不再受青睞。教訓：**自製的 option，在你最需要它的時候，可能最貴**；掛牌 option 的 premium 至少是事先確定的。

## 交易員視角

- **你是 hedge 者的對手方**：在 Optibook market making 時，大量買 protective put 或賣掩護性 call 的流量，會推高下檔 put、壓低上檔 call 的 implied volatility（波動率偏斜（volatility skew），第 24 章）。理解 hedge 者的需求，能幫你預期哪一側的 quote 會被打。
- **用 collar 思維管理自己的 position**：若你的 option market making position 累積大量 underlying 多頭 delta（例如從 ETF/futures 套利（arbitrage）帶來），又碰到部位上限（position limit），買 OTM put、賣 OTM call 的「collar」能以近乎零成本限制尾端損失。
- **dynamic hedging = 自製 option**：你的 delta hedge 迴圈本質上就是投資組合保險的引擎。Optibook 的價格跳動限制與流動性不足，正是 1987 年問題的縮影：急跌時你可能無法以理論價格調整，hedge 成本遠高於模型預期。
- **降低波動本身有價值**：比賽或真實交易都一樣，穩定的 PnL 曲線（高夏普）比偶爾大賺大賠更能長期存活；hedge 就是用一點期望值（expected value, EV）換取更窄的結果分布。

## 常見誤區

1. **誤解**：「protective option 大多到期沒價值，所以買它是浪費。」→ **正解**：保險的價值在於限制災難；大多數保單也不會理賠。
2. **誤解**：「掩護性 call 提供完整的下檔保護。」→ **正解**：只保護到 premium 那麼多，之後下檔仍然無限。
3. **誤解**：「collar 是一種全新的策略。」→ **正解**：多頭 collar 就是多頭 vertical spread，風險特性完全依第 12 章分析。
4. **誤解**：「implied volatility 高時，應該多買幾張 OTM put 來降低單價。」→ **正解**：高隱含時應買越少越好；多張高估的 option 讓你多付更多。
5. **誤解**：「算術平均報酬最高的經理人，長期累積報酬也最高。」→ **正解**：複利報酬約為算術平均減去變異數的一半，高波動會侵蝕長期成果。
6. **誤解**：「投資組合保險的成本可以事先確定。」→ **正解**：複製成本取決於實現波動率（realized volatility）與能否連續調整；波動暴增、跳空時成本遠超預期。

## 重點摘要

| 主題 | 公式 / 規則 |
|---|---|
| protective put | 多頭 underlying + 買 P ≈ synthetic 買 C；最大損失 = (S − X) + 保費 |
| protective call | 空頭 underlying + 買 C ≈ synthetic 買 P；最大損失 = (X − S) + 保費 |
| 掩護性 call | 多頭 underlying + 賣 C ≈ synthetic 賣 P；保護到 S − premium |
| 掩護性 put | 空頭 underlying + 賣 P ≈ synthetic 賣 C |
| Buy/write quote | 股價 − call 價 |
| 現金擔保 put（歐式） | 存款 $X/(1+rt)$ |
| 多頭 collar | 多頭 underlying + 買 P + 賣 C = 多頭 vertical spread |
| 零成本 collar | 保護性與掩護性 premium 相等 |
| hedge 數量原則 | 高隱含：少買多賣；低隱含：多買少賣 |
| 部分 hedge | 用 delta 決定比例，例如 −50 delta 保護一半 |
| 複利 vs 算術平均 | 幾何 ≈ 算術 − σ²/2 |
| 夏普比率 | 平均報酬 / standard deviation |
| 投資組合保險 | 動態複製（持股 = delta × 原持股）；假設失效時代價高 |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A2、B2、B4、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 航空公司對油價是自然多頭還是空頭？浮動利率放款的銀行呢？各適合買哪種 protective option？

<details><summary>解答</summary>

航空公司要買油，油價上漲不利 → 自然空頭 → 買油價 call（cap 的概念）。浮動利率放款者利率上升有利 → 利率自然多頭 → 買利率 put。

</details>

**A2.** ⭐ 為什麼「持股 + 買 protective put」等於持有 call？

<details><summary>提示</summary>

畫畫看：股價跌破 strike 時，股票的虧損被什麼抵銷？漲上去時又怎樣？這條損益線像哪一種 option？

</details>

<details><summary>解答</summary>

synthetic 關係：S + P = C（同 strike、同到期，忽略利息）。持股在 strike 以下的虧損由 put 抵銷，以上則參與上漲——就是 call 的形狀，保費即 call premium 的對應成本。

</details>

**A3.** ATM 掩護性 call 為什麼是最常見的選擇？

<details><summary>解答</summary>

ATM option time value 最大；若市場維持在現價附近，以 ATM 賣出的掩護 position 增值最多。它在保護程度（介於 ITM 與 OTM 之間）與上檔參與之間取得折衷。

</details>

**A4.** 為什麼賣出多張 OTM call 來 hedge 持股（ratio write）通常不符合 hedge 者的目標？

<details><summary>解答</summary>

賣出的 call 多於持股，上檔變成無限風險；加上掩護性 position 原本的下檔無限風險，兩邊都暴露。這已是 volatility 交易，而 hedge 者通常只願意在自然 position 的方向承擔無限風險。

</details>

**A5.** 為什麼投資組合保險在 1987 年失效？

<details><summary>解答</summary>

複製成本取決於 realized volatility 與能否連續調整。崩盤時 volatility 暴增（輸入錯誤），價格跳空、流動性不足（連續調整假設失效），使複製成本遠高於預期；同時大量保險機構同步賣 futures，可能加劇下跌。

</details>

### B. 計算題

**B1.** 持股 120，買 110P 付 2.40。到期最大損失？breakeven 點？

<details><summary>解答</summary>

最大損失 = (120 − 110) + 2.40 = **12.40**（股價 ≤ 110）。breakeven = 120 + 2.40 = **122.40**。

</details>

**B2.** ⭐ 持股 80，賣 85C 收 2.08。下檔保護到哪裡？最大獲利？若股價到期 70，損益？

<details><summary>提示</summary>

保護點 = 股價 − 收到的 premium。最大獲利發生在股價漲到 85 被叫走時：(85 − 80) + premium。股價 70 時，股票損益加上 premium（85C 到期沒價值）。

</details>

<details><summary>解答</summary>

保護到 80 − 2.08 = **77.92**；最大獲利 = 85 − 80 + 2.08 = **7.08**；股價 70 時 = 70 − 80 + 2.08 = **−7.92**。

</details>

**B3.** 歐式現金擔保 put：賣 70P、6 個月、利率 4%（單利）。至少要存多少現金？

<details><summary>解答</summary>

70/(1 + 0.04 × 0.5) = 70/1.02 = **68.63**。

</details>

**B4.** ⭐ 持股 50，買 46P 付 0.95、賣 55C 收 0.70。淨成本？到期最大損失與最大獲利？

<details><summary>提示</summary>

先算淨成本 = 付的 put 費 − 收的 call 費。跌到 46 以下時 put 接手，損失 = (50 − 46) + 淨成本；漲到 55 以上被叫走，獲利 = (55 − 50) − 淨成本。

</details>

<details><summary>解答</summary>

淨付 0.25。最大損失 = 50 − 46 + 0.25 = **4.25**；最大獲利 = 55 − 50 − 0.25 = **4.75**。（等價於 46/55 多頭買權價差（bull call spread），以 4.25 的淨成本計：最大獲利 9 − 4.25 = 4.75。）

</details>

**B5.** 某經理人五年報酬為 +20%、−15%、+25%、−10%、+15%。算術平均、五年總報酬、樣本 standard deviation、夏普比率（平均/standard deviation）各為多少？

<details><summary>解答</summary>

算術平均 = 35/5 = **7.0%**。總報酬 = 1.20 × 0.85 × 1.25 × 0.90 × 1.15 − 1 = 1.31963 − 1 = **+31.96%**。樣本 standard deviation ≈ **18.23%**。夏普 ≈ 0.07/0.1823 = **0.384**。

</details>

**B6.** 持有 5,000 股，複製一張 protective put。模型給虛擬 call delta 0.64，之後變成 0.71。各時點應持股多少？第二次要買或賣多少股？

<details><summary>解答</summary>

第一次：5,000 × 0.64 = **3,200 股**（賣出 1,800）。第二次：5,000 × 0.71 = **3,550 股** → 買回 **350 股**。

</details>

### C. 交易情境題

**C1.** ⭐ 一家出口商 3 個月後會收到 US$5,000,000（美元多頭）。USD/TWD 31.80，3 個月 31.00 美元 put 0.20、32.80 美元 call 0.20。公司董事會要求「最差匯率不得低於 31.00」且不想付保費。你建議什麼？有什麼代價？

<details><summary>提示</summary>

董事會要「最差不低於 31.00」→ 要買哪一種 option？不想付保費 → 再賣一張 premium 一樣的 option 來抵。想想這樣放棄了什麼。

</details>

<details><summary>解答</summary>

零成本多頭 collar：買 31.00 美元 put、賣 32.80 美元 call，premium 互抵。最差換匯 31.00（符合要求），代價是美元若升破 32.80，超過部分的利益放棄（最多換到 32.80）。等價於 31.00/32.80 多頭 vertical spread。若董事會願意付保費，也可以只買賣權保留全部上檔。

</details>

**C2.** 你在 Optibook 累積了大量股票多頭（position 接近上限），implied volatility 明顯偏高。你想保護一半的 position 約一週。比較：(a) 買 1 張接近 −50 delta 的 ATM put、(b) 買 2 張 −25 delta 的 OTM put、(c) 賣掉一半股票、(d) 賣 ATM call。

<details><summary>解答</summary>

隱含偏高 → 買越少越好、賣越多越好。(b) 最差（買兩張高估 option）；(a) 比 (b) 好但仍付高估保費。(d) 收取高估 premium、正 theoretical edge，提供部分保護，但下檔仍無限。(c) 沒有 volatility 成本，若主要目標是降風險且市場可承受，最乾淨。若需要「最壞情況有底」，選 (a)；若只是想降低 delta 又看好 volatility 回落，選 (d) 或 (c)。

</details>

### D. 挑戰題

**D1.** (a) 證明對報酬 $r_i$ 的小幅波動，$\ln(1+r) \approx r - r^2/2$，由此推得「幾何平均報酬 ≈ 算術平均 − 變異數/2」。(b) 用例題 17-5 的經理人 A 驗證這個近似（母體變異數）。

<details><summary>解答</summary>

(a) 泰勒展開 $\ln(1+r) = r - r^2/2 + r^3/3 - \dots$。五年平均 $\frac1n\sum\ln(1+r_i) \approx \bar r - \frac{1}{2n}\sum r_i^2 = \bar r - \frac12(\sigma^2_{\text{母體}} + \bar r^2)$。幾何平均 $g$ 滿足 $\ln(1+g) \approx g - g^2/2$，兩邊的 $\bar r^2/2$ 與 $g^2/2$ 近似抵銷，得 $g \approx \bar r - \sigma^2/2$。
(b) A：$\bar r = 8.4\%$，母體 standard deviation 13.71% → 變異數 0.01880 → $8.4\% - 0.94\% = 7.46\%$；實際幾何平均 $(1.4359)^{1/5} - 1 = 7.50\%$，相當接近。

</details>

## 自我檢核清單

- [ ] 能判斷自然多頭/空頭，並選出對應的 protective option。
- [ ] 能說出四種「underlying + option」hedge 各等於哪個 synthetic option。
- [ ] 能計算 covered write 的保護點與最大獲利。
- [ ] 能建構 collar 並說明它是 vertical spread。
- [ ] 能依 implied volatility 高低決定「買少賣多」或「買多賣少」。
- [ ] 能計算算術、幾何報酬、standard deviation 與夏普比率。
- [ ] 能解釋投資組合保險的運作與 1987 年失效原因。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab10_hedging_portfolio.py`](../labs/exercises/lab10_hedging_portfolio.py)：實作 `protective_put_pnl`、`covered_call_pnl`、`collar_pnl`、`collar_bounds`、`zero_cost_collar_call_strike`、`portfolio_value`、`portfolio_greeks`、`scenario_grid`、`greeks_ladder`、`worst_case`、`gamma_vega_neutral_hedge`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab10_hedging_portfolio.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab10_hedging_portfolio**（[../labs/](../labs/)）：寫一個情境分析器，輸入「underlying position + 任意 option」，輸出到期損益表與目前 Greeks；用它比較例題 17-2、17-3 的掩護性 call、protective put、collar，並找出零成本 collar strike。再模擬幾何布朗運動下的投資組合保險（動態複製 call），比較不同 realized volatility 與調整頻率時的複製成本，重現「波動上升 → 保險變貴」的結論。
