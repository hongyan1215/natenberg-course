# 第 1 章　金融合約（Financial Contracts）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：買東西有四種方式——今天談今天交（現貨）、今天談以後交（遠期／期貨（futures））、付一筆訂金換「以後要不要買都可以」（選擇權（option））。本章教你分清楚它們，以及交易所怎麼收錢、算損益、防止有人賴帳。

**你只需要先記住這 5 件事**

1. **遠期／futures：雙方都有義務；option：只有買方有權利。** 所以 option 買方要付一筆不退還的權利金（premium），遠期成交時不用付錢。
2. **買 put 是「合約多頭」，但「市場空頭」。** 合約部位（position）看你買或賣了合約；市場 position 看你希望標的（underlying）漲還是跌。
3. **未平倉量（open interest, OI）：雙開加、雙平減、一開一平不變。** 例：A 向 B 買 10 口（都開倉）→ OI 加 10。
4. **兩種結算（settlement）方式。** 股票型：買方立刻全額付款，平倉前都是「紙上富貴」；futures 型：只繳保證金（margin），損益每天用變動金以現金實現。
5. **margin 不是成本，變動金才是真損益。** 北美期貨選擇權（futures option）是「underlying futures 型、option 股票型」，避險（hedge）了也可能先要掏現金。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 實物 futures 名目價值（notional value） | 交割單位數 × 單價 |
| 指數 futures notional value | 指數點數 × 每點價值 |
| 每日變動金 | （今日價 − 昨日價）× 前一日 position 口數 × 合約乘數 |
| 實物交割淨成本 | 永遠等於當初成交價 × 數量 |

**必做練習（約 20 分鐘）**：A3、B1、B3、B5（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

---

## 本章定位

這是整門課的起點：在談 option 怎麼定價之前，必須先分清楚「現貨、遠期、futures、option」四種交易在**何時談條件、何時付錢、何時交貨**上的差別，以及交易所如何 settlement 與擔保這些合約。本章沒有前置章節；學完後直接銜接 [ch02 遠期定價](ch02_forward_pricing.md)。

> 對應原書：第 1 章〈Financial Contracts〉，含〈Buying and Selling〉〈Notional Value of a Forward Contract〉〈Settlement Procedures〉〈Market Integrity〉。

## 學習目標

讀完本章，你應該能夠：

1. **區分**現貨交易、遠期合約（forward contract）、期貨合約（futures contract）、買權（call）與賣權（put）在權利、義務與現金流時點上的差異。
2. **判斷**一筆交易是開倉（opening）還是平倉（closing），並計算 open interest 的變化。
3. **計算**實物商品與指數型 futures 的 notional value。
4. **逐日計算**股票型結算（stock-type settlement）的已實現／未實現損益，以及期貨型結算（futures-type settlement）的 margin 與每日變動金（variation）。
5. **解釋**為什麼「option 用 stock-type settlement、underlying 用 futures-type settlement」會造成 hedge position 的現金流缺口。
6. **描述**結算所（clearinghouse）、結算會員（clearing firm）與交易員三層擔保體系如何維持市場誠信。

---

## 核心概念

### 1.1 四種取得資產的方式：從一個開店故事說起

> 💡 **一句話**：現貨今天交換、遠期／futures 約好以後交換、option 只給買方「要不要」的權利，所以要付 premium。

**情境（自創）**：阿哲想在一條規劃中的捷運新站出口開一家早午餐店，看中了林老闆名下一間閒置的一樓店面，開價 800 萬元。

**(a) 現貨／即期交易（spot / cash transaction）**
雙方今天談好價格，今天就一手交錢、一手交屋。股票在交易所買賣通常也被視為現貨交易——雖然實務上有幾天的交割期（台股 T+2、美股自 2024 年起 T+1），但時間很短，交易員一般把它當成「立即交換」。

**(b) forward contract**
捷運還要一年才通車，阿哲不想現在就付錢養一間空店。他提議：**價格今天談定，但付款與過戶一年後才進行**。這就是 forward contract——條件現在確定，錢與貨的交換延到未來的到期日（maturity / expiration date）。
因為付款延後，林老闆少賺一年的存款利息，所以他會要求一個高於 800 萬的「一年遠期價格（forward price）」。怎麼算出公平的 forward price，是 [ch02](ch02_forward_pricing.md) 的主題。

forward contract 的典型使用者：
- 未來**需要**原料的買方（例如飲料廠需要持續進糖），想先鎖住買價、避免漲價。
- 未來**會有**貨可賣的賣方（例如稻農在收成前先賣掉稻米），想先鎖住賣價、避免跌價。

**(c) futures contract**
把 forward contract 搬到**有組織的交易所**上交易，就叫 futures。交易所把規格標準化：數量、品質、交割日期與地點、付款方式全部事先訂好，方便大家快速成交；同時**交易所擔保履約（exercise）**——任何一方違約，由交易所負責。
早期的 futures 以農產品、金屬、能源等實物商品為主；後來股價指數、利率、外匯等金融 futures 崛起，目前金融類交易值已遠大於實物商品。

**(d) option 合約（option contract）**
現在阿哲遇到新問題：捷運預算還沒過，整個計畫可能取消。如果取消，他就不開店了。他希望：「一年內再決定要不要以今天談好的 forward price 買下店面；不買也不必賠錢。」
林老闆當然不會免費給他這個彈性——這一年內就算有人出更高價，林老闆也不能賣。所以阿哲另外付一筆**不退還**的錢給林老闆作為補償。雙方談好「forward price + 這筆額外費用」，就成立了一份 option：

| 角色 | 名稱 | 權利／義務 |
|---|---|---|
| 阿哲 | call 買方（buyer of a call） | 有權（非義務）在未來**買進** |
| 林老闆 | call 賣方（seller of a call） | 若阿哲要買，必須賣 |

同樣地，阿哲原本打算賣掉自己老家的房子，有一對夫妻出價。現在他想「一年內再決定要不要賣」。若他付錢給那對夫妻換取這個彈性，他就是**put 買方**（buyer of a put）——有權在未來**賣出**。

**(e) 保險：最熟悉的 option**
房屋火險很像一張 put：屋主有權在房子燒毀時，把房子按保額「賣回」給保險公司（即使房子已不存在，保險公司仍照保額付款）；若房子沒事，屋主不必行使任何權利。對照 option 術語：

| 保險 | option |
|---|---|
| 保費 | premium，賣方無論如何都保留 |
| 保單期間（半年、一年） | expiration date |
| 保額（含自負額） | 履約價（exercise price） |
| 精算師估計出險機率 → 算出公平保費 | 交易員估計價格漲跌機率 → 算出理論價值（theoretical value） |

保險公司希望以高於「公平價值」的價格賣出保單來賺錢；option 交易員也是一樣的邏輯——這是 [ch05](ch05_pricing_models.md) 的核心。

**(f) 衍生性商品（derivatives）與交換（swap）**
forward contract 的價值來自店面的價值；call 的價值來自 forward contract 的價值；put 的價值來自房子的價值。因為它們的價值都「衍生」自某個標的資產（underlying asset），所以統稱**衍生性商品**。
另一種常見衍生品是**交換（swap）**：雙方約定交換現金流，最常見的是「固定利率換浮動利率」的利率交換。交換多半在店頭市場（OTC）客製化交易，本課程與原書一樣聚焦在遠期、futures 與 option。

---

### 1.2 買與賣（Buying and Selling）

> 💡 **一句話**：可以先賣後買；開倉／平倉決定 open interest 怎麼變，而且要分清合約 position 和市場 position。

在日常生活中，我們習慣「先買後賣」。在衍生性商品市場，順序可以顛倒：**先賣後買**一樣合法。獲利只取決於「賣價 − 買價」，與先後順序無關。

```
   先買（開倉）──→ 持有多頭部位（long）──→ 之後賣出（平倉）
   先賣（開倉）──→ 持有空頭部位（short）──→ 之後買回（平倉）
```

- **開倉交易（opening trade）**：建立新 position 的那一筆。
- **平倉交易（closing trade）**：反向沖銷原 position 的那一筆。
- **open interest**：交易所內尚未被平倉的合約總口數。因為每一口都有一個買方與一個賣方，**未平倉的多頭口數必然等於空頭口數**，OI 只算一邊。

**例題 1-1：open interest 追蹤（自創）**

| 序 | 交易 | 買方動作 | 賣方動作 | OI 變化 | OI |
|---|---|---|---|---|---|
| 1 | A 向 B 買 10 口 | A 開倉 | B 開倉 | +10 | 10 |
| 2 | C 向 A 買 6 口 | C 開倉 | A 平倉 | 0 | 10 |
| 3 | B 向 D 買 4 口 | B 平倉 | D 開倉 | 0 | 10 |
| 4 | B 向 C 買 6 口 | B 平倉 | C 平倉 | −6 | 4 |

規則：雙方都開倉 → OI 增加；雙方都平倉 → OI 減少；一開一平 → OI 不變（只是 position 換手）。最後剩下 A 多 4 口、D 空 4 口，OI = 4。

**借方與貸方（debit / credit）**
- 買進通常要付錢 → **借方（debit）**，對應多頭部位（long position）。
- 賣出通常收到錢 → **貸方（credit）**，對應空頭部位（short position）。
之後談到價差交易（同時買賣多個合約）時，**整筆交易若淨付錢就稱為多頭（long）組合，淨收錢就稱空頭（short）組合**。

**合約 position vs. 市場 position**
「多／空」有兩種意思，衍生品裡必須分清：
- **合約 position**：你是買了合約（long）還是賣了合約（short）。
- **市場 position**：你希望 underlying 漲（long market）還是跌（short market）。

買進一張 put，在合約上是 long put，但在市場上是 short market（希望 underlying 下跌）。這兩個概念在 [ch05](ch05_pricing_models.md) 討論 hedge 方向時非常重要。

---

### 1.3 遠期合約的名目價值（Notional Value）

> 💡 **一句話**：notional value 衡量合約規模：實物是數量 × 單價，指數是點數 × 每點價值。

forward contract 成交時**沒有任何現金易手**，所以嚴格來說它「沒有現金價值」；但它有一個**notional value**，用來衡量合約規模。

- **實物商品**：notional value = 交割單位數 × 單價
- **現金結算（cash settlement）的金融 futures**（如股價指數）：notional value = 指數點數 × 每點價值（point value / multiplier）

**例題 1-2（自創）**
(a) 某咖啡豆 futures 每口交割 500 單位，價格 $120／單位：notional value $= 500 \times 120 = \$60{,}000$。
(b) 某股價指數期貨（stock index futures）報 2,150.00 點，每點 $50：notional value $= 2{,}150 \times 50 = \$107{,}500$。

指數為什麼不實物交割？因為要按權重交付指數裡每一檔股票，甚至可能出現零股，完全不實際，所以改用 cash settlement。

**每點價值是交易所設計出來的**：
- 設太大 → 一口風險太高，一般參與者做不起。
- 設太小 → 要交易大量口數才能達到目標曝險，交易成本過高。
（台灣例子：台指期每點 NT\$200，小型台指每點 NT\$50，就是同一指數用不同乘數服務不同規模的交易人。）

---

### 1.4 結算程序（Settlement Procedures）

> 💡 **一句話**：stock-type settlement 全額付款、平倉前都是未實現；futures-type settlement 只繳 margin、每天用變動金實現損益。

settlement 程序 = 交易成交後，金錢與所有權如何轉移。主要有兩種。

#### (1) 股票型結算（stock-type settlement）

買方**立即全額付款**；交易所居中向買方收錢、轉給賣方，同時把股票從賣方轉給買方。
之後價格變動帶來的損益在平倉前都只是**未實現損益（unrealized P&L，紙上富貴 paper profit）**；要真的拿到錢，必須把 position 賣掉，變成**已實現損益（realized P&L）**。

**例題 1-3：stock-type settlement 逐日表（自創）**
假設開倉價即當日收盤價，第 1 天損益為 0；忽略利息。

| 日 | 股價 | 交易 | 現金流 | 持股 | 累計已實現 | 未實現 |
|---|---|---|---|---|---|---|
| 1 | 42 | 買 800 股 | $-42\times800=-33{,}600$ | 800 | 0 | 0 |
| 2 | 45 | 賣 300 股 | $+45\times300=+13{,}500$ | 500 | $(45-42)\times300=+900$ | $(45-42)\times500=+1{,}500$ |
| 3 | 40 | 無 | 0 | 500 | +900 | $(40-42)\times500=-1{,}000$ |
| 4 | 44 | 賣 500 股 | $+44\times500=+22{,}000$ | 0 | $900+(44-42)\times500=+1{,}900$ | 0 |

檢查：現金流總和 $-33{,}600+13{,}500+22{,}000=+1{,}900$，等於最終已實現損益。

#### (2) 期貨型結算（futures-type settlement）＝保證金與變動金結算（margin and variation）

futures 是 forward contract，成交當下**買方不付貨款、賣方也不收貨款**；但雙方都承擔了未來的義務。交易所為防違約，向雙方各收一筆**margin**。margin 的高低取決於 notional value 與可能的價格波動：要高到足以保護交易所，又不能高到扼殺交易。

之後每天依結算價（settlement price）變動，把**變動金（variation）**從虧損方帳戶轉到獲利方帳戶。損益**每天都以現金實現**。

**例題 1-4：futures-type settlement 逐日表（自創）**
合約規格：每口 500 單位，margin 每口 $2,500。忽略利息。

| 日 | 價格 | 交易 | position | margin | 當日變動金 | 累計已實現 |
|---|---|---|---|---|---|---|
| 1 | 120 | 買 6 口 | +6 | $6\times2{,}500=15{,}000$ | 0 | 0 |
| 2 | 123 | 無 | +6 | 15,000 | $(123-120)\times6\times500=+9{,}000$ | +9,000 |
| 3 | 118 | 賣 2 口 | +4 | 10,000 | $(118-123)\times6\times500=-15{,}000$ | −6,000 |
| 4 | 115 | 賣 1 口 | +3 | 7,500 | $(115-118)\times4\times500=-6{,}000$ | −12,000 |
| 5 | 121 | 賣 3 口 | 0 | 0 | $(121-115)\times3\times500=+9{,}000$ | −3,000 |

注意變動金用的是**前一日收盤時的 position**（當天新交易假設在當日 settlement price 成交，不產生當日變動金）。

交叉檢查（逐筆配對）：2 口在 118 平倉 $(118-120)\times2\times500=-2{,}000$；1 口在 115 平倉 $(115-120)\times500=-2{,}500$；3 口在 121 平倉 $(121-120)\times3\times500=+1{,}500$；合計 $-3{,}000$ ✓。

**futures position 的兩種了結方式**
1. **到期前反向沖銷**：做一筆反向交易，最後一次變動金結清，margin 退還。
2. **持有到期**：
   - **實物交割**：賣方交貨，買方支付「到期時的現價」。
   - **cash settlement**：例如指數 futures，最後依到期指數做一次變動金 settlement 即可。
   兩種情況到期後 margin 都會退還。

**例題 1-5：實物交割的「實付價格」（自創）**
接續規格（每口 500 單位），某人在 120 買 1 口並持有到期，到期價格 131。
- 交割時付 $131\times500=\$65{,}500$
- 但持有期間已累計收到變動金 $(131-120)\times500=\$5{,}500$
- 實際淨成本 $65{,}500-5{,}500=\$60{,}000=120\times500$ ✓ ——正好是當初約定的價格。

**margin vs. 變動金：一定要分清**

| | margin | 變動金（variation） |
|---|---|---|
| 性質 | exercise 擔保品，仍屬於交易員 | 價格變動造成的真實損益 |
| 利息 | 理論上仍為交易員賺利息（實務依 clearing member 協議而定） | 貸方可生息、借方失去利息 |
| 不足時 | 不能開新倉 | 可能被迫提早平倉 |

（註：專業交易員在股票 option 交易所的 margin 要求，業界有時叫 haircut。）

所以 futures 交易員不只要準備 margin，還要預留**應付不利變動金的資金**；否則行情短暫不利時，就可能在最糟的時點被迫砍倉。

#### (3) 選擇權用哪一種結算？

- **北美**：所有交易所 option（不論 underlying 是股票、指數、futures 或外匯）都採**stock-type settlement**——買方立即全額付 premium，平倉前損益都是未實現。
  - 股票 option：underlying 與 option 都是股票型，一致。
  - **futures option**：underlying 是 futures 型、option 卻是股票型 → **不一致**。
- **北美以外的多數交易所**：option 與其 underlying 採相同 settlement 方式（underlying 是 futures 型，option 就也是 futures 型）。

**例題 1-6：不一致 settlement 造成的現金缺口（自創）**
某交易員空 4 口原油型 futures（每口 1,000 桶）在 80，並買進 4 口 call hedge。futures 漲到 86：
- futures 端：變動金立即付出 $(86-80)\times4\times1{,}000=\$24{,}000$ 現金。
- option 端：call 從 2.00 漲到 7.50，帳面增值 $(7.50-2.00)\times4\times1{,}000=\$22{,}000$，**但這是未實現的**，不會進帳。
整體 position 幾乎打平，交易員卻必須馬上掏出 $24,000 現金。若不懂兩種 settlement 差異，就可能出現「明明 hedge 了卻周轉不靈」的意外。

本課程後續的 option 例題，除非特別說明，一律採**北美慣例：option 為 stock-type settlement**。

---

### 1.5 市場誠信（Market Integrity）

> 💡 **一句話**：clearinghouse 當所有人的對手方，加上交易員→clearing member→clearinghouse 三層擔保，不怕對手違約。

沒有人願意在對手可能違約的市場交易。交易所的解法：**成交後立刻切斷買賣雙方的直接連結，改由交易所（clearinghouse）同時當每個賣方的買方、每個買方的賣方**。買方違約，交易所保證付款；賣方違約，交易所保證交貨。

```
成交前：        買方 ←───────────→ 賣方

成交後：        買方 ←→ 結算所 ←→ 賣方
              （結算所成為所有人的對手方）
```

**clearinghouse**：可能是交易所的部門，也可能是獨立機構，負責處理並擔保所有交易（美國例子：股票 option 由 OCC，CME 集團商品由 CME Clearing；台灣期交所自身即為 settlement 機構）。

**settlement 流程（自繪）**

```
 1. 買賣雙方（場內或電子平台）談定：合約、數量、價格
           │                         │
 2a. 買方回報給其結算會員     2b. 賣方回報給其結算會員
           │                         │
 3a. 買方結算會員回報結算所   3b. 賣方結算會員回報結算所
           └──────────┬──────────────┘
                結算所比對
         ┌────────────┴─────────────┐
   4. 雙方資料吻合 → 交易正式成立   5. 不吻合 → 退回雙方結算會員，
                                       再退回交易員自行解決
```

**clearing member**
- clearinghouse 由會員 settlement 公司組成。clearing member 處理個別交易員的交易，並**保證履行**這些交易產生的財務義務——個別交易員違約，由 clearing member 負責。
- 任何人都必須透過某家 clearing member 才能在交易所交易。
- clearing member 向交易員收 margin，再存入 clearinghouse。clearinghouse 有時允許 clearing member 把旗下所有交易員的 position**合併計算**：同一合約有人多、有人空，可以互抵，因此 clearing member 要繳的 margin 可能低於個別加總。
- clearing member 可視市況要求交易員繳交**高於** clearinghouse 標準的 margin。

**三層擔保**：交易員 → clearing member → clearinghouse。個別交易員或 clearing member 偶有倒閉，但這套體系整體上非常可靠（原書指出美國的 clearinghouse 從未倒閉過）。

---

## 交易員視角

1. **Optibook 的對應**：Optibook 由交易所擔任中央對手方，你看不到對手是誰；也沒有 margin 或每日變動金，但有**部位上限（position limit）**——它扮演的角色與 margin 相似：限制單一參與者能承擔的風險。超過上限的單會被拒絕。
2. **PnL 的「已實現 vs 未實現」**：Optibook 的 `get_pnl()` = 已實現現金 + 以最後成交價評價的持倉。持倉部分正是「未實現損益」，會隨最後成交價跳動——一筆離譜的成交價就能讓你的帳面 PnL 大幅擺動，雖然現金並沒有變。做市（market making）時最好用中價或理論價自行評價（傳入 `valuations`）。
3. **position 永不歸零**：Optibook position 不會到期、不會轉移，唯一出路是反向交易平倉——這就是本章「開倉／平倉」的概念。若你持有兩地掛牌（dual listing）的兩條腿，必須**各自**平倉。
4. **現金流管理**：真實的 futures option 交易，hedge position 若一邊是 futures-type settlement、一邊是 stock-type settlement，即使 delta 中性也可能被追繳變動金。專業交易員會為「最壞情境的變動金」預留資金，而不只看 margin。
5. **notional value 是風險的真正尺度**：margin 只是 notional value 的一小部分（例 1-4：$60,000 名目只收 $2,500），因此 futures 有很高的槓桿。評估 position 大小時要看名目，而不是 margin。

## 常見誤區

1. **誤解**：futures 成交時買方要付整筆貨款。
   **正解**：futures 成交時沒有貨款易手，只繳 margin（擔保品）；損益透過每日變動金實現。
2. **誤解**：margin 就是 futures 的成本或虧損。
   **正解**：margin 仍屬於交易員，平倉後退還；真正的損益是變動金。
3. **誤解**：買了 put 就是「做多」。
   **正解**：合約 position 是 long put，但市場 position 是空頭（希望 underlying 下跌）。要分清合約 position 與市場 position。
4. **誤解**：futures 持有到期實物交割時，買方付的是到期價，所以多付了。
   **正解**：期間收到（或付出）的變動金剛好抵銷差額，總成本仍是原約定價格。
5. **誤解**：只要 position hedge 了，就不會有資金壓力。
   **正解**：若兩邊 settlement 方式不同（如北美 futures option），虧損的一邊要立刻付現，獲利的一邊卻是未實現，可能造成現金缺口。
6. **誤解**：一開一平的交易會讓 open interest 增加。
   **正解**：只有雙方皆開倉才增加，雙方皆平倉才減少；一開一平時 OI 不變。

## 重點摘要

| 主題 | 重點 |
|---|---|
| 現貨 | 今天談、今天交換 |
| 遠期 | 今天談、未來交換；OTC、條件可客製 |
| futures | 交易所掛牌的標準化遠期；交易所擔保 exercise |
| call / put | 買方有權在未來買 / 賣；賣方有義務；premium 賣方保留 |
| 衍生品 | 價值源自 underlying asset；另有交換（swap） |
| 開倉 / 平倉 | 先做的那筆是開倉；反向沖銷為平倉 |
| open interest | 雙開 +，雙平 −，一開一平不變 |
| notional value | 實物：數量×單價；指數：點數×每點價值 |
| stock-type settlement | 全額付款；平倉前損益未實現 |
| futures-type settlement | margin + 每日變動金；損益每日實現 |
| option settlement | 北美全為股票型；北美以外多與 underlying 一致 |
| 市場誠信 | clearinghouse 成為所有人的對手方；交易員→clearing member→clearinghouse 三層擔保 |

**公式速查**

$$\text{變動金}_t = (P_t - P_{t-1}) \times \text{前日部位口數} \times \text{合約乘數}$$

$$\text{實物交割淨成本} = P_T \times Q - (P_T - P_0)\times Q = P_0 \times Q$$

---

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A3、B1、B3、B5）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** 說明 forward contract 與 futures contract 的三項主要差異。

<details><summary>解答</summary>

1. **交易場所**：遠期多在店頭（OTC）雙方直接議定；futures 在有組織的交易所掛牌。
2. **規格**：遠期可客製數量、品質、日期、地點；futures 由交易所標準化。
3. **信用風險與 settlement**：遠期由雙方自行承擔對手違約風險，通常到期才 settlement；futures 由 clearinghouse 擔保，並採 margin 與每日變動金 settlement。

</details>

**A2.** 為什麼 call 的買方要付 premium，而 forward contract 的買方成交時不必付任何錢？

<details><summary>解答</summary>

forward contract 雙方都有義務，權利義務對等，公平的 forward price 已反映持有成本（cost of carry），因此成交時不需付款。option 則把「決定權」只給買方，賣方承擔全部義務並放棄其他機會（例如賣給出價更高的人），所以買方必須支付一筆不退還的 premium 作為補償。

</details>

**A3.** ⭐ 某交易員說：「我 long 了 20 口 put，所以我看多。」指出問題所在。

<details><summary>提示</summary>

想想 put 在 underlying 漲或跌時會增值？再分開「買了合約」和「希望 underlying 往哪走」這兩件事。

</details>

<details><summary>解答</summary>

他混淆了合約 position 與市場 position。Long put 是**合約多頭**（買進了合約），但 put 在 underlying 下跌時增值，所以他的**市場 position 是空頭**，希望 underlying 下跌。

</details>

**A4.** futures 交易所在設定指數 futures 每點價值時，為什麼不能太大也不能太小？

<details><summary>解答</summary>

太大：每口 notional value 過高、風險太大，多數參與者無法交易。太小：要用大量口數才能達到想要的曝險，手續費等交易成本過高。交易所希望 notional value 落在「適合交易」的區間。

</details>

**A5.** margin 與變動金在「利息」上的處理有何不同？

<details><summary>解答</summary>

margin 是擔保品，所有權仍屬交易員，理論上應替交易員生息（實務上利息多寡依 clearing member 與客戶協議）。變動金是真實損益：收到變動金（貸方）可以拿去生息；付出變動金（借方）則失去這筆錢的利息。

</details>

**A6.** 解釋 clearinghouse 如何做到「買方不必擔心賣方違約」。

<details><summary>解答</summary>

成交後買賣雙方的直接連結被切斷，clearinghouse 同時成為賣方的買方與買方的賣方。任何一方違約，clearinghouse 都保證另一方的權益。clearinghouse 再透過 clearing member 收取 margin、由 clearing member 擔保旗下交易員的義務，形成交易員→clearing member→clearinghouse 的三層保護。

</details>

### B. 計算題

**B1.** ⭐ 某黃豆 futures 每口 5,000 英斗（bushel），價格每英斗 $11.80。某指數 futures 報 4,820.50 點，每點 $25。分別計算 notional value。

<details><summary>提示</summary>

黃豆用「英斗數 × 每英斗價格」；指數用「點數 × 每點價值」。

</details>

<details><summary>解答</summary>

- 黃豆：$5{,}000\times11.80=\$59{,}000$
- 指數：$4{,}820.50\times25=\$120{,}512.50$

</details>

**B2.** 依下列交易，計算每天收盤後的累計已實現損益與未實現損益（stock-type settlement，忽略利息）：第 1 天以 $30 買 1,000 股；第 2 天收 $33，賣 400 股；第 3 天收 $29，不交易；第 4 天以 $31 賣出剩餘股數。

<details><summary>解答</summary>

| 日 | 股價 | 持股 | 累計已實現 | 未實現 |
|---|---|---|---|---|
| 1 | 30 | 1,000 | 0 | 0 |
| 2 | 33 | 600 | $(33-30)\times400=+1{,}200$ | $(33-30)\times600=+1{,}800$ |
| 3 | 29 | 600 | +1,200 | $(29-30)\times600=-600$ |
| 4 | 31 | 0 | $1{,}200+(31-30)\times600=+1{,}800$ | 0 |

檢查：$-30{,}000+13{,}200+18{,}600=+1{,}800$ ✓

</details>

**B3.** ⭐ 某 futures 每口 200 單位，margin 每口 $1,800。第 1 天在 55.00 **賣出** 5 口；第 2 天收 56.50 不交易；第 3 天收 53.00 買回 2 口；第 4 天收 54.00 買回 3 口。計算每日變動金、margin 與累計損益。

<details><summary>提示</summary>

short position 記成 −5。每天變動金 =（今日價 − 昨日價）× 前一日 position × 200；margin = 當日收盤後的口數 × 1,800。最後用逐筆配對（賣價 − 買價）驗算。

</details>

<details><summary>解答</summary>

short position 以 −5 計。

| 日 | 價格 | position | margin | 變動金 | 累計 |
|---|---|---|---|---|---|
| 1 | 55.00 | −5 | 9,000 | 0 | 0 |
| 2 | 56.50 | −5 | 9,000 | $(56.5-55)\times(-5)\times200=-1{,}500$ | −1,500 |
| 3 | 53.00 | −3 | 5,400 | $(53-56.5)\times(-5)\times200=+3{,}500$ | +2,000 |
| 4 | 54.00 | 0 | 0 | $(54-53)\times(-3)\times200=-600$ | +1,400 |

逐筆檢查：2 口 $(55-53)\times2\times200=+800$；3 口 $(55-54)\times3\times200=+600$；合計 +1,400 ✓

</details>

**B4.** 某人在 72.40 買進 3 口原物料 futures（每口 1,000 單位）並持有到期，到期價 68.10，實物交割。他交割時要付多少錢？期間累計變動金是多少？實際每單位淨成本是多少？

<details><summary>解答</summary>

- 交割付款：$68.10\times3{,}000=\$204{,}300$
- 累計變動金：$(68.10-72.40)\times3{,}000=-\$12{,}900$（已付出）
- 淨成本：$204{,}300+12{,}900=\$217{,}200$，每單位 $217{,}200/3{,}000=72.40$，等於原成交價。

</details>

**B5.** ⭐ 依下列一天內的交易，計算收盤時 open interest（期初 OI = 0）：(1) 甲買 8 口、乙賣 8 口，皆開倉；(2) 丙買 5 口開倉、甲賣 5 口平倉；(3) 乙買 3 口平倉、丁賣 3 口開倉；(4) 丙賣 2 口平倉、乙買 2 口平倉。

<details><summary>提示</summary>

每一筆先判斷是「雙開」「雙平」還是「一開一平」，再照規則加減 OI；也可以追蹤每個人的 position，最後只算多頭那一邊。

</details>

<details><summary>解答</summary>

- (1) 雙開：OI = 8（甲+8，乙−8）
- (2) 一開一平：OI = 8（甲+3，丙+5）
- (3) 一開一平：OI = 8（乙−5，丁−3）
- (4) 雙平：OI = 6（丙+3，乙−3）

最終多頭：甲 3 + 丙 3 = 6；空頭：乙 3 + 丁 3 = 6。**OI = 6**。

</details>

**B6.** 例題 1-6 的交易員若 futures 再從 86 漲到 90，而 call 從 7.50 漲到 11.20，他當天需付出多少變動金現金？option 的帳面增值是多少（是否進帳）？

<details><summary>解答</summary>

- futures 變動金：$(90-86)\times(-4)\times1{,}000=-\$16{,}000$，須立即付現。
- call 帳面增值：$(11.20-7.50)\times4\times1{,}000=\$14{,}800$，北美為 stock-type settlement，屬未實現，不進帳。

</details>

### C. 交易情境題

**C1.** 你在一家亞洲交易公司，準備在美國交易原油 futures option。你計畫空 futures 並買 call 建立一個近似 delta 中性的 position，名目約 $5,000,000，margin 需求 $400,000。風控只撥給你 $450,000。你會怎麼做？

<details><summary>解答</summary>

風險在於北美 futures option 是 stock-type settlement：若油價急漲，空 futures 端每天都要付變動金現金，而 call 增值卻是未實現的。名目 $5,000,000，油價上漲 5% 就要付出約 $250,000 變動金，$450,000 減去 $400,000 margin 後只剩 $50,000 緩衝，很可能被迫在最差時點砍倉。合理做法：(1) 向風控爭取額外的變動金預備資金，或 (2) 縮小 position 規模，讓「可承受的極端漲幅 × 名目」不超過可用現金，或 (3) 改到 option 與 underlying 同為 futures-type settlement 的交易所交易。

</details>

**C2.** 在 Optibook 上，你的 `get_pnl()` 在一秒內從 +3,200 跳到 −1,100，但你什麼單都沒成交。可能原因是什麼？應如何改善判斷？

<details><summary>解答</summary>

`get_pnl()` 預設用**最後成交價**評價持倉（未實現損益）。若別隊在遠離中價的位置成交一筆（例如流動性差時打穿好幾檔），最後成交價跳動，你的未實現損益就跟著跳，現金其實沒變。改善：傳入 `valuations`，用最佳買賣價中點或自己的理論價評價 position，並把已實現（現金）與未實現分開追蹤。

</details>

### D. 挑戰題

**D1.** 證明：在 futures-type settlement 下，不論中間價格路徑如何、position 如何分批平倉，「所有變動金加總」等於「逐筆配對的 (賣價 − 買價) × 數量 × 乘數」總和。並用例題 1-4 驗證。

<details><summary>解答</summary>

設某一口合約在 $t_0$ 以 $P_{t_0}$ 開倉、在 $t_1$ 以 $P_{t_1}$ 平倉。它對變動金的貢獻為 $\sum_{t=t_0+1}^{t_1}(P_t-P_{t-1})\times m$，這是望遠鏡級數（telescoping sum），等於 $(P_{t_1}-P_{t_0})\times m$，與中間路徑無關。總變動金是每一口合約貢獻的加總，因此等於逐筆配對損益的加總。

驗證（例 1-4）：變動金 $+9{,}000-15{,}000-6{,}000+9{,}000=-3{,}000$；逐筆配對 $-2{,}000-2{,}500+1{,}500=-3{,}000$ ✓。兩者相同，但**時點**不同：變動金逐日實現，因此若計入利息，兩者會有差異——這是 futures 與 forward price 在利率隨機時可能不同的根源之一。

</details>

---

## 自我檢核清單

- [ ] 能不看筆記說出現貨、遠期、futures、option 在「談條件／付款／交貨」時點上的差別
- [ ] 能說明 call、put 的買方與賣方各自的權利與義務
- [ ] 能把保險合約的各項要素對應到 option 術語
- [ ] 能判斷一筆交易對 open interest 的影響
- [ ] 能區分合約 position 與市場 position
- [ ] 能計算實物 futures 與指數 futures 的 notional value
- [ ] 能手算 stock-type settlement 的已實現／未實現損益表
- [ ] 能手算 futures-type settlement 的 margin 與每日變動金表
- [ ] 能解釋北美 futures option 的 settlement 不一致為何造成現金缺口
- [ ] 能畫出 settlement 流程並說明三層擔保

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab01_forward_pricing.py`](../labs/exercises/lab01_forward_pricing.py)：實作 `future_value`、`present_value`、`pv_dividends`、`forward_price_stock`、`forward_price_simple`、`forward_price_yield`、`forward_price_commodity`、`futures_variation_margin`、`implied_repo_rate`、`implied_dividend_pv`、`cash_and_carry_arbitrage`、`no_arbitrage_band`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab01_forward_pricing.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- **lab01_forward_pricing**（[../labs/](../labs/)）：本章的 settlement 表是 Lab 01 的暖身。建議自行寫一個函式，輸入「每日價格、每日交易」序列，輸出股票型與 futures-type settlement 的逐日表（現金流、position、margin、變動金、累計損益），並用例題 1-3、1-4 驗證；之後 Lab 01 的遠期定價與套利（arbitrage）部分對應 [ch02](ch02_forward_pricing.md)。
