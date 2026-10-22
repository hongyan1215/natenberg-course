# 選擇權學習體驗改版

## 已確認的問題

- `site_src/index.md` 先列 39 章關卡，再列完整進度，初學者缺少明確第一步。
- `lessons/` 26 份教材共約 14,700 行，單章最高 829 行；既有摘要與練習可保留，但需要導讀與分層閱讀。
- `site_src/javascripts/nq-progress.js` 以頁面開啟紀錄稱為「已讀」，不能代表掌握。
- `tools/build_site.py:convert_lesson` 是所有章節的共同產生入口，可一致插入導讀，不改原網址。
- `nq-common.js` 提供站點相對網址、可降級 localStorage、instant navigation 初始化與資料讀取；沿用可保留原進度。

## 實作與驗證

1. 新增 `site_src/start/` 入門課、術語表與 `assets/learning/course.json`。每章包含 question/goal/intuition/example/misconception/prerequisites/tool。驗證 25 章與附錄齊全、所有網址存在、算例正確。
2. 重寫首頁與 `nq-learning-home.js`，以 `NQ.store.update('nq:learning', ...)` 保存時間偏好。`mastered` 須全題作答、最近答案 >=85%、全部自我檢核完成。驗證新進度、既有進度和無紀錄三種情況。
3. `convert_lesson()` 在 H1 後插入 `.nq-lesson-guide[data-chapter]`，`nq-reader.js` 加入原生 details 分層閱讀、筆記與章節導覽。驗證展開全文、TOC 深連結、勾選和測驗跨頁行為。
4. 新增 `nq-foundations.js` 四部位到期損益實驗；`profit(longCall,S) = max(S−100,0)−5`，其他部位對稱。用獨立算例驗證權利金、正負號、損益兩平點。
5. 進度備份納入筆記與設定；遊戲預設關閉且可自行開啟。保留所有舊 localStorage keys 與網址。修正 ch04 最大損益概括、ch07 避險比例。
6. `python tools/build_site.py`、`mkdocs build --strict`、`node --test` 與 Python 建置測試。實際瀏覽檢查首頁、入門互動、章節、題庫、深色與窄螢幕。

## 範圍

維持 MkDocs、GitHub Pages 和既有課程／工具，不加入帳號或外部資料庫。這次補齊每章導讀與學習流程，完整講義仍保留，並非重新驗證全書每個公式。未經明確指示不自動 commit 或發布（CORE.md）。

## 完成與驗證紀錄

- 三個實作工作項目已整合。新增 8 模組、26 份導讀、新手課與 29 個白話術語；保留 39 章與 821 題。
- 重點閱讀保留 104 題星號題，收合 309 題選做題；完整講義與原有錨點仍可使用。
- 嚴格建置、3 項 Python 建置測試、9 項 Node 測試通過；產出 HTML 的站內連結與資產路徑檢查通過。
- 真實瀏覽器驗證：桌機／390px 手機、學習時間切換、買賣方損益、章節導讀、重點／完整模式、深連結展開、答錯補救、筆記重載保存與深色模式，未記錄 JavaScript 錯誤。
- 程式審查提出的測驗篩選繼承、匯入暫存筆記與 Delta 單位差異皆已修正。
- 使用者於 2026-10-23 明確授權提交並發布到原 GitHub Pages。發布流程為將通過檢查的改版推送至 `main`，由既有 GitHub Actions 建置與部署，網址維持 https://hongyan1215.github.io/natenberg-course/。
