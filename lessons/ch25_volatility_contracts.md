# 第 25 章　波動率合約（Volatility Contracts）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：想賭波動率（volatility），不一定要「買選擇權（option） + 天天避險（hedge）」這麼累。volatility 合約直接拿一個 volatility 數字結算（settlement）——像是直接買「溫度計讀數」，而不是靠開冷氣暖氣去間接押天氣。

**你只需要先記住這 5 件事**

1. **兩大類合約。** 實現波動率（realized volatility）合約（多半是變異數交換）賭標的（underlying）「實際晃多大」；隱含波動率（implied volatility）合約（VIX 期貨（futures）、option）賭市場「報價（quote）的 volatility」。
2. **realized volatility 的合約算法跟歷史波動率（historical volatility）不一樣。** 假設均值為 0、除以 n（母體），再乘 252 年化。
3. **多數合約用變異數（volatility²）settlement，因為好複製、對時間可加。** 每變異數點價值 = vega 名目 ÷（2 × 成交 volatility）。例：以 25 買 20,000 vega 名目 → 每變異數點 400；實現 30 賺 400 ×（900 − 625）= 110,000。變異數多方有凸性，損益永遠 ≥ 用 volatility settlement。
4. **不同期間的 volatility 不能直接平均，要平均「變異數 × 時間」。** 例：前 3 個月 30、後 1 個月 18 → 整段 27.50，不是 27.0。
5. **VIX 是 30 天 implied volatility，由 1/K² 加權的價外（out-of-the-money, OTM）option 組合算出，不需要定價模型。** VIX futures：正價差（contango）時會往下滑、比 VIX 遲鈍很多、到期才收斂。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 合約 realized volatility | 每日對數報酬平方加總 × 252 ÷ n，再開根號 |
| 每變異數點價值 | vega 名目 ÷（2 × 成交 volatility） |
| 變異數 settlement 損益 | 每變異數點價值 ×（實現² − 成交²），有上限就先把實現截在上限 |
| 合併兩段 volatility | （t1 × σ1² + t2 × σ2²）÷（t1 + t2），再開根號 |
| 複製變異數 | 每個履約價（strike price）買 1/K² 份，再動態 delta hedge |
| VIX futures 守則 | contango 且 VIX 不動 → futures 下跌；變動比指數小；到期收斂 |

**必做練習（約 20 分鐘）**：A3、B3、B4、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

---

## 本章定位

在 [ch08](ch08_dynamic_hedging.md) 我們學到可以「買 option + 動態避險（dynamic hedging）」來交易 volatility，但 [ch23](ch23_models_real_world.md) 告訴我們這個過程充滿問題：volatility 出現的順序、跳空、非常態分配（normal distribution）、以及每次再 hedge 的交易成本。**volatility 合約**讓交易員不必 dynamic hedging，就能直接對 volatility 下注：到期價值只取決於一個相對單純的 volatility 計算。本章介紹 realized volatility 合約（變異數交換）與 implied volatility 合約（VIX 及其 futures、option），說明如何用 $1/K^2$ 加權的 option 組合複製它們，最後談實際用途。前置：[ch20](ch20_volatility_revisited.md)（期限結構、遠期波動率（forward volatility））、[ch24](ch24_volatility_skews.md)（偏斜（skew）與隱含分配）。

## 學習目標

完成本章後，你應該能夠：

1. 依合約慣例（零均值、母體標準差（standard deviation）、252 天年化）計算 realized volatility，並計算 volatility 合約與變異數合約的損益。
2. 解釋為何多數 realized volatility 合約以變異數 settlement，計算「每變異數點價值 = vega 名目 ÷ (2 × 履約（exercise）volatility)」，並分析變異數相對 volatility 的凸性與上限（cap）。
3. 利用變異數對時間可加的性質合併不同期間的 volatility。
4. 說明舊版（價平（at-the-money, ATM）內插）與新版（$1/K^2$ option 組合）VIX 計算方法的差異，並以公式計算一個簡化的 VIX 值。
5. 分析 VIX futures 的期限結構（contango／逆價差（backwardation））、時間衰減、相對指數的「遲鈍」特性，以及跨月價差在曲線形狀改變時的損益。
6. 說明 VIX option 的特性（以 futures hedge、低於指數的 volatility、向上 skew 的「半張苦臉」）。
7. 說明變異數交換的複製原理與 VIX 複製的實務困難，並列舉 volatility 合約在投機、hedge、間接 volatility 曝險上的應用。

## 核心概念

> 對應原書：第 25 章〈Volatility Contracts〉。以下所有數字均為自創或自行計算。

### 25.1 為什麼需要波動率合約

> 💡 **一句話**：dynamic hedging 怕路徑、跳空、交易成本；volatility 合約直接用一個 volatility 數字 settlement，省掉這些麻煩。

用 option 交易 volatility（買或賣 option、再 dynamic hedging 到到期）的困難：
- 價格變動的**順序**會影響 dynamic hedging 結果（路徑相依）。
- **跳空**時無法依 dynamic hedging 的要求買賣 underlying。
- 報酬**不是 normal distribution**。
- 每次再 hedge 都要付出買賣價差（bid-ask spread）、手續費與交易所費用，可能吃掉全部預期利潤。

volatility 合約的到期價值**只取決於一個 volatility 計算**，交易員不必經歷複雜又昂貴的 dynamic hedging。兩大類：

| 類型 | settlement 依據 |
|---|---|
| realized volatility 合約（realized volatility contract） | underlying 在約定期間的**realized volatility** |
| implied volatility 合約（implied volatility contract） | 某指定日期 underlying option 的**implied volatility**（如 VIX） |

### 25.2 實現波動率合約（Realized Volatility Contracts）

> 💡 **一句話**：合約 volatility 用零均值、母體、252 天；多以變異數 settlement，每變異數點 = vega 名目 ÷（2 × 成交 volatility），多方享有凸性。

**settlement 值**：合約期間對數報酬的年化 standard deviation，通常用主要交易所每日結算價（settlement price），以該交易所一年的交易日數年化（例如 252）：

$$\sigma_{\text{實現}} = \sqrt{\frac{252}{n}\sum_{i=1}^{n} \left[\ln\left(\frac{p_i}{p_{i-1}}\right)\right]^2}$$

兩個慣例（與 [ch20](ch20_volatility_revisited.md) 的 historical volatility 估計不同）：
1. **母體 standard deviation**：除以 $n$ 而不是 $n-1$。這是「真實的」期間 volatility，不是估計值。
2. **假設均值為 0**：直接用 $\ln(x_i)$，不減去平均報酬——與價格趨勢無關。

> 例：10 天的 settlement price：100, 101.2, 100.5, 102.0, 101.1, 99.8, 100.9, 102.3, 101.5, 103.0, 102.4
> 對數報酬（%）：+1.193, −0.694, +1.481, −0.886, −1.294, +1.096, +1.378, −0.785, +1.467, −0.584
> 平方和 = 0.0012770
> $$\sigma = \sqrt{\frac{252}{10} \times 0.0012770} = \sqrt{0.032181} = 17.94\%$$
> （若用 $n-1$ 並減去平均報酬，會得到 18.49%——合約慣例不同，結果就不同。）

**以波動率點（vol point）settlement 的損益**：

$$\text{損益} = \text{每點名目} \times (\sigma_{\text{實現}} - \sigma_{\text{成交}})$$

> 例：以 18 買進，每 vol point $5,000。實現 21.4 → 獲利 $5{,}000 \times 3.4 = \$17{,}000$；實現 16.3 → 虧損 $5{,}000 \times (-1.7) = -\$8{,}500$。

**quote 方式**：多在店頭市場（OTC）交易，由銀行與自營商做市（market making）（另有交易對手違約風險）。quote 包含**價格**（vol point）與**曝險量**（vega 名目，notional vega）。
- 「24.50 – 25.50，$20,000 vega 名目」：做市商（market maker）願以 24.50 買、25.50 賣，每 vol point 值 $20,000。
- 客戶下單「以 30 買進 $25,000 vega 名目」：願付 30% 的 volatility，每點值 $25,000。

#### 變異數交換（Variance Swaps）

實務上，多數 realized volatility 合約以**變異數點** settlement（變異數 = volatility²），所以常稱為**變異數合約**或**變異數交換**。為什麼？
1. **好複製**：後面會看到，變異數部位（position）可以用 option 組合精確複製，volatility position 不行。
2. **對時間可加**：變異數與時間成正比（[ch20](ch20_volatility_revisited.md) 的 forward volatility），連續期間可以直接合併，即使期間長度不同：

$$\sigma^2_{\text{合併}} = \frac{t_1\sigma_1^2 + t_2\sigma_2^2}{t_1 + t_2}$$

> 例：前 3 個月年化 volatility 30，接下來 1 個月 18。整段 4 個月：
> $$\sigma^2 = \frac{3 \times 900 + 1 \times 324}{4} = 756,\quad \sigma = 27.50$$
> 注意不是單純平均 $(3 \times 30 + 18)/4 = 27.0$。

**每變異數點的價值**（慣例）：

$$\text{每變異數點價值} = \frac{\text{vega 名目}}{2 \times \text{成交波動率}}$$

（直覺：$d(\sigma^2) = 2\sigma\, d\sigma$，在成交價附近 1 個 vol point ≈ $2\sigma$ 個變異數點，所以兩種合約在成交價附近的曝險一致。）

> 例：以 25 買進 $20,000 vega 名目、以變異數 settlement → 每變異數點 $20{,}000/(2 \times 25) = \$400$。
> - 實現 22：$400 \times (22^2 - 25^2) = 400 \times (484 - 625) = -\$56{,}400$
> - 實現 30：$400 \times (900 - 625) = +\$110{,}000$
> - 實現 60（一次極端事件）：$400 \times (3{,}600 - 625) = +\$1{,}190{,}000$

**凸性**：變異數是 volatility 的平方，高波動時 settlement 值急速放大。比較同一筆交易以變異數或 volatility settlement（$20,000 vega 名目，成交 25）：

| realized volatility | 實現變異數 | 變異數 settlement 損益 | volatility settlement 損益 |
|---|---|---|---|
| 15 | 225 | −160,000 | −200,000 |
| 20 | 400 | −90,000 | −100,000 |
| 22 | 484 | −56,400 | −60,000 |
| 25 | 625 | 0 | 0 |
| 28 | 784 | +63,600 | +60,000 |
| 30 | 900 | +110,000 | +100,000 |
| 35 | 1,225 | +240,000 | +200,000 |
| 50 | 2,500 | +750,000 | +500,000 |

成交價附近兩者幾乎相同；偏離越遠差距越大，而且**變異數 settlement 永遠 ≥ volatility settlement**（對買方而言）。這是因為 $400(\sigma^2 - 625) - 20{,}000(\sigma - 25) = 400(\sigma - 25)^2 \ge 0$。所以變異數交換的買方（多方）享有凸性，賣方承擔它。

**上限（cap）**：賣方不想承擔一次性災難事件，因此許多變異數交換設有上限。例如以 25 成交、上限 volatility 50（變異數 2,500），買方最多賺 $400 \times (2{,}500 - 625) = \$750{,}000$。上限在**個股**變異數交換很常見（單一事件可讓個股 volatility 暴衝）；在**寬基指數**較少見（單一成分股事件對整體指數影響有限）。OTC 合約條款可自由協商。

### 25.3 隱含波動率合約（Implied Volatility Contracts）與 VIX

> 💡 **一句話**：VIX 是 30 天 implied volatility，新方法用 1/K² 加權的 OTM option 組合計算，不用定價模型，還會反映 skew。

realized volatility 無法在當下觀察到；implied volatility 則隨時可以從 option 價格得到，是市場對未來 volatility 的共識。交易所為了推廣、教育，開始發布一個能代表整體 implied volatility 環境的數字——芝加哥 option 交易所（CBOE）的**volatility 指數（VIX）**，代表 underlying 指數**30 天**的理論 implied volatility。它後來成為廣為人知的金融指標，其他交易所也推出類似指數。

為了讓 VIX 可交易，有兩項重要變更：
1. **underlying**：從較早的 100 檔大型股指數 option，改為交易更活躍、更受關注的 500 檔指數（SPX）option。
2. **計算方法**：從「ATM implied volatility 內插」改為「整條 option 組合」。

#### 舊方法：價平內插（以自創數字示範）

> 指數 1,247.30，上下包夾的 strike 1,240 與 1,250。近月剩 9 天、次月剩 37 天。
>
> | | 近月 1,240 | 近月 1,250 | 次月 1,240 | 次月 1,250 |
> |---|---|---|---|---|
> | Call IV | 18.62 | 18.05 | 17.40 | 17.02 |
> | Put IV | 18.70 | 18.11 | 17.46 | 17.06 |
> | 平均 | 18.66 | 18.08 | 17.43 | 17.04 |
>
> **步驟 1：strike 內插**（越接近指數的 strike 權重越大）。1,240 的權重 $= (1{,}250 - 1{,}247.30)/10 = 0.27$，1,250 的權重 $= 0.73$。
> - 近月：$18.66 \times 0.27 + 18.08 \times 0.73 = 18.237$
> - 次月：$17.43 \times 0.27 + 17.04 \times 0.73 = 17.145$
>
> **步驟 2：時間內插到 30 天**（越接近 30 天權重越大）。近月權重 $= (37 - 30)/28 = 0.25$，次月 $= (30 - 9)/28 = 0.75$。
> $$\text{VIX}_{\text{舊}} = 18.237 \times 0.25 + 17.145 \times 0.75 = 17.42$$

**舊方法的兩大問題**：
1. 需要**定價模型**才能算 implied volatility——用哪個模型？（舊 underlying 的 option 還是美式，有提前履約（early exercise）問題。）利率、股利（dividend）又怎麼設？可交易商品的 settlement 值必須毫無爭議。
2. 只用**ATM option**，無法反映越來越受重視的 skew。

#### 新方法：$1/K^2$ 選擇權組合

核心問題：能不能建立一個 option position，在所有 volatility 情境下都捕捉到 underlying 的真實 volatility？

**為什麼單買 ATM option 不行**：vega 在 ATM 最大；underlying 一移動，option 變成價內（in-the-money, ITM）或 OTM，vega 下降，volatility 曝險就變了。

**買一整排 strike 也不夠**：總是有某個 strike 是 ATM，但高 strike 的 ATM option vega 比低 strike 的大（vega ∝ $S$），所以總曝險在高價位較大、低價位較小。

**解法**：每個 strike 買 $1/K^2$ 份——低 strike 多買、高 strike 少買。

> 數值驗證：$\sigma = 20\%$、3 個月，strike 40 到 300 每 1 點都有。計算整個組合的「現金 gamma」$\tfrac{1}{2}S^2\Gamma$（它決定了對變異數的曝險），以 $S = 100$ 為基準標準化：
>
> | underlying 價格 | 70 | 85 | 100 | 115 | 130 |
> |---|---|---|---|---|---|
> | 每個 strike 各 1 份 | 0.49 | 0.72 | 1.00 | 1.32 | 1.69 |
> | 每個 strike $1/K^2$ 份 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
>
> 等量買進時曝險正比於 $S^2$；$1/K^2$ 加權後曝險在任何價位都相同。例如 80 strike 要買的數量是 120 strike 的 $(120/80)^2 = 2.25$ 倍。

**VIX 就是這個組合的成本換算成 volatility**。重點：
1. 只用**OTM option**（相對遠期價（forward price）），因為要捕捉的是時間價值（time value）（volatility 價值），不是內含價值（intrinsic value）。
2. forward price 由**最接近 ATM 的 strike**以買賣權平價（put-call parity）求得：$F = K + e^{rT}(C - P)$。
3. 每個 option 價格取**買賣 quote 中間價**。
4. 往外延伸時，若遇到**連續兩個買價為 0** 的 strike，就不再納入更外面的 option。
5. strike 有限，每個 option 的權重依**相鄰 strike 間距** $\Delta K$ 調整——間距越大權重越大。

**不需要定價模型**：除了 option 價格，只需要利率（用於求 forward price 與折現），通常採用到期日（expiration date）最接近的國庫券利率。

#### 新方法公式與自創計算

單一 expiration date 的變異數：

$$\sigma^2 = \frac{2}{T}\sum_i \frac{\Delta K_i}{K_i^2} e^{rT} Q(K_i) - \frac{1}{T}\left(\frac{F}{K_0} - 1\right)^2$$

- $Q(K_i)$：$K_i < K_0$ 用 put 中間價；$K_i > K_0$ 用 call 中間價；$K_0$ 用 call 與 put 的平均
- $K_0$：低於或等於 forward price $F$ 的第一個 strike
- $\Delta K_i$：相鄰 strike 間距的一半之和（兩端用單邊間距）

> 例：遠期 2,012（由 2,000 strike 的 call 51.96、put 40.00 用平價求得：$2{,}000 + e^{0.04 \times 30/365} \times 11.96 = 2{,}012.0$），30 天，$r = 4\%$，strike 1,700 到 2,300 每 50 點，所有 option 以 20% volatility 定價（為了檢驗方法）。$K_0 = 2{,}000$。
>
> | $K$ | 1,700 | 1,750 | 1,800 | 1,850 | 1,900 | 1,950 | 2,000 | 2,050 | 2,100 | 2,150 | 2,200 | 2,250 | 2,300 |
> |---|---|---|---|---|---|---|---|---|---|---|---|---|---|
> | $Q(K)$ | 0.05 | 0.26 | 1.08 | 3.51 | 9.33 | 20.83 | 45.98 | 29.81 | 15.50 | 7.28 | 3.08 | 1.18 | 0.41 |
> | 貢獻 ×10⁶ | 0.87 | 4.32 | 16.68 | 51.37 | 129.60 | 274.74 | 576.62 | 355.77 | 176.27 | 78.97 | 31.95 | 11.69 | 3.87 |
>
> 貢獻加總 $= 0.0017127$；$T = 0.08219$
> $$\sigma^2 = \frac{2}{0.08219} \times 0.0017127 - \frac{1}{0.08219}\left(\frac{2{,}012}{2{,}000} - 1\right)^2 = 0.041676 - 0.000438 = 0.041238$$
> $$\text{VIX} = 100\sqrt{0.041238} = 20.31$$
> 與真實的 20% 差 0.31，來自**strike 間距太寬**的離散誤差。若改用每 5 點一個 strike、從 1,200 到 3,000，結果為 20.003。

> 加上 skew：讓 implied volatility 依 $\sigma(K) = 20\% - 0.6\ln(K/F) + \ln(K/F)^2$ 變化（ATM 20%、低 strike 較高）。細網格下 VIX = **22.89**，高於 ATM 的 20%——因為**OTM 賣權（put）較貴**，而 VIX 把整條 skew 都納入。只用 1,700–2,300 的粗網格則得到 21.68，因為截斷了昂貴的左尾。

**內插到 30 天**：VIX 用包夾 30 天的兩個 expiration date 的組合，以**變異數 × 時間**內插：

$$\text{VIX} = 100\sqrt{\left[T_1\sigma_1^2 \frac{N_2 - N_{30}}{N_2 - N_1} + T_2\sigma_2^2\frac{N_{30} - N_1}{N_2 - N_1}\right]\times\frac{N_{365}}{N_{30}}}$$

> 例：近月 23 天 $\sigma_1 = 18.5\%$、次月 51 天 $\sigma_2 = 20.2\%$，權重 0.75 與 0.25：
> $$\text{VIX} = 100\sqrt{\left[\tfrac{23}{365}(0.185)^2(0.75) + \tfrac{51}{365}(0.202)^2(0.25)\right]\times\tfrac{365}{30}} = 19.24$$

#### VIX 合約的到期與結算

- VIX 代表 30 天 implied volatility，所以 VIX 衍生性商品通常在**underlying option expiration date 前 30 天**到期（通常是前一個月的第三個星期三）。例如 1 月 VIX 合約在 2 月指數 option 到期前 30 天到期。
- 到期時剛好剩 30 天，所以只用**單一到期月**的 option 計算。
- settlement 值不用中間價，而是用到期星期三**特別開盤撮合（special opening quotation / rotation）**中每個 option 的實際開盤成交價；無成交則回到中間價。若開盤時普遍成交在賣價（買盤推動），settlement 值可能偏高；普遍成交在買價則偏低——因此到期 settlement 值有時會出現異常跳動。settlement 後恢復一般中間價計算。

### 25.4 VIX 的一些特性（Some VIX Characteristics）

> 💡 **一句話**：VIX 跟股市反向走；它比較像「恐慌指數」，不太能預測接下來的 realized volatility。

- **與股價指數負相關**：股價指數下跌時 volatility 傾向上升（[ch23](ch23_models_real_world.md)），VIX 通常與指數反向移動，而且 VIX 的百分比變動常是指數百分比變動的好幾倍。
- **VIX 能預測 realized volatility 嗎？** 如果市場正確，VIX 上升後的 30 天應該比前 30 天更波動。但從長期資料看，「VIX 變動」與「接下來 30 天 realized volatility 相對前 30 天的變化」之間幾乎看不出相關性。也許驅動 VIX 的不是對 realized volatility 的預期，而是**下跌市場中買保護的需求**：恐慌時 hedge 者不計 realized volatility 地付高價買保護性選擇權（protective option）。因此 VIX 常被稱為「**恐慌指數（fear index）**」。
- **下跌市場真的較波動嗎？** 把 30 天指數漲跌幅與同期 realized volatility 配對，資料顯示「指數下跌期的 realized volatility 較高、上漲期較低」的傾向，呈中度負相關——支持股價指數「跌時較波動」的經驗。

### 25.5 交易 VIX（Trading the VIX）

> 💡 **一句話**：VIX 不能直接買賣，只能交易 futures 和 option：futures contango 會下滑、比指數遲鈍、到期才收斂。

任何指數都是 $\sum(\text{權重}_i \times \text{成分}_i)$。股價指數可以用買進成分股複製，但 VIX 的「成分」是一整排 OTM option，**成分與權重隨 option ITM 外變化而不斷改變**，實務上很難複製。對多數交易員而言，唯一實際的交易方式是透過**VIX futures、VIX option**或連結它們的商品；也正因為無法直接買賣 VIX，這些衍生商品不一定會跟著指數走。

#### VIX 期貨（VIX Futures）

- 以到期星期三開盤的 VIX 值 settlement，每 1 個 vol point $1,000。
- 兩個讓新手驚訝的特性：(1) VIX futures 有**期限結構**；(2) 無法輕易複製 VIX 現貨 position，所以沒有套利（arbitrage）力量把 futures 與指數綁在一起。

**期限結構**（反映指數 implied volatility 的期限結構，[ch20](ch20_volatility_revisited.md)）：
- **contango**：遠月高於近月，是常態（平靜時期）。
- **backwardation**：近月高於遠月，較少見，出現在恐慌時期；危機時可能從 contango 快速翻成 backwardation。

**contango 下的時間衰減**：若市場狀況不變，隨時間經過，futures 會沿著曲線「往下滑」，逐漸失去價值。

> 例：VIX 現貨 15.0；VIX futures M1（25 天後到期）18.0。若到期時 VIX 仍為 15.0，M1 會收斂到 15.0，多單每口虧 $3.0 \times \$1{,}000 = \$3{,}000$——即使 VIX 完全沒動。

**futures 比指數「遲鈍」**：futures 反映的是市場預期**futures 到期時**的 implied volatility。若 VIX 上升發生在離到期還很久的時候，市場預期它會回落（volatility 均值回歸（mean reversion）），futures 就漲得少很多。

> 例：VIX 在幾天內從 15 漲到 20（+5），但三週後到期的 M1 futures 只從 16.5 漲到 18.5（+2）。多單賺 $2 \times \$1{,}000 = \$2{,}000$，而不是期待中的 $5,000。反之，backwardation 時 VIX 從 40 跌到 33（−7），M1 可能只跌 4。

在傳統 futures 市場，futures 與現貨若不同步，就會有人買便宜的、賣貴的，持有到到期等待收斂；VIX 無法輕易交易，所以 futures**不必**與指數同步變動，甚至可能完全不動。

**到期收斂**：不論期限結構如何，到期時 futures 一定等於 VIX settlement 值。所以越接近到期，futures 對指數變化的反應越完整。

**交易 VIX futures 的四條守則**：
1. contango 且指數不變時，futures 價格必然下跌。
2. futures 價格幾乎從不像指數變得那麼快。
3. futures 與指數到期必然收斂。
4. 多數交易員無法複製指數，因此 futures 價格往往要獨立於指數來評估。

何時買 futures 有利？預期指數上升**且發生在接近到期時**，或預期大幅上升、使期限結構從 contango 翻成 backwardation。何時賣 futures 有利？反之。但兩種情況都要降低期待——futures 變動幾乎總是小於指數變動。

#### VIX 期貨價差（Futures Spreads）

- 若期限結構是**直線**（斜率固定），不論整體上下移動或隨時間滑動，兩個月份的價差都不變。
- 現實中曲線通常**彎曲**：近月變動比遠月快。若曲線形狀不變：
  - **contango**：買遠月、賣近月會獲利（近月滑落較快）。
  - **backwardation**：買近月、賣遠月會獲利。

> 例：contango、彎曲的曲線：M1 = 16.5、M2 = 18.2、M3 = 19.3、M4 = 20.0。一個月後若形狀不變，M2 移到 M1 的位置（16.5，跌 1.7），M3 移到 M2 的位置（18.2，跌 1.1）。**買 M3、賣 M2** 的價差賺 $1.7 - 1.1 = 0.6$ 點（$600）。
> 若曲線是直線（每月差 1.0），兩腿都跌 1.0，價差不變。

**曲線形狀改變**：近月幾乎總是變動較快。
- 預期 contango 變平、或轉向 backwardation → **賣出 futures 價差**（賣遠月、買近月）：近月漲得比遠月快。
- 預期 backwardation 變平、或轉向 contango → **買進 futures 價差**（買遠月、賣近月）：近月跌得比遠月快。

#### VIX 選擇權（VIX Options）

- 歐式，以到期星期三開盤的 VIX 值現金結算（cash settlement），每點 $100。
- **VIX 本身極度波動**：短期內可能翻倍甚至三倍；其 50 天 historical volatility 經常遠高於 50%，極端時接近 200%。
- 但 VIX option 的 implied volatility**低於**指數本身的 volatility。原因：無法用 VIX 現貨 hedge，實際 hedge 工具是 **VIX futures**，而 futures 比指數「遲鈍」、volatility 較低，且越遠月越低。dynamic hedging 的交易員應該關心**hedge 用 futures 的 volatility**，而不是指數的 volatility。
- **skew 形狀不同**：股票或商品價格理論上可以無限上漲，長期也有上漲的預期；但 implied volatility 有實際的上下限（指數 implied volatility 很少低於 5%，也很少高於 100%），而且有**mean reversion**——VIX 很低時較可能上升、很高時較可能下降。因此：
  - 低 strike implied volatility**急遽下降**（VIX 幾乎不可能跌到很低）。
  - 高 strike implied volatility 較高，但到某個程度後**趨平**。
  - 形狀不是微笑，比較像「**半張苦臉（half frown）**」。
- 用 [ch24](ch24_volatility_skews.md) 的蝶式（butterfly）方法求 VIX option 的隱含分配：相對於對數常態（lognormal），**左尾大幅受限**（幾乎不可能跌到很低），右尾也較受限（大漲較不可能），但在最遠的右尾又有略高的極端大漲機率。

### 25.6 複製波動率合約（Replicating a Volatility Contract）

> 💡 **一句話**：1/K² 加權的 option 組合 + dynamic hedging 可精確複製變異數，但複製不了 volatility；複製 VIX 實務上很困難。（可先跳過）

#### 複製變異數交換

假設你以 25 賣出一個實現變異數合約（變異數 625）。realized volatility 高於 25 會虧、低於 25 會賺。hedge 方法：
1. 買進一整排各 strike 的 option，每個 strike 買 $1/K^2$ 份 → 得到**固定的變異數曝險**。
2. 對整個組合**動態 delta hedge**直到變異數交換到期。
3. 組合的總損益會精確對應實現變異數。

**volatility 合約無法以同法複製**：volatility 是變異數的平方根，變異數曝險固定時，volatility 曝險就不可能固定（見上一節凸性表）。用 option 組合對沖以 volatility settlement 的合約，無法確定組合能精確抵銷，這就是 realized volatility 合約多以變異數 settlement 的原因。

**arbitrage**：若能以 24 的成本（變異數 576）建立複製的多頭變異數 position，同時以 25（變異數 625）賣出變異數交換，且每變異數點 $400，則鎖定利潤 $(625 - 576) \times 400 = \$19{,}600$。

**怎麼知道組合「買在幾%」？** VIX 的計算方法就是把整條組合的成本換算成一個 volatility——類似把單一 option 價格換算成 implied volatility，只是這個 implied volatility 具有固定變異數曝險。

#### 複製 VIX

- VIX 到期值由一條剛好剩 30 天的 option 組合決定；但到期前沒有剛好 30 天的 option，所以需要**兩條**包夾 30 天的組合，並適當加權。
- 複製 VIX futures position 需要**買一條、賣一條**；兩條組合的 gamma 大致互相抵銷，總 gamma 接近 0，**不必 dynamic hedging**，可持有到 VIX 到期，再在特別開盤撮合中平掉遠月那條。

**實務困難**：
1. **expiration date 不一致**：遠月組合在 VIX 到期星期三的開盤撮合中平倉，但近月組合是在星期三**之前或之後的星期五**到期。若在之後，你得在星期三自己平倉，付出每個 option 的 bid-ask spread；若在之前，你得單獨持有遠月組合五天的裸 position。兩者都昂貴，沒有好解法。
2. **OTM 變 ITM**：VIX 只用 OTM option，但持有期間有些 option 會變成 ITM。由合成（synthetic）關係，ITM option 加上一口 underlying 等於反向的 OTM option，所以每一個 ITM option 要搭配買或賣一口 underlying。但指數 option 的 underlying 是 500 檔股票的籃子，不易交易；若有同時到期的指數 futures 可當替代，否則可能要用同到期的 **combo**（買 call 賣 put 或反之，同 strike）當替代 underlying。

結論：專業衍生性商品公司有時會在 option 市場複製變異數或 VIX 合約，但對多數交易員並不實際。

### 25.7 波動率合約的應用（Volatility Contract Applications）

> 💡 **一句話**：變異數合約 hedge gamma、VIX 合約 hedge vega；covered call 和再平衡經理其實是空 volatility。

**投機**：
- 對**實現** volatility 有看法 → 買賣變異數交換。
- 對**隱含** volatility 有看法 → 買賣 VIX futures；對 VIX 的 volatility 有看法 → 交易 VIX option。

**hedge volatility position**：market maker 與 hedge 基金常（甚至無意間）累積 volatility position。
- 有 realized volatility 曝險（正或負 gamma）→ 用變異數合約對沖。
- 有 implied volatility 曝險（正或負 vega）→ 用 VIX 合約對沖。

**hedge 市場 position**：股市與 implied volatility 負相關，持有多頭股票的經理人可以**買 VIX futures、買 VIX call 或賣 VIX put**；股市下跌時 VIX 傾向上升，抵銷部分股票損失。

> 例：經理人買 5 口 VIX futures（每點 $1,000）於 21.5。市場急跌，VIX futures 漲到 25.0，hedge position 賺 $5 \times 3.5 \times \$1{,}000 = \$17{,}500$，抵銷部分股票虧損。（注意 VIX futures 的 roll-down：若市場平靜，這個保險會持續流失價值。）

**間接 volatility position**：
- **option market maker**：獲利來自成交量，而高波動帶來高成交量 → 他有**間接的多頭 volatility**position。可用賣出 VIX 對沖——但其實是在對沖成交量，position 不宜大到分散本業注意力。
- **定期再平衡的投資組合經理**：再平衡成本在高波動時較高（價差變寬）→ 接近再平衡日時是**空頭 volatility** → 可用買 VIX 對沖。
- **掩護性買權（covered call）經理人**：兩個目標——組合增值、勝過基準指數。
  - 市場大漲：組合增值，但 call 被 exercise，上檔受限 → 輸給基準。
  - 市場大跌：權利金（premium）幫他勝過基準，但只是部分 hedge → 組合價值下跌。
  - 市場**不動或小動**：兩個目標都達成。
  - 所以他其實是**空頭 volatility**，可以買 VIX futures 對沖部分風險。

### 25.8 結語：模型是僕人，不是主人

> 💡 **一句話**：模型是僕人不是主人：要懂它的強項和弱點，結果違背常識時要調整或擱置。

使用模型時會在輸入與假設上犯錯，短期也有運氣成分；但長期來看，願意深入理解模型強項與弱點的交易員總是勝出。對模型要有信心，但不是盲信：當模型結果明顯違背常識，或市場變化太快使模型不切實際時，要決定是調整模型還是暫時擱置。交易既是科學也是藝術——只有真正了解模型能做什麼、不能做什麼的人，才能讓模型為自己所用。

## 交易員視角

- **Optibook 連結：你的 position 就是 volatility 合約**。在 `options_market_making/` market making 時，你累積的 option position 本質上就是一個（不完美的）變異數 position：正 gamma = 多實現變異數，正 vega = 多 implied volatility。用本章的語言描述你的 position：「我現在是多 X 元每變異數點」，比只看 vega 更直觀。
- **$1/K^2$ 的直覺用於分配 position**：若你想讓 volatility 曝險不隨 underlying 價格移動而改變，OTM put（低 strike）需要比 OTM call 持有更多口數。只在 ATM 附近 market making，一旦 underlying 移動，曝險就會大幅改變。
- **realized volatility 計算**：Optibook 只提供連線後的成交紀錄，你可以用本章公式（零均值、母體、適當的年化因子）即時計算 realized volatility，與你 quote 用的 implied volatility 比較——實現 > 隱含時，正 gamma position 才划算。注意採樣頻率決定年化因子（每秒、每分鐘、每天要換算正確）。
- **futures 遲鈍 = 避險比率（hedge ratio）要調整**：若有 volatility 相關的 futures 商品，不要假設它與現貨一比一移動；用歷史資料估計 futures 對指數的 beta，再決定 hedge 量。
- **凸性的風險管理**：賣出變異數（或負 gamma 的 option position）在極端事件時損失是平方放大的。在 Optibook 遇到價格跳動時，空 gamma position 的損失會比 delta 估計的大得多——設定以「最壞情境」而非 Greeks 線性估計的停損。

## 常見誤區

1. **誤解**：realized volatility 合約的 settlement 方法和 historical volatility 估計一樣（樣本 standard deviation、減平均）。→ **正解**：合約通常用母體 standard deviation（除以 $n$）並假設均值為 0。
2. **誤解**：以變異數 settlement 和以 volatility settlement 只是單位不同。→ **正解**：變異數 settlement 有凸性：遠離成交價時，變異數多方的損益永遠優於（≥）volatility 多方。
3. **誤解**：不同期間的 volatility 可以直接平均。→ **正解**：要以時間加權平均**變異數**，再開根號。
4. **誤解**：VIX 漲 5 點，VIX futures 也會漲 5 點。→ **正解**：VIX 無法直接交易，futures 反映對到期時的預期，通常變動小得多；只有接近到期時才緊貼指數。
5. **誤解**：在 contango 市場長期持有 VIX futures 多單是便宜的保險。→ **正解**：contango 下 futures 隨時間滑落，若 VIX 不動，多單會持續虧損。
6. **誤解**：VIX option 的 implied volatility 應該等於 VIX 指數本身的 historical volatility。→ **正解**：VIX option 以 VIX futures hedge，futures volatility 較低，所以 implied volatility 也較低；skew 呈「半張苦臉」而非微笑。

## 重點摘要

| 主題 | 公式／規則 |
|---|---|
| realized volatility（合約） | $\sigma = \sqrt{\tfrac{252}{n}\sum \ln(p_i/p_{i-1})^2}$；母體、零均值 |
| volatility settlement 損益 | 每點名目 × (實現 − 成交) |
| 每變異數點價值 | vega 名目 / (2 × 成交 volatility) |
| 變異數 settlement 損益 | 每變異數點價值 × (實現² − 成交²) |
| 凸性 | 變異數損益 − volatility 損益 $= \frac{\text{vega 名目}}{2K}(\sigma - K)^2 \ge 0$ |
| 時間可加性 | $\sigma^2 = (t_1\sigma_1^2 + t_2\sigma_2^2)/(t_1 + t_2)$ |
| 上限 | 個股常見、寬基指數較少 |
| 舊 VIX | ATM 兩 strike 內插 → 兩月份時間內插（需模型） |
| 新 VIX | $\sigma^2 = \frac{2}{T}\sum \frac{\Delta K}{K^2}e^{rT}Q(K) - \frac{1}{T}(F/K_0 - 1)^2$；只用 OTM、中間價、兩個 0 買價截斷 |
| 30 天內插 | 以 $T\sigma^2$ 依天數線性內插再年化 |
| 複製 | 每個 strike $1/K^2$ 份 → 固定變異數曝險 |
| VIX futures | 每點 $1,000；contango 時 roll-down；比指數遲鈍；到期收斂 |
| VIX futures 價差 | 曲線彎曲且形狀不變：contango 買遠賣近、backwardation 買近賣遠 |
| VIX option | 每點 $100，歐式；以 futures hedge；skew 為半張苦臉 |
| 間接曝險 | market maker（多波動）、再平衡經理（空波動）、covered call（空波動） |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A3、B3、B4、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 列出三個讓「買 option + dynamic hedging」難以精確捕捉 volatility 的原因，以及 volatility 合約如何解決。

<details><summary>解答</summary>

(1) 價格變動的順序會影響 hedge 結果（路徑相依）；(2) 跳空時無法依要求調整；(3) 報酬非常態；另外還有每次再 hedge 的交易成本。volatility 合約直接以一個 volatility 計算 settlement，不需要交易員自己 dynamic hedging，因此避開了這些問題。

</details>

**A2.** 為什麼 realized volatility 合約用除以 $n$（母體）而非 $n-1$（樣本），並假設均值為 0？

<details><summary>解答</summary>

合約 settlement 的是該期間「真正發生」的 volatility，不是對未知母體的估計，所以用母體 standard deviation。假設均值為 0 讓 settlement 值與價格趨勢無關——即使 underlying 在期間持續上漲，每日的漲幅也全部算作波動。

</details>

**A3.** ⭐ 為什麼多數 realized volatility 合約以變異數而非 volatility settlement？

<details><summary>提示</summary>

回想兩個理由：一個跟「能不能用 option 組合精確對沖」有關（看 25.6），一個跟「不同期間能不能直接合併」有關。

</details>

<details><summary>解答</summary>

(1) 變異數 position 可以用 $1/K^2$ 加權的 option 組合加上 dynamic hedging 精確複製，market maker 能對沖；volatility 是變異數的平方根，固定變異數曝險不代表固定 volatility 曝險，無法精確對沖。(2) 變異數對時間可加，不同期間的合約容易合併。

</details>

**A4.** 舊版 VIX 計算方法有哪兩個問題，使它不適合作為可交易商品的 settlement 基準？

<details><summary>解答</summary>

(1) 需要定價模型才能算出 implied volatility，模型選擇與利率、dividend 等輸入都可能引起爭議，而 settlement 值必須毫無爭議；(2) 只使用 ATM option，無法反映 skew 這個越來越重要的資訊。

</details>

**A5.** VIX 跳升 6 點，但你持有的、還有 7 週到期的 VIX futures 只漲了 2 點。這合理嗎？為什麼股價指數期貨（stock index futures）不會這樣？

<details><summary>解答</summary>

合理。VIX futures 反映市場對**futures 到期時** VIX 的預期；volatility 有 mean reversion，市場預期急升的 VIX 到時會部分回落。而且 VIX 無法直接買賣，沒有 arbitrage 力量把 futures 與現貨綁在一起。stock index futures 則可以用買賣成分股與 futures arbitrage，持有到到期收斂，所以 futures 必須與指數大致同步變動。

</details>

**A6.** 為什麼 VIX option 的 skew 不是微笑，而像「半張苦臉」？

<details><summary>解答</summary>

implied volatility 有實際的上下限並且 mean reversion：VIX 幾乎不可能跌到很低，所以低 strike 的 implied volatility 急遽下降；VIX 可能急升，所以高 strike implied volatility 較高，但因為極高水準難以持續，到某個程度後就趨平。結果是左側快速下滑、右側上升後趨平的形狀。

</details>

### B. 計算題

**B1.** 5 天的 settlement price：50, 50.6, 50.1, 50.9, 50.4, 51.0。依合約慣例（零均值、母體、252 天）計算 realized volatility。

<details><summary>解答</summary>

對數報酬（%）：+1.1929, −0.9931, +1.5842, −0.9872, +1.1834
平方和 $= 0.0001423 + 0.0000986 + 0.0002510 + 0.0000975 + 0.0001400 = 0.0007294$
$\sigma = \sqrt{252/5 \times 0.0007294} = \sqrt{0.036762} = $ **19.17%**

</details>

**B2.** 以 22 買進 realized volatility 合約（以 vol point settlement），每點 $8,000。實現 19.5，損益為何？

<details><summary>解答</summary>

$8{,}000 \times (19.5 - 22) = $ **−\$20,000**。

</details>

**B3.** ⭐ 以 20 買進 $50,000 vega 名目的變異數交換。(a) 每變異數點價值？(b) 實現 24 的損益？(c) 若上限為 2.5 倍成交 volatility，實現 70 時的損益？

<details><summary>提示</summary>

(a) 套每變異數點價值公式；(b) 損益 = 每點價值 ×（實現² − 成交²）；(c) 先算上限是幾個 vol point，實現 70 超過上限，就用上限代替 70。

</details>

<details><summary>解答</summary>

(a) $50{,}000/(2 \times 20) = $ **\$1,250**。
(b) $1{,}250 \times (576 - 400) = $ **+\$220,000**。
(c) 上限 50（變異數 2,500）：$1{,}250 \times (2{,}500 - 400) = $ **+\$2,625,000**（不是用 70² 計算）。

</details>

**B4.** ⭐ 前 2 個月年化 volatility 16，接下來 4 個月年化 volatility 28。整段 6 個月的年化 volatility 為何？

<details><summary>提示</summary>

不要直接平均 16 和 28。先把 volatility 平方成變異數，用月數加權平均，最後再開根號。

</details>

<details><summary>解答</summary>

$\sigma^2 = (2 \times 256 + 4 \times 784)/6 = 3{,}648/6 = 608$，$\sigma = $ **24.66**（單純平均會得到 24.0）。

</details>

**B5.** 舊版 VIX 式內插：近月（12 天）內插後 implied volatility 21.0，次月（40 天）19.0。求 30 天值。

<details><summary>解答</summary>

近月權重 $(40 - 30)/28 = 0.357$，次月 $(30 - 12)/28 = 0.643$。$21.0 \times 0.357 + 19.0 \times 0.643 = $ **19.71**。

</details>

**B6.** VIX 式 30 天值為 20、60 天值為 22（都是年化）。隱含的「30 天後開始、為期 30 天」的 forward volatility 是多少？

<details><summary>解答</summary>

用變異數 × 時間可加：$60 \times 22^2 = 30 \times 20^2 + 30 \times \sigma_f^2$ → $\sigma_f^2 = (29{,}040 - 12{,}000)/30 = 568$ → $\sigma_f = $ **23.83**。

</details>

**B7.** 用 $1/K^2$ 加權建立變異數複製組合時，60 strike 的 option 數量是 90 strike 的幾倍？

<details><summary>解答</summary>

$(1/60^2)/(1/90^2) = (90/60)^2 = $ **2.25 倍**。

</details>

**B8.** 計算 VIX 的步驟之一：3,000 strike call 中間價 61.20、put 48.70，到期 0.1 年，$r = 5\%$。求 forward price $F$。

<details><summary>解答</summary>

$F = K + e^{rT}(C - P) = 3{,}000 + e^{0.005} \times 12.50 = 3{,}000 + 1.00501 \times 12.50 = $ **3,012.56**。

</details>

**B9.** 以 25 賣出 $20,000 vega 名目的變異數交換（每變異數點 $400），realized volatility 23。賣方損益為何？若同一筆改以 vol point settlement（每點 $20,000），賣方損益又是多少？

<details><summary>解答</summary>

變異數 settlement：買方 $400 \times (529 - 625) = -\$38{,}400$，賣方 **+\$38,400**。
volatility settlement：買方 $20{,}000 \times (23 - 25) = -\$40{,}000$，賣方 **+\$40,000**。賣方在 volatility settlement 下多賺 $1,600，差額 $= 400 \times (23-25)^2 = 1{,}600$，正是凸性。

</details>

### C. 交易情境題

**C1.** ⭐ VIX 現貨 13.5，處於歷史低檔；VIX futures 曲線呈陡峭 contango：M1（3 週到期）15.8、M2 17.6、M3 18.7、M4 19.3。你認為「volatility 太便宜，會漲」。你會直接買 M1 futures 嗎？有沒有更好的結構？

<details><summary>提示</summary>

先想如果 VIX 三週後還是 13.5，M1 會收斂到哪裡、多單虧多少？再想：要賺錢，VIX 必須漲到多少、而且在什麼時候漲？有沒有能抵銷 roll-down 成本的價差結構？

</details>

<details><summary>解答</summary>

直接買 M1 的問題：若 VIX 在 3 週內維持 13.5，M1 會收斂到 13.5，多單每口虧 2.3 點（$2,300）；即使 VIX 上升，若發生得早，futures 也只會反應一部分。你的觀點必須「VIX 漲到 15.8 以上且在到期前發生」才會賺。
替代方案：(1) 若認為會出現足以讓曲線轉向 backwardation 的大幅上升，可**賣出 futures 價差**（買 M1、賣 M2 或 M3）：曲線變平或倒掛時近月漲得較快，且 contango 下近月 roll-down 的成本被遠月部分抵銷。(2) 買 VIX call：虧損有限，但要注意 VIX option 以 futures 為 underlying 定價。(3) 若觀點其實是「realized volatility 會高於目前隱含」，可考慮買變異數交換或買 option dynamic hedging。任何方案都要控制 position 大小，因為 contango 下的時間成本是持續的。

</details>

**C2.** 一位基金經理人持有大型股票組合，並每月賣出 OTM 指數 call 增加收益（covered call）。他問你：「我的 position 有 volatility 風險嗎？該怎麼 hedge？」

<details><summary>解答</summary>

有，而且是**空頭 volatility**。市場大漲時 call 被 exercise，報酬上限使他輸給基準指數；市場大跌時 premium 只提供部分保護，組合價值下跌；只有市場平穩時兩個目標（增值、勝過基準）都達成——他希望市場不動，等同賣出 volatility。可以用**買 VIX futures**（或 VIX call）對沖：市場劇烈波動（尤其下跌）時 VIX 上升，hedge position 獲利。要提醒他：VIX futures 在 contango 下會持續 roll-down，這是保險成本；hedge ratio 應以 VIX futures（而非現貨）對他組合的歷史敏感度估計。

</details>

### D. 挑戰題

**D1.** 證明變異數交換多方相對 volatility 交換多方（同 vega 名目 $N$、同成交 volatility $K$、每變異數點 $N/(2K)$）的損益差為 $\frac{N}{2K}(\sigma - K)^2$。據此說明：(a) 若你預期 realized volatility 的**分配很寬**（可能很低也可能很高），但平均剛好等於 $K$，你偏好買哪一種？(b) 為什麼合理的變異數交換成交價（以 volatility 表示）通常**高於**同期的 volatility 交換成交價？

<details><summary>解答</summary>

變異數損益 $= \frac{N}{2K}(\sigma^2 - K^2) = \frac{N}{2K}(\sigma - K)(\sigma + K)$；volatility 損益 $= N(\sigma - K) = \frac{N}{2K}(\sigma - K)(2K)$。相減：$\frac{N}{2K}(\sigma - K)(\sigma + K - 2K) = \frac{N}{2K}(\sigma - K)^2 \ge 0$。
(a) 若 $E[\sigma] = K$，volatility 交換的期望損益為 0，而變異數交換的期望損益 $= \frac{N}{2K}E[(\sigma - K)^2] = \frac{N}{2K}\text{Var}(\sigma) > 0$，所以偏好**買變異數交換**。分配越寬，優勢越大。
(b) 由 (a)，在同一個 $K$ 下變異數多方有正的凸性價值，公平的變異數成交價必須提高，使 $E[\sigma^2] = K_{\text{var}}^2$，即 $K_{\text{var}} = \sqrt{E[\sigma^2]} \ge E[\sigma] = K_{\text{vol}}$（Jensen 不等式）。volatility 的不確定性越大，兩者差距越大。

</details>

**D2.** 用本章的 VIX 公式說明：在投資型偏斜（investment skew）（OTM put implied volatility 較高）的市場中，為什麼 VIX 通常**高於** ATM implied volatility？如果交易所只列出 1,700–2,300 的 strike，而真實市場左尾還有大量有價值的 put，計算出的 VIX 會偏高還是偏低？結合 [ch24](ch24_volatility_skews.md) 的隱含分配說明 VIX 衡量的是什麼。

<details><summary>解答</summary>

VIX 公式把每個 OTM option 的價格以 $\Delta K/K^2$ 加權加總；在 investment skew 下，低 strike put 的價格高於以 ATM volatility 定價的價格，且低 strike 的 $1/K^2$ 權重還更大，所以總和（變異數）高於用單一 ATM volatility 的結果。本章例子中 ATM 20%，細網格 VIX 為 22.89。
若 strike 只到 1,700，左尾有價值的 put 被截斷，少加了正的貢獻，算出的 VIX **偏低**（本章例子粗網格得 21.68）。這就是「連續兩個 0 買價截斷」規則與 strike 範圍會影響 VIX 的原因。
VIX 衡量的是由整個隱含分配（[ch24](ch24_volatility_skews.md) 中用 butterfly 推得的分配）所隱含的**期望變異數**的平方根，而不只是 ATM 的 implied volatility；它把市場對尾部（尤其是大跌）的定價全部納入。

</details>

## 自我檢核清單

- [ ] 能不看筆記依合約慣例算出 realized volatility，並說出與 historical volatility 估計的兩點差異。
- [ ] 能計算 volatility settlement 與變異數 settlement 的損益，並推導每變異數點價值與凸性差額。
- [ ] 能用變異數的時間可加性合併期間或求 forward volatility。
- [ ] 能描述舊 VIX 的兩步內插與它的兩個缺點。
- [ ] 能說出新 VIX 方法的五個要點，並用公式算出簡化例子的 VIX。
- [ ] 能解釋為何 $1/K^2$ 加權能得到固定的變異數曝險，以及為何 volatility 合約無法同法複製。
- [ ] 能說出交易 VIX futures 的四條守則，並判斷期限結構變化下該買或賣 futures 價差。
- [ ] 能解釋 VIX option 的 implied volatility 為何低於 VIX 本身的 volatility，以及半張苦臉 skew 的成因。
- [ ] 能列出複製 VIX 的兩個實務困難。
- [ ] 能辨認 market maker、再平衡經理、covered call 經理的間接 volatility position 並提出對沖方式。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab12_volatility_contracts.py`](../labs/exercises/lab12_volatility_contracts.py)：實作 `realized_variance`、`variance_notional`、`variance_swap_payoff`、`vol_swap_payoff`、`strike_deltas`、`select_otm_quotes`、`variance_swap_fair_strike`、`vix_style_index`、`variance_swap_mtm`、`vol_swap_convexity_approx`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab12_volatility_contracts.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`../labs/lab12_volatility_contracts`](../labs/exercises/lab12_volatility_contracts.py)：realized volatility 合約 settlement、變異數交換損益與凸性、$1/K^2$ option 組合的固定變異數曝險驗證、VIX 式公式計算（含 strike 間距與截斷的影響）、VIX futures 期限結構與價差模擬。
- 複習：[`../labs/lab04_volatility`](../labs/exercises/lab04_volatility.py)（historical volatility 估計）、[`../labs/lab11_index_and_skew`](../labs/exercises/lab11_index_and_skew.py)（skew 與隱含分配）。
