# 第 2 章　遠期定價（Forward Pricing）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：遠期價格（forward price）不是「預測」，而是「現在買」和「以後買」打平的價格——現在買要多付利息和倉儲費，但能先領租金、股利（dividend）；把這些加加減減，就是公平遠期（at-the-forward）價。

**你只需要先記住這 5 件事**

1. **forward price = 現貨 + 現在買的成本 − 現在買的效益。** 成本：利息、倉儲、保險；效益：dividend、票息、租金、外幣利息。
2. **股票簡化式：forward price = 股價 ×（1 + 利率 × 時間）− 期間 dividend。** 例：股價 52、利率 4%、9 個月、dividend 1.20 → 52 × 1.03 − 1.20 = 52.36。
3. **期貨（futures）的 forward price 就是 futures 價格本身。** 所以期貨選擇權（futures option）在這一步最簡單。
4. **市場價偏離理論價 → 先想套利（arbitrage），也先懷疑自己。** 遠期太貴就買現貨、賣遠期；但也可以反推隱含利率、隱含股利（implied dividend），看是不是自己的參數錯了。
5. **高利率貨幣的遠期貼水；放空要付借券成本。** 借券成本讓沒持股的人面對一個「無 arbitrage 區間」；但選擇權（option）現金流一律用一般利率。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 實物商品遠期 | 現貨 ×（1 + 利率 × 時間）+（倉儲 + 保險）× 時間 |
| 股票遠期（簡化） | 股價 ×（1 + 利率 × 時間）− 期間 dividend |
| 外匯遠期 | 即期 ×（1 + 本國利率 × 時間）÷（1 + 外國利率 × 時間） |
| implied dividend | 股價 ×（1 + 利率 × 時間）− 市場 forward price |
| 基差（basis） | 現貨價 − forward price（通常為負） |

**必做練習（約 20 分鐘）**：A1、B1、B3、B6（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

---

## 本章定位

所有 option 模型的第一步都是「算出標的（underlying）的 forward price」——[ch05](ch05_pricing_models.md) 會看到，機率分配的中心就是 forward price。本章教你如何從「現在買 vs. 未來買」的成本與效益推出公 at-the-forward 價格，並用它判斷 arbitrage、反推隱含值。前置章節：[ch01 金融合約](ch01_financial_contracts.md)。

> 對應原書：第 2 章〈Forward Pricing〉，含〈Physical Commodities〉〈Stock〉〈Bonds and Notes〉〈Foreign Currencies〉〈Stock and Futures Options〉〈Arbitrage〉〈Dividends〉〈Short Sales〉。

## 學習目標

1. **能計算**實物商品、股票、債券與外匯的公 at-the-forward 價格（含利息、倉儲、保險、dividend、票息）。
2. **能解釋** basis、正價差（contango）、逆價差（backwardation）與便利收益（convenience yield），並從市場價格反推 convenience yield。
3. **能列出**現貨持有套利（cash-and-carry）的完整現金流，判斷 forward price 是高估或低估。
4. **能反推**隱含現貨價、隱含利率與 implied dividend。
5. **能說明** dividend 相關日期（宣告日、除息日（ex-dividend date）、登記日、發放日）對衍生品評價的影響。
6. **能計算**放空成本造成的「無 arbitrage 區間」，並說明為何 option 交易一律使用一般（long）利率。

---

## 核心概念

### 2.1 遠期價格的基本邏輯

> 💡 **一句話**：forward price = 現貨 + 現在買的成本 − 現在買的效益；成本大於效益時 basis 為負。

遠期合約（forward contract）並沒有消除持有資產的成本與效益，只是把它們**延後**。因此：

$$\boxed{\text{遠期價格} = \text{現貨價格} + \text{現在買的成本} - \text{現在買的效益}}$$

如果市場上大家對成本效益的估計一致，那麼「今天以現貨價買」與「簽遠期、一年後以 forward price 買」對買賣雙方應該**沒有差別**。

**例題 2-1：倉庫的一年 forward price（自創）**
小安想買一間倉庫，現貨價 $200,000。已知：
1. 借貸利率皆為 6%（單利）。
2. 屋主需繳一筆 $3,000 的年度保險費，**4 個月後**到期。
3. 倉庫目前出租，每月月底收租 $800。

**現在買的成本**
- 現貨價的利息：$200{,}000\times6\%=\$12{,}000$
- 4 個月後繳保險費，需借錢 8 個月：$3{,}000+3{,}000\times6\%\times\tfrac{8}{12}=3{,}000+120=\$3{,}120$
- 成本合計：$12{,}000+3{,}120=\$15{,}120$

**現在買的效益**
- 12 個月租金：$12\times800=\$9{,}600$
- 租金再投資利息：第 1 個月底收到的租金可放 11 個月、第 2 個月底放 10 個月……第 12 個月底放 0 個月：
  $$800\times6\%\times\frac{11+10+\cdots+1+0}{12}=800\times0.06\times\frac{66}{12}=\$264$$
- 效益合計：$9{,}600+264=\$9{,}864$

**公 at-the-forward 價格**
$$F=200{,}000+15{,}120-9{,}864=\$205{,}256$$

**basis**＝現貨價 − forward price：
$$\text{basis}=200{,}000-205{,}256=-\$5{,}256$$

多數情況下持有成本（cost of carry）大於效益，basis 為負。但若租金夠高，效益超過成本，forward price 就會低於現貨價，basis 轉正。以本例而言，月租需高於約 $15{,}120/(12+0.06\times66/12)\approx\$1{,}226$ 才會讓 basis 轉正。

**各類 underlying 的成本與效益（自整理）**

| underlying | 現在買的成本 | 現在買的效益 |
|---|---|---|
| 實物商品 | 現貨價利息、倉儲費、保險費 | convenience yield（見 2.2） |
| 股票 | 股價利息 | dividend 及其再投資利息 |
| 債券／票券 | 債券價格利息 | 票息及其再投資利息 |
| 外匯 | 借本國貨幣的利息 | 持有外幣賺到的外幣利息 |

---

### 2.2 實物商品（穀物、能源、貴金屬等）

> 💡 **一句話**：商品遠期要加利息、倉儲、保險；現貨反而比 futures 貴（backwardation）時，差額就是 convenience yield。

設 $C$＝商品現貨價（**本章專用**；之後各章 $C$ 代表買權（call）價格），$t$＝到期時間（年），$r$＝利率，$s$＝每單位年倉儲費，$i$＝每單位年保險費：

$$F=C\times(1+r\times t)+s\times t+i\times t$$

（實務上倉儲與保險常合併報價（quote）。）

**例題 2-2（自創）**：$C=\$84$，$r=5\%$，$t=6$ 個月，$s=\$2.40$／年，$i=\$0.40$／年。
$$F=84\times(1+0.05\times0.5)+(2.40+0.40)\times0.5=86.10+1.40=\$87.50$$

**contango 與 backwardation**
- **contango／正常市場（contango）**：遠月 futures 價格高於近月（也高於現貨）。按上式這是「理所當然」的狀態。
- **backwardation**：futures 價格低於現貨價。利息與倉儲都是正的，這看似不合理——但想像一家工廠，原料斷貨就得停工，停工代價極高。當供給吃緊時，它願意為「**現在就拿到貨**」付出溢價，把現貨價推得比 futures 還高。

**convenience yield**：立即持有實物商品所帶來的好處。它很難直接量化，但可以**從市場價格反推**：

$$C_{\text{理論}}=\frac{F-(s+i)\times t}{1+r\times t},\qquad \text{便利收益}\approx C_{\text{市場}}-C_{\text{理論}}$$

**例題 2-3（自創）**：接續例 2-2 的參數，若 6 個月 futures 在市場上報 $87.50：
$$C_{\text{理論}}=\frac{87.50-1.40}{1.025}=\$84.00$$
如果現貨市場實際成交在 $85.30，表示使用者願意多付 $85.30-84.00=\$1.30$ 換取「現在就有貨」——這就是隱含的 convenience yield。

---

### 2.3 股票

> 💡 **一句話**：股票遠期 = 股價加利息再扣掉 dividend；平常用簡化式就夠準。

設 $S$＝股價，$t$＝到期時間，$r$＝期間利率，$d_i$＝到期前第 $i$ 次 dividend，$t_i$＝該次 dividend 發放後距到期的時間，$r_i$＝該段期間適用的利率（遠期利率，forward rate）：

$$F=S\times(1+r\times t)-\sum_i d_i\times(1+r_i\times t_i)$$

**遠期利率小補充**：遠期利率是「從未來某一天開始、為期一段時間」的利率，常以月份表示。例如「2×8 遠期利率」＝ 2 個月後開始、為期 6 個月的利率；遠期利率協定（FRA）就是約定未來某段期間借貸利率的合約。

**例題 2-4：精確算法（自創）**
$S=\$52$，$t=9$ 個月，$r=4\%$；每季 dividend $0.40，下一次在 2 個月後發放 → 9 個月內共 3 次（第 2、5、8 個月）。
- $t_1=7$ 個月，$r_1=4.1\%$；$t_2=4$ 個月，$r_2=4.2\%$；$t_3=1$ 個月，$r_3=4.3\%$

$$\begin{aligned}
F&=52\times(1+0.04\times\tfrac{9}{12})-0.40(1+0.041\times\tfrac{7}{12})-0.40(1+0.042\times\tfrac{4}{12})-0.40(1+0.043\times\tfrac{1}{12})\\
&=53.5600-0.4096-0.4056-0.4014=\$52.3434
\end{aligned}$$

**簡化算法**：除了長天期合約，dividend 次數少、dividend 利息很小。把期間 dividend 加總為 $D$ 並忽略其利息：

$$\boxed{F=S\times(1+r\times t)-D}$$

例 2-4 簡化：$52\times1.03-1.20=\$52.36$，與精確值只差約 0.017。本課程之後預設使用簡化式。

---

### 2.4 債券與票券

> 💡 **一句話**：債券就把票息當 dividend 處理；票息高過資金成本時，forward price 會低於現貨價。（可先跳過）

把票息當成 dividend 處理即可。$B$＝債券價格，$c_i$＝到期前每次票息：

$$F=B\times(1+r\times t)-\sum_i c_i\times(1+r_i\times t_i)$$

**例題 2-5（自創）**：$B=102.50$，$t=8$ 個月，$r=5\%$；半年付息，每次票息 3.00（年票面 6%），下次付息在 1 個月後 → 第 1、7 個月各一次。$t_1=7$ 個月、$r_1=5.1\%$；$t_2=1$ 個月、$r_2=5.3\%$。

$$\begin{aligned}
F&=102.50\times(1+0.05\times\tfrac{8}{12})-3.00(1+0.051\times\tfrac{7}{12})-3.00(1+0.053\times\tfrac{1}{12})\\
&=105.9167-3.0893-3.0133=99.8142
\end{aligned}$$

票息收入（6.10）大於資金成本（3.42），所以 forward price 低於現貨價。

---

### 2.5 外匯（Foreign Currencies）

> 💡 **一句話**：兩種貨幣各自用自己的利率成長；外幣利率較高時，外幣遠期貼水。

外匯涉及兩個利率：買外幣時要付的**本國利率** $r_d$，以及持有外幣賺到的**外國利率** $r_f$。直接「現貨 + 本國利息 − 外幣利息」會出現單位不一致，因此把匯率寫成分數：$S=C_d/C_f$（一單位外幣值多少本國貨幣）。兩邊各自以自己的利率成長：

$$F=\frac{C_d\times(1+r_d\times t)}{C_f\times(1+r_f\times t)}=S\times\frac{1+r_d\times t}{1+r_f\times t}$$

**例題 2-6（自創）**：以新台幣為本國貨幣，1 美元 = 32.00 新台幣；$r_{\text{TWD}}=1.5\%$，$r_{\text{USD}}=4.5\%$，$t=9$ 個月：

$$F=32.00\times\frac{1+0.015\times0.75}{1+0.045\times0.75}=32.00\times\frac{1.01125}{1.03375}=31.3035$$

**直覺**：外幣利率較高 → 外幣遠期**貼水**（遠期匯率低於即期）。否則人人都會借低利的新台幣、換成高利美元、再用遠期鎖定換回匯率，穩賺利差。

---

### 2.6 股票選擇權與期貨選擇權

> 💡 **一句話**：股票 option 要自己算 forward price；futures option 直接用 futures 價格。

本書（與本課程）主要討論兩類交易所 option：**股票 option**與**futures option**。實物商品、債券、外匯雖有店頭 option，但交易所掛牌的幾乎都是「該商品 futures 的 option」——例如交易所的原油 option，underlying 其實是原油 futures。

兩類 option 的價值都取決於 underlying 的**forward price**：
- 股票：要用 2.3 節公式計算。
- futures：**futures 本身就是 forward contract，所以 forward price 就是 futures 價格**。3 個月 futures 報 75.00，3 個月 forward price 就是 75.00，不需任何額外計算。這讓 futures option 在這一步反而更簡單。

---

### 2.7 套利（Arbitrage）

> 💡 **一句話**：遠期偏離理論價就有 cash-and-carry arbitrage；但也要反推隱含利率、implied dividend，檢查是不是自己錯了。

交易員口中的 arbitrage 常是「無風險利潤」，但幾乎沒有真正零風險的事。本課程定義：**在不同市場同時買賣相同或高度相關的商品，以獲取明顯錯價的利潤**。

**例題 2-7：地點價差（自創）**
黃金在甲地報 $2,330/盎司，在乙地報 $2,342/盎司。表面價差 $12，但從甲地運到乙地的運費加運輸保險為每盎司 $7.50，所以真正的 arbitrage 利潤只有 $12-7.50=\$4.50$。專業交易員本來就知道運費與保險，所以能一眼判斷 arbitrage 是否存在。

**套息交易（carry trade）不是真 arbitrage**
借低利率貨幣、換成高利率貨幣存放，期望賺利差。風險包括：(1) 利率可能變動（借款利率上升、存款利率下降），(2) **匯率可能反轉**——到期要用外幣換回本國貨幣還款，若外幣貶值，可能賠掉遠超過利差的錢。名為 arbitrage，實則風險不小（見挑戰題 D2）。

**cash-and-carry arbitrage**：在現貨市場買進、在 futures／遠期市場賣出，持有到期交割。

**例題 2-8（自創）**：沿用例 2-4 的股票（簡化式）：$S=52$，$t=9$ 個月，$r=4\%$，$D=1.20$ → 理論 forward price $52.36$。若市場上 9 個月遠期報 **52.90**：
- 遠期太貴 → **賣遠期、買股票**，預期利潤 $52.90-52.36=0.54$。

完整現金流驗證：

| 項目 | 金額 |
|---|---|
| 借 52 元 9 個月的利息 $52\times0.04\times0.75$ | −1.56 |
| 買股票 | −52.00 |
| 收到 dividend | +1.20 |
| 到期交付股票、收到 forward price | +52.90 |
| **合計** | **+0.54** |

股價或 forward price 之後怎麼波動都不影響結果：買價（52）與到期賣價（52.90）都已鎖定。

**剩下的風險**
- **利率風險**：多數交易員以浮動利率借貸，若利率上升，資金成本增加，利潤縮水（若以固定利率借貸則無此風險）。
- **dividend 風險**：除非公司已宣告，dividend 只是根據過去的估計；若公司意外減發 dividend，利潤減少。

**隱含值（implied values）**
看到「錯價」時，交易員也該反問：會不會是我的參數錯了？由 $F=S(1+rt)-D$ 可以解出任一未知數：

$$S_{\text{隱含}}=\frac{F+D}{1+r\times t},\qquad r_{\text{隱含}}=\frac{(F+D)/S-1}{t},\qquad D_{\text{隱含}}=S(1+r\times t)-F$$

接續例 2-8（$F=52.90$）：
- 若其他參數都對，**隱含利率** $=\dfrac{(52.90+1.20)/52-1}{0.75}=\dfrac{0.040385}{0.75}=5.38\%$
- 若利率是對的，**implied dividend** $=52\times1.03-52.90=0.66$；預期 3 次配息，市場似乎預期每次只有 $0.22$。

**隱含值是貫穿全書的概念**：如果你相信市場價格是公平的，那麼隱含值就是市場對那個未知參數的共識估計。[ch06](ch06_volatility.md) 的隱含波動率（implied volatility）就是同一個想法。

---

### 2.8 股利（Dividends）

> 💡 **一句話**：ex-dividend date 決定誰拿得到 dividend；日期估錯幾天，forward price 和 option 價值都可能跟著錯。

評價股票衍生品常要估計**dividend 金額**與**日期**。相關日期：

| 日期 | 意義 |
|---|---|
| 宣告日（declared date） | 公司公布 dividend 金額與發放日。一經宣告，該次 dividend 的不確定性就消失。 |
| 登記日（record date） | 必須在這天「正式」持有股票才有資格領 dividend。正式持有以**交割日**為準。 |
| ex-dividend date | 第一個**不含** dividend 權利的交易日。 |
| 發放日（payable date） | dividend 實際付給合格股東的日期。 |

**交割週期與 ex-dividend date 的關係**：原書撰寫時美股為 T+3，所以「最後買進日」在登記日前 3 個營業日，ex-dividend date 在登記日前 2 個營業日。注意美股已於 2024 年 5 月改為 **T+1**，ex-dividend date 因此與登記日同一天；台股為 T+2，ex-dividend date（除息交易日）訂在停止過戶日前。原理不變：**ex-dividend date 當天以後買進的人，交割來不及趕上登記日，所以領不到 dividend**。

```
  （T+2 市場示意）
  最後可買進日 ──→ 除息日 ──→ ... ──→ 登記日
        └──── 交割需 2 個營業日 ─────┘
```

**ex-dividend date 的 quote**：除息當天，quote 會先把 dividend 從前一日收盤價扣掉再算漲跌。

**例題 2-9（自創）**：某股前一日收 $48.30，dividend $0.55，ex-dividend date 開盤 $48.10。
- 除息參考價：$48.30-0.55=\$47.75$
- quote 顯示：**48.10，+0.35（除息 0.55）**——相對參考價上漲 0.35，而不是相對前收下跌 0.20。

**估計 dividend**：若公司過去 12 季都配 $0.25，合理假設未來也繼續配 $0.25。
**日期為什麼重要**：即使忽略 dividend 利息，若預期 ex-dividend date 很接近衍生品到期日（expiration date），只要日期估錯幾天（落在到期前或後），衍生品價值就可能大幅改變——這在 [ch05](ch05_pricing_models.md) 與 [ch16](ch16_early_exercise.md) 會再出現。

---

### 2.9 放空（Short Sales）

> 💡 **一句話**：放空只拿得到較低的回饋利率，形成無 arbitrage 區間；option 現金流一律用一般利率。

futures 可以自由買賣（唯一例外是**漲跌停鎖死**：某些 futures 有每日漲跌幅限制，觸及限制後在價格離開限制前無法成交，稱 locked limit）。股票買進、或賣出已持有的股票也沒有限制。但若要賣出**自己沒有的股票**（放空），必須先**借券**。

**借券機制**
- 機構法人與券商常願意出借股票（券商依客戶協議可出借客戶持股）。
- 熱門股通常容易借到；冷門或被大量放空的股票可能借不到，導致**軋空（short squeeze）**。
- 買方不在乎賣方是借券賣還是真持有，成交後他就是登記股東。

**現金流與利息**
**例題 2-10（自創）**：借 500 股、以 $52 放空，收到 $500\times52=\$26{,}000$。
- 出借方保管這 $26,000 作為還券擔保；因為錢理論上屬於放空者，出借方會付利息給他——但只付**一部分**，這就是出借方的利潤。
- 放空者必須把期間的 dividend 付給出借方。
- 放空者實際收到的利率稱**放空回饋利率（short-stock rebate）**。借券越困難，回饋越少，極端情況是零。

以符號表示：一般借貸利率 $r_l$（long rate），放空利率 $r_s$（short rate），兩者差額為借券成本 $r_{bc}$：

$$r_l-r_s=r_{bc}$$

**例題 2-11：無 arbitrage 區間（自創）**
沿用例 2-8：$S=52$，$t=9$ 個月，$D=1.20$，$r_l=4\%$，借券成本 1.5% → $r_s=2.5\%$。
- 以一般利率算的 forward price：$52\times1.03-1.20=52.36$（遠期**高於**此價 → 買股票賣遠期 arbitrage）
- 以放空利率算的 forward price：$52\times(1+0.025\times0.75)-1.20=51.775$（遠期**低於**此價 → 放空股票買遠期 arbitrage）

若市場遠期報 52.10：
- **已持有**股票的人：賣股票、買遠期，等於省下 cost of carry，利潤 $52.36-52.10=0.26$。
- **沒有股票**、必須放空的人：只拿到 2.5% 回饋，$51.775-52.10=-0.325$，**反而虧錢**。

所以對沒有股票的交易員來說，forward price 落在 **51.775 ～ 52.36** 之間時無 arbitrage 可做。

**option 用哪個利率？** option 不是可交付的有價證券，而是買賣雙方之間「創造」出來的合約；賣出 option 不需要先「借」option。因此**買進或賣出 option 產生的現金流一律使用一般（long）利率**。

---

## 交易員視角

1. **Optibook 的股票 vs. futures 挑戰（stock_future）**：futures 的公平價大致是 $F\approx S(1+rt)-D$。若 futures quote 偏離理論價超過交易成本（兩邊的買賣價差（bid-ask spread）），就是 cash-and-carry arbitrage（或反向 arbitrage）的機會：futures 太貴 → 買股票、賣 futures；futures 太便宜 → 賣股票、買 futures。注意要用**可成交價**計算：買股票看 ask、賣 futures 看 bid。
2. **部位上限（position limit）就是你的「借券限制」**：Optibook 可以直接放空到 position limit，不收借券費，但真實市場放空有成本，會形成本章的無 arbitrage 區間。上限也意味著一旦兩條腿都打滿，就算價差更大也無法再加碼——要預留空間。
3. **用隱含值檢查自己**：如果你的模型老是說 futures「太貴」，先反推隱含利率或 implied dividend。若隱含值合理而你的參數離譜，錯的多半是你。
4. **ex-dividend date 附近要特別小心**：dividend 日期估錯，forward price 就錯，所有依賴 forward price 的 option quote 也跟著錯。
5. **限價單 vs. IOC**：arbitrage 需要兩腿幾乎同時成交，常用 IOC 單打掉對方 quote，避免只成交一腿留下裸露部位（position）。

## 常見誤區

1. **誤解**：forward price 是市場對未來現貨價的「預測」。
   **正解**：forward price 是由 cost of carry 與效益決定的**無 arbitrage 價格**；它被當作分配中心，是因為偏離它就會被 arbitrage，而不是因為有人預測。
2. **誤解**：backwardation 違反無 arbitrage，不可能存在。
   **正解**：實物商品存在 convenience yield；供給吃緊時現貨溢價可以大到讓現貨高於 futures。
3. **誤解**：外幣利率高，所以外幣遠期應該升水。
   **正解**：相反。高利率貨幣的遠期是貼水，否則可以借低利貨幣、換高利貨幣並以遠期鎖匯，賺無風險利差。
4. **誤解**：cash-and-carry arbitrage 完全沒有風險。
   **正解**：價格風險已鎖定，但仍有浮動利率風險、dividend 變動風險、交易對手與執行風險。
5. **誤解**：不論有沒有持股，arbitrage 區間都相同。
   **正解**：沒有持股者需放空，只能拿到放空回饋利率，因此「遠期太便宜」那一側的 arbitrage 門檻較低（例 2-11 的 51.775）。
6. **誤解**：賣出 option 也要付借券成本，所以要用放空利率。
   **正解**：option 不需借入即可賣出，一律用一般利率。

## 重點摘要

| underlying | forward price（單利） |
|---|---|
| 一般原則 | 現貨 + 現在買的成本 − 現在買的效益 |
| 實物商品 | $F=C(1+rt)+st+it$ |
| 股票（精確） | $F=S(1+rt)-\sum d_i(1+r_it_i)$ |
| 股票（簡化） | $F=S(1+rt)-D$ |
| 債券 | $F=B(1+rt)-\sum c_i(1+r_it_i)$ |
| 外匯 | $F=S\dfrac{1+r_dt}{1+r_ft}$ |
| futures | forward price = futures 價格 |

| 名詞 | 定義／規則 |
|---|---|
| basis | 現貨價 − forward price；通常為負 |
| contango / backwardation | 遠月高於近月 / futures 低於現貨 |
| convenience yield | $C_{\text{市場}}-\dfrac{F-(s+i)t}{1+rt}$ |
| 隱含利率 | $r=\dfrac{(F+D)/S-1}{t}$ |
| implied dividend | $D=S(1+rt)-F$ |
| 借券成本 | $r_{bc}=r_l-r_s$ |
| 無 arbitrage 區間（無持股者） | $[S(1+r_st)-D,\ S(1+r_lt)-D]$ |
| option 現金流 | 一律用 long rate |

---

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B1、B3、B6）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ 為什麼說「forward contract 沒有消除 cost of carry，只是把它延後」？請用一句話連結到 forward price 公式。

<details><summary>提示</summary>

想想「現在買」和「簽遠期以後買」，買方省下了什麼、又放棄了什麼？再對應到「現貨 + 成本 − 效益」。

</details>

<details><summary>解答</summary>

簽遠期而不現在買，買方省下了現在付款的利息（以及倉儲等成本）、但也放棄了持有期間的收益（dividend、租金等）；賣方則反之。公平的 forward price 必須把這些被延後的成本加上、效益扣除，才能讓雙方對「現在買」與「未來買」無差異：$F=$ 現貨 + 成本 − 效益。

</details>

**A2.** 某原油市場出現現貨價高於所有 futures 月份的狀況，這叫什麼？可能的經濟原因是什麼？

<details><summary>解答</summary>

backwardation。原因多半是供給吃緊，需要原料維持生產的使用者願意為「立刻拿到貨」付出溢價（convenience yield），使現貨價高於「理論 cost of carry」下的價格。

</details>

**A3.** 為什麼 futures option 在「計算 forward price」這一步比股票 option 簡單？

<details><summary>解答</summary>

futures 本身就是 forward contract，與 option 同到期（或稍後到期）的 futures 價格就是 forward price，不必另外估計利率與 dividend；股票則必須用 $S(1+rt)-D$ 計算，且要估計 dividend。

</details>

**A4.** 說明套息交易（carry trade）為什麼不應被稱為 arbitrage。

<details><summary>解答</summary>

套息交易沒有鎖定匯率：到期時要把高利外幣換回低利本國貨幣償還借款，若外幣貶值超過利差就會虧損；利率也可能變動。真正的 arbitrage 應該把所有價格都鎖定，只賺錯價。

</details>

**A5.** 某交易員已持有某股票，另一位沒有持股。面對同一個「偏低」的 forward price，為什麼前者可能有 arbitrage 機會而後者沒有？

<details><summary>解答</summary>

利用偏低遠期的 arbitrage 是「賣股票、買遠期」。已持股者賣出自己的股票即可，賣得的現金按一般利率計息；沒有持股者必須借券放空，只能拿到較低的放空回饋利率，理論 forward price 因此較低（以 $r_s$ 計算），偏低的市場遠期可能仍高於這個門檻，就無利可圖。

</details>

**A6.** ex-dividend date 對 option 交易員最重要的意義是什麼？

<details><summary>解答</summary>

ex-dividend date 決定誰能拿到 dividend。若 ex-dividend date 落在 option 到期前，forward price 要扣掉 dividend；若因公司延後而落到到期後，等於這次 dividend 對該 option 不存在。日期差幾天就可能改變 forward price 與 option 價值，也影響美式 call 是否提前履約（early exercise）（見 ch16）。

</details>

### B. 計算題

**B1.** ⭐ 某貴金屬現貨 $1,950/盎司，利率 4.5%，倉儲加保險每年每盎司 $12。求 4 個月 forward price。

<details><summary>提示</summary>

用商品公式：現貨 ×（1 + 利率 × 時間）+ 倉儲保險 × 時間；4 個月 = 4/12 年。

</details>

<details><summary>解答</summary>

$F=1{,}950\times(1+0.045\times\tfrac{4}{12})+12\times\tfrac{4}{12}=1{,}979.25+4.00=\$1{,}983.25$

</details>

**B2.** 某商品 3 個月 futures 報 $62.10，利率 6%，年倉儲 $1.60、年保險 $0.40。若現貨市場實際成交 $61.40，隱含 convenience yield 約為多少？

<details><summary>解答</summary>

$C_{\text{理論}}=\dfrac{62.10-(1.60+0.40)\times0.25}{1+0.06\times0.25}=\dfrac{61.60}{1.015}=60.69$
convenience yield $\approx61.40-60.69=\$0.71$

</details>

**B3.** ⭐ 股價 $118，利率 5%，6 個月內預計配息兩次、每次 $0.85。用簡化式求 6 個月 forward price。

<details><summary>提示</summary>

先把兩次 dividend 加總成 D，再代入簡化式：股價 ×（1 + 利率 × 0.5）− D。

</details>

<details><summary>解答</summary>

$F=118\times(1+0.05\times0.5)-1.70=120.95-1.70=\$119.25$

</details>

**B4.** 股價 $40，到期 5 個月，利率 3.6%；1 個月後與 4 個月後各配息 $0.30，對應的遠期利率分別為 3.7%（剩 4 個月）與 3.8%（剩 1 個月）。用精確式求 forward price，並與簡化式比較。

<details><summary>解答</summary>

$$F=40(1+0.036\times\tfrac{5}{12})-0.30(1+0.037\times\tfrac{4}{12})-0.30(1+0.038\times\tfrac{1}{12})=40.6000-0.3037-0.3010=39.9953$$
簡化式：$40.60-0.60=40.0000$，差距約 0.005。

</details>

**B5.** 歐元兌美元即期 1.0850（1 歐元 = 1.0850 美元），美元利率 5%、歐元利率 3%。以美元為本國貨幣，求 1 年遠期匯率。

<details><summary>解答</summary>

$F=1.0850\times\dfrac{1.05}{1.03}=1.1061$（美元利率較高，美元相對貼水，即 1 歐元的遠期美元價較高）

</details>

**B6.** ⭐ 股價 $80，6 個月遠期市價 $81.10，期間 dividend $0.90。(a) 求隱含利率。(b) 若利率實為 4%，求 implied dividend。

<details><summary>提示</summary>

(a) 用隱含利率公式：先算（遠期 + dividend）÷ 股價 − 1，再除以時間 0.5；(b) implied dividend = 股價 ×（1 + 4% × 0.5）− 遠期市價。

</details>

<details><summary>解答</summary>

(a) $r=\dfrac{(81.10+0.90)/80-1}{0.5}=\dfrac{0.025}{0.5}=5.00\%$
(b) $D=80\times(1+0.04\times0.5)-81.10=81.60-81.10=\$0.50$

</details>

**B7.** 承 B6（dividend 0.90，6 個月），一般利率 5%、借券成本 2%。求沒有持股的交易員所面對的無 arbitrage 區間。

<details><summary>解答</summary>

上界（long rate）：$80\times1.025-0.90=81.10$
下界（short rate 3%）：$80\times1.015-0.90=80.30$
無 arbitrage 區間：**80.30 ～ 81.10**。

</details>

**B8.** 某辦公室現貨 $5,000,000，利率 3%；6 個月後須繳房屋稅 $60,000；每月月底收租 $20,000。求 1 年 forward price 與 basis。

<details><summary>解答</summary>

- 成本：利息 150,000；房屋稅 $60{,}000+60{,}000\times0.03\times0.5=60{,}900$；合計 210,900
- 效益：租金 240,000；租金利息 $20{,}000\times0.03\times66/12=3{,}300$；合計 243,300
- $F=5{,}000{,}000+210{,}900-243{,}300=\$4{,}967{,}600$
- basis $=5{,}000{,}000-4{,}967{,}600=+\$32{,}400$（效益大於成本，basis 為正）

</details>

### C. 交易情境題

**C1.** Optibook 上某股票 bid/ask = 52.00 / 52.05，對應 9 個月 futures bid/ask = 52.85 / 52.95。利率 4%、9 個月內預期 dividend 1.20，不考慮借券成本。你會怎麼做？若 futures bid/ask 變成 52.30 / 52.40 呢？

<details><summary>解答</summary>

理論 futures 價約 $52.05\times1.03-1.20=52.41$（以買得到的 ask 52.05 計）。futures bid 52.85 > 52.41，可用 IOC 買股票（52.05）、賣 futures（52.85），預期利潤約 $52.85-52.41=0.44$／股（未扣手續費）。
第二種情況：要反向操作（賣股票、買 futures），以賣得到的 bid 52.00 計理論價 $52.00\times1.03-1.20=52.36$；futures ask 52.40 > 52.36，買 futures 反而較貴，**沒有 arbitrage**。（若有借券成本，門檻更低，更不可能。）同時要注意 position limit，兩腿要同時下單避免單腿暴露。

</details>

**C2.** 你算出某股 3 個月遠期的理論價是 101.20，但市場持續穩定報 100.75，多家做市商（market maker）都在這附近 quote。公司下個月將公布 dividend 政策。你的判斷是什麼？

<details><summary>解答</summary>

先算 implied dividend：市場價較低，代表市場隱含的 dividend 比你假設的高約 0.45（假設利率無誤）。多家 market maker 一致 quote，較可能是市場預期公司會**提高 dividend**（或有特別 dividend），而不是市場錯了。合理做法是把它當作資訊：調整你的 dividend 假設，或在不確定時避免大量押注「遠期太便宜」，因為那等於賭公司不會加發 dividend。

</details>

### D. 挑戰題

**D1.** 本章使用單利 $F=S(1+rt)$。若 $S=100$、$r=5\%$、$t=2$ 年，分別計算單利、年複利與連續複利的 forward price。為何 Black-Scholes（[ch18](ch18_black_scholes.md)）使用 $F=Se^{(r-q)t}$？

<details><summary>解答</summary>

- 單利：$100\times(1+0.05\times2)=110.00$
- 年複利：$100\times1.05^2=110.25$
- 連續複利：$100\times e^{0.10}=110.52$

短天期時三者差異很小（本章例題用單利沒問題），但長天期差異變大。Black-Scholes 是連續時間模型，利息與股利率（dividend yield）（$q$）都以連續複利處理，數學上最一致（同一利率在任意切分時間下可相乘累積），也和 [ch06](ch06_volatility.md) 的對數常態分配（lognormal distribution）相容。

</details>

**D2.** 某交易員借 1,500 萬日圓（利率 0.5%）換成美元存 1 年（利率 5%），即期 1 美元 = 150 日圓。(a) 1 年後美元兌日圓跌到多少以下會虧損？這個數字和外匯遠期公式有何關係？(b) 若一年後匯率為 140，盈虧多少日圓？

<details><summary>解答</summary>

(a) 換得 100,000 美元，一年後成 105,000 美元；需償還 $15{,}000{,}000\times1.005=15{,}075{,}000$ 日圓。損益兩平（breakeven）匯率 $=15{,}075{,}000/105{,}000=143.57$。這正是用外匯遠期公式算出的 1 年遠期匯率 $150\times\dfrac{1.005}{1.05}=143.57$——遠期匯率就是「套息交易打平」的匯率；若用遠期鎖匯，套息利潤就消失了，這正說明了無 arbitrage。
(b) $105{,}000\times140=14{,}700{,}000$ 日圓，虧損 $14{,}700{,}000-15{,}075{,}000=-375{,}000$ 日圓。

</details>

---

## 自我檢核清單

- [ ] 能不看筆記寫出「現貨 + 成本 − 效益」並列出四類 underlying 的成本與效益
- [ ] 能完整計算含利息、費用、收入再投資利息的 forward price（如例 2-1）
- [ ] 能解釋 contango、backwardation 與 convenience yield，並從 futures 反推 convenience yield
- [ ] 能用精確式與簡化式計算股票 forward price
- [ ] 能把票息當 dividend，計算債券 forward price
- [ ] 能寫出外匯遠期公式並說明高利率貨幣為何貼水
- [ ] 能列出 cash-and-carry arbitrage 的完整現金流表
- [ ] 能反推隱含現貨價、隱含利率、implied dividend
- [ ] 能說明宣告日、ex-dividend date、登記日、發放日與交割週期的關係
- [ ] 能計算放空成本下的無 arbitrage 區間，並說明 option 為何用 long rate

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab01_forward_pricing.py`](../labs/exercises/lab01_forward_pricing.py)：實作 `future_value`、`present_value`、`pv_dividends`、`forward_price_stock`、`forward_price_simple`、`forward_price_yield`、`forward_price_commodity`、`futures_variation_margin`、`implied_repo_rate`、`implied_dividend_pv`、`cash_and_carry_arbitrage`、`no_arbitrage_band`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab01_forward_pricing.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab01_forward_pricing**（[../labs/](../labs/)）：實作 `forward_price_stock(S, r, t, dividends)`（含精確與簡化版）、商品與外匯遠期、隱含利率／dividend 反推，以及「給定 bid/ask 與借券成本，判斷是否存在現貨持有或反向 arbitrage」的函式。用本章例 2-1、2-4、2-6、2-8、2-11 當測試案例。
