# P9　庫存管理與報價偏移（Inventory Management and Quote Skewing）

## ⚡ 懶人包（5 分鐘）

> 時間不多？讀完這一段 + 做下方 ⭐ 必做題就能往下一章走。後面的完整講義當「查字典」用，卡住再回來翻。

**一句話**：造市商（market maker）不想賭方向，但成交會讓你累積庫存（inventory）；本章教你「用報價（quote）本身」把 inventory 推出去——手上貨太多就整組 quote 往下移，讓別人比較想跟你買、比較不想賣給你。

**你只需要先記住這 5 件事**

1. **inventory 風險隨部位（position）平方長大。** position 加倍，變異數變四倍；所以小 position 輕偏、大 position 重偏，接近上限乾脆吃單。
2. **多頭時你心裡的價值比 theo 低（保留價格）。** 保留價格 = theo − inventory × 風險趨避 × 變異數 × 剩餘時間。例：每口偏 0.04、多 10 口 → 中心從 100 移到 99.60。
3. **偏移是風險管理，不是猜方向。** 想加快減倉，要讓「想成交的那一邊」更有吸引力（整組平移），只拉寬不想要的那一邊沒用。偏移的代價是少賺一點 edge。
4. **吃單還是等待，看波動率（volatility）。** 吃單成本確定（半價差 + 手續費）；等待的風險成本跟 volatility 平方成正比。volatility 變三倍 → 風險成本變九倍 → 改吃單。
5. **選擇權（option）要在 vol 空間偏移，並用到期月分開管 gamma 和 vega。** 價格偏移 = vega × vol 偏移；近月主要是 gamma、遠月主要是 vega（10 天的 gamma/vega 比是 90 天的 9 倍）。

**必背卡**

| 要算什麼 | 怎麼算 |
|---|---|
| inventory 損益標準差（standard deviation） | position × 每單位時間 standard deviation × √持有時間 |
| 保留價格 | theo − position × γ × σ² × 剩餘時間（多頭 → 低於 theo） |
| 線性偏移（實務簡化） | −（position ÷ 上限）× 最大偏移；例：上限 100、最大 2 tick、多 60 → 下移 1.2 tick |
| 吃單成本 | 口數 ×（半價差 + 手續費） |
| option 偏移 | 價格偏移 = vega × vol 偏移 |
| 多 gamma、空 vega 怎麼修 | 近月 vol 下偏（偏賣）、遠月 vol 上偏（偏買） |

**必做練習（約 20 分鐘）**：A1、B1、B3、C1（題號旁標 ⭐，每題都有提示）。其他題目都是選做。

**想看圖？** 打開網站的[模擬造市遊戲](https://hongyan1215.github.io/natenberg-course/tools/mock-market-making/)，故意讓 inventory 變大，看偏移 quote 怎麼改變成交方向。

---

## 本章定位

market maker 不挑方向，但成交會替你挑：被打 bid 多了，你就變多頭；被拿 offer 多了，你就變空頭。這些累積下來的**inventory**本身就是風險，而且在 Optibook 上還會撞到部位上限（position limit）、讓你無法雙邊 quote。本章說明如何用 quote 本身來管理 inventory：Avellaneda–Stoikov 的**保留價格（reservation price）**直覺、對稱與非對稱偏移、主動吃單（crossing）與被動等待的成本比較；以及 option 造市（market making）特有的做法：在**volatility 空間**偏移，依 vega 與 gamma inventory 決定哪些到期月、哪些履約價（strike price）要偏買或偏賣。

前置：[P7 造市基礎](p07_market_making_basics.md)、[P8 逆向選擇](p08_adverse_selection.md)；Natenberg [第 9 章](../lessons/ch09_risk_measurement_2.md)（gamma、vega 與到期時間的關係）、[第 21 章](../lessons/ch21_position_analysis.md)（21.6 用 quote 偏移管理風險、風險集中）。後續：[P10 跨市場定價](p10_cross_asset_pricing.md)。

## 學習目標

1. 能估計 inventory position 在一段持有期間的損益 standard deviation，並說明 inventory 風險為何隨 position 平方成長。
2. 能用 $r=s-q\gamma\sigma^2(T-t)$ 計算保留價格，解釋每個參數的方向與單位，並算出 Avellaneda–Stoikov 的最適總價差。
3. 能比較對稱偏移（整組平移）、非對稱偏移（只動一邊）與數量偏移，並用成交率模型估計偏移的「成本」與「減倉速度」。
4. 能用確定等值（certainty equivalent）比較「立即吃單出場」與「掛單等待」，並說明 volatility 變化如何改變結論。
5. 能在 volatility 空間做 inventory 偏移，並把 vol 偏移換算成各 strike 的價格偏移。
6. 能用 gamma/vega 比率選擇偏移的到期月，設計降低多頭 gamma、增加 vega 等組合的 quote 調整。

## 核心概念

### 9.1 庫存風險（Inventory Risk）

> 💡 **一句話**：持有越多、抱越久、市場越晃，inventory 風險越大；position 加倍，變異數變四倍。

**直覺。** 你多 40 口、theo 每分鐘都在動；你還沒賣掉之前，每一個 tick 的變動都乘以 40 落在你身上。market making 的 edge 是一點一點賺的，inventory 的虧損卻可能一次就吃掉一整天。

**公式。** 持有固定 position $q$、持有時間 $\tau$、每單位時間的價格變異數 $\sigma^2$：

$$
\text{SD}(\text{PnL})=\lvert q\rvert\,\sigma\sqrt{\tau},\qquad \text{Var}(\text{PnL})=q^2\sigma^2\tau
$$

**自創例題。** 某商品日波動（價格單位）1.00，一天 6.5 小時。你多 40 口，預計 1 小時內才能出清：

$$
\text{SD}=40\times1.00\times\sqrt{1/6.5}\approx15.7
$$

如果你每次來回只賺 0.05 × 5 口，要 63 次來回才能賺回一個 standard deviation。**變異數隨 $q^2$ 成長**：position 加倍，風險（變異數）變四倍。這就是為什麼「小 position 時不太需要偏移、大 position 時要積極偏移」。

**交易員會怎麼說：**「我多 40，一小時一個 sigma 大約 16，比我今天的 PnL 還大，要開始偏了。」

### 9.2 保留價格：Avellaneda–Stoikov 直覺

> 💡 **一句話**：多頭時「個人價值」低於 theo：保留價格 = theo − position × γ × σ² × 剩餘時間；position、volatility、時間越大偏越多。

**直覺。** 帶著 inventory 的 market maker，對商品的「個人價值」和市場 theo 不同。多頭時你心裡的價值比 theo 低（因為再多買一口會增加你的風險），空頭時比 theo 高。這個「考慮了 inventory 風險的個人價值」叫**保留價格（reservation price）**。Avellaneda 與 Stoikov（2008）在一個簡化模型中導出：

$$
r=s-q\,\gamma\,\sigma^2\,(T-t)
$$

- $s$：中間價或 theo
- $q$：目前 inventory（多為正）
- $\gamma$：風險趨避係數（越大越怕風險）
- $\sigma^2$：每單位時間的價格變異數
- $T-t$：剩餘的持有時間（原模型是到交易時段結束；實務上可理解為「預期需要多久才能出清」）

**單位檢查：** $\gamma$ 的單位是「每單位貨幣」，$\sigma^2(T-t)$ 是「貨幣平方」，乘上口數 $q$ 後得到「每口的貨幣」，正是價格偏移。

**自創例題。** $s=100$、$\sigma=2$（每 $\sqrt{\text{day}}$ 的價格單位）、$T-t=0.5$ 日、$\gamma=0.02$。每口 inventory 的偏移 $\gamma\sigma^2(T-t)=0.02\times4\times0.5=0.04$：

| inventory $q$ | −20 | −10 | 0 | +10 | +20 |
|---|---|---|---|---|---|
| 保留價格 $r$ | 100.80 | 100.40 | 100.00 | 99.60 | 99.20 |

**最適總價差。** 在成交率 $\lambda(\delta)=Ae^{-k\delta}$（$\delta$ 為 quote 離 $r$ 的距離）的假設下，原論文的近似解為：

$$
\delta_a+\delta_b=\gamma\sigma^2(T-t)+\frac{2}{\gamma}\ln\!\left(1+\frac{\gamma}{k}\right)
$$

$k=1.5$ 時：$0.04+\tfrac{2}{0.02}\ln(1+0.02/1.5)=0.04+1.3245=1.3645$，半寬約 0.682。$q=+10$ 時，quote 以 $r=99.60$ 為中心：

- bid $=99.60-0.682=98.92$
- ask $=99.60+0.682=100.28$

相對市場中間價 100：ask 只高 0.28、bid 卻低 1.08。你仍然雙邊 quote，但明顯偏向賣出。

**這個公式的直覺比數字重要：**

1. 偏移量與**inventory**成正比：position 越大，偏越多。
2. 與**volatility 平方**成正比：市場越動盪，同樣的 position 越危險，偏移越積極。
3. 與**剩餘時間**成正比：還要抱越久，越需要偏。
4. 與**風險趨避**成正比：$\gamma$ 是 desk 的選擇，不是市場給的。

> 實務上，很多 market maker 用更簡單的線性規則：$\text{skew}=-\dfrac{q}{Q_{\max}}\times\text{skew}_{\max}$。例：上限 100、最大偏移 2 tick、inventory +60 → 中心下移 1.2 tick。AS 公式告訴你 $\text{skew}_{\max}$ 應該隨 volatility 與持有時間調整。

**交易員會怎麼說：**「我多 10 口，vol 高，我的 reservation 比 mid 低 4 毛；offer 貼近 mid，bid 往下掛。」

### 9.3 對稱偏移 vs 非對稱偏移

> 💡 **一句話**：要加快減倉就讓想成交的那邊更吸引人（整組平移）；代價是少賺一點 edge，等於買保險。

三種常見的偏移方式（以多頭 inventory、想減倉為例）：

| 方式 | 做法 | 優點 | 缺點 |
|---|---|---|---|
| **對稱偏移**（整組平移） | bid 與 ask 一起往下移同樣距離 | 寬度不變；賣出機率上升、買進機率下降 | 賣出時的 edge 變薄（甚至低於 theo） |
| **非對稱偏移**（只動一邊） | 只把 bid 往下（或只把 ask 往下） | 只動你想改變的那一邊 | 只拉寬 bid 不會加快賣出；只改善 ask 會讓寬度變窄 |
| **數量偏移** | 價格不變，bid 縮量、ask 放量 | 不犧牲 edge | 減倉速度取決於別人來不來 |

**自創例題：偏移的成本與減倉速度。** 成交率 $\lambda(\delta)=2e^{-0.4\delta}$（次／分鐘，$\delta$ 以 tick 計），基本半寬 5 tick，theo 正確。

- 不偏移：每邊 $2e^{-2}=0.271$ 次／分；買賣速度相同、inventory 期望不變；每分期望 edge $=2\times0.271\times5=2.71$ tick。
- 對稱下移 3 tick：bid 距離 8、ask 距離 2。
  - 買進 $2e^{-3.2}=0.082$ 次／分，賣出 $2e^{-0.8}=0.899$ 次／分
  - inventory 期望每分鐘減少 $0.899-0.082=0.817$ 口（以每次 1 口計）
  - 每分期望 edge $=0.082\times8+0.899\times2=2.45$ tick

偏移讓你每分鐘少賺約 0.26 tick 的期望 edge，換來每分鐘約 0.82 口的減倉速度。**這就是偏移的價格**：你用一點 edge 買保險。

**交易員會怎麼說：**「我把整組往下推三格，每分鐘大概可以出掉一口，代價是 edge 少一成。」

### 9.4 吃單出場 vs 掛單等待

> 💡 **一句話**：平靜時偏移等待較便宜；行情變快、position 大或懷疑有資訊時，改用吃單。

**兩種出場方式：**

- **主動吃單（crossing）**：用 IOC 打對方的 bid，立即出清。成本確定：每口付半個價差加手續費。
- **被動等待（waiting）**：偏移 quote、等別人來成交。可能還賺到一點 edge，但出清前一直承擔 inventory 風險。

**用確定等值比較。** 把風險換算成成本：若你的風險趨避係數為 $\gamma$，持有期間的 inventory 損益變異數為 $V$，風險成本約為 $\tfrac12\gamma V$。若用被動方式在 $\tau$ 內**線性**把 position 從 $q_0$ 降到 0：

$$
V=\sigma^2\int_0^{\tau}q(t)^2\,dt=\frac{\sigma^2q_0^2\tau}{3}
$$

**自創例題。** 多 50 口；市場半價差 0.05、手續費 0.01；被動出場平均每口能賣在 mid + 0.02；預計 10 分鐘出清；每分鐘價格變異數 $\sigma^2=0.0009$（每分鐘 standard deviation 0.03）；$\gamma=0.5$。

- 吃單成本：$50\times(0.05+0.01)=3.0$
- 等待：風險成本 $\tfrac12\times0.5\times0.0009\times2500\times10/3=1.875$；但每口賺 0.02，共 $1.0$。淨成本 $1.875-1.0=0.875$
- 結論：$0.875<3.0$ → **等待較好**

**行情變快時。** 若 volatility 變成三倍（$\sigma^2$ 變九倍），風險成本 $=1.875\times9=16.875$，淨成本 $15.875\gg3.0$ → **應該吃單**（至少吃掉一大部分）。

**實務規則：**

1. position 超過硬上限或接近上限：先吃單把 position 拉回安全區，剩下的用偏移慢慢出。
2. 行情平靜、你的 edge 厚：偏移等待。
3. 行情變快、或你懷疑有資訊（見 [P8](p08_adverse_selection.md)）：等待的期望值（expected value, EV）還要扣掉「價格持續往不利方向走」的漂移，更偏向吃單。
4. option market making 常用**標的（underlying）或期貨（futures）**吃單出場（例如把 delta 打平），因為它們的價差遠小於 option。

**交易員會怎麼說：**「現在 vol 是早上的三倍，我不等了，先 IOC 打掉一半，剩下的偏著出。」

### 9.5 選擇權：在波動率空間偏移

> 💡 **一句話**：各檔 vega 不同，所以要在 vol 空間偏移：價格偏移 = vega × vol 偏移，整個曲面才會一致地移動。

**為什麼不直接在價格上偏移？** 一個 option 鏈有幾十個 strike、好幾個到期月，各自的 vega 差很多。如果每個 option 都下移 0.10 元：

| option（S=100、σ=20%、3 個月） | vega（每 vol 點） | 0.10 元等於幾個 vol 點 |
|---|---|---|
| 90 put | 0.1085 | 0.92 |
| 100 call | 0.1992 | 0.50 |
| 110 call | 0.1327 | 0.75 |

同樣 0.10 元，在翼部是將近 1 個 vol 點，在 ATM 只有半個——你的 quote 曲面被扭曲，可能在翼部製造出別人可以套利（arbitrage）的不一致。正確做法是**在 vol 空間偏移**：每個 option 的 quote 中心為

$$
\theta_{\text{center}}=\theta+\mathcal V\cdot\Delta\sigma_{\text{skew}}
$$

**自創例題。** 你的 vega inventory +8,000（每 vol 點），上限 10,000，最大偏移 1.0 vol 點 → $\Delta\sigma_{\text{skew}}=-(8000/10000)\times1.0=-0.8$ vol 點。基本寬度 ±0.5 vol 點，tick 0.01（bid 向下、ask 向上取整）：

| option | theo | vega | 價格偏移 | 中心 | bid | ask |
|---|---|---|---|---|---|---|
| 90 put | 0.7124 | 0.1085 | −0.0868 | 0.6256 | 0.57 | 0.68 |
| 100 call | 3.9878 | 0.1992 | −0.1594 | 3.8284 | 3.72 | 3.93 |
| 110 call | 0.9539 | 0.1327 | −0.1061 | 0.8478 | 0.78 | 0.92 |

每檔的價格偏移不同，但都等於 0.8 個 vol 點：你的整個曲面一致地下移，鼓勵市場來買你的 vega。

**也可以只偏移部分。** vega inventory 若集中在某個到期月或某個 strike 區段，只偏移那個區段（例如只偏移 3 個月的 ATM 附近），避免在你沒有風險的地方讓出 edge。這和 Natenberg 第 21 章「風險集中」的觀念一致。

**交易員會怎麼說：**「我 long 8,000 vega，整條 3 月曲線往下偏 0.8 個 vol，主要讓 ATM 被買走。」

### 9.6 Gamma 與 vega 庫存：偏移哪個到期月？

> 💡 **一句話**：近月主要是 gamma、遠月主要是 vega；多 gamma 空 vega 時近月下偏、遠月上偏，讓市場幫你做 calendar。

**關鍵比率。** ATM option（利率 0）的 gamma 與 vega（每 vol 點）比率為

$$
\frac{\Gamma}{\mathcal V}=\frac{100}{S^2\sigma T}
$$

與到期時間 $T$ 成反比：**近月 option 主要是 gamma，遠月主要是 vega。** 以 $S=100$、$\sigma=20\%$、ATM、每口 100 股：

| 到期 | gamma（股／點） | vega（每 vol 點） | gamma／vega | theta（每日） |
|---|---|---|---|---|
| 10 天 | 12.05 | 6.60 | 1.825 | −6.60 |
| 90 天 | 4.01 | 19.79 | 0.203 | −2.20 |

10 天的 gamma/vega 比是 90 天的 9 倍（$90/10$）。

**自創例題：降低多頭 gamma、補空頭 vega。** 你的 position gamma +600（股／點）、vega −1,500（每 vol 點）：近月太多 gamma、整體卻 short vega（典型來源：客戶一直買遠月、賣近月給你）。要讓兩者都歸零，設賣出近月 $x_1$ 口、買進遠月 $x_2$ 口（正為買）：

$$
12.05\,x_1+4.01\,x_2=-600,\qquad 6.60\,x_1+19.79\,x_2=1500
$$

解得 $x_1\approx-84.4$（賣 84 口 10 天 ATM）、$x_2\approx+104.0$（買 104 口 90 天 ATM）。

**用 quote 做到這件事（不吃單）：**

- 近月：vol 空間**下偏**（例如 −0.6 vol 點），offer 變得有吸引力 → 被買走 gamma。
- 遠月：vol 空間**上偏**（例如 +0.6 vol 點），bid 變得有吸引力 → 被賣給你 vega。
- 兩邊分開設偏移量，依各自離目標的距離比例決定；隨著成交逐步縮小偏移。

**反方向的例子：** short gamma、long vega（例如大量賣出近月跨式（straddle）、買進遠月）→ 近月上偏（想買回 gamma）、遠月下偏（想賣出 vega）。

**再看一次 theta：** 近月 ATM 每口 theta −6.60/日，遠月 −2.20/日。賣近月、買遠月同時也讓 theta 從大負轉向較小，這和「降低多頭 gamma」一致（gamma 與 theta 符號相反，見 [第 9 章](../lessons/ch09_risk_measurement_2.md)）。

**交易員會怎麼說：**「我前月 gamma 太長、後月 vega 太短，前月 vol 往下偏、後月往上偏，讓市場幫我做 calendar。」

## 交易員視角

- **培訓的模擬 market making**中，教練常在你 position 變大時拍肩：「你現在多多少？你的 quote 為什麼還在中間？」標準回答：說出 position、說出偏移量與理由（「我多 60，上限 100，整組往下偏兩格」）。
- **Optibook** 上 position limit 是硬限制：滿了那一邊就不能報。最簡單有效的 inventory 管理是 $\text{center}=\theta-k\,q$（見 [P7](p07_market_making_basics.md) 的 quote 迴圈第 5 步），加上 position 越大、該側數量越小；接近上限時用 IOC 把 position 拉回。注意偏移後仍要對齊 tick（bid 向下、ask 向上）。
- **Capstone 模擬器**（[`capstone/README.md`](../capstone/README.md)）的參考策略就包含 inventory skew 與 vega 目標；建議路線第 3 步「管 inventory」正是本章。試著把偏移量改成和 vega inventory 成比例、在 vol 空間偏移，比較 PnL 與 Sharpe。
- **真實 desk 上**，偏移通常由系統依 delta、gamma、vega（常再按到期月與 strike 區段分桶）自動計算，交易員調整的是參數（最大偏移、風險趨避、各桶上限）。新人常被要求解釋：「為什麼這一檔的 quote 比 theo 低？」答案應該連到 inventory，而不是「感覺會跌」。

## 常見誤區

1. **「偏移是在預測方向。」** → 偏移是風險管理：即使你認為 theo 完全正確，inventory 大也要偏。預測方向是傾斜（lean，見 [P8](p08_adverse_selection.md)）。
2. **「只要把不想要的那一邊拉寬就好。」** → 只拉寬 bid 不會讓你更快賣出；要加快減倉，得讓 ask 更有吸引力（對稱偏移或改善 ask）。
3. **「option 每檔都偏同樣的價格。」** → 應在 vol 空間偏移，價格偏移 = vega × vol 偏移。
4. **「position 小時也要積極偏移。」** → 風險隨 $q^2$ 成長，小 position 的偏移成本（少賺的 edge）可能大於風險降低的好處。
5. **「被動等待永遠比吃單便宜。」** → 行情快、position 大、或有資訊時，等待的風險成本會遠超過一次價差。
6. **「用同一種到期月處理 gamma 與 vega。」** → 近月以 gamma 為主、遠月以 vega 為主；要分開調整就要用不同到期月。

## 重點摘要

| 主題 | 公式／規則 | 數字直覺 |
|---|---|---|
| inventory 風險 | $\text{SD}=\lvert q\rvert\sigma\sqrt\tau$ | position 加倍 → 變異數四倍 |
| 保留價格 | $r=s-q\gamma\sigma^2(T-t)$ | 多頭 → $r<s$ |
| AS 總價差 | $\gamma\sigma^2(T-t)+\tfrac2\gamma\ln(1+\gamma/k)$ | 例：0.04 + 1.3245 = 1.3645 |
| 線性偏移 | $-\dfrac{q}{Q_{\max}}\,\text{skew}_{\max}$ | 上限 100、最大 2 tick、多 60 → −1.2 tick |
| 偏移的代價 | 少賺的期望 edge | 例：每分少 0.26 tick，換每分減倉 0.82 口 |
| 被動等待風險成本 | $\tfrac12\gamma\sigma^2q_0^2\tau/3$ | volatility ×3 → 風險成本 ×9 |
| 吃單成本 | $q_0\times$（半價差 + 手續費） | 例：50 × 0.06 = 3.0 |
| vol 空間偏移 | 價格偏移 $=\mathcal V\times\Delta\sigma$ | 翼部價格偏移較小 |
| gamma／vega（ATM） | $100/(S^2\sigma T)$ | 10 天是 90 天的 9 倍 |
| 降多頭 gamma、補 vega | 近月下偏、遠月上偏 | 讓市場幫你做 calendar |

## 練習題

> **怎麼練**：先做 ⭐ 必做題（A1、B1、B3、C1）。卡住就先打開「提示」，還是不會再看解答。其他題目選做，想加深或準備面試時再回來。

### A. 概念題

**A1.** ⭐ 為什麼 inventory 風險（變異數）與 position 的平方成正比？這對「何時開始偏移」有什麼含義？

<details><summary>提示</summary>

先寫出 PnL = position × 價格變動，再想變異數怎麼算（常數乘上隨機變數，變異數要乘常數的平方）。接著比較：position 小時的風險 vs 偏移少賺的 edge。

</details>

<details><summary>解答</summary>

PnL $=q\times$ 價格變動，變異數 $=q^2\sigma^2\tau$。position 小時風險很小，偏移（少賺 edge）不划算；position 變大後風險快速上升，偏移的好處超過成本。所以偏移通常是「小 position 輕偏、大 position 重偏」，甚至在接近上限時改用吃單。

</details>

**A2.** 在 $r=s-q\gamma\sigma^2(T-t)$ 中，若 volatility 加倍，同樣 position 的偏移量變成幾倍？為什麼合理？

<details><summary>解答</summary>

$\sigma^2$ 變 4 倍，偏移量變 4 倍。volatility 加倍時，同樣 position 在同樣時間內的損益變異數變 4 倍，風險成本也變 4 倍，所以你更急著出清。

</details>

**A3.** 對稱偏移與「只拉寬不想要的那一邊」有何不同？哪一個能加快減倉？

<details><summary>解答</summary>

對稱偏移把 bid 與 ask 一起往減倉方向移：不想要的那一邊更不容易成交、想要的那一邊更容易成交。只拉寬不想要的一邊只會減少增加 position 的速度，不會加快減倉。要加快減倉，必須讓想要成交的那一邊更有吸引力。

</details>

**A4.** 為什麼 option market making 要在 volatility 空間偏移，而不是每檔都偏同樣的價格？

<details><summary>解答</summary>

各檔 vega 不同，同樣的價格偏移在低 vega 的翼部等於很多 vol 點、在 ATM 等於較少 vol 點，會扭曲你的 quote 曲面、甚至製造可 arbitrage 的不一致（例如蝶式（butterfly）或垂直價差（vertical spread）的價格關係被破壞）。在 vol 空間偏移讓整個曲面一致地移動，價格偏移 = vega × vol 偏移。

</details>

**A5.** 你多頭 gamma、空頭 vega。應該在哪個到期月偏賣、哪個到期月偏買？為什麼？

<details><summary>解答</summary>

近月 gamma/vega 比高，賣近月能大幅降低 gamma、vega 減少較少；遠月 gamma/vega 比低，買遠月能大幅增加 vega、gamma 增加較少。所以近月 vol 下偏（偏賣）、遠月 vol 上偏（偏買）。

</details>

**A6.** 偏移（skew）與傾斜（lean）都會移動 quote 中心。用一句話分別說明兩者的理由。

<details><summary>解答</summary>

偏移：因為我的 inventory 風險太大，即使價值沒變也想減倉。傾斜：因為新的資訊（例如連續同向成交、相關市場移動）讓我認為價值改變了。

</details>

### B. 計算題

**B1.** ⭐ $s=50$、$\sigma=1.5$（每 $\sqrt{\text{day}}$）、$T-t=0.4$ 日、$\gamma=0.1$、inventory $q=+8$。求保留價格。

<details><summary>提示</summary>

直接套保留價格公式：先算 σ² = 1.5²，再算 position × γ × σ² × 剩餘時間，最後從 50 減掉。

</details>

<details><summary>解答</summary>

$r=50-8\times0.1\times2.25\times0.4=50-0.72=49.28$。

</details>

**B2.** 承 B1，$k=2$。用 AS 公式求最適總價差，並寫出 bid 與 ask（以 $r$ 為中心）。

<details><summary>解答</summary>

$\gamma\sigma^2(T-t)=0.1\times2.25\times0.4=0.09$；$\tfrac2\gamma\ln(1+\gamma/k)=20\ln(1.05)=0.9758$。總價差 $=1.0658$，半寬 $0.5329$。
bid $=49.28-0.533=48.75$；ask $=49.28+0.533=49.81$。

</details>

**B3.** ⭐ position limit 50、最大偏移 3 tick（tick 0.01）、目前 inventory −20、theo 10.00、基本半寬 0.10。用線性偏移規則求 quote 中心與取整後的 bid、ask。

<details><summary>提示</summary>

第一步用線性規則：偏移 = −（inventory ÷ 上限）× 最大偏移，注意 inventory 是負的，偏移方向是往上；把 tick 換成價格加到 theo 得到中心。第二步中心 ± 0.10，再取整：bid 向下、ask 向上。

</details>

<details><summary>解答</summary>

偏移 $=-(-20/50)\times3=+1.2$ tick $=+0.012$。中心 10.012；未取整 bid 9.912、ask 10.112；取整（bid 向下、ask 向上）→ **9.91／10.12**。空頭時整組上移，鼓勵別人賣給你。

</details>

**B4.** 成交率 $\lambda(\delta)=3e^{-0.5\delta}$（次／分，$\delta$ 以 tick 計），基本半寬 4 tick，你多頭、整組下移 2 tick。求兩邊成交率、每分鐘期望 inventory 變化（每次 1 口）、每分期望 edge，以及和不偏移相比少賺多少。

<details><summary>解答</summary>

bid 距離 6：$3e^{-3}=0.149$；ask 距離 2：$3e^{-1}=1.104$。
inventory 每分鐘期望變化 $0.149-1.104=-0.954$ 口。
期望 edge $=0.149\times6+1.104\times2=3.103$ tick／分。
不偏移：$2\times3e^{-2}\times4=3.248$ → 少賺 $0.145$ tick／分。

</details>

**B5.** 多 40 口，半價差 0.04、手續費 0.01；被動出場每口平均賣在 mid + 0.01；預計 15 分鐘線性出清；每分鐘價格變異數 0.0004；$\gamma=1$。比較吃單與等待；若 volatility 加倍呢？

<details><summary>解答</summary>

吃單：$40\times0.05=2.0$。
等待風險成本：$\tfrac12\times1\times0.0004\times1600\times15/3=1.6$；被動賺 $40\times0.01=0.4$；淨 $1.2<2.0$ → 等待。
volatility 加倍（變異數 ×4）：風險成本 6.4，淨 $6.0>2.0$ → 吃單。

</details>

**B6.** 你的 vega inventory −6,000（每 vol 點），上限 10,000，最大偏移 1.5 vol 點。某 option theo 6.20、vega 0.25，基本寬度 ±0.4 vol 點。求 vol 偏移、quote 中心與 bid／ask。

<details><summary>解答</summary>

vol 偏移 $=-(-6000/10000)\times1.5=+0.9$ vol 點 → 價格 $+0.9\times0.25=+0.225$；中心 6.425。
寬度 $\pm0.4\times0.25=\pm0.10$ → bid 6.325、ask 6.525（tick 0.01 時取整為 6.32／6.53）。空頭 vega → 上偏，鼓勵別人賣 vega 給你。

</details>

**B7.** position gamma −400（股／點）、vega +2,000（每 vol 點）。可交易 10 天 ATM（每口 gamma 12.05、vega 6.60）與 90 天 ATM（每口 gamma 4.01、vega 19.79）。要讓兩者都歸零，各要買賣幾口？quote 要怎麼偏？

<details><summary>解答</summary>

$12.05x_1+4.01x_2=400$，$6.60x_1+19.79x_2=-2000$ → $x_1\approx+75.2$（買 75 口近月）、$x_2\approx-126.2$（賣 126 口遠月）。
quote：近月 vol 上偏（偏買 gamma）、遠月 vol 下偏（偏賣 vega）。

</details>

**B8.** ATM、$S=100$、$\sigma=20\%$、利率 0。求 10 天與 90 天 option 的 gamma/vega 比，並驗證比值為 9。

<details><summary>解答</summary>

$\Gamma/\mathcal V=100/(S^2\sigma T)$：10 天 $=100/(10000\times0.2\times10/365)=1.825$；90 天 $=0.2028$。比值 $=9.0=90/10$。

</details>

### C. 情境題

**C1.** ⭐ Optibook 上某商品上限 ±100，你多 85，theo 50.00，原本報 49.95／50.05 各 20 口。教練問：「你接下來 30 秒怎麼做？」請示範口述。

<details><summary>提示</summary>

先問自己：離上限還剩多少口？硬限制先處理（用 IOC 吃單拉回安全區），剩下的再用整組下移、bid 縮量、offer 放量慢慢出。

</details>

<details><summary>解答</summary>

「我多 85、離上限只剩 15，風險和容量都不夠了。先用 IOC 在 bid 賣掉 30 口，把 position 拉到 55；剩下的用偏移：整組往下 2 個 tick，報 49.93／50.03，bid 只放 5 口、offer 放 20 口。position 回到 30 以下再把偏移收回來。」重點：先處理硬限制，再用便宜的方法處理剩下的。

</details>

**C2.** 早上你偏移等待出場很順利；午後突然出現新聞，underlying volatility 變成原來的三倍，而你還多 50 口。你會改變什麼？

<details><summary>解答</summary>

風險成本與 $\sigma^2$ 成正比，變成九倍；等待的淨成本可能遠超過一次價差。改為吃單：先 IOC 出清大部分（或用 futures／underlying 避險（hedge）），剩餘 position 用更大的偏移出場；同時拉寬、縮量，避免新成交增加 inventory。口述：「vol 三倍，等待不划算，先打掉 40 口，剩 10 口偏著出，quote 拉寬一倍。」

</details>

**C3.** 你的 option position：前月 gamma 太長、後月 vega 太短，desk 要求你在不付價差（不吃單）的情況下修正。說明你的 quote 調整與如何監控。

<details><summary>解答</summary>

前月整條曲線 vol 下偏（例如 −0.5 vol 點，集中在 ATM 附近 gamma 最大的 strike），後月上偏（例如 +0.5 vol 點，集中在 vega 大的 ATM 附近）。偏移量與各桶離目標的距離成比例，隨成交逐步縮小。監控：每筆成交後重算 gamma 與 vega；檢查偏移後的曲面沒有製造日曆或 butterfly arbitrage（見 [P5](p05_surface_no_arbitrage.md)）；若某一邊遲遲沒有成交，考慮用少量吃單補上。

</details>

### D. 挑戰題

**D1.** (a) 用均值－變異數效用 $U=E[W]-\tfrac12\gamma\text{Var}(W)$，說明為什麼帶 inventory $q$ 的 market maker 對「再買一口」的保留價格是 $r_b\approx s-\gamma\sigma^2\tau\,(q+\tfrac12)$，對「再賣一口」是 $r_a\approx s-\gamma\sigma^2\tau\,(q-\tfrac12)$，兩者的平均就是 $r=s-q\gamma\sigma^2\tau$。(b) 用 9.2 的參數（$\gamma=0.02$、$\sigma^2=4$、$\tau=0.5$）計算 $q=10$ 時的 $r_b$ 與 $r_a$。(c) 說明為什麼即使 theo 完全正確，偏移仍然會讓期望 edge 變少，以及在什麼情況下這個代價值得付。

<details><summary>解答</summary>

(a) 期末財富 $W=x+q S_T$，$S_T$ 期望 $s$、變異數 $\sigma^2\tau$。目前效用 $qs-\tfrac12\gamma q^2\sigma^2\tau$（省略現金 $x$）。以價格 $r_b$ 再買一口後：$(q+1)s-r_b-\tfrac12\gamma(q+1)^2\sigma^2\tau$。令兩者相等：$r_b=s-\tfrac12\gamma\sigma^2\tau[(q+1)^2-q^2]=s-\gamma\sigma^2\tau(q+\tfrac12)$。賣一口同理得 $r_a=s-\gamma\sigma^2\tau(q-\tfrac12)$。平均 $=s-q\gamma\sigma^2\tau$。
(b) $\gamma\sigma^2\tau=0.04$：$r_b=100-0.04\times10.5=99.58$；$r_a=100-0.04\times9.5=99.62$。
(c) theo 正確時，最大化期望 edge 的 quote 是以 theo 為中心；偏移把中心移開，讓一邊的成交機率上升但每筆 edge 變薄、另一邊相反，總期望 edge 下降（如 9.3 例，每分少 0.26 tick）。值得付的情況：inventory 風險成本（$\propto q^2\sigma^2$）高於少賺的 edge——position 大、volatility 高、持有時間長、或接近硬上限（失去 quote 能力本身也有成本）。

</details>

## 自我檢核清單

- [ ] 能估計 inventory position 在持有期間的損益 standard deviation
- [ ] 能計算保留價格並解釋每個參數的方向
- [ ] 能用 AS 公式算總價差並寫出偏移後的 bid／ask
- [ ] 能比較對稱、非對稱與數量偏移，並用成交率模型估計偏移成本
- [ ] 能用確定等值比較吃單與等待，並說明 volatility 變化的影響
- [ ] 能在 vol 空間偏移，並換算成各 strike 的價格偏移
- [ ] 能用 gamma/vega 比率選擇到期月，設計降低 gamma 或補 vega 的 quote 調整

## 對應練習工具

- [模擬造市遊戲](../tools/mock-market-making.md)：觀察 inventory 增加時偏移 quote 對成交方向的影響。
- [波動率曲面編輯器](../tools/vol-surface.md)：練習整條曲線或特定到期月的 vol 偏移。
- [教練拍肩問](../tools/coach-questions.md)：練習「你現在多多少、為什麼報在這裡」的口述。
- Capstone：[`capstone/README.md`](../capstone/README.md)，建議路線第 3、4 步（管 inventory、有觀點）與進階挑戰第 3 題（gamma 管理）。
- 相關 Natenberg 章節：[第 9 章](../lessons/ch09_risk_measurement_2.md)、[第 21 章](../lessons/ch21_position_analysis.md)。
