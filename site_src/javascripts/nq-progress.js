/* nq-progress.js — 自我檢核清單勾選記憶、頁面瀏覽紀錄、首頁進度總覽（.nq-dashboard）、匯出／匯入／清除進度。
 * 依賴 nq-common.js（window.NQ）。 */
(function (root) {
  "use strict";
  const NQ = root.NQ;
  if (!NQ) return;
  const P = (NQ.progress = NQ.progress || {});
  const h = (...a) => NQ.h(...a);
  const K = NQ.KEYS;
  const EXPORT_FORMAT = "natenberg-course-progress";

  /* ====================== 純函式（Node 可測） ====================== */

  /** 某頁已勾選的項目數（忽略 "_total"）。 */
  P.checkedCount = function checkedCount(entry) {
    if (!entry) return 0;
    return Object.keys(entry).filter((k) => k !== "_total" && entry[k] === true).length;
  };

  /** 合併兩份進度：作答紀錄同題保留較新的（last 較大，平手取 seen 較大）；勾選取聯集；瀏覽時間取較晚。 */
  P.merge = function merge(cur, inc) {
    const a = cur || {}, b = inc || {};
    const quiz = Object.assign({}, a.quiz);
    for (const [id, r] of Object.entries(b.quiz || {})) {
      if (!r || typeof r !== "object") continue;
      const o = quiz[id];
      if (!o || (r.last || 0) > (o.last || 0) || ((r.last || 0) === (o.last || 0) && (r.seen || 0) > (o.seen || 0))) quiz[id] = r;
    }
    const check = {};
    for (const src of [a.check || {}, b.check || {}]) {
      for (const [page, entry] of Object.entries(src)) {
        if (!entry || typeof entry !== "object") continue;
        const out = (check[page] = check[page] || {});
        for (const [k, v] of Object.entries(entry)) {
          if (k === "_total") out._total = Math.max(out._total || 0, Number(v) || 0);
          else if (v === true) out[k] = true;
        }
      }
    }
    const visited = Object.assign({}, a.visited);
    for (const [page, t] of Object.entries(b.visited || {})) {
      if (typeof t === "number" && t > (visited[page] || 0)) visited[page] = t;
    }
    return { quiz, check, visited };
  };

  /** 其他工具的紀錄（模擬考、心算、模擬造市、遊戲化）：原樣匯出；匯入時只補上本機沒有的頂層項目。 */
  P.EXTRA_KEYS = ["nq:exam", "nq:drills", "nq:mm", "nq:game", "nq:learning"];
  P.mergeExtra = function mergeExtra(cur, inc) {
    if (Array.isArray(cur) || Array.isArray(inc)) return cur && (!Array.isArray(cur) || cur.length) ? cur : inc;
    return Object.assign({}, inc || {}, cur || {});
  };

  P.mergeLearning = function mergeLearning(cur, inc) {
    const a = cur || {}, b = inc || {};
    const out = Object.assign({}, b, a);
    for (const key of ["reader", "preferences"]) out[key] = Object.assign({}, b[key], a[key]);
    out.notes = Object.assign({}, a.notes);
    for (const [key, note] of Object.entries(b.notes || {})) {
      if (note && (!out.notes[key] || (note.updatedAt || 0) > (out.notes[key].updatedAt || 0))) out.notes[key] = note;
    }
    out.videos = Object.assign({}, a.videos);
    for (const [key, video] of Object.entries(b.videos || {})) {
      if (!video || typeof video !== "object") continue;
      const current = out.videos[key];
      const latest = !current || (video.updatedAt || 0) > (current.updatedAt || 0) ? video : current;
      out.videos[key] = Object.assign({}, latest, {completed: video.completed === true || !!(current && current.completed === true)});
    }
    return out;
  };

  // 其他工具的值可能是陣列，所以不經過 NQ.store（它只接受物件），直接讀寫 localStorage。
  function rawGet(k) {
    try { const v = JSON.parse(root.localStorage.getItem(k)); return v == null ? null : v; } catch (e) { return null; }
  }
  function rawSet(k, v) {
    try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 無痕模式：略過 */ }
  }

  P.buildExport = function buildExport(stores, now) {
    return {
      format: EXPORT_FORMAT,
      version: 1,
      exportedAt: new Date(now == null ? Date.now() : now).toISOString(),
      data: Object.assign(
        { [K.quiz]: stores.quiz || {}, [K.check]: stores.check || {}, [K.visited]: stores.visited || {} },
        stores.extra || {},
      ),
    };
  };

  /** 解析匯入的 JSON；接受 buildExport 的格式或直接是 {"nq:quiz":…} 物件。格式錯誤時丟出例外。 */
  P.parseImport = function parseImport(obj) {
    if (typeof obj === "string") obj = JSON.parse(obj);
    if (!obj || typeof obj !== "object") throw new Error("檔案內容不是 JSON 物件");
    const d = obj.format === EXPORT_FORMAT && obj.data ? obj.data : obj;
    const pickObj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
    const out = { quiz: pickObj(d[K.quiz]), check: pickObj(d[K.check]), visited: pickObj(d[K.visited]), extra: {} };
    for (const k of P.EXTRA_KEYS) if (d[k] && typeof d[k] === "object") out.extra[k] = d[k];
    if (!(K.quiz in d) && !(K.check in d) && !(K.visited in d)) throw new Error("找不到進度資料（不是本站匯出的檔案？）");
    return out;
  };

  /** 最近瀏覽的章節（依 visited 時間）。 */
  P.continueTarget = function continueTarget(chapters, visited) {
    let best = null, bestT = 0;
    for (const c of chapters || []) {
      const t = (visited || {})[c.url] || 0;
      if (t > bestT) { best = c; bestT = t; }
    }
    return best ? { chapter: best, time: bestT } : null;
  };

  /** 首頁總覽所需的所有數字。 */
  P.summarize = function summarize(chapters, bank, stores) {
    const quiz = stores.quiz || {}, check = stores.check || {}, visited = stores.visited || {};
    const rows = (chapters || []).map((c) => {
      const qs = (bank && bank[c.key]) || [];
      const st = NQ.quizStats(qs, quiz);
      const entry = check[c.url] || {};
      const done = P.checkedCount(entry);
      const total = Number(entry._total) || 0;
      const visitedAt = visited[c.url] || 0;
      return {
        key: c.key, title: c.title, url: c.url, visitedAt, quiz: st,
        checkDone: done, checkTotal: total,
        started: visitedAt > 0 || st.answered > 0 || done > 0,
      };
    });
    const all = NQ.quizStats([].concat(...(chapters || []).map((c) => (bank && bank[c.key]) || [])), quiz);
    return {
      rows,
      chaptersStarted: rows.filter((r) => r.started).length,
      chapterCount: rows.length,
      answered: all.answered,
      totalQuestions: all.total,
      accuracy: all.acc,
      due: all.due,
      current: P.continueTarget(chapters, visited),
    };
  };

  /* ====================== 頁面：瀏覽紀錄與勾選清單 ====================== */

  function trackVisit(path) {
    NQ.store.update(K.visited, (v) => { v[path] = Date.now(); });
  }

  function bindChecklist(path) {
    const inputs = [...root.document.querySelectorAll(".md-content .task-list-control input[type=checkbox]")];
    if (!inputs.length) return;
    const all = NQ.store.get(K.check);
    const entry = all[path] || {};
    inputs.forEach((inp, i) => {
      inp.checked = entry[i] === true;
      if (!NQ.claim(inp, "nqCheck")) return;
      inp.addEventListener("change", () => {
        NQ.store.update(K.check, (s) => {
          const e = (s[path] = s[path] || {});
          if (inp.checked) e[i] = true; else delete e[i];
          e._total = inputs.length;
        });
      });
    });
    if (entry._total !== inputs.length) {
      NQ.store.update(K.check, (s) => { (s[path] = s[path] || {})._total = inputs.length; });
    }
  }

  /* ====================== 首頁總覽 ====================== */

  function fmtDate(t) {
    if (!t) return "";
    try { return new Date(t).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }); }
    catch (e) { return ""; }
  }

  function stat(label, value, sub) {
    return h("div", { class: "nq-stat" },
      h("div", { class: "nq-stat-value" }, value),
      h("div", { class: "nq-stat-label", text: label }),
      sub ? h("div", { class: "nq-stat-sub" }, sub) : null);
  }

  function chapterCard(r, isCurrent) {
    const q = r.quiz;
    const pct = (x, n) => (n ? `${(x / n) * 100}%` : "0%");
    const badge = isCurrent ? h("span", { class: "nq-badge nq-badge-current", text: "繼續學習" })
      : r.visitedAt ? h("span", { class: "nq-badge nq-badge-read", text: `已開啟 ${fmtDate(r.visitedAt)}` })
      : h("span", { class: "nq-badge", text: "尚未開啟" });
    const checkText = r.checkTotal ? `${r.checkDone} / ${r.checkTotal}` : r.checkDone ? `${r.checkDone}` : "—";
    const quizText = q.answered ? `${q.answered} / ${q.total} · 正確率 ${NQ.pct(q.acc)}` : `0 / ${q.total}`;
    return h("a", {
      class: `nq-ch-card${isCurrent ? " is-current" : ""}${r.started ? " is-started" : ""}`,
      href: NQ.url(r.url),
    },
    h("div", { class: "nq-ch-top" }, h("span", { class: "nq-ch-title", text: r.title }), badge),
    h("div", { class: "nq-ch-row" }, h("span", { text: "自我檢核" }), h("span", { class: "nq-ch-num", text: checkText })),
    h("div", { class: "nq-mini", "aria-hidden": "true" },
      h("span", { class: "nq-mini-ok", style: `width:${r.checkTotal ? pct(Math.min(r.checkDone, r.checkTotal), r.checkTotal) : "0%"}` })),
    h("div", { class: "nq-ch-row" }, h("span", { text: "題庫" }), h("span", { class: "nq-ch-num", text: quizText })),
    h("div", {
      class: "nq-mini nq-mini-stack", role: "img",
      "aria-label": `最近一次答對 ${q.ok} 題、答錯 ${q.bad} 題、未作答 ${q.total - q.answered} 題`,
    },
    h("span", { class: "nq-mini-ok", style: `width:${pct(q.ok, q.total)}` }),
    h("span", { class: "nq-mini-bad", style: `width:${pct(q.bad, q.total)}` })),
    q.due ? h("div", { class: "nq-ch-due", text: `待複習 ${q.due} 題` }) : null);
  }

  function readStores() {
    const extra = {};
    for (const k of P.EXTRA_KEYS) {
      const v = k === "nq:learning" ? NQ.store.get(k) : rawGet(k);
      if (v && typeof v === "object") extra[k] = v;
    }
    return { quiz: NQ.store.get(K.quiz), check: NQ.store.get(K.check), visited: NQ.store.get(K.visited), extra };
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = root.document.createElement("a"); // 不放進 DOM，避免被 instant navigation 攔截
    a.href = href;
    a.download = filename;
    a.rel = "noopener";
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 10000);
  }

  function renderDashboard(host, chapters, bank, message) {
    const s = P.summarize(chapters, bank, readStores());
    const quizHref = NQ.url("quiz/#review");

    const summary = h("div", { class: "nq-dash-summary" },
      stat("已開始章節", `${s.chaptersStarted} / ${s.chapterCount}`),
      stat("已作答題數", `${s.answered} / ${s.totalQuestions}`),
      stat("整體正確率", NQ.pct(s.accuracy), s.answered ? "所有作答次數" : "尚未作答"),
      stat("待複習", String(s.due), s.due ? h("a", { href: quizHref, class: "nq-link", text: "去複習 →" }) : "目前沒有"));

    const cur = s.current;
    const first = chapters[0];
    const cont = cur
      ? h("a", { class: "nq-continue", href: NQ.url(cur.chapter.url) },
        h("span", { class: "nq-continue-label", text: "繼續學習" }),
        h("span", { class: "nq-continue-title", text: cur.chapter.title }),
        h("span", { class: "nq-continue-sub", text: `上次閱讀 ${fmtDate(cur.time)} →` }))
      : first ? h("a", { class: "nq-continue", href: NQ.url(first.url) },
        h("span", { class: "nq-continue-label", text: "開始學習" }),
        h("span", { class: "nq-continue-title", text: first.title }),
        h("span", { class: "nq-continue-sub", text: "→" })) : null;

    const grid = h("div", { class: "nq-dash-grid" },
      s.rows.map((r) => chapterCard(r, !!cur && cur.chapter.key === r.key)));

    const status = h("p", { class: "nq-io-status", "aria-live": "polite", text: message || "" });
    const fileInput = h("input", { type: "file", class: "nq-file", hidden: true });
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        let inc;
        try { inc = P.parseImport(String(reader.result)); }
        catch (e) { status.textContent = `匯入失敗：${e.message || "檔案格式不正確"}`; return; }
        const nq = Object.keys(inc.quiz).length, nc = Object.keys(inc.check).length, nv = Object.keys(inc.visited).length;
        if (!root.confirm(`要匯入「${f.name}」嗎？\n（${nq} 題作答紀錄、${nc} 頁勾選、${nv} 頁瀏覽紀錄）\n\n會與這台裝置現有的進度合併：同一題保留較新的紀錄，勾選取聯集。`)) return;
        const merged = P.merge(readStores(), inc);
        NQ.store.set(K.quiz, merged.quiz);
        NQ.store.set(K.check, merged.check);
        NQ.store.set(K.visited, merged.visited);
        for (const [k, v] of Object.entries(inc.extra || {})) {
          const value = k === "nq:learning" ? P.mergeLearning(NQ.store.get(k), v) : P.mergeExtra(rawGet(k), v);
          NQ.store.set(k, value);
        }
        renderDashboard(host, chapters, bank, `已匯入並合併：${nq} 題作答紀錄、${nc} 頁勾選。`);
        root.dispatchEvent(new root.Event("nq:progress"));
      };
      reader.onerror = () => { status.textContent = "讀取檔案失敗。"; };
      reader.readAsText(f);
    });

    const io = h("div", { class: "nq-dash-io" },
      h("div", { class: "nq-section-title", text: "在不同裝置間搬移進度" }),
      h("p", { class: "nq-setup-help", text: "進度只存在這台裝置的瀏覽器。用「匯出進度」存成檔案（iPad 會存到「檔案」App），再到另一台裝置「匯入進度」。" }),
      h("div", { class: "nq-actions" },
        h("button", {
          type: "button", class: "nq-btn nq-primary", text: "匯出進度",
          onclick: () => {
            const d = new Date();
            const pad = (n) => String(n).padStart(2, "0");
            const name = `natenberg-progress-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
            download(name, JSON.stringify(P.buildExport(readStores()), null, 1));
            status.textContent = `已產生 ${name}。`;
          },
        }),
        h("button", { type: "button", class: "nq-btn", text: "匯入進度", onclick: () => fileInput.click() }),
        h("button", {
          type: "button", class: "nq-btn nq-danger", text: "清除進度",
          onclick: () => {
            if (!root.confirm("確定要清除這台裝置上的所有學習資料嗎？（作答、檢核、瀏覽、個人筆記與閱讀設定）\n此動作無法復原，建議先「匯出進度」備份。")) return;
            NQ.store.remove(K.quiz);
            NQ.store.remove(K.check);
            NQ.store.remove(K.visited);
            for (const k of P.EXTRA_KEYS) NQ.store.remove(k);
            renderDashboard(host, chapters, bank, "已清除這台裝置上的進度。");
            root.dispatchEvent(new root.Event("nq:progress"));
          },
        })),
      fileInput,
      status,
      NQ.store.available() ? null : h("p", { class: "nq-warn", text: "⚠ 瀏覽器目前無法儲存資料（可能是私密瀏覽模式），關閉分頁後進度會消失。" }));

    host.replaceChildren(h("div", { class: "nq-dash" }, summary, cont, grid, io));
  }

  async function mountDashboard(host) {
    host.replaceChildren(h("div", { class: "nq-card nq-loading", text: "進度載入中…" }));
    let chapters, bank;
    try {
      [chapters, bank] = await Promise.all([NQ.loadChapters(), NQ.loadBank().catch(() => ({}))]);
    } catch (e) {
      host.replaceChildren(h("div", { class: "nq-card nq-error", text: "進度資料載入失敗，請檢查網路後重新整理。" }));
      return;
    }
    renderDashboard(host, chapters || [], bank || {});
  }

  /* ====================== 掛載 ====================== */

  NQ.onPage(() => {
    if (!root.document) return;
    const path = NQ.pagePath();
    trackVisit(path);
    bindChecklist(path);
    root.document.querySelectorAll(".nq-dashboard").forEach((el) => {
      if (NQ.claim(el)) mountDashboard(el);
    });
  });
})(typeof window !== "undefined" ? window : globalThis);
