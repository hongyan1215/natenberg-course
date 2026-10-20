# 第 12 章　多頭與空頭價差（Bull and Bear Spreads）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：看漲或看跌時，別只單買一張選擇權（option）賭到底；用「垂直價差（vertical spread）」表達方向——風險有上限、delta 不會翻號，再依隱含波動率（implied volatility）高低挑對履約價（strike price）。

**你只需要先記住這 5 件事**

1. **裸買裸賣的容錯空間太小。** 買方要方向對「而且走得夠多夠快」；賣方怕暴走反向。例：期貨（futures） 200 買 210 買權（call）付 4.82，到期漲到 212 還是虧 2.82。
2. **比率價差（ratio spread）、蝶式（butterfly）、日曆價差（calendar spread）的 delta 會翻轉。** 它們本質是波動率（volatility）部位（position）：偏多的 ratio spread 大漲後可能變偏空，backspread 市場不動幾週也會翻空。
3. **vertical spread：買低 strike、賣高 strike = 多頭（call、賣權（put）都一樣）。** 到期價值介於 0 和 strike 間距之間，delta 永遠不會翻號。
4. **總方向 position = 價差 delta × 組數。** 想要 +600 delta，用 delta 15 的價差就做 40 組。
5. **挑選法則：implied volatility 偏低 → 買價平（at-the-money, ATM）；偏高 → 賣 ATM**，另一隻腳依方向決定。因為 ATM 的 vega 最大，便宜或貴的點數都最多。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 多頭買權價差（bull call spread）最大損失 | 付出的權利金（premium） |
| bull call spread 最大獲利 | strike 間距 − 付出的 premium |
| bull call spread 損益兩平（breakeven） | 低 strike + 付出的 premium |
| 同 strike 對的 call 價差 + put 價差 | 無利息時 = strike 間距 |
| 理論優勢（theoretical edge）（買進時） | 價值（用你的 volatility）− 價格（用 implied volatility） |
| 含價內（in-the-money, ITM）腿 vs 含價外（out-of-the-money, OTM）腿 | ITM 那組：正 theta、不跌就賺；OTM 那組：正 gamma、要漲才賺 |

**必做練習（約 20 分鐘）**：A1、B1、B4、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[策略損益建構器](https://hongyan1215.github.io/natenberg-course/tools/strategy-builder/)，組一個 bull call spread 和一個 ratio spread，拖動股價看 delta 怎麼變。

---

## 本章定位

前兩章（[ch10](ch10_intro_spreading.md)、[ch11](ch11_volatility_spreads.md)）談的是 delta 中性的波動率價差（volatility spread）；本章轉向「我對方向有看法」時，怎樣用 option 表達方向，同時不讓 volatility 因素反過來吃掉你的方向觀點。前置知識：Greeks 的基本性質（[ch07](ch07_risk_measurement_1.md)、[ch09](ch09_risk_measurement_2.md)），特別是「時間流逝或 volatility 下降時，delta 會往 0 或 100 移動」與「ATM option 的 vega 最大」。

## 學習目標

1. 能說明為什麼用裸買/裸賣 option 表達方向的容錯空間很小。
2. 能計算 ratio spread、butterfly、calendar spread 在標的（underlying）大漲或時間流逝後的 delta，並判斷 delta 何時會「翻轉」。
3. 能寫出四種 vertical spread 的組成、到期價值範圍、最大損益與 breakeven 點。
4. 能依「價差 delta × 口數」配置出目標方向 position（例如 600 delta）。
5. 能依 implied volatility 高低，判斷應該以「買進 ATM」或「賣出 ATM」為核心來挑選 vertical spread，並計算 theoretical edge。
6. 能描述多頭 vertical spread 的 delta、gamma、theta、vega 隨 underlying 價格變化的形狀。
7. 能比較 vertical spread 與直接持有 underlying 在風險、報酬與 volatility 維度上的差異。

## 核心概念

### 12.1 裸部位（Naked Positions）

> 💡 **一句話**：單買單賣表達方向最簡單，但方向要對「而且夠大」，容錯空間很小。

**直覺**：最簡單的方向 position 就是單買或單賣一種 option：

| 看法 | implied volatility 偏低（option 便宜） | implied volatility 偏高（option 貴） |
|---|---|---|
| 看多 | 買 call | 賣 put |
| 看空 | 買賣權（long put） | 賣 call |

**問題在於容錯空間（margin for error）太小**：

- 買方：方向錯會虧；方向對但走得不夠快，時間價值（theta）照樣把你磨掉。
- 賣方：時間站在你這邊，但一旦 underlying 劇烈反向，損失理論上沒有上限。

**例題 12-1**　futures 在 200，買一口 10 週後到期的 210 call 付 4.82（implied volatility 25%）。到期時 futures 漲到 212——方向對了，但到期價值只有 2，仍虧 2.82。方向要「對、而且夠大」，breakeven 在 214.82。

> 有經驗的交易員偏好「方向看法 + 較寬容錯空間」的結構，這正是本章後半推薦 vertical spread 的原因。

### 12.2 多頭與空頭比率價差（Bull and Bear Ratio Spreads）

> 💡 **一句話**：ratio spread 主要是 volatility position；大漲或時間流逝後，原本偏多可能翻成偏空。

**直覺**：ratio spread 本質上是 volatility position，但你可以故意把比例調得不對稱，讓它帶一點方向。問題是：**volatility 特性最終會壓過方向特性**。

**設定**（本章後續 12.2、12.3 都用這組自創數字）：futures 61，8 週到期，volatility 32%，利率視為 0。
60 call delta ≈ 58，66 call delta ≈ 29。

**(a) 賣出較多的 ratio spread（負 gamma）**

- delta 中性版：買 1 張 60 call、賣 2 張 66 call → $58 - 2\times 29 \approx 0$
- 偏多版：買 2 張 60、賣 3 張 66 → $2(57.7) - 3(28.6) \approx +30$

偏多版一開始 delta 為正，但它仍是**負 gamma**。若 futures 急漲：

| futures 價格 | 60C delta | 66C delta | 1×2 delta | 2×3 delta |
|---|---|---|---|---|
| 61 | 57.7 | 28.6 | +0.6 | +29.7 |
| 70 | 90.2 | 70.3 | −50.3 | −30.4 |
| 75 | 96.7 | 86.0 | −75.4 | −64.7 |
| 90 | 100.0 | 99.4 | −98.9 | −98.4 |

漲得夠多時兩張 call delta 都趨近 100，2×3 position 趨近 $2\times100 - 3\times100 = -100$。**你看多看對了，position 卻變成看空。**

**(b) 買進較多的 ratio spread（正 gamma，又稱 backspread）**

- 偏多版：賣 1 張 60 call、買 3 張 66 call → $-57.7 + 3(28.6) \approx +28$

這種 position 怕的不是急漲，而是**時間流逝或 volatility 下降**：delta 會遠離 50（ITM 的往 100、OTM 的往 0）。futures 停在 61 不動時：

| 剩餘天數 | 60C delta | 66C delta | −1×+3 delta | −1×+2 delta |
|---|---|---|---|---|
| 56 | 57.7 | 28.6 | +28.0 | −0.6 |
| 35 | 58.6 | 22.8 | +9.8 | −13.0 |
| 21 | 60.0 | 16.2 | −11.5 | −27.7 |
| 10 | 63.3 | 7.2 | −41.6 | −48.8 |

本來偏多的 backspread，市場不動三週後就翻成偏空。

> **重點**：ratio spread 的主要風險是 volatility，方向只是次要。若 volatility 判斷錯，方向特性可能完全翻轉。

### 12.3 多頭與空頭蝶式、日曆價差（Bull and Bear Butterflies and Calendar Spreads）

> 💡 **一句話**：underlying 低於中間 strike 時多頭 butterfly 偏多、高於時偏空；calendar spread 也一樣會翻轉。

**butterfly**：多頭 butterfly 希望到期時 underlying 停在中間 strike。

- underlying 在 100，買 100/105/110 call butterfly：中間 strike 105 高於現價 → 你希望 underlying「漲到 105」→ 初始 delta 為正（偏多 butterfly）。
- 若 underlying 衝過頭到 115，你反而希望它跌回 105 → delta 轉負。
- 規則：**underlying 低於中間 strike 時，多頭 butterfly 偏多；高於中間 strike 時，偏空。**

```
delta
 +  |   ___
    |  /   \
 0  |-/-----\--------------  標的價格
    |        \     /
 -  |         \___/
            ↑中間履約價
```

**calendar spread**：多頭 calendar spread（long calendar，買遠月、賣近月、同 strike）希望近月到期時 underlying 剛好在 strike。

- underlying 100，買 9 月/賣 6 月 110 calendar spread → 希望漲到 110 → 偏多。
- 買 9 月/賣 6 月 90 calendar spread → 希望跌到 90 → 偏空。
- 但它也是負 gamma：underlying 穿越 strike 後 delta 翻轉，形狀與 butterfly 的 delta 圖類似。

兩者的 delta 圖很像，但對**時間與 implied volatility**的反應截然不同（butterfly 負 vega，多頭 calendar spread 正 vega）。期貨選擇權（futures option）中不同月份的 futures 價格可能不同，此時可能要改用對角價差（diagonal spread）才能確保方向。

### 12.4 垂直價差（Vertical Spreads）

> 💡 **一句話**：買低賣高 = 多頭，到期價值在 0 與 strike 間距之間，delta 永不翻號。

**定義**：買一張、賣一張**同類型**（都 call 或都 put）、**同到期**、只差在 strike 的 option。又稱 credit/debit spread 或 vertical spread（早期交易所看板把 strike 由上而下直列，因而得名）。

**為什麼方向特性穩定**：同類型、同到期但不同 strike 的兩張 option，delta 永遠不可能相等。較低 strike 的 call delta 恆大於較高 strike 的 call；較高 strike 的 put delta（絕對值）恆大於較低 strike 的 put。所以價差一開始是多頭，**不管市場怎麼變，永遠是多頭**（delta 可能趨近 0，但不會翻號）。

**到期價值範圍**：

$$0 \le \text{垂直價差到期價值} \le K_H - K_L$$

所以合理價格也必然在 0 與 strike 間距之間；越可能落在高 strike 之上（對 call 價差），價格越接近上限。

**四種基本型態**（以 200/210 為例）：

| 名稱 | 組成 | 現金流 | 方向 |
|---|---|---|---|
| bull call spread | 買 200C、賣 210C | 付出（debit） | 多 |
| 多頭賣權價差（bull put spread） | 買 200P、賣 210P | 收入（credit） | 多 |
| 空頭買權價差（bear call spread） | 賣 200C、買 210C | 收入 | 空 |
| 空頭賣權價差（bear put spread） | 賣 200P、買 210P | 付出 | 空 |

**記憶法則**：不管是 call 還是 put，**買低 strike、賣高 strike = 多頭；買高、賣低 = 空頭**。

為什麼「買 200 put、賣 210 put」是多頭？210 put 的 delta 絕對值比 200 put 大；你賣的是 delta 較負的那張，合計 delta 為正。從損益看：underlying 到期在 210 以上時兩張 put 都歸零，你保住收到的 premium——你希望 underlying 上漲。

**例題 12-2　到期損益**（futures 200，利率 0）
買 200/210 call 價差付 3.91：

- 最大損失 = 3.91（到期 ≤ 200）
- 最大獲利 = 10 − 3.91 = 6.09（到期 ≥ 210）
- breakeven = 200 + 3.91 = 203.91

同時，200/210 **put**價差（買 200P、賣 210P）的到期價值 = 10 − call 價差價值，所以若無利息，兩者價格相加必等於 10（第 14 章會用合成部位（synthetic position）證明）。兩種多頭價差（bull spread）的 delta 與損益輪廓幾乎相同，差別在現金流方向。

```
到期損益（多頭價差）
  +6.09 |            __________
        |           /
      0 |----------/-----------  標的
        |         /
  -3.91 |________/
              200  210
```

### 12.5 選擇到期月份與部位規模

> 💡 **一句話**：先挑符合行情時間的到期月，再用「價差 delta × 組數」湊出想要的方向大小。

挑方向價差的流程：

1. **時間視野**：預期的行情多久會發生？若你認為上漲要 3 個月後才出現，用 1 個月到期的 option 就沒意義。越遠月流動性越差，要一併考慮。
2. **方向強度**：總方向 position = **價差的 delta × 執行口數**。

**例題 12-3**　想建立 +600 delta（相當於買 6 口 futures）：

- 方案 A：用 delta +30 的價差做 20 組；
- 方案 B：用 delta +15 的價差做 40 組。

兩者總 delta 都是 600。

一般而言（同到期、接近 ATM 時），**strike 距離越寬，價差 delta 越大，最大損益也越大**：以下表（futures 200、10 週、volatility 30%）為例，190/200 價差 delta ≈ 15，190/210 價差 delta ≈ 30。但若兩張都深價內（deep in-the-money, deep ITM）或深價外（deep out-of-the-money, deep OTM），delta 都接近 100 或 0，拉寬 strike 對 delta 幾乎沒影響。

### 12.6 依隱含波動率挑選履約價：以價平選擇權為核心

> 💡 **一句話**：隱含偏低就買 ATM、偏高就賣 ATM，另一腳依方向補；這樣拿到最多 theoretical edge。

**設定**：futures 200，10 週到期，利率 0。你自己的 volatility 預估 = 30%。

| volatility | 190C | 190/200 call 價差 | 200C | 200/210 call 價差 | 210C |
|---|---|---|---|---|---|
| 25% | 14.43 | 5.70 | 8.73 | 3.91 | 4.82 |
| **30%（你的預估）** | 15.98 (Δ68) | **5.51** (Δ15) | 10.47 (Δ53) | **4.00** (Δ15) | 6.47 (Δ38) |
| 35% | 17.57 | 5.35 | 12.22 | 4.07 | 8.15 |

兩個價差 delta 都是 +15，方向強度一樣。但「價值」只有和「價格」比才有意義，而價格由市場的 implied volatility 決定：

**情境一：implied volatility 25%（市場偏低）**

- 190/200：付 5.70 買價值 5.51 → 優勢 −0.19
- 200/210：付 3.91 買價值 4.00 → 優勢 **+0.09** ✔

**情境二：implied volatility 35%（市場偏高）**

- 190/200：付 5.35 買價值 5.51 → 優勢 **+0.16** ✔
- 200/210：付 4.07 買價值 4.00 → 優勢 −0.07

**原因**：在總點數上，ATM option 對 volatility 最敏感（vega 最大）。所以當所有 option 都便宜時，ATM 那張「便宜最多點」；都貴時，ATM 那張「貴最多點」。

> **挑選法則**：implied volatility 偏低 → 以**買進 ATM**option 為核心；implied volatility 偏高 → 以**賣出 ATM**option 為核心。另一隻腳則依方向決定。

- 低 implied volatility + 看多：買 200C（ATM），只能再賣 210C → 200/210 bull call spread。
- 高 implied volatility + 看多：賣 200C（ATM），只能再買 190C → 190/200 bull call spread。

**put 也一樣**（同一組條件）：

| volatility | 190P | 190/200 put 價差 | 200P | 200/210 put 價差 | 210P |
|---|---|---|---|---|---|
| 25% | 4.43 | 4.30 | 8.73 | 6.09 | 14.82 |
| 30% | 5.98 (Δ−32) | 4.49 | 10.47 (Δ−47) | 6.00 | 16.47 (Δ−62) |
| 35% | 7.57 | 4.65 | 12.22 | 5.93 | 18.15 |

- 低 implied volatility + 看空：買 200P（ATM）、賣 190P → 付 4.30 買價值 4.49，優勢 +0.19，delta −15。
- 高 implied volatility + 看空：賣 200P（ATM）、買 210P → 付 5.93 買價值 6.00，優勢 +0.07，delta −15。

**為什麼含 ITM 那張的價差總是比較貴？**（以 190/200 vs 200/210 bull call spread 為例）

| 到期情境 | 190/200 | 200/210 |
|---|---|---|
| 大漲到 220 | 10（滿值） | 10（滿值） |
| 大跌到 180 | 0 | 0 |
| **原地 200 不動** | **10（滿值）** | **0** |

- 190/200 只要「不跌」就賺 → 原地不動也受益 → **正 theta、負 gamma**。
- 200/210 需要「漲」才賺 → 需要波動 → **正 gamma、負 theta**。
- 若真的大漲或大跌，200/210 因為成本低，賺得較多、虧得較少。

所以：你認為波動會比市場預期大（你的 volatility > 隱含）→ 偏好 OTM 那組（200/210）；你認為波動會比市場預期小 → 偏好 ITM 那組（190/200）。這和「低隱含買 ATM、高隱含賣 ATM」是同一件事的兩種說法。

### 12.7 實務上的彈性

> 💡 **一句話**：可分腿執行、沒有剛好 ATM 就挑最近的；股票嚴格說要對準平遠期（at-the-forward）。（可先跳過）

- **分腿執行（legging）**：可以一次成交整組價差，也可以先做一腿再補另一腿；先做哪一腿是實務考量，但核心思維仍是「買或賣那張 ATM」。
- **沒有剛好 ATM**：futures 在 203、有 195/200/205/210 strike 時，以最接近的 205 為核心——隱含偏低就買 205，偏高就賣 205。
- **極度看好的槓桿做法**：futures 200 時買 230/240 call 價差，成本約 0.99、delta 約 6.6。單組 delta 很小，但便宜到可以做很多組；若到期站上 240，每組變成 10。不論選哪組，原則仍是「低隱含買接近 ATM 的、高隱含賣接近 ATM 的」。
- **ATM vs at-the-forward**：理論值取決於遠期價格（forward price）而非現價。futures option 兩者相同；股票 option 在高利率、長天期時，at-the-forward strike 可能明顯高於現價（例如股價 100、年利率 6%、9 個月，遠期約 104.5）。實務上抓 ATM 通常不會錯太多，但要知道真正該對準的是遠期。

### 12.8 多頭垂直價差的 Greeks 形狀

> 💡 **一句話**：delta 永遠為正；靠近買的低 strike 時正 gamma／正 vega，靠近賣的高 strike 時相反。

以 190/210 bull call spread（買 190C、賣 210C；10 週、volatility 30%）為例，計算各 futures 價格下的 position Greeks：

| futures | 價值 | delta | gamma（每點 delta 變化） | theta（每日） | vega（每 1 vol 點） |
|---|---|---|---|---|---|
| 170 | 2.04 | +15.6 | +0.77 | −0.028 | +0.129 |
| 180 | 3.99 | +23.1 | +0.68 | −0.027 | +0.126 |
| 190 | 6.58 | +28.3 | +0.34 | −0.015 | +0.071 |
| 200 | 9.51 | +29.6 | −0.08 | +0.004 | −0.019 |
| 210 | 12.37 | +27.0 | −0.42 | +0.023 | −0.106 |
| 220 | 14.83 | +21.9 | −0.58 | +0.034 | −0.161 |
| 230 | 16.72 | +16.0 | −0.58 | +0.038 | −0.175 |

觀察：

- **價值**：介於 0 與 20 之間的 S 形，時間流逝或 volatility 下降時，越來越貼近到期的折線。
- **delta**：永遠為正，在兩 strike 之間形成駝峰；時間越少，駝峰越高越窄。
- **gamma、vega**：underlying 靠近**低 strike**（你買的那張）時為正；靠近**高 strike**（你賣的那張）時為負；中間附近穿越 0。
- **theta**：與 gamma 符號相反——靠近低 strike 為負，靠近高 strike 為正。（隨時間流逝與隨 volatility 下降，theta 圖的細節略有不同。）
- gamma、vega、theta 的極值通常出現在**略低於低 strike**或**略高於高 strike**之處。

```
gamma / vega
   + |  ___
     | /   \
   0 |/-----\-------------  標的
     |       \     ___/
   - |        \___/
        190   210
```

### 12.9 垂直價差 vs. 直接持有標的

> 💡 **一句話**：vertical spread 風險和報酬都有限，還多了 volatility 維度：沒漲甚至小跌也可能賺。

- **風險有限**：+600 delta 可以用 6 口 futures 或 40 組 delta 15 的 vertical spread 達成。40 組聽起來很多，但每組最大損失有限；6 口 futures 的風險是開放式的。
- **報酬也有限**：underlying 大漲時，futures position 賺得無上限，vertical spread 封頂。
- **多了 volatility 這個維度**：不考慮利息時，持有 underlying 只有「方向對」才能賺；option 價差則依 strike 選擇與 volatility 判斷，可能在「沒漲」甚至「小跌」時仍獲利（例如 190/200 在 futures 停在 200 時滿值）。

## 交易員視角

- **在 Optibook 上表達方向**：若你判斷某檔股票會漲，但交易所有部位上限（position limit），直接買股票會很快碰到上限；vertical spread 的 delta 小、最大損失已知，同樣的 delta 曝險可以分散在不同 strike 上，且碰到極端行情時虧損有界。
- **限價 vs IOC**：組合單不一定有原生的價差委託簿。分腿執行時，先用限價單在「ATM 那張」掛出你想要的邊際（隱含偏低時掛買、偏高時掛賣），成交後再用 IOC 單去吃另一腿，縮短裸露在單腿的時間。
- **價格跳動限制**：Optibook 會拒絕離最後成交價太遠的委託。deep OTM 的槓桿價差（如 230/240）兩腿價格都很小，tick size 佔比很大，報價（quote）時要注意每 tick 對 theoretical edge 的影響。
- **持續監控 delta**：ratio spread、butterfly、calendar spread 的 delta 會翻轉，做市（market making）position 若帶有這些結構，避險（hedge）邏輯不能只看開倉時的 delta。

## 常見誤區

1. **誤解**：「put 組成的價差一定是空頭。」→ **正解**：買低 strike、賣高 strike 就是多頭，不管是 call 還是 put。
2. **誤解**：「ratio spread 調成偏多，就會一直偏多。」→ **正解**：負 gamma ratio spread 在大漲後會翻成偏空；正 gamma backspread 在時間流逝後也可能翻轉。
3. **誤解**：「兩個 delta 相同的價差，比較便宜的那個就是比較好的交易。」→ **正解**：要比的是價格 vs 價值（theoretical edge），而這取決於 implied volatility 與你的 volatility 預估。
4. **誤解**：「vertical spread 風險有限，所以做很多組也沒關係。」→ **正解**：單組最大損失有限，但總損失 = 單組最大損失 × 組數；仍需控制總 delta 與總虧損上限。
5. **誤解**：「挑方向價差只看 delta。」→ **正解**：還要看 gamma/theta（ITM 那組正 theta、OTM 那組正 gamma）以及 implied volatility 是否偏高或偏低。

## 重點摘要

| 項目 | 規則 / 公式 |
|---|---|
| 多頭 vertical spread | 買低 strike、賣高 strike（同類型、同到期） |
| 空頭 vertical spread | 買高 strike、賣低 strike |
| 到期價值範圍 | $0 \le V \le K_H - K_L$ |
| bull call spread breakeven | $K_L + \text{淨付出}$ |
| call 價差 + put 價差（同 strike 對） | 無利息時 $= K_H - K_L$；有利息（股票型結算（stock-type settlement））時 $=$ 現值 |
| 總方向 position | 價差 delta × 口數 |
| 挑選法則 | 隱含低 → 買 ATM；隱含高 → 賣 ATM |
| 含 ITM 腿的價差 | 較貴、正 theta、負 gamma（不跌就賺） |
| 含 OTM 腿的價差 | 較便宜、正 gamma、負 theta（要漲才賺） |
| delta 會翻轉的方向 position | ratio spread、butterfly、calendar spread |
| delta 不會翻號 | vertical spread |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B1、B4、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ 為什麼說「買 100 put、賣 105 put」是多頭部位（long position）？請分別用 delta 與到期損益說明。

<details><summary>提示</summary>

delta：哪一張 put 比較 ITM、delta 比較負？你賣的是哪一張？損益：underlying 到期漲到 105 以上時，兩張 put 各值多少？

</details>

<details><summary>解答</summary>

delta：105 put 比 100 put 更 ITM，delta 更負（例如 −60 vs −40）。position delta = (+1)(−40) + (−1)(−60) = +20 > 0。
到期損益：這是收入（credit）價差。underlying 到期 ≥105 時兩張 put 都歸零，你保住全部 premium；≤100 時虧損最大（5 減 premium）。你希望 underlying 上漲，所以是多頭。

</details>

**A2.** 一個偏多的 1×2 ratio spread（買 1 低 strike call、賣 2 高 strike call，略調成偏多）在 underlying 暴漲時 delta 會如何變化？為什麼？

<details><summary>解答</summary>

會由正轉負，最後趨近 −100（若比例為 1×2）或 2×3 時趨近 −100。因為它是負 gamma：漲越多，賣出的較多張 call delta 一起趨近 100，賣出的 delta 總和超過買進的。方向看對了，position 卻變成看空。

</details>

**A3.** 為什麼 vertical spread 的 delta 永遠不會翻號，但 butterfly 會？

<details><summary>解答</summary>

vertical spread 只有兩張同類型、同到期、不同 strike 的 option，兩者 delta 不可能相等，且大小順序固定（低 strike call delta 恆較大），所以淨 delta 符號固定。butterfly 有買有賣且賣出兩張中間 strike，position gamma 在中間 strike 附近為負；underlying 穿越中間 strike 時，position 從「希望上漲」變成「希望下跌」，delta 翻號。

</details>

**A4.** implied volatility 偏高時，為什麼挑 vertical spread 應該以「賣出 ATM option」為核心？

<details><summary>解答</summary>

ATM option 在總點數上 vega 最大。所有 option 都被高估時，ATM 那張被高估的點數最多；把它賣掉能拿到最多 theoretical edge。再搭配另一隻腳完成想要的方向（看多就買較低 strike 的 call，看空就買較高 strike 的 put）。

</details>

**A5.** underlying 不動時，190/200 bull call spread 與 200/210 bull call spread（underlying 現價 200）哪一個受益？各自的 gamma/theta 符號為何？

<details><summary>解答</summary>

190/200 受益：underlying 停在 200 時它到期滿值 10，而 200/210 歸零。所以 190/200 是正 theta、負 gamma；200/210 是負 theta、正 gamma。

</details>

**A6.** 為什麼股票 option 挑方向價差時，嚴格來說應該對準「at-the-forward」而不是「ATM」？

<details><summary>解答</summary>

option 理論值由 underlying 的 forward price 決定（遠期 = 現價加持有成本（cost of carry）減股利（dividend））。在高利率、長天期時，遠期可能明顯高於現價，delta 最接近 50、vega 最大的那張是 strike 接近遠期的 option，而不是接近現價的。futures option 的 underlying 本身就是 forward price，所以兩者一致。

</details>

### B. 計算題

**B1.** ⭐ futures 150，買 145/155 bull call spread 付 4.60（利率 0）。求最大獲利、最大損失、breakeven 點。

<details><summary>提示</summary>

這是付出（debit）價差：最大損失就是付的錢；最大獲利 = strike 間距 − 付的錢；breakeven = 低 strike + 付的錢。

</details>

<details><summary>解答</summary>

最大損失 = 4.60；最大獲利 = 10 − 4.60 = 5.40；breakeven = 145 + 4.60 = 149.60。

</details>

**B2.** 承 B1，若同一組 145/155 **put**價差（買 145P、賣 155P）在無利息下應值多少？這是收入還是付出？

<details><summary>解答</summary>

call 價差 + put 價差 = 10 → put 價差 = 10 − 4.60 = 5.40。由於 155P 比 145P 貴，「買 145P、賣 155P」是**收入** 5.40（bull put spread）。最大獲利 5.40（到期 ≥155），最大損失 10 − 5.40 = 4.60（到期 ≤145），breakeven 155 − 5.40 = 149.60，與 call 版相同。

</details>

**B3.** 你要建立 +900 delta 的方向 position。可用的價差 delta 為 +18。需要幾組？若改用 delta +36 的價差呢？

<details><summary>解答</summary>

900 / 18 = 50 組；900 / 36 = 25 組。

</details>

**B4.** ⭐ futures 200、10 週到期、利率 0。你的 volatility 預估 30%，市場 implied volatility 25%。用 12.6 節的表格計算：買 200/210 call 價差、買 190/200 call 價差各自的 theoretical edge。應選哪一個？

<details><summary>提示</summary>

價格用 25% 那一列、價值用 30% 那一列；價差 = 低 strike call − 高 strike call。優勢 = 價值 − 價格，選正的那個。

</details>

<details><summary>解答</summary>

200/210：價格（25%）= 8.73 − 4.82 = 3.91；價值（30%）= 10.47 − 6.47 = 4.00；優勢 = +0.09。
190/200：價格 = 14.43 − 8.73 = 5.70；價值 = 15.98 − 10.47 = 5.51；優勢 = −0.19。
應選 200/210（買進 ATM 200C）。

</details>

**B5.** 同 B4 條件但 implied volatility 35%、你看空。比較「買 200P、賣 190P」與「買 210P、賣 200P」的 theoretical edge。

<details><summary>解答</summary>

買 200P 賣 190P：價格 = 12.22 − 7.57 = 4.65；價值 = 10.47 − 5.98 = 4.49；優勢 = −0.16。
買 210P 賣 200P：價格 = 18.15 − 12.22 = 5.93；價值 = 16.47 − 10.47 = 6.00；優勢 = +0.07。
選後者（賣出 ATM 200P），delta ≈ −62 + 47 = −15。

</details>

**B6.** futures 61，60 call delta 58、66 call delta 29。(a) 買 2 張 60C、賣 3 張 66C 的 position delta？(b) 若漲到 75 時 delta 分別變成 97 與 86，新的 position delta？

<details><summary>解答</summary>

(a) 2×58 − 3×29 = 116 − 87 = +29。
(b) 2×97 − 3×86 = 194 − 258 = −64。由偏多翻成偏空。

</details>

### C. 交易情境題

**C1.** ⭐ 你在 Optibook 某股票 option 上看多，股價 200（dividend、利率可忽略），10 週 option 的 implied volatility 約 35%，你的預估是 30%。position limit 讓你最多再持有 +600 delta。請設計交易並說明理由。

<details><summary>提示</summary>

先看 implied volatility 比你的預估高還是低，決定要「買」還是「賣」ATM 200C；看多的話另一腳要買哪一張？最後用 600 ÷ 價差 delta 算組數。

</details>

<details><summary>解答</summary>

隱含偏高 → 以賣出 ATM（200C）為核心，看多 → 搭配買進較低 strike 190C，形成 190/200 bull call spread。依 12.6 節表格，每組價格約 5.35、價值 5.51、優勢約 +0.16、delta 約 +15。600 / 15 = 40 組。
理由：(1) 方向符合；(2) 賣出 ATM 拿到最多高估的 vega；(3) 正 theta，股價原地不動也有利；(4) 最大損失 40 × 5.35 = 214 點，已知且有界。執行上可先用限價單賣 200C，成交後以 IOC 買 190C 補腿。

</details>

**C2.** 你持有 50 組偏多的 −1×+3 call backspread（賣 1 張 60C、買 3 張 66C），開倉時 position delta +28/組。三週後 underlying 仍在 61、implied volatility 下滑，你發現 position delta 變成 −11.5/組。你仍然看多，該怎麼辦？

<details><summary>解答</summary>

這是正 gamma position 在時間流逝與 volatility 下降下 delta 遠離 50 的典型翻轉。先承認：這個 position 的主要風險是 volatility 而非方向；你看多的觀點已經不被這個結構表達。選項：(1) 若 volatility 觀點也已失效（underlying 根本不動），減碼或平倉 backspread；(2) 若仍想保留方向，改用 vertical spread（delta 不會翻號）重新建立方向 position，或用 underlying/futures 補回正 delta（underlying 沒有 gamma/vega，不會改變其他風險）。不要因為「開倉時是偏多」就假設它仍偏多。

</details>

### D. 挑戰題

**D1.** 證明：在利率為 0 的歐式選擇權（European option）下，同 strike 對 $K_L < K_H$ 的 bull call spread 價格 $V_C$ 與 bull put spread 價格 $V_P$（後者以「付出為正」計，即 $P_L - P_H$，通常為負）滿足 $V_C - V_P = K_H - K_L$；並說明兩者 delta 為何相等。

<details><summary>解答</summary>

到期時：call 價差 $=\min(\max(S-K_L,0), K_H-K_L)$；put 價差（買 $K_L$P、賣 $K_H$P）的價值 $=\max(K_L-S,0)-\max(K_H-S,0)$，其值介於 $-(K_H-K_L)$ 與 0。逐段檢查：$S\le K_L$：call 價差 0，put 價差 $-(K_H-K_L)$；$K_L<S<K_H$：call 價差 $S-K_L$，put 價差 $-(K_H-S)$；$S\ge K_H$：call 價差 $K_H-K_L$，put 價差 0。三段中「call 價差 − put 價差」恆為 $K_H-K_L$，到期報酬差為常數，無套利（arbitrage）下今天的價格差也為該常數（利率 0）。常數對 underlying 的導數為 0，因此兩者 delta 相同。（第 14 章用 synthetic position 會給出更直接的證明。）

</details>

## 自我檢核清單

- [ ] 不看筆記寫出四種 vertical spread 的組成，並判斷多空。
- [ ] 能說出「買低賣高 = 多頭」對 call 與 put 都成立的理由。
- [ ] 能計算 vertical spread 的最大損益與 breakeven 點。
- [ ] 能用「價差 delta × 口數」配出目標方向 position。
- [ ] 能說明 ratio spread、butterfly、calendar spread 的 delta 何時會翻轉。
- [ ] 能依 implied volatility 高低決定買或賣 ATM option，並算出 theoretical edge。
- [ ] 能畫出多頭 vertical spread delta、gamma、theta、vega 的大致形狀。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab07_spreads.py`](../labs/exercises/lab07_spreads.py)：實作 `make_leg`、`straddle`、`strangle`、`vertical_spread`、`butterfly`、`calendar_spread`、`ratio_spread`、`position_value`、`position_greeks`、`classify_spread`、`delta_neutral_ratio`、`breakeven_volatility`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab07_spreads.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab07_spreads**（[../labs/](../labs/)）：用策略建構器輸入本章 12.6 節的四組 vertical spread，計算在 25%/30%/35% implied volatility 下的價格、價值與 theoretical edge；再掃描 futures 價格 160–240，重現 12.8 節的 Greeks 表，並畫出 2×3 ratio spread delta 隨價格與時間的變化，確認翻轉點。
