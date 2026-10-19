# P3　波動率曲面動態（Volatility Surface Dynamics）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：現貨一動，曲面上每個履約價的波動率也跟著動。你「假設曲面怎麼動」，就決定了你的 delta——同一個部位，不同假設的避險股數可以差四成以上。

**你只需要先記住這 5 件事**

1. **有效 delta = BS delta + vega × 現貨每動 1 元、該履約價波動率變多少。** 第二項取決於你選哪一種「曲面動態制度」。
2. **三種主要制度。** Sticky strike：每個履約價波動率釘死；sticky moneyness／sticky delta：整條偏斜跟著現貨平移，價平波動率不變；local vol 類：固定履約價波動率照偏斜斜率移動，價平移動兩倍。
3. **向下偏斜時，delta 排序是 local vol < sticky strike < sticky moneyness。** 例：持有 1,000 口 90 put，三種制度分別要買 204、167、129 股，最大差 75 股（約 45%）。
4. **看資料判斷市場像哪一種。** 價平波動率對現貨的反應（spot-vol beta）÷ 偏斜斜率：接近 0 → sticky moneyness；接近 1 → sticky strike；接近 2 → local vol。
5. **Greeks 都有「影子版本」，翼部價格可以拆成 vanna 和 volga 成本。** 期限結構向上時，3 個月價平 call 的 shadow theta −0.0284／日，比 BS 的 −0.0218 多三成。翼部價 ≈ 平坦價 + vanna 成本（看風險逆轉）+ volga 成本（看蝶式）；股指 put 側兩項同號，所以特別貴。

**必背卡**

| 情況 | 記法 |
|---|---|
| 有效 delta | BS delta + vega × 固定履約價波動率對現貨的變化 |
| Sticky strike | 固定履約價波動率不動；價平沿舊偏斜移動 |
| Sticky moneyness | 固定履約價波動率移動 = −偏斜斜率；價平不變 |
| Local vol 類 | 固定履約價移動 ≈ 偏斜斜率；價平移動 ≈ 2 × 斜率 |
| 判斷制度 | spot-vol beta ÷ 偏斜斜率 ≈ 0、1、2 |
| 翼部定價 | 平坦價 + vanna 成本 + volga 成本 |

**必做練習（約 20 分鐘）**：A1、B2、B4、C2（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[波動率曲面編輯器](https://hongyan1215.github.io/natenberg-course/tools/vol-surface/)，在「標的移動」面板切換 sticky strike 和 sticky delta，看有效 delta 差多少。

---

## 本章定位

[第 24 章](../lessons/ch24_volatility_skews.md)介紹了偏斜的形狀、三種動態假設（sticky strike、浮動偏斜、以標準差衡量的 sticky delta），並用一個例子算出調整 delta。本章把這些變成**可操作的避險規則**：同一張曲面、同一個部位，不同的動態假設會給出差異 30%–50% 的避險股數；風險報表上的 delta、gamma、theta 也都有「影子版本」（shadow greeks）。最後，我們用 [P2](p02_higher_order_greeks.md) 的 vanna 與 volga，說明交易員怎麼只用 ATM、風險逆轉、蝶式三個報價，就替翼部選擇權定價（vanna-volga 直覺）。

前置：[第 9 章](../lessons/ch09_risk_measurement_2.md)（vanna、volga）、[第 20 章](../lessons/ch20_volatility_revisited.md)（期限結構）、[第 23 章](../lessons/ch23_models_real_world.md)（波動率與價格的關係）、[第 24 章](../lessons/ch24_volatility_skews.md)、[P2](p02_higher_order_greeks.md)。

## 學習目標

1. 能寫出 sticky strike、sticky moneyness、sticky delta（以及作為對照的 local vol／sticky implied tree）下「固定履約價隱含波動率對現貨的導數」$\partial\sigma_K/\partial S$。
2. 能用 $\Delta_{\text{eff}}=\Delta_{\text{BS}}+\mathcal V\cdot\partial\sigma_K/\partial S$ 計算各制度下的有效（skew-adjusted）delta，並換算成避險股數。
3. 能計算現貨移動後各制度下的新 ATM 波動率與部位損益差異。
4. 能解釋 shadow delta、shadow gamma、shadow theta（roll-down）的意義並給出數值例。
5. 能用觀察到的 spot-vol beta 判斷市場較接近哪一種制度，並比較股指與商品的典型差異。
6. 能用「翼部價格 = 平坦波動率價格 + vanna 成本 + volga 成本」的直覺，解釋為什麼 OTM put 在股指市場較貴，以及 vanna-volga 怎麼由三個報價延伸出整條微笑。

## 核心概念

### 3.1 為什麼「曲面怎麼動」決定你的 delta

> 💡 **一句話**：現貨一動，履約價的波動率也會動，所以有效 delta = BS delta + vega × 波動率對現貨的變化。

BS 的 delta 是「其他輸入不變、現貨動一點」的價值變化。但現實中現貨一動，你在曲面上讀到的那個履約價的隱含波動率也會動。全微分：

$$
\frac{dV}{dS}=\underbrace{\frac{\partial V}{\partial S}}_{\Delta_{\text{BS}}}+\underbrace{\frac{\partial V}{\partial\sigma}}_{\mathcal V}\cdot\frac{\partial\sigma_K}{\partial S}
$$

所以**有效 delta（effective / skew-adjusted delta）**：

$$
\Delta_{\text{eff}}=\Delta_{\text{BS}}+\mathcal V\cdot\frac{\partial\sigma_K}{\partial S}
$$

第一項人人都會算；第二項取決於一個**假設**：現貨移動時，固定履約價 $K$ 的隱含波動率 $\sigma_K$ 會怎麼變？這個假設就是「曲面動態制度」（skew regime）。

### 3.2 四種制度

> 💡 **一句話**：Sticky strike 釘住履約價、sticky moneyness 跟著現貨平移、local vol 移動更多；向下偏斜時 delta 排序 LV < SS < SM。

為了比較，假設今天的偏斜（$S_0=100$、3 個月、$r=q=0$，遠期 = 現貨）是對數價性（log-moneyness）的線性函數：

$$
\sigma(K)=0.20+\beta\ln(K/S_0),\qquad \beta=-0.30
$$

也就是每 1% 價性約 0.3 個 vol 點，低履約價較高。各履約價：80 → 26.69%、90 → 23.16%、95 → 21.54%、100 → 20.00%、105 → 18.54%、110 → 17.14%、120 → 14.53%。

| 制度 | 現貨變成 $S$ 時，履約價 $K$ 的波動率 | $\partial\sigma_K/\partial S$（在 $S_0$） | 新 ATM 波動率 |
|---|---|---|---|
| **Sticky strike**（黏著履約價） | $0.20+\beta\ln(K/S_0)$（不變） | $0$ | 沿著舊偏斜移動：$0.20+\beta\ln(S/S_0)$ |
| **Sticky moneyness**（黏著價性） | $0.20+\beta\ln(K/S)$ | $-\beta/S=+0.003$（每元 +0.3 點） | 不變（20%） |
| **Sticky delta**（黏著 delta） | $0.20+b\,x$，$x=\frac{\ln(K/F)}{\sigma_{\text{ATM}}\sqrt\tau}$ | ATM 波動率與期限不變時 = sticky moneyness | 不變 |
| **Local vol／sticky implied tree**（對照） | 約 $0.20+\beta\ln(K/S_0)+\beta\ln(S/S_0)$ | $+\beta/S=-0.003$（每元 −0.3 點） | 移動兩倍：$0.20+2\beta\ln(S/S_0)$ |

說明：

- **Sticky strike**：每個履約價的波動率釘死。現貨下跌時，新的 ATM 是較低的履約價，而那裡本來就比較貴 → ATM 波動率上升。
- **Sticky moneyness**：整條偏斜跟著現貨平移，「價平永遠是 20%」。固定履約價的 put 在現貨上漲時變得更價外 → 爬上偏斜 → 波動率上升。
- **Sticky delta**：偏斜以「標準差」為座標黏住。在期限與 ATM 波動率不變時，它和 sticky moneyness 給出同樣的 $\partial\sigma_K/\partial S$；兩者的差異見 3.4。
- **Local vol（局部波動率模型）**：若市場確實由一個「波動率是現貨與時間函數」的過程驅動，短天期的經驗法則是：固定履約價波動率的移動約等於偏斜斜率（方向與偏斜相同），ATM 波動率移動約為偏斜斜率的兩倍。這不是一種市場慣例，而是一個模型的推論；放在這裡當作「比 sticky strike 更悲觀」的那一端。

> **口訣**：對向下傾斜的偏斜（$\beta<0$）而言，
> $\Delta_{\text{local vol}}<\Delta_{\text{sticky strike}}<\Delta_{\text{sticky moneyness}}$（對 call 和 put 都成立；put 的 delta 是負的，「小」代表更負）。

### 3.3 數值例：同一曲面，三種避險比率

> 💡 **一句話**：同一張曲面，1,000 口 90 put 的避險量可以是 129、167 或 204 股；選錯制度等於帶了方向性部位。

各選擇權的 BS delta 用自己的波動率計算；vega 為每 1 vol 點。有效 delta 用 $\Delta_{\text{BS}}+\mathcal V\times(\pm0.3)$（因為 $\partial\sigma/\partial S=\pm0.3$ 點／元），並以「現貨 ±0.5、按制度重新標記曲面、全重算」的中央差分驗證（兩者差異 ≤ 0.0002）。

| 選擇權 | 波動率 | 價格 | BS delta | Vega（每點） | Sticky strike | Sticky moneyness | Local vol |
|---|---|---|---|---|---|---|---|
| 90 put | 23.16% | 1.083 | −0.1666 | 0.1249 | −0.1666 | −0.1291 | −0.2041 |
| 95 put | 21.54% | 2.153 | −0.2980 | 0.1733 | −0.2980 | −0.2460 | −0.3500 |
| 100 call | 20.00% | 3.988 | +0.5199 | 0.1992 | +0.5199 | +0.5797 | +0.4602 |
| 105 call | 18.54% | 1.801 | +0.3156 | 0.1778 | +0.3156 | +0.3689 | +0.2623 |
| 110 call | 17.14% | 0.602 | +0.1425 | 0.1126 | +0.1425 | +0.1763 | +0.1088 |

> **例：保護性 put 部位的避險**。你持有 1,000 口 90 put（每口 1 單位標的），想 delta 中立：
> - Sticky strike：買 167 股；
> - Sticky moneyness：買 129 股；
> - Local vol：買 204 股。
>
> 最大與最小差 75 股，是 sticky strike 避險量的 45%。**選錯制度不是小誤差，而是方向性部位。**

**為什麼 sticky moneyness 下 put 的 delta 比較「小」？** 現貨上漲時 90 put 虧錢（BS delta），但它變得更價外、在 sticky moneyness 下爬上偏斜，隱含波動率上升，vega 收益抵銷一部分虧損。反之在 local vol 下，現貨上漲時固定履約價波動率下降，vega 也在虧損，兩者疊加。

#### 現貨跌 5% 後：ATM 波動率與損益

現貨瞬間從 100 跌到 95（不計時間經過）：

| 制度 | 新 ATM（95）波動率 | 100 履約價的波動率 | 100 跨式損益 | 95 put 損益 |
|---|---|---|---|---|
| Sticky strike | 21.54% | 20.00% | +0.80 | +1.93 |
| Sticky moneyness | 20.00% | 18.46% | +0.28 | +1.64 |
| Local vol | 23.08% | 21.54% | +1.33 | +2.22 |

同一個「多頭 100 跨式」，在 sticky moneyness 下只賺 0.28，在 local vol 下賺 1.33——差了將近 5 倍。差異完全來自 100 履約價波動率的變動（−1.54 點 vs +1.54 點）乘上跨式 vega（約 0.40）。

> **交易員會怎麼說**：「我的跨式 BS delta 幾乎是零，但在 sticky moneyness 下有效 delta 是 +0.16、在 local vol 下是 −0.08。我在指數上通常不用 sticky moneyness 的數字，因為下跌時 ATM vol 一般是漲的。」（跨式有效 delta：$0.040+0.398\times(\pm0.30)$。）

### 3.4 Sticky delta 和 sticky moneyness 什麼時候不同？

> 💡 **一句話**：價平波動率改變或時間經過時，sticky delta 和 sticky moneyness 就會分開。（可先跳過）

兩者都說「偏斜跟著現貨走」，差在座標：

$$
\text{sticky moneyness: } \sigma=f\!\left(\ln\frac{K}{F}\right),\qquad
\text{sticky delta: } \sigma=g\!\left(\frac{\ln(K/F)}{\sigma_{\text{ATM}}\sqrt\tau}\right)
$$

只要 $\sigma_{\text{ATM}}$ 或 $\tau$ 改變，兩者就分開。

**例 1：ATM 波動率從 20% 升到 25%**（現貨不動，3 個月，90 履約價）。今天兩種寫法一致：sticky delta 用每標準差 −3 點（$b=\beta\cdot0.20\sqrt{0.25}=-0.03$），90 履約價在 $x=\ln(0.9)/0.10=-1.054$，波動率 $20+3.16=23.16\%$。

- Sticky moneyness：整條上移 5 點 → 90 履約價 **28.16%**。
- Sticky delta：$x=\ln(0.9)/(0.25\times0.5)=-0.843$，波動率 $25+0.03\times84.3=$ **27.53%**。

波動率上升時，同一履約價「在標準差上更接近價平」，sticky delta 給出較小的偏斜溢價（以點數計）。

**例 2：時間經過（roll-down）**。偏斜以標準差黏住：$\sigma=20\%-2\text{ 點}\times x$。3 個月 90 put：$x=-1.054$，波動率 22.11%。10 天後 $\tau=0.2226$，$x=\ln(0.9)/(0.2\sqrt{0.2226})=-1.117$，波動率升到 22.23%。

- 固定波動率下 10 天的時間耗損：−0.1456；
- 在 sticky delta 下（波動率 +0.13 點，vega 約 0.12）：−0.1320。

同一個履約價隨時間經過「在標準差上變得更價外」，會沿著偏斜往上爬，抵銷約 9% 的 theta。這就是下一節 shadow theta 的一種。

### 3.5 Shadow Greeks

> 💡 **一句話**：Shadow Greeks 是「讓曲面照假設一起動」算出的敏感度；期限結構向上時 shadow theta 可比 BS 多三成。

**定義**：shadow greek 是「讓曲面按照你假設的動態一起移動」所算出的敏感度，相對於 BS 的「其他輸入全部固定」。實作上就是：bump 一個輸入 → 依制度重新標記整張曲面 → 全重算 → 差分。

| 名稱 | 計算方式 | 和 BS 版本的關係 |
|---|---|---|
| Shadow delta | bump 現貨，曲面按制度移動 | 即有效 delta：$\Delta+\mathcal V\,\partial\sigma_K/\partial S$ |
| Shadow gamma | 對 shadow delta 再 bump 現貨 | $\Gamma+2\,\text{Vanna}\cdot\partial\sigma_K/\partial S+\text{Volga}\,(\partial\sigma_K/\partial S)^2+\mathcal V\,\partial^2\sigma_K/\partial S^2$ |
| Shadow theta | 時間經過，曲面按期限結構與偏斜座標 roll | $\Theta+\mathcal V\cdot d\sigma_K/dt$ |
| Shadow vega | 曲面按某種「典型形狀」移動（例如短天期動得多、長天期動得少；或比例移動） | 第 20 章的「調整後 vega」就是一種 |

**Shadow gamma 數值例**（同 3.3 的曲面，用現貨 ±0.5 的二階差分）：

| 選擇權 | BS gamma | Sticky strike | Sticky moneyness | Local vol |
|---|---|---|---|---|
| 95 put | 0.0322 | 0.0322 | 0.0278 | 0.0369 |
| 100 call | 0.0398 | 0.0398 | 0.0398 | 0.0398 |

95 put 的 vanna 是負的；sticky moneyness 下 $\partial\sigma/\partial S>0$，交叉項 $2\,\text{Vanna}\cdot\partial\sigma/\partial S<0$ → shadow gamma 較低；local vol 相反。ATM 的 vanna ≈ 0，三者幾乎相同。**含義**：同一本「多頭 OTM put」的書，你以為的 gamma 可能高估或低估 15%，取決於曲面怎麼動。

**Shadow theta 數值例（期限結構 roll-down）**：ATM 期限結構向上傾斜，30 天 18%、91 天 20%，中間線性（每天約 $2/61=0.033$ 點）。3 個月 ATM call（$S=K=100$）：

- BS theta（波動率固定 20%）：−0.0218／日；
- 一天後它變成 90 天期，讀到的波動率低 0.033 點，vega 0.199 → 額外 −0.0065；
- Shadow theta ≈ **−0.0284／日**（直接重算為 −0.0284），比 BS theta 大 30%。

> **交易員會怎麼說**：「期限結構向上時，多頭近月 vega 不只付 theta，還每天『滑下』期限結構——我的 shadow theta 比系統顯示的多三成。」

### 3.6 Spot–vol 相關：股指 vs 商品

> 💡 **一句話**：用 spot-vol beta ÷ 偏斜斜率判斷制度；股指通常有效 delta 小於 BS，call 側偏斜的商品則相反。

**Spot-vol beta**：觀察 ATM 隱含波動率對現貨百分比變動的反應：

$$
\delta\sigma_{\text{ATM}}\approx\beta_{sv}\cdot\frac{\delta S}{S}\qquad(\text{vol points per 1\%})
$$

在 3.2 的曲面下（每 1% 價性 0.3 點）：

| 制度 | 現貨 +1% 時 ATM 波動率變化 | $\beta_{sv}$ |
|---|---|---|
| Sticky moneyness／sticky delta | 0 | 0 |
| Sticky strike | 約 −0.30 點 | −0.30 |
| Local vol | 約 −0.60 點 | −0.60 |

所以**觀察 $\beta_{sv}$ 與偏斜斜率的比值，就能判斷市場這段時間「像哪一個制度」**：比值接近 0 → sticky moneyness；接近 1 → sticky strike；接近 2 → local vol 類。實務上沒有一個制度永遠成立；同一個市場在平靜上漲與急跌時常常表現不同，因此很多 desk 會用一個介於兩者之間、可調的參數（例如「固定履約價波動率移動 = 偏斜斜率 × $\lambda$」）並定期用資料重估。

**股價指數**：業界普遍觀察到現貨與隱含波動率負相關（下跌時波動率上升），偏斜向下傾斜（put 側較貴）。這種組合下：

- 有效 delta 通常**小於** BS delta（call 少、put 更負）——若市場接近 sticky strike 或更極端；
- 「delta 中立」的多頭 ATM 跨式實際上帶負 delta（第 24 章已有例子）；
- 多頭風險逆轉（買 call 賣 put）在急跌中同時被 vanna 與偏斜變陡打擊（P2 例 5）。

**商品**：依商品與時期而異。農產品、天然氣等在供給衝擊（天氣、庫存）時常見價格上漲伴隨波動率上升，偏斜可能偏向 call 側；原油、金屬等的關係則會隨市況改變，甚至翻號。對一個 call 側偏斜、正 spot-vol 相關的市場，有效 delta 通常**大於** BS delta。

> **例：call 側偏斜**。某商品 $S=100$、2 個月，$\sigma(K)=0.30+0.25\ln(K/100)$（高履約價較貴）。110 call：波動率 32.38%、BS delta 0.2563、vega 每點 0.1314。
> - Sticky strike：0.2563；
> - Sticky moneyness（$\partial\sigma/\partial S=-0.25$ 點／元）：$0.2563-0.1314\times0.25=0.2234$；
> - Local vol 類（$+0.25$ 點／元）：$0.2563+0.0329=0.2891$。
>
> 若市場「漲時波動率也漲」，你持有的 110 call 實際 delta 接近 0.29，而不是 0.26。

### 3.7 Vanna-volga：用三個報價定出翼部

> 💡 **一句話**：只用價平、風險逆轉、蝶式三個報價，就能用 vanna 成本 + volga 成本推出翼部價格。

**問題**：你只有三個流動報價：ATM 波動率、25Δ 風險逆轉（RR）、25Δ 蝶式（BF）。客戶問你 10Δ put 的價格。

**直覺**（承接 [P2](p02_higher_order_greeks.md) 2.4 節）：在平坦的 ATM 波動率下算出的 BS 價格，忽略了兩種市場真實會收費的風險：

- **Vanna**：現貨與波動率一起動的風險。市場透過 RR 的價格告訴你它對 vanna 收多少錢；
- **Volga**：波動率本身的波動。市場透過 BF 的價格告訴你它對 volga 收多少錢。

所以：

$$
V_{\text{mkt}}(K)\approx V_{\text{BS}}(K;\sigma_{\text{ATM}})+\frac{\text{Vanna}_K}{\text{Vanna}_{RR}}\,C_{RR}+\frac{\text{Volga}_K}{\text{Volga}_{BF}}\,C_{BF}
$$

其中 $C_{RR}$、$C_{BF}$ 是 RR、BF 的「市場價 − 平坦 ATM 波動率價」，各 Greek 都在 $\sigma_{\text{ATM}}$ 下計算。完整的 vanna-volga 方法是用 ATM、25Δ put、25Δ call 三個選擇權去同時匹配目標的 vega、vanna、volga，再把三者的市場溢價按權重加總；上式是它的兩項近似。

**數值例**：$S=100$、3 個月、$r=q=0$；ATM 20%；25Δ put 23.0%、25Δ call 18.5%（RR = call − put = −4.5 點，BF = 平均 − ATM = +0.75 點）。對應履約價：25Δ put 93.15、ATM（delta 中性跨式）100.50、25Δ call 106.89。

- 25Δ put 的市場溢價（市場價 − 20% 價）：+0.463；25Δ call：−0.243。
- RR（買 call 賣 put）的成本 $C_{RR}=-0.243-0.463=-0.706$；BF（買兩翼、賣 vega 中性的 ATM）的成本 $C_{BF}=-0.243+0.463=+0.220$。

| 履約價 | 20% 平坦價 | Vanna 成本 | Volga 成本 | 兩項近似合計 | 三工具精確修正 | Vanna-volga 隱含波動率 |
|---|---|---|---|---|---|---|
| 80 put | 0.040 | +0.105 | +0.110 | +0.215 | +0.201 | 26.86% |
| 90 put | 0.712 | +0.355 | +0.179 | +0.534 | +0.539 | 24.49% |
| 110 call | 0.954 | −0.434 | +0.179 | −0.254 | −0.244 | 18.07% |
| 120 call | 0.147 | −0.253 | +0.205 | −0.048 | −0.071 | 17.94% |

完整三工具法給出的整條微笑：80 → 26.86%、85 → 26.29%、90 → 24.49%、95 → 22.13%、100 → 20.16%、105 → 18.85%、110 → 18.07%、115 → 17.73%、120 → 17.94%。

怎麼讀：

- **Put 側**：vanna 成本與 volga 成本**同號**（都是正的）→ OTM put 比平坦價貴很多。90 put 的價格比 20% 平坦價高 76%。
- **Call 側**：vanna 成本為負（市場的 RR 告訴你 call 側的 vanna 便宜），volga 成本為正，兩者**互相抵銷**。越往翼部，volga 佔比越大 → 120 call 的隱含波動率反而比 115 高，微笑在 call 側翹起來。
- 這解釋了一個常見現象：只用 RR 與 BF 兩個參數，就能生成一條「put 側陡、call 側先降後微翹」的股指型微笑。

> **交易員會怎麼說**：「10Δ put 比 ATM 貴，一半是 vanna——市場在 RR 上告訴我它討厭下跌時 vol 上升；另一半是 volga——蝶式告訴我 vol of vol 要收錢。」

**限制**：vanna-volga 是插值／外插的經驗法，對極遠的翼部或長天期可能給出不合理的值（甚至違反無套利，見 [P5](p05_surface_no_arbitrage.md)），實務上會搭配參數化曲面與無套利檢查。

## 交易員視角

- **避險制度是一個要寫進程式的參數**：你的避險 bot 的 delta 若用 BS（sticky strike），就等於押注「固定履約價的波動率不會隨現貨動」。在 Optibook 這類模擬盤，你可以用自己的成交記錄估計 $\beta_{sv}$，再決定 $\partial\sigma_K/\partial S$ 用多少。
- **報價曲面在現貨跳動時怎麼更新**：做市時，標的一跳，你的整張報價都要動。sticky strike 下只需要用新現貨重算各履約價價格（波動率不變）；sticky moneyness 下要先把曲面平移再算。兩者在大跳動時差異可觀，選錯了會被別人挑掉陳舊報價（見 P10、P8）。
- **教練常問**：「你的書在 sticky strike 下 delta 中立，在 sticky delta 下呢？」回答格式：報出兩個數字、說明差異來自哪幾個履約價（vega 大、離 ATM 遠的那些）、你採用哪一個、為什麼。
- **風險報表上的 shadow 數字**：很多系統提供「BS greeks」與「shadow / skew-adjusted greeks」兩欄。兩欄差異大時，代表你的部位對曲面動態假設很敏感——這本身就是一個風險，需要限額。
- **Vanna-volga 的用處**：在缺乏翼部報價的市場（或模擬賽中只有少數履約價有流動性），可以用 ATM、RR、BF 推出其他履約價的合理波動率，作為初始報價的起點。

## 常見誤區

1. **誤解**：「delta 就是 delta，只有一個正確答案。」→ **正解**：delta 依賴曲面動態假設；同一部位在不同制度下的避險量可以差 40% 以上。
2. **誤解**：「sticky delta 和 sticky moneyness 是同一件事。」→ **正解**：只有在 ATM 波動率與期限都不變時才一致；波動率改變或時間經過時兩者分開（3.4）。
3. **誤解**：「股指下跌時 ATM 波動率上升，所以市場是 sticky strike。」→ **正解**：sticky strike 只是其中一種會讓 ATM 波動率上升的制度；local vol 類會讓它上升兩倍。要用 $\beta_{sv}$ 與偏斜斜率的比值判斷。
4. **誤解**：「shadow theta 就是 theta。」→ **正解**：期限結構傾斜或偏斜以標準差黏住時，時間經過會讓你讀到的波動率改變，額外的價值變化可達 theta 的 10%–30%。
5. **誤解**：「OTM put 貴只是因為大家怕跌。」→ **正解**：用 vanna-volga 語言，put 側同時承擔 vanna 成本（RR）與 volga 成本（BF），兩者同號疊加；call 側則互相抵銷。
6. **誤解**：「商品市場的偏斜動態和股指一樣。」→ **正解**：很多商品偏斜方向與 spot-vol 相關性都可能相反，且隨季節與庫存變化；有效 delta 的修正方向也可能相反。

## 重點摘要

| 項目 | 規則／數字 |
|---|---|
| 有效 delta | $\Delta_{\text{eff}}=\Delta_{\text{BS}}+\mathcal V\cdot\partial\sigma_K/\partial S$ |
| Sticky strike | $\partial\sigma_K/\partial S=0$；ATM 沿舊偏斜移動 |
| Sticky moneyness | $\partial\sigma_K/\partial S=-$（偏斜斜率）；ATM 不變 |
| Sticky delta | 以 $\ln(K/F)/(\sigma_{\text{ATM}}\sqrt\tau)$ 為座標；ATM 波動率或期限改變時與 sticky moneyness 不同 |
| Local vol（對照） | 固定履約價移動 ≈ 偏斜斜率；ATM 移動 ≈ 2 × 斜率 |
| 向下偏斜的排序 | $\Delta_{LV}<\Delta_{SS}<\Delta_{SM}$ |
| 制度判斷 | $\beta_{sv}$／偏斜斜率 ≈ 0、1、2 → SM、SS、LV |
| Shadow theta | $\Theta+\mathcal V\cdot d\sigma_K/dt$（期限結構 roll、偏斜 roll） |
| Shadow gamma | 多了 $2\,\text{Vanna}\cdot\partial\sigma/\partial S$ 等項 |
| Vanna-volga | 翼部價 ≈ 平坦價 + (vanna 比) × RR 成本 + (volga 比) × BF 成本 |
| 股指 | 負 spot-vol 相關、put 側偏斜；有效 delta 常小於 BS |
| 商品 | 依品種／時期；call 側偏斜 + 正相關時有效 delta 大於 BS |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B2、B4、C2）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ 用一句話解釋：為什麼在向下傾斜的偏斜下，sticky moneyness 的 put delta 比 sticky strike 的「不那麼負」？

<details><summary>提示</summary>

想想現貨上漲時，固定履約價的 put 在跟著平移的偏斜上會往哪裡移：波動率變高還是變低？這對 put 的價值是加分還是扣分？

</details>

<details><summary>解答</summary>

現貨上漲時固定履約價的 put 變得更價外，在跟著現貨平移的偏斜上爬到較高的波動率，vega 收益抵銷了一部分 BS delta 造成的虧損，所以對現貨的淨敏感度較小。

</details>

**A2.** 某天股指跌 2%，你觀察到 ATM 波動率幾乎沒變。這比較接近哪一種制度？此時用 BS（sticky strike）delta 避險的多頭 OTM put 部位會怎樣？

<details><summary>解答</summary>

ATM 不變 → 接近 **sticky moneyness／sticky delta**。此時固定履約價的 put 隨現貨下跌、變得較接近價平，其波動率**下降**（從偏斜高處滑下）。用 sticky strike delta 避險等於高估了 put 的負 delta 量級（實際有效 delta 較小）——你買了過多的現貨避險，下跌時 put 賺得比預期少，現貨避險虧損卻照算，淨效果是虧損。

</details>

**A3.** 解釋 shadow gamma 中 $2\,\text{Vanna}\cdot\partial\sigma_K/\partial S$ 這一項的來源，並說明它對 ATM 選擇權為什麼很小。

<details><summary>解答</summary>

Shadow delta $=\Delta+\mathcal V\,\sigma'(S)$。再對 $S$ 全微分：$\Gamma+\text{Vanna}\,\sigma'$（delta 隨波動率改變）$+\text{Vanna}\,\sigma'$（vega 隨現貨改變，vanna 也是 $\partial\mathcal V/\partial S$）$+\text{Volga}\,\sigma'^2+\mathcal V\,\sigma''$。兩個 vanna 項合併成 $2\,\text{Vanna}\,\sigma'$。ATM 選擇權的 vanna 接近 0，所以這項很小，shadow gamma 幾乎等於 BS gamma。

</details>

**A4.** 為什麼期限結構向上傾斜時，多頭近月選擇權的 shadow theta 比 BS theta 更負？

<details><summary>解答</summary>

時間經過，選擇權的剩餘期限縮短，若曲面以「剩餘期限」為座標黏住（期限結構形狀不變），它會讀到更短期限、也就是更低的波動率，價值因 vega 而額外下降。

</details>

**A5.** Vanna-volga 法中，為什麼 put 側的修正比 call 側大？用 vanna 與 volga 成本的正負號回答（股指型市場：RR 為負、BF 為正）。

<details><summary>解答</summary>

低履約價的 vanna 為負；RR（買 call 賣 put）成本為負，所以 put 的 vanna 成本 =（負比率）×（負成本）= **正**。volga 兩翼都為正、BF 成本為正，所以 volga 成本 **正**。put 側兩者同號相加。call 側 vanna 為正 → vanna 成本為負，與正的 volga 成本互相抵銷。

</details>

**A6.** 商品市場有 call 側偏斜，且價格上漲時隱含波動率常上升。你持有 OTM call 並用 BS delta 避險。在價格急漲的一天，你的避險是不足還是過度？

<details><summary>解答</summary>

固定履約價的 call 波動率隨現貨上升而上升（$\partial\sigma_K/\partial S>0$），有效 delta 大於 BS delta。你持有 call、以 BS delta 賣出現貨，賣得**不夠多**——避險不足，急漲時你會比預期賺更多（反向急跌時虧更多）。若你是 call 的賣方，則是在急漲中虧得比預期多。

</details>

### B. 計算題

**B1.** 偏斜 $\sigma(K)=0.20-0.30\ln(K/100)$。求 92 與 108 履約價的波動率（%，兩位小數）。

<details><summary>解答</summary>

$\ln(0.92)=-0.08338$ → $20+0.30\times8.338=$ **22.50%**。$\ln(1.08)=0.07696$ → $20-2.309=$ **17.69%**。

</details>

**B2.** ⭐ 線性偏斜 $\sigma(K)=20\%-0.25\text{ 點}\times(K-S)$。某 put 的 BS delta −0.30、vega 每點 0.17。求 sticky moneyness 與 local vol 類（固定履約價波動率移動 = 偏斜斜率）下的有效 delta。

<details><summary>提示</summary>

先判斷每種制度下「現貨漲 1 元，這個履約價的波動率變多少點」（正或負 0.25），再套 有效 delta = BS delta + vega × 這個變化。

</details>

<details><summary>解答</summary>

Sticky moneyness：$\sigma_K$ 依 $K-S$ → $\partial\sigma_K/\partial S=+0.25$ 點／元 → $-0.30+0.17\times0.25=$ **−0.2575**。
Local vol 類：$\partial\sigma_K/\partial S=$ 偏斜斜率 $=-0.25$ 點／元 → $-0.30-0.0425=$ **−0.3425**。

</details>

**B3.** 用 3.3 節的表：你賣出 400 口 105 call、買進 600 口 95 put。求部位在三種制度下的有效 delta（股數，取整數）。

<details><summary>解答</summary>

Sticky strike：$-400\times0.3156+600\times(-0.2980)=-126.2-178.8=$ **−305**。
Sticky moneyness：$-400\times0.3689+600\times(-0.2460)=-147.6-147.6=$ **−295**。
Local vol：$-400\times0.2623+600\times(-0.3500)=-104.9-210.0=$ **−315**。
（這個部位兩腿的修正方向相反、部分抵銷，所以三個數字差不多；若改成買 call 賣 put，差異會疊加。）

</details>

**B4.** ⭐ 3.2 節的曲面（$\beta=-0.30$）。現貨從 100 跌到 96，三種制度下新的 ATM 波動率各是多少？

<details><summary>提示</summary>

先算 ln(96/100)。Sticky strike：新價平 = 沿舊偏斜讀 96 的波動率；sticky moneyness：價平不變；local vol：移動是 sticky strike 的兩倍。

</details>

<details><summary>解答</summary>

$\ln(0.96)=-0.04082$。Sticky strike：$20-30\times(-0.04082)=$ **21.22%**；sticky moneyness：**20.00%**；local vol：$20-60\times(-0.04082)=$ **22.45%**。

</details>

**B5.** 某股指的偏斜斜率約為每 1% 價性 −0.35 個 vol 點。過去一個月的資料顯示：指數每跌 1%，ATM 波動率平均上升 0.42 點。這段期間的市場比較接近哪一種制度？若要用單一參數 $\lambda$ 描述「固定履約價波動率移動 = $\lambda$ × 偏斜斜率」，$\lambda$ 約多少？

<details><summary>解答</summary>

$\beta_{sv}=-0.42$（每 +1%），比值 $0.42/0.35=1.2$ → 介於 sticky strike（1）與 local vol（2）之間，較接近 **sticky strike**。ATM 波動率移動 = 沿偏斜的移動（1 × 斜率）+ 固定履約價本身的移動（$\lambda$ × 斜率），所以 $1+\lambda=1.2$ → $\lambda\approx$ **0.2**。

</details>

**B6.** 期限結構：30 天 ATM 18%、91 天 ATM 20%，之間線性。3 個月 ATM call（$S=K=100$、$r=q=0$）的 BS theta −0.0218／日、vega 每點 0.199。求 shadow theta。

<details><summary>解答</summary>

斜率 $2/61=0.0328$ 點／日。額外耗損 $-0.199\times0.0328=-0.0065$。Shadow theta $=-0.0218-0.0065=$ **−0.0284／日**（直接重算一天後 90 天期、19.967% 的價格變化為 −0.0284）。

</details>

**B7.** 用 3.7 節的數字：90 put 的 vanna 是 RR vanna 的 −0.502 倍，volga 是 BF volga 的 0.813 倍；$C_{RR}=-0.706$、$C_{BF}=+0.220$；20% 平坦價 0.712。用兩項近似求 90 put 的價格。

<details><summary>解答</summary>

Vanna 成本 $=(-0.502)\times(-0.706)=+0.354$；volga 成本 $=0.813\times0.220=+0.179$。價格 $\approx0.712+0.354+0.179=$ **1.245**（三工具精確法 1.252，對應隱含波動率約 24.5%）。

</details>

**B8.** 3 個月 ATM 跨式（K=100、$S=100$、20%）：BS delta +0.040、vega 每點 0.398。在 3.2 節曲面下，求 sticky moneyness 與 local vol 的有效 delta。若你持有 500 組並以 BS delta 避險，在 local vol 下你實際的 delta 是多少？

<details><summary>解答</summary>

Sticky moneyness：$0.040+0.398\times0.30=$ **+0.159**；local vol：$0.040-0.119=$ **−0.080**。
以 BS 避險後每組 delta 0；local vol 下實際為 $-0.080-0.040=-0.120$，500 組 → **約 −60**。

</details>

**B9.** ATM 波動率從 20% 升到 25%（3 個月、現貨 100 不變）。今天 90 履約價是 23.16%（每標準差 −3 點；或每 1 單位對數價性 −0.30）。求 sticky moneyness 與 sticky delta 下的新 90 波動率。

<details><summary>解答</summary>

Sticky moneyness：$25-30\times\ln(0.9)=25+3.16=$ **28.16%**。Sticky delta：$x=\ln(0.9)/(0.25\times0.5)=-0.843$；$25+3\times0.843=$ **27.53%**。

</details>

### C. 情境題

**C1.**（教練拍肩）「你的書在系統上 delta 中立（BS）。主要部位是賣出大量 90 put、買進一些 110 call。指數現在急跌，你覺得你的真實 delta 是正還是負？」

<details><summary>解答</summary>

示範口述：「賣 90 put、買 110 call 是多頭風險逆轉。股指急跌時通常 ATM vol 上升、固定履約價 vol 也上升（比 sticky strike 更像 local vol），$\partial\sigma_K/\partial S<0$。有效 delta = BS delta + vega × 負數。我是空 put 的 vega（負 vega）、多 call 的 vega（正 vega），put 腿 vega 較大，部位淨 vega 為負 → 修正項 = 負 vega × 負斜率 = **正** → 我的真實 delta 是**正的**，下跌時虧得比系統說的多。我會多賣一些期貨，並檢查 vanna 限額。」

</details>

**C2.** ⭐ （盤中決策）你在 Optibook 上對一個選擇權系列做市。標的突然從 100 跳到 102。你有兩個選擇：(a) 每個履約價保持原波動率，只用新現貨重算價格；(b) 把整條偏斜右移 2 再重算。你的近期成交資料顯示 $\beta_{sv}$ 約等於偏斜斜率。你選哪一個？為什麼？

<details><summary>提示</summary>

先用 spot-vol beta ÷ 偏斜斜率判斷市場像哪個制度（≈ 1 是什麼？）。再想如果選錯，OTM put 和 OTM call 會報太高還是太低、誰會來挑你的報價。

</details>

<details><summary>解答</summary>

$\beta_{sv}/$斜率 ≈ 1 → 市場近似 **sticky strike**，選 (a)。若改用 (b)（sticky moneyness），你會把 OTM put 的波動率報得太高（它們在平移後的偏斜上爬得更高）、OTM call 報得太低，別人會賣 put 給你、從你這裡買 call——逆向選擇。

</details>

**C3.**（客戶詢價）客戶要 3 個月 10Δ put 的雙邊報價。你只有 ATM 20%、25Δ RR −4.5、25Δ BF +0.75 的市場報價。說明你怎麼決定 mid，以及報價寬度要不要比 25Δ 寬。

<details><summary>解答</summary>

示範口述：「我用 vanna-volga：先用 20% 算平坦價，再加 vanna 成本（RR 為負，10Δ put 的 vanna 為負 → 正修正）和 volga 成本（BF 為正 → 正修正）。這會給一個明顯高於 ATM 的波動率（大約在 26%–27% 附近，依確切履約價）。寬度要比 25Δ 寬：外插誤差大、volga 大（vol of vol 風險）、對沖它需要 RR 和 BF 兩種工具，各自都有價差，而且翼部的成交資訊稀少、逆向選擇風險高。」

</details>

**C4.**（風控對話）風控問：「你的 BS delta 和 shadow delta 差了 300，為什麼？哪一個是真的？」

<details><summary>解答</summary>

示範口述：「差異來自遠離 ATM、vega 大的部位，主要是我的 85–90 put。BS delta 假設固定履約價 vol 不動；shadow delta 用我們的曲面動態參數（目前估計 $\lambda\approx0.2$，介於 sticky strike 和 local vol）。兩者都不是『真的』，是兩個假設。我用 shadow delta 避險，因為最近的資料支持它；但我會把差額 300 當作模型風險，保持在限額內，並在急跌情境下用兩種假設各跑一次壓力測試。」

</details>

### D. 挑戰題

**D1.** 假設局部波動率是現貨的線性函數 $\sigma_{\text{loc}}(x)=a+c\,(x-S_0)$，並採用短天期近似「隱含波動率 ≈ 從現貨到履約價之間局部波動率的平均」：$\sigma_{\text{imp}}(K;S)\approx\frac12[\sigma_{\text{loc}}(S)+\sigma_{\text{loc}}(K)]$。(a) 求今天（$S=S_0$）的偏斜斜率 $\partial\sigma_{\text{imp}}/\partial K$。(b) 求 $\partial\sigma_{\text{imp}}(K;S)/\partial S$（固定 $K$）。(c) 求 ATM 波動率 $\sigma_{\text{imp}}(S;S)$ 對 $S$ 的導數。(d) 由此說明 3.2 節「local vol：固定履約價移動 ≈ 斜率、ATM 移動 ≈ 2 × 斜率」。

<details><summary>解答</summary>

$\sigma_{\text{imp}}(K;S)\approx a+\tfrac{c}{2}(S-S_0)+\tfrac{c}{2}(K-S_0)$。
(a) $\partial\sigma_{\text{imp}}/\partial K=c/2$——隱含偏斜斜率只有局部波動率斜率的一半。
(b) $\partial\sigma_{\text{imp}}/\partial S=c/2$ = 偏斜斜率（同號）。
(c) $\sigma_{\text{imp}}(S;S)=a+c\,(S-S_0)$，導數 $=c=2\times$ 偏斜斜率。
(d) 因此在 local vol 下，現貨上漲 1 元，固定履約價的隱含波動率移動「一個偏斜斜率」，ATM 波動率移動「兩個偏斜斜率」。對向下偏斜（$c<0$），現貨下跌時 ATM 波動率上升的幅度是 sticky strike 的兩倍。

</details>

**D2.** 用 3.3 節的表，設計一個由 90 put 與 110 call 組成、**在三種制度下有效 delta 都相同**的部位（每 100 口 90 put 搭配多少口 110 call？買或賣？），並說明這個部位的特徵。

<details><summary>解答</summary>

各制度的有效 delta 差異全來自 $\mathcal V\cdot\partial\sigma/\partial S$，而三種制度的 $\partial\sigma/\partial S$ 只差一個共同的常數（0、+0.3、−0.3）。要讓有效 delta 與制度無關，需要**部位 vega 為零**：$100\times0.1249+n\times0.1126=0$ → $n=-110.9$。即**買 100 口 90 put、賣約 111 口 110 call**（或反過來全部反號）。
特徵：vega 中立的風險逆轉（空頭方向：買 put、賣 call），它對曲面平行移動不敏感，所以制度假設不影響 delta；但它對偏斜**形狀**（斜率變化）高度敏感，是一個純粹的偏斜部位，有大的 vanna（P2）。教訓：制度假設的風險 ≈ 「部位 vega × 制度不確定性」，vega 中立的書對制度假設最不敏感。

</details>

## 自我檢核清單

- [ ] 能寫出四種制度下的 $\partial\sigma_K/\partial S$ 與新的 ATM 波動率。
- [ ] 能在 1 分鐘內用 $\Delta+\mathcal V\cdot\partial\sigma/\partial S$ 算出有效 delta 並換算成避險股數。
- [ ] 能說出向下偏斜時三種 delta 的排序，並用「put 爬上／滑下偏斜」解釋。
- [ ] 能舉例說明 sticky delta 與 sticky moneyness 在 ATM 波動率改變、時間經過時的差異。
- [ ] 能說明 shadow delta、shadow gamma、shadow theta 的計算方式，並各給一個數值例。
- [ ] 能用 $\beta_{sv}$／偏斜斜率判斷市場制度。
- [ ] 能比較股指與商品的典型偏斜方向與 spot-vol 相關。
- [ ] 能用 vanna 成本 + volga 成本解釋翼部定價，並說明 put 側與 call 側的差異。

## 對應練習工具

- [波動率曲面編輯器](../tools/vol-surface.md)：切換 sticky strike／sticky moneyness，觀察現貨移動後各履約價波動率與有效 delta。
- [教練拍肩問](../tools/coach-questions.md)：「你的 shadow delta 是多少？」類口述練習。
- [模擬造市遊戲](../tools/mock-market-making.md)：標的跳動時更新報價曲面。
- Natenberg 對應章節：[第 20 章](../lessons/ch20_volatility_revisited.md)（期限結構、調整後 vega）、[第 23 章](../lessons/ch23_models_real_world.md)、[第 24 章](../lessons/ch24_volatility_skews.md)。
- Lab：[`lab11_index_and_skew`](../labs/exercises/lab11_index_and_skew.py)（`smile_vol_after_move` 可直接延伸成本章的制度比較）。
