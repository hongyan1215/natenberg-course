# P2　高階 Greeks（Higher-Order Greeks）

## 本章定位

[第 9 章](../lessons/ch09_risk_measurement_2.md)已經用文字和表格介紹過 vanna、charm、volga、speed、color、zomma 的「方向感」。培訓與 desk 上的要求更進一步：你要能**寫出公式、知道單位、在腦中估出大小**，並且在教練問「現貨跌 5%、波動率漲 3 點，你的 delta 變多少？」時，十秒內用泰勒展開給出一個靠譜的數字。本章把高階 Greeks 從「名詞」變成「工具」：解析公式（Black-Scholes，含連續股利率 $q$）、以 Python 數值差分驗證、按 delta 分桶與按期限的大小表、delta 的二階泰勒預測，以及損益歸因（PnL attribution / PnL explain）。

前置：[第 7 章](../lessons/ch07_risk_measurement_1.md)（一階 Greeks）、[第 8 章](../lessons/ch08_dynamic_hedging.md)（gamma 與 theta 的交換）、[第 9 章](../lessons/ch09_risk_measurement_2.md)（高階 Greeks 的方向）、[第 18 章](../lessons/ch18_black_scholes.md)（BS 公式）、[第 24 章](../lessons/ch24_volatility_skews.md)（偏斜，下一章 P3 會接著用）。

## 學習目標

1. 能寫出 vanna、volga、charm、speed、color、zomma、veta 的 BS 解析式（含 $q$），並說出每一個「是誰對誰的導數」與實務單位。
2. 能用中央差分在 Python 驗證任一高階 Greek，並知道步長怎麼選。
3. 能依 delta 分桶（10/25/50/75/90）與期限（1 週到 1 年）說出各高階 Greek 的正負號與數量級，並解釋「固定 delta 時，誰隨 $\tau$ 放大、誰幾乎不變」。
4. 能用 $\Delta_{\text{new}}\approx\Delta+\Gamma\,\delta S+\text{Vanna}\,\delta\sigma$ 估算情境後的新 delta，並判斷什麼時候需要再加 speed、zomma。
5. 能把一天的損益拆成 delta、gamma、vega、theta、vanna、volga 與殘差，並解釋殘差的來源。
6. 能用「$r=q=0$ 時，時間導數 $=-\frac{\sigma}{2\tau}\times$ 波動率導數」這條關係，由 vanna 推 charm、由 zomma 推 color。

## 核心概念

### 2.1 記號與單位約定

**記號**：$S$ 現貨、$K$ 履約價、$\tau$ 剩餘年數、$\sigma$ 隱含波動率、$r$ 利率、$q$ 連續股利率（或借券成本、外國利率），

$$
d_1=\frac{\ln(S/K)+(r-q+\tfrac12\sigma^2)\tau}{\sigma\sqrt\tau},\qquad d_2=d_1-\sigma\sqrt\tau
$$

$\phi(x)=e^{-x^2/2}/\sqrt{2\pi}$ 是標準常態密度，$N(x)$ 是累積分配。

**一階與二階基礎**（P2 會反覆用到）：

$$
\Gamma=\frac{e^{-q\tau}\phi(d_1)}{S\sigma\sqrt\tau},\qquad
\mathcal V=Se^{-q\tau}\phi(d_1)\sqrt\tau
$$

這裡 $\mathcal V$ 是「每 1.00 波動率」的 vega（原始單位）。

**單位約定（本章所有表格都用這組「交易員單位」）**

| Greek | 數學定義 | 原始單位 | 本章表格單位 | 換算 |
|---|---|---|---|---|
| Vanna | $\partial^2V/\partial S\,\partial\sigma$ | delta / 1.00 vol | delta 變化 / +1 vol 點 | 原始 ÷ 100 |
| Volga（vomma） | $\partial^2V/\partial\sigma^2$ | 價格 / (1.00 vol)² | vega（每點）變化 / +1 vol 點 | 原始 ÷ 10,000 |
| Charm | $\partial\Delta/\partial t$ | delta / 年 | delta 變化 / 經過 1 日曆日 | 原始 ÷ 365 |
| Speed | $\partial\Gamma/\partial S=\partial^3V/\partial S^3$ | gamma / 1 元 | gamma 變化 / 現貨 +1 | 不變 |
| Zomma | $\partial\Gamma/\partial\sigma$ | gamma / 1.00 vol | gamma 變化 / +1 vol 點 | 原始 ÷ 100 |
| Color | $\partial\Gamma/\partial t$ | gamma / 年 | gamma 變化 / 經過 1 日曆日 | 原始 ÷ 365 |
| Veta | $\partial\mathcal V/\partial t$ | vega / 年 | vega（每點）變化 / 經過 1 日曆日 | 原始 ÷ 100 ÷ 365 |

**時間的正負號**：與第 9 章一致，所有「對時間」的 Greek 都定義為**日曆時間經過**造成的變化，也就是 $\partial/\partial t=-\partial/\partial\tau$。有些系統用 $\partial/\partial\tau$（剩餘時間增加），正負號會相反——接手別人的風險報表時，第一件事就是確認這個約定。

> **一個好用的巧合**：vanna 的原始值 $\partial\Delta/\partial\sigma$ 同時等於 $\partial\mathcal V/\partial S$。換成交易員單位時，「vanna 每點 0.009」同時代表兩件事：波動率 +1 點 delta 增加 0.009；現貨 +1 元，vega（每點）增加 0.009。

### 2.2 解析公式（BS，含 $q$）

以下公式買權、賣權相同（除了 charm），因為它們都是 gamma 或 vega 的導數，而買賣權平價告訴我們同履約價的 call 與 put 的 gamma、vega 相同。

**Vanna**

$$
\text{Vanna}=\frac{\partial\Delta}{\partial\sigma}=-\frac{e^{-q\tau}\phi(d_1)\,d_2}{\sigma}=\frac{\mathcal V}{S}\left(1-\frac{d_1}{\sigma\sqrt\tau}\right)
$$

符號由 $-d_2$ 決定：$d_2<0$（履約價在遠期價附近或以上，偏價外的 call）vanna 為正；$d_2>0$（履約價較低）vanna 為負。零點在 $d_2=0$，也就是 $K=Fe^{-\sigma^2\tau/2}$，略低於遠期價 $F=Se^{(r-q)\tau}$。

**Volga（vomma）**

$$
\text{Volga}=\frac{\partial\mathcal V}{\partial\sigma}=\mathcal V\,\frac{d_1d_2}{\sigma}
$$

$d_1$ 與 $d_2$ 同號（兩翼）時為正；只有在 $d_1$ 與 $d_2$ 之間的狹窄區域（價平附近）為負且極小。這就是「價平選擇權價格對波動率近似線性、翼部選擇權對波動率是凸的」的數學版本。

**Charm（delta decay）**

$$
\text{Charm}_{\text{call}}=qe^{-q\tau}N(d_1)-e^{-q\tau}\phi(d_1)\,\frac{2(r-q)\tau-d_2\sigma\sqrt\tau}{2\tau\,\sigma\sqrt\tau}
$$

$$
\text{Charm}_{\text{put}}=\text{Charm}_{\text{call}}-qe^{-q\tau}
$$

**Speed**

$$
\text{Speed}=\frac{\partial\Gamma}{\partial S}=-\frac{\Gamma}{S}\left(1+\frac{d_1}{\sigma\sqrt\tau}\right)
$$

**Zomma**

$$
\text{Zomma}=\frac{\partial\Gamma}{\partial\sigma}=\Gamma\,\frac{d_1d_2-1}{\sigma}
$$

**Color（gamma decay）**

$$
\text{Color}=\frac{\partial\Gamma}{\partial t}=\Gamma\left[q+\frac{1}{2\tau}\left(1+d_1\,\frac{2(r-q)\tau-d_2\sigma\sqrt\tau}{\sigma\sqrt\tau}\right)\right]
$$

**Veta（vega decay）**

$$
\text{Veta}=\frac{\partial\mathcal V}{\partial t}=\mathcal V\left[q+\frac{(r-q)\,d_1}{\sigma\sqrt\tau}-\frac{1+d_1d_2}{2\tau}\right]
$$

#### $r=q=0$ 的簡化與「時間 = 波動率」關係

令 $r=q=0$，上面的式子變得很乾淨：

$$
\text{Charm}=\frac{\phi(d_1)\,d_2}{2\tau},\qquad
\text{Color}=\Gamma\,\frac{1-d_1d_2}{2\tau},\qquad
\text{Veta}=-\mathcal V\,\frac{1+d_1d_2}{2\tau}
$$

更重要的是：$r=q=0$ 時，delta 和 $S\cdot\Gamma$ 只透過 $\sigma\sqrt\tau$（以及 $\ln(S/K)$）依賴時間和波動率。對任何只依賴 $\sigma\sqrt\tau$ 的量 $f$，

$$
\frac{\partial f}{\partial t}=-\frac{\partial f}{\partial\tau}=-\frac{\sigma}{2\tau}\,\frac{\partial f}{\partial\sigma}
$$

所以

$$
\text{Charm}=-\frac{\sigma}{2\tau}\,\text{Vanna},\qquad \text{Color}=-\frac{\sigma}{2\tau}\,\text{Zomma}
$$

> **交易員會怎麼說**：「時間經過就是波動率下降。」價外 call 的 vanna 為正 → 波動率降 delta 降 → 時間過 delta 也降（charm 為負）。價平 zomma 為負 → 波動率降 gamma 升 → 時間過 gamma 也升（color 為正）。記住 vanna 與 zomma 的正負號，charm 與 color 就免費得到。
>
> 數值檢查：1 個月、20% 的 25Δ call，vanna 原始值 1.163，$\sigma/(2\tau)=0.20/(2\times30/365)=1.217$，charm $=-1.217\times1.163=-1.415$ 每年，即每日 $-0.00388$——與下表直接用公式算的值相同。

（veta 不適用這條關係，因為 vega 本身帶有顯式的 $S\sqrt\tau$ 因子。）

### 2.3 用數值差分驗證

任何你自己寫或從別處抄來的高階 Greek 公式，**上線前都要和中央差分比對**。做法：

$$
\text{Vanna}\approx\frac{\Delta(\sigma+h)-\Delta(\sigma-h)}{2h},\qquad
\text{Color}\approx-\frac{\Gamma(\tau+h)-\Gamma(\tau-h)}{2h}
$$

```python
# 在 natenberg_course/ 下執行：.venv/bin/python
import sys; sys.path.insert(0, "labs")
import numpy as np, optlib as ol
from scipy.stats import norm

S, K, t, s, r, q = 100, 90, 0.25, 0.20, 0.04, 0.02
d1, d2 = ol.d1_d2(S, K, t, s, r, q)
vanna = -np.exp(-q*t) * norm.pdf(d1) * d2 / s          # 解析
h = 1e-5
fd = (ol.bs_delta(S, K, t, s+h, r, q, "call") - ol.bs_delta(S, K, t, s-h, r, q, "call")) / (2*h)
print(vanna, fd)   # 兩者應相同到小數第 7 位以上
```

本章撰寫時，把 2.2 節七個公式在五組參數（含 $q>0$、$r\ne q$、短天期 0.02 年、深價內外、call 與 put）上逐一與中央差分比對，最大相對誤差在 $10^{-7}$ 量級以下（speed 約 $1.6\times10^{-7}$，其餘更小）。

**步長的選擇**：對「已經是解析一階 Greek」的函數再差分一次（例如用解析 delta 差分出 vanna），步長可以很小（$10^{-5}$）。若直接對**價格**做二階差分（$[V(\sigma+h)-2V(\sigma)+V(\sigma-h)]/h^2$），步長太小會被浮點捨入誤差淹沒——$h=10^{-5}$ 時相對誤差可達 1%，改用 $h=10^{-3}$ 左右才穩。

### 2.4 大小與符號：按 delta 分桶

固定 $S=100$、$\sigma=20\%$、$r=q=0$、剩 30 天（$\tau=30/365$）。以 call 的 delta 選履約價：

| Call delta | 履約價 | Gamma | Vega（每點） | Vanna（每點） | Volga（每點²） | Charm（每日） | Speed | Zomma（每點） | Color（每日） | Veta（每日） |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.10 | 107.80 | 0.0306 | 0.0503 | +0.0118 | +0.0043 | −0.0039 | +0.0065 | +0.0011 | −0.0004 | −0.0023 |
| 0.25 | 104.11 | 0.0554 | 0.0911 | +0.0116 | +0.0022 | −0.0039 | +0.0060 | −0.0014 | +0.0005 | −0.0023 |
| 0.50 | 100.16 | 0.0696 | 0.1144 | +0.0011 | 0.0000 | −0.0004 | −0.0007 | −0.0035 | +0.0012 | −0.0019 |
| 0.75 | 96.36 | 0.0554 | 0.0911 | −0.0098 | +0.0019 | +0.0033 | −0.0071 | −0.0016 | +0.0005 | −0.0022 |
| 0.90 | 93.07 | 0.0306 | 0.0503 | −0.0107 | +0.0040 | +0.0036 | −0.0072 | +0.0009 | −0.0003 | −0.0022 |

怎麼讀：

- **Vanna**：價外 call（高履約價）為正、價內 call（低履約價）為負，零點在 50Δ 附近（略偏低履約價一側）。25Δ 與 10Δ 的 vanna 差不多大——vanna 的峰值在 15–20Δ 附近，比第 9 章說的區間稍寬是正常的（取決於 $\sigma\sqrt\tau$）。賣權的 vanna 與同履約價的 call 相同：**25Δ put（履約價 96.36）的 vanna 是 −0.0098**。
- **Volga**：兩翼為正、價平約 0。翼部選擇權是「波動率的凸性部位」。
- **Charm**：價外 call 的 delta 每天往 0 漏（−0.0039/日），價內 call 往 1 爬（+0.0033/日）。
- **Speed**：高履約價為正（現貨往上靠近履約價時 gamma 增加）、低履約價為負。
- **Zomma 與 Color**：符號互為鏡像（$r=q=0$ 時 $\text{Color}=-\frac{\sigma}{2\tau}\text{Zomma}$）；價平 zomma 負、color 正；10Δ/90Δ 已經翻號，翻號點大約在 16Δ/85Δ。
- **Veta**：全部為負——時間經過，vega 縮水；在 $r=q=0$ 時 $1+d_1d_2>0$ 幾乎永遠成立，veta 幾乎不可能為正。

**持有部位的符號速查**（買進 1 口；賣出則全部反號）：

| 部位 | Vanna | Volga | Charm | Speed | Zomma | Color | Veta |
|---|---|---|---|---|---|---|---|
| 買 25Δ call（高 K） | + | + | −（delta 漏向 0） | + | −（接近翻號區） | + | − |
| 買 ATM call / put | ≈0 | ≈0 | ≈0 | ≈0（略負） | − | + | − |
| 買 25Δ put（低 K） | − | + | +（put delta 往 0 升） | − | − | + | − |
| 買 10Δ put（更低 K） | − | + | + | − | + | − | − |
| 買 25Δ 風險逆轉（+call −put） | ++ | ≈0 | − | ++ | ≈0 | ≈0 | ≈0 |
| 買 25Δ 勒式（+call +put） | ≈0（略+） | ++ | ≈0 | ≈0 | − | + | − |
| 買 vega 中性 25Δ 蝶式（勒式 − 0.80 組 ATM 跨式） | 0 | ++ | 0 | 0 | + | − | − |

最後三行是重點：**風險逆轉（risk reversal）是 vanna 部位，勒式（strangle）與 vega 中性蝶式是 volga 部位**。以表中數值，每組 25Δ 風險逆轉 vanna 每點 +0.0214、volga 只有 +0.0004；每組 vega 中性蝶式 volga 每點² +0.0041、vanna 與 vega 都是 0。P3 的 vanna-volga 定價就建立在這個對應上。

### 2.5 大小隨時間：固定 delta 比較

同樣 $\sigma=20\%$、$r=q=0$，但這次**固定在 25Δ call**，改變期限（履約價會跟著移動）：

| 期限 | 履約價 | Gamma | Vega（每點） | Vanna（每點） | Volga（每點²） | Charm（每日） | Speed | Zomma（每點） | Color（每日） | Veta（每日） |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 年 | 116.75 | 0.0159 | 0.318 | +0.0139 | +0.0094 | −0.0004 | +0.0004 | −0.0003 | +0.00001 | −0.0007 |
| 3 個月 | 107.51 | 0.0318 | 0.159 | +0.0123 | +0.0042 | −0.0013 | +0.0018 | −0.0008 | +0.00008 | −0.0013 |
| 1 個月 | 104.11 | 0.0554 | 0.091 | +0.0116 | +0.0022 | −0.0039 | +0.0060 | −0.0014 | +0.00047 | −0.0023 |
| 1 週 | 101.92 | 0.1147 | 0.044 | +0.0112 | +0.0010 | −0.0159 | +0.0268 | −0.0030 | +0.00431 | −0.0046 |

固定 delta 時的**縮放規律**（$|d_1|$ 固定，只有 $\sigma\sqrt\tau$ 在變）：

| Greek | 固定 delta 時大約與 $\tau$ 的關係 | 直覺 |
|---|---|---|
| Gamma、Zomma | $\tau^{-1/2}$ | 期限縮成 1/4，gamma 加倍 |
| Vega、Volga | $\tau^{1/2}$ | 長天期是 vega 與 volga 的主場 |
| Vanna | 幾乎不變（$\tau^0$） | 25Δ 的 vanna 從 1 週到 1 年都在 0.011–0.014 |
| Charm、Speed | $\tau^{-1}$ | 期限縮成 1/4，charm 變 4 倍 |
| Color | $\tau^{-3/2}$ | 期限縮成 1/4，color 變 8 倍 |
| Veta | $\tau^{-1/2}$ | 短天期 vega 縮得快 |

為什麼 vanna 幾乎不隨期限變？在 $r=q=0$ 下 $\text{Vanna}=-\phi(d_1)d_2/\sigma$，固定 delta 等於固定 $d_1$；$d_2=d_1-\sigma\sqrt\tau$ 只隨 $\sqrt\tau$ 小幅變化。這是很有用的直覺：**「25Δ 的 vanna 大約 0.012 每點」在 20% 波動率的市場幾乎對所有期限都成立**；而 charm 則在最後一週急遽放大。

**價平的對照**（K=100）：gamma 從 1 年 0.0198 → 1 週 0.1440；color 從每日 0.00003 → 0.0103；zomma 從每點 −0.0010 → −0.0072。價平部位越接近到期，gamma 本身和 gamma 的變化速度都在爆炸——這是 [P4](p04_expiration_pin_risk.md) 的主題。

### 2.6 泰勒展開：情境後的新 delta

把 delta 視為 $(S,\sigma)$ 的函數，在目前點展開：

$$
\Delta(S+\delta S,\ \sigma+\delta\sigma)\approx\Delta+\Gamma\,\delta S+\text{Vanna}\,\delta\sigma+\tfrac12\text{Speed}\,\delta S^2+\text{Zomma}\,\delta S\,\delta\sigma+\tfrac12\frac{\partial\,\text{Vanna}}{\partial\sigma}\,\delta\sigma^2
$$

注意交叉項 $\partial^2\Delta/\partial S\,\partial\sigma=\partial\Gamma/\partial\sigma$ 正是 zomma。

#### 例 1：單一賣權——「現貨跌 5%、波動率漲 3 點」

$S=100$，3 個月（$\tau=0.25$），$r=4\%$，$q=1.5\%$，$\sigma=20\%$。你持有 95 put。

| 量 | 數值 |
|---|---|
| Delta | −0.2648 |
| Gamma | 0.03268 |
| Vanna（每點） | −0.00859 |
| Speed | −0.00237 |
| Zomma（每點） | −0.00110 |

情境：$\delta S=-5$，$\delta\sigma=+3$ 點。

$$
\Delta_{\text{new}}\approx-0.2648+0.03268\times(-5)+(-0.00859)\times3=-0.2648-0.1634-0.0258=-0.4540
$$

全重算（BS 直接用 $S=95$、$\sigma=23\%$）：**−0.4538**。只用 gamma 會得到 −0.4283，差了 0.026——那正好是 vanna 項。

> **交易員會怎麼說**：「每口 put 的 delta 從 −0.26 變 −0.45；gamma 貢獻 −0.16、vanna 再加 −0.03。我持有 200 口的話，delta 合計再多出約 $200\times(-0.19)\approx-38$，要多買大約 38 股等值來重新中立。」

#### 例 2：當 gamma 不準時——105 call

同樣參數，105 call：delta 0.3524、gamma 0.03704、vanna 每點 +0.00880、speed +0.00102、zomma 每點 −0.00152。

| 近似 | 新 delta |
|---|---|
| 只用 gamma | 0.1672 |
| gamma + vanna | 0.1936 |
| 再加 $\tfrac12$speed$\,\delta S^2$ + zomma$\,\delta S\,\delta\sigma$ | 0.2259 |
| 全重算 | 0.2233 |

為什麼這裡一階不夠？$\delta S=-5$ 對 3 個月 20% 的選擇權是 $5/(100\times0.2\times\sqrt{0.25})=0.5$ 個標準差，而 105 call 在現貨下跌後落入 gamma 曲線較陡的區段（speed 不可忽略）。**經驗法則**：現貨移動超過約 0.3–0.5 個「期限內標準差」時，就要加二階項或直接重算。

#### 例 3：gamma 接近零的部位——風險逆轉

同樣參數，部位：賣 100 口 95 put、買 100 口 105 call（多頭風險逆轉）。

| 部位 Greek | 數值 |
|---|---|
| Delta | +61.7 |
| Gamma | +0.44（兩腿幾乎抵銷） |
| Vanna（每點） | +1.74 |
| Speed | +0.339 |
| Zomma（每點） | −0.042 |

情境同上（$-5$、$+3$ 點）：

- gamma 項：$0.44\times(-5)=-2.2$ → 只看 gamma 會說「delta 降到 59.5」；
- vanna 項：$1.74\times3=+5.2$；
- speed 項：$\tfrac12\times0.339\times25=+4.2$；
- zomma 項：$-0.042\times(-5)\times3=+0.6$。

gamma + vanna 得 64.8；全部二階得 69.6；全重算 **67.7**。**方向與 gamma 的預測相反**：部位 gamma 很小，但 vanna 與 speed 都不小。這就是為什麼 desk 的風險報表一定會列 vanna——風險逆轉、價差這類「看起來 gamma 中立」的部位，delta 照樣會在急跌中跑掉。

### 2.7 損益歸因（PnL attribution）

把價值變化在 $(S,\sigma,t)$ 上展開：

$$
\delta V\approx\Delta\,\delta S+\tfrac12\Gamma\,\delta S^2+\mathcal V\,\delta\sigma+\Theta\,\delta t+\text{Vanna}\,\delta S\,\delta\sigma+\tfrac12\text{Volga}\,\delta\sigma^2+\varepsilon
$$

$\varepsilon$ 是殘差（unexplained），來自三階以上的項（speed、zomma、charm 交叉項…）以及模型外的因素（偏斜移動、利率、股利、資料錯誤）。

#### 例 4：多頭跨式

買 100 組 3 個月 ATM 跨式（K=100，$S=100$、$\sigma=20\%$、$r=q=0$）。一天後：$S=97.5$、$\sigma=21.5\%$。

| 項目 | 計算 | 損益 |
|---|---|---|
| Delta | $3.99\times(-2.5)$ | −9.97 |
| Gamma | $\tfrac12\times7.97\times2.5^2$ | +24.90 |
| Vega | $39.84\times1.5$ | +59.77 |
| Theta | $200\times(-0.02183)\times1$ | −4.37 |
| Vanna | $0.199\times(-2.5)\times1.5$ | −0.75 |
| Volga | 約 0 | −0.01 |
| **合計（解釋）** | | **+69.58** |
| **全重算** | | **+67.87** |
| 殘差 | | −1.71 |

殘差大部分來自 zomma 項 $\tfrac12\,\text{Zomma}\,\delta S^2\,\delta\sigma$：部位 zomma 每點 $200\times(-0.0020)=-0.40$，$\tfrac12\times(-0.40)\times6.25\times1.5=-1.87$；speed 項 $\tfrac16\times200\times(-0.000598)\times(-2.5)^3=+0.31$。兩者合計 −1.56，與殘差 −1.71 很接近。

> **交易員會怎麼說**：「今天賺 68：vega 貢獻 60、gamma 25，theta 付了 4、delta 漏了 10。殘差 −1.7 是 zomma——波動率上升讓 gamma 變小了一點。」

#### 例 5：避險後的空頭風險逆轉在急跌中

1 個月期，$S=100$。賣 100 口 95 put（$\sigma=23\%$）、買 100 口 105 call（$\sigma=18\%$），部位 delta +38.8，**用賣出 38.8 股避險**。一天後現貨跌到 96；偏斜變陡，95 put 的波動率 +5 點、105 call +3 點。

| 項目 | 選擇權損益 |
|---|---|
| Delta | −155.04（被股票避險的 +155.04 抵銷） |
| Gamma | +5.68 |
| Vega | −18.68 |
| Theta | +0.91 |
| Vanna | −35.53 |
| Volga | −1.03 |
| 合計（解釋） | −203.69 |
| 全重算 | −204.92 |

避險後淨損益約 $-204.92+155.04=-49.9$。**最大的虧損來源不是 vega，是 vanna**：短 put 的 vanna 為正（$-1\times$ 負值），長 call 的 vanna 為正，部位 vanna 每點 $+2.34$；現貨跌、波動率漲，兩者乘積為負。這是股指「spot 跌、vol 漲」相關性對多頭風險逆轉的懲罰，P3 會從曲面動態的角度再看一次。

殘差只有 −1.2，但那是 speed（約 −15）與其他高階項互相抵銷後的淨值。**殘差小不代表每一項都準**；4% 的單日移動對 1 個月選擇權已是大行情，逐項解讀要保守。

### 2.8 其他兩個常用的「二階預測」

**新 vega**：

$$
\mathcal V_{\text{new}}\approx\mathcal V+\text{Volga}\,\delta\sigma+\text{Vanna}\,\delta S+\text{Veta}\,\delta t
$$

**新 gamma**：

$$
\Gamma_{\text{new}}\approx\Gamma+\text{Speed}\,\delta S+\text{Zomma}\,\delta\sigma+\text{Color}\,\delta t
$$

> 例：1 個月 ATM（K=100、20%、$r=q=0$），gamma 0.0695、zomma 每點 −0.00348。波動率從 20% 跌到 16%：$0.0695+(-0.00348)\times(-4)=0.0835$；全重算 0.0869。波動率大幅變動時 zomma 本身也在變（gamma 對 $\sigma$ 是凸的），線性外推會低估。

## 交易員視角

- **風險報表怎麼排**：典型 desk 的 Greeks 報表會在 delta/gamma/vega/theta 之外列 vanna 與 volga（常以 25Δ 風險逆轉、25Δ 蝶式的等值部位表示），並對 gamma、vega 按期限分桶。被問到「你的 vanna 是多少」時，要能說出單位：「每 1 vol 點 delta 變 +1.7」或「每 1 元現貨 vega 變 +1.7」。
- **教練的經典問法**：「現貨跌 5%、vol 漲 3 點，你的 delta？」標準回答結構：先報 gamma 項、再報 vanna 項、說明是否需要 speed 修正，最後給數字與避險動作。不要先算到小數第四位才開口——先給量級，再精修。
- **週末與 charm**：週五收盤時持有大量 1 週到期的價外 call，週一開盤前 delta 會因 3 個日曆日的 charm 大幅縮水（見 B2）。很多 desk 會在週五就把「週一的 delta」算出來並預先調整。
- **Optibook 實作**：如果你的 bot 對選擇權報價，避險觸發條件可以用「預測 delta」而非「目前 delta」：$\Delta+\Gamma\,\delta S$ 再加上用你自己的波動率估計算出的 vanna 項。重點是 Greeks 要用**同一套**波動率輸入計算，否則不同腿的 vanna 不能相加。
- **PnL explain 的紀律**：每天收盤後把損益拆項。殘差突然變大通常代表：(1) 偏斜形狀變了但你的模型只移動 ATM；(2) 股利或利率輸入錯；(3) 成交價或標記價格錯；(4) 某個部位漏記。殘差是風險控管的警報器，不是「雜訊」欄位。

## 常見誤區

1. **誤解**：gamma 接近零就代表 delta 很穩。→ **正解**：風險逆轉、價差等部位 gamma 可能很小，但 vanna、speed 很大；現貨與波動率一起動時 delta 仍會大幅移動（例 3）。
2. **誤解**：charm 和 color 是另外要記的新東西。→ **正解**：$r=q=0$ 時 $\text{Charm}=-\frac{\sigma}{2\tau}\text{Vanna}$、$\text{Color}=-\frac{\sigma}{2\tau}\text{Zomma}$；記住 vanna 與 zomma 的符號就夠了。
3. **誤解**：vanna 在短天期會爆炸，就像 gamma。→ **正解**：固定 delta 時 vanna 幾乎不隨期限變；隨期限爆炸的是 charm（$\tau^{-1}$）、speed（$\tau^{-1}$）、color（$\tau^{-3/2}$）。
4. **誤解**：各系統的 charm、color、veta 符號都一樣。→ **正解**：「經過時間」與「剩餘時間增加」定義相反；單位也有每年、每日、每交易日的差異。拿到報表先確認約定。
5. **誤解**：PnL 歸因殘差小就代表每一項都準。→ **正解**：大行情時三階項可能大且互相抵銷（例 5 的 speed 約 −15，但淨殘差只有 −1.2）。
6. **誤解**：對價格做二階數值差分，步長越小越準。→ **正解**：太小會被捨入誤差主導；對解析一階 Greek 再差分一次才是穩健做法。

## 重點摘要

| 項目 | 公式／規則 |
|---|---|
| Vanna | $-e^{-q\tau}\phi(d_1)d_2/\sigma$；高 K 為正、低 K 為負；零點 $d_2=0$ |
| Volga | $\mathcal V d_1d_2/\sigma$；兩翼為正、ATM≈0 |
| Charm（call） | $qe^{-q\tau}N(d_1)-e^{-q\tau}\phi(d_1)\frac{2(r-q)\tau-d_2\sigma\sqrt\tau}{2\tau\sigma\sqrt\tau}$；put 再減 $qe^{-q\tau}$ |
| Speed | $-\frac{\Gamma}{S}\left(1+\frac{d_1}{\sigma\sqrt\tau}\right)$ |
| Zomma | $\Gamma(d_1d_2-1)/\sigma$；ATM 為負、翼部（約 15Δ 以外）為正 |
| Color | $\Gamma\left[q+\frac{1}{2\tau}\left(1+d_1\frac{2(r-q)\tau-d_2\sigma\sqrt\tau}{\sigma\sqrt\tau}\right)\right]$ |
| Veta | $\mathcal V\left[q+\frac{(r-q)d_1}{\sigma\sqrt\tau}-\frac{1+d_1d_2}{2\tau}\right]$ |
| 時間 = 波動率 | $r=q=0$：Charm $=-\frac{\sigma}{2\tau}$Vanna，Color $=-\frac{\sigma}{2\tau}$Zomma |
| 固定 delta 縮放 | Γ、Zomma ∝ $\tau^{-1/2}$；Vega、Volga ∝ $\tau^{1/2}$；Vanna ≈ 常數；Charm、Speed ∝ $\tau^{-1}$；Color ∝ $\tau^{-3/2}$ |
| 新 delta | $\Delta+\Gamma\,\delta S+\text{Vanna}\,\delta\sigma$（大行情再加 speed、zomma） |
| PnL 歸因 | $\Delta\delta S+\tfrac12\Gamma\delta S^2+\mathcal V\delta\sigma+\Theta\delta t+\text{Vanna}\,\delta S\delta\sigma+\tfrac12\text{Volga}\,\delta\sigma^2+\varepsilon$ |
| 部位對應 | 風險逆轉 = vanna；蝶式／勒式 = volga |
| 數量級（20%、1 個月） | 25Δ：vanna ≈ 0.012/點、charm ≈ −0.004/日；ATM：gamma ≈ 0.07、zomma ≈ −0.0035/點 |

## 練習題

### A. 概念題

**A1.** 為什麼同一履約價的 call 與 put，vanna、volga、speed、zomma、color、veta 都相同，唯獨 charm 不同？

<details><summary>解答</summary>

由買賣權平價 $C-P=Se^{-q\tau}-Ke^{-r\tau}$，兩邊對 $S$ 微分得 $\Delta_C-\Delta_P=e^{-q\tau}$；再對 $S$ 或 $\sigma$ 微分，右邊為 0，所以 gamma、vega 以及它們的所有導數（vanna、volga、speed、zomma、color、veta）都相同。但 $e^{-q\tau}$ 對時間的導數不為零：$\partial(\Delta_C-\Delta_P)/\partial t=qe^{-q\tau}$，所以 $\text{Charm}_C-\text{Charm}_P=qe^{-q\tau}$。$q=0$ 時兩者也相同。

</details>

**A2.** 不看表，判斷以下部位的 vanna 正負：(a) 買 10Δ call；(b) 買 10Δ put；(c) 賣 25Δ 勒式；(d) 賣 25Δ put、買 25Δ call。

<details><summary>解答</summary>

Vanna 的符號由履約價相對遠期價的位置決定：高履約價為正、低履約價為負（call、put 相同）。
(a) 高 K → **正**；(b) 低 K → **負**；(c) 賣高 K call（−正）+ 賣低 K put（−負）→ 大致**抵銷，接近 0**（因對數常態不對稱，25Δ call 的 vanna 略大於 25Δ put 的絕對值，所以賣勒式實際上略負）；(d) 賣低 K put（−負=正）+ 買高 K call（正）→ **強烈為正**。

</details>

**A3.** 用「時間經過 ≈ 波動率下降」說明：為什麼 10Δ call 的 color 為負，而 ATM call 的 color 為正？

<details><summary>解答</summary>

$r=q=0$ 時 $\text{Color}=-\frac{\sigma}{2\tau}\text{Zomma}$。ATM 選擇權在波動率下降時 gamma 上升（zomma 負），所以時間經過 gamma 也上升（color 正）。10Δ call 在低波動率下更可能「確定價外」，gamma 下降（zomma 正），所以時間經過 gamma 下降（color 負）。

</details>

**A4.** 為什麼固定 delta 時 vanna 幾乎不隨期限改變，而 charm 會隨期限縮短而放大？

<details><summary>解答</summary>

$r=q=0$ 時 $\text{Vanna}=-\phi(d_1)d_2/\sigma$。固定 delta 等於固定 $d_1$，而 $d_2=d_1-\sigma\sqrt\tau$ 只隨 $\sqrt\tau$ 小幅變動，所以 vanna 幾乎是常數。$\text{Charm}=-\frac{\sigma}{2\tau}\text{Vanna}$，多了一個 $1/\tau$ 因子，所以期限縮成 1/4 時 charm 約變 4 倍。

</details>

**A5.** 一個部位 gamma 為零、vega 為零，但 vanna 很大。描述它在「現貨急跌、波動率急升」的情境中如何虧損或獲利，並舉一個這樣的部位。

<details><summary>解答</summary>

一階、二階的 gamma 與 vega 損益都近似為零，主要損益來自交叉項 $\text{Vanna}\,\delta S\,\delta\sigma$。若 vanna 為正，$\delta S<0$、$\delta\sigma>0$ 時乘積為負 → **虧損**；vanna 為負則獲利。例子：適當配比的多頭風險逆轉（買高 K call、賣低 K put，調整口數使 vega 為零，再用現貨避險 delta），其 gamma 也接近零，但 vanna 為正。

</details>

**A6.** PnL 歸因中殘差突然從平常的 ±2 變成 −40。列出你會優先檢查的四件事。

<details><summary>解答</summary>

(1) 偏斜／曲面形狀是否變了，而歸因只用了單一 ATM 波動率變動（不同履約價的 $\delta\sigma$ 不同）；(2) 是否是大行情，需要加入三階項（speed、zomma、charm×δS）或改用全重算；(3) 輸入錯誤：股利、利率、到期時間（例如假日）、標記價格；(4) 部位資料：漏記成交、被指派或履約、拆股等公司行動。

</details>

### B. 計算題

**B1.** $S=100$、$K=105$、$\tau=0.5$、$\sigma=25\%$、$r=3\%$、$q=1\%$ 的 call。求 $d_1$、$d_2$、vanna（每 vol 點）與 volga（每 vol 點²）。

<details><summary>解答</summary>

$d_1=[\ln(100/105)+(0.03-0.01+0.03125)\times0.5]/(0.25\sqrt{0.5})=(-0.04879+0.02563)/0.17678=-0.1310$，$d_2=-0.1310-0.1768=-0.3078$。

Vanna $=-e^{-0.005}\phi(-0.1310)\times(-0.3078)/0.25=+0.4846$（原始），每點 **+0.00485**。
Vega（原始）$=100e^{-0.005}\phi(-0.1310)\sqrt{0.5}=27.83$；Volga $=27.83\times(-0.1310)(-0.3078)/0.25=4.490$（原始），每點² **+0.000449**。

驗證：波動率 ±1 點的中央差分 delta 變化為 0.00485。

</details>

**B2.** $S=100$、$K=104$、剩 30 天、$\sigma=20\%$、$r=q=0$。(a) 求 call 的 charm（每日曆日）。(b) 你持有 500 口，週五收盤到週一開盤（3 個日曆日）delta 大約漏掉多少？(c) 全重算是多少？

<details><summary>解答</summary>

(a) $\text{Charm}=\phi(d_1)d_2/(2\tau)$，$d_1=-0.6554$、$d_2=-0.7127$，得每年 −1.395，每日 **−0.00382**。
(b) $500\times3\times(-0.00382)=$ **−5.73**（delta 單位：股等值）。
(c) 用 27 天重算：delta 從 0.2561 變到 0.2439，$500\times(-0.01222)=$ **−6.11**。charm 本身也隨時間放大，線性外推會低估。

</details>

**B3.** 1 個月（30 天）ATM gamma 為 0.0695（$S=100$、20%）。用固定 delta 的縮放規律估計 1 週（7 天）ATM gamma，並與實際比較。

<details><summary>解答</summary>

Gamma ∝ $\tau^{-1/2}$：$0.0695\times\sqrt{30/7}=0.0695\times2.070=$ **0.1440**；實際（K=100、7 天）0.1440。

</details>

**B4.** 你的部位：delta +120、gamma +15（每 1 元現貨）、vanna 每 vol 點 +8。現貨 +3、波動率 −2 點後，新 delta 約多少？

<details><summary>解答</summary>

$120+15\times3+8\times(-2)=120+45-16=$ **+149**。

</details>

**B5.** 部位 Greeks：delta −40、gamma +6、vega（每點）+25、theta（每日）−9、vanna（每點）−3、volga（每點²）+0.8。一天內現貨 +2、波動率 −1.5 點。逐項歸因並求合計。

<details><summary>解答</summary>

Delta：$-40\times2=-80$；Gamma：$\tfrac12\times6\times4=+12$；Vega：$25\times(-1.5)=-37.5$；Theta：$-9$；Vanna：$-3\times2\times(-1.5)=+9$；Volga：$\tfrac12\times0.8\times2.25=+0.9$。
合計 $-80+12-37.5-9+9+0.9=$ **−104.6**。

</details>

**B6.** 3 個月 110 call（$S=100$、20%、$r=q=0$）：vega 每點 0.1327、volga 每點² 0.00601、veta 每日 −0.00139。5 天後波動率升到 24%（現貨不變），用二階預測新 vega，並說明與全重算 0.1454 的差距來源。

<details><summary>解答</summary>

$0.1327+0.00601\times4+(-0.00139)\times5=0.1327+0.0240-0.0069=$ **0.1498**。
全重算 0.1454，高估約 0.004：4 個 vol 點不算小，volga 本身會隨波動率變化（對 110 call 而言，波動率升高後它更接近「價平化」，$d_1d_2$ 變小，volga 下降），線性外推會高估。

</details>

**B7.** 1 個月 ATM（K=100、$S=100$、20%、$r=q=0$）的 gamma 0.0695、zomma 每點 −0.00348。由 zomma 推 color（每日），並與公式值 0.00116 比較。

<details><summary>解答</summary>

$\text{Color}=-\frac{\sigma}{2\tau}\text{Zomma}$。Zomma 原始值 $=-0.348$；$\sigma/(2\tau)=0.20/(2\times30/365)=1.2167$；Color $=1.2167\times0.348=0.4234$ 每年 $\div365=$ **0.00116** 每日，相同。

</details>

**B8.** 某 call 的 vanna 每 vol 點為 +0.009。現貨上漲 4 元時，它的 vega（每點）大約增加多少？

<details><summary>解答</summary>

Vanna 也是 $\partial\mathcal V/\partial S$。以交易員單位，每點 vanna 0.009 = 每 1 元現貨 vega（每點）變化 0.009。所以 $0.009\times4=$ **+0.036**。

</details>

### C. 情境題

**C1.**（教練拍肩）「你現在多頭 25Δ 風險逆轉 300 組、已 delta 避險。指數剛跌 2%，ATM vol 漲了 2 點。你的 delta 變成多少？要怎麼做？」已知每組：gamma 約 0、vanna 每點 +0.024、speed 很小。指數 100。

<details><summary>解答</summary>

示範口述：「gamma 接近零，主要看 vanna：每組 $+0.024\times2=+0.048$，300 組約 **+14 delta**——跌了反而變多頭。我要再賣大約 14 股等值的現貨或期貨。同時提醒：如果偏斜一起變陡，put 腿的 vol 漲得比 2 點多，真實 delta 還會再高一點，我會用各腿各自的 vol 變動重算一次確認。」

</details>

**C2.**（盤中決策）週五下午，你的書上有大量 1 週到期的價外 call（多頭），目前 delta 中立。風控要求週末不帶超過 ±50 delta 過夜。根據 charm，你預期週一開盤時 delta 往哪邊偏？現在要怎麼處理？

<details><summary>解答</summary>

價外 call 的 charm 為負，且 1 週期 charm 很大（20%、25Δ 約 −0.016/日）。3 個日曆日後，多頭 call 的 delta 會大幅縮水，**週一部位會變成淨空頭 delta**（因為之前賣出的避險現貨還在）。做法：先用 3 天後的時間重算 delta（或用 $3\times$charm 估計），若偏移超過 50，就在週五收盤前先買回部分現貨，讓「週一的 delta」接近中立；並向風控說明這是預先調整，不是方向性押注。

</details>

**C3.**（PnL explain）主管問：「你昨天賺了 30，但歸因只解釋了 5，剩下 25 是什麼？」你的部位是賣 ATM、買 10Δ put 的 put 比例價差，昨天指數跌 1.5%、整條偏斜變陡。請說明。

<details><summary>解答</summary>

示範口述：「我的歸因只用了一個 ATM vol 變動。但昨天偏斜變陡：10Δ put 的 vol 漲得比 ATM 多很多，而我是多頭 10Δ put、空頭 ATM——同樣的 ATM vol 變動下，我被低估了翼部的 vega 收益。我會把歸因改成按履約價各自的 $\delta\sigma$ 計算（或拆成 ATM 平移 + 偏斜變陡兩個因子）。另外 10Δ put 是正 volga、正 zomma，大行情下二階 vol 項也會貢獻正收益。」

</details>

**C4.**（模擬盤）你的 Optibook bot 每 0.5 秒用最新成交價重算隱含波動率與 delta。你發現避險單非常頻繁，每次都付價差。用本章概念說明原因與改善。

<details><summary>解答</summary>

用即時反推的隱含波動率算 delta，等於讓 vanna 把報價雜訊轉成 delta 雜訊：$\delta\Delta=\text{Vanna}\times\delta\sigma_{\text{noise}}$。價外選擇權 vanna 大，雜訊最嚴重。改善：用平滑過的波動率（自己的曲面，定時更新）計算 Greeks；避險設定 delta 區間（band），只在超過門檻時交易；或用「預測 delta」決定是否需要避險。

</details>

### D. 挑戰題

**D1.** (a) 從 $\Delta_C=e^{-q\tau}N(d_1)$ 出發，推導 $\text{Vanna}=-e^{-q\tau}\phi(d_1)d_2/\sigma$。(b) 證明 $r=q=0$ 時，對任何只透過 $\ln(S/K)$ 與 $\sigma\sqrt\tau$ 依賴參數的函數 $f$，有 $\partial f/\partial t=-\frac{\sigma}{2\tau}\partial f/\partial\sigma$，並由此說明為何 charm 與 vanna 在價外 call 上同為「一正一負」。(c) 為什麼 veta 不滿足同樣的關係？

<details><summary>解答</summary>

(a) $\partial d_1/\partial\sigma=\sqrt\tau-d_1/\sigma=-(d_1-\sigma\sqrt\tau)/\sigma=-d_2/\sigma$。所以 $\partial\Delta_C/\partial\sigma=e^{-q\tau}\phi(d_1)\,\partial d_1/\partial\sigma=-e^{-q\tau}\phi(d_1)d_2/\sigma$。

(b) 令 $v=\sigma\sqrt\tau$，$f=g(\ln(S/K),v)$。$\partial f/\partial\sigma=g_v\sqrt\tau$，$\partial f/\partial\tau=g_v\,\sigma/(2\sqrt\tau)$。所以 $\partial f/\partial\tau=\frac{\sigma}{2\tau}\partial f/\partial\sigma$，而 $\partial/\partial t=-\partial/\partial\tau$。$r=q=0$ 時 $d_1=\ln(S/K)/v+v/2$，所以 $\Delta=N(d_1)$ 符合條件，得 $\text{Charm}=-\frac{\sigma}{2\tau}\text{Vanna}$。價外 call vanna 為正，charm 必為負。

(c) $\mathcal V=S\phi(d_1)\sqrt\tau$ 除了透過 $v$，還有顯式的 $\sqrt\tau$ 因子，對 $\tau$ 與 $\sigma$ 的依賴不再只是透過乘積 $\sigma\sqrt\tau$。改寫成 $\mathcal V=(S/\sigma)\,v\,\phi(d_1)$ 就看得出多了 $1/\sigma$，所以 veta 比 $-\frac{\sigma}{2\tau}\text{Volga}$ 多一項 $-\mathcal V/(2\tau)$：$r=q=0$ 時 $\text{Veta}=-\mathcal V(1+d_1d_2)/(2\tau)$，而 $-\frac{\sigma}{2\tau}\text{Volga}=-\mathcal V d_1d_2/(2\tau)$。

</details>

**D2.** 設計一個由 ATM 跨式、25Δ 風險逆轉、vega 中性 25Δ 蝶式組成的部位，使其 vega、vanna、volga 分別等於 $(0,\ +2,\ 0)$（交易員單位）。以 1 個月、20%、$r=q=0$ 的值為準（每組）：

| 工具 | Vega（每點） | Vanna（每點） | Volga（每點²） |
|---|---|---|---|
| ATM（50Δ）跨式 | 0.2288 | 0.0023 | 0.0000 |
| 25Δ 風險逆轉（買 call 賣 put） | 0.0000 | 0.0214 | 0.00035 |
| vega 中性 25Δ 蝶式 | 0.0000 | 0.0000 | 0.0041 |

求各需幾組。

<details><summary>解答</summary>

解三元一次方程。跨式是唯一有 vega 的工具，而目標 vega 為 0 → **跨式 0 組**。剩下：vanna 只來自風險逆轉 → $2/0.0214=$ **93.3 組風險逆轉**。它帶來 volga $93.3\times0.00035=0.033$，用蝶式抵銷：$-0.033/0.0041\approx-7.9$ → **賣約 8 組蝶式**。（數值解：跨式 0、風險逆轉 93.3、蝶式 −7.9。）
重點在分工：**vanna 用風險逆轉買、volga 用蝶式買、vega 用 ATM 調**。這也是 P3 vanna-volga 方法的基礎：任何選擇權的 vega、vanna、volga 都可以用這三種工具複製。

</details>

## 自我檢核清單

- [ ] 能不看筆記寫出 vanna、volga、speed、zomma 的 BS 公式，並說出 charm、color、veta 的結構。
- [ ] 能說出每個高階 Greek 的交易員單位，並在原始單位與交易員單位之間換算。
- [ ] 能用中央差分驗證一個 Greek，並說明步長怎麼選。
- [ ] 能不看表說出 10/25/50/75/90Δ 的 vanna、volga、charm、zomma、color 正負號。
- [ ] 能說出固定 delta 時各 Greek 對 $\tau$ 的縮放規律（特別是 vanna ≈ 常數、color ∝ $\tau^{-3/2}$）。
- [ ] 能在 30 秒內用 gamma + vanna 估出情境後的新 delta，並判斷是否需要 speed 修正。
- [ ] 能把一天的損益拆成六項加殘差，並說明殘差的可能來源。
- [ ] 能用 $-\frac{\sigma}{2\tau}$ 關係從 vanna 推 charm、從 zomma 推 color。

## 對應練習工具

- [心算速練](../tools/mental-math.md)：泰勒展開新 delta、PnL 歸因速算。
- [教練拍肩問](../tools/coach-questions.md)：「現貨跌 X%、vol 漲 Y 點，你的 delta？」類口述練習。
- [波動率曲面編輯器](../tools/vol-surface.md)：觀察調整偏斜時各履約價 vanna、volga 的變化。
- Natenberg 對應章節：[第 7 章](../lessons/ch07_risk_measurement_1.md)、[第 9 章](../lessons/ch09_risk_measurement_2.md)、[第 21 章](../lessons/ch21_position_analysis.md)（部位情境分析）、[第 24 章](../lessons/ch24_volatility_skews.md)。
- Lab：[`lab05_greeks`](../labs/exercises/lab05_greeks.py)（解析 Greeks vs 數值差分，可直接擴充本章的高階 Greeks）。
