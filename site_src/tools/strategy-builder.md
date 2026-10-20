# 策略損益建構器

**學什麼**：把買權（call）、賣權（put）、標的（underlying）組合成（synthetic）任意部位（position），同時看**到期損益**（折線）與**目前理論損益**（平滑曲線），以及整個 position 的 delta、gamma、theta、vega 與淨權利金（premium）。藉此理解跨式（straddle）、蝶式（butterfly）、比率價差（ratio spread）等策略的風險特性。

**對應章節**：[第 4 章 到期損益](../lessons/ch04_expiration_pnl.md)、[第 10 章 價差交易入門](../lessons/ch10_intro_spreading.md)、[第 11 章 波動率價差](../lessons/ch11_volatility_spreads.md)、[第 12 章 多頭與空頭價差](../lessons/ch12_bull_bear_spreads.md)、[第 13 章 風險考量](../lessons/ch13_risk_considerations.md)、[第 14 章 合成部位](../lessons/ch14_synthetics.md)、[第 17 章 用選擇權避險](../lessons/ch17_hedging_with_options.md)

**操作方式**：點一個策略按鈕快速建立 position；點任一隻腳展開編輯（類型、數量、履約價（strike price）、成交價都用大顆按鈕調整）。所有選擇權（option）同一個到期日（expiration date），以上方的天數、波動率（volatility）、利率用 Black-Scholes 算理論價（不含股利（dividend））。點或拖曳圖表看十字線數值。

<div class="nq-tool" data-tool="strategy-builder"><p class="nq-tool-loading">互動工具載入中…</p></div>

## 試試看

以下都從預設參數開始：S = 100、σ = 25%、r = 3%、45 天。

**實驗 1：買進 straddle。** 按「買進 straddle」。兩平點在哪裡？組合 Greeks 的正負號各是什麼？

<details class="answer" markdown="1"><summary>解答</summary>

call 約 3.68、put 約 3.31，淨支出約 6.99，所以兩平點約在 $100 \pm 6.99$，也就是 93.01 和 106.99。Delta 約 +0.07（接近中性，略正是因為利率讓 call 稍貴）、gamma 為正、theta 為負（每天約 −0.078）、vega 為正（約 +0.28）。這是典型的「買 volatility」position：行情大動或 volatility 上升都賺，時間流逝則虧。

</details>

**實驗 2：轉換（conversion）為什麼是一條水平線？** 按「轉換」（買 underlying、賣 call、買賣權，同 strike）。到期損益是多少？把利率拉到 0 再看一次。

<details class="answer" markdown="1"><summary>解答</summary>

不管 S 到哪裡，到期損益都約 +0.37。call 減 put 等於合成多頭標的（synthetic long underlying），和實際賣出的 underlying 互相抵銷（第 14 章），所以沒有方向風險。剩下的 0.37 正好是 $K(1 - e^{-rt}) = 100 \times (1 - e^{-0.03 \times 45/365})$，也就是 call put 平價關係裡的利息。這個工具沒有計入買股票的資金成本，所以利息看起來像是賺到的；實務上它要拿來支付融資利息。r = 0 時線就落在 0。

</details>

**實驗 3：butterfly 的最大獲利。** 按「買進 butterfly」（95／100／105 call，1 × −2 × 1）。最大獲利、最大虧損、兩平點各是多少？theta 是正還是負？

<details class="answer" markdown="1"><summary>解答</summary>

淨支出約 1.10，最大虧損就是這筆 premium；最大獲利 = strike 間距 − 成本 ≈ 5 − 1.10 = 3.90，發生在到期 S = 100。兩平點約 96.10 和 103.90。S 在中間時 theta 為正（約 +0.012／天）、gamma 和 vega 為負：butterfly 是「賣 volatility」position，但風險有限。注意今天的理論損益曲線遠比到期線平坦，要等時間過去才賺得到那 3.90。

</details>

**實驗 4：ratio spread 的尾部風險。** 按「ratio spread 1×2」（買 1 口 100 call、賣 2 口 110 call）。圖右邊發生什麼事？delta 是正是負？把 S 拉到 115 再看 delta。

<details class="answer" markdown="1"><summary>解答</summary>

淨支出約 2.27。兩平點約 102.27 與 117.73，S 超過 117.73 後虧損**無上限**（面板顯示「無下限」），因為多賣了一口 call。在 S = 100 時 delta 約 +0.22（溫和看多）；把 S 拉高，delta 會轉成負的。這種 position 的 delta 會隨行情改變正負號，這就是第 11、13 章強調要看 gamma，而不能只看 delta 的原因。

</details>

**實驗 5：鎖定成交價，看時間流逝。** 按「賣出 straddle」，再按「鎖定成交價」。把天數從 45 天調到 30 天（經過 15 天），S 不變，損益多少？再把 S 移到 108 呢？

<details class="answer" markdown="1"><summary>解答</summary>

S 不動時賺約 +1.28：賣方收的是時間價值（time value）（theta 約 +0.078／天，15 天合計比 15 × 0.078 略多，因為 theta 會加速）。但 S 移到 108 時變成虧約 −2.26：負 gamma 讓行情一動就虧，time value 收入抵不過。賣方就是在賭「實現波動率（realized volatility）低於成交時的隱含波動率（implied volatility）」，可以接著到[動態避險模擬](hedging-simulator.md)驗證。

</details>
