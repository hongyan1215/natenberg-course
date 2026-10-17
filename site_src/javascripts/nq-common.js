/* nq-common.js — 共用工具：站點根目錄、頁面路徑、進度儲存、JSON 快取、數學渲染。
 * 全域匯出 window.NQ；nq-progress.js / nq-quiz.js / nq-tools.js 都依賴它。 */
(function (root) {
  "use strict";

  const NQ = root.NQ || {};
  root.NQ = NQ;

  NQ.KEYS = Object.freeze({ quiz: "nq:quiz", check: "nq:check", visited: "nq:visited" });

  /* ---------- 路徑 ---------- */
  let cachedRoot = null;
  NQ.siteRoot = function siteRoot() {
    if (cachedRoot) return cachedRoot;
    const s = root.document && root.document.querySelector('script[src*="nq-common.js"]');
    if (s) {
      // nq-common.js 位於 <root>/javascripts/，往上一層就是站點根目錄
      cachedRoot = new URL("..", new URL(s.getAttribute("src"), root.location.href)).href;
    } else {
      cachedRoot = new URL("/", root.location.href).href;
    }
    return cachedRoot;
  };

  /** 把 pathname 轉成相對站點根的頁面路徑，例如 "lessons/ch05_pricing_models/"；首頁為 ""。 */
  NQ.normalizePath = function normalizePath(pathname, rootPathname) {
    let p = pathname || "/";
    try { p = decodeURIComponent(p); } catch (e) { /* 保留原樣 */ }
    let r = rootPathname || "/";
    try { r = decodeURIComponent(r); } catch (e) { /* 保留原樣 */ }
    if (!r.endsWith("/")) r += "/";
    if (p.startsWith(r)) p = p.slice(r.length);
    else if (p + "/" === r) p = "";
    else p = p.replace(/^\/+/, "");
    p = p.replace(/(^|\/)index\.html$/, "$1");
    return p;
  };

  NQ.pagePath = function pagePath() {
    return NQ.normalizePath(root.location.pathname, new URL(NQ.siteRoot()).pathname);
  };

  NQ.url = function url(rel) {
    return new URL(rel || "", NQ.siteRoot()).href;
  };

  /* ---------- 儲存（localStorage，私密模式時退回記憶體） ---------- */
  const memory = {};
  function storage() {
    try {
      const ls = root.localStorage;
      const t = "__nq_test__";
      ls.setItem(t, "1");
      ls.removeItem(t);
      return ls;
    } catch (e) {
      return null;
    }
  }

  NQ.store = {
    get(key) {
      let raw = null;
      const ls = storage();
      try { raw = ls ? ls.getItem(key) : memory[key]; } catch (e) { raw = memory[key]; }
      if (raw == null) return {};
      try {
        const v = JSON.parse(raw);
        return v && typeof v === "object" && !Array.isArray(v) ? v : {};
      } catch (e) {
        return {};
      }
    },
    set(key, value) {
      const raw = JSON.stringify(value || {});
      memory[key] = raw;
      const ls = storage();
      if (!ls) return false;
      try { ls.setItem(key, raw); return true; } catch (e) { return false; }
    },
    remove(key) {
      delete memory[key];
      const ls = storage();
      try { if (ls) ls.removeItem(key); } catch (e) { /* ignore */ }
    },
    /** 讀、改、寫：fn 可以直接修改物件或回傳新物件。 */
    update(key, fn) {
      const obj = NQ.store.get(key);
      const out = fn(obj);
      NQ.store.set(key, out === undefined ? obj : out);
      return out === undefined ? obj : out;
    },
    available() { return !!storage(); },
  };

  /* ---------- JSON 讀取（記憶體快取，跨 instant navigation 共用） ---------- */
  const jsonCache = new Map();
  NQ.fetchJSON = function fetchJSON(rel) {
    const href = NQ.url(rel);
    if (!jsonCache.has(href)) {
      const p = fetch(href, { credentials: "same-origin" }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${href}`);
        return r.json();
      });
      p.catch(() => jsonCache.delete(href)); // 失敗時允許重試
      jsonCache.set(href, p);
    }
    return jsonCache.get(href);
  };
  NQ.loadBank = () => NQ.fetchJSON("assets/quiz/bank.json");
  NQ.loadChapters = () => NQ.fetchJSON("assets/quiz/chapters.json");

  /* ---------- 文字與數學 ---------- */
  NQ.escapeHTML = function escapeHTML(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  /** 題庫文字 → 安全 HTML（保留換行）。 */
  NQ.richText = (s) => NQ.escapeHTML(s).replace(/\n/g, "<br>");

  // `$` 是貨幣符號，不是數學分隔符；數學只用 \( \) 與 \[ \]
  NQ.MATH_DELIMITERS = Object.freeze([
    { left: "\\[", right: "\\]", display: true },
    { left: "\\(", right: "\\)", display: false },
  ]);
  NQ.renderMath = function renderMath(el) {
    if (!el || typeof root.renderMathInElement !== "function") return;
    try {
      root.renderMathInElement(el, { delimiters: NQ.MATH_DELIMITERS.map((d) => ({ ...d })), throwOnError: false });
    } catch (e) { /* KaTeX 失敗時保留原文 */ }
  };

  /** 建立 DOM 元素：h("button", {class:"x", onclick: fn, text:"…"}, child, …) */
  NQ.h = function h(tag, attrs, ...kids) {
    const el = root.document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : root.document.createTextNode(String(kid)));
    }
    return el;
  };

  /* ---------- 頁面初始化（相容 navigation.instant） ---------- */
  NQ.onPage = function onPage(fn) {
    const run = () => { try { fn(); } catch (e) { if (root.console) root.console.error("[NQ]", e); } };
    if (typeof root.document$ !== "undefined" && root.document$ && root.document$.subscribe) {
      root.document$.subscribe(run);
    } else if (root.document) {
      if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", run);
      else run();
    }
  };

  /** 每個元素只掛載一次。 */
  NQ.claim = function claim(el, flag) {
    const k = flag || "nqMounted";
    if (el.dataset[k]) return false;
    el.dataset[k] = "1";
    return true;
  };

  /* ---------- 純函式（也供 Node 測試） ---------- */
  NQ.shuffle = function shuffle(arr, rng) {
    const a = arr.slice();
    const rand = rng || Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /** 待複習：作答過且連續答對未滿 2 次。 */
  NQ.isDue = (rec) => !!rec && (rec.seen || 0) > 0 && (rec.streak || 0) < 2;

  /** 一章（或任意題目集合）的作答統計。 */
  NQ.quizStats = function quizStats(questions, quizStore) {
    const st = { total: 0, answered: 0, ok: 0, bad: 0, seen: 0, right: 0, due: 0, acc: null };
    for (const q of questions || []) {
      st.total++;
      const r = quizStore && quizStore[q.id];
      if (!r || !(r.seen > 0)) continue;
      st.answered++;
      st.seen += r.seen;
      st.right += r.right || 0;
      if ((r.streak || 0) > 0) st.ok++; else st.bad++;
      if (NQ.isDue(r)) st.due++;
    }
    st.acc = st.seen ? st.right / st.seen : null;
    return st;
  };

  NQ.pct = (x) => (x == null || isNaN(x) ? "—" : `${Math.round(x * 100)}%`);
})(typeof window !== "undefined" ? window : globalThis);
