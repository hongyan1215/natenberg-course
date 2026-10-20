# 教練拍肩問

**練什麼**：模擬盤中教練走到你身後拍肩問：「你現在 delta 多少？跌 2%、vol 升 3 點會怎樣？要買還是賣多少股才中性？」畫面給一張部位（position）表（3–6 行選擇權（option）加上標的（underlying），每行口數、delta、gamma、vega、theta），在時間內回答數字或點選答案，然後看一句**示範口述**，練習把 position 用一句話講清楚。

題型：Greeks 加總、漲跌 X% 後的新 delta（$\Delta + \Gamma\,\delta S$）、情境 PnL（$\Delta\,\delta S + \tfrac12\Gamma\,\delta S^2 + \mathcal{V}\,\delta\sigma$）、delta 中性要交易幾股（**正負號很重要**）、哪一行貢獻最多 vega、整體 long 還是 short gamma。結果頁會把**正負號錯誤**（大小對、方向錯，例如該賣卻答買）單獨統計，這是要優先消滅的錯誤。

**對應講義**：[P12 風控紀律與即時口述](../prep/p12_risk_discipline.md)、[P2 高階 Greeks](../prep/p02_higher_order_greeks.md)；心算部分見 [P6](../prep/p06_mental_math.md)。

<div class="nq-drill" data-drill="coach"><p class="nqd-hint">練習載入中…</p></div>

## 怎麼練

- **每天 10 題、每題 20 秒**起步；穩定後降到 10–12 秒，再把「Greeks 顯示」切到「每口」（要自己乘口數 × 乘數 100）。
- 看到示範口述後，**大聲**照自己的數字講一遍：「我目前 short ___ vega，主要在 ___；跌 2% 時 delta 約變 ___。」
- 數字題用螢幕鍵盤作答，± 鍵切換正負；避險（hedge）題「買入輸入正數、賣出輸入負數」。
- 結果頁的「正負號錯誤」只要不是 0，隔天就只勾「Delta 中性 hedge」與「漲跌後新 Delta」兩類練到 0 為止。

## 小技巧

- 先講方向、再講大小：先說「我 long／short delta」，再決定 hedge 是賣還是買（long delta → 賣 underlying）。
- Long gamma：漲了 delta 增加、跌了 delta 減少；short gamma 相反。
- 情境 PnL 三項分開算：delta 項看方向，gamma 項正負跟著 Γ，vega 項看 vol 升降；最後才相加。
- 賣出 option 的那一行，gamma 與 vega 是負的；看到負的口數就先在腦中把那一行的 Γ、vega 翻號。
- 回答時帶單位：股、元／vol 點、元／天。
