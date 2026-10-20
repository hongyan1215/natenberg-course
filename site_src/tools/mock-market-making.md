# 模擬造市遊戲

**學什麼**：在一條小型選擇權（option）鏈上當造市（market making）者（market maker）。你決定報價（quote）的 vol 水準、寬度、偏移與數量，用標的（underlying）避險（hedge） delta，同時守住 delta 與 vega 限額。市場裡有雜訊交易者，也有「知道下一步行情」的知情交易者，他們在消息前後特別活躍。每隔 60–90 秒（遊戲時間），教練會拍你的肩膀問一個關於你當下部位（position）的問題。結束後的復盤把**過程分數**和**損益**分開評：好的過程不保證每局都賺錢，但長期才站得住。

**對應講義**：[P7 造市基礎](../prep/p07_market_making_basics.md)、[P8 逆向選擇](../prep/p08_adverse_selection.md)、[P9 庫存與報價偏移](../prep/p09_inventory_skewing.md)、[P13 模擬交易攻略](../prep/p13_mock_trading_playbook.md)

!!! info "在平板上玩"
    建議橫向使用。按鈕都可以直接點，遊戲時間在你切到別的 App 或分頁時會自動暫停。紀錄存在這台裝置的瀏覽器裡（鍵名 `nq:mm`），換裝置不會同步。

<div class="nq-sim" data-sim="mock-mm"><p class="nqs-note">互動模擬載入中…</p></div>

## 快速上手

1. **選設定、按開始。** 第一次建議「新手、3 分鐘、3 個履約價（strike price）」。
2. **先看市場。** option 鏈的「市場 bid / ask」是其他 market making 者的 quote（小字是對應的隱含 vol）。HUD 上有市場 ATM vol 與過去 30 秒的實現波動率（realized volatility）。
3. **設定 quote。** 預設你的 vol 等於開局時的市場 vol、寬度 ±1.5 vol、每邊 20 口。你的價格比市場好時，該格會有底色，代表你會優先成交。
4. **成交後 hedge。** 看右側的 Delta：正的就賣 underlying、負的就買。「Delta 歸零」一鍵把 delta 調回 0（每股成本 0.01）。
5. **注意事件。** 黃色橫幅是「預告：某數據 20 秒後公布」，紫色是剛發生的新聞或公布結果。消息前後，知情交易者的比例會大幅上升。
6. **教練拍肩時**，遊戲暫停，限時作答；答完按「繼續交易」。
7. **結束後看復盤**，照「下一局的三個具體建議」再玩一局。可以用同一個種子重玩，比較不同做法。

## 畫面與名詞

| 區塊 | 內容 |
|---|---|
| HUD（會黏在頁面上方） | 剩餘時間、underlying 價格、市場 ATM vol、實現 vol、到期天數、目前損益；暫停與 1×／2×／4× 速度 |
| 我的 quote | Vol 模式：寬度與偏移以 vol 點表示；價格模式：以權利金（premium）表示。「對齊市場」把你的 ATM vol 設成目前市場的 ATM vol |
| option 鏈 | 1 個到期（開局 30 個交易日），價外（out-of-the-money, OTM） put 與價平（at-the-money, ATM）／OTM call。每列可單獨開關 quote |
| position 與 Greeks | Delta（股）、Gamma（每 1 點）、Vega（每 1 vol 點）、Theta（每交易日）、underlying position；兩條限額條：70% 變黃、90% 變紅、超過 100% 閃爍 |
| 損益拆解 | 成交優勢、hedge 成本、方向（淨 delta × 價格變動）、Gamma＋Theta、波動率（volatility）（vega × vol 變動） |
| 紀錄 | 你的成交（含當下優勢）、其他人的成交、hedge、事件 |

開局時各商品的大致數值（市場 vol 22% 時；實際每局不同）：

| 商品 | vol | 價格 | delta | gamma | vega | theta／日 |
|---|---|---|---|---|---|---|
| P90 | 24.1% | 0.39 | −0.095 | 0.020 | 0.058 | −0.024 |
| P95 | 23.0% | 1.21 | −0.247 | 0.040 | 0.109 | −0.042 |
| C100 | 22.0% | 3.03 | 0.515 | 0.053 | 0.138 | −0.050 |
| C105 | 21.0% | 1.11 | 0.262 | 0.045 | 0.112 | −0.039 |
| C110 | 20.1% | 0.28 | 0.090 | 0.023 | 0.056 | −0.019 |

## 遊戲規則

- **時間**：遊戲 1 分鐘＝1 個交易日（theta 以每交易日計）。局長 3／5／10 分鐘。
- **部位上限（position limit）**：每個 option ±200 口（超過的那一側 quote 自動不成交），underlying ±2000 股（超過的 hedge 單被拒絕）。
- **風險限額（硬限制）**：

    | 難度 | delta 限額 | vega 限額 | 平時知情流 | 消息前後知情流 | 教練限時 |
    |---|---|---|---|---|---|
    | 新手 | ±250 股 | ±40 | 5% | 30% | 25 秒 |
    | 標準 | ±150 股 | ±25 | 12% | 50% | 20 秒 |
    | 困難 | ±100 股 | ±18 | 22% | 70% | 15 秒 |

    突破限額不會被強制平倉，但每次突破與停留在突破狀態的每一秒都會重扣過程分數。

- **符號錯誤**：一筆 hedge 讓 |delta| 變大，而且結果超過 delta 限額的 20%，就記一次符號錯誤（例如 delta 已經 +40，你又買了 underlying）。
- **教練拍肩**：每 60–90 秒（遊戲時間）一次，最後 15 秒不問。題型包括：目前的 vega、underlying 跌 2% 後的 delta、underlying 動 1% 的損益、vol 變動 2 點的損益、要 hedge 多少、theta，以及情境題（消息前怎麼 quote、被同方向連續成交代表什麼、vega 太多時怎麼偏移、什麼是拉寬價差的好理由）。逾時算答錯。
- **事件**：預告型（數據公布，20 秒前預告；公布前市場 vol 會先墊高，公布時 underlying 跳動、vol 回落）與突發新聞（不預告；underlying 跳 1.5–4%，市場 vol 上升，真實 volatility 也可能改變）。

## 計分：過程分數（滿分 100）

| 項目 | 滿分 | 怎麼算 |
|---|---|---|
| 限額紀律 | 25 | 每突破一次扣 30%，在突破狀態每 60 秒再扣 100% |
| 符號紀律 | 15 | 每次符號錯誤扣一半 |
| 教練問答 | 25 | 答對比例（沒有提問時給一半） |
| 逆向選擇（adverse selection） | 15 | 成交後 30 秒的 markout（以市場 theo 計）每口平均：≥ 0 滿分，≤ −市場半價差 0 分 |
| 平均優勢 | 10 | 每口成交相對市場 theo 的優勢：≥ 市場半價差滿分 |
| 庫存（inventory）管理 | 10 | delta 的半衰期：≤ 10 秒滿分，≥ 120 秒 0 分 |

成交少於 8 筆時，adverse selection 與平均優勢不給分。**損益另外顯示，不進過程分數。** 復盤最後會揭曉這局的隱藏資訊：真實 volatility 怎麼變、你的成交有多少來自知情交易者、他們讓你賠了多少。

## 打法提示

- **先求不犯規，再求賺錢。** 前幾局把目標設成：0 次突破、0 次符號錯誤、教練題全對。
- **寬度是保費。** 平時和市場差不多寬就有成交；消息預告出現後，把寬度拉到市場的 2 倍、數量減半，或乾脆撤單到公布後幾秒。
- **連續被同一邊成交是訊號。** 一直被賣給你（打你的 bid），代表 theo 可能偏高：往下偏移、拉寬，並處理增加的 delta 與 vega。
- **vega 只能靠 quote 消化。** underlying 避得掉 delta，避不掉 vega。vega 太長就整體往下偏移（讓別人來買你的 option），太短就往上偏移。
- **vol 水準要有根據。** 實現 vol 長期高於市場 vol 時，偏向買 option（你的 vol 設高一點）；反之偏向賣。但市場 vol 會慢慢學到真實水準，別一次押太大。
- **價格與 vol 的換算**：價格寬度 ≈ vega × vol 寬度。ATM 的 vega 約 0.14，所以 ±1.5 vol ≈ ±0.21 的 premium。

## 情境題

**1.** 你在 C100 連續被打 bid 三次，共 60 口，underlying 同時在往下走。你的 position 現在大約是什麼？第一件事做什麼？

<details class="answer" markdown="1"><summary>解答</summary>

買進 60 口 C100：delta 約 +31（60 × 0.515）、vega 約 +8.3（60 × 0.138）、gamma 約 +3.2、theta 約 −3.0／日。第一件事是賣出約 30 股 underlying hedge delta（最快、最確定），接著懷疑自己的 theo：連續被賣、underlying 又在跌，很可能是知情賣盤。把 quote 往下偏移、拉寬，讓 vega inventory 自然回到 0 附近。口述範例：「我買了 60 口 C100，delta +31，先賣 30 股；vega +8，quote 往下 lean 0.5 vol。」

</details>

**2.** 復盤顯示：5 秒 markout +0.02／口，30 秒 markout −0.12／口，平均優勢 +0.10／口。這代表什麼？

<details class="answer" markdown="1"><summary>解答</summary>

你在成交當下確實賺到價差（優勢 +0.10），5 秒後也還是正的，但 30 秒後平均反而賠 0.12：成交之後行情系統性地往對你不利的方向走，賺到的價差被吃掉還倒賠。這是典型的 adverse selection，通常集中在消息前後或單邊流的時候。對策是在那些時段拉寬或撤單，並看復盤裡「消息前後成交占比」與「消息前後 30 秒 markout」確認問題出在哪裡。

</details>

**3.** 一局結束，損益 +85，但過程分數只有 48：突破限額 2 次、符號錯誤 1 次。你應該滿意嗎？

<details class="answer" markdown="1"><summary>解答</summary>

不應該。這局的獲利多半來自運氣（例如突破限額時剛好行情往你那邊走），同樣的做法換一個種子很可能大賠。真實交易台和培訓的評估都更重視過程：守限額、不犯符號錯誤、清楚知道自己的 position。用「同一個種子重玩」，以相同的行情試著守住限額，比較兩局的損益拆解：「方向」那一欄通常會從大起大落變成接近 0，「成交優勢」才是穩定的收入來源。

</details>

**4.** 預告「央行利率決議 20 秒後公布」，你目前的報價寬度（quote width） ±1.5 vol、數量 20、position 接近持平。說出你接下來 30 秒的計畫。

<details class="answer" markdown="1"><summary>解答</summary>

示範口述：「消息前知情流會變多、vol 也在墊高。我先把寬度拉到 ±3 vol、數量降到 10；剩 5 秒時全部撤單。公布後先看 underlying 跳多少、確認 delta 並 hedge；等市場 vol 回落、價差穩定幾秒後，再按『對齊市場』重新 quote，寬度先維持寬一點。」重點是：消息前降低被狙擊的機率，消息後先控制方向風險、再更新 theo。

</details>

**5.** 你的 vega 是 −22（標準難度，上限 ±25），delta 接近 0。教練問「現在最該做什麼」，你怎麼回答？

<details class="answer" markdown="1"><summary>解答</summary>

「我太短 vega，接近上限的 88%。underlying 沒辦法避 vega，所以我把 quote 整體往上偏移 0.5–1 vol，讓 bid 變得有吸引力、ask 變貴，讓別人把 option 賣回給我；必要時先關掉會再增加短 vega 的那一側。」也可以補一句：「如果 vol 上升 2 點，我會賠約 44，所以不能等。」

</details>

**6.** 為什麼這個遊戲把「被知情交易者成交」設計成只在消息前後特別嚴重？真實市場也是這樣嗎？

<details class="answer" markdown="1"><summary>解答</summary>

知情交易者的優勢在於資訊比你早。平常的資訊優勢小，價差就足以補償；消息前後，少數人知道（或更快解讀）答案，價差遠不足以補償。真實市場的知情流更分散（有人更快、有人模型更好、有人知道大單要來），但「重大事件前後 adverse selection 最嚴重」是普遍現象，這也是 market making 者在數據公布前拉寬或撤單的原因。延伸閱讀：[P8 逆向選擇](../prep/p08_adverse_selection.md)。

</details>

## 模型細節（給想知道的人）

- underlying 走跳躍擴散：擴散部分的 volatility 是隱藏的「真實 vol」，另有小的隨機跳動，以及事件造成的大跳動。突發新聞可能改變真實 vol。
- 市場 ATM vol 以約 90 秒的時間尺度向真實 vol 靠攏，加上小的隨機變動；預告型事件前會墊高、公布時回落。市場 smile 為 $\sigma(K)=\sigma_{ATM}-0.2\ln(K/S)$（sticky moneyness）。你的 quote 用同樣的 skew 形狀，只是 ATM 水準由你決定。
- 雜訊交易者隨機買賣，願意比市場 theo 多付（或少收）的程度平均約 1.5 個 vol 點；知情交易者看得到 5 秒後的價格與 vol，只在有利可圖時成交。兩者都會找最好的價格，價格相同時和其他 market making 者擲硬幣。
- position 以市場 theo 盯市；markout 也以市場 theo 計算，所以包含少量 theta。
- 同一個種子會產生同樣的行情、事件與訂單流（與你的操作無關），方便重玩比較策略。

## 對應練習

- 講義：[P7 造市基礎](../prep/p07_market_making_basics.md)、[P8 逆向選擇](../prep/p08_adverse_selection.md)、[P9 庫存與報價偏移](../prep/p09_inventory_skewing.md)、[P13 模擬交易攻略](../prep/p13_mock_trading_playbook.md)
- 互動工具：[波動率曲面編輯器](vol-surface.md)、[動態避險模擬](hedging-simulator.md)、[選擇權價格與 Greeks](option-explorer.md)
- 離線版：[結業專題](../capstone.md)（Python market making 模擬器）
