/* nq-quiz.js — 章節測驗（.nq-quiz[data-chapters]）與綜合測驗（.nq-quiz[data-mode="pick"]）。
 * 依賴 nq-common.js（window.NQ）。作答紀錄寫入 localStorage "nq:quiz"。 */
(function (root) {
  "use strict";
  const NQ = root.NQ;
  if (!NQ) return;
  const Q = (NQ.quiz = NQ.quiz || {});
  const h = (...a) => NQ.h(...a);

  const TYPE_LABEL = { mc: "選擇題", tf: "是非題", num: "計算題" };
  const COUNT_OPTIONS = [10, 20, 50, 0]; // 0 = 全部

  /* ====================== 純函式（Node 可測） ====================== */

  /** 寬鬆解析使用者輸入的數字：接受千分位逗號、全形字元、U+2212 減號、$ 與 % 符號、小數逗號。 */
  Q.parseNumber = function parseNumber(input) {
    if (typeof input === "number") return isFinite(input) ? input : NaN;
    let s = String(input == null ? "" : input);
    if (s.normalize) s = s.normalize("NFKC");
    s = s.replace(/[−‒–—﹣]/g, "-")
      .replace(/\s+/g, "")
      .replace(/[$%]|美元|元|點/g, "");
    if (!s) return NaN;
    if (s.includes(".")) s = s.replace(/,/g, "");
    else if (/^[+-]?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
    else if ((s.match(/,/g) || []).length === 1) s = s.replace(",", ".");
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
    return Number(s);
  };

  /** 判斷對錯。回傳 true / false；num 題輸入無法解析時回傳 null（不計分）。 */
  Q.check = function check(q, given) {
    if (!q) return null;
    if (q.type === "mc") return String(given).trim().toUpperCase() === String(q.answer).trim().toUpperCase();
    if (q.type === "tf") {
      const g = given === true || given === "true" ? true : given === false || given === "false" ? false : null;
      if (g === null) return null;
      return g === (q.answer === true || q.answer === "true");
    }
    if (q.type === "num") {
      const x = Q.parseNumber(given);
      const ans = Number(q.answer);
      if (isNaN(x) || isNaN(ans)) return null;
      const tol = Math.abs(Number(q.tol) || 0);
      return Math.abs(x - ans) <= tol + 1e-9 * Math.max(1, Math.abs(ans));
    }
    return null;
  };

  /** 更新單題紀錄（不改動原物件）。 */
  Q.applyResult = function applyResult(rec, correct, now) {
    const r = rec || {};
    return {
      seen: (r.seen || 0) + 1,
      right: (r.right || 0) + (correct ? 1 : 0),
      streak: correct ? (r.streak || 0) + 1 : 0,
      last: now == null ? Date.now() : now,
    };
  };

  /** 從題庫取出指定章節的題目（附上 chapter 欄位）；reviewOnly 時只留待複習的題。 */
  Q.selectPool = function selectPool(bank, keys, opts) {
    const o = opts || {};
    const store = o.quizStore || {};
    const out = [];
    for (const k of keys || []) {
      for (const q of (bank && bank[k]) || []) {
        if (o.reviewOnly && !NQ.isDue(store[q.id])) continue;
        out.push(Object.assign({ chapter: k }, q));
      }
    }
    return out;
  };

  /** 洗牌後取 count 題（count 為 0 或大於題數時取全部）。 */
  Q.pick = function pick(pool, count, rng) {
    const s = NQ.shuffle(pool, rng);
    return count > 0 ? s.slice(0, count) : s;
  };

  /** 依容差決定顯示小數位數。 */
  Q.decimalsFor = function decimalsFor(q) {
    const tol = Math.abs(Number(q && q.tol) || 0);
    if (tol > 0) return Math.min(6, Math.max(0, Math.ceil(-Math.log10(tol) - 1e-9)));
    const m = String(q && q.answer).match(/\.(\d+)/);
    return m ? Math.min(6, m[1].length) : 0;
  };

  Q.formatNumber = function formatNumber(x, decimals) {
    const n = Number(x);
    if (!isFinite(n)) return String(x);
    const d = decimals == null ? 2 : decimals;
    const [i, f] = Math.abs(n).toFixed(d).split(".");
    const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const neg = n < 0 && Number(Math.abs(n).toFixed(d)) !== 0;
    return (neg ? "−" : "") + grouped + (f ? "." + f : "");
  };

  /** 把答案（正解或使用者作答）轉成顯示文字。 */
  Q.formatAnswer = function formatAnswer(q, v) {
    if (q.type === "mc") {
      const letter = String(v).toUpperCase();
      const idx = letter.charCodeAt(0) - 65;
      const text = q.choices && q.choices[idx];
      return text == null ? letter : `${letter}. ${text}`;
    }
    if (q.type === "tf") return v === true || v === "true" ? "對" : "錯";
    if (q.type === "num") {
      const x = typeof v === "number" ? v : Q.parseNumber(v);
      return isNaN(x) ? String(v) : Q.formatNumber(x, Q.decimalsFor(q));
    }
    return String(v);
  };

  Q.scoreMessage = function scoreMessage(right, total) {
    if (!total) return "";
    const r = right / total;
    if (r === 1) return "全對！這一輪完全掌握。";
    if (r >= 0.8) return "很好！把答錯的再做一次就更穩了。";
    if (r >= 0.5) return "還不錯。建議回講義看相關段落，再「只重做答錯的」。";
    return "建議先重讀講義的核心概念與例題，再回來挑戰。";
  };

  /** 寫入作答紀錄並回傳新紀錄。 */
  Q.record = function record(id, correct) {
    let rec = null;
    NQ.store.update(NQ.KEYS.quiz, (s) => {
      rec = Q.applyResult(s[id], correct, Date.now());
      s[id] = rec;
    });
    return rec;
  };

  /* ====================== 卡片式答題 UI ====================== */

  const HEADER_OFFSET = 64; // Material 固定頁首高度 + 間距

  function scrollToTop(el) {
    const top = el.getBoundingClientRect().top;
    if (top < HEADER_OFFSET || top > root.innerHeight * 0.6) {
      root.scrollTo({ top: Math.max(0, top + root.scrollY - HEADER_OFFSET), behavior: "smooth" });
    }
  }

  function ensureVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.bottom > root.innerHeight - 8 || r.top < HEADER_OFFSET) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  class Runner {
    /**
     * @param {HTMLElement} host
     * @param {Array} questions
     * @param {Object} opts { titles: {key:title}, showChapter: bool, restartLabel: str, onSetup?: fn }
     */
    constructor(host, questions, opts) {
      this.host = host;
      this.all = questions.slice();
      this.opts = opts || {};
      this.start(this.all);
    }

    start(list) {
      this.list = NQ.shuffle(list);
      this.i = 0;
      this.results = [];
      this.renderQuestion();
    }

    get right() { return this.results.filter((r) => r.correct).length; }

    renderQuestion() {
      const q = this.list[this.i];
      const n = this.list.length;
      this.locked = false;

      const bar = h("div", { class: "nq-bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": n, "aria-valuenow": this.i + 1 },
        h("span", { style: `width:${((this.i + 1) / n) * 100}%` }));
      const head = h("div", { class: "nq-card-head" },
        h("span", { class: "nq-count", text: `${this.i + 1} / ${n}` }),
        h("span", { class: "nq-score", text: `答對 ${this.right}` }));

      const metaBits = [TYPE_LABEL[q.type] || ""];
      if (this.opts.showChapter) metaBits.unshift(this.opts.titles[q.chapter] || q.chapter);
      const meta = h("div", { class: "nq-meta", text: metaBits.filter(Boolean).join(" · ") });
      const qtext = h("div", { class: "nq-q", html: NQ.richText(q.q) });

      this.feedback = h("div", { class: "nq-feedback", "aria-live": "polite", hidden: true });
      this.nextBtn = h("button", {
        type: "button", class: "nq-btn nq-primary nq-next", hidden: true,
        text: this.i + 1 < n ? "下一題 →" : "看結果",
        onclick: () => this.next(),
      });

      const card = h("div", { class: "nq-card" }, head, bar, meta, qtext,
        this.answerArea(q), this.feedback, h("div", { class: "nq-actions" }, this.nextBtn));
      this.card = card;
      this.host.replaceChildren(card);
      NQ.renderMath(card);
    }

    answerArea(q) {
      if (q.type === "mc") {
        this.optBtns = (q.choices || []).map((c, idx) => {
          const letter = String.fromCharCode(65 + idx);
          return h("button", {
            type: "button", class: "nq-opt", dataset: { value: letter },
            onclick: () => this.answer(letter),
          }, h("span", { class: "nq-opt-key", text: letter }), h("span", { class: "nq-opt-text", html: NQ.richText(c) }),
          h("span", { class: "nq-opt-mark", "aria-hidden": "true" }));
        });
        return h("div", { class: "nq-opts" }, this.optBtns);
      }
      if (q.type === "tf") {
        this.optBtns = [[true, "對", "○"], [false, "錯", "✕"]].map(([v, label, sym]) =>
          h("button", {
            type: "button", class: "nq-opt nq-opt-tf", dataset: { value: String(v) },
            onclick: () => this.answer(v),
          }, h("span", { class: "nq-opt-key", text: sym }), h("span", { class: "nq-opt-text", text: label }),
          h("span", { class: "nq-opt-mark", "aria-hidden": "true" })));
        return h("div", { class: "nq-opts nq-opts-tf" }, this.optBtns);
      }
      // num
      this.optBtns = [];
      const input = h("input", {
        type: "text", inputmode: "decimal", class: "nq-input", autocomplete: "off", autocorrect: "off",
        autocapitalize: "off", spellcheck: "false", enterkeyhint: "done", placeholder: "輸入數字", "aria-label": "你的答案",
      });
      const hint = h("div", { class: "nq-hint", hidden: true, text: "請輸入數字（可含逗號或負號）" });
      const sign = h("button", {
        type: "button", class: "nq-btn nq-sign", "aria-label": "切換正負號", text: "±",
        onclick: () => {
          const v = input.value.trim();
          input.value = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, "") : "-" + v;
        },
      });
      const submit = h("button", { type: "submit", class: "nq-btn nq-primary", text: "送出" });
      const form = h("form", {
        class: "nq-num", novalidate: true, autocomplete: "off",
        onsubmit: (e) => {
          e.preventDefault();
          if (this.locked) return;
          if (isNaN(Q.parseNumber(input.value))) {
            hint.hidden = false;
            input.classList.add("nq-invalid");
            return;
          }
          input.blur(); // 收起 iPad 鍵盤
          this.answer(input.value);
        },
      }, sign, input, submit);
      input.addEventListener("input", () => { hint.hidden = true; input.classList.remove("nq-invalid"); });
      this.numParts = { input, sign, submit };
      return h("div", { class: "nq-num-wrap" }, form, hint,
        q.tol ? h("div", { class: "nq-tol", text: `容許誤差 ±${q.tol}` }) : null);
    }

    answer(given) {
      if (this.locked) return;
      const q = this.list[this.i];
      const correct = Q.check(q, given);
      if (correct === null) return;
      this.locked = true;
      Q.record(q.id, correct);
      this.results.push({ q, given, correct });

      // 鎖定並標示
      for (const b of this.optBtns) {
        b.disabled = true;
        const v = b.dataset.value;
        const isAns = q.type === "mc" ? v === String(q.answer).toUpperCase() : v === String(q.answer === true || q.answer === "true");
        const isGiven = v === String(given);
        if (isAns) { b.classList.add("nq-right"); b.querySelector(".nq-opt-mark").textContent = "✓"; }
        else if (isGiven) { b.classList.add("nq-wrong"); b.querySelector(".nq-opt-mark").textContent = "✗"; }
        else b.classList.add("nq-dim");
        if (isGiven) b.setAttribute("aria-pressed", "true");
      }
      if (this.numParts) {
        const { input, sign, submit } = this.numParts;
        input.readOnly = true; sign.disabled = true; submit.disabled = true;
        input.classList.add(correct ? "nq-right" : "nq-wrong");
      }
      this.card.classList.add(correct ? "is-right" : "is-wrong");
      this.card.querySelector(".nq-score").textContent = `答對 ${this.right}`;

      const rows = [h("div", { class: "nq-fb-head" },
        h("span", { class: "nq-fb-icon", "aria-hidden": "true", text: correct ? "✓" : "✗" }),
        correct ? "答對了！" : "答錯了")];
      if (!correct && q.type === "num") rows.push(h("div", { class: "nq-fb-row" }, h("b", { text: "你的答案：" }), Q.formatAnswer(q, given)));
      rows.push(h("div", { class: "nq-fb-row" }, h("b", { text: "正解：" }), h("span", { html: NQ.richText(Q.formatAnswer(q, q.answer)) })));
      if (q.explain) rows.push(h("div", { class: "nq-fb-explain" }, h("b", { text: "解析：" }), h("span", { html: NQ.richText(q.explain) })));
      this.feedback.replaceChildren(...rows);
      this.feedback.className = `nq-feedback ${correct ? "nq-fb-right" : "nq-fb-wrong"}`;
      this.feedback.hidden = false;
      NQ.renderMath(this.feedback);
      this.nextBtn.hidden = false;
      try { this.nextBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      ensureVisible(this.nextBtn);
    }

    next() {
      this.i++;
      if (this.i >= this.list.length) this.renderEnd();
      else this.renderQuestion();
      scrollToTop(this.card);
    }

    renderEnd() {
      const n = this.results.length;
      const right = this.right;
      const missed = this.results.filter((r) => !r.correct);
      const actions = h("div", { class: "nq-actions" },
        h("button", {
          type: "button", class: "nq-btn nq-primary", text: this.opts.restartLabel || "重做本章",
          onclick: () => { this.start(this.all); scrollToTop(this.card); },
        }),
        missed.length ? h("button", {
          type: "button", class: "nq-btn", text: `只重做答錯的（${missed.length}）`,
          onclick: () => { this.start(missed.map((r) => r.q)); scrollToTop(this.card); },
        }) : null,
        this.opts.onSetup ? h("button", { type: "button", class: "nq-btn", text: "重新選題", onclick: () => this.opts.onSetup() }) : null);

      const list = missed.length ? h("div", { class: "nq-missed" },
        h("div", { class: "nq-section-title", text: "答錯的題目" }),
        missed.map((r) => h("div", { class: "nq-missed-item" },
          h("div", { class: "nq-meta", text: [this.opts.showChapter ? this.opts.titles[r.q.chapter] || r.q.chapter : "", TYPE_LABEL[r.q.type]].filter(Boolean).join(" · ") }),
          h("div", { class: "nq-q", html: NQ.richText(r.q.q) }),
          h("div", { class: "nq-fb-row nq-wrong-text" }, h("b", { text: "你的答案：" }), h("span", { html: NQ.richText(Q.formatAnswer(r.q, r.given)) })),
          h("div", { class: "nq-fb-row nq-right-text" }, h("b", { text: "正解：" }), h("span", { html: NQ.richText(Q.formatAnswer(r.q, r.q.answer)) })),
          r.q.explain ? h("div", { class: "nq-fb-explain" }, h("b", { text: "解析：" }), h("span", { html: NQ.richText(r.q.explain) })) : null))) : null;

      const card = h("div", { class: "nq-card nq-end" },
        h("div", { class: "nq-end-score" },
          h("span", { class: "nq-end-big", text: `${right} / ${n}` }),
          h("span", { class: "nq-end-pct", text: NQ.pct(n ? right / n : null) })),
        h("div", { class: "nq-bar nq-bar-score" }, h("span", { style: `width:${n ? (right / n) * 100 : 0}%` })),
        h("p", { class: "nq-end-msg", text: Q.scoreMessage(right, n) }),
        actions, list);
      this.card = card;
      this.host.replaceChildren(card);
      NQ.renderMath(card);
    }
  }
  Q.Runner = Runner;

  /* ====================== 掛載 ====================== */

  function titleMap(chapters) {
    const m = {};
    for (const c of chapters || []) m[c.key] = c.title;
    return m;
  }

  function showError(host, msg) {
    host.replaceChildren(h("div", { class: "nq-card nq-error" }, h("p", { text: msg }),
      h("button", { type: "button", class: "nq-btn", text: "重新載入", onclick: () => root.location.reload() })));
  }

  function loading(host) {
    host.replaceChildren(h("div", { class: "nq-card nq-loading", text: "題庫載入中…" }));
  }

  async function mountChapter(host) {
    const keys = String(host.dataset.chapters || "").split(/[,\s]+/).filter(Boolean);
    loading(host);
    let bank, chapters;
    try {
      [bank, chapters] = await Promise.all([NQ.loadBank(), NQ.loadChapters().catch(() => [])]);
    } catch (e) {
      showError(host, "題庫載入失敗，請檢查網路後重新整理。");
      return;
    }
    const questions = Q.selectPool(bank, keys);
    if (!questions.length) {
      showError(host, "找不到本章的題庫。");
      return;
    }
    new Runner(host, questions, {
      titles: titleMap(chapters),
      showChapter: keys.length > 1,
      restartLabel: keys.length > 1 ? "全部重做" : "重做本章",
    });
  }

  // 綜合測驗的設定，在同一次瀏覽期間（instant navigation）保留
  let lastPick = null;

  async function mountPick(host) {
    loading(host);
    let bank, chapters;
    try {
      [bank, chapters] = await Promise.all([NQ.loadBank(), NQ.loadChapters().catch(() => [])]);
    } catch (e) {
      showError(host, "題庫載入失敗，請檢查網路後重新整理。");
      return;
    }
    const titles = titleMap(chapters);
    const order = (chapters || []).map((c) => c.key).filter((k) => bank[k]);
    for (const k of Object.keys(bank)) if (!order.includes(k)) order.push(k);

    const wantReview = /review/i.test(root.location.hash || "");
    const state = lastPick
      ? { selected: new Set(lastPick.selected), count: lastPick.count, review: wantReview || lastPick.review }
      : { selected: new Set(order), count: 20, review: wantReview };

    const renderSetup = () => {
      const store = NQ.store.get(NQ.KEYS.quiz);
      const chips = order.map((k) => {
        const st = NQ.quizStats(bank[k], store);
        const stat = st.answered ? `${st.answered}/${st.total} · ${NQ.pct(st.acc)}` : `未作答 · ${st.total} 題`;
        const chip = h("button", {
          type: "button", class: "nq-chip", "aria-pressed": String(state.selected.has(k)), dataset: { key: k },
          onclick: () => {
            if (state.selected.has(k)) state.selected.delete(k); else state.selected.add(k);
            chip.setAttribute("aria-pressed", String(state.selected.has(k)));
            refresh();
          },
        }, h("span", { class: "nq-chip-title", text: titles[k] || k }),
        h("span", { class: `nq-chip-stat${st.due ? " has-due" : ""}`, text: st.due ? `${stat} · 待複習 ${st.due}` : stat }));
        return chip;
      });
      const setAll = (on) => {
        state.selected = new Set(on ? order : []);
        chips.forEach((c) => c.setAttribute("aria-pressed", String(on)));
        refresh();
      };

      const segBtns = COUNT_OPTIONS.map((c) => h("button", {
        type: "button", class: "nq-seg-btn", "aria-pressed": String(state.count === c),
        text: c ? `${c} 題` : "全部",
        onclick: () => {
          state.count = c;
          segBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(COUNT_OPTIONS[i] === c)));
          refresh();
        },
      }));

      const reviewBox = h("input", { type: "checkbox", class: "nq-review-box" });
      reviewBox.checked = state.review;
      reviewBox.addEventListener("change", () => { state.review = reviewBox.checked; refresh(); });
      const reviewCount = h("span", { class: "nq-review-count" });
      const startBtn = h("button", { type: "button", class: "nq-btn nq-primary nq-start", onclick: () => start() });
      const note = h("p", { class: "nq-setup-note" });

      const card = h("div", { class: "nq-card nq-setup" },
        h("div", { class: "nq-setup-sec" },
          h("div", { class: "nq-setup-head" },
            h("span", { class: "nq-section-title", text: "章節" }),
            h("span", { class: "nq-setup-tools" },
              h("button", { type: "button", class: "nq-btn nq-small", text: "全選", onclick: () => setAll(true) }),
              h("button", { type: "button", class: "nq-btn nq-small", text: "清除", onclick: () => setAll(false) }))),
          h("div", { class: "nq-chips" }, chips)),
        h("div", { class: "nq-setup-sec" },
          h("div", { class: "nq-section-title", text: "題數" }),
          h("div", { class: "nq-seg", role: "group", "aria-label": "題數" }, segBtns)),
        h("div", { class: "nq-setup-sec" },
          h("label", { class: "nq-check" }, reviewBox, h("span", {}, "只考待複習 ", reviewCount)),
          h("div", { class: "nq-setup-help", text: "待複習＝作答過、但還沒有連續答對 2 次的題目。" })),
        h("div", { class: "nq-actions" }, startBtn),
        note);

      function currentPool() {
        return Q.selectPool(bank, order.filter((k) => state.selected.has(k)), { reviewOnly: state.review, quizStore: store });
      }
      function refresh() {
        lastPick = { selected: [...state.selected], count: state.count, review: state.review };
        const keys = order.filter((k) => state.selected.has(k));
        const dueSel = Q.selectPool(bank, keys, { reviewOnly: true, quizStore: store }).length;
        const dueAll = Q.selectPool(bank, order, { reviewOnly: true, quizStore: store }).length;
        reviewCount.textContent = keys.length === order.length || !keys.length
          ? `（${dueAll} 題）` : `（所選章節 ${dueSel} 題，全部 ${dueAll} 題）`;
        const pool = currentPool();
        const n = state.count > 0 ? Math.min(state.count, pool.length) : pool.length;
        startBtn.textContent = `開始測驗（${n} 題）`;
        startBtn.disabled = n === 0;
        note.textContent = !keys.length ? "請至少選擇一章。"
          : n === 0 && state.review ? "所選章節目前沒有待複習的題目，太棒了！可以取消「只考待複習」或改選其他章節。"
          : "";
      }
      function start() {
        const pool = currentPool();
        if (!pool.length) return;
        const picked = Q.pick(pool, state.count);
        new Runner(host, picked, {
          titles, showChapter: true, restartLabel: "同一組再做一次",
          onSetup: () => { renderSetup(); scrollToTop(host); },
        });
        scrollToTop(host);
      }

      refresh();
      host.replaceChildren(card);
    };
    renderSetup();
  }

  function mountAll() {
    if (!root.document) return;
    root.document.querySelectorAll(".nq-quiz").forEach((host) => {
      if (!NQ.claim(host)) return;
      if (host.dataset.mode === "pick") mountPick(host);
      else mountChapter(host);
    });
  }

  NQ.onPage(mountAll);
})(typeof window !== "undefined" ? window : globalThis);
