# 第 18 章　Black-Scholes 模型（The Black-Scholes Model）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：Black-Scholes 其實只在算一件事：到期時「拿到的股票平均值」減掉「平均要付的履約價（strike price）」，再折回現值。d1、d2 只是把「離 strike 多遠」換算成「幾個標準差（standard deviation）」。

**你只需要先記住這 5 件事**

1. **買權（call） = 拿到的股票 − 付出的 strike。** 遠期價（forward price） × N(d1) 是 strike 以上股票的平均價值，strike × N(d2) 是平均要付的履約（exercise）金額；兩者相減再折現就是 call 價值。
2. **N(d2) 才是到期價內（in-the-money, ITM）機率，N(d1) 是 delta。** d1 永遠比 d2 大，所以 delta 永遠比 ITM 機率大一點；短天期時兩者很接近。
3. **40% 法則：價平（at-the-money, ATM）選擇權（option） ≈ 0.4 × forward price × 波動率（volatility） × √時間。** 例：期貨（futures） 80、volatility 25%、3 個月 → 0.4 × 80 × 0.25 × 0.5 = 4.00（精確值 3.987）。時間長、波動大時會稍微高估。
4. **ATM straddle 不是 delta 中性。** 價平遠期（at-the-forward）的 call delta 略大於 50、put delta 絕對值略小於 50，所以 straddle 帶正 delta；要中性，標的（underlying）得略低於 strike。
5. **Gamma、vega、theta 的高峰不剛好在 strike。** 以期貨選擇權（b = 0）為例，gamma 高峰在 strike 下方，vega 和 theta 的高峰在上方。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| call 理論價 | forward price × N(d1) − strike × N(d2)，再折現 |
| 到期 ITM 機率 | N(d2)，其中 d2 = d1 − σ√t |
| ATM option 速算 | 0.4 × forward price × σ × √t（straddle 約 0.8 倍） |
| straddle 剛好 delta 中性的 underlying 價 | strike × e 的 −(b + σ²/2) × t 次方 |
| 不同 underlying 的 b | 股票 b = r；futures b = 0；外匯 b = r − 外國利率 |
| 單位換算 | theta ÷ 365 = 每日；vega ÷ 100 = 每 1 個波動率點（vol point） |

**必做練習（約 20 分鐘）**：A2、B2、B3、B5（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[選擇權價格與 Greeks](https://hongyan1215.github.io/natenberg-course/tools/option-explorer/)工具，把 volatility 或天數拉大，看 ATM call 價格怎麼跟著 σ√t 長大，以及 gamma、vega 曲線的高峰怎麼偏離 strike。

---

## 本章定位

前面各章把 Black-Scholes 當成「黑盒子」來用：輸入價格、strike、時間、利率、volatility，吐出理論價與 Greeks。本章把盒子打開，用直覺（而非嚴格推導）說明 $d_1$、$d_2$、$N(d_1)$、$N(d_2)$ 各代表什麼，並整理出能心算的近似公式與 Greeks 的極值位置。
前置章節：[ch05](ch05_pricing_models.md)（機率期望值（expected value, EV）定價）、[ch06](ch06_volatility.md)（對數常態（lognormal）與 volatility）、[ch07](ch07_risk_measurement_1.md)、[ch09](ch09_risk_measurement_2.md)（Greeks）、[ch15](ch15_option_arbitrage.md)（買賣權平價（put-call parity））。

## 學習目標

1. 能說出 Black-Scholes 偏微分方程中每一項（$rS\,\partial C/\partial S$、$\tfrac12\sigma^2S^2\Gamma$、$\Theta$、$rC$）的交易意義。
2. 能把 $d_1$ 拆成「價內外程度（moneyness） + 持有成本（cost of carry） + lognormal 均值修正」再除以「一個 standard deviation」，並解釋 $d_2=d_1-\sigma\sqrt t$ 的意義。
3. 能計算 $F\cdot N(d_1)$（strike 以上股票的平均價值）與 $X\cdot N(d_2)$（平均支付的 exercise 金額），並由此得到 call 價值。
4. 能用 $0.4\times F\times\sigma\sqrt t$ 心算 ATM option 價值，並說明何時會高估。
5. 能區分 delta（$N(d_1)$）與到期 ITM 機率（$N(d_2)$），並計算 straddle 恰好 delta 中性的 underlying 價格。
6. 能拆解 theta 的三個成分，並指出 gamma、theta、vega 真正的極大值位置。
7. 能用調整因子 $b$ 在股票、futures、外匯 option 模型間切換。

## 核心概念

### 18.1 Black-Scholes 方程：一個「避險後剛好打平」的條件

> 💡 **一句話**：option 價格必須讓「正確 delta 避險（hedge）」的部位（position）剛好不賺不賠；方程裡每一項都對應一個 Greek。

**直覺。** Black 與 Scholes 一開始問的不是「option 值多少」，而是：如果股價隨機游走、利率與 volatility 固定，那麼 option 價格在每一瞬間應該是多少，才能讓「正確 delta hedge」的 position 剛好不賺不賠？答案寫成偏微分方程（partial differential equation, PDE）：

$$
rS\frac{\partial C}{\partial S}+\frac12\sigma^2S^2\frac{\partial^2 C}{\partial S^2}+\frac{\partial C}{\partial t}=rC
$$

方程中只有 $S$（股價）與 $t$（時間）是變數；$\sigma$、$r$ 是事先選定、在整個存續期間視為常數的輸入值——這和第 8 章動態避險（dynamic hedging）的假設一致。

| 項 | 對應的 Greek | 交易意義 |
|---|---|---|
| $\partial C/\partial S$ | Delta $\Delta$ | underlying 變動 1 點，option 變多少 |
| $\partial^2 C/\partial S^2$ | Gamma $\Gamma$ | delta 本身變多快 |
| $\partial C/\partial t$ | Theta $\Theta$ | 時間流逝的價值變化 |
| $rS\,\Delta$ | 現貨→遠期 | 利率讓股票「漂移」到 forward price（無股利（dividend）） |
| $\tfrac12\sigma^2S^2\Gamma$ | 波動 × 凸性 | delta 改變的速度取決於 gamma 和 underlying 移動速度 $\sigma$ |
| $rC$ | 折現 | expected value 要折回現值 |

**與第 7 章近似法的關聯。** 第 7 章估計 underlying 從 $S_1$ 移到 $S_2$ 時 option 的變化：

$$
\Delta C \approx \Delta\cdot(S_2-S_1)+\tfrac12\Gamma\,(S_2-S_1)^2
$$

Black-Scholes 方程前兩項與此「一階 + 二階」結構幾乎一樣，差別只在：(1) $S$ 帶有利率項（現貨走向遠期）；(2) 二階項乘上 $\sigma^2S^2$，因為方程考慮的是瞬間、無限小的移動，平方項的「期望大小」就是變異數。

**數值例題（自創）。** 某 option $\Delta=0.50$、$\Gamma=0.04$，underlying 由 50 漲到 52：
$\Delta C\approx 0.50\times2+\tfrac12\times0.04\times2^2=1.00+0.08=1.08$。

> 重點：方程本身不會直接給你價格；要「解」出來才得到大家熟悉的公式。

### 18.2 公式本身，以及它長得像買賣權平價

> 💡 **一句話**：公式長得像 put-call parity 的下限，只是股價和 strike 各多乘了一個權重 N(d1)、N(d2)。

無 dividend 股票的歐式 call：

$$
C=S\,N(d_1)-Xe^{-rt}N(d_2),\qquad
d_1=\frac{\ln(S/X)+(r+\sigma^2/2)t}{\sigma\sqrt t},\qquad d_2=d_1-\sigma\sqrt t
$$

回想 put-call parity（連續複利版）：$C-P=S-Xe^{-rt}$。因為賣權（put）不可能小於 0，call 下限是 $\max(0,\;S-Xe^{-rt})$。
把下限和 Black-Scholes 並排：

$$
\underbrace{S-Xe^{-rt}}_{\text{下限}}\quad\text{vs.}\quad S\,\boxed{N(d_1)}-Xe^{-rt}\boxed{N(d_2)}
$$

差別就在兩個「權重」$N(d_1)$ 與 $N(d_2)$。接下來的小節就在回答：這兩個權重是什麼？

**數值例題。** $S=100$、$X=95$、$t=0.25$、$r=3\%$：下限 $=100-95e^{-0.0075}=100-94.29=5.71$。若 $\sigma=20\%$，Black-Scholes call $=7.38$，比下限多出的 $1.67$ 正好等於 put 價值（平價關係）。

### 18.3 兩個問題：Black-Scholes 如何拆解期望值

> 💡 **一句話**：expected value = strike 以上股票的平均價值 − ITM 機率 × strike。

第 5 章的做法是把每個到期價格的內含價值（intrinsic value）乘上機率再加總：$\sum_i p_i\max(S_i-X,0)$。Black-Scholes 改成把 $S$ 與 $X$ **分開**，問兩個問題：

1. 若持有到期，**strike 以上**的股票，平均價值是多少？（只算 ITM 情境，價外（out-of-the-money, OTM）情境記 0）
2. 若持有到期，**需要付出 strike**的可能性有多大？

expected value = (問題 1 的答案) − (問題 2 的機率 × strike)。

**自創離散分配例題。** 假設 100 次模擬的到期價格如下（右尾較長，像 lognormal），strike $X=52$：

| 到期價 | 40 | 45 | 50 | 55 | 60 | 65 | 70 | 合計 |
|---|---|---|---|---|---|---|---|---|
| 次數 | 3 | 12 | 28 | 20 | 15 | 12 | 10 | 100 |
| ITM？ | – | – | – | ✓ | ✓ | ✓ | ✓ | 57 次 |
| ITM 股票價值（價 × 次數） | 0 | 0 | 0 | 1100 | 900 | 780 | 700 | 3480 |

- 問題 1：strike 以上股票的平均價值 $=3480/100=34.80$
- 問題 2：支付 strike 的機率 $=57/100=0.57$，平均支付 $=0.57\times52=29.64$
- expected value $=34.80-29.64=5.16$

驗算（傳統做法）：$(3\times20+8\times15+13\times12+18\times10)/100=516/100=5.16$ ✓

在 Black-Scholes 裡：

- 問題 1 的答案 $=F\cdot N(d_1)=Se^{rt}N(d_1)$（$F$ 是 forward price）
- 問題 2 的答案 $=X\cdot N(d_2)$
- 到期 expected value $=F\,N(d_1)-X\,N(d_2)$；再乘 $e^{-rt}$ 折現就得到 $S\,N(d_1)-Xe^{-rt}N(d_2)$。

唯一的差別：Black-Scholes 用的是**連續**的對數常態分配（lognormal distribution），而非離散的幾個格子。

### 18.4 $n(x)$ 與 $N(x)$

> 💡 **一句話**：N(x) 是「小於 x 個 standard deviation」的機率，n(0) ≈ 0.4；lognormal 右偏，所以眾數 < 中位數 < 平均數。

- **標準常態分配**（standard normal distribution）$n(x)=\frac{1}{\sqrt{2\pi}}e^{-x^2/2}$：平均 0、standard deviation 1、曲線下總面積 = 1。峰值 $n(0)=0.398942\approx0.4$（這個數字待會兒很重要）。
- **累積 normal distribution 函數**（cumulative normal distribution）$N(x)$：$-\infty$ 到 $x$ 之間曲線下的面積，也就是「結果小於 $x$ 個 standard deviation」的機率。

性質：
$$
N(-\infty)=0,\quad N(+\infty)=1,\quad N(0)=0.5,\quad N(x)=1-N(-x)
$$

```
        n(x)
   0.4 |        ****
       |      **    **
   0.2 |    **  ████  **        ← 陰影面積 = N(x)
       |  **  ██████    **
     0 +**██████████|-----**---
         -3   -1  0 x   +1   +3
```

| $x$ | $N(x)$ | $n(x)$ |
|---|---|---|
| −0.75 | 0.2266 | 0.3011 |
| 0 | 0.5000 | 0.3989 |
| 0.25 | 0.5987 | 0.3867 |
| 0.5 | 0.6915 | 0.3521 |
| 1.0 | 0.8413 | 0.2420 |
| 1.645 | 0.9500 | 0.1031 |
| 1.96 | 0.9750 | 0.0584 |

**分配的三個位置。** Black-Scholes 用的是常態機率，但價格假設是 lognormal。要用常態表去算 lognormal 的機率，必須找出三個點：

| 名稱 | 定義 | 上表離散例中的位置 |
|---|---|---|
| 眾數 Mode | 次數最多的點（峰值） | 50 |
| 中位數 Median | 一半「次數」在左、一半在右 | 55 |
| 平均數 Mean | 「價值」的平衡點（次數 × 價格的重心） | 55.40 |

normal distribution 三者重合；右偏的 lognormal distribution 則是 **眾數 < 中位數 < 平均數**。

### 18.5 一步步組出 $d_1$ 與 $d_2$

> 💡 **一句話**：d1 = strike 離「平均數」幾個 standard deviation；d2 再往左移 σ√t 改用中位數，N(d2) 就是 ITM 機率。

$$
d_1=\frac{\overbrace{\ln(S/X)}^{\text{價內外程度}}+\overbrace{rt}^{\text{現貨→遠期}}+\overbrace{\sigma^2t/2}^{\text{對數常態均值右移}}}{\underbrace{\sigma\sqrt t}_{\text{一個標準差}}}
$$

1. **moneyness。** 常態世界用 $S-X$；lognormal 世界用 $\ln(S/X)$。$S>X$ 為正（call ITM），$S<X$ 為負。
2. **cost of carry。** option 是對 forward price 定價，加上 $rt$。注意 $\ln(S/X)+rt=\ln(Se^{rt}/X)=\ln(F/X)$，所以也可以直接寫 $\ln(F/X)$。
3. **均值修正。** lognormal 的右尾讓平均數落在眾數右邊；volatility 越高、右尾越長，往右移越多，移動量是 $\sigma^2t/2$。
4. **標準化。** 除以期間 $t$ 內的一個 standard deviation $\sigma\sqrt t$，得到「以 standard deviation 為單位」的距離。

$d_1$ 告訴我們：經 lognormal 調整後，strike 距離分配的**平均數**有幾個 standard deviation。$F\cdot N(d_1)$ 就是 strike 以上股票的平均價值。

**$d_2$：改用中位數。** 要算「被 exercise 的機率」，需要的是把次數一分為二的**中位數**，它在平均數左邊 $\sigma\sqrt t$ 處，所以 $d_2=d_1-\sigma\sqrt t$，$N(d_2)$ = 到期 ITM 的（風險中立）機率。

**完整數值例題（自創）。** $S=50$、$X=52$、$t=0.5$、$r=4\%$、$\sigma=30\%$，無 dividend。

| 成分 | 計算 | 數值 |
|---|---|---|
| $\ln(S/X)$ | $\ln(50/52)$ | −0.03922 |
| $rt$ | $0.04\times0.5$ | 0.02000 |
| $\sigma^2t/2$ | $0.09\times0.5/2$ | 0.02250 |
| 分子合計 | | 0.00328 |
| $\sigma\sqrt t$ | $0.30\times0.7071$ | 0.21213 |
| $d_1$ | $0.00328/0.21213$ | 0.01546 |
| $d_2$ | $0.01546-0.21213$ | −0.19667 |
| $N(d_1)$ | | 0.50617 |
| $N(d_2)$ | | 0.42204 |

- 遠期 $F=50e^{0.02}=51.010$
- $F\,N(d_1)=51.010\times0.50617=25.820$（strike 以上股票平均價值）
- $X\,N(d_2)=52\times0.42204=21.946$（平均支付 exercise 金額）
- 到期 expected value $=25.820-21.946=3.873$
- 理論價 $=3.873\times e^{-0.02}=3.797$
- put 由平價：$P=C-S+Xe^{-rt}=3.797-50+50.970=4.767$

### 18.6 一般化：調整因子 $b$，與完整的 Greeks 公式

> 💡 **一句話**：換一個 cost of carry b，同一套公式就能用在股票、futures、外匯；Greeks 公式表用到再查。（公式可先跳過）

在原始模型中加入 cost of carry 因子 $b$：

$$
C=Se^{(b-r)t}N(d_1)-Xe^{-rt}N(d_2),\qquad P=Xe^{-rt}N(-d_2)-Se^{(b-r)t}N(-d_1)
$$
$$
d_1=\frac{\ln(S/X)+(b+\sigma^2/2)t}{\sigma\sqrt t},\qquad d_2=d_1-\sigma\sqrt t
$$

| $b$ 的取值 | 模型 | 適用 |
|---|---|---|
| $b=r$ | Black-Scholes | 無 dividend 股票 |
| $b=r-q$ | Merton（連續股利率（dividend yield） $q$） | dividend 以殖利率近似 |
| $b=0$ | Black（1976） | futures option、股票式結算（stock-type settlement）（先付權利金（premium）） |
| $b=r=0$ | Black，期貨式結算（futures-type settlement） | premium 每日結算（settlement）、不需折現 |
| $b=r-r_f$ | Garman-Kohlhagen | 外匯 option（$r_f$ 為外國利率） |

**離散 dividend 更精確的做法**：把股價換成 $S-\sum D_i e^{-r\,t_i}$（扣掉每筆 dividend 的現值）。

**數值例題。** 同 18.5 的條件，但：
- futures option、stock-type settlement（$F=50$，$b=0$，$r=4\%$）：$C=3.314$
- futures-type settlement（$b=r=0$）：$C=3.381$（少了折現，略高）
- 股票將在 0.25 年後配息 1.00：$S_{adj}=50-1.00e^{-0.01}=49.010$，代入 $b=r$ 得 $C=3.314$（巧合地與 futures 例接近，因為兩者的 forward price 都接近 50）
- 外匯：$S=1.10$、$X=1.12$、$t=0.5$、$r=4\%$、$r_f=2\%$、$\sigma=10\%$：$C=0.02665$

**Greeks 公式（以 $e^{(b-r)t}$ 記為 $E$）：**

| | call | put |
|---|---|---|
| Delta | $E\,N(d_1)$ | $E\,[N(d_1)-1]$ |
| Gamma（同） | $\dfrac{E\,n(d_1)}{S\sigma\sqrt t}$ | 同左 |
| Theta（年） | $-\dfrac{SE\,n(d_1)\sigma}{2\sqrt t}-(b-r)SE\,N(d_1)-rXe^{-rt}N(d_2)$ | $-\dfrac{SE\,n(d_1)\sigma}{2\sqrt t}+(b-r)SE\,N(-d_1)+rXe^{-rt}N(-d_2)$ |
| Vega（同，每 100%） | $SE\,n(d_1)\sqrt t$ | 同左 |
| Rho（$b\neq0$） | $tXe^{-rt}N(d_2)$ | $-tXe^{-rt}N(-d_2)$ |
| Rho（$b=0$） | $-tC$ | $-tP$ |
| Phi（外國利率） | $-tSE\,N(d_1)$ | $tSE\,N(-d_1)$ |
| Elasticity $\Lambda$ | $\Delta\cdot S/C$ | $\Delta\cdot S/P$ |

單位提醒：theta 公式是「每年」，除以 365 得每日；vega、rho 是「每 1.00（100%）」，除以 100 得每 1 個百分點。

**高階 Greeks（第 9 章已介紹，這裡給公式供查表）：**

| 名稱 | 敏感度 | 公式（買賣權相同者標「同」） |
|---|---|---|
| Vanna | delta 對 volatility | $-E\,n(d_1)\,d_2/\sigma$（同） |
| Speed | gamma 對 underlying | $-\dfrac{\Gamma}{S}\left(1+\dfrac{d_1}{\sigma\sqrt t}\right)$（同） |
| Volga/Vomma | vega 對 volatility | $\text{vega}\cdot d_1d_2/\sigma$（同） |
| Zomma | gamma 對 volatility | $\Gamma\,(d_1d_2-1)/\sigma$（同） |
| Charm | delta 對時間 | 形式較長，略 |
| Color | gamma 對時間 | 形式較長，略 |
| Vega decay | vega 對時間 | 形式較長，略 |

**例題的 Greeks（18.5 的 call）。** $\Delta=E N(d_1)=0.5062$；$\Gamma=n(0.01546)/(50\times0.21213)=0.0376$；vega $=0.141$（每 1 vol 點）；每日 theta $=-0.01395$；rho $=0.5\times52e^{-0.02}\times0.42204/100=0.1076$；elasticity $=0.5062\times50/3.797=6.67$。

### 18.7 一個好用的近似：40% 法則

> 💡 **一句話**：at-the-forward option ≈ 0.4 × forward price × σ√t；σ√t 越大越會高估。

**推導。** 令 option 恰好 at-the-forward（$F=X$）、$r=0$、$t=1$、$\sigma=1\%$。則 $\ln(F/X)=0$，$d_1=+\sigma\sqrt t/2=0.005$，$d_2=-0.005$。

$$
N(0.005)-N(-0.005)\approx n(0)\times(d_1-d_2)=0.398942\times0.01=0.00399
$$

所以每 1 個百分點的 volatility，at-the-forward option（1 年）約值 $0.00399\times X$。因為 ATM option 的 vega 對 volatility 幾乎不變、價值又與 $\sqrt t$ 及 strike 成正比，可得：

$$
\text{到期期望值}\approx 0.4\times F\times\sigma\sqrt t
\qquad\text{理論價}\approx\frac{0.4\,F\sigma\sqrt t}{1+rt}\;(\text{或乘 }e^{-rt})
$$

直覺：ATM option 的 expected value 約為「一個 standard deviation $F\sigma\sqrt t$ 的 40%」。這對 call 與 put 都成立（平價關係下，at-the-forward 的 call = put）。

**數值例題。**
- $F=80$、$\sigma=25\%$、3 個月：$0.4\times80\times0.25\times0.5=4.00$；精確 Black 值 $3.987$。若 $r=5\%$，折現 $4.00/1.0125=3.951$；精確 $3.937$。
- $F=200$、$\sigma=18\%$、1 個月：$0.4\times200\times0.18\times\sqrt{1/12}=4.157$；精確 $4.145$。
- **高估的情況**：$F=80$、$\sigma=50\%$、2 年：近似 $22.63$，精確 $22.11$。$\sigma\sqrt t$ 越大，ATM vega 隨 volatility 上升略為下降，近似就越偏高。

### 18.8 Delta：$N(d_1)$ 不是機率

> 💡 **一句話**：Delta 是 N(d1)、ITM 機率是 N(d2)，delta 永遠比較大；ATM straddle 帶正 delta。

- Delta $=N(d_1)$（股票，$b=r$）。第 7 章說 delta「約等於」到期 ITM 機率；但真正的（風險中立）ITM 機率是 $N(d_2)$。因 $d_1>d_2$，**delta 永遠大於 ITM 機率**；短天期時兩者很接近。
- at-the-forward 的 call delta 略大於 50，put delta $=$ call delta $-100$，絕對值略小於 50，所以**at-the-forward straddle 的 delta 為正**。

**Straddle 何時恰好 delta 中性？** 需 call delta $=|$put delta$|$，即 $N(d_1)=0.5$，$d_1=0$：

$$
\ln(S/X)+(b+\sigma^2/2)t=0\;\Rightarrow\;S=Xe^{-(b+\sigma^2/2)t}
$$

時間或 volatility 越大，中性價格越往 strike 下方移（call 更 OTM、put 更 ITM）。

**數值例題。** $X=100$、$\sigma=30\%$、$t=1$：
- futures option $b=0$：$S=100e^{-0.045}=95.60$
- 股票 option $b=r=5\%$：$S=100e^{-0.095}=90.94$
- futures option 但只剩 3 個月：$S=100e^{-0.01125}=98.88$
- at-the-forward（$F=X=100$，$b=0$）時：call delta $=0.5596$，straddle delta $=+0.119$（約 +12），而 ITM 機率 $N(d_2)=0.440$。

### 18.9 Theta 的三個成分

> 💡 **一句話**：Theta = 波動價值衰減 + 現貨走向遠期 + 現值變化，第一項幾乎總是主角。

以 call 為例，年化 theta 可拆成：

| 成分 | 公式 | 意義 |
|---|---|---|
| ① 波動價值衰減 | $-\dfrac{SE\,n(d_1)\sigma}{2\sqrt t}$ | 時間變短，到期價格分布變窄（call/put 相同、恆為負） |
| ② 現貨走向遠期 | $-(b-r)SE\,N(d_1)$ | 股票：$b=r$ 時為 0；有 dividend 或外匯時不為 0 |
| ③ expected value 的現值變化 | $-rXe^{-rt}N(d_2)$（call）/ $+rXe^{-rt}N(-d_2)$（put） | 離到期越近，exercise 金折現越少 |

① 幾乎總是主導項。若 $r=0$，或 futures option 採 futures-type settlement（$b=r=0$），②③ 都消失，只剩 ①，稱為**無漂移 theta**（driftless theta）。

**數值例題（18.5 條件，$b=r$ 所以 ② = 0）。**
- ① $=-50\times n(0.01546)\times0.30/(2\times0.7071)=-4.231$（年）
- ③ call $=-0.04\times52e^{-0.02}\times0.42204=-0.860$（年）
- call theta $=(-4.231-0.860)/365=-0.01395$／天
- put ③ $=+0.04\times52e^{-0.02}\times0.57796=+1.178$，put theta $=(-4.231+1.178)/365=-0.00836$／天

put 的利息項為正：持有深價內（deep in-the-money, deep ITM）歐式 put 時，時間流逝反而讓「延後收到 exercise 金」的損失變小。

### 18.10 Gamma、Theta、Vega 的極大值到底在哪

> 💡 **一句話**：Gamma、vega、theta 的高峰都不剛好在 strike；b = 0 時 gamma 偏下方、vega 和 theta 偏上方。（細節可先跳過）

「ATM 時 gamma/theta/vega 最大」和「ATM delta = 50」一樣，只是近似。精確位置（以 underlying 價格表示）：

| 條件 | 位置 |
|---|---|
| Delta = 50 | $S=Xe^{(-b-\sigma^2/2)t}$ |
| Gamma 最大 | $S=Xe^{(-b-3\sigma^2/2)t}$ |
| Vega 最大 | $S=Xe^{(-b+\sigma^2/2)t}$ |
| Theta 最大（$b=r$ 或 $b=r=0$） | $S=Xe^{(b+\sigma^2/2)t}$ |

**以 $b=0$（$r=0$）為例：** gamma 最大值出現在**低於**strike 處；theta 與 vega 最大值出現在**同一個高於**strike 處。提高利率（$b>0$）會讓 gamma 與 vega 的極值位置下移、theta 的極值位置上移。

*（註：原書內文對 $b=0$ 的文字描述與其公式／圖不一致；上表與以下數字皆以 Python 數值最佳化驗證，以公式為準。）*

**數值例題（$X=100$、$\sigma=30\%$、$t=1$）：**

| | $b=r=0$ | $b=r=5\%$ |
|---|---|---|
| Delta 50 | 95.60 | 90.94 |
| Gamma 最大 | 87.37 | 83.11 |
| Vega 最大 | 104.60 | 99.50 |
| Theta 最大 | 104.60 | 109.97 |

延伸：在不太極端的區域，gamma 最大處 speed = 0、theta 最大處 charm = 0、vega 最大處 vanna = 0（極值點即導數為零之處）。

**Vega 一定隨時間增加嗎？** 對 futures option（underlying 就是遠期），是。對股票 option，延長時間會讓 forward price $Se^{rt}$ 上升，ATM call 逐漸變成 ITM，vega 可能先升後降。
數值（$S=X=100$、$\sigma=25\%$）：

| $r$ | vega（t=1） | vega（t=2） | vega（t=4） | vega 對 t 的峰值 |
|---|---|---|---|---|
| 0% | 0.396 | 0.555 | 0.773 | 一直上升 |
| 10% | 0.348 | 0.428 | 0.460 | 約 3.6 年 |
| 15% | 0.307 | 0.334 | 0.279 | 約 1.9 年 |

峰值之後，vega decay（vega 對時間的變化）變號。

## 交易員視角

- **心算報價（quote）**：在 Optibook 這類交易所做市（market making）時，你沒時間開模型。$0.4F\sigma\sqrt t$ 能讓你在幾秒內判斷一張 ATM option quote 是否離譜。例如 $F=100$、IV 20%、1 個月：$0.4\times100\times0.2\times0.289\approx2.31$。若市場 ask 在 1.90，值得細看。
- **反推隱含波動率（implied volatility）**：同一公式反過來，$\sigma\approx\text{價格}/(0.4F\sqrt t)$。ATM straddle 價格 ≈ $0.8F\sigma\sqrt t$。
- **Delta ≠ 機率**：把 delta 當成到期 ITM 機率會系統性高估，尤其是長天期、高波動的 option。用於風控時（例如「這張賣出的 put 有多大機會被 exercise」），用 $N(-d_2)$。
- **Straddle 不是天生 delta 中性**：買入 ATM straddle 時，記得它帶正 delta；以 IOC 單賣少量 underlying 才能真正中性。
- **Theta 的利息項**：利率高時，deep ITM 歐式 put theta 可能為正——這是第 16 章提前履約（early exercise）討論的根源。
- **Greeks 峰值偏移**：持有大量同一 strike 的短 gamma position 時，最危險的價位不是剛好在 strike，而是略低於 strike（gamma 峰值）；vega 風險則集中在略高處。

## 常見誤區

1. **誤解**：$N(d_1)$ 是到期 ITM 機率。→ **正解**：ITM 機率是 $N(d_2)$；$N(d_1)$ 是 delta，也是「以股票本身計價」下的機率，恆大於 $N(d_2)$。
2. **誤解**：ATM option 的 delta 是 50、straddle 是 delta 中性。→ **正解**：at-the-forward 的 call delta 略大於 50；要讓 straddle 中性，underlying 需低於 strike $e^{-(b+\sigma^2/2)t}$ 倍。
3. **誤解**：gamma、theta、vega 都在 strike 處最大。→ **正解**：gamma 峰值在 $Xe^{(-b-3\sigma^2/2)t}$（偏低），vega 在 $Xe^{(-b+\sigma^2/2)t}$；只有在 $\sigma\sqrt t$ 很小時才近似重合。
4. **誤解**：40% 法則是精確的。→ **正解**：它只對 at-the-forward 成立，且 $\sigma\sqrt t$ 大時會高估。
5. **誤解**：vega 一定隨到期時間增加。→ **正解**：股票 option 在高利率下，長天期的 vega 可能下降。
6. **誤解**：方程中的 $\sigma$、$r$ 也是變數。→ **正解**：模型假設它們固定；只有 $S$、$t$ 變動（這正是之後各章要放寬的假設）。

## 重點摘要

| 項目 | 公式／規則 |
|---|---|
| call | $C=Se^{(b-r)t}N(d_1)-Xe^{-rt}N(d_2)$ |
| $d_1$ | $[\ln(S/X)+(b+\sigma^2/2)t]/(\sigma\sqrt t)$ |
| $d_2$ | $d_1-\sigma\sqrt t$（中位數，ITM 機率 $N(d_2)$） |
| 到期 expected value | $F\,N(d_1)-X\,N(d_2)$，折現得理論價 |
| $N(x)$ | $N(-x)=1-N(x)$，$N(0)=0.5$，$n(0)=0.3989$ |
| $b$ | 股票 $r$；dividend $r-q$；futures $0$；futures-type settlement $b=r=0$；外匯 $r-r_f$ |
| 40% 法則 | at-the-forward 價值 ≈ $0.4F\sigma\sqrt t$（再折現） |
| Delta-中性 straddle | $S=Xe^{-(b+\sigma^2/2)t}$ |
| Gamma 峰值 | $Xe^{(-b-3\sigma^2/2)t}$ |
| Vega 峰值 | $Xe^{(-b+\sigma^2/2)t}$ |
| Theta 峰值（$b=r$） | $Xe^{(b+\sigma^2/2)t}$ |
| Theta 成分 | 波動衰減 + 現貨走向遠期 + 現值變化 |
| 單位 | theta/365 → 每日；vega、rho/100 → 每 1 個百分點 |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A2、B2、B3、B5）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** Black-Scholes 方程中哪兩個量被當成變數？哪兩個被當成常數輸入？這和第 8 章的 dynamic hedging 有什麼關係？

<details><summary>解答</summary>

變數：underlying 價格 $S$ 與時間 $t$。常數輸入：volatility $\sigma$、利率 $r$。第 8 章的 dynamic hedging 例子也假設只有 underlying 價格與時間變動，其餘條件固定；方程描述的正是「在這些假設下，正確 hedge 的 position 剛好打平」時 option 價格必須滿足的條件。

</details>

**A2.** ⭐ 用一句話分別說明 $F\,N(d_1)$ 與 $X\,N(d_2)$ 的意義。

<details><summary>提示</summary>

回想 18.3 的「兩個問題」：第一個問「strike 以上的股票平均值多少」，第二個問「要付 strike 的機會多大」。這兩項各對應哪一個？

</details>

<details><summary>解答</summary>

$F\,N(d_1)$：到期時，strike 以上（ITM 情境）的股票平均價值（OTM 情境記為 0）。$X\,N(d_2)$：到期時平均會付出的 exercise 金額，即 ITM 機率 $N(d_2)$ 乘以 strike。兩者相減是 call 到期 expected value。

</details>

**A3.** 為什麼 $d_1$ 的分子要加 $\sigma^2t/2$，而 $d_2$ 又要減掉 $\sigma\sqrt t$？

<details><summary>解答</summary>

lognormal distribution 右尾較長，平均數在眾數右邊，右移量為 $\sigma^2t/2$（以對數尺度計）；計算「strike 以上股票的平均價值」要以平均數為基準，所以加上這一項。計算「被 exercise 的機率」要用把次數一分為二的中位數，中位數在平均數左方一個 $\sigma\sqrt t$（標準化後恰好 1 個單位 $\sigma\sqrt t$），所以 $d_2=d_1-\sigma\sqrt t$。

</details>

**A4.** at-the-forward straddle 的 delta 是正、負還是零？為什麼？

<details><summary>解答</summary>

正。$F=X$ 時 $d_1=\sigma\sqrt t/2>0$，$N(d_1)>0.5$，所以 call delta 略大於 50，put delta $=$ call delta $-100$，絕對值略小於 50，相加為正。

</details>

**A5.** 哪些情況下 theta 只剩「波動價值衰減」一項？

<details><summary>解答</summary>

當 $r=0$（同時 $b=0$），或 futures option 採 futures-type settlement（$b=r=0$）時，現貨走向遠期項與現值變化項都為零，只剩 $-SE\,n(d_1)\sigma/(2\sqrt t)$，稱為無漂移 theta。

</details>

**A6.** 為什麼 40% 法則在 $\sigma\sqrt t$ 大時會高估？

<details><summary>解答</summary>

法則假設每一個 vol point 的價值相同（ATM vega 為常數）。實際上 ATM vega 會隨 volatility（及時間）上升而略為下降，所以把第一個點的價值直接乘上總點數會高估；$\sigma\sqrt t$ 越大，誤差越明顯。

</details>

### B. 計算題

**B1.** $S=100$、$X=95$、$t=0.25$、$r=3\%$、$\sigma=20\%$，無 dividend。求 $d_1$、$d_2$、$N(d_1)$、$N(d_2)$、call 與 put 價值。

<details><summary>解答</summary>

$\ln(100/95)=0.05129$；$(r+\sigma^2/2)t=(0.03+0.02)\times0.25=0.0125$；$\sigma\sqrt t=0.10$。
$d_1=(0.05129+0.0125)/0.10=0.6379$；$d_2=0.5379$。
$N(d_1)=0.7382$；$N(d_2)=0.7047$。
$Xe^{-rt}=95e^{-0.0075}=94.290$。
$C=100\times0.7382-94.290\times0.7047=7.379$。
$P=C-S+Xe^{-rt}=7.379-100+94.290=1.669$。

</details>

**B2.** ⭐ futures 價格 150、ATM、6 個月、IV 32%、利率 4%（stock-type settlement）。用 40% 法則估計理論價，並與精確 Black 值比較。

<details><summary>提示</summary>

第一步算 √0.5 ≈ 0.7071，代入 0.4 × F × σ × √t 得到到期 expected value；第二步除以 (1 + r × t) 折現，再和題目給的精確值比。

</details>

<details><summary>解答</summary>

expected value ≈ $0.4\times150\times0.32\times\sqrt{0.5}=13.576$。折現（單利）$13.576/(1+0.04\times0.5)=13.310$。精確 Black 值 $=13.244$。近似高估約 0.07，主因是 0.4 比 0.3989 稍大，以及 vega 隨 volatility 略降。

</details>

**B3.** ⭐ futures option $X=60$、$\sigma=40\%$、$t=0.5$，$b=0$。futures 價格為多少時 60 straddle 恰好 delta 中性？

<details><summary>提示</summary>

futures option b = 0，用 straddle 中性公式：S = X × e 的 −(b + σ²/2) × t 次方。先算 σ²/2 × t 是多少。

</details>

<details><summary>解答</summary>

$S=60e^{-(0+0.16/2)\times0.5}=60e^{-0.04}=57.647$。

</details>

**B4.** futures option $X=200$、$\sigma=25\%$、$t=1$、$b=0$。gamma 與 vega 的極大值各出現在哪個 futures 價格？

<details><summary>解答</summary>

Gamma：$200e^{-1.5\times0.0625}=200e^{-0.09375}=182.10$。
Vega：$200e^{0.5\times0.0625}=200e^{0.03125}=206.35$。

</details>

**B5.** ⭐ 某離散到期分配（200 次）：價格 90／100／110／120／130 各出現 30／70／50／35／15 次。strike 105 的 call（忽略利率），用「兩個問題」法求 expected value，並用傳統法驗算。

<details><summary>提示</summary>

先挑出 ITM 的價格（高於 105 的）。問題 1：ITM 價格 × 次數加總 ÷ 200；問題 2：ITM 次數 ÷ 200 再乘 105。兩者相減。驗算可用（價格 − 105）× 次數加總 ÷ 200。

</details>

<details><summary>解答</summary>

ITM 情境：110、120、130，共 $50+35+15=100$ 次。
問題 1：$(110\times50+120\times35+130\times15)/200=(5500+4200+1950)/200=11650/200=58.25$。
問題 2：機率 $100/200=0.5$，平均支付 $0.5\times105=52.50$。
expected value $=58.25-52.50=5.75$。
驗算：$(5\times50+15\times35+25\times15)/200=(250+525+375)/200=1150/200=5.75$ ✓

</details>

**B6.** 已知 $N(0.8)=0.7881$，求 $N(-0.8)$，以及標準常態下落在 $-0.8$ 與 $0.8$ 之間的機率。

<details><summary>解答</summary>

$N(-0.8)=1-0.7881=0.2119$。區間機率 $=0.7881-0.2119=0.5763$。

</details>

**B7.** 延續 B1，計算 call 的每日 theta（拆成兩個成分）與 elasticity。

<details><summary>解答</summary>

$n(d_1)=n(0.6379)=0.3255$。
① $=-100\times0.3255\times0.20/(2\times0.5)=-6.510$（年）
③ $=-0.03\times94.290\times0.7047=-1.993$（年）
每日 theta $=(-6.510-1.993)/365=-0.0233$。
Elasticity $=0.7382\times100/7.379=10.00$。

</details>

### C. 交易情境題

**C1.** 你在 Optibook 上替一檔 futures option market making。futures 120，1 個月後到期的 120 call 市場 quote 2.60–2.80。你估計 volatility 25%（利率忽略）。不開模型，你會怎麼 quote？

<details><summary>解答</summary>

40% 法則：$0.4\times120\times0.25\times\sqrt{1/12}=3.46$。即使考慮近似稍微高估（精確值約 3.45），市場 2.60–2.80 相當於 implied volatility 約 $2.70/(0.4\times120\times0.2887)\approx19.5\%$，遠低於你的 25%。合理動作：在 2.80 或附近積極買進（甚至提高買價到 3.0 以上 quote），並以 futures 賣出約 0.51 delta（at-the-forward call delta 略大於 50）hedge。也要問自己：市場為何只給 19.5%？是否有你不知道的資訊？部位上限（position limit）也要預留。

</details>

**C2.** 你持有一大筆短 straddle，strike 100，futures 100，$\sigma=30\%$、$t=1$。同事說「ATM 最危險，現在就是最壞的位置」。你同意嗎？

<details><summary>解答</summary>

不完全同意。gamma 峰值在 $100e^{-0.135}=87.4$，所以若 futures 下跌到 87 附近，短 gamma 風險反而更大；vega 與 theta 峰值在 $100e^{0.045}=104.6$，若 futures 略漲，vega 風險（IV 上升的損失）最大、但 theta 收入也最大。此外 straddle 在 $F=100$ 時帶正 delta（約 +12/口），身為賣方你其實是短 delta 約 −12，需買進 futures 中性化。風控應以情境表看不同價位的 gamma/vega，而非只盯著 strike。

</details>

### D. 挑戰題

**D1.** (a) 證明 $S\,n(d_1)=Xe^{-rt}n(d_2)$（$b=r$）。(b) 用它說明為什麼 $\partial C/\partial S=N(d_1)$，即使 $d_1$、$d_2$ 本身也依賴 $S$。(c) 用 $N(\epsilon)-N(-\epsilon)\approx 2\epsilon\,n(0)$ 推導 40% 法則。

<details><summary>解答</summary>

(a) $n(d_2)=n(d_1-\sigma\sqrt t)=n(d_1)\exp(d_1\sigma\sqrt t-\sigma^2t/2)$。而 $d_1\sigma\sqrt t=\ln(S/X)+rt+\sigma^2t/2$，所以指數 $=\ln(S/X)+rt$，$n(d_2)=n(d_1)\cdot\frac{S}{X}e^{rt}$，移項即得 $Xe^{-rt}n(d_2)=S\,n(d_1)$。數值檢查（B1）：兩邊都等於 32.549。

(b) $\partial C/\partial S=N(d_1)+S\,n(d_1)\frac{\partial d_1}{\partial S}-Xe^{-rt}n(d_2)\frac{\partial d_2}{\partial S}$。因 $\partial d_1/\partial S=\partial d_2/\partial S=1/(S\sigma\sqrt t)$，且由 (a) 兩個 $n$ 項係數相等，後兩項抵銷，剩 $N(d_1)$。

(c) $F=X$、$r=0$：$C=F[N(\sigma\sqrt t/2)-N(-\sigma\sqrt t/2)]\approx F\cdot2\cdot\frac{\sigma\sqrt t}{2}\cdot n(0)=0.3989\,F\sigma\sqrt t\approx0.4F\sigma\sqrt t$。

</details>

## 自我檢核清單

- [ ] 能寫出 Black-Scholes 方程，並說出每一項對應的 Greek 與交易意義
- [ ] 能不看筆記寫出 $d_1$、$d_2$，並說出四個組成部分
- [ ] 能區分眾數、中位數、平均數，並說明它們與 $d_1$、$d_2$ 的關係
- [ ] 能用「兩個問題」拆解任一離散分配的 call expected value
- [ ] 能心算 $0.4F\sigma\sqrt t$ 並知道何時高估
- [ ] 能說明 delta 與 ITM 機率的差別
- [ ] 能算出 straddle 中性價位及 gamma／vega／theta 的峰值位置
- [ ] 能拆解 theta 三成分並判斷 put theta 何時可能為正
- [ ] 能依 underlying 類型選擇 $b$

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab03_pricing_models.py`](../labs/exercises/lab03_pricing_models.py)：實作 `norm_pdf`、`norm_cdf`、`norm_cdf_approx`、`expected_value`、`option_value_from_distribution`、`d1_d2`、`bs_call`、`bs_put`、`put_from_call_parity`、`black76`、`prob_itm`、`monte_carlo_price`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab03_pricing_models.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`lab03_pricing_models`](../labs/)：以機率 expected value 法與 Black-Scholes 定價，實作 $N(x)$、$d_1/d_2$，並比較 40% 法則與精確值。
- 延伸：[`lab05_greeks`](../labs/) 比較本章解析 Greeks 與數值差分，並以數值最佳化找出 gamma／vega 峰值位置。
