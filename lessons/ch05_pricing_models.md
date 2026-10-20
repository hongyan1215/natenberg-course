# 第 5 章　理論定價模型（Theoretical Pricing Models）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：選擇權（option）的理論價值（theoretical value）就像算一張彩券值多少——列出所有可能結果、配上機率、算平均（期望值（expected value, EV）），再因為要等到期才拿到錢而折現。

**你只需要先記住這 5 件事**

1. **方向對還不夠，速度也要對。** 市場動太慢，時間價值（time value）流失就能讓你虧錢；只會看方向，直接交易標的（underlying）就好。
2. **theoretical value = expected value 的現值。** 例：轉盤 expected value 2.40，付少於 2.40 長期賺；若獎金晚點才付，還要再除以（1 + 利率 × 時間）。
3. **機率分配的平均數必須等於遠期價格（forward price）。** 不是現價——否則就有套利（arbitrage）。分配不必對稱，平均對就好。
4. **模型四步驟 + 五輸入。** 步驟：列價格 → 配機率（平均 = forward price）→ 算 option expected value → 折現。Black-Scholes 輸入：履約價（strike price）、到期時間、underlying 價、利率、波動率（volatility）（股票再加股利（dividend））。
5. **避險（hedge）口訣：call 和 underlying 反向、put 和 underlying 同向。** 買 call 賣 underlying、買 put 買 underlying。新手最常把 put 做反。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| expected value | 每個結果 × 機率，全部加起來 |
| theoretical value（股票型結算（stock-type settlement）） | expected value ÷（1 + 利率 × 時間） |
| call expected value | 各結果的 max(underlying − strike, 0) × 機率，加總 |
| put expected value | 各結果的 max(strike − underlying, 0) × 機率，加總 |
| 時間輸入 | 剩餘日曆日 ÷ 365 |
| hedge 方向 | 買 call、賣 put → 賣 underlying；賣 call、買 put → 買 underlying |

**必做練習（約 20 分鐘）**：A5、B1、B2、B4（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[選擇權價格與 Greeks](https://hongyan1215.github.io/natenberg-course/tools/option-explorer/)工具，拉動五個輸入，看理論價格怎麼變。

---

## 本章定位

到期損益圖（[ch04](ch04_expiration_pnl.md)）只告訴我們「如果到期價是多少，會賺賠多少」；要知道 option**現在**值多少，必須替每一個可能結果配上**機率**。本章從擲骰子與輪盤出發，建立「expected value → 現值 → theoretical value」的思路，再介紹 Black-Scholes 模型的輸入與「無風險 hedge」的概念。前置章節：[ch02](ch02_forward_pricing.md)（forward price）、[ch04](ch04_expiration_pnl.md)。Black-Scholes 公式的推導細節在 [ch18](ch18_black_scholes.md)。

> 對應原書：第 5 章〈Theoretical Pricing Models〉，含〈The Importance of Probability〉（Expected Value / Theoretical Value / A Word on Models）〈A Simple Approach〉〈The Black-Scholes Model〉及各輸入（Exercise Price / Time to Expiration / Underlying Price / Interest Rates / Dividends / Volatility）。

## 學習目標

1. **能解釋**為什麼 option 交易員除了「方向」還必須判斷「速度」。
2. **能計算**一個賭局的 expected value、莊家優勢（edge）與考慮利息後的 theoretical value。
3. **能用**離散機率分配計算 call 與 put 的 expected value 與 theoretical value，並確保分配的平均數等於 forward price（無 arbitrage）。
4. **能列出**建構定價模型的四個步驟，以及 Black-Scholes 的五個基本輸入。
5. **能判斷**四種基本 option 部位（position）對應的市場方向與正確的 hedge 方向。
6. **能說明**每個輸入的實務問題：時間用日曆日或營業日、underlying 價用 bid/ask/中價、該用哪個利率、除息日（ex-dividend date）的影響。

---

## 核心概念

### 5.0 方向之外，還有「速度」

> 💡 **一句話**：option 不只要看對方向，還要看對速度；動得太慢，time value 流失就會虧錢。

**例題 5-1（自創）**：某股 $60，你認為 4 個月內會漲到 $70。
- **買股票**：只要真的漲到 70，你一定賺（忽略利息 dividend），什麼時候漲到都行。
- **買 2 個月到期的 65 call @1.20**：如果到期時股價是 70，賺 $5-1.20=3.80$。但若股價前 2 個月都在 65 以下，第 3、4 個月才漲到 70——call 已經歸零，賠 1.20。
- **改買 5 個月到期的 65 call @4.00**：股價到 70 時它至少值 5，但不保證會高於 5；若你付了 4.00 而到期剛好在 70，只賺 1.00；若漲得不夠快、到期只到 68，就賠 1.00。

**結論**：股票交易員只需判斷方向；option 交易員還要判斷**市場移動得夠不夠快**。方向對了、速度不夠，time value 的流失就足以讓你虧錢。許多 option 策略甚至**只**跟速度有關、與方向無關。如果你很擅長預測方向，直接交易 underlying 就好；唯有對「速度」有感覺，才有進入 option 市場的理由。

---

### 5.1 機率的重要性（The Importance of Probability）

> 💡 **一句話**：theoretical value = expected value 折現（再加其他現金流）；正 expected value 只在長期成立，風險管理一樣重要。

交易決策幾乎都建立在機率估計上。日常用語「很可能」「機會不小」不夠精確；option 評價要把機率量化。機率和策略選擇是一體的：
- 獲利機率很高、虧損機率很低 → 可以接受較小的潛在利潤。
- 獲利機率很低 → 必須要求在情況有利時有很大的利潤。

#### 期望值（Expected Value）

**例題 5-2：轉盤遊戲（自創）**
一個轉盤，轉到各區的獎金與機率：

| 獎金 | $0 | $2 | $4 | $10 |
|---|---|---|---|---|
| 機率 | 40% | 30% | 20% | 10% |

$$E=0\times0.4+2\times0.3+4\times0.2+10\times0.1=\$2.40$$

這是「轉無限多次、平均每次拿回」的金額：
- 付 < $2.40 轉一次 → 長期預期獲利；
- 付 > $2.40 → 長期預期虧損；
- 付 = $2.40 → 長期打平。

注意「長期」二字：單轉一次你不可能剛好拿到 2.40（沒有這個獎項）；但即使只轉一次，只要付的錢低於 expected value，**機率站在你這邊**。

**例題 5-3：輪盤（自創，歐式輪盤）**
歐式輪盤有 37 格（1–36 與 0）。押單一號碼，中了拿回 $36（含本金），沒中拿回 0。
$$E=\frac{36}{37}=\$0.9730$$
賭場收你 $1，**優勢（edge）**＝$1-0.9730=\$0.027$，每押 1 元賭場長期賺約 2.7 分。（美式輪盤多一個 00，共 38 格，expected value 更低。）

想賺錢的玩家希望：(a) 跟賭場換位置，當賣方；或 (b) 找到一家以**低於** expected value 賣這個賭注的賭場，例如 $0.92，那麼玩家就有約 5.3 分的優勢。

#### 理論價值（Theoretical Value）

**theoretical value**＝為了在長期打平，現在願意付出的價格。目前我們只用了 expected value；但還有其他因素。

**利息**：假設賭場改規則——你現在付錢，若贏了，**3 個月後**才把 $36 寄給你。你付出的錢原本可以放在銀行生息，所以：
$$\text{理論價值}=\frac{E}{1+r\times t}=\frac{0.9730}{1+0.08\times0.25}=\$0.9539\quad(r=8\%)$$
即使你只付 0.9730，仍會因為損失利息而小虧；賭場則把你的錢存起來賺利息。

**其他現金流**：若賭場為了留住熟客，1 個月後送你 $0.01 回饋金，就把它（的現值）加到 theoretical value 上：約 $0.9539+0.0099=\$0.9638$。這就像持有股票會收到 dividend，是股票 option 評價要考慮的因素。

option 評價最常見的兩個考量是**期望報酬**與**利息**，其他（如 dividend）視情況加入。

**長期 vs. 短期**：賭場以 $1 賣出值 0.973 的賭注，長期一定賺嗎？前提是它能**活到長期**。理論上某人可能連續中 20 次讓賭場倒閉——機率極低但非零。option 交易也一樣：
1. 先用理論模型算出 theoretical value，與市價比較，判斷**理論優勢（theoretical edge）**是否足以進場；
2. 但 theoretical value 建立在只在長期可靠的機率上，所以必須同時**管理短期壞運氣的風險**。

而且真實世界裡，theoretical value 本身也永遠可能有錯。**風險管理能力至少和計算 theoretical value 的能力一樣重要。**

#### 關於模型（A Word on Models）

模型是現實世界的縮小、簡化版本——模型飛機、建築模型、或一條數學公式。好的模型能幫助理解世界，但**絕不等同於**世界。
- 模型需要假設，數學模型需要用數字把假設量化；輸入錯誤，輸出也錯（garbage in, garbage out）。
- option 模型只是「某人認為在某些條件下該如何評價 option」的想法；模型本身或輸入都可能錯，模型值不保證準確，也不保證貼近市價。

**一個比喻（自創）**：沒有模型的新手像在停電的倉庫裡找東西，只能摸黑；有模型的交易員像拿著一支手電筒——看得到大致格局，但光圈有限，邊緣也會失真。真正的危險出現在**變熟練之後**：信心增加、position 放大，手電筒照不到的細節與失真被放大成災難。正確態度是：使用模型，但清楚知道它能做什麼、不能做什麼。（金融危機常常就是很多人同時「誤信手電筒」的時刻。）

---

### 5.2 一個簡單的定價方法（A Simple Approach）

> 💡 **一句話**：列出到期價格、配機率（平均 = forward price）、算 option expected value、再折現，就是定價模型的四步驟。

**例題 5-4：均等機率的五種結果（自創）**
某 underlying 現價 50，假設到期只可能是 40、45、50、55、60，各 20%。

$$E[S_T]=0.2\times(40+45+50+55+60)=50$$

把 50 call 的到期價值疊上去：

```
 機率    20%    20%    20%    20%    20%
 標的     40     45     50     55     60
 50 call   0      0      0      5     10
```

$$E[\text{50 call}]=0.2\times(0+0+0+5+10)=3.00$$

一般式：

$$E[\text{call}]=\sum_{i=1}^{n}p_i\max(S_i-X,0),\qquad E[\text{put}]=\sum_{i=1}^{n}p_i\max(X-S_i,0)$$

**加入結算（settlement）方式與利息**：若 option 採 stock-type settlement（要全額付權利金（premium）），theoretical value 是 expected value 的**現值**。設利率 6%、3 個月到期：
$$\frac{3.00}{1+0.06\times0.25}=\frac{3.00}{1.015}=2.956$$

**改善 1：機率應集中在現價附近**
極端變動比小變動少見。若現價 50，到期是 55 的機率當然高於 90。改用鐘形配置：

```
 機率    10%    20%    40%    20%    10%
 標的     40     45     50     55     60
 50 call   0      0      0      5     10
```
$$E[\text{50 call}]=0.2\times5+0.1\times10=2.00,\qquad \text{理論價值}=\frac{2.00}{1.015}=1.970$$
（因為對稱，underlying 的 expected value 仍是 50。）

**改善 2：分配中心應是 forward price（無 arbitrage）**
underlying 到期的「最可能平均值」是多少？沒人知道。但回想 [ch02](ch02_forward_pricing.md)：若遠期合約（forward contract）價格偏離理論 forward price，大家會 arbitrage 直到它回來。所以**若 underlying 市場無 arbitrage，underlying 的 expected value 必須等於 forward price**。
本例若 underlying 是無 dividend 股票：$F=50\times(1+0.06\times0.25)=50.75$。把分配中心移到 50.75：

```
 機率     10%     20%     40%     20%     10%
 標的    40.75   45.75   50.75   55.75   60.75
 50 call   0       0      0.75    5.75   10.75
```
$$E[\text{50 call}]=0.4\times0.75+0.2\times5.75+0.1\times10.75=2.525,\qquad \frac{2.525}{1.015}=2.488$$

**改善 3：分配不必對稱，只要平均數等於 forward price**
**例題 5-5（自創）**：

```
 機率      5%     21%     40%     25%      9%
 標的      42      46      50      54      61
 50 call    0       0       0       4      11
 50 put     8       4       0       0       0
```
檢查平均：$0.05\times42+0.21\times46+0.40\times50+0.25\times54+0.09\times61=2.10+9.66+20.00+13.50+5.49=50.75$ ✓
$$E[\text{call}]=0.25\times4+0.09\times11=1.99\Rightarrow\frac{1.99}{1.015}=1.961$$
$$E[\text{put}]=0.05\times8+0.21\times4=1.24\Rightarrow\frac{1.24}{1.015}=1.222$$

**forward price 在所有模型中都居於核心**。對歐式選擇權（European option）而言，underlying 現價之所以重要，只因為它能換算成 forward price。所以交易員會區分：
- **價平（at the money）**：strike = underlying 現價；
- **forward price 平（at the forward）**：strike = 到期的 forward price。
在許多市場，at-the-forward option 成交最活躍，常被當作評價其他 option 的基準。

**剩下的大障礙**：真實世界有無限多種可能價格。我們需要一個能為「每一個可能價格」配上機率的分配——[ch06](ch06_volatility.md) 會用常態／對數常態分配（lognormal distribution）解決。

**建構定價模型的四步驟**
1. 提出一組到期時 underlying 的可能價格。
2. 為每個價格指定機率，且**underlying 的 expected value 必須等於 forward price**（無 arbitrage）。
3. 依 strike，計算 option 的 expected value。
4. 依 option 的 settlement 方式，計算 expected value 的現值。

---

### 5.3 Black-Scholes 模型

> 💡 **一句話**：Black-Scholes 用五個輸入算 theoretical value；每個 option position 都要用反向的 underlying position hedge。

**歷史脈絡**
- 1877 年，Charles Castelli 在倫敦出版的小冊子已描述了 hedge 與交易策略，例如今日所稱的掩護性賣出（covered write）買權（covered write）與跨式（straddle）。
- 1900 年，法國數學家 Louis Bachelier 首次用高等數學為 option 定價（當時沒有交易所 option 市場，實用性有限）。
- 1973 年，芝加哥 option 交易所（CBOE）開幕同年，Fischer Black 與 Myron Scholes 發表第一個實用的理論定價模型（Robert Merton 亦有貢獻，故也稱 Black-Scholes-Merton）。輸入少、多數可觀察、計算簡單，迅速成為交易員工具，至今仍是最廣泛使用的模型。
- 原始版本評價**無 dividend 股票的 European option**；之後加入 dividend。1976 年 Black 修改為**期貨選擇權（futures option）**版本（Black 模型）；1983 年 Garman 與 Kohlhagen 修改為**外匯 option**版本。各版本只差在「如何計算 forward price」與「option 的 settlement 方式」，因此統稱 Black-Scholes 模型。

推理邏輯與 5.2 節相同：為各種結果配機率、算 expected value、折現。Black 與 Scholes 原本處理 call；put 可用類似方法，或用 European option 特有的「同 strike 同到期 call、put、underlying」之間的唯一關係（買賣權平價（put-call parity），見 [ch15](ch15_option_arbitrage.md)）由 call 推出。

**五個基本輸入**

```
  履約價 ──────┐
  到期時間 ────┤
  標的價格 ────┼──→ [ 定價模型 ] ──→ 理論價值
  利率 ────────┤
  波動率 ──────┘
```

（股票 option 若有 dividend，還需輸入 dividend。）volatility 與「市場速度」或「各結果的機率」有關，[ch06](ch06_volatility.md) 詳談。

**例題 5-6：Black-Scholes 數值（Python 驗證）**
$S=50$、$K=50$、$t=0.25$ 年、$r=6\%$（連續複利）、無 dividend、volatility 25%：
- call ≈ **2.863**，put ≈ **2.119**。
- 若 volatility 改為 20% 或 30%，call 變成 2.373 或 3.354——volatility 影響巨大。

#### 無風險避險（Riskless Hedge）

Black-Scholes 還引入一個關鍵概念：**每個 option position 都有一個理論上等價的 underlying position**，在 underlying 小幅變動時，兩者以相同速度增減價值。要利用錯價的 option，必須用**反向的 underlying position**對沖，建立無風險 hedge；所需的 underlying 比例稱為**避險比率（hedge ratio）**（即 [ch07](ch07_risk_measurement_1.md) 的 delta）。

為什麼要 hedge？因為在 5.2 節的方法中，theoretical value 取決於各結果的機率，而**underlying 價格一變，機率就跟著變**。例如現價 50 時你給 60 的機率 25%；若 underlying 跌到 45，60 的機率可能只剩 10%。先建立 hedge、再隨市況調整，就是把不斷變動的機率納入考量。

從這個角度，option 是 underlying position 的**替代品**：call 替代多頭、put 替代空頭。替代品是否比直接持有 underlying 好，取決於 theoretical value 與市價的比較：
- call 便宜（市價 < 理論價）或 put 貴（市價 > 理論價）→ 用「買 call」或「賣 put」做多，長期比直接買 underlying 有利。
- put 便宜或 call 貴 → 用「買 put」或「賣 call」做空，長期比直接放空 underlying 有利。

| option position | 對應市場 position | 正確 hedge |
|---|---|---|
| 買 call | 多頭 | 賣 underlying |
| 賣 call | 空頭 | 買 underlying |
| 買 put | 空頭 | 買 underlying |
| 賣 put | 多頭 | 賣 underlying |

**口訣**：call 與 underlying**反向**操作（買 call 賣 underlying、賣 call 買 underlying）；put 與 underlying**同向**操作（買 put 買 underlying、賣 put 賣 underlying）。新手最常把 put 做反：買 put 又賣 underlying——那根本不是 hedge，而是加倍做空。

---

### 5.4 各輸入的實務問題

> 💡 **一句話**：underlying 價用你實際 hedge 的 bid 或 ask，時間用日曆日 ÷ 365，利率最不敏感，dividend 看 ex-dividend date，volatility 最關鍵。

模型輸出不會比輸入更好，所以逐一檢視。

#### (1) 履約價（Exercise Price）
合約固定、整個存續期間不變：9 月 100 put 不會變成 9 月 110 put。（股票分割或特別 dividend 時交易所可能調整 strike，但那只是會計調整，合約經濟本質不變。）

#### (2) 到期時間（Time to Expiration）
到期日（expiration date）也固定，但距離到期的時間每天縮短。模型以**年**為單位，若以天計，要除以 365。多數軟體會自動轉換，你只要輸入剩餘天數。

看似有個難題：時間用在兩個地方——
1. **估計 underlying 價格變動的可能性**：只有營業日價格才會變，似乎該扣掉週末假日。
2. **計算利息**：利息每天都在累積，必須用日曆日。

其實不衝突：volatility 是用**營業日**的價格變動觀察、再換算成**年化**數字後輸入模型；所以我們可以直接輸入實際的日曆天數，模型會正確解讀。
**例題**：剩 45 個日曆日 → $t=45/365=0.1233$ 年；其間約 31 個營業日，$31/252=0.1230$，兩者幾乎一樣。

接近到期時，有人改用小時甚至分鐘。理論上越細越準，但實務上離散的時間輸入不一定能反映連續流逝的真實時間，且**越接近到期，輸入越不可靠**——許多交易員在最後階段乾脆不用模型值。

#### (3) 標的價格（Underlying Price）
任何時刻都有買價與賣價（bid-ask spread），該用哪一個？
**例題 5-7（自創）**：underlying 最後成交 101.50，目前報價（quote） **101.35 / 101.55**。候選：最後成交價 101.50、中價 101.45、bid、ask。

有紀律、使用模型的交易員知道自己**必須用 underlying 反向 hedge**，所以輸入的 underlying 價應該是「他實際能做 hedge 交易的價格」：
- 打算**買 call 或賣 put**（市場多頭）→ 要**賣** underlying hedge → 用接近 **bid（101.35）** 的價格。
- 打算**賣 call 或買 put**（市場空頭）→ 要**買** underlying hedge → 用接近 **ask（101.55）** 的價格。

underlying 流動性好、價差窄、每檔量大時，用中價近似通常沒問題；流動性差、價差寬、價格快速變動時，連小單都可能無法在 quote 成交，要格外小心。

（沒有任何法律規定交易員一定要照模型交易；但若使用模型，就應該遵守它隱含的 hedge 紀律。）

#### (4) 利率（Interest Rates）
利率有兩個作用：
1. **影響 forward price**：stock-type settlement 的 underlying，利率越高，forward price 越高 → **call 價值上升、put 價值下降**。
2. **影響 option 的現值**：stock-type settlement 的 option，利率越高，折現越多 → option 現值下降。

多數情況兩者用同一個利率；外匯 option 則需要兩個利率（外幣利率影響遠期、本幣利率影響折現），即 Garman-Kohlhagen 版本。

**例題 5-8（Python 驗證）**：例 5-6 的參數，利率從 6% 降到 2%：call 2.863 → 2.612，put 2.119 → 2.363（forward price 效果主導）。

**該用哪個利率？** 教科書常建議**無風險利率**（同天期公債殖利率，例如 60 天 option 用 60 天國庫券）。但一般人無法以政府利率借貸，所以實務上常參考自由交易的利率市場（原書提到 LIBOR 與歐洲美元期貨（futures）；LIBOR 已於 2023 年退場，美元市場現多改用 SOFR 及 SOFR futures）。嚴格說，交易產生借方時該用借款利率、貸方時用存款利率。
不過在 underlying 價、時間、利率、volatility 四個輸入中，**利率通常最不重要**，用一個「合理」的利率即可；只有在 position 極大或天期極長時，小小的利率差才會有明顯影響。

#### (5) 股利（Dividends）
dividend 只影響股票 option，而且只有在 option 存續期間預期會配息時才相關。模型需要正確的 forward price，因此要估計 dividend 金額與日期。
- 交易員關心的是**ex-dividend date**而非發放日：發放日只影響 dividend 能賺多少利息（forward price 的小修正），但**能不能拿到 dividend 取決於 ex-dividend date 當時是否持有股票**。深度價內（in-the-money, ITM）option 雖然很像股票，但只有股票持有人能領 dividend。
- 公司正式宣告前，dividend 都不確定：可能增加、減少或取消。一般假設延續過去政策（例如每季 $0.75）。
- **ex-dividend date 恰在到期前**時要特別小心：若延後幾天落到到期後，對 option 而言等同取消 dividend。

**例題 5-9（Python 驗證）**：例 5-6 的股票若在到期前除息 $0.80（forward price 以 $F=Se^{rt}-D$ 近似），call 從 2.863 降到約 2.432，put 從 2.119 升到約 2.475。如果 ex-dividend date 延到到期後，這 0.43 的差異就會瞬間反轉。

#### (6) 波動率（Volatility）
所有輸入中最難理解、但對交易決策影響最大的。volatility 假設的改變會大幅改變 option 價值；市場評估 volatility 的方式也會大幅改變 option 價格。下一章 [ch06](ch06_volatility.md) 專門討論。

---

## 交易員視角

1. **做市（market making）就是賣「長期 expected value」**：你在 Optibook 上報 bid/ask，本質上就是賭場——以低於理論價買、高於理論價賣，累積 theoretical edge。但要活到「長期」：部位上限（position limit）、hedge、不要讓單一事件打爆你。
2. **quote 前先決定用哪個 underlying 價**：若你在 Optibook 用最後成交價當模型輸入，一筆離譜成交就會讓你所有 quote 錯位。較穩健的做法是用最佳 bid/ask 中價，或依你要 hedge 的方向偏向 bid／ask。
3. **hedge 方向口訣**：被打了 call 的 ask（你賣出 call）→ 買 underlying；被打了 put 的 ask（你賣出 put）→ 賣 underlying。寫程式時把它寫成「依 delta 正負決定下單方向」，避免 put 的方向寫反。
4. **時間輸入**：Optibook 的 option 若以秒或分鐘計到期，要把剩餘時間換成年化（例如 `seconds / (365*24*3600)`），並與你估計 volatility 時的年化方式一致。
5. **不要過度信任模型**：接近到期、underlying quote 稀疏、或模型輸入過時時，模型值的可靠度大降。此時寧可報寬一點、或縮小 position。

## 常見誤區

1. **誤解**：方向看對了，買 option 就一定賺。
   **正解**：還要速度夠快；time value 流失可能抵銷方向上的獲利。
2. **誤解**：expected value 就是單次最可能拿到的金額。
   **正解**：expected value 是長期平均，單次結果可能根本不會是 expected value。
3. **誤解**：theoretical value = expected value。
   **正解**：theoretical value 還要考慮資金的 time value（折現）及其他現金流（如 dividend）。
4. **誤解**：分配應該以 underlying 現價為中心。
   **正解**：無 arbitrage 要求以**forward price**為平均；分配不必對稱，只要平均等於 forward price。
5. **誤解**：買 put hedge 要賣 underlying。
   **正解**：買 put 是市場空頭，要**買** underlying hedge；put 與 underlying 同向操作。
6. **誤解**：利率是最重要的輸入，必須非常精確。
   **正解**：利率通常是最不敏感的輸入；最關鍵的是 volatility（以及 underlying 價格）。

## 重點摘要

| 主題 | 公式／規則 |
|---|---|
| expected value | $E=\sum p_i x_i$ |
| theoretical value（stock-type settlement） | $TV=\dfrac{E}{1+rt}$（+ 其他現金流現值） |
| Call expected value | $\sum p_i\max(S_i-X,0)$ |
| Put expected value | $\sum p_i\max(X-S_i,0)$ |
| 無 arbitrage 限制 | $\sum p_iS_i=F$ |
| 模型四步驟 | 價格 → 機率（平均=F）→ expected value → 現值 |
| B-S 五輸入 | strike、到期時間、underlying 價、利率、volatility（+dividend） |
| hedge | call 與 underlying 反向、put 與 underlying 同向 |
| 利率影響（股票） | 利率↑ → 遠期↑ → call↑ put↓；同時折現↑ |
| underlying 價輸入 | 做多 option（要賣 underlying）用 bid；做空 option（要買 underlying）用 ask |
| 時間輸入 | 日曆日 /365；volatility 已年化 |
| dividend | 看 ex-dividend date；未宣告前不確定 |

---

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A5、B1、B2、B4）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 為什麼一個善於預測方向但不擅長判斷速度的交易員，應該交易 underlying 而不是買 option？

<details><summary>解答</summary>

買 option 必須方向和速度都對才能獲利；underlying 只需要方向對。option 的 time value 會隨時間流失，若市場移動得太慢，即使方向正確也可能虧損。

</details>

**A2.** 賭場以 $1 賣出 expected value $0.973 的賭注，為什麼仍可能倒閉？這對 option 交易員有什麼啟示？

<details><summary>解答</summary>

正 expected value 只在長期成立；短期內連續的壞運氣可能讓資本耗盡，等不到長期。交易員必須同時管理短期風險（position 大小、hedge、資金），風險管理與 theoretical value 同等重要。

</details>

**A3.** 為什麼在無 arbitrage 的假設下，到期價格分配的平均數必須等於 forward price？

<details><summary>解答</summary>

若分配平均高於 forward price，代表以 forward price 買入 forward contract 長期會獲利；低於則賣出獲利。這樣的「預期利潤」會吸引交易把 forward price 推回。在 arbitrage 機制下，forward price 就是市場一致認定的到期平均值，否則就存在可 arbitrage 的錯價。

</details>

**A4.** 說明「at the money」與「at the forward」的差異，並舉一個兩者明顯不同的情況。

<details><summary>解答</summary>

at the money 是 strike 等於 underlying 現價；at the forward 是 strike 等於到期 forward price。高利率、無 dividend 的長天期股票 option，forward price 明顯高於現價（例如現價 100、利率 5%、2 年，遠期約 110），此時 100 strike 是 ATM 但遠低於 at the forward。

</details>

**A5.** ⭐ 交易員賣出 put，應如何 hedge？為什麼新手常做錯？

<details><summary>提示</summary>

先想：賣 put 之後，你希望 underlying 漲還是跌（市場 position 是多還是空）？再用口訣「put 和 underlying 同向」。

</details>

<details><summary>解答</summary>

賣 put 是市場多頭（underlying 漲有利），應**賣出** underlying hedge。新手容易以為「賣東西就該買 underlying 平衡」，忽略 put 本身是空頭工具，賣出 put 反而變成多頭。

</details>

**A6.** 時間輸入是否該扣除週末假日？為什麼？

<details><summary>解答</summary>

一般輸入日曆日即可。利息每天累積，必須用日曆日；價格變動雖只在營業日發生，但 volatility 是用營業日的變動估計後年化的，模型會用年化 volatility 乘上年化時間，兩者一致。

</details>

### B. 計算題

**B1.** ⭐ 一張彩券有 1% 機率中 $500、4% 機率中 $50，其餘不中。expected value？若售價 $8，買家的優勢？

<details><summary>提示</summary>

expected value = 中獎金額 × 機率，加總；優勢 = expected value − 售價（負的就是買家吃虧）。

</details>

<details><summary>解答</summary>

$E=0.01\times500+0.04\times50=7.00$；買家優勢 $7.00-8.00=-\$1.00$（每張長期虧 1 元）。

</details>

**B2.** ⭐ 承 B1，若中獎金額 6 個月後才支付，利率 5%（單利），theoretical value 是多少？

<details><summary>提示</summary>

用 B1 的 expected value，除以（1 + 5% × 0.5）就是現值。

</details>

<details><summary>解答</summary>

$7.00/(1+0.05\times0.5)=7.00/1.025=\$6.829$

</details>

**B3.** futures 現價 100（futures option，stock-type settlement），到期可能值 90、95、100、105、110，機率 10%、20%、40%、20%、10%。利率 4%、3 個月到期。求 100 call 與 95 put 的 theoretical value。

<details><summary>解答</summary>

futures 的 forward price 就是 100，分配平均 = 100 ✓。
- 100 call：$E=0.2\times5+0.1\times10=2.00$；$TV=2.00/1.01=1.980$
- 95 put：$E=0.1\times5=0.50$；$TV=0.50/1.01=0.495$

</details>

**B4.** ⭐ 無 dividend 股票現價 80，利率 5%，6 個月到期。(a) forward price？(b) 以 forward price 為中心、間距 5、機率 10/20/40/20/10%，求 80 call 與 80 put 的 theoretical value。

<details><summary>提示</summary>

第一步 forward price = 80 ×（1 + 5% × 0.5）；第二步以 forward price 為中心、每隔 5 列出五個結果；第三步算每個結果的 call、put 到期價值乘機率加總，最後折現。

</details>

<details><summary>解答</summary>

(a) $F=80\times1.025=82$
(b) 結果 72、77、82、87、92。
- call：$0.4\times2+0.2\times7+0.1\times12=3.40$，$TV=3.40/1.025=3.317$
- put：$0.1\times8+0.2\times3=1.40$，$TV=1.40/1.025=1.366$

</details>

**B5.** 某 underlying forward price 81。到期可能值 60、70、80、90、100，已知 60 和 100 的機率各 10%，70 的機率 25%。為了無 arbitrage，80 和 90 的機率應各是多少？

<details><summary>解答</summary>

設 $p_{80}+p_{90}=0.55$，且 $6+17.5+80p_{80}+90p_{90}+10=81$ → $80p_{80}+90p_{90}=47.5$。代入 $p_{80}=0.55-p_{90}$：$44+10p_{90}=47.5$ → $p_{90}=0.35$、$p_{80}=0.20$。檢查：$6+17.5+16+31.5+10=81$ ✓

</details>

**B6.** option 剩 73 個日曆日到期，模型中的 $t$ 應輸入多少？

<details><summary>解答</summary>

$t=73/365=0.2$ 年。

</details>

**B7.** underlying quote 64.10 / 64.30，最後成交 64.25。(a) 你準備賣出 put 給客戶，評價時應輸入哪個 underlying 價較合理？(b) 若準備賣出 call 呢？

<details><summary>解答</summary>

(a) 賣 put 是市場多頭，要賣 underlying hedge，用接近 bid 的 64.10。
(b) 賣 call 是市場空頭，要買 underlying hedge，用接近 ask 的 64.30。

</details>

### C. 交易情境題

**C1.** 你在 Optibook market making 某股票 option。股票流動性很差：bid/ask = 99.20 / 100.80，最後成交 100.70（是一小時前的成交）。同事建議直接用 100.70 當模型輸入。你怎麼看？你會如何報 call 的買賣價？

<details><summary>解答</summary>

100.70 是過時且偏向 ask 的價格，用它會高估 call、低估 put。價差寬達 1.60，hedge 成本高。合理做法：(1) 報 call 的 **bid**（你買 call → 要賣 underlying hedge）時，用接近 underlying bid 99.20 計算理論價；(2) 報 call 的 **ask**（你賣 call → 要買 underlying hedge）時，用接近 100.80 計算。這樣你的 quote 自然變寬，反映 underlying hedge 成本，避免被知情交易者挑選。

</details>

**C2.** 某股預期在 option 到期前兩天除息 $1.50，但公司歷史上 ex-dividend date 常會延後一週。你持有大量深度 ITM call。你該擔心什麼？可以怎麼做？

<details><summary>解答</summary>

若 ex-dividend date 如期在到期前，forward price 要扣 1.50，call 價值較低；若延後到到期後，forward price 不扣 dividend，call 價值會上升約 1.50 × hedge ratio（深度 ITM 接近 1.50）。不確定性很大。你可以：(1) 努力確認公司公告的 ex-dividend date；(2) 在評價時以機率加權兩種情境；(3) 若為美式 call，考慮除息前提前履約（early exercise）以領取 dividend（見 [ch16](ch16_early_exercise.md)）；(4) 縮小 position 以降低風險。

</details>

### D. 挑戰題

**D1.** 證明：在 5.2 節的離散模型下，**任何**平均數等於 forward price $F$ 的分配，都滿足
$$TV_{\text{call}}-TV_{\text{put}}=\frac{F-X}{1+rt}$$
並用 B4 的數字驗證。這個結果說明了什麼？

<details><summary>解答</summary>

對每個結果 $S_i$：$\max(S_i-X,0)-\max(X-S_i,0)=S_i-X$。所以
$$E[\text{call}]-E[\text{put}]=\sum p_i(S_i-X)=\sum p_iS_i-X=F-X$$
折現後得到 $\dfrac{F-X}{1+rt}$。
B4 驗證：$(3.40-1.40)/1.025=1.951$；$(82-80)/1.025=1.951$ ✓。
意義：call 與 put 的價差**完全不受**分配形狀（也就是 volatility 假設）影響，只取決於 forward price、strike 與利率。這就是 put-call parity（put-call parity，[ch15](ch15_option_arbitrage.md)），也解釋了為何同 strike 的 call 和 put 對 volatility 變動的反應幾乎相同（[ch06](ch06_volatility.md)）。

</details>

---

## 自我檢核清單

- [ ] 能說明 option 交易為何同時需要方向與速度判斷
- [ ] 能計算 expected value、優勢，以及考慮延遲支付的 theoretical value
- [ ] 能用離散分配算出 call 與 put 的 expected value 與現值
- [ ] 能檢查／設定分配使其平均等於 forward price
- [ ] 能背出模型四步驟與 Black-Scholes 五輸入
- [ ] 能說出四種 option position 的市場方向與正確 hedge 方向
- [ ] 能說明時間、underlying 價、利率、dividend 輸入的實務選擇
- [ ] 能解釋為什麼模型是「手電筒」而不是真相

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab03_pricing_models.py`](../labs/exercises/lab03_pricing_models.py)：實作 `norm_pdf`、`norm_cdf`、`norm_cdf_approx`、`expected_value`、`option_value_from_distribution`、`d1_d2`、`bs_call`、`bs_put`、`put_from_call_parity`、`black76`、`prob_itm`、`monte_carlo_price`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab03_pricing_models.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab03_pricing_models**（[../labs/](../labs/)）：實作 `expected_payoff(outcomes, probs, K, type)`、`theoretical_value(..., r, t)`，並寫一個檢查「分配平均是否等於 forward price」的函式；用例 5-4、5-5 與 B3～B5 驗證。接著把離散分配換成大量點的常態／lognormal distribution，觀察結果如何逼近 Black-Scholes（例 5-6：call ≈ 2.863），為 [ch06](ch06_volatility.md) 與 [ch18](ch18_black_scholes.md) 鋪路。
