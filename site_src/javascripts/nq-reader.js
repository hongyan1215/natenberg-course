/* 每章的閱讀導航。保留原講義、標題 ID、測驗節點與勾選順序。 */
(function (root) {
  "use strict";
  const NQ = root.NQ;
  if (!NQ) return;
  const L = (NQ.learning = NQ.learning || {});
  const STORE = "nq:learning";
  const h = (...args) => NQ.h(...args);
  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  L.readerPreferences = function readerPreferences(value) {
    const prefs = object(value);
    return { mode: prefs.mode === "full" ? "full" : "focus", fontSize: prefs.fontSize === "large" ? "large" : "normal" };
  };

  L.readerSequence = function readerSequence(course, chapters) {
    const known = new Set((chapters || []).map((chapter) => chapter.key));
    const sequence = (course.modules || []).flatMap((module) => module.keys || []).filter((key) => known.has(key));
    return [...new Set(sequence.length ? sequence : (chapters || []).filter((chapter) => /^(ch\d+|appB)$/.test(chapter.key)).map((chapter) => chapter.key))];
  };

  function contentText(value) {
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map(contentText).filter(Boolean).join("\n");
    return Object.values(object(value)).map(contentText).filter(Boolean).join("\n");
  }

  function textBlock(value, className) {
    const element = h("p", { class: className || "nqr-text", html: NQ.richText(contentText(value)) });
    NQ.renderMath(element);
    return element;
  }

  function updateState(change) {
    const state = NQ.store.get(STORE);
    change(state);
    return NQ.store.set(STORE, state);
  }

  function headingText(heading) {
    const copy = heading.cloneNode(true);
    copy.querySelectorAll(".headerlink").forEach((link) => link.remove());
    return copy.textContent.trim();
  }

  function findSection(headings, pattern) {
    return headings.find((heading) => pattern.test(headingText(heading)));
  }

  function revealTarget(article, hash, scroll) {
    if (!article || !article.isConnected || !hash || hash === "#") return;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (error) { return; }
    const target = root.document.getElementById(id);
    if (!target || !article.contains(target)) return;
    let parent = target;
    while (parent && parent !== article) {
      if (parent.tagName === "DETAILS") parent.open = true;
      parent = parent.parentElement;
    }
    if (scroll) root.requestAnimationFrame(() => {
      if (target.isConnected) target.scrollIntoView({ block: "start" });
    });
  }

  // 只註冊一次；每次使用目前頁面，Material 即時導覽不累積頁面事件。
  if (root.document) {
    root.document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest && event.target.closest("a[href]");
      if (!link) return;
      let destination;
      try { destination = new URL(link.href, root.location.href); } catch (error) { return; }
      if (destination.origin === root.location.origin && destination.pathname === root.location.pathname && destination.search === root.location.search) {
        revealTarget(root.document.querySelector("article.nqr-reading"), destination.hash, false);
      }
    });
    root.addEventListener("hashchange", () => revealTarget(root.document.querySelector("article.nqr-reading"), root.location.hash, true));
  }

  function foldSections(article, headings) {
    const kept = /懶人包|學習目標|重點摘要|練習題|題庫測驗|自我檢核/;
    const folded = [];
    for (const heading of headings) {
      if (kept.test(headingText(heading))) continue;
      const following = [];
      let node = heading.nextSibling;
      while (node && !(node.nodeType === 1 && /^(H1|H2)$/.test(node.tagName))) {
        following.push(node);
        node = node.nextSibling;
      }
      const disclosure = h("details", { class: "nqr-section" });
      const summary = h("summary", { class: "nqr-section-summary" });
      const body = h("div", { class: "nqr-section-body" });
      heading.before(disclosure);
      summary.append(heading);
      body.append(...following);
      disclosure.append(summary, body);
      folded.push(disclosure);
    }
    return folded;
  }

  function foldOptionalExercises(headings) {
    const exerciseHeading = findSection(headings, /練習題/);
    if (!exerciseHeading) return [];
    const questionNumber = (node) => {
      if (!node || node.nodeType !== 1 || node.tagName !== "P") return null;
      const first = node.firstElementChild;
      if (!first || first.tagName !== "STRONG") return null;
      const match = first.textContent.trim().match(/^([A-D]\d+)\.$/);
      return match ? match[1] : null;
    };
    const questions = [];
    let node = exerciseHeading.nextSibling;
    while (node && !(node.nodeType === 1 && /^(H1|H2)$/.test(node.tagName))) {
      if (questionNumber(node)) questions.push(node);
      node = node.nextSibling;
    }
    return questions.filter((question) => !question.textContent.includes("⭐")).map((question) => {
      const contents = [question];
      let following = question.nextSibling;
      while (following && !questionNumber(following) && !(following.nodeType === 1 && /^(H1|H2|H3)$/.test(following.tagName))) {
        contents.push(following);
        following = following.nextSibling;
      }
      const optional = h("details", { class: "nqr-optional" },
        h("summary", null, h("span", { text: `選做練習 ${questionNumber(question)}` }),
          h("span", { class: "nqr-optional-hint", "aria-hidden": "true", text: "展開題目" })));
      const body = h("div", { class: "nqr-optional-body" });
      question.before(optional);
      body.append(...contents);
      optional.append(body);
      return optional;
    });
  }

  function disclosure(title, value, className, open) {
    const element = h("details", { class: `nqr-insight ${className || ""}` },
      h("summary", { text: title }), textBlock(value));
    element.open = !!open;
    return element;
  }

  function addNotes(article, key) {
    const state = NQ.store.get(STORE);
    const saved = object(object(state.notes)[key]);
    const noteId = `nqr-note-${key}`;
    const statusId = `${noteId}-status`;
    const status = h("p", { id: statusId, class: "nqr-note-status", role: "status", "aria-live": "polite", text: saved.text ? "已儲存在這個瀏覽器" : "輸入後自動儲存在這個瀏覽器" });
    const input = h("textarea", {
      id: noteId, rows: 4, maxlength: 20000,
      placeholder: "試著用自己的話回答：這一章最重要的概念是什麼？我還卡在哪裡？",
      "aria-describedby": statusId,
    });
    input.value = typeof saved.text === "string" ? saved.text : "";
    input.addEventListener("input", () => {
      const persisted = updateState((current) => {
        current.notes = object(current.notes);
        current.notes[key] = { text: input.value, updatedAt: Date.now() };
      });
      status.textContent = persisted ? "已儲存在這個瀏覽器" : "目前僅暫存；瀏覽器未允許儲存，關閉後可能遺失";
    });
    article.append(h("section", { class: "nqr-notes", "aria-label": "本章筆記" },
      h("label", { for: noteId, class: "nqr-notes-title", text: "用自己的話，留下一個理解" }),
      h("p", { class: "nqr-muted", text: "寫得出來，比覺得看懂更可靠。記下例子、疑問，或明天想再驗證的事。" }), input, status));
  }

  function addNext(article, key, course, chapters) {
    const sequence = L.readerSequence(course, chapters);
    const index = sequence.indexOf(key);
    const next = index >= 0 ? chapters.find((chapter) => chapter.key === sequence[index + 1]) : null;
    article.append(h("div", { class: "nqr-next" },
      h("div", null,
        h("p", { class: "nqr-next-label", text: "準備往下一步" }),
        h("p", { class: "nqr-muted", text: "先試著不看解答完成測驗與自我檢核；卡住的地方，留下筆記再回頭補強。" })),
      h("a", { href: NQ.url(next ? next.url : ""), class: "nqr-next-link" },
        h("span", { text: next ? next.title : "回到學習路線" }), h("span", { "aria-hidden": "true", text: "→" }))));
  }

  async function mount(host) {
    const key = host.dataset.chapter;
    const article = host.closest("article");
    if (!article || !key) return;
    host.setAttribute("aria-busy", "true");
    host.append(h("p", { class: "nqr-muted", text: "正在準備本章學習導航…" }));
    let course, chapters;
    try {
      [course, chapters] = await Promise.all([NQ.fetchJSON("assets/learning/course.json"), NQ.loadChapters()]);
    } catch (error) {
      if (!host.isConnected) return;
      host.removeAttribute("aria-busy");
      host.replaceChildren(h("p", { class: "nqr-muted", text: "學習導航暫時無法載入，可以繼續閱讀下方完整講義。" }));
      return;
    }
    if (!host.isConnected || !article.isConnected) return;
    const metadata = object(object(course.chapters)[key]);
    if (!metadata.question) { host.remove(); return; }
    const module = (course.modules || []).find((item) => (item.keys || []).includes(key));
    const headings = [...article.children].filter((element) => element.tagName === "H2");
    const folded = foldSections(article, headings).concat(foldOptionalExercises(headings));
    article.classList.add("nqr-reading");
    let preferences = L.readerPreferences(NQ.store.get(STORE).reader);

    const focusButton = h("button", { type: "button", text: "重點閱讀" });
    const fullButton = h("button", { type: "button", text: "完整講義" });
    const fontButton = h("button", { type: "button", class: "nqr-font", text: "放大字級" });
    const readingHint = h("p", { class: "nqr-reading-hint", role: "status", "aria-live": "polite" });
    const updateControls = (applySections) => {
      article.dataset.nqrFont = preferences.fontSize;
      article.dataset.nqrMode = preferences.mode;
      focusButton.setAttribute("aria-pressed", String(preferences.mode === "focus"));
      fullButton.setAttribute("aria-pressed", String(preferences.mode === "full"));
      fontButton.setAttribute("aria-pressed", String(preferences.fontSize === "large"));
      fontButton.textContent = preferences.fontSize === "large" ? "使用一般字級" : "放大字級";
      readingHint.textContent = preferences.mode === "focus"
        ? "先讀導讀與懶人包，再做星號練習。詳細概念與選做題已收合，隨時可以展開。"
        : "已展開完整講義。可以依右側目錄查找概念，或切回重點閱讀。";
      if (applySections) {
        folded.forEach((section) => { section.open = preferences.mode === "full"; });
        revealTarget(article, root.location.hash, false);
      }
    };
    const setPreference = (change, applySections) => {
      preferences = Object.assign({}, preferences, change);
      updateState((state) => { state.reader = Object.assign({}, object(state.reader), preferences); });
      updateControls(applySections);
    };
    focusButton.addEventListener("click", () => setPreference({ mode: "focus" }, true));
    fullButton.addEventListener("click", () => setPreference({ mode: "full" }, true));
    fontButton.addEventListener("click", () => setPreference({ fontSize: preferences.fontSize === "large" ? "normal" : "large" }, false));

    const stages = [
      ["1", "理解", findSection(headings, /懶人包|核心概念/)],
      ["2", "練習", findSection(headings, /練習題/)],
      ["3", "測驗", findSection(headings, /題庫測驗/)],
      ["4", "檢核", findSection(headings, /自我檢核/)],
    ];
    const stepLinks = stages.filter((stage) => stage[2] && stage[2].id).map(([number, title, heading]) =>
      h("a", { href: `#${encodeURIComponent(heading.id)}` }, h("span", { "aria-hidden": "true", text: number }), title));
    const prerequisites = (metadata.prerequisites || []).map((prerequisite) => chapters.find((item) => item.key === prerequisite)).filter(Boolean);
    const prerequisiteBlock = prerequisites.length ? h("div", { class: "nqr-prerequisites" },
      h("span", { text: "如果有點卡，先補：" }), prerequisites.map((item) => h("a", { href: NQ.url(item.url), text: item.title }))) : null;
    const tool = typeof metadata.tool === "string" && /^tools\/[a-z0-9-]+\/$/.test(metadata.tool)
      ? h("a", { class: "nqr-tool-link", href: NQ.url(metadata.tool), text: "用互動工具驗證直覺 →" }) : null;

    host.removeAttribute("aria-busy");
    host.replaceChildren(h("section", { class: "nqr-guide", "aria-label": "本章學習導航" },
      h("p", { class: "nqr-kicker", text: module ? `學習導航 / ${module.title}` : "本章學習導航" }),
      h("h2", { class: "nqr-question", text: metadata.question }),
      h("div", { class: "nqr-goal" }, h("span", { class: "nqr-small-label", text: "這一章，學會一件事" }), textBlock(metadata.goal)),
      h("div", { class: "nqr-intuition" }, h("span", { class: "nqr-small-label", text: "先建立直覺" }), textBlock(metadata.intuition)),
      h("div", { class: "nqr-insights" },
        metadata.example ? disclosure("看一個具體例子", metadata.example, "nqr-example", true) : null,
        metadata.misconception ? disclosure("最容易想錯的地方", metadata.misconception, "nqr-misconception", false) : null),
      prerequisiteBlock, tool,
      h("nav", { class: "nqr-steps", "aria-label": "本章學習步驟" }, stepLinks),
      h("div", { class: "nqr-reader-controls" },
        h("div", { class: "nqr-mode", role: "group", "aria-label": "閱讀模式" }, focusButton, fullButton),
        h("div", { class: "nqr-reading-actions" }, h("a", { href: NQ.url("reference/glossary/"), text: "查中英術語" }), fontButton)), readingHint));
    addNotes(article, key);
    addNext(article, key, course, chapters);
    updateControls(true);
    NQ.renderMath(host);
    revealTarget(article, root.location.hash, true);
  }

  if (root.document) NQ.onPage(() => {
    root.document.querySelectorAll(".nq-lesson-guide[data-chapter]").forEach((host) => {
      if (NQ.claim(host, "nqReader")) mount(host);
    });
  });
})(typeof window !== "undefined" ? window : globalThis);
