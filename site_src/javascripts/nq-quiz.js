/* nq-quiz.js — 章節測驗（.nq-quiz[data-chapters]）、綜合測驗（.nq-quiz[data-mode="pick"]）
 * 與計時模擬考（.nq-quiz[data-mode="exam"][data-chapters="exam1"][data-minutes="60"]）。
 * 依賴 nq-common.js（window.NQ）。作答紀錄寫入 localStorage "nq:quiz"；模擬考歷史寫入 "nq:exam"。 */
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
      const lessonURL = this.opts.chapterURLs && this.opts.chapterURLs[q.chapter];
      if (!correct && lessonURL) rows.push(h("a", {class: "nq-btn", href: NQ.url(lessonURL), text: "回到本章導讀，重看例子與常見誤解 →"}));
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

  function titleMap(chapters, bank) {
    const m = {};
    for (const k of Object.keys(bank || {})) if (Q.isExamKey(k)) m[k] = Q.examTitle(k);
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

  /* ====================== 模擬考（data-mode="exam"） ====================== */
  /* 純函式與 ExamSession 不碰 DOM（Node 可測）；ExamUI 負責畫面與計時器。
   * localStorage "nq:exam" → { "<exam key>": { attempts: [{score,total,pct,date,duration,timeout}], active?: {...} } } */

  const EXAM_MAX_ATTEMPTS = 30;

  Q.isExamKey = (k) => /^exam\d+$/i.test(String(k || ""));
  Q.examTitle = (k) => (Q.isExamKey(k) ? `自編模擬考 ${String(k).replace(/\D/g, "")}` : String(k || ""));

  /** 毫秒 → "m:ss"（100 分鐘以內，例如 "60:00"）或 "h:mm:ss"。 */
  Q.formatClock = function formatClock(ms, roundUp) {
    const total = Math.max(0, roundUp ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
    const p2 = (x) => String(x).padStart(2, "0");
    if (total < 6000) return `${Math.floor(total / 60)}:${p2(total % 60)}`;
    const hh = Math.floor(total / 3600), mm = Math.floor((total % 3600) / 60), ss = total % 60;
    return `${hh}:${p2(mm)}:${p2(ss)}`;
  };

  Q.examRemaining = function examRemaining(startedAt, minutes, now) {
    return Math.max(0, startedAt + minutes * 60000 - now);
  };

  /** 有沒有作答（空字串、null、undefined 視為未答）。 */
  Q.isAnswered = (v) => v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "");

  /** 計分：回傳總分、每題結果、各主題統計（依題目出現順序）。未作答算錯。 */
  Q.examScore = function examScore(questions, answers, flags) {
    const ans = answers || {}, fl = flags || {};
    const topics = new Map();
    const results = (questions || []).map((q, idx) => {
      const given = ans[q.id];
      const answered = Q.isAnswered(given);
      const correct = answered ? Q.check(q, given) === true : false;
      const topic = q.topic || "其他";
      if (!topics.has(topic)) topics.set(topic, { topic, right: 0, total: 0, answered: 0 });
      const t = topics.get(topic);
      t.total++;
      if (answered) t.answered++;
      if (correct) t.right++;
      return { q, idx, given: answered ? given : null, answered, correct, flagged: !!fl[q.id] };
    });
    const right = results.filter((r) => r.correct).length;
    const answered = results.filter((r) => r.answered).length;
    const total = results.length;
    const byTopic = [...topics.values()].map((t) => Object.assign(t, { acc: t.total ? t.right / t.total : null }));
    return { total, right, answered, pct: total ? Math.round((right / total) * 1000) / 10 : 0, results, byTopic };
  };

  /** 把模擬考結果寫進 nq:quiz 的逐題紀錄（不改動原物件）；未作答視為答錯，讓它出現在錯題複習。 */
  Q.examApplyQuizStore = function examApplyQuizStore(store, results, now, opts) {
    const o = opts || {};
    const out = Object.assign({}, store);
    for (const r of results || []) {
      if (!r.answered && o.skipUnanswered) continue;
      out[r.q.id] = Q.applyResult(out[r.q.id], r.correct, now);
    }
    return out;
  };

  /** 新增一筆作答紀錄並清除進行中的作答（不改動原物件）。 */
  Q.examAddAttempt = function examAddAttempt(examStore, key, attempt, max) {
    const out = Object.assign({}, examStore);
    const entry = Object.assign({}, out[key]);
    const list = Array.isArray(entry.attempts) ? entry.attempts.slice() : [];
    list.push(attempt);
    entry.attempts = list.slice(-(max || EXAM_MAX_ATTEMPTS));
    delete entry.active;
    out[key] = entry;
    return out;
  };

  /** 某份模擬考的歷史統計。 */
  Q.examHistory = function examHistory(examStore, key) {
    const entry = (examStore || {})[key] || {};
    const attempts = Array.isArray(entry.attempts) ? entry.attempts.filter((a) => a && typeof a === "object") : [];
    let best = null;
    for (const a of attempts) if (!best || (a.pct || 0) > (best.pct || 0)) best = a;
    return { attempts, best, last: attempts[attempts.length - 1] || null, active: entry.active || null };
  };

  /** 一次模擬考的狀態（作答、標記、計時），不依賴 DOM。 */
  class ExamSession {
    constructor(key, questions, minutes, saved) {
      this.key = key;
      this.questions = questions.slice();
      this.minutes = minutes;
      const s = saved && typeof saved === "object" ? saved : null;
      this.state = {
        startedAt: s && typeof s.startedAt === "number" ? s.startedAt : null,
        minutes: s && s.minutes ? s.minutes : minutes,
        answers: Object.assign({}, s && s.answers),
        flags: Object.assign({}, s && s.flags),
        cur: s && Number.isInteger(s.cur) ? Math.min(Math.max(0, s.cur), questions.length - 1) : 0,
      };
      // 題庫更新後，只保留仍存在的題目
      const ids = new Set(this.questions.map((q) => q.id));
      for (const m of [this.state.answers, this.state.flags]) for (const id of Object.keys(m)) if (!ids.has(id)) delete m[id];
      this.finished = null;
    }
    get started() { return this.state.startedAt != null; }
    get deadline() { return this.state.startedAt + this.state.minutes * 60000; }
    start(now) {
      this.state = { startedAt: now, minutes: this.minutes, answers: {}, flags: {}, cur: 0 };
      this.finished = null;
    }
    remaining(now) { return this.started ? Q.examRemaining(this.state.startedAt, this.state.minutes, now) : this.minutes * 60000; }
    isExpired(now) { return this.started && now >= this.deadline; }
    setAnswer(id, v) {
      if (this.finished) return;
      if (Q.isAnswered(v)) this.state.answers[id] = v;
      else delete this.state.answers[id];
    }
    getAnswer(id) { return this.state.answers[id]; }
    toggleFlag(id) {
      if (this.finished) return false;
      if (this.state.flags[id]) delete this.state.flags[id];
      else this.state.flags[id] = true;
      return !!this.state.flags[id];
    }
    isFlagged(id) { return !!this.state.flags[id]; }
    answeredCount() { return this.questions.filter((q) => Q.isAnswered(this.state.answers[q.id])).length; }
    flaggedCount() { return this.questions.filter((q) => this.state.flags[q.id]).length; }
    /** 交卷：超過時限一律視為時間到，用時以時限為上限。 */
    finish(now, timedOut) {
      if (this.finished) return this.finished;
      const expired = this.isExpired(now);
      const to = !!timedOut || expired;
      const finishedAt = expired ? this.deadline : now;
      const score = Q.examScore(this.questions, this.state.answers, this.state.flags);
      const duration = Math.max(0, Math.min(finishedAt - this.state.startedAt, this.state.minutes * 60000));
      this.finished = {
        key: this.key, score, timedOut: to, startedAt: this.state.startedAt, finishedAt, duration,
        limit: this.state.minutes * 60000,
        attempt: { score: score.right, total: score.total, pct: score.pct, date: finishedAt, duration, timeout: to },
      };
      return this.finished;
    }
  }
  Q.ExamSession = ExamSession;

  /* ---- 儲存（nq:exam 與 nq:quiz） ---- */
  const EXAM_STORE = NQ.KEYS.exam || "nq:exam";
  Q.examLoad = (key) => Q.examHistory(NQ.store.get(EXAM_STORE), key);
  Q.examSaveActive = function examSaveActive(key, state) {
    NQ.store.update(EXAM_STORE, (s) => {
      s[key] = Object.assign({}, s[key], { active: state });
    });
  };
  Q.examClearActive = function examClearActive(key) {
    NQ.store.update(EXAM_STORE, (s) => {
      if (s[key]) delete s[key].active;
    });
  };
  /** 交卷後寫入：逐題紀錄（nq:quiz）+ 作答歷史（nq:exam）。 */
  Q.examCommit = function examCommit(result, now) {
    const t = now == null ? Date.now() : now;
    NQ.store.update(NQ.KEYS.quiz, (s) => Q.examApplyQuizStore(s, result.score.results, t));
    NQ.store.update(EXAM_STORE, (s) => Q.examAddAttempt(s, result.key, result.attempt));
  };

  /* ---- 畫面 ---- */

  function formatDate(ms) {
    const d = new Date(ms);
    if (isNaN(d)) return "—";
    const p2 = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}/${p2(d.getMonth() + 1)}/${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }

  function stickyOffset() {
    const header = root.document.querySelector(".md-header");
    return header ? header.getBoundingClientRect().height : 48;
  }

  class ExamUI {
    constructor(host, key, questions, minutes) {
      this.host = host;
      this.key = key;
      this.questions = questions;
      this.minutes = minutes;
      this.title = Q.examTitle(key);
      this.navOpen = !(root.matchMedia && root.matchMedia("(max-width: 599px)").matches);
      this.timer = null;
      const hist = Q.examLoad(key);
      this.session = new ExamSession(key, questions, minutes, hist.active);
      if (this.session.started && this.session.isExpired(Date.now())) {
        // 離開期間時間已到：以儲存的作答自動交卷
        this.submit(true);
      } else {
        this.renderStart();
      }
    }

    alive() { return this.host.isConnected; }

    stopTimer() {
      if (this.timer) root.clearInterval(this.timer);
      this.timer = null;
    }

    save() { Q.examSaveActive(this.key, this.session.state); }

    scrollToHost() {
      const top = this.host.getBoundingClientRect().top;
      const off = stickyOffset() + 8;
      if (top < off || top > root.innerHeight * 0.6) root.scrollTo({ top: Math.max(0, top + root.scrollY - off), behavior: "smooth" });
    }

    /* ---------- 開始畫面 ---------- */
    renderStart() {
      this.stopTimer();
      const hist = Q.examLoad(this.key);
      const n = this.questions.length;
      const topics = new Set(this.questions.map((q) => q.topic || "其他"));
      const s = this.session;
      const now = Date.now();
      const resumable = s.started && !s.isExpired(now) && !s.finished;

      const facts = h("div", { class: "nq-exam-facts" },
        h("div", { class: "nq-stat" }, h("div", { class: "nq-stat-value", text: `${n}` }), h("div", { class: "nq-stat-label", text: "題" })),
        h("div", { class: "nq-stat" }, h("div", { class: "nq-stat-value", text: `${this.minutes}` }), h("div", { class: "nq-stat-label", text: "分鐘" })),
        h("div", { class: "nq-stat" }, h("div", { class: "nq-stat-value", text: `${topics.size}` }), h("div", { class: "nq-stat-label", text: "個主題" })),
        h("div", { class: "nq-stat" },
          h("div", { class: "nq-stat-value", text: hist.best ? `${hist.best.score}/${hist.best.total}` : "—" }),
          h("div", { class: "nq-stat-label", text: "最佳成績" })));

      const rules = h("ul", { class: "nq-exam-rules" },
        h("li", { text: `共 ${n} 題、限時 ${this.minutes} 分鐘，由易到難排列；倒數計時一直顯示在畫面上方。` }),
        h("li", { text: "作答期間不顯示對錯；交卷後才看到總分、各主題得分與每一題的解析。" }),
        h("li", { text: "可以跳題，也可以「標記」沒把握的題目，隨時用題號表回到任一題修改答案。" }),
        h("li", { text: "時間到會自動交卷；未作答的題目算錯。離開頁面計時不會暫停，回到本頁（同一台裝置）可繼續作答。" }),
        h("li", { text: "建議模擬真實情境：只用紙筆、不用計算機，數字可以心算近似（題目的容許誤差已考慮常用近似）。" }),
        h("li", { text: "交卷後每一題的對錯會記入作答紀錄，答錯與未答的題目會出現在「錯題複習」。" }));

      const actions = h("div", { class: "nq-actions" });
      if (resumable) {
        actions.append(
          h("button", { type: "button", class: "nq-btn nq-primary", text: `繼續作答（剩 ${Q.formatClock(s.remaining(now), true)}）`, onclick: () => this.resume() }),
          h("button", {
            type: "button", class: "nq-btn nq-danger", text: "放棄並重新開始",
            onclick: () => {
              if (root.confirm && !root.confirm("確定放棄目前的作答並重新開始？這次作答不會記錄。")) return;
              this.begin();
            },
          }));
      } else {
        actions.append(h("button", { type: "button", class: "nq-btn nq-primary nq-start", text: `開始考試（${this.minutes} 分鐘）`, onclick: () => this.begin() }));
      }

      let history = null;
      if (hist.attempts.length) {
        const rows = hist.attempts.slice().reverse().slice(0, 10).map((a) =>
          h("tr", {},
            h("td", { text: formatDate(a.date) }),
            h("td", { class: "nq-num-cell", text: `${a.score} / ${a.total}` }),
            h("td", { class: "nq-num-cell", text: `${Math.round(a.pct)}%` }),
            h("td", { class: "nq-num-cell", text: Q.formatClock(a.duration) + (a.timeout ? "（時間到）" : "") })));
        history = h("div", { class: "nq-exam-history" },
          h("div", { class: "nq-section-title", text: `作答紀錄（共 ${hist.attempts.length} 次${hist.attempts.length > 10 ? "，顯示最近 10 次" : ""}）` }),
          h("div", { class: "nq-table-wrap" },
            h("table", { class: "nq-exam-table" },
              h("thead", {}, h("tr", {}, h("th", { text: "日期" }), h("th", { text: "得分" }), h("th", { text: "正確率" }), h("th", { text: "用時" }))),
              h("tbody", {}, rows))));
      }

      const card = h("div", { class: "nq-card nq-exam-start" },
        h("div", { class: "nq-exam-title" }, h("span", { text: this.title }), h("span", { class: "nq-badge", text: "自編模擬考・非官方試題" })),
        facts, rules, actions, history);
      this.host.replaceChildren(card);
    }

    begin() {
      this.session.start(Date.now());
      this.save();
      this.resume();
    }

    resume() {
      this.renderExam();
      this.stopTimer();
      this.timer = root.setInterval(() => this.tick(), 1000);
      this.tick();
      this.scrollToHost();
    }

    tick() {
      if (!this.alive()) { this.stopTimer(); return; }
      const now = Date.now();
      if (this.session.isExpired(now)) { this.submit(true); return; }
      const rem = this.session.remaining(now);
      if (this.clockEl) {
        this.clockEl.textContent = Q.formatClock(rem, true);
        this.barEl.classList.toggle("is-warn", rem <= 5 * 60000 && rem > 60000);
        this.barEl.classList.toggle("is-danger", rem <= 60000);
      }
    }

    /* ---------- 作答畫面 ---------- */
    renderExam() {
      const s = this.session;
      this.clockEl = h("span", { class: "nq-exam-clock", role: "timer", "aria-label": "剩餘時間", text: Q.formatClock(s.remaining(Date.now()), true) });
      this.progressEl = h("span", { class: "nq-exam-progress" });
      this.navBtn = h("button", {
        type: "button", class: "nq-btn nq-small", "aria-expanded": String(this.navOpen), text: "題號",
        onclick: () => { this.navOpen = !this.navOpen; this.syncNav(); },
      });
      this.barEl = h("div", { class: "nq-exam-bar" },
        h("span", { class: "nq-exam-clock-wrap" }, h("span", { class: "nq-exam-clock-icon", "aria-hidden": "true", text: "⏱" }), this.clockEl),
        this.progressEl,
        h("span", { class: "nq-exam-bar-tools" },
          this.navBtn,
          h("button", { type: "button", class: "nq-btn nq-small nq-primary", text: "交卷", onclick: () => this.confirmSubmit() })));

      this.navCells = this.questions.map((q, i) => h("button", {
        type: "button", class: "nq-exam-cell", "aria-label": `第 ${i + 1} 題`, text: String(i + 1),
        onclick: () => this.go(i),
      }));
      this.navEl = h("div", { class: "nq-exam-nav" },
        h("div", { class: "nq-exam-grid" }, this.navCells),
        h("div", { class: "nq-exam-legend" },
          h("span", { class: "nq-exam-key is-answered", text: "已答" }),
          h("span", { class: "nq-exam-key is-flagged", text: "標記" }),
          h("span", { class: "nq-exam-key is-current", text: "目前" })));

      this.qHost = h("div", { class: "nq-exam-q" });
      this.confirmEl = h("div", { class: "nq-exam-confirm", hidden: true });
      this.host.replaceChildren(h("div", { class: "nq-exam" }, this.barEl, this.navEl, this.confirmEl, this.qHost));
      this.renderQuestion();
    }

    syncNav() {
      const s = this.session;
      this.navEl.hidden = !this.navOpen;
      this.navBtn.setAttribute("aria-expanded", String(this.navOpen));
      this.navBtn.textContent = this.navOpen ? "收起題號" : "題號";
      this.questions.forEach((q, i) => {
        const c = this.navCells[i];
        c.classList.toggle("is-answered", Q.isAnswered(s.getAnswer(q.id)));
        c.classList.toggle("is-flagged", s.isFlagged(q.id));
        c.classList.toggle("is-current", i === s.state.cur);
        if (i === s.state.cur) c.setAttribute("aria-current", "true"); else c.removeAttribute("aria-current");
      });
      const a = s.answeredCount(), f = s.flaggedCount();
      this.progressEl.textContent = `已答 ${a}/${this.questions.length}` + (f ? ` · 標記 ${f}` : "");
    }

    go(i) {
      const s = this.session;
      s.state.cur = Math.max(0, Math.min(this.questions.length - 1, i));
      this.save();
      this.confirmEl.hidden = true;
      this.renderQuestion();
      const top = this.qHost.getBoundingClientRect().top;
      const off = stickyOffset() + this.barEl.getBoundingClientRect().height + 8;
      if (top < off || top > root.innerHeight * 0.5) root.scrollTo({ top: Math.max(0, top + root.scrollY - off), behavior: "smooth" });
    }

    renderQuestion() {
      const s = this.session;
      const i = s.state.cur;
      const q = this.questions[i];
      const n = this.questions.length;
      const flagBtn = h("button", {
        type: "button", class: "nq-btn nq-small nq-exam-flag", "aria-pressed": String(s.isFlagged(q.id)),
        text: s.isFlagged(q.id) ? "⚑ 已標記" : "⚐ 標記",
        onclick: () => {
          const on = s.toggleFlag(q.id);
          flagBtn.setAttribute("aria-pressed", String(on));
          flagBtn.textContent = on ? "⚑ 已標記" : "⚐ 標記";
          this.save();
          this.syncNav();
        },
      });
      const meta = h("div", { class: "nq-exam-meta" },
        h("span", { class: "nq-count", text: `第 ${i + 1} / ${n} 題` }),
        h("span", { class: "nq-meta", text: [q.topic, TYPE_LABEL[q.type]].filter(Boolean).join(" · ") }),
        flagBtn);
      const isLast = i + 1 >= n;
      const nav = h("div", { class: "nq-actions nq-exam-step" },
        h("button", { type: "button", class: "nq-btn", text: "← 上一題", disabled: i === 0, onclick: () => this.go(i - 1) }),
        isLast
          ? h("button", { type: "button", class: "nq-btn nq-primary", text: "檢查並交卷", onclick: () => this.confirmSubmit() })
          : h("button", { type: "button", class: "nq-btn nq-primary", text: "下一題 →", onclick: () => this.go(i + 1) }));
      const card = h("div", { class: "nq-card nq-exam-card" }, meta,
        h("div", { class: "nq-q", html: NQ.richText(q.q) }),
        this.answerArea(q, () => (isLast ? null : this.go(i + 1))), nav);
      this.qHost.replaceChildren(card);
      NQ.renderMath(card);
      this.syncNav();
    }

    answerArea(q, onEnter) {
      const s = this.session;
      const cur = s.getAnswer(q.id);
      if (q.type === "mc" || q.type === "tf") {
        const opts = q.type === "mc"
          ? (q.choices || []).map((c, idx) => [String.fromCharCode(65 + idx), String.fromCharCode(65 + idx), c, true])
          : [[true, "○", "對", false], [false, "✕", "錯", false]];
        const btns = opts.map(([v, key, label, rich]) => h("button", {
          type: "button", class: `nq-opt${q.type === "tf" ? " nq-opt-tf" : ""}`, "aria-pressed": String(Q.isAnswered(cur) && String(cur) === String(v)),
          dataset: { value: String(v) },
          onclick: () => {
            const was = String(s.getAnswer(q.id)) === String(v) && Q.isAnswered(s.getAnswer(q.id));
            s.setAnswer(q.id, was ? null : v); // 再點一次取消
            btns.forEach((b) => b.setAttribute("aria-pressed", String(!was && b.dataset.value === String(v))));
            this.save();
            this.syncNav();
          },
        }, h("span", { class: "nq-opt-key", text: key }),
        rich ? h("span", { class: "nq-opt-text", html: NQ.richText(label) }) : h("span", { class: "nq-opt-text", text: label }),
        h("span", { class: "nq-opt-mark", "aria-hidden": "true" })));
        return h("div", { class: `nq-opts${q.type === "tf" ? " nq-opts-tf" : ""} nq-exam-opts` }, btns,
          h("div", { class: "nq-exam-hint", text: "再點一次可取消作答。" }));
      }
      // num：輸入可解析的數字就自動儲存
      const input = h("input", {
        type: "text", inputmode: "decimal", class: "nq-input", autocomplete: "off", autocorrect: "off",
        autocapitalize: "off", spellcheck: "false", enterkeyhint: "next", placeholder: "輸入數字", "aria-label": "你的答案",
      });
      input.value = Q.isAnswered(cur) ? String(cur) : "";
      const hint = h("div", { class: "nq-hint", hidden: true, text: "無法辨識的數字，這題目前算未作答（可含逗號、負號、%）" });
      const status = h("div", { class: "nq-exam-saved", text: Q.isAnswered(cur) ? "已儲存" : "" });
      const commit = () => {
        const v = input.value.trim();
        const ok = v !== "" && !isNaN(Q.parseNumber(v));
        hint.hidden = v === "" || ok;
        input.classList.toggle("nq-invalid", v !== "" && !ok);
        s.setAnswer(q.id, ok ? v : null);
        status.textContent = ok ? "已儲存" : "";
        this.save();
        this.syncNav();
      };
      input.addEventListener("input", commit);
      const sign = h("button", {
        type: "button", class: "nq-btn nq-sign", "aria-label": "切換正負號", text: "±",
        onclick: () => {
          const v = input.value.trim();
          input.value = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, "") : "-" + v;
          commit();
        },
      });
      const form = h("form", {
        class: "nq-num", novalidate: true, autocomplete: "off",
        onsubmit: (e) => { e.preventDefault(); commit(); input.blur(); if (onEnter) onEnter(); },
      }, sign, input);
      return h("div", { class: "nq-num-wrap" }, form, hint,
        h("div", { class: "nq-exam-numfoot" },
          q.tol ? h("span", { class: "nq-tol", text: `容許誤差 ±${q.tol}` }) : h("span", { class: "nq-tol", text: "需完全正確" }),
          status));
    }

    confirmSubmit() {
      const s = this.session;
      const un = this.questions.length - s.answeredCount();
      const fl = s.flaggedCount();
      const firstUn = this.questions.findIndex((q) => !Q.isAnswered(s.getAnswer(q.id)));
      const firstFl = this.questions.findIndex((q) => s.isFlagged(q.id));
      this.confirmEl.replaceChildren(
        h("div", { class: "nq-exam-confirm-msg" },
          h("b", { text: "確定交卷？" }),
          " ", un ? `還有 ${un} 題未作答（算錯）` : "所有題目都已作答", fl ? `，${fl} 題已標記。` : "。"),
        h("div", { class: "nq-actions" },
          h("button", { type: "button", class: "nq-btn nq-primary", text: "確定交卷", onclick: () => this.submit(false) }),
          h("button", { type: "button", class: "nq-btn", text: "繼續作答", onclick: () => { this.confirmEl.hidden = true; } }),
          firstUn >= 0 ? h("button", { type: "button", class: "nq-btn", text: `跳到第一題未答（第 ${firstUn + 1} 題）`, onclick: () => this.go(firstUn) }) : null,
          firstFl >= 0 ? h("button", { type: "button", class: "nq-btn", text: `跳到第一題標記（第 ${firstFl + 1} 題）`, onclick: () => this.go(firstFl) }) : null));
      this.confirmEl.hidden = false;
      const top = this.confirmEl.getBoundingClientRect().top;
      const off = stickyOffset() + this.barEl.getBoundingClientRect().height + 8;
      if (top < off || top > root.innerHeight * 0.7) root.scrollTo({ top: Math.max(0, top + root.scrollY - off), behavior: "smooth" });
    }

    submit(timedOut) {
      this.stopTimer();
      const result = this.session.finish(Date.now(), timedOut);
      Q.examCommit(result, Date.now());
      this.renderResult(result);
    }

    /* ---------- 結果畫面 ---------- */
    renderResult(res) {
      const sc = res.score;
      const topics = sc.byTopic.slice().sort((a, b) => (a.acc - b.acc) || (b.total - a.total));
      const topicRows = topics.map((t) => h("div", { class: `nq-topic-row${t.acc < 0.6 ? " is-weak" : ""}` },
        h("span", { class: "nq-topic-name", text: t.topic }),
        h("span", { class: "nq-mini nq-topic-bar" }, h("span", { class: "nq-mini-ok", style: `width:${(t.acc || 0) * 100}%` })),
        h("span", { class: "nq-topic-num", text: `${t.right}/${t.total}` }),
        h("span", { class: "nq-topic-pct", text: NQ.pct(t.acc) })));

      const wrong = sc.results.filter((r) => !r.correct);
      const flagged = sc.results.filter((r) => r.flagged);
      const reviewHost = h("div", { class: "nq-exam-review-list" });
      const filters = [["all", `全部（${sc.total}）`, sc.results], ["wrong", `答錯與未答（${wrong.length}）`, wrong], ["flag", `已標記（${flagged.length}）`, flagged]];
      const segBtns = filters.map(([k, label, list]) => h("button", {
        type: "button", class: "nq-seg-btn", "aria-pressed": String(k === (wrong.length ? "wrong" : "all")), text: label,
        onclick: () => { segBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(filters[i][0] === k))); showList(list); },
      }));
      const showList = (list) => {
        reviewHost.replaceChildren(...(list.length ? list.map((r) => this.reviewItem(r)) : [h("p", { class: "nq-setup-help", text: "沒有符合的題目。" })]));
        NQ.renderMath(reviewHost);
      };

      const card = h("div", { class: "nq-card nq-end nq-exam-result" },
        h("div", { class: "nq-exam-title" }, h("span", { text: `${this.title}・成績` }), h("span", { class: "nq-badge", text: "自編模擬考・非官方試題" })),
        h("div", { class: "nq-end-score" },
          h("span", { class: "nq-end-big", text: `${sc.right} / ${sc.total}` }),
          h("span", { class: "nq-end-pct", text: `${Math.round(sc.pct)}%` })),
        h("div", { class: "nq-bar nq-bar-score" }, h("span", { style: `width:${sc.total ? (sc.right / sc.total) * 100 : 0}%` })),
        h("p", { class: "nq-exam-time" },
          `用時 ${Q.formatClock(res.duration)} / ${Q.formatClock(res.limit)}`,
          ` · 作答 ${sc.answered} 題、未答 ${sc.total - sc.answered} 題`,
          res.timedOut ? h("span", { class: "nq-exam-timeout", text: " · 時間到自動交卷" }) : null),
        h("p", { class: "nq-end-msg", text: Q.scoreMessage(sc.right, sc.total) }),
        h("div", { class: "nq-setup-sec" },
          h("div", { class: "nq-section-title", text: "各主題得分（由弱到強）" }),
          h("div", { class: "nq-topic-table" }, topicRows)),
        h("div", { class: "nq-actions" },
          h("button", { type: "button", class: "nq-btn nq-primary", text: "回到考試首頁", onclick: () => { this.renderStart(); this.scrollToHost(); } }),
          h("a", { class: "nq-btn", href: NQ.url("quiz/#review"), text: "到錯題複習" })),
        h("div", { class: "nq-exam-review" },
          h("div", { class: "nq-section-title", text: "逐題檢討" }),
          h("div", { class: "nq-seg", role: "group", "aria-label": "篩選題目" }, segBtns),
          reviewHost));
      this.host.replaceChildren(card);
      showList(wrong.length ? wrong : sc.results);
      NQ.renderMath(card);
      this.scrollToHost();
    }

    reviewItem(r) {
      const q = r.q;
      const status = r.correct ? ["is-right", "✓ 答對"] : r.answered ? ["is-wrong", "✗ 答錯"] : ["is-skip", "— 未作答"];
      return h("div", { class: `nq-missed-item nq-exam-item ${status[0]}` },
        h("div", { class: "nq-exam-item-head" },
          h("span", { class: "nq-count", text: `第 ${r.idx + 1} 題` }),
          h("span", { class: "nq-meta", text: [q.topic, TYPE_LABEL[q.type]].filter(Boolean).join(" · ") }),
          r.flagged ? h("span", { class: "nq-exam-flagmark", text: "⚑" }) : null,
          h("span", { class: "nq-exam-status", text: status[1] })),
        h("div", { class: "nq-q", html: NQ.richText(q.q) }),
        h("div", { class: `nq-fb-row ${r.correct ? "nq-right-text" : "nq-wrong-text"}` }, h("b", { text: "你的答案：" }),
          h("span", { html: r.answered ? NQ.richText(Q.formatAnswer(q, r.given)) : "（未作答）" })),
        r.correct ? null : h("div", { class: "nq-fb-row nq-right-text" }, h("b", { text: "正解：" }), h("span", { html: NQ.richText(Q.formatAnswer(q, q.answer)) })),
        q.explain ? h("div", { class: "nq-fb-explain" }, h("b", { text: "解析：" }), h("span", { html: NQ.richText(q.explain) })) : null);
    }
  }
  Q.ExamUI = ExamUI;

  async function mountExam(host) {
    const key = String(host.dataset.chapters || "").split(/[,\s]+/).filter(Boolean)[0];
    const minutes = Math.max(1, Number(host.dataset.minutes) || 60);
    loading(host);
    let bank;
    try {
      bank = await NQ.loadBank();
    } catch (e) {
      showError(host, "題庫載入失敗，請檢查網路後重新整理。");
      return;
    }
    const questions = ((bank && bank[key]) || []).map((q) => Object.assign({ chapter: key }, q));
    if (!questions.length) {
      showError(host, "找不到這份模擬考的題庫。");
      return;
    }
    new ExamUI(host, key, questions, minutes);
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
      titles: titleMap(chapters, bank),
      chapterURLs: Object.fromEntries((chapters || []).map(c => [c.key, c.url])),
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
    const titles = titleMap(chapters, bank);
    const order = (chapters || []).map((c) => c.key).filter((k) => bank[k]);
    for (const k of Object.keys(bank)) if (!order.includes(k)) order.push(k);

    // 模擬考題預設不選（避免考前先看到題目）；考過之後才預設納入，讓錯題出現在複習裡
    const store0 = NQ.store.get(NQ.KEYS.quiz);
    const examTouched = (k) => (bank[k] || []).some((q) => store0[q.id] && store0[q.id].seen > 0);
    const wantReview = /review/i.test(root.location.hash || "");
    const requested = new URLSearchParams(root.location.search).get("chapter");
    const state = lastPick
      ? { selected: new Set(lastPick.selected), count: lastPick.count, review: wantReview || lastPick.review }
      : { selected: new Set(order.filter((k) => wantReview ? !Q.isExamKey(k) || examTouched(k) : /^ch\d+$/.test(k))), count: 20, review: wantReview };
    if (requested && order.includes(requested)) {
      state.selected = new Set([requested]);
      state.review = wantReview;
    } else if (wantReview) {
      state.selected = new Set(order.filter(k => !Q.isExamKey(k) || examTouched(k)));
      state.review = true;
    }

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
          chapterURLs: Object.fromEntries((chapters || []).map(c => [c.key, c.url])),
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
      else if (host.dataset.mode === "exam") mountExam(host);
      else mountChapter(host);
    });
  }

  NQ.onPage(mountAll);
})(typeof window !== "undefined" ? window : globalThis);
