# 動態避險模擬

**學什麼**：用隱含波動率（implied volatility）買進（或賣出）選擇權（option），再每天用標的（underlying）做 delta 避險（hedge），最後賺賠取決於什麼？答案是**實現波動率（realized volatility） vs implied volatility**。這個工具模擬幾百條股價路徑，讓你看到平均損益如何貼近理論值 $\pm[\,C(\sigma_{\text{實現}}) - C(\sigma_{\text{隱含}})\,]$，以及 hedge 頻率如何影響結果的分散程度。

**對應章節**：[第 8 章 動態避險](../lessons/ch08_dynamic_hedging.md)、[第 20 章 再論波動率](../lessons/ch20_volatility_revisited.md)

**模型設定**：股價依 realized volatility 走幾何布朗運動（每天一步，無漂移、利率 0、無交易成本）。期初以 implied volatility 的 Black-Scholes 價格成交，並建立 delta 中性的股票部位（position）；之後依照你選的頻率重新計算 delta 並調整股數，到期時結算（settlement）。路徑由亂數種子決定，按「重新抽樣」換一組。

<div class="nq-tool" data-tool="hedging-simulator"><p class="nq-tool-loading">互動工具載入中…</p></div>

## 試試看

**實驗 1：沒有優勢就沒有利潤。** 把隱含與 realized volatility 都設成 20%、每天 hedge、500 條路徑。平均損益和標準差（standard deviation）大約多少？再換成每週 hedge。

<details class="answer" markdown="1"><summary>解答</summary>

平均約 0（理論值剛好是 0），每天 hedge 時 standard deviation 約 0.4，每週 hedge 時明顯變大（約 0.9 上下，依抽樣而定）。hedge 頻率**不改變期望值（expected value, EV）**，只改變結果的分散程度：離散 hedge 會產生 hedge 誤差，調整得越少，誤差越大。第 8 章的例子裡，交易者每次調整後的損益會有起伏，原因就在這裡。

</details>

**實驗 2：買進便宜的波動率（volatility）。** 隱含 20%、實現 30%、買進買權（call）、S₀ = K = 100、60 天、每天 hedge。理論期望損益是多少？模擬平均接近它嗎？

<details class="answer" markdown="1"><summary>解答</summary>

理論值 = 30% 下的價值 − 20% 下的價值 ≈ 4.85 − 3.23 ≈ **+1.62**（約等於 vega × 10 個 vol 點）。用 500 條路徑時，模擬平均通常落在 1.5–1.7，standard deviation 約 0.6。即使每天都 hedge，個別路徑仍可能賺多或賺少，但「買到比實際波動便宜的 option，然後 hedge」平均來說會賺到這個差額。

</details>

**實驗 3：完全不調整。** 承上，把頻率改成「不調整」（只在期初 hedge 一次）。平均和 standard deviation 怎麼變？看看路徑圖上灰色虛線（不 hedge）和橘線（hedge 後）的差別。

<details class="answer" markdown="1"><summary>解答</summary>

平均仍然大致是正的，但 standard deviation 暴增到約 3.6，比優勢 1.6 還大，很多路徑反而虧錢。只做一次 hedge，等於大部分時間都在賭方向。動態避險（dynamic hedging）的目的就是把「方向」的運氣移除，只留下「volatility」的優勢，讓理論價值（theoretical value）真的能實現。

</details>

**實驗 4：賣出 option，volatility 卻比預期大。** 改成「賣出」，隱含 20%、實現 30%。結果如何？把 realized volatility 改成 15% 又如何？

<details class="answer" markdown="1"><summary>解答</summary>

實現 30% 時平均約 −1.62，是實驗 2 的鏡像：賣方的 hedge position 是負 gamma，每次調整都是追高殺低。實現 15% 時，理論期望變成正的（約 +0.81），賣方賺到隱含與 realized volatility 之間的差。賣方賺的是時間價值（theta），買方賺的是 gamma；誰贏取決於實際波動有多大。

</details>

**實驗 5：用哪個 volatility 算 delta？** 隱含 20%、實現 30%、買進、每天 hedge。比較「計算 hedge delta 用的 volatility」選實現和選隱含時的平均與 standard deviation。

<details class="answer" markdown="1"><summary>解答</summary>

兩種平均都接近 +1.6，但用**implied volatility**算 delta 時 standard deviation 明顯較大（約 1.0，用 realized volatility 時約 0.6）。用 realized volatility（也就是「正確的」volatility）算 delta 時，最終損益幾乎和路徑無關，鎖定 $C(\sigma_{\text{實現}}) - C(\sigma_{\text{隱含}})$。用 implied volatility 算 delta 時，每天的損益是 $\tfrac12\Gamma S^2(\sigma_{\text{實現}}^2-\sigma_{\text{隱含}}^2)\Delta t$，結果取決於股價在 gamma 大的地方（價平（at-the-money, ATM）附近）待了多久，所以比較分散。第 20 章對這兩種做法有更多討論。

</details>
