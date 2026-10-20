# 常態與對數常態分配

**學什麼**：年化波動率（volatility）怎麼換算成一天、一週、任意天數的價格變動；股價落在某個區間的機率；以及常態分配（normal distribution）和對數常態分配（lognormal distribution）在什麼情況下差很多。

**對應章節**：[第 6 章 波動率](../lessons/ch06_volatility.md)、[第 23 章 模型與真實世界](../lessons/ch23_models_real_world.md)、[附錄 B 實用數學](../lessons/appB_useful_math.md)

**兩條曲線**：

- **常態**：到期股價 $S_T \sim N(F,\ (S\sigma\sqrt{t})^2)$，平均是遠期價（forward price） $F = Se^{rt}$，標準差（standard deviation）是 $S\sigma\sqrt{t}$。這是第 6 章用來快速估算的版本。
- **對數常態（lognormal）**：$\ln S_T \sim N(\ln S + (r - \sigma^2/2)t,\ \sigma^2 t)$，也是 Black-Scholes 的假設。平均同樣是 $F$。

拖曳圖上的兩條綠色把手（或用滑桿）設定區間，面板會顯示兩種分配下落在區間內、下方、上方的機率。點圖表其他地方會出現十字線，顯示 $P(S_T < x)$。

<div class="nq-tool" data-tool="distribution"><p class="nq-tool-loading">互動工具載入中…</p></div>

## 試試看

**實驗 1：除以 16 的規則。** 把 volatility 設成 16%、S = 100。每日 standard deviation 是多少？一天漲跌超過 2 元大約多常發生？

<details class="answer" markdown="1"><summary>解答</summary>

每日 standard deviation ≈ 16% ÷ 16 = 1%（精確值 $16\%/\sqrt{252} \approx 1.008\%$），也就是約 1 元。漲跌超過 2 元是 2 個 standard deviation 以外，機率約 4.6%，大約每 22 個交易日（一個月）一次。反過來，如果某檔股票每天平均動 1.5%，隱含的年化 volatility 大約是 1.5% × 16 = 24%。

</details>

**實驗 2：短期內兩種分配幾乎一樣。** 回到 S = 100、σ = 25%、30 天、r = 0。「依據」選常態，按 ±1σ。兩種分配落在區間內的機率各是多少？區間 90～110 呢？

<details class="answer" markdown="1"><summary>解答</summary>

常態 ±1σ 區間約 92.83～107.17，常態機率是 68.27%，lognormal 約 68.35%，幾乎一樣。90～110 的機率兩者都約 83.7%～83.8%。$\sigma\sqrt{t}$ 很小（約 7%）時，lognormal 非常接近常態，所以交易員日常用「常態 + 除以 16」心算就夠準。

</details>

**實驗 3：長天期、高波動時差很大。** 把 σ 拉到 80%、天數 365。看兩條曲線的形狀、normal distribution 下「股價 < 0」的機率，再按一次常態 ±1σ。

<details class="answer" markdown="1"><summary>解答</summary>

常態曲線左尾跨過 0，股價為負的機率約 10.6%，這顯然不可能，也是改用 lognormal 的主要理由。lognormal 曲線明顯右偏：眾數約 38、中位數約 72.6，都遠低於平均 100。常態 ±1σ 區間是 20～180，常態機率 68.3%，lognormal 卻約 81.8%。$\sigma\sqrt{t}$ 越大，兩種分配的差異越大（第 6 章、第 23 章）。

</details>

**實驗 4：lognormal 的 ±1σ 不對稱。** σ = 25%、365 天、r = 0。「依據」選 lognormal，按 ±1σ。下界和上界離 100 各多遠？

<details class="answer" markdown="1"><summary>解答</summary>

區間約 75.48～124.45：往下 24.5 元、往上 24.5 元看起來差不多，但中心是中位數 96.92，不是 100。以中位數來看，上漲 +28%、下跌 −22%，因為 lognormal 是「百分比」對稱：$e^{\pm 0.25}$ 是 ×1.284 與 ×0.779。這也是同樣距離的價外（out-of-the-money, OTM）買權（call）通常比 OTM 賣權（put）貴一點的原因之一。

</details>
