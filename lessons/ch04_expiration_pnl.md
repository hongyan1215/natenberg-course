# 第 4 章　到期損益（Expiration Profit and Loss）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：到期那天，選擇權（option）只值內含價值（intrinsic value）。只要記住每條腿的「斜率」（0、+1、−1），把它們加起來，就能畫出任何部位（position）到期時的賺賠圖，像拼樂高一樣。

**你只需要先記住這 5 件事**

1. **到期時只看 intrinsic value。** 價外（out-of-the-money, OTM）歸零；價內（in-the-money, ITM） call 值「標的（underlying） − 履約價（strike price）」，ITM put 值「strike − underlying」。
2. **斜率表要背熟。** OTM = 0；ITM：買 call +1、賣 call −1、買 put −1、賣 put +1；underlying 多頭永遠 +1、空頭永遠 −1。
3. **多腿 position：斜率直接相加，而且只在 strike 轉折。** 光看最左、最右兩段的斜率，就知道大跌、大漲時風險有沒有上限。
4. **兩平點：買 call 是 strike + 權利金（premium），買 put 是 strike − premium。** 例：買 50 call @3.55 → 兩平 53.55。
5. **複雜 position 用「一點 + 斜率」法。** 先在某個 strike 算出總損益，再用各區間斜率往左右推，找出所有兩平點。

**必背卡**

| 情況 | 記法 |
|---|---|
| OTM option（買或賣） | 斜率 0 |
| 買 ITM call ／賣 ITM put | 斜率 +1 |
| 賣 ITM call ／買 ITM put | 斜率 −1 |
| underlying 多頭／空頭 | 永遠 +1 ／ −1 |
| 買 call、賣 call 兩平點 | strike + premium |
| 買 put、賣 put 兩平點 | strike − premium |

**必做練習（約 20 分鐘）**：A2、B1、B3、B5（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[策略損益建構器](https://hongyan1215.github.io/natenberg-course/tools/strategy-builder/)工具，自己組跨式（straddle）、蝶式（butterfly），看到期損益折線怎麼轉折。

---

## 本章定位

option 在存續期間的價值受很多因素影響，但**到期那一刻**大家一定同意它的價值：就是 intrinsic value。本章教你用「斜率」快速畫出任何複雜 position 的到期價值圖（parity graph）與到期損益圖，並計算損益兩平（breakeven）點——這是分析價差策略（[ch10](ch10_intro_spreading.md)～[ch13](ch13_risk_considerations.md)）與合成部位（synthetic position）（[ch14](ch14_synthetics.md)）的基本功。前置章節：[ch03](ch03_contract_specs.md)（intrinsic value）。

> 對應原書：第 4 章〈Expiration Profit and Loss〉，含〈Parity Graphs〉〈Slope〉〈Expiration Profit and Loss〉。

## 學習目標

1. **能列出**任一 option 在不同到期價格下的價值，並畫出四種基本「曲棍球桿」圖。
2. **能說出**各基本 position 在 ITM／OTM 時的斜率（0、+1、−1），以及 underlying position 的斜率。
3. **能用斜率表**畫出多腿、多 strike position 的 parity graph，並判斷上下檔風險是否有限。
4. **能計算**到期損益：先算出一個點的損益，再用斜率推到其他價格。
5. **能求出**所有 breakeven 點（breakeven），包括多個兩平點的複雜 position。
6. **能辨認**同一個到期損益可以用不同組合建構（例如兩口 call + 空一口 underlying ＝ straddle）。

---

## 核心概念

### 4.0 到期時，選擇權只值內含價值

> 💡 **一句話**：到期時答案很簡單：OTM 值 0，ITM 值 underlying 價和 strike 的差。

新手常被 option 的數量嚇到：多個到期月 × 多個 strike × call/put。第一個問題是「option 值多少？」——平時很難回答，但**到期時答案很明確**：OTM 為 0，ITM 則為 underlying 價與 strike 之差。

**例題 4-1（自創）**：55 call 與 45 put 的到期價值。

| 到期 underlying 價 | 55 call | 45 put |
|---|---|---|
| 35 | 0 | 10 |
| 40 | 0 | 5 |
| 45 | 0 | 0 |
| 50 | 0 | 0 |
| 55 | 0 | 0 |
| 60 | 5 | 0 |
| 65 | 10 | 0 |

- 55 call：underlying ≤ 55 時 OTM、價值 0；高於 55 後，underlying 每漲 1 點，call 漲 1 點。
- 45 put：underlying ≥ 45 時 OTM、價值 0；低於 45 後，underlying 每跌 1 點，put 漲 1 點。

---

### 4.1 到期價值圖（Parity Graphs）

> 💡 **一句話**：四種曲棍球桿圖要分開看：買方最多損失權利金；買權的上漲空間無上限，賣權的下跌空間則受標的價格最低為 0 限制。

對**買方**而言，intrinsic value 是正值（他能低買高賣）；對**賣方**而言是負值（他被迫高買低賣）。把 position 在到期時的價值畫成 underlying 價格的函數，就得到 **parity graph**（parity 即 intrinsic value 的別稱）。四種基本形狀因外型被稱為**曲棍球桿圖（hockey-stick diagrams）**：

```
 (1) 買進 call                     (2) 賣出 call
 價值                              價值
  │            /                    │
  │           /  斜率 +1            0 ┼──────────┐
  │          /                      │          \  斜率 −1
 0┼─────────┘                       │           \
  └─────────X────→ 標的             └──────────X─\──→ 標的

 (3) 買進 put                      (4) 賣出 put
 價值                              價值
  │\                                │
  │ \ 斜率 −1                      0 ┼    ┌──────────
  │  \                              │   /
 0┼───└──────────                   │  /  斜率 +1
  └────X─────────→ 標的             └─/X─────────→ 標的
```

**最重要的觀察：四種基本部位的上限不同。** 以下假設標的價格不低於 0，履約價為 $K$、每單位權利金為 $p$，且 $0 \le p \le K$；不含交易成本、融資成本與其他部位，數值均為每單位到期損益。

| 部位 | 最大獲利 | 最大損失 |
|---|---|---|
| 買進買權（long call） | 無上限 | 已付權利金 $p$ |
| 賣出買權（short call） | 已收權利金 $p$ | 無上限 |
| 買進賣權（long put） | $K-p$（標的跌至 0） | 已付權利金 $p$ |
| 賣出賣權（short put） | 已收權利金 $p$ | $K-p$（標的跌至 0） |

一口合約的金額還要乘上合約乘數。賣出賣權雖然損失有上限，金額仍可能遠高於收到的權利金；不能把「有限」當成「很小」。若標的本身可能為負價格，須另外分析，不能套用這張表的零價格邊界。

**那為什麼還有人賣 option？** 因為只看「最好和最壞」不夠，還要看**機率與金額**。權利金是否足以補償承擔的風險，要看各種結果的機率、損益與持倉成本，不能只看勝率高不高——這是 [ch05](ch05_pricing_models.md) 機率與理論價值（theoretical value）的主題。

---

### 4.2 斜率（Slope）

> 💡 **一句話**：OTM 斜率 0、ITM ±1、underlying 永遠 ±1；各腿斜率相加，就能畫出任何 position。

option OTM 時，價值不隨 underlying 變動；ITM 時則會。**斜率**＝position 價值變動 ÷ underlying 價格變動。

| position | 斜率 |
|---|---|
| 買進或賣出任何**OTM**option | 0 |
| 買進 ITM call | +1 |
| 賣出 ITM call | −1 |
| 買進 ITM put | −1 |
| 賣出 ITM put | +1 |
| underlying 多頭 | **永遠** +1 |
| underlying 空頭 | **永遠** −1 |

多腿 position 的斜率＝各腿斜率相加。因為 option 有「保險」特性，**parity graph 一定在 strike 處轉折**；underlying position 的斜率則與價格無關，也與建倉價格無關。

**例題 4-2：同 strike 買 call + 買 put（straddle，straddle）**

| 區間 | call | put | 合計 |
|---|---|---|---|
| strike 以下 | 0（OTM） | −1（ITM） | **−1** |
| strike 以上 | +1（ITM） | 0（OTM） | **+1** |

```
 價值
  │\             /
  │ \ −1     +1 /
  │  \         /
 0┼───\───────/───
  │    \     /
  └─────\___/──────→ 標的   （到期價值在履約價為 0，往兩邊增加）
         X
```

underlying 不論往哪個方向遠離 strike 都會增值——這類 position 在乎的是**波動幅度**而非方向。

**例題 4-3：買 2 口 call + 空 1 口 underlying（同 strike）**

| 區間 | 2 口 call | 空 underlying | 合計 |
|---|---|---|---|
| strike 以下 | 0 | −1 | **−1** |
| strike 以上 | +2 | −1 | **+1** |

斜率與例 4-2 完全相同！代表**同一個策略可以用不只一種方式建構**——[ch14](ch14_synthetics.md) 的 synthetic position 就建立在這個觀察上。（underlying 建倉價格不影響斜率，只影響圖的上下位置。）

**例題 4-4：買 call + 賣 put（同 strike）**

| 區間 | 買 call | 賣 put | 合計 |
|---|---|---|---|
| strike 以下 | 0 | +1 | **+1** |
| strike 以上 | +1 | 0 | **+1** |

整條線斜率都是 +1，跟持有 underlying 多頭一模一樣——這就是**合成多頭（synthetic long）**。

**畫任何複雜 position 的步驟**：分別找出「最低 strike 以下」「每兩個相鄰 strike 之間」「最高 strike 以上」的總斜率，再把線段接起來。

**例題 4-5：多 strike 複雜 position 的斜率表（自創）**

position：
- +2 underlying
- −3 口 40 call、+1 口 40 put
- +4 口 45 call、−2 口 45 put
- −1 口 50 call、+3 口 50 put
- −2 口 55 call、−1 口 55 put

| 合約 | 40 以下 | 40–45 | 45–50 | 50–55 | 55 以上 |
|---|---|---|---|---|---|
| −3 40 call | 0 | −3 | −3 | −3 | −3 |
| +1 40 put | −1 | 0 | 0 | 0 | 0 |
| +4 45 call | 0 | 0 | +4 | +4 | +4 |
| −2 45 put | +2 | +2 | 0 | 0 | 0 |
| −1 50 call | 0 | 0 | 0 | −1 | −1 |
| +3 50 put | −3 | −3 | −3 | 0 | 0 |
| −2 55 call | 0 | 0 | 0 | 0 | −2 |
| −1 55 put | +1 | +1 | +1 | +1 | 0 |
| +2 underlying | +2 | +2 | +2 | +2 | +2 |
| **合計** | **+1** | **−1** | **+1** | **+3** | **0** |

```
 斜率：  +1      −1      +1       +3        0
       ───/ \    /    ______/ ‾‾‾‾‾‾‾‾‾‾‾‾‾‾
         /   \  /     /                   （示意，非比例）
 ──────40────45────50────55──────→ 標的
```

解讀（不需要知道 y 軸位置也能讀出風險特性）：
- 40 以下斜率 +1：underlying 越跌 position 越虧，**下檔虧損**一路延伸（直到價格為 0）。
- 55 以上斜率 0：上檔價值固定，**上檔損益有限**。

對多 strike 的複雜 position，往往難以直接標出 y 軸位置；但光看斜率就能掌握風險輪廓。

---

### 4.3 到期損益（Expiration Profit and Loss）

> 💡 **一句話**：損益圖 = 價值圖上下平移 premium；複雜 position 先算一點損益，再用斜率推出兩平點。

parity graph 告訴我們 position 的「形狀」，但賺賠還取決於**建倉價格**：買 option 是借方（付錢），賣 option 是貸方（收錢）。對簡單 position：

$$\text{到期損益圖}=\text{parity graph 向下平移（淨付出）或向上平移（淨收入）}$$

**本章使用的 option 報價（quote）（自創）**：underlying 現價 **51.00**。

| strike | 40 | 45 | 50 | 55 | 60 |
|---|---|---|---|---|---|
| Call | 11.15 | 6.80 | 3.55 | 1.55 | 0.60 |
| Put | 0.15 | 0.80 | 2.55 | 5.55 | 9.60 |

（這組價格以無利率、波動率（volatility） 30%、3 個月的模型產生，並滿足 $C-P=S-K$。）

**例題 4-6：買 50 call @3.55**
- 到期 underlying ≤ 50：call 歸零，損失 3.55。
- underlying > 50：斜率 +1。
- **breakeven**：call 必須值 3.55 → underlying $=50+3.55=53.55$。

```
 損益
  │                 / 斜率 +1
 0┼──────────────/──────
  │           53.55
−3.55 ────────┘
  └──────────50─────────→ 標的
```

**例題 4-7：賣 45 put @0.80**
- underlying ≥ 45：put 歸零，獲利 0.80。
- underlying < 45：斜率 +1（underlying 每跌 1 點，position 少 1 點）。
- **breakeven**：$45-0.80=44.20$。

**不同 strike 的比較（買進）**

| position | 成本 | 最大損失 | 兩平點 |
|---|---|---|---|
| 買 45 call | 6.80 | 6.80 | 51.80 |
| 買 50 call | 3.55 | 3.55 | 53.55 |
| 買 55 call | 1.55 | 1.55 | 56.55 |
| 買 45 put | 0.80 | 0.80 | 44.20 |
| 買 50 put | 2.55 | 2.55 | 47.45 |
| 買 55 put | 5.55 | 5.55 | 49.45 |

規律：**strike 越低的 call 越值錢**（能以更低價買進），**strike 越高的 put 越值錢**（能以更高價賣出）。到期時，低 strike call 的價值曲線永遠在高 strike call 之上（或重合）。

#### 複雜部位的到期損益：「一點 + 斜率」法

對複雜 position，不一定一眼看出淨借或淨貸。步驟：
1. 算出每個區間的斜率。
2. 在某一點（通常選某個**strike**，最好算）算出總損益。
3. 用斜率往左右推出其他點的損益與兩平點。

**例題 4-8（自創）**：position 與成交價：

| position | 價格 |
|---|---|
| +2 口 45 call | 6.80 |
| −3 口 55 call | 1.55 |
| +1 口 50 put | 2.55 |
| −1 口 underlying | 51.00 |

**步驟 1：斜率**

| 合約 | 45 以下 | 45–50 | 50–55 | 55 以上 |
|---|---|---|---|---|
| +2 45 call | 0 | +2 | +2 | +2 |
| −3 55 call | 0 | 0 | 0 | −3 |
| +1 50 put | −1 | −1 | 0 | 0 |
| −1 underlying | −1 | −1 | −1 | −1 |
| **合計** | **−2** | **0** | **+1** | **−2** |

**步驟 2：在 50 的損益**

| position | 成交價 | 50 時價值 | 每口損益 | 總損益 |
|---|---|---|---|---|
| +2 45 call | 6.80 | 5.00 | −1.80 | −3.60 |
| −3 55 call | 1.55 | 0 | +1.55 | +4.65 |
| +1 50 put | 2.55 | 0 | −2.55 | −2.55 |
| −1 underlying | 51.00 | 50.00 | +1.00 | +1.00 |
| **合計** | | | | **−0.50** |

**步驟 3：用斜率推**
- 45–50 斜率 0 → 45 的損益也是 −0.50。
- 45 以下斜率 −2 → 價格每跌 1 點，損益 **+2**：兩平點 $45-0.50/2=44.75$；在 40 為 $-0.50+2\times5=+9.50$。
- 50–55 斜率 +1 → 兩平點 $50+0.50/1=50.50$；在 55 為 $-0.50+5=+4.50$。
- 55 以上斜率 −2 → 兩平點 $55+4.50/2=57.25$；之後虧損無限擴大。

```
 損益
 +9.50 \                     
        \  −2         +4.50
         \              /\
 0 ───────\────────────/──\────────
       44.75\_________/ 50.50 \57.25
           −0.50   −0.50        \ −2
 ──────────45────────50────55──────→ 標的
```

結論：三個兩平點 **44.75、50.50、57.25**；大跌時獲利、溫和上漲（50.50–57.25）時獲利、大漲時虧損無限。

**例題 4-9：已知一點損益，推另一點（自創）**
沿用例 4-5 的 position 與斜率（+1、−1、+1、+3、0）。假設已知到期 underlying 為 **38.00** 時，position 損益為 **−1.20**。求 underlying 57.50 時的損益與所有兩平點。

| 區間 | 起始損益 | 斜率 | 結束損益 |
|---|---|---|---|
| 38.00–40.00 | −1.20 | +1 | $-1.20+1\times2=+0.80$ |
| 40.00–45.00 | +0.80 | −1 | $+0.80-1\times5=-4.20$ |
| 45.00–50.00 | −4.20 | +1 | $-4.20+1\times5=+0.80$ |
| 50.00–55.00 | +0.80 | +3 | $+0.80+3\times5=+15.80$ |
| 55.00–57.50 | +15.80 | 0 | +15.80 |

**underlying 57.50 時損益 +15.80**。兩平點（損益變號處）：
- 38–40 之間：$38+1.20/1=39.20$
- 40–45 之間：$40+0.80/1=40.80$
- 45–50 之間：$45+4.20/1=49.20$

---

## 交易員視角

1. **quote 前先想「到期最壞情況」**：做市（market making）累積的 position 常是許多 strike 的雜燴。用斜率表就能立刻知道「大跌／大漲時是否無限虧損」，這比任何模型都快。Optibook 部位上限（position limit）讓你不會無限放大，但斜率仍告訴你方向性風險在哪裡。
2. **斜率 ≈ 到期時的 delta**：到期時的斜率就是 [ch07](ch07_risk_measurement_1.md) 會學的 delta 的極限值（ITM ±1、OTM 0）。到期前 delta 是平滑版本。
3. **多種組合、同一損益**：例 4-3、4-4 顯示 call、put、underlying 之間可互相合成（synthetic）。若某條腿在 Optibook 上流動性差，可以用另外兩條腿 synthetic 同樣的 position，這是 market making 避險（hedge）的核心技巧（見 [ch14](ch14_synthetics.md)）。
4. **兩平點不等於好交易**：兩平點只是到期的盈虧分界；這筆交易值不值得做要看「underlying 落在各區間的機率」，即 [ch05](ch05_pricing_models.md) 的期望值（expected value, EV）。
5. **到期日（expiration date）的跳空風險**：斜率在 strike 突變，到期前一刻 underlying 若在 strike 附近徘徊，position 價值對小變動非常敏感（pin risk，見 ch03 情境題）。

## 常見誤區

1. **誤解**：賣 option 風險無限，所以只有傻瓜才賣。
   **正解**：要同時考慮報酬與機率；premium 足夠、風險可控時賣出可以是正 expected value 的交易。
2. **誤解**：買 put 在到期圖上的斜率是 +1，因為是「買」。
   **正解**：ITM 買 put 的斜率是 −1（underlying 跌，put 漲）；賣 ITM put 才是 +1。
3. **誤解**：underlying position 的斜率取決於建倉價格。
   **正解**：underlying position 斜率永遠是 ±1；建倉價只影響損益圖的上下位置。
4. **誤解**：複雜 position 一定要先算出總淨借貸才能畫損益圖。
   **正解**：只要先算出任一點的損益，再用各區間斜率推即可。
5. **誤解**：一個 position 只會有一個兩平點。
   **正解**：每次斜率改變都可能穿越 0，複雜 position 常有兩個以上兩平點。

## 重點摘要

| 規則 | 內容 |
|---|---|
| 到期價值 | Call $\max(0,S_T-X)$；Put $\max(0,X-S_T)$ |
| 買方 / 賣方 | 買方風險有限、獲利無限；賣方相反 |
| OTM 斜率 | 0 |
| ITM 斜率 | 買 call +1、賣 call −1、買 put −1、賣 put +1 |
| underlying 斜率 | 多 +1、空 −1（永遠） |
| 轉折點 | 只在 strike 處 |
| 簡單 position 損益 | parity graph 平移 premium |
| 兩平點 | 買 call：$X+C$；買 put：$X-P$；賣 put：$X-P$；賣 call：$X+C$ |
| 複雜 position | 斜率表 → 一點損益 → 推其他點 |
| 兩平點公式 | 區間起點 + （起始損益的絕對值 ÷ 斜率的絕對值），在損益變號的區間內 |

---

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A2、B1、B3、B5）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

以下使用本章 quote：underlying 51.00；Call 40/45/50/55/60 = 11.15/6.80/3.55/1.55/0.60；Put 40/45/50/55/60 = 0.15/0.80/2.55/5.55/9.60。

### A. 概念題

**A1.** 為什麼 parity graph 只會在 strike 處轉折？

<details><summary>解答</summary>

option 在 OTM 時斜率為 0，ITM 時為 ±1，唯一改變狀態的地方是 underlying 價格穿過 strike；underlying position 的斜率則恆定。因此總斜率只在 strike 處改變。

</details>

**A2.** ⭐ 「買 call + 賣 put（同 strike、同到期）」的到期價值圖像什麼？為什麼？

<details><summary>提示</summary>

分成「strike 以下」和「strike 以上」兩段，查斜率表看每段 call 和 put 各是多少，再相加。

</details>

<details><summary>解答</summary>

像持有一口 underlying 多頭：strike 以下，賣出的 put ITM 斜率 +1、call OTM 0；strike 以上，call ITM +1、put OTM 0。全段斜率 +1，即 synthetic long。

</details>

**A3.** 某 position 最低 strike 以下的總斜率是 −2，最高 strike 以上是 +1。它的上下檔風險／獲利特性為何？

<details><summary>解答</summary>

最低 strike 以下斜率 −2：underlying 越跌 position 越賺，下檔獲利（理論上直到價格為 0）。最高 strike 以上斜率 +1：underlying 越漲越賺，上檔獲利無限。這是一個兩端都獲利的 position（中間可能虧損），類似加權的 straddle。

</details>

**A4.** 為什麼 strike 較低的 call 在到期時價值永遠不低於 strike 較高的 call？

<details><summary>解答</summary>

低 strike call 能以更低價買進；對任何到期價 $S_T$，$\max(0,S_T-X_1)\ge\max(0,S_T-X_2)$ 當 $X_1<X_2$。

</details>

**A5.** 為什麼光看兩平點不能判斷一筆 option 交易好不好？

<details><summary>解答</summary>

兩平點只說明到期在哪裡盈虧為零，但沒有告訴我們 underlying 落在各區間的機率與報酬大小。好壞要看機率加權後的 expected value（theoretical value）與價格的比較。

</details>

### B. 計算題

**B1.** ⭐ 買 55 call @1.55：兩平點？到期 underlying 60 時損益？最大損失？

<details><summary>提示</summary>

兩平點 = strike + premium；到期 60 時 call 值 60 − 55，再扣掉付出的 1.55。

</details>

<details><summary>解答</summary>

兩平點 $55+1.55=56.55$；在 60：$5-1.55=+3.45$；最大損失 1.55。

</details>

**B2.** 賣 50 put @2.55：兩平點？到期 underlying 44 時損益？最大獲利？

<details><summary>解答</summary>

兩平點 $50-2.55=47.45$；在 44：$-(50-44)+2.55=-3.45$；最大獲利 2.55（underlying ≥ 50）。

</details>

**B3.** ⭐ 買 50 straddle（買 50 call + 買 50 put）：總成本？兩個兩平點？到期 44 與 58 的損益？

<details><summary>提示</summary>

總成本 = call + put premium；兩平點是 50 往下、往上各一個總成本；某價格的損益 = ITM 那一腿的 intrinsic value − 總成本。

</details>

<details><summary>解答</summary>

成本 $3.55+2.55=6.10$；兩平點 $50-6.10=43.90$、$50+6.10=56.10$。
在 44：$6-6.10=-0.10$；在 58：$8-6.10=+1.90$。

</details>

**B4.** 改以「買 2 口 50 call + 在 51.00 賣 1 口 underlying」建構。計算到期 44 與 58 的損益，並與 B3 比較。

<details><summary>解答</summary>

在 44：call 歸零 $2\times(-3.55)=-7.10$；underlying $-(44-51)=+7.00$；合計 −0.10。
在 58：$2\times(8-3.55)=+8.90$；underlying $-(58-51)=-7.00$；合計 +1.90。
與 B3 完全相同——兩種組合斜率相同、在本 quote 下位置也相同。

</details>

**B5.** ⭐ butterfly：+1 口 45 call、−2 口 50 call、+1 口 55 call。求淨成本、各區間斜率、最大獲利與兩平點。

<details><summary>提示</summary>

先算淨成本（買的付錢、賣的收錢）；再列各區間斜率；最大獲利出現在中間 strike 50，用 50 的價值減淨成本。

</details>

<details><summary>解答</summary>

淨成本 $6.80-2\times3.55+1.55=1.25$（借方）。
斜率：45 以下 0；45–50 +1；50–55 −1；55 以上 0。
最大獲利在 50：$5-1.25=3.75$。兩平點 $45+1.25=46.25$、$55-1.25=53.75$。

</details>

**B6.** 例 4-9 的 position，已知 38.00 時損益 −1.20。求 underlying 42.00 與 52.00 時的損益。

<details><summary>解答</summary>

- 40 時 +0.80；40–45 斜率 −1 → 42 時 $0.80-2=-1.20$。
- 50 時 +0.80；50–55 斜率 +3 → 52 時 $0.80+3\times2=+6.80$。

</details>

### C. 交易情境題

**C1.** 你預期 underlying 51 在到期前會漲到 57 左右，但不確定。可選擇：買 50 call（3.55）、買 55 call（1.55）、買 1 口 45/55 多頭價差（bull spread）（買 45 call、賣 55 call）。在到期價 57 與 53 兩種情境下比較三者損益，並說明各自的取捨。

<details><summary>解答</summary>

- 50 call：57 → $7-3.55=+3.45$；53 → $3-3.55=-0.55$。
- 55 call：57 → $2-1.55=+0.45$；53 → $-1.55$。
- 45/55 價差（成本 $6.80-1.55=5.25$）：57 → $10-5.25=+4.75$；53 → $8-5.25=+2.75$。
取捨：55 call 最便宜但需要大漲；50 call 中庸；價差在溫和上漲時表現最好，但獲利封頂在 4.75（大漲到 65 時，50 call 會賺 11.45）。若你的看法是「漲到 57 左右」而不是「暴漲」，價差最貼合觀點。

</details>

**C2.** market making 一天後，你的 position 斜率表顯示：最低 strike 以下 −3、最高 strike 以上 −4。今晚有重大消息，你擔心什麼？可以如何用最少的交易修正？

<details><summary>解答</summary>

下檔斜率 −3 代表大跌時獲利；上檔斜率 −4 代表大漲時每點虧 4 口 underlying 的錢，且無上限。最擔心大漲。最直接的修正是買進 underlying（例如 +4 口）讓上檔斜率變 0，但這會讓下檔斜率變 +1（大跌時虧損）；或買進高 strike call（OTM、便宜）把上檔斜率拉回，同時不影響下檔斜率。實際選擇取決於 quote 與 position limit。

</details>

### D. 挑戰題

**D1.** 證明「買 45 call、賣 55 call」與「買 45 put、賣 55 put」的到期損益在本章 quote 下完全相同，並說明這與 quote 滿足 $C-P=S-K$ 的關係。

<details><summary>解答</summary>

**斜率**：兩者都是 45 以下 0、45–55 +1、55 以上 0。
**位置**：
- call 價差：淨付 $6.80-1.55=5.25$；45 以下損益 −5.25，55 以上 $10-5.25=+4.75$，兩平 50.25。
- put 價差：淨收 $5.55-0.80=4.75$；55 以上兩個 put 皆 OTM，損益 +4.75；45 以下 $4.75-10=-5.25$。
兩者斜率與一點損益都相同，所以整條線相同。
**原因**：每個 strike 都有 $C_K-P_K=S-K$。call 價差成本 $C_{45}-C_{55}=(P_{45}+S-45)-(P_{55}+S-55)=P_{45}-P_{55}+10$，因此 $-(C_{45}-C_{55})=(P_{55}-P_{45})-10$：call 價差的「下檔損益」恰等於 put 價差的「下檔損益」。這就是 [ch14](ch14_synthetics.md) synthetic 關係與 [ch15](ch15_option_arbitrage.md) 買賣權平價（put-call parity）的雛形；若 quote 違反此關係，就有套利（arbitrage）空間。

</details>

---

## 自我檢核清單

- [ ] 能不看筆記畫出四種曲棍球桿圖並標出斜率
- [ ] 能背出 ITM／OTM、買／賣、call／put 的斜率表
- [ ] 能解釋為何賣方「風險無限」仍可能是好交易
- [ ] 能為多 strike position 製作斜率表並判斷上下檔特性
- [ ] 能把 parity graph 平移成到期損益圖
- [ ] 能用「一點 + 斜率」法求任意價格的損益
- [ ] 能找出複雜 position 的所有兩平點
- [ ] 能辨認 synthetic long、straddle 的兩種建構方式

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab02_payoffs.py`](../labs/exercises/lab02_payoffs.py)：實作 `call_payoff`、`put_payoff`、`intrinsic_and_time_value`、`round_to_tick`、`classify_moneyness`、`exercise_settlement`、`leg_pnl`、`position_pnl`、`breakevens`、`slope_profile`、`max_profit_loss`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab02_payoffs.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab02_payoffs**（[../labs/](../labs/)）：實作 `payoff(position, S_T)`、`pnl(position, S_T)`、`slopes(position)`（回傳各區間斜率）與 `breakevens(position)`，並繪製 parity graph 與到期損益圖。用例 4-5、4-8、4-9 與練習 B5 當測試案例，驗證斜率與兩平點。
