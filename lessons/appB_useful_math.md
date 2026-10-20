# 附錄 B　實用數學（Some Useful Math）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：這是本課程的「數學工具箱」——利息怎麼滾、價格區間怎麼用波動率（volatility）算、volatility 怎麼從歷史價格算出來。不用背細節，會用、會解讀就好。

**你只需要先記住這 4 件事**

1. **三種利息：單利 < 月複利 < 連續複利。** 複利越頻繁終值越大，連續複利是上限。例：1,000 元、6%、2 年 → 月複利 1,127.16，連續複利 1,127.50。
2. **volatility 是連續複利報酬率，所以價格區間用指數算。** 例：遠期 80、volatility 25%、3 個月 → 一個標準差（standard deviation）是 0.125，區間 70.60 到 90.65，上漲那邊比較寬。
3. **常態分配（normal distribution）看兩個形狀數字。** 偏態（skewness）大於 0 右尾長、小於 0 左尾長；常態的峰態（kurtosis）是 3（超額 kurtosis 0），超額 kurtosis 大於 0 代表厚尾、極端行情多。
4. **歷史波動率（historical volatility）：先算對數報酬，再算 standard deviation，最後年化。** 通常用樣本、零均值；年化是乘上「一年有幾個觀察區間」的平方根（日資料約 × 15.87，也就是 ÷16 的由來）。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| 連續複利終值 | 本金 × e 的（利率 × 時間）次方 |
| 連續複利利率 | ln（終值 ÷ 本金）÷ 時間 |
| ± n 個 standard deviation 的價格 | 遠期價（forward price） × e 的（± n × volatility × √時間）次方 |
| 到履約價（strike price）要幾個 standard deviation | ln（strike ÷ forward price）÷（volatility × √時間） |
| 年化 volatility | 每期報酬的 standard deviation × √（一年的期數） |

**必做練習（約 20 分鐘）**：A1、B3、B4、B6（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[常態與對數常態分配](https://hongyan1215.github.io/natenberg-course/tools/distribution/)工具，看年化 volatility 怎麼換成價格區間，以及對數常態（lognormal）為什麼上面比較寬。

---

## 本章定位

試算表幾乎都內建本書用到的數學函數，交易員不必背計算細節，但一定要會**解讀**結果。本附錄把三類工具整理在一起：報酬率（單利、複利、連續複利）、normal distribution 與 standard deviation（含 skewness、kurtosis）、以及 volatility 的計算。它是 [ch02](ch02_forward_pricing.md)、[ch06](ch06_volatility.md)、[ch18](ch18_black_scholes.md)、[ch20](ch20_volatility_revisited.md) 的數學後盾。

## 學習目標

1. 能在單利、離散複利、連續複利之間換算終值、現值、利率與期間。
2. 能用 $Fe^{\pm n\sigma\sqrt t}$ 算出 $n$ 個 standard deviation 的價格區間，並算出到達某 strike 需要幾個 standard deviation。
3. 能計算平均數、母體與樣本 standard deviation、常態密度 $n(x)$。
4. 能由第 2、3、4 階動差計算 skewness 與（超額）kurtosis，並解讀其形狀意義。
5. 能用對數報酬計算年化 volatility（四種版本），並說明各版本差異。

## 核心概念

### B.1 報酬率計算

> 💡 **一句話**：單利、複利、連續複利各有終值／現值公式；複利越頻繁終值越大，連續複利是上限。

符號：$r$ 年利率、$t$ 年數、$n$ 每年複利次數、$PV$ 現值、$FV$ 終值。$\ln$ 與 $e^x$ 互為反函數：$\ln(e^x)=e^{\ln x}=x$。

| | 終值 | 現值 | 利率 | 期間 |
|---|---|---|---|---|
| 單利 | $PV(1+rt)$ | $FV/(1+rt)$ | $(FV/PV-1)/t$ | $(FV/PV-1)/r$ |
| 複利 | $PV(1+r/n)^{nt}$ | $FV(1+r/n)^{-nt}$ | $[(FV/PV)^{1/(nt)}-1]\,n$ | $\dfrac{\ln(FV/PV)}{n\ln(1+r/n)}$ |
| 連續 | $PVe^{rt}$ | $FVe^{-rt}$ | $\ln(FV/PV)/t$ | $\ln(FV/PV)/r$ |

*（註：原書複利終值公式的印刷有誤，正確應為 $(1+r/n)^{nt}$。）*

**自創例題。**
- 單利：1,000 元、5%、9 個月 → $FV=1000\times(1+0.05\times0.75)=1037.50$。若 9 個月後拿回 1,050，隱含單利 $=(1.05-1)/0.75=6.667\%$。
- 月複利：1,000 元、6%、2 年 → $1000\times1.005^{24}=1127.16$。反推：$r=[(1.12716)^{1/24}-1]\times12=6.00\%$；$t=\ln(1.12716)/(12\ln1.005)=2.00$ 年。
- 連續複利：1,000 元、6%、2 年 → $1000e^{0.12}=1127.50$（比月複利多 0.34）。若終值 1,127.16，對應連續利率 $\ln(1.12716)/2=5.985\%$。
- 多久變 1.5 倍（6% 連續）：$\ln1.5/0.06=6.76$ 年。

**有效年利率比較：** 6% 連續 → $e^{0.06}-1=6.184\%$；6% 月複利 → $1.005^{12}-1=6.168\%$。複利越頻繁，有效利率越高，但上限就是連續複利。

### B.2 以波動率表示價格區間

> 💡 **一句話**：價格區間 = forward price × e 的 ±n 個 standard deviation 次方；上漲距離比下跌大。

volatility 是**連續複利**的報酬率，因此可用指數與對數做類似計算。$F$ 為 $t$ 年後的 forward price、$\sigma$ 為年化 volatility：

$$
\text{下跌 }n\text{ 個標準差}:\;Fe^{-n\sigma\sqrt t},\qquad
\text{上漲 }n\text{ 個標準差}:\;Fe^{+n\sigma\sqrt t}
$$
$$
\text{到達履約價 }X\text{ 所需標準差數}=\frac{\ln(X/F)}{\sigma\sqrt t}
$$

**自創例題。** $F=80$、$\sigma=25\%$、3 個月：$\sigma\sqrt t=0.125$。

| standard deviation | −2 | −1 | +1 | +2 |
|---|---|---|---|---|
| 價格 | 62.30 | 70.60 | 90.65 | 102.72 |

注意區間不對稱：上漲 1 個 standard deviation +10.65，下跌只 −9.40（lognormal）。
strike 95 距離 $\ln(95/80)/0.125=+1.375$ 個 standard deviation；strike 70 為 $\ln(70/80)/0.125=-1.068$ 個 standard deviation。

### B.3 常態分配與標準差

> 💡 **一句話**：平均數、standard deviation 描述中心和寬度；skewness 看歪向哪邊，超額 kurtosis 看尾巴厚不厚。（skewness、kurtosis 可先跳過）

$$
\mu=\frac1n\sum x_i,\qquad
\sigma_{\text{母體}}=\sqrt{\frac1n\sum(x_i-\mu)^2},\qquad
\sigma_{\text{樣本}}=\sqrt{\frac{1}{n-1}\sum(x_i-\mu)^2}
$$
（樣本 standard deviation 有時記為 $s$。）

**常態密度：**
$$
n(x)=\frac{1}{\sigma\sqrt{2\pi}}e^{-(x-\mu)^2/(2\sigma^2)}
$$
標準常態 $\mu=0$、$\sigma=1$。例：$\mu=4.2$、$\sigma=1.8$ 時 $n(5)=\dfrac{1}{1.8\times2.5066}e^{-0.64/6.48}=0.2008$。

**動差（moments）：** 第 $j$ 階中心動差 $m_j=\frac1n\sum(x_i-\mu)^j$（樣本版本可改除以 $n-1$）。

$$
\text{偏態 Skewness}=\frac{m_3}{m_2\sqrt{m_2}},\qquad
\text{峰態 Kurtosis}=\frac{m_4}{m_2^2},\qquad
\text{超額峰態}=\frac{m_4}{m_2^2}-3
$$

完美常態：skewness 0、kurtosis 3（超額 kurtosis 0）。
- skewness > 0：右尾較長；< 0：左尾較長。
- 超額 kurtosis > 0：峰較尖、尾較厚（極端值較多）；< 0：峰較低、尾較短。

**自創彈珠台式分配（60 顆珠子）：**

| 槽號 $x$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 合計 |
|---|---|---|---|---|---|---|---|---|---|---|
| 次數 | 1 | 3 | 7 | 12 | 15 | 11 | 6 | 3 | 2 | 60 |
| 次數 × 槽號 | 0 | 3 | 14 | 36 | 60 | 55 | 36 | 21 | 16 | 241 |

- $\mu=241/60=4.0167$
- $\sum\text{次數}\times(x-\mu)^2=176.98$
- 母體 σ $=\sqrt{176.98/60}=1.7175$；樣本 σ $=\sqrt{176.98/59}=1.7320$
- $m_2=2.9497$、$m_3=0.7692$、$m_4=24.694$
- skewness $=0.7692/(2.9497\times1.7175)=+0.152$（右尾略長）
- 超額 kurtosis $=24.694/2.9497^2-3=2.838-3=-0.162$（峰略低、尾略短）

### B.4 波動率

> 💡 **一句話**：volatility = 對數報酬的樣本 standard deviation（常假設零均值）× √一年期數；樣本版本一定比母體大。

volatility 通常是**樣本** standard deviation，且常假設**零均值**：

$$
\sigma=\frac{1}{\sqrt t}\sqrt{\frac{1}{n-1}\sum x_i^2},\qquad x_i=\ln\frac{p_i}{p_{i-1}}
$$

$t$ 是兩次觀察之間的年數（日資料 $1/252$ 或 $1/365$；週資料 $7/365$）。除以 $\sqrt t$ 等同乘以「一年有幾個區間」的平方根：$\sqrt{365}=19.10$、$\sqrt{252}=15.87$。

若標的（underlying）是股票，理論上 $x_i$ 應以前一價格的**forward price**為基準；除非利率很高或有股利（dividend），用實際價格差異很小。

**自創週資料例題**（每 7 天觀察一次，$t=7/365$，$\sqrt t=0.13848$）：

| 週 | 價格 | 對數報酬 |
|---|---|---|
| 0 | 42.00 | |
| 1 | 43.10 | +0.025853 |
| 2 | 41.80 | −0.030627 |
| 3 | 42.60 | +0.018958 |
| 4 | 44.00 | +0.032335 |
| 5 | 43.20 | −0.018349 |
| 6 | 44.50 | +0.029649 |
| 7 | 45.10 | +0.013393 |

報酬和 0.071213、均值 0.010173；$\sum(x-\mu)^2=0.0036820$；$\sum x^2=0.0044065$；$n=7$。

| 版本 | 每週 σ | 年化（÷0.13848） |
|---|---|---|
| 母體、實際均值 | 0.022935 | 16.56% |
| 母體、零均值 | 0.025090 | 18.12% |
| 樣本、實際均值 | 0.024772 | 17.89% |
| 樣本、零均值 | 0.027100 | 19.57% |

觀察：樣本估計永遠大於母體估計；本例價格有明顯上漲趨勢（均值大），所以零均值與實際均值差距比一般情況大。

## 交易員視角

- **Optibook 心算**：日 volatility ≈ 年化 ÷ 16（$\sqrt{252}\approx15.9$）。年化 20% → 每日約 1.26%；若一天動了 3%，那是約 2.4 個 standard deviation 的事件。
- **價格區間**：設定限價單或風險情境時，用 $Fe^{\pm n\sigma\sqrt t}$ 而不是 $F(1\pm n\sigma\sqrt t)$，長天期或高波動時差異明顯。
- **利率慣例要一致**：二元樹（binomial tree）（第 19 章）用單利 $1+rt/n$，Black-Scholes 用 $e^{rt}$；混用會產生小但系統性的定價差。
- **kurtosis 提醒**：實際市場報酬常有正的超額 kurtosis（厚尾），常態模型低估極端行情——這是第 21 章「淨合約部位（position）」與第 24 章波動率微笑（volatility smile）的根源。

## 常見誤區

1. **誤解**：6% 單利、6% 月複利、6% 連續複利的終值一樣。→ **正解**：複利越頻繁終值越大，連續複利為上限。
2. **誤解**：上漲與下跌一個 standard deviation 的價格距離相同。→ **正解**：lognormal 下上漲距離較大（$Fe^{\sigma\sqrt t}-F>F-Fe^{-\sigma\sqrt t}$）。
3. **誤解**：normal distribution 的 kurtosis 是 0。→ **正解**：原始 kurtosis 是 3；「超額 kurtosis」才以 0 為基準。
4. **誤解**：年化 volatility 永遠乘 $\sqrt{252}$。→ **正解**：乘上「一年有幾個觀察區間」的平方根；週資料用 $\sqrt{52}$（或除以 $\sqrt{7/365}$）。

## 重點摘要

| 項目 | 公式 |
|---|---|
| 單利 | $FV=PV(1+rt)$ |
| 複利 | $FV=PV(1+r/n)^{nt}$ |
| 連續 | $FV=PVe^{rt}$，$r=\ln(FV/PV)/t$ |
| $n$ 個 standard deviation 區間 | $Fe^{\pm n\sigma\sqrt t}$ |
| 到 strike 的 standard deviation 數 | $\ln(X/F)/(\sigma\sqrt t)$ |
| 樣本 σ | $\sqrt{\sum(x-\mu)^2/(n-1)}$ |
| 常態密度 | $\frac{1}{\sigma\sqrt{2\pi}}e^{-(x-\mu)^2/2\sigma^2}$ |
| skewness | $m_3/m_2^{3/2}$ |
| 超額 kurtosis | $m_4/m_2^2-3$ |
| volatility | $\sqrt{\sum x_i^2/(n-1)}/\sqrt t$，$x_i=\ln(p_i/p_{i-1})$ |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B3、B4、B6）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ 為什麼說 volatility 是一種「連續複利報酬率」？這讓價格區間的計算有什麼特點？

<details><summary>提示</summary>

想想 volatility 是定義在哪一種報酬上（對數報酬），它和 e 的次方有什麼關係？再想 e 的次方會不會變負、上下是否對稱。

</details>

<details><summary>解答</summary>

volatility 定義在對數報酬上，而對數報酬可直接相加、對應 $e^{x}$ 的連續複利成長。因此 $n$ 個 standard deviation 的價格是 $Fe^{\pm n\sigma\sqrt t}$，區間在價格尺度上不對稱（上方較寬），價格永遠不會小於 0。

</details>

**A2.** skewness 為負、超額 kurtosis 為正的報酬分配長什麼樣子？對賣出價外（out-of-the-money, OTM） put 的交易者意味什麼？

<details><summary>解答</summary>

左尾較長（大跌比大漲更極端），且峰尖尾厚（極端事件比常態多）。賣出 OTM put 的人面臨的大跌風險比常態模型估計的更高，應要求更高的權利金（premium）或做好保護。

</details>

**A3.** 為什麼樣本 standard deviation 一定大於母體 standard deviation（同一組資料）？

<details><summary>解答</summary>

兩者分子相同，樣本版本除以較小的 $n-1$，所以結果較大；這是對「有限樣本容易漏掉極端值而低估」的修正。

</details>

**A4.** 為什麼計算股票的 volatility 時，理論上應以前一價格的 forward price 為基準？實務上為何常忽略？

<details><summary>解答</summary>

股價會因持有成本（cost of carry）自然「漂移」到 forward price，這部分不是隨機波動；以遠期為基準才能只衡量隨機部分。但除非利率很高或有 dividend，每期的漂移極小（例如年利率 5% 每日只有約 0.02%），對結果影響可忽略。

</details>

**A5.** 單利、複利、連續複利在什麼情況下差異最大？

<details><summary>解答</summary>

利率越高、期間越長時差異越大，因為利息再生利息的效果會累積。期間很短或利率很低時三者幾乎相同。

</details>

### B. 計算題

**B1.** 2,000 元以 4% 單利存 9 個月，終值是多少？

<details><summary>解答</summary>

$2000\times(1+0.04\times0.75)=2060.00$。

</details>

**B2.** 5,000 元以 6% 季複利存 2 年，終值是多少？

<details><summary>解答</summary>

$5000\times(1+0.06/4)^{8}=5000\times1.015^8=5632.46$。

</details>

**B3.** ⭐ 1,000 元在 1.5 年後變成 1,100 元，連續複利年利率是多少？以 5% 連續複利，資金翻倍需要幾年？

<details><summary>提示</summary>

連續複利利率 = ln（終值 ÷ 本金）÷ 時間；翻倍時間 = ln2 ÷ 利率。

</details>

<details><summary>解答</summary>

$\ln(1.1)/1.5=0.09531/1.5=6.354\%$。翻倍：$\ln2/0.05=13.86$ 年。

</details>

**B4.** ⭐ 期貨（futures） 150、$\sigma=40\%$、1 個月。求 ±1 個 standard deviation 的價格區間，以及 strike 170 距離幾個 standard deviation。

<details><summary>提示</summary>

先算一個 standard deviation = 40% × √(1/12)；區間 = 150 乘 e 的 ± 那個數次方；最後用 ln(170/150) 除以同一個數。

</details>

<details><summary>解答</summary>

$\sigma\sqrt t=0.40\times\sqrt{1/12}=0.11547$。
區間：$150e^{-0.11547}=133.64$ 至 $150e^{0.11547}=168.36$。
strike 170：$\ln(170/150)/0.11547=0.12516/0.11547=1.084$ 個 standard deviation。

</details>

**B5.** 資料 1、2、2、3、7。求平均數、母體與樣本 standard deviation、skewness、超額 kurtosis。

<details><summary>解答</summary>

$\mu=15/5=3$。離差 −2、−1、−1、0、4。
$m_2=(4+1+1+0+16)/5=4.4$；$m_3=(-8-1-1+0+64)/5=10.8$；$m_4=(16+1+1+0+256)/5=54.8$。
母體 σ $=\sqrt{4.4}=2.098$；樣本 σ $=\sqrt{22/4}=2.345$。
skewness $=10.8/4.4^{1.5}=10.8/9.230=1.170$（右尾長，被 7 拉出）。
超額 kurtosis $=54.8/19.36-3=2.831-3=-0.169$。

</details>

**B6.** ⭐ 日收盤 25.0、25.4、24.9、25.3、25.1。以樣本、零均值、252 日計算年化 volatility。

<details><summary>提示</summary>

第一步算 4 個對數報酬 ln（今天 ÷ 昨天）；第二步平方加總後除以 n − 1 = 3 再開根號（零均值，不用扣平均）；第三步乘 √252。

</details>

<details><summary>解答</summary>

報酬：0.015873、−0.019881、0.015937、−0.007937。平方和 $=0.00096420$。
日 σ $=\sqrt{0.00096420/3}=0.017928$；年化 $=0.017928\times15.875=28.46\%$。

</details>

**B7.** $\mu=4.2$、$\sigma=1.8$ 的 normal distribution，在 $x=5$ 的密度是多少？

<details><summary>解答</summary>

$\dfrac{1}{1.8\sqrt{2\pi}}\exp\!\left(-\dfrac{0.8^2}{2\times1.8^2}\right)=0.22163\times e^{-0.09877}=0.22163\times0.90595=0.2008$。

</details>

### C. 交易情境題

**C1.** 你在 Optibook 觀察到某 underlying 年化 volatility 20%。今天它開盤後 1 小時就跌了 2.5%。這異常嗎？你會調整報價（quote）嗎？

<details><summary>解答</summary>

日 σ ≈ $20\%/\sqrt{252}=1.26\%$；若交易日約 6.5 小時，1 小時的 σ ≈ $1.26\%\times\sqrt{1/6.5}=0.49\%$。2.5% 約是 5 個小時 standard deviation——在常態假設下幾乎不可能，代表要嘛有新資訊、要嘛 volatility 已經改變（或分配厚尾）。應：放寬 quote、提高選擇權（option）quote 的 volatility（至少暫時）、減少 quote 數量，並檢查 position 的 gamma／vega 暴露；等確認新的波動水準後再收窄。

</details>

**C2.** 同事用 $F(1\pm\sigma\sqrt t)$ 估計 1 年、volatility 60% 的價格區間，得到 40 到 160（$F=100$）。你如何回應？

<details><summary>解答</summary>

以 lognormal 應為 $100e^{\pm0.6}=54.88$ 至 $182.21$。線性近似在 $\sigma\sqrt t$ 大時誤差很大：低估上方空間、高估下方跌幅（甚至 $\sigma\sqrt t>1$ 時會算出負價格）。做情境分析或設定風險上限時應用指數形式。

</details>

### D. 挑戰題

**D1.** (a) 證明 $\lim_{n\to\infty}(1+r/n)^{nt}=e^{rt}$（可用 $\ln$ 與 $\ln(1+x)\approx x$）。(b) 說明 6% 年利率在單利、月複利、連續複利下 1 年後 1,000 元的終值，並求連續複利下與 6% 月複利等價的連續利率。(c) 連結第 19 章：binomial tree 每期成長 $1+rt/n$，期數趨近無限時等同什麼？

<details><summary>解答</summary>

(a) $\ln(1+r/n)^{nt}=nt\ln(1+r/n)\approx nt\,(r/n-r^2/2n^2)\to rt$，取指數得 $e^{rt}$。
(b) 單利 1060.00；月複利 $1000\times1.005^{12}=1061.68$；連續 $1000e^{0.06}=1061.84$。等價連續利率 $=12\ln1.005=5.985\%$。
(c) $(1+rt/n)^n\to e^{rt}$，所以期數無限時 binomial tree 的折現與 forward price 與 Black-Scholes 的連續複利一致，這也是 binomial tree 價格會收斂到 Black-Scholes 的原因之一。

</details>

## 自我檢核清單

- [ ] 能在三種利率慣例間換算 FV、PV、r、t
- [ ] 能計算 $n$ 個 standard deviation 的價格區間與到 strike 的 standard deviation 數
- [ ] 能手算平均數、母體／樣本 standard deviation
- [ ] 能由動差算 skewness 與超額 kurtosis 並解讀形狀
- [ ] 能用對數報酬計算並正確年化 volatility

## 對應 Lab

<!-- auto-lab-block -->
**自動判分的 Lab（必做）**

- [`labs/exercises/lab01_forward_pricing.py`](../labs/exercises/lab01_forward_pricing.py)：實作 `future_value`、`present_value`、`pv_dividends`、`forward_price_stock`、`forward_price_simple`、`forward_price_yield`、`forward_price_commodity`、`futures_variation_margin`、`implied_repo_rate`、`implied_dividend_pv`、`cash_and_carry_arbitrage`、`no_arbitrage_band`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab01_forward_pricing.py -q`
- [`labs/exercises/lab04_volatility.py`](../labs/exercises/lab04_volatility.py)：實作 `scale_vol`、`annualize_vol`、`one_sd_range`、`atm_vol_from_straddle`、`log_returns`、`lognormal_mean_median`、`prob_above`、`close_to_close_vol`、`parkinson_vol`、`garman_klass_vol`、`rolling_vol`、`vol_cone`
  - 測試：`cd labs && ../.venv/bin/python -m pytest tests/test_lab04_volatility.py -q`

**延伸練習（選做，不在自動測驗內；以下函式名稱只是建議）**

- [`lab01_forward_pricing`](../labs/)：利率慣例換算與 forward price。
- [`lab04_volatility`](../labs/)：volatility 縮放、lognormal 區間、historical volatility 四種版本與動差計算。
