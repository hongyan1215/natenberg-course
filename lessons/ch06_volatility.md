# 第 6 章　波動率（Volatility）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：波動率（volatility）就是「市場速度」——價格一年內大概會晃多大（一個標準差（standard deviation），用百分比表示）。晃得越大，所有選擇權（option）越值錢。

**你只需要先記住這 5 件事**

1. **volatility ↑ → call 和 put 都變貴。** option 最多賠掉權利金（premium），但大漲或大跌都可能讓它變價內（in-the-money, ITM）；分配變寬只有好處。
2. **68／95／99.7。** 價格落在 ±1／2／3 個 standard deviation 內的機率。注意「漲超過 2σ」是單邊，只有約 2.3%（≈1/44），不是 1/20。
3. **時間要開根號。** 每日 ≈ 年化 ÷ 16，每週 ≈ 年化 ÷ 7.2，每月 ≈ 年化 ÷ 3.5。例：股價 100、volatility 32% → 一天大概動 2 元。
4. **隱含波動率（implied volatility） = option 的「價格」；未來實現波動率（future realized volatility） = option 的「價值」。** 預期實際會晃得比隱含大 → 買；比隱含小 → 賣。
5. **volatility 變動的影響**：價平（at-the-money, ATM）以「點數」最敏感，價外（out-of-the-money, OTM）以「百分比」最敏感，長天期比短天期敏感。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 一年後價格區間 | 遠期價（forward price） ± σ × forward price |
| 每日一個 standard deviation | 價格 × σ ÷ 16 |
| 每週一個 standard deviation | 價格 × σ ÷ 7.2 |
| SOFR 期貨（futures） | 利率 = 100 − 價格；掛牌 call = 利率 put |

**必做練習（約 20 分鐘）**：A1、B1、B2、C2（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[常態與對數常態分配](https://hongyan1215.github.io/natenberg-course/tools/distribution/)工具，把 volatility 拉高拉低，看分配怎麼變寬。

---

## 本章定位

[ch05](ch05_pricing_models.md) 說：定價就是為每個可能結果配上機率。本章回答「機率怎麼配」——假設價格的變動服從（對數）常態分配（normal distribution），平均數由 forward price 決定，**standard deviation 就是 volatility**。你將學會解讀 volatility 數字、把年化 volatility 換算成每日／每週的價格區間、分辨實現波動率（realized volatility）與 implied volatility，並理解 volatility 變動對不同 option 的影響。這是全書最核心的一章；後續 [ch20](ch20_volatility_revisited.md)、[ch24](ch24_volatility_skews.md) 會再深入。

> 對應原書：第 6 章〈Volatility〉，含〈Random Walks and Normal Distributions〉〈Mean and Standard Deviation〉〈Forward Price as the Mean of a Distribution〉〈Volatility as a Standard Deviation〉〈Scaling Volatility for Time〉〈Volatility and Observed Price Changes〉〈A Note on Interest-Rate Products〉〈Lognormal Distributions〉〈Interpreting Volatility Data〉（Realized Volatility / Implied Volatility）。

## 學習目標

1. **能解釋**為什麼 volatility 上升會讓所有 option（call、put、各履約價（strike price））都增值。
2. **能運用** ±1／2／3 個 standard deviation 對應 68.3%／95.4%／99.7% 的規則，估計價格落在某區間的機率，並判斷賭注賠率是否划算。
3. **能把**年化 volatility 換算為任意期間的 standard deviation（$\sigma\sqrt{t}$，每日 ÷16、每週 ÷7.2），算出價格區間。
4. **能從**一串觀察到的價格變動，判斷是否與某個 volatility 假設一致，並計算 realized volatility。
5. **能說明**對數常態分配（lognormal distribution）的成因（連續複利）與其對 call／put 相對價值的影響。
6. **能區分**未來實現、歷史實現、預測與 implied volatility，並以「波動率點數（vol points）」衡量 option 的貴賤。
7. **能說出** volatility 變動影響 option 價值的三條原則（ATM 點數最大、OTM 百分比最大、長天期大於短天期）。

---

## 核心概念

### 6.0 波動率是「市場速度」的量度

> 💡 **一句話**：市場動得越快，越容易穿過 strike，option 就越值錢。

option 交易員和標的（underlying）交易員一樣在乎方向，但還在乎**速度**：市場動得不夠快，underlying 穿越 strike 的可能性就低，option 價值就低。可以把 volatility 理解為**市場速度的量度**——慢市場是低波動、快市場是高波動。

直覺上有些市場天生比較「躁動」：原物料（例如原油）一年內可以先漲五成再腰斬，但很難想像大型股價指數一年內出現同樣幅度的來回。如果能把「這個市場大概會多躁動」量化並告訴模型，評價就會比忽略它準確得多。

---

### 6.1 隨機漫步與常態分配（Random Walks and Normal Distributions）

> 💡 **一句話**：價格像彈珠台亂跳，結果呈鐘形；鐘越寬（波動越大），call 和 put 都越值錢。

**彈珠台（Galton board / quincunx）**：彈珠從頂端落下，每碰到一根釘子，有 50% 往左、50% 往右，然後落到下一層，最後掉進底部某一格。單顆彈珠的路徑無法預測，也無法干預——它在做**隨機漫步（random walk）**。

丟很多顆後，彈珠會在中間堆最多、越往兩側越少，形成**鐘形的 normal distribution**：
- 左右對稱；
- 高峰在中間；
- 兩側尾巴持續往下遞減。

同一個分配也可以描述「擲公平硬幣 16 次出現幾次正面」：0 次或 16 次都可能，但 7、8、9 次附近最常見。

**改變釘子的排列**
- 每次左右移動後要**往下掉兩層**才碰到下一根釘子 → 側向移動被限制 → 分配**更高更窄**（仍是常態）。
- 每次往下掉一層，卻要**左右移動兩根釘子** → 分配**更矮更寬**。

```
  低波動（窄高）         中波動            高波動（矮寬）
       ▲                   ▲
      ███                 ███                  ▲
      ███                █████              ███████
     █████             ███████            ███████████
    ███████          ███████████       █████████████████
```

把彈珠的**左右移動**想成價格漲跌、**往下落**想成時間流逝，這三種分配就分別對應中、低、高波動市場的到期價格分配。

#### 分配寬度如何影響選擇權價值

既然 normal distribution 是對稱的，volatility 大會讓大漲更可能，也讓大跌更可能，兩者是否抵消？對**underlying**而言是的；但**option**不同：
- underlying 的期望值（expected value, EV）取決於**所有**結果；
- option 的 expected value 只取決於**到期 ITM 的那些結果**，其餘都是 0。

```
                     現價             履約價
                       │                │
 低波動：          ▁▃█▃▁                │        ← 幾乎沒有面積在履約價右邊
 中波動：        ▁▂▄█▄▂▁                │▁
 高波動：     ▁▁▂▃▄▆█▆▄▃▂▁▁             │▂▁▁      ← 右尾面積明顯增加 → call 更值錢
```

對較高 strike 的 call，分配越寬，落在 strike 右側的部分越多，call 越值錢。同理，對較低 strike 的 put，分配越寬，左尾越多，put 也越值錢。**因此高波動市場中所有 option（call、put、高低 strike）都增值；低波動市場中全部減值。**

---

### 6.2 平均數與標準差（Mean and Standard Deviation）

> 💡 **一句話**：鐘形由「中心」和「寬度」兩個數決定；背熟 68／95／99.7，並分清單邊和雙邊。

normal distribution 完全由兩個數字描述：
- **平均數（mean）**：分配高峰的位置（也是所有結果的平均）。
- **standard deviation**：分配擴散的速度，也決定「落在離平均數某距離內」的機率。

**例題 6-1：16 層彈珠台（自創）**
16 層的台子，每層向右的機率 0.5，落點 = 向右次數（0～16）。
$$\text{平均數}=16\times0.5=8,\qquad \text{標準差}=\sqrt{16\times0.5\times0.5}=2$$
平均落點 8，即使單顆彈珠落在 8 也只是可能性之一（平均值不一定是某次實際會出現的結果，回想 ch05 的轉盤）。

**交易員必背的近似機率**

| 範圍 | 機率 | 分數近似 |
|---|---|---|
| ±1 個 standard deviation | 68.3% | 約 2/3 |
| ±2 個 standard deviation | 95.4% | 約 19/20 |
| ±3 個 standard deviation | 99.7% | 約 369/370 |

因為 normal distribution 對稱，往上與往下的機率相同；「±2 個 standard deviation 以外」約 4.6%，**單邊**約 2.3%（約 1/44；粗略記 1/40）。

> 小註：16 層的台子是離散的。若把「落在 6～10 格（含）」當成 ±1 個 standard deviation，精確機率是 79%，比 68.3% 大，因為兩端的格子剛好被整個算進來。層數越多、越接近連續常態時，68／95／99.7 規則越準確。

**例題 6-2：用 standard deviation 判斷賭注（自創）**
某 underlying 的一年後價格假設服從 normal distribution，平均 250、standard deviation 60。有人提出：「若一年後價格高於 370（平均 +2 個 standard deviation），我付你 25 倍賭金；否則你輸掉賭金。」划算嗎？
- 高於 +2 個 standard deviation 的機率（單邊）≈ 2.28%，約 1/44。
- 公平賠率約為 43 賠 1，對方只給 25 賠 1 → **這是爛賭注**。
- expected value：$0.0228\times25-0.9772\times1\approx-0.41$，每押 1 元長期虧約 0.41 元。
常見的陷阱是只記得「±2 個 standard deviation 以外約 1/20」，忘了那是**兩邊加總**，單邊只有一半。

**無限多結果也能算**：[ch05](ch05_pricing_models.md) 提到真正準確的模型要為無限多種價格配機率。normal distribution 的數學性質已被徹底研究，有公式可以算出曲線上每一點的機率與任何區間下的面積——這讓計算理論價值（theoretical value）變得可行。最早假設價格服從 normal distribution 的就是 Bachelier；這個假設有邏輯問題（見 6.6），修正後成為 Black-Scholes 等模型的基礎。

---

### 6.3 遠期價格作為分配的平均數

> 💡 **一句話**：鐘的中心放在 forward price，不是現價。

要把 normal distribution 餵給模型，就要輸入平均數與 standard deviation。[ch05](ch05_pricing_models.md) 已說明：在無套利（arbitrage）假設下，分配應以**forward price**為中心。若 forward price 就是平均數，那麼以現價做的任何交易長期都會打平。

Black-Scholes 的各版本主要差在**如何計算 forward price**：依 underlying 是股票、futures 或外匯，模型用現價、到期時間、利率（股票還有股利（dividend））算出 forward price，並把它設為分配的平均數。

---

### 6.4 波動率就是標準差（Volatility as a Standard Deviation）

> 💡 **一句話**：volatility 24%、forward price 250 → 一年後一個 standard deviation 是 60 元。很少見的事還是會發生。

輸入模型的 volatility，其實就是**standard deviation**；「volatility」只是交易員的說法，常以希臘字母 $\sigma$ 表示。

**暫時的工作定義**：volatility = **一年期間、以百分比表示的一個 standard deviation 價格變動**（之後會稍作修正，見 6.6）。

**例題 6-3（自創）**：某合約一年 forward price 250，volatility 24%。一個 standard deviation $=24\%\times250=60$。一年後：
- 約 68% 機率在 $250\pm60$：**190 ～ 310**
- 約 95% 機率在 $250\pm120$：**130 ～ 370**
- 約 99.7% 機率在 $250\pm180$：**70 ～ 430**

**例題 6-4：先算 forward price（自創）**：股票現價 $80，利率 5%，無 dividend，volatility 30%。
- 一年 forward price：$80\times1.05=84$ → 一個 standard deviation $=30\%\times84=25.20$
- 68%：**58.80 ～ 109.20**；95%：**33.60 ～ 134.40**；99.7%：**8.40 ～ 159.60**

**不可能 ≠ 不太可能**
若例 6-3 的合約一年後跌到 70（−3 個 standard deviation），代表 24% 錯了嗎？在常態假設下，跌到 70 以下的機率約 0.135%，約 1/740——很小，但不是零。擲公平硬幣 16 次全是正面的機率是 1/65,536，也照樣會發生。也許這就是那 1/740，也許 volatility 真的估錯了；**只看一次結果無法判斷**，必須觀察大量價格變動，才能得到有代表性的分配。

---

### 6.5 依時間縮放波動率（Scaling Volatility for Time）

> 💡 **一句話**：時間要開根號：每日 ÷16、每週 ÷7.2。

volatility 和利率一樣，**一律以年化表示**。但兩者的時間縮放不同：
- 利率與時間**成正比**（乘上 $t$）。
- volatility 與時間的**平方根成正比**：

$$\boxed{\sigma_t=\sigma_{\text{年}}\times\sqrt{t}}\qquad(t\text{ 以年計})$$

**每日**：交易所週末假日休市，一年約 250～260 個交易日。很多交易員取 256，因為 $\sqrt{256}=16$：
$$\sigma_{\text{日}}\approx\frac{\sigma_{\text{年}}}{16}$$

**每週**：每一週都有交易，所以用 52 週，$\sqrt{52}\approx7.2$：
$$\sigma_{\text{週}}\approx\frac{\sigma_{\text{年}}}{7.2}$$

（若市場全年無休、或電子交易難以界定一天是一年的幾分之幾，有時直接用 365 天，$\sqrt{365}\approx19.1$。）

**例題 6-5（自創）**：年化 32% → 每日約 $32\%/16=2\%$，每週約 $32\%/7.2=4.44\%$。

**例題 6-6（自創）**：股價 $75，年化 volatility 28%。短期間內 forward price 與現價幾乎相同，所以直接以現價為中心。
- **每日一個 standard deviation**：$75\times28\%/16=1.3125\approx1.31$
  - 68%：$75\pm1.31$ → **73.69 ～ 76.31**
  - 95%：$75\pm2.63$ → **72.38 ～ 77.63**
- **每週一個 standard deviation**：$75\times28\%/7.2=2.92$
  - 68%：**72.08 ～ 77.92**
  - 95%：**69.17 ～ 80.83**

縮放後，68%／95% 的機率規則依然適用：大約每 3 天有 2 天日變動在 1.31 以內；每 20 天約有 1 天超過 2.63。因為一個月約 20 個交易日，交易員通常預期**每月看到一次左右的 2 個 standard deviation 日變動**。

---

### 6.6 波動率與觀察到的價格變動

> 💡 **一句話**：拿每天的實際漲跌跟「÷16」比，常常超出就代表你的 volatility 可能太低；但樣本要夠多才能下結論。

為什麼要把年化 volatility 換算成每日、每週？因為**volatility 是唯一無法直接觀察的輸入**，但很多策略的成敗取決於 volatility 估計是否合理。方向性策略的成敗看現價就知道；但不存在「當下的 volatility」報價（quote），交易員必須自己判斷：我用的 volatility，跟市場實際的價格變動一致嗎？

**例題 6-7（自創）**：例 6-6 的股票（$75，假設 28%，每日 1 個 standard deviation ≈ 1.31），接下來 5 天的收盤對收盤變動：

$$+1.90,\quad -2.40,\quad +0.60,\quad -1.75,\quad +2.20$$

依 28% 的假設，大約每 3 天只有 1 天會超過 1.31；5 天裡預期 1～2 天。但這 5 天裡有 **4 天**超過 1.31，甚至有兩天接近 2 個 standard deviation。**這些變動與 28% 不一致**，市場似乎比假設的更躁動。（用這 5 天的對數報酬、假設平均為 0 計算，年化約 40%。）

下結論前先想：是否有特殊事件（財報、政策公告）讓這幾天異常？若有，28% 也許仍可用；若找不到理由，可能就是用錯了 volatility——**volatility 錯 → 機率錯 → theoretical value 錯**，使用模型的意義就消失了。

不過 5 天樣本太小。硬幣擲 5 次全正面不足以說明硬幣有問題，擲 50 次全正面就很可疑。多數交易員會看 20、50、100 天的樣本再下重大結論。

**「價格變動」指什麼？** 可以是區間最高最低、開盤到收盤……但交易所商品最常用的是**結算價（settlement price）對 settlement price**的變動。說「每日一個 standard deviation 1.31」，指的是前一日 settlement price 到當日 settlement price 的變動，與當天盤中高低無關。（也有使用高低價或開收盤價的估計方法，例如 Parkinson、Garman-Klass，適用於連續交易或沒有明確 settlement price 的市場；見 [ch20](ch20_volatility_revisited.md)。）

---

### 6.7 利率商品的特別說明（A Note on Interest-Rate Products）

> 💡 **一句話**：SOFR futures quote = 100 − 利率，所以算 volatility 用利率，而且 call、put 要對調。（不交易利率商品可先跳過）

部分短期利率 futures 的 quote 方式是 **100 − 利率**。原書以歐洲美元（Eurodollar）futures 為例；Eurodollar 已於 2023 年由 **SOFR futures**取代，quote 慣例相同。這樣設計是為了讓它的漲跌方向和債券一致：利率上升，債券與這類 futures 都下跌。

**例題 6-8（自創）**：3 個月 SOFR futures 報 **95.80**，代表利率 $100-95.80=4.20\%$。這類合約的 volatility 以**利率**（rate volatility）而非價格計算。若利率 volatility 30%：
- 每日一個 standard deviation：$4.20\times30\%/16\approx0.079$（價格點數）
- 每週一個 standard deviation：$4.20\times30\%/7.2=0.175$

**strike 與買賣權類型也要轉換**：futures 價以 100 為基準換算成利率，strike 也要一樣換算——**96.00 strike 就是 4.00% 的利率 strike**。而且 call/put 要對調：96.00 call 要 ITM，futures 必須漲過 96.00，也就是利率要跌破 4.00%——所以**掛牌的 96.00 call 等於利率的 4.00% put**。正確設定的模型會自動：把 futures 價與 strike 從 100 減掉，並把掛牌 call 當 put、put 當 call 處理。

**一般債券不需要這種轉換**：債券價格依票面利率可以自由變動、常高於 100，所以債券期貨選擇權（futures option）多用傳統模型評價（不過利率商品另有其他問題，可能需要專門模型）。

**殖利率 volatility vs. 價格 volatility**：可以從一串債券價格算出殖利率，再算殖利率變動的 volatility；若用它評價債券 option，strike 也必須用殖利率表示。由於同一商品可用兩種方法計算，利率交易員會區分**殖利率 volatility**與**價格 volatility**。

---

### 6.8 對數常態分配（Lognormal Distributions）

> 💡 **一句話**：價格不會變負、漲的金額比跌的大 → 分配右偏；所以模型裡等距 OTM 的 call 比 put 貴。

normal distribution 有一個嚴重缺陷：**對稱**。若允許 $50 的合約漲 $75 到 125，就必須允許它跌 $75 到 −25——但股票與商品價格不可能是負的。

**volatility ≈ 報酬率**：volatility 是以百分比定義的，所以它和利率一樣是一種報酬率。差別在於：利率只以正的速率累積（本金只會長大），volatility 則是正負報酬率的組合（可能賺也可能賠）。

**報酬率要說清楚複利頻率**。$1,000 以年利率 10% 投資一年（自創）：

| 付息方式 | 一年後價值 | 總報酬 |
|---|---|---|
| 一年一次 10% | 1,100.00 | 10.00% |
| 半年 5% | 1,102.50 | 10.25% |
| 每季 2.5% | 1,103.81 | 10.38% |
| 每月 10%/12 | 1,104.71 | 10.47% |
| 每週 10%/52 | 1,105.06 | 10.51% |
| 每日 10%/365 | 1,105.16 | 10.52% |
| 連續複利 | 1,105.17 | 10.52% |

同樣的「10% 年率」，付息越頻繁，總報酬越高；連續複利最高。

**負利率（虧損）也一樣**：每年以 −10% 的速率虧損：

| 計算方式 | 一年後價值 | 總報酬 |
|---|---|---|
| 一年一次 −10% | 900.00 | −10.00% |
| 半年 −5% | 902.50 | −9.75% |
| 每季 −2.5% | 903.69 | −9.63% |
| 每月 | 904.46 | −9.55% |
| 每週 | 904.75 | −9.52% |
| 每日 | 904.83 | −9.52% |
| 連續複利 | 904.84 | −9.52% |

虧損時，複利越頻繁，總虧損反而**越小**。

連續複利用指數函數計算：

$$1{,}000\times e^{0.10}=1{,}105.17,\qquad 1{,}000\times e^{-0.10}=904.84$$

**Black-Scholes 是連續時間模型**：它假設價格的漲跌連續發生、以對應 volatility 的年率連續複利。當**百分比（對數）報酬服從 normal distribution**時，連續複利的結果是到期價格服從**lognormal distribution**：
- 同樣 ±10% 的「速率」，上漲一個 standard deviation 得 +105.17，下跌一個 standard deviation 只 −95.16 → **上漲的絕對金額大於下跌** → 分配向右偏（右尾長）。
- 再怎麼大的負報酬率，連續複利也不會讓價值跌破 0（不可能虧超過 100%）→ **左邊以 0 為界**。這比 normal distribution 更貼近現實。
- **平均數在高峰（眾數）的右邊**：normal distribution 的高峰與平均重合；對數常態（lognormal）的右尾無限延伸、左尾被 0 截斷，右邊「較重」，平衡點（平均）必在高峰右側。

```
 常態：            對數常態：
      ▲                 ▲
     ███               ███
    █████             █████▅▃
   ███████           ███████████▅▃▂▁▁
 ─────┼─────       0┼──┼──┼────────────→
     平均             眾數 平均（在右邊）
 （可到負值）      （以 0 為界，右尾長）
```

**例題 6-9：對 call／put 相對價值的影響（Python 驗證）**
forward price 200、3 個月、volatility 40%、利率 0：

| option | normal distribution 假設 | lognormal 假設（Black） |
|---|---|---|
| 180 put（OTM 10%） | 7.91 | 7.18 |
| 220 call（OTM 10%） | 7.91 | 8.58 |

常態假設下兩者都是 OTM 10%，價值相同；lognormal 下，**OTM call 永遠比等距 OTM put 值錢**：call 的上檔無限，put 最多只能漲到 strike（underlying 不會低於 0）。
當然這只是理論。市場上 180 put 比 220 call 貴是常有的事（原因留待 [ch24](ch24_volatility_skews.md)）；一個可能的解釋是：市場不同意模型的分配假設——而市場可能是對的！

---

### 6.9 解讀波動率數據（Interpreting Volatility Data）

> 💡 **一句話**：realized volatility 看 underlying 過去（或未來）實際晃多大；implied volatility 是從 option 價格反推的。用 implied volatility 比貴賤，比直接看價格清楚。

交易員說「volatility 25%」時，可能指不同的東西。先分兩大類：與**underlying**相關的**realized volatility**，以及與**option**相關的**implied volatility**。

#### (1) 實現波動率（Realized Volatility）

**定義**：underlying 在某段期間內，百分比價格變動的年化 standard deviation。（實務上多用對數價格變動 $\ln(P_t/P_{t-1})$，以對應連續複利；與百分比變動的差異通常很小。）

計算時要指定兩件事：**取樣間隔**與**取樣數量**。
- 「50 日 volatility」：用過去 50 個交易日的每日變動（交易所商品只計營業日；每週 5 天，50 日約 10 週）。
- 「52 週 volatility」：用過去 52 週的每週變動。
畫成圖時，每一點代表「截至該日、往回特定期間」的年化 standard deviation。

**未來實現 vs. 歷史實現**
- **future realized volatility**：option 存續期間 underlying 實際會出現的 volatility。理論上，這才是應該輸入模型的數字。知道它就等於知道正確的「賠率」：像賭場一樣，短期可能運氣不好，長期幾乎一定賺。
- **歷史實現波動率（historical realized volatility）**：過去某期間實際出現的 volatility。

沒人知道未來，但**歷史數據是好的起點**。如果某合約過去 10 年的 volatility 從沒低於 12%、也沒高於 35%，那猜 6% 或 50% 就不太合理——不是不可能，但除非有特殊情況，猜在歷史範圍內更實際。範圍仍很寬，需要更多資訊縮小。

**預測波動率（forecast volatility）**：有人建立 volatility 預測模型（如 GARCH 類），若你相信某預測可靠，就把它納入判斷（[ch20](ch20_volatility_revisited.md)）。

**取樣間隔影響大嗎？** 250 日（每日）、52 週（每週）、12 個月（每月）都涵蓋約一年。理論上可能出現「每天大漲大跌但每週收平」的情況，但這是例外：日波動大的合約，通常週、月波動也大。實證上，用不同間隔算出的長期 volatility 走勢相似，沒有哪一種系統性地偏高或偏低。

#### (2) 隱含波動率（Implied Volatility）

**定義**：從**option 市價**反推出來的 volatility。某種意義上，它代表市場對「option 存續期間 future realized volatility」的共識。

**例題 6-10（自創，Python 驗證）**：無 dividend 股票，歐式 3 個月 68 call，用 Black-Scholes 評價。
- 股價 64.00、利率 4%（連續複利）、你估計的 volatility 30% → theoretical value **2.485**。
- 但市場上這個 call 成交熱絡，價格 **3.00**。為什麼大家覺得它值 3.00？

假設所有人都用同一模型，差異必然來自輸入：
- **strike、到期時間**：寫在合約上，不會錯。
- **股價**：會不會是買賣價差（bid-ask spread）造成的？要讓理論值變成 3.00，股價得是 **65.22**——遠超出任何合理的 bid-ask spread。
- **利率**：利率通常最不重要；要從 4% 調到 **12.45%** 才能得到 3.00，不合理。
- 剩下的就是**volatility**：保持其他輸入不變，什麼 volatility 能讓理論值等於 3.00？答案是 **34.15%**。

```
 求理論價值：  履約價 68 ┐
              股價 64.00 ├→ [模型] → 理論價值 2.485
              利率 4%    │
              時間 3 個月 │
              波動率 30% ┘

 求隱含波動率：履約價 68 ┐
              股價 64.00 ├→ [模型反解] → 隱含波動率 34.15%
              利率 4%    │
              時間 3 個月 │
              權利金 3.00┘
```

求 implied volatility 就是**把模型倒過來跑**。多數模型無法直接反解，但有簡單的數值方法（例如二分法、牛頓法）能快速找到。

**注意事項**
- **依賴模型**：不同模型對同一價格可能算出明顯不同的 implied volatility。
- **輸入必須同時（contemporaneous）**：若 3.00 是兩小時前的成交，當時股價是 64.80，那麼用 64.80 算出的 implied volatility 只有 **31.45%**。用過時的價格會得到誤導的數字。
- 券商與資料商提供的「該 underlying 的 implied volatility」常是加權平均：可能按成交量、未平倉量（open interest, OI）加權，最常見的是**以 ATM option 為主要權重**。

**implied volatility 是市場的「持續民調」**：option 價格與市況不斷變化，implied volatility 也隨時在變。它不是真的投票，但在買賣 quote 不斷互動中，成交價代表供需的平衡，這個平衡可以表達為 implied volatility。

**「premium 水準」**：premium 本來指 option 價格，但因為 implied volatility 來自價格，交易員常混用。implied volatility 相對歷史水準或近期 realized volatility 偏高，就說「premium 偏高」；偏低就說「premium 偏低」。

#### (3) 用波動率點數衡量貴賤

新手被教導：賣出高估、買進低估的 option，就能建立正的**理論優勢（theoretical edge）**。但「高估多少」怎麼衡量？
- 以**價格點數**：例 6-10 的 68 call 理論值 2.485、市價 3.00，高估 0.515。
- 以**vol points**：理論值基於 30%、市價隱含 34.15%，高估 **4.15 個波動率點（vol point）**。
由於 option 的特殊性質，交易員通常認為**用 implied volatility 思考價格更有用**。

**比較兩個 option**：同條件下，65 call 市價 4.05，implied volatility **33.04%**。
- 以價格看，65 call（4.05）比 68 call（3.00）貴。
- 以 implied volatility 看，65 call（33.04%）比 68 call（34.15%）**便宜約 1.1 個 vol point**。

交易員說話時就把 implied volatility 當價格：「我在 33 買了 65 call」「我在 34.15 賣了 68 call」——實際成交當然是以貨幣計價，但對 option 交易員來說，implied volatility 常是更有用的 quote 方式。

即使如此，也不代表就該買 65 call、賣 68 call。還要考慮**看錯 volatility 的後果**：
- 若 future realized volatility 是 28%：兩個 call 都高估，賣哪個都（理論上）賺。
- 若是 36%：兩個 call 都低估，賣哪個都賠。
看錯的代價是後續章節的重點；在沒有其他考量時，implied volatility 較低的 65 call 可能是較好的價值。

#### (4) 價值 vs. 價格：最重要的兩個波動率

在眾多 volatility 中，最重要的是兩個：
- **future realized volatility** → 決定 option 的**價值**。
- **implied volatility** → 反映 option 的**價格**。

所有交易員關心的都是「價值 vs. 價格」：價值高、價格低就買；價值低、價格高就賣。對 option 交易員而言，就是比較**預期的 future realized volatility**與**implied volatility**：隱含偏低就傾向買 option，偏高就傾向賣。未來是未知的，所以要參考歷史與 forecast volatility 做出明智猜測；但最終決定 option 價值的，是 future realized volatility。

**類比（自創）**：你住台北，六月某天早上要決定帶不帶傘。
- **氣候統計（歷史波動率（historical volatility））**：六月是梅雨季，歷年平均下雨天數很多，不帶傘不明智。
- **氣象預報（forecast volatility）**：今天預報晴朗、降雨機率 10%。
- **看看捷運上的人（implied volatility）**：結果大家都帶著傘——他們的行為「隱含」了不同於預報的天氣判斷。
該信誰？沒有確定答案，要到晚上才知道。你對在地狀況的了解很重要（也許預報站離你住的地方很遠）。而且決策還要考慮**犯錯的代價**：如果你整天都在室內、出門就有騎樓，沒帶傘也沒差；若要走很遠的路去開會，淋濕了可能感冒好幾天。交易決策也一樣：用最好的資訊，同時為可能的錯誤預留空間，求的是長期最好的結果。

---

### 6.10 波動率變動對選擇權價值的影響

> 💡 **一句話**：看點數，ATM 最敏感；看百分比，OTM 最敏感；長天期比短天期敏感。

**例題 6-11（自創，Python 驗證）**：futures 850，Black 模型，利率 3%，42 天（6 週）到期，volatility 從 20% 升到 25%：

| option | 20% | 25% | 變動點數 | 變動百分比 |
|---|---|---|---|---|
| 750 call | 100.34 | 101.74 | 1.40 | 約 1% |
| 800 call | 55.49 | 59.53 | 4.04 | 約 7% |
| **850 call** | 22.92 | 28.65 | **5.73** | 約 25% |
| 900 call | 6.59 | 11.03 | 4.44 | 約 67% |
| **950 call** | 1.29 | 3.37 | 2.09 | **約 162%** |
| **750 put** | 0.69 | 2.09 | 1.40 | **約 204%** |
| 800 put | 5.66 | 9.70 | 4.04 | 約 71% |
| **850 put** | 22.92 | 28.65 | **5.73** | 約 25% |
| 900 put | 56.42 | 60.86 | 4.44 | 約 8% |
| 950 put | 100.94 | 103.03 | 2.09 | 約 2% |

（百分比以未四捨五入的數值計算。）

由此得到兩條原則：
1. **以點數計**，volatility 變動對**ATM**option 的影響最大（850 call 與 put 都 +5.73）。
2. **以百分比計**，volatility 變動對**OTM**option 的影響最大（950 call +162%、750 put +204%）。

無論怎麼衡量，**ITM option 對 volatility 最不敏感**：越深入 ITM，越像 underlying 本身，對 underlying 價格越敏感、對 volatility 越不敏感。因為投資人與交易員進場往往就是為了 volatility 特性，所以成交量多集中在**ATM 與 OTM**option。

**長天期 vs. 短天期**：同樣條件改為 105 天（15 週）：

| option | 20% | 25% | 變動點數 | 變動百分比 |
|---|---|---|---|---|
| 750 call | 104.23 | 109.15 | 4.92 | 約 5% |
| 800 call | 65.21 | 72.89 | 7.68 | 約 12% |
| 850 call | 36.05 | 45.04 | **9.00** | 約 25% |
| 900 call | 17.46 | 25.73 | 8.27 | 約 47% |
| 950 call | 7.41 | 13.61 | 6.20 | 約 84% |
| 750 put | 5.09 | 10.01 | 4.92 | 約 97% |
| 800 put | 15.64 | 23.32 | 7.68 | 約 49% |
| 850 put | 36.05 | 45.04 | **9.00** | 約 25% |
| 900 put | 67.03 | 75.30 | 8.27 | 約 12% |
| 950 put | 106.55 | 112.75 | 6.20 | 約 6% |

同一 strike，105 天的點數變動**全部大於** 42 天。第三條原則：

3. **volatility 變動對長天期 option 的影響大於同條件的短天期 option**（以點數計）。

**另外兩個觀察**
- 同 strike、同到期的 call 與 put，volatility 變動時**價值變動幾乎相同**（上表完全相同，因為 futures option 在相同折現下滿足買賣權平價（put-call parity））。因此實務上它們的**implied volatility 也非常接近**。原因是 call、put 之間的平價關係（[ch05](ch05_pricing_models.md) 挑戰題、[ch15](ch15_option_arbitrage.md)）：$C-P$ 與 volatility 無關。
- implied volatility 會隨 strike 不同而不同（偏斜（skew），[ch24](ch24_volatility_skews.md)）。

**volatility 會變，而且變很多**：短短幾週內，一個商品的實現或 implied volatility 變動 4～5 個百分點並不罕見。認真的 option 交易員會花大量時間思考 volatility：綜合歷史、預測與 implied volatility，對未來做出明智判斷，並選擇「看對時賺錢、看錯時不致重傷」的策略。volatility 很難預測，所以要找**容錯空間最大**的策略。如果一個以 20% 為基礎的策略，在實際 18% 或 22% 時就會重傷，那麼 2 個百分點的容錯空間可能根本不算容錯空間。

---

## 交易員視角

1. **Optibook option 做市（market making）的核心輸入**：你的 quote = 模型（forward price + volatility）± 價差。最難的是 volatility：先用 underlying 的歷史價格（記住：Optibook 的歷史只從連線開始，或用 `HistoricalDataLoader`）估計 realized volatility，再看市場上其他人的 quote 隱含的 volatility。
2. **用 implied volatility quote**：把每個 option 的 bid/ask 反解成 implied volatility，你會一眼看出哪個 strike 相對貴或便宜，比看價格直觀得多。
3. **每日 ÷16 是你的即時警報器**：underlying 若常常一天動超過「年化 volatility ÷16」的 2 倍，你的 volatility 假設很可能偏低——market making 時賣出的 option 會一直虧（被 gamma 吃掉，見 [ch08](ch08_dynamic_hedging.md)）。
4. **ATM option vega 最大**：ATM option 以點數計對 volatility 最敏感，market making 時這裡的 volatility 估錯代價最大；OTM option 以百分比計最敏感，便宜但比例上跳動劇烈。
5. **用過時價格反解 implied volatility 是陷阱**：Optibook 上冷門 strike 的最後成交可能是很久以前的，必須用**當前的** underlying 價與**當前的** bid/ask 計算。
6. **長天期 vega 較大**：同樣 1 個 vol point 的錯誤，長天期 option 的損益影響更大，部位（position）大小要相應調整。

## 常見誤區

1. **誤解**：normal distribution 對稱，所以 volatility 上升時 call 漲、put 跌，互相抵消。
   **正解**：option 只在 ITM 時有價值，分配變寬使 call 與 put 都更有機會 ITM，**兩者都增值**。
2. **誤解**：±2 個 standard deviation 以外的機率約 1/20，所以「漲超過 2 個 standard deviation」的機率是 1/20。
   **正解**：1/20 是兩邊合計，單邊約 1/44（約 2.3%）。
3. **誤解**：volatility 和利率一樣，與時間成正比，月 volatility = 年 volatility ÷ 12。
   **正解**：volatility 與時間的平方根成正比，月 volatility ≈ 年 volatility ÷ $\sqrt{12}\approx3.46$。
4. **誤解**：一次 4 個 standard deviation 的大跌證明 volatility 估錯了。
   **正解**：不太可能 ≠ 不可能；要看大量樣本才能判斷。
5. **誤解**：SOFR futures 的 96.00 call 就是利率的 call。
   **正解**：價格 = 100 − 利率，所以 96.00 call 等於 4.00% 利率的 put。
6. **誤解**：premium 較便宜的 option 一定比較「便宜」。
   **正解**：要用 implied volatility 比較；價格低的 option 可能 implied volatility 反而較高。
7. **誤解**：implied volatility 就是對未來 volatility 的準確預測。
   **正解**：它是市場價格的反映（共識），受供需影響，可能高於或低於最後的 realized volatility。

## 重點摘要

| 主題 | 重點 |
|---|---|
| volatility | 年化的一個 standard deviation 百分比變動（對數報酬） |
| 機率規則 | ±1σ 68.3%（2/3）、±2σ 95.4%（19/20）、±3σ 99.7%（369/370） |
| 分配中心 | forward price |
| 一年區間 | $F\pm k\times\sigma\times F$（常態近似） |
| 時間縮放 | $\sigma_t=\sigma\sqrt{t}$；日 ≈ σ/16；週 ≈ σ/7.2；月 ≈ σ/3.46 |
| 實務頻率 | 每月約一次 2σ 日變動 |
| 利率 futures | 價格 = 100 − 利率；用利率 volatility；call ↔ put 對調 |
| lognormal | 連續複利 → 右偏、以 0 為界、平均在眾數右側；等距 OTM call > put |
| 連續複利 | $Pe^{rt}$；正報酬放大、負報酬縮小 |
| realized volatility | 指定取樣間隔與數量；未來實現 vs 歷史實現 |
| implied volatility | 模型反解；依賴模型；輸入須同時 |
| 貴賤衡量 | 用 vol points；比較未來實現（價值）與隱含（價格） |
| 三原則 | 點數：ATM 最大；百分比：OTM 最大；長天期 > 短天期 |
| 同 strike C/P | volatility 變動時價值變動幾乎相同，implied volatility 相近 |

---

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B1、B2、C2）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ 為什麼 volatility 上升會同時讓 OTM call 與 OTM put 都增值？

<details><summary>提示</summary>

想想 option 最差的結果是什麼？分配變寬時，右尾和左尾各發生什麼事？

</details>

<details><summary>解答</summary>

option 價值只來自到期 ITM 的結果，其他結果都是 0（不會變成負值）。分配變寬時，右尾（call ITM 區）與左尾（put ITM 區）的面積都增加，而增加的「OTM 更深」結果對 option 而言仍是 0，不會抵銷。所以兩者都增值。

</details>

**A2.** 說明為什麼 volatility 與時間的平方根成正比，而利率與時間成正比。

<details><summary>解答</summary>

利率是確定地累積，每段時間的報酬直接相加。價格變動則是隨機的；若各期變動彼此獨立，**變異數**（standard deviation 平方）會相加：$n$ 期的變異數 = $n\times$ 單期變異數，因此 standard deviation = $\sqrt{n}\times$ 單期 standard deviation。

</details>

**A3.** 用連續複利的觀點說明 lognormal distribution 為何向右偏，且不會出現負價格。

<details><summary>解答</summary>

同樣大小的正負報酬率連續複利後，正的會放大（$e^{r}-1>r$）、負的會縮小（$1-e^{-r}<r$），所以上漲的絕對金額大於下跌，分配右尾較長。且 $e^{x}>0$ 對所有 $x$ 成立，再大的負報酬也無法讓價值跌破 0。

</details>

**A4.** 你用某 option 兩小時前的成交價反解 implied volatility，但這兩小時內 underlying 已漲了 1%。結果會有什麼偏誤（以 call 為例）？

<details><summary>解答</summary>

舊價格對應的是較低的 underlying 價。若用現在較高的 underlying 價配上舊的（較低的）call 價格反解，會得到**偏低**的 implied volatility，因為模型以為在更高的 underlying 價下 call 只值這麼少。正確做法是用同一時點的 underlying 價與 option 價格。

</details>

**A5.** 為什麼交易員比較兩個 option 的貴賤時偏好用 implied volatility 而不是價格？

<details><summary>解答</summary>

不同 strike、不同到期日（expiration date）的 option 價格水準差異很大，直接比價格沒有意義。implied volatility 把價格轉成同一個尺度（市場隱含的 volatility），可以直接比較相對貴賤，也可以直接和自己對 future realized volatility 的估計比較。

</details>

**A6.** future realized volatility 與 implied volatility，各決定或反映 option 的什麼？交易員如何用它們做決策？

<details><summary>解答</summary>

future realized volatility 決定 option 的**價值**；implied volatility 反映 option 的**價格**。若預期 future realized volatility 高於 implied volatility（價值 > 價格），傾向買 option；反之傾向賣。

</details>

### B. 計算題

**B1.** ⭐ 股價 $120，年化 volatility 40%。求每日與每週一個 standard deviation 的價格變動（用 16 與 7.2 近似）。

<details><summary>提示</summary>

先算「一年一個 standard deviation」= 120 × 40%，再除以 16（每日）或 7.2（每週）。

</details>

<details><summary>解答</summary>

每日：$120\times0.40/16=3.00$；每週：$120\times0.40/7.2=6.67$（用 $\sqrt{52}$ 精確為 6.66）。

</details>

**B2.** ⭐ 無 dividend 股票 $50，利率 4%，年化 volatility 25%。求一年後的 ±1 與 ±2 個 standard deviation 價格區間（常態近似、單利遠期）。

<details><summary>提示</summary>

第一步算 forward price = 50 × 1.04；第二步一個 standard deviation = 25% × forward price；最後中心 ± 1 倍、± 2 倍。

</details>

<details><summary>解答</summary>

$F=50\times1.04=52$；一個 standard deviation $=0.25\times52=13$。
±1σ：39 ～ 65；±2σ：26 ～ 78。

</details>

**B3.** 某 underlying 連續 6 天收盤：100、101.2、99.8、100.5、102.1、101.0。用對數報酬、假設平均為 0、每年 256 個交易日，計算年化 realized volatility。

<details><summary>解答</summary>

對數報酬：+0.011929、−0.013931、+0.006990、+0.015795、−0.010832。
平方平均開根號：$\sqrt{\text{mean}(r^2)}=0.012264$；年化 $0.012264\times16=19.6\%$。
（若用樣本 standard deviation ddof=1，約 21.6%。小樣本下兩種方法差異明顯，見 ch20。）

</details>

**B4.** SOFR futures 報 96.25，利率 volatility 35%。(a) 對應利率？(b) 每日與每週一個 standard deviation（價格點數）？(c) 掛牌的 96.50 call 相當於什麼利率 option？

<details><summary>解答</summary>

(a) $100-96.25=3.75\%$
(b) 每日 $3.75\times0.35/16=0.082$；每週 $3.75\times0.35/7.2=0.182$
(c) 96.50 call 要 ITM 需利率低於 3.50%，相當於 **3.50% 利率 put**。

</details>

**B5.** $1,000 以 +20% 與 −20% 的年率連續複利一年，各變成多少？獲利與虧損的絕對金額各是多少？

<details><summary>解答</summary>

$1{,}000e^{0.2}=1{,}221.40$（獲利 221.40）；$1{,}000e^{-0.2}=818.73$（虧損 181.27）。上漲金額大於下跌金額，這就是 lognormal 右偏的來源。

</details>

**B6.** 無 dividend 股票 100，歐式 6 個月 100 call 市價 7.50，利率 3%（連續複利）。用 Black-Scholes 反解 implied volatility（取 2 位小數的百分比）。

<details><summary>解答</summary>

以數值方法（例如 `scipy.optimize.brentq`）解 $BS(\sigma)=7.50$，得 $\sigma\approx24.06\%$。

</details>

**B7.** 在 250 個交易日中，若日報酬服從 normal distribution，預期有幾天的漲跌幅會超過 2 個 standard deviation（任一方向）？其中上漲超過 2 個 standard deviation 的大約幾天？

<details><summary>解答</summary>

雙邊機率 $2\times(1-N(2))=4.55\%$ → $250\times0.0455\approx11.4$ 天；單邊（上漲）約 5.7 天。

</details>

### C. 交易情境題

**C1.** 某股票的 3 個月 ATM option implied volatility 34%。過去 5 年的 50 日 historical volatility 介於 20% 與 42% 之間，過去 50 天實現 27%，某預測模型給出 29%。公司財報在 6 週後公布，歷史上財報日常有 2～3 個 standard deviation 的跳動。你傾向買還是賣 option？如何控制風險？

<details><summary>解答</summary>

隱含 34% 高於近期實現 27% 與預測 29%，表面上傾向**賣** option。但財報落在存續期間內，財報跳動會推高 3 個月期的 realized volatility；若把一次 2～3σ 的財報日納入，未來實現可能接近或超過 34%。所以優勢不如表面大。做法：(1) 估計「平日 volatility + 財報跳動」合成（synthetic）的期間 volatility 再比較；(2) 若仍偏賣，選擇容錯空間大的結構（例如有限風險的價差，而不是裸賣），並縮小 position；(3) 考慮看錯（實現 40% 以上）時的損失是否可承受。

</details>

**C2.** ⭐ 你在 Optibook 為某 futures option market making。underlying 過去 30 分鐘內每分鐘的變動，換算後相當於年化 45%，而你的模型用 25%。你報出的 option 已經被別人連續買走。你該怎麼調整？

<details><summary>提示</summary>

市場實際速度比你的假設快很多，你的 quote 是太貴還是太便宜？別人一直買，代表你手上累積了什麼 position？

</details>

<details><summary>解答</summary>

實際波動遠高於你的假設，你的 quote 偏低（太便宜），對手在買便宜的 option。應立即：(1) 把模型 volatility 往上調（至少向市場實際的速度靠攏），quote 跟著上移；(2) 檢查並對沖已累積的空頭 option position（delta 避險（hedge））；(3) 暫時放寬價差、縮小報價量（quote size），等確認新的 volatility 水準。持續以 25% quote，等於在高速市場中便宜賣保險。

</details>

### D. 挑戰題

**D1.** (a) 證明若每日報酬獨立同分配、standard deviation 為 $\sigma_d$，則 $n$ 日報酬的 standard deviation 為 $\sigma_d\sqrt n$。(b) 年化 20% 的 volatility，分別用 256、252、365 天換算每日 standard deviation。(c) 如果你用 365 天換算每日 standard deviation，卻用營業日的價格變動來比對，會出現什麼系統性偏誤？

<details><summary>解答</summary>

(a) $n$ 日報酬 $R=\sum_{i=1}^n r_i$；獨立時 $\text{Var}(R)=\sum\text{Var}(r_i)=n\sigma_d^2$，所以 $\text{SD}(R)=\sigma_d\sqrt n$。
(b) $20\%/16=1.250\%$；$20\%/\sqrt{252}=1.260\%$；$20\%/\sqrt{365}=1.047\%$。
(c) 用 365 天換算的每日 standard deviation（1.047%）偏小；但價格只在營業日變動，每個營業日實際上「承載」了週末的變異，觀察到的營業日變動會比 1.047% 大。你會一直覺得「市場比假設躁動」，系統性地認為 volatility 被低估。換算基準必須與觀察價格變動的方式一致。

</details>

**D2.** 用例 6-11 的數字說明：為什麼同 strike 的 call 與 put 對 volatility 變動的反應（點數）完全相同？把結論和 [ch05](ch05_pricing_models.md) 挑戰題連結起來。

<details><summary>解答</summary>

ch05 證明了 $TV_{\text{call}}-TV_{\text{put}}=\dfrac{F-X}{1+rt}$（連續複利版本為 $(F-X)e^{-rt}$），右邊與分配形狀（volatility）無關。所以 volatility 改變時，$C$ 與 $P$ 必須變動相同金額，差值才能維持不變。例 6-11 中 850 call 與 put 都 +5.73、900 call 與 put 都 +4.44，正是此關係。推論：同 strike 同到期的 call 與 put 應有相同的 implied volatility；若明顯不同，就違反平價關係，存在 arbitrage。

</details>

---

## 自我檢核清單

- [ ] 能用彈珠台解釋 random walk、normal distribution 與分配寬度的意義
- [ ] 能說明 volatility 上升為何讓所有 option 增值
- [ ] 能背出 68.3／95.4／99.7 規則及其分數近似，並分辨單邊與雙邊
- [ ] 能用 forward price 與 volatility 算出一年後的價格區間
- [ ] 能把年化 volatility 換算成每日（÷16）、每週（÷7.2）的價格區間
- [ ] 能判斷一串價格變動是否與某 volatility 一致，並計算 realized volatility
- [ ] 能處理「100 − 利率」quote 的利率 futures option（call/put 對調）
- [ ] 能說明連續複利、lognormal distribution 與等距 OTM call／put 的價值差異
- [ ] 能區分未來實現、歷史實現、預測、implied volatility
- [ ] 能用模型反解 implied volatility，並說明模型依賴與輸入同時性
- [ ] 能用 vol points 比較 option 貴賤
- [ ] 能說出 volatility 變動影響 option 的三條原則

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab04_volatility.py`](../labs/exercises/lab04_volatility.py)：實作 `scale_vol`、`annualize_vol`、`one_sd_range`、`atm_vol_from_straddle`、`log_returns`、`lognormal_mean_median`、`prob_above`、`close_to_close_vol`、`parkinson_vol`、`garman_klass_vol`、`rolling_vol`、`vol_cone`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab04_volatility.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab04_volatility**（[../labs/](../labs/)）：實作 (1) `scale_vol(sigma, days, basis=256)`；(2) `realized_vol(prices, method='zero_mean'|'sample', periods_per_year=256)` 並用例 6-7、練習 B3 驗證；(3) 模擬連續複利的價格路徑，畫出常態 vs. lognormal 的到期分配，驗證例 6-9 的 180 put／220 call 差異；(4) `implied_vol(price, S, K, t, r, type)`（用 `brentq`）並重現例 6-10（34.15%、31.45%、33.04%）。realized volatility 的進階估計對應 [ch20](ch20_volatility_revisited.md)。
