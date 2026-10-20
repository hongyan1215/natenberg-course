# 第 22 章　股價指數期貨與選擇權（Stock Index Futures and Options）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：指數就是一籃子股票濃縮成的一個數字。本章教你怎麼算指數、怎麼算指數期貨（futures）的公平價、futures 偏離時怎麼套利（arbitrage），以及指數選擇權（option）履約（exercise）和結算（settlement）的眉角。

**你只需要先記住這 5 件事**

1. **價格加權看股價高低，市值加權看公司大小。** 價格加權裡股價最高的股票最重要；市值加權裡市值最大的最重要。
2. **指數 = 原始值 ÷ 除數。** 股票分割、換成分股、總報酬指數配息時要調整除數，讓指數不跳；市值加權遇到分割不用調。
3. **futures 公平價 = 指數 × (1 + r × t) − 股利（dividend）。** 例：指數 4,000、利率 5%、股利率（dividend yield） 1.8%、3 個月 → 約 4,032。dividend 集中發放，短天期用 dividend yield 近似可能差很多。
4. **futures 太貴就 buy program（買股、賣 futures），太便宜就 sell program（放空股票、買 futures）。** futures 普遍略低於公平價（避險（hedge）賣壓、放空受限），不一定是 arbitrage 機會。
5. **futures delta 是 1 + r × t；序月 option 的標的（underlying）價用買賣權平價（put-call parity）反推。** 隱含遠期 = (C − P) × (1 + r × t) + 履約價（strike price）。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 個股對指數的影響 | 個股漲跌幅 × 權重；價格加權每 1 點 = 1 ÷ 除數 |
| 除數 | 原始值 ÷ 目標指數值 |
| futures 公平價 | 指數 × (1 + r × t) − dividend；近似：指數 × [1 + (r − d) × t] |
| arbitrage 方向 | futures 高估 → buy program；低估 → sell program |
| 隱含遠期 | (C − P) × (1 + r × t) + strike |

**必做練習（約 20 分鐘）**：A3、B1、B2、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

---

## 本章定位

股價指數期貨（stock index futures）與指數 option 是全球成交量最大的衍生性商品之一，而且兩者幾乎總是一起被交易與 hedge：做市商（market maker）用 futures 對沖指數 option 的 delta，arbitrage 者用一籃子股票對沖 futures。本章把前面學過的遠期定價（[ch02](ch02_forward_pricing.md)）、合成部位（synthetic position）與 put-call parity（[ch14](ch14_synthetics.md)、[ch15](ch15_option_arbitrage.md)）、futures 式與股票式結算（stock-type settlement）（[ch03](ch03_contract_specs.md)）全部套用到「指數」這個特殊 underlying 上。

## 學習目標

完成本章後，你應該能夠：

1. 計算價格加權、市值加權、等權重（含幾何加權）指數的數值與各成分股權重，並解釋為何不同加權法下「最重要的股票」不同。
2. 計算並調整指數除數（divisor），處理股票分割、成分股替換、總報酬指數的 dividend 調整。
3. 用「成分股百分比變動 × 權重」估計指數變動，並應用於停牌股票與 VWAP 收盤價。
4. 計算指數遠期／futures 的公平價格（離散 dividend 法與 dividend yield 近似法），判斷指數套利（buy program / sell program）的方向與損益。
5. 解釋為何複製 futures 需要 $1 + r t$ 倍的股票部位（position），以及利率、dividend 變化對程式交易（program trading）的影響。
6. 區分期貨選擇權（futures option）與現金指數 option 的 exercise、settlement 與 hedge 工具，並用 put-call parity 推導序月（serial month）的隱含遠期價格（forward price）與跨月 roll 價格。

## 核心概念

> 對應原書：第 22 章〈Stock Index Futures and Options〉。以下所有例子均為自創數字。

### 22.1 什麼是指數（What Is an Index?）

> 💡 **一句話**：指數是一籃子股票的綜合價值；寬基還是窄基看涵蓋的產業，不只看檔數。

**直覺**：指數是「一籃子東西的綜合價值」濃縮成的一個數字。成分股整體上漲，指數就上漲；有漲有跌時可能互相抵銷，指數甚至可以不變，即使每一檔股票都動了。

**分類**：

| 類型 | 特徵 | 例子（類型示意） |
|---|---|---|
| 寬基指數（broad-based index） | 成分股多，或雖然檔數少但涵蓋整體經濟各產業 | 美國 500 大企業指數、日本 225 檔指數、德國 30 大企業指數 |
| 窄基指數（narrow-based index） | 成分股少，只代表某一產業或市場區塊 | 半導體類股指數、銀行類股指數、礦業指數 |

注意「寬基」不是單純看檔數：30 檔股票如果橫跨金融、科技、工業、消費，仍可視為寬基；反之 30 檔全是半導體就是窄基。這個區分對交易員重要，因為窄基指數的個股事件（例如單一公司砍 dividend）對指數影響大得多。

### 22.2 計算指數（Calculating an Index）

> 💡 **一句話**：價格加權看股價高低、市值加權看公司大小，所以「最重要的股票」不一樣。

我們用一個自創的「XYZ 指數」，由三檔股票組成：

| 股票 | 股價 | 流通股數 | 市值 |
|---|---|---|---|
| P | 120 | 500 | 60,000 |
| Q | 30 | 3,000 | 90,000 |
| R | 60 | 1,200 | 72,000 |

**價格加權（price-weighted）**：直接把股價相加

$$I_{\text{price}} = \sum_i P_i = 120 + 30 + 60 = 210$$

**市值加權（capitalization-weighted, cap-weighted）**：把每家公司的市值（股價 × 股數）相加

$$I_{\text{cap}} = \sum_i P_i \times N_i = 60{,}000 + 90{,}000 + 72{,}000 = 222{,}000$$

**權重**：某股票在指數中的權重 = 它對指數原始值的貢獻比例。

| 股票 | 價格加權權重 | 市值加權權重 |
|---|---|---|
| P | 120/210 = 57.14% | 60,000/222,000 = 27.03% |
| Q | 30/210 = 14.29% | 90,000/222,000 = 40.54% |
| R | 60/210 = 28.57% | 72,000/222,000 = 32.43% |

**例題**：若 P 上漲 10%（120 → 132），價格加權指數變動 = 12/210 = **5.71%**；市值加權指數變動 = 6,000/222,000 = **2.70%**。若改成 Q 上漲 10%，價格加權只動 1.43%，市值加權卻動 4.05%。

結論：
- 價格加權 → **股價最高**的股票最重要（P）。
- 市值加權 → **市值最大**的股票最重要（Q）。

**等權重指數（equal-weighted index）**：讓每檔股票初始貢獻相同。做法是每檔股票以「目前價 ÷ 基期價」計入：

$$I_{\text{equal}} = \sum_i \frac{P_i}{P_{i,0}},\quad \text{初始值}=1+1+1=3$$

任何一檔漲 10%，指數都漲 0.10/3 = 3.33%；三檔都漲 10% → 3.30，指數剛好漲 10%。

**再平衡（rebalancing）**：時間一久，表現好的股票權重變大。假設後來股價變成 P = 114、Q = 36、R = 63：

$$\frac{114}{120} + \frac{36}{30} + \frac{63}{60} = 0.95 + 1.20 + 1.05 = 3.20$$

Q 現在權重最大。再平衡時把基期價重設為現價，原始值回到 3.00；為了讓指數連續，要乘上上一期的累積漲幅 $3.20/3.00 = 1.0667$（這一期漲了 6.67%）。

**幾何加權（geometric-weighted）**：較少見，用價格比的幾何平均：

$$I_{\text{geo}} = \left(\prod_i \frac{P_i}{P_{i,0}}\right)^{1/n} = (0.95 \times 1.20 \times 1.05)^{1/3} = 1.0618$$

幾何平均永遠 ≤ 算術平均（1.0618 < 1.0667）。

**歷史與自由流通股數**：最早的指數是價格加權（手算容易）；電腦普及後，大多數主流指數改用市值加權，因為它更能反映公司真實規模。而且通常只計算**自由流通股數（free float）**——扣除庫藏股、內部人持股、員工持股計畫等無法在市場交易的股份。

### 22.3 指數除數（The Index Divisor）

> 💡 **一句話**：指數 = 原始值 ÷ 除數；分割、換股時調整除數，讓指數不跳。

**直覺**：原始值 210 或 222,000 不好看，我們想讓指數從一個整數（例如 1,000）開始，就除以一個「除數」。

$$\text{指數} = \frac{\text{原始值}}{\text{除數}},\qquad \text{除數} = \frac{\text{原始值}}{\text{目標指數值}}$$

- 價格加權：除數 = 210/1,000 = 0.21
- 市值加權：除數 = 222,000/1,000 = 222

**例題**：Q 從 30 漲到 33：
- 價格加權：$(120 + 33 + 60)/0.21 = 213/0.21 = 1{,}014.29$
- 市值加權：$(60{,}000 + 99{,}000 + 72{,}000)/222 = 231{,}000/222 = 1{,}040.54$

**股票分割要調整除數**：假設 P 進行 1 拆 3（120 → 40，股數 500 → 1,500）。投資人財富不變，指數也不該變。

- 價格加權：若不調整，指數 = $(40+30+60)/0.21 = 619.05$，這顯然不合理。新除數 = $130/1{,}000 = 0.13$，指數維持 1,000。
- 市值加權：P 的市值仍是 40 × 1,500 = 60,000，**不需調整**。

**成分股替換**：若 R 被剔除，改納入 S（股價 90，股數 900，市值 81,000），在指數仍為 1,000 的情況下：
- 價格加權新除數 = $(120 + 30 + 90)/1{,}000 = 0.24$
- 市值加權新除數 = $(60{,}000 + 90{,}000 + 81{,}000)/1{,}000 = 231$

指數編製機構調整除數時通常會發布公告，說明新除數與原因。

### 22.4 總報酬指數（Total-Return Indexes）

> 💡 **一句話**：總報酬指數假設 dividend 立刻再投資，除息時指數不跌，它的 futures 也不用扣 dividend。

**直覺**：傳統（價格）指數在成分股除息時會下跌，因為股價下跌了；總報酬指數（total-return index）假設 dividend 立刻再投入指數，所以「除息造成的下跌」不會反映在指數上。

**例題**：價格加權 XYZ 指數（除數 0.21，指數 1,000）。P 發放 2 元 dividend，除息日（ex-dividend date）開盤 118：
- 價格指數：$(118 + 30 + 60)/0.21 = 990.48$
- 總報酬指數：維持 1,000，做法是把除數調成 $208/1{,}000 = 0.208$

每次成分股配息，總報酬指數就調整一次除數。某些國家的主要指數本身就是總報酬型；也有指數同時發布價格版與總報酬版。**對 futures 定價的意義**：總報酬指數的 forward price 不必扣 dividend（dividend 已在指數裡）。

### 22.5 個股價格變動對指數的影響（Impact of Individual Stock Price Changes）

> 💡 **一句話**：個股對指數的影響 = 個股漲跌幅 × 權重；停牌股或收盤價失真時要自己估。

若股票 A 在指數 $I$ 中的價格為 $A$，變動 $a$：

$$\frac{\Delta I}{I} = \frac{a}{I} = \underbrace{\frac{a}{A}}_{\text{個股漲跌幅}} \times \underbrace{\frac{A}{I}}_{\text{權重}}$$

這個關係對價格加權、市值加權、等權重**都成立**：

$$I_{\text{新}} = I_{\text{舊}} \times \left(1 + \sum_i \text{漲跌幅}_i \times \text{權重}_i\right)$$

**例題（價格加權）**：P 由 120 漲 3 點（+2.5%），權重 57.14%：
$1{,}000 \times (1 + 0.5714 \times 0.025) = 1{,}014.29$。直接算：$(123+30+60)/0.21 = 1{,}014.29$，一致。

**例題（市值加權）**：同樣 P 漲 3 點，權重 27.03%：$1{,}000 \times (1 + 0.2703 \times 0.025) = 1{,}006.76$；直接算 $(61{,}500 + 90{,}000 + 72{,}000)/222 = 1{,}006.76$。

**價格加權的捷徑**：任一成分股每變動 1 點，指數變動 $1/\text{除數}$ 點。本例 $1/0.21 = 4.76$ 點。看似奇怪（第二個 1 點的漲幅百分比較小），但同時該股權重也變大，兩者恰好抵銷，所以每點影響固定。

**應用：停牌股票**。指數用「最後成交價」計算，但停牌股的最後價可能早已失真。

> 例：指數 2,350.00，某成分股停牌前最後價 48.00，交易所揭示預計重新開盤價在 52.40–52.60。若該股權重 3.2%，取中間 52.50：
> $$2{,}350 \times \left[1 + 0.032 \times \frac{52.50 - 48.00}{48.00}\right] = 2{,}357.05$$
> 交易員會把指數「真實價值」視為約 2,357，而非螢幕上的 2,350，據此評估 futures 與 option。

**應用：成交量加權平均價（Volume-Weighted Average Price, VWAP）**。收盤最後一筆成交可能是零星異常價，因此部分交易所以收盤前一段時間的 VWAP 作為 settlement 用收盤價。

> 例：收盤前三筆成交：500 股 @ 25.40（最後一筆）、3,000 股 @ 25.22、2,000 股 @ 25.20。
> $$\text{VWAP} = \frac{500 \times 25.40 + 3{,}000 \times 25.22 + 2{,}000 \times 25.20}{5{,}500} = 25.229$$
> 用 25.23 而不是 25.40 計算指數，避免一筆小單扭曲收盤指數。

### 22.6 股價指數期貨（Stock Index Futures）

> 💡 **一句話**：futures 公平價 = 指數 × (1 + r × t) − dividend；短天期用 dividend yield 近似可能差很多。

**現金結算（cash settlement）**：理論上指數 futures 可以實物交割一籃子股票，但需要交割大量不同股票、甚至零股，實務上不可行。因此指數 futures 幾乎都**cash settlement**：每天依結算價（settlement price）做保證金（margin）與變動保證金（variation），到期日（expiration date）最後一次支付「到期指數值 − 前一日 settlement price」。

> 例：前一日 futures settlement 3,208.0，到期指數 3,215.4，乘數每點 $50。多方最後一次獲得 $(3{,}215.4 - 3{,}208.0) \times 50 = \$370$，空方付出等額，雙方隨即出場。

**公平價格**：與個股遠期相同的邏輯（[ch02](ch02_forward_pricing.md)）：

$$F = S \times (1 + r t) - D$$

$D$ 是到期前所有成分股 dividend（含各筆 dividend 從發放日到 expiration date 可賺的利息）。精確計算需要每檔股票的 dividend 金額、發放日與權重。

> 例（離散 dividend）：指數 4,000，3 個月到期，$r = 5\%$。預期 1 個月後有 6 點 dividend、2 個月後有 10 點 dividend。
> $$D = 6 \times (1 + 0.05 \times \tfrac{2}{12}) + 10 \times (1 + 0.05 \times \tfrac{1}{12}) = 6.05 + 10.0417 = 16.0917$$
> $$F = 4{,}000 \times (1 + 0.05 \times 0.25) - 16.0917 = 4{,}050 - 16.09 = 4{,}033.91$$

**dividend yield 近似**：把 dividend 流視為負利率，$d$ 為年化 dividend yield：

$$F \approx S \times [1 + (r - d)\, t]$$

> 例：指數 4,000，$r = 5\%$，$d = 1.8\%$，3 個月：$4{,}000 \times [1 + 0.032 \times 0.25] = 4{,}032.00$。

**近似的陷阱**：dividend 不是均勻發放，而是集中在某些月份（例如財報季後）。長天期合約用年化 dividend yield 誤差不大；**短天期合約**誤差可能很大。上例若 3 個月內的 dividend 已全部發完，真實 $d \approx 0$，公平價應為 4,050，而近似法給 4,032，差 18 點！反之，若接下來剛好是 dividend 密集期，近似法會低估 dividend、高估 forward price。

### 22.7 指數套利（Index Arbitrage）

> 💡 **一句話**：futures 貴就買股賣 futures，便宜就反過來，到期收斂時鎖住利潤。

**直覺**：futures 價格應反映「持有 futures」與「持有一籃子股票」的等價關係。偏離時，買便宜的、賣貴的，到期兩者收斂就鎖住利潤。

- **Buy program**：futures 高估 → 賣 futures、買成分股。
- **Sell program**：futures 低估 → 買 futures、放空成分股。

> 例：指數 4,000，公平價 4,032（$r=5\%$、$d=1.8\%$、3 個月），futures 成交在 4,045，乘數 $50。
> 執行 buy program：借 4,000 買股、賣 futures 4,045。到期指數為 $S_T$：
> - 股票：$S_T - 4{,}000$，加 dividend 18，減利息 50
> - futures：$4{,}045 - S_T$
> - 合計：$4{,}045 - 4{,}000 + 18 - 50 = 13$ 點 = 每口 $650$，與 $S_T$ 無關。

**到期平倉**：futures 自動 cash settlement，但股票得自己賣。為了讓賣價等於決定 settlement 值的價格，傳統上下「收盤市價單（market-on-close order）」。這種策略可由電腦自動計算並下單，所以又稱**program trading**。

**AM 與 PM settlement**：當 program trading 越來越大，最後一刻湧入的巨量收盤單造成股價劇烈跳動。因此多數交易所改以**expiration date 各成分股的開盤價**決定 settlement 值，稱為 **AM settlement**；以收盤價 settlement 的稱為 **PM settlement**，仍有少數合約（如部分 ETF option）使用。

**風險**：
1. 利率未鎖定 → 利率變動影響損益。
2. dividend 估計錯誤。
3. 放空股票受限，或放空資金拿不到全額利息（sell program 吃虧）。

### 22.8 複製指數（Replicating an Index）

> 💡 **一句話**：對沖 futures 要持有 1 + r × t 倍的股票；buy program 怕升息、怕 dividend 減少。

**做法**：依權重持有每檔股票。若有 $200,000 要複製 XYZ 指數：

| 股票 | 價格加權持股 | 市值加權持股 |
|---|---|---|
| P | 57.14% × 200,000 / 120 ≈ 952 股 | 27.03% × 200,000 / 120 ≈ 450 股 |
| Q | 14.29% × 200,000 / 30 ≈ 952 股 | 40.54% × 200,000 / 30 ≈ 2,703 股 |
| R | 28.57% × 200,000 / 60 ≈ 952 股 | 32.43% × 200,000 / 60 ≈ 1,081 股 |

觀察：**價格加權指數 = 每檔買相同股數**（因為權重與股價成正比）；市值加權則否（股數與流通股數成正比）。

**為什麼要複製**：(1) 投資人想獲得指數報酬、分散風險；(2) arbitrage 者要對沖錯價的 futures。

**複製「futures」不等於複製「指數」**：futures 每天 settlement 損益（期貨式結算（futures-type settlement）），股票損益則未實現（stock-type settlement）。futures 的每日 variation margin 會產生利息收入或成本，這是 [ch15](ch15_option_arbitrage.md) 提過的**settlement 風險**。

**futures 的 delta**：忽略 dividend，$F = S(1 + rt)$，指數每漲 1 點，futures 漲 $1 + rt$ 點。所以要 delta 中性：

$$\text{每口期貨需對沖的現股部位} = (1 + r t) \times \text{名目價值}$$

> 例：$r = 5\%$，6 個月到期，避險比率（hedge ratio） $1 + 0.05 \times 0.5 = 1.025$。賣一口名目 $200,000 的高估 futures，市值加權複製持股需放大 2.5%：P ≈ 462、Q ≈ 2,770、R ≈ 1,108 股。3 個月後比率降到 1.0125，持股調為 P ≈ 456、Q ≈ 2,736、R ≈ 1,095。
> 長天期、高利率時差異大；接近到期或低利率時，股票與 futures position 幾乎相同。

**利率變動的影響**：
- Buy program（買股賣 futures）＝ 借錢買股 → 利率上升**不利**、下降有利。
- Sell program（賣股買 futures）＝ 借出資金 → 利率上升**有利**。
- 天期越長影響越大；短天期 program trading 對利率不敏感。

> 例：buy program 借 4,000 點資金，原本以 5% 計息。一個月後浮動利率升到 6%，剩下兩個月多付 $4{,}000 \times 0.01 \times 2/12 = 6.67$ 點，原本 13 點的利潤剩約 6.3 點。

**dividend 變動的影響**：buy program 持有股票 → dividend**增加有利**、減少不利；sell program 相反。寬基指數裡單一公司調整 dividend 影響小；窄基指數裡一家公司砍 dividend 就可能吃掉全部利潤。

### 22.9 期貨市場的偏差（Bias in the Futures Market）

> 💡 **一句話**：基金經理人一直賣 futures hedge，所以指數 futures 普遍略低於公平價。

指數 futures 流動性高、較難被操縱，各類交易者都用它表達對大盤的看法。其中最重要的參與者之一是**基金經理人**：他們幾乎都是持有多頭股票 position，想短期 hedge 時最方便的是**賣出指數 futures**（不必賣掉每檔股票、省下時間與成本）。

結果：
- hedge 賣壓幾乎總是單向（賣 futures），把 futures 壓到**低於理論價**。
- 接手的 market maker／arbitrage 者買進 futures 後，若要對沖就必須**放空股票**——放空可能被禁止、比買股困難，且放空資金常拿不到全額利息（[ch02](ch02_forward_pricing.md)）。
- 因此全球指數 futures 普遍存在**向下偏差**：futures 略低於公平價是常態，高於公平價是例外。

### 22.10 股價指數選擇權（Stock Index Options）

> 💡 **一句話**：futures option exercise 後拿到 futures（季月除外），現金指數 option 直接 cash settlement；序月的 underlying 價用 put-call parity 反推。

有兩種：underlying 是**指數 futures**的 option，以及 underlying 是**現金指數**的 option。

#### 期貨選擇權（Options on Stock Index Futures）

- exercise 或被指派（assign / assignment）後得到**futures position**，立即需要 margin 與每日 settlement。
- 例外：option 與 underlying futures**同時到期**（季月 3、6、9、12 月），此時直接 cash settlement。季月第三個星期五，指數 futures、futures option、現金指數 option 同時到期，俗稱**三巫日（triple witching）**。

> 例（序月）：持有 2 月 3,000 call（underlying 為 3 月 futures，因為 2 月沒有 futures）。2 月到期時 3 月 futures 3,060，exercise 後以 3,000 買進 3 月 futures，帳戶立刻入帳 $60 \times \$50 = \$3{,}000$，但你**仍持有多頭 futures**，市場之後的漲跌會繼續影響你，且要繳 margin。被 assign 者則持有空頭 futures。
>
> 例（季月）：持有 3 月 3,000 call，3 月 futures 採 AM settlement，settlement 值由各成分股開盤價決定。若 settlement 值為 3,082.5，帳戶獲得 $82.5 \times \$50 = \$4{,}125$ 的現金，**之後沒有任何 position**。注意序月 option 常是 PM 到期（expiration date 收盤），季月則跟隨 futures 的 AM settlement。

- 指數 futures option 多為**美式**。採 stock-type settlement（如美國）時提前履約（early exercise）可能有些許價值（[ch16](ch16_early_exercise.md)）；採 futures-type settlement（多數歐亞交易所）時幾乎等同歐式。

#### 現金指數選擇權（Options on a Cash Index）

- 早期曾有美式現金指數 option，但 early exercise 帶來額外風險並使評價複雜，現在交易所掛牌的現金指數 option**都是歐式**。
- 到期自動 cash settlement，多為 AM settlement，不產生任何 underlying position。
- **hedge 工具**：買賣全部成分股不切實際（檔數多、需要零股、delta 變動要一直調整），所以用**同一指數的 futures**hedge：用同月到期的 futures；沒有同月就用 expiration date 之後最近的季月。

| 現金指數 option 到期月 | hedge 工具 |
|---|---|
| 1、2、3 月 | 3 月 futures |
| 4、5、6 月 | 6 月 futures |
| 7、8、9 月 | 9 月 futures |
| 10、11、12 月 | 12 月 futures |

- **評價用的 underlying 價格**：季月 option 到期時現金指數與 futures 收斂，因此直接以 futures 價作為 underlying（理論上也正確：option 價值取決於 forward price，而 futures 就是可交易的遠期）。同時到期的 futures option 與現金 option 價格幾乎相同。

#### 序月選擇權的隱含遠期與跨月合成（Synthetics across Expiries）

11 月現金 option 沒有 11 月 futures，12 月 futures 價不能直接用。可以從 $F_{Dec} = F_{Nov}(1 + rt) - D$ 反推，但需要估計 11–12 月間的 dividend。**實務上更簡單：用 put-call parity 從市場價格反推隱含遠期**：

$$C - P = \frac{F - X}{1 + r t} \;\Longrightarrow\; F = (C - P)(1 + r t) + X$$

> 例：11 月 4,000 call = 112.40，4,000 put = 98.70，距到期 2 個月，$r = 4.8\%$。
> $$F_{Nov} = (112.40 - 98.70) \times (1 + 0.048 \times \tfrac{2}{12}) + 4{,}000 = 13.70 \times 1.008 + 4{,}000 = 4{,}013.81$$
> 此時 12 月 futures 4,028.00，兩者差 14.19 點。之後只要用「12 月 futures − 14.19」當 11 月 option 的 underlying 價，就能隨 futures 即時更新。

12 月也可以檢查一致性。12 月距到期 3 個月：

$$C - P = \frac{4{,}028 - 4{,}000}{1 + 0.048 \times 0.25} = \frac{28}{1.012} = 27.67$$

若 12 月 4,000 call 報 141.20，put 應為 $141.20 - 27.67 = 113.53$。

**11 月／12 月 4,000 roll**（12 月 synthetic position 減 11 月 synthetic position 的價差）：

$$\text{Roll} = (C - P)_{Dec} - (C - P)_{Nov} = 27.67 - 13.70 = 13.97$$

交易員用 roll 把一個月的合成（synthetic）futures position 轉換到另一個月；它隱含了兩個 expiration date 之間的持有成本（cost of carry）與 dividend。

## 交易員視角

- **Optibook 連結**：Optibook 的 ETF／指數題（`etf_future/`、`stock_future/`）就是本章的縮影：你要先算出「籃子的公平價」，再比較 futures 或 ETF 報價（quote）。用 `get_last_price_book()` 取各成分股的 mid，按權重加總得到理論指數，加上 cost of carry 得到 futures 公平價；偏離超過手續費與價差時才下單。
- **權重就是 delta 分配**：在 Optibook 用成分股對沖 ETF/指數時，每檔股票的股數 = 權重 × 名目 ÷ 股價（再乘 $1+rt$ 若對沖的是 futures）。部位限制（position limit）會限制你能放大的倍數，先算好每檔的最大可用量。
- **停牌與失真價格**：書上的停牌股估計法在 Optibook 等同於「某成分股盤口空了或價差很大」：不要盲目用最後成交價，要用自己的公允價估計指數。
- **向下偏差的實務含義**：真實市場中「futures 略低於公平價」不一定是 arbitrage 機會，因為放空股票受限、放空利息較低。做 sell program 前要用**真實可得**的放空利率重算公平價。
- **AM settlement 風險**：持有現金 option 到季月到期，settlement 值由開盤價決定，前一天收盤到 settlement 之間的跳空你無法 hedge；Optibook 中類似情況是到期前最後一刻的價格跳動，position 越接近價平（at-the-money, ATM）越危險。
- **IOC 與限價單**：arbitrage 時兩腿要盡量同時成交。常見做法：先用 IOC 打流動性較差的一腿（成交才繼續），再用 IOC 或積極限價單完成流動性好的一腿，避免單腿裸露。

## 常見誤區

1. **誤解**：價格加權指數中市值最大的公司最重要。→ **正解**：價格加權只看股價高低，股價最高的股票權重最大，與公司規模無關。
2. **誤解**：股票分割時所有指數都要調整除數。→ **正解**：只有價格加權指數需要；市值加權指數中該股市值不變，除數不變。
3. **誤解**：dividend yield 近似 $F \approx S[1+(r-d)t]$ 在任何天期都夠準。→ **正解**：dividend 集中發放，短天期合約可能誤差很大，應用離散 dividend 計算。
4. **誤解**：複製 futures 只要持有與指數名目相同的股票。→ **正解**：futures 每天 settlement，delta 為 $1 + rt$，需持有 $(1+rt)$ 倍的股票，並隨時間與利率調整。
5. **誤解**：序月現金 option 可以直接用下一個季月 futures 價當 underlying。→ **正解**：futures 可當 hedge 工具，但 forward price 不同；應用 put-call parity 求隱含遠期，再以「futures 價 − 固定差額」計算。
6. **誤解**：futures 低於公平價就是免費的 sell program 利潤。→ **正解**：放空股票有限制、放空利率較低，加上普遍的 hedge 賣壓，futures 偏低常是「合理」的。

## 重點摘要

| 主題 | 公式／規則 |
|---|---|
| 價格加權 | $I = \sum P_i / \text{除數}$；權重 $= P_i / \sum P_j$ |
| 市值加權 | $I = \sum P_i N_i / \text{除數}$；權重 $= P_i N_i / \sum P_j N_j$ |
| 等權重 | $\sum P_i/P_{i,0}$，需定期再平衡，再平衡時乘上累積漲幅 |
| 幾何加權 | $(\prod P_i/P_{i,0})^{1/n}$ |
| 除數 | 除數 = 原始值 / 目標值；分割、換股、總報酬配息時調整 |
| 個股影響 | $\Delta I / I = (\Delta A/A) \times w_A$；價格加權每點影響 $= 1/\text{除數}$ |
| 指數遠期 | $F = S(1+rt) - D$；近似 $F \approx S[1+(r-d)t]$ |
| arbitrage 方向 | futures 高估 → buy program（買股賣 futures）；低估 → sell program |
| futures delta | $1 + rt$（相對於現金指數） |
| 利率影響 | buy program 怕升息；sell program 喜升息 |
| dividend 影響 | buy program 喜加息（dividend 增加）；sell program 相反 |
| 隱含遠期 | $F = (C-P)(1+rt) + X$ |
| Roll | $(C-P)_{\text{遠月}} - (C-P)_{\text{近月}}$ |
| settlement | AM＝開盤價 settlement（多數指數合約）；PM＝收盤價 settlement |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A3、B1、B2、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 為什麼一個只有 30 檔成分股的指數仍可能被視為寬基指數？

<details><summary>解答</summary>

寬基與否取決於成分股是否涵蓋整體經濟的廣泛產業，而不只是檔數。若 30 家公司橫跨金融、科技、能源、消費、工業等主要部門，它們整體能代表一國股市的走勢，就是寬基；反之 30 檔全集中於單一產業就是窄基。

</details>

**A2.** 在價格加權指數中，某成分股連續上漲兩個 1 點，第二個 1 點對指數的影響與第一個相同嗎？為什麼？

<details><summary>解答</summary>

相同，都等於 $1/\text{除數}$。第二個 1 點的個股漲幅百分比較小，但該股在指數中的權重已經因第一個 1 點而變大，「漲幅 × 權重」兩者效果恰好抵銷，所以每點對指數的影響固定。

</details>

**A3.** ⭐ 總報酬指數與價格指數在 ex-dividend date 的行為有何不同？這對 futures 公平價有什麼影響？

<details><summary>提示</summary>

想想除息當天，價格指數的成分股股價會怎樣？總報酬指數怎麼處理這個下跌（22.4 的除數調整）？那持有它的 futures，還需要扣掉 dividend 嗎？

</details>

<details><summary>解答</summary>

價格指數在成分股除息時會因股價下跌而下跌；總報酬指數假設 dividend 立即再投資，透過調整除數使指數不受除息影響。因此總報酬指數的 forward price 公式中**不需扣除 dividend** $D$，只需加上 cost of carry：$F = S(1+rt)$。

</details>

**A4.** 為什麼許多交易所把指數 futures 與 option 的到期 settlement 從收盤價改為開盤價？

<details><summary>解答</summary>

program trading 盛行後，arbitrage 者在 expiration date 以收盤市價單（market-on-close）大量買賣成分股來平倉，造成收盤前巨量單湧入、價格異常跳動。改用開盤價（AM settlement）可以讓交易所在開盤撮合時更從容地配對買賣單，減少收盤混亂。

</details>

**A5.** 為什麼全球 stock index futures 普遍存在「價格偏低」的傾向？

<details><summary>解答</summary>

(1) 基金經理人幾乎都持有多頭股票，hedge 時賣 futures，形成單向賣壓；(2) 接手的 arbitrage 者若要對沖必須放空股票，而放空可能被禁止、執行較困難，且放空資金通常拿不到全額利息；(3) 因此反向 arbitrage 的力量不足以把 futures 拉回公平價，futures 便常低於理論價。

</details>

**A6.** 持有 2 月（序月）指數 futures call 與持有 3 月（季月）指數 futures call，到期 exercise 後的處境有什麼不同？

<details><summary>解答</summary>

2 月 call 的 underlying 是 3 月 futures，exercise 後得到 3 月多頭 futures position，除了立即入帳內含價值（intrinsic value）外，之後仍暴露於市場漲跌並需繳 margin；被 assign 方持有空頭 futures。3 月 call 與 3 月 futures 同時到期，以 AM settlement 值 cash settlement，settlement 後雙方都沒有任何 position。

</details>

### B. 計算題

**B1.** ⭐ 某指數成分如下：W（股價 45，股數 2,000）、X（90，800）、Y（15，6,000）、Z（150，300）。(a) 計算 X 在價格加權與市值加權下的權重；(b) 若 X 上漲 6%，兩種指數各上漲多少百分比？

<details><summary>提示</summary>

(a) 價格加權權重 = X 股價 ÷ 所有股價加總；市值加權權重 = X 市值 ÷ 總市值（先算每檔股價 × 股數）。(b) 指數漲幅 = 6% × 權重。

</details>

<details><summary>解答</summary>

(a) 價格總和 = 45 + 90 + 15 + 150 = 300；X 價格權重 = 90/300 = **30.00%**。
市值：W 90,000、X 72,000、Y 90,000、Z 45,000，合計 297,000；X 市值權重 = 72,000/297,000 = **24.24%**。

(b) 價格加權：0.06 × 0.30 = **1.80%**；市值加權：0.06 × 0.2424 = **1.45%**。

</details>

**B2.** ⭐ 承 B1，價格加權指數基期設為 500。(a) 除數為何？(b) Z 進行 1 拆 3，新除數為何？(c) 分割後 W 上漲 2 點，指數變為多少？每 1 點成分股變動對指數影響幾點？

<details><summary>提示</summary>

(a) 除數 = 原始值（股價加總）÷ 500。(b) Z 1 拆 3 後股價變 1/3，重算股價加總，再 ÷ 500。(c) 用新除數算新指數；每點影響 = 1 ÷ 除數。

</details>

<details><summary>解答</summary>

(a) 除數 = 300/500 = **0.60**。
(b) Z 變為 50，新原始值 = 45 + 90 + 15 + 50 = 200，新除數 = 200/500 = **0.40**。
(c) $(47 + 90 + 15 + 50)/0.40 = 202/0.40 = $ **505.00**；每點影響 = 1/0.40 = **2.5 點**。

</details>

**B3.** 指數 8,500，利率 4%，年化 dividend yield 2.5%，5 個月到期。用 dividend yield 近似法計算 futures 公平價。

<details><summary>解答</summary>

$F = 8{,}500 \times [1 + (0.04 - 0.025) \times 5/12] = 8{,}500 \times 1.00625 = $ **8,553.13**。

</details>

**B4.** 某序月現金指數 option：6,000 call = 86.30，6,000 put = 71.10，距到期 4 個月，利率 3.6%。求隱含 forward price。若下一個季月 futures 為 6,040，序月 option 的 underlying 價應如何從 futures 推得？

<details><summary>解答</summary>

$F = (86.30 - 71.10) \times (1 + 0.036 \times 4/12) + 6{,}000 = 15.20 \times 1.012 + 6{,}000 = $ **6,015.38**。
與 futures 差 $6{,}040 - 6{,}015.38 = 24.62$，之後以「futures 價 − 24.62」當序月 option 的 underlying 價。

</details>

**B5.** 指數 5,820.40，某權重 1.8% 的成分股停牌前最後價 112，揭示重新開盤價區間 104.50–105.50。估計重新開盤後的指數。

<details><summary>解答</summary>

取中間 105：$5{,}820.40 \times [1 + 0.018 \times (105 - 112)/112] = 5{,}820.40 \times (1 - 0.001125) = $ **5,813.85**。

</details>

**B6.** 收盤 VWAP 期間的成交：1,200 股 @ 61.05、400 股 @ 61.30、2,600 股 @ 60.98、800 股 @ 61.00。求 VWAP（四捨五入至小數第 4 位）。

<details><summary>解答</summary>

$\dfrac{1{,}200 \times 61.05 + 400 \times 61.30 + 2{,}600 \times 60.98 + 800 \times 61.00}{5{,}000} = \dfrac{305{,}128}{5{,}000} = $ **61.0256**。

</details>

**B7.** 指數 2,500，futures 乘數每點 $100，9 個月到期，利率 4.5%（忽略 dividend）。賣出一口高估 futures 後，需要買進多少金額的成分股才能 delta 中性？

<details><summary>解答</summary>

hedge ratio $1 + 0.045 \times 0.75 = 1.03375$；名目 $2{,}500 \times 100 = \$250{,}000$；需買股 $250{,}000 \times 1.03375 = $ **\$258,437.50**。

</details>

### C. 交易情境題

**C1.** ⭐ 指數 8,500，利率 4%，年化 dividend yield 2.5%，5 個月到期 futures 報 8,560，乘數每點 $10。你能以 4% 借款，但只能以 2.5% 的利率收到放空股票的資金利息。你會執行哪種 program trading？預期每口利潤多少？有什麼風險？

<details><summary>提示</summary>

先用 dividend yield 近似算公平價：8,500 × [1 + (r − d) × 5/12]。futures 比公平價高還是低？決定方向後，想想這個方向需不需要放空股票，放空利率會不會影響你。

</details>

<details><summary>解答</summary>

公平價 8,553.13（B3）。futures 8,560 高估 6.88 點 → **buy program**：借錢買股、賣 futures。這個方向不需要放空，所以放空利率不影響。預期利潤 ≈ 6.88 × $10 = **約 $68.75／口**（尚未扣交易成本）。
風險：(1) 若借款是浮動利率，升息會侵蝕利潤；(2) dividend 若被調降，利潤減少；(3) futures 每日 settlement 產生的利息（settlement 風險）；(4) 需在到期以 settlement price（AM 開盤價）平倉股票，執行有落差。利潤只有 6.88 點，若手續費與價差超過此數就不值得做。

</details>

**C2.** 你是 Optibook 上某 ETF 的 market maker，ETF 由三檔股票組成，權重固定。某成分股的盤口突然變得非常稀薄，最後成交價明顯落後其他市場資訊。你應如何報 ETF 的價格？

<details><summary>解答</summary>

不要盲目用最後成交價計算 ETF 公平價。應估計該股的合理價格（例如用相關股票、訂單簿中間價或你自己的公允價模型），再以「權重 × 該股估計漲跌幅」調整 ETF 理論價，如同停牌股票的處理方式。同時因為不確定性升高，應擴大 quote 價差、降低 quote 數量，並注意 position limit，避免在資訊劣勢時累積過大 position。

</details>

### D. 挑戰題

**D1.** 一個價格加權總報酬指數由 B1 的四檔股票組成，基期 500（除數 0.60）。(a) X 發放 1.50 元 dividend 並以 88.50 開盤，新除數為何？(b) 若此時 12 月 futures（3 個月到期，$r = 3.6\%$）以該總報酬指數為 underlying，公平價應如何計算？為什麼與價格指數的公式不同？(c) 若同一交易所也有該指數的價格版本，兩者的 futures 價差主要反映什麼？

<details><summary>解答</summary>

(a) 新原始值 = 45 + 88.50 + 15 + 150 = 298.50，為維持 500，新除數 = 298.50/500 = **0.597**。
(b) 總報酬指數已把 dividend 再投資，持有 futures 放棄的只有資金的利息，不會損失 dividend：$F = 500 \times (1 + 0.036 \times 0.25) = 504.50$。價格指數的 futures 則要扣掉到期前的預期 dividend $D$。
(c) 兩者 futures 價差（按指數水準換算後）主要反映到期前預期 dividend（及其利息）。這也提供了一種從市場價格推估「隱含股利（implied dividend）」的方法，與 [ch14](ch14_synthetics.md) 用 synthetic position 推算 implied dividend 的概念一致。

</details>

**D2.** 用 put-call parity 證明：若 11 月與 12 月 synthetic position（同一 strike $X$）的價格分別為 $S_1 = (F_1 - X)/(1+r t_1)$、$S_2 = (F_2 - X)/(1+rt_2)$，當利率接近 0 時，roll 的價值近似於兩個 forward price 之差 $F_2 - F_1$。並用本章例子（11 月 synthetic 13.70、12 月 synthetic 27.67）說明 roll 13.97 與遠期差 14.19 為何不同。

<details><summary>解答</summary>

Roll $= S_2 - S_1 = \dfrac{F_2 - X}{1+rt_2} - \dfrac{F_1 - X}{1+rt_1}$。當 $r \to 0$，分母都趨近 1，roll $\to (F_2 - X) - (F_1 - X) = F_2 - F_1$。
本例 $r = 4.8\%$ 不為零，12 月 synthetic 被折現 1.012、11 月被折現 1.008，synthetic 價值是遠期差的「現值」形式，且兩個月份折現因子不同，所以 roll（13.97）略小於遠期差（14.19）。

</details>

## 自我檢核清單

- [ ] 能不看筆記算出價格加權、市值加權、等權重、幾何加權指數與權重。
- [ ] 能處理分割、換股、總報酬配息三種除數調整。
- [ ] 能用「漲跌幅 × 權重」與「1/除數」兩種方法估計個股對指數的影響。
- [ ] 能計算 VWAP 收盤價並說明為何要用它。
- [ ] 能用離散 dividend 與 dividend yield 兩種方法算指數 futures 公平價，並說出短天期近似的誤差來源。
- [ ] 能判斷 buy program / sell program 的方向，並列出利率、dividend、放空限制的風險。
- [ ] 能解釋 futures delta 為 $1+rt$，並據以計算複製持股。
- [ ] 能說明 futures option 與現金指數 option 在 exercise、AM/PM settlement、hedge 工具上的差異。
- [ ] 能用 put-call parity 求序月隱含遠期與跨月 roll。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab11_index_and_skew.py`](../labs/exercises/lab11_index_and_skew.py)：實作 `price_weighted_index`、`cap_weighted_index`、`adjust_divisor`、`index_forward`、`sample_skew_kurtosis`、`implied_vol`、`implied_vol_curve`、`otm_implied_vols`、`skew_fit`、`butterfly_density`、`density_summary`、`smile_vol_after_move`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab11_index_and_skew.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`../labs/lab11_index_and_skew`](../labs/exercises/lab11_index_and_skew.py)：指數計算（價格／市值／等權重、除數調整）、指數 futures 公平價與 arbitrage 判斷，以及後續第 23–24 章的隱含波動率（implied volatility）與 skew 練習。
- 複習：[`../labs/lab01_forward_pricing`](../labs/exercises/lab01_forward_pricing.py)（遠期定價）、[`../labs/lab08_synthetics_arbitrage`](../labs/exercises/lab08_synthetics_arbitrage.py)（put-call parity、synthetic position）。
