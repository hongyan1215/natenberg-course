# 第 24 章　波動率偏斜（Volatility Skews）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：同一個標的（underlying）、同一個到期日（expiration date），不同履約價（strike price）的隱含波動率（implied volatility）卻不一樣——這條「歪掉的線」就是偏斜（skew）。交易員不換模型，而是把 skew 當成額外輸入，拿來報價（quote）、算 delta、甚至直接交易它。

**你只需要先記住這 5 件事**

1. **三種 skew。** 投資型（股票、股價指數）：低 strike 波動率（volatility）高；需求型（農產品、能源）：高 strike volatility 高；平衡型（匯率）：兩側大致對稱。
2. **成因有兩個：避險（hedge）需求 + 模型缺陷。** 持股者買低 strike put 保護、賣高 strike call 收租；再加上股市跌時 volatility 上升、肥尾（fat tails），價外（out-of-the-money, OTM） put 就該比較貴。
3. **用「離價平（at-the-money, ATM）幾個標準差（standard deviation）」當 x 軸，用二次式描述 skew。** volatility = a + b·x + c·x²：a 是水準（ATM）、b 是傾斜（偏態（skewness））、c 是彎曲（峰態（kurtosis））。例：a=20、b=−3、c=1，x=−1 時 volatility 24%。
4. **skew 會改變你的 delta。** 浮動偏斜（floating skew）下，投資型偏斜（investment skew）的 OTM put 調整 delta 絕對值較小（例：−21.2 → −16.8）；指數的 ATM 跨式（straddle）「看似」delta 中性，實際偏空。
5. **skew 可以單獨交易。** 賭傾斜 → 風險逆轉（risk reversal）；賭彎曲 → 勒式（strangle）對 straddle（vega 中性，2:1 叫 dragonfly）。蝶式（butterfly）價格 ÷ strike 間距 = 市場隱含的到期機率。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 離 ATM 幾個 standard deviation x | ln(K ÷ F) ÷（σ × √t） |
| skew 模型的 volatility | a + b·x + c·x² |
| 調整 delta | BS delta + vega × underlying 每漲 1 點的 volatility 變化 × 100 |
| skewness 指標 | 25 delta put volatility − 25 delta call volatility |
| 隱含機率 | 以 K 為中心的 butterfly 價格 ÷ strike 間距 |

**必做練習（約 20 分鐘）**：A1、B3、B4、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[波動率曲面編輯器](https://hongyan1215.github.io/natenberg-course/tools/vol-surface/)，拉 skew 和曲率滑桿，看 smile 和隱含機率密度怎麼變。

---

## 本章定位

上一章（[ch23](ch23_models_real_world.md)）指出傳統模型的種種缺陷。與其換一個複雜又難以輸入的新模型，多數交易員選擇保留簡單模型，再把**市場隱含的修正**——也就是各 strike implied volatility 的分布（skew）——當成額外的輸入。本章說明 skew 的形狀與成因、如何建模、它如何改變 Greeks、如何交易 skew 本身，以及如何從選擇權（option）價格反推市場隱含的機率分配。前置：implied volatility 與期限結構（[ch20](ch20_volatility_revisited.md)）、butterfly 與比率價差（ratio spread）（[ch11](ch11_volatility_spreads.md)）、risk reversal 部位（position）分析（[ch21](ch21_position_analysis.md)）。

## 學習目標

完成本章後，你應該能夠：

1. 辨識投資型、需求型、平衡型三種 skew，並用 hedge 需求與「volatility 隨價格方向變化」解釋其成因。
2. 比較 sticky strike、floating skew 與以 standard deviation 衡量的 sticky delta 三種 skew 動態假設，並計算 $\ln(K/F)/(\sigma\sqrt t)$。
3. 用二次多項式 skew 模型 $y = a + bx + cx^2$ 計算各 strike 的 volatility，並解釋 skewness 與 kurtosis 敏感度的正負號。
4. 計算考慮 skew 後的調整 delta（skewed delta），並說明 shifting volatility 如何讓「delta 中性」的 straddle 在現實中帶有方向性。
5. 建構 delta 中性或 vega 中性的 risk reversal 與 kurtosis position，以及跨月份的 skew／kurtosis 交易。
6. 由 butterfly 價格推算隱含機率分配，並解讀市場分配與對數常態分配（lognormal distribution）的差異。

## 核心概念

> 對應原書：第 24 章〈Volatility Skews〉。以下數字皆為自創或自行計算。

### 24.1 為什麼會有偏斜

> 💡 **一句話**：各 strike implied volatility 不同，來自 hedge 需求和模型缺陷；股票是低 strike 較貴的 investment skew。

在純粹的 Black-Scholes 世界裡，同一 underlying、同一 expiration date，只會有**一個**未來 volatility，所以每個 strike 的 implied volatility 應該相同；如果不同，買低賣高的套利（arbitrage）行為終會把它們拉平。但實際上幾乎所有市場都看到 implied volatility 隨 strike 變化，這種分布稱為**波動率偏斜（volatility skew）**，依形狀也叫**微笑（smile）**或**歪嘴笑（smirk）**。

**想法**：就像我們假設市場使用同一個模型、同意其他所有輸入，從而反推「市場隱含的 volatility」，我們也可以反過來問：「市場隱含了模型哪些缺陷？」

#### 成因一：避險需求

| skew 類型 | 市場例子 | hedge 行為 | 結果 |
|---|---|---|---|
| **investment skew** | 股票、股價指數 | 多數人持有多頭股票，買**低 strike 保護性賣權（protective put）**、賣**高 strike 掩護性買權（call）** | 低 strike implied volatility 被推高，高 strike 被壓低 |
| **需求型偏斜（demand / commodity skew）** | 農產品、能源 | 終端使用者怕漲，買**高 strike call**、賣低 strike 賣權（put） | 高 strike implied volatility 較高 |
| **平衡型偏斜（balanced skew）** | 匯率 | 雙方都可能怕（進口商怕外幣升、出口商怕外幣貶） | 兩側大致對稱（不一定平坦） |

細節：
- 為什麼 protective put 集中在低 strike？價內（in-the-money, ITM）put 太貴，若真的那麼擔心下跌，不如直接賣股票。
- 為什麼掩護性 call 集中在高 strike？持股者看多，想保留部分上漲空間；賣 ITM call 會很快被叫走。
- 交易員常說「skew 在 put」，但由買賣權平價（put-call parity），同 strike 的 call 也同樣被高估，所以更精確的說法是「**skew 偏向下檔（skew is to the downside）**」。
- 商品市場的生產者（農民、礦商）怕跌，但很多市場由終端使用者主導，可能因為通膨對整體經濟的衝擊被視為更嚴重，或政府對農產品有價格支撐，生產者較不擔心下跌。

#### 成因二：模型缺陷

股市下跌時 volatility 上升（[ch23](ch23_models_real_world.md)）。underlying 100 時，95 put 隨著市場下跌變得更接近 ATM，vega 增加，**同時**市場也變得更波動，兩者疊加讓 95 put 更有價值；105 call 雖然在上漲時 vega 增加，但市場同時變得較平靜，好處較少。因此 95 put 的 implied volatility 偏高、105 call 偏低，與 investment skew 一致。

**實務結論**：不必知道 skew 的真正原因，只要假設「市場此刻認為價格是有效率的」，把 skew 當作模型的**額外輸入**，就能用來產生理論價值（theoretical value）、管理風險，並發展 skew 交易策略。

### 24.2 建立偏斜模型（Modeling the Skew）

> 💡 **一句話**：skew 要用「離 ATM 幾個 standard deviation」和「相對 ATM 的比例」來畫，才能跨時間、跨月份比較。

用一個函數 $y = f(x)$ 擬合 skew：$x$ 是 strike（或其轉換），$y$ 是 implied volatility。常見選擇是多項式 $a + bx + cx^2 + dx^3 + \cdots$。

把 skew 當作輸入後，就要問：市場變動時，skew 的**位置**和**形狀**會怎麼變？

#### 三種動態假設

**(1) Sticky strike（黏著 strike）**：每個 strike 的 implied volatility 固定不變，不論 underlying 或整體 volatility 怎麼動。簡單，但與實際市場動態不符。

**(2) floating skew**：整條 skew 隨 underlying 價格**水平**移動（underlying 漲 5 點，skew 右移 5 點），隨整體 implied volatility**垂直**移動（ATM volatility 跌 2 點，整條下移 2 點）。

> 例：線性 skew $\sigma(K) = 20\% - 0.3\% \times (K - S)$。underlying 從 100 跌到 95：
> - Sticky strike：新的 ATM（95 strike）volatility = $20 - 0.3 \times (95 - 100) = 21.5\%$。
> - floating skew：新的 ATM volatility 仍為 20%，而 95 strike 的 volatility 從 21.5% 變成 20%。

**(3) 相對化：價內外程度（moneyness）與 standard deviation**

價格變動要以**相對**角度看：underlying 100 時 10 點是 10%，underlying 200 時只是 5%；1 週內 10% 的移動比 1 個月內 10% 更極端。

- **Moneyness**：$K/S$。underlying 100 的 90 strike 與 underlying 200 的 180 strike moneyness 相同（0.90）。進一步用對數 $\ln(K/S)$，與對數常態（lognormal）假設一致。
- **時間的影響**：underlying 100 的 90 put，隨時間流逝，在「相對意義」上越來越 OTM——它在**往 skew 的上方爬**（investment skew 中越 OTM 的 put volatility 越高），所以若不調整，skew 會隨時間看起來越來越陡。
- **以 standard deviation 衡量**：

$$x = \frac{\ln(K/F)}{\sigma\sqrt{t}}$$

用遠期價（forward price） $F$（而非現貨 $S$）在理論上更正確，此時「價平遠期（at-the-forward）」的 option $x = 0$。

> 例：$S = 100$，90 strike，$\sigma = 25\%$。
> - 6 個月：$\ln(0.9)/(0.25\sqrt{0.5}) = -0.1054/0.1768 = -0.596$ 個 standard deviation。
> - 剩 1.5 個月：$\ln(0.9)/(0.25\sqrt{0.125}) = -1.192$ 個 standard deviation——同一個 strike 在 standard deviation 座標上「更 OTM」了一倍。
> - 若改用 forward price 101（6 個月）：$\ln(90/101)/0.1768 = -0.652$。

以 standard deviation（約略等同 delta）為 x 軸的 skew 常被稱為 **sticky delta skew**，因為 delta 本身就是「moneyness」的近似。這樣不同到期月份的 skew 就能放在同一張圖上比較。

#### 調整 y 軸

交易員談「市場 volatility」幾乎都指 ATM implied volatility，各 strike 的高低是**相對 ATM**而言。

- **差額法**：$y = \sigma_{ATM} - \sigma_K$。ATM 20%、某 strike 25% → $-5$。
- **比例法**（更好）：$y = \sigma_K / \sigma_{ATM}$。25/20 = 125%，18/20 = 90%。若 ATM volatility 翻倍到 40%，比例法自然預測該 strike 變成 50%、36%，差額法則不會。

**跨商品觀察**：金融商品（如股價指數）的 skew 在不同到期月份經標準化後相當一致；商品（如穀物）skew 曲率較大、偏向高 strike，且各月份差異較大，可能來自季節性或短期供需失衡。

#### 模型可能產生不合邏輯的結果

> 例：使用下一節的模型 $y = a - 3x + x^2$，$x = \ln(K/F)/(a\%\sqrt t)$，$F = 100$，3 個月。把 ATM volatility $a$ 從 20% 降到 18%：
> 75 put 的 $x$ 從 $\ln(0.75)/0.10 = -2.877$ 變成 $\ln(0.75)/0.09 = -3.196$（因為分母變小），它「爬上 skew」，volatility 從 36.91% **升到** 37.81%，價格從 0.408 **升到** 0.455。
> 降低 volatility 卻讓 option 變貴，這是不合邏輯的；實務模型需要加上限制避免這種情況。

### 24.3 偏態與峰態（Skewness and Kurtosis）

> 💡 **一句話**：二次式 a + bx + cx²：b 管傾斜（skewness）、c 管彎曲（kurtosis）；ATM 是支點，兩種敏感度都是 0。

skew 形狀的兩個主要變化：

- **傾斜度 = skewness**：低 strike 與高 strike implied volatility 的差異。機率分配左尾較長（負 skewness）→ 大跌機率高 → 低 strike 需求大 → 低 strike volatility 高。
- **彎曲度 = kurtosis**：兩側 strike 相對 ATM 都被墊高的程度。fat tails → 兩個方向的大變動都更可能 → OTM option 需求大（正 kurtosis）。交易所商品幾乎都是正 kurtosis，因此通常不考慮負 kurtosis 的 skew。

```
隱含波動率
  |\                      負偏態：低履約價較高          |        _/  正偏態：高履約價較高
  | \__                                               |    ___/
  |    \______                                        |___/
  +------------------> 履約價                         +------------------> 履約價

  |\         /    峰態越大，曲線越彎
  | \_     _/     兩側都被墊高
  |   \___/
  +------------------> 履約價
```

#### 二次多項式模型

$$y = a + b\,x + c\,x^2$$

- $a$：基準 volatility（通常是 ATM implied volatility），隨整體 volatility 升降而調整。
- $b$：skewness（斜率），可正可負；investment skew $b < 0$。
- $c$：kurtosis（曲率），交易所商品幾乎總是 $c > 0$。

**自創例子**：$a = 20$，$b = -3$，$c = 1$（單位：volatility 百分點），$x = \ln(K/F)/(0.20\sqrt{0.25})$，$F = 100$，3 個月，利率 0。

| strike | $x$（standard deviation） | 模型 volatility | OTM option 價格（skew） | 若全用 20%（無 skew） |
|---|---|---|---|---|
| 80 | −2.231 | 31.67% | put 0.508 | put 0.040 |
| 90 | −1.054 | 24.27% | put 1.224 | put 0.712 |
| 100 | 0 | 20.00% | 3.988 | 3.988 |
| 110 | 0.953 | 18.05% | call 0.707 | call 0.954 |
| 120 | 1.823 | 17.85% | call 0.074 | call 0.147 |

（無 skew 下 110 call = 10.954 − 10 = 0.954、120 call = 20.147 − 20 = 0.147。）skew 讓 80 put 的價格是無 skew 時的 12 倍以上。

#### 偏態與峰態敏感度

就像 vega 衡量對 $a$ 的敏感度，可以定義：
- **skewness 敏感度**：$b$ 增加 1 單位時 option 價值的變化。
- **kurtosis 敏感度**：$c$ 增加 1 單位時 option 價值的變化。

單位的選擇：取一個「常見變動幅度」當 1 單位。若 $b$ 通常在 −3.5 到 −2.5 之間變動，取 0.1 當一單位；必要時加乘數，例如 $y = a + 0.1\,b\,x + c\,x^2$，讓 $b$ 每變動 1 實際上是 0.1。

> 例（上表模型，$b$ 增加 0.1、$c$ 增加 0.1）：
>
> | strike | skewness 敏感度 | kurtosis 敏感度 |
> |---|---|---|
> | 80 put | −0.0146 | +0.0333 |
> | 90 put | −0.0136 | +0.0144 |
> | 100 | 0 | 0 |
> | 110 call | +0.0114 | +0.0109 |
> | 120 call | +0.0051 | +0.0094 |

規律：
- ATM strike 是**支點**，兩種敏感度皆為 0。
- 提高 skewness（$b$ 變大、skew 變平或往右傾）→ 高 strike volatility 上升、低 strike 下降 → **高 strike skewness 敏感度為正、低 strike 為負**。
- 提高 kurtosis → 兩側 volatility 都上升 → **任何非 ATM option 的 kurtosis 敏感度都為正**。
- 在許多模型中，**±25 delta** 的 option 對 skewness 最敏感，因此常用「−25 delta put 與 +25 delta call 的 implied volatility 差」作為 skewness 指標（25-delta risk reversal）；**±5 delta** 附近則對 kurtosis 最敏感（kurtosis 沒有像 25 delta 那樣公認的基準）。
- 注意術語：交易員說 skew / kurt 時，可能指模型輸入（$b$、$c$），也可能指 position 對它們的敏感度，要看上下文。

### 24.4 考慮偏斜的風險指標（Skewed Risk Measures）

> 💡 **一句話**：skew 會跟著 underlying 移動，所以真實 delta = BS delta + vega × volatility 隨價格的變化。

skew 動態會改變 delta、gamma、theta、vega。

**調整 delta（skewed / adjusted delta）**：在 floating skew 下，underlying 上漲時，固定履約價（sticky strike）的 OTM put 變得更 OTM，它在 investment skew 上的位置往上移，implied volatility**上升**，部分抵銷了價格上漲造成的損失。

$$\Delta_{\text{adj}} \approx \Delta_{\text{BS}} + \text{vega} \times \frac{\partial \sigma_K}{\partial S}$$

> 例：線性 skew $\sigma(K) = 20\% - 0.3\% \times (K - S)$，$S = 100$，92 put，3 個月，利率 0。
> 92 put volatility = 22.4%，Black-Scholes delta = −21.2，vega = 0.145（每 1 個波動率點（vol point））。
> underlying 漲 1 點，在 floating skew 下 92 put 的 volatility 升 0.3 點：
> $$\Delta_{\text{adj}} \approx -21.2 + 0.3 \times 0.145 \times 100 = -21.2 + 4.3 = -16.8$$
> 數值驗證：sticky strike 下中央差分 delta = −21.17；floating skew 下 = −16.83。

實務取捨：skew 模型讓所有 Greeks 的計算變複雜。許多交易員用 skew 模型算 theoretical value，但用傳統模型算 Greeks；position 很大的專業交易員則需要準確的 skew Greeks，這通常是交易公司金融工程師的工作。沒有任何模型能在所有市況下都準確。

**波動率曲面（volatility surface）**：把各到期月份的期限結構（[ch20](ch20_volatility_revisited.md)）與各 strike 的 skew 合在一起，就成了 x = strike、y = 到期時間、z = implied volatility 的立體曲面。strike 與到期月份越多，曲面越完整。股價指數曲面通常在低 strike、短天期處最高；穀物曲面則常在高 strike 處翹起，並帶有季節性起伏。

### 24.5 波動率的移動（Shifting the Volatility）

> 💡 **一句話**：股指跌時 volatility 升、商品漲時 volatility 升，所以「delta 中性」的 straddle 其實帶方向。

- **正向關係**（價格漲 → implied volatility 漲）：demand skew 市場，如農產品、能源。
- **反向關係**（價格漲 → implied volatility 跌）：investment skew 市場，如股票、股價指數。

可用 CEV 模型處理（但複雜、需額外輸入），多數交易員用自製（home-grown）模型依市場特性上下調整 volatility，但沒有模型能在所有情況都準確。

**對「delta 中性」的影響**：買進 ATM straddle，理論上 call delta +50、put delta −50，淨 delta 0。但：
- 在**股價指數**，你偏好高波動，而高波動較可能在下跌時出現 → 現實中你**偏好下跌**，實際 delta 為**負**。
- 在**商品市場**，上漲時較波動 → 實際 delta 為**正**。

> 例：指數 ATM straddle vega 0.45，經驗上指數每跌 1 點，implied volatility 約升 0.6 點。每跌 1 點，straddle 因 vega 多賺 $0.6 \times 0.45 = 0.27$，相當於額外的 delta **−27**。表面上 delta 中性的 position 其實像是放空了 0.27 個 underlying。

真實 delta 難以精確估計（取決於 volatility 隨價格變化的速度），但兩種情況下 position 都不是真正的 delta 中性。

### 24.6 偏態與峰態策略（Skewness and Kurtosis Strategies）

> 💡 **一句話**：賭傾斜用 risk reversal，賭彎曲用 strangle 對 straddle；兩者都要先做到 vega 中性。

正如交易員可以對方向（delta）、volatility 有看法，也可以對**skew 形狀**有看法。

#### 交易偏態：風險逆轉（risk reversal）

| skew 類型 | 預期 skew 變**平** | 預期 skew 變**陡** |
|---|---|---|
| 投資型（低 strike 較高） | 賣低 strike、買高 strike | 買低 strike、賣高 strike |
| 需求型（高 strike 較高） | 賣高 strike、買低 strike | 買高 strike、賣低 strike |

通常使用 25 delta 的 OTM call 與 put。未 hedge 的話會有明顯 delta（買 call 賣 put 為正，反之為負），所以搭配 underlying 抵銷 delta，整體稱為**risk reversal**。

> 例 1（delta 中性，underlying 約 100）：
> +20 口 6 月 95 put（delta −25）、−20 口 6 月 105 call（delta +25）
> position delta $= 20 \times (-25) + (-20) \times (+25) = -1{,}000$ → **買進 10 口 underlying**（每口 delta 100）。
>
> 例 2（vega 中性）：上例中 95 put vega 0.14、105 call vega 0.10。買 20 口 put（vega +2.8）、賣 28 口 call（vega −2.8），position vega 為 0；delta $= 20 \times (-25) - 28 \times 25 = -1{,}200$ → 買 12 口 underlying。

更常見的是讓兩腿 **vega 相同**，使 position 初始 vega 中性、主要只對 skew 斜率敏感；vega 中性的 risk reversal 通常也接近 gamma 中性，但不總是如此，交易員要決定哪一個更重要。市場變動後 delta、gamma、vega 都會改變，需要決定是否繼續持有與如何調整（risk reversal 的風險特性見 [ch21](ch21_position_analysis.md)）。

#### 交易峰態：strangle 對 straddle

- 預期 kurtosis**上升**（曲線更彎）→ 兩側 OTM option 變貴 → **買進 strangle**。
- 預期 kurtosis**下降** → **賣出 strangle**。

但 strangle 本身有很大的 vega，即使 kurtosis 看對，整體 volatility 下跌仍可能虧損。因為**ATM option 的 kurtosis 敏感度為 0**，可以用 ATM straddle 抵銷 vega：

> 例：underlying 約 100。90 put vega 0.08、110 call vega 0.09 → 每組 strangle vega 0.17；100 straddle vega 0.40。
> 賣出 20 組 straddle，需買進 $8.0/0.17 = 47.06 \approx 47$ 組 strangle。
> 若 strangle vega 剛好是 straddle 的一半，vega 中性比例就是 **2 組 strangle : 1 組 straddle**，這種 2×1 的 position 稱為 **dragonfly**。

若 strangle 與 straddle 都接近 delta 中性，整個 position 也接近 delta 中性。

#### 跨到期月份的偏斜／峰態交易

若你認為**兩個月份的 skew 相對錯價**（例如 6 月 skew 比 3 月平坦太多），可以：
- 買 6 月 OTM put、賣 3 月 OTM put（買 put 日曆價差（calendar spread））
- 賣 6 月 OTM call、買 3 月 OTM call（賣 call calendar spread）

選擇 vega 大致相同的 calendar spread 讓 position vega 中性，剩餘 delta 用 underlying 抵銷。

**結合對期限結構的看法**：
- 若你也認為 6 月整體 implied volatility 相對 3 月偏低 → 想買 calendar spread（買 6 月、賣 3 月）。結合 skew 觀點，選擇**買 put calendar spread**——兩個優勢方向一致。避免 call calendar spread：6 月 call 就 skew 而言太貴、3 月 call 就 volatility 而言太貴，兩者互相抵銷。
- 若你認為 6 月整體 implied volatility 相對 3 月偏高 → 選擇**賣 call calendar spread**，6 月 call 在 volatility 與 skew 兩方面都太貴。

**kurtosis 同理**：若 6 月 kurtosis 相對 3 月偏低，買 6 月 strangle、賣 3 月 strangle。單一月份需要用 straddle 抵銷 vega，跨月份則可以直接挑兩個 vega 相近的 strangle，position 就只對 kurtosis 敏感；若同時 6 月整體 volatility 也偏低，就是雙重優勢。

### 24.7 隱含分配（Implied Distributions）

> 💡 **一句話**：butterfly 價格 ÷ 間距 = 到期落在該 strike 的機率；股指 skew 隱含「大跌多、大漲少」。

如果每個 strike 的 implied volatility 不同，表示市場**不相信**到期價格是 lognormal distribution。市場隱含的分配是什麼？可以用**butterfly**價格推算。

**關鍵事實**：到期時，$K-h / K / K+h$ butterfly（買 1 $K-h$ call、賣 2 $K$ call、買 1 $K+h$ call）在 underlying 位於翅膀外時值 0，恰好在中心 $K$ 時值 $h$。若把所有間距 $h$ 的 butterfly 全部買下，**不論到期價格為何，總價值永遠是 $h$**。所以（零利率、或期貨式結算（futures-type settlement）時）所有 butterfly 價格加總等於 $h$；若以利率折現且為股票式結算（stock-type settlement），總和為 $h$ 的現值。

**離散近似**：假設到期價格只會落在 strike 上，那麼

$$P(\text{到期價} = K) \approx \frac{\text{以 } K \text{ 為中心的蝶式價格}}{h}$$

> 例：期貨（futures） 200，3 個月，volatility 25%（全部 strike 相同），利率 0，strike 間距 10。
>
> | 中心 strike | 140 | 150 | 160 | 170 | 180 | 190 | 200 | 210 | 220 | 230 | 240 | 250 | 260 | 270 |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
> | call 價 | 60.01 | 50.08 | 40.33 | 31.05 | 22.64 | 15.52 | 9.97 | 5.98 | 3.36 | 1.77 | 0.88 | 0.41 | 0.18 | 0.08 |
> | butterfly 價 | 0.054 | 0.186 | 0.465 | 0.874 | 1.294 | 1.559 | 1.573 | 1.362 | 1.032 | 0.697 | 0.426 | 0.238 | 0.123 | 0.059 |
> | 機率 | 0.5% | 1.9% | 4.7% | 8.7% | 12.9% | 15.6% | 15.7% | 13.6% | 10.3% | 7.0% | 4.3% | 2.4% | 1.2% | 0.6% |
>
> 例如 190/200/210 butterfly = 15.52 − 2 × 9.97 + 5.98 ≈ 1.573（以未四捨五入的價格計算），機率 = 1.573/10 = 15.7%。130 到 290 所有 butterfly 加總為 9.99 ≈ 10，機率加總 ≈ 100%（缺少的 0.1% 在更遠的尾巴）。分配**右偏**，因為 Black-Scholes 本身假設 lognormal。

**連續版本**：把間距縮小（10 → 1 → 0.1），離散機率就趨近連續的機率密度。數學上，間距 $h \to 0$ 時：

$$f(K) = \frac{\partial^2 C}{\partial K^2} \approx \frac{C(K-h) - 2C(K) + C(K+h)}{h^2}$$

（若有利率，需再乘上 $e^{rt}$。）同理，$P(F_T < K) = 1 + \partial C/\partial K$。

**加入 skew 後的隱含分配**：用上一節的模型形狀（$a = 25$、$b = -3$、$c = 1$）產生各 strike 的 volatility，再用同樣方法求機率，與無 skew（全為 25%）的 lognormal 比較：

| 中心 strike | 130 | 140 | 150 | 160 | 170 | 180 | 190 | 200 | 210 | 220 | 230 | 240 | 250 | 260 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| skew 下機率 | 0.71% | 1.15% | 2.05% | 3.72% | 6.50% | 10.40% | 14.49% | 16.90% | 16.08% | 12.37% | 7.79% | 4.13% | 1.91% | 0.82% |
| lognormal 機率 | 0.10% | 0.54% | 1.86% | 4.65% | 8.74% | 12.94% | 15.59% | 15.73% | 13.62% | 10.32% | 6.97% | 4.26% | 2.38% | 1.23% |
| 差異 | + | + | + | − | − | − | − | + | + | + | + | − | − | − |

與 lognormal 相比，這個 skew 隱含：
1. **小到中度上漲**（200–230）的機率較高
2. **大幅下跌**（≤150）的機率較高——跌破 150 的機率從 1.3% 升到 3.1%
3. **小到中度下跌**（160–190）的機率較低
4. **大幅上漲**（≥240）的機率較低

這正是股價指數市場典型的隱含分配，與 [ch23](ch23_models_real_world.md) 的實際報酬直方圖部分吻合（小變動多、大跌多、中度下跌少），但實際資料也有較多大漲，這點與隱含分配不一致。商品（如穀物）的隱含分配通常較接近 lognormal，但仍顯示較多小變動、略多的大漲。

**用途**：隱含分配是某一時點的快照，不能據以下定論；但把**自己對分配的看法**與市場隱含分配比較，若有明顯分歧，就可能指出有利可圖的策略（例如你認為大跌機率被高估 → 賣出遠 OTM put 或賣出相應 butterfly）。

## 交易員視角

- **Optibook 連結：為每個 strike 報不同的 volatility**。在 `options_market_making/` 中，如果你對所有 strike 用同一個 volatility quote，OTM put 會被聰明的對手買走（你報太便宜）、OTM call 被賣給你（你報太貴）。先從市場中間價反推各 strike 的 implied volatility，擬合 $a + bx + cx^2$，再以此 quote。
- **skew 動態決定你的 delta**：若市場是 investment skew 且以浮動方式移動，你用 Black-Scholes delta hedge 會系統性地「多避」OTM put 的 delta。比較 sticky strike 與 sticky moneyness 兩種假設下的 delta，觀察哪一種的 hedge 誤差較小。
- **risk reversal = skew position**：做市（market making）時累積的 position 常常就是一個 risk reversal（例如一直賣出 OTM put 給 hedge 者）。要分別監控 vega（對 $a$）、skewness 敏感度（對 $b$）、kurtosis 敏感度（對 $c$），並設定限額。
- **butterfly 價格的一致性檢查**：任何 butterfly 價格都必須 ≥ 0（否則可 arbitrage，對應負機率）；quote 前檢查相鄰三個 strike 的價格是否滿足凸性 $C(K-h) - 2C(K) + C(K+h) \ge 0$，避免被 arbitrage。
- **IOC 掃單偵測**：若你發現某個 butterfly 在盤口上是負價格（可同時以 IOC 買進翅膀、賣出中心），這是無風險 arbitrage，但要注意部位限制（position limit）與各腿成交風險。

## 常見誤區

1. **誤解**：「skew 在 put」表示只有 put 被高估。→ **正解**：由 put-call parity，同 strike 的 call implied volatility 也相同；應說「skew 偏向下檔（低 strike）」。
2. **誤解**：sticky strike 是最自然的假設，skew 不會隨市場移動。→ **正解**：實際上 skew 多半隨 underlying 價格與整體 volatility 移動；以 moneyness 或 standard deviation 衡量的 skew 通常更穩定。
3. **誤解**：Black-Scholes delta 就是真實 delta。→ **正解**：若 skew 隨價格浮動，需加上 vega × volatility 隨價格的變化；investment skew 中 OTM put 的調整 delta 絕對值較小。
4. **誤解**：買進 ATM straddle 就沒有方向性。→ **正解**：在股價指數市場，volatility 在下跌時上升，straddle 的「實際 delta」為負；商品市場則相反。
5. **誤解**：買 strangle 就是在買 kurtosis。→ **正解**：strangle 同時有大量 vega；要純粹交易 kurtosis，需用 ATM straddle 抵銷 vega（如 dragonfly）。
6. **誤解**：butterfly 價格加總等於 1。→ **正解**：所有間距 $h$ 的 butterfly 加總等於 $h$（stock-type settlement 時為其現值），除以 $h$ 才是機率總和 1。

## 重點摘要

| 主題 | 重點 |
|---|---|
| skew 類型 | 投資型（低 strike 高）、需求型（高 strike 高）、平衡型（對稱） |
| 成因 | hedge 需求 + 模型缺陷（volatility 隨價格方向變化、fat tails） |
| 動態假設 | sticky strike；floating skew（水平隨 S、垂直隨 ATM vol）；sticky delta（以 standard deviation 為 x） |
| standard deviation 座標 | $x = \ln(K/F)/(\sigma\sqrt t)$ |
| y 軸標準化 | $\sigma_K/\sigma_{ATM}$（比例優於差額） |
| skew 模型 | $y = a + bx + cx^2$；$a$=水準、$b$=skewness、$c$=kurtosis |
| 敏感度符號 | skewness：高 strike +、低 strike −；kurtosis：非 ATM 皆 +；ATM 皆 0 |
| 指標 | 25Δ put vol − 25Δ call vol（skewness）；±5Δ 對 kurtosis 最敏感 |
| 調整 delta | $\Delta_{\text{adj}} \approx \Delta + \text{vega} \times \partial\sigma_K/\partial S$ |
| skewness 交易 | risk reversal（delta 或 vega 中性） |
| kurtosis 交易 | strangle vs straddle（vega 中性）；2:1 為 dragonfly |
| 跨月 | put/call calendar spread，挑「volatility 與 skew 優勢同向」的那一邊 |
| 隱含分配 | $P(K) \approx \text{蝶式}/h$；$f(K) = \partial^2 C/\partial K^2$ |
| 股指隱含分配 | 小中漲↑、大跌↑、小中跌↓、大漲↓ |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B3、B4、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ 為什麼股票市場的 protective put 集中在低 strike、掩護性 call 集中在高 strike？這如何造成 investment skew？

<details><summary>提示</summary>

分別想：持股的人怕什麼、想買哪種 put？看多的持股者會賣哪種 call？買壓和賣壓分別讓哪一邊的 implied volatility 上升或下降？

</details>

<details><summary>解答</summary>

protective put：ITM put 太貴，若真的擔心到需要 ITM 保護，不如直接賣股票，因此多買 OTM（低 strike）put。掩護性 call：持股者看多，想保留部分上漲空間，賣 ITM call 股票很快會被叫走，所以多賣 OTM（高 strike）call。結果低 strike 有買壓、高 strike 有賣壓，低 strike implied volatility 上升、高 strike 下降，形成 investment skew。

</details>

**A2.** 比較 sticky strike 與 floating skew：underlying 下跌時，兩種假設下 ATM implied volatility 各如何變化（以 investment skew 為例）？

<details><summary>解答</summary>

Sticky strike：每個 strike volatility 不變，underlying 下跌後新的 ATM strike 是較低的 strike，而它原本的 volatility 較高，所以 ATM volatility**上升**。floating skew：整條 skew 跟著 underlying 左移，ATM volatility**不變**（除非整體 volatility 另外移動）。

</details>

**A3.** 為什麼用比例法（$\sigma_K/\sigma_{ATM}$）標準化 y 軸，通常比差額法好？

<details><summary>解答</summary>

當整體 volatility 大幅變化（例如 ATM 從 20% 翻倍到 40%），各 strike 的 volatility 通常也大致等比例變化。比例法下 125% 的 strike 會自動對應到 50%，差額法則會錯誤地預測只比 ATM 高 5 點（45%）。比例法讓不同 volatility 環境下的 skew 形狀可以比較。

</details>

**A4.** 在二次 skew 模型中，為什麼 ATM option 的 skewness 與 kurtosis 敏感度都是 0？為什麼任何非 ATM option 的 kurtosis 敏感度都為正？

<details><summary>解答</summary>

ATM 處 $x = 0$，$bx$ 與 $cx^2$ 都是 0，改變 $b$ 或 $c$ 不影響它的 volatility，所以敏感度為 0（ATM 是支點）。$cx^2$ 對任何 $x \neq 0$ 都為正，提高 $c$ 會提高所有非 ATM strike 的 volatility，而 option 價值隨 volatility 上升（vega > 0），所以 kurtosis 敏感度都為正。

</details>

**A5.** 一位交易員在股價指數市場買進 ATM straddle，認為自己是 delta 中性。為什麼實際上他帶有負 delta？

<details><summary>解答</summary>

股價指數下跌時 implied volatility 通常上升、上漲時下降。straddle 是正 vega position，下跌時除了 gamma 的好處外還多賺 vega，上漲時則因 volatility 下降少賺。所以他實際上偏好下跌，等同於持有負 delta。

</details>

**A6.** 為什麼把所有間距相同的 butterfly 全部買下，到期價值永遠等於間距 $h$？

<details><summary>解答</summary>

到期價格 $S_T$ 一定落在某兩個相鄰 strike $K_i \le S_T \le K_{i+1}$ 之間，只有以 $K_i$ 與 $K_{i+1}$ 為中心的兩個 butterfly 有價值：前者值 $h - (S_T - K_i) = K_{i+1} - S_T$，後者值 $h - (K_{i+1} - S_T) = S_T - K_i$，加總恰為 $K_{i+1} - K_i = h$。其他 butterfly 都在翅膀外，值為 0。因此總值恆為 $h$。

</details>

### B. 計算題

**B1.** futures 2,000，3 個月到期，ATM volatility 22%。1,800 strike 距 ATM 幾個 standard deviation？

<details><summary>解答</summary>

$x = \ln(1{,}800/2{,}000)/(0.22\sqrt{0.25}) = -0.10536/0.11 = $ **−0.958**。

</details>

**B2.** ATM volatility 18%，某 strike volatility 22.5%。(a) 用比例法表示；(b) 若 ATM 升至 24%，用比例法預測該 strike volatility。

<details><summary>解答</summary>

(a) $22.5/18 = $ **125%**；(b) $1.25 \times 24 = $ **30%**。

</details>

**B3.** ⭐ skew 模型 $y = 20 - 3x + x^2$（volatility 百分點）。求 $x = -1.5$ 與 $x = +1.5$ 的 volatility。

<details><summary>提示</summary>

直接代入 y = 20 − 3x + x²。小心 x = −1.5 時 −3x 會變正的，x² 兩邊都是正的。

</details>

<details><summary>解答</summary>

$x = -1.5$：$20 + 4.5 + 2.25 = $ **26.75%**；$x = +1.5$：$20 - 4.5 + 2.25 = $ **17.75%**。

</details>

**B4.** ⭐ 一個 OTM put 的 Black-Scholes delta 為 −30，vega 0.15（每 vol point）。在浮動 investment skew 下，underlying 每漲 1 點，該 put 的 implied volatility 升 0.4 點。求調整 delta。

<details><summary>提示</summary>

用調整 delta 公式：BS delta + volatility 變化 × vega × 100。先想清楚 underlying 上漲時 put 的 volatility 是升還是降，決定加還是減。

</details>

<details><summary>解答</summary>

$\Delta_{\text{adj}} = -30 + 0.4 \times 0.15 \times 100 = -30 + 6 = $ **−24**。

</details>

**B5.** 建構 risk reversal：+20 口 90 put（delta −20）、−20 口 110 call（delta +30）。要 delta 中性，需要買或賣幾口 underlying？

<details><summary>解答</summary>

position delta $= 20 \times (-20) + (-20) \times 30 = -400 - 600 = -1{,}000$，需**買進 10 口** underlying。

</details>

**B6.** 90 put vega 0.08、110 call vega 0.09；100 call 與 100 put vega 各 0.20。若賣出 20 組 100 straddle，需要買進幾組 90/110 strangle 才能 vega 中性？

<details><summary>解答</summary>

straddle vega $= 0.40 \times 20 = 8.0$；每組 strangle vega $0.17$；需 $8.0/0.17 = 47.06$，約 **47 組**。

</details>

**B7.** 90/100/110 call butterfly 價格 0.85，stock-type settlement，利率 4%，6 個月到期。underlying 到期剛好為 100 的（離散）隱含機率是多少？

<details><summary>解答</summary>

所有 butterfly 總和 = 間距 10 的現值 $= 10e^{-0.04 \times 0.5} = 9.802$。機率 $= 0.85/9.802 = $ **8.67%**（若忽略利率則為 8.5%）。

</details>

**B8.** 某指數 ATM straddle vega 0.45。經驗上指數每跌 1 點 implied volatility 升 0.6 點。這個「delta 中性」straddle 的實際 delta 約是多少？

<details><summary>解答</summary>

每跌 1 點因 vega 多賺 $0.6 \times 0.45 = 0.27$，等同 delta **−27**。

</details>

### C. 交易情境題

**C1.** ⭐ 某股價指數 25-delta risk reversal 目前為 7 個 vol point，歷史常態在 4–5 點之間。你認為市場恐慌過度，skew 會變平，但對整體 volatility 沒有看法。你要建立什麼 position？如何讓它只對 skew 敏感？

<details><summary>提示</summary>

股指是 investment skew，「變平」代表低 strike 的 volatility 相對會下降。該賣哪一邊、買哪一邊？接著用口數讓兩腿 vega 相等，最後看剩下的 delta 是正是負。

</details>

<details><summary>解答</summary>

investment skew 預期變平 → **賣低 strike（25Δ put）、買高 strike（25Δ call）**。選擇 vega 相同的數量使 position vega 中性（例如 put vega 較大就賣較少口），再用 underlying 抵銷剩餘 delta（賣 put + 買 call 的 delta 為正，需**賣出** underlying）。注意：這個 position 在市場急跌時會很痛（短 put、skew 變陡），要設定停損與 skewness 敏感度限額，並留意 gamma 不一定為中性。

</details>

**C2.** 你觀察到：6 月整體 implied volatility 比 3 月低（你認為 6 月便宜），同時 6 月的 skew 比 3 月平坦很多（你認為 6 月 OTM put 相對便宜、OTM call 相對貴）。你會用 put calendar spread 還是 call calendar spread？方向為何？

<details><summary>解答</summary>

**買 put calendar spread**：買 6 月 OTM put、賣 3 月 OTM put。6 月 put 在整體 volatility 與 skew 兩方面都便宜，兩個優勢同向。不使用 call calendar spread：買 6 月 call 雖然在整體 volatility 上便宜，但就 skew 而言太貴，兩者互相抵銷。選擇 vega 相近的組合使 position 對整體 volatility 的曝險可控，剩餘 delta 用 underlying hedge。

</details>

### D. 挑戰題

**D1.** 證明在零利率下，butterfly 的離散機率在 $h \to 0$ 時收斂到 $\partial^2 C/\partial K^2$，並說明為什麼任何無 arbitrage 的 call 價格曲線 $C(K)$ 必須是 $K$ 的凸函數。若市場 quote 出現 $C(95) = 7.10$、$C(100) = 4.20$、$C(105) = 1.20$，存在什麼 arbitrage？

<details><summary>解答</summary>

butterfly 價格 $B(K) = C(K-h) - 2C(K) + C(K+h)$。泰勒展開：$C(K \pm h) = C(K) \pm hC' + \tfrac{1}{2}h^2C'' + O(h^3)$，相加得 $B(K) = h^2 C''(K) + O(h^4)$。離散機率 $P(K) = B/h$ 對應於寬度 $h$ 的區間，所以機率密度 $= P/h = B/h^2 \to C''(K)$。
由於 butterfly 到期損益非負，其價格必須 ≥ 0，即 $C(K-h) + C(K+h) \ge 2C(K)$，也就是 $C$ 對 $K$ 必須是凸函數；否則隱含負機率。
本例 $7.10 - 2 \times 4.20 + 1.20 = -0.10 < 0$：買進 95/100/105 butterfly 可以**收到 0.10**，而到期損益 ≥ 0，是無風險 arbitrage。

</details>

**D2.** 用本章的二次模型思考：若一個交易員持有「賣出 80 put、買進 120 call」的 position（數量使 vega 中性），他的 skewness 與 kurtosis 敏感度各為正或負？如果市場同時發生「skew 變陡」與「kurtosis 上升」，他的損益方向如何？

<details><summary>解答</summary>

賣 80 put：80 put skewness 敏感度為負，賣出後 position skewness 敏感度為**正**；80 put kurtosis 敏感度為正，賣出後為**負**。買 120 call：skewness 敏感度為正、kurtosis 敏感度為正。合計 skewness 敏感度**正**（兩腿同向疊加）。kurtosis 則是兩腿相抵：以本章模型計算，80 put vega 0.0659、120 call vega 0.0271，vega 中性需每賣 1 口 put 買約 2.43 口 call；淨 kurtosis 敏感度 $= -0.0333 + 2.43 \times 0.0094 \approx -0.0106$，淨 skewness 敏感度 $\approx +0.0269$（每 1 口 put，$b$、$c$ 各變動 0.1）。所以 position 是**正 skewness、負 kurtosis**。
「skew 變陡」在 investment skew 中代表 $b$ 變得更負（skewness 輸入下降）→ 正 skewness 敏感度的 position**虧損**；「kurtosis 上升」→ 負 kurtosis 敏感度的 position**虧損**。兩者疊加，損失擴大。這正是短 put、長 call 的 risk reversal 在市場恐慌時的典型處境。

</details>

## 自我檢核清單

- [ ] 能說出三種 skew 類型、對應市場與 hedge 成因。
- [ ] 能解釋為何「volatility 隨價格下跌而上升」與 investment skew 一致。
- [ ] 能比較 sticky strike、floating skew、sticky delta，並計算 $\ln(K/F)/(\sigma\sqrt t)$。
- [ ] 能用 $a + bx + cx^2$ 計算各 strike volatility，並說出 skewness／kurtosis 敏感度在各 strike 的正負號。
- [ ] 能說明 skew 模型可能出現「降低 volatility 反而讓 option 變貴」的不合理情形。
- [ ] 能計算調整 delta，並解釋 straddle 在指數市場的實際 delta 為何為負。
- [ ] 能建構 delta 中性與 vega 中性的 risk reversal、vega 中性的 kurtosis position（含 dragonfly）。
- [ ] 能選擇正確的跨月 put/call calendar spread 來同時利用 volatility 與 skew 觀點。
- [ ] 能從一列 call 價格算出 butterfly 價格與隱含機率，並說明股指隱含分配與 lognormal 的四點差異。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab11_index_and_skew.py`](../labs/exercises/lab11_index_and_skew.py)：實作 `price_weighted_index`、`cap_weighted_index`、`adjust_divisor`、`index_forward`、`sample_skew_kurtosis`、`implied_vol`、`implied_vol_curve`、`otm_implied_vols`、`skew_fit`、`butterfly_density`、`density_summary`、`smile_vol_after_move`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab11_index_and_skew.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`../labs/lab11_index_and_skew`](../labs/exercises/lab11_index_and_skew.py)：從市場價格求解各 strike implied volatility、擬合二次 skew 模型、比較 sticky strike 與 floating skew 下的 delta，以及用 butterfly 價格建構隱含分配並與 lognormal 比較。
- 複習：[`../labs/lab07_spreads`](../labs/exercises/lab07_spreads.py)（risk reversal、strangle、butterfly 的組合 Greeks）、[`../labs/lab05_greeks`](../labs/exercises/lab05_greeks.py)（vega 與數值差分）。
