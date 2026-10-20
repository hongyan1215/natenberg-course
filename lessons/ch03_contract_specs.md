# 第 3 章　合約規格與選擇權術語（Contract Specifications and Option Terminology）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：這章是選擇權（option）的「說明書和字典」——一張 option 寫清楚買什麼、何時到期、用什麼價格、能不能提早用；再學會把權利金（premium）拆成「現在就值的錢」和「時間帶來的希望」。

**你只需要先記住這 5 件事**

1. **權利全在買方，義務全在賣方。** 賣方不能選擇履約（exercise），只能被指派（assign / assignment），或在到期前平倉。
2. **exercise／assign 四句話**：exercise call = 買、被 assign call = 賣、exercise put = 賣、被 assign put = 買；exercise 那一刻的現金流只看履約價（strike price），不看股價。
3. **premium = 內含價值（intrinsic value） + 時間價值（time value）。** 例：標的（underlying） 247、230 call 報 21.50 → 內含 17、time value 4.50。
4. **價內（in-the-money, ITM）／價平（at-the-money, ATM）／價外（out-of-the-money, OTM）。** call strike 低於 underlying 就 ITM，put 相反；實務上的 ATM 是「最接近現價」的 strike。
5. **歐式只能到期 exercise，美式隨時可以。** 名稱跟地點無關；指數 option 多為歐式，個股和期貨選擇權（futures option）多為美式。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| call intrinsic value | underlying 價 − strike（負的就算 0） |
| put intrinsic value | strike − underlying 價（負的就算 0） |
| time value | premium − intrinsic value |
| 股票 option exercise 現金 | 口數 × 100 股 × strike |
| 現金結算（cash settlement） | strike 與結算價（settlement price）的差 × 每點價值 × 口數 |

**必做練習（約 20 分鐘）**：A4、B1、B2、B5（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

---

## 本章定位

不懂合約規格，就不知道自己到底買了什麼權利、要承擔什麼義務；不懂術語，就無法在市場上下單或與人溝通。本章把一張 option 拆成「類型、underlying、到期日（expiration date）、strike、exercise 方式」，並建立 intrinsic value／time value、ITM／ATM／OTM 等全書通用的語言。前置章節：[ch01](ch01_financial_contracts.md)（結算（settlement）方式）、[ch02](ch02_forward_pricing.md)（遠期價格（forward price））。

> 對應原書：第 3 章〈Contract Specifications and Option Terminology〉，含〈Contract Specifications〉（Type / Underlying / Expiration Date / Exercise Price）〈Exercise and Assignment〉〈Exercise Style〉〈Option Price Components〉〈In the Money, At the Money, and Out of the Money〉〈Automatic Exercise〉〈Option Margining〉。

## 學習目標

1. **能辨識**一張 option 合約的五大規格：類型、underlying、expiration date、strike、exercise 方式（歐式／美式）。
2. **能判斷** futures option（含序列 option、midcurve）的 underlying 是哪一個期貨（futures）月份。
3. **能計算** exercise 與被 assign 時，實物交割、futures 部位（position）與 cash settlement 三種情況的現金流、保證金（margin）與變動金。
4. **能拆解** premium 為 intrinsic value 與 time value，並判斷 ITM、ATM、OTM。
5. **能解釋**自動 exercise 門檻、「不 exercise 通知」的用途，以及 option margin 為何採風險基礎（risk-based）系統。

---

## 核心概念

### 3.0 為什麼要學規格與術語

> 💡 **一句話**：不管你是投機、避險（hedge）、套利（arbitrage）還是做市（market making），都得先看懂合約和術語。

option 市場聚集了各種目的不同的人：
- **方向交易者**：對漲跌有看法。
- **hedge 者**：用 option 保護既有 position。
- **價差／arbitrage 交易者**：利用相關商品之間的錯價。
- **做市商（middlemen）**：為其他人提供買賣報價（quote），賺取買賣價差（bid-ask spread）。

不論哪一種，都必須先徹底了解合約內容與市場語言，才能正確下單、理解風險。

---

### 3.1 合約規格（Contract Specifications）

> 💡 **一句話**：一張 option 看五件事：類型、underlying、expiration date、strike、exercise 方式。

#### (1) 類型（Type）

- **買權（call）**：在特定日期或之前，以固定價格**買進**（取得多頭部位（long position））underlying 的權利。
- **賣權（put）**：在特定日期或之前，以固定價格**賣出**（取得空頭部位（short position））underlying 的權利。

與 futures 的根本差異：futures 的買賣雙方**都有義務**（賣方必須交貨、買方必須收貨）；option 的**權利全在買方、義務全在賣方**。買方決定要不要收貨（call）或交貨（put），一旦決定，賣方就必須承接另一邊。

#### (2) 標的（Underlying）

標的資產（underlying asset）＝依合約可買賣的證券或商品。
- **店頭 option**：數量可客製。
- **交易所股票 option**：通常一口 = **100 股**（100 股也稱一整股單位 round lot，不足 100 股為零股 odd lot）。股價極高或極低時，交易所可能調整每口股數，讓合約大小合理。
- **彈性 option**：部分交易所允許買賣雙方自行議定數量、expiration date、strike、exercise 方式。
- **futures option**：一口 = **1 口 futures**。通常 underlying 是「與 option 同月份」的 futures（4 月 option → 4 月 futures）。

**序列 option**：option 到期月份沒有對應的 futures 月份時，underlying 是**option 到期後最近的那個 futures 月份**。

**例題 3-1（自創）**：某商品 futures 只掛雙數月（2、4、6、8、10、12 月），交易所另外掛了單數月的序列 option：

| option 月份 | underlying futures |
|---|---|
| 1 月、2 月 | 2 月 futures（1 月為序列） |
| 3 月、4 月 | 4 月 futures（3 月為序列） |
| 5 月、6 月 | 6 月 futures |
| 7 月、8 月 | 8 月 futures |
| 9 月、10 月 | 10 月 futures |
| 11 月、12 月 | 12 月 futures |

**Midcurve option**：部分短期利率 futures 市場，除了「長天期 option 配長天期 futures」，也會掛「**短天期 option 配長天期 futures**」。例如一口 2 年後到期的 3 月 futures，可以是 2 年期 3 月 option 的 underlying，也可以是只剩 1 年到期的 3 月 option 的 underlying。依 underlying futures 至少還有 1、2、5 年才到期，分別稱 1 年、2 年、5 年 midcurve。

#### (3) 到期日（Expiration Date / Expiry）

expiration date 是買方必須做出最後決定（買或賣）的日子；過了 expiration date，合約的所有權利義務消失。

- **最後交易日（last trading day）**：能在交易所買賣該 option 的最後一個營業日；對交易員比 expiration date 更重要。美國個股與指數 option 的月合約傳統上在**到期月第 3 個星期五**到期，最後交易日通常同一天（遇假日如耶穌受難日則提前）。
- **PM settlement vs. AM settlement**：
  - 早年個股 option 以最後交易日**收盤價**決定價值（PM expiration）。但許多策略要在到期時把股票 position 一併了結，導致收盤前湧入大量股票單，擾亂價格。
  - 為了解決收盤失衡，指數類衍生品多改用最後交易日（或次日）**開盤價**計算 settlement price；個股 option 仍多為 PM settlement。
  - 台灣例子：台指 option 月合約於到期月第 3 個星期三到期，以 expiration date 開盤後一段時間的指數平均價作為最後 settlement price，概念上接近 AM settlement。
- **futures option 的 expiration date**：依商品而異。實物商品 futures 交割要花好幾天，所以其 option 常在 futures 月份的**前一個月**到期（例如 7 月 futures 的 option 在 6 月到期）。務必查交易所日曆。

（小知識：早期交易所 option 常在週六這種非營業日「到期」，讓交易所多一天處理文件。）

#### (4) 履約價（Exercise Price / Strike Price）

exercise 時 underlying 交割的價格：call 買方 exercise**付出** strike，put 買方 exercise**收到** strike。

交易所通常以等距設定 strike 並涵蓋現價。**例題 3-2（自創）**：underlying 上市時 138，交易所掛 120、125、130、135、140、145、150、155。後來 underlying 漲到 152，交易所加掛 160、165、170。若交易所認為有助交易，也可加掛中間 strike（如 132.5、137.5、142.5）。

**完整規格舉例（自創）**
- 「某股票 **6 月 900 call**」（股票 option）：有權在 6 月 expiration date 或之前，以每股 900 元買進一口合約所代表的股數。
- 「某原油 futures **9 月 75 put**」（futures option）：有權在 9 月 option expiration date 或之前，以每桶 75 元取得一口對應 futures 的 short position。

```
 標的合約      到期月      履約價     類型
 ─────────    ───────    ───────    ──────
 某原油期貨      9 月        75        Put
 某股票          6 月       900        Call
```

---

### 3.2 履約與指派（Exercise and Assignment）

> 💡 **一句話**：買方 exercise、結算所（clearinghouse）隨機 assign 一位賣方；現金流只看 strike，可能交割成股票、futures position 或現金。

- **exercise**：買方行使權利。call exercise → 取得 underlying 多頭；put exercise → 取得 underlying 空頭。exercise 後 option 本身消失，如同到期一樣。
- **exercise 通知（exercise notice）**：店頭 option 交給賣方；交易所 option 交給交易所（clearinghouse）。
- **assign**：收到有效 exercise 通知後，選出一位賣方負責 exercise。被 assign 者必須依 strike 取得相應的 underlying position。

交易所怎麼選人？由於 clearinghouse 已是所有交易的對手方，它會從「**賣出該 option 且尚未平倉**」的人中選出，其餘基本上是**隨機**的，沒有人被 assign 的機率比較高或低。

**記憶表**

| 動作 | 結果 |
|---|---|
| exercise call | 你**選擇**以 strike**買進** |
| call 被 assign | 你**被迫**以 strike**賣出** |
| exercise put | 你**選擇**以 strike**賣出** |
| put 被 assign | 你**被迫**以 strike**買進** |

exercise 後可能交割成三種形式：(1) 實物 underlying、(2) futures position、(3) 現金。

#### (1) 交割實物標的

call exercise 者付 strike、收 underlying；put exercise 者收 strike、交 underlying。**股票 option 一律實物交割**。

**例題 3-3（自創，每口 100 股）**

| 情況 | 現金 | 股票 |
|---|---|---|
| exercise 3 口 3 月 85 call | 付 $3\times100\times85=\$25{,}500$ | 收 300 股 |
| 被 assign 5 口 12 月 30 call | 收 $5\times100\times30=\$15{,}000$ | 交 500 股 |
| exercise 2 口 9 月 120 put | 收 $2\times100\times120=\$24{,}000$ | 交 200 股 |
| 被 assign 4 口 6 月 50 put | 付 $4\times100\times50=\$20{,}000$ | 收 400 股 |

**重點**：exercise 當下的現金流**只取決於 strike**，與當時股價無關。股價是 10 元還是 1,000 元，85 call exercise 者都只付 85 元／股。當然，整筆 option 交易的盈虧還要看股價與當初的 premium，但「exercise 那一刻的現金流」與它們無關。

#### (2) 交割成期貨部位

如同以 strike 買賣 futures，position 立即適用期貨型結算（futures-type settlement）：要繳 margin，並立刻依現價 settlement 變動金。

**例題 3-4（自創）**：underlying futures 現價 62.00，每點 $500，margin 每口 $2,000。

| 情況 | 取得 position | margin | 立即變動金 |
|---|---|---|---|
| exercise 2 口 4 月 58 call | 多 2 口 @58 | 4,000 | $(62-58)\times500\times2=+4{,}000$ |
| 被 assign 3 口 7 月 55 call | 空 3 口 @55 | 6,000 | $(55-62)\times500\times3=-10{,}500$ |
| exercise 1 口 10 月 66 put | 空 1 口 @66 | 2,000 | $(66-62)\times500\times1=+2{,}000$ |
| 被 assign 4 口 12 月 64 put | 多 4 口 @64 | 8,000 | $(62-64)\times500\times4=-4{,}000$ |

#### (3) 現金結算

主要用於指數類等不便實物交割的 underlying：exercise 後**不產生 underlying position**，只依「strike 與當日 settlement price 的差額」收付現金。

**例題 3-5（自創）**：某指數當日 settlement 於 21,340 點，每點 NT\$50（與 TXO 相同乘數）。

| 情況 | 現金 |
|---|---|
| exercise 2 口 21,000 call | 收 $(21{,}340-21{,}000)\times50\times2=34{,}000$ |
| 被 assign 3 口 21,500 put | 付 $(21{,}500-21{,}340)\times50\times3=24{,}000$ |
| exercise 1 口 21,600 put | 收 $(21{,}600-21{,}340)\times50=13{,}000$ |
| 被 assign 4 口 21,200 call | 付 $(21{,}340-21{,}200)\times50\times4=28{,}000$ |

---

### 3.3 履約方式（Exercise Style）

> 💡 **一句話**：歐式只能到期 exercise，美式到期前隨時可以；和地理位置無關。

- **歐式（European）**：只能在到期時 exercise（實務上是在到期前最後一個營業日決定）。
- **美式（American）**：到期前任何營業日都可 exercise。

名稱與地理無關：美國有很多歐式選擇權（European option），歐洲也有很多美式選擇權（American option）（據說美國最早的 option 就帶有提前履約（early exercise）權，因而得名）。一般而言，**futures option 與個股 option 多為美式，指數 option 多為歐式**（例如 TXO 是歐式）。early exercise 何時划算，見 [ch16](ch16_early_exercise.md)。

---

### 3.4 權利金的組成（Option Price Components）

> 💡 **一句話**：premium = intrinsic value + time value；intrinsic value 不會是負的。

premium 由市場供需決定：買賣雙方報出競爭性的買價與賣價，相交時成交。

premium = **intrinsic value** + **time value**

**intrinsic value**：立即 exercise 並反向平倉能鎖定的「低買高賣」金額。

$$\text{Call 內含價值}=\max(0,\ S-X),\qquad \text{Put 內含價值}=\max(0,\ X-S)$$

（$S$＝underlying 現價，$X$＝strike。intrinsic value 永遠 ≥ 0。）

**例題 3-6（自創）**
- underlying 247，**230 call** 報 21.50：內含 $247-230=17$，time value $21.50-17=4.50$。（exercise 以 230 買、市價 247 賣，入帳 17。）
- underlying 247，**260 put** 報 15.20：內含 $260-247=13$，time value $15.20-13=2.20$。（exercise 以 260 賣、市價 247 買回，入帳 13。）

```
 230 call：  21.50  =  17.00（內含：247−230） +  4.50（時間價值）
 260 put ：  15.20  =  13.00（內含：260−247） +  2.20（時間價值）
```

**intrinsic value 與 expiration date 無關**：underlying 247 時，3 月 230 call 與 12 月 230 call intrinsic value 都是 17。

**time value**（又稱時間溢價 time premium、外在價值 extrinsic value）：市場願意在 intrinsic value 之外多付的部分，主要因為 option 相對於直接持有 underlying 有「保險」的保護特性。

- 沒有 intrinsic value 的 option，premium 全是 time value。
- 沒有 time value 的 option，premium 全是 intrinsic value，稱為**以平價交易（trading at parity）**。
- intrinsic value 不可能為負，但**European option 的 time value 可以為負**（深度 ITM European option，因無法 early exercise 而可能低於平價；見 [ch16](ch16_early_exercise.md)）。一般情況下 time value 為非負。

---

### 3.5 價內、價平、價外（In / At / Out of the Money）

> 💡 **一句話**：call strike 低於 underlying 就是 ITM、put 相反；實務上的 ATM 是最接近現價的 strike。

- **ITM**：有正的 intrinsic value；ITM 的金額即 intrinsic value。
  - call：strike < 標的價；put：履約價 > underlying 價。
- **OTM**：沒有 intrinsic value，premium 全是 time value。
- **ATM**：strike 等於 underlying 價。嚴格說它也沒有 intrinsic value，但因為 ATM option 有特殊且重要的性質、成交最活躍，交易員把它單獨分類。

**同一 strike 的 call 與 put 互為反面**：call ITM → 同 strike put OTM，反之亦然。

**例題 3-7（自創）**：股價 $58。
- 50 call ITM 8；50 put OTM 8。
- 65 put ITM 7；65 call OTM 7。

**實務上的「ATM」**：通常指**最接近** underlying 現價的那個 strike。股價 132.80，strike 間距 5（125、130、135、140……）：$|132.80-135|=2.20<|132.80-130|=2.80$，所以 **135 call 與 135 put** 是 ATM option。

```
            ← 較低履約價             較高履約價 →
  ┌────────────────────┬──┬────────────────────┐
  │   價內 call         │價│   價外 call         │
  │   價外 put          │平│   價內 put          │
  └────────────────────┴──┴────────────────────┘
                  ↑ 標的現價
```

（[ch05](ch05_pricing_models.md) 會再區分「ATM」與「at the forward：strike 等於 forward price」。）

---

### 3.6 自動履約（Automatic Exercise）

> 💡 **一句話**：到期時 ITM 超過門檻會自動 exercise；不想 exercise 要交「不 exercise 通知」。（可先跳過）

到期時 ITM option 一定有 intrinsic value，持有者可以：(a) 到期前在市場賣掉，或 (b) exercise 並立即平掉 underlying position。

早期必須主動提交 exercise 通知；有人因為不知道規定、聯絡不上交易所、或結算會員（clearing member）作業疏失，讓 ITM option 白白過期——任何理性的人都無法接受。因此多數交易所實施**自動 exercise**：到期時，交易所會替持有者 exercise 達到門檻的 ITM option，即使沒有提交通知。

**門檻的意義（自創數字）**：假設自動 exercise 門檻為 0.02。
- ITM 0.015：不會自動 exercise；若仍想 exercise，必須主動提交 exercise 通知。
- ITM 0.03：會被自動 exercise；若考慮交易成本後不想 exercise，必須提交**不 exercise 通知（do not exercise notice）**。

門檻可能因身分而不同（例如散戶與專業交易員因成本結構不同而不同門檻）。交易所會訂出判定是否為專業交易員的標準。（美國 OCC 目前對所有帳戶的門檻為 0.01。）

---

### 3.7 選擇權保證金（Option Margining）

> 💡 **一句話**：option margin 用風險情境算：買方最多賠 premium，賣方要看最壞情境。（可先跳過）

option 依交易所與 underlying 不同，可能採股票型或 futures-type settlement（見 [ch01](ch01_financial_contracts.md)）。但成交後，clearinghouse 還要考慮：這個 position 的風險**有限還是無限**？

- **有限風險 position**：margin 不會超過最大可能損失。option 買方最多損失 premium，clearinghouse 不會要求超過此數的 margin。即使 position 很複雜，只要有最大損失，就有 margin 上限。
- **無限風險 position**（例如賣出 call）：clearinghouse 必須評估各種情境下的損失，再收取相應 margin。

與 futures「每口固定 margin」不同，複雜 option position 沒有單一公式，但所有方法都是**風險基礎（risk-based）**：在一組 underlying 價格變動 × 波動速度（波動率（volatility））變動的情境網格下重估 position，用最壞情境決定 margin。
- 美國 OCC 有自己的風險基礎系統（股票與指數 option）。
- futures 交易所最廣用的是 CME 開發的 **SPAN（Standard Portfolio Analysis of Risk）**。

```
 SPAN 概念示意（自繪）：
              標的價格變動
              −3  −2  −1   0  +1  +2  +3   （單位：價格掃描區間的 1/3）
 波動率上升   [各格重估部位損益]
 波動率下降   [各格重估部位損益]
 → 取最壞情境（並加上極端情境的部分權重）作為保證金基礎
```

---

## 交易員視角

1. **Optibook option market making**：先讀合約規格——類型、strike、到期時間、歐式或美式、合約乘數。exercise 方式決定你能否用 Black-Scholes（歐式）或必須考慮 early exercise（美式）。
2. **quote 時先算 intrinsic value**：任何低於 intrinsic value 的 American option quote 都是送錢——你可以買進立刻 exercise。market making 時你的 bid 下限至少要在 intrinsic value 附近，ask 也不能低於它。
3. **用 time value 比較，而不是 premium**：深度 ITM option premium 大但 time value 小，風險行為接近 underlying；OTM option 全是 time value，對 volatility 最敏感（見 [ch06](ch06_volatility.md)）。
4. **到期前檢查 ITM 程度**：真實市場若 position 剛好在門檻附近，記得決定是否提交 exercise／不 exercise 通知；被 assign 的是空方，週末前的意外 assign 可能讓你帶著不想要的 underlying position 過週末。
5. **價格跳動與 strike 網格**：Optibook 價格必須在 `tick_size` 網格上；option 理論價算出來後，要四捨五入到合法 tick 才能下單。

## 常見誤區

1. **誤解**：option 賣方也可以選擇要不要 exercise。
   **正解**：權利全在買方；賣方只能被 assign，或在到期前平倉以避免被 assign。
2. **誤解**：被 assign 的是當初跟我成交的那個人。
   **正解**：成交後 clearinghouse 成為對手方，被 assign 者是從所有未平倉空方中隨機選出。
3. **誤解**：exercise 85 call 時要依當時股價付款。
   **正解**：exercise 當下的現金流只看 strike（付 85×股數），股價只影響整體盈虧。
4. **誤解**：European option 只在歐洲交易。
   **正解**：歐式／美式只代表能否 early exercise，與地點無關。
5. **誤解**：time value 不可能是負的。
   **正解**：intrinsic value 不會為負，但深度 ITM 的 European option time value 可能為負。
6. **誤解**：股價 132.80 時，130 是 ATM，因為它比較低。
   **正解**：ATM 是**最接近**現價的 strike：135 距離 2.20、130 距離 2.80，所以 135 才是 ATM。

## 重點摘要

| 項目 | 內容 |
|---|---|
| 五大規格 | 類型、underlying、expiration date、strike、exercise 方式 |
| 權利義務 | 買方全權利，賣方全義務 |
| 股票 option underlying | 通常 100 股；實物交割 |
| futures option underlying | 1 口 futures；序列 option 取到期後最近 futures 月份 |
| exercise／assign | exercise call=買、被 assign call=賣、exercise put=賣、被 assign put=買 |
| 交割形式 | 實物、futures position（margin + 變動金）、現金 |
| exercise 方式 | 歐式：只能到期；美式：任何營業日 |
| premium | intrinsic value + time value |
| intrinsic value | Call $\max(0,S-X)$；Put $\max(0,X-S)$ |
| ITM/ATM/OTM | 依 strike 與 underlying 價關係；實務 ATM=最接近現價的 strike |
| 自動 exercise | 達門檻自動 exercise；可提交不 exercise 通知 |
| option margin | 風險基礎（OCC 系統、SPAN） |

---

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A4、B1、B2、B5）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 說明 futures 的買方與 call 的買方在「到期時是否必須收貨」上的差異。

<details><summary>解答</summary>

futures 買方有義務收貨並付款；call 買方擁有權利而無義務，可以選擇 exercise（收貨）或讓它過期。

</details>

**A2.** 某商品 futures 掛 3、5、7、9、12 月，交易所另掛 6 月與 8 月的序列 option。6 月 option 與 8 月 option 的 underlying 各是什麼？

<details><summary>解答</summary>

序列 option 的 underlying 是到期後最近的 futures 月份：6 月 option → 7 月 futures；8 月 option → 9 月 futures。

</details>

**A3.** 為什麼指數類衍生品傾向採用 AM settlement？

<details><summary>解答</summary>

許多策略要在到期時了結 underlying position，如果以收盤價 settlement，收盤前會湧入大量股票買賣單，造成價格扭曲與失衡。改用開盤價（或開盤後平均價）計算 settlement price，可以把這些單分散到開盤競價處理，減輕收盤衝擊。

</details>

**A4.** ⭐ 你賣出了 10 口某股 50 put，到期前一週股價跌到 42。你可能會遇到什麼事？結果是什麼 position？

<details><summary>提示</summary>

先查「記憶表」：put 被 assign 等於被迫用 strike 做什麼？再算口數 × 100 股 × 50 的現金。

</details>

<details><summary>解答</summary>

你可能被 assign（American option early exercise，或到期自動 exercise）。被 assign put → 被迫以 50 買進股票：付 $10\times100\times50=\$50{,}000$，收到 1,000 股，成為股票多頭（市價 42，帳面每股虧 8，但當初收的 premium 可抵銷一部分）。

</details>

**A5.** 自動 exercise 門檻為 0.05。你持有到期時 ITM 0.04 的 call，且你的交易成本極低。你該怎麼做？若 ITM 0.08 但你的成本高達 0.10 呢？

<details><summary>解答</summary>

ITM 0.04 低於門檻不會被自動 exercise；若 exercise 仍划算，須主動提交 exercise 通知。ITM 0.08 會被自動 exercise，但成本 0.10 使 exercise 淨虧 0.02，應提交「不 exercise 通知」。

</details>

**A6.** 為什麼 option 買方的 margin 需求有上限，而賣出 call 的 margin 需要用情境分析決定？

<details><summary>解答</summary>

買方最大損失就是已付的 premium，clearinghouse 面臨的風險有限，margin 不會超過最大損失。賣出 call 理論上損失無上限，必須評估多種價格與 volatility 情境下的損失（如 SPAN），收取足以涵蓋合理最壞情況的 margin。

</details>

### B. 計算題

**B1.** ⭐ underlying futures 1,183。(a) 1,150 call intrinsic value？(b) 若 1,150 call 報 41.20，time value？(c) 1,100 put 的 intrinsic value？

<details><summary>提示</summary>

call intrinsic value = underlying − strike（負的算 0）；time value = quote − intrinsic value；put 則是 strike − underlying。

</details>

<details><summary>解答</summary>

(a) $1{,}183-1{,}150=33$；(b) $41.20-33=8.20$；(c) $\max(0,1{,}100-1{,}183)=0$，全為 time value。

</details>

**B2.** ⭐ 股票 option 每口 100 股。(a) 你被 assign 7 口 45 call，現金與股票如何變動？(b) 你 exercise 3 口 72 put 呢？

<details><summary>提示</summary>

先判斷是「買」還是「賣」（被 assign call → 賣；exercise put → 賣），再算口數 × 100 × strike。

</details>

<details><summary>解答</summary>

(a) 被迫以 45 賣出：收 $7\times100\times45=\$31{,}500$，交出 700 股。
(b) 選擇以 72 賣出：收 $3\times100\times72=\$21{,}600$，交出 300 股。

</details>

**B3.** 外匯 futures 現價 1.2850，每口 125,000 單位（每 1.0000 價格變動的價值為 $125,000）。(a) 你 exercise 2 口 1.2700 call，立即變動金？(b) 你被 assign 5 口 1.2600 call 呢？

<details><summary>解答</summary>

(a) 取得多 2 口 @1.2700：$(1.2850-1.2700)\times125{,}000\times2=+\$3{,}750$
(b) 被迫空 5 口 @1.2600：$(1.2600-1.2850)\times125{,}000\times5=-\$15{,}625$

</details>

**B4.** 某指數 settlement 於 5,612.40，每點 $100。(a) exercise 4 口 5,550 call 收多少？(b) 被 assign 2 口 5,700 put 付多少？

<details><summary>解答</summary>

(a) $(5{,}612.40-5{,}550)\times100\times4=\$24{,}960$
(b) $(5{,}700-5{,}612.40)\times100\times2=\$17{,}520$

</details>

**B5.** ⭐ 股價 $74.60，strike 間距 2.5。哪一個 strike 是 ATM？75 call 與 72.5 put 分別 ITM 或 OTM 多少？

<details><summary>提示</summary>

先比較股價到 75 和 72.5 的距離，近的那個是 ATM；再想 call、put 各在 strike 哪一邊才算 ITM。

</details>

<details><summary>解答</summary>

最接近 74.60 的是 75（距離 0.40；72.5 距離 2.10），所以 75 為 ATM。75 call OTM 0.40；72.5 put OTM 2.10（put strike 低於股價）。

</details>

**B6.** 某 put strike 90，underlying 82.30，quote 9.10。time value 是多少？若同條件另一個「歐式」深度 ITM put（strike 130，underlying 82.30）報 47.40，time value 是多少？說明可能原因。

<details><summary>解答</summary>

90 put：內含 7.70，time value $9.10-7.70=1.40$。
130 put：內含 $130-82.30=47.70$，time value $47.40-47.70=-0.30$（負值）。歐式 put 無法 early exercise；深度 ITM 時，strike 要等到到期才收到，其現值低於 strike 本身（利息損失），可使價格低於平價，見 ch16。

</details>

### C. 交易情境題

**C1.** 你在 Optibook market making 某美式 call，strike 100，underlying bid/ask = 108.40 / 108.50。有人在該 call 掛出 ask 8.20。你會怎麼做？

<details><summary>解答</summary>

intrinsic value 以可成交的 underlying bid 計為 $108.40-100=8.40$，ask 8.20 低於 intrinsic value。買進 call 後立即 exercise（以 100 買進 underlying）並在 108.40 賣出 underlying，可鎖定 $8.40-8.20=0.20$ 的無風險利潤（扣除成本前）。即使不 exercise，也可買 call、賣 underlying hedge，因為這個價格明顯低估。若是 European option 則不能立即 exercise，但價格仍明顯偏低（需考慮利息），同樣值得買進並以 underlying hedge。

</details>

**C2.** expiration date 下午，你空 50 口某股 40 call，股價在 40.01～40.03 之間跳動，收盤後你會有什麼風險？應如何處理？

<details><summary>解答</summary>

這是「釘住風險」（pin risk）：收盤時是否 ITM、以及對方是否 exercise 都不確定（ITM 極少，可能被自動 exercise，也可能有人提交不 exercise）。你可能在週末帶著意料之外的 −5,000 股 short position，週一開盤跳空就會有大額損益。處理方式：收盤前以小成本買回這些 call 平倉，或預先建立部分股票 position 並接受殘餘風險。

</details>

### D. 挑戰題

**D1.** 某美式 call strike 50，underlying 股價 61，premium 10.70，距到期 3 個月，利率 4%，到期前無股利（dividend）。(a) 這個 quote 是否有 arbitrage？(b) 若改為「歐式」call，下界大約是多少？（提示：先想「買 call + 存入 strike 的現值」與「持有股票」的比較，[ch14](ch14_synthetics.md)、[ch16](ch16_early_exercise.md) 會正式推導。）

<details><summary>解答</summary>

(a) 美式 call 可立即 exercise：內含 11，quote 10.70 低於 intrinsic value，買 call、立即 exercise、賣股票可賺 0.30——有 arbitrage。
(b) 歐式 call 不能立刻 exercise，但比較兩個組合：「買 call + 存入 $50/(1+0.04\times0.25)=49.50$」到期時至少值 $\max(S_T,50)\ge S_T$，所以它今天的價值必須至少等於股價 61。因此 $C\ge61-49.50=11.50$。10.70 低於 11.50，**買歐式 call、放空股票、把錢存起來**仍有 arbitrage。這說明無 dividend 時，call 的價值下界其實高於 intrinsic value（$S-X$），差額來自 strike 的利息——也是無 dividend 美式 call 不應 early exercise 的原因。

</details>

---

## 自我檢核清單

- [ ] 能說出 option 五大規格並解讀一張合約名稱
- [ ] 能判斷 futures option（含序列 option）的 underlying 月份
- [ ] 能說明最後交易日、AM／PM settlement 的差異與原因
- [ ] 能背出 exercise／assign 四種情況分別是買還是賣
- [ ] 能計算實物、futures、現金三種交割的現金流與變動金
- [ ] 能說明歐式與美式的差異，並知道哪類商品通常是哪一種
- [ ] 能拆解 premium 為 intrinsic value 與 time value
- [ ] 能判斷 ITM、ATM、OTM，並找出實務上的 ATM strike
- [ ] 能說明自動 exercise 門檻與不 exercise 通知的用途
- [ ] 能說明 option margin 為何採風險基礎方法

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab02_payoffs.py`](../labs/exercises/lab02_payoffs.py)：實作 `call_payoff`、`put_payoff`、`intrinsic_and_time_value`、`round_to_tick`、`classify_moneyness`、`exercise_settlement`、`leg_pnl`、`position_pnl`、`breakevens`、`slope_profile`、`max_profit_loss`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab02_payoffs.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab02_payoffs**（[../labs/](../labs/)）：實作 `intrinsic(type, S, K)`、`time_value(price, type, S, K)`、`moneyness(type, S, K)` 與 `atm_strike(S, strikes)`，以及 exercise／assign 現金流函式（實物、futures、現金三種），並以本章例 3-3～3-7 當測試；到期損益與 parity graph 的部分對應 [ch04](ch04_expiration_pnl.md)。
