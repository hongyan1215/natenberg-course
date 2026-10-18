/* nq-sim.js — Optiver 培訓準備軌道的兩個互動模擬
 *   <div class="nq-sim" data-sim="vol-surface"></div>  波動率曲面編輯器（無套利診斷、sticky strike vs sticky delta）
 *   <div class="nq-sim" data-sim="mock-mm"></div>      模擬選擇權造市遊戲（教練拍肩、復盤、歷史趨勢）
 * 依賴 nq-tools.js 匯出的 window.NQMath（Black-Scholes / Greeks / 亂數）；nq-common.js 的 NQ.store 可選。
 * 純函式集中在 NQSim.surface 與 NQSim.mm，Node 可 require 做數值與決定性測試。
 * 單位：t 為年；vega 每 1 vol 點；遊戲中 1 分鐘 = 1 個交易日（theta 以「每交易日」表示）。
 */
(function (root) {
  'use strict';

  let MATH = null;
  function M() {
    if (MATH) return MATH;
    if (root.NQMath) MATH = root.NQMath;
    else if (typeof require === 'function') { try { MATH = require('./nq-tools.js'); } catch (e) { MATH = null; } }
    return MATH;
  }
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  /** 把旗標陣列中連續為 true 的區段轉成 [x 起, x 迄]。 */
  function runs(xs, bad) {
    const out = [];
    let start = -1;
    for (let j = 0; j <= xs.length; j++) {
      const b = j < xs.length && bad[j];
      if (b && start < 0) start = j;
      if (!b && start >= 0) { out.push([xs[start], xs[j - 1]]); start = -1; }
    }
    return out;
  }

  // =========================================================================
  // 1. 波動率曲面（3 個到期、正規化價性上的二次式）
  // =========================================================================
  const surface = (() => {
    const TILT = [-0.5, 0, 0.5];          // 期限斜率：後端 − 前端（vol 點）
    const DAYS_RANGE = [[7, 60], [61, 180], [181, 730]];
    const NAMES = ['T1', 'T2', 'T3'];
    const TOL_B = 1e-7, TOL_V = 1e-9, TOL_C = 1e-7, CAL_Z = 3, BUMP_W = 0.015;

    function defaults() {
      return {
        S: 100, shift: 0, tilt: 0,
        exp: [
          { days: 30, atm: 24, skew: -3.0, curv: 0.8, bump: 0, bumpK: 95 },
          { days: 91, atm: 22, skew: -2.6, curv: 0.5, bump: 0, bumpK: 95 },
          { days: 182, atm: 21, skew: -2.3, curv: 0.4, bump: 0, bumpK: 95 },
        ],
      };
    }
    const T = (p, i) => p.exp[i].days / 365;
    /** 有效 ATM vol（小數）＝ 個別 ATM ＋ 整體平移 ＋ 期限斜率 × 權重，下限 1%。 */
    const atm = (p, i) => Math.max(1, p.exp[i].atm + p.shift + p.tilt * TILT[i]) / 100;

    /**
     * σ(k) = σ_ATM + (skew·z + curv·z²)/100，z = k /(σ_ATM √T)，k = ln(K/F)。
     * skew、curv 的單位是「每 1 個標準差的 vol 點」，所以三個到期的參數可以互相比較。下限 1%。
     * bump：單一履約價的標記偏差（vol 點），在 k_b = ln(bumpK/100) 附近、寬度 BUMP_W 的高斯形狀，
     * 模擬「手動把某個履約價標錯」——這是實務上蝶式套利最常見的來源。
     */
    function vol(p, i, k) {
      const a = atm(p, i), e = p.exp[i];
      const z = k / (a * Math.sqrt(T(p, i)));
      let v = a + (e.skew * z + e.curv * z * z) / 100;
      if (e.bump) { const u = (k - Math.log((e.bumpK || 100) / 100)) / BUMP_W; v += e.bump * Math.exp(-0.5 * u * u) / 100; }
      return Math.max(0.01, v);
    }
    const volK = (p, i, K, S) => vol(p, i, Math.log(K / (S == null ? p.S : S)));
    const totalVar = (p, i, k) => { const v = vol(p, i, k); return v * v * T(p, i); };
    function option(p, i, K, kind, S) {
      const s = S == null ? p.S : S;
      return M().bs(s, K, T(p, i), volK(p, i, K, s), 0, 0, kind);
    }
    const price = (p, i, K, kind, S) => option(p, i, K, kind, S).price;

    function strikeGrid(p, i, n = 161, zr = 4) {
      const sd = atm(p, i) * Math.sqrt(T(p, i));
      const lo = p.S * Math.exp(-zr * sd), hi = p.S * Math.exp(zr * sd);
      const out = new Array(n);
      for (let j = 0; j < n; j++) out[j] = lo + (hi - lo) * j / (n - 1);
      return out;
    }

    /** Breeden–Litzenberger：q(K) = ∂²C/∂K²（r = 0），以相鄰蝶式的二階差分近似。 */
    function density(p, i, grid) {
      const g = grid || strikeGrid(p, i);
      const C = g.map(K => price(p, i, K, 'call'));
      const K = [], q = [], slope = [];
      for (let j = 1; j < g.length - 1; j++) {
        const h1 = g[j] - g[j - 1], h2 = g[j + 1] - g[j];
        K.push(g[j]);
        q.push(2 * ((C[j + 1] - C[j]) / h2 - (C[j] - C[j - 1]) / h1) / (h1 + h2));
      }
      for (let j = 0; j < g.length - 1; j++) slope.push((C[j + 1] - C[j]) / (g[j + 1] - g[j]));
      return { grid: g, C, K, q, slope };
    }

    /** 無套利診斷：蝶式（密度 < 0）、垂直（call 價差為負）、日曆（total variance 隨期限下降）。 */
    function diagnose(p) {
      const flags = [], dens = [];
      for (let i = 0; i < 3; i++) {
        const d = density(p, i);
        dens.push(d);
        const bad = d.q.map(x => x < -TOL_B);
        if (bad.some(Boolean)) {
          flags.push({ key: 'bfly:' + i, type: 'butterfly', exps: [i], ranges: runs(d.K, bad), worst: Math.min(...d.q) });
        }
        const badV = d.slope.map(s => s > TOL_V);
        if (badV.some(Boolean)) {
          const mids = d.grid.slice(0, -1);
          flags.push({ key: 'vert:' + i, type: 'vertical', exps: [i], ranges: runs(mids, badV), worst: Math.max(...d.slope) });
        }
      }
      // 日曆：在近月 ±3 個標準差的履約價範圍內比較相鄰到期的 total variance
      for (let i = 0; i < 2; i++) {
        const kr = CAL_Z * atm(p, i) * Math.sqrt(T(p, i)), nk = 121, ks = [];
        for (let j = 0; j < nk; j++) ks.push(-kr + 2 * kr * j / (nk - 1));
        const diff = ks.map(k => totalVar(p, i + 1, k) - totalVar(p, i, k));
        const bad = diff.map(x => x < -TOL_C);
        if (bad.some(Boolean)) {
          const Ks = ks.map(k => p.S * Math.exp(k));
          flags.push({ key: 'cal:' + i, type: 'calendar', exps: [i, i + 1], ranges: runs(Ks, bad), worst: Math.min(...diff) });
        }
      }
      // 畫圖用：每個到期在自己的 ±3.5σ 範圍
      const wCurves = [0, 1, 2].map(i => {
        const kr = 3.5 * atm(p, i) * Math.sqrt(T(p, i)), pts = [];
        for (let j = 0; j <= 120; j++) { const k = -kr + 2 * kr * j / 120; pts.push([k, totalVar(p, i, k)]); }
        return pts;
      });
      return { flags, dens, wCurves };
    }

    /** 每個旗標記住「第一次出現時」最後動到的參數；已消失的旗標移除。 */
    function attribute(prev, flags, change) {
      const out = {};
      for (const f of flags) out[f.key] = (prev && prev[f.key]) || change || '初始設定';
      return out;
    }

    /** 與某個旗標最相關的參數（給提示用）。 */
    function related(flag) {
      const n = flag.exps.map(i => NAMES[i]);
      if (flag.type === 'calendar') return [`${n[0]}／${n[1]} 的 ATM vol`, '期限斜率', `${n[0]}／${n[1]} 的天數`, `${n[0]} 的 skew／曲率（翼部）`];
      if (flag.type === 'vertical') return [`${n[0]} 的曲率（翼部太陡）`, `${n[0]} 的 skew`];
      return [`${n[0]} 的單一履約價標記偏差`, `${n[0]} 的曲率（太負）`];
    }

    /** 標的移動 movePct% 後，sticky strike 與 sticky delta（sticky moneyness）兩種假設下的比較。 */
    function spotMove(p, i, K, kind, movePct) {
      const B = M().bs, S0 = p.S, S1 = S0 * (1 + movePct / 100), t = T(p, i);
      const v0 = volK(p, i, K, S0);
      const vSD = volK(p, i, K, S1);
      const g0 = B(S0, K, t, v0, 0, 0, kind);
      const gSS = B(S1, K, t, v0, 0, 0, kind);
      const gSD = B(S1, K, t, vSD, 0, 0, kind);
      const effDelta = S => {
        const h = S * 1e-4;
        const up = B(S + h, K, t, volK(p, i, K, S + h), 0, 0, kind).price;
        const dn = B(S - h, K, t, volK(p, i, K, S - h), 0, 0, kind).price;
        return (up - dn) / (2 * h);
      };
      return {
        S0, S1, t, v0, vSS: v0, vSD,
        p0: g0.price, pSS: gSS.price, pSD: gSD.price,
        d0: g0.delta, dSS: gSS.delta, dSD: gSD.delta,
        eff0: effDelta(S0), eff1: effDelta(S1),
        vega0: g0.vega,
        atmSS: volK(p, i, S1, S0), atmSD: atm(p, i),
      };
    }

    return { CAL_Z, TILT, DAYS_RANGE, NAMES, defaults, T, atm, vol, volK, totalVar, option, price, strikeGrid, density, diagnose, attribute, related, spotMove, runs };
  })();

  // =========================================================================
  // 2. 模擬造市引擎（決定性：同一個種子＋同一串操作 → 同一個結果）
  // =========================================================================
  const mm = (() => {
    const TICK = 0.25;              // 每步的遊戲秒數
    const DAY_SEC = 60;             // 遊戲 1 分鐘 = 1 個交易日
    const YEAR_DAYS = 252;
    const DT_Y = TICK / DAY_SEC / YEAR_DAYS;
    const TPS = Math.round(1 / TICK); // 每秒步數
    const H_INF = 20;               // 知情交易者看得到未來 5 秒
    const OPT_TICK = 0.01;
    const HEDGE_HS = 0.01;          // 標的避險每股成本（半個價差）
    const EXPIRY_DAYS = 30;
    const BETA = -0.2;              // 市場 smile：σ(K) = σ_ATM + β·ln(K/S)
    const OPT_LIMIT = 200;          // 每個選擇權的部位上限（±口）
    const UND_LIMIT = 2000;         // 標的部位上限（±股）
    const TOL_VOL = 1.5;            // 雜訊交易者願意多付的程度（vol 點，指數分配平均）
    const LEARN_SEC = 90;           // 市場 vol 向真實 vol 靠攏的時間尺度
    const VOLVOL = 0.0008;          // 市場 ATM vol 每 √秒 的隨機變動（小數）
    const JUMP_RATE = 1 / 180;      // 小跳動（每秒機率）
    const MAX_QSIZE = 50;

    const DIFFS = {
      easy: { label: '新手', pInf: 0.05, pInfNews: 0.30, deltaLim: 250, vegaLim: 40, coachSec: 25, compHW: 2.0, lambda: 0.035, newsEvery: 95 },
      normal: { label: '標準', pInf: 0.12, pInfNews: 0.50, deltaLim: 150, vegaLim: 25, coachSec: 20, compHW: 1.5, lambda: 0.04, newsEvery: 75 },
      hard: { label: '困難', pInf: 0.22, pInfNews: 0.70, deltaLim: 100, vegaLim: 18, coachSec: 15, compHW: 1.2, lambda: 0.045, newsEvery: 60 },
    };
    const STRIKES = { 3: [95, 100, 105], 5: [90, 95, 100, 105, 110] };
    const SCHED = ['CPI 數據', '央行利率決議', '公司財報', '非農就業數據'];
    const NEWS_UP = ['傳出大型併購案', '公司獲得政府大單', '上修全年財測', '主管機關核准新產品'];
    const NEWS_DN = ['主管機關宣布調查', '執行長突然辭職', '下修全年財測', '主要客戶取消訂單'];

    const floorTick = x => Math.round(Math.floor(x / OPT_TICK + 1e-7) * OPT_TICK * 100) / 100;
    const ceilTick = x => Math.round(Math.ceil(x / OPT_TICK - 1e-7) * OPT_TICK * 100) / 100;
    const stream = (seed, k) => M().mulberry32(((seed >>> 0) * 2654435761 + k * 40503) >>> 0);

    function create(opts) {
      const o = Object.assign({ seed: 1, minutes: 5, diff: 'normal', nStrikes: 5 }, opts || {});
      const D = DIFFS[o.diff] || DIFFS.normal;
      const B = M().bs;
      const nTicks = Math.round(o.minutes * 60 / TICK);
      const N = nTicks + H_INF + 2;
      const rP = stream(o.seed, 1), gP = M().gaussian(rP);
      const rE = stream(o.seed, 2), gE = M().gaussian(rE);
      const rF = stream(o.seed, 3), rC = stream(o.seed, 4);

      // ---- 商品 ----
      const insts = (STRIKES[o.nStrikes] || STRIKES[5]).map(K => {
        const kind = K < 100 ? 'put' : 'call';
        return { id: (kind === 'put' ? 'P' : 'C') + K, K, kind };
      });
      const nI = insts.length;

      // ---- 事件（第一個一定是預告型） ----
      const events = [];
      let te = 25 + 15 * rE();
      while (te < o.minutes * 60 - 12) {
        const sched = events.length === 0 || rE() < 0.5;
        const u1 = rE(), u2 = rE(), u3 = rE(), z = gE();
        const tick = Math.round(te / TICK);
        if (sched) {
          events.push({ type: 'sched', tick, announce: Math.max(1, tick - 20 * TPS), label: SCHED[Math.floor(u1 * SCHED.length)], jump: 0.02 * z, prem: (2 + 2 * u2) / 100 });
        } else {
          const up = u1 < 0.5;
          const pool = up ? NEWS_UP : NEWS_DN;
          events.push({ type: 'news', tick, announce: tick, label: pool[Math.floor(u2 * pool.length)], jump: (up ? 1 : -1) * (0.015 + 0.025 * u3), dTrue: (-1 + 6 * rE()) / 100, dMkt: (1 + 3 * rE()) / 100 });
        }
        te += D.newsEvery * (0.7 + 0.6 * rE());
      }

      // ---- 市場路徑（全部預先產生，與玩家行為無關） ----
      const S = new Float64Array(N), sigT = new Float64Array(N), sigB = new Float64Array(N);
      const prem = new Float64Array(N), pInf = new Float64Array(N);
      S[0] = 100;
      sigT[0] = (16 + 14 * rP()) / 100;
      sigB[0] = clamp(sigT[0] + (-5 + 10 * rP()) / 100, 0.12, 0.45);
      const evAt = new Map(events.map(e => [e.tick, e]));
      for (let n = 0; n < N - 1; n++) {
        const z = gP(), z2 = gP(), uJ = rP(), zJ = gP();
        const sig = sigT[n];
        let lr = -0.5 * sig * sig * DT_Y + sig * Math.sqrt(DT_Y) * z;
        if (uJ < JUMP_RATE * TICK) lr += 0.006 * zJ;
        let st = sigT[n], sb = sigB[n] + (sigT[n] - sigB[n]) * (TICK / LEARN_SEC) + VOLVOL * Math.sqrt(TICK) * z2;
        const ev = evAt.get(n + 1);
        if (ev) {
          lr += ev.jump;
          if (ev.type === 'news') { st = clamp(st + ev.dTrue, 0.10, 0.50); sb += ev.dMkt; }
        }
        S[n + 1] = S[n] * Math.exp(lr);
        sigT[n + 1] = st;
        sigB[n + 1] = clamp(sb, 0.08, 0.70);
      }
      for (let n = 0; n < N; n++) {
        let pr = 0, pi = D.pInf;
        for (const e of events) {
          if (e.type === 'sched' && n >= e.announce && n < e.tick) pr += e.prem * (n - e.announce) / (e.tick - e.announce);
          if (n >= e.tick - 12 * TPS && n < e.tick + 6 * TPS) pi = D.pInfNews;
        }
        prem[n] = pr;
        pInf[n] = pi;
      }
      const lastT = nTicks;
      const tau = n => Math.max((EXPIRY_DAYS - n * TICK / DAY_SEC) / YEAR_DAYS, 1e-6);
      const atmVol = n => sigB[n] + prem[n];
      const mktVol = (n, K) => Math.max(0.05, atmVol(n) + BETA * Math.log(K / S[n]));
      const theoAt = (i, n) => { const it = insts[i]; return B(S[n], it.K, tau(n), mktVol(n, it.K), 0, 0, it.kind).price; };

      // ---- 玩家狀態 ----
      const st = {
        n: 0, done: false, pos: new Array(nI).fill(0), stock: 0, cash: 0,
        q: { mode: 'vol', volC: Math.round(sigB[0] * 200) / 2, hwVol: 1.5, hwPx: 0.15, leanVol: 0, leanPx: 0, size: 20, on: new Array(nI).fill(true), pulled: false },
        fills: [], tape: [], hedges: [],
        split: { edge: 0, hedge: 0, delta: 0, gamma: 0, vega: 0, theta: 0 },
        series: { t: [], S: [], pnl: [], delta: [], vega: [] },
        breach: { delta: false, vega: false, events: 0, ticks: 0, log: [] },
        signErrors: 0, coach: [], coachPending: false,
        nextCoach: Math.round((60 + 30 * rC()) / TICK),
        mktVol: 0,
      };
      let G = null; // 目前一步的市場 theo 與 Greeks 快取

      function greeksAt(n) {
        const s = S[n], t = tau(n);
        return insts.map(it => {
          const v = mktVol(n, it.K);
          const g = B(s, it.K, t, v, 0, 0, it.kind);
          return { theo: g.price, delta: g.delta, gamma: g.gamma, vega: g.vega, thetaY: g.thetaYear, vol: v };
        });
      }
      G = greeksAt(0);

      function compQuote(i) {
        const g = G[i], half = D.compHW * g.vega;
        let bid = floorTick(g.theo - half), ask = ceilTick(g.theo + half);
        if (ask < bid + OPT_TICK) ask = Math.round((bid + OPT_TICK) * 100) / 100;
        return { bid: bid >= OPT_TICK ? bid : null, ask };
      }

      function userQuote(i) {
        const q = st.q;
        if (q.pulled || !q.on[i]) return null;
        const it = insts[i], n = st.n, s = S[n], t = tau(n);
        const vc = q.volC / 100 + BETA * Math.log(it.K / s);
        let bid, ask;
        if (q.mode === 'vol') {
          const vb = Math.max(0.01, vc + (q.leanVol - q.hwVol) / 100), va = Math.max(0.02, vc + (q.leanVol + q.hwVol) / 100);
          bid = floorTick(B(s, it.K, t, vb, 0, 0, it.kind).price);
          ask = ceilTick(B(s, it.K, t, va, 0, 0, it.kind).price);
        } else {
          const c = B(s, it.K, t, Math.max(0.01, vc), 0, 0, it.kind).price;
          bid = floorTick(c + q.leanPx - q.hwPx);
          ask = ceilTick(c + q.leanPx + q.hwPx);
        }
        if (ask < bid + OPT_TICK) ask = Math.round((bid + OPT_TICK) * 100) / 100;
        const bidSize = Math.max(0, Math.min(q.size, OPT_LIMIT - st.pos[i]));
        const askSize = Math.max(0, Math.min(q.size, OPT_LIMIT + st.pos[i]));
        return { bid: bid >= OPT_TICK && bidSize > 0 ? bid : null, ask: askSize > 0 ? ask : null, bidSize, askSize };
      }

      const netDelta = () => st.stock + st.pos.reduce((a, p, i) => a + p * G[i].delta, 0);
      const netGamma = () => st.pos.reduce((a, p, i) => a + p * G[i].gamma, 0);
      const netVega = () => st.pos.reduce((a, p, i) => a + p * G[i].vega, 0);
      const netTheta = () => st.pos.reduce((a, p, i) => a + p * G[i].thetaY, 0) / YEAR_DAYS;
      const pnl = () => st.cash + st.stock * S[st.n] + st.pos.reduce((a, p, i) => a + p * G[i].theo, 0);

      function checkLimits() {
        const d = Math.abs(netDelta()) > D.deltaLim, v = Math.abs(netVega()) > D.vegaLim;
        if (d && !st.breach.delta) { st.breach.events++; st.breach.log.push({ n: st.n, kind: 'delta' }); }
        if (v && !st.breach.vega) { st.breach.events++; st.breach.log.push({ n: st.n, kind: 'vega' }); }
        st.breach.delta = d; st.breach.vega = v;
      }

      function pushTape(e) {
        st.tape.push(e);
        if (st.tape.length > 60) st.tape.splice(0, st.tape.length - 60);
      }

      function poisson(lam) {
        const L = Math.exp(-lam);
        let k = 0, p = 1;
        do { k++; p *= rF(); } while (p > L);
        return k - 1;
      }

      function flow() {
        const n = st.n;
        for (let i = 0; i < nI; i++) {
          const arrivals = poisson(D.lambda);
          if (!arrivals) continue;
          const g = G[i], it = insts[i];
          const c = compQuote(i), u = userQuote(i);
          let remB = u && u.bid != null ? u.bidSize : 0, remA = u && u.ask != null ? u.askSize : 0;
          let vFut = null;
          for (let a = 0; a < arrivals; a++) {
            const uInf = rF(), uSide = rF(), uSize = rF(), uTol = rF(), uCoin = rF();
            const informed = uInf < pInf[n];
            const userAskBest = remA > 0 && (u.ask < c.ask - 1e-9 || (Math.abs(u.ask - c.ask) < 1e-9 && uCoin < 0.5));
            const userBidBest = remB > 0 && (c.bid == null || u.bid > c.bid + 1e-9 || (Math.abs(u.bid - c.bid) < 1e-9 && uCoin < 0.5));
            const bestAsk = userAskBest ? u.ask : c.ask;
            const bestBid = userBidBest ? u.bid : c.bid;
            let buyer = null, size;
            if (informed) {
              if (vFut == null) { const nf = Math.min(n + H_INF, N - 1); vFut = B(S[nf], it.K, tau(nf), mktVol(nf, it.K), 0, 0, it.kind).price; }
              if (vFut > bestAsk + OPT_TICK) buyer = true;
              else if (bestBid != null && vFut < bestBid - OPT_TICK) buyer = false;
              size = 10 + Math.floor(uSize * 21);
            } else {
              const tol = -Math.log(1 - uTol) * TOL_VOL * g.vega;
              const wantBuy = uSide < 0.5;
              if (wantBuy && bestAsk <= g.theo + tol) buyer = true;
              else if (!wantBuy && bestBid != null && bestBid >= g.theo - tol) buyer = false;
              size = 5 + Math.floor(uSize * 21);
            }
            if (buyer === null) continue;
            const user = buyer ? userAskBest : userBidBest;
            const px = buyer ? bestAsk : bestBid;
            if (user) {
              const qty = Math.min(size, buyer ? remA : remB);
              if (buyer) { remA -= qty; st.pos[i] -= qty; st.cash += px * qty; } else { remB -= qty; st.pos[i] += qty; st.cash -= px * qty; }
              const edge = (buyer ? px - g.theo : g.theo - px) * qty;
              st.split.edge += edge;
              const f = { n, i, side: buyer ? 'sell' : 'buy', qty, px, theo: g.theo, edge, informed, hs: (c.ask - (c.bid == null ? c.ask - 2 * D.compHW * g.vega : c.bid)) / 2, vega: g.vega };
              st.fills.push(f);
              pushTape({ n, kind: 'fill', i, side: f.side, qty, px, edge });
            } else {
              pushTape({ n, kind: 'mkt', i, side: buyer ? 'buy' : 'sell', qty: size, px });
            }
          }
        }
      }

      function step() {
        if (st.done || st.coachPending) return false;
        const n = st.n;
        flow();
        checkLimits();
        if (st.breach.delta || st.breach.vega) st.breach.ticks++;
        // ---- 市場前進一步：損益歸因 ----
        const G1 = greeksAt(n + 1);
        const dS = S[n + 1] - S[n];
        let inv = st.stock * dS, dP = st.stock * dS, gP0 = 0, vP = 0, tP = 0;
        for (let i = 0; i < nI; i++) {
          const p = st.pos[i];
          if (!p) continue;
          const g0 = G[i], g1 = G1[i];
          inv += p * (g1.theo - g0.theo);
          dP += p * g0.delta * dS;
          gP0 += 0.5 * p * g0.gamma * dS * dS;
          vP += p * g0.vega * (g1.vol - g0.vol) * 100;
          tP += p * g0.thetaY * DT_Y;
        }
        const sp = st.split;
        sp.delta += dP; sp.vega += vP; sp.theta += tP;
        sp.gamma += gP0 + (inv - dP - gP0 - vP - tP);
        for (const e of events) if (e.tick === n + 1 || (e.type === 'sched' && e.announce === n + 1)) {
          pushTape({ n: n + 1, kind: e.tick === n + 1 ? 'event' : 'announce', label: e.label, jump: e.type === 'news' || e.tick === n + 1 ? e.jump : 0, sched: e.type === 'sched' });
        }
        st.n = n + 1;
        G = G1;
        if (st.n % TPS === 0) {
          const se = st.series;
          se.t.push(st.n * TICK); se.S.push(S[st.n]); se.pnl.push(pnl()); se.delta.push(netDelta()); se.vega.push(netVega());
        }
        if (st.n >= lastT) { st.done = true; return false; }
        if (st.n >= st.nextCoach) {
          if (lastT - st.n > 15 * TPS) st.coachPending = true;
          else st.nextCoach = Infinity;
        }
        return true;
      }

      function hedge(qty) {
        qty = Math.round(qty);
        if (!qty) return { ok: false, reason: '數量為 0' };
        if (st.done) return { ok: false, reason: '本局已結束' };
        if (st.coachPending) return { ok: false, reason: '教練提問中' };
        if (Math.abs(st.stock + qty) > UND_LIMIT) return { ok: false, reason: `超過標的部位上限 ±${UND_LIMIT}` };
        const before = netDelta(), after = before + qty;
        const signError = Math.abs(after) > Math.abs(before) + 1e-9 && Math.abs(after) > 0.2 * D.deltaLim;
        const s = S[st.n], cost = Math.abs(qty) * HEDGE_HS;
        st.stock += qty;
        st.cash -= qty * s + cost;
        st.split.hedge -= cost;
        st.hedges.push({ n: st.n, qty, before, after, signError });
        if (signError) st.signErrors++;
        pushTape({ n: st.n, kind: 'hedge', qty, px: s, signError });
        checkLimits();
        return { ok: true, signError, before, after };
      }

      function setQuote(patch) {
        const q = st.q;
        for (const [k, v] of Object.entries(patch || {})) {
          if (k === 'on') q.on = v.slice();
          else if (k in q) q[k] = v;
        }
        q.size = clamp(Math.round(q.size), 1, MAX_QSIZE);
        q.hwVol = clamp(q.hwVol, 0.1, 10);
        q.hwPx = clamp(Math.round(q.hwPx * 100) / 100, 0.01, 2);
        q.volC = clamp(q.volC, 5, 80);
      }

      function realizedVol(win) {
        const n = st.n, m = Math.min(win, n);
        if (m < 8) return NaN;
        let s2 = 0;
        for (let j = n - m + 1; j <= n; j++) { const r = Math.log(S[j] / S[j - 1]); s2 += r * r; }
        return Math.sqrt(s2 / m / DT_Y);
      }

      function snapshot() {
        const n = st.n;
        const rows = insts.map((it, i) => {
          const c = compQuote(i), u = userQuote(i), g = G[i];
          const toVol = px => (px == null ? null : (g.vol + (px - g.theo) / g.vega / 100));
          return {
            id: it.id, K: it.K, kind: it.kind, theo: g.theo, vol: g.vol, delta: g.delta, gamma: g.gamma, vega: g.vega,
            mBid: c.bid, mAsk: c.ask, mBidV: toVol(c.bid), mAskV: toVol(c.ask),
            uBid: u ? u.bid : null, uAsk: u ? u.ask : null, uBidV: u ? toVol(u.bid) : null, uAskV: u ? toVol(u.ask) : null,
            pos: st.pos[i], on: st.q.on[i],
          };
        });
        const up = events.filter(e => e.type === 'sched' && n >= e.announce && n < e.tick).map(e => ({ label: e.label, secLeft: (e.tick - n) * TICK }))[0] || null;
        const recent = events.filter(e => n >= e.tick && n < e.tick + 15 * TPS).map(e => ({ label: e.label, jump: e.jump, sched: e.type === 'sched', secAgo: (n - e.tick) * TICK }))[0] || null;
        const d = netDelta(), v = netVega();
        return {
          n, tSec: n * TICK, totalSec: lastT * TICK, remainingSec: (lastT - n) * TICK, done: st.done,
          S: S[n], tauDays: tau(n) * YEAR_DAYS, atmVol: atmVol(n), rv: realizedVol(30 * TPS), rows,
          delta: d, gamma: netGamma(), vega: v, theta: netTheta(), stock: st.stock, cash: st.cash,
          pnl: pnl(), split: Object.assign({}, st.split),
          limits: { delta: { val: d, lim: D.deltaLim, frac: Math.abs(d) / D.deltaLim }, vega: { val: v, lim: D.vegaLim, frac: Math.abs(v) / D.vegaLim } },
          breaches: st.breach.events, breachSec: st.breach.ticks * TICK, signErrors: st.signErrors,
          upcoming: up, recent, q: JSON.parse(JSON.stringify(st.q)),
          compHW: D.compHW, nFills: st.fills.length, coachPending: st.coachPending,
        };
      }

      return {
        opts: o, D, insts, events, S, sigT, sigB, nTicks: lastT, st,
        step, hedge, setQuote, snapshot, netDelta, netGamma, netVega, netTheta, pnl, theoAt, atmVol, tau,
        recentFills(sec) { const n0 = st.n - sec * TPS; return st.fills.filter(f => f.n >= n0); },
        coachRng: rC,
        get done() { return st.done; },
      };
    }

    // ------------------------------------------------------------------ 教練拍肩
    const fmtS = (x, d) => {
      let s = Math.abs(x) < 0.5 * Math.pow(10, -d) ? (0).toFixed(d) : x.toFixed(d);
      if (x > 0 && !/^0\.?0*$/.test(s)) s = '+' + s;
      return s.replace('-', '−');
    };
    function shuffle(arr, rng) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    }
    /** 數值題：正解＋干擾項（常見錯誤：符號、忘了 gamma、尺度），保證格式化後互不相同。 */
    function numChoices(ans, cands, gap, fmt, rng) {
      const vals = [ans];
      const ok = x => Number.isFinite(x) && vals.every(v => Math.abs(v - x) >= gap) && !vals.map(fmt).includes(fmt(x));
      for (const c of cands) { if (vals.length >= 4) break; if (ok(c)) vals.push(c); }
      for (let k = 1; vals.length < 4 && k < 50; k++) {
        for (const c of [ans + k * gap * 1.5, ans - k * gap * 1.5]) if (vals.length < 4 && ok(c)) vals.push(c);
      }
      const order = shuffle(vals.map((v, j) => j), rng);
      return { choices: order.map(j => fmt(vals[j])), answer: order.indexOf(0) };
    }
    function mcChoices(correct, wrongs, rng) {
      const all = [correct].concat(wrongs.slice(0, 3));
      const order = shuffle(all.map((_, j) => j), rng);
      return { choices: order.map(j => all[j]), answer: order.indexOf(0) };
    }

    const QTYPES = {
      vega: '部位 vega', delta_move: '移動後的 delta', pnl_move: '價格變動損益', vol_pnl: '波動率變動損益',
      hedge: '避險數量', theta: 'theta', news: '消息前後的報價', after_news: '消息後的優先順序',
      one_sided: '單邊成交的解讀', skew: '庫存偏移', spread_why: '價差寬度的理由',
    };
    const NUMERIC = ['vega', 'delta_move', 'pnl_move', 'vol_pnl', 'hedge', 'theta'];

    function makeQuestion(eng) {
      const rng = eng.coachRng, s = eng.snapshot(), st = eng.st, D = eng.D;
      const asked = st.coach.map(c => c.type), last = asked[asked.length - 1];
      const fills = eng.recentFills(15);
      const buyQ = fills.filter(f => f.side === 'buy').reduce((a, f) => a + f.qty, 0);
      const sellQ = fills.filter(f => f.side === 'sell').reduce((a, f) => a + f.qty, 0);
      const ctx = [];
      if (s.upcoming && s.upcoming.secLeft >= 3) ctx.push('news');
      if (s.recent) ctx.push('after_news');
      if (fills.length >= 3 && Math.max(buyQ, sellQ) >= 0.8 * (buyQ + sellQ)) ctx.push('one_sided');
      if (Math.abs(s.vega) > 0.4 * D.vegaLim) ctx.push('skew');
      let type = ctx.find(t => t !== last && asked.filter(a => a === t).length < 2);
      if (!type) {
        const pool = NUMERIC.concat(['spread_why']).filter(t => t !== last);
        let best = Infinity, cands = [];
        for (const t of pool) {
          const c = asked.filter(a => a === t).length;
          if (c < best) { best = c; cands = [t]; } else if (c === best) cands.push(t);
        }
        type = cands[Math.floor(rng() * cands.length)];
      }
      const q = buildQuestion(type, s, D, rng, { buyQ, sellQ, nf: fills.length });
      q.type = type;
      q.limitSec = D.coachSec;
      q.tSec = s.tSec;
      return q;
    }

    function buildQuestion(type, s, D, rng, ctx) {
      const d = s.delta, g = s.gamma, v = s.vega, S = s.S;
      const f0 = x => fmtS(x, 0), f1 = x => fmtS(x, 1), f2 = x => fmtS(x, 2);
      const sideTxt = x => (x >= 0 ? `買進 ${Math.abs(Math.round(x))} 股` : `賣出 ${Math.abs(Math.round(x))} 股`);
      let r;
      switch (type) {
        case 'vega': {
          const c = numChoices(v, [-v, 2 * v, v / 2, v * 100], Math.max(1, Math.abs(v) * 0.3), f1, rng);
          r = { prompt: '不要看螢幕，先說：你目前整個部位的 vega（每 1 個 vol 點）大約是多少？', ...c,
            explain: `部位 vega = Σ 口數 × 單口 vega = ${f1(v)}。正的 vega 代表隱含波動率上升你會賺錢；買進選擇權增加 vega、賣出減少 vega。` };
          break;
        }
        case 'delta_move': {
          const m = rng() < 0.5 ? -0.02 : 0.02, dS = S * m, ans = d + g * dS;
          const c = numChoices(ans, [d - g * dS, d, -ans, d + 2 * g * dS], Math.max(4, Math.abs(g * dS) * 0.5, Math.abs(ans) * 0.15), f0, rng);
          r = { prompt: `如果標的${m < 0 ? '下跌' : '上漲'} 2%（約 ${Math.abs(dS).toFixed(2)} 點），你的部位 delta 大約變成多少？`, ...c,
            explain: `新 delta ≈ delta + gamma × ΔS = ${f0(d)} + (${f2(g)}) × (${fmtS(dS, 2)}) = ${f0(ans)}。gamma 是每 1 點價格變動 delta 的改變量；${g >= 0 ? '正 gamma：漲了 delta 變大、跌了變小' : '負 gamma：漲了 delta 變小、跌了變大'}。` };
          break;
        }
        case 'pnl_move': {
          const m = rng() < 0.5 ? -0.01 : 0.01, dS = S * m, ans = d * dS + 0.5 * g * dS * dS;
          const c = numChoices(ans, [-ans, d * dS - 0.5 * g * dS * dS, d * m, d * dS], Math.max(0.5, Math.abs(ans) * 0.2), f2, rng);
          r = { prompt: `其他條件不變，標的瞬間${m < 0 ? '下跌' : '上漲'} 1%（${Math.abs(dS).toFixed(2)} 點），你的部位損益大約多少？`, ...c,
            explain: `ΔPnL ≈ delta·ΔS + ½·gamma·ΔS² = ${f0(d)} × ${fmtS(dS, 2)} + ½ × ${f2(g)} × ${(dS * dS).toFixed(2)} = ${f2(ans)}。` };
          break;
        }
        case 'vol_pnl': {
          const dv = rng() < 0.5 ? 2 : -2, ans = v * dv;
          const c = numChoices(ans, [-ans, v, v * dv / 100, 2 * ans], Math.max(0.5, Math.abs(ans) * 0.25), f2, rng);
          r = { prompt: `隱含波動率整體${dv > 0 ? '上升' : '下降'} 2 個 vol 點（標的不動），你的部位損益大約多少？`, ...c,
            explain: `ΔPnL ≈ vega × Δσ（vol 點）= ${f1(v)} × ${dv > 0 ? '+2' : '−2'} = ${f2(ans)}。` };
          break;
        }
        case 'hedge': {
          const ans = -d;
          const cands = [d, -d / 2, -2 * d, d / 2];
          const gap = Math.max(5, Math.abs(d) * 0.3);
          const vals = [ans];
          for (const x of cands) if (vals.length < 4 && vals.every(y => Math.abs(y - x) >= gap)) vals.push(x);
          for (let k = 1; vals.length < 4; k++) for (const x of [ans + k * gap * 1.5, ans - k * gap * 1.5]) if (vals.length < 4 && vals.every(y => Math.abs(y - x) >= gap)) vals.push(x);
          const order = shuffle(vals.map((_, j) => j), rng);
          r = { prompt: '要把部位 delta 調回 0，你應該怎麼下標的單？', choices: order.map(j => sideTxt(vals[j])), answer: order.indexOf(0),
            explain: `delta = ${f0(d)}，所以要${sideTxt(ans)}。口訣：delta 正就賣、delta 負就買，數量等於 delta。` };
          break;
        }
        case 'theta': {
          const th = s.theta;
          const c = numChoices(th, [-th, th * 252, th / 2, 2 * th], Math.max(0.3, Math.abs(th) * 0.3), f2, rng);
          r = { prompt: '其他條件不變，過了一個交易日（遊戲中約 1 分鐘），時間價值讓你的部位損益變動多少？', ...c,
            explain: `theta（每交易日）= ${f2(th)}。${th < 0 ? '你是淨買方（正 gamma），時間站在對手那邊' : th > 0 ? '你是淨賣方（負 gamma），每天收時間價值，但怕大波動' : '目前幾乎沒有選擇權部位'}。` };
          break;
        }
        case 'news': {
          const up = s.upcoming || { label: '重要數據', secLeft: 10 };
          r = { prompt: `「${up.label}」將在 ${Math.round(up.secLeft)} 秒後公布。現在最合理的報價調整是？`,
            ...mcChoices('拉寬價差、降低報價數量，必要時暫時撤單', ['縮窄價差，趁消息前多搶一些成交量', '把報價數量加大，消息前流動性最好', '不用調整：報價會自動跟著標的價格重算'], rng),
            explain: '消息前後知情交易者比例上升，你的報價最容易被「已經知道答案的人」成交（逆向選擇）。自動重算只跟得上已經發生的價格，跟不上即將發生的跳動。' };
          break;
        }
        case 'after_news': {
          const rc = s.recent || { label: '新聞', jump: 0 };
          r = { prompt: `剛剛出現「${rc.label}」，標的跳動約 ${fmtS(rc.jump * 100, 1)}%。下列哪件事最優先？`,
            ...mcChoices('先確認並避險部位 delta，再檢查自己的 vol 是否要跟上市場', ['立刻縮窄價差，波動大成交才多', '什麼都不做，等市場平靜再說', '把報價數量加到最大，趁亂賺價差'], rng),
            explain: '跳動之後部位 delta 會因 gamma 改變，市場 vol 也可能重新定價。先控制方向風險（最快、最確定），再更新 theo；在不確定時加大數量或縮窄價差，等於把選擇權送給知情的人。' };
          break;
        }
        case 'one_sided': {
          const bought = ctx.buyQ >= ctx.sellQ;
          r = { prompt: `過去 15 秒你有 ${ctx.nf} 筆成交，幾乎都是你在${bought ? '買進（別人打你的 bid）' : '賣出（別人買你的 ask）'}，共 ${bought ? ctx.buyQ : ctx.sellQ} 口。最合理的解讀與動作？`,
            ...mcChoices(bought ? '可能遇到知情賣方：把報價往下調並拉寬，同時處理增加的部位風險' : '可能遇到知情買方：把報價往上調並拉寬，同時處理增加的部位風險',
              [bought ? '對方在送錢，把 bid 數量加大' : '對方在送錢，把 ask 數量加大', '純屬隨機，維持原報價即可', bought ? '把 bid 調高，搶回更多成交' : '把 ask 調低，搶回更多成交'], rng),
            explain: '連續同方向的成交是 theo 可能過時的訊號（貝氏更新：被賣多次 → 真實價值較可能比你想的低）。拉寬與偏移可以降低繼續被狙擊的機率，同時讓庫存自然回歸。' };
          break;
        }
        case 'skew': {
          const long = v > 0;
          r = { prompt: `你的部位 vega 是 ${fmtS(v, 1)}（上限 ±${D.vegaLim}）。想讓 vega 庫存自然下降，報價應該？`,
            ...mcChoices(long ? '整體往下偏移（bid、ask 都降），讓別人更想向你買、更不想賣給你' : '整體往上偏移（bid、ask 都升），讓別人更想賣給你、更不想向你買',
              [long ? '整體往上偏移（bid、ask 都升）' : '整體往下偏移（bid、ask 都降）', '只拉寬價差，不偏移', '用標的避險掉 vega'], rng),
            explain: `庫存偏移（skewing）：${long ? '你太長 vega，想賣出選擇權，所以把報價壓低' : '你太短 vega，想買回選擇權，所以把報價抬高'}。標的只能避險 delta，避不掉 vega。` };
          break;
        }
        default: { // spread_why
          const goods = ['重大消息即將公布，知情交易者比例上升', '部位已接近風險限額，不想再增加同方向庫存', '剛連續被同一方向成交，懷疑 theo 已經過時', '實現波動率突然升高，對 theo 的把握變低'];
          const bads = ['上一筆交易賺錢了，可以放鬆一點', '想要增加成交量', '部位的 theta 是正的', '這樣報價看起來比較專業', '市場價差很窄，所以要跟他們不一樣'];
          const wd = s.q.mode === 'vol' ? `±${s.q.hwVol.toFixed(1)} vol` : `±${s.q.hwPx.toFixed(2)}`;
          r = { prompt: `你目前的報價寬度是 ${wd}（市場約 ±${s.compHW.toFixed(1)} vol）。下列哪一個是把價差拉寬的「好」理由？`,
            ...mcChoices(goods[Math.floor(rng() * goods.length)], shuffle(bads, rng), rng),
            explain: '價差是你對「被知情者成交的損失」與「庫存風險」收的保費。理由要和逆向選擇、庫存或 theo 的不確定性有關；過去的損益和想要成交量都不是拉寬的理由（想要成交量反而該縮窄）。' };
        }
      }
      return r;
    }

    function answerQuestion(eng, q, choice, elapsedSec) {
      const timeout = elapsedSec > q.limitSec || choice == null || choice < 0;
      const correct = !timeout && choice === q.answer;
      eng.st.coach.push({ type: q.type, correct, timeout, elapsed: Math.min(elapsedSec, q.limitSec), tSec: q.tSec });
      eng.st.coachPending = false;
      eng.st.nextCoach = eng.st.n + Math.round((60 + 30 * eng.coachRng()) / TICK);
      return { correct, timeout };
    }

    // ------------------------------------------------------------------ 復盤
    function halfLife(xs) {
      let num = 0, den = 0;
      for (let j = 0; j + 1 < xs.length; j++) { num += xs[j] * xs[j + 1]; den += xs[j] * xs[j]; }
      if (den < 1e-9) return NaN;
      const phi = num / den;
      if (phi >= 0.9999) return Infinity;
      if (phi <= 0) return 1;
      return Math.log(0.5) / Math.log(phi);
    }
    const lin = (x, lo, hi) => clamp((x - lo) / (hi - lo), 0, 1);

    function debrief(eng) {
      const st = eng.st, D = eng.D, last = eng.nTicks;
      const fills = st.fills;
      let vol = 0, edge = 0, mk5 = 0, mk30 = 0, hs = 0, infVol = 0, infPnl = 0, noisePnl = 0;
      for (const f of fills) {
        const m5 = eng.theoAt(f.i, Math.min(f.n + 5 * TPS, last)), m30 = eng.theoAt(f.i, Math.min(f.n + 30 * TPS, last));
        const sg = f.side === 'buy' ? 1 : -1;
        const a5 = sg * (m5 - f.px) * f.qty, a30 = sg * (m30 - f.px) * f.qty;
        vol += f.qty; edge += f.edge; mk5 += a5; mk30 += a30; hs += f.hs * f.qty;
        if (f.informed) { infVol += f.qty; infPnl += a30; } else noisePnl += a30;
      }
      const per = x => (vol ? x / vol : NaN);
      const s = {
        pnl: eng.pnl(), split: Object.assign({}, st.split),
        nFills: fills.length, volume: vol, edgePer: per(edge), mk5Per: per(mk5), mk30Per: per(mk30), hsPer: per(hs),
        adversePer: per(mk30 - edge), informedShare: vol ? infVol / vol : NaN, informedPnl: infPnl, noisePnl,
        breaches: st.breach.events, breachSec: st.breach.ticks * TICK, signErrors: st.signErrors,
        coachAsked: st.coach.length, coachRight: st.coach.filter(c => c.correct).length,
        coachWrong: st.coach.filter(c => !c.correct).map(c => c.type),
        hlDelta: halfLife(st.series.delta), hlVega: halfLife(st.series.vega),
        maxDelta: Math.max(0, ...st.series.delta.map(Math.abs)), maxVega: Math.max(0, ...st.series.vega.map(Math.abs)),
        hedges: st.hedges.length, hedgeVol: st.hedges.reduce((a, h) => a + Math.abs(h.qty), 0),
        diff: eng.opts.diff, minutes: eng.opts.minutes, seed: eng.opts.seed,
        deltaLim: D.deltaLim, vegaLim: D.vegaLim, sigTrue: eng.sigT[last], sigTrue0: eng.sigT[0], sigMkt0: eng.sigB[0], sigMktEnd: eng.atmVol(last),
      };
      // 新聞前後（事件前 12 秒到後 6 秒）的成交量
      const evWin = f => eng.events.some(e => f.n >= e.tick - 12 * TPS && f.n < e.tick + 6 * TPS);
      const newsFills = fills.filter(evWin);
      s.newsVolShare = vol ? newsFills.reduce((a, f) => a + f.qty, 0) / vol : NaN;
      s.newsMk30Per = (() => {
        let q = 0, m = 0;
        for (const f of newsFills) { const sg = f.side === 'buy' ? 1 : -1; m += sg * (eng.theoAt(f.i, Math.min(f.n + 30 * TPS, last)) - f.px) * f.qty; q += f.qty; }
        return q ? m / q : NaN;
      })();
      s.score = processScore(s);
      s.suggestions = suggest(s);
      return s;
    }

    function processScore(s) {
      const enough = s.nFills >= 8;
      const hsRef = s.hsPer > 0 ? s.hsPer : 0.2;
      const parts = {
        limits: 25 * Math.max(0, 1 - 0.3 * s.breaches - s.breachSec / 60),
        sign: 15 * Math.max(0, 1 - s.signErrors / 2),
        coach: s.coachAsked ? 25 * s.coachRight / s.coachAsked : 12.5,
        markout: enough ? 15 * lin(s.mk30Per, -hsRef, 0) : 0,
        edge: enough ? 10 * lin(s.edgePer, 0, hsRef) : 0,
        inventory: !Number.isFinite(s.hlDelta) && s.hlDelta !== Infinity ? (s.nFills ? 10 : 0)
          : 10 * (1 - lin(Math.log(Math.max(1, s.hlDelta)), Math.log(10), Math.log(120))),
      };
      const total = Object.values(parts).reduce((a, b) => a + b, 0);
      return { parts, total: Math.round(total) };
    }

    function suggest(s) {
      const out = [];
      const add = (pri, text) => out.push({ pri, text });
      const n2 = x => (Number.isFinite(x) ? (Math.abs(x) < 0.005 ? 0 : x).toFixed(2).replace('-', '−') : '—');
      if (s.breaches > 0) add(100 + s.breaches * 10, `限額：本局突破限額 ${s.breaches} 次、共 ${Math.round(s.breachSec)} 秒。下一局規則：風險條一變黃（70%）就先避險 delta 或偏移報價消化 vega，目標 0 次突破。`);
      if (s.signErrors > 0) add(95 + s.signErrors * 10, `符號：有 ${s.signErrors} 次避險讓 |delta| 變大。下單前先說出口「我 delta 是 +X，所以要賣 X」，或用「delta 歸零」鍵；目標 0 次符號錯誤。`);
      if (s.nFills < 8) add(90, `成交太少（${s.nFills} 筆）：報價可能比市場寬太多或撤單太久。下一局先用和市場相同的寬度（±${s.minutes ? '1.5' : '1.5'} vol 左右）、數量 20，只在消息前後拉寬。`);
      const wrong = {};
      for (const t of s.coachWrong) wrong[t] = (wrong[t] || 0) + 1;
      const worst = Object.entries(wrong).sort((a, b) => b[1] - a[1])[0];
      if (s.coachAsked && s.coachRight / s.coachAsked < 0.75 && worst) {
        const tip = {
          vega: '每次成交後默念「這筆 +10 口 × 0.14 = +1.4 vega」，讓部位 vega 隨時在腦中',
          delta_move: '練習「新 delta ≈ delta + gamma × ΔS」，先算 ΔS = S × 百分比',
          pnl_move: '用泰勒展開：delta·ΔS + ½·gamma·ΔS²，先確定符號再算大小',
          vol_pnl: '記住「vega × vol 點數」，先判斷自己是長還是短 vega',
          hedge: '口訣「delta 正就賣、負就買」，數量等於 delta',
          theta: '淨買選擇權 → theta 負；淨賣 → theta 正，大小約與 gamma 成正比',
        }[worst[0]] || '答題時先講方向（正／負、買／賣），再講大小';
        add(80 + (s.coachAsked - s.coachRight) * 5, `教練問答：${s.coachRight}/${s.coachAsked} 答對，最弱的是「${QTYPES[worst[0]] || worst[0]}」。下一局${tip}。`);
      }
      if (s.nFills >= 8 && s.mk30Per < -0.3 * s.hsPer) {
        const newsTxt = s.newsVolShare > 0.25 ? `其中 ${Math.round(s.newsVolShare * 100)}% 的量發生在消息前後（30 秒 markout ${n2(s.newsMk30Per)}／口）` : '';
        add(75 + Math.min(20, -s.mk30Per / Math.max(0.01, s.hsPer) * 10), `逆向選擇：30 秒 markout 平均 ${n2(s.mk30Per)}／口${newsTxt ? '，' + newsTxt : ''}。下一局在消息預告出現或連續被同方向成交時，把寬度拉到市場的 2 倍或暫時撤單。`);
      }
      if (s.nFills >= 8 && s.edgePer < 0.4 * s.hsPer) add(60, `平均優勢只有 ${n2(s.edgePer)}／口（市場半價差約 ${n2(s.hsPer)}）。你的報價太貼近 theo 或 vol 偏離市場；下一局寬度不要小於市場的 0.8 倍，並用「對齊市場」檢查自己的 vol。`);
      if (Number.isFinite(s.hlDelta) && s.hlDelta > 40 || s.hlDelta === Infinity) add(55, `delta 半衰期 ${s.hlDelta === Infinity ? '無限長（部位沒有回歸）' : Math.round(s.hlDelta) + ' 秒'}。下一局規定自己：每次成交後 10 秒內把 delta 避險掉一半以上。`);
      if (Number.isFinite(s.hlVega) && s.hlVega > 90 || s.hlVega === Infinity) add(50, `vega 庫存半衰期 ${s.hlVega === Infinity ? '無限長' : Math.round(s.hlVega) + ' 秒'}：vega 只能靠報價偏移（lean）消化。下一局 vega 超過上限 40% 就偏移 0.5–1 vol。`);
      if (Math.abs(s.split.delta) > Math.max(2, Math.abs(s.split.edge))) add(45, `方向損益 ${n2(s.split.delta)} 大於成交優勢 ${n2(s.split.edge)}：你的損益主要來自賭方向，不是造市。下一局讓 delta 長期貼近 0。`);
      if (out.length < 3) add(10, '下一局試試提高難度（更多知情流、更緊的限額），或把局長拉到 10 分鐘練耐力。');
      if (out.length < 3) add(9, '嘗試「價格模式」報價，練習把 vol 點與價格互換（價格寬度 ≈ vega × vol 寬度）。');
      if (out.length < 3) add(8, '每次教練提問前先自己口述一次部位：delta、gamma、vega、theta 各是多少、正負號為何。');
      return out.sort((a, b) => b.pri - a.pri).slice(0, 3).map(x => x.text);
    }

    function historyRecord(s) {
      return {
        ts: Date.now(), diff: s.diff, min: s.minutes, seed: s.seed, pnl: +s.pnl.toFixed(2), score: s.score.total,
        breaches: s.breaches, sign: s.signErrors, coach: s.coachAsked ? +(s.coachRight / s.coachAsked).toFixed(2) : null,
        mk30: Number.isFinite(s.mk30Per) ? +s.mk30Per.toFixed(3) : null, edge: Number.isFinite(s.edgePer) ? +s.edgePer.toFixed(3) : null,
        fills: s.nFills,
      };
    }

    return {
      TICK, TPS, DAY_SEC, DT_Y, DIFFS, STRIKES, OPT_LIMIT, UND_LIMIT, MAX_QSIZE, BETA, QTYPES,
      create, makeQuestion, answerQuestion, debrief, processScore, suggest, halfLife, historyRecord, numChoices, floorTick, ceilTick,
    };
  })();

  const NQSim = { surface, mm, runs };
  if (typeof module === 'object' && module.exports) module.exports = NQSim;
  root.NQSim = NQSim;
  if (typeof document === 'undefined') return;

  // =========================================================================
  // 3. DOM 小工具與輕量 SVG 圖表
  // =========================================================================
  const SVGNS = 'http://www.w3.org/2000/svg';
  const COLORS = ['var(--nqs-c1)', 'var(--nqs-c2)', 'var(--nqs-c3)', 'var(--nqs-c4)'];
  const OBSERVERS = [];

  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k);
    return e;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function fmt(x, d = 2) {
    if (x === Infinity) return '∞';
    if (!Number.isFinite(x)) return '—';
    let s = x.toFixed(d);
    if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
    return s.replace('-', '−');
  }
  const fmtSg = (x, d = 2) => (Number.isFinite(x) && x > 0 && fmt(x, d) !== fmt(0, d) ? '+' : '') + fmt(x, d);
  const pct = (x, d = 1) => (Number.isFinite(x) ? fmt(x * 100, d) + '%' : '—');
  const mmss = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function setText(el, t) { if (el && el._t !== t) { el._t = t; el.textContent = t; } }
  function setCls(el, c) { if (el && el._c !== c) { el._c = c; el.className = c; } }

  function rafThrottle(fn) {
    let pending = false;
    return () => {
      if (pending) return;
      pending = true;
      const run = () => { if (!pending) return; pending = false; fn(); };
      requestAnimationFrame(run);
      setTimeout(run, 60);
    };
  }
  function observeWidth(el, cb) {
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', () => { if (document.contains(el)) cb(el.clientWidth); });
      return;
    }
    const ro = new ResizeObserver(() => { const w = el.clientWidth; if (w > 0) cb(w); });
    ro.observe(el);
    OBSERVERS.push({ el, ro });
  }
  function holdRepeat(btn, fn) {
    let t1 = null, t2 = null;
    const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
    btn.addEventListener('pointerdown', e => {
      if ((e.button && e.button > 0) || btn.disabled) return;
      e.preventDefault();
      stop(); fn();
      t1 = setTimeout(() => { t2 = setInterval(fn, 90); }, 450);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('click', e => { if (e.detail === 0) fn(); });
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }
  /** iOS Safari 的 range 只能拖拇指：補上「點軌道跳到該處」與水平拖曳。 */
  function touchRange(input, cb) {
    let sx = 0, sy = 0, moved = false, horiz = false;
    const setFrom = cx => {
      const r = input.getBoundingClientRect(), th = 30;
      const fr = clamp((cx - r.left - th / 2) / Math.max(1, r.width - th), 0, 1);
      const min = +input.min, max = +input.max, stp = +input.step || 1;
      const v = min + Math.round(fr * (max - min) / stp) * stp;
      const before = input.value;
      input.value = String(+v.toFixed(10));
      if (input.value !== before) cb();
    };
    input.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; moved = false; horiz = false; }, { passive: true });
    input.addEventListener('touchmove', e => {
      const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 6) { moved = true; horiz = Math.abs(dx) >= Math.abs(dy); }
      if (moved && horiz) setFrom(t.clientX);
    }, { passive: true });
    input.addEventListener('touchend', e => { if (!moved && !input.disabled) setFrom(e.changedTouches[0].clientX); }, { passive: true });
  }

  function slider(o) {
    const f = o.fmt || (v => String(v));
    const out = h('output', { class: 'nqs-val' });
    const lab = h('span', { class: 'nqs-lab', text: o.label });
    const input = h('input', { type: 'range', min: o.min, max: o.max, step: o.step, 'aria-label': o.label });
    input.value = o.value;
    const dec = h('button', { type: 'button', class: 'nqs-step', 'aria-label': o.label + ' 減少', text: '−' });
    const inc = h('button', { type: 'button', class: 'nqs-step', 'aria-label': o.label + ' 增加', text: '+' });
    const el = h('div', { class: 'nqs-ctl' }, h('div', { class: 'nqs-ctl-head' }, lab, out), h('div', { class: 'nqs-ctl-row' }, dec, input, inc));
    const api = {
      el, input,
      get value() { return parseFloat(input.value); },
      set(v, silent) { input.value = String(v); out.textContent = f(api.value); if (!silent && o.onInput) o.onInput(api.value); },
      config(c) { if (c.min != null) input.min = c.min; if (c.max != null) input.max = c.max; if (c.label) { lab.textContent = c.label; o.label = c.label; } },
    };
    const fire = () => { out.textContent = f(api.value); if (o.onInput) o.onInput(api.value); };
    const bump = dir => {
      const stp = parseFloat(input.step) || 1;
      const v = clamp(+(Math.round((api.value + dir * stp) / stp) * stp).toFixed(10), +input.min, +input.max);
      if (v !== api.value) api.set(v);
    };
    input.addEventListener('input', fire);
    holdRepeat(dec, () => bump(-1));
    holdRepeat(inc, () => bump(1));
    touchRange(input, fire);
    out.textContent = f(api.value);
    return api;
  }

  function seg(o) {
    let cur = o.value;
    const btns = o.options.map(([v, t]) => h('button', { type: 'button', class: 'nqs-seg-btn', 'data-v': String(v), 'aria-pressed': String(v === cur), text: t }));
    const g = h('div', { class: 'nqs-seg', role: 'group', 'aria-label': o.label || '' }, btns);
    const api = {
      el: o.label ? h('div', { class: 'nqs-ctl' }, h('div', { class: 'nqs-ctl-head' }, h('span', { class: 'nqs-lab', text: o.label })), g) : g,
      btns,
      get value() { return cur; },
      set(v, silent) {
        cur = v;
        btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
        if (!silent && o.onChange) o.onChange(v);
      },
      label(v, t) { const b = btns.find(x => x.dataset.v === String(v)); if (b) b.textContent = t; },
    };
    g.addEventListener('click', e => {
      const b = e.target.closest('.nqs-seg-btn');
      if (!b || b.disabled) return;
      const opt = o.options.find(x => String(x[0]) === b.dataset.v);
      if (opt) api.set(opt[0]);
    });
    return api;
  }

  /** 步進器：[−] 值 [+]，可附加額外按鈕。 */
  function stepper(o) {
    const val = h('span', { class: 'nqs-stepper-v' });
    const lab = h('span', { class: 'nqs-lab', text: o.label });
    const mk = (dir, txt) => {
      const b = h('button', { type: 'button', class: 'nqs-step', 'aria-label': `${o.label} ${dir > 0 ? '增加' : '減少'}`, text: txt });
      holdRepeat(b, () => { o.set(o.get() + dir * (typeof o.step === 'function' ? o.step() : o.step)); show(); });
      return b;
    };
    const el = h('div', { class: 'nqs-ctl' }, h('div', { class: 'nqs-ctl-head' }, lab),
      h('div', { class: 'nqs-stepper-row' }, mk(-1, '−'), val, mk(1, '+'), o.extra || null));
    const show = () => setText(val, o.fmt ? o.fmt(o.get()) : String(o.get()));
    show();
    return { el, show, setLabel(t) { lab.textContent = t; } };
  }

  function niceStep(span, count) {
    const raw = span / Math.max(1, count);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
  }
  function ticks(lo, hi, count) {
    const step = niceStep(hi - lo, count), out = [];
    for (let k = Math.ceil(lo / step - 1e-9); k <= Math.floor(hi / step + 1e-9); k++) out.push(k === 0 ? 0 : k * step);
    return { ticks: out, step };
  }
  function interp(pts, x) {
    const n = pts.length;
    if (!n || x < pts[0][0] || x > pts[n - 1][0]) return NaN;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid][0] <= x) lo = mid; else hi = mid; }
    const [xa, ya] = pts[lo], [xb, yb] = pts[hi];
    return xb === xa ? ya : ya + (yb - ya) * (x - xa) / (xb - xa);
  }

  /**
   * 輕量 SVG 折線圖：series / bands（x 區段底色）/ vmarks（垂直線）/ hmarks / points。
   * 點或拖曳圖表：在圖下方列出該 x 的各線數值（不依賴 hover）。
   */
  class MiniChart {
    constructor(parent, o) {
      this.o = Object.assign({ height: 220, minH: 150 }, o || {});
      this.legend = h('div', { class: 'nqs-legend' });
      this.svg = document.createElementNS(SVGNS, 'svg');
      this.svg.setAttribute('class', 'nqs-svg');
      this.svg.setAttribute('role', 'img');
      this.read = h('div', { class: 'nqs-chart-read', 'aria-live': 'polite' });
      this.wrap = h('div', { class: 'nqs-chart' }, this.svg);
      this.el = h('div', { class: 'nqs-chart-box' }, this.legend, this.wrap, this.read);
      parent.append(this.el);
      this.W = 0; this.cx = null; this.d = null;
      observeWidth(this.wrap, w => { if (Math.abs(w - this.W) > 0.5) { this.W = w; this.render(); } });
      const pt = e => { const r = this.svg.getBoundingClientRect(); return (e.clientX - r.left) * (this.W / (r.width || this.W)); };
      let drag = false;
      this.svg.addEventListener('pointerdown', e => {
        if (!this.sx) return;
        drag = true;
        try { this.svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        this._cross(pt(e));
      });
      this.svg.addEventListener('pointermove', e => { if (drag) this._cross(pt(e)); });
      const end = () => { drag = false; };
      this.svg.addEventListener('pointerup', end);
      this.svg.addEventListener('pointercancel', end);
    }
    _cross(px) {
      const [x0, x1] = this.xd;
      this.cx = clamp(this.sx.inv(px), x0, x1);
      this.render();
    }
    set(d) { this.d = d; this.render(); }
    render() {
      const d = this.d;
      if (!d) return;
      const W = this.W || this.wrap.clientWidth || 600;
      this.W = W;
      const H = Math.max(this.o.minH, Math.min(this.o.height, Math.round(W * 0.62)));
      const m = { l: W < 480 ? 44 : 52, r: 10, t: 10, b: d.xLabel ? 38 : 24 };
      const series = d.series || [];
      let x0 = Infinity, x1 = -Infinity;
      if (d.xDomain) [x0, x1] = d.xDomain;
      else for (const s of series) for (const p of s.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; }
      if (!(x1 > x0)) { x0 = Number.isFinite(x0) ? x0 - 1 : 0; x1 = x0 + 2; }
      let y0 = Infinity, y1 = -Infinity;
      if (d.yDomain) [y0, y1] = d.yDomain;
      else {
        for (const s of series) for (const p of s.pts) {
          if (!Number.isFinite(p[1]) || p[0] < x0 || p[0] > x1) continue;
          if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
        }
        for (const y of d.yInclude || []) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (!Number.isFinite(y0)) { y0 = 0; y1 = 1; }
        if (y1 - y0 < 1e-9 * Math.max(1, Math.abs(y0))) { const c = y0; y0 = c - (Math.abs(c) * 0.1 || 1); y1 = c + (Math.abs(c) * 0.1 || 1); }
        const pad = (y1 - y0) * 0.07;
        y0 -= pad; y1 += pad;
      }
      this.xd = [x0, x1];
      const pw = W - m.l - m.r, ph = H - m.t - m.b;
      const sx = v => m.l + (v - x0) / (x1 - x0) * pw;
      sx.inv = px => x0 + (px - m.l) / pw * (x1 - x0);
      const sy = v => m.t + (y1 - v) / (y1 - y0) * ph;
      this.sx = sx;
      const f = v => (Number.isFinite(v) ? v.toFixed(1) : '0');
      const xt = ticks(x0, x1, Math.max(3, Math.round(pw / 85))), yt = ticks(y0, y1, Math.max(3, Math.round(ph / 42)));
      const dec = st => Math.max(0, Math.ceil(-Math.log10(st) - 1e-9));
      const xf = d.xTick || (v => fmt(v, dec(xt.step))), yf = d.yTick || (v => fmt(v, dec(yt.step)));
      const id = this.id || (this.id = 'nqs' + Math.random().toString(36).slice(2, 8));
      let s = `<defs><clipPath id="${id}"><rect x="${f(m.l)}" y="${f(m.t)}" width="${f(pw)}" height="${f(ph)}"/></clipPath></defs><g class="nqs-grid">`;
      for (const v of yt.ticks) s += `<line x1="${f(m.l)}" x2="${f(W - m.r)}" y1="${f(sy(v))}" y2="${f(sy(v))}"/>`;
      for (const v of xt.ticks) s += `<line x1="${f(sx(v))}" x2="${f(sx(v))}" y1="${f(m.t)}" y2="${f(m.t + ph)}"/>`;
      s += '</g>';
      if (y0 < 0 && y1 > 0) s += `<line class="nqs-zero" x1="${f(m.l)}" x2="${f(W - m.r)}" y1="${f(sy(0))}" y2="${f(sy(0))}"/>`;
      s += '<g class="nqs-ticks">';
      for (const v of yt.ticks) s += `<text x="${f(m.l - 5)}" y="${f(sy(v) + 4)}" text-anchor="end">${esc(yf(v))}</text>`;
      for (const v of xt.ticks) s += `<text x="${f(sx(v))}" y="${f(m.t + ph + 16)}" text-anchor="middle">${esc(xf(v))}</text>`;
      s += '</g>';
      if (d.xLabel) s += `<text class="nqs-axis-t" x="${f(m.l + pw / 2)}" y="${f(H - 5)}" text-anchor="middle">${esc(d.xLabel)}</text>`;
      s += `<g clip-path="url(#${id})">`;
      for (const b of d.bands || []) {
        const a = sx(Math.max(b.x0, x0)), z = sx(Math.min(b.x1, x1));
        if (z >= a) s += `<rect x="${f(a)}" y="${f(m.t)}" width="${f(Math.max(2, z - a))}" height="${f(ph)}" style="fill:${b.color || 'var(--nqs-bad)'};fill-opacity:${b.opacity || 0.16}"/>`;
      }
      for (const hm of d.hmarks || []) {
        if (hm.y < y0 || hm.y > y1) continue;
        s += `<line class="nqs-mark" x1="${f(m.l)}" x2="${f(W - m.r)}" y1="${f(sy(hm.y))}" y2="${f(sy(hm.y))}" style="stroke:${hm.color || 'var(--nqs-muted)'}" stroke-dasharray="5 4"/>`;
        if (hm.label) s += `<text class="nqs-mlabel" x="${f(W - m.r - 4)}" y="${f(sy(hm.y) - 4)}" text-anchor="end">${esc(hm.label)}</text>`;
      }
      for (const se of series) {
        let path = '', pen = false;
        for (const p of se.pts) {
          if (!Number.isFinite(p[1])) { pen = false; continue; }
          path += (pen ? 'L' : 'M') + f(sx(p[0])) + ' ' + f(clamp(sy(p[1]), m.t - 3 * ph, m.t + 4 * ph));
          pen = true;
        }
        s += `<path class="nqs-line" d="${path}" style="stroke:${se.color || COLORS[0]};stroke-width:${se.width || 2}"${se.dash ? ` stroke-dasharray="${se.dash}"` : ''}/>`;
      }
      for (const vm of d.vmarks || []) {
        if (vm.x < x0 || vm.x > x1) continue;
        s += `<line class="nqs-mark" x1="${f(sx(vm.x))}" x2="${f(sx(vm.x))}" y1="${f(m.t)}" y2="${f(m.t + ph)}" style="stroke:${vm.color || 'var(--nqs-muted)'}"${vm.solid ? '' : ' stroke-dasharray="4 4"'}/>`;
      }
      if (this.cx != null) s += `<line class="nqs-cross" x1="${f(sx(this.cx))}" x2="${f(sx(this.cx))}" y1="${f(m.t)}" y2="${f(m.t + ph)}"/>`;
      s += '</g>';
      let lastX = -1e9, row = 0;
      for (const vm of (d.vmarks || []).filter(v => v.label && v.x >= x0 && v.x <= x1).sort((a, b) => a.x - b.x)) {
        const px = sx(vm.x);
        row = px - lastX < 50 ? (row + 1) % 3 : 0;
        lastX = px;
        const anchor = px > W - m.r - 30 ? 'end' : px < m.l + 30 ? 'start' : 'middle';
        s += `<text class="nqs-mlabel" x="${f(px)}" y="${f(m.t + 11 + row * 13)}" text-anchor="${anchor}">${esc(vm.label)}</text>`;
      }
      for (const p of d.points || []) {
        if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
        s += `<circle class="nqs-pt" cx="${f(sx(p.x))}" cy="${f(sy(p.y))}" r="${p.r || 5}" style="fill:${p.color || COLORS[0]}"/>`;
        if (p.label) s += `<text class="nqs-mlabel" x="${f(sx(p.x))}" y="${f(sy(p.y) - 9)}" text-anchor="middle">${esc(p.label)}</text>`;
      }
      if (d.yLabel) s += `<text class="nqs-axis-t nqs-ytitle" x="${f(m.l + 6)}" y="${f(m.t + 13)}">${esc(d.yLabel)}</text>`;
      if (this.cx != null) {
        for (const se of series) {
          if (se.tip === false) continue;
          const y = interp(se.pts, this.cx);
          if (Number.isFinite(y) && y >= y0 && y <= y1) s += `<circle class="nqs-pt" cx="${f(sx(this.cx))}" cy="${f(sy(y))}" r="4" style="fill:${se.color || COLORS[0]}"/>`;
        }
      }
      this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      this.svg.setAttribute('width', W);
      this.svg.setAttribute('height', H);
      this.svg.setAttribute('aria-label', d.aria || d.yLabel || '圖表');
      this.svg.innerHTML = s;
      const items = series.filter(se => se.name && se.legend !== false).map(se =>
        `<span class="nqs-lg"><svg width="24" height="10" aria-hidden="true"><line x1="1" y1="5" x2="23" y2="5" style="stroke:${se.color || COLORS[0]};stroke-width:${Math.min(3, se.width || 2)}"${se.dash ? ` stroke-dasharray="${se.dash}"` : ''}/></svg>${esc(se.name)}</span>`);
      for (const x of d.legendExtra || []) items.push(`<span class="nqs-lg"><span class="nqs-sw" style="background:${x.color}"></span>${esc(x.name)}</span>`);
      this.legend.innerHTML = items.join('');
      this.legend.hidden = !items.length;
      if (this.cx == null) { this.read.innerHTML = `<span class="nqs-muted">${esc(d.hint || '點一下或拖曳圖表看數值')}</span>`; }
      else {
        const xs = (d.xFmt || xf)(this.cx);
        const parts = series.filter(se => se.tip !== false && se.name).map(se => {
          const y = interp(se.pts, this.cx);
          return Number.isFinite(y) ? `<span class="nqs-lg"><span class="nqs-sw" style="background:${se.color || COLORS[0]}"></span>${esc(se.name)} <b>${esc((d.yFmt || yf)(y))}</b></span>` : '';
        }).filter(Boolean);
        this.read.innerHTML = `<b>${esc(d.xName || 'x')} = ${esc(xs)}</b>　${parts.join(' ')}`;
      }
    }
  }

  const panel = (title, ...kids) => h('section', { class: 'nqs-panel' }, title ? h('h4', { class: 'nqs-panel-t', text: title }) : null, ...kids);
  function storeGet(key) {
    if (root.NQ && root.NQ.store) return root.NQ.store.get(key);
    try { const v = JSON.parse(localStorage.getItem(key) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
  }
  function storeSet(key, v) {
    if (root.NQ && root.NQ.store) return root.NQ.store.set(key, v);
    try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; }
  }

  // =========================================================================
  // 4. 波動率曲面編輯器
  // =========================================================================
  const SURF_PRESETS = [
    ['base', '一般市場', () => surface.defaults()],
    ['event', '事件前（前端 vol 高）', () => { const p = surface.defaults(); p.exp[0].atm = 32; return p; }],
    ['panic', '恐慌（陡峭 skew）', () => { const p = surface.defaults(); Object.assign(p.exp[0], { atm: 35, skew: -6, curv: 1.5 }); Object.assign(p.exp[1], { atm: 30, skew: -5, curv: 1.0 }); Object.assign(p.exp[2], { atm: 27, skew: -4, curv: 0.8 }); return p; }],
    ['bfly', '示範：蝶式套利（標錯一個履約價）', () => { const p = surface.defaults(); p.exp[0].bump = 2; p.exp[0].bumpK = 95; return p; }],
    ['vert', '示範：翼部太陡（垂直套利）', () => { const p = surface.defaults(); p.exp[0].curv = 1.8; return p; }],
    ['cal', '示範：日曆套利（ATM）', () => { const p = surface.defaults(); p.exp[0].atm = 40; return p; }],
    ['wing', '示範：翼部日曆套利', () => { const p = surface.defaults(); Object.assign(p.exp[0], { skew: -6, curv: 2 }); Object.assign(p.exp[1], { skew: -0.5, curv: 0 }); return p; }],
  ];

  function mountVolSurface(rootEl) {
    const S = surface;
    let p = S.defaults();
    let sel = 0, xMode = 'strike', lastChange = null, causes = {}, diag = null;
    const mv = { move: -5, K: 95, kind: 'put' };
    const upd = rafThrottle(update);
    const label = (i, what) => `${S.NAMES[i]} ${what}`;
    const change = (txt) => { lastChange = txt; upd(); };

    // ---- 控制項 ----
    const expSeg = seg({ label: '編輯哪個到期', options: [[0, 'T1'], [1, 'T2'], [2, 'T3']], value: 0, onChange: v => { sel = v; syncSliders(); upd(); } });
    const sDays = slider({ label: '天數', min: 7, max: 60, step: 1, value: 30, fmt: v => `${v} 天`, onInput: v => { p.exp[sel].days = v; change(`${label(sel, '天數')} → ${v} 天`); } });
    const sAtm = slider({ label: 'ATM vol', min: 5, max: 80, step: 0.5, value: 24, fmt: v => `${fmt(v, 1)}%`, onInput: v => { p.exp[sel].atm = v; change(`${label(sel, 'ATM vol')} → ${fmt(v, 1)}%`); } });
    const sSkew = slider({ label: 'Skew（每 1σ 的 vol 點）', min: -8, max: 4, step: 0.1, value: -3, fmt: v => fmtSg(v, 1), onInput: v => { p.exp[sel].skew = v; change(`${label(sel, 'skew')} → ${fmtSg(v, 1)}`); } });
    const sCurv = slider({ label: '曲率（每 σ² 的 vol 點）', min: -3, max: 4, step: 0.1, value: 0.8, fmt: v => fmtSg(v, 1), onInput: v => { p.exp[sel].curv = v; change(`${label(sel, '曲率')} → ${fmtSg(v, 1)}`); } });
    const sBump = slider({ label: '單一履約價標記偏差', min: -5, max: 5, step: 0.25, value: 0, fmt: v => `${fmtSg(v, 2)} 點`, onInput: v => { p.exp[sel].bump = v; change(`${label(sel, '標記偏差')} → ${fmtSg(v, 2)}`); } });
    const sBumpK = slider({ label: '偏差所在履約價', min: 80, max: 120, step: 1, value: 95, fmt: v => String(v), onInput: v => { p.exp[sel].bumpK = v; change(`${label(sel, '偏差履約價')} → ${v}`); } });
    const sShift = slider({ label: '整體平移（全部 ATM）', min: -10, max: 10, step: 0.5, value: 0, fmt: v => `${fmtSg(v, 1)} 點`, onInput: v => { p.shift = v; change(`整體平移 → ${fmtSg(v, 1)}`); } });
    const sTilt = slider({ label: '期限斜率（後端 − 前端）', min: -12, max: 12, step: 0.5, value: 0, fmt: v => `${fmtSg(v, 1)} 點`, onInput: v => { p.tilt = v; change(`期限斜率 → ${fmtSg(v, 1)}`); } });
    function syncSliders() {
      const e = p.exp[sel], r = S.DAYS_RANGE[sel];
      sDays.config({ min: r[0], max: r[1], label: `${S.NAMES[sel]} 天數` });
      sDays.set(e.days, true);
      sAtm.config({ label: `${S.NAMES[sel]} ATM vol（未含平移／斜率）` }); sAtm.set(e.atm, true);
      sSkew.config({ label: `${S.NAMES[sel]} skew（每 1σ 的 vol 點）` }); sSkew.set(e.skew, true);
      sCurv.config({ label: `${S.NAMES[sel]} 曲率（每 σ² 的 vol 點）` }); sCurv.set(e.curv, true);
      sBump.config({ label: `${S.NAMES[sel]} 單一履約價標記偏差` }); sBump.set(e.bump || 0, true);
      sBumpK.config({ label: `${S.NAMES[sel]} 偏差所在履約價` }); sBumpK.set(e.bumpK || 95, true);
      sShift.set(p.shift, true); sTilt.set(p.tilt, true);
    }
    const presetBtns = SURF_PRESETS.map(([k, name, fn]) => h('button', { type: 'button', class: 'nqs-btn', text: name, onclick: () => { p = fn(); lastChange = `情境「${name}」`; causes = {}; syncSliders(); upd(); } }));
    const sumTable = h('div', { class: 'nqs-tablewrap' });
    const diagBox = h('div', { class: 'nqs-diag', 'aria-live': 'polite' });

    const controls = panel('曲面參數',
      h('p', { class: 'nqs-note', html: '模型：\\(\\sigma(k)=\\sigma_{ATM}+\\text{skew}\\cdot z+\\text{curv}\\cdot z^2\\)（vol 點），其中 \\(k=\\ln(K/F)\\)、\\(z=k/(\\sigma_{ATM}\\sqrt{T})\\)（相對 ATM 幾個標準差），另可在單一履約價加上標記偏差。標的 F = 100、利率 0。' }),
      expSeg.el,
      h('div', { class: 'nqs-controls' }, sDays.el, sAtm.el, sSkew.el, sCurv.el),
      h('div', { class: 'nqs-ctl-head nqs-sub', text: '單一履約價的標記偏差（模擬手動標錯一個價位）' }),
      h('div', { class: 'nqs-controls' }, sBump.el, sBumpK.el),
      h('div', { class: 'nqs-ctl-head nqs-sub', text: '期限結構（同時作用在三個到期）' }),
      h('div', { class: 'nqs-controls' }, sShift.el, sTilt.el),
      h('div', { class: 'nqs-ctl-head nqs-sub', text: '情境' }),
      h('div', { class: 'nqs-presets' }, presetBtns),
      sumTable);
    const diagPanel = panel('即時無套利診斷', diagBox);

    // ---- 圖表 ----
    const xSeg = seg({ options: [['strike', '橫軸：履約價'], ['delta', '橫軸：call delta']], value: 'strike', onChange: v => { xMode = v; smile.cx = null; upd(); } });
    const smileP = panel('各到期的 smile', xSeg.el);
    const smile = new MiniChart(smileP, { height: 300 });
    const wP = panel('Total variance \\(w=\\sigma^2T\\) 對 log-moneyness \\(k\\)');
    const wNote = h('p', { class: 'nqs-note', text: '無日曆套利 ⇔ 在每個 k，較遠到期的線都要在較近到期的上方（不可交叉）。每條線畫在自己 ±3.5 個標準差內；診斷只檢查近月 ±3 個標準差內的履約價（再外面的報價幾乎沒有流動性，簡化二次式也不可靠）。紅色區段＝交叉處。' });
    wP.append(wNote);
    const wChart = new MiniChart(wP, { height: 280 });
    const dP = panel('隱含機率密度（Breeden–Litzenberger）');
    dP.append(h('p', { class: 'nqs-note', html: '\\(q(K)=\\partial^2C/\\partial K^2\\)，用相鄰三個履約價的蝶式價差近似。虛線＝目前選取到期用 ATM vol 的對數常態（無 smile）作對照。紅色區段＝密度為負（蝶式套利）。' }));
    const dChart = new MiniChart(dP, { height: 280 });

    // ---- 標的移動 ----
    const sMove = slider({ label: '標的移動', min: -10, max: 10, step: 0.5, value: mv.move, fmt: v => `${fmtSg(v, 1)}%`, onInput: v => { mv.move = v; upd(); } });
    const sK = slider({ label: '選擇權履約價', min: 70, max: 130, step: 1, value: mv.K, fmt: v => String(v), onInput: v => { mv.K = v; upd(); } });
    const kindSeg = seg({ label: '種類', options: [['call', '買權 call'], ['put', '賣權 put']], value: mv.kind, onChange: v => { mv.kind = v; upd(); } });
    const mvTable = h('div', { class: 'nqs-tablewrap' });
    const mvNote = h('p', { class: 'nqs-note' });
    const mvP = panel('標的移動：sticky strike vs sticky delta',
      h('p', { class: 'nqs-note', text: '用「編輯哪個到期」選到期。sticky strike：每個履約價的 vol 不變；sticky delta（此模型中等同 sticky moneyness）：smile 跟著標的平移，同一個價性的 vol 不變。' }),
      h('div', { class: 'nqs-controls' }, sMove.el, sK.el, kindSeg.el), mvTable, mvNote);
    const mvChart = new MiniChart(mvP, { height: 260 });

    rootEl.append(h('div', { class: 'nqs-cols' }, h('div', null, controls, diagPanel), h('div', null, smileP, wP)), dP, mvP);
    if (root.NQ && root.NQ.renderMath) root.NQ.renderMath(rootEl);

    function rangesTxt(rs) {
      return rs.slice(0, 3).map(([a, b]) => (Math.abs(a - b) < 0.05 ? fmt(a, 1) : `${fmt(a, 1)}–${fmt(b, 1)}`)).join('、') + (rs.length > 3 ? ' 等' : '');
    }
    function flagHTML(f) {
      const n = f.exps.map(i => S.NAMES[i]);
      let title, body;
      if (f.type === 'butterfly') {
        title = `蝶式套利（${n[0]}）`;
        body = `履約價 ${rangesTxt(f.ranges)} 附近隱含密度為負（最低 ${f.worst.toExponential(1).replace('-', '−')}）。在這裡買進蝶式價差（+1 K−h、−2 K、+1 K+h）的成本為負，到期最差也是 0：白拿錢。`;
      } else if (f.type === 'vertical') {
        title = `垂直價差套利（${n[0]}）`;
        body = `履約價 ${rangesTxt(f.ranges)} 附近，較高履約價的 call 反而比較貴（call 價格必須隨履約價遞減）。`;
      } else {
        title = `日曆套利（${n[0]} → ${n[1]}）`;
        body = `履約價 ${rangesTxt(f.ranges)} 附近，${n[1]} 的 total variance 比 ${n[0]} 小（最多差 ${fmt(-f.worst * 1e4, 2)}×10⁻⁴）。在同一個價性上「賣近買遠」的日曆價差成本為負。`;
      }
      return `<div class="nqs-flag"><div class="nqs-flag-t">${esc(title)}</div><div>${esc(body)}</div>` +
        `<div class="nqs-flag-c">觸發：<b>${esc(causes[f.key] || '初始設定')}</b>　相關參數：${esc(S.related(f).join('、'))}</div></div>`;
    }

    function update() {
      diag = S.diagnose(p);
      causes = S.attribute(causes, diag.flags, lastChange);
      // ---- 摘要表 ----
      let t = '<table class="nqs-table"><thead><tr><th>到期</th><th>天數</th><th>有效 ATM</th><th>skew</th><th>曲率</th><th>標記偏差</th><th>ATM w=σ²T</th></tr></thead><tbody>';
      for (let i = 0; i < 3; i++) {
        const e = p.exp[i], a = S.atm(p, i);
        t += `<tr${i === sel ? ' class="nqs-sel"' : ''}><td><span class="nqs-sw" style="background:${COLORS[i]}"></span> ${S.NAMES[i]}</td><td>${e.days}</td><td>${fmt(a * 100, 1)}%</td><td>${fmtSg(e.skew, 1)}</td><td>${fmtSg(e.curv, 1)}</td><td>${e.bump ? `${fmtSg(e.bump, 2)} @${e.bumpK}` : '—'}</td><td>${fmt(a * a * S.T(p, i), 4)}</td></tr>`;
      }
      sumTable.innerHTML = t + '</tbody></table>';
      expSeg.btns.forEach((b, i) => { b.textContent = `${S.NAMES[i]}（${p.exp[i].days} 天）`; });
      // ---- 診斷 ----
      diagBox.innerHTML = diag.flags.length
        ? diag.flags.map(flagHTML).join('')
        : '<div class="nqs-ok">沒有偵測到靜態套利：三條 smile 的密度皆為正、call 價格隨履約價遞減，且 total variance 隨到期遞增。</div>';
      // ---- smile ----
      const smileSeries = [], bands = [];
      for (let i = 0; i < 3; i++) {
        const sd = S.atm(p, i) * Math.sqrt(S.T(p, i)), pts = [];
        for (let j = 0; j <= 120; j++) {
          const K = p.S * Math.exp(-3 * sd + 6 * sd * j / 120);
          const v = S.volK(p, i, K);
          if (xMode === 'strike') pts.push([K, v * 100]);
          else pts.push([M().bsDelta(p.S, K, S.T(p, i), v, 0, 0, 'call'), v * 100]);
        }
        if (xMode === 'delta') pts.sort((a, b) => a[0] - b[0]);
        smileSeries.push({ name: `${S.NAMES[i]}（${p.exp[i].days} 天）`, color: COLORS[i], width: i === sel ? 3 : 2, pts });
      }
      if (xMode === 'strike') for (const f of diag.flags) if (f.type !== 'calendar') for (const r of f.ranges) bands.push({ x0: r[0], x1: r[1] });
      smile.set({
        series: smileSeries, bands, xName: xMode === 'strike' ? '履約價' : 'call delta', xLabel: xMode === 'strike' ? '履約價 K' : 'call delta（用各自的 vol 計算）',
        yLabel: '隱含 vol（%）', yFmt: v => fmt(v, 2) + '%', xDomain: xMode === 'delta' ? [0.03, 0.97] : null,
        vmarks: xMode === 'strike' ? [{ x: p.S, label: 'F' }] : [{ x: 0.5, label: '50Δ' }],
      });
      // ---- total variance ----
      const wSeries = [0, 1, 2].map(i => ({ name: S.NAMES[i], color: COLORS[i], width: i === sel ? 3 : 2, pts: diag.wCurves[i] }));
      const wBands = [];
      for (const f of diag.flags) if (f.type === 'calendar') for (const r of f.ranges) wBands.push({ x0: Math.log(r[0] / p.S), x1: Math.log(r[1] / p.S) });
      wChart.set({ series: wSeries, bands: wBands, xName: 'k', xLabel: 'log-moneyness k = ln(K/F)', yLabel: 'w = σ²T', yFmt: v => fmt(v, 4), yInclude: [0],
        xFmt: v => `${fmt(v, 3)}（K≈${fmt(p.S * Math.exp(v), 1)}）`, vmarks: [{ x: 0, label: 'ATM' }] });
      // ---- density ----
      const dSeries = [0, 1, 2].map(i => ({ name: S.NAMES[i], color: COLORS[i], width: i === sel ? 3 : 2, pts: diag.dens[i].K.map((K, j) => [K, diag.dens[i].q[j]]) }));
      const a = S.atm(p, sel), Ts = S.T(p, sel), ln = [];
      for (const K of diag.dens[sel].K) {
        const d2 = (Math.log(p.S / K) - 0.5 * a * a * Ts) / (a * Math.sqrt(Ts));
        ln.push([K, M().normPdf(d2) / (K * a * Math.sqrt(Ts))]);
      }
      dSeries.push({ name: `${S.NAMES[sel]} 對數常態（無 smile）`, color: COLORS[sel], dash: '5 4', width: 1.5, pts: ln });
      const dBands = [];
      for (const f of diag.flags) if (f.type === 'butterfly') for (const r of f.ranges) dBands.push({ x0: r[0], x1: r[1] });
      const lo = p.S * Math.exp(-3.2 * S.atm(p, 2) * Math.sqrt(S.T(p, 2))), hi = p.S * Math.exp(2.6 * S.atm(p, 2) * Math.sqrt(S.T(p, 2)));
      dChart.set({ series: dSeries, bands: dBands, xName: '履約價', xLabel: '到期時標的價格 / 履約價 K', yLabel: '機率密度', yFmt: v => fmt(v, 4), yInclude: [0], xDomain: [lo, hi], vmarks: [{ x: p.S, label: 'F' }] });
      updateMove();
    }

    function updateMove() {
      const r = S.spotMove(p, sel, mv.K, mv.kind, mv.move);
      const row = (name, a, b, c, f) => `<tr><th>${name}</th><td>${f(a)}</td><td>${f(b)}</td><td>${f(c)}</td></tr>`;
      const v = x => fmt(x * 100, 2) + '%', pr = x => fmt(x, 3), dl = x => fmt(x, 3);
      mvTable.innerHTML = `<table class="nqs-table"><thead><tr><th>${S.NAMES[sel]} ${mv.kind === 'call' ? 'call' : 'put'} K=${mv.K}</th><th>移動前 S=${fmt(r.S0, 2)}</th><th>sticky strike S=${fmt(r.S1, 2)}</th><th>sticky delta S=${fmt(r.S1, 2)}</th></tr></thead><tbody>` +
        row('這個履約價的 vol', r.v0, r.vSS, r.vSD, v) +
        row('選擇權價格', r.p0, r.pSS, r.pSD, pr) +
        row('BS delta', r.d0, r.dSS, r.dSD, dl) +
        `<tr><th>有效 delta（含 vol 變動）</th><td>${dl(r.d0)}／${dl(r.eff0)}</td><td>${dl(r.dSS)}</td><td>${dl(r.eff1)}</td></tr>` +
        row('ATM vol（新標的價）', S.atm(p, sel), r.atmSS, r.atmSD, v) +
        '</tbody></table>';
      const diffP = r.pSD - r.pSS, dS = r.S1 - r.S0;
      const predBS = r.d0 * dS, predEff = r.eff0 * dS;
      mvNote.innerHTML = esc(`兩種假設的價格差 = ${fmtSg(diffP, 3)}（約 ${fmtSg(diffP / Math.max(1e-9, r.vega0), 2)} 個 vega）。`) +
        esc(`移動前：BS delta ${dl(r.d0)}，sticky delta 下的有效 delta ${dl(r.eff0)}（差 ${fmtSg(r.eff0 - r.d0, 3)} = vega × ∂σ/∂S）。`) +
        esc(`用 BS delta 預估價格變化 ${fmtSg(predBS, 3)}，用有效 delta 預估 ${fmtSg(predEff, 3)}；實際：sticky strike ${fmtSg(r.pSS - r.p0, 3)}、sticky delta ${fmtSg(r.pSD - r.p0, 3)}（差額來自 gamma）。`) +
        esc(mv.move === 0 ? '' : ` 負 skew 下，標的${mv.move > 0 ? '上漲' : '下跌'}時 sticky delta 讓這個履約價的價性${mv.move > 0 ? '變低、vol 變高' : '變高、vol 變低'}。`);
      const sd = S.atm(p, sel) * Math.sqrt(S.T(p, sel));
      const before = [], after = [];
      for (let j = 0; j <= 100; j++) {
        const K = r.S0 * Math.exp(-3 * sd + 6 * sd * j / 100);
        before.push([K, S.volK(p, sel, K, r.S0) * 100]);
        after.push([K, S.volK(p, sel, K, r.S1) * 100]);
      }
      mvChart.set({
        series: [{ name: '移動前＝sticky strike（smile 固定在履約價上）', color: COLORS[sel], width: 2.5, pts: before }, { name: 'sticky delta（smile 跟著標的平移）', color: 'var(--nqs-c4)', dash: '6 4', width: 2.5, pts: after }],
        xName: '履約價', xLabel: '履約價 K', yLabel: '隱含 vol（%）', yFmt: x => fmt(x, 2) + '%',
        vmarks: [{ x: r.S0, label: 'S 前' }, { x: r.S1, label: 'S 後', color: 'var(--nqs-c4)' }, { x: mv.K, label: 'K', solid: true }],
        points: [{ x: mv.K, y: r.vSS * 100, color: COLORS[sel] }, { x: mv.K, y: r.vSD * 100, color: 'var(--nqs-c4)' }],
      });
    }

    syncSliders();
    update();
  }

  // =========================================================================
  // 5. 模擬造市遊戲
  // =========================================================================
  const MM_KEY = 'nq:mm';

  function mountMockMM(rootEl) {
    const E = mm;
    const cfg = { diff: 'normal', minutes: 5, nStrikes: 5, seed: null };
    let eng = null, lastSeed = null, running = false, speed = 1, prevSpeed = 1, raf = 0;
    let acc = 0, lastNow = 0, lastRender = 0, lastChart = 0, coachQ = null, coachStart = 0, coachTimer = 0;
    const live = () => document.contains(rootEl);

    // ---------------- 開局設定 ----------------
    const diffSeg = seg({ label: '難度', options: Object.entries(E.DIFFS).map(([k, d]) => [k, d.label]), value: cfg.diff, onChange: v => { cfg.diff = v; showRules(); } });
    const lenSeg = seg({ label: '局長（遊戲時間；1 分鐘 = 1 個交易日）', options: [[3, '3 分鐘'], [5, '5 分鐘'], [10, '10 分鐘']], value: cfg.minutes, onChange: v => { cfg.minutes = v; } });
    const kSeg = seg({ label: '履約價數量', options: [[3, '3 個（95–105）'], [5, '5 個（90–110）']], value: cfg.nStrikes, onChange: v => { cfg.nStrikes = v; } });
    const rulesBox = h('div', { class: 'nqs-note' });
    const startBtn = h('button', { type: 'button', class: 'nqs-btn nqs-btn-primary nqs-big', text: '開始新的一局', onclick: () => start(null) });
    const replayBtn = h('button', { type: 'button', class: 'nqs-btn', text: '用上一局的種子重玩', hidden: true, onclick: () => start(lastSeed) });
    const setup = panel('開局設定', h('div', { class: 'nqs-controls' }, diffSeg.el, lenSeg.el, kSeg.el), rulesBox, h('div', { class: 'nqs-btnrow' }, startBtn, replayBtn));
    function showRules() {
      const d = E.DIFFS[cfg.diff];
      rulesBox.textContent = `${d.label}：delta 限額 ±${d.deltaLim} 股、vega 限額 ±${d.vegaLim}、每個選擇權部位上限 ±${E.OPT_LIMIT} 口；` +
        `平時知情流約 ${Math.round(d.pInf * 100)}%，消息前後升到 ${Math.round(d.pInfNews * 100)}%；教練提問限時 ${d.coachSec} 秒；市場報價寬度約 ±${d.compHW} vol。`;
    }
    showRules();

    // ---------------- 遊戲畫面 ----------------
    const hud = {
      time: h('b'), S: h('b'), atm: h('b'), rv: h('b'), pnl: h('b'), tau: h('b'),
    };
    const speedSeg = seg({ options: [[0, '暫停'], [1, '1×'], [2, '2×'], [4, '4×']], value: 1, label: '', onChange: v => { speed = v; if (v) prevSpeed = v; acc = 0; } });
    const endBtn = h('button', { type: 'button', class: 'nqs-btn nqs-btn-danger', text: '提前結束', onclick: () => { if (eng && !eng.done && confirm('確定提前結束這一局？未完成的時間不計分。')) finish(true); } });
    const hudEl = h('div', { class: 'nqs-hud' },
      h('div', { class: 'nqs-hud-stats' },
        h('span', null, '剩餘 ', hud.time), h('span', null, '標的 ', hud.S), h('span', null, '市場 ATM vol ', hud.atm),
        h('span', null, '實現 vol（30 秒）', hud.rv), h('span', null, '到期 ', hud.tau), h('span', null, '損益 ', hud.pnl)),
      h('div', { class: 'nqs-hud-ctl' }, speedSeg.el, endBtn));
    const banner = h('div', { class: 'nqs-banner', hidden: true, 'aria-live': 'polite' });
    const toast = h('div', { class: 'nqs-toast', hidden: true, role: 'status' });

    // 報價
    const modeSeg = seg({ label: '報價模式', options: [['vol', 'Vol 模式（vol 點）'], ['price', '價格模式']], value: 'vol', onChange: v => { eng && eng.setQuote({ mode: v }); syncQuoteCtl(); render(true); } });
    const q = () => (eng ? eng.st.q : { mode: 'vol', volC: 20, hwVol: 1.5, hwPx: 0.15, leanVol: 0, leanPx: 0, size: 20, pulled: false });
    const setQ = patch => { if (eng) { eng.setQuote(patch); syncQuoteCtl(); render(true); } };
    const alignBtn = h('button', { type: 'button', class: 'nqs-btn', text: '對齊市場', onclick: () => { if (eng) setQ({ volC: Math.round(eng.atmVol(eng.st.n) * 400) / 4 }); } });
    const stVol = stepper({ label: '我的 ATM vol（theo）', get: () => q().volC, set: v => setQ({ volC: Math.round(v * 100) / 100 }), step: 0.25, fmt: v => fmt(v, 2) + '%', extra: alignBtn });
    const stHW = stepper({ label: '半寬（每邊）', get: () => (q().mode === 'vol' ? q().hwVol : q().hwPx), set: v => setQ(q().mode === 'vol' ? { hwVol: Math.round(v * 100) / 100 } : { hwPx: v }), step: () => (q().mode === 'vol' ? 0.25 : 0.01), fmt: v => (q().mode === 'vol' ? `±${fmt(v, 2)} vol` : `±${fmt(v, 2)}`) });
    const stLean = stepper({ label: '偏移（lean，正＝報價整體上移）', get: () => (q().mode === 'vol' ? q().leanVol : q().leanPx), set: v => setQ(q().mode === 'vol' ? { leanVol: Math.round(v * 100) / 100 } : { leanPx: Math.round(v * 100) / 100 }), step: () => (q().mode === 'vol' ? 0.25 : 0.01), fmt: v => (q().mode === 'vol' ? `${fmtSg(v, 2)} vol` : fmtSg(v, 2)) });
    const stSize = stepper({ label: '每邊數量（口）', get: () => q().size, set: v => setQ({ size: v }), step: 5, fmt: v => `${v} 口` });
    const pullBtn = h('button', { type: 'button', class: 'nqs-btn nqs-btn-warn', text: '全部撤單', onclick: () => setQ({ pulled: !q().pulled }) });
    const zeroLeanBtn = h('button', { type: 'button', class: 'nqs-btn', text: '偏移歸零', onclick: () => setQ({ leanVol: 0, leanPx: 0 }) });
    function syncQuoteCtl() {
      if (eng) modeSeg.set(eng.st.q.mode, true);
      [stVol, stHW, stLean, stSize].forEach(s => s.show());
      pullBtn.textContent = q().pulled ? '恢復報價' : '全部撤單';
      pullBtn.setAttribute('aria-pressed', String(!!q().pulled));
    }
    const quoteP = panel('我的報價', modeSeg.el, h('div', { class: 'nqs-controls' }, stVol.el, stHW.el, stLean.el, stSize.el), h('div', { class: 'nqs-btnrow' }, pullBtn, zeroLeanBtn),
      h('p', { class: 'nqs-note', text: '報價引擎會依目前標的價格與你的 vol（加上市場的 skew 形狀）自動重算；你決定 vol 水準、寬度、偏移與數量。價格模式下寬度與偏移以權利金表示。' }));

    // 報價鏈
    const chainBody = h('tbody');
    const chainP = panel('選擇權鏈（30 天到期起算）', h('div', { class: 'nqs-tablewrap' }, h('table', { class: 'nqs-table nqs-chain' },
      h('thead', null, h('tr', null, h('th', { text: '商品' }), h('th', { text: '市場 bid / ask' }), h('th', { text: '我的 bid / ask' }), h('th', { text: '部位' }), h('th', { text: '報價' }))),
      chainBody)), h('p', { class: 'nqs-note', text: '小字為對應的隱含 vol。底色＝你的價格比市場好（會優先成交）。部位：正＝買進（長）、負＝賣出（短）。' }));
    let rowEls = [];
    function buildChain() {
      chainBody.innerHTML = '';
      rowEls = eng.insts.map((it, i) => {
        const r = { name: h('td', { class: 'nqs-inst' }), m: h('td'), u: h('td'), pos: h('td', { class: 'nqs-num' }), tg: h('button', { type: 'button', class: 'nqs-btn nqs-tg', text: '開' }) };
        r.tg.addEventListener('click', () => { const on = eng.st.q.on.slice(); on[i] = !on[i]; setQ({ on }); });
        r.name.innerHTML = `<b>${it.id}</b><small>${it.kind === 'call' ? '買權' : '賣權'} K=${it.K}</small>`;
        chainBody.append(h('tr', null, r.name, r.m, r.u, r.pos, h('td', null, r.tg)));
        return r;
      });
    }

    // 避險
    const hedgeMsg = h('div', { class: 'nqs-note' });
    const hb = (qty, txt, cls) => h('button', { type: 'button', class: 'nqs-btn ' + cls, text: txt, onclick: () => doHedge(qty) });
    const hedgeP = panel('標的避險（市價，每股成本 0.01）',
      h('div', { class: 'nqs-hedge' },
        hb(-100, '賣 100', 'nqs-sell'), hb(-50, '賣 50', 'nqs-sell'), hb(-10, '賣 10', 'nqs-sell'),
        hb(10, '買 10', 'nqs-buy'), hb(50, '買 50', 'nqs-buy'), hb(100, '買 100', 'nqs-buy')),
      h('div', { class: 'nqs-btnrow' }, h('button', { type: 'button', class: 'nqs-btn nqs-btn-primary', text: 'Delta 歸零', onclick: () => { if (eng) doHedge(-Math.round(eng.netDelta())); } })),
      hedgeMsg);
    function doHedge(qty) {
      if (!eng || !running) return;
      const r = eng.hedge(qty);
      if (!r.ok) { flash(r.reason, 'warn'); return; }
      if (r.signError) flash(`符號錯誤！避險前 delta ${fmtSg(r.before, 0)}，你${qty > 0 ? '買' : '賣'}了 ${Math.abs(qty)} 股，delta 變成 ${fmtSg(r.after, 0)}。`, 'bad');
      render(true);
    }
    let toastT = 0;
    function flash(msg, kind) {
      toast.textContent = msg;
      toast.className = 'nqs-toast nqs-toast-' + (kind || 'info');
      toast.hidden = false;
      clearTimeout(toastT);
      toastT = setTimeout(() => { toast.hidden = true; }, 3500);
    }

    // 風險
    const gk = { delta: h('b'), gamma: h('b'), vega: h('b'), theta: h('b'), stock: h('b') };
    const bar = name => {
      const fill = h('div', { class: 'nqs-bar-fill' }), val = h('span');
      return { el: h('div', { class: 'nqs-limit' }, h('div', { class: 'nqs-limit-h' }, h('span', { text: name }), val), h('div', { class: 'nqs-bar' }, h('div', { class: 'nqs-bar-mid' }), fill)), fill, val };
    };
    const barD = bar('Delta 限額'), barV = bar('Vega 限額');
    const penalty = h('div', { class: 'nqs-note' });
    const riskP = panel('部位與 Greeks（市場 vol 計算）',
      h('div', { class: 'nqs-ro-grid' },
        h('div', { class: 'nqs-ro' }, h('span', { text: 'Delta（股）' }), gk.delta),
        h('div', { class: 'nqs-ro' }, h('span', { text: 'Gamma（每 1 點）' }), gk.gamma),
        h('div', { class: 'nqs-ro' }, h('span', { text: 'Vega（每 vol 點）' }), gk.vega),
        h('div', { class: 'nqs-ro' }, h('span', { text: 'Theta（每交易日）' }), gk.theta),
        h('div', { class: 'nqs-ro' }, h('span', { text: '標的部位' }), gk.stock)),
      barD.el, barV.el, penalty);

    // 損益
    const SPLIT = [['edge', '成交優勢（相對市場 theo）'], ['hedge', '避險成本'], ['delta', '方向（淨 delta × 價格變動）'], ['gt', 'Gamma＋Theta'], ['vega', '波動率（vega × vol 變動）']];
    const splitEls = {};
    const pnlP = panel('損益拆解', h('div', { class: 'nqs-split' }, SPLIT.map(([k, name]) => {
      const v = h('b'), f = h('div', { class: 'nqs-split-fill' });
      splitEls[k] = { v, f };
      return h('div', { class: 'nqs-split-row' }, h('span', { text: name }), h('div', { class: 'nqs-split-bar' }, f), v);
    })));
    const spotChart = new MiniChart(pnlP, { height: 170, minH: 130 });
    const pnlChart = new MiniChart(pnlP, { height: 170, minH: 130 });

    // 成交紀錄
    const tapeEl = h('ol', { class: 'nqs-tape', reversed: true });
    const tapeP = panel('成交與事件紀錄（最新在上）', tapeEl);

    const game = h('div', { class: 'nqs-game', hidden: true }, hudEl, banner, toast,
      h('div', { class: 'nqs-cols' }, h('div', null, quoteP, chainP, hedgeP), h('div', null, riskP, pnlP, tapeP)));

    // ---------------- 教練拍肩 ----------------
    const coachEl = h('div', { class: 'nqs-coach', hidden: true, role: 'dialog', 'aria-modal': 'false', 'aria-label': '教練拍肩' });
    // ---------------- 復盤與歷史 ----------------
    const debriefEl = h('div', { class: 'nqs-debrief', hidden: true });
    const histP = panel('歷史紀錄與趨勢（存在這台裝置）');
    const histBody = h('div');
    histP.append(histBody);
    const histChart = new MiniChart(histP, { height: 200, minH: 140 });
    const clearBtn = h('button', { type: 'button', class: 'nqs-btn nqs-btn-danger', text: '清除歷史紀錄', onclick: () => { if (confirm('確定清除所有模擬造市紀錄？')) { storeSet(MM_KEY, { sessions: [] }); renderHistory(); } } });
    histP.append(h('div', { class: 'nqs-btnrow' }, clearBtn));

    rootEl.append(setup, game, debriefEl, histP, coachEl);

    // ---------------- 流程 ----------------
    function start(seed) {
      const s = seed || (1 + Math.floor(Math.random() * 999999));
      lastSeed = s;
      eng = E.create({ seed: s, minutes: cfg.minutes, diff: cfg.diff, nStrikes: cfg.nStrikes });
      buildChain();
      setup.hidden = true; debriefEl.hidden = true; game.hidden = false; coachEl.hidden = true;
      running = true; speed = 1; prevSpeed = 1; speedSeg.set(1, true); acc = 0;
      spotChart.cx = null; pnlChart.cx = null;
      syncQuoteCtl();
      render(true); renderCharts();
      lastNow = performance.now();
      schedule();
      game.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // rAF 為主；背景或被節流的嵌入頁面 rAF 可能停住，150ms 的 setTimeout 備援（每輪只會跑其中一個）
    let schedTok = 0;
    function schedule() {
      const tok = ++schedTok;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(t => { if (tok === schedTok) frame(t); });
      setTimeout(() => { if (tok === schedTok) frame(performance.now()); }, 150);
    }
    function frame(now) {
      schedTok++;
      if (!live()) { running = false; return; }
      const dt = Math.min(0.25, (now - lastNow) / 1000);
      lastNow = now;
      if (running && speed > 0 && !coachQ) {
        acc += dt * speed;
        let guard = 0;
        while (acc >= E.TICK && guard++ < 40) {
          acc -= E.TICK;
          eng.step();
          if (eng.done) { finish(false); return; }
          if (eng.st.coachPending) { openCoach(); break; }
        }
      }
      if (coachQ) tickCoach(now);
      if (now - lastRender > 200) { lastRender = now; render(false); }
      if (now - lastChart > 700) { lastChart = now; renderCharts(); }
      if (running) schedule();
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && running && speed > 0 && live()) { speed = 0; speedSeg.set(0, true); flash('切換到背景，已自動暫停。', 'info'); }
    });

    function render(force) {
      if (!eng) return;
      const s = eng.snapshot();
      setText(hud.time, mmss(s.remainingSec));
      setText(hud.S, fmt(s.S, 2));
      setText(hud.atm, pct(s.atmVol, 1));
      setText(hud.rv, pct(s.rv, 1));
      setText(hud.tau, `${fmt(s.tauDays, 1)} 天`);
      setText(hud.pnl, fmtSg(s.pnl, 2));
      setCls(hud.pnl, s.pnl >= 0 ? 'nqs-pos' : 'nqs-neg');
      // 事件
      let bt = '', bc = 'nqs-banner';
      if (s.upcoming) { bt = `預告：「${s.upcoming.label}」將在 ${Math.ceil(s.upcoming.secLeft)} 秒後公布`; bc += ' nqs-banner-warn'; }
      else if (s.recent) { bt = `${s.recent.sched ? '公布' : '新聞'}：「${s.recent.label}」標的跳動 ${fmtSg(s.recent.jump * 100, 1)}%`; bc += ' nqs-banner-news'; }
      banner.hidden = !bt; setText(banner, bt); setCls(banner, bc);
      // 鏈
      s.rows.forEach((r, i) => {
        const e = rowEls[i];
        if (!e) return;
        const pv = (px, v) => (px == null ? '—' : `${fmt(px, 2)}`) + (px == null || v == null ? '' : ` (${fmt(v * 100, 1)})`);
        setText(e.m, `${pv(r.mBid, r.mBidV)} / ${pv(r.mAsk, r.mAskV)}`);
        setText(e.u, r.uBid == null && r.uAsk == null ? (s.q.pulled || !r.on ? '已撤單' : '—') : `${pv(r.uBid, r.uBidV)} / ${pv(r.uAsk, r.uAskV)}`);
        const better = (r.uBid != null && (r.mBid == null || r.uBid > r.mBid + 1e-9)) || (r.uAsk != null && r.uAsk < r.mAsk - 1e-9);
        setCls(e.u, better ? 'nqs-best' : '');
        setText(e.pos, fmtSg(r.pos, 0));
        setCls(e.pos, 'nqs-num ' + (r.pos > 0 ? 'nqs-pos' : r.pos < 0 ? 'nqs-neg' : ''));
        setText(e.tg, r.on ? '開' : '關');
        e.tg.setAttribute('aria-pressed', String(r.on));
        e.tg.setAttribute('aria-label', `${r.id} 報價${r.on ? '開' : '關'}`);
      });
      // Greeks 與限額
      setText(gk.delta, fmtSg(s.delta, 0)); setText(gk.gamma, fmtSg(s.gamma, 2)); setText(gk.vega, fmtSg(s.vega, 1));
      setText(gk.theta, fmtSg(s.theta, 2)); setText(gk.stock, fmtSg(s.stock, 0));
      const setBar = (b, L, unit) => {
        const fr = clamp(L.val / L.lim, -1.2, 1.2), w = Math.min(1, Math.abs(fr)) * 50;
        b.fill.style.left = (fr >= 0 ? 50 : 50 - w) + '%';
        b.fill.style.width = w + '%';
        const lvl = L.frac >= 1 ? 'breach' : L.frac >= 0.9 ? 'red' : L.frac >= 0.7 ? 'amber' : 'ok';
        setCls(b.el, 'nqs-limit nqs-lv-' + lvl);
        setText(b.val, `${fmtSg(L.val, unit)} / ±${L.lim}（${Math.round(L.frac * 100)}%）${lvl === 'breach' ? ' 突破！' : ''}`);
      };
      setBar(barD, s.limits.delta, 0); setBar(barV, s.limits.vega, 1);
      setText(penalty, `限額突破 ${s.breaches} 次（共 ${Math.round(s.breachSec)} 秒）｜符號錯誤 ${s.signErrors} 次｜教練問答 ${eng.st.coach.filter(c => c.correct).length}/${eng.st.coach.length}`);
      // 損益拆解
      const sp = s.split, vals = { edge: sp.edge, hedge: sp.hedge, delta: sp.delta, gt: sp.gamma + sp.theta, vega: sp.vega };
      const mx = Math.max(1, ...Object.values(vals).map(Math.abs));
      for (const [k] of SPLIT) {
        const v = vals[k], w = Math.abs(v) / mx * 50;
        setText(splitEls[k].v, fmtSg(v, 2));
        setCls(splitEls[k].v, v >= 0 ? 'nqs-pos' : 'nqs-neg');
        splitEls[k].f.style.left = (v >= 0 ? 50 : 50 - w) + '%';
        splitEls[k].f.style.width = w + '%';
        setCls(splitEls[k].f, 'nqs-split-fill ' + (v >= 0 ? 'nqs-fpos' : 'nqs-fneg'));
      }
      // 紀錄
      const tape = eng.st.tape;
      const key = tape.length ? tape[tape.length - 1].n + ':' + tape.length : '0';
      if (force || tapeEl._k !== key) {
        tapeEl._k = key;
        tapeEl.innerHTML = tape.slice(-14).reverse().map(tapeHTML).join('');
      }
      if (force) syncQuoteCtl();
    }

    function tapeHTML(e) {
      const t = mmss(e.n * E.TICK), id = e.i != null ? eng.insts[e.i].id : '';
      if (e.kind === 'fill') return `<li class="nqs-t-fill"><span>${t}</span> 你${e.side === 'buy' ? '買進' : '賣出'} <b>${e.qty}</b> ${id} @ ${fmt(e.px, 2)} <span class="${e.edge >= 0 ? 'nqs-pos' : 'nqs-neg'}">優勢 ${fmtSg(e.edge, 2)}</span></li>`;
      if (e.kind === 'mkt') return `<li class="nqs-t-mkt"><span>${t}</span> 市場${e.side === 'buy' ? '買' : '賣'} ${e.qty} ${id} @ ${fmt(e.px, 2)}（不是你）</li>`;
      if (e.kind === 'hedge') return `<li class="nqs-t-hedge${e.signError ? ' nqs-t-bad' : ''}"><span>${t}</span> 避險：${e.qty > 0 ? '買' : '賣'} ${Math.abs(e.qty)} 股 @ ${fmt(e.px, 2)}${e.signError ? '（符號錯誤）' : ''}</li>`;
      if (e.kind === 'announce') return `<li class="nqs-t-ev"><span>${t}</span> 預告：「${esc(e.label)}」20 秒後公布</li>`;
      return `<li class="nqs-t-ev"><span>${t}</span> ${e.sched ? '公布' : '新聞'}：「${esc(e.label)}」標的 ${fmtSg(e.jump * 100, 1)}%</li>`;
    }

    function renderCharts() {
      if (!eng) return;
      const se = eng.st.series;
      const step = Math.max(1, Math.ceil(se.t.length / 240));
      const pick = arr => { const out = []; for (let j = 0; j < se.t.length; j += step) out.push([se.t[j], arr[j]]); if (se.t.length) out.push([se.t[se.t.length - 1], arr[arr.length - 1]]); return out; };
      const evs = eng.events.filter(e => e.tick <= eng.st.n).map(e => ({ x: e.tick * E.TICK, label: e.type === 'sched' ? '公布' : '新聞', color: 'var(--nqs-c2)' }));
      const xd = [0, eng.nTicks * E.TICK];
      spotChart.set({ series: [{ name: '標的價格', color: COLORS[0], pts: [[0, eng.S[0]]].concat(pick(se.S)) }], vmarks: evs, xDomain: xd, xName: '時間', xFmt: mmss, xTick: v => mmss(v), yLabel: '標的', hint: '點圖看數值' });
      pnlChart.set({ series: [{ name: '累積損益', color: COLORS[2], pts: [[0, 0]].concat(pick(se.pnl)) }], vmarks: evs, xDomain: xd, xName: '時間', xFmt: mmss, xTick: v => mmss(v), yLabel: '損益', yInclude: [0], hint: '點圖看數值' });
    }

    // ---------------- 教練 ----------------
    function openCoach() {
      coachQ = E.makeQuestion(eng);
      coachStart = performance.now();
      const bar = h('div', { class: 'nqs-coach-bar' }, h('div', { class: 'nqs-coach-fill' }));
      const left = h('span', { class: 'nqs-coach-left' });
      const btns = coachQ.choices.map((c, j) => h('button', { type: 'button', class: 'nqs-btn nqs-choice', text: `${'ABCD'[j]}. ${c}`, onclick: () => answer(j) }));
      coachEl.innerHTML = '';
      coachEl.append(
        h('div', { class: 'nqs-coach-head' }, h('b', { text: '教練拍肩' }), h('span', { class: 'nqs-muted', text: '遊戲已暫停' }), left),
        bar, h('p', { class: 'nqs-coach-q', text: coachQ.prompt }), h('div', { class: 'nqs-choices' }, btns),
        h('div', { class: 'nqs-coach-fb', hidden: true }));
      coachEl._left = left; coachEl._fill = bar.firstChild; coachEl._btns = btns;
      coachEl.hidden = false;
      render(true);
    }
    function tickCoach(now) {
      if (!coachQ || coachQ.answered) return;
      const el = (now - coachStart) / 1000, rem = coachQ.limitSec - el;
      setText(coachEl._left, `剩 ${Math.max(0, Math.ceil(rem))} 秒`);
      coachEl._fill.style.width = clamp(rem / coachQ.limitSec, 0, 1) * 100 + '%';
      if (rem <= 0) answer(-1);
    }
    function answer(j) {
      if (!coachQ || coachQ.answered) return;
      coachQ.answered = true;
      const el = (performance.now() - coachStart) / 1000;
      const r = E.answerQuestion(eng, coachQ, j, el);
      coachEl._btns.forEach((b, k) => {
        b.disabled = true;
        if (k === coachQ.answer) b.classList.add('nqs-right');
        else if (k === j) b.classList.add('nqs-wrong');
      });
      const fb = coachEl.querySelector('.nqs-coach-fb');
      fb.hidden = false;
      fb.innerHTML = '';
      fb.append(h('p', { class: r.correct ? 'nqs-pos' : 'nqs-neg', html: `<b>${r.correct ? '答對了！' : r.timeout ? '時間到。' : '答錯了。'}</b> 正解：${esc(coachQ.choices[coachQ.answer])}` }),
        h('p', { text: coachQ.explain }),
        h('button', { type: 'button', class: 'nqs-btn nqs-btn-primary nqs-big', text: '繼續交易', onclick: closeCoach }));
      setText(coachEl._left, `${fmt(el, 1)} 秒`);
    }
    function closeCoach() {
      coachQ = null;
      coachEl.hidden = true;
      lastNow = performance.now();
      acc = 0;
      render(true);
    }

    // ---------------- 結束與復盤 ----------------
    function finish(early) {
      running = false;
      schedTok++;
      cancelAnimationFrame(raf);
      coachQ = null; coachEl.hidden = true;
      render(true); renderCharts();
      const s = E.debrief(eng);
      if (!early) {
        const store = storeGet(MM_KEY);
        const list = Array.isArray(store.sessions) ? store.sessions : [];
        list.push(E.historyRecord(s));
        storeSet(MM_KEY, { sessions: list.slice(-60) });
      }
      showDebrief(s, early);
      renderHistory();
      setup.hidden = false;
      replayBtn.hidden = false;
      startBtn.textContent = '再玩一局（新種子）';
    }

    function showDebrief(s, early) {
      const P = s.score.parts;
      const partRow = (name, v, max, note) => `<tr><th>${name}</th><td class="nqs-num">${fmt(v, 1)} / ${max}</td><td>${esc(note)}</td></tr>`;
      const sp = s.split, n2 = x => fmt(x, 2);
      const hl = x => (x === Infinity ? '無限長' : Number.isFinite(x) ? `${Math.round(x)} 秒` : '—');
      debriefEl.innerHTML = `<section class="nqs-panel"><h4 class="nqs-panel-t">本局復盤${early ? '（提前結束，不列入歷史）' : ''}</h4>
        <div class="nqs-score"><div><span>過程分數</span><b>${s.score.total}</b><small>/ 100</small></div><div><span>損益</span><b class="${s.pnl >= 0 ? 'nqs-pos' : 'nqs-neg'}">${fmtSg(s.pnl, 2)}</b><small>分開看：好過程不一定每局賺錢</small></div></div>
        <div class="nqs-tablewrap"><table class="nqs-table"><thead><tr><th>過程項目</th><th>得分</th><th>依據</th></tr></thead><tbody>
        ${partRow('限額紀律', P.limits, 25, `突破 ${s.breaches} 次、共 ${Math.round(s.breachSec)} 秒`)}
        ${partRow('符號紀律', P.sign, 15, `符號錯誤 ${s.signErrors} 次（避險讓 |delta| 變大且超過限額 20%）`)}
        ${partRow('教練問答', P.coach, 25, s.coachAsked ? `${s.coachRight}/${s.coachAsked} 答對` : '本局沒有提問（給一半分數）')}
        ${partRow('逆向選擇（markout）', P.markout, 15, s.nFills >= 8 ? `30 秒 markout ${n2(s.mk30Per)}／口（5 秒 ${n2(s.mk5Per)}）` : '成交少於 8 筆，不計分')}
        ${partRow('平均優勢', P.edge, 10, s.nFills >= 8 ? `每口 ${n2(s.edgePer)}（市場半價差約 ${n2(s.hsPer)}）` : '成交少於 8 筆，不計分')}
        ${partRow('庫存管理', P.inventory, 10, `delta 半衰期 ${hl(s.hlDelta)}（≤10 秒滿分、≥120 秒 0 分）`)}
        </tbody></table></div>
        <h4 class="nqs-panel-t">下一局的三個具體建議</h4><ol class="nqs-sugg">${s.suggestions.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <h4 class="nqs-panel-t">損益拆解與統計</h4>
        <div class="nqs-tablewrap"><table class="nqs-table"><tbody>
        <tr><th>成交優勢</th><td>${fmtSg(sp.edge, 2)}</td><th>避險成本</th><td>${fmtSg(sp.hedge, 2)}</td></tr>
        <tr><th>方向（delta）</th><td>${fmtSg(sp.delta, 2)}</td><th>Gamma＋Theta</th><td>${fmtSg(sp.gamma + sp.theta, 2)}</td></tr>
        <tr><th>波動率（vega）</th><td>${fmtSg(sp.vega, 2)}</td><th>成交筆數／口數</th><td>${s.nFills}／${s.volume}</td></tr>
        <tr><th>最大 |delta|</th><td>${fmt(s.maxDelta, 0)}（限額 ${s.deltaLim}）</td><th>最大 |vega|</th><td>${fmt(s.maxVega, 1)}（限額 ${s.vegaLim}）</td></tr>
        <tr><th>vega 庫存半衰期</th><td>${hl(s.hlVega)}</td><th>避險次數／股數</th><td>${s.hedges}／${s.hedgeVol}</td></tr>
        <tr><th>消息前後成交占比</th><td>${pct(s.newsVolShare, 0)}</td><th>消息前後 30 秒 markout</th><td>${n2(s.newsMk30Per)}／口</td></tr>
        </tbody></table></div>
        <h4 class="nqs-panel-t">揭曉：這局的隱藏資訊</h4>
        <p>真實波動率：開局 ${pct(s.sigTrue0, 1)} → 結束 ${pct(s.sigTrue, 1)}；市場 ATM vol：開局 ${pct(s.sigMkt0, 1)} → 結束 ${pct(s.sigMktEnd, 1)}。
        你的成交量中約 <b>${pct(s.informedShare, 0)}</b> 來自知情交易者；他們那部分成交的 30 秒 markout 合計 <b>${fmtSg(s.informedPnl, 2)}</b>，雜訊交易者部分合計 <b>${fmtSg(s.noisePnl, 2)}</b>。
        種子 ${s.seed}（可按「用上一局的種子重玩」比較不同策略）。</p></section>`;
      debriefEl.hidden = false;
      debriefEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderHistory() {
      const list = (storeGet(MM_KEY).sessions || []).filter(x => x && typeof x === 'object');
      if (!list.length) {
        histBody.innerHTML = '<p class="nqs-note">還沒有紀錄。完成一局（不提前結束）後，這裡會顯示過程分數與損益的趨勢。</p>';
        histChart.el.hidden = true;
        return;
      }
      histChart.el.hidden = false;
      const last = list.slice(-8).reverse();
      const avg = (arr, k) => { const v = arr.map(x => x[k]).filter(Number.isFinite); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
      const r5 = list.slice(-5), p5 = list.slice(-10, -5);
      const trend = p5.length ? `最近 5 局平均過程分數 ${fmt(avg(r5, 'score'), 0)}（前 5 局 ${fmt(avg(p5, 'score'), 0)}）` : `最近平均過程分數 ${fmt(avg(r5, 'score'), 0)}`;
      histBody.innerHTML = `<p class="nqs-note">共 ${list.length} 局。${trend}。</p><div class="nqs-tablewrap"><table class="nqs-table"><thead><tr><th>日期</th><th>難度</th><th>局長</th><th>過程分數</th><th>損益</th><th>突破／符號</th><th>教練</th><th>markout</th></tr></thead><tbody>` +
        last.map(x => `<tr><td>${new Date(x.ts).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>${(E.DIFFS[x.diff] || {}).label || x.diff}</td><td>${x.min} 分</td><td class="nqs-num"><b>${x.score}</b></td><td class="nqs-num ${x.pnl >= 0 ? 'nqs-pos' : 'nqs-neg'}">${fmtSg(x.pnl, 1)}</td><td>${x.breaches}／${x.sign}</td><td>${x.coach == null ? '—' : Math.round(x.coach * 100) + '%'}</td><td class="nqs-num">${x.mk30 == null ? '—' : fmtSg(x.mk30, 2)}</td></tr>`).join('') + '</tbody></table></div>';
      const pts = list.map((x, j) => [j + 1, x.score]);
      const pnlMax = Math.max(1, ...list.map(x => Math.abs(x.pnl)));
      histChart.set({
        series: [{ name: '過程分數', color: COLORS[0], width: 2.5, pts }, { name: '損益（縮放到 0–100）', color: COLORS[2], dash: '5 4', pts: list.map((x, j) => [j + 1, 50 + 50 * x.pnl / pnlMax]) }],
        xDomain: [1, Math.max(2, list.length)], yDomain: [0, 100], xName: '第幾局', xLabel: '第幾局', yLabel: '分數', xTick: v => (Number.isInteger(v) ? String(v) : ''), xFmt: v => `第 ${Math.round(v)} 局`, yFmt: v => fmt(v, 0),
        hmarks: [{ y: 50, label: '損益 0' }],
      });
    }

    renderHistory();
  }

  // =========================================================================
  // 6. 掛載
  // =========================================================================
  const SIMS = { 'vol-surface': mountVolSurface, 'mock-mm': mountMockMM };
  function mountAll() {
    for (let i = OBSERVERS.length - 1; i >= 0; i--) {
      if (!document.contains(OBSERVERS[i].el)) { OBSERVERS[i].ro.disconnect(); OBSERVERS.splice(i, 1); }
    }
    document.querySelectorAll('.nq-sim[data-sim]').forEach(el => {
      if (el.dataset.nqsMounted) return;
      el.dataset.nqsMounted = '1';
      const fn = SIMS[el.dataset.sim];
      el.innerHTML = '';
      if (!fn) { el.textContent = '找不到模擬：' + el.dataset.sim; return; }
      if (!M()) { el.textContent = '模擬載入失敗：需要 nq-tools.js（NQMath）。'; return; }
      try { fn(el); } catch (err) {
        console.error('[nq-sim]', err);
        el.textContent = '模擬載入失敗：' + (err && err.message);
      }
    });
  }
  if (typeof root.document$ !== 'undefined' && root.document$ && root.document$.subscribe) root.document$.subscribe(() => mountAll());
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();

})(typeof window !== 'undefined' ? window : globalThis);
