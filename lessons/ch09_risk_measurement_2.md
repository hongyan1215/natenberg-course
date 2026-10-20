# 第 9 章　風險衡量 II（Risk Measurement II）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：Greeks 本身也會動——標的（underlying）沒動，光是時間經過或隱含波動率（implied volatility）改變，你的 delta、gamma 也會跑掉。今天 delta 中立，明天未必中立。

**你只需要先記住這 5 件事**

1. **波動率（volatility）升 → delta 往 50 靠攏；時間經過 → delta 遠離 50。** 想不通時間的效果，就想成「volatility 下降」。
2. **Gamma、theta、vega 都在價平（at-the-money, ATM）最大。** 這也是 ATM 選擇權（option）成交最活躍的原因。
3. **比例關係：ATM theta、vega 跟價格成正比，gamma 跟價格成反比。** 例：價格放大 10 倍，theta、vega 變 10 倍，gamma 變 1/10。
4. **最危險的 option = 快到期 + 低 volatility + ATM。** 這時 gamma 最大，underlying 小動一下，delta 就從 50 衝向 0 或 100。
5. **Lambda（彈性）= 百分比對百分比。** 價外（out-of-the-money, OTM）、快到期、低 volatility 時最大。例：underlying 60、買權（call） 2.50、delta 25 → lambda 6，underlying 漲 1%、call 約漲 6%。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| ATM theta（時間平方根法） | 價值 ×（1 − √(（剩餘天數 − 1）÷ 剩餘天數)） |
| ATM theta 和 volatility | 近似成正比：volatility 加倍、theta 加倍 |
| Lambda | delta（小數）× underlying 價格 ÷ option 價值 |
| 高階 Greeks 速記 | vanna、charm 看 delta；speed、color、zomma 看 gamma；volga、vega decay 看 vega |

**必做練習（約 20 分鐘）**：A5、B1、B2、B4（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[選擇權價格與 Greeks](https://hongyan1215.github.io/natenberg-course/tools/option-explorer/)工具，把天數縮短、volatility 調低，看 ATM 的 gamma 怎麼變尖。

---

## 本章定位

第 7 章的 Greeks 告訴我們「現在」的風險；但 Greeks 本身也會隨 underlying 價格、時間、volatility 而改變——今天的小風險可能變成明天的大風險。本章逐一檢視 delta、theta、vega、gamma 如何隨市場條件變化，介紹高階敏感度（vanna、charm、volga、speed、color、zomma 等）以及槓桿指標 lambda。前置章節：[ch07 風險衡量 I](ch07_risk_measurement_1.md)、[ch08 動態避險](ch08_dynamic_hedging.md)。

> 對應原書：第 9 章〈Risk Measurement II〉

**本章數值慣例**：除非另外說明，例子使用 BS、$r=0$、無股利（dividend）；delta、gamma 用「整數 delta」單位；theta 為每日變化；vega 為每 1 個波動率點（vol point）的變化。高階敏感度一律定義為：
- **對時間**：「經過一天」造成的變化（注意：部分文獻以「剩餘時間增加」定義，正負號相反）；
- **對 volatility**：「volatility +1 點」造成的變化；
- **對價格**：「underlying +1 點」造成的變化。

## 學習目標

1. 能判斷 volatility 上升、時間經過時，價內（in-the-money, ITM）／ATM／OTM option 的 delta 往哪裡移動，並解釋「implied delta」使避險（hedge）部位（position）在 underlying 不動時也會失衡。
2. 能說明 theta、vega、gamma 在 ATM 時最大，並解釋為何 ATM theta、vega 與價格成正比、gamma 與價格成反比。
3. 能用「時間平方根法」估計 ATM option 的 theta。
4. 能說出 vanna、charm、volga、vega decay、speed、color、zomma 各自是「哪個 Greek 對哪個條件」的敏感度，以及大約在哪些 delta 最大。
5. 能計算 lambda（彈性），並判斷何時 lambda 最大。
6. 能辨認「到期前、低 volatility、ATM」option 為何是最危險的 gamma position。

## 核心概念

### 9.1 Delta 的變化

> 💡 **一句話**：volatility 升，delta 往 50 靠；時間過，delta 遠離 50。underlying 不動，delta 也會跑掉。

#### 9.1.1 Delta 與波動率

**直覺**：低 volatility 時，OTM option 很可能一直 OTM，ITM 很可能一直 ITM。高 volatility 時，什麼都可能發生，ITM 與 OTM 都更像 ATM → **delta 都往 50 靠攏**。

> 例（$S=100$、3 個月、$r=0$，call delta）：
>
> | volatility | 90 call（ITM） | 100 call（ATM） | 110 call（OTM） |
> |---|---|---|---|
> | 15% | 92.5 | 51.5 | 10.9 |
> | 30% | 78.2 | 53.0 | 28.8 |
> | 45% | 71.9 | 54.5 | 37.8 |

注意 ATM call delta 略大於 50，且隨 volatility 上升略增：一方面模型以**遠期價格（forward price）**評價（利率、dividend 會移動「真正的 ATM」），另一方面對數常態分配（lognormal distribution）不對稱，即使恰好「價平遠期（at-the-forward）」，call delta 仍略高於 50。

**實務後果：沒有人能確定自己真的是 delta 中立。** Delta 依賴未來的 volatility，而那是猜的。許多交易員改用 **implied delta**（用 implied volatility 算出的 delta），但這表示 implied volatility 一變，delta 就變，即使 underlying 完全沒動。

> 例：持有 40 口 110 call（$S=100$、3 個月），implied volatility 28% 時 delta 27 → $40\times27=1080$，賣出 11 口 underlying，position delta −20。
> implied volatility 升到 33%，delta 變成 31 → $40\times31-1100=+140$。
> underlying 沒動，position 卻從中立變成偏多。

#### 9.1.2 Delta 與時間

時間與 volatility 在許多情況下效果類似：**更多時間 ≈ 更高 volatility**（都提高大幅移動的可能性）。時間經過 → delta 遠離 50（往 0 或 100）。

> 例（$S=100$、$\sigma=30\%$，call delta）：
>
> | 剩餘時間 | 90 call | 100 call | 110 call |
> |---|---|---|---|
> | 約 1 週（0.02 年） | 99.4 | 50.8 | 1.3 |
> | 3 個月 | 78.2 | 53.0 | 28.8 |
> | 1 年 | 69.2 | 56.0 | 43.3 |

**經驗法則**：不確定時間的效果時，想想 volatility 的效果；反之亦然。

賣權（put）完全對稱：時間經過或 volatility 下降時，put delta 往 0 或 −100 移動；volatility 上升時往 −50 靠攏。

所以**即使其他條件都不變，今天 delta 中立的 position 明天未必中立**。距到期還有好幾個月時，幾天影響很小；但接近到期時，一天就占剩餘壽命的一大部分，delta 可能劇烈變化。

#### 9.1.3 Vanna 與 Charm

- **Vanna**：delta 對 volatility 的敏感度（$\partial^2V/\partial S\partial\sigma$）。
- **Charm**（delta decay）：delta 對時間的敏感度（$\partial^2V/\partial S\partial t$）。

這兩者都是「敏感度的敏感度」——二階敏感度（gamma 也是：delta 對價格）。

**哪些 delta 最敏感？** 接近 0、50、100 的 delta 最不容易動；介於中間（約 15–20 與 80–85）的最容易被拉向 50 或推離 50。

> 例（$S=100$、3 個月、$\sigma=25\%$）：
>
> | call delta | 10 | 20 | 35 | 50 | 65 | 80 | 90 |
> |---|---|---|---|---|---|---|---|
> | Vanna（volatility +1 點，delta 變化） | +0.98 | +1.06 | +0.73 | +0.20 | −0.37 | −0.78 | −0.80 |
> | Charm（經過一天，delta 變化） | −0.136 | −0.149 | −0.104 | −0.028 | +0.053 | +0.111 | +0.112 |
>
> OTM call：volatility 升 → delta 升；時間過 → delta 降。ITM 則相反。ATM 附近兩者都接近 0（因對數常態（lognormal）不對稱，零點略偏離 50）。

put 的形狀相同，只是以 −50 為中心。另外：vanna 主要受 volatility 水準影響、受時間影響不大；charm 主要受時間影響、受 volatility 影響不大（剩餘時間越短，charm 越大）。

### 9.2 Theta 的變化

> 💡 **一句話**：ATM theta 最大、越近到期越快，且與價格、volatility 近似成正比；可用時間平方根法速算。

#### 9.2.1 Theta 與價格（價內／價平／價外）

Theta 來自時間價值（time value）；深價內（deep in-the-money, deep ITM）與深價外（deep out-of-the-money, deep OTM）的 time value 都很少 → theta 小。**ATM theta 最大**。

> 例（$S=100$、$\sigma=30\%$，每日 theta）：
>
> | 剩餘天數 | 90 call | 100 call | 110 call |
> |---|---|---|---|
> | 90 | −0.024 | −0.033 | −0.028 |
> | 30 | −0.026 | −0.058 | −0.032 |
> | 10 | −0.009 | −0.102 | −0.015 |
> | 3 | −0.000 | −0.199 | −0.000 |

**ATM theta 與價格成正比**：履約價（strike price） 200 的 ATM option 代表買進更貴資產的權利，價值是 strike 20 的 10 倍，theta 也正好 10 倍。

> 例（ATM、3 個月、30%）：$S=K=20$：價值 1.196、theta −0.0066；$S=K=200$：價值 11.957、theta −0.0656。

#### 9.2.2 Theta 與時間

早期三種 option 耗損速度相近；接近到期時，**ITM 與 OTM 的耗損減慢，ATM 的耗損加速**（理論上在到期瞬間趨近無限大）。見上表最後兩列：ATM theta 從 −0.033 增至 −0.199，ITM／OTM 則趨近 0。

#### 9.2.3 Theta 與波動率

忽略利息時，volatility 為 0 的 option 沒有 time value，theta = 0。volatility 升 → time value 升 → theta 升。

- **ATM theta 與 volatility 近似成正比**（一條直線）：

> 例（$S=K=100$、3 個月）：10% → −0.0110；20% → −0.0219；40% → −0.0436。volatility 加倍、theta 加倍。

- ITM 與 OTM 的 theta 隨 volatility 下降而下降，但可能在 volatility 還沒到 0 之前就變成 0。
- **等距 OTM 的 call theta 大於等距 OTM 的 put theta**：lognormal 下，上方 OTM call 的 time value 大於下方等距 OTM put。underlying 不動時，time value 多的耗損就快。

> 例（$S=100$、3 個月、30%）：110 call 價值 2.50、theta −0.0281；90 put 價值 2.02、theta −0.0243。

#### 9.2.4 價平 theta 的速算：時間平方根法

ATM option 價值 ≈ 與 $\sigma\sqrt t$ 成正比。若今天剩 $t$ 天、價值 $TV_t$，明天：

$$TV_{t-1}\approx TV_t\sqrt{\frac{t-1}{t}}\qquad\Rightarrow\qquad \Theta\approx TV_t\left(1-\sqrt{\frac{t-1}{t}}\right)$$

$\sqrt{(t-1)/t}$ 隨 $t$ 變小而變小 → theta 越來越大。

> **例題**：ATM option 剩 40 天、價值 3.20。
> - 今天 theta $\approx3.20\times(1-\sqrt{39/40})=3.20\times0.01258=0.0403$
> - 明天價值 $\approx3.20-0.0403=3.1597$，theta $\approx3.1597\times(1-\sqrt{38/39})=0.0408$
> - BS 驗證（反推 volatility 24.24%）：0.0402、0.0408 ✔

（只適用 ATM；ITM OTM 沒有這麼方便的速算。）

### 9.3 Vega 的變化

> 💡 **一句話**：ATM vega 最大且幾乎不隨 volatility 變；長天期 vega 永遠比短天期大。

#### 9.3.1 Vega 與價格

與 theta 幾乎一樣：**ATM vega 最大**；**ATM vega 與價格成正比**。

> 例（ATM、3 個月、30%）：$S=K=20$ 的 vega 0.040；$S=K=200$ 的 vega 0.398（10 倍）。

「vanna」也可以解讀為 **vega 對 underlying 價格的敏感度**——數學上與「delta 對 volatility 的敏感度」完全相同（混合偏導數順序可交換）。

#### 9.3.2 Vega 與波動率；Volga

ATM option 價值對 volatility 幾乎是一條直線 → **ATM vega 幾乎不隨 volatility 改變**（實際上隨 volatility 上升而極輕微下降，見 [ch18](ch18_black_scholes.md)）。ITM 與 OTM 的 vega 則隨 volatility 上升而上升——因為高 volatility 下它們的 delta 往 50 靠攏、行為越來越像 ATM，而 ATM vega 最大。

> 例（$S=100$、3 個月，vega）：
>
> | volatility | ATM 100 call | OTM 110 call | ITM 90 call |
> |---|---|---|---|
> | 10% | 0.199 | 0.034 | 0.021 |
> | 20% | 0.199 | 0.133 | 0.108 |
> | 40% | 0.198 | 0.186 | 0.164 |

**Volga**（又稱 vomma，volatility gamma）：vega 對 volatility 的敏感度（$\partial^2V/\partial\sigma^2$）。ATM 約為 0；越往 ITM 或 OTM 越大，**約在 delta 10 與 90 最大**；剩餘時間越長，ITM OTM 的 volga 越大。

> 例（3 個月、25%，volatility +1 點時 vega 的變化）：delta 10：+0.0062；delta 50：≈0；delta 90：+0.0051。

#### 9.3.3 Vega 與時間；Vega decay

**長期 option 的 vega 永遠大於短期 option**（見 [ch06](ch06_volatility.md)）。

> 例（$S=100$、$\sigma=30\%$，vega）：
>
> | 剩餘天數 | 90 call | 100 call | 110 call |
> |---|---|---|---|
> | 365 | 0.352 | 0.395 | 0.393 |
> | 90 | 0.146 | 0.198 | 0.169 |
> | 30 | 0.051 | 0.114 | 0.065 |
> | 7 | 0.002 | 0.055 | 0.004 |

**Vega decay**（DvegaDtime）：vega 對時間的敏感度。delta 在 10 到 90 之間的 option 最敏感；剩餘時間越短，vega 變化越快。

### 9.4 Gamma 的變化

> 💡 **一句話**：ATM gamma 最大、與價格成反比；快到期或低 volatility 時 ATM gamma 暴增，最危險。

#### 9.4.1 Gamma 與價格：價平最大、與價格成反比

**重要原則：gamma、theta、vega 都在 ATM 時最大**——這也是 ATM option 成交最活躍的原因：它們正是交易員進入 option 市場時想要的特性。

但與 theta、vega 不同：**ATM gamma 與價格成反比**。模型以百分比衡量變動：underlying 在 20 時移動 1 點是 5%，在 200 時移動 1 點只有 0.5%。

> 例（ATM、3 個月、30%）：$S=K=20$：gamma 13.26；$S=K=200$：gamma 1.33（1/10）。

#### 9.4.2 Speed

**Speed**：gamma 對 underlying 價格的敏感度（三階，$\partial^3V/\partial S^3$）。underlying 往 strike 靠近 → gamma 升；遠離 → gamma 降。

- Speed 約在**call delta 15 與 85**（put −15、−85）附近最大。
- ATM 與極 deep ITM／極 deep OTM 的 gamma 對價格最不敏感。
- 時間越短或 volatility 越低，speed 越大。

> 例（3 個月、25%，underlying +1 點時 gamma 的變化）：delta 15：+0.134；delta 50：−0.042；delta 85：−0.170。

#### 9.4.3 Gamma 與時間、波動率

**ATM gamma 隨時間經過或 volatility 下降而上升**，隨 volatility 上升而下降。

> 例（100 call，underlying 從 96 漲到 104）：
> - 剩 5 天、30%：delta 12.6 → 87.2，平均 gamma $=(87.2-12.6)/8=9.3$
> - 剩 1 年、30%：delta 50.6 → 61.1，平均 gamma $=(61.1-50.6)/8=1.3$
>
> ATM 點 gamma：5 天 11.36、3 個月 2.65、1 年 1.32；3 個月在 12% volatility 6.65、50% volatility 1.58。

ITM 與 OTM option 則相反：volatility 下降時 gamma 下降、volatility 上升時 gamma 上升（它們在高 volatility 下更像 ATM）。若把 gamma 對時間作圖，形狀與「theta 對時間」（9.2.2）非常相似。

#### 9.4.4 Color 與 Zomma

- **Color**（gamma decay）：gamma 對時間的敏感度。
  - ATM：經過時間 → gamma 變大（以本課程「經過一天」定義為正；若以「剩餘時間增加」定義則為負）。
  - delta 約 5 或 95：經過時間 → gamma 變小（方向與 ATM 相反）。
  - delta 約 15 或 85：color 接近 0，gamma 對時間不敏感。
  - 時間短、volatility 低 → color 更大。
- **Zomma**：gamma 對 volatility 的敏感度。
  - ATM：volatility 升 → gamma 降（負 zomma）。
  - delta 約 5 或 95：volatility 升 → gamma 升（正 zomma）。
  - delta 約 15 或 85：zomma 接近 0。
  - 時間短、volatility 低 → zomma 更大。

> 例（3 個月、25%）：
>
> | call delta | 5 | 15 | 50 | 85 | 95 |
> |---|---|---|---|---|---|
> | Color（經過一天，gamma 變化） | −0.0087 | −0.0022 | +0.0176 | +0.0005 | −0.0069 |
> | Zomma（volatility +1 點，gamma 變化） | +0.060 | +0.012 | −0.123 | −0.007 | +0.047 |

#### 9.4.5 最危險的選擇權

綜合以上：gamma ATM 最大、且 ATM gamma 隨時間經過與 volatility 下降而上升 → **接近到期、低 volatility 環境中的 ATM option 是最危險的 option 之一**。這些「gamma option」delta 起初在 50 附近，但 underlying 小幅移動就會讓 delta 迅速衝向 0 或 100。

### 9.5 Lambda（Λ）：彈性

> 💡 **一句話**：Lambda = delta × underlying 價格 ÷ option 價值，看百分比槓桿；OTM、近到期、低 volatility 最大。

Delta 是「點數對點數」；**lambda 是「百分比對百分比」**——又稱彈性（elasticity）、槓桿值（leverage value）、omega（Ω）：

$$\Lambda=\Delta\times\frac{S}{TV}\qquad(\Delta\text{ 用小數})$$

> **例題**：underlying 60，call 價值 2.50、delta 25。underlying 漲 1%（0.60）→ call 漲 $0.25\times0.60=0.15$，即 $0.15/2.50=6\%$。
> $\Lambda=0.25\times60/2.50=6.0$：call 的百分比變動是 underlying 的 6 倍。

特性：
- call lambda 為正、put 為負（由 delta 符號決定）。
- **OTM option 的 lambda 最大**（絕對值）：underlying 上漲時 call lambda 下降、put lambda（負值）往 0 移動。
- volatility 升 → lambda 降；volatility 降或時間經過 → lambda 升。

> 例（$S=80$，lambda）：
>
> | 剩餘時間／volatility | 88 call（OTM） | 72 call（ITM） | 72 put（OTM） |
> |---|---|---|---|
> | 0.05 年／20% | 62.8 | 9.9 | −66.1 |
> | 0.15 年／30% | 15.8 | 7.5 | −15.3 |
> | 0.5 年／45% | 5.0 | 3.9 | −4.1 |

想用同樣資金追求最大百分比報酬的人，理論上應選「接近到期、低 volatility 環境中的 OTM option」——但實務上買賣價差（bid-ask spread）與流動性可能讓這種大 lambda position 不如直接交易 underlying。

### 9.6 總整理

> 💡 **一句話**：兩張表把每個 Greek「誰對誰、何時最大」整理好，當查表用。（可先跳過，需要時再查）

**傳統風險指標**（C=call 值、P=put 值、S=underlying 價格、t=時間、σ=volatility）

| 名稱 | 衡量什麼對什麼 | 數學 | 何時最大 |
|---|---|---|---|
| Delta | 理論值 ← underlying 價格（點） | $\partial C/\partial S$ | deep ITM |
| Lambda（Ω、彈性） | 理論值 ← underlying 價格（百分比） | $\Delta\cdot S/C$ | OTM、近到期、低 volatility |
| Gamma（曲率） | Delta ← underlying 價格 | $\partial^2C/\partial S^2$ | ATM、近到期、低 volatility |
| Theta | 理論值 ← 時間 | $\partial C/\partial t$ | ATM、近到期、高 volatility |
| Vega | 理論值 ← volatility | $\partial C/\partial\sigma$ | ATM、長天期 |
| Rho | 理論值 ← 利率 | $\partial C/\partial r$ | deep ITM、長天期 |
| Phi（rho_f） | 理論值 ← 外國利率／股利率（dividend yield） | $\partial C/\partial r_f$ | deep ITM、長天期 |

**高階（非傳統）風險指標**

| 名稱 | 衡量什麼對什麼 | 何時最大（大約） |
|---|---|---|
| Vanna | Delta ← volatility；也等於 Vega ← 價格 | delta 15–20、80–85；低 volatility |
| Charm（delta decay） | Delta ← 時間 | delta 15–20、80–85；近到期 |
| Speed | Gamma ← 價格 | delta 15、85；近到期、低 volatility |
| Color（gamma decay） | Gamma ← 時間 | ATM；近到期、低 volatility |
| Volga（vomma） | Vega ← volatility | delta 10、90；長天期 |
| Vega decay | Vega ← 時間 | delta 約 10–90 之間；近到期 |
| Zomma | Gamma ← volatility | ATM；近到期、低 volatility |

## 交易員視角

- **Optibook 的 implied delta 問題**：你的 hedge 程式若用「當下市場報價（quote）反推的 implied volatility」算 delta，那麼別隊機器人一改 quote，你的 delta 就變了，可能觸發不必要的 hedge 交易（每次都付價差）。實務上常用較平滑的 volatility 估計（例如固定的波動率曲面（volatility surface），定期更新）來計算 delta，避免被 quote 雜訊牽著走。
- **到期前的 charm 與 gamma**：接近到期時，就算 underlying 不動，ITM OTM option 的 delta 也每天大幅漂移（charm），ATM 的 gamma 爆炸。若模擬賽有到期日（expiration date），最後幾天要特別降低 ATM option 的淨 position，否則部位上限（position limit）可能讓你來不及 hedge。
- **跨 underlying 比較 gamma**：gamma 與價格成反比，比較不同價位 underlying 的風險時，應改用「1% 移動的美元 gamma」（$\tfrac12\Gamma S^2\times0.01^2$）而非原始 gamma。
- **Vega position 集中在長天期**：同樣口數下長天期 vega 大得多。若你在 Optibook 上同時做多個到期月，要按到期分組看 vega，而不是只看總和（各到期的 implied volatility 未必同步移動）。
- **Lambda 與資金效率**：deep OTM option lambda 大，看似槓桿高，但在模擬盤上 bid-ask spread 相對權利金（premium）可能高達 20–50%，實際報酬會被成本吃掉。

## 常見誤區

1. **誤解**：delta 中立的 position 只要 underlying 不動就會一直中立。→ **正解**：時間經過（charm）與 implied volatility 變動（vanna）都會改變 delta。
2. **誤解**：所有 Greeks 都與 underlying 價格成正比。→ **正解**：ATM theta、vega 與價格成正比，但 gamma 與價格成反比。
3. **誤解**：volatility 升高時 gamma 一定上升。→ **正解**：ATM gamma 隨 volatility 上升而**下降**；只有 ITM OTM option 的 gamma 會上升。
4. **誤解**：ATM vega 會隨 volatility 大幅變化。→ **正解**：ATM option 價值對 volatility 近乎線性，vega 幾乎不變（volga ≈ 0）；volga 主要出現在 ITM OTM option。
5. **誤解**：時間平方根法可估計任何 option 的 theta。→ **正解**：只適用 ATM option。
6. **誤解**：lambda 大的 option 一定是好投資。→ **正解**：lambda 只是理論槓桿；bid-ask spread、流動性與時間耗損都會侵蝕實際報酬。

## 重點摘要

| 條件變化 | Delta | Theta（絕對值） | Vega | Gamma |
|---|---|---|---|---|
| volatility ↑ | 往 50 靠攏 | 升（ATM 線性） | ATM 幾乎不變、ITM 外升 | ATM 降、ITM 外升 |
| 時間經過 | 遠離 50 | ATM 升、ITM 外降 | 降（長天期 vega 大） | ATM 升、ITM 外降 |
| underlying 移向 strike | 往 50 | 升 | 升 | 升 |

| 速記 | 內容 |
|---|---|
| ATM 三最大 | gamma、theta、vega 都在 ATM 最大 |
| 比例關係 | ATM theta、vega ∝ 價格；gamma ∝ 1/價格 |
| 時間平方根法 | $\Theta\approx TV(1-\sqrt{(t-1)/t})$（ATM） |
| Lambda | $\Lambda=\Delta\cdot S/TV$；OTM、近到期、低 volatility 最大 |
| 最危險 | 近到期 + 低 volatility + ATM |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A5、B1、B2、B4）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 為什麼 volatility 上升時，OTM call 的 delta 會上升、ITM call 的 delta 會下降？

<details><summary>解答</summary>

Delta 近似「到期 ITM 的機率」。高 volatility 使 OTM option 更可能變成 ITM（delta 升），也使 ITM option 更可能變成 OTM（delta 降），兩者都往 ATM 的 50 靠攏。

</details>

**A2.** 「時間經過」對 delta 的效果與「volatility 上升」還是「volatility 下降」相似？為什麼？

<details><summary>解答</summary>

與 volatility 下降相似。兩者都減少到期前大幅移動的可能性，讓 OTM 更可能維持 OTM、ITM 更可能維持 ITM，即 delta 遠離 50。

</details>

**A3.** 為什麼 ATM gamma 與價格成反比，而 ATM theta、vega 與價格成正比？

<details><summary>解答</summary>

模型以百分比衡量變動。ATM option 價值、theta、vega 都與「underlying 價值規模」成正比（買更貴資產的權利更貴，耗損的 time value 也更多）。但 gamma 是「每 1 點移動」的 delta 變化：在高價 underlying 上 1 點只是很小的百分比，所以 delta 變得少；在低價 underlying 上 1 點是大的百分比，delta 變得多。

</details>

**A4.** 某交易員說：「我只做 OTM 10 delta 的 option，所以 vega 風險對 volatility 變化不敏感。」這說法對嗎？

<details><summary>解答</summary>

不對。delta 約 10（或 90）的 option volga 最大：volatility 上升時其 vega 會明顯增加（行為越來越像 ATM），因此 vega 風險本身對 volatility 很敏感。ATM option 的 vega 才是對 volatility 最不敏感的。

</details>

**A5.** ⭐ 為什麼「接近到期、低 volatility 環境中的 ATM option」被視為最危險？

<details><summary>提示</summary>

分兩步想：gamma 在什麼價性最大？ATM gamma 遇到「時間經過」和「volatility 下降」會變大還是變小？

</details>

<details><summary>解答</summary>

Gamma 在 ATM 最大，而 ATM gamma 隨時間經過與 volatility 下降而上升。在這種環境中，underlying 小幅移動就讓 delta 從 50 迅速衝向 0 或 100，方向風險變化極快，hedge 困難；賣出這種 option 的 position 尤其危險。

</details>

**A6.** 說明 vanna 的兩種解讀，並解釋為何它們在數學上相同。

<details><summary>解答</summary>

(1) delta 對 volatility 的敏感度 $\partial\Delta/\partial\sigma$；(2) vega 對 underlying 價格的敏感度 $\partial\text{Vega}/\partial S$。兩者都是 $\partial^2V/\partial S\partial\sigma$，對平滑函數而言混合偏導數的順序可交換，所以相同。

</details>

### B. 計算題

**B1.** ⭐ ATM option 剩 25 天、價值 2.00。用時間平方根法估計今天的 theta，以及明天（剩 24 天）的 theta。

<details><summary>提示</summary>

直接套時間平方根法：今天 theta = 2.00 ×（1 − √(24/25)）；明天先用 2.00 減掉今天的 theta 當新價值，再套 √(23/24)。

</details>

<details><summary>解答</summary>

今天：$2.00\times(1-\sqrt{24/25})=2.00\times(1-0.97980)=0.04041$。
明天價值 $\approx2.00-0.0404=1.9596$；theta $\approx1.9596\times(1-\sqrt{23/24})=1.9596\times0.02106=0.04126$。

</details>

**B2.** ⭐ 某 ATM option 在 $S=K=50$ 時 theta −0.030、vega 0.10、gamma 8.0。另一個條件完全相同、但 $S=K=150$ 的 ATM option，其 theta、vega、gamma 約為多少？

<details><summary>提示</summary>

價格放大幾倍？theta、vega 跟價格成正比，gamma 跟價格成反比。

</details>

<details><summary>解答</summary>

價格放大 3 倍：theta、vega 也放大 3 倍：theta −0.090、vega 0.30；gamma 縮小為 1/3：8.0/3 = 2.67。

</details>

**B3.** 某 ATM option 在 volatility 18% 時 theta −0.027。若 volatility 升到 27%（其他不變，忽略利息），theta 約為多少？

<details><summary>解答</summary>

ATM theta 與 volatility 近似成正比：$-0.027\times27/18=-0.0405$。

</details>

**B4.** ⭐ call 價值 1.60、delta 30、underlying 價格 72。求 lambda；若 underlying 上漲 2%，call 約上漲多少百分比、多少點？

<details><summary>提示</summary>

lambda = delta（換成小數 0.30）× 72 ÷ 1.60；百分比變動 = lambda × 2%，再乘回 premium 換成點數。

</details>

<details><summary>解答</summary>

$\Lambda=0.30\times72/1.60=13.5$。underlying 漲 2% → call 約漲 $13.5\times2\%=27\%$，即 $0.27\times1.60=0.432$ 點（驗算：$0.30\times72\times0.02=0.432$ ✔）。

</details>

**B5.** 你持有 50 口 call，用 implied delta hedge：implied volatility 30% 時 delta 35，你賣出 17 口 underlying。implied volatility 降到 26% 後 delta 變成 32。position delta 變成多少？要怎麼調整？

<details><summary>解答</summary>

原：$50\times35-1700=+50$。新：$50\times32-1700=-100$。需買回 1 口 underlying（使 position 回到 0）。

</details>

**B6.** 100 call 在 underlying 98 時 delta 30，underlying 102 時 delta 70。求這段區間的平均 gamma。若改為較長天期，同區間 delta 為 46 與 56，平均 gamma 又是多少？

<details><summary>解答</summary>

短天期：$(70-30)/4=10$。長天期：$(56-46)/4=2.5$。

</details>

### C. 交易情境題

**C1.** 週五收盤，你在 Optibook 持有一個 delta 中立的組合：+30 口 110 call、−8 口 underlying（另有其他 position，總 delta ≈ 0）。剩 3 天到期，underlying 100，市場很平靜。週一開盤時 underlying 仍為 100。你預期 position delta 會如何變化？應該如何準備？

<details><summary>解答</summary>

110 call 是 OTM。時間經過會使 OTM call delta 下降（負 charm），而且接近到期時 charm 很大；週末三天占剩餘時間極大比例，週一這些 call 的 delta 可能從 25 掉到接近個位數。position 會變成淨空頭 delta（−8 口 underlying 不再被抵銷）。準備：週五收盤前或週一開盤時預先計算新 delta，必要時買回部分 underlying；同時注意 ATM 附近 gamma 暴增，若 underlying 往 110 走，delta 會快速回升，需留意 position limit。

</details>

**C2.** 你的隊友想用全部資金買進「下週到期、deep OTM」的 call，理由是 lambda 高達 60，underlying 漲 5% 就能翻好幾倍。你會如何評估？

<details><summary>解答</summary>

Lambda 60 是瞬間的理論彈性：(1) 這類 option 價格很低，bid-ask spread 占 premium 比例極高，進出成本可能吃掉大部分潛在報酬；(2) 時間耗損與 charm 讓 delta、價值每天快速下滑，若 underlying 不在幾天內大漲，價值趨近 0；(3) 大幅上漲時 lambda 會隨 ITM 程度下降，翻倍效果不是線性的；(4) 這是高度方向性押注，與做市（market making）／volatility 交易目標不符。若真看漲，應比較直接買 underlying、較近 ATM 的 call 或價差策略的風險報酬。

</details>

### D. 挑戰題

**D1.** (a) 從 BS 公式出發（$r=q=0$），證明 ATM option 的價值約為 $0.4\,S\sigma\sqrt t$，並由此推導：ATM vega（每 1 點）約 $0.004\,S\sqrt t$、ATM 每日 theta 約 $-0.2S\sigma/(365\sqrt t)$（$t$ 以年計）、ATM gamma（每點、以 delta 單位）約 $40/(S\sigma\sqrt t)$。(b) 用 $S=100$、$\sigma=30\%$、$t=0.25$ 檢驗：BS 實際值為價值 5.98、vega 0.199、theta −0.033、gamma 2.65。(c) 由這些近似式說明本章三個比例關係（theta、vega ∝ S；gamma ∝ 1/S）以及「ATM theta ∝ σ」「ATM vega 與 σ 無關」。

<details><summary>解答</summary>

(a) $S=K$、$r=0$：$d_1=\tfrac12\sigma\sqrt t$、$d_2=-\tfrac12\sigma\sqrt t$。$C=S[N(d_1)-N(d_2)]\approx S\cdot n(0)\cdot\sigma\sqrt t=0.3989\,S\sigma\sqrt t\approx0.4S\sigma\sqrt t$。
- Vega $=\partial C/\partial\sigma\approx0.4S\sqrt t$（每 1.00 volatility），每 1 點 = $0.004S\sqrt t$。
- Theta（每年）：時間經過使 $t$ 變小，價值變化率 $=-\partial C/\partial t\approx-0.2S\sigma/\sqrt t$；每日再除以 365：$-0.2S\sigma/(365\sqrt t)$。
- Gamma $=n(d_1)/(S\sigma\sqrt t)\approx0.4/(S\sigma\sqrt t)$，以 delta 單位 ×100 → $40/(S\sigma\sqrt t)$。


(b) 價值 $0.4\times100\times0.3\times0.5=6.0$（BS 5.98）；vega $0.004\times100\times0.5=0.20$（0.199）；每日 theta $-0.2\times100\times0.3/(365\times0.5)=-0.0329$（−0.033）；gamma $40/(100\times0.3\times0.5)=2.67$（2.65）。

(c) 價值、vega、theta 的式子都有一個 $S$ 因子 → 與價格成正比；gamma 的分母有 $S$ → 與價格成反比。Theta 式含 $\sigma$ 一次方 → ATM theta ∝ σ；vega 式不含 σ → ATM vega 幾乎與 volatility 無關（volga ≈ 0）。另外 theta 含 $1/\sqrt t$ → 接近到期加速（時間平方根法的來源）；gamma 含 $1/(\sigma\sqrt t)$ → 近到期、低 volatility 時 ATM gamma 暴增。

</details>

## 自我檢核清單

- [ ] 能畫出（或描述）call／put delta 隨 volatility 與時間變化的方向。
- [ ] 能解釋 implied delta 為何讓 position 在 underlying 不動時失衡。
- [ ] 能說出 gamma、theta、vega ATM 最大，以及它們與價格的比例關係。
- [ ] 能用時間平方根法估算 ATM theta。
- [ ] 能說出 vanna、charm、volga、vega decay、speed、color、zomma 的定義與大約何時最大。
- [ ] 能計算 lambda 並說明何時最大。
- [ ] 能說明為何近到期、低 volatility 的 ATM option 最危險。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab05_greeks.py`](../labs/exercises/lab05_greeks.py)：實作 `delta`、`gamma`、`vega`、`theta`、`rho`、`lambda_elasticity`、`atm_greeks_approx`、`finite_difference_greeks`、`vanna`、`volga`、`taylor_pnl`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab05_greeks.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`../labs/`](../labs/) → **lab05_greeks**：用數值差分計算本章所有高階 Greeks（vanna、charm、volga、speed、color、zomma），畫出它們對 delta 的曲線；實作 lambda 並驗證時間平方根法。
