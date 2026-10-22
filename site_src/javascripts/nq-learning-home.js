/* Calm learning dashboard. Course links remain usable before scripts/data load. */
(function (root) {
  "use strict";
  const NQ = root.NQ;
  if (!NQ) return;
  const H = (NQ.learningHome = NQ.learningHome || {});
  const h = (...args) => NQ.h(...args);
  const KEY = "nq:learning";
  const FIRST = "start/first-option/";
  const CORE = /^ch(?:0[1-9]|1[0-9]|2[0-5])$/;
  const active = new WeakMap();

  /** Latest answers, rather than all historical attempts, determine verification. */
  H.summarize = function summarize(chapters, bank, stores) {
    const s = stores || {}, quiz = s.quiz || {}, checks = s.check || {}, visits = s.visited || {};
    const rows = (chapters || []).filter((c) => CORE.test(c.key) || c.key === "appB").map((c) => {
      const qs = Array.isArray(bank && bank[c.key]) ? bank[c.key] : [];
      let answered = 0, correct = 0, due = 0;
      for (const q of qs) {
        const rec = quiz[q.id];
        if (!rec || !(rec.seen > 0)) continue;
        answered++;
        if (rec.streak > 0) correct++;
        if (NQ.isDue(rec)) due++;
      }
      const entry = checks[c.url] || {};
      const rawTotal = Number(entry._total);
      const total = Number.isSafeInteger(rawTotal) && rawTotal > 0 && rawTotal <= 1000 ? rawTotal : 0;
      // Only current checkbox indices count; stale imported keys cannot finish a chapter.
      let checked = 0;
      for (let i = 0; i < total; i++) if (entry[i] === true) checked++;
      const visitedAt = Number(visits[c.url]) || 0;
      const verified = qs.length > 0 && answered === qs.length && correct / qs.length >= 0.85 && total > 0 && checked === total;
      return Object.assign({}, c, { total: qs.length, answered, correct, due, checked, checkTotal: total, visitedAt, verified,
        started: visitedAt > 0 || answered > 0 || checked > 0 });
    });
    const core = rows.filter((r) => CORE.test(r.key));
    const started = core.some((r) => r.started);
    const unfinished = core.filter((r) => !r.verified);
    const latest = unfinished.filter((r) => r.started).sort((a, b) => b.visitedAt - a.visitedAt)[0];
    const target = latest || unfinished[0] || core[core.length - 1] || null;
    const answered = core.reduce((n, r) => n + r.answered, 0);
    const correct = core.reduce((n, r) => n + r.correct, 0);
    return { rows, core, started, target, verified: core.filter((r) => r.verified).length, answered,
      total: core.reduce((n, r) => n + r.total, 0), due: core.reduce((n, r) => n + r.due, 0),
      accuracy: answered ? correct / answered : null };
  };

  H.minutes = function minutes(value) { return [15, 30, 60].includes(Number(value)) ? Number(value) : 15; };

  function snapshot(data) {
    return H.summarize(data.chapters, data.bank, { quiz: NQ.store.get(NQ.KEYS.quiz),
      check: NQ.store.get(NQ.KEYS.check), visited: NQ.store.get(NQ.KEYS.visited) });
  }
  function chapterHref(chapter, anchor) {
    const path = chapter && chapter.url;
    return NQ.url(/^lessons\/[a-zA-Z0-9_-]+\/$/.test(path || "") ? path : "course/") + (anchor ? "#" + anchor : "");
  }
  function shortTitle(chapter) {
    return String(chapter && chapter.title || "").replace(/^第\s*\d+\s*章\s*/, "");
  }
  function stat(label, value, note) {
    return h("div", { class: "nq-home-stat" }, h("strong", { text: value }),
      h("span", { text: label }), note ? h("small", { text: note }) : null);
  }
  function summaryNodes(s) {
    return [h("div", { class: "nq-progress-intro" }, h("span", { class: "nq-eyebrow", text: "YOUR LEARNING" }),
      h("strong", { text: s.started ? "把學過的，變成能解釋的。" : "每次弄懂一點，就往前一步。" })),
    h("div", { class: "nq-home-stats" },
      stat("核心章節已驗證", `${s.verified} / ${s.core.length}`, "題庫與自我檢核皆達標"),
      stat("核心題庫已作答", `${s.answered} / ${s.total}`, "不同題目的作答數"),
      stat("最近答案正確率", s.accuracy == null ? "—" : NQ.pct(s.accuracy), s.answered ? "每題僅計最近一次" : "做過練習後顯示")),
    h("a", { class: "nq-progress-more", href: NQ.url("study/"), text: "我的學習 ↗" })];
  }

  function renderPlan(host, data, s) {
    const minutes = H.minutes((NQ.store.get(KEY).preferences || {}).minutes);
    const fresh = !s.started;
    const target = s.target;
    const chapterData = (data.course.chapters || {})[target && target.key] || {};
    const title = fresh ? "今天，先弄懂一件事。" : s.verified === s.core.length ? "把已學會的，再練穩一點。" : "今天，接著這裡往前。";
    const question = fresh ? "買了一張買權，標的漲了就一定賺錢嗎？" : chapterData.question || shortTitle(target);
    const href = fresh ? NQ.url(FIRST) : chapterHref(target);
    const splits = { 15: [5, 7, 3], 30: [8, 15, 7], 60: [15, 25, 20] }[minutes];
    const steps = fresh ? [
      ["讀懂一張買權", "先分清權利與義務", href],
      ["動手試一個情境", "改變到期價格，觀察損益", href],
      ["用自己的話解釋", "為什麼漲了，還可能賠錢？", href],
    ] : [
      ["先讀直覺與例子", "帶著今天的問題閱讀", href],
      [minutes === 15 ? "嘗試幾題章末測驗" : "先答題，再看解析", "看懂解答後，再親手做一次", chapterHref(target, "chapter-quiz")],
      ["對照自我檢核", "不看筆記，說出自己的解釋", chapterHref(target, "chapter-checklist")],
    ];
    const group = h("div", { class: "nq-time-picker", role: "group", "aria-label": "選擇這次的學習時間" },
      [15, 30, 60].map((m) => h("button", { type: "button", text: `${m} 分鐘`, "aria-pressed": m === minutes ? "true" : "false", dataset: { minutes: String(m) },
        onclick: () => {
          NQ.store.update(KEY, (value) => { value.preferences = Object.assign({}, value.preferences || {}, { minutes: m }); });
          if (host.isConnected) {
            renderPlan(host, data, snapshot(data));
            const selected = host.querySelector(`[data-minutes="${m}"]`);
            if (selected) selected.focus({ preventScroll: true });
          }
        } })));
    host.replaceChildren(
      h("div", { class: "nq-today-top" }, h("span", { class: "nq-eyebrow", text: "TODAY'S SMALL STEP" }),
        h("span", { class: "nq-live-dot", text: fresh ? "你的第一步" : "接續你的進度" })),
      h("h2", { id: "nq-today-title", text: title }),
      h("p", { class: "nq-today-question", text: question }),
      h("p", { class: "nq-today-caption", text: fresh ? "從生活例子開始，弄清楚權利金與損益。" : target.title }),
      group,
      h("ol", { class: "nq-plan-list" }, steps.map((step, i) => h("li", {},
        h("span", { text: String(i + 1).padStart(2, "0") }),
        h("a", { href: step[2] }, h("strong", { text: step[0] }), h("small", { text: step[1] })),
        h("b", { text: `${splits[i]} 分` })))),
      h("a", { class: "nq-today-link", href }, `開始今天的 ${minutes} 分鐘`, h("span", { "aria-hidden": "true", text: "→" })),
      h("p", { class: "nq-time-note", text: "時間是建議，理解比讀完更重要。" }));
  }

  function renderHome(host, data) {
    const s = snapshot(data);
    const primary = host.querySelector("[data-home-primary]");
    if (primary) {
      primary.href = s.started ? chapterHref(s.target) : NQ.url(FIRST);
      primary.replaceChildren(s.started ? s.verified === s.core.length ? "回顧核心課程 " : "繼續我的學習 " : "從一張買權開始 ", h("span", { "aria-hidden": "true", text: "↗" }));
    }
    const today = host.querySelector("[data-learning-today]");
    if (today) renderPlan(today, data, s);
    const progress = host.querySelector("[data-learning-progress]");
    if (progress) progress.replaceChildren(...summaryNodes(s));
    const cont = host.querySelector("[data-home-continue]");
    if (cont && s.target) {
      cont.href = chapterHref(s.target);
      const desc = cont.querySelector("[data-home-continue-description]");
      if (desc) desc.textContent = s.started ? `${s.target.title}。${(data.course.chapters[s.target.key] || {}).goal || "從上次尚未驗證的章節接續。"}` : "從第 1 章建立合約基礎，再循序學到定價、避險與策略。";
    }
    const review = host.querySelector("[data-home-review-description]");
    if (review) review.textContent = s.due ? `核心課程有 ${s.due} 題尚未連續答對兩次。從這些還不穩的觀念開始複習。` : "重做答錯、或尚未連續答對兩次的題目。知道自己卡在哪裡。";
    if (!NQ.store.available() && !host.querySelector(".nq-home-storage-note")) {
      host.append(h("p", { class: "nq-home-storage-note", role: "status", text: "目前瀏覽器無法儲存進度。這次仍可學習，關閉分頁後紀錄可能消失。" }));
    }
  }

  function statusText(row) {
    if (row.verified) return "已驗證";
    if (row.answered) return `已答 ${row.answered}/${row.total}`;
    return row.started ? "已開始" : "尚未開始";
  }
  function renderRoute(host, data) {
    const s = snapshot(data);
    const byKey = new Map(s.rows.map((r) => [r.key, r]));
    const open = new Set([...host.querySelectorAll("details[open]")].map((el) => el.dataset.module));
    host.replaceChildren(...data.course.modules.map((module, i) => {
      const rows = (module.keys || []).map((key) => byKey.get(key)).filter(Boolean);
      const done = rows.filter((r) => r.verified).length;
      const details = h("details", { class: "nq-module", dataset: { module: String(module.id || i) } });
      if (open.has(String(module.id || i))) details.open = true;
      const progress = done ? `${done} / ${rows.length} 已驗證` : `${rows.length} 個學習單元`;
      details.append(h("summary", {}, h("span", { class: "nq-module-number", text: String(i + 1).padStart(2, "0") }),
        h("span", { class: "nq-module-heading" }, h("strong", { text: module.title }),
          h("small", { text: module.description }), h("span", { class: `nq-module-progress${done === rows.length && done ? " is-verified" : ""}`, text: progress })),
        h("span", { class: "nq-module-toggle", "aria-hidden": "true", text: "＋" })));
      details.append(h("div", { class: "nq-module-body" },
        module.outcome ? h("p", { class: "nq-module-outcome" }, h("span", { text: "學完你能" }), module.outcome) : null,
        h("div", { class: "nq-module-chapters" }, rows.map((row) => {
          const lesson = (data.course.chapters || {})[row.key] || {};
          return h("a", { class: "nq-route-chapter", href: chapterHref(row) },
            h("span", { class: "nq-route-chapter-copy" }, h("strong", { text: row.title }),
              h("small", { text: lesson.goal || lesson.question || "閱讀白話導讀，完成例題與自我檢核。" })),
            h("span", { class: `nq-chapter-state${row.verified ? " is-verified" : ""}`, text: statusText(row) }),
            h("span", { class: "nq-route-arrow", "aria-hidden": "true", text: "↗" }));
        }))));
      return details;
    }));
  }

  let pending;
  function load() {
    if (!pending) {
      pending = Promise.all([NQ.loadChapters(), NQ.loadBank(), NQ.fetchJSON("assets/learning/course.json")]).then(([chapters, bank, course]) => {
        if (!Array.isArray(chapters) || !chapters.some((c) => CORE.test(c.key)) || !course || !Array.isArray(course.modules) || !course.modules.length || !course.chapters) throw new Error("Course data is incomplete");
        return { chapters, bank, course };
      });
      pending.catch(() => { pending = null; });
    }
    return pending;
  }
  function update(host, data) {
    if (!host.isConnected) return;
    if (host.matches(".nq-learning-home")) renderHome(host, data);
    else if (host.matches(".nq-learning-route")) renderRoute(host, data);
    else host.replaceChildren(...summaryNodes(snapshot(data)));
  }
  async function mount(host) {
    try {
      const data = await load();
      if (!host.isConnected) return;
      active.set(host, data);
      update(host, data);
    } catch (error) {
      if (!host.isConnected) return;
      const status = h("p", { class: "nq-home-load-note", role: "status" }, "個人進度暫時無法載入，下方課程連結仍可使用。 ");
      const retry = h("button", { type: "button", text: "重新載入", onclick: () => { status.remove(); mount(host); } });
      status.append(retry);
      host.append(status);
    }
  }
  if (!root.document) return;
  const selector = ".nq-learning-home, .nq-learning-route, .nq-learning-summary";
  NQ.onPage(() => {
    root.document.querySelectorAll(selector).forEach((host) => {
      if (NQ.claim(host, "nqLearningHome")) mount(host);
      else if (active.has(host)) update(host, active.get(host));
    });
  });
  function refresh() {
    root.document.querySelectorAll(selector).forEach((host) => { if (active.has(host)) update(host, active.get(host)); });
  }
  root.addEventListener("nq:progress", refresh);
  root.addEventListener("storage", (event) => {
    if (event.key && ![NQ.KEYS.quiz, NQ.KEYS.check, NQ.KEYS.visited, KEY].includes(event.key)) return;
    refresh();
  });
})(typeof window !== "undefined" ? window : globalThis);
