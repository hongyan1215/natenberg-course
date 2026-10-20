# 第 23 章　模型與真實世界（Models and the Real World）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：Black-Scholes 像一張「理想道路」地圖——假設路面平、沒坑洞、車速固定。本章逐條看真實道路哪裡不一樣：有交易成本、有跳空、波動率（volatility）會忽高忽低、極端行情比模型想的常見。

**你只需要先記住這 5 件事**

1. **模型有六大假設，現實全都會破。** 無摩擦市場、利率固定、volatility 固定、連續交易、volatility 與價格無關、對數常態（lognormal）。最常害到你的是：借不到錢（保證金（margin））、交易成本、跳空。
2. **volatility「出現的順序」會改變避險（hedge）結果。** 價平（at-the-money, ATM）選擇權（option）快到期時 gamma 最大，喜歡「先靜後動」；價外（out-of-the-money, OTM）option 早期 gamma 較大，喜歡「先動後靜」。但平均大量路徑，BS 還是對的。
3. **跳空時：負 gamma 一定虧，正 gamma 反而賺。** 動態避險（dynamic hedging）來不及調整。最危險的組合是「低波動 + 臨到期 + ATM + 賣方」。例：volatility 18%，跳 4 元，1 天到期跨式（straddle）每口淨虧 3.23，6 個月到期只虧 0.49。
4. **真實報酬是「高峰、細腰、肥尾（fat tails）」。** 極端行情比常態分配（normal distribution）說的常見得多：7 個標準差（standard deviation）的大跌，模型說約 7,800 億分之一，現實十年內就碰到。所以傳統模型傾向低估 option，長期隱含波動率（implied volatility）常高於實現波動率（realized volatility）。
5. **利率風險通常很小。** 例外是深價內（deep in-the-money, deep ITM）、長天期的 option，rho 最大。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 這次跌幅是幾個 standard deviation | 跌幅 ÷ 日報酬 standard deviation |
| 常態下 k 個 standard deviation 的機率 | 3σ ≈ 741 分之一；4σ ≈ 3.16 萬分之一；6σ ≈ 10.1 億分之一 |
| 偏態（skewness） | 三次動差 ÷ standard deviation³；負的 = 左尾長（股價指數常見） |
| 超額峰態（kurtosis） | 四次動差 ÷ standard deviation⁴ − 3；正的 = fat tails |
| 到期 straddle 的期望值（expected value, EV） | 各情境「機率 × 到期價值」加總，再減成本 |

**必做練習（約 20 分鐘）**：A4、B2、B6、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[常態與對數常態分配](https://hongyan1215.github.io/natenberg-course/tools/distribution/)工具，看看模型裡「幾個 standard deviation 以外」的機率有多小。

---

## 本章定位

使用定價模型的交易員面對兩種風險：**輸入值錯誤**（尤其是 volatility），以及**模型本身的假設不成立**。前面各章（[ch07](ch07_risk_measurement_1.md)、[ch09](ch09_risk_measurement_2.md)）用 Greeks 管理第一種風險；本章逐條檢查 Black-Scholes（[ch18](ch18_black_scholes.md)）與二元樹（binomial tree）（[ch19](ch19_binomial.md)）等傳統模型的假設，說明真實市場哪裡不同、對價格與 hedge 有什麼影響。這是下一章波動率偏斜（volatility skew）（[ch24](ch24_volatility_skews.md)）的直接前導。

## 學習目標

完成本章後，你應該能夠：

1. 列出傳統定價模型的六大假設，並逐條說明真實市場如何違反它們。
2. 解釋無摩擦市場假設的四個面向（自由買賣、借貸同利率、無交易成本、無稅）失效時的實務後果。
3. 判斷哪些 option 對利率變動最敏感，並用 rho 估計利率變動造成的價值變化。
4. 用 dynamic hedging 模擬說明「volatility 出現的順序」如何使 option 價值具有路徑相依性，並分辨 ATM 與 OTM option 受影響的方向。
5. 解釋跳空（gap）對不同天期、不同 volatility、不同 gamma 部位（position）的衝擊，以及為何臨到期 ATM option 最危險。
6. 定義並計算 skewness 與 kurtosis，解讀「fat tails」並用 normal distribution 計算極端事件的理論機率。

## 核心概念

> 對應原書：第 23 章〈Models and the Real World〉。以下數字均為自創或自行模擬。

### 23.1 傳統模型的假設清單

> 💡 **一句話**：傳統模型靠六個假設撐著；本章逐條拆，看現實哪裡不一樣。

所謂「傳統模型」指 Black-Scholes 及其變形，以及 Cox-Ross-Rubinstein binomial tree。它們共同假設：

1. **市場無摩擦（frictionless）**
   - A. 標的（underlying）可以不受限制地自由買賣
   - B. 可以無限借貸，且借貸利率相同、適用所有交易
   - C. 沒有交易成本
   - D. 沒有稅負影響
2. **利率**在 option 存續期間固定不變
3. **volatility**在 option 存續期間固定不變
4. **交易是連續的**，underlying 價格沒有跳空
5. **volatility 與 underlying 價格無關**
6. 短時間內的**百分比價格變動呈 normal distribution**，因此到期時價格呈**對數常態分配（lognormal distribution）**

以下逐條檢視。

### 23.2 市場無摩擦（Markets Are Frictionless）

> 💡 **一句話**：underlying 不一定能買賣、借錢有利差、每次 hedge 都要付成本；margin 不夠可能被迫提早平倉。

#### A. 標的不一定能自由買賣

- **期貨（futures）漲跌停**：futures 觸及每日價格限制時市場被「鎖住」（locked），當天可能無法交易。
  - 繞道方法：(1) 改在現貨市場交易；(2) 交易**價差**——想買被鎖住的 6 月 futures，可先買「6 月／3 月價差」（買 6 月、賣 3 月），再於未鎖住的 3 月市場買回 3 月，最終只剩多 6 月；(3) 若 option 市場沒被鎖，用 option 組**合成（synthetic）futures**（[ch14](ch14_synthetics.md)）。
- **熔斷機制（circuit breakers）**：股市指數單日漲跌超過門檻時暫停交易一段時間。
- **放空限制**：若無法自由放空股票，賣權（put）相對買權（call）會被推高，conversion／reversal 看起來會「錯價」（[ch15](ch15_option_arbitrage.md)）。許多股票 option 交易員會**刻意保留一些多頭股票**，確保需要時可以賣出。

#### B. 借貸不自由、利率不相同

這是比較嚴重的缺陷：
- **margin**：即使開倉時資金充足，日後 margin 要求可能增加。模型假設你永遠能借到錢存入結算所（clearinghouse），而且 clearinghouse 付同樣的利息，所以 margin「沒有成本也不會有問題」。現實中借貸能力有限，**繳不出 margin 可能被迫在到期前平倉**，而所有模型（含允許提前履約（early exercise）的模型）都假設你可以選擇持有到到期。
- **借貸利率不同**：你以較高利率借錢，存在 clearinghouse 只拿到較低利率。

> 例：一位交易員需要額外存入 $2,000,000 margin 3 個月，以 6.5% 借入，但存放只收到 4.5%。模型認為成本為 0，實際成本 = $2{,}000{,}000 \times (6.5\% - 4.5\%) \times 0.25 = \$10{,}000$。

經驗法則：評估 position 風險時，不只看「最多會虧多少」，也要看「**維持這個 position 最多需要多少 margin**」。

> 補充：期貨選擇權（futures option）的變動保證金（variation）多已納入模型，這也是 futures option 的 conversion／reversal 不一定 delta 中性的原因。

#### C. 交易成本

一定存在：經紀商手續費、結算（settlement）費、交易所會員成本、買賣價差（bid-ask spread）。而且不只在開倉、平倉時發生，**每次調整 hedge 都會發生**。高 gamma position 需要頻繁再 hedge，交易成本可能吃掉大部分理論利潤。

> 例：你買進 2,000 口 straddle，理論優勢（theoretical edge）每口 0.30，總計 $600（以每點 $1 計）。position gamma 很高，預計到期前要再 hedge 50 次，平均每次交易 400 股、每股成本 0.02，交易成本 = $50 \times 400 \times 0.02 = \$400$，理論利潤只剩三分之一。

#### D. 稅負

對多數交易員是次要的，很少會讓一個策略比另一個好；但在投資組合管理或涉及股利（dividend）（dividend 稅制與資本利得不同）的策略中可能重要。

### 23.3 利率固定（Interest Rates Are Constant）

> 💡 **一句話**：利率風險通常很小，只有 deep ITM、長天期的 option rho 才大。

模型假設所有現金流都以單一固定利率投資或借入。現實中：
- 交易員不斷開倉、平倉，需要流動性，因此多向 settlement 公司以**浮動利率**借貸；settlement 公司每天告知適用利率。
- 還有「適用哪一個利率」的問題：借款利率、放款利率、**放空股票回扣利率（short stock rebate）**——後者取決於該股票借券難易度。

**利率風險通常較小**：大多數活躍 option 在一年內到期，利率需要大幅變動才會顯著影響價值；與 underlying 價格、volatility 的影響相比更是小。

**例外**：deep ITM、長天期的股票 option rho 最大。利率上升 → 遠期價格（forward price）上升 → call 漲、put 跌。

> 例：股價 50，2 年到期，volatility 30%，無 dividend。利率從 2% 升到 5%：
>
> | 履約價（strike price） | Call @2% | Call @5% | Put @2% | Put @5% | Call rho @2% | Put rho @2% |
> |---|---|---|---|---|---|---|
> | 40 | 14.57 | 16.10 | 3.00 | 2.29 | 0.506 | −0.263 |
> | 50 | 9.25 | 10.60 | 7.29 | 5.84 | 0.435 | −0.525 |
> | 60 | 5.71 | 6.78 | 13.36 | 11.07 | 0.337 | −0.816 |
>
> （rho 以每 1 個百分點計。）deep ITM 的 40 call 用 rho 估計：$0.506 \times 3 = 1.52$，實際變動 1.53。deep ITM 的 60 put 跌了 2.29。相比之下，3 個月到期的 ATM 50 call 從 3.11 只漲到 3.29。
>
> 規律：天期越長、越價內（in-the-money, ITM），rho 絕對值越大；長期 option（LEAPS 類）普及後，交易員需要留意這個風險。

### 23.4 波動率固定（Volatility Is Constant over the Life of the Option）

> 💡 **一句話**：同樣的 realized volatility，出現的順序不同，hedge 結果就不同；ATM 怕先動後靜，OTM 怕先靜後動。

**模型的看法**：輸入一個 volatility，模型就假設 1 個、2 個、3 個 standard deviation 的變動以常態比例**均勻散布**在整個存續期間。

**現實**：volatility 會成群出現——有高波動期、有低波動期，合起來才是一個整體 volatility。模型並不在乎 volatility**以什麼順序**出現。

#### 自創模擬：同樣 25% 的實現波動率，不同順序

設定：64 個交易日（每天都交易，以 365 天年化），利率 0，underlying 從 100 開始，用 Black-Scholes 以 25% 計算每日收盤 delta 並 dynamic hedging。兩條路徑：

- **volatility 下降**：前 32 天每日對數報酬絕對值 1.656%，後 32 天 0.828%（以 +、−、−、+ 循環，價格在 98.4–101.7 間擺盪，最後回到 100）。
- **volatility 上升**：把上面的路徑**倒過來**。

兩條路徑的 realized volatility 都**剛好是 25%**（零均值、母體 standard deviation）。用「到期損益 − hedge position 累積損益」計算複製每個 option 所需的成本：

| strike | BS call | BS put | 下降情境 call | 下降情境 put | 上升情境 call | 上升情境 put |
|---|---|---|---|---|---|---|
| 85 | 15.25 | 0.25 | 15.37 | 0.37 | 15.14 | 0.14 |
| 90 | 10.82 | 0.82 | 11.02 | 1.02 | 10.63 | 0.63 |
| 100 | 4.17 | 4.17 | **3.02** | **3.02** | **4.57** | **4.57** |
| 110 | 1.08 | 11.08 | 1.29 | 11.29 | 0.89 | 10.89 |
| 115 | 0.47 | 15.47 | 0.65 | 15.65 | 0.31 | 15.31 |

**為什麼？**
- 做多 volatility 的 position（如買 straddle）在 **gamma 最大的時候**遇到高波動，獲利最多。
- **ATM**option 的 gamma 隨到期接近而增加 → volatility 在後期升高（上升情境）對它最有利：100 straddle 價值 9.14 > BS 的 8.35。反之，後期平靜時 theta 加速流失，下降情境下 straddle 只值 6.04。
- **OTM**option 的 gamma 在存續早期較大（越接近到期，OTM option gamma 越趨近 0）→ **早期**高波動（下降情境）對它有利：115 call 下降情境 0.65 > BS 0.47 > 上升情境 0.31。
- 利率為 0 時同 strike 的 call、put 時間價值（time value）相同，差異只有內含價值（intrinsic value）。

**路徑相依（path dependent）**：若不 hedge、持有到到期，option 價值只取決於到期價格；但**一旦 dynamic hedging**，option 的實際價值就取決於 underlying 走過的路徑。

**那 Black-Scholes 還可靠嗎？** 它是**機率模型**：在大量隨機路徑下平均起來是對的。用同樣參數模擬 4,000 條隨機路徑（每日常態報酬、25% volatility）並 dynamic hedging，平均複製成本為：85 call 15.252（BS 15.250）、100 call 4.167（BS 4.174）、115 call 0.476（BS 0.474），差距都在抽樣誤差內。

**延伸**：
- **隨機 volatility 模型（stochastic volatility）**：假設 volatility 本身是隨機的，某些情況更合適，但增加複雜度，使用不廣。
- **利率商品**：債券到期必須回到面額，價格不可能是隨機漫步（random walk）；不同天期對利率敏感度不同、殖利率曲線各期限利率也不同，因此需要專門的利率模型。

### 23.5 交易是連續的（Trading Is Continuous）

> 💡 **一句話**：跳空讓 dynamic hedging 失效：負 gamma 必虧、正 gamma 得利；低波動、臨到期的 ATM 最危險。

**三種價格過程**：

```
(a) 擴散過程 diffusion        (b) 跳躍過程 jump          (c) 跳躍擴散 jump-diffusion
    ~~/\~~/\/\~~~                 ___                         ~~/\~~
                                     |___      ___                  |  ~/\~~/\
                                         |____|                     |_/
    筆不離紙                      價格停住 → 瞬間跳到新價      大多連續，偶爾跳空
```

- **連續擴散**：像某地的氣溫，從 25 度降到 22 度，中間一定經過 24、23 度。Black-Scholes 假設價格 24 小時、全年無休地連續變動：從 46.05 到 46.08 必經 46.06、46.07。因此也假設**可以在每一瞬間再 hedge**——這是捕捉理論價值（theoretical value）的基礎。
- **跳躍過程**：價格固定一段時間，然後瞬間跳到新水準。央行調整政策利率是典型例子。
- **真實世界**：兩者混合——大多時候連續，偶爾因收盤到隔日開盤、或盤中突發消息而跳空。

#### 跳空對空方跨式的衝擊

賣出 ATM 100 straddle 後，underlying 瞬間跳到 104。損失有多大取決於**到期時間**與**volatility**（利率 0，損失為已做 delta 中性後的淨損失）：

| 到期時間 | 1 天 | 1 週 | 1 個月 | 3 個月 | 6 個月 |
|---|---|---|---|---|---|
| **volatility 18%** | | | | | |
| straddle 初值 | 0.75 | 1.99 | 4.12 | 7.17 | 10.13 |
| straddle gamma（×100） | 85 | 32 | 15 | 9 | 6 |
| 跳到 104 後 straddle 值 | 4.00 | 4.13 | 5.36 | 8.00 | 10.82 |
| delta 中性空方淨損失 | 3.23 | 2.10 | 1.16 | 0.68 | 0.49 |
| **volatility 32%** | | | | | |
| straddle 初值 | 1.34 | 3.54 | 7.32 | 12.74 | 17.99 |
| straddle gamma（×100） | 48 | 18 | 9 | 5 | 4 |
| 跳到 104 後 straddle 值 | 4.01 | 4.93 | 8.13 | 13.38 | 18.63 |
| delta 中性空方淨損失 | 2.65 | 1.33 | 0.67 | 0.39 | 0.27 |

觀察：
1. **越接近到期，損失越大**：1 天 straddle 幾乎立刻變成 deep ITM call（delta ≈ 100），沒有時間讓市場回頭；1 年期 straddle 則還有時間回到 100。
2. **volatility 越低，損失越大**：ATM option 的 gamma 在低 volatility 時更高。
3. 結論：**低 volatility 市場中、臨到期的 ATM option**是最危險的 option 之一。

**為什麼 dynamic hedging 救不了**：跳空是瞬間的，你沒有機會在中途買進 underlying 調整 delta。option 本身會「自動、連續地」調整 delta——買方付錢買的正是這個特性；模型交易員試圖用手動 hedge 複製它，跳空時複製就失敗了。1987 年 10 月的大跳空讓**投資組合保險（portfolio insurance）**（[ch17](ch17_hedging_with_options.md)）無法連續調整，保護成本遠高於預期，就是這個原因。

**誰受傷、誰受益**：已做 delta 中性且打算 dynamic hedging 的 position 中，**負 gamma position 遇到跳空一定吃虧**；**正 gamma position 遇到跳空反而得利**（同樣沒機會調整，但這次對你有利）。

**跳躍擴散模型（jump-diffusion model）**：在 Black-Scholes 中加入跳空，理論上更準，但數學更複雜，並多出兩個輸入：**平均跳躍幅度**與**跳躍頻率**。如果估不準這兩個值，結果可能不比傳統模型好。許多交易員選擇用傳統模型加上經驗判斷來彌補。

**實證含意**：
- 越接近到期，越少依賴模型、越多依賴經驗。
- 長期來看，平均 implied volatility 幾乎總是**高於**平均歷史波動率（historical volatility）。部分原因是 hedge 者願意多付保費，但也可能因為模型不知道跳空存在，**真實 option 價值本來就高於模型值**——也就是傳統模型傾向**低估** option。
- 風險管理：大量賣出臨到期的 ATM option 非常危險，新手應避免，風控也不會喜歡老手這樣做。

### 23.6 到期跨式（Expiration Straddles）

> 💡 **一句話**：模型不知道跳空，臨到期 ATM 常被賣太便宜；買到期 straddle 常常小虧，但長期 expected value 可能為正。

既然臨到期賣 ATM option 很危險，那反過來**買進**臨到期的 ATM option 呢？這看似違反「time value 衰減最快」的常識，但：
- 賣方的報酬是加速的 theta，風險是巨大的負 gamma；因為模型不知道跳空，**風險常大於報酬**。
- 很多人在到期前習慣「賣 time value」，所以 ATM option 常被賣得偏便宜。

> 例：剩 3 天到期，模型給 ATM call 0.80。因為模型忽略跳空，真實價值很可能高於 0.80；若市場只賣 0.68，就很可能是好買點。由於 synthetic 關係，同 strike 的 put 也會偏便宜，因此合理策略是**買進 ATM straddle**，無論向上或向下跳空都獲利。

**管理方式**：理論上應定期再 hedge 維持 delta 中性，但臨到期時模型的 delta 也不可靠，無法判斷「正確的調整」。因此許多交易員**放棄調整、直接抱到到期**——不完美但實際。

**expected value 思維**：大多數時候不會跳空，單次交易虧損的機率較高。

> 例：一個 3 天到期 straddle 成本 1.20。假設 90% 的情況到期只值 0.70，10% 的情況因跳空值 6.50。
> expected value $= 0.9 \times 0.70 + 0.1 \times 6.50 = 1.28 > 1.20$。九成機率小虧 0.50，但長期每筆平均賺 0.08。

就像以低於理論價的價格買一張中獎機率很低的彩券：常常輸，但贏的那次足以彌補。注意**position 規模只能是虧得起的金額**，確保你能撐到長期。

### 23.7 波動率與標的價格無關（Volatility Is Independent of the Price）

> 💡 **一句話**：現實中 volatility 會跟著價格走：股指跌時更劇烈，商品漲時更劇烈。這就是下一章偏斜（skew）的源頭。

**模型假設**：輸入 20% volatility，不論 underlying 漲到 125 或跌到 75，1 個 standard deviation 都按 20% 計算。

**交易員經驗**：
- **股價指數**：下跌時更劇烈（volatility 上升），上漲時較平靜。
- **商品**：上漲時更劇烈（供給短缺時價格暴衝）。

也就是說，volatility**取決於價格移動方向**。

**常數彈性變異數模型（Constant Elasticity of Variance, CEV）**：價格變動仍隨機，但 volatility（變動幅度）隨 underlying 價格水準改變。和跳躍擴散模型一樣，它數學複雜，且需要額外輸入（volatility 與價格之間的數學關係），所以並未被交易員廣泛採用。這個特性在 [ch24](ch24_volatility_skews.md) 會以「skew」與「shifting volatility」的形式出現。

### 23.8 到期價格呈對數常態分配嗎？（Lognormal Distribution）

> 💡 **一句話**：真實日報酬幾乎都是「峰太高、腰太細、尾太肥」，不是漂亮的常態。

**檢驗方法**：如果每日百分比變動是常態，連續複利後到期價格就是 lognormal。所以畫出每日報酬的直方圖，疊上同平均數、同 standard deviation 的常態曲線比較。

**幾乎所有交易所商品都呈現同樣的偏離**（股價指數、原油、匯率、公債 futures 皆然）：

```
次數
 |            ▓▓              ← 峰太高：小變動的日子比常態多
 |          ▓▓▓▓▓▓
 |        ░▓▓▓▓▓▓▓▓░          ← 腰太細：中等變動的日子比常態少
 |      ░░▓▓▓▓▓▓▓▓▓▓░░
 | ▓  ░░░▓▓▓▓▓▓▓▓▓▓▓▓░░░  ▓   ← 尾太肥：大變動的日子比常態多
 +-------------------------------> 每日報酬
```

### 23.9 偏態與峰態（Skewness and Kurtosis）

> 💡 **一句話**：skewness 看左右不對稱，kurtosis 看尾巴肥不肥；fat tails 讓極端行情比模型說的常見得多。

normal distribution 只需平均數與 standard deviation 就能完全描述。描述「與常態差多少」時常用另外兩個數：

**skewness**：分配是否左右不對稱、哪一邊尾巴較長。

$$\text{Skew} = \frac{\frac{1}{n}\sum (x_i - \bar x)^3}{s^3}$$

- 正 skewness：右尾較長（lognormal distribution 就是正 skewness）。
- 負 skewness：左尾較長（股價指數通常如此——大跌比大漲更常見）。
- normal distribution skewness = 0。

**kurtosis**：中央峰是高聳還是扁平（通常同時伴隨尾巴是肥或瘦）。

$$\text{Kurt} = \frac{\frac{1}{n}\sum (x_i - \bar x)^4}{s^4} - 3$$

- 數學上 normal distribution 的 kurtosis 是 3；習慣上**減去 3**（超額 kurtosis，excess kurtosis），使常態 = 0（常態峰，mesokurtic）。
- 正 kurtosis（高峽峰，leptokurtic）：峰高、尾長、腰細——「fat tails」。
- 負 kurtosis（低闊峰，platykurtic）：峰低、尾短。

**正 kurtosis ≠ 低 standard deviation**：兩者都有高峰，但低 standard deviation 分配的尾巴**短**，正 kurtosis 分配的尾巴**長**。可以想像把 normal distribution 的兩側腰部往內擠：峰被擠高、尾被擠長。

> 例：某商品 8 天的日報酬（%）為 1, 1, 1, 1, 0, 0, −1, −3。
> 平均 = 0；母體 standard deviation $s = \sqrt{(4 \times 1 + 1 + 9)/8} = \sqrt{1.75} = 1.3229$
> 三次動差 $= (4 \times 1 - 1 - 27)/8 = -3$；Skew $= -3/1.3229^3 = -1.296$（左尾長）
> 四次動差 $= (4 + 1 + 81)/8 = 10.75$；Kurt $= 10.75/1.75^2 - 3 = 3.510 - 3 = 0.510$（略 fat tails）

**fat tails 有多肥？** 用 normal distribution 計算極端值的理論機率：

> 例：某指數日報酬 standard deviation 1.1%。樣本中最大跌幅 −7.7%，等於 **7 個 standard deviation**。常態下單日跌 ≥ 7σ 的機率約 $1.28 \times 10^{-12}$，也就是約 **7,800 億分之一**——以每年 252 個交易日計，要等數十億年才會出現一次，但真實市場十年內就碰到了。同一樣本最大漲幅 +5.39%（4.9σ），常態機率約 200 萬分之一。

| standard deviation 倍數 | 常態單尾機率 | 約為幾分之一 |
|---|---|---|
| 3σ | 1.35 × 10⁻³ | 741 |
| 4σ | 3.17 × 10⁻⁵ | 31,600 |
| 5σ | 2.87 × 10⁻⁷ | 349 萬 |
| 6σ | 9.87 × 10⁻¹⁰ | 10.1 億 |
| 7σ | 1.28 × 10⁻¹² | 7,810 億 |

這類「理論上幾乎不可能、實際卻發生」的事件常被稱為「黑天鵝」。

## 交易員視角

- **Optibook 連結：交易成本與再 hedge 頻率**。Optibook 有速率限制、bid-ask spread，每次調整 delta 都要付出半個價差。高 gamma position 不要每個 tick 都再 hedge，應設定 delta 容忍帶（例如 position delta 超過某門檻才用 IOC 單調整），在「hedge 誤差」與「交易成本」之間取捨。
- **部位限制（position limit） = 借貸不自由的翻版**。模型假設你能無限制交易 underlying，但 Optibook 的 position limit 可能讓你在最需要 hedge 時無法加碼。開倉前要預留 hedge 空間，不要讓 option position 大到需要的對沖量會撞到限制。
- **跳空風險**：Optibook 的價格可能因新聞或其他隊伍的大單瞬間跳動。若你是 ATM option 的淨賣方，臨到期時 position 要縮小；最怕的是「低波動 + 臨到期 + 大量負 gamma」。
- **正 gamma 的「免費」保險**：在跳空頻繁的環境中，帶一點正 gamma（例如買少量便宜的臨到期 straddle）可以抵銷做市（market making）過程中累積的負 gamma 風險。
- **路徑相依性**：即使你對 realized volatility 的預測完全正確，單次 dynamic hedging 的結果仍可能與理論差很多。評估策略時要看大量樣本的平均，而不是一次結果。

## 常見誤區

1. **誤解**：只要預測對 realized volatility，dynamic hedging 一定賺到理論價差。→ **正解**：volatility 出現的順序（相對於 gamma 大小的時點）會改變結果；只有在大量路徑的平均下才等於理論值。
2. **誤解**：利率風險對所有 option 都可以忽略。→ **正解**：短天期 option 可以；但 deep ITM、長天期 option 的 rho 很大，利率變動影響明顯。
3. **誤解**：長天期的空方 straddle 遇到跳空最慘，因為價值最大。→ **正解**：臨到期的 ATM option gamma 最大，跳空的淨損失最大，尤其在低 volatility 環境。
4. **誤解**：正 kurtosis 分配就是 standard deviation 較小的分配。→ **正解**：兩者峰都高，但正 kurtosis 的尾巴較長（fat tails），低 standard deviation 分配的尾巴較短。
5. **誤解**：更複雜的模型（跳躍擴散、CEV、隨機 volatility）一定比 Black-Scholes 好。→ **正解**：它們需要難以估計的額外輸入，估錯時結果可能更差；多數交易員用簡單模型加上經驗調整。
6. **誤解**：買臨到期 straddle 一定是爛交易，因為 theta 很大。→ **正解**：模型忽略跳空，臨到期 ATM option 常被低估；以低於理論價買進，單次常虧但長期 expected value 可能為正。

## 重點摘要

| 假設 | 現實 | 後果／對策 |
|---|---|---|
| 可自由買賣 underlying | 漲跌停、熔斷、放空限制 | 用價差、合成部位（synthetic position）繞道；保留多頭股票 |
| 無限借貸、同利率 | margin 限制、借貸利差 | 評估最大 margin 需求；模型價值打折 |
| 無交易成本 | 手續費、價差、每次再 hedge 都有成本 | 高 gamma position 理論利潤被侵蝕 |
| 無稅 | 偶有影響（dividend 稅） | 通常次要 |
| 利率固定 | 浮動利率、多種利率 | deep ITM 長天期 option rho 最大 |
| volatility 固定 | 高低波動期交替 | 路徑相依；ATM 怕「先動後靜」、OTM 怕「先靜後動」 |
| 連續交易 | 跳空 | 負 gamma 受害、正 gamma 受益；臨到期低波動 ATM 最危險 |
| volatility 與價格無關 | 股指跌時波動大、商品漲時波動大 | CEV 模型；skew（下一章） |
| lognormal | 高峰、細腰、fat tails、skewness | 模型低估極端事件 |

公式：
- skewness $= m_3 / s^3$；超額 kurtosis $= m_4 / s^4 - 3$（$m_k$ 為 $k$ 次中央動差）
- 常態尾機率：$P(Z \le -k) = N(-k)$

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A4、B2、B6、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 一位交易員想買進已觸及漲停而被鎖住的 6 月 futures，3 月 futures 仍可交易。他可以怎麼做？

<details><summary>解答</summary>

買進「6 月／3 月 futures 價差」（買 6 月、賣 3 月）——價差交易可能不受單月漲停限制——然後在 3 月 futures 市場買回 3 月合約，最後淨 position 只剩多 6 月。另一種方法是若 option 市場沒被鎖住，用買 call、賣 put 組成合成多頭（synthetic long）futures。

</details>

**A2.** 為什麼「不能自由借貸」被認為是比「有稅負」更嚴重的模型缺陷？

<details><summary>解答</summary>

模型假設 position 永遠可以持有到到期（或最佳履約（exercise）時點），但若交易員因 margin 要求增加而借不到錢，可能被迫在不利時點平倉，模型價值就失去意義；而且借貸利率不同也直接造成模型看不見的成本。稅負則對大多數交易員而言很少改變策略的相對優劣。

</details>

**A3.** 在 dynamic hedging 下，為什麼「volatility 先低後高」對 ATM option 的多方有利，對 OTM option 的多方不利？

<details><summary>解答</summary>

ATM option 的 gamma 隨到期接近而增大，高波動出現在 gamma 最大的後期，hedge 獲利最多；OTM option 的 gamma 在存續早期較大、接近到期時趨近 0，所以後期的高波動對它幫助不大，而前期的低波動又讓它損失 time value，因此價值低於 Black-Scholes。

</details>

**A4.** ⭐ 一個 delta 中性、打算 dynamic hedging 的 position 遇到跳空，正 gamma 與負 gamma position 各受到什麼影響？

<details><summary>提示</summary>

想想 gamma 的正負決定了「價格移動時 delta 往哪邊變」。跳空時你來不及調整，等於整段移動都用變動後的 delta 承受。對誰有利、對誰不利？

</details>

<details><summary>解答</summary>

兩者都來不及調整 delta。負 gamma position 在價格移動時 delta 對自己越來越不利（上漲時變得更空、下跌時變得更多），跳空讓它直接承受整段不利移動，必定虧損；正 gamma position 則相反，delta 隨價格朝有利方向變化，跳空讓它直接賺到整段移動，因此獲利。

</details>

**A5.** 正 kurtosis 分配與低 standard deviation 分配都有高聳的中央峰。如何區分兩者？

<details><summary>解答</summary>

看尾巴：低 standard deviation 分配的尾巴短，極端值更少；正 kurtosis 分配是把 normal distribution 的「腰部」往內擠，峰被擠高、尾巴被擠長，所以同時有更多小變動與更多大變動、較少中等變動（fat tails）。

</details>

**A6.** 為什麼長期而言平均 implied volatility 常高於平均 realized volatility？請給出兩種解釋。

<details><summary>解答</summary>

(1) hedge 者願意為保護性選擇權（protective option）支付額外保費（風險溢酬）；(2) implied volatility 由不考慮跳空的模型反推，而真實世界有跳空，option 的真實價值高於模型值，所以市場價格換算出的 implied volatility 會高於以連續報酬計算的 realized volatility——也就是傳統模型傾向低估 option。

</details>

### B. 計算題

**B1.** 股價 50 的股票，strike 40、2 年到期的 call 在利率 2% 時 rho 為 0.506（每 1 個百分點）。若利率升到 5%，用 rho 估計 call 價值變動，並與精確值（14.57 → 16.10）比較。

<details><summary>解答</summary>

估計：$0.506 \times 3 = $ **1.52**。精確變動 $16.10 - 14.57 = 1.53$。差異來自 rho 本身也隨利率上升而略增（5% 時 rho 0.513）。

</details>

**B2.** ⭐ 某商品日報酬 standard deviation 0.9%。某天跌了 5.4%。(a) 這是幾個 standard deviation？(b) 在 normal distribution 下，單日跌幅大於等於此數的機率約為多少？(c) 若一年 252 個交易日，平均多少年發生一次？

<details><summary>提示</summary>

(a) 跌幅 ÷ 日 standard deviation；(b) 查本章「standard deviation 倍數 vs 常態單尾機率」那張表；(c) 把「幾分之一」除以每年 252 個交易日。

</details>

<details><summary>解答</summary>

(a) $5.4/0.9 = $ **6 個 standard deviation**。
(b) $N(-6) \approx 9.87 \times 10^{-10}$，約 **10.1 億分之一**。
(c) $1.0136 \times 10^9 / 252 \approx$ **約 402 萬年**一次。

</details>

**B3.** 8 天的日報酬（%）為：0, 0, 0, 0, 0, 0, 2, −2。計算母體 standard deviation、skewness、超額 kurtosis。

<details><summary>解答</summary>

平均 0。$s^2 = (4 + 4)/8 = 1$，$s = 1$。
三次動差 $= (8 - 8)/8 = 0$ → skewness **0**。
四次動差 $= (16 + 16)/8 = 4$ → kurtosis $= 4/1^2 - 3 = $ **1.0**（正 kurtosis、fat tails：多數日子不動，少數日子大動）。

</details>

**B4.** 承 B3，若改為 1, −1, 1, −1, 0, 0, 0, 0，超額 kurtosis 為多少？與 B3 比較說明。

<details><summary>解答</summary>

$s^2 = 4/8 = 0.5$；四次動差 $= 4/8 = 0.5$；kurtosis $= 0.5/0.25 - 3 = $ **−1.0**（負 kurtosis）。兩組報酬都對稱、平均 0，但 B3 把變動集中在少數大日子（fat tails），這組則是許多中等變動、沒有極端值（瘦尾）。

</details>

**B5.** 你賣出 50 口 1 天到期的 ATM 100 straddle 並做到 delta 中性，volatility 18%。若 underlying 跳空到 104，依本章表格，每口 straddle 淨損失 3.23 點。總損失為多少點？若改為 6 個月到期（每口淨損失 0.49），總損失為多少？

<details><summary>解答</summary>

1 天：$50 \times 3.23 = $ **161.5 點**；6 個月：$50 \times 0.49 = $ **24.5 點**。同樣的跳空，臨到期 position 的損失約為 6.6 倍。

</details>

**B6.** ⭐ 一個 3 天到期 straddle 成本 1.20。你估計 90% 機率到期值 0.70，10% 機率因跳空值 6.50。求 expected value、每筆期望損益，以及單次虧損機率。

<details><summary>提示</summary>

第一步：expected value = 0.9 × 到期值 + 0.1 × 跳空時的到期值；第二步：減掉成本 1.20；虧損機率就是「到期值低於成本」那個情境的機率。

</details>

<details><summary>解答</summary>

expected value $= 0.9 \times 0.70 + 0.1 \times 6.50 = 0.63 + 0.65 = $ **1.28**；每筆期望損益 $= 1.28 - 1.20 = $ **+0.08**；單次虧損機率 **90%**（每次虧 0.50）。

</details>

**B7.** 一個高 gamma position theoretical edge $600。預計再 hedge 50 次，每次平均交易 400 股，每股成本（手續費加半個價差）0.02。扣除交易成本後還剩多少？若成本升到每股 0.03 呢？

<details><summary>解答</summary>

0.02：成本 $50 \times 400 \times 0.02 = \$400$，剩 **\$200**。
0.03：成本 $\$600$，剩 **\$0**——theoretical edge 被交易成本完全吃掉。

</details>

### C. 交易情境題

**C1.** ⭐ 星期三收盤，某股票 option 週五到期。implied volatility 處於歷史低點（14%），你的 position 是淨賣出 300 口 ATM straddle，理論上每天可賺可觀的 theta。明早公司將公布重大訊息。你會怎麼做？

<details><summary>提示</summary>

先對照本章「最危險組合」：低波動、臨到期、ATM、大量負 gamma，再加上已知的跳空事件。模型的 theta 有沒有算到跳空？你可以怎麼把負 gamma 降下來？

</details>

<details><summary>解答</summary>

這正是「低波動 + 臨到期 + 大量負 gamma」的最危險組合，而且已知有跳空事件。模型的 theta 不包含跳空風險，風險遠大於報酬。合理做法：在公告前大幅縮減空方 position（買回 straddle），或買進少量更便宜的 OTM option／同月 straddle 把 gamma 拉回接近 0。不應以「theta 很多」為理由硬撐。若無法平倉（流動性差），至少要確保最壞情境的損失與 margin 需求在可承受範圍內。

</details>

**C2.** 某 futures option 市場中，你發現 conversion 看起來可以穩賺 0.15，但你的資金主要靠向 settlement 公司以浮動利率借入，借貸利差約 2%，position 預計持有 9 個月，而且是 futures option（每日 variation margin）。你會做嗎？

<details><summary>解答</summary>

需要先用**真實的借款與存款利率**重算 conversion 的價值：模型假設借貸同利率，但你借款成本較高、存款收益較低，9 個月的利差成本可能吃掉 0.15。此外 futures option 的 conversion 因 variation margin 不一定 delta 中性，存在 settlement 風險；浮動利率也會變動。若利差成本與交易成本合計接近或超過 0.15，就不值得做；只有在扣除這些成本後仍有足夠利潤時才執行。

</details>

### D. 挑戰題

**D1.** 用自己的語言推導：在零利率、delta 中性且連續 hedge 的世界中，一個多方 option position 在一小段時間的損益約為 $\tfrac{1}{2}\Gamma S^2(\sigma_{\text{實現}}^2 - \sigma_{\text{隱含}}^2)\Delta t$。據此解釋為什麼「realized volatility 相同，但出現的時點不同」會造成不同的最終損益，並說明這與第 [ch08](ch08_dynamic_hedging.md) 的 gamma rent 有何關係。

<details><summary>解答</summary>

delta 中性多方 position 一小段時間的損益：$\Delta V - \Delta \cdot \Delta S \approx \tfrac{1}{2}\Gamma (\Delta S)^2 + \Theta \Delta t$。在 Black-Scholes 下（零利率）$\Theta = -\tfrac{1}{2}\Gamma S^2 \sigma_{\text{隱含}}^2$，而 $(\Delta S)^2 \approx S^2 \sigma_{\text{實現}}^2 \Delta t$，合併得 $\tfrac{1}{2}\Gamma S^2(\sigma_{\text{實現}}^2 - \sigma_{\text{隱含}}^2)\Delta t$。
總損益是各小段的加總，**每段以當時的 $\Gamma S^2$ 加權**。所以即使整段期間的平均實現變異數相同，若高變異數落在 $\Gamma$ 大的時段（ATM option 的後期），總損益較高；落在 $\Gamma$ 小的時段則較低。這就是路徑相依的來源。它與 gamma rent 的概念一致：正 gamma position 每天「付 theta 租金」，換取在 underlying 移動時收到 $\tfrac{1}{2}\Gamma(\Delta S)^2$；租金與收入何時發生、以多大的 gamma 發生，決定了最終盈虧。

</details>

**D2.** 若市場報酬為 fat tails 分配，但你仍用 Black-Scholes 並對所有 strike 使用同一個 volatility（ATM implied volatility），你會系統性地高估還是低估深價外（deep out-of-the-money, deep OTM）option？這對下一章的「volatility skew」有什麼預告？

<details><summary>解答</summary>

fat tails 表示大幅變動的機率高於常態，deep OTM option 只在大幅變動時才有價值，所以真實價值高於使用單一 volatility 的 Black-Scholes 值——你會**低估** deep OTM option。市場若意識到這點，就會讓 deep OTM option 以較高價格交易，換算成 implied volatility 時，OTM strike 的 implied volatility 會高於 ATM，形成「微笑」或「skew」；若左尾特別肥（負 skewness），低 strike 的 implied volatility 會更高，這正是股價指數常見的投資型偏斜（investment skew）（[ch24](ch24_volatility_skews.md)）。

</details>

## 自我檢核清單

- [ ] 能不看筆記列出傳統模型的六大假設（含無摩擦市場的四個子項）。
- [ ] 能說明漲跌停、放空限制、借貸利差、交易成本各自如何讓模型失準。
- [ ] 能判斷哪種 option rho 最大，並用 rho 估計利率變動的影響。
- [ ] 能解釋為什麼同樣的 realized volatility、不同的出現順序，會讓 ATM 與 OTM option 的 hedge 結果朝相反方向偏離。
- [ ] 能說明跳空對不同天期、不同 volatility、正負 gamma position 的影響。
- [ ] 能說明到期 straddle 策略的理由、風險與 position 規模原則。
- [ ] 能計算一組資料的 skewness 與超額 kurtosis，並用 normal distribution 計算 k 個 standard deviation 事件的機率。
- [ ] 能說出跳躍擴散、CEV、隨機 volatility 模型各自修正哪個假設、以及為何不普及。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab11_index_and_skew.py`](../labs/exercises/lab11_index_and_skew.py)：實作 `price_weighted_index`、`cap_weighted_index`、`adjust_divisor`、`index_forward`、`sample_skew_kurtosis`、`implied_vol`、`implied_vol_curve`、`otm_implied_vols`、`skew_fit`、`butterfly_density`、`density_summary`、`smile_vol_after_move`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab11_index_and_skew.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`../labs/lab11_index_and_skew`](../labs/exercises/lab11_index_and_skew.py)：模型假設與真實分配的比較（skewness、kurtosis 計算），並銜接第 24 章的 implied volatility 求解與 skew。
- 複習：[`../labs/lab06_dynamic_hedging`](../labs/exercises/lab06_dynamic_hedging.py)（可修改其中的模擬，自行比較「volatility 先高後低」與「先低後高」的 hedge 結果）、[`../labs/lab04_volatility`](../labs/exercises/lab04_volatility.py)（lognormal 與 historical volatility）。
