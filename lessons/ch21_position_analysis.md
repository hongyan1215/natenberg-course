# 第 21 章　部位分析（Position Analysis）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：做市商（market maker）的部位（position）是客戶一筆一筆堆出來的大雜燴。本章教你拆解它：用合成（synthetic）關係翻譯成熟悉的策略、推想 Greeks 明天會怎麼變、看極端行情時剩下多少等效標的（underlying），再決定怎麼控制風險。

**你只需要先記住這 5 件事**

1. **put = call − underlying。** 把所有 put 換成「call + 空 underlying」，雜亂的 position 常會現出原形，例如其實是一個 condor 或 butterfly。
2. **Greeks 全是 0 也有風險。** Greeks 只描述現在；例如 risk reversal position，underlying 往上或往下走都會變成負 delta。
3. **淨合約 position 看尾端風險。** 上檔 = underlying + 淨 call 數；下檔 = underlying − 淨 put 數。大漲或大跌時，position 就像這麼多口 underlying。
4. **兩個快速估計。** delta 中性價位 ≈ S − Δ ÷ Γ；負 vega position 的兩平波動率（volatility） ≈ 評價 volatility + edge ÷ vega 絕對值。例：30% + 3.00 ÷ 0.5225 ≈ 35.7%。
5. **market maker 靠「報價（quote）偏移」和「分散」控制風險。** 想多買就把買價、賣價一起往上移；別讓風險集中在單一履約價（strike price）或單一月份。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| synthetic 改寫 | put = call − underlying；call = put + underlying |
| 上檔／下檔淨 position | underlying + 淨 call 數 ／ underlying − 淨 put 數 |
| Delta 中性價位 | S − Δ ÷ Γ |
| 兩平 volatility（負 vega position） | 評價 volatility + edge ÷ vega 絕對值 |
| 股票分割 Y for X | 口數、delta × Y/X；gamma × (Y/X)²；theta、vega、rho 不變 |

**必做練習（約 20 分鐘）**：A1、B1、B3、B4（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[策略損益建構器](https://hongyan1215.github.io/natenberg-course/tools/strategy-builder/)工具，自己組一個多腳 position，看損益曲線的斜率（delta）和彎曲（gamma）怎麼隨 underlying 價格改變。

---

## 本章定位

前幾章的價差策略只有幾條腿，風險一目了然；但 market maker 的 position 是客戶買賣一點一滴堆出來的：幾十個 strike、好幾個到期月、外加 underlying。本章教你如何拆解這種複雜 position：用 synthetic 關係改寫、看 Greeks 及其「在不同市況下如何變化」、看淨合約 position、估計損益兩平波動率（breakeven volatility），最後談 market maker 的工作方式、風險集中、情境規劃與股票分割。
前置章節：[ch07](ch07_risk_measurement_1.md)、[ch09](ch09_risk_measurement_2.md)（Greeks 與高階 Greeks）、[ch13](ch13_risk_considerations.md)（價差風險）、[ch14](ch14_synthetics.md)（合成部位（synthetic position））、[ch20](ch20_volatility_revisited.md)（期限結構調整 vega）。

## 學習目標

1. 能用買賣權平價（put-call parity）把含 call 與 put 的 position 改寫成單一種類，辨識其本質策略與方向。
2. 能解釋為什麼「所有 Greeks 都是 0」的 position 仍有風險，並推論 underlying、volatility、時間改變後 delta／gamma／theta／vega 的變化方向。
3. 能讀懂 position 損益圖與 Greeks 圖（微笑／皺眉、上移／下移）。
4. 能計算上檔／下檔淨合約 position、估計 delta 中性價位 $S-\Delta/\Gamma$、breakeven volatility $\sigma+\text{edge}/|\text{vega}|$。
5. 能說明 market maker 的義務與權利、三個核心問題，以及如何用 quote 偏移與分散化控制風險。
6. 能對股票分割（含非整數比例）調整 position、delta 與 gamma。

## 核心概念

### 21.1 用合成關係改寫部位

> 💡 **一句話**：把 put 換成「call − underlying」，複雜 position 常常就是一個熟悉的策略。

在模型普及之前，交易員常用 synthetic 關係把複雜 position「翻譯」成熟悉的策略。關鍵：$\text{put}=\text{call}-\text{標的}$（同 strike、同到期）。

**自創例題。** underlying 103，同一到期月：

| position | 數量 |
|---|---|
| underlying | −12 |
| 90 call / 90 put | +10 / +20 |
| 95 call / 95 put | +15 / −45 |
| 100 call / 100 put | −65 / +35 |
| 105 call / 105 put | +52 / −22 |

把每個 put 換成「call + 空 underlying」：

| | 原 call | 由 put 轉來的 call | 由 put 轉來的 underlying | 合計 call |
|---|---|---|---|---|
| 90 | +10 | +20 | −20 | **+30** |
| 95 | +15 | −45 | +45 | **−30** |
| 100 | −65 | +35 | −35 | **−30** |
| 105 | +52 | −22 | +22 | **+30** |

underlying：$-12-20+45-35+22=0$。整個 position 其實是 **long 90/95/100/105 call condor**：最希望 underlying 停在 95–100 之間。目前 103 → 希望 underlying 下跌 → **delta 為負**。改寫成全 put 也會得到同樣結論。

這種「剛好整齊」的例子是刻意設計的；真實 position 很少這麼乾淨，通常需要模型——而且即使有模型，也不一定看得到全貌。

### 21.2 所有 Greeks 都是 0，就沒有風險嗎？

> 💡 **一句話**：Greeks 只描述現在；underlying、volatility、時間一變，Greeks 全為 0 的 position 也會長出風險。

**自創例題。** 期貨選擇權（futures option）、利率 0、$\sigma=20\%$、10 週到期、underlying 99.12（這個價位恰好讓兩個選擇權（option）完全對稱）：

| | Delta | Gamma | Theta（日） | Vega |
|---|---|---|---|---|
| 90 put | −12.6 | 2.38 | −0.0128 | 0.0898 |
| 110 call | +12.6 | 2.38 | −0.0128 | 0.0898 |

position：**買 20 口 90 put、賣 20 口 110 call、買 5 口 underlying**（這是 risk reversal）。

- Delta：$20\times(-12.6)-20\times12.6+5\times100=-4\approx0$
- Gamma、Theta、Vega：兩邊相互抵銷，皆為 0

看起來毫無風險，若建倉有正的理論優勢（edge），豈不是穩賺？問題在於：**Greeks 只描述「現在」的風險**；明天的市況必然不同，即使價格與 volatility 不變，時間也會流逝。

**推論 Greeks 會怎麼變（並用模型驗證）：**

- **underlying 下跌**（往 90 靠近）：90 put 的 gamma 變大、110 call 的 gamma 變小 → position gamma 轉正；gamma 為正又在下跌 → delta 轉負。實算 95：delta −112、gamma +51.7、theta −0.256、vega +1.79。
- **underlying 上漲**（往 110 靠近）：110 call 的 gamma 變大 → position gamma 轉負；gamma 為負又在上漲 → delta 也轉負。實算 103：delta −93、gamma −43.7、theta +0.254、vega −1.78。
- 怪嗎？**往哪邊走 delta 都變負**，原因是 gamma 在下方為正、上方為負。
- **volatility 上升**：call delta 往 50、put delta 往 −50 靠近，我們買 put、賣 call → delta 變負。實算 24%：put −16.6、call +17.4，position delta −180。
- **volatility 下降**：delta 遠離 50，underlying position 主導 → delta 變正。實算 16%：position delta +196。
- **時間經過**：效果像 volatility 下降 → delta 變正。實算再過 5 週：+289。
- 在原價位上，時間或 volatility 改變對 gamma／theta／vega 的影響很小。

| 市況變化 | Delta | Gamma | Theta | Vega |
|---|---|---|---|---|
| underlying 上漲 | 負 | 負 | 正 | 負 |
| underlying 下跌 | 負 | 正 | 負 | 正 |
| 時間經過 | 正 | ≈0 | ≈0 | ≈0 |
| volatility 上升 | 負 | ≈0 | ≈0 | ≈0 |
| volatility 下降 | 正 | ≈0 | ≈0 | ≈0 |

*（註：原書此表的「underlying 上漲」一列與其內文推論不一致；上表依內文邏輯並以模型實算驗證。）*

### 21.3 看圖：損益圖與 Greeks 圖

> 💡 **一句話**：損益圖斜率 = delta、向上彎 = 正 gamma；正 gamma position 隨時間經過整條曲線下移。

當 position 變複雜，畫圖最直觀。橫軸為 underlying 價格、縱軸為理論損益，畫出不同 volatility（或不同剩餘時間）的曲線：

```
  損益                                 損益
   |  \__              正 gamma          |    __/‾‾\__       負 gamma
   |     \__  __/      (微笑)            |  _/        \_     (皺眉)
   |        ‾‾                           | /            \
   +---------------- 標的                +---------------- 標的
   斜率 = delta：左上→右下為負 delta；左下→右上為正 delta
```

- **Delta**：曲線斜率；水平處為 delta 中性。
- **Gamma**：曲率；向上彎（微笑）為正 gamma，向下彎（皺眉）為負 gamma。曲率由正轉負的點是**反曲點**（risk reversal 的當前價位就是一個反曲點，附近幾乎是直線）。
- **Theta**：正 gamma position 隨時間經過整條曲線**下移**；負 gamma position**上移**。gamma 與 theta 必然異號。
- **Vega**：gamma 與 vega 可同號也可異號。正 vega position 在 volatility 上升時曲線上移；負 vega position 則在 volatility 下降時上移。
- 低 volatility 時曲率被放大，高 volatility 時曲率被壓平。

也可以直接畫 delta 對 underlying、gamma 對 underlying 的圖；例如 21.2 的 position 在 99 附近，提高 volatility 使 delta 轉負、降低 volatility 使 delta 轉正；往兩側走 delta 都轉負。

### 21.4 淨合約部位與「櫃台買價」

> 💡 **一句話**：大漲時只剩 call、大跌時只剩 put 有作用；淨合約 position 告訴你極端行情像幾口 underlying。

**淨合約 position：** 若市場大跌，所有 call 歸零、所有 put 變得像空頭 underlying；大漲時所有 put 歸零、所有 call 像多頭 underlying。此時剩下多少「等效 underlying」？

- 下檔淨 position = underlying − 淨多 put 數
- 上檔淨 position = underlying + 淨多 call 數

21.2 的例子：下檔 $5-20=-15$；上檔 $5-20=-15$。無論大漲大跌都像空 15 口 underlying（實算 underlying 70 或 140 時 delta 都接近 −1,500）。

**為什麼要在意深價外（deep out-of-the-money, deep OTM）option？** 「不可能變價內（in-the-money, ITM）」的 option，在政變、科學突破、天災、併購等極端事件中常常就變 ITM 了。真實世界的大行情比常態分配（normal distribution）預期的多。

**清理 deep OTM position：** 空著 deep OTM option 仍要繳保證金（margin），所以以合理價格（低於 margin 成本）買回常是好主意；持有幾乎無價值的多頭 deep OTM option，也樂於以任何價格賣掉。很多交易所允許以低於最小跳動的**櫃台買價**（cabinet bid，通常是一個貨幣單位）成交，方便雙方清除這些 position。

### 21.5 分析一個多履約價部位

> 💡 **一句話**：拆解多 strike position：先看 Greeks 正負，再估 delta 中性價位、淨 position、兩平 volatility，最後寫行動計畫。

**自創 position：** underlying 50.80、5 週到期、$\sigma=30\%$、利率 0，同一到期月。各 option Greeks（delta 以整數格式、gamma 為每點 delta 變化）：

| strike | Call Δ | Put Δ | Gamma | Theta | Vega |
|---|---|---|---|---|---|
| 45 | 91.2 | −8.8 | 3.39 | −0.0108 | 0.0252 |
| 48 | 74.4 | −25.6 | 6.81 | −0.0217 | 0.0506 |
| 50 | 58.6 | −41.4 | 8.26 | −0.0263 | 0.0613 |
| 52 | 41.9 | −58.1 | 8.28 | −0.0263 | 0.0615 |
| 55 | 20.9 | −79.1 | 6.10 | −0.0194 | 0.0453 |

| position | 數量 | Δ position | Γ position | Θ position | Vega position |
|---|---|---|---|---|---|
| 45 C | −5 | −455.9 | −16.96 | +0.0540 | −0.1259 |
| 48 C | −10 | −744.3 | −68.14 | +0.2168 | −0.5058 |
| 50 C | +15 | +879.0 | +123.84 | −0.3940 | +0.9194 |
| 52 C | −18 | −753.9 | −149.00 | +0.4741 | −1.1062 |
| 55 C | +10 | +209.4 | +60.96 | −0.1940 | +0.4526 |
| 45 P | +12 | −105.9 | +40.70 | −0.1295 | +0.3022 |
| 48 P | −22 | +562.5 | −149.90 | +0.4769 | −1.1128 |
| 50 P | −6 | +248.4 | −49.54 | +0.1576 | −0.3678 |
| 52 P | +10 | −581.2 | +82.78 | −0.2634 | +0.6145 |
| 55 P | +9 | −711.6 | +54.86 | −0.1746 | +0.4073 |
| underlying | +14 | +1,400 | 0 | 0 | 0 |
| **合計** | | **−53.5** | **−70.39** | **+0.2239** | **−0.5225** |

（call 淨 −8 口、put 淨 +3 口）

**第一眼：** 負 delta（怕上漲）、負 gamma（怕大波動）、負 vega（怕 IV 上升）。最理想：**緩慢下跌**；最糟：**急漲**。

**想跌到哪裡？** 負 gamma position 在 delta 中性時獲利最大。每跌 1 點 delta 增加 $|\Gamma|=70.4$：

$$
S^*\approx S-\frac{\Delta}{\Gamma}=50.80-\frac{-53.5}{-70.4}=50.80-0.76=50.04
$$

模型實算：delta 在約 50.15 歸零、損益峰值約 +0.18（50.0 時 +0.17），與估計的 50.04 接近。若 gamma 隨價格劇烈變化，估計會偏離——這只是快速估計。

**淨合約 position：**
- 上檔：$14+(-8)=+6$ → 大漲到極端時像多 6 口 underlying，最終會獲利。實算：gamma 在約 52.7 轉正、delta 在約 55.6 轉正、損益在約 58.8 以上轉正。
- 下檔：$14-3=+11$ → 大跌時像**多 11 口**，損失可能很大（underlying 40 時約 −66.6 點）。

**volatility 與時間對 delta 的影響（極端推論）：**
- volatility 大升：所有 delta 趨向 ±50：$-8\times50+3\times(-50)+1400=+850$。實算 IV 60% 時 +371、100% 時 +543——方向正確。
- volatility 大降或時間流逝：ITM 趨向 ±100、價外（out-of-the-money, OTM）趨向 0。ITM call（45、48、50）淨 $-5-10+15=0$；ITM put（52、55）淨 $+19$ → $0-1900+1400=-500$。實算 IV 15% 時 −649，只剩 1 週時 −725。

**breakeven volatility（position 的隱含波動率（implied volatility））。** 假設 position 有 theoretical edge 3.00（若 30% 正確、全程動態避險（dynamic hedging），預期賺 3.00）。vega −0.5225 表示 IV 每升 1 點少賺 0.5225：

$$
\sigma_{BE}\approx30+\frac{3.00}{0.5225}=35.74\%
$$

容錯空間約 5.7 個波動率點（vol point）。要擴大：提高 edge 而不加 vega（edge 4.00 → 37.66%），或降低 vega 而不減 edge（vega −0.40 → 37.50%）。
模型實算的兩平點是 **36.09%**，略高於估計——因為此 position volga 為正（IV 上升時 vega 變得較不負，曲線向上彎）。

**行動計畫：**
- 若以純理論交易，先把 −53.5 的 delta 補平（買約半口 underlying）。
- 若緩跌且 IV 不升：考慮買低 strike put，降低下檔多 11 口的淨 position 與負 vega，同時鎖住部分 edge。
- 若急跌：可能必須不計理論價值（theoretical value）、以市價買 put——為了**生存**。長期而言，活下來才能等到對你有利的機會。
- 若上漲：慢漲（delta 不利、gamma 有利）與急漲（一開始兩者都不利，漲得夠多才轉為有利）應有不同對策。
- 即使分析再詳細，市場仍可能走出意料之外（例如價格與 IV 的連動和預期不同），要接受分析錯誤、立即調整。

### 21.6 關於做市的一些想法

> 💡 **一句話**：market maker 要問：市場認為值多少、我認為值多少、我帶著什麼 position；用 quote 偏移和分散控風險。

**market maker 的義務：** 交易所指定 market maker 持續雙邊 quote，成為「最後的買方與賣方」，確保流動性。客戶不必和 market maker 成交，誰的價格好就和誰成交。

- **價差寬度上限：** 若規定最寬 1.00，買價 31.50 意味賣價不得高於 32.50；賣價 18.20 意味買價不得低於 17.20。可以報得更窄（如 31.80–32.20）。
- **最小數量：** 例如至少 50 口；quote 常帶數量：`50 × 50`；也可不對稱：`100 × 20`（願買 100 口、只願賣 20 口）。
- **大單：** 寬度規定通常只適用於最小數量；客戶要 1,000 口時，可以報更寬（如 30.50–33.50）。客戶通常會先說明要「size」的 quote。

**market maker 的權利：** 較低的交易所費用、優先分配（例如三方同價時 market maker 可得 40%、其餘兩方各 30%）。

**market maker 的處境：** 不像投資人可以挑策略、挑進出場時機，market maker 的 position 是客戶決定的；但他可以選擇**價格**，並透過調整 quote 影響 position 型態。

**三個核心問題：**
1. 市場認為這個 option 值多少？→ 最簡單的做市（market making）法：在**均衡價格**附近買 bid、賣 offer，賺價差（只靠價差的交易者稱 scalper）。均衡價隨新買賣盤不斷移動，快市中可能看錯而累積大量單邊 position。
2. 我認為它值多少？→ 套利（arbitrage）關係失衡就鎖住利潤；或以理論價買低賣高，再 dynamic hedging 至到期或回到理論價。
3. 我現在帶著什麼 position？→ 風險管理。風險過大時，一次不利變動就可能讓你無法自由交易、甚至無法履行 market making 義務。

**用 quote 偏移管理風險。** 為 delta、gamma、theta、vega、rho 設上限。接近負 gamma 上限時，你更想**買** option：理論值 12.00，正常報 11.80–12.20，此時可改報 **11.90–12.30**——買價與賣價一起上移，被打到 bid 的機率變大；即使賣出，也是在較好的價位。

**分散，不要集中。** 某 market maker 各 strike 的 gamma：

| 40 | 45 | 50 | 55 | 60 | 65 | 70 | 75 | 80 | 85 |
|---|---|---|---|---|---|---|---|---|---|
| +80 | +210 | +150 | +40 | **−1,250** | +60 | +170 | +330 | +140 | +70 |

總 gamma 為 0，但 −1,250 集中在 60。若是長天期 option，今天未必危險；但隨時間經過、underlying 接近 60，風險會急遽放大。應積極把風險分散到各 strike、各到期月，任何單一 strike、單一到期日（expiration date）或單一 Greek 的集中都值得警惕。

**也要看風險將如何變化。** 例如在上漲市況中已達負 gamma 上限，但分析顯示繼續上漲 gamma 風險會下降（正 speed），那麼也許可以容忍目前的風險。

### 21.7 多到期月部位：情境與三個問題

> 💡 **一句話**：多月份 position 用期限結構做 volatility 情境，並先想好不利時、有利時、現在該做什麼。

market maker 常累積跨 3 個到期月、7 個 strike、外加數千股股票的 position。分析步驟：

1. **建立期限結構假設**（第 20 章）：主月份、均值、連動係數。自創：均值 30%，主月份 IV 36%，第二月連動 0.75 → 34.5%，第三月 0.5 → 33%。
2. **以「百分比」而非「點數」施加 volatility 情境**：主月份 +20% → 43.2%；第二月 $30+0.75\times13.2=39.9\%$；第三月 $30+0.5\times13.2=36.6\%$。主月份 −20% → 28.8%、29.1%、29.4%。
3. **畫圖或做表**：在不同股價下列出損益、delta、gamma、調整後 vega、theta、rho 以及高階 Greeks：

| 高階 Greek | 衡量 |
|---|---|
| Vanna | delta 對 volatility |
| Charm | delta 對時間 |
| Speed | gamma 對 underlying 價格 |
| Color | gamma 對時間 |
| Volga | vega 對 volatility |
| Vega decay | vega 對時間 |
| Zomma | gamma 對 volatility |

4. **外部限制**：公司或結算會員（clearing member）可能要求資本足以承受 underlying 上下 20% 的變動，或 IV 加倍；不足就要增資或縮小 position。
5. **問自己三個問題：**
   - 市況對我不利時，我要做什麼？
   - 市況對我有利時，我要做什麼？（風險分析不只防守，也要把握好事）
   - **現在**能做什麼，以免日後不利時措手不及？

market maker 的日常說穿了就是不斷重複：**取得優勢（edge）→ 控制風險 → 取得優勢 → 控制風險……** 理想是把損益圖變成一條在零以上的水平線；現實中不可能，所以要找出「最直接的威脅」並優先處理——這取決於風險胃納、資本、經驗與對該市場的熟悉度。

**常見處理手法：**
- 怕急漲（例如公司可能被併購）：買較高 strike 的 call 保護上檔，即使因傳聞而偏貴，若不保護可能「致命」，就得付這個錢。
- 想降 delta 同時處理某價區的負 vega／負 gamma：買該價區附近的**近月價平（at-the-money, ATM） put**（近月 ATM gamma 最大，最能抵銷）。
- position theta 集中在近月 ATM 附近的大量多頭 call：時間經過會加速損耗，要預先規劃股價停在該處時怎麼辦。
- **股利（dividend）風險**：若持有 2,500 股，公司把預期 dividend 從 0.60 降到 0.20，position 價值約減少 $0.40\times2{,}500=1{,}000$（近月在除息前到期的 option 不受影響）。若擔心 dividend 被調降，可把現股換成**合成多頭（synthetic long）**（買 call、賣 put，同 strike），類似把 conversion 改成 box 來去除 dividend 風險。
- **利率風險**：position rho +15（每 1 個百分點）時，利率下降 50 個基點（1 bp = 0.01%）約損失 7.5。

### 21.8 股票分割

> 💡 **一句話**：Y for X 分割：口數和 delta × Y/X，gamma × (Y/X)²，其他 Greeks 不變。（可先跳過）

公司分割股票是為了降低股價、提高交易量與持股分散度。若股票以 **Y 股換 X 股**（Y for X）分割：

| 項目 | 調整 |
|---|---|
| 新股價 | 舊股價 × X/Y |
| 新 strike | 舊 strike × X/Y |
| 新 option 數量 | 舊數量 × Y/X |
| 每口 underlying | 不變（100 股） |
| 新 delta position | 舊 delta position × Y/X |
| 新 gamma position | 舊 gamma position × (Y/X)² |
| theta、vega、rho | **不變** |

**例 1：3 for 1。** 股價 150，持有 4 口 150 call，每口 delta 50、gamma 3（每點）。
- 分割後：股價 50，持有 12 口 50 call
- Delta position：$4\times50=200\to600$
- Gamma position：$4\times3=12\to12\times9=108$
- 驗算：新股價漲 1（等於舊股價漲 3），舊 delta position 會是 $200+3\times12=236$，分割後乘 3 = 708 = 600 + 108 ✓

為什麼 gamma 是平方？新的 1 點等於舊的 3 點（價格尺度 ×3），而且口數也 ×3。

**例 2：非整數比例 4 for 3。** 股價 80，持有 1 口 80 call，delta 50、gamma 4。
- 理論上：股價 60、strike 60、$1\times4/3=1\tfrac13$ 口 call
- 結算所（clearinghouse）不允許零碎口數 → 改為：**仍是 1 口 60 call，但每口 underlying 改為 $100\times4/3=133\tfrac13$ 股**
- 新 delta $=50\times4/3=66.67$ 股；新 gamma $=4\times(4/3)^2=7.11$
- 驗算：新股價 61 = 舊價 81.33，舊 delta $=50+1.333\times4=55.33\%$；乘以 133.33 股 = 73.78 = 66.67 + 7.11 ✓

在其他條件不變下，分割只是會計調整，權益不變。但**dividend**未必等比例調整：分割常代表公司經營良好，伴隨 dividend 上調並不少見，而 dividend 變化會改變 position 價值。

## 交易員視角

- **Optibook 的部位限制（position limit）就是你的風險上限**：接近 position limit 時，學 market maker「偏移 quote」：想減少多頭就把 bid／ask 一起下移，讓自己更容易被買走。
- **Greeks 為 0 不等於沒風險**：自建機器人時，除了即時 Greeks，至少要計算「underlying ±5%、±10%、IV ±20%（百分比）、時間 +1 天」的情境損益表。
- **淨合約 position 是尾端風險的快速檢查**：每次成交後更新「上檔／下檔淨 position」，若出現大額淨多（或淨空）而對應方向的行情可能暴走，就要買保護。
- **delta 中性價位 $S-\Delta/\Gamma$**：負 gamma position 可據此設定期望價位與調整點。
- **breakeven volatility**：用 edge／|vega| 檢查容錯空間；若容錯只有 1–2 個點而市場 IV 常一天跳 3 點，position 太大。
- **分散**：market making 機器人應限制單一 strike、單一 expiration date 的 gamma／vega，不只限制總量。
- **公司行動**：遇到分割，delta 乘以 Y/X、gamma 乘以 (Y/X)²，避險（hedge）系統若沒更新會出現巨大錯誤 hedge。

## 常見誤區

1. **誤解**：所有 Greeks 為 0 就是完美 hedge。→ **正解**：Greeks 只描述當下；underlying、volatility 或時間一變，Greeks 就會變（risk reversal 往兩個方向都會變成負 delta）。
2. **誤解**：deep OTM option 不可能變 ITM，不用管。→ **正解**：極端事件比預期常見；看淨合約 position，並以合理價清掉（可利用 cabinet bid）。
3. **誤解**：負 delta position 就希望 underlying 越跌越好。→ **正解**：若同時是負 gamma，最好的情況是緩跌到 delta 中性附近（$S-\Delta/\Gamma$）；急跌可能反而受傷。
4. **誤解**：market maker 只要 quote 夠窄就好。→ **正解**：還要考慮自己的 position，透過 quote 偏移與分散化控制風險；必要時為了生存可以不計 theoretical value 平倉。
5. **誤解**：股票分割後 gamma position 按分割比例變化。→ **正解**：delta 按 Y/X、gamma 按 (Y/X)²；theta、vega、rho 不變。
6. **誤解**：多到期月 position 的 volatility 情境可以各月份加同樣點數。→ **正解**：應依期限結構（均值、連動係數）以百分比調整主月份，再推算其他月份。

## 重點摘要

| 項目 | 公式／規則 |
|---|---|
| synthetic 改寫 | put = call − underlying；call = put + underlying |
| Delta 中性價位 | $S^*\approx S-\Delta/\Gamma$ |
| 上檔淨 position | underlying + 淨 call 數 |
| 下檔淨 position | underlying − 淨 put 數 |
| 兩平 volatility | $\sigma+\text{edge}/|\text{vega}|$（負 vega position） |
| volatility 上升 | delta 向 ±50 靠攏 |
| volatility 下降／時間經過 | delta 向 0 或 ±100 靠攏 |
| 圖形 | 斜率 = delta；微笑 = 正 gamma；皺眉 = 負 gamma |
| quote 偏移 | 想買就把 bid、ask 一起上移；想賣就一起下移 |
| 期限結構情境 | 遠月 IV = 均值 + 係數 × (主月份 IV − 均值) |
| 股票分割 Y for X | 價格、strike ×X/Y；口數、delta ×Y/X；gamma ×(Y/X)²；非整數比例改調整每口股數 |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B1、B3、B4）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ 為什麼 risk reversal（買低 strike put、賣高 strike call、加 underlying）在 underlying 往**任一方向**移動時都變成負 delta？

<details><summary>提示</summary>

分兩邊想：往下走會靠近哪個 strike？那張 option 你是買還是賣，position gamma 變正還是變負？再想「正 gamma 遇到下跌」和「負 gamma 遇到上漲」時 delta 各往哪邊變。

</details>

<details><summary>解答</summary>

下跌時接近 put 的 strike，put 的 gamma 增加 → position gamma 為正，正 gamma 在下跌中使 delta 變負。上漲時接近 call 的 strike，空 call 的 gamma 主導 → position gamma 為負，負 gamma 在上漲中也使 delta 變負。

</details>

**A2.** 在損益圖上，如何辨識正 gamma、負 delta 的 position？時間經過後圖形如何移動？

<details><summary>解答</summary>

曲線向上彎（微笑）、在目前價位的斜率由左上往右下（負斜率）。正 gamma 必為負 theta，時間經過若 underlying 不動，整條曲線往下移。

</details>

**A3.** 什麼是 cabinet bid？為什麼交易所要允許它？

<details><summary>解答</summary>

低於正常最小價位（通常為一個貨幣單位）的 quote。讓持有或空著 deep OTM、幾乎無價值 option 的交易者能以極低價格成交，清除 position（空方可釋放 margin，多方也能拿回一點點價值）。

</details>

**A4.** market maker 必須回答哪三個問題？各自對應什麼獲利來源或管理重點？

<details><summary>解答</summary>

(1) 市場認為值多少？→ 在均衡價附近賺買賣價差（bid-ask spread）。(2) 我認為值多少？→ arbitrage 或理論錯價的 edge，必要時 dynamic hedging。(3) 我現在帶什麼 position？→ 風險管理：設限、quote 偏移、分散、避免一次不利變動就無法繼續 market making。

</details>

**A5.** 為什麼總 gamma 為 0 的 market making position 仍可能令人擔心？

<details><summary>解答</summary>

若風險集中在單一 strike（例如某 strike −1,250、其他 strike 正值相抵），當 underlying 移向該 strike、或時間經過使該 strike gamma 放大時，position 會變成大量負 gamma。總量為 0 隱藏了分布不均的風險。

</details>

**A6.** 股票分割後，為什麼 theta、vega、rho 不需調整，但 gamma 要乘上 $(Y/X)^2$？

<details><summary>解答</summary>

時間、volatility（百分比）、利率對 position 總價值的影響與分割無關，分割只是會計單位改變，總價值不變。gamma 是「每 1 元股價變化的 delta 變化」：新的 1 元等於舊的 Y/X 元（價格尺度），而 delta position 本身又乘上 Y/X（口數），兩者相乘得 $(Y/X)^2$。

</details>

### B. 計算題

**B1.** ⭐ underlying 48，position：underlying +5；40 call +3、40 put +3；45 call −16、45 put +4；50 call +8、50 put −2。改寫成全 call，這是什麼策略？delta 方向為何？

<details><summary>提示</summary>

用 put = call − underlying，把每個 strike 的 put 換成 call 加進去；每 +1 口 put 帶來 −1 underlying、每 −1 口 put 帶來 +1 underlying。最後看三個 strike 的 call 數量排列像什麼策略。

</details>

<details><summary>解答</summary>

put → call − underlying。
40：$3+3=+6$；45：$-16+4=-12$；50：$8-2=+6$。
underlying：$5-3-4+2=0$。
→ **long 40/45/50 call butterfly**（+6/−12/+6）。最希望 underlying 停在 45，目前 48 → 希望下跌 → delta 為負。

</details>

**B2.** position delta −300、gamma −40，underlying 62.40。估計 delta 中性價位。

<details><summary>解答</summary>

$S^*=62.40-(-300)/(-40)=62.40-7.5=54.90$。

</details>

**B3.** ⭐ position 理論 edge 5.00、vega −0.80（每點）、評價 volatility 25%。估計兩平 volatility；若 vega 降到 −0.50 呢？

<details><summary>提示</summary>

兩平 volatility = 評價 volatility + edge ÷ vega 絕對值。先算 5.00 ÷ 0.80，再換成 0.50 算一次。

</details>

<details><summary>解答</summary>

$25+5.00/0.80=31.25\%$；vega −0.50 時 $25+5.00/0.50=35.00\%$。

</details>

**B4.** ⭐ 某 position：underlying +20 口；call 淨 −35 口；put 淨 +12 口。求上檔與下檔淨合約 position。哪一個方向的極端行情最危險？

<details><summary>提示</summary>

上檔：underlying + 淨 call 數；下檔：underlying − 淨 put 數。算完看哪一邊是「空」而且口數較大。

</details>

<details><summary>解答</summary>

上檔：$20-35=-15$（大漲時像空 15 口）；下檔：$20-12=+8$（大跌時像多 8 口）。上檔淨 position 絕對值較大且為空，暴漲最危險（理論上虧損無上限）。

</details>

**B5.** 期限結構：均值 25%、主月份 IV 32%、其他兩個月份連動係數 0.6、0.3。主月份 IV 上升 25%（百分比），三個月份的新 IV 各為多少？

<details><summary>解答</summary>

主月份 $32\times1.25=40\%$（偏離均值 15 點）。第二月 $25+0.6\times15=34\%$；第三月 $25+0.3\times15=29.5\%$。

</details>

**B6.** 股價 120，持有 6 口 120 call，每口 delta 40、gamma 3。股票 3 for 2 分割。分割後的股價、strike、口數與每口股數、delta position、gamma position？並驗算。

<details><summary>解答</summary>

股價 $120\times2/3=80$；strike 80。理論口數 $6\times1.5=9$，但非整數比例 → 維持 6 口、每口 150 股。
Delta position $=6\times40\times1.5=360$ 股；gamma $=6\times3\times2.25=40.5$。
驗算：新股價 81 = 舊價 121.5，舊每口 delta $=40+1.5\times3=44.5\%$，乘 150 股 × 6 口 = 400.5 = 360 + 40.5 ✓

</details>

**B7.** 持有 4,000 股股票（position 的一部分）。市場預期 dividend 0.75，但你認為可能只有 0.45。(a) dividend 風險約多少？(b) 如何消除？

<details><summary>解答</summary>

(a) $(0.75-0.45)\times4{,}000=1{,}200$ 的潛在損失。(b) 賣出 4,000 股、改建立等量 synthetic long（買 40 口 call、賣 40 口 put，同 strike、同到期，每口 100 股），synthetic position 不收 dividend，因此對 dividend 變化不敏感（類似把 conversion 改成 box）。

</details>

### C. 交易情境題

**C1.** 你在 Optibook market making，一檔 option 理論價 4.00，正常報 3.90–4.10（各 20 口）。你的 position 已接近負 vega 上限，而且這檔 option vega 很大。你會怎麼改 quote？如果有人要 300 口呢？

<details><summary>解答</summary>

想多買 option（增加 vega），把 quote 整體上移，例如 3.97–4.17，提高被打 bid 的機率；也可改成不對稱數量（如 40 × 10），多買少賣。若有人詢價 300 口，可以報更寬（如 3.80–4.30），因大單風險更高；若對方是要賣給你，正合你意，可以在偏好的價位接下部分，並立即評估總 vega 與其他月份的 hedge。

</details>

**C2.** 21.5 的 position（delta −53.5、gamma −70、vega −0.52、上檔淨 +6、下檔淨 +11）。新聞傳出公司可能面臨重大訴訟，股價可能大跌。你會怎麼做？

<details><summary>解答</summary>

最大威脅變成急跌：下檔淨 position 多 11 口、負 gamma 使急跌加速虧損，若 IV 同時跳升，負 vega 再雪上加霜。行動：(1) 買進較低 strike（如 45、48）的 put，直接降低下檔淨 position 並減少負 gamma／負 vega；(2) 若 put 已因消息變貴，仍可能需要付這個價錢（生存優先）；(3) 短期也可賣出部分 underlying，但那只修正 delta，無法處理急跌時的 gamma 與 IV 風險。事先寫好「跌到 X 價位、IV 升到 Y」時的行動計畫。

</details>

### D. 挑戰題

**D1.** (a) 從 $\Delta(S)\approx\Delta_0+\Gamma(S-S_0)$ 推導 $S^*=S_0-\Delta_0/\Gamma$，並說明為何負 gamma position 在 $S^*$ 附近損益最大。(b) 用二階展開 $\text{P\&L}(S)\approx\Delta_0(S-S_0)+\tfrac12\Gamma(S-S_0)^2$，求 21.5 例中估計的最大損益，與實算（約 +0.17 點在 50.0）比較。(c) 說明兩者差異的原因。

<details><summary>解答</summary>

(a) 令 $\Delta(S^*)=0$：$S^*=S_0-\Delta_0/\Gamma$。P&L 的導數就是 delta；負 gamma 表示 P&L 是向下彎的拋物線，導數為零處為最大值。
(b) $\Delta_0=-53.5$（以股數計，每點 P&L 為 $-0.535$ 口×1 點），$\Gamma=-70.4$（每點 delta 變化，換成口數 $-0.704$）。$S-S_0=-0.76$：P&L $\approx(-0.535)(-0.76)+\tfrac12(-0.704)(0.76)^2=0.4066-0.2033=0.203$ 點。實算：在 50.0 約 +0.17、最高點約 +0.18（50.1–50.2 附近）。
(c) 差異來自 gamma 不是常數（speed ≠ 0）：underlying 下跌時 position gamma 變得更負（實算 50.0 時約 −100），delta 抵銷得更快，使 delta 中性點稍高於估計、最大損益略小於二階估計。

</details>

## 自我檢核清單

- [ ] 能用 synthetic 關係把混合 position 改寫成單一種類並辨識策略
- [ ] 能推論 underlying、volatility、時間改變後 Greeks 的變化方向
- [ ] 能讀懂損益圖的斜率、曲率、上下移動
- [ ] 能計算上檔／下檔淨合約 position
- [ ] 能估計 delta 中性價位與兩平 volatility，並知道其限制
- [ ] 能說明 market maker 的義務、權利、三個問題與 quote 偏移
- [ ] 能辨識風險集中並提出分散方法
- [ ] 能用期限結構假設建立多月份 volatility 情境
- [ ] 能處理整數與非整數比例的股票分割

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab10_hedging_portfolio.py`](../labs/exercises/lab10_hedging_portfolio.py)：實作 `protective_put_pnl`、`covered_call_pnl`、`collar_pnl`、`collar_bounds`、`zero_cost_collar_call_strike`、`portfolio_value`、`portfolio_greeks`、`scenario_grid`、`greeks_ladder`、`worst_case`、`gamma_vega_neutral_hedge`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab10_hedging_portfolio.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`lab10_hedging_portfolio`](../labs/)：建立多 strike／多到期月 position 的情境分析器（損益、delta、gamma、調整後 vega 對 underlying 價格與 volatility 的網格），計算淨合約 position 與兩平 volatility。
- 延伸：[`lab07_spreads`](../labs/) 的策略建構器可用來驗證 21.1 的 synthetic 改寫。
