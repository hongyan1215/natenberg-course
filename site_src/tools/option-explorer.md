# 選擇權價格與 Greeks

**學什麼**：股價、履約價、時間、波動率、利率與股利，各自怎麼推動選擇權的理論價格，以及 delta、gamma、theta、vega 的形狀為什麼長那樣。切到「期貨選擇權」可以比較 Black-76 和股票版 Black-Scholes 的差別。

**對應章節**：[第 5 章 理論定價模型](../lessons/ch05_pricing_models.md)、[第 6 章 波動率](../lessons/ch06_volatility.md)、[第 7 章 風險衡量 I](../lessons/ch07_risk_measurement_1.md)、[第 9 章 風險衡量 II](../lessons/ch09_risk_measurement_2.md)、[第 18 章 Black-Scholes 模型](../lessons/ch18_black_scholes.md)

**操作方式**：拖滑桿，或按兩側的 −／＋（按住不放會連續調整）。點或拖曳圖表會出現十字線，顯示那個股價下每條曲線的數值；按提示框右上角的 × 關閉。圖上同時畫出目前天數，以及 2 倍、½、¼ 天數的曲線，方便比較時間的影響。

<div class="nq-tool" data-tool="option-explorer"><p class="nq-tool-loading">互動工具載入中…</p></div>

單位：theta 是「每過一個日曆日」價格的變化，vega 是波動率 +1 個百分點，rho 是利率 +1 個百分點（與 Lab 的 `optlib` 相同）。

## 試試看

**實驗 1：波動率加倍。** 先設定 S = K = 100、60 天、r = 3%、q = 0、買權。把 σ 從 20% 拉到 40%，價平買權的價格大約怎麼變？為什麼？

<details class="answer" markdown="1"><summary>解答</summary>

價格從約 3.48 變成約 6.70，**幾乎翻倍**。價平選擇權的價值近似 $0.4 \times S \times \sigma\sqrt{t}$（σ = 20% 時 $0.4 \times 100 \times 0.2 \times \sqrt{60/365} \approx 3.24$，再加上一點利率的效果），對波動率差不多是線性的。所以價平選擇權的 vega 很大，而且在一定範圍內大致固定：波動率加倍，價格約加倍。

</details>

**實驗 2：gamma 隨時間集中。** 圖表切到 **Gamma**，σ = 25%。把天數從 60 天慢慢降到 5 天，看價平附近和 S = 90、110 附近的 gamma 怎麼變。

<details class="answer" markdown="1"><summary>解答</summary>

價平 gamma 從約 0.039（60 天）升到約 0.136（5 天），曲線變得又高又窄；S = 90 或 110 的 gamma 反而從約 0.02–0.03 掉到幾乎 0。快到期時只有價平選擇權的 delta 會劇烈跳動（從接近 0 跳到接近 1），價外或價內的選擇權 delta 已經確定是 0 或 1。這就是第 7、9 章說的「短天期價平選擇權 gamma 風險最大」。

</details>

**實驗 3：時間價值加速流失。** 同樣是價平買權、σ = 25%，看 theta 在 60 天、30 天、10 天、1 天各是多少。

<details class="answer" markdown="1"><summary>解答</summary>

約 −0.038、−0.052、−0.087、−0.265（每日）。剩下的時間越少，每天流失得越快，大致和 $1/\sqrt{t}$ 成比例。價平選擇權的價值 ∝ $\sqrt{t}$，所以最後幾天流失得最兇。把圖表切到 **Theta**，可以看到這個效應只集中在價平附近。

</details>

**實驗 4：時間價值可能是負的。** 切到**賣權**，設 S = 70、K = 100、180 天、σ = 25%、r = 8%。理論價格和內含價值哪個大？再切到「期貨選擇權」，買權 F = 130、K = 100，又是如何？

<details class="answer" markdown="1"><summary>解答</summary>

賣權理論價約 26.33，**低於**內含價值 30，時間價值是負的（面板會用紅字標示）。歐式賣權到期才能拿到 K，深價內時「早點拿到 100 元去賺利息」比剩下的一點選擇性更值錢。期貨買權（Black-76）也一樣：價值約 29.41 < 內含 30，因為權利金立即支付，到期才收到 F − K，要折現。這兩種情況下的**美式**選擇權都可能提前履約，詳見[第 16 章](../lessons/ch16_early_exercise.md)。

</details>

**實驗 5：兩種模型的 delta。** S（或 F）= K = 100、60 天、σ = 25%、r = 3%。比較股票模型和期貨模型下價平買權的 delta。

<details class="answer" markdown="1"><summary>解答</summary>

股票：約 0.540；期貨：約 0.518。股票的遠期價格 $S e^{rt}$ 比 100 高，價平買權其實略為價內，所以 delta 比 0.5 大。期貨本身就是遠期價格，$d_1$ 只含 $\sigma^2 t/2$，而且整體再乘上折現因子 $e^{-rt}$，所以 delta 比較接近 0.5。

</details>
