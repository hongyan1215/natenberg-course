/* nq-game.js — 遊戲化：經驗值（XP）與交易員階級、連續學習天數、每日任務、成就、關卡地圖、章節任務簡報與 Boss 戰。
 * 依賴 nq-common.js（window.NQ）。XP 大多由既有的進度紀錄（nq:quiz、nq:check…）推算，所以匯入／匯出進度後依然正確；
 * 遊戲自己的狀態（Boss、每日任務、成就解鎖時間）存在 "nq:game"。 */
(function (root) {
  "use strict";
  const NQ = root.NQ;
  if (!NQ) return;
  const G = (NQ.game = NQ.game || {});
  const h = (...a) => NQ.h(...a);
  const GAME = "nq:game";
  const WATCH = ["nq:quiz", "nq:check", "nq:visited", "nq:exam", "nq:drills", "nq:mm"];

  /* ====================== 純函式（Node 可測） ====================== */

  G.XP = Object.freeze({ right: 10, wrong: 2, rightCap: 3, check: 15, visit: 5, drill: 20, mm: 40, exam: 50, boss: 100, daily: 50 });

  G.RANKS = Object.freeze([
    [1, "實習生", "Intern"],
    [3, "初級交易員", "Junior Trader"],
    [5, "造市交易員", "Market Maker"],
    [8, "資深交易員", "Senior Trader"],
    [12, "波動率交易員", "Vol Trader"],
    [16, "波動率主管", "Head of Vol"],
    [20, "交易台傳奇", "Desk Legend"],
  ]);

  /** 升到第 n 級需要的累積 XP：0, 100, 300, 600, 1000…（每級多 100）。 */
  G.levelXP = (n) => 50 * (n - 1) * n;

  G.levelInfo = function levelInfo(xp) {
    let lv = 1;
    while (G.levelXP(lv + 1) <= xp) lv++;
    const base = G.levelXP(lv), next = G.levelXP(lv + 1);
    let rank = G.RANKS[0];
    for (const r of G.RANKS) if (lv >= r[0]) rank = r;
    return { level: lv, xp, base, next, into: xp - base, need: next - base, frac: (xp - base) / (next - base), rank: rank[1], rankEn: rank[2] };
  };

  const len = (v) => (Array.isArray(v) ? v.length : 0);
  const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

  /** 從各種紀錄算出 XP 明細。stores: { quiz, check, visited, exam, drills, mm, game }。 */
  G.computeXP = function computeXP(stores) {
    const X = G.XP, s = stores || {};
    const out = { quiz: 0, check: 0, visit: 0, drill: 0, mm: 0, exam: 0, boss: 0, daily: 0 };
    for (const r of Object.values(obj(s.quiz))) {
      if (!r || !(r.seen > 0)) continue;
      const right = Math.max(0, r.right || 0);
      out.quiz += Math.min(right, X.rightCap) * X.right + Math.min(Math.max(0, r.seen - right), X.rightCap) * X.wrong;
    }
    for (const e of Object.values(obj(s.check))) {
      for (const [k, v] of Object.entries(obj(e))) if (k !== "_total" && v === true) out.check += X.check;
    }
    out.visit = Object.keys(obj(s.visited)).length * X.visit;
    for (const d of Object.values(obj(s.drills))) out.drill += len(obj(d).history) * X.drill;
    out.mm = len(obj(s.mm).sessions) * X.mm;
    for (const e of Object.values(obj(s.exam))) {
      for (const a of obj(e).attempts || []) out.exam += X.exam + Math.round(50 * Math.max(0, Math.min(1, Number(a && a.pct) || 0)));
    }
    const g = obj(s.game);
    out.boss = Object.values(obj(g.boss)).filter((b) => b && b.won).length * X.boss;
    out.daily = len(g.dailyDone) * X.daily;
    out.total = Object.values(out).reduce((a, b) => a + b, 0);
    return out;
  };

  G.dayKey = function dayKey(t) {
    const d = new Date(t == null ? Date.now() : t);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  /** 連續學習天數：從今天（或昨天，今天還沒學也不斷）往回數。 */
  G.streak = function streak(days, today) {
    const set = new Set(days || []);
    const t = new Date(`${today || G.dayKey()}T12:00:00`);
    let n = 0;
    if (!set.has(G.dayKey(t))) t.setDate(t.getDate() - 1);
    while (set.has(G.dayKey(t))) { n++; t.setDate(t.getDate() - 1); }
    return n;
  };

  /** 章節星等：★ 讀過、★ 打倒 Boss、★ 題庫全部作答且最近一次正確 ≥ 80%。 */
  G.stars = function stars(chapter, questions, stores) {
    const s = stores || {};
    const st = NQ.quizStats(questions || [], s.quiz || {});
    const boss = obj(obj(s.game).boss)[chapter.key];
    return {
      read: !!obj(s.visited)[chapter.url],
      boss: !!(boss && boss.won),
      quiz: st.total > 0 && st.answered === st.total && st.ok / st.total >= 0.8,
      get count() { return (this.read ? 1 : 0) + (this.boss ? 1 : 0) + (this.quiz ? 1 : 0); },
    };
  };

  G.DAILY = Object.freeze([
    { id: "answer", icon: "📝", text: "作答 5 題", goal: 5, of: (d) => d.answered || 0 },
    { id: "right", icon: "🎯", text: "答對 3 題", goal: 3, of: (d) => d.right || 0 },
    { id: "read", icon: "📖", text: "打開 1 個章節", goal: 1, of: (d) => len(d.pages) },
    { id: "train", icon: "⚡", text: "完成 1 次心算、模擬或 Boss 戰", goal: 1, of: (d) => d.train || 0 },
  ]);

  /** 成就：test(ctx) → 是否解鎖。ctx 由 G.context() 產生。 */
  G.ACHIEVEMENTS = Object.freeze([
    { id: "first", icon: "🐣", name: "第一筆交易", desc: "作答第 1 題", test: (c) => c.answered >= 1 },
    { id: "q50", icon: "📈", name: "穩定成交", desc: "累計作答 50 題", test: (c) => c.answered >= 50 },
    { id: "q200", icon: "🏦", name: "交易量王", desc: "累計作答 200 題", test: (c) => c.answered >= 200 },
    { id: "combo5", icon: "🔥", name: "手感發燙", desc: "連續答對 5 題", test: (c) => c.bestCombo >= 5 },
    { id: "combo12", icon: "☄️", name: "無人能擋", desc: "連續答對 12 題", test: (c) => c.bestCombo >= 12 },
    { id: "streak3", icon: "📅", name: "三日不輟", desc: "連續學習 3 天", test: (c) => c.bestStreak >= 3 },
    { id: "streak7", icon: "🗓️", name: "一週紀律", desc: "連續學習 7 天", test: (c) => c.bestStreak >= 7 },
    { id: "streak30", icon: "🏆", name: "月度風雲人物", desc: "連續學習 30 天", test: (c) => c.bestStreak >= 30 },
    { id: "boss1", icon: "⚔️", name: "初次擊敗 Boss", desc: "打倒任一章 Boss", test: (c) => c.bosses >= 1 },
    { id: "boss10", icon: "🛡️", name: "Boss 獵人", desc: "打倒 10 個 Boss", test: (c) => c.bosses >= 10 },
    { id: "star3", icon: "⭐", name: "完美通關", desc: "任一章拿到 3 顆星", test: (c) => c.threeStar >= 1 },
    { id: "star10", icon: "🌟", name: "星光大道", desc: "10 章拿到 3 顆星", test: (c) => c.threeStar >= 10 },
    { id: "check", icon: "✅", name: "自我檢核達人", desc: "勾滿一章的自我檢核清單", test: (c) => c.fullChecklists >= 1 },
    { id: "drill", icon: "🧮", name: "心算熱身", desc: "完成 1 次心算速練", test: (c) => c.drills >= 1 },
    { id: "mm", icon: "🤝", name: "第一次報價", desc: "完成 1 局模擬造市", test: (c) => c.mm >= 1 },
    { id: "exam", icon: "🎓", name: "上考場", desc: "完成 1 次模擬考", test: (c) => c.exams >= 1 },
    { id: "daily", icon: "🌅", name: "每日任務完成", desc: "完成一天的全部每日任務", test: (c) => c.dailyDone >= 1 },
    { id: "lv5", icon: "💼", name: "正式上台", desc: "升到 Market Maker（Lv 5）", test: (c) => c.level >= 5 },
  ]);

  G.context = function context(stores, chapters, bank) {
    const s = stores || {}, g = obj(s.game);
    const all = NQ.quizStats([].concat(...Object.values(obj(bank))), s.quiz || {});
    let answered = 0;
    for (const r of Object.values(obj(s.quiz))) if (r && r.seen > 0) answered++;
    let threeStar = 0;
    for (const c of chapters || []) if (G.stars(c, obj(bank)[c.key], s).count === 3) threeStar++;
    let fullChecklists = 0;
    for (const e of Object.values(obj(s.check))) {
      const total = Number(obj(e)._total) || 0;
      if (total && Object.keys(e).filter((k) => k !== "_total" && e[k] === true).length >= total) fullChecklists++;
    }
    let drills = 0;
    for (const d of Object.values(obj(s.drills))) drills += len(obj(d).history);
    let exams = 0;
    for (const e of Object.values(obj(s.exam))) exams += len(obj(e).attempts);
    const xp = G.computeXP(s).total;
    return {
      answered: Math.max(answered, all.answered), bestCombo: g.bestCombo || 0,
      bestStreak: Math.max(g.bestStreak || 0, G.streak(g.days)),
      bosses: Object.values(obj(g.boss)).filter((b) => b && b.won).length,
      threeStar, fullChecklists, drills, mm: len(obj(s.mm).sessions), exams,
      dailyDone: len(g.dailyDone), level: G.levelInfo(xp).level, xp,
    };
  };

  /* ====================== 瀏覽器：狀態 ====================== */
  if (!root.document) return;

  function rawGet(k) {
    try { const v = JSON.parse(root.localStorage.getItem(k)); return v == null ? null : v; } catch (e) { return null; }
  }
  const stores = () => ({
    quiz: NQ.store.get("nq:quiz"), check: NQ.store.get("nq:check"), visited: NQ.store.get("nq:visited"),
    exam: NQ.store.get("nq:exam"), drills: obj(rawGet("nq:drills")), mm: obj(rawGet("nq:mm")), game: NQ.store.get(GAME),
  });
  const gameUpdate = (fn) => NQ.store.update(GAME, fn);

  function today(g) {
    const d = G.dayKey();
    if (!g.daily || g.daily.date !== d) g.daily = { date: d, answered: 0, right: 0, pages: [], train: 0 };
    return g.daily;
  }

  /** 記錄今天有學習；更新連續天數紀錄。 */
  function markActive(g) {
    const d = G.dayKey();
    g.days = Array.isArray(g.days) ? g.days : [];
    if (!g.days.includes(d)) g.days = g.days.concat(d).slice(-400);
    g.bestStreak = Math.max(g.bestStreak || 0, G.streak(g.days));
  }

  /* ---------- 監聽所有進度寫入 ---------- */
  let combo = 0;
  let lastXP = null, lastLevel = null;
  let ctxCache = { chapters: [], bank: {} };

  const origSet = NQ.store.set;
  NQ.store.set = function set(key, value) {
    const watched = WATCH.includes(key);
    const before = watched ? (key === "nq:drills" || key === "nq:mm" ? obj(rawGet(key)) : NQ.store.get(key)) : null;
    const ok = origSet.call(NQ.store, key, value);
    if (watched) {
      try { onProgress(key, before, obj(value)); } catch (e) { if (root.console) root.console.error("[NQ game]", e); }
    }
    return ok;
  };

  function onProgress(key, before, after) {
    const evts = [];
    gameUpdate((g) => {
      const d = today(g);
      if (key === "nq:quiz") {
        let n = 0, right = 0, wrong = 0;
        for (const [id, r] of Object.entries(after)) {
          const o = before[id] || {};
          if ((r && r.seen || 0) > (o.seen || 0)) {
            n++;
            if ((r.right || 0) > (o.right || 0)) right++; else wrong++;
          }
        }
        if (!n) return;
        d.answered += n; d.right += right;
        if (n === 1) {
          combo = right ? combo + 1 : 0;
          g.bestCombo = Math.max(g.bestCombo || 0, combo);
          if (right && combo >= 3) evts.push(["combo", combo]);
          else if (!right) evts.push(["miss"]);
        }
      } else if (key === "nq:visited") {
        const p = NQ.pagePath();
        if (/^(lessons|prep)\//.test(p) && !d.pages.includes(p)) d.pages.push(p);
      } else if (key === "nq:drills" || key === "nq:mm") {
        const count = (v) => key === "nq:mm" ? len(v.sessions) : Object.values(v).reduce((a, x) => a + len(obj(x).history), 0);
        if (count(after) > count(before)) d.train++;
      }
      markActive(g);
      if (!(g.dailyDone || []).includes(d.date) && G.DAILY.every((q) => q.of(d) >= q.goal)) {
        g.dailyDone = (g.dailyDone || []).concat(d.date).slice(-400);
        evts.push(["daily"]);
      }
    });
    for (const e of evts) {
      if (e[0] === "combo") toast(`🔥 Combo ×${e[1]}`, "combo");
      if (e[0] === "miss") sfx("miss");
      if (e[0] === "daily") toast(`🌅 每日任務全部完成！+${G.XP.daily} XP`, "gold");
    }
    refresh(true);
  }

  /* ====================== 回饋：toast、音效、彩帶 ====================== */

  function toastHost() {
    let el = root.document.querySelector(".nqg-toasts");
    if (!el) { el = h("div", { class: "nqg-toasts", "aria-live": "polite" }); root.document.body.append(el); }
    return el;
  }
  function toast(text, kind) {
    const t = h("div", { class: `nqg-toast${kind ? ` nqg-toast-${kind}` : ""}`, text });
    toastHost().append(t);
    setTimeout(() => t.classList.add("is-out"), 2400);
    setTimeout(() => t.remove(), 2900);
  }

  const reduceMotion = () => !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function confetti(n) {
    if (reduceMotion()) return;
    const colors = ["#ffca28", "#26a69a", "#5c6bc0", "#ef5350", "#ab47bc", "#66bb6a"];
    const box = h("div", { class: "nqg-confetti", "aria-hidden": "true" });
    for (let i = 0; i < (n || 80); i++) {
      box.append(h("i", {
        style: `left:${Math.random() * 100}%;background:${colors[i % colors.length]};` +
          `animation-delay:${Math.random() * 0.4}s;animation-duration:${1.6 + Math.random() * 1.4}s;` +
          `--dx:${(Math.random() - 0.5) * 240}px;--rot:${Math.random() * 720}deg`,
      }));
    }
    root.document.body.append(box);
    setTimeout(() => box.remove(), 3400);
  }

  let audio = null;
  function sfx(kind) {
    if (!NQ.store.get(GAME).sound) return;
    try {
      audio = audio || new (root.AudioContext || root.webkitAudioContext)();
      const notes = { xp: [880], level: [523, 659, 784, 1047], miss: [196], boss: [392, 523, 784] }[kind] || [660];
      notes.forEach((f, i) => {
        const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * 0.09;
        o.type = kind === "miss" ? "sawtooth" : "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g).connect(audio.destination);
        o.start(t); o.stop(t + 0.2);
      });
    } catch (e) { /* 不支援 Web Audio：略過 */ }
  }

  function levelUp(info) {
    confetti(120);
    sfx("level");
    const card = h("div", { class: "nqg-levelup md-typeset", role: "dialog", "aria-label": "升級" },
      h("div", { class: "nqg-levelup-kicker", text: "LEVEL UP" }),
      h("div", { class: "nqg-levelup-lv", text: `Lv ${info.level}` }),
      h("div", { class: "nqg-levelup-rank", text: `${info.rank}（${info.rankEn}）` }),
      h("button", { type: "button", class: "nq-btn nq-primary", text: "繼續", onclick: () => card.remove() }));
    root.document.body.append(card);
    setTimeout(() => card.remove(), 6000);
  }

  /* ====================== 成就與 HUD ====================== */

  function checkAchievements(s) {
    const ctx = G.context(s, ctxCache.chapters, ctxCache.bank);
    const have = obj(s.game.ach);
    const fresh = G.ACHIEVEMENTS.filter((a) => !have[a.id] && a.test(ctx));
    if (!fresh.length) return ctx;
    gameUpdate((g) => { g.ach = obj(g.ach); for (const a of fresh) g.ach[a.id] = Date.now(); });
    fresh.forEach((a, i) => setTimeout(() => { toast(`${a.icon} 解鎖成就：${a.name}`, "gold"); sfx("boss"); }, 300 + i * 700));
    return ctx;
  }

  function hudEl() {
    let el = root.document.querySelector(".nqg-hud");
    if (el) return el;
    el = h("button", { type: "button", class: "nqg-hud", title: "我的交易員檔案", onclick: openPanel },
      h("span", { class: "nqg-hud-lv" }), h("span", { class: "nqg-hud-bar" }, h("i")), h("span", { class: "nqg-hud-streak" }));
    const inner = root.document.querySelector(".md-header__inner");
    const anchor = inner && (inner.querySelector(".md-search") || inner.querySelector(".md-header__source"));
    if (anchor) anchor.before(el); else if (inner) inner.append(el); else root.document.body.append(el);
    return el;
  }

  /** 重算 XP、更新 HUD；animate=true 時顯示 +XP 與升級動畫。 */
  function refresh(animate) {
    const s = stores();
    const xp = G.computeXP(s).total;
    const info = G.levelInfo(xp);
    const el = hudEl();
    el.querySelector(".nqg-hud-lv").textContent = `Lv ${info.level}`;
    el.querySelector(".nqg-hud-bar i").style.width = `${Math.round(info.frac * 100)}%`;
    const st = G.streak(obj(s.game).days);
    el.querySelector(".nqg-hud-streak").textContent = st ? `🔥${st}` : "";
    el.setAttribute("aria-label", `等級 ${info.level} ${info.rank}，${info.into} / ${info.need} XP，連續學習 ${st} 天`);
    if (animate && lastXP != null && xp > lastXP) {
      toast(`+${xp - lastXP} XP`, "xp");
      sfx("xp");
      el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump");
    }
    if (animate && lastLevel != null && info.level > lastLevel) levelUp(info);
    lastXP = xp; lastLevel = info.level;
    checkAchievements(s);
    return { s, info };
  }

  /* ---------- 交易員檔案面板 ---------- */
  function questList(g) {
    const d = g.daily && g.daily.date === G.dayKey() ? g.daily : { answered: 0, right: 0, pages: [], train: 0 };
    return h("ul", { class: "nqg-quests" }, G.DAILY.map((q) => {
      const v = Math.min(q.of(d), q.goal), done = v >= q.goal;
      return h("li", { class: done ? "is-done" : "" },
        h("span", { class: "nqg-quest-icon", text: done ? "✅" : q.icon }),
        h("span", { class: "nqg-quest-text", text: q.text }),
        h("span", { class: "nqg-quest-num", text: `${v}/${q.goal}` }));
    }));
  }

  function openPanel() {
    const { s, info } = refresh(false);
    const g = obj(s.game), have = obj(g.ach);
    const st = G.streak(g.days);
    const close = () => dlg.remove();
    const soundBtn = h("button", {
      type: "button", class: "nq-btn", text: g.sound ? "🔊 音效：開" : "🔈 音效：關",
      onclick: () => { gameUpdate((x) => { x.sound = !x.sound; }); close(); openPanel(); },
    });
    const dlg = h("div", { class: "nqg-modal", role: "dialog", "aria-modal": "true", "aria-label": "交易員檔案", onclick: (e) => { if (e.target === dlg) close(); } },
      h("div", { class: "nqg-panel md-typeset" },
        h("button", { type: "button", class: "nqg-close", "aria-label": "關閉", text: "×", onclick: close }),
        h("div", { class: "nqg-badge-card" },
          h("div", { class: "nqg-avatar", text: info.level >= 12 ? "🦅" : info.level >= 5 ? "🧑‍💼" : "🧑‍🎓" }),
          h("div", null,
            h("div", { class: "nqg-rank", text: `Lv ${info.level} · ${info.rank}` }),
            h("div", { class: "nqg-rank-en", text: `Theta Street Trading · ${info.rankEn}` }),
            h("div", { class: "nqg-xpbar" }, h("i", { style: `width:${Math.round(info.frac * 100)}%` })),
            h("div", { class: "nqg-xptext", text: `${info.xp} XP · 距離下一級還差 ${info.next - info.xp} XP` }))),
        h("div", { class: "nqg-stats" },
          h("div", null, h("b", { text: `🔥 ${st}` }), h("span", { text: "連續天數" })),
          h("div", null, h("b", { text: `${g.bestStreak || 0}` }), h("span", { text: "最長連續" })),
          h("div", null, h("b", { text: `${g.bestCombo || 0}` }), h("span", { text: "最高 Combo" })),
          h("div", null, h("b", { text: `${Object.keys(have).length}/${G.ACHIEVEMENTS.length}` }), h("span", { text: "成就" }))),
        h("h3", { text: "今日任務" }),
        questList(g),
        h("p", { class: "nqg-muted", text: `全部完成可得 +${G.XP.daily} XP。每天午夜重置。` }),
        h("h3", { text: "成就" }),
        h("div", { class: "nqg-ach-grid" }, G.ACHIEVEMENTS.map((a) => h("div", {
          class: `nqg-ach${have[a.id] ? " is-on" : ""}`, title: a.desc,
        }, h("span", { class: "nqg-ach-icon", text: have[a.id] ? a.icon : "🔒" }), h("span", { class: "nqg-ach-name", text: a.name }), h("span", { class: "nqg-ach-desc", text: a.desc })))),
        h("h3", { text: "XP 怎麼賺" }),
        h("p", { class: "nqg-muted", text: `答對 +${G.XP.right}（每題最多 ${G.XP.rightCap} 次）、答錯也有 +${G.XP.wrong}、自我檢核每項 +${G.XP.check}、第一次打開一頁 +${G.XP.visit}、心算一回 +${G.XP.drill}、模擬造市一局 +${G.XP.mm}、模擬考 +${G.XP.exam}～100、打倒 Boss +${G.XP.boss}。` }),
        h("div", { class: "nq-actions" }, soundBtn)));
    root.document.body.append(dlg);
    const onKey = (e) => { if (e.key === "Escape") { close(); root.document.removeEventListener("keydown", onKey); } };
    root.document.addEventListener("keydown", onKey);
  }

  /* ====================== 關卡地圖（首頁 .nq-map） ====================== */

  G.ACTS = Object.freeze([
    ["第一幕 · 新人訓練營", ["ch01", "ch02", "ch03", "ch04"]],
    ["第二幕 · 定價與 volatility", ["ch05", "ch06", "appB"]],
    ["第三幕 · Greeks 與 hedge", ["ch07", "ch08", "ch09"]],
    ["第四幕 · 價差兵器庫", ["ch10", "ch11", "ch12", "ch13"]],
    ["第五幕 · synthetic 與 arbitrage", ["ch14", "ch15", "ch16"]],
    ["第六幕 · hedge 與模型", ["ch17", "ch18", "ch19"]],
    ["第七幕 · volatility 進階", ["ch20", "ch21"]],
    ["第八幕 · 真實世界", ["ch22", "ch23", "ch24", "ch25"]],
    ["特訓 · 交易台實戰", ["p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10", "p11", "p12", "p13"]],
  ]);

  const starText = (n) => "★".repeat(n) + "☆".repeat(3 - n);

  function renderMap(host, chapters, bank, missions) {
    const s = stores();
    const byKey = Object.fromEntries(chapters.map((c) => [c.key, c]));
    const cont = NQ.progress && NQ.progress.continueTarget ? NQ.progress.continueTarget(chapters, s.visited) : null;
    let nextKey = null;
    for (const [, keys] of G.ACTS) for (const k of keys) if (!nextKey && byKey[k] && !G.stars(byKey[k], bank[k], s).boss) nextKey = k;
    const curKey = (cont && cont.chapter.key) || nextKey;
    let totalStars = 0;
    const acts = G.ACTS.map(([name, keys]) => {
      const nodes = keys.filter((k) => byKey[k]).map((k) => {
        const c = byKey[k], st = G.stars(c, bank[k], s), m = missions[k] || {};
        totalStars += st.count;
        const num = k.startsWith("ch") ? String(Number(k.slice(2))) : k.startsWith("p") ? `P${Number(k.slice(1))}` : "B";
        return h("a", {
          class: `nqg-node${st.count === 3 ? " is-gold" : st.count ? " is-started" : ""}${k === curKey ? " is-current" : ""}`,
          href: NQ.url(c.url), title: `${c.title}${m.codename ? ` — ${m.codename}` : ""}`,
        },
        h("span", { class: "nqg-node-dot", text: num }),
        h("span", { class: "nqg-node-name", text: m.codename || c.title }),
        h("span", { class: "nqg-node-stars", "aria-label": `${st.count} 顆星`, text: starText(st.count) }));
      });
      const got = keys.reduce((a, k) => a + (byKey[k] ? G.stars(byKey[k], bank[k], s).count : 0), 0);
      return h("section", { class: "nqg-act" },
        h("div", { class: "nqg-act-head" }, h("span", { text: name }), h("span", { class: "nqg-act-stars", text: `★ ${got}/${keys.length * 3}` })),
        h("div", { class: "nqg-path" }, nodes));
    });
    const max = chapters.length * 3;
    host.replaceChildren(h("div", { class: "nqg-map" },
      h("div", { class: "nqg-map-top" },
        h("span", { text: `已收集 ★ ${totalStars} / ${max}` }),
        h("span", { class: "nqg-muted", text: "每關 3 顆星：讀過 · 打倒 Boss · 章末題庫全答且 ≥ 80% 答對" })),
      acts));
  }

  async function mountMap(host) {
    host.replaceChildren(h("div", { class: "nq-card nq-loading", text: "地圖載入中…" }));
    try {
      const [chapters, bank, missions] = await Promise.all([NQ.loadChapters(), NQ.loadBank().catch(() => ({})), G.loadMissions()]);
      ctxCache = { chapters: chapters || [], bank: bank || {} };
      renderMap(host, ctxCache.chapters, ctxCache.bank, missions);
    } catch (e) {
      host.replaceChildren(h("div", { class: "nq-card nq-error", text: "地圖載入失敗，請檢查網路後重新整理。" }));
    }
  }

  /* ====================== 章節任務簡報與 Boss 戰 ====================== */

  G.loadMissions = () => NQ.fetchJSON("assets/game/missions.json").catch(() => ({}));

  function briefing(key, m, chapter) {
    const s = stores();
    const st = chapter ? G.stars(chapter, (ctxCache.bank || {})[key], s) : null;
    const el = h("div", { class: "nqg-brief" },
      h("div", { class: "nqg-brief-top" },
        h("span", { class: "nqg-brief-kicker", text: "MISSION" }),
        h("span", { class: "nqg-brief-code", text: m.codename }),
        st ? h("span", { class: "nqg-brief-stars", title: "讀過 · 打倒 Boss · 題庫 ≥ 80%", text: starText(st.count) }) : null),
      h("p", { class: "nqg-brief-text" }, h("b", { text: "Mia：" }), m.briefing),
      m.objectives && m.objectives.length ? h("ul", { class: "nqg-brief-obj" }, m.objectives.map((o) => h("li", { text: o }))) : null,
      m.boss ? h("a", { class: "nqg-brief-boss", href: "#nqg-boss", text: `⚔ 本關 Boss：${m.boss.name} →` }) : null);
    NQ.renderMath(el);
    return el;
  }

  function bossCard(key, m) {
    const b = m.boss;
    const rec = () => obj(obj(NQ.store.get(GAME).boss)[key]);
    const host = h("div", { class: "nqg-boss", id: "nqg-boss" });
    let hearts = 3, picked = false;

    function draw() {
      const r = rec();
      const won = !!r.won;
      const hp = h("div", { class: "nqg-boss-hp" }, h("i", { style: `width:${won ? 0 : 100}%` }));
      const life = h("span", { class: "nqg-boss-life", "aria-label": `剩 ${hearts} 條命`, text: "❤".repeat(hearts) + "♡".repeat(3 - hearts) });
      const feedback = h("div", { class: "nqg-boss-fb", "aria-live": "polite" });
      const choices = h("div", { class: "nqg-boss-choices" }, b.choices.map((c, i) => h("button", {
        type: "button", class: "nq-btn nqg-choice", html: NQ.richText(c), disabled: won || hearts <= 0,
        onclick: (e) => answer(i, e.currentTarget, hp, life, feedback, choices),
      })));
      const head = h("div", { class: "nqg-boss-head" },
        h("span", { class: "nqg-boss-avatar", text: won ? "💀" : "👾" }),
        h("div", { class: "nqg-boss-meta" },
          h("div", { class: "nqg-boss-name", text: `BOSS · ${b.name}` }), hp),
        life);
      const body = [
        head,
        h("p", { class: "nqg-boss-taunt", text: won ? `「……${b.name} 已被你擊敗。」` : `「${b.taunt}」` }),
        h("div", { class: "nqg-boss-q", html: NQ.richText(b.q) }),
        choices, feedback,
      ];
      if (won) {
        feedback.append(h("div", { class: "nqg-win" }, h("b", { text: "🏆 已通關 " }), m.victory || ""),
          h("div", { class: "nqg-explain", html: NQ.richText(b.explain) }));
        choices.querySelectorAll("button")[b.answer].classList.add("is-right");
      } else if (hearts <= 0) {
        feedback.append(h("div", { class: "nqg-lose", text: "💥 Boss 獲勝。回頭讀懶人包與核心概念，準備好再挑戰。" }),
          h("button", { type: "button", class: "nq-btn", text: "再挑戰一次", onclick: () => { hearts = 3; draw(); } }));
      }
      host.replaceChildren(...body);
      NQ.renderMath(host);
    }

    function answer(i, btn, hp, life, feedback, choices) {
      if (picked) return;
      if (i === b.answer) {
        picked = true;
        btn.classList.add("is-right");
        hp.firstChild.style.width = "0%";
        host.classList.add("is-hit");
        gameUpdate((g) => {
          g.boss = obj(g.boss);
          const r = obj(g.boss[key]);
          g.boss[key] = { won: r.won || Date.now(), tries: (r.tries || 0) + 1 };
          today(g).train++;
          markActive(g);
          if (!(g.dailyDone || []).includes(g.daily.date) && G.DAILY.every((q) => q.of(g.daily) >= q.goal)) {
            g.dailyDone = (g.dailyDone || []).concat(g.daily.date).slice(-400);
          }
        });
        confetti(90);
        sfx("boss");
        setTimeout(() => { picked = false; refresh(true); draw(); }, 900);
      } else {
        hearts--;
        btn.classList.add("is-wrong");
        btn.disabled = true;
        host.classList.remove("is-shake"); void host.offsetWidth; host.classList.add("is-shake");
        life.textContent = "❤".repeat(hearts) + "♡".repeat(3 - hearts);
        sfx("miss");
        gameUpdate((g) => { g.boss = obj(g.boss); const r = obj(g.boss[key]); g.boss[key] = Object.assign(r, { tries: (r.tries || 0) + 1 }); });
        feedback.replaceChildren(h("div", { class: "nqg-lose", text: hearts > 0 ? `Boss 反擊！還剩 ${hearts} 條命。` : "" }));
        if (hearts <= 0) draw();
      }
    }

    draw();
    return host;
  }

  async function mountLesson(path) {
    const article = root.document.querySelector(".md-content article");
    if (!article || !NQ.claim(article, "nqGame")) return;
    const [chapters, missions] = await Promise.all([NQ.loadChapters().catch(() => []), G.loadMissions()]);
    const chapter = (chapters || []).find((c) => c.url === path);
    if (!chapter) return;
    const m = missions[chapter.key];
    if (!m) return;
    if (!ctxCache.chapters.length) {
      const bank = await NQ.loadBank().catch(() => ({}));
      ctxCache = { chapters: chapters || [], bank };
    }
    const h1 = article.querySelector("h1");
    if (h1) h1.after(briefing(chapter.key, m, chapter));
    if (m.boss && Array.isArray(m.boss.choices)) {
      const quizHead = [...article.querySelectorAll("h2")].find((x) => x.textContent.startsWith("本章題庫測驗"));
      const card = h("div", null, h("h2", { text: "⚔ Boss 戰" }), bossCard(chapter.key, m));
      if (quizHead) quizHead.before(...card.childNodes); else article.append(...card.childNodes);
    }
  }

  /* ====================== 掛載 ====================== */

  NQ.onPage(() => {
    const path = NQ.pagePath();
    refresh(false);
    root.document.querySelectorAll(".nq-map").forEach((el) => { if (NQ.claim(el)) mountMap(el); });
    if (/^(lessons|prep)\/[^/]+\/$/.test(path)) mountLesson(path);
  });
})(typeof window !== "undefined" ? window : globalThis);
