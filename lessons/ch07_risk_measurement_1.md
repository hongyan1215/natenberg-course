# 第 7 章　風險衡量 I（Risk Measurement I）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：Greeks 就是選擇權（option）部位（position）的「儀表板」——delta 看方向、gamma 看速度、theta 看時間、vega 看隱含波動率（implied volatility），一眼看出這個 position 怕什麼、希望市場怎麼走。

**你只需要先記住這 5 件事**

1. **Delta = 方向。** 買權（call） 0～100、賣權（put） −100～0、標的（underlying）永遠 100；每 100 deltas ≈ 1 口 underlying。例：call delta 30、underlying 漲 1.50 → option 約漲 0.45。
2. **Gamma = delta 會變多快。** 買 option（不管 call 或 put）就是正 gamma，賣就是負 gamma。underlying 漲就把 gamma「加」到 delta，跌就「減」。
3. **Gamma 和 theta 幾乎總是異號。** 要嘛市場大動幫你（+gamma），要嘛時間經過幫你（+theta），不能兩者兼得。
4. **Gamma 對應「實現波動率（realized volatility）」，vega 對應「implied volatility」。** 兩者常一起動，但不必然：underlying 越來越動，implied volatility 也可能下跌。
5. **所有 Greeks 都能加總。** 每個合約的 Greek × 口數（買 +、賣 −）全部相加，就是整個 position 的風險；再用「優勢 ÷ vega」估 position 的損益兩平波動率（breakeven volatility）。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 價格變動（小幅） | delta（換回小數）× underlying 變動 |
| 避險（hedge）要交易幾口 underlying | position 總 delta ÷ 100，方向相反 |
| 大幅移動後的新價值 | 原價 + 平均 delta × 變動；平均 delta = delta + ½ × gamma × 變動 |
| 新 delta | 漲：delta + gamma × 點數；跌：delta − gamma × 點數 |
| breakeven volatility | 模型波動率（volatility） − 優勢 ÷ vega（單位：百分點） |

**必做練習（約 20 分鐘）**：A3、B2、B3、B4（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[選擇權價格與 Greeks](https://hongyan1215.github.io/natenberg-course/tools/option-explorer/)工具，拖動股價和天數，看 delta、gamma、theta、vega 的形狀怎麼變。

---

## 本章定位

option 交易員不只承擔「方向」風險：underlying 價格、volatility、時間、利率、股利（dividend）任何一個輸入值變動，都會改變 position 價值。本章介紹衡量這些風險的「希臘字母」（the Greeks）：delta、gamma、theta、vega、rho，並示範如何把它們加總成整個 position 的風險輪廓。前置章節：[ch05 定價模型](ch05_pricing_models.md)（理論價值（theoretical value）、中立 hedge）、[ch06 波動率](ch06_volatility.md)（volatility 的意義與縮放）。

> 對應原書：第 7 章〈Risk Measurement I〉

## 學習目標

讀完本章，你應該能：

1. 說明 underlying 價格、volatility、時間、利率、dividend 變動對 call 與 put 價值的「方向」影響，並能區分股票 option、期貨選擇權（futures option）（兩種結算（settlement）方式）、外匯 option 的利率效果。
2. 用四種角度解釋 delta（變化率、避險比率（hedge ratio）、等值 underlying position、近似價內（in-the-money, ITM）機率），並計算 hedge 所需的 underlying 口數。
3. 用 gamma 更新 delta，並用「平均 delta」法估計 underlying 大幅移動後的 option 新價值。
4. 解釋 theta、vega、rho 的單位與正負號，並判斷何時會出現正 theta。
5. 把多個 position 的 Greeks 加總，判斷 position 希望市場「往哪走、走多快、implied volatility 漲或跌」。
6. 用「理論優勢（theoretical edge） ÷ vega」估計一個 position 的 breakeven volatility（position 的 implied volatility）。

## 核心概念

### 7.1 市場條件變動的方向效果

> 💡 **一句話**：underlying 漲 → call 漲、put 跌；volatility 升 → 兩者都漲；時間過 → 兩者都跌。利率和 dividend 的效果要看 underlying 與 settlement 方式。

**直覺**：call 是「看漲的權利」，put 是「看跌的權利」；兩者都是「保險」，所以不確定性（volatility）越高都越值錢；時間價值（time value）會隨時間流逝而消失。

| 若…… | call 價值 | put 價值 |
|---|---|---|
| underlying 價格上漲 | 上升 | 下降 |
| underlying 價格下跌 | 下降 | 上升 |
| volatility 上升 | 上升 | 上升 |
| volatility 下降 | 下降 | 下降 |
| 時間經過 | 下降（少數例外） | 下降（少數例外） |

**利率的效果比較複雜**，因為利率同時影響兩件事：

1. **遠期價格**（forward price）：利率越高，持有 underlying 的成本越高，forward price 越高 → call 漲、put 跌。
2. **option 本身的現值**：若 option 採「股票式結算（stock-type settlement）」（stock-type settlement，買方當下付清權利金（premium）），利率越高，未來報酬折現越多 → call、put 都跌。

**(a) 股票 option**：兩個效果對 call 方向相反，但股票價格遠大於 option 價格，forward price 效果勝出 → **利率升：call 升、put 跌**。

> 例：股價 80、履約價（strike price） 80、半年、volatility 25%、無 dividend。
> - $r=4\%$：call 6.41、put 4.82
> - $r=5\%$：call 6.61（+0.20）、put 4.63（−0.19）

**放空股票的特殊情形**：若 hedge 需要放空股票，放空者通常拿不到完整利息（借券成本，見 [ch02](ch02_forward_pricing.md)），等於「有效利率較低」→ forward price 較低 → call 較便宜、put 較貴。因此持有空頭股票 position 的交易員，理論上應願意以較低價賣 call、較高價買賣權（因為賣 call 或買賣權後要「買回」股票 hedge，正好抵銷空頭）。這帶出實務守則：

> **能避免放空股票就盡量避免。** 許多股票 option 交易員會刻意保留一些多頭股票，需要賣股 hedge 時就「賣出持股」而非放空。

**(b) futures option**：
- **期貨式結算（futures-type settlement）**（futures-type settlement，雙方都不付現，只有每日損益 settlement）：利率對 forward price 和現值都沒有影響 → **利率變動無效果**。
- **stock-type settlement**（美國慣例）：forward price 就是期貨（futures）價格本身，不受利率影響；但 premium 要先付，利率升會降低現值 → **call、put 都略跌**。影響很小，因為 option 價值相對 futures 價格小。

> 例：futures 80、strike 80、半年、volatility 25%，stock-type settlement。$r=4\%$ 時 call=put=5.523；$r=5\%$ 時都變 5.495（只差 0.028）。

**(c) 外匯 option**（交割實際貨幣）：受本國利率 $r_d$ 與外國利率 $r_f$ 兩個利率影響：

$$F = S\times\frac{1+r_d t}{1+r_f t}$$

- 外國利率升 → 分母變大 → $F$ 降 → call 跌、put 升。
- 本國利率升 → $F$ 升（且勝過現值效果）→ call 升、put 跌。

> 例：即期 1.1000，半年。$r_d=4\%, r_f=2\%$：$F=1.1000\times1.02/1.01=1.11089$。
> 本國利率升到 5%：$F=1.11634$（升）；外國利率升到 3%：$F=1.10542$（降）。

**利率效果總表**（「—」表不適用）：

| option 類型 | 本國利率升 | 本國利率降 | 外國利率升 | 外國利率降 |
|---|---|---|---|---|
| 股票 call | 升 | 降 | — | — |
| 股票 put | 降 | 升 | — | — |
| futures option（stock-type settlement）call/put | 降 | 升 | — | — |
| futures option（futures-type settlement） | 無效果 | 無效果 | — | — |
| 外匯 call | 升 | 降 | 降 | 升 |
| 外匯 put | 降 | 升 | 升 | 降 |

**(d) dividend**：dividend 提高 → 股票 forward price 降低 → call 跌、put 升；dividend 調降則相反。

> 例（股價 80、strike 80、半年、25%、$r=4\%$，dividend 在 3 個月後發放）：
>
> | dividend | call | put |
> |---|---|---|
> | 0 | 6.41 | 4.82 |
> | 1.00 | 5.85 | 5.25 |
> | 1.50 | 5.58 | 5.48 |

知道方向還不夠，我們還需要「幅度」——這就是 Greeks（又稱風險指標 risk measures，數學上是偏導數 partial derivatives）。

### 7.2 Delta（Δ）

> 💡 **一句話**：Delta 是方向風險：同時是斜率、hedge ratio、等值 underlying 口數，也近似 ITM 機率。

Delta 衡量 position 對 underlying**方向**的敏感度：正 delta 希望上漲，負 delta 希望下跌。Delta 有四種解讀。

#### 7.2.1 變化率（Rate of Change）

到期前，option theoretical value 是一條平滑曲線，深價內（deep in-the-money, deep ITM）時逼近內含價值（intrinsic value）（斜率 → 1），深價外（deep out-of-the-money, deep OTM）時逼近 0（斜率 → 0）。**Delta 就是 theoretical value 曲線在當前 underlying 價格的斜率**。

```
選擇權價值
   |                         ／ 斜率→1（深價內）
   |                      ／
   |                  .／ ← 理論價值曲線
   |              ..／
   |         ...  ／
   |.......     ／ ← 到期內含價值
   +-----------+------------- 標的價格
     斜率→0    履約價
```

- call delta 介於 0 與 1：不可能比 underlying 漲得快，也不可能反向。
- put delta 介於 −1 與 0。
- **underlying 本身 delta 永遠 = 1**。

實務慣例把小數點拿掉：call 0～100、put −100～0、underlying = 100（源自一口股票 option 對應 100 股）。本課程沿用此慣例；**但用 delta 計算價格變動時，要換回小數**。

> 例：call delta 30，underlying 上漲 1.50 → option 約漲 $0.30\times1.50=0.45$。
> put delta −20，underlying 上漲 0.80 → put 約跌 $0.20\times0.80=0.16$。

#### 7.2.2 避險比率（Hedge Ratio）

中立 hedge 所需「underlying 口數 : option 口數」 = $100 / |\Delta|$。

> 例 1：call delta 40 → $100/40=5/2$：每買 5 口 call，賣 2 口 underlying。
> 例 2：put delta −60 → $100/60=5/3$：每買 5 口 put，**買** 3 口 underlying（put 是負 delta，買賣權要買 underlying hedge）。

驗證：$+5\times40-2\times100=0$；$+5\times(-60)+3\times100=0$。所有 delta 加總為 0 的 position 稱為 **delta 中立**（delta neutral）。

第 8 章會看到：想要「實現」option theoretical value 的交易員，必須從 delta 中立開始，並在 option 整段生命期維持 delta 中立。

#### 7.2.3 等值標的部位（Theoretical / Equivalent Underlying Position）

每 100 deltas 相當於 1 口 underlying。

> 例：持有 15 口 delta 30 的 call = +450 deltas ≈ 多 4.5 口 underlying。
> 賣出 18 口 delta −25 的 put：$-18\times(-25)=+450$，風險方向相同。

**但這只是「理論」等值**：真實 underlying position 幾乎只對方向敏感；option position 還對 volatility、時間等敏感。只看 delta 的交易員可能忽略影響更大的其他風險。

**三種解讀其實是同一件事**：持有 +450 deltas 的人——
- 等值角度：像持有 4.5 口 underlying；
- hedge 角度：若要中立，須賣出 4.5 口 underlying；
- 變化率角度：underlying 漲 2.00，position 約賺 $4.5\times2.00=9.00$；跌 0.60，約虧 2.70。

#### 7.2.4 機率（Probability）

忽略正負號，delta 近似「到期時 ITM 的機率」：delta 20 的 call 約 20% 機會 ITM。價平（at-the-money, ATM）option delta 接近 50 也因此可以理解。

但要注意：
- 嚴格來說，接近 50 的是**價平遠期**（at-the-forward）option；利率、dividend 會讓看似價外（out-of-the-money, OTM）的 call delta 超過 50。
- Black-Scholes 中真正的（風險中立）ITM 機率是 $N(d_2)$，delta 是 $N(d_1)$。例：$S=50, K=52, t=0.25, \sigma=30\%, r=0$：$N(d_1)=0.426$、$N(d_2)=0.368$，兩者不同。
- **只看勝率會出事**：賣出 delta 10 的 option，十次有九次歸零；但若第十次的虧損大於前九次收入總和，期望值（expected value, EV）仍為負。交易要同時看「多常贏」和「贏輸多少」。

### 7.3 Gamma（Γ）

> 💡 **一句話**：Gamma 是 delta 變多快；買 option 就是正 gamma。大幅移動要用「平均 delta」估新價值。

**直覺**：delta 本身會隨 underlying 價格改變。把 delta 對 underlying 價格作圖，會得到一條 S 型曲線，斜率在 strike 附近最大，兩端趨近 0。**Gamma 就是 delta 曲線的斜率**，又稱曲率（curvature）。

**單位**：每 1 點 underlying 變動，delta 增減幾個 delta。

> 例：delta 30、gamma 4。underlying 漲 1 → delta 34；再漲 1 → 38。跌 1 → 26。（此處假設 gamma 固定，實際上 gamma 也會變。）

**關鍵性質**：
- 同 strike、同到期的 call 與 put **gamma 相同且皆為正**。
- 不論 call 或 put，underlying 上漲就把 gamma「加」到 delta，下跌就「減」。

> 例：ATM call delta 50、ATM put delta −50，gamma 都是 6。
> underlying 漲 1：call 50+6=56；put −50+6=−44（往 OTM 移，絕對值變小）。
> underlying 跌 1：call 44；put −56。

- 買 option（call 或 put）→ 正 gamma；賣 option → 負 gamma。
- 正 gamma position：漲時 delta 變多、跌時 delta 變少（對你有利）；負 gamma 相反。新手常被建議避免大的負 gamma，因為方向風險可能在極短時間內暴增。

#### 用平均 delta 估計新價值

Delta 是「瞬間」量，只適用於微小變動。若 underlying 從 $S_1$ 移到 $S_2$（$\Delta S=S_2-S_1$），delta 從 $\Delta$ 變成 $\Delta+\Gamma\,\Delta S$，取平均：

$$\bar\Delta=\Delta+\tfrac12\Gamma\,\Delta S$$

$$C_{\text{new}}\approx C+\Delta\cdot\Delta S+\tfrac12\Gamma(\Delta S)^2$$

（這正是泰勒展開的前兩項；計算時 delta、gamma 都用小數。）

> **例題**：$S=50, K=52, t=0.25, \sigma=30\%, r=0$。BS 給出：$C=2.15$、$\Delta=42.6$、$\Gamma=5.23$。underlying 漲到 53（$\Delta S=+3$）。
> - 只用原 delta：$2.15+3\times0.426=3.43$
> - 新 delta：$42.6+3\times5.23=58.3$；平均 delta $=(42.6+58.3)/2=50.45$
> - 平均 delta 估計：$2.15+3\times0.5045=3.66$
> - BS 實算：3.664 ✔（平均 delta 法誤差僅約 0.003，只用原 delta 低估了 0.23）

對 put 同樣適用，只要記得 delta 為負。

### 7.4 Theta（Θ）

> 💡 **一句話**：Theta 是每天的時間耗損，通常為負；ATM option 越接近到期耗得越快。

**直覺**：option 價值 = intrinsic value + time value；time value 隨時間消失，到期時只剩 intrinsic value。

**定義**：其他條件不變下，每經過一天 option 損失的價值，又稱時間耗損（time decay）。慣例寫成負數。

> 例：theta −0.04，今天價值 3.00 → 明天 2.96 → 後天 2.92（underlying 不動）。

**ATM option 的 theta 隨到期接近而加速**：

> 例（$S=K=50$、$\sigma=30\%$、$r=0$，BS 每日 theta）：
>
> | 剩餘天數 | 90 | 21 | 3 |
> |---|---|---|---|
> | theta | −0.017 | −0.035 | −0.100 |

**正 theta 可能嗎？** 可以，當 option 有「負 time value」時。條件：(1) stock-type settlement、(2) deep ITM、(3) 歐式（不能提前履約（early exercise））。

> 例：futures 100、strike 60 的歐式 futures call，半年、$r=6\%$。若 futures 到期仍在 100，到期值 = 40；但今天只值約 $40e^{-0.06\times0.5}\approx38.82$（BS 含微小 time value 算出 38.83）。futures 不動時，價值必須每天往 40 爬升 → theta 約 +0.006/天。
> 若是美式，大家今天就會履約（exercise）、把 40 拿去賺利息，所以不會出現這種情形（見 [ch16](ch16_early_exercise.md)）。

### 7.5 Vega

> 💡 **一句話**：Vega 是 implied volatility 每變 1 點的價值變化，call、put 都為正。

**定義**：volatility 每變動 1 個百分點，theoretical value 的變化。所有 option 都隨 volatility 上升而增值，所以**call、put vega 皆為正**。學術文獻常用 kappa（κ）或 nu（ν）代替（vega 不是希臘字母）。

> 例：vega 0.08、在 volatility 22% 時價值 1.90 → 24% 時約 $1.90+2\times0.08=2.06$；20% 時約 1.74。
> （BS 驗證：$S=K=40$、$t=0.25$、$r=3\%$，22%→24% 實際增加 0.158，與 $2\times0.079$ 吻合。）

### 7.6 Rho（Ρ）

> 💡 **一句話**：Rho 是利率每變 1 點的價值變化；股票 call 正、put 負，通常最不重要。

**定義**：利率每變動 1 個百分點，theoretical value 的變化。正負號依 underlying 與 settlement 方式而定（見 7.1 總表）：

- 股票 option：call rho 為正、put rho 為負。
- futures option、stock-type settlement：call put rho 都為負（利率升提高持有 option 成本）。
- futures option、futures-type settlement：rho = 0。
- 外匯 option 有兩個利率敏感度：rho₁（本國）與 rho₂（外國，有時記為 phi，Φ）。

利率通常是最不重要的輸入值，個人交易員很少擔心 rho；但持有巨大 position 的機構至少要知道自己的利率風險。

#### 標的本身的 Greeks

| | Delta | Gamma | Theta | Vega | Rho |
|---|---|---|---|---|---|
| underlying | 100 | 0 | 0 | 0 | 0 |

underlying delta 恆為 100 → gamma=0；不會耗損 → theta=0；不受 volatility 影響 → vega=0；從 option 交易員角度，利率不直接改變 underlying 價值 → rho=0。

#### 各部位 Greeks 正負號

| position | Delta | Gamma | Theta | Vega | Rho |
|---|---|---|---|---|---|
| 多 underlying | + | 0 | 0 | 0 | 0 |
| 空 underlying | − | 0 | 0 | 0 | 0 |
| 買 call | + | + | − | + | +（股票）／−（futures*） |
| 賣 call | − | − | + | − | −（股票）／+（futures*） |
| 買賣權 | − | + | − | + | −（股票）／−（futures*） |
| 賣 put | + | − | + | − | +（股票）／+（futures*） |

\*futures option 採 stock-type settlement 時；若 futures-type settlement，rho = 0。

### 7.7 解讀風險指標（Interpreting the Risk Measures）

> 💡 **一句話**：把每個合約的 Greeks × 口數加總，就知道 position 怕什麼；優勢 ÷ vega 可估 position 的 implied volatility。

position 只有幾口時，憑直覺就知道風險；position 跨多個 strike 與到期月時，就必須靠 Greeks。

**所有 Greeks 都可加總**：每個合約的 Greek × 口數（買為 +、賣為 −），全部相加。

#### 自創評價表

股票 50、剩 60 天、模型 volatility 30%、$r=5\%$、無 dividend（一口 = 100 股，表內為每股數字）：

| 合約 | 市價 | 理論值 | Delta | Gamma | Theta | Vega | Rho |
|---|---|---|---|---|---|---|---|
| 45 call | 5.80 | 5.91 | 84 | 4.0 | −0.017 | 0.049 | 0.059 |
| 50 call | 2.80 | 2.62 | 55 | 6.5 | −0.024 | 0.080 | 0.041 |
| 55 call | 0.95 | 0.88 | 26 | 5.3 | −0.018 | 0.065 | 0.020 |
| 45 put | 0.62 | 0.54 | −16 | 4.0 | −0.011 | 0.049 | −0.014 |
| 50 put | 2.15 | 2.22 | −45 | 6.5 | −0.017 | 0.080 | −0.041 |
| 55 put | 5.35 | 5.43 | −74 | 5.3 | −0.010 | 0.065 | −0.070 |

（理論值與 Greeks 由 BS 計算後四捨五入；市價為自訂。）

**theoretical edge**：買進時 = 理論值 − 價格；賣出時 = 價格 − 理論值。underlying 的理論值就是成交價，所以**underlying 交易的 theoretical edge 恆為 0**。

#### 部位 1：賣 20 口 50 買權、買 11 口股票

| | 優勢 | Delta | Gamma | Theta | Vega | Rho |
|---|---|---|---|---|---|---|
| −20 × 50 call | 20×0.18 | −20×55 | −20×6.5 | −20×(−0.024) | −20×0.080 | −20×0.041 |
| +11 股票 | 0 | +1100 | 0 | 0 | 0 | 0 |
| **合計** | **+3.60** | **0** | **−130** | **+0.48** | **−1.60** | **−0.82** |

**逐項解讀**：

- **優勢 +3.60**：若模型輸入正確，長期平均能賺 3.60（以每股計；乘上合約乘數才是金額）。先問「有沒有正優勢」，就像賭場先確認賠率站在自己這邊。
- **Delta 0**：無方向偏好。
- **Gamma −130**：
  - 漲 1 點：delta = 0 + (−130) = −130；再漲 1 點：−260 → 越漲越希望跌。
  - 跌 1 點：delta = 0 − (−130) = +130；再跌：+260 → 越跌越希望漲。
  - 兩邊都不想要 → **負 gamma 希望市場不動或慢慢動**；正 gamma 希望大幅、快速波動。
  - Delta 是「方向」風險，gamma 是「幅度」（或「速度」）風險。position 1 最怕的是「快速」的任何方向大波動；若加上方向，負 delta + 負 gamma 的 position 最怕快速上漲。
- **Theta +0.48**：市場不動時每天約賺 0.48。**Gamma 與 theta 幾乎總是異號**，且大小相關：要嘛市場波動幫你（+gamma），要嘛時間幫你（+theta），不能兩者兼得。（利率因素偶爾會讓兩者同號，但數值都很小。）
- **Vega −1.60**：implied volatility 每升 1 點，position 價值少 1.60。
  - 重要區分：**gamma 對應「realized volatility」（underlying 實際波動），vega 對應「implied volatility」（市場對 option 的定價）**。兩者常相關但不必然——underlying 可能越來越動但 implied volatility 下跌，反之亦然（見 [ch11](ch11_volatility_spreads.md)）。
- **breakeven volatility**：用 vega 把優勢「用光」需要多少 volatility 變動？

$$\sigma_{BE}\approx\sigma_{\text{model}}-\frac{\text{Edge}}{\text{Vega}}=30\%-\frac{3.60}{-1.60}\%=30\%+2.25\%=32.25\%$$

  - volatility 31%：優勢 = 3.60 − 1.60 = 2.00；32%：0.40；33%：−1.20。
  - 精確值：50 call 在 2.80 的 implied volatility = 32.18%，近似值 32.25% 很接近。
  - breakeven volatility 就是**position 的 implied volatility**——不只單一 option，複雜 position 也有 implied volatility。
- **Rho −0.82**：利率每升 1 點，position 少 0.82（這裡主要來自賣出 call；利率升使 call 變貴，對空方不利）。

#### 其他部位（請自行判讀，答案見練習）

| position | 優勢 | Delta | Gamma | Theta | Vega | Rho |
|---|---|---|---|---|---|---|
| 2：+10 50 call、+10 50 put | −1.10 | +100 | +130 | −0.41 | +1.60 | 0.00 |
| 3：+10 45 call、−10 55 call | +1.80 | +580 | −13 | +0.01 | −0.16 | +0.39 |
| 4：+20 50 put、−10 45 put、+7 股票 | +2.20 | −40 | +90 | −0.23 | +1.11 | −0.68 |

**position 2 的優勢是負的**：這不是錯字。市況改變後，原本合理的 position 可能變成負 expected value；此時應設法平倉，持有越久越可能虧損。（例外：為了讓既有大 position 更安全，交易員有時會「故意」做一筆小幅負優勢的交易——這正是 hedge 的本質。）

#### 風險指標速查

| 若你的…為正 | 你希望… | 若為負 | 你希望… |
|---|---|---|---|
| Delta | underlying 上漲 | Delta | underlying 下跌 |
| Gamma | underlying 大幅或快速移動 | Gamma | underlying 不動或慢慢移動 |
| Theta | 時間經過使 position 增值 | Theta | 時間經過使 position 減值 |
| Vega | implied volatility 上升 | Vega | implied volatility 下降 |
| Rho | 利率上升 | Rho | 利率下降 |

**最後兩點提醒**：
1. 所有數字（理論值與各 Greek）都**持續變動**，今天的小風險可能是明天的大風險（見 [ch09](ch09_risk_measurement_2.md)）。
2. 不分析風險會失敗；但想分析每一種風險則會「分析癱瘓」（paralysis through analysis），永遠下不了單。Greeks 的功能是**辨識**風險，而非消除；聰明的交易員事先決定哪些風險可接受、哪些不行。

## 交易員視角

- **Optibook 做市（market making）**：你在 option 上掛限價買賣單被成交後，第一件事就是用 underlying（股票或 futures）把 delta 調回接近 0。用 `get_positions()` 取得 position，乘上每個合約的 delta，加總就是 position delta；再以 `insert_order(..., order_type='ioc')` 在 underlying 上 hedge。
- **部位限制（position limit）**：等值 underlying position 概念很實用——若你持有 +1,500 deltas，表示 hedge 需要賣出 15 口 underlying；先確認這不會讓 underlying position 超過交易所的 position limit，否則 hedge 單會被拒絕。
- **Gamma 決定 hedge 頻率**：負 gamma position 在市場快速移動時 delta 會迅速惡化，必須更頻繁再 hedge；但 Optibook 有請求速率限制（rate limit），迴圈要 `sleep`，因此大的負 gamma 在模擬盤上特別危險。
- **Vega 與 gamma 分開看**：模擬交易所其他隊伍的機器人會改變報價（quote）（implied volatility），即使 underlying 不動，你的 vega position 也會產生損益。
- **價格跳動限制**：交易所拒絕偏離最後成交價太遠的單；用平均 delta 法估算 underlying 跳動後的新 option 價，有助於在跳動後快速重新 quote。

## 常見誤區

1. **誤解**：put 是負的，所以 put gamma 也是負的。→ **正解**：買進任何 option 都是正 gamma；gamma 的正負取決於「買或賣」，不是「call 或 put」。
2. **誤解**：delta 50 的 ATM option 有 50% 機率 ITM，所以賣出 delta 10 的 option 勝率九成必賺。→ **正解**：delta 只是近似機率（BS 中機率是 $N(d_2)$），而且獲利取決於勝率 × 輸贏金額，低勝率的大虧損可吞掉所有小獲利。
3. **誤解**：delta 中立就沒有風險。→ **正解**：delta 中立只排除了「小幅方向」風險，gamma、vega、theta 風險仍在，且 delta 會隨價格、時間、volatility 改變。
4. **誤解**：用 delta 直接乘大幅價格變動就能估算新價格。→ **正解**：delta 是瞬間量；大幅變動要加上 $\tfrac12\Gamma(\Delta S)^2$（平均 delta 法）。
5. **誤解**：負 gamma 和負 vega 是同一件事。→ **正解**：gamma 對應 underlying 實際波動，vega 對應 implied volatility；兩者可以朝不同方向變化。
6. **誤解**：利率升，所有 option 都會漲（或都會跌）。→ **正解**：要看 underlying 與 settlement 方式：股票 call 升、股票 put 跌；stock-type settlement 的 futures option 兩者都跌；futures-type settlement 無影響。

## 重點摘要

| 項目 | 公式／規則 | 數字直覺 |
|---|---|---|
| Delta | $\partial V/\partial S$；call 0～100、put −100～0、underlying 100 | ATM 約 50 |
| hedge ratio | underlying 口數 = $\sum q_i\Delta_i/100$（反向） | delta 40 買 5 口 → 賣 2 口 underlying |
| Gamma | $\partial\Delta/\partial S$；call put 相同、恆正 | 漲加、跌減 |
| 新價值估計 | $C+\Delta\,\Delta S+\tfrac12\Gamma(\Delta S)^2$ | 比只用 delta 準很多 |
| Theta | 每日價值變化，通常為負 | ATM 越近到期越大 |
| 正 theta | stock-type settlement + deep ITM + 歐式 | 負 time value |
| Vega | 每 1 波動率點（vol point）的價值變化，call put 皆正 | implied volatility |
| Rho | 每 1 利率點；股票 call +、put − | 通常最不重要 |
| 加總 | position Greek $=\sum q_i\cdot G_i$ | underlying 只貢獻 delta |
| position implied volatility | $\sigma_{BE}\approx\sigma-\text{Edge}/\text{Vega}$ | position 1：32.25% |
| Gamma vs Theta | 幾乎總是異號、大小相關 | 不能兩者兼得 |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A3、B2、B3、B4）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 為什麼股票 call 在利率上升時會增值，但 stock-type settlement 的 futures call 在利率上升時會減值？

<details><summary>解答</summary>

利率對 option 有兩個效果：(1) 改變 forward price，(2) 改變 option 現值。股票的 forward price 隨利率上升，而且股價遠大於 option 價格，所以「forward price 上升」的效果勝過「現值下降」，call 淨增值。futures option 的 forward price 就是 futures 價格，不受利率影響，只剩「現值下降」這個效果，所以 call put 都略為減值。

</details>

**A2.** ATM call delta 50、gamma 6；ATM put delta −50、gamma 6。underlying 下跌 2 點後，兩者的 delta 各約為多少？用直覺解釋 put delta 的變化方向。

<details><summary>解答</summary>

下跌時減去 gamma × 點數：call $50-2\times6=38$；put $-50-2\times6=-62$。put 因 underlying 下跌而變得更 ITM，越來越像空頭 underlying，所以 delta 往 −100 移動（絕對值變大）。

</details>

**A3.** ⭐ 為什麼 gamma 與 theta 幾乎總是異號？

<details><summary>提示</summary>

想想正 gamma 從哪裡來（買還是賣 option？），買方付出的 time value 會隨時間怎樣？「市場移動」和「時間經過」誰幫誰？

</details>

<details><summary>解答</summary>

正 gamma 來自買進 option，買方付出 time value，時間經過時 time value 消失 → 負 theta；賣方收取 time value、時間對他有利（正 theta），但承擔 underlying 大幅移動的風險（負 gamma）。市場移動與時間經過是對立的兩股力量：若移動對你有利，時間就對你不利。只有利率造成的微小效果可能讓兩者同號。

</details>

**A4.** 某 position gamma 為負、vega 為正。請描述對此 position 最有利與最不利的市場情境。

<details><summary>解答</summary>

最有利：underlying 很平靜（realized volatility 低，對負 gamma 有利），同時市場預期未來會大動、implied volatility 上升（對正 vega 有利），例如重大消息公布前。最不利：underlying 劇烈波動，同時 implied volatility 下跌（例如消息公布後 underlying 大跳、但不確定性消除使 implied volatility 崩落）。

</details>

**A5.** 為什麼有交易員偏好在股票 option 帳戶中長期保有一些多頭股票？

<details><summary>解答</summary>

hedge 時若需要賣股票，可以直接賣持股，而不必放空。放空需要借券、拿不到完整利息（有效利率較低）、可能受法規限制，還會讓 option 的評價依賴「多頭或空頭股票 hedge」而不同。保有多頭股票就能一律用正常利率評價、避免放空的麻煩。

</details>

**A6.** 在什麼條件下 option 會出現正 theta？為什麼美式選擇權（American option）通常不會？

<details><summary>解答</summary>

需同時符合：stock-type settlement（premium 要現付，才有折現效果）、deep ITM（time value 幾乎為 0，折現效果主導）、歐式（不能 early exercise）。此時 option 價值是 intrinsic value 的現值，低於 intrinsic value（負 time value），隨時間經過往 intrinsic value 爬升。American option 持有人會立即 exercise、把 intrinsic value 拿去賺利息，所以價值不會低於 intrinsic value。

</details>

### B. 計算題

**B1.** 某 call delta 35，underlying 上漲 1.20，option 約漲多少？若 put delta −65，underlying 同樣上漲 1.20，put 約變化多少？

<details><summary>解答</summary>

call：$0.35\times1.20=+0.42$。put：$-0.65\times1.20=-0.78$（跌 0.78）。

</details>

**B2.** ⭐ 你買了 30 口 delta 40 的 call。要達成 delta 中立需要賣出幾口 underlying？若改為賣出 24 口 delta −75 的 put，又需如何 hedge？

<details><summary>提示</summary>

先算 position 總 delta = 口數 × delta（賣出要多乘一個負號），再除以 100 得到 underlying 口數，方向和 position delta 相反。

</details>

<details><summary>解答</summary>

call position $30\times40=+1200$ deltas → 賣 12 口 underlying。
賣出 put：$-24\times(-75)=+1800$ deltas → 賣 18 口 underlying。

</details>

**B3.** ⭐ 某 call 在 underlying 64.00 時：價值 2.80、delta 35、gamma 3。若 underlying 漲到 67.00，用平均 delta 法估計新價值；並與只用原 delta 的估計相比。

<details><summary>提示</summary>

第一步用 gamma 算出 67.00 時的新 delta；第二步取新舊 delta 的平均；最後原價 + 平均 delta（換成小數）× 3。

</details>

<details><summary>解答</summary>

新 delta $=35+3\times3=44$；平均 delta $=(35+44)/2=39.5$。
平均 delta 估計：$2.80+3\times0.395=3.985\approx3.99$。
只用原 delta：$2.80+3\times0.35=3.85$。兩者差 $\tfrac12\times0.03\times3^2=0.135$。

</details>

**B4.** ⭐ 某 position theoretical edge +4.50、vega −1.80，模型 volatility 26%。估計該 position 的損益兩平（breakeven）（隱含）volatility；並求 volatility 28% 時的 theoretical edge。

<details><summary>提示</summary>

用「模型 volatility − 優勢 ÷ vega」，注意 vega 是負的；28% 時的優勢 = 原優勢 + volatility 變動點數 × vega。

</details>

<details><summary>解答</summary>

$\sigma_{BE}\approx26\%-4.50/(-1.80)\%=26\%+2.5\%=28.5\%$。
28% 時優勢 $=4.50+2\times(-1.80)=0.90$。

</details>

**B5.** 某 position delta +20、gamma −80。若 underlying 上漲 1.5 點，新 delta 約為多少？若下跌 1.5 點呢？

<details><summary>解答</summary>

漲：$20+1.5\times(-80)=-100$。跌：$20-1.5\times(-80)=+140$。

</details>

**B6.** 使用 7.7 節評價表，計算 position「+10 口 55 call、−10 口 45 put」的 theoretical edge、delta、gamma、theta、vega（以市價成交）。

<details><summary>解答</summary>

- 優勢：買 55 call $10\times(0.88-0.95)=-0.70$；賣 45 put $10\times(0.62-0.54)=+0.80$；合計 $+0.10$。
- Delta：$10\times26-10\times(-16)=260+160=+420$。
- Gamma：$10\times5.3-10\times4.0=+13$。
- Theta：$10\times(-0.018)-10\times(-0.011)=-0.18+0.11=-0.07$。
- Vega：$10\times0.065-10\times0.049=+0.16$。

</details>

**B7.** 外匯即期 1.2500，本國利率 3%、外國利率 1%，期間 0.5 年。求遠期匯率；若外國利率升到 2%，遠期匯率變成多少？外匯 call 價值將如何變化？

<details><summary>解答</summary>

$F=1.25\times(1+0.015)/(1+0.005)=1.25\times1.015/1.005=1.26244$。
外國利率 2%：$F=1.25\times1.015/1.01=1.25619$（下降）→ 外匯 call 價值下降、put 上升。

</details>

### C. 交易情境題

**C1.** 你在 Optibook 上對某股票 option market making。目前 position：+40 口 ATM call、−21 口股票（一口 = 100 股的 underlying 單位）。股價突然上漲 1.5 點。(a) 現在的 position delta？(b) 你應如何調整？(c) 若交易所對該股票的 position limit 是 ±25 口，你會遇到什麼問題、怎麼辦？

<details><summary>解答</summary>

(a) 原 delta：$40\times52-21\times100=2080-2100=-20$。上漲後 call delta ≈ $52+1.5\times7=62.5$，position delta ≈ $40\times62.5-2100=+400$。
(b) 再賣出約 4 口股票，使空頭變為 25 口，回到接近中立（正 gamma position 上漲時賣、下跌時買，正是「低買高賣」）。
(c) 空頭 25 口剛好碰到上限；若再漲就無法再用股票 hedge。替代方案：賣出部分 call（或買賣權）降低 delta 與 gamma，或在其他 strike 賣出 option 建立反向 delta。事前就該考慮 position limit，不要讓 option position 大到無法用 underlying hedge。

</details>

**C2.** 評價表的 position 1（賣 20 口 50 call、買 11 口股票）建立後，市場傳出某重大訴訟將在下週判決，但股價暫時不動，implied volatility 卻從約 32% 升到 35%。(a) 你的 position 損益方向？(b) 你的模型 volatility 30% 若仍正確，應該怎麼做？

<details><summary>解答</summary>

(a) Vega −1.60，implied volatility 上升 3 點使 position 按市價約虧 $3\times1.60=4.80$（每股計），雖然股價不動、theta 還每天貢獻 +0.48。
(b) 若你仍相信未來實現波動率（future realized volatility）只有 30%，且你承受得起按市價的帳面虧損，可以維持 position、持續 delta hedge，讓 theta 與（低）realized volatility 慢慢實現優勢；甚至可考慮以更高價格加碼賣出。但「判決」本身代表 future realized volatility 很可能上升——這正是賣方最怕的跳空風險（負 gamma）。理性做法是重新評估 volatility 預測，必要時以買進較便宜、較遠期的 option 降低 gamma 風險，而不是單純相信原本的 30%。

</details>

### D. 挑戰題

**D1.** 證明在 $r=0$ 的 Black-Scholes 下，平均 delta 法得到的估計值即為價格對 $S$ 的二階泰勒展開，並用 7.3 節的例子（$S=50\to53$）說明剩餘誤差的來源。再說明：為什麼對一個 delta 中立、gamma 為 $\Gamma$ 的 position，underlying 移動 $\Delta S$ 的損益約為 $\tfrac12\Gamma(\Delta S)^2$？這和第 8 章的動態避險（dynamic hedging）有何關係？

<details><summary>解答</summary>

泰勒展開：$C(S+\Delta S)=C+C'\Delta S+\tfrac12C''(\Delta S)^2+\tfrac16C'''(\Delta S)^3+\dots$，其中 $C'=\Delta$、$C''=\Gamma$。平均 delta 法：$C+\Delta S\,(\Delta+\tfrac12\Gamma\Delta S)=C+\Delta\,\Delta S+\tfrac12\Gamma(\Delta S)^2$，正是前兩階。例子中估計 3.6658、實際 3.6640，差 −0.0018 來自三階以上項（speed，gamma 對 $S$ 的變化；此處 gamma 隨 $S$ 上移而略降）。

Delta 中立 position 的一階項為 0，只剩 $\tfrac12\Gamma(\Delta S)^2$：正 gamma 不論漲跌都賺（減去 theta 的時間成本），負 gamma 不論漲跌都賠（但每天收 theta）。第 8 章的 dynamic hedging 就是把這些 $\tfrac12\Gamma(\Delta S)^2$ 小額損益一段一段「收割」：每次再 hedge 就鎖定一次，總和與 theta 的總成本比較，決定 hedge 整體盈虧——這就是 realized volatility vs implied volatility 的競賽。

</details>

## 自我檢核清單

- [ ] 能不看表說出股票、futures（兩種 settlement）、外匯 option 在利率變動時 call 與 put 的方向。
- [ ] 能說出 delta 的四種解讀並各舉一個數字例子。
- [ ] 能算出任一 delta 的 hedge ratio 與需要買或賣的 underlying 口數。
- [ ] 能用 gamma 更新 delta，並用平均 delta 法估計新價格。
- [ ] 能解釋為何 ATM option theta 隨到期加速、何時會有正 theta。
- [ ] 能把多腿 position 的 Greeks 加總，並說出 position 希望的市場情境。
- [ ] 能區分 gamma（realized volatility）與 vega（implied volatility）。
- [ ] 能用 Edge/Vega 估計 position 的 implied volatility。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab05_greeks.py`](../labs/exercises/lab05_greeks.py)：實作 `delta`、`gamma`、`vega`、`theta`、`rho`、`lambda_elasticity`、`atm_greeks_approx`、`finite_difference_greeks`、`vanna`、`volga`、`taylor_pnl`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab05_greeks.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`../labs/`](../labs/) → **lab05_greeks**：用解析公式與數值差分計算 delta、gamma、theta、vega、rho，驗證本章的平均 delta 估計與 position 加總；Lambda 部分見 [ch09](ch09_risk_measurement_2.md)。
