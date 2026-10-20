# 第 11 章　波動率價差（Volatility Spreads）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：波動率價差（volatility spread）就是「用選擇權（option）對沖 option」，不賭方向，只賭兩件事：標的（underlying）會晃多大（gamma），以及隱含波動率（implied volatility）會漲還是跌（vega）。各種花俏名字，最後都能歸進四個格子。

**你只需要先記住這 5 件事**

1. **四象限分類。** +gamma/+vega：長跨式（long straddle）、長勒式（strangle）、短蝶式（short butterfly）、買多的比率價差（ratio spread）；−gamma/−vega：反過來；−gamma/+vega：長日曆；+gamma/−vega：短日曆。
2. **買的比賣的多 → 想要大動、想要 implied volatility 升；賣的比買的多 → 想要平靜、想要 implied volatility 降。** 跨式（straddle）、strangle 最猛（賺賠都最大），蝶式（butterfly）、兀鷹（condor）最溫和（兩邊都有限），ratio spread、聖誕樹介於中間。
3. **butterfly = 有限風險的 straddle，condor = 有限風險的 strangle。** butterfly 比例永遠 1 × 2 × 1，到期價值介於 0 和履約價（strike price）間距之間，最大在中間 strike。
4. **長日曆（買遠月、賣近月）= 希望 underlying 不動、但 implied volatility 上升。** 因為近月 theta 耗得快、遠月 vega 比較大。前提是各月份 implied volatility 同幅變動。
5. **選策略的原則：implied volatility 比你的預測低 → 做正 vega；比你的預測高 → 做負 vega。** 再依你最怕哪個方向，挑風險有限的那一種。

**必背卡**

| 策略 | 記法 |
|---|---|
| straddle 損益兩平（breakeven） | strike ± 權利金（premium） |
| 長蝶式（long butterfly） | 最大利潤 = 間距 − 成本；breakeven = 低 strike + 成本、高 strike − 成本 |
| 長 condor | 同 butterfly，間距看外側兩對 strike |
| ratio spread（買多） | 通常收錢建立；最大損失在買進的 strike |
| 長時間蝶式（time butterfly） | 買身體、賣翼（和普通 butterfly 相反），特性像長日曆 |

**必做練習（約 20 分鐘）**：A3、B2、B4、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[策略損益建構器](https://hongyan1215.github.io/natenberg-course/tools/strategy-builder/)工具，點 straddle、butterfly 等策略按鈕，對照到期損益和 gamma、vega 的正負號。

---

## 本章定位

第 8 章用「underlying」對 option 做 delta 避險（hedge）；但 hedge 工具也可以是**其他 option**。用 option 對沖 option、整體近似 delta 中立、主要押注「波動幅度」與「implied volatility」的組合，統稱**volatility spread**。這是 option 做市（market making）與自營交易的核心工具箱：straddle、strangle、butterfly、condor、ratio spread、聖誕樹、日曆價差（calendar spread）、time butterfly、對角價差（diagonal spread）。本章逐一拆解它們的到期損益與 delta/gamma/theta/vega/rho 特性，再談如何依 implied volatility 選擇策略、如何調整、如何下價差單。前置章節：[ch04 到期損益](ch04_expiration_pnl.md)、[ch07](ch07_risk_measurement_1.md)／[ch09](ch09_risk_measurement_2.md) 風險衡量、[ch08 動態避險](ch08_dynamic_hedging.md)、[ch10 價差入門](ch10_intro_spreading.md)。

> 對應原書：第 11 章〈Volatility Spreads〉

## 學習目標

1. 能寫出 straddle、strangle、butterfly、condor、ratio spread、聖誕樹、calendar spread、time butterfly、diagonal spread 的組成，並畫出（或列表）到期損益、算出最大損益與 breakeven 點。
2. 能判斷每種價差的 gamma、theta、vega 正負號，並把它們歸入「+gamma/+vega、−gamma/−vega、−gamma/+vega、+gamma/−vega」四類。
3. 能解釋 calendar spread 為何「時間經過有利、implied volatility 上升有利」，以及利率、股利（dividend）、不同 underlying 期貨（futures）如何影響 calendar spread。
4. 能依「implied volatility 相對你的預測是高或低」選擇正 vega 或負 vega 的價差，並計算其理論優勢（theoretical edge）。
5. 能說出四種調整方法的優缺點，並用 gamma 估算需要調整的 delta。
6. 能從各腿報價（quote）判斷價差單的合理價，並說明常見的條件單（IOC、FOK、AON 等）。

## 核心概念

### 11.0 用選擇權避險選擇權

> 💡 **一句話**：hedge 工具也可以是其他 option；近似 delta 中立、主要賭波動幅度和 implied volatility 的組合，就叫 volatility spread。

假設 delta 50 的買權（call）被低估，你買進 10 口（+500 deltas）。hedge 方式不只一種：

- 賣 5 口 underlying；
- 買進總 delta −500 的賣權（put）；
- 賣出（其他 strike 或到期的）總 delta −500 的 call；
- 以上任意組合，使總 delta ≈ 0。

不論哪種方式，結果都：(1) 近似 delta 中立；(2) 對 underlying 價格**移動**敏感；(3) 對**implied volatility**敏感；(4) 對**時間經過**敏感。這類價差就是**volatility spread**。

#### 本章評價表（自創；所有例子都用這張表）

股價 80、波動率（volatility） 25%、利率 4%、無 dividend。近月剩 35 天、遠月剩 98 天。歐式、BS 計算後四捨五入；每股計。

**近月（35 天）**

| strike | call 值 | Δ | Γ | Θ | Vega | Rho | put 值 | Δ | Γ | Θ | Vega | Rho |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 70 | 10.36 | 97 | 1.2 | −0.014 | 0.019 | 0.064 | 0.09 | −3 | 1.2 | −0.006 | 0.019 | −0.003 |
| 75 | 5.91 | 82 | 4.2 | −0.030 | 0.065 | 0.057 | 0.62 | −18 | 4.2 | −0.022 | 0.065 | −0.014 |
| 80 | 2.62 | 54 | 6.4 | −0.040 | 0.098 | 0.039 | 2.32 | −46 | 6.4 | −0.031 | 0.098 | −0.038 |
| 85 | 0.86 | 24 | 5.1 | −0.030 | 0.078 | 0.018 | 5.53 | −76 | 5.1 | −0.021 | 0.078 | −0.063 |
| 90 | 0.20 | 8 | 2.3 | −0.013 | 0.035 | 0.006 | 9.86 | −92 | 2.3 | −0.003 | 0.035 | −0.080 |

**遠月（98 天）**

| strike | call 值 | Δ | Γ | Θ | Vega | Rho | put 值 | Δ | Γ | Θ | Vega | Rho |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 70 | 11.39 | 88 | 1.9 | −0.017 | 0.083 | 0.159 | 0.64 | −12 | 1.9 | −0.009 | 0.083 | −0.027 |
| 75 | 7.53 | 74 | 3.1 | −0.023 | 0.134 | 0.139 | 1.73 | −26 | 3.1 | −0.015 | 0.134 | −0.060 |
| 80 | 4.55 | 56 | 3.8 | −0.025 | 0.164 | 0.108 | 3.70 | −44 | 3.8 | −0.017 | 0.164 | −0.105 |
| 85 | 2.50 | 37 | 3.7 | −0.023 | 0.157 | 0.074 | 6.59 | −63 | 3.7 | −0.014 | 0.157 | −0.152 |
| 90 | 1.25 | 22 | 2.9 | −0.018 | 0.124 | 0.045 | 10.29 | −78 | 2.9 | −0.008 | 0.124 | −0.194 |

（深價內（deep in-the-money, deep ITM）歐式 put 的值可能略低於內含價值（intrinsic value），例如近月 90 put 9.86 < 10，這是利率造成的負時間價值（time value），見 ch07。）

### 11.1 跨式（Straddle）

> 💡 **一句話**：同 strike 一 call 一 put；long straddle +gamma、−theta、+vega，breakeven = strike ± premium。

**組成**：同 strike、同到期的一個 call 與一個 put，**同買**（long straddle）或**同賣**（短跨式（short straddle））。

**到期損益**（買近月 80 straddle，成本 $2.62+2.32=4.94$）：

| 到期股價 | 65 | 70 | 75 | 80 | 85 | 90 | 95 |
|---|---|---|---|---|---|---|---|
| long straddle 損益 | +10.06 | +5.06 | +0.06 | −4.94 | +0.06 | +5.06 | +10.06 |

breakeven：$80\pm4.94$ → 75.06 與 84.94。

```
損益
  +|＼                 ／
   |  ＼             ／
  0+----＼---------／-----  股價
   |      ＼     ／
  -|        ＼／  ← 最大損失 = 權利金（在履約價）
              80
```

**到期前**：long straddle 在 underlying 遠離 strike 時增值、時間經過且 underlying 不動時減值、volatility 上升時增值：

- long straddle：**+gamma、−theta、+vega**
- short straddle：**−gamma、+theta、−vega**

**價平（at-the-money, ATM） 1:1 最常見**（call delta ≈ 50、put ≈ −50，自然近似中立）。若用非 ATM strike，需要調整口數：

> **比率 straddle**：遠月 75 call delta 74、put delta −26。1:1 時 delta = +48（偏多的「多頭 straddle」）。改成 1 call : 3 put：$74-3\times26=-4$，近似中立。仍是 straddle（同 strike），但多空口數不等。

### 11.2 勒式（Strangle）

> 💡 **一句話**：不同 strike 的價外（out-of-the-money, OTM）call + OTM put；特性和 straddle 一樣，只是比較便宜、要動更多才賺。

**組成**：同到期、**不同 strike**的 call 與 put，同買（長 strangle）或同賣（短 strangle）。通常 1:1，strike 選在使兩邊 delta 大小相近處。

**命名慣例**：「80/90 strangle」可能是 80 put + 90 call，也可能是 80 call + 90 put。為避免混淆，**strangle 預設由 OTM option 組成**。由兩個價內（in-the-money, ITM）option 組成的稱為 **guts**（內臟 strangle）。兩者到期損益形狀相同，只差一個固定金額：

> 近月：OTM strangle（75 put + 85 call）= 0.62 + 0.86 = 1.48；guts（75 call + 85 put）= 5.91 + 5.53 = 11.44。guts 到期時至少值 10（strike 差），$11.44-10\times e^{-0.04\times35/365}=11.44-9.96=1.48$，與 OTM strangle 相同。實務上 ITM option 流動性較差，所以 guts 較少交易。

**短 strangle 到期損益**（賣近月 75 put + 85 call，收 1.48）：

| 到期股價 | 65 | 70 | 75 | 80 | 85 | 87.5 | 90 | 95 |
|---|---|---|---|---|---|---|---|---|
| 損益 | −8.52 | −3.52 | +1.48 | +1.48 | +1.48 | −1.02 | −3.52 | −8.52 |

breakeven 73.52 與 86.48。風險特性與 straddle 相同：長 strangle **+gamma/−theta/+vega**，短 strangle **−gamma/+theta/−vega**。

**新手陷阱**：long straddle／長 strangle「風險有限、雙向獲利無限」很吸引人，但若預期的大波動沒發生，一次又一次的「有限」損失一樣痛。這不是推薦或反對任何一方——**要同時看風險報酬是否有限，以及各種結果發生的機率**，這正是使用理論模型的理由。

### 11.3 蝶式（Butterfly）

> 💡 **一句話**：1 × 2 × 1 等距；價值介於 0 和間距之間。long butterfly ≈ 有限風險的 short straddle。

**組成**：三個**等距** strike、同類型（全 call 或全 put）、同到期。比例**永遠是 1 × 2 × 1**。long butterfly：買兩翼（wings，外側 strike）、賣兩口身體（body，中間 strike）；short butterfly 相反。

**到期價值**（近月 75/80/85 call butterfly）：

| 到期股價 | ≤75 | 77.5 | 80 | 82.5 | ≥85 |
|---|---|---|---|---|---|
| +1 75 call | 0 | 2.5 | 5 | 7.5 | S−75 |
| −2 80 call | 0 | 0 | 0 | −5 | −2(S−80) |
| +1 85 call | 0 | 0 | 0 | 0 | S−85 |
| **butterfly 價值** | **0** | **2.5** | **5** | **2.5** | **0** |

規律：
- underlying 在兩翼之外 → 價值 0；
- underlying 恰在身體 → 價值最大 = **strike 間距**（此例 5）；
- 價值永遠介於 0 與間距之間。

所以買 butterfly 要付出 0 到 5 之間的某個價格，取決於到期時落在身體附近的機率：機率高可能願付 4；機率低可能只願付 0.5。價值不可能小於 0，所以 butterfly 一定要付錢（否則有無風險套利（arbitrage））——付錢建立的部位（position）稱為「長」position。

> 本例成本 $5.91-2\times2.62+0.86=1.53$：最大利潤 $5-1.53=3.47$（在 80），最大損失 1.53（在兩翼外），breakeven 76.53 與 83.47。

**特性**：身體約 ATM 時近似 delta 中立。

- **long butterfly ≈ 有限風險的 short straddle**：−gamma、+theta、−vega；
- **short butterfly ≈ 有限風險的 long straddle**：+gamma、−theta、+vega。

差別在於 straddle 風險或報酬無上限，butterfly**兩邊都有限**——適合想賣 straddle 卻不願承擔無限損失的人。代價是：錯的時候損失少，對的時候利潤也少。因此 butterfly 常以大得多的口數交易：買 300 組 butterfly（300×600×300）可能比賣 100 組 straddle 風險還小。**規模與風險不一定相關，風險取決於規模乘上策略特性。**

**call butterfly = put butterfly**（歐式、同 strike、同到期）：到期價值完全相同，所以理論價格相同。

> 精確 BS：近月 75/80/85 call butterfly 1.5229、put butterfly 1.5229。（用四捨五入表格算：call 版 1.53、put 版 $0.62-4.64+5.53=1.51$，差異只是捨入。）若市場上兩者價格不同，買便宜、賣貴的就有確定利潤——但美式選擇權（American option）因提前履約（early exercise）可能性，只有確定能持有到期時才成立。

### 11.4 兀鷹（Condor）

> 💡 **一句話**：四個 strike 1 × 1 × 1 × 1；condor ≈ 有限風險的 strangle。

butterfly 是「有限風險的 straddle」，**condor 就是「有限風險的 strangle」**。

**組成**：四個 strike、同類型、同到期，比例 **1 × 1 × 1 × 1**。兩個內側 strike 是身體、兩個外側是翼。兩個身體之間的距離可任意，但**最低兩個 strike 的間距必須等於最高兩個的間距**。長 condor：買兩翼、賣兩身體。

> 近月 70/75/85/90 call condor：$10.36-5.91-0.86+0.20=3.79$。
> 到期價值：underlying 在 75–85 之間 = 5（最大）；在 70 以下或 90 以上 = 0。
>
> | 到期股價 | 65 | 70 | 72 | 75 | 80 | 85 | 87.5 | 90 | 95 |
> |---|---|---|---|---|---|---|---|---|---|
> | 長 condor 損益 | −3.79 | −3.79 | −1.79 | +1.21 | +1.21 | +1.21 | −1.29 | −3.79 | −3.79 |
>
> 最大利潤 1.21、最大損失 3.79、breakeven 73.79 與 86.21。

underlying 在兩身體中點附近時近似中立。歐式下 call condor 與 put condor 價值相同（BS：3.7946 vs 3.7946）。butterfly 與 condor 合稱 **wingspreads（翼式價差）**。

### 11.5 對稱策略小結

> 💡 **一句話**：long straddle、長 strangle、short butterfly、短 condor 想要波動；反過來的那四個想要平靜。

straddle、strangle、butterfly、condor 的損益圖都**對稱**，以中立方式建立時對方向沒有偏好：

| +gamma / −theta / +vega（想要波動、想要 implied volatility 升） | −gamma / +theta / −vega（想要平靜、想要 implied volatility 降） |
|---|---|
| long straddle | short straddle |
| 長 strangle | 短 strangle |
| short butterfly | long butterfly |
| 短 condor | 長 condor |

### 11.6 比率價差（Ratio Spread）

> 💡 **一句話**：買賣不等口數：買多 ≈ long straddle、通常收錢建立；賣多 ≈ short straddle、一邊風險有限。

想表達 volatility 觀點、但某一方向比另一方向更可能（或更想防範），可以**買賣不等口數**的同類型、同到期 option，通常仍 delta 中立。

#### 買多於賣（backspread，反比率／後比率價差）

> **自創例題**：賣 1 近月 80 call、買 2 近月 85 call。delta $-54+48=-6$，收入 $2.62-1.72=+0.90$。
>
> | 到期股價 | ≤80 | 82.5 | 85 | 87.5 | 89.1 | 90 | 95 | 100 |
> |---|---|---|---|---|---|---|---|---|
> | 損益 | +0.90 | −1.60 | −4.10 | −1.60 | 0 | +0.90 | +5.90 | +10.90 |
>
> 最大損失 4.10 在 85（買進的 strike）；下跌時保留收入 +0.90；上漲則利潤無限。breakeven 80.90 與 89.10。

- **call ratio spread（買多）**：想要波動、偏好上漲（上方無限）。
- **put ratio spread（買多）**：想要波動、偏好下跌（下方無限）。
- 兩者都 **+gamma、−theta、+vega**。
- 買多的 ratio spread 在 underlying 往「錯的方向」大幅移動時全部歸零，所以要獲利就必須**以收入（credit）建立**——這是此類價差的典型特徵；在傳統定價模型下，delta 中立的「買多」ratio spread 應總是收入。

#### 賣多於買（frontspread，正比率價差）

性質像 short straddle（**−gamma、+theta、−vega**），但**一邊風險有限**：

- 賣多的**call**ratio spread：下方風險有限（underlying 在低 strike 之下全部歸零）、上方風險無限。
- 賣多的**put**ratio spread：上方風險有限、下方風險無限。

> **自創例題**：買 1 近月 80 put（2.32、delta −46）、賣 2 近月 75 put（0.62、delta −18）。付出 $2.32-1.24=1.08$。
>
> | 到期股價 | 65 | 70 | 71.08 | 72 | 75 | 77.5 | 78.92 | ≥80 |
> |---|---|---|---|---|---|---|---|---|
> | 損益 | −6.08 | −1.08 | 0 | +0.92 | +3.92 | +1.42 | 0 | −1.08 |
>
> 最大利潤 3.92 在 75；上漲最多虧 1.08；大跌風險無限。（1:2 的 delta 為 $-46+36=-10$/組；若要更中立可改成 2:5。）

「backspread / frontspread」是早期美國的說法，現在多數人直接說「ratio spread，買多（或賣多），比例幾比幾」。整組交易時常用簡單比例：2:1 最常見，3:1、4:1、3:2 也常見。

### 11.7 聖誕樹（Christmas Tree / Ladder）

> 💡 **一句話**：買 1 賣 2 個不同 strike，像單邊風險有限的 strangle。

ratio spread 模仿「單邊有限的 straddle」；**聖誕樹**（又稱梯形 ladder）模仿「單邊有限的 strangle」。

- **call 聖誕樹**：買（賣）1 個較低 strike call，各賣（買）1 個兩個更高 strike 的 call。
- **put 聖誕樹**：買（賣）1 個較高 strike put，各賣（買）1 個兩個更低 strike 的 put。
- 同類型、同到期，strike 通常選在使整體 delta 中立。
- **長聖誕樹**（買 1 賣 2）：像短 strangle、但一邊風險有限 → −gamma/+theta/−vega。
- **短聖誕樹**（賣 1 買 2）：像長 strangle、但一邊獲利有限 → +gamma/−theta/+vega。

> **自創例題**：長 call 聖誕樹 +1 近月 75、−1 近月 80、−1 近月 85 call。付 $5.91-2.62-0.86=2.43$，delta $82-54-24=+4$。
>
> | 到期股價 | ≤75 | 77.5 | 80 | 82.5 | 85 | 87.5 | 90 | 95 |
> |---|---|---|---|---|---|---|---|---|
> | 損益 | −2.43 | +0.07 | +2.57 | +2.57 | +2.57 | +0.07 | −2.43 | −7.43 |
>
> 80 到 85 之間獲利最大 2.57；下跌最多虧 2.43；大漲風險無限。breakeven 77.43 與 87.57。

### 11.8 非對稱策略小結

> 💡 **一句話**：圖形不對稱，但記法一樣：買多就想要波動，賣多就想要平靜。

| +gamma / −theta / +vega | −gamma / +theta / −vega |
|---|---|
| call ratio spread（買多於賣） | call ratio spread（賣多於買） |
| put ratio spread（買多於賣） | put ratio spread（賣多於買） |
| 短 call 聖誕樹 | 長 call 聖誕樹 |
| 短 put 聖誕樹 | 長 put 聖誕樹 |

雖然損益圖不對稱，它們的 volatility 特性仍像 straddle 與 strangle：**買的比賣的多 → 想要波動與 implied volatility 上升；賣的比買的多 → 想要平靜與 implied volatility 下降。**

### 11.9 日曆價差（Calendar Spread）

> 💡 **一句話**：長日曆：underlying 不動、時間經過會增值；implied volatility 升也增值。underlying 大動就崩塌。

所有 option 同時到期時，到期價值只取決於 underlying 價格；若到期日（expiration date）不同，價值還取決於**短期 option 到期之後**會發生什麼。**calendar spread**（又稱時間價差 time spread、水平價差 horizontal spread——早年交易所看板把到期月份橫向排列）由不同到期月的 option 組成。

最常見：**同類型、同 strike**，一買一賣。
- **長日曆**：買遠月、賣近月（遠月較貴 → 付錢 → 「長」）。
- **短日曆**：買近月、賣遠月。

可以比率化表達多空觀點；本節討論 1:1、近似中立（通常用 ATM option——更精確說是價平遠期（at-the-forward））的 calendar spread。它有兩個重要特性：

1. **underlying 不動、時間經過 → calendar spread 增值。**
2. **implied volatility 上升 → 增值；下降 → 減值。**

#### 特性 1：時間經過

> 長 80 call 日曆（+1 遠月、−1 近月），股價固定 80、volatility 25%：
>
> | 經過天數 | 0 | 14 | 28 | 35（近月到期） |
> |---|---|---|---|---|
> | 遠月 80 call | 4.55 | 4.19 | 3.79 | 3.58 |
> | 近月 80 call | 2.62 | 2.00 | 1.14 | 0 |
> | **calendar spread** | **1.93** | **2.18** | **2.66** | **3.58** |

兩個都在耗損，但近月耗損快得多（前 14 天近月掉 0.62、遠月只掉 0.36），最後近月的 time value 全部歸零。原因就是 ch07/ch09 的性質：**ATM option 越接近到期 theta 越大**。

#### 標的大幅移動 → 價差崩塌

calendar spread 靠「遠月保留 time value、近月耗損」獲利，而 ATM 時 time value 最大。underlying 往任一方向大幅移動，兩個 option 都變成 deep ITM 或深價外（deep out-of-the-money, deep OTM），連遠月也幾乎沒有 time value → 價差崩塌：

| 股價 | 64 | 72 | 80 | 88 | 96 |
|---|---|---|---|---|---|
| 今天的 calendar spread | 0.19 | 1.06 | 1.93 | 1.50 | 0.87 |
| 近月到期時的 calendar spread | 0.05 | 0.72 | 3.58 | 1.30 | 0.67 |

所以長日曆是 **−gamma、+theta**。

#### 特性 2：隱含波動率

| volatility | 15% | 20% | 25% | 30% | 35% |
|---|---|---|---|---|---|
| 遠月 80 call | 2.92 | 3.73 | 4.55 | 5.37 | 6.19 |
| 近月 80 call | 1.64 | 2.13 | 2.62 | 3.11 | 3.61 |
| **calendar spread** | **1.28** | **1.60** | **1.93** | **2.25** | **2.58** |

**長天期 option vega 較大**（ch06、ch09），所以 volatility 升時遠月漲得多 → 長日曆 **+vega**。

#### Gamma 與 vega 相反：日曆價差的獨特之處

- long straddle／長 strangle／short butterfly：想要 underlying 波動 **且** implied volatility 上升（+gamma、+vega）。
- short straddle／短 strangle／long butterfly：想要 underlying 平靜 **且** implied volatility 下降（−gamma、−vega）。
- **長日曆**：想要 underlying 平靜（−gamma）**但** implied volatility 上升（+vega）；**短日曆**：想要 underlying 大動（+gamma）但 implied volatility 下降（−vega）。

underlying 不動、大家卻預期它會動——這可能嗎？很常見：**有待公布、但內容未知的消息**。例如公司宣布一週後執行長將發表重要聲明：在那之前股價大概不會大動，但市場預期聲明後可能劇烈變動 → implied volatility 上升 → 長日曆擴大。若聲明結果無關緊要（例如只是宣布個人喜事），預期的波動消失 → implied volatility 下跌 → calendar spread 收斂。

> ⚠ 進階提醒（見挑戰題）：若事件落在**近月到期之前**，近月的 implied volatility 往往漲得比遠月多，長日曆反而可能**虧損**。本節的「implied volatility 上升有利」隱含假設各月份 implied volatility 同幅變動。

#### 期貨市場的日曆價差：不同的標的

股票 option 各月份的 underlying 都是同一支股票、同一個價格。但期貨選擇權（futures option）的 underlying 是**特定月份的 futures**：若有 3、6、9、12 月 futures 並有序列月份（serial months），4 月/6 月日曆的 underlying 都是 6 月 futures；但 **3 月/6 月日曆**的兩腿 underlying 分別是 3 月 futures 與 6 月 futures，兩者不一定同步（尤其商品市場短期供需可能讓不同月份反向移動）。

對策：用**futures 價差**對沖。

> **自創例題**：買 20 口 6 月 call、賣 20 口 3 月 call（兩者 delta 約 50）。6 月 +1,000 deltas、3 月 −1,000 deltas → **買 10 口 3 月 futures、賣 10 口 6 月 futures**：
>
> +20 6 月 call（+1,000）、−10 6 月 futures（−1,000）
> −20 3 月 call（−1,000）、+10 3 月 futures（+1,000）
>
> 每個月份各自中立，整體只剩 volatility 風險。股票 option 不需要（也無法）這樣做，因為所有月份 underlying 相同。

### 11.10 時間蝶式（Time Butterfly）

> 💡 **一句話**：同 strike 三個到期；長 time butterfly 是買身體、賣翼，特性像長日曆。（可先跳過）

futures 市場的「butterfly」是三個月份的 futures：買（賣）近月與遠月各一、賣（買）中間月份兩口。option 的**time butterfly** 類比之：**同 strike、三個不同到期**、同類型，到期間隔大致相等。外側月份是翼、中間月份是身體。

> 例：+1 近月 80 call（翼）、−2 中月 80 call（身體）、+1 遠月 80 call（翼）。

time butterfly = 一個 calendar spread + 一個反向的 calendar spread，共用中間月份。上例 = 賣「近/中」日曆 + 買「中/遠」日曆。

**誰是長、誰是短？** ATM 時，時間經過使 calendar spread 增值，且**短天期日曆比長天期日曆值錢**。所以「買身體、賣翼」= 買短天期日曆 + 賣長天期日曆 → 淨付錢 → **長 time butterfly 是「買兩口身體、賣兩翼」**——這與普通 butterfly（買翼賣身體為長）正好相反，容易混淆。

> **自創例題**：80 call，近月 35 天、中月 98 天、遠月 161 天，股價 80：
>
> | volatility | 近月 | 中月 | 遠月 | 近/中日曆 | 中/遠日曆 | 長 time butterfly 成本（2×中 − 近 − 遠） |
> |---|---|---|---|---|---|---|
> | 20% | 2.13 | 3.73 | 4.94 | 1.60 | 1.20 | 0.40 |
> | 25% | 2.62 | 4.55 | 5.98 | 1.93 | 1.43 | 0.50 |
> | 30% | 3.11 | 5.37 | 7.02 | 2.25 | 1.65 | 0.61 |
>
> 25% 下長 time butterfly 隨股價與時間的價值：
>
> | 股價 | 68 | 74 | 80 | 86 | 92 |
> |---|---|---|---|---|---|
> | 價值 | −0.19 | +0.19 | +0.50 | +0.30 | −0.03 |
>
> | 經過天數（股價 80） | 0 | 14 | 28 | 35 |
> |---|---|---|---|---|
> | 價值 | 0.50 | 0.68 | 1.07 | 1.95 |

underlying 遠離 strike 時價值崩落（−gamma）→ 必然 +theta；volatility 下降時價值下降（+vega）。**長 time butterfly 的特性類似長 calendar spread**。（以上假設各月 implied volatility 相同；若各月不同，長 time butterfly 甚至可能是收入。）

### 11.11 利率與股利的影響

> 💡 **一句話**：股票長 call 日曆 rho 為正、長 put 日曆 rho 為負；dividend 效果相反。（可先跳過）

**futures option**：買賣 futures 沒有持有成本（cost of carry），利率對 futures option 影響很小，對其 volatility spread 影響也小（不同月份 futures 的相對價格可能受利率影響，可用 futures 價差對沖）。

**股票 option、同到期的價差**：利率改變遠期價格（forward price），但對所有同到期 option 影響大致相同，價差價值變化小。

**股票 option calendar spread**：兩個 expiration date → 兩個 forward price，對利率敏感度不同。

> 股價 80、無 dividend、近月 3 個月、遠月 6 個月：
> - 利率 4%：遠期 $80\times1.01=80.80$、$80\times1.02=81.60$
> - 利率 6%：遠期 81.20、82.40
>
> 遠月 forward price 上升得多（+0.80 vs +0.40）。兩者 delta 相近時，遠月 call 受惠較多 → **長 call 日曆 rho 為正**；遠月 put 受害較多 → **長 put 日曆 rho 為負**。

> **自創數據**（80 strike、近月 91 天、遠月 182 天、25%）：
>
> | 利率 | 0% | 2% | 4% | 6% | 8% |
> |---|---|---|---|---|---|
> | call 日曆 | 1.65 | 1.83 | 2.03 | 2.23 | 2.44 |
> | put 日曆 | 1.65 | 1.44 | 1.24 | 1.06 | 0.89 |

影響大小主要取決於**兩個 expiration date 相隔多久**：相隔六個月遠大於相隔一個月。

**dividend**與利率效果相反：dividend 升 → forward price 降。若兩個 expiration date 之間有除息：

> **自創數據**（利率 4%，第 120 天除息，其他同上）：
>
> | 每次 dividend | 0 | 0.50 | 1.00 | 1.50 |
> |---|---|---|---|---|
> | call 日曆 | 2.03 | 1.74 | 1.47 | 1.20 |
> | put 日曆 | 1.24 | 1.45 | 1.67 | 1.89 |
>
> call 日曆有「負 dividend 風險」（dividend 升 → 價值降），put 日曆有「正 dividend 風險」。

**極端情形**：利率夠高時 put 日曆可能變成負值（遠月 put 比近月便宜）；dividend 夠高時 call 日曆亦然。無 dividend 股票的 call 日曆，即使 volatility 很低，理論上也至少值兩個 expiration date 之間的股票 cost of carry——**但前提是能在兩個 expiration date 之間持有空頭股票**。若借不到股票，長 call 日曆的持有人可能被迫 early exercise 遠月 call、損失其 time value，這稱為**軋空**（short squeeze）。

### 11.12 對角價差（Diagonal Spread）

> 💡 **一句話**：strike 不同的日曆；1:1、兩腿 delta 相近時，行為像普通日曆。（可先跳過）

類似 calendar spread，但兩腿**strike 不同**。可以 1:1，也可以比率化。變化太多，幾乎無法一概而論，每個都要個別分析。

唯一可概括的情形：**1:1、同類型、兩腿 delta 約略相同**——行為很像普通 calendar spread。

> 例：+1 遠月 90 call（1.25、delta 22）、−1 近月 86 call（0.66、delta 20）。10 組合計：付 5.90、delta +20、gamma −16、theta +0.08、vega +0.55——與長日曆相同的 −gamma/+theta/+vega 輪廓。

### 11.13 波動率價差的分類與總表

> 💡 **一句話**：按 gamma、vega 正負分四象限；straddle、strangle 最猛，butterfly、condor 最溫和。

交易員以**基本 volatility 特性**分類價差：主要關心**波動幅度**，其次才是方向。所以 volatility spread 都近似 delta 中立；若 delta 大到方向比 volatility 更重要，就不再是 volatility spread。

- 受 underlying 移動幫助 → **+gamma**，稱為**多 premium**，希望市場大動。
- 受 underlying 移動傷害 → **−gamma**，**空 premium**，希望市場平靜。
- 移動與時間永遠對立：+gamma 必然 −theta，−gamma 必然 +theta。不能兩者兼得。
- implied volatility 上升有利 → **+vega**；下降有利 → **−vega**。（理論上 vega 是對「未來實現波動率（future realized volatility）」的敏感度；實務上交易員把它當成對 implied volatility 的敏感度。）

**四象限**：

| Gamma | Vega | 有利的條件 | 代表策略 |
|---|---|---|---|
| + | + | underlying 更波動；implied volatility 上升 | long straddle、長 strangle、short butterfly、ratio spread（買多） |
| − | − | underlying 更平靜；implied volatility 下降 | short straddle、短 strangle、long butterfly、ratio spread（賣多） |
| + | − | underlying 更波動；implied volatility 下降 | 短日曆、短 time butterfly |
| − | + | underlying 更平靜；implied volatility 上升 | 長日曆、長 time butterfly |

同一象限內，**straddle 與 strangle 的 gamma、vega 最大**——對的時候賺最多、錯的時候賠最多；**butterfly 與 condor 在另一端**；ratio spread 與聖誕樹介於中間。

**總表**（假設初始近似 delta 中立）：

| 策略 | Δ | Γ | Θ | Vega | 下方風險/報酬 | 上方風險/報酬 |
|---|---|---|---|---|---|---|
| long straddle | 0 | + | − | + | 報酬無限 | 報酬無限 |
| 長 strangle | 0 | + | − | + | 報酬無限 | 報酬無限 |
| short butterfly | 0 | + | − | + | 報酬有限 | 報酬有限 |
| 短 condor | 0 | + | − | + | 報酬有限 | 報酬有限 |
| call 比率（買多） | 0 | + | − | + | 報酬有限* | 報酬無限* |
| put 比率（買多） | 0 | + | − | + | 報酬無限* | 報酬有限* |
| short straddle | 0 | − | + | − | 風險無限 | 風險無限 |
| 短 strangle | 0 | − | + | − | 風險無限 | 風險無限 |
| long butterfly | 0 | − | + | − | 風險有限 | 風險有限 |
| 長 condor | 0 | − | + | − | 風險有限 | 風險有限 |
| call 比率（賣多） | 0 | − | + | − | 風險有限* | 風險無限* |
| put 比率（賣多） | 0 | − | + | − | 風險無限* | 風險有限* |
| 長日曆 | 0 | − | + | + | 風險有限 | 風險有限 |
| 短日曆 | 0 | + | − | − | 報酬有限 | 報酬有限 |

\*指大多數 delta 中立的 ratio spread：買多者以收入建立、賣多者以支出建立。

**用評價表驗證**（各 10 組為單位；「現金流」= 以理論值成交的現金流，負為付出、正為收入；付錢者稱為「長」該價差）：

| 價差 | 現金流 | Δ | Γ | Θ | Vega | Rho |
|---|---|---|---|---|---|---|
| long straddle（買 10 近月 80 straddle） | −49.40 | +80 | +128.0 | −0.710 | +1.960 | +0.010 |
| 比率 straddle（買 10 遠月 75 call、30 遠月 75 put） | −127.20 | −40 | +124.0 | −0.680 | +5.360 | −0.410 |
| 短 strangle（賣 10 近月 75 put、10 近月 85 call） | +14.80 | −60 | −93.0 | +0.520 | −1.430 | −0.040 |
| 長 strangle（買 15 遠月 75 put、10 遠月 85 call） | −50.95 | −20 | +83.5 | −0.455 | +3.580 | −0.160 |
| long butterfly（近月 75/80/85 call 10×20×10） | −15.30 | −20 | −35.0 | +0.200 | −0.530 | −0.030 |
| short butterfly（遠月 75/80/85 put −10×+20×−10） | +9.20 | +10 | +8.0 | −0.050 | +0.370 | +0.020 |
| 長 condor（近月 70/75/85/90 call） | −37.90 | −10 | −58.0 | +0.330 | −0.890 | −0.050 |
| 短 condor（遠月 70/75/85/90 put） | +26.10 | +10 | +20.0 | −0.120 | +0.840 | +0.090 |
| call 比率（買多）：賣 10 近月 80、買 20 近月 85 | +9.00 | −60 | +38.0 | −0.200 | +0.580 | −0.030 |
| put 比率（買多）：賣 10 遠月 80、買 17 遠月 75 | +7.59 | −2 | +14.7 | −0.085 | +0.638 | +0.030 |
| call 比率（賣多）：買 10 遠月 80、賣 25 遠月 90 | −14.25 | +10 | −34.5 | +0.200 | −1.460 | −0.045 |
| put 比率（賣多）：買 10 近月 80、賣 25 近月 75 | −7.70 | −10 | −41.0 | +0.240 | −0.645 | −0.030 |
| 長 call 聖誕樹：+10 近月 75、−10 近月 80、−10 近月 85 | −24.30 | +40 | −73.0 | +0.400 | −1.110 | +0.000 |
| 短 put 聖誕樹：−10 遠月 80、+10 遠月 75、+10 遠月 70 | +13.30 | +60 | +12.0 | −0.070 | +0.530 | +0.180 |
| 長日曆（+10 遠月 80 call、−10 近月 80 call） | −19.30 | +20 | −26.0 | +0.150 | +0.660 | +0.690 |
| 短日曆（+10 近月 80 put、−10 遠月 80 put） | +13.80 | −20 | +26.0 | −0.140 | −0.660 | +0.670 |
| 對角（+10 遠月 90 call、−10 近月 86 call） | −5.90 | +20 | −16.0 | +0.080 | +0.550 | +0.300 |

觀察：
- 每個價差的 gamma/theta/vega 正負號都符合總表；
- 「買多」ratio spread 的確是收入、「賣多」是支出；
- delta 不必剛好為 0——事實上沒有人能確定自己真的中立（ch09）；只要小到**方向考量不如 volatility 考量重要**即可，這往往是主觀判斷；
- Rho：長 call 日曆 +0.69、短 put 日曆 +0.67（= 長 put 日曆為負），符合 11.11 節；其他同到期價差的 rho 都很小。

表中沒有市場價格，所以算不出 theoretical edge。成交價可能好可能壞，但**一旦建立，哪些市場條件有利或不利由價差本身的特性決定，與當初的價格無關**。交易員不應讓過去的交易影響現在的判斷：重點不是昨天發生什麼，而是今天能做什麼來擴大潛在利潤或縮小潛在損失。

### 11.14 選擇合適的策略

> 💡 **一句話**：先要有正優勢：implied volatility 低就做正 vega，高就做負 vega。

首要條件：**正的 theoretical edge**。理想上是買進被低估的、賣出被高估的——如此任何價差都有正優勢。

但更常見的是，你的 volatility 預測使**所有** option 都偏貴或都偏便宜（比較你的預測波動率（forecast volatility）與市場 implied volatility 即可判斷）。此時：

> **implied volatility 低（option 普遍便宜）→ 找正 vega 的價差；implied volatility 高（普遍偏貴）→ 找負 vega 的價差。**

> **自創例題**：你的 forecast volatility 25%（即評價表）。比較兩種市場：所有 option 以 implied volatility 21% 定價（便宜），或以 29% 定價（貴）。theoretical edge（10 組為單位）：
>
> | 價差 | Vega | 優勢 @ 21% | 優勢 @ 29% |
> |---|---|---|---|
> | long straddle 近月 80 | +1.960 | +7.90 | −7.90 |
> | 短 strangle 近月 75P/85C | −1.430 | −5.40 | +5.90 |
> | 長 call butterfly 近月 75/80/85 | −0.530 | −2.40 | +2.10 |
> | 短 put butterfly 遠月 75/80/85 | +0.370 | +1.80 | −1.10 |
> | call 比率（買多）−10 近月 80/+20 近月 85 | +0.580 | +2.10 | −2.40 |
> | put 比率（賣多）+10 近月 80/−25 近月 75 | −0.645 | −2.00 | +2.85 |
> | 長日曆 80 call | +0.660 | +2.60 | −2.60 |
> | 短日曆 80 put | −0.660 | −2.60 | +2.60 |
>
> （例：long butterfly 在 21% 下市價 $5.67-2\times2.23+0.56=1.77$，理論 1.53，每組優勢 −0.24。）

implied volatility 21% 時有正優勢的：long straddle 與長 strangle、short butterfly 與短 condor、買多的 ratio spread（含短聖誕樹）、長日曆。29% 時：short straddle 與短 strangle、long butterfly 與長 condor、賣多的 ratio spread（含長聖誕樹）、短日曆。

**為何不直接做 straddle strangle？** 它們兩腿都有利、theoretical edge 通常最大，但第 13 章會看到它們也可能是**風險最大**的策略。所以交易員常考慮 ratio spread、butterfly 等，即使這意味著買進一些高估或賣出一些低估的 option。

**calendar spread 的補充原則**：傳統模型假設 volatility 在 option 生命期內固定，同到期價差的盈虧由那一個 volatility 決定；但交易員也可能預期 implied volatility 會**隨時間**升或降，而 calendar spread 對此特別敏感：

> **長日曆在 implied volatility 低、但預期會上升時較可能獲利；短日曆在 implied volatility 高、但預期會下降時較可能獲利。**

這只是指引。若交易員認為 implied volatility 不會跟著實現波動率（realized volatility）走，可以違反它：例如市場停滯但 implied volatility 預期維持高檔，長日曆仍合理（近月耗損、遠月保值）；或 implied volatility 低，但預期 underlying 會大動而 implied volatility 不會相應上升，短日曆也可能合理。

### 11.15 調整（Adjustments）

> 💡 **一句話**：四種調整：固定間隔、delta 門檻、憑感覺、不調整；不調整就要先想好何時平倉。

價差起初中立，但價格、volatility、時間一變，delta 就變；模型要求持續維持中立，但連續調整不可能也不實際。建立價差時就該想好調整方式。四種做法：

1. **固定間隔調整**：理論上 volatility 是連續的、調整也該連續；實務上 volatility 以固定間隔衡量（日資料、週資料），所以按相同間隔調整最貼近模型假設。
2. **delta 超過預定門檻才調整**：很少人堅持隨時中立（連續調整不可能、模型輸入也不確定）。重點是**知道自己能接受多少方向風險**：能接受 ±500 deltas 就在達到時調整。缺點是無法預知多常要調整——有時很頻繁、有時很久都不用。門檻因人而異：新手可能 200 deltas 就不舒服，大型交易公司可能把數千 deltas 視為近似中立。
3. **憑感覺調整**：這不是玩笑。有些交易員對市場有很好的感覺。
   > 例：股價 80，你中立、gamma −120。股價跌到 77.50，position 約 $-(-120)\times2.5=+300$ deltas。若 300 是你的上限，按規則該調整；但若你知道 77.50 是強支撐，可能選擇不調整、賭反彈——對了就省下一筆不利調整，錯了（跌破支撐）就會後悔。若你常常判斷對，沒理由不用這個能力。
4. **完全不調整**：其實是第 2 種的極端——接受 position 可能達到的最大 delta（賣 5 組 straddle 最多 ±500 deltas）。好處是零後續交易成本；但若 delta 變大，方向就主導了損益——你因 volatility 觀點建倉，事後卻變成方向押注，通常不合理。既不想調整、又不想讓方向主導，唯一選擇是**平倉**。決定不調整的人，建倉時就要想好在什麼條件下續抱、什麼條件下平倉。

### 11.16 下價差單（Submitting a Spread Order）

> 💡 **一句話**：價差整組報一個買價、一個賣價；條件單（AON、FOK、IOC…）要看懂，送單前再檢查一次。

option 價差常以**單一買價、單一賣價**整組 quote。

> 你詢問近月 80 straddle，做市商（market maker）報 4.85 / 5.05。要賣只能賣 4.85，要買要付 5.05。若以 5.05 買進，call 2.70 + put 2.35，或 call 2.65 + put 2.40——對雙方都無所謂，只要合計 5.05。

market maker 總會盡量為整組價差給出一個雙邊市場。常見價差（straddle、strangle、butterfly、日曆）能很快 quote；非常複雜、比例奇特的價差可能要幾分鐘計算，但 market maker 仍會努力給出最好的雙邊 quote。

電子交易所通常支援最常見的組合（簡單的 call/put 價差、straddle、strangle、日曆）；較複雜的（butterfly、聖誕樹、奇特比例）可能要拆腿執行，或交給經紀商到公開喊價市場向 market maker 描述。

**委託類型**：市價單（以當前市價成交）、限價單（只在指定價格或更好成交），以及帶特殊執行指示的**條件單**：

| 條件單 | 意義 |
|---|---|
| All or none（AON，全部或全不） | 必須全部數量一起成交，否則不成交（不限時間） |
| Fill or kill（FOK） | 立即全部成交，否則整筆取消 |
| Immediate or cancel（IOC） | 立即成交能成交的部分，其餘取消 |
| Market if touched（MIT，觸價市價單） | 市場觸及指定價格後轉成市價單 |
| Market on close（MOC，收盤市價單） | 在收盤時以市價成交 |
| Not held（不受約束單） | 授權經紀人自行判斷執行時機與價格，不保證成交價 |
| One cancels the other（OCO，二擇一） | 兩張委託一張成交後，另一張自動取消 |
| Stop limit（停損限價單） | 觸及停損價後轉成限價單 |
| Stop loss（停損單） | 觸及停損價後轉成市價單 |

經紀人有責任遵守特殊指示。除非你非常熟悉市況或很信任經紀人，最好附上明確指示。價差單資訊很多（數量、到期月、strike、call 或 put、買或賣），很容易傳錯——**送單前務必再檢查一次**。

## 交易員視角

- **Optibook 的委託只有 limit 與 IOC**，沒有組合單：每個價差都要拆腿。用 ch10 原則先做流動性差的腿；IOC 正好用來快速補齊剩下的腿，避免留下裸露 position。
- **用 position Greeks 判斷你「實際上」持有哪種價差**：market making 一陣子後，你的 option position 往往是很多腿的混合。把它加總成 delta/gamma/theta/vega，就能知道自己屬於四象限中的哪一類——例如 −gamma/+vega 表示你實質上持有一個長日曆型 position。
- **quote 偏斜（skew）**：若你已經是大的負 gamma（賣了很多 ATM option），可以把 ATM option 的買價調高一點、賣價也調高，鼓勵別人賣給你、減少再被買走——這就是用 quote 來「調整」價差，而不必付價差去主動成交。
- **多到期月時分開看 vega**：日曆型 position 的總 vega 可能接近 0，但近月與遠月 implied volatility 不同步時仍會有損益（見挑戰題）。
- **部位上限（position limit）與 butterfly 規模**：butterfly 風險小、常做大口數；但 Optibook 的 position limit 是按**單一商品**計算——1×2×1 的身體那一腿最先撞到上限。
- **調整門檻**：把「delta 超過 X 才調整」寫進程式，並配合 `sleep()` 控制請求頻率；不調整就要預先寫好平倉條件。

## 常見誤區

1. **誤解**：long butterfly 就是買翼賣身體，time butterfly 也一樣是買翼賣身體才叫長。→ **正解**：time butterfly 的長 position 是**買身體、賣翼**（付錢）；與普通 butterfly 相反。
2. **誤解**：long straddle 風險有限、雙向獲利無限，所以是好策略。→ **正解**：要看機率與價格；若 implied volatility 偏高或 underlying 不動，有限損失會反覆發生。
3. **誤解**：所有正 vega 的 position 也一定是正 gamma。→ **正解**：calendar spread 是 −gamma/+vega（長）或 +gamma/−vega（短），gamma 與 vega 可以相反。
4. **誤解**：implied volatility 上升，長日曆一定賺。→ **正解**：前提是各月份同幅上升；若近月（含事件）implied volatility 漲得遠多於遠月，長日曆可能虧損。
5. **誤解**：call butterfly 和 put butterfly（同 strike）是不同的 position，價格可以不同。→ **正解**：歐式下兩者到期價值完全相同，理論價格相同；價差即 arbitrage 機會（美式有 early exercise 例外）。
6. **誤解**：ratio spread 只是方向策略。→ **正解**：中立的 ratio spread 本質是 volatility spread（買多 ≈ long straddle、賣多 ≈ short straddle），只是一邊風險或報酬有限。

## 重點摘要

| 策略 | 組成 | 到期最大值／最大損益 | Γ/Θ/V |
|---|---|---|---|
| long straddle | +C(K) +P(K) | 損失 ≤ premium；BE = K ± premium | +/−/+ |
| 長 strangle | +P(K1) +C(K2)，OTM | 損失 ≤ premium | +/−/+ |
| long butterfly | +1 K1、−2 K2、+1 K3（等距） | 價值 0～間距；最大在 K2 | −/+/− |
| 長 condor | +K1 −K2 −K3 +K4（外側等距） | 價值 0～外側間距 | −/+/− |
| 比率（買多） | 賣少買多，同類同到期 | 通常收入；最大損失在買進 strike | +/−/+ |
| 比率（賣多） | 買少賣多 | 一邊風險有限 | −/+/− |
| 長聖誕樹 | 買 1、賣兩個更 OTM 的各 1 | 一邊風險有限 | −/+/− |
| 長日曆 | +遠月 −近月，同 strike | ATM 時最大、遠離崩塌 | −/+/+ |
| 長 time butterfly | −近 +2 中 −遠，同 strike | 付錢；像長日曆 | −/+/+ |
| 對角 | 不同 strike、不同到期 | 等 delta 1:1 時像日曆 | 視情況 |

| 規則 | 內容 |
|---|---|
| 選策略 | implied volatility 低 → 正 vega；高 → 負 vega |
| 日曆補充 | 低且預期升 → 長日曆；高且預期降 → 短日曆 |
| 利率 | 股票長 call 日曆 rho +、長 put 日曆 rho − |
| dividend | 兩 expiration date 間 dividend 升 → call 日曆縮、put 日曆擴 |
| 調整 | 固定間隔／delta 門檻／感覺／不調整（需平倉計畫） |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A3、B2、B4、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 為什麼 long butterfly 被稱為「有限風險的 short straddle」？兩者的 Greeks 正負號有何異同？

<details><summary>解答</summary>

身體在 ATM 時，long butterfly 與 short straddle 都希望 underlying 到期停在中間 strike 附近、都受益於時間經過與 implied volatility 下降：−gamma、+theta、−vega。差別是 short straddle 在大幅移動時損失無限，long butterfly 的價值不會低於 0，最大損失是付出的成本；相對地，它的最大利潤也被限制在「間距 − 成本」。

</details>

**A2.** 解釋為什麼長 time butterfly（−1 近、+2 中、−1 遠）需要付錢，而普通 long butterfly 也是付錢、但組成方向相反。

<details><summary>解答</summary>

時間經過時 ATM calendar spread 增值，短天期日曆比長天期日曆值錢。time butterfly = 買近/中日曆（買中、賣近）+ 賣中/遠日曆（賣遠、買中）：買進較貴的短天期日曆、賣出較便宜的長天期日曆 → 淨付錢，所以「買身體、賣翼」是長。普通 butterfly 是不同 strike：翼的價值總和大於兩倍身體（凸性），所以「買翼、賣身體」付錢。

</details>

**A3.** ⭐ 長 calendar spread 為何同時「希望 underlying 不動」又「希望 implied volatility 上升」？舉一個現實中兩者同時發生的情境。

<details><summary>提示</summary>

分開想兩件事：underlying 不動時，近月和遠月誰的 theta 耗得快？implied volatility 上升時，近月和遠月誰的 vega 大？

</details>

<details><summary>解答</summary>

underlying 不動時近月 ATM option 耗損得比遠月快（−gamma、+theta）；implied volatility 上升時遠月 vega 較大、漲得較多（+vega）。現實情境：已排定但內容未知的重大消息（財報、判決、執行長聲明）前，underlying 觀望不動，市場卻預期之後會大動、推高 implied volatility。

</details>

**A4.** 為什麼「買多於賣」的 delta 中立 ratio spread 通常必須以收入建立？

<details><summary>解答</summary>

若 underlying 往錯的方向大幅移動（call 版大跌、put 版大漲），所有 option 都會 OTM 歸零，整個 position 到期價值為 0。要在這個情境下不虧錢甚至小賺，建立時必須收錢（credit）。在傳統定價模型下，delta 中立的買多 ratio spread 的理論值也確實是收入。

</details>

**A5.** futures option 的 3 月/6 月 calendar spread 與股票 option 的 calendar spread，在風險上有何差異？如何處理？

<details><summary>解答</summary>

股票 option 各月份 underlying 相同；futures option 的 3 月與 6 月 option 分別以 3 月 futures 與 6 月 futures 為 underlying，兩者可能不同步移動，產生額外的月份間價差風險。處理方式是按各月份的 delta，用 futures 價差（買一個月份、賣另一個月份）讓每個月份各自中立，只留下 volatility 風險。

</details>

**A6.** 為何說「不調整」實際上是「delta 門檻調整」的特例？選擇不調整的交易員必須事先做什麼？

<details><summary>解答</summary>

不調整等於把可接受的 delta 門檻設成 position 可能達到的最大 delta。若 delta 變大，方向風險會主導原本的 volatility 觀點；交易員必須在建倉時就定好在什麼條件下續抱、什麼條件下直接平倉，以免被動變成方向交易。

</details>

### B. 計算題

**B1.** 以 6.20 買進 100 strike straddle。求到期 breakeven 點，以及到期股價 110 時的損益。

<details><summary>解答</summary>

breakeven $100\pm6.20$ → 93.80 與 106.20。股價 110：call 值 10，損益 $10-6.20=+3.80$。

</details>

**B2.** ⭐ 以 1.40 買進 90/95/100 call butterfly。求最大利潤、最大損失與 breakeven 點。

<details><summary>提示</summary>

butterfly 到期最大價值 = strike 間距，出現在中間 strike；最大利潤 = 間距 − 成本；兩個 breakeven 點從兩翼往內各走「成本」那麼多。

</details>

<details><summary>解答</summary>

最大價值 = 間距 5，在 95；最大利潤 $5-1.40=3.60$。最大損失 1.40（≤90 或 ≥100）。breakeven $90+1.40=91.40$ 與 $100-1.40=98.60$。

</details>

**B3.** 以 1.70 買進 40/45/55/60 put condor。求最大利潤、最大損失與 breakeven 點。

<details><summary>解答</summary>

最大價值 = 5（underlying 在 45–55 之間）；最大利潤 3.30；最大損失 1.70；breakeven $40+1.70=41.70$ 與 $60-1.70=58.30$。

</details>

**B4.** ⭐ 賣 1 口 50 call（3.20）、買 2 口 55 call（每口 1.25）。求建倉現金流、最大損失（位置）、兩個 breakeven 點。

<details><summary>提示</summary>

先算建倉收多少錢（賣 1 口收、買 2 口付）；再把到期股價代入 50、55、60 幾個點，看哪裡最慘；上方 breakeven：寫出 55 以上的損益式子（−1 口 50 call + 2 口 55 call + 收入），令它等於 0。

</details>

<details><summary>解答</summary>

收入 $3.20-2.50=0.70$。最大損失在 55：$0.70-(55-50)=-4.30$。下方 breakeven：$50+0.70=50.70$；上方：在 55 以上損益 $=0.70-(S-50)+2(S-55)=S-59.30$，故 59.30。

</details>

**B5.** 某 strike 的 call delta 70、put delta −30。要用整數口數建立近似中立的比率 straddle（買進），最簡比例為何？

<details><summary>解答</summary>

需 $70\,a=30\,b$ → $a:b=3:7$：買 3 call、7 put，delta $3\times70-7\times30=0$。

</details>

**B6.** 依 11.9 節表格，持有 10 組長 80 call 日曆，股價不動 14 天後價差從 1.93 變成 2.18。損益為多少？若之後近月到期時股價跳到 88（價差 1.30），從建倉起算的總損益為何？

<details><summary>解答</summary>

14 天後：$10\times(2.18-1.93)=+2.50$。股價 88 時近月到期：$10\times(1.30-1.93)=-6.30$。

</details>

**B7.** 你買 30 口 6 月 futures call、賣 30 口 3 月 futures call，兩者 delta 皆 48。要讓各月份中立，futures 應如何下單？

<details><summary>解答</summary>

6 月 +1,440 deltas → 賣 14 口 6 月 futures（14.4 取整）；3 月 −1,440 deltas → 買 14 口 3 月 futures。

</details>

**B8.** 你的 position gamma −120、目前中立。股價下跌 2.5 點後 position delta 約為多少？若你的門檻是 ±250 deltas，應如何調整？

<details><summary>解答</summary>

$0-2.5\times(-120)=+300$ deltas，超過門檻 → 賣出 3 口 underlying 回到中立。

</details>

**B9.** 市場所有 option 以 implied volatility 21% 定價，近月 75/80/85 call 市價 5.67、2.23、0.56，理論值（25%）5.91、2.62、0.86。求 long butterfly 每組的 theoretical edge；10 組呢？

<details><summary>解答</summary>

市價成本 $5.67-4.46+0.56=1.77$，理論值 $5.91-5.24+0.86=1.53$ → 每組 $1.53-1.77=-0.24$；10 組 −2.40。implied volatility 低時，負 vega 的 long butterfly 是負優勢。

</details>

### C. 交易情境題

**C1.** ⭐ 你預測未來 volatility 25%，市場 implied volatility 29%，但你擔心市場可能突然大跌。你只能在以下三者擇一：(a) 賣 10 組近月 80 straddle；(b) 買 10 組近月 75/80/85 call butterfly；(c) put ratio spread（賣多）：買 10 近月 80 put、賣 25 近月 75 put。你選哪一個？

<details><summary>提示</summary>

三個都是負 vega，在 29% 都有正優勢；接著只看「大跌時」誰的損失沒有上限、誰的損失有限。

</details>

<details><summary>解答</summary>

三者都是負 vega、在 29% 下都有正優勢。但擔心大跌時：(c) 下方風險無限（賣多的 put），最不適合；(a) 雙向風險無限，優勢雖大（約 +7.90）但大跌時損失沒有上限；(b) long butterfly 風險有限（最多付出的成本），優勢較小（+2.10），符合「保留觀點、限制尾部風險」。選 (b)，或者為了提高優勢，加大 butterfly 口數到風險預算允許的程度。

</details>

**C2.** 某股票兩週後公布財報。你在 Optibook 上看到近月（財報後到期）implied volatility 45%、遠月 32%，股價最近很平靜。隊友建議買長日曆「因為事件前 implied volatility 會上升」。你怎麼看？

<details><summary>解答</summary>

事件落在近月內，近月 implied volatility 已經反映財報且會繼續上升最多；長日曆是賣近月，近月 implied volatility 上升對它不利（見挑戰題），遠月雖也可能上升但幅度小。財報後近月 implied volatility 通常崩跌，若股價又大跳（−gamma），長日曆兩頭受傷。若想利用「事件後 implied volatility 下降」，反而要考慮做空近月 volatility 的 position 並嚴控跳空風險；若想用長日曆，應選擇兩腿都在事件之後到期的月份，或等事件後 implied volatility 回落、股價重新平靜時再建立。

</details>

### D. 挑戰題

**D1.** 延續評價表：股價 80，長 80 call 日曆（+1 遠月 98 天、−1 近月 35 天），兩月 implied volatility 25%，價差 1.93。
(a) 兩月 implied volatility 都升到 30%，價差變多少？
(b) 有事件落在近月內，近月 implied volatility 升到 40%、遠月只升到 30%，股價不變，價差變多少？
(c) 一週後事件結束，兩月 implied volatility 都回到 25%，股價跳到 88，價差變多少？若股價仍是 80 呢？
(d) 用 vega 與「近月/遠月 implied volatility 的期限結構」解釋 (a)(b) 結果相反的原因，並說明這對 Optibook 上「多到期月 market making」的風險管理有何啟示。

<details><summary>解答</summary>

（BS、$r=4\%$）
(a) 遠月 5.37 − 近月 3.11 = **2.25**（+0.32），符合 +vega。
(b) 遠月 30%：5.37；近月 40%：4.10；價差 **1.27**（−0.66）。雖然「implied volatility 上升」，長日曆卻虧損。
(c) 一週後（遠月 91 天、近月 28 天）、25%：股價 88 → **1.50**；股價 80 → **2.04**。事件後 implied volatility 回落、股價大跳（−gamma）時價差縮小；若股價沒動，時間經過讓價差擴大。
(d) 長日曆的淨 vega 是「遠月 vega − 近月 vega」（約 0.164 − 0.098 = +0.066/組），只對**平行**移動成立。近月上升 15 點 × 0.098 ≈ 1.47 的損失，大於遠月上升 5 點 × 0.164 ≈ 0.82 的獲利（線性近似 −0.65，與實算 −0.66 接近）。因此應把 vega 按到期月拆開管理（或用「期限結構 vega」），而不是只看總 vega；在 Optibook 多月份 market making 時，事件前近月 implied volatility 可能被其他隊伍推高，你若在近月淨賣出、遠月淨買進，就是這個 (b) 情境。

</details>

## 自我檢核清單

- [ ] 能寫出九種 volatility spread 的組成，並畫出到期損益、算出 breakeven 點。
- [ ] 能說明為何 call butterfly 與 put butterfly（歐式）等價，以及 butterfly、condor 價值的上下限。
- [ ] 能說出 ratio spread（買多／賣多）與聖誕樹的有限邊與無限邊。
- [ ] 能解釋 calendar spread 的兩個特性，以及 underlying 大幅移動時為何崩塌。
- [ ] 能說明 time butterfly 的長短定義為何與普通 butterfly 相反。
- [ ] 能判斷利率、dividend 對股票 calendar spread 的影響方向，並說明 futures 日曆的額外風險與對沖方式。
- [ ] 能把任一 position 歸入 gamma/vega 四象限，並依 implied volatility 高低選擇策略。
- [ ] 能說出四種調整方法與常見條件單的意義。

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab07_spreads.py`](../labs/exercises/lab07_spreads.py)：實作 `make_leg`、`straddle`、`strangle`、`vertical_spread`、`butterfly`、`calendar_spread`、`ratio_spread`、`position_value`、`position_greeks`、`classify_spread`、`delta_neutral_ratio`、`breakeven_volatility`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab07_spreads.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`../labs/`](../labs/) → **lab07_spreads**：實作策略建構器——輸入各腿，輸出到期損益表、breakeven 點、組合 Greeks 與四象限分類；重現 11.13 節的總表、11.9 節的 calendar spread 表格與挑戰題的期限結構情境。
