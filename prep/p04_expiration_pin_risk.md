# P4　到期日行為與 Pin Risk（Expiration Dynamics and Pin Risk）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：到期前最後幾天，價平（at-the-money, ATM）選擇權（option）像快燒完的蠟燭——gamma、theta 突然變很猛；而且「對手會不會履約（exercise）」本身也變成風險。本章教你算出這些風險、決定要不要 exercise，並在到期前把部位（position）清乾淨。

**你只需要先記住這 5 件事**

1. **gamma、theta 跟著 1/√剩餘時間 放大，vega 反而縮小。** 剩餘時間變 1/4，gamma 和 theta 就變 2 倍。例：S＝K＝100、波動率（volatility） 20%，ATM gamma 5 天 0.14 → 1 天 0.32 → 1 小時 0.81。
2. **gamma 變成履約價（strike price）上的尖峰。** 剩 1 小時，現貨在 99.5 到 100.5 之間，delta 就從 0.16 跳到 0.84；離 strike 2 元以外幾乎不用避險（hedge）。最靠近現貨的那一兩個 strike 扛了整本書的 gamma。
3. **Pin risk＝不知道到期後自己有多少股票。** 只發生在實物交割、而且你有近 ATM 空頭時。量化方法：不確定的股數 × 可能的跳空。花幾千元買回，常能換掉幾萬元量級的週末風險。
4. **要不要 exercise 看「淨值」，不是看有沒有價內（in-the-money, ITM）。** call：ITM 幅度要大於 exercise 費 + 處理股票的成本，而且用決策時點（可能是盤後）的價格。自動 exercise 門檻只是預設，各交易所不同，持有人可以推翻。
5. **現金結算（cash settlement）沒有 pin risk，但有結算價（settlement price）風險。** 到期前用「到期後 position 情境表」（delta 只取 0 或 1）找出 position 會大跳的 strike，先處理空頭。

**必背卡**

| 情況 | 記法 |
|---|---|
| ATM call 價值 | 0.4 × 價格 × volatility × √時間 |
| gamma、theta 隨時間 | 跟 1/√時間 成正比：時間剩 1/4 → 變 2 倍 |
| 最後一段時間的耗損 | 現貨不動時，平均耗損速率 = 當下 theta 速率 × 2 |
| 賣跨式（straddle）一天的損益兩平（breakeven） | 移動 1 個標準差（standard deviation）（約 價格 × volatility ÷ 16） |
| pin risk 有多大 | 不確定股數 × 可能跳空幅度 |
| call 要不要 exercise | ITM 幅度 > exercise 費 + 處理股票成本 → exercise |

**必做練習（約 20 分鐘）**：A2、B4、B5、C4（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[選擇權價格與 Greeks](https://hongyan1215.github.io/natenberg-course/tools/option-explorer/)工具，把天數調短，看 gamma 怎麼在 strike 附近縮成一根尖峰。

---

## 本章定位

到期前最後幾天，option 書的風險結構會徹底改變：ATM gamma 與 theta 以 $1/\sqrt\tau$ 的速度爆炸，delta 在一個小區間內從 0 跳到 1，而「到底會不會被 exercise」本身變成一種風險。培訓與模擬交易中，到期日（expiration date）常是最容易出事、也最能看出一個人風控紀律的時刻。本章整合並延伸 Natenberg 課程中分散在幾章的內容：[第 3 章](../lessons/ch03_contract_specs.md)的 exercise、指派（assign / assignment）與自動 exercise，[第 9 章](../lessons/ch09_risk_measurement_2.md)的「最危險的 option」，[第 15 章](../lessons/ch15_option_arbitrage.md)的 pin risk 與結算（settlement）風險，以及 [第 16 章](../lessons/ch16_early_exercise.md)的 exercise 決策邏輯；並用 [P2](p02_higher_order_greeks.md) 的 color、charm 說明到期前的 Greeks 變化。

## 學習目標

1. 能算出（或心算估計）ATM option 在剩 5 天、1 天、1 小時的價值、gamma、theta，並解釋 $\Gamma\propto1/\sqrt\tau$、$\Theta\propto1/\sqrt\tau$ 的來源。
2. 能說明到期前 gamma 為何變成「strike 附近的尖峰」，以及這對 hedge 頻率與成本的含義。
3. 能描述 pin risk 的典型情境，量化「到期後 position 不確定」的風險，並列出管理方法。
4. 能依交易成本、盤後價格變動、手上的 hedge position，做出 exercise 或放棄（do-not-exercise）的決策。
5. 能以通用語言描述自動 exercise 門檻，並知道各交易所／清算機構規則不同、須查合約規格。
6. 能比較 cash settlement 與實物交割（含期貨選擇權（futures option））在 expiration date 的不同風險，並列出到期前的 position 清理清單。

## 核心概念

### 4.1 τ→0：gamma 與 theta 的爆炸

> 💡 **一句話**：到期前 ATM gamma、theta 一起隨 1/√時間 放大，vega 縮小；最後 1 小時 gamma 只集中在 strike ±1 元內。

**本章數值約定**：$S=K=100$、$\sigma=20\%$（以 252 個交易日年化）、$r=0$。時間用**交易時間**：1 天 $=1/252$ 年，一個交易日 6.5 小時，所以 1 小時 $=1/(252\times6.5)$ 年。這個約定把夜間與週末視為「沒有波動的時間」；若改用日曆時間，數字會不同，但結構相同。

**ATM 近似**（$r=0$）：

$$
C_{\text{ATM}}\approx0.4\,S\sigma\sqrt\tau,\qquad
\Gamma_{\text{ATM}}\approx\frac{0.4}{S\sigma\sqrt\tau},\qquad
\Theta_{\text{ATM}}\approx-\frac{0.4\,S\sigma}{2\sqrt\tau}=-\frac{C_{\text{ATM}}}{2\tau}
$$

| 剩餘時間 | ATM call 價值 | straddle 價值 | Gamma | Theta（每交易日速率） | Theta（每小時速率） | 期間內 1 個 standard deviation 移動 | Vega（每點） |
|---|---|---|---|---|---|---|---|
| 5 天 | 1.124 | 2.248 | 0.142 | −0.112 | −0.017 | 2.82 | 0.056 |
| 1 天 | 0.503 | 1.005 | 0.317 | −0.251 | −0.039 | 1.26 | 0.025 |
| 1 小時 | 0.197 | 0.394 | 0.807 | −0.641 | −0.099 | 0.49 | 0.010 |

怎麼讀：

- **Gamma ∝ $1/\sqrt\tau$**：從 5 天到 1 天，gamma 乘 $\sqrt5=2.24$；從 1 天到 1 小時，再乘 $\sqrt{6.5}=2.55$。
- **Theta 也 ∝ $1/\sqrt\tau$**，而且 $r=0$ 時 $\Theta=-\tfrac12\Gamma S^2\sigma^2$：1 天時 $\tfrac12\times0.3166\times100^2\times0.04/252=0.251$。**gamma 與 theta 是同一枚硬幣的兩面**（[第 8 章](../lessons/ch08_dynamic_hedging.md)），到期前兩者一起放大。
- **Vega 反而 ∝ $\sqrt\tau$ 在縮小**：最後一天，volatility 觀點幾乎不值錢，剩下的全是 gamma 與 theta 的交換。
- **「瞬間 theta」低估最後時段的耗損**：剩 1 小時時 theta 速率是每小時 −0.099，但若現貨停在 100，這 1 小時內 option 會從 0.197 跌到 0——平均速率是起點速率的兩倍。因為 $C\propto\sqrt\tau$，$-dC/d\tau=C/(2\tau)$：價值是「以當前速率耗損所需時間」的一半。

#### Gamma 變成尖峰

同一張 100 call，不同現貨下的 gamma：

| 現貨 | 98 | 99 | 99.5 | 100 | 100.5 | 101 | 102 |
|---|---|---|---|---|---|---|---|
| 剩 5 天 | 0.113 | 0.135 | 0.140 | 0.142 | 0.138 | 0.131 | 0.107 |
| 剩 1 天 | 0.090 | 0.234 | 0.295 | 0.317 | 0.291 | 0.228 | 0.089 |
| 剩 1 小時 | 0.0002 | 0.104 | 0.486 | 0.807 | 0.482 | 0.105 | 0.0003 |

以及 delta：

| 現貨 | 98 | 99 | 99.5 | 100 | 100.5 | 101 | 102 |
|---|---|---|---|---|---|---|---|
| 剩 5 天 | 0.24 | 0.37 | 0.44 | 0.51 | 0.58 | 0.64 | 0.76 |
| 剩 1 天 | 0.06 | 0.21 | 0.35 | 0.50 | 0.66 | 0.79 | 0.94 |
| 剩 1 小時 | 0.00 | 0.02 | 0.16 | 0.50 | 0.84 | 0.98 | 1.00 |

5 天時 gamma 在 98–102 之間幾乎是平的；最後 1 小時，gamma 集中在 99–101 之間，離 strike 2 元的地方 gamma 幾乎為零。**含義**：

- 到期前，**離現貨稍遠的 strike「突然」不再需要 hedge**（delta 已經是 0 或 1），而**最靠近現貨的那一兩個 strike**承擔了整本書的 gamma。
- 現貨在 strike 附近來回時，delta 在 0.16 與 0.84 之間擺盪（±0.5 元內）——一個 500 口的 position，delta 在幾分鐘內變化 340 股等值。
- 這也是 [P2](p02_higher_order_greeks.md) color 的極端版本：ATM color ∝ $\tau^{-3/2}$。

> **交易員會怎麼說**：「明天到期的 100 strike 是我整本書的 gamma。別的 strike 我可以當作股票（深價內（deep in-the-money, deep ITM））或當作沒有（深價外（deep out-of-the-money, deep OTM））；100 strike 我要盯著，每 0.25 元就重新看一次 delta。」

### 4.2 心算版本

> 💡 **一句話**：一天 ATM straddle ≈ 0.8 × 價格 × volatility ÷ 16；賣 straddle 一天的 breakeven 移動剛好是 1 個 standard deviation。

- **1 天 ATM straddle** ≈ $0.8\,S\sigma\sqrt{1/252}=0.8\times100\times0.2\times0.063=1.008$（精確 1.005）。$\sqrt{1/252}\approx1/16$，所以「年化 vol ÷ 16 = 一天的 standard deviation 百分比」：20% ÷ 16 = 1.25%。
- **breakeven 移動**：賣出 ATM straddle、一天後的 gamma 虧損 $\tfrac12\Gamma\,\delta S^2$ 等於 theta 收入時，$\delta S=S\sigma\sqrt{\delta t}$ = 1 個 standard deviation = 1.26 元。
- **縮放**：已知 1 天 gamma 0.317，2 天 ≈ $0.317/\sqrt2=0.224$（精確 0.224）。

### 4.3 Pin risk

> 💡 **一句話**：收在空頭 strike 附近，你不知道會不會被 assign；不確定股數 × 跳空就是風險，最直接的解法是收盤前買回。

**定義**：到期時現貨收在（或非常接近）某個你有大量**空頭** position 的 strike，你無法確定對手會不會 exercise，因此**不知道到期後自己的標的（underlying）position 是多少**。只發生在實物交割（含交割成期貨（futures）position）的 option。

**為什麼不確定？**

- 收在 100.02，ITM 0.02：持有人可能因自動 exercise 而被 exercise，但也可能因為交易成本、盤後價格變動或策略考量而提交不 exercise 通知。
- 收在 99.98，價外（out-of-the-money, OTM） 0.02：通常不會自動 exercise，但持有人仍可主動 exercise（例如盤後出現利多）。
- 即使只有一部分被 exercise，assign 也是隨機分配到各空方，你拿到的比例不確定。

#### 情境 A：空頭 call，收在履約價上方一點點

你賣出 300 口 100 call（每口 100 股），已用 +150 口等值（15,000 股）的 delta hedge。週五收盤 100.02。

| 結果 | 週末後的股票 position |
|---|---|
| 全部被 assign | $+15{,}000-30{,}000=-15{,}000$ 股 |
| 都沒被 assign | $+15{,}000$ 股 |
| 一半被 assign | 0 |

position 不確定範圍是 30,000 股。若週一開盤跳空的 standard deviation 是 1.5%（1.5 元），1 個 standard deviation 的損益不確定性是 $30{,}000\times1.5\times\tfrac12\approx22{,}500$ 美元（以「你的 position 可能是 ±15,000」計），最壞的組合可能是 $15{,}000\times3=45{,}000$ 美元（2 個 standard deviation 跳空 × 錯邊的 15,000 股）。

對照：若收盤前以 0.06 買回這 300 口 call，成本是 $300\times100\times0.06=1{,}800$ 美元（其中真正的「價差成本」只有相對理論值的那一部分）。**用幾千元買掉幾萬元量級的週末不確定性，通常是對的交易。**

#### 情境 B：conversion／reversal 在履約價上

第 15 章的例子：持有 100 strike 的 reversal（賣 put、買 call、空股票）。收在 100 附近時，你會不會 exercise 自己的 call、put 會不會被 assign，兩者組合出四種結果，其中兩種會讓你帶著裸股票 position 過週末。

#### 管理方法

1. **提前縮小**：到期前一兩天開始減少「現貨附近 strike」的空頭部位（short position）；越晚處理，價差越寬、gamma 越大。
2. **買回近 ATM 空頭**：最直接；成本是剩餘時間價值（time value）加價差。
3. **與持有反向 position 的對手交叉平倉**：conversion 對 reversal、以公平價格互相平掉（第 15 章）。
4. **以機率加權 hedge 但承認殘差**：收盤前可以用「預期被 assign 比例」決定 hedge 量，但要清楚這是在賭比例，到期後第一時間（通常是隔日開盤前）確認實際 assign 並修正。
5. **選擇不同 strike 或 expiration date**：建立 position 時就避免大量集中在單一 strike，或用 cash settlement 的商品替代。

### 4.4 履約與放棄的決策

> 💡 **一句話**：用決策時點的價格，扣掉 exercise 費和處理成本再決定；盤後消息可能讓你改成 exercise 或不 exercise。

**基本原則**：在**決策時點**（交易所規定的 exercise 通知截止時間，可能晚於收盤）比較「exercise」與「放棄」兩個選項的**淨價值**，而不是比較收盤價與 strike。

對多頭 call（每股）：

$$
\text{exercise if}\quad S_{\text{dec}}-K-c_{\text{ex}}-c_{\text{unw}}>0
$$

- $S_{\text{dec}}$：決策時點你對 underlying 價值的最佳估計（盤後若有新消息，用盤後價格）；
- $c_{\text{ex}}$：exercise 手續費（以每股計）；
- $c_{\text{unw}}$：處理 exercise 後得到的股票的成本（價差、手續費、隔夜風險溢價）。若這些股票剛好可以抵銷你手上的空頭 hedge position，$c_{\text{unw}}\approx0$。

多頭 put 類似：$K-S_{\text{dec}}-c_{\text{ex}}-c_{\text{unw}}>0$ 才 exercise。

**收盤前還有第三個選項**：直接在市場上賣掉 option。比較：

| 選項 | 每股淨值（例：50 call，現貨 50.06，exercise 費 0.005，賣股票成本 0.01，option bid 0.04） |
|---|---|
| 賣出 option | 0.04 |
| 收盤前賣股票 + exercise | $0.06-0.005-0.01=0.045$ |
| 什麼都不做、等自動 exercise、週一再處理股票 | 期望約 0.045，但帶著週末跳空風險 |

expiration date 的 deep ITM／近 ITM option bid 常低於內含價值（intrinsic value）（做市（market making）者要補償自己的 exercise 成本與風險），所以「賣股票 + exercise」常常勝過「賣 option」。

#### 盤後變動

假設某市場允許收盤後一段時間內提交 exercise 或不 exercise 指示（這因交易所與帳戶類型而異）：

- 你持有 100 口 40 put，收盤時現貨 40.05（OTM 0.05，不會被自動 exercise）。收盤後公司發布壞消息，盤後交易 39.60。若仍在截止時間內，**主動 exercise**的價值約 $40-39.60=0.40$ 再減去成本，約 0.38 元／股，100 口 ≈ 3,800 美元。但你 exercise 後會變成空頭股票，週一開盤前帶著空頭——這是有風險的選擇，不是免費的錢。
- 反向：你持有的 call 收盤 ITM 0.06，盤後跌到 OTM 0.30 → 提交**不 exercise**通知（若規則允許），否則你會以高於市價的價格買進股票。
- **空方的視角**：你看不到別人的決策。收盤時 OTM 的空頭 option，仍可能因盤後消息被 exercise——這正是 pin risk 不只出現在「剛好收在 strike」的原因。

### 4.5 自動履約門檻（通用描述）

> 💡 **一句話**：自動 exercise 門檻依交易所而定，只是預設、可被推翻；一定要查合約規格。

多數清算機構會在到期時，自動替 ITM 達到某個門檻的 option 執行 exercise，除非持有人提交不 exercise 指示（第 3 章 3.6）。通用要點：

- 門檻以「ITM 多少」表示，例如 ITM 0.01 個價格單位以上即自動 exercise；**實際數值、是否區分帳戶類型（如散戶 vs 專業）、以哪一個價格判定 ITM，都因交易所與清算機構而異，必須查該商品的合約規格**。
- 判定 ITM 所用的價格，可能是正規交易時段收盤價，也可能是其他官方價格；與你在盤後看到的價格不一定相同。
- 持有人可以「推翻」自動 exercise：ITM 但不想 exercise 時提交不 exercise，OTM 但想 exercise 時主動提交 exercise。
- 對空方而言：**自動 exercise 門檻只是對對手行為的一個預設，不是保證**。

> **交易員會怎麼說**：「收在 100.02，門檻是 0.01，預設會被全部 exercise——但我只把它當作 70% 的機率在 hedge，因為大戶可能盤後看到新聞就提交不 exercise。最乾淨的做法是收盤前把這 300 口買回來。」

### 4.6 現金結算 vs 實物交割

> 💡 **一句話**：cash settlement 沒有 pin risk，但 settlement price 可能用你已經無法交易的價格計算。

| 項目 | 實物交割（股票、ETF） | 交割成 futures position（futures option） | cash settlement（多數指數 option） |
|---|---|---|---|
| 到期後的 position | 股票多空 position | futures 多空 position | 只有現金 |
| Pin risk（position 不確定） | 有 | 有（交割成的 futures 仍要處理；若該 futures 同日到期，實際上等同 cash settlement） | 無 |
| settlement price 風險 | 低（以實際交易價格為準） | 低至中 | **有**：settlement price 的計算方式可能是收盤價、開盤特別報價（quote）、或一段時間的平均，不一定是你最後能交易的價格 |
| 最後交易時點與 settlement 時點的落差 | 通常一致 | 視合約 | 部分商品在最後交易日之後才以隔日開盤價格計算 settlement price，中間你無法交易該 option |
| 到期前要做的事 | 處理近 ATM 空頭、確認 exercise 決策 | 同左，並確認交割成的 futures 月份 | 評估 settlement price 窗口的風險，必要時在 settlement 窗口內用 futures 或成分股 hedge |

**cash settlement 不等於沒有到期風險**：若 settlement price 以 expiration date 早上的開盤價格計算，而 option 前一天收盤就停止交易，你等於帶著一個「無法調整的 gamma position」過一夜。

### 4.7 到期前的部位清理

> 💡 **一句話**：到期前列出近 ATM strike、做「到期後 position 情境表」，先處理空頭近 ATM position，事後第一時間核對。

**到期前 1–3 天的清單**：

1. **列出所有「現貨 ±2 個 standard deviation（到期前剩餘期間）」內的 strike**，標示多空與口數。這些是唯一需要密切管理的 position。
2. **算「到期後 position」情境表**：對現貨收在每個 strike 附近的幾個值，列出全部 exercise／assign 後的 underlying position（delta 用 0 或 1 計算，而不是 BS delta）。

   例：多 200 口 95 call、空 300 口 100 call、空 100 口 105 put、持有 −50 口等值股票（每口 100 股，以口數表示）。

   | 收盤價 | 95C（+200） | 100C（−300） | 105P（−100） | 股票 | 到期後 underlying position（口） |
   |---|---|---|---|---|---|
   | 94 | 0 | 0 | +100 | −50 | +50 |
   | 97 | +200 | 0 | +100 | −50 | +250 |
   | 101 | +200 | −300 | +100 | −50 | −50 |
   | 106 | +200 | −300 | 0 | −50 | −150 |

   （空 put 被 assign = 買進 underlying。）在 100 附近，position 會在 +250 與 −50 之間跳 300 口——這就是要處理的地方。
3. **處理近 ATM 空頭**：買回、交叉平倉、或縮小到能承受的程度。
4. **確認 deep ITM position 的 hedge 已經對齊**：例如多頭 deep ITM call 用空頭股票 hedge，到期自動 exercise 後兩者會相互抵銷；若你提前平掉了其中一邊，另一邊就會變成裸 position。
5. **確認 exercise 決策與截止時間**：哪些要主動 exercise、哪些要提交不 exercise。
6. **到期後第一時間核對**：實際 assign 結果、underlying position、保證金（margin），然後再開始新的交易。

## 交易員視角

- **Optibook 提醒**：環境說明指出 position 不會自動到期或重設，只能交易出場；若模擬賽有到期結構，請以該場賽事的規則為準。無論如何，「最後幾分鐘的 gamma 尖峰」與「不要把大量 ATM 空頭帶到最後」在任何有到期的市場都適用。
- **培訓中的 expiration date 題目**：常見問法是「收盤前 10 分鐘，現貨 100.03，你空 500 口 100 call，你會怎麼做？」評分重點通常不是你選了哪個動作，而是你有沒有：(1) 量化不確定性（30,000 股 × 可能跳空）；(2) 比較處理成本；(3) 給出明確動作與時間點；(4) 提到到期後要核對。
- **quote 行為**：market making 者在最後一天對近 ATM strike 通常會拉寬價差、降低數量，因為 gamma 尖峰讓存貨風險與被挑選風險（P8）都放大。若你是 market making 者，expiration date 的 quote 規則應與平日不同。
- **理論值的檢查**：到期前 deep ITM option 的理論值應非常接近 intrinsic value；若你的模型給出明顯高於 intrinsic value 的 bid，先檢查剩餘時間與 volatility 輸入（例如是否仍用日曆時間計算週末）。

## 常見誤區

1. **誤解**：ATM option 最後一天的 theta 是固定的。→ **正解**：theta ∝ $1/\sqrt\tau$，最後幾小時加速；瞬間 theta 只有最後時段平均耗損的一半。
2. **誤解**：收盤在 strike 之下，空頭 call 就安全了。→ **正解**：持有人可以主動 exercise（例如盤後利多）；收盤 OTM 不等於不會被 assign。
3. **誤解**：自動 exercise 門檻是全世界統一的 0.01。→ **正解**：門檻、判定價格、帳戶類型差異都依交易所／清算機構規定，必須查規格。
4. **誤解**：cash settlement 就沒有到期風險。→ **正解**：沒有 pin risk，但有 settlement price 風險；settlement price 可能用你無法交易的價格計算。
5. **誤解**：ITM 就應該 exercise。→ **正解**：要扣除 exercise 費、處理股票的成本，並使用決策時點的價格；ITM 0.01 但成本 0.02 時應該放棄。
6. **誤解**：用 BS delta 就能管理到期 position。→ **正解**：最後一天要改用「到期後 position」情境表（delta 取 0 或 1），因為 BS delta 在 strike 附近每分鐘都在大幅改變。

## 重點摘要

| 項目 | 規則／數字（$S=K=100$、20%、交易時間） |
|---|---|
| ATM 價值 | $0.4S\sigma\sqrt\tau$：5 天 1.12、1 天 0.50、1 小時 0.20 |
| ATM gamma | 5 天 0.14、1 天 0.32、1 小時 0.81（∝ $1/\sqrt\tau$） |
| Theta 與 gamma | $\Theta=-\tfrac12\Gamma S^2\sigma^2$（$r=0$） |
| 最後時段耗損 | 平均速率 = 起點瞬間速率 × 2（因 $C\propto\sqrt\tau$） |
| 1 天 standard deviation | $\sigma/16$：20% → 1.25% |
| Gamma 尖峰 | 剩 1 小時：±0.5 元內 delta 從 0.16 到 0.84；±2 元外 gamma ≈ 0 |
| Pin risk | 實物交割 + 空頭近 ATM + position 不確定；量化 = 不確定股數 × 可能跳空 |
| exercise 條件（call） | $S_{\text{dec}}-K>c_{\text{ex}}+c_{\text{unw}}$，用決策時點價格 |
| 自動 exercise | 門檻依交易所而定；只是預設，可被推翻 |
| cash settlement | 無 pin risk，有 settlement price 風險 |
| 清理清單 | 列近 ATM strike → 到期後 position 情境表 → 處理空頭 → 對齊 hedge → 確認 exercise → 事後核對 |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A2、B4、B5、C4）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 為什麼到期前 ATM vega 縮小，而 gamma 與 theta 放大？用 $\sqrt\tau$ 說明。

<details><summary>解答</summary>

ATM $\mathcal V\approx0.4S\sqrt\tau$（每 1.00 vol），隨 $\sqrt\tau$ 縮小：剩下的時間少，volatility 水準能影響的總變異數 $\sigma^2\tau$ 也少。$\Gamma\approx0.4/(S\sigma\sqrt\tau)$ 隨 $1/\sqrt\tau$ 放大：剩餘期間的 standard deviation $S\sigma\sqrt\tau$ 越小，delta 從 0 走到 1 所需的現貨距離越短。$\Theta=-\tfrac12\Gamma S^2\sigma^2$ 跟著 gamma 一起放大。

</details>

**A2.** ⭐ 解釋「收盤 OTM 的空頭 option 仍可能被 assign」的兩個原因。

<details><summary>提示</summary>

想兩件事：持有人能不能不管自動 exercise、自己主動提交 exercise（例如盤後出現消息）？判定「ITM」用的官方價格，跟你看到的價格一定一樣嗎？

</details>

<details><summary>解答</summary>

(1) 持有人可以主動提交 exercise，不受自動 exercise 門檻限制——例如收盤後出現消息、盤後價格已經 ITM，或持有人需要 underlying position（例如用來抵銷他自己的空頭）。(2) 判定 ITM 的官方價格與你看到的價格可能不同（例如不同交易時段或 settlement price 定義），邊界附近的判定不一定如你預期。

</details>

**A3.** 為什麼 expiration date deep ITM option 的市場 bid 常低於 intrinsic value？這對持有人的決策有什麼影響？

<details><summary>解答</summary>

買方（多半是 market making 者）買進後需要 exercise 或對沖，要付 exercise 費、underlying 交易成本並承擔處理期間的風險，所以只願意以低於 intrinsic value 的價格買。持有人應比較「賣 option」與「自己賣 underlying + exercise」，後者常較好（見 4.4 表）。

</details>

**A4.** cash settlement 的指數 option 沒有 pin risk，卻仍可能在 expiration date 有很大的意外損益。說明原因。

<details><summary>解答</summary>

settlement price 可能以你無法交易該 option 的時點（例如隔日開盤或一段平均時間）的價格計算。若最後交易時點與 settlement price 計算時點之間有落差，你帶著一個無法調整的 gamma position 承受跳空；即使沒有落差，settlement price 的計算方式（平均、特別 quote）也可能偏離你最後 hedge 時的價格。

</details>

**A5.** 「到期後 position 情境表」為什麼用 0 或 1 的 delta，而不是 BS delta？

<details><summary>解答</summary>

到期時 option 不是被 exercise 就是作廢，轉換成的 underlying position 是整數口（全有或全無）。BS delta 是「機率加權」的平均，對到期後實際會持有多少 underlying 沒有直接意義；而且最後一天在 strike 附近，BS delta 變動極快，不適合當作規劃依據。

</details>

### B. 計算題

**B1.** $S=K=100$、$\sigma=20\%$、$r=0$、交易時間。(a) 求剩 2 天的 ATM gamma；(b) 用 1 天 gamma 0.3166 與 $\sqrt\tau$ 規則驗證。

<details><summary>解答</summary>

(a) $\tau=2/252$，$\Gamma=\phi(d_1)/(S\sigma\sqrt\tau)$，$d_1=\tfrac12\times0.2\times\sqrt{2/252}=0.0089$，得 **0.2239**。
(b) $0.3166/\sqrt2=0.2239$，相同。

</details>

**B2.** 同上參數，用心算估計剩 1 天的 ATM straddle 價值，並與精確值比較。

<details><summary>解答</summary>

$0.8\times S\sigma\sqrt{1/252}=0.8\times100\times0.2\times0.0630=$ **1.008**；精確（BS）1.005。

</details>

**B3.** 你賣出 200 口剩 1 天的 ATM straddle（每口 100 股，參數同上）。(a) 今天的 theta 收入約多少（以起點速率計）？(b) 用 gamma 近似，現貨移動多少時 gamma 虧損剛好抵銷 theta？

<details><summary>解答</summary>

(a) 每組 straddle theta 速率 $2\times0.2513=0.5026$／交易日 → $200\times100\times0.5026=$ **約 10,052 美元**。
(b) 每組 gamma $2\times0.3166=0.6332$。$\tfrac12\times0.6332\times\delta S^2=0.5026$ → $\delta S=\sqrt{2\times0.5026/0.6332}=$ **1.26 元**，正好是一天 1 個 standard deviation（$100\times0.2/\sqrt{252}$）。

</details>

**B4.** ⭐ 你空 300 口 100 call（每口 100 股），已持有 +15,000 股 hedge。收盤 100.02。(a) 到期後股票 position 的可能範圍？(b) 若週一開盤跳空 2%，最壞的損益？(c) 收盤前以 0.06 買回全部 call 的成本？

<details><summary>提示</summary>

(a) 分「全部被 assign」和「都沒被 assign」兩種情況，把 +15,000 股加上被 assign 造成的股票變化（每口 100 股）；(b) 找出錯邊的那個 position，乘上 2 元的跳空；(c) 口數 × 100 股 × 每股價格。

</details>

<details><summary>解答</summary>

(a) 全部被 assign：$15{,}000-30{,}000=$ **−15,000 股**；都沒被 assign：**+15,000 股**。
(b) 最壞：持有 +15,000 股遇上跌 2 元，或 −15,000 股遇上漲 2 元，都是 **−30,000 美元**。
(c) $300\times100\times0.06=$ **1,800 美元**。

</details>

**B5.** ⭐ 你持有 50 call，決策時點現貨 50.03。exercise 費每股 0.01，exercise 後賣出股票的成本每股 0.015。應該 exercise 嗎？若現貨是 50.02 呢？

<details><summary>提示</summary>

用 4.4 的 exercise 條件：ITM 幅度（現貨 − 50）減掉 exercise 費和賣股票的成本，看結果是正還是負。兩個現貨價各算一次。

</details>

<details><summary>解答</summary>

50.03：$0.03-0.01-0.015=+0.005>0$ → **exercise**（利潤很薄）。
50.02：$0.02-0.025=-0.005<0$ → **放棄**（若會被自動 exercise，要提交不 exercise 指示）。若 exercise 後的股票剛好可以抵銷你手上的空頭 hedge，$c_{\text{unw}}\approx0$，兩種情況都應 exercise。

</details>

**B6.** 你持有 100 口 40 put（每口 100 股）。收盤 40.05，收盤後壞消息，盤後價格 39.60，仍在 exercise 截止時間內。exercise 費每股 0.01，預期週一回補空頭股票的成本每股 0.01。主動 exercise 的期望淨值是多少？

<details><summary>解答</summary>

每股 $40-39.60-0.01-0.01=0.38$；$100\times100\times0.38=$ **3,800 美元**。但這是以「盤後價格 = 週一回補價格」為前提；exercise 後你持有 10,000 股空頭過週末，必須評估反彈風險，也要確認該市場是否允許這樣的盤後決策。

</details>

**B7.** 剩 1 小時，$K=100$、$\sigma=20\%$。現貨 100.2 時，用 $N(d_2)$ 估計 call 收在 ITM 的機率；並比較剩 1 天時的值。

<details><summary>解答</summary>

1 小時：$\tau=1/1638$，$\sigma\sqrt\tau=0.004942$，$d_2=[\ln(1.002)-\tfrac12\times0.004942^2]/0.004942=0.4018$，$N(d_2)=$ **0.656**。
1 天：$\sigma\sqrt\tau=0.0126$，$d_2=0.1524$，$N(d_2)=$ **0.561**。
越接近到期，同樣的 0.2 元距離代表越多個 standard deviation，結果越「確定」。

</details>

**B8.** 剩 1 小時，100 call 在現貨 100 時 delta 0.50，現貨 100.5 時 0.84。你多 400 口（每口 100 股）。現貨從 100 漲到 100.5，你的 delta 變化多少股？若改成剩 1 天（delta 0.50 → 0.66）呢？

<details><summary>解答</summary>

1 小時：$400\times100\times(0.84-0.50)=$ **+13,600 股**。1 天：$400\times100\times0.16=$ **+6,400 股**。同樣 0.5 元的移動，最後 1 小時的 delta 變化是 1 天時的兩倍多。

</details>

### C. 情境題

**C1.**（教練拍肩）「收盤前 10 分鐘，現貨 100.03，你空 500 口 100 call、多 250 口等值股票。你怎麼做？說給我聽。」（每口 100 股）

<details><summary>解答</summary>

示範口述：「我的到期後 position 會在 +25,000 股（沒被 assign）和 −25,000 股（全被 assign）之間，不確定範圍 50,000 股。錯邊的 25,000 股遇上 1.5% 的週末跳空就是約 37,500 美元，2% 跳空是 50,000 美元。100 call 現在大約 0.05–0.08，買回 500 口成本約 2,500 美元–4,000 美元。我會**現在就買回大部分**，比如 400 口，剩下 100 口配合 5,000 股股票（等於假設一半機率），到期後第一時間核對 assign 結果並在開盤前修正。」

</details>

**C2.**（盤中決策）週五收盤後，你持有大量剛好 ITM 0.04 的 call（多頭），原本打算讓它自動 exercise 並已在收盤前賣出等量股票。盤後公司宣布不利消息，股價跌到 strike 下方 0.50。你的選擇？

<details><summary>解答</summary>

若規則允許在截止時間前提交不 exercise：比較兩條路。(1) 照原計畫 exercise：以 K 買進股票，抵銷收盤前賣出的股票，鎖定原本的 0.04（扣成本）。(2) 不 exercise：保留收盤前賣出的空頭股票，它現在每股多賺約 0.54，但你帶著 short position 過週末。option 的「價值」此刻是 0（OTM），exercise 就是以 K 買進一個只值 K−0.50 的東西——但你同時有空頭股票要回補。若你想保持中立，就**照常 exercise**（鎖定）；若你願意承擔方向風險，就不 exercise、保留空頭。關鍵是清楚認知這是「要不要帶方向過週末」的選擇，而不是「白賺 0.50」，並遵守 desk 的過夜限額。

</details>

**C3.**（cash settlement）你的指數 option 最後交易日是週四收盤，settlement price 以週五早上各成分股開盤價計算。週四收盤時你空了大量剛好 ATM 的週 option。你的風險是什麼？可以怎麼處理？

<details><summary>解答</summary>

option 週四收盤後停止交易，但 settlement price 由週五開盤決定：你帶著一個無法調整的空頭 gamma position 承受隔夜跳空，且 settlement price 可能偏離開盤後第一筆 futures 價格。處理：週四收盤前縮小近 ATM 空頭；或持有 futures／成分股 position，在週五開盤（settlement price 形成的時段）平掉，使你的 hedge position 以接近 settlement price 的價格出場；確認 settlement price 計算規則，避免 hedge 時點錯位。

</details>

**C4.** ⭐ （position 清理）明天到期。你的書很大，只有 30 分鐘做清理。依優先順序列出你會做的事。

<details><summary>提示</summary>

照 4.7 的清單想：先找出「哪些 strike 需要管」，再找「position 會跳最大的地方」，接著想哪些 position 的風險不由你控制、應該最先處理。

</details>

<details><summary>解答</summary>

(1) 列出現貨 ±2 個（剩餘期間）standard deviation 內的 strike 與多空口數；(2) 做到期後 position 情境表，找出 position 跳動最大的 strike；(3) 先處理**空頭**近 ATM position（買回或交叉平倉），因為它們有 pin risk 且不由你控制；(4) 確認 deep ITM position 的 hedge 已對齊，不會在自動 exercise 後留下裸 position；(5) 標記需要主動 exercise／不 exercise 的 position 與截止時間；(6) 排定到期後核對的時間與負責人。

</details>

### D. 挑戰題

**D1.** (a) 在 $r=0$ 下，從 $C_{\text{ATM}}\approx0.4S\sigma\sqrt\tau$ 推導：若現貨始終停在 strike，從剩 $\tau_0$ 到到期的平均 theta 速率是 $\tau_0$ 時瞬間速率的兩倍。(b) 證明期間內 1 個 standard deviation 的移動 $\delta S=S\sigma\sqrt{\delta t}$ 恰好讓 $\tfrac12\Gamma\,\delta S^2=-\Theta\,\delta t$。(c) 用 (a)(b) 解釋：為什麼賣出最後一天的 ATM straddle「看起來很賺」，但其實是公平的賭局？

<details><summary>解答</summary>

(a) 瞬間速率 $-dC/d\tau=0.4S\sigma/(2\sqrt{\tau_0})=C(\tau_0)/(2\tau_0)$。平均速率 $=C(\tau_0)/\tau_0$，是瞬間速率的兩倍。
(b) $r=0$ 時 $\Theta=-\tfrac12\Gamma S^2\sigma^2$（每年），所以 $-\Theta\,\delta t=\tfrac12\Gamma S^2\sigma^2\delta t=\tfrac12\Gamma(S\sigma\sqrt{\delta t})^2$。
(c) 最後一天 theta 很大，現貨不動時 straddle 賣方賺得很快；但 gamma 也同樣大，一個 standard deviation 的移動就吃掉全部 theta，兩個 standard deviation 的移動虧損是 theta 的 4 倍。在模型下期望值（expected value, EV）為零；真正的優勢只來自「實現波動率（realized volatility）低於隱含波動率（implied volatility）」，再加上 expiration date 特有的 pin risk、跳空與 hedge 成本，空方的尾部風險往往被低估。

</details>

## 自我檢核清單

- [ ] 能不看表說出 20% volatility 下 ATM gamma 在 5 天／1 天／1 小時的量級，並用 $\sqrt\tau$ 規則互相換算。
- [ ] 能解釋 $\Theta=-\tfrac12\Gamma S^2\sigma^2$ 與「1 個 standard deviation 移動 = breakeven」。
- [ ] 能說明最後一小時 gamma 尖峰的形狀與 hedge 含義。
- [ ] 能描述 pin risk 情境並量化 position 不確定性與處理成本。
- [ ] 能寫出含交易成本的 exercise 條件，並說明盤後價格變動如何改變決策。
- [ ] 能以通用語言說明自動 exercise 門檻，並強調須查合約規格。
- [ ] 能比較 cash settlement、實物交割、futures 交割的到期風險。
- [ ] 能做出到期後 position 情境表並列出清理優先順序。

## 對應練習工具

- [心算速練](../tools/mental-math.md)：$\sigma/16$、ATM straddle、$\sqrt\tau$ 縮放。
- [教練拍肩問](../tools/coach-questions.md)：「收盤前 10 分鐘，你空 500 口 ATM call」類口述練習。
- [模擬造市遊戲](../tools/mock-market-making.md)：感受接近到期時 delta 擺盪對 hedge 頻率的影響。
- Natenberg 對應章節：[第 3 章](../lessons/ch03_contract_specs.md)（exercise、assign、自動 exercise）、[第 8 章](../lessons/ch08_dynamic_hedging.md)、[第 9 章](../lessons/ch09_risk_measurement_2.md)、[第 15 章](../lessons/ch15_option_arbitrage.md)（pin risk、settlement 風險）、[第 16 章](../lessons/ch16_early_exercise.md)。
- Lab：[`lab06_dynamic_hedging`](../labs/exercises/lab06_dynamic_hedging.py)（把到期時間縮短到幾天，觀察 hedge 損益的變異如何放大）。
