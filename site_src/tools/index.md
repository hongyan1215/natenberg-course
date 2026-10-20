# 互動工具

用手指拖拉參數，直接看到概念在動。每個工具都標註了對應章節，建議讀完該章後回來玩一下，再回去做練習。

| 工具 | 學什麼 | 對應章節 |
|---|---|---|
| [選擇權價格與 Greeks](option-explorer.md) | 股價、波動率（volatility）、時間、利率如何改變價格與 delta／gamma／theta／vega | 第 5–7、9、18 章 |
| [策略損益建構器](strategy-builder.md) | 組合任意部位（position），看到期損益、目前理論損益與組合 Greeks | 第 4、10–14、17 章 |
| [動態避險模擬](hedging-simulator.md) | 實現波動率（realized volatility） vs 隱含波動率（implied volatility）如何決定避險（hedge）損益；調整頻率的影響 | 第 8、20 章 |
| [常態與對數常態分配](distribution.md) | volatility 縮放、價格落在區間的機率、兩種分配的差異 | 第 6、23 章、附錄 B |
| [二元樹視覺化](binomial-tree.md) | 風險中立定價、美式提前履約（early exercise）節點 | 第 16、19 章 |

## Optiver 培訓準備用

| 工具 | 練什麼 | 對應講義 |
|---|---|---|
| [心算速練](mental-math.md) | 計時心算：泰勒展開 PnL、新 delta、ATM 近似、volatility 縮放、平價、期望值（expected value, EV） | [P6](../prep/p06_mental_math.md) |
| [套利偵測練習](arbitrage-spotter.md) | 看報價（quote）表，秒判垂直／蝶式（butterfly）／日曆／平價套利（arbitrage）並說出交易 | [P5](../prep/p05_surface_no_arbitrage.md) |
| [教練拍肩問](coach-questions.md) | 看 position 表即時回答 Greeks、hedge 口數、情境 PnL；專抓正負號錯誤 | [P2](../prep/p02_higher_order_greeks.md)、[P12](../prep/p12_risk_discipline.md) |
| [波動率曲面編輯器](vol-surface.md) | 調 ATM／skew／曲率與期限結構，看無 arbitrage 警示與 sticky strike vs sticky delta | [P3](../prep/p03_surface_dynamics.md)、[P5](../prep/p05_surface_no_arbitrage.md) |
| [模擬造市遊戲](mock-market-making.md) | quote、hedge、面對知情交易者與新聞；教練會暫停提問；結束有流程評分與復盤 | [P7](../prep/p07_market_making_basics.md)–[P9](../prep/p09_inventory_skewing.md)、[P13](../prep/p13_mock_trading_playbook.md) |
