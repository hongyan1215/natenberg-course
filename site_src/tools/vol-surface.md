# 波動率曲面編輯器

**學什麼**：一個完整的波動率曲面（volatility surface）由「每個到期的 smile」加上「期限結構」組成。這個工具讓你用手指調 3 個到期的 ATM vol、skew、曲率與期限結構，同時看三張圖：smile、total variance、隱含機率密度。工具會即時檢查**靜態無套利**（蝶式、垂直、日曆），並告訴你是哪一個滑桿造成的。下半部的「標的移動」面板比較 **sticky strike** 與 **sticky delta** 兩種假設下，選擇權價格與 delta 的差別（有效 delta，effective delta）。

**對應講義**：[P3 曲面動態](../prep/p03_surface_dynamics.md)、[P5 曲面參數化與靜態無套利](../prep/p05_surface_no_arbitrage.md)；背景：[第 24 章 波動率偏斜](../lessons/ch24_volatility_skews.md)

**模型設定**：標的（遠期）F = 100、利率 0。每個到期的 smile 是正規化價性上的二次式

$$
\sigma(k)=\sigma_{ATM}+\text{skew}\cdot z+\text{curv}\cdot z^2,\qquad k=\ln(K/F),\quad z=\frac{k}{\sigma_{ATM}\sqrt{T}}
$$

skew 與曲率的單位是「每 1 個標準差的 vol 點」，所以不同到期的參數可以直接比較。期限結構控制：「整體平移」同時加到三個到期的 ATM vol；「期限斜率」對 T1／T2／T3 分別加上 −½、0、+½ 倍。另可在某一個到期的某個履約價加上「標記偏差」（寬約 1.5 個履約價的小凸起或凹陷），模擬手動把一個價位標錯。

<div class="nq-sim" data-sim="vol-surface"><p class="nqs-note">互動模擬載入中…</p></div>

## 三張圖怎麼讀

- **Smile**：橫軸可切換成履約價或 call delta。用 delta 當橫軸時，不同到期的 smile 比較容易放在一起比較（交易員常用「25 delta put」這種說法）。
- **Total variance** $w(k)=\sigma^2(k)\,T$：無日曆套利的條件是「在同一個 $k$，較遠到期的 $w$ 不能比較近的小」，所以三條線不可交叉。注意比的是 $\sigma^2T$，不是 $\sigma$。
- **隱含機率密度**：由 Breeden–Litzenberger 關係 $q(K)=e^{rT}\,\partial^2C/\partial K^2$，用相鄰三個履約價的蝶式價差近似。密度為負＝買進那個蝶式的成本為負，到期最差拿回 0：這就是蝶式套利。

診斷只檢查近月 ±3 個標準差內的履約價（日曆）與各到期 ±4 個標準差（蝶式、垂直）；再外面的報價流動性很差，簡化的二次式也不可靠。

## 引導實驗

**實驗 1：預設曲面。** 按「一般市場」。三個到期的 ATM vol 是 24%、22%、21%，前端比較高。這算不算日曆套利？看摘要表最後一欄。

<details class="answer" markdown="1"><summary>解答</summary>

不算。日曆套利看的是 total variance：ATM 的 $w$ 分別約 0.00473、0.01207、0.02199，隨到期遞增，三條線也沒有交叉，診斷顯示沒有套利。前端 vol 較高（期限結構倒掛）本身完全合法，只要 $\sigma^2T$ 仍然遞增即可。

</details>

**實驗 2：事件前的前端。** 按「事件前（前端 vol 高）」：T1 的 ATM vol 變成 32%。有套利嗎？接著選 T1，慢慢把 ATM vol 往上推，第一個日曆套利旗標在多少時出現？出現在哪個履約價區段？

<details class="answer" markdown="1"><summary>解答</summary>

32% 時沒有套利（T1 的 ATM $w\approx0.0084$，仍小於 T2 的 0.0121）。繼續往上推，大約在 **34.5%** 出現第一個日曆旗標，位置在右翼約 K = 133–135，而不是 ATM。原因：只看 ATM，要到 $22\%\times\sqrt{91/30}\approx38.3\%$ 才會交叉；但 T1 的曲率讓它的翼部 vol 上升得比 T2 快，翼部的 $w$ 先撞上。秒判技巧：先比 ATM 的 $\sigma^2T$，再看翼部（skew／曲率差很多時）會不會先交叉。

</details>

**實驗 3：ATM 的日曆套利。** 按「示範：日曆套利（ATM）」（T1 的 ATM vol = 40%）。旗標列出的區段大約是哪裡？要怎麼用最少的調整消除它？

<details class="answer" markdown="1"><summary>解答</summary>

區段約 K = 90–141，涵蓋 ATM。T1 的 ATM $w=0.40^2\times30/365\approx0.0132$，大於 T2 的 0.0121。消除方法：把 T1 的 ATM vol 降到 34% 左右以下，或提高 T2 的 ATM vol，或把期限斜率往正的方向調（前端降、後端升）。在交易上，這代表可以「賣近月、買遠月」同一履約價的日曆價差，並收到權利金。

</details>

**實驗 4：標錯一個履約價。** 按「示範：蝶式套利（標錯一個履約價）」：T1 在 K = 95 的 vol 被多標了 2 個點。看密度圖哪裡變成紅色。把偏差改成 +1、+0.5，旗標還在嗎？再選 T3，同樣在 95 加偏差，多少就會出現旗標？

<details class="answer" markdown="1"><summary>解答</summary>

+2 時，95 附近（約 94.4–95.8）的密度變負：95 的選擇權被標得太貴，以 95 為中心的蝶式（買 94.5、賣兩口 95、買 95.5）成本變負。T1 大約 **+1** 個 vol 點就會觸發；T3 只要約 **+0.25** 個點。到期越長，vega 越大、密度越平，同樣的 vol 偏差造成的價格扭曲相對越大。若改成負的偏差（凹陷），負密度出現在凹陷的兩側（約 92–93），而不是中心。這是實務上最常見的蝶式套利來源：smile 用平滑參數式畫，個別履約價卻手動調過。

</details>

**實驗 5：翼部太陡。** 按「示範：翼部太陡（垂直套利）」（T1 曲率 1.8）。旗標說什麼？這和蝶式套利有什麼不同？

<details class="answer" markdown="1"><summary>解答</summary>

垂直價差套利，約在 K = 125–131：曲率讓右翼 vol 上升太快，較高履約價的 call 反而比較貴（call 價格必須隨履約價遞減，否則買低履約價、賣高履約價的 call 價差可以收錢）。這時密度在那段仍然為正（價格仍是凸的），所以不會出現蝶式旗標，但價格不再單調。二次式的翼部在 $|z|$ 大時會無限上升，這是簡化參數式的已知缺點；實務模型（如 SVI）會讓翼部的 total variance 對 $k$ 最多線性成長。

</details>

**實驗 6：skew 讓左尾變胖。** 回到「一般市場」，選 T1，看密度圖：實線（有 smile）和虛線（同樣 ATM vol 的對數常態）差在哪裡？

<details class="answer" markdown="1"><summary>解答</summary>

負 skew 讓左尾（低價格）的機率變大、峰的位置稍微往右移、右尾變薄。以 T1 為例，到期時標的低於 90 的風險中立機率約 7.4%，對數常態只有約 6.7%。這就是為什麼價外 put 比較貴：市場對下跌的機率（和下跌時的痛苦）收了比較多的保費。

</details>

**實驗 7：sticky strike vs sticky delta。** 在「標的移動」面板，選 T1、賣權、K = 95，把標的移動設成 −5%。比較兩種假設下的 vol、價格與 delta。

<details class="answer" markdown="1"><summary>解答</summary>

95 put 原本的 vol 約 26.7%、價格約 1.12。標的跌到 95 後：

- **sticky strike**：95 的 vol 仍是 26.7%，價格約 **2.90**；
- **sticky delta**：smile 跟著標的平移，95 變成 ATM，vol 變成 ATM 的 24%，價格約 **2.61**。

兩者差約 −0.29（約 3.3 個 vega）。同一個標的跳動，在不同的 smile 動態假設下，部位損益可以差好幾個 vega。交易員要知道自己的系統用的是哪一種假設，以及市場實際上比較像哪一種（常見說法：慢慢跌比較像 sticky strike，崩跌時 vol 會比兩者都升得更多）。

</details>

**實驗 8：有效 delta。** 承上，把移動設回 0。T1 call K = 100 的 BS delta 和「有效 delta（含 vol 變動）」各是多少？為什麼不同？若改成 95 put 呢？

<details class="answer" markdown="1"><summary>解答</summary>

ATM call：BS delta 約 0.514，sticky delta 下的有效 delta 約 **0.564**。在 sticky delta 假設下，標的上漲時 K = 100 變成價外 call，負 skew 讓它的 vol 上升，所以

$$
\Delta_{\text{有效}}=\Delta_{BS}+\text{vega}\cdot\frac{\partial\sigma}{\partial S}
$$

多出約 +0.05。95 put：BS delta 約 −0.239，有效 delta 約 −0.185（絕對值較小）。用 BS delta 避險、而市場其實比較像 sticky delta 時，你會系統性地避險過多（put）或過少（call）。這是 [P3](../prep/p03_surface_dynamics.md) 的 shadow delta／skew-adjusted delta。

</details>

**實驗 9：誰造成的？** 從「一般市場」開始，先把期限斜率調到 −9，再把 T1 的 ATM vol 推到 36%。診斷面板對兩個旗標各自顯示什麼「觸發」？

<details class="answer" markdown="1"><summary>解答</summary>

期限斜率 −9 時 ATM vol 變成 28.5%、22%、16.5%，T2 → T3 先出現日曆旗標，觸發標示為「期限斜率 → −9.0」。接著把 T1 的 ATM vol 往上推，T1 → T2 的旗標出現時，觸發標示為「T1 ATM vol → …」。每個旗標記住的是「它第一次出現時」你最後動的滑桿；旗標消失後再出現，會重新記錄。旗標下方另外列出和它相關的參數，方便你決定要調哪一個。

</details>

## 對應練習

- 講義：[P3 曲面動態](../prep/p03_surface_dynamics.md)、[P5 曲面參數化與靜態無套利](../prep/p05_surface_no_arbitrage.md)
- 互動工具：[選擇權價格與 Greeks](option-explorer.md)、[模擬造市遊戲](mock-market-making.md)
