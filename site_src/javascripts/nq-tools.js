/* nq-tools.js — Natenberg 課程互動工具
 * 掛載所有 <div class="nq-tool" data-tool="..."></div>：
 *   option-explorer / strategy-builder / hedging-simulator / distribution / binomial-tree
 * 無外部依賴；圖表以 SVG 自繪。純數學函式集中在 NQMath（Node 可 require 做數值驗證）。
 * 單位慣例與 labs/optlib.py 相同：t 為年、theta 每日曆日（÷365）、vega 每 1 vol 點、rho 每 1%。
 */
(function () {
  'use strict';

  // =========================================================================
  // 1. 純數學（與 labs/optlib.py 對齊）
  // =========================================================================
  const NQMath = (() => {
    const SQ2PI = 2.5066282746310002;
    const CAL = 365;

    function normPdf(x) { return Math.exp(-0.5 * x * x) / SQ2PI; }

    /** 標準常態 CDF（Hart 1968 / West 2005 雙精度近似，誤差 ~1e-15）。 */
    function normCdf(x) {
      const z = Math.abs(x);
      let c = 0;
      if (z <= 37) {
        const e = Math.exp(-z * z / 2);
        if (z < 7.07106781186547) {
          let n = 3.52624965998911e-2 * z + 0.700383064443688;
          n = n * z + 6.37396220353165;
          n = n * z + 33.912866078383;
          n = n * z + 112.079291497871;
          n = n * z + 221.213596169931;
          n = n * z + 220.206867912376;
          let d = 8.83883476483184e-2 * z + 1.75566716318264;
          d = d * z + 16.064177579207;
          d = d * z + 86.7807322029461;
          d = d * z + 296.564248779674;
          d = d * z + 637.333633378831;
          d = d * z + 793.826512519948;
          d = d * z + 440.413735824752;
          c = e * n / d;
        } else {
          let b = z + 0.65;
          b = z + 4 / b; b = z + 3 / b; b = z + 2 / b; b = z + 1 / b;
          c = e / b / 2.506628274631;
        }
      }
      return x > 0 ? 1 - c : c;
    }

    /** Black-Scholes（連續股利率 q）價格與 Greeks。t ≤ 0 或 σ ≤ 0 時退化為折現遠期內含價值。 */
    function bs(S, K, t, sigma, r = 0, q = 0, kind = 'call') {
      const call = kind !== 'put';
      const dfr = Math.exp(-r * t), dfq = Math.exp(-q * t);
      if (!(t > 0 && sigma > 0)) {
        return {
          price: call ? Math.max(S * dfq - K * dfr, 0) : Math.max(K * dfr - S * dfq, 0),
          delta: call ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
          gamma: 0, vega: 0, theta: 0, thetaYear: 0, rho: 0, d1: NaN, d2: NaN,
        };
      }
      const st = Math.sqrt(t), vs = sigma * st;
      const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * t) / vs;
      const d2 = d1 - vs;
      const Nd1 = normCdf(d1), Nd2 = normCdf(d2), nd1 = normPdf(d1);
      const decay = -S * dfq * nd1 * sigma / (2 * st);
      let price, delta, thetaY, rho;
      if (call) {
        price = S * dfq * Nd1 - K * dfr * Nd2;
        delta = dfq * Nd1;
        thetaY = decay - r * K * dfr * Nd2 + q * S * dfq * Nd1;
        rho = K * t * dfr * Nd2 / 100;
      } else {
        const Nm1 = normCdf(-d1), Nm2 = normCdf(-d2);
        price = K * dfr * Nm2 - S * dfq * Nm1;
        delta = dfq * (Nd1 - 1);
        thetaY = decay + r * K * dfr * Nm2 - q * S * dfq * Nm1;
        rho = -K * t * dfr * Nm2 / 100;
      }
      return {
        price, delta,
        gamma: dfq * nd1 / (S * vs),
        vega: S * dfq * nd1 * st / 100,
        theta: thetaY / CAL, thetaYear: thetaY, rho, d1, d2,
      };
    }

    function bsPrice(S, K, t, sigma, r = 0, q = 0, kind = 'call') { return bs(S, K, t, sigma, r, q, kind).price; }

    /** 只算 delta（避險模擬內迴圈用）。 */
    function bsDelta(S, K, t, sigma, r = 0, q = 0, kind = 'call') {
      const call = kind !== 'put';
      if (!(t > 0 && sigma > 0)) return call ? (S > K ? 1 : 0) : (S < K ? -1 : 0);
      const vs = sigma * Math.sqrt(t);
      const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * t) / vs;
      const dfq = Math.exp(-q * t);
      return call ? dfq * normCdf(d1) : dfq * (normCdf(d1) - 1);
    }

    /** Black-76 期貨選擇權：bs(F, q=r)；rho 在 F 固定下 = −t·V/100。 */
    function black76(F, K, t, sigma, r = 0, kind = 'call') {
      const g = bs(F, K, t, sigma, r, r, kind);
      g.rho = -t * g.price / 100;
      return g;
    }

    /** CRR 二元樹（完整節點，視覺化用）。 */
    function crrTree(S, K, t, sigma, r = 0, q = 0, n = 4, kind = 'call', american = false) {
      const dt = t / n;
      const u = Math.exp(sigma * Math.sqrt(dt)), d = 1 / u;
      const disc = Math.exp(-r * dt);
      const p = (Math.exp((r - q) * dt) - d) / (u - d);
      const sign = kind === 'put' ? -1 : 1;
      const Sx = [], V = [], cont = [], ex = [];
      for (let i = 0; i <= n; i++) {
        Sx.push([]); V.push([]); cont.push([]); ex.push([]);
        for (let j = 0; j <= i; j++) Sx[i].push(S * Math.pow(u, j) * Math.pow(d, i - j));
      }
      for (let j = 0; j <= n; j++) { V[n][j] = Math.max(sign * (Sx[n][j] - K), 0); cont[n][j] = NaN; ex[n][j] = false; }
      for (let i = n - 1; i >= 0; i--) {
        for (let j = 0; j <= i; j++) {
          const c = disc * (p * V[i + 1][j + 1] + (1 - p) * V[i + 1][j]);
          const intr = sign * (Sx[i][j] - K);
          cont[i][j] = c;
          if (american && intr > c) { V[i][j] = intr; ex[i][j] = true; } else { V[i][j] = c; ex[i][j] = false; }
        }
      }
      return { n, dt, u, d, p, disc, sign, S: Sx, V, cont, ex, price: V[0][0] };
    }

    /** CRR 二元樹價格（一維陣列，n 可很大）。 */
    function binomialPrice(S, K, t, sigma, r = 0, q = 0, n = 200, kind = 'call', american = false) {
      const dt = t / n;
      const u = Math.exp(sigma * Math.sqrt(dt)), d = 1 / u;
      const disc = Math.exp(-r * dt);
      const p = (Math.exp((r - q) * dt) - d) / (u - d);
      const sign = kind === 'put' ? -1 : 1;
      const v = new Float64Array(n + 1);
      for (let j = 0; j <= n; j++) v[j] = Math.max(sign * (S * Math.pow(u, j) * Math.pow(d, n - j) - K), 0);
      for (let i = n - 1; i >= 0; i--) {
        for (let j = 0; j <= i; j++) {
          let c = disc * (p * v[j + 1] + (1 - p) * v[j]);
          if (american) { const e = sign * (S * Math.pow(u, j) * Math.pow(d, i - j) - K); if (e > c) c = e; }
          v[j] = c;
        }
      }
      return v[0];
    }

    /** 到期 payoff：kind ∈ call / put / stock。 */
    function payoff(kind, S, K) {
      if (kind === 'stock') return S;
      return kind === 'put' ? Math.max(K - S, 0) : Math.max(S - K, 0);
    }

    // ---- 策略（legs: [{type:'call'|'put'|'stock', qty, K, price}]）----
    function stratExpiryPnl(legs, ST) {
      let s = 0;
      for (const l of legs) s += l.qty * (payoff(l.type, ST, l.K) - l.price);
      return s;
    }
    function stratValue(legs, S, t, sigma, r = 0, q = 0) {
      let s = 0;
      for (const l of legs) s += l.qty * (l.type === 'stock' ? S : bs(S, l.K, t, sigma, r, q, l.type).price);
      return s;
    }
    function stratCost(legs) { let s = 0; for (const l of legs) s += l.qty * l.price; return s; }
    function stratGreeks(legs, S, t, sigma, r = 0, q = 0) {
      const g = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
      for (const l of legs) {
        if (l.type === 'stock') { g.delta += l.qty; continue; }
        const b = bs(S, l.K, t, sigma, r, q, l.type);
        g.delta += l.qty * b.delta; g.gamma += l.qty * b.gamma; g.theta += l.qty * b.theta;
        g.vega += l.qty * b.vega; g.rho += l.qty * b.rho;
      }
      return g;
    }
    /** 到期損益為分段線性（折點在履約價），在 [lo, hi] 內精確求零點。 */
    function stratBreakevens(legs, lo, hi) {
      const xs = [lo];
      const ks = [...new Set(legs.filter(l => l.type !== 'stock').map(l => l.K))].sort((a, b) => a - b);
      for (const k of ks) if (k > lo && k < hi) xs.push(k);
      xs.push(hi);
      const ys = xs.map(x => stratExpiryPnl(legs, x));
      const eps = 1e-9, out = [];
      for (let i = 0; i < xs.length; i++) {
        const z0 = Math.abs(ys[i]) < eps;
        if (z0) {
          const zl = i > 0 && Math.abs(ys[i - 1]) < eps, zr = i < xs.length - 1 && Math.abs(ys[i + 1]) < eps;
          if (!(zl || zr)) out.push(xs[i]);
          continue;
        }
        if (i < xs.length - 1 && Math.abs(ys[i + 1]) >= eps && ys[i] * ys[i + 1] < 0) {
          out.push(xs[i] - ys[i] * (xs[i + 1] - xs[i]) / (ys[i + 1] - ys[i]));
        }
      }
      return out;
    }
    /** 到期最大獲利／最大虧損（S ∈ [0, ∞)），無上限回傳 ±Infinity。 */
    function stratExtremes(legs) {
      const ks = legs.filter(l => l.type !== 'stock').map(l => l.K);
      const vals = [0, ...ks].map(x => stratExpiryPnl(legs, x));
      let slope = 0;
      for (const l of legs) if (l.type === 'call' || l.type === 'stock') slope += l.qty;
      const mx = Math.max(...vals), mn = Math.min(...vals);
      return { max: slope > 1e-12 ? Infinity : mx, min: slope < -1e-12 ? -Infinity : mn };
    }

    // ---- 亂數 ----
    function mulberry32(a) {
      a >>>= 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function gaussian(rand) {
      let spare = null;
      return function () {
        if (spare !== null) { const s = spare; spare = null; return s; }
        let u = 0;
        while (u <= 1e-300) u = rand();
        const v = rand();
        const m = Math.sqrt(-2 * Math.log(u));
        spare = m * Math.sin(2 * Math.PI * v);
        return m * Math.cos(2 * Math.PI * v);
      };
    }

    /**
     * 動態避險模擬（r = 0，無漂移）。
     * o: {S0, K, days, sigImp, sigReal, every(步數，0=不調整), side(+1 買進/−1 賣出), kind,
     *     deltaVol: 'real'|'imp', seed}
     * 每天一步（Δt = 1/365 年）。回傳單一路徑的 final；record=true 時另回傳逐日序列。
     */
    function hedgePath(o, pathIndex, record) {
      const steps = Math.max(1, Math.round(o.days));
      const T = o.days / CAL, dt = T / steps;
      const sh = o.deltaVol === 'imp' ? o.sigImp : o.sigReal;
      const drift = -0.5 * o.sigReal * o.sigReal * dt, vol = o.sigReal * Math.sqrt(dt);
      const gauss = gaussian(mulberry32((o.seed * 1000003 + pathIndex * 7919 + 12345) >>> 0));
      const side = o.side, K = o.K, kind = o.kind;
      const prem = bs(o.S0, K, T, o.sigImp, 0, 0, kind).price;
      let S = o.S0;
      let h = -side * bsDelta(S, K, T, sh, 0, 0, kind);
      let cash = -side * prem - h * S;
      let rec = null, nTrades = 1;
      if (record) rec = { S: [S], pnl: [0], hedge: [h], opt: [0] };
      for (let k = 1; k <= steps; k++) {
        S *= Math.exp(drift + vol * gauss());
        const tau = T - k * dt;
        if (k < steps && o.every > 0 && k % o.every === 0) {
          const nh = -side * bsDelta(S, K, tau, sh, 0, 0, kind);
          cash -= (nh - h) * S; h = nh; nTrades++;
        }
        if (record) {
          const ov = k === steps ? payoff(kind, S, K) : bs(S, K, tau, o.sigImp, 0, 0, kind).price;
          rec.S.push(S);
          rec.pnl.push(side * ov + h * S + cash);
          rec.hedge.push(h);
          rec.opt.push(side * (ov - prem));
        }
      }
      const final = side * payoff(kind, S, K) + h * S + cash;
      return record ? { final, rec, nTrades } : final;
    }
    function hedgeSim(o, nPaths) {
      const finals = new Float64Array(nPaths);
      for (let p = 0; p < nPaths; p++) finals[p] = hedgePath(o, p, false);
      let m = 0;
      for (const v of finals) m += v;
      m /= nPaths;
      let s2 = 0;
      for (const v of finals) s2 += (v - m) * (v - m);
      const sd = nPaths > 1 ? Math.sqrt(s2 / (nPaths - 1)) : 0;
      const T = o.days / CAL;
      const theory = o.side * (bs(o.S0, o.K, T, o.sigReal, 0, 0, o.kind).price - bs(o.S0, o.K, T, o.sigImp, 0, 0, o.kind).price);
      return { finals, mean: m, sd, theory };
    }

    /** 直方圖：回傳 [{x0, x1, y}]。 */
    function histogram(values, nBins, lo, hi) {
      if (!(hi > lo)) { lo -= 0.5; hi += 0.5; }
      const w = (hi - lo) / nBins, bins = [];
      for (let i = 0; i < nBins; i++) bins.push({ x0: lo + i * w, x1: lo + (i + 1) * w, y: 0 });
      for (const v of values) { let i = Math.floor((v - lo) / w); if (i >= nBins) i = nBins - 1; if (i < 0) i = 0; bins[i].y++; }
      return bins;
    }

    // ---- 到期價格分配 ----
    /** 對數常態：ln S_T ~ N(ln S + (r − σ²/2)t, σ²t)；常態：S_T ~ N(F, (Sσ√t)²)，F = S e^{rt}。 */
    function distParams(S, sigma, t, r = 0) {
      const s = sigma * Math.sqrt(t);
      return { F: S * Math.exp(r * t), sd: S * s, mu: Math.log(S) + (r - 0.5 * sigma * sigma) * t, s };
    }
    function normalPdfAt(x, m, sd) { return normPdf((x - m) / sd) / sd; }
    function lognormalPdfAt(x, mu, s) { return x > 0 ? normPdf((Math.log(x) - mu) / s) / (x * s) : 0; }
    function normalCdfAt(x, m, sd) { return normCdf((x - m) / sd); }
    function lognormalCdfAt(x, mu, s) { return x > 0 ? normCdf((Math.log(x) - mu) / s) : 0; }

    return {
      CAL, normPdf, normCdf, bs, bsPrice, bsDelta, black76, crrTree, binomialPrice, payoff,
      stratExpiryPnl, stratValue, stratCost, stratGreeks, stratBreakevens, stratExtremes,
      mulberry32, gaussian, hedgePath, hedgeSim, histogram,
      distParams, normalPdfAt, lognormalPdfAt, normalCdfAt, lognormalCdfAt,
    };
  })();

  if (typeof module === 'object' && module.exports) module.exports = NQMath;
  if (typeof window !== 'undefined') window.NQMath = NQMath;
  if (typeof document === 'undefined') return;

  // =========================================================================
  // 2. DOM 小工具
  // =========================================================================
  const SVGNS = 'http://www.w3.org/2000/svg';
  let UID = 0;
  const COLORS = ['var(--nq-c1)', 'var(--nq-c2)', 'var(--nq-c3)', 'var(--nq-c4)'];
  const DASHES = [null, '7 4', '2 3', '10 3 2 3'];
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const r2 = v => Math.round(v * 100) / 100;

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

  function fmtNum(x, d = 2) {
    if (x === Infinity) return '無上限';
    if (x === -Infinity) return '無下限';
    if (!Number.isFinite(x)) return '—';
    let s = x.toFixed(d);
    if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
    return s.replace('-', '−');
  }
  const fmtPct = (x, d = 1) => fmtNum(x * 100, d) + '%';
  const fmtSigned = (x, d = 2) => (x > 0 ? '+' : '') + fmtNum(x, d);

  function rafThrottle(fn) {
    let pending = false;
    return () => {
      if (pending) return;
      pending = true;
      // rAF 合併同一幀的多次輸入；setTimeout 備援（背景分頁或嵌入框架可能暫停 rAF）
      const run = () => { if (!pending) return; pending = false; fn(); };
      requestAnimationFrame(run);
      setTimeout(run, 50);
    };
  }

  // ResizeObserver 登記表：換頁（instant navigation）後清掉已離開文件的觀察者
  const OBSERVERS = [];
  function observeWidth(el, cb) {
    if (typeof ResizeObserver === 'undefined') {
      requestAnimationFrame(() => cb(el.clientWidth));
      window.addEventListener('resize', () => { if (document.contains(el)) cb(el.clientWidth); });
      return;
    }
    const ro = new ResizeObserver(() => { const w = el.clientWidth; if (w > 0) cb(w); });
    ro.observe(el);
    OBSERVERS.push({ el, ro });
  }

  // ---- 刻度 ----
  function niceStep(span, count) {
    const raw = span / Math.max(1, count);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
  }
  function ticks(lo, hi, count) {
    const step = niceStep(hi - lo, count), out = [];
    const k0 = Math.ceil(lo / step - 1e-9), k1 = Math.floor(hi / step + 1e-9);
    for (let k = k0; k <= k1; k++) out.push(k === 0 ? 0 : k * step);
    return { ticks: out, step };
  }
  function tickFmt(step) {
    const d = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
    return v => fmtNum(v, d);
  }
  function interp(pts, x) {
    const n = pts.length;
    if (!n) return NaN;
    if (x <= pts[0][0]) return x === pts[0][0] ? pts[0][1] : NaN;
    if (x >= pts[n - 1][0]) return x === pts[n - 1][0] ? pts[n - 1][1] : NaN;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid][0] <= x) lo = mid; else hi = mid; }
    const [xa, ya] = pts[lo], [xb, yb] = pts[hi];
    return xb === xa ? ya : ya + (yb - ya) * (x - xa) / (xb - xa);
  }

  // =========================================================================
  // 3. 可重用 SVG 圖表（折線 + 直方圖 + 標記 + 可拖曳把手 + 十字線）
  // =========================================================================
  /**
   * new Chart(parent, {aspect, minH, maxH, height})
   * chart.set({
   *   series: [{name, color, pts:[[x,y]...], width, dash, tip(false=不進提示), legend(false), fmt}],
   *   hist: {name, color, bins:[{x0,x1,y}], fmt},
   *   bands: [{x0, x1, color, opacity}], markers: [{x, label, color, dash}],
   *   hmarkers: [{y, label, color, dash}], points: [{x, y, color, label}],
   *   handles: [{id, x, label, color}], onHandle(id, x),
   *   xDomain, yDomain, yInclude:[...], xName, yName, xLabel, yLabel, xFmt, yFmt
   * })
   * 點／拖曳圖表顯示十字線與各線數值；靠近把手時拖曳把手。
   */
  class Chart {
    constructor(parent, opts = {}) {
      this.o = Object.assign({ aspect: 0.62, minH: 240, maxH: 420 }, opts);
      this.id = 'nqc' + (++UID);
      this.legend = h('div', { class: 'nq-legend' });
      this.svg = document.createElementNS(SVGNS, 'svg');
      this.svg.setAttribute('class', 'nq-chart-svg');
      this.svg.setAttribute('role', 'img');
      this.tip = h('div', { class: 'nq-chart-tip', hidden: true });
      this.wrap = h('div', { class: 'nq-chart' }, this.svg, this.tip);
      parent.append(this.legend, this.wrap);
      this.d = null; this.cross = null; this.drag = null; this.W = 0; this.H = 0;
      observeWidth(this.wrap, w => { if (Math.abs(w - this.W) > 0.5) { this.W = w; this.render(); } });
      this._bind();
    }

    _bind() {
      const svg = this.svg;
      const pt = e => {
        const r = svg.getBoundingClientRect();
        return { x: (e.clientX - r.left) * (this.W / (r.width || this.W)), y: (e.clientY - r.top) * (this.H / (r.height || this.H)) };
      };
      svg.addEventListener('pointerdown', e => {
        if (!this.d || !this.sx || (e.button && e.button > 0)) return;
        const p = pt(e), m = this.m;
        if (p.x < m.l - 12 || p.x > this.W - m.r + 12) return;
        let best = null, bd = 26;
        for (const hd of this.d.handles || []) {
          const dist = Math.abs(this.sx(hd.x) - p.x);
          if (dist < bd) { bd = dist; best = hd; }
        }
        this.drag = best ? best.id : 'cross';
        try { svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        this._move(p.x);
      });
      svg.addEventListener('pointermove', e => { if (this.drag) this._move(pt(e).x); });
      const end = () => { this.drag = null; };
      svg.addEventListener('pointerup', end);
      svg.addEventListener('pointercancel', end);
      this.tip.addEventListener('click', e => {
        if (e.target.closest('.nq-tip-x')) { this.cross = null; this._drawCross(); }
      });
    }

    _move(px) {
      const [x0, x1] = this.xd;
      const x = clamp(this.sx.inv(px), x0, x1);
      if (this.drag === 'cross') { this.cross = x; this._drawCross(); }
      else if (this.drag && this.d.onHandle) this.d.onHandle(this.drag, x);
    }

    set(d) { this.d = d; this.render(); }

    render() {
      const d = this.d;
      if (!d) return;
      const W = this.W || this.wrap.clientWidth || 600;
      this.W = W;
      const H = this.o.height || Math.round(clamp(W * this.o.aspect, this.o.minH, this.o.maxH));
      this.H = H;
      const narrow = W < 480;
      const m = this.m = { l: narrow ? 46 : 56, r: 12, t: 12, b: d.xLabel ? 46 : 28 };
      const series = d.series || [];
      // ---- domain ----
      let x0 = Infinity, x1 = -Infinity;
      if (d.xDomain) [x0, x1] = d.xDomain;
      else {
        for (const s of series) for (const p of s.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; }
        if (d.hist) for (const b of d.hist.bins) { if (b.x0 < x0) x0 = b.x0; if (b.x1 > x1) x1 = b.x1; }
      }
      if (!(x1 > x0)) { x0 = (Number.isFinite(x0) ? x0 : 0) - 1; x1 = x0 + 2; }
      let y0 = Infinity, y1 = -Infinity;
      if (d.yDomain) [y0, y1] = d.yDomain;
      else {
        for (const s of series) for (const p of s.pts) {
          const y = p[1];
          if (!Number.isFinite(y) || p[0] < x0 || p[0] > x1) continue;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        if (d.hist) { y0 = Math.min(y0, 0); for (const b of d.hist.bins) if (b.y > y1) y1 = b.y; }
        for (const y of d.yInclude || []) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (!Number.isFinite(y0)) { y0 = 0; y1 = 1; }
        if (y1 - y0 < 1e-9 * Math.max(1, Math.abs(y0))) { const c = y0; y0 = c - (Math.abs(c) * 0.1 || 1); y1 = c + (Math.abs(c) * 0.1 || 1); }
        const pad = (y1 - y0) * 0.07;
        y1 += pad;
        if (!(d.hist && y0 === 0)) y0 -= pad;
      }
      this.xd = [x0, x1]; this.yd = [y0, y1];
      const pw = W - m.l - m.r, ph = H - m.t - m.b;
      const sx = v => m.l + (v - x0) / (x1 - x0) * pw;
      sx.inv = px => x0 + (px - m.l) / pw * (x1 - x0);
      const sy = v => m.t + (y1 - v) / (y1 - y0) * ph;
      this.sx = sx; this.sy = sy; this.pw = pw; this.ph = ph;
      const f = v => Number.isFinite(v) ? v.toFixed(1) : '0';

      const xt = ticks(x0, x1, Math.max(3, Math.round(pw / 80)));
      const yt = ticks(y0, y1, Math.max(3, Math.round(ph / 48)));
      const xf = d.xTickFmt || tickFmt(xt.step), yf = d.yTickFmt || tickFmt(yt.step);
      this.xFmt = d.xFmt || (v => fmtNum(v, Math.max(0, Math.ceil(-Math.log10(xt.step)) + 1)));
      this.yFmt = d.yFmt || (v => fmtNum(v, Math.max(0, Math.ceil(-Math.log10(yt.step)) + 1)));

      let s = `<defs><clipPath id="${this.id}c"><rect x="${f(m.l)}" y="${f(m.t)}" width="${f(pw)}" height="${f(ph)}"/></clipPath></defs>`;
      s += '<g class="nq-grid">';
      for (const v of yt.ticks) s += `<line x1="${f(m.l)}" x2="${f(W - m.r)}" y1="${f(sy(v))}" y2="${f(sy(v))}"/>`;
      for (const v of xt.ticks) s += `<line x1="${f(sx(v))}" x2="${f(sx(v))}" y1="${f(m.t)}" y2="${f(m.t + ph)}"/>`;
      s += '</g>';
      s += `<line class="nq-axis-line" x1="${f(m.l)}" x2="${f(W - m.r)}" y1="${f(m.t + ph)}" y2="${f(m.t + ph)}"/>`;
      if (y0 < 0 && y1 > 0) s += `<line class="nq-zero" x1="${f(m.l)}" x2="${f(W - m.r)}" y1="${f(sy(0))}" y2="${f(sy(0))}"/>`;
      s += '<g class="nq-ticks">';
      for (const v of yt.ticks) s += `<text x="${f(m.l - 6)}" y="${f(sy(v) + 4)}" text-anchor="end">${esc(yf(v))}</text>`;
      for (const v of xt.ticks) s += `<text x="${f(sx(v))}" y="${f(m.t + ph + 17)}" text-anchor="middle">${esc(xf(v))}</text>`;
      s += '</g>';
      if (d.xLabel) s += `<text class="nq-axis-title" x="${f(m.l + pw / 2)}" y="${f(H - 6)}" text-anchor="middle">${esc(d.xLabel)}</text>`;

      s += `<g clip-path="url(#${this.id}c)">`;
      for (const b of d.bands || []) {
        const a = sx(Math.max(b.x0, x0)), z = sx(Math.min(b.x1, x1));
        if (z > a) s += `<rect x="${f(a)}" y="${f(m.t)}" width="${f(z - a)}" height="${f(ph)}" style="fill:${b.color || 'var(--nq-c1)'};fill-opacity:${b.opacity || 0.12}"/>`;
      }
      if (d.hist) {
        const base = sy(Math.max(0, y0));
        for (const b of d.hist.bins) {
          if (b.y <= 0) continue;
          const a = sx(b.x0) + 1, w = Math.max(1, sx(b.x1) - sx(b.x0) - 2), top = sy(b.y);
          s += `<rect class="nqt-bar" x="${f(a)}" y="${f(top)}" width="${f(w)}" height="${f(Math.max(0, base - top))}" rx="2" style="fill:${d.hist.color || 'var(--nq-c1)'}"/>`;
        }
      }
      for (const hm of d.hmarkers || []) {
        if (hm.y < y0 || hm.y > y1) continue;
        s += `<line class="nq-marker" x1="${f(m.l)}" x2="${f(W - m.r)}" y1="${f(sy(hm.y))}" y2="${f(sy(hm.y))}" style="stroke:${hm.color || 'var(--nq-muted)'}"${hm.dash === false ? '' : ' stroke-dasharray="5 4"'}/>`;
        if (hm.label) s += `<text class="nq-mlabel" x="${f(W - m.r - 4)}" y="${f(sy(hm.y) - 4)}" text-anchor="end">${esc(hm.label)}</text>`;
      }
      for (const se of series) {
        let path = '', pen = false;
        for (const p of se.pts) {
          if (!Number.isFinite(p[1])) { pen = false; continue; }
          const yy = clamp(sy(p[1]), m.t - 4 * ph, m.t + 5 * ph);
          path += (pen ? 'L' : 'M') + f(sx(p[0])) + ' ' + f(yy);
          pen = true;
        }
        s += `<path class="nq-line" d="${path}" style="stroke:${se.color || COLORS[0]};stroke-width:${se.width || 2}"${se.dash ? ` stroke-dasharray="${se.dash}"` : ''}/>`;
      }
      for (const mk of d.markers || []) {
        if (mk.x < x0 || mk.x > x1) continue;
        s += `<line class="nq-marker" x1="${f(sx(mk.x))}" x2="${f(sx(mk.x))}" y1="${f(m.t)}" y2="${f(m.t + ph)}" style="stroke:${mk.color || 'var(--nq-muted)'}"${mk.dash === false ? '' : ' stroke-dasharray="5 4"'}/>`;
      }
      s += '</g>';
      // 標記文字（不裁切，避免貼邊被切掉）
      let lastLabelX = -1e9, row = 0;
      const mks = (d.markers || []).filter(mk => mk.label && mk.x >= x0 && mk.x <= x1).sort((a, b) => a.x - b.x);
      for (const mk of mks) {
        const px = sx(mk.x);
        row = px - lastLabelX < 46 ? row + 1 : 0;
        lastLabelX = px;
        const anchor = px > W - m.r - 30 ? 'end' : px < m.l + 30 ? 'start' : 'middle';
        s += `<text class="nq-mlabel" x="${f(px)}" y="${f(m.t + 12 + row * 14)}" text-anchor="${anchor}">${esc(mk.label)}</text>`;
      }
      for (const p of d.points || []) {
        if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
        s += `<circle class="nq-pt" cx="${f(sx(p.x))}" cy="${f(sy(p.y))}" r="${p.r || 5.5}" style="fill:${p.color || COLORS[0]}"/>`;
        if (p.label) s += `<text class="nq-mlabel" x="${f(sx(p.x))}" y="${f(sy(p.y) + (p.labelBelow ? 18 : -10))}" text-anchor="middle">${esc(p.label)}</text>`;
      }
      for (const hd of d.handles || []) {
        const px = sx(clamp(hd.x, x0, x1)), gy = m.t + ph - 16;
        s += `<g class="nq-handle"><line x1="${f(px)}" x2="${f(px)}" y1="${f(m.t)}" y2="${f(m.t + ph)}" style="stroke:${hd.color || 'var(--nq-c4)'}"/>`;
        s += `<circle cx="${f(px)}" cy="${f(gy)}" r="13" style="fill:${hd.color || 'var(--nq-c4)'}"/>`;
        s += `<path d="M${f(px - 6)} ${f(gy)}l4 -4v8zM${f(px + 6)} ${f(gy)}l-4 -4v8z" class="nq-handle-glyph"/>`;
        if (hd.label) s += `<text class="nq-mlabel" x="${f(px)}" y="${f(gy - 19)}" text-anchor="middle">${esc(hd.label)}</text>`;
        s += '</g>';
      }
      if (d.yLabel) s += `<text class="nq-axis-title nq-ytitle" x="${f(m.l + 6)}" y="${f(m.t + 14)}">${esc(d.yLabel)}</text>`;
      s += '<g class="nq-cross"></g>';

      const svg = this.svg;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      svg.setAttribute('aria-label', d.ariaLabel || d.yLabel || '圖表');
      svg.innerHTML = s;
      this.crossG = svg.querySelector('.nq-cross');

      // ---- 圖例 ----
      const items = [];
      for (const se of series) {
        if (se.legend === false || !se.name) continue;
        items.push(`<span class="nq-lg"><svg width="26" height="12" aria-hidden="true"><line x1="1" y1="6" x2="25" y2="6" style="stroke:${se.color || COLORS[0]};stroke-width:${Math.min(3, se.width || 2)}"${se.dash ? ` stroke-dasharray="${se.dash}"` : ''}/></svg>${esc(se.name)}</span>`);
      }
      if (d.hist && d.hist.name) items.push(`<span class="nq-lg"><span class="nq-sw" style="background:${d.hist.color || COLORS[0]}"></span>${esc(d.hist.name)}</span>`);
      for (const x of d.legendExtra || []) items.push(`<span class="nq-lg"><svg width="26" height="12" aria-hidden="true"><line x1="1" y1="6" x2="25" y2="6" style="stroke:${x.color};stroke-width:2" stroke-dasharray="${x.dash || '5 4'}"/></svg>${esc(x.name)}</span>`);
      this.legend.innerHTML = items.join('');
      this.legend.hidden = items.length < 1;
      this._drawCross();
    }

    _drawCross() {
      const g = this.crossG, d = this.d;
      if (!g || !d) return;
      if (this.cross == null) { g.innerHTML = ''; this.tip.hidden = true; return; }
      const [x0, x1] = this.xd, [y0, y1] = this.yd, m = this.m;
      const x = clamp(this.cross, x0, x1), px = this.sx(x);
      let s = `<line class="nq-cross-line" x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="${m.t}" y2="${(m.t + this.ph).toFixed(1)}"/>`;
      const rows = [];
      for (const se of d.series || []) {
        if (se.tip === false) continue;
        const y = interp(se.pts, x);
        if (!Number.isFinite(y)) continue;
        if (y >= y0 && y <= y1) s += `<circle class="nq-cross-pt" cx="${px.toFixed(1)}" cy="${this.sy(y).toFixed(1)}" r="4.5" style="fill:${se.color || COLORS[0]}"/>`;
        rows.push(`<div class="nq-tip-r"><span class="nq-sw" style="background:${se.color || COLORS[0]}"></span><span>${esc(se.name || '')}</span><b>${esc((se.fmt || this.yFmt)(y))}</b></div>`);
      }
      if (d.hist) {
        const b = d.hist.bins.find(bb => x >= bb.x0 && x < bb.x1) || (x >= d.hist.bins[d.hist.bins.length - 1].x1 ? null : null);
        if (b) rows.push(`<div class="nq-tip-r"><span class="nq-sw" style="background:${d.hist.color || COLORS[0]}"></span><span>${esc(d.hist.name || '次數')}（${esc(this.xFmt(b.x0))} ~ ${esc(this.xFmt(b.x1))}）</span><b>${esc(d.hist.fmt ? d.hist.fmt(b.y) : String(b.y))}</b></div>`);
      }
      for (const extra of (d.tipExtra ? d.tipExtra(x) : [])) rows.push(`<div class="nq-tip-r"><span></span><span>${esc(extra[0])}</span><b>${esc(extra[1])}</b></div>`);
      g.innerHTML = s;
      this.tip.innerHTML = `<button type="button" class="nq-tip-x" aria-label="關閉十字線">×</button><div class="nq-tip-h">${esc(d.xName || 'x')} = ${esc(this.xFmt(x))}</div>${rows.join('')}`;
      this.tip.hidden = false;
      if (px > m.l + this.pw / 2) { this.tip.style.left = (m.l + 6) + 'px'; this.tip.style.right = 'auto'; }
      else { this.tip.style.right = (m.r + 6) + 'px'; this.tip.style.left = 'auto'; }
      this.tip.style.top = (m.t + 4) + 'px';
    }
  }

  // =========================================================================
  // 4. 控制元件（滑桿 + 大顆 ± 按鈕、分段按鈕、步進器、數值面板）
  // =========================================================================
  function holdRepeat(btn, fn) {
    let t1 = null, t2 = null;
    const stop = () => { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
    btn.addEventListener('pointerdown', e => {
      if (e.button && e.button > 0) return;
      e.preventDefault();
      stop();
      fn();
      t1 = setTimeout(() => { t2 = setInterval(fn, 80); }, 450);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('click', e => { if (e.detail === 0) fn(); }); // 鍵盤 Enter/Space
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }

  /** iOS Safari 的 range 只能拖拇指；這裡補上「點軌道跳到該處」與水平拖曳。 */
  function touchRange(input, cb) {
    let sx = 0, sy = 0, moved = false, horiz = false;
    const setFrom = cx => {
      const r = input.getBoundingClientRect(), th = 30;
      const fr = clamp((cx - r.left - th / 2) / Math.max(1, r.width - th), 0, 1);
      const min = +input.min, max = +input.max, st = +input.step || 1;
      const v = min + Math.round(fr * (max - min) / st) * st;
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
    const fmt = o.fmt || (v => String(v));
    const out = h('output', { class: 'nq-val' });
    const lab = h('span', { class: 'nq-lab', text: o.label });
    const input = h('input', { type: 'range', min: o.min, max: o.max, step: o.step, 'aria-label': o.label });
    input.value = o.value;
    const dec = h('button', { type: 'button', class: 'nq-step', 'aria-label': o.label + ' 減少', text: '−' });
    const inc = h('button', { type: 'button', class: 'nq-step', 'aria-label': o.label + ' 增加', text: '+' });
    const el = h('div', { class: 'nq-ctl' }, h('div', { class: 'nq-ctl-head' }, lab, out), h('div', { class: 'nq-ctl-row' }, dec, input, inc));
    const show = () => { out.textContent = fmt(api.value); };
    const fire = () => { show(); if (o.onInput) o.onInput(api.value); };
    const api = {
      el, input,
      get value() { return parseFloat(input.value); },
      set(v, silent) { input.value = String(v); show(); if (!silent && o.onInput) o.onInput(api.value); },
      setRange(min, max, step) { input.min = min; input.max = max; if (step) input.step = step; show(); },
      setLabel(t) { lab.textContent = t; input.setAttribute('aria-label', t); },
      disable(b) { input.disabled = b; dec.disabled = b; inc.disabled = b; el.classList.toggle('nq-disabled', b); },
    };
    const bump = dir => {
      if (input.disabled) return;
      const st = o.btnStep || parseFloat(input.step) || 1;
      const v = clamp(+(Math.round((api.value + dir * st) / st) * st).toFixed(10), +input.min, +input.max);
      if (v !== api.value) api.set(v);
    };
    input.addEventListener('input', fire);
    holdRepeat(dec, () => bump(-1));
    holdRepeat(inc, () => bump(1));
    touchRange(input, fire);
    show();
    return api;
  }

  function seg(o) {
    let cur = o.value;
    const btns = o.options.map(([v, t]) => h('button', { type: 'button', class: 'nqt-seg-btn', 'data-v': String(v), 'aria-pressed': String(v === cur), text: t }));
    const g = h('div', { class: 'nqt-seg', role: 'group', 'aria-label': o.label || '' }, btns);
    const api = {
      el: o.label ? h('div', { class: 'nq-ctl nq-ctl-seg' }, h('div', { class: 'nq-ctl-head' }, h('span', { class: 'nq-lab', text: o.label })), g) : g,
      get value() { return cur; },
      set(v, silent) {
        cur = v;
        btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
        if (!silent && o.onChange) o.onChange(v);
      },
    };
    g.addEventListener('click', e => {
      const b = e.target.closest('.nqt-seg-btn');
      if (!b) return;
      const opt = o.options.find(x => String(x[0]) === b.dataset.v);
      if (opt) api.set(opt[0]);
    });
    return api;
  }

  /** 步進器：[−5][−1] 值 [+1][+5]；steps 為正數陣列。 */
  function stepper(o) {
    const val = h('span', { class: 'nq-stepper-v' });
    const mk = (dx, txt) => {
      const b = h('button', { type: 'button', class: 'nq-step', 'aria-label': `${o.label} ${dx > 0 ? '+' : '−'}${Math.abs(dx)}`, text: txt });
      holdRepeat(b, () => { o.set(o.get() + dx); show(); });
      return b;
    };
    const steps = o.steps || [1];
    const left = steps.slice().reverse().map(s => mk(-s, steps.length > 1 ? '−' + s : '−'));
    const right = steps.map(s => mk(s, steps.length > 1 ? '+' + s : '+'));
    const el = h('div', { class: 'nq-ctl nq-stepper' }, h('div', { class: 'nq-ctl-head' }, h('span', { class: 'nq-lab', text: o.label })),
      h('div', { class: 'nq-stepper-row' }, left, val, right));
    const show = () => { val.textContent = o.fmt ? o.fmt(o.get()) : String(o.get()); };
    show();
    return { el, show };
  }

  function readout(items) {
    const cells = {};
    const el = h('div', { class: 'nq-readout' }, items.map(it => {
      const v = h('div', { class: 'nq-ro-v', text: '—' });
      cells[it.key] = v;
      return h('div', { class: 'nq-ro' + (it.main ? ' nq-ro-main' : '') },
        h('div', { class: 'nq-ro-l', text: it.label }), v, it.hint ? h('div', { class: 'nq-ro-h', text: it.hint }) : null);
    }));
    return {
      el,
      set(k, txt, cls) { const c = cells[k]; if (!c) return; c.textContent = txt; c.className = 'nq-ro-v' + (cls ? ' ' + cls : ''); },
    };
  }
  const signCls = x => (x > 1e-9 ? 'nq-pos' : x < -1e-9 ? 'nq-neg' : '');
  const panel = (title, ...kids) => h('section', { class: 'nq-panel' }, title ? h('h4', { class: 'nq-panel-t', text: title }) : null, ...kids);
  const pctFmt = v => fmtNum(v, Number.isInteger(v) ? 0 : 2) + '%';

  // =========================================================================
  // 5. 工具
  // =========================================================================

  // ---------------------------------------------------------------- 5.1 選擇權價格與 Greeks
  function mountExplorer(root) {
    const st = { model: 'bs', kind: 'call', metric: 'price', S: 100, K: 100, days: 60, vol: 25, r: 3, q: 0 };
    const upd = rafThrottle(update);
    const METRIC = {
      price: { label: '理論價格', fmt: v => fmtNum(v, 3) },
      delta: { label: 'Delta', fmt: v => fmtNum(v, 3) },
      gamma: { label: 'Gamma', fmt: v => fmtNum(v, 4) },
      theta: { label: 'Theta（每日）', fmt: v => fmtNum(v, 4) },
      vega: { label: 'Vega（每 1 vol 點）', fmt: v => fmtNum(v, 4) },
    };
    const cModel = seg({
      label: '模型', value: st.model,
      options: [['bs', '股票（Black-Scholes）'], ['b76', '期貨選擇權（Black-76）']],
      onChange: v => {
        st.model = v;
        sS.setLabel(v === 'b76' ? '期貨價格 F' : '標的價格 S');
        sQ.disable(v === 'b76');
        upd();
      },
    });
    const cKind = seg({ label: '種類', value: st.kind, options: [['call', '買權 Call'], ['put', '賣權 Put']], onChange: v => { st.kind = v; upd(); } });
    const sS = slider({ label: '標的價格 S', min: 20, max: 200, step: 0.5, btnStep: 1, value: st.S, fmt: v => fmtNum(v, 1), onInput: v => { st.S = v; upd(); } });
    const sK = slider({ label: '履約價 K', min: 20, max: 200, step: 1, value: st.K, fmt: v => fmtNum(v, 0), onInput: v => { st.K = v; upd(); } });
    const sD = slider({ label: '距到期天數', min: 1, max: 365, step: 1, value: st.days, fmt: v => v + ' 天', onInput: v => { st.days = v; upd(); } });
    const sV = slider({ label: '波動率 σ', min: 1, max: 100, step: 1, value: st.vol, fmt: v => v + '%', onInput: v => { st.vol = v; upd(); } });
    const sR = slider({ label: '利率 r', min: 0, max: 10, step: 0.25, value: st.r, fmt: pctFmt, onInput: v => { st.r = v; upd(); } });
    const sQ = slider({ label: '股利率 q', min: 0, max: 10, step: 0.25, value: st.q, fmt: pctFmt, onInput: v => { st.q = v; upd(); } });
    const cMetric = seg({
      label: '圖表顯示', value: st.metric,
      options: [['price', '價格'], ['delta', 'Delta'], ['gamma', 'Gamma'], ['theta', 'Theta'], ['vega', 'Vega']],
      onChange: v => { st.metric = v; upd(); },
    });
    const ro = readout([
      { key: 'price', label: '理論價格', main: true },
      { key: 'intr', label: '內含價值' },
      { key: 'tv', label: '時間價值' },
      { key: 'delta', label: 'Delta' },
      { key: 'gamma', label: 'Gamma' },
      { key: 'theta', label: 'Theta', hint: '每過一個日曆日' },
      { key: 'vega', label: 'Vega', hint: '波動率 +1 點' },
      { key: 'rho', label: 'Rho', hint: '利率 +1%' },
    ]);
    const note = h('p', { class: 'nq-note' });
    const chartBox = h('div', { class: 'nq-chart-box' });
    root.append(
      h('div', { class: 'nq-row2' }, cModel.el, cKind.el),
      h('div', { class: 'nq-controls' }, sS.el, sK.el, sD.el, sV.el, sR.el, sQ.el),
      ro.el, note, cMetric.el, chartBox,
    );
    const chart = new Chart(chartBox);

    const calc = (S, days) => {
      const t = days / NQMath.CAL, sig = st.vol / 100, r = st.r / 100, q = st.q / 100;
      return st.model === 'b76' ? NQMath.black76(S, st.K, t, sig, r, st.kind) : NQMath.bs(S, st.K, t, sig, r, q, st.kind);
    };

    function update() {
      const g = calc(st.S, st.days);
      const intr = st.kind === 'call' ? Math.max(st.S - st.K, 0) : Math.max(st.K - st.S, 0);
      const tv = g.price - intr;
      ro.set('price', fmtNum(g.price, 3));
      ro.set('intr', fmtNum(intr, 3));
      ro.set('tv', fmtNum(tv, 3), tv < -1e-9 ? 'nq-neg' : '');
      ro.set('delta', fmtNum(g.delta, 3));
      ro.set('gamma', fmtNum(g.gamma, 4));
      ro.set('theta', fmtNum(g.theta, 4), signCls(g.theta));
      ro.set('vega', fmtNum(g.vega, 4));
      ro.set('rho', fmtNum(g.rho, 4));
      const notes = [];
      if (st.model === 'b76') notes.push('Black-76：delta 是對期貨價格的敏感度；權利金立即支付，故 rho = −t × 價格 / 100。');
      if (tv < -1e-9) notes.push('時間價值為負：深價內的歐式選擇權（或期貨選擇權）價值可能低於內含價值——這正是美式選擇權會提前履約的原因（第 16 章）。');
      note.textContent = notes.join(' ');
      note.hidden = !notes.length;

      // 圖表：目前天數 + 2×、½、¼ 天數
      const lo = Math.max(1, Math.min(st.K * 0.5, st.S * 0.8)), hi = Math.max(st.K * 1.5, st.S * 1.2);
      const N = 181, xs = [];
      for (let i = 0; i < N; i++) xs.push(lo + (hi - lo) * i / (N - 1));
      const extras = [...new Set([st.days * 2, Math.round(st.days / 2), Math.round(st.days / 4)])].filter(d => d >= 1 && d !== st.days);
      const dayset = [st.days, ...extras];
      const series = dayset.map((d, i) => ({
        name: d === st.days ? `${d} 天（目前）` : `${d} 天`,
        color: COLORS[i], dash: DASHES[i], width: i === 0 ? 2.75 : 1.75,
        fmt: METRIC[st.metric].fmt,
        pts: xs.map(x => [x, calc(x, d)[st.metric]]),
      }));
      if (st.metric === 'price') {
        series.push({
          name: '到期（內含價值）', color: 'var(--nq-muted)', width: 1.5, dash: '3 3', fmt: METRIC.price.fmt,
          pts: [lo, Math.min(Math.max(st.K, lo), hi), hi].map(x => [x, st.kind === 'call' ? Math.max(x - st.K, 0) : Math.max(st.K - x, 0)]),
        });
      }
      const xn = st.model === 'b76' ? 'F' : 'S';
      chart.set({
        series,
        points: [{ x: st.S, y: g[st.metric], color: COLORS[0] }],
        markers: [{ x: st.K, label: 'K' }, { x: st.S, label: xn, color: COLORS[0], dash: false }],
        xName: xn, xLabel: st.model === 'b76' ? '期貨價格 F' : '標的價格 S',
        yLabel: METRIC[st.metric].label, yFmt: METRIC[st.metric].fmt, xFmt: v => fmtNum(v, 1),
        yInclude: st.metric === 'price' || st.metric === 'gamma' || st.metric === 'vega' ? [0] : [],
      });
    }
    update();
  }

  // ---------------------------------------------------------------- 5.2 策略損益建構器
  function mountStrategy(root) {
    const TYPE = { call: '買權', put: '賣權', stock: '標的' };
    const st = { S: 100, vol: 25, r: 3, days: 45, legs: [], open: -1 };
    const upd = rafThrottle(update);
    const t = () => st.days / NQMath.CAL, sig = () => st.vol / 100, rr = () => st.r / 100;
    const autoPx = l => (l.type === 'stock' ? st.S : NQMath.bs(st.S, l.K, t(), sig(), rr(), 0, l.type).price);
    const legPx = l => (l.px != null ? l.px : autoPx(l));
    const atm = () => Math.round(st.S / 5) * 5;

    const PRESETS = [
      ['買進跨式', a => [['call', 1, a], ['put', 1, a]]],
      ['賣出跨式', a => [['call', -1, a], ['put', -1, a]]],
      ['買進勒式', a => [['put', 1, a - 5], ['call', 1, a + 5]]],
      ['賣出勒式', a => [['put', -1, a - 5], ['call', -1, a + 5]]],
      ['買進蝶式', a => [['call', 1, a - 5], ['call', -2, a], ['call', 1, a + 5]]],
      ['買進兀鷹', a => [['call', 1, a - 10], ['call', -1, a - 5], ['call', -1, a + 5], ['call', 1, a + 10]]],
      ['買權多頭價差', a => [['call', 1, a], ['call', -1, a + 10]]],
      ['賣權空頭價差', a => [['put', 1, a], ['put', -1, a - 10]]],
      ['比率價差 1×2', a => [['call', 1, a], ['call', -2, a + 10]]],
      ['聖誕樹', a => [['call', 1, a], ['call', -1, a + 5], ['call', -1, a + 10]]],
      ['領口 collar', a => [['stock', 1, a], ['put', 1, a - 10], ['call', -1, a + 10]]],
      ['風險反轉', a => [['call', 1, a + 10], ['put', -1, a - 10]]],
      ['轉換 conversion', a => [['stock', 1, a], ['call', -1, a], ['put', 1, a]]],
    ];
    const setLegs = arr => { st.legs = arr.map(([type, qty, K]) => ({ type, qty, K, px: null })); st.open = -1; renderLegs(); upd(); };

    const sS = slider({ label: '標的價格 S', min: 20, max: 300, step: 0.5, btnStep: 1, value: st.S, fmt: v => fmtNum(v, 1), onInput: v => { st.S = v; upd(); } });
    const sV = slider({ label: '波動率 σ', min: 1, max: 100, step: 1, value: st.vol, fmt: v => v + '%', onInput: v => { st.vol = v; upd(); } });
    const sR = slider({ label: '利率 r', min: 0, max: 10, step: 0.25, value: st.r, fmt: pctFmt, onInput: v => { st.r = v; upd(); } });
    const sD = slider({ label: '距到期天數', min: 1, max: 365, step: 1, value: st.days, fmt: v => v + ' 天', onInput: v => { st.days = v; upd(); } });

    const presetBox = h('div', { class: 'nq-presets' }, PRESETS.map(([name, fn]) =>
      h('button', { type: 'button', class: 'nqt-btn', text: name, onclick: () => setLegs(fn(atm())) })));
    const legList = h('div', { class: 'nq-legs' });
    const lockBtn = h('button', { type: 'button', class: 'nqt-btn', text: '鎖定成交價', onclick: () => { st.legs.forEach(l => { if (l.px == null) l.px = r2(autoPx(l)); }); renderLegs(); upd(); } });
    const unlockBtn = h('button', { type: 'button', class: 'nqt-btn', text: '全部改回理論價', onclick: () => { st.legs.forEach(l => { l.px = null; }); renderLegs(); upd(); } });
    const addBtn = h('button', { type: 'button', class: 'nqt-btn nqt-btn-primary', text: '＋ 新增一隻腳', onclick: () => { st.legs.push({ type: 'call', qty: 1, K: atm(), px: null }); st.open = st.legs.length - 1; renderLegs(); upd(); } });
    const clearBtn = h('button', { type: 'button', class: 'nqt-btn', text: '清空', onclick: () => setLegs([]) });
    const ro = readout([
      { key: 'net', label: '淨權利金', main: true },
      { key: 'delta', label: 'Delta' },
      { key: 'gamma', label: 'Gamma' },
      { key: 'theta', label: 'Theta', hint: '每日' },
      { key: 'vega', label: 'Vega', hint: '每 1 vol 點' },
      { key: 'max', label: '到期最大獲利' },
      { key: 'min', label: '到期最大虧損' },
      { key: 'be', label: '損益兩平點' },
    ]);
    const chartBox = h('div', { class: 'nq-chart-box' });
    root.append(
      h('div', { class: 'nq-controls' }, sS.el, sV.el, sR.el, sD.el),
      panel('快速套用策略（以最接近 S 的 5 元履約價為中心）', presetBox),
      panel('部位（點一隻腳展開編輯）', legList, h('div', { class: 'nq-btnrow' }, addBtn, lockBtn, unlockBtn, clearBtn),
        h('p', { class: 'nq-note', text: '未自訂價格時，成交價 = 目前參數下的理論價，所以「今天」的損益在目前 S 一定是 0。想看建倉後行情變動的損益，先按「鎖定成交價」再移動 S、σ 或天數。' })),
      ro.el, chartBox,
    );
    const chart = new Chart(chartBox);
    const refs = new Map();

    function legSummary(l) {
      return `${Math.abs(l.qty)} × ${TYPE[l.type]}${l.type !== 'stock' ? '　K = ' + fmtNum(l.K, l.K % 1 ? 1 : 0) : ''}`;
    }
    function refreshLeg(l) {
      const rf = refs.get(l);
      if (!rf) return;
      rf.side.textContent = l.qty > 0 ? '買進' : '賣出';
      rf.side.className = 'nq-leg-side ' + (l.qty > 0 ? 'nq-pos' : 'nq-neg');
      rf.txt.textContent = legSummary(l);
      rf.px.textContent = '@ ' + fmtNum(legPx(l), 2) + (l.px != null ? '（自訂）' : '');
      if (rf.auto) rf.auto.textContent = '理論價 ' + fmtNum(autoPx(l), 3);
      if (rf.kStep) rf.kStep.show();
      if (rf.qStep) rf.qStep.show();
    }

    function editor(l, i) {
      const rf = refs.get(l);
      const cType = seg({ label: '類型', value: l.type, options: [['call', '買權'], ['put', '賣權'], ['stock', '標的']], onChange: v => { l.type = v; l.px = null; renderLegs(); upd(); } });
      const qStep = stepper({
        label: '數量（正 = 買進、負 = 賣出）', steps: [1],
        get: () => l.qty,
        set: v => { let q = Math.round(v); if (q === 0) q = v > l.qty ? 1 : -1; l.qty = clamp(q, -10, 10); refreshLeg(l); upd(); },
        fmt: q => (q > 0 ? '買進 ' : '賣出 ') + Math.abs(q),
      });
      rf.qStep = qStep;
      const kids = [cType.el, qStep.el];
      if (l.type !== 'stock') {
        const kStep = stepper({ label: '履約價 K', steps: [1, 5], get: () => l.K, set: v => { l.K = clamp(v, 1, 1000); refreshLeg(l); upd(); }, fmt: v => fmtNum(v, 0) });
        rf.kStep = kStep;
        kids.push(kStep.el);
      }
      const auto = h('span', { class: 'nq-leg-auto' });
      rf.auto = auto;
      const pxInput = h('input', { type: 'number', inputmode: 'decimal', step: '0.01', min: '0', class: 'nqt-num', 'aria-label': '自訂成交價' });
      const syncInput = () => { pxInput.value = l.px != null ? String(l.px) : ''; pxInput.disabled = l.px == null; };
      const cPx = seg({
        label: '成交價', value: l.px == null ? 'auto' : 'custom', options: [['auto', '用理論價'], ['custom', '自訂']],
        onChange: v => { l.px = v === 'auto' ? null : r2(autoPx(l)); syncInput(); refreshLeg(l); upd(); },
      });
      pxInput.addEventListener('input', () => { const v = parseFloat(pxInput.value); if (Number.isFinite(v) && v >= 0) { l.px = v; refreshLeg(l); upd(); } });
      const bumpPx = d => { if (l.px == null) { l.px = r2(autoPx(l)); cPx.set('custom', true); } l.px = Math.max(0, r2(l.px + d)); syncInput(); refreshLeg(l); upd(); };
      const mb = h('button', { type: 'button', class: 'nq-step', text: '−0.1', 'aria-label': '成交價 −0.1' });
      const pb = h('button', { type: 'button', class: 'nq-step', text: '+0.1', 'aria-label': '成交價 +0.1' });
      holdRepeat(mb, () => bumpPx(-0.1));
      holdRepeat(pb, () => bumpPx(0.1));
      syncInput();
      kids.push(cPx.el, h('div', { class: 'nq-stepper-row' }, mb, pxInput, pb), auto);
      kids.push(h('button', { type: 'button', class: 'nqt-btn nqt-btn-danger', text: '刪除這隻腳', onclick: () => { st.legs.splice(i, 1); st.open = -1; renderLegs(); upd(); } }));
      return h('div', { class: 'nq-leg-edit' }, kids);
    }

    function renderLegs() {
      refs.clear();
      legList.innerHTML = '';
      if (!st.legs.length) legList.append(h('p', { class: 'nq-note', text: '目前沒有部位。點上方的策略按鈕，或「＋ 新增一隻腳」。' }));
      st.legs.forEach((l, i) => {
        const open = st.open === i;
        const side = h('span'), txt = h('span', { class: 'nq-leg-txt' }), px = h('span', { class: 'nq-leg-px' });
        refs.set(l, { side, txt, px });
        const sum = h('button', { type: 'button', class: 'nq-leg-sum', 'aria-expanded': String(open), onclick: () => { st.open = open ? -1 : i; renderLegs(); } },
          side, txt, px, h('span', { class: 'nq-leg-chev', text: open ? '▲' : '▼', 'aria-hidden': 'true' }));
        legList.append(h('div', { class: 'nq-leg' + (open ? ' open' : '') }, sum, open ? editor(l, i) : null));
        refreshLeg(l);
      });
    }

    function update() {
      st.legs.forEach(refreshLeg);
      const legs = st.legs.map(l => ({ type: l.type, qty: l.qty, K: l.K, price: legPx(l) }));
      const cost = NQMath.stratCost(legs);
      const g = NQMath.stratGreeks(legs, st.S, t(), sig(), rr(), 0);
      ro.set('net', legs.length ? (cost > 1e-9 ? '支出 ' : cost < -1e-9 ? '收入 ' : '') + fmtNum(Math.abs(cost), 2) : '—', cost > 1e-9 ? 'nq-neg' : cost < -1e-9 ? 'nq-pos' : '');
      ro.set('delta', fmtNum(g.delta, 3));
      ro.set('gamma', fmtNum(g.gamma, 4));
      ro.set('theta', fmtNum(g.theta, 4), signCls(g.theta));
      ro.set('vega', fmtNum(g.vega, 4));
      const ks = legs.filter(l => l.type !== 'stock').map(l => l.K);
      const all = ks.concat([st.S]);
      let lo = Math.min(...all) * 0.75, hi = Math.max(...all) * 1.25;
      if (hi - lo < st.S * 0.4) { lo = Math.min(lo, st.S * 0.8); hi = Math.max(hi, st.S * 1.2); }
      lo = Math.max(0, lo);
      if (!legs.length) {
        ['max', 'min', 'be'].forEach(k => ro.set(k, '—'));
        chart.set({ series: [], xDomain: [lo, hi], yDomain: [-1, 1], xName: 'S', xLabel: '到期時標的價格 S', yLabel: '損益' });
        return;
      }
      const ex = NQMath.stratExtremes(legs);
      ro.set('max', fmtNum(ex.max, 2), signCls(ex.max));
      ro.set('min', fmtNum(ex.min, 2), signCls(ex.min));
      const be = NQMath.stratBreakevens(legs, lo, hi);
      ro.set('be', be.length ? be.map(b => fmtNum(b, 2)).join('、') : '（圖中範圍內沒有）');

      const N = 241, xs = new Set();
      for (let i = 0; i < N; i++) xs.add(lo + (hi - lo) * i / (N - 1));
      ks.forEach(k => { if (k > lo && k < hi) xs.add(k); });
      const X = [...xs].sort((a, b) => a - b);
      const half = Math.round(st.days / 2);
      const pnlAt = (x, days) => NQMath.stratValue(legs, x, days / NQMath.CAL, sig(), rr(), 0) - cost;
      const f2 = v => fmtNum(v, 2);
      const series = [
        { name: '到期損益', color: COLORS[0], width: 2.75, fmt: f2, pts: X.map(x => [x, NQMath.stratExpiryPnl(legs, x)]) },
        { name: `今天理論損益（剩 ${st.days} 天）`, color: COLORS[1], width: 2, dash: DASHES[1], fmt: f2, pts: X.map(x => [x, pnlAt(x, st.days)]) },
      ];
      if (half >= 1 && half < st.days) series.push({ name: `剩 ${half} 天時`, color: COLORS[2], width: 1.75, dash: DASHES[2], fmt: f2, pts: X.map(x => [x, pnlAt(x, half)]) });
      chart.set({
        series,
        markers: [{ x: st.S, label: 'S', color: COLORS[0], dash: false }, ...be.map(b => ({ x: b, label: '兩平 ' + fmtNum(b, 1) }))],
        points: be.map(b => ({ x: b, y: 0, color: 'var(--md-default-fg-color)', r: 4.5 })),
        xDomain: [lo, hi], yInclude: [0], xName: 'S', xLabel: '標的價格 S', yLabel: '損益（每單位）', xFmt: v => fmtNum(v, 2), yFmt: f2,
      });
    }
    setLegs(PRESETS[0][1](atm()));
    update();
  }

  // ---------------------------------------------------------------- 5.3 動態避險模擬
  function mountHedging(root) {
    const st = { S0: 100, K: 100, days: 60, imp: 20, real: 30, every: 1, side: 1, kind: 'call', deltaVol: 'real', n: 200, seed: 1, path: 0 };
    const upd = rafThrottle(update);
    const sS = slider({ label: '期初股價 S₀', min: 50, max: 150, step: 1, value: st.S0, fmt: v => fmtNum(v, 0), onInput: v => { st.S0 = v; upd(); } });
    const sK = slider({ label: '履約價 K', min: 50, max: 150, step: 1, value: st.K, fmt: v => fmtNum(v, 0), onInput: v => { st.K = v; upd(); } });
    const sD = slider({ label: '距到期天數（每天一步）', min: 5, max: 120, step: 1, value: st.days, fmt: v => v + ' 天', onInput: v => { st.days = v; upd(); } });
    const sI = slider({ label: '隱含波動率（成交價用）', min: 5, max: 80, step: 1, value: st.imp, fmt: v => v + '%', onInput: v => { st.imp = v; upd(); } });
    const sR = slider({ label: '實現波動率（股價實際走的）', min: 5, max: 80, step: 1, value: st.real, fmt: v => v + '%', onInput: v => { st.real = v; upd(); } });
    const sN = slider({ label: '模擬路徑數', min: 1, max: 500, step: 1, btnStep: 10, value: st.n, fmt: v => v + ' 條', onInput: v => { st.n = v; st.path = Math.min(st.path, v - 1); upd(); } });
    const cEvery = seg({ label: '重新避險頻率', value: st.every, options: [[1, '每天'], [2, '每 2 天'], [7, '每週'], [0, '不調整']], onChange: v => { st.every = v; upd(); } });
    const cSide = seg({ label: '選擇權部位', value: st.side, options: [[1, '買進（long）'], [-1, '賣出（short）']], onChange: v => { st.side = v; upd(); } });
    const cKind = seg({ label: '種類', value: st.kind, options: [['call', '買權'], ['put', '賣權']], onChange: v => { st.kind = v; upd(); } });
    const cDV = seg({ label: '計算避險 delta 用的波動率', value: st.deltaVol, options: [['real', '實現波動率'], ['imp', '隱含波動率']], onChange: v => { st.deltaVol = v; upd(); } });
    const seedOut = h('span', { class: 'nq-note-inline' });
    const resample = h('button', { type: 'button', class: 'nqt-btn nqt-btn-primary', text: '🎲 重新抽樣', onclick: () => { st.seed++; upd(); } });
    const pathStep = stepper({ label: '路徑圖顯示第幾條', steps: [1], get: () => st.path + 1, set: v => { st.path = clamp(Math.round(v) - 1, 0, st.n - 1); upd(); }, fmt: v => `第 ${v} 條` });
    const ro = readout([
      { key: 'prem', label: '成交價（隱含σ）' },
      { key: 'fair', label: '理論價值（實現σ）' },
      { key: 'theory', label: '理論期望損益', main: true, hint: '±（實現σ 價值 − 隱含σ 價值）' },
      { key: 'mean', label: '模擬平均損益', main: true },
      { key: 'sd', label: '模擬標準差' },
      { key: 'win', label: '獲利路徑比例' },
      { key: 'ms', label: '計算時間' },
    ]);
    const box1 = h('div', { class: 'nq-chart-box' }), box2 = h('div', { class: 'nq-chart-box' }), box3 = h('div', { class: 'nq-chart-box' });
    root.append(
      h('div', { class: 'nq-controls' }, sS.el, sK.el, sD.el, sI.el, sR.el, sN.el),
      h('div', { class: 'nq-row2' }, cEvery.el, cSide.el, cKind.el, cDV.el),
      h('div', { class: 'nq-btnrow' }, resample, seedOut),
      ro.el,
      panel('所有路徑的最終避險損益分配', box3),
      panel('單一路徑：股價', pathStep.el, box1),
      panel('單一路徑：避險後部位的累積損益（選擇權以隱含σ評價）', box2),
      h('p', { class: 'nq-note', text: '假設：利率 0、股價無漂移、無交易成本；每單位選擇權。每條路徑的亂數由種子決定，改參數時同一條路徑的隨機衝擊不變，方便比較。' }),
    );
    const cPath = new Chart(box1, { aspect: 0.42, minH: 200, maxH: 300 });
    const cPnl = new Chart(box2, { aspect: 0.42, minH: 200, maxH: 300 });
    const cHist = new Chart(box3, { aspect: 0.5, minH: 220, maxH: 340 });

    function update() {
      const o = { S0: st.S0, K: st.K, days: st.days, sigImp: st.imp / 100, sigReal: st.real / 100, every: st.every, side: st.side, kind: st.kind, deltaVol: st.deltaVol, seed: st.seed };
      const t0 = performance.now();
      const res = NQMath.hedgeSim(o, st.n);
      const ms = performance.now() - t0;
      const T = st.days / NQMath.CAL;
      const prem = NQMath.bsPrice(st.S0, st.K, T, o.sigImp, 0, 0, st.kind), fair = NQMath.bsPrice(st.S0, st.K, T, o.sigReal, 0, 0, st.kind);
      let wins = 0, mn = Infinity, mx = -Infinity;
      for (const v of res.finals) { if (v > 0) wins++; if (v < mn) mn = v; if (v > mx) mx = v; }
      ro.set('prem', fmtNum(prem, 3));
      ro.set('fair', fmtNum(fair, 3));
      ro.set('theory', fmtSigned(res.theory, 3), signCls(res.theory));
      ro.set('mean', fmtSigned(res.mean, 3), signCls(res.mean));
      ro.set('sd', fmtNum(res.sd, 3));
      ro.set('win', fmtPct(wins / st.n, 1));
      ro.set('ms', fmtNum(ms, 1) + ' ms');
      seedOut.textContent = `亂數種子 #${st.seed}`;
      pathStep.show();

      const span = Math.max(mx - mn, 1e-6), pad = span * 0.05;
      const nb = clamp(Math.round(Math.sqrt(st.n) * 1.6), 8, 40);
      const bins = NQMath.histogram(res.finals, nb, mn - pad, mx + pad);
      const lo = Math.min(mn - pad, res.theory, 0), hi = Math.max(mx + pad, res.theory, 0);
      cHist.set({
        hist: { name: '路徑數', color: 'var(--nq-c1)', bins, fmt: v => v + ' 條' },
        markers: [
          { x: res.mean, label: '平均 ' + fmtNum(res.mean, 2), color: 'var(--nq-c2)', dash: false },
          { x: res.theory, label: '理論 ' + fmtNum(res.theory, 2), color: 'var(--nq-c4)' },
          { x: 0, color: 'var(--nq-muted)' },
        ],
        legendExtra: [{ name: '模擬平均', color: 'var(--nq-c2)', dash: '0' }, { name: '理論期望', color: 'var(--nq-c4)' }],
        xDomain: [lo, hi], xName: '最終損益', xLabel: '最終避險損益（每單位選擇權）', yLabel: '路徑數', xFmt: v => fmtNum(v, 2), yFmt: v => fmtNum(v, 0),
      });

      const p = NQMath.hedgePath(o, st.path, true);
      const days = p.rec.S.map((_, i) => i * st.days / (p.rec.S.length - 1));
      const rehedge = [];
      if (st.every > 0) for (let k = st.every; k < st.days; k += st.every) rehedge.push(k);
      cPath.set({
        series: [{ name: '股價', color: COLORS[0], width: 2, fmt: v => fmtNum(v, 2), pts: days.map((d, i) => [d, p.rec.S[i]]) }],
        hmarkers: [{ y: st.K, label: 'K = ' + st.K }],
        tipExtra: x => { const i = clamp(Math.round(x / st.days * (p.rec.S.length - 1)), 0, p.rec.S.length - 1); return [['持有股數', fmtNum(p.rec.hedge[i], 3)]]; },
        xDomain: [0, st.days], xName: '第幾天', xLabel: '天數', yLabel: '股價', xFmt: v => fmtNum(v, 0),
      });
      cPnl.set({
        series: [
          { name: '避險後部位損益', color: COLORS[1], width: 2.25, fmt: v => fmtNum(v, 3), pts: days.map((d, i) => [d, p.rec.pnl[i]]) },
          { name: '若完全不避險（只有選擇權）', color: 'var(--nq-muted)', width: 1.5, dash: '3 3', fmt: v => fmtNum(v, 3), pts: days.map((d, i) => [d, p.rec.opt[i]]) },
        ],
        hmarkers: [{ y: res.theory, label: '理論期望 ' + fmtNum(res.theory, 2), color: 'var(--nq-c4)' }],
        yInclude: [0, res.theory], xDomain: [0, st.days], xName: '第幾天', xLabel: `天數（本路徑最終避險損益 ${fmtSigned(p.final, 3)}，共調整 ${p.nTrades} 次）`, yLabel: '累積損益', xFmt: v => fmtNum(v, 0),
      });
    }
    update();
  }

  // ---------------------------------------------------------------- 5.4 常態與對數常態分配
  function mountDistribution(root) {
    const st = { S: 100, vol: 25, days: 30, r: 0, lo: 90, hi: 110, basis: 'norm' };
    const upd = rafThrottle(update);
    let dom = [50, 150];
    const sS = slider({ label: '目前股價 S', min: 20, max: 300, step: 1, value: st.S, fmt: v => fmtNum(v, 0), onInput: v => { const k = v / st.S; st.S = v; st.lo = r2(st.lo * k); st.hi = r2(st.hi * k); upd(); } });
    const sV = slider({ label: '年化波動率 σ', min: 1, max: 100, step: 1, value: st.vol, fmt: v => v + '%', onInput: v => { st.vol = v; upd(); } });
    const sD = slider({ label: '天數（日曆日）', min: 1, max: 730, step: 1, value: st.days, fmt: v => v + ' 天', onInput: v => { st.days = v; upd(); } });
    const sR = slider({ label: '利率 r（決定遠期價）', min: 0, max: 10, step: 0.25, value: st.r, fmt: pctFmt, onInput: v => { st.r = v; upd(); } });
    const sLo = slider({ label: '區間下界', min: 1, max: 300, step: 0.5, value: st.lo, fmt: v => fmtNum(v, 1), onInput: v => { st.lo = Math.min(v, st.hi); upd(); } });
    const sHi = slider({ label: '區間上界', min: 1, max: 300, step: 0.5, value: st.hi, fmt: v => fmtNum(v, 1), onInput: v => { st.hi = Math.max(v, st.lo); upd(); } });
    const cBasis = seg({ label: '一鍵設定區間：依據', value: st.basis, options: [['norm', '常態 ±kσ'], ['logn', '對數常態 ±kσ']], onChange: v => { st.basis = v; } });
    const setK = k => {
      const p = NQMath.distParams(st.S, st.vol / 100, st.days / NQMath.CAL, st.r / 100);
      if (st.basis === 'norm') { st.lo = r2(p.F - k * p.sd); st.hi = r2(p.F + k * p.sd); }
      else { st.lo = r2(Math.exp(p.mu - k * p.s)); st.hi = r2(Math.exp(p.mu + k * p.s)); }
      upd();
    };
    const kBtns = h('div', { class: 'nq-btnrow' }, [1, 2, 3].map(k => h('button', { type: 'button', class: 'nqt-btn', text: `±${k}σ`, onclick: () => setK(k) })));
    const ro = readout([
      { key: 'pn', label: '常態：落在區間內', main: true },
      { key: 'pl', label: '對數常態：落在區間內', main: true },
      { key: 'bn', label: '常態：低於下界' },
      { key: 'bl', label: '對數常態：低於下界' },
      { key: 'an', label: '常態：高於上界' },
      { key: 'al', label: '對數常態：高於上界' },
      { key: 'neg', label: '常態：股價 < 0 的機率', hint: '對數常態永遠是 0' },
    ]);
    const rangeTbl = h('div', { class: 'nq-tablewrap' });
    const scaleTbl = h('div', { class: 'nq-tablewrap' });
    const chartBox = h('div', { class: 'nq-chart-box' });
    root.append(
      h('div', { class: 'nq-controls' }, sS.el, sV.el, sD.el, sR.el),
      panel('機率區間（可直接拖曳圖上的兩條把手）', h('div', { class: 'nq-controls' }, sLo.el, sHi.el), cBasis.el, kBtns),
      ro.el, chartBox,
      panel('±1／2／3 個標準差的價格範圍', rangeTbl),
      panel('波動率的時間縮放', scaleTbl),
    );
    const chart = new Chart(chartBox, { aspect: 0.55 });

    function update() {
      const t = st.days / NQMath.CAL, sig = st.vol / 100;
      const p = NQMath.distParams(st.S, sig, t, st.r / 100);
      // x 範圍：涵蓋兩種分配的 ±4σ
      const a = Math.min(p.F - 4 * p.sd, Math.exp(p.mu - 4 * p.s)), b = Math.max(p.F + 4 * p.sd, Math.exp(p.mu + 4 * p.s));
      dom = [a, b];
      const step = niceStep(b - a, 400);
      sLo.setRange(Math.floor(a / step) * step, Math.ceil(b / step) * step, step);
      sHi.setRange(Math.floor(a / step) * step, Math.ceil(b / step) * step, step);
      st.lo = clamp(st.lo, a, b); st.hi = clamp(st.hi, st.lo, b);
      sLo.set(st.lo, true); sHi.set(st.hi, true);
      const Nn = x => NQMath.normalCdfAt(x, p.F, p.sd), Nl = x => NQMath.lognormalCdfAt(x, p.mu, p.s);
      ro.set('pn', fmtPct(Nn(st.hi) - Nn(st.lo), 2));
      ro.set('pl', fmtPct(Nl(st.hi) - Nl(st.lo), 2));
      ro.set('bn', fmtPct(Nn(st.lo), 2)); ro.set('bl', fmtPct(Nl(st.lo), 2));
      ro.set('an', fmtPct(1 - Nn(st.hi), 2)); ro.set('al', fmtPct(1 - Nl(st.hi), 2));
      ro.set('neg', fmtPct(Nn(0), 3));

      const N = 301, pn = [], pl = [];
      for (let i = 0; i < N; i++) {
        const x = a + (b - a) * i / (N - 1);
        pn.push([x, NQMath.normalPdfAt(x, p.F, p.sd)]);
        pl.push([x, NQMath.lognormalPdfAt(x, p.mu, p.s)]);
      }
      const dfmt = v => fmtNum(v, 5);
      const median = Math.exp(p.mu), mode = Math.exp(p.mu - p.s * p.s);
      chart.set({
        series: [
          { name: '常態', color: COLORS[0], width: 2.25, fmt: dfmt, pts: pn },
          { name: '對數常態', color: COLORS[1], width: 2.25, dash: DASHES[1], fmt: dfmt, pts: pl },
        ],
        bands: [{ x0: st.lo, x1: st.hi, color: 'var(--nq-c3)', opacity: 0.16 }],
        markers: [
          { x: p.F, label: '平均＝遠期 ' + fmtNum(p.F, 1), color: 'var(--nq-muted)' },
          ...(Math.abs(mode - p.F) / (b - a) > 0.02 ? [{ x: mode, label: '眾數', color: 'var(--nq-c2)' }] : []),
          ...(a < 0 ? [{ x: 0, label: '0', color: 'var(--nq-c2)', dash: false }] : []),
        ],
        handles: [{ id: 'lo', x: st.lo, label: fmtNum(st.lo, 1), color: 'var(--nq-c3)' }, { id: 'hi', x: st.hi, label: fmtNum(st.hi, 1), color: 'var(--nq-c3)' }],
        onHandle: (id, x) => {
          const step2 = niceStep(b - a, 400), v = Math.round(x / step2) * step2;
          if (id === 'lo') st.lo = Math.min(v, st.hi); else st.hi = Math.max(v, st.lo);
          upd();
        },
        tipExtra: x => [['P(常態 < x)', fmtPct(Nn(x), 1)], ['P(對數常態 < x)', fmtPct(Nl(x), 1)]],
        xDomain: [a, b], yInclude: [0], xName: '到期股價', xLabel: `${st.days} 天後的股價`, yLabel: '機率密度', xFmt: v => fmtNum(v, 2), yFmt: dfmt,
      });

      const rows = [1, 2, 3].map(k => {
        const pr = NQMath.normCdf(k) - NQMath.normCdf(-k);
        return `<tr><td>±${k}σ（${fmtPct(pr, 1)}）</td><td>${fmtNum(p.F - k * p.sd, 2)} ～ ${fmtNum(p.F + k * p.sd, 2)}</td><td>${fmtNum(Math.exp(p.mu - k * p.s), 2)} ～ ${fmtNum(Math.exp(p.mu + k * p.s), 2)}</td></tr>`;
      }).join('');
      rangeTbl.innerHTML = `<table class="nq-table"><thead><tr><th>範圍（機率）</th><th>常態：F ± k·Sσ√t</th><th>對數常態：e^(μ ± kσ√t)</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="nq-note">σ√t = ${fmtPct(p.s, 2)}，一個標準差的價格變動 ≈ Sσ√t = ${fmtNum(p.sd, 2)}。對數常態的中位數 ${fmtNum(median, 2)} &lt; 平均數 ${fmtNum(p.F, 2)}，眾數 ${fmtNum(mode, 2)} 更低：右尾較長。</p>`;
      const dly = sig / Math.sqrt(252), wk = sig / Math.sqrt(52);
      scaleTbl.innerHTML = `<table class="nq-table"><thead><tr><th>期間</th><th>標準差（%）</th><th>標準差（價格）</th><th>快速心算</th></tr></thead><tbody>
        <tr><td>每日（252 交易日）</td><td>${fmtPct(dly, 2)}</td><td>${fmtNum(st.S * dly, 2)}</td><td>σ ÷ 16 = ${fmtPct(sig / 16, 2)}</td></tr>
        <tr><td>每週（52 週）</td><td>${fmtPct(wk, 2)}</td><td>${fmtNum(st.S * wk, 2)}</td><td>σ ÷ 7.2 = ${fmtPct(sig / 7.2, 2)}</td></tr>
        <tr><td>${st.days} 個日曆日</td><td>${fmtPct(p.s, 2)}</td><td>${fmtNum(p.sd, 2)}</td><td>σ × √(${st.days}/365)</td></tr>
        </tbody></table><p class="nq-note">√252 ≈ 15.87 ≈ 16，所以「年化波動率 ÷ 16 ≈ 每日標準差」。</p>`;
    }
    update();
  }

  // ---------------------------------------------------------------- 5.5 二元樹
  function mountBinomial(root) {
    const st = { S: 100, K: 100, vol: 25, r: 5, q: 0, days: 90, n: 4, kind: 'put', american: true, sel: [0, 0] };
    const upd = rafThrottle(update);
    const sS = slider({ label: '股價 S', min: 20, max: 200, step: 1, value: st.S, fmt: v => fmtNum(v, 0), onInput: v => { st.S = v; upd(); } });
    const sK = slider({ label: '履約價 K', min: 20, max: 200, step: 1, value: st.K, fmt: v => fmtNum(v, 0), onInput: v => { st.K = v; upd(); } });
    const sV = slider({ label: '波動率 σ', min: 1, max: 100, step: 1, value: st.vol, fmt: v => v + '%', onInput: v => { st.vol = v; upd(); } });
    const sR = slider({ label: '利率 r', min: 0, max: 20, step: 0.25, value: st.r, fmt: pctFmt, onInput: v => { st.r = v; upd(); } });
    const sQ = slider({ label: '連續股利率 q', min: 0, max: 20, step: 0.25, value: st.q, fmt: pctFmt, onInput: v => { st.q = v; upd(); } });
    const sD = slider({ label: '距到期天數', min: 1, max: 730, step: 1, value: st.days, fmt: v => v + ' 天', onInput: v => { st.days = v; upd(); } });
    const sN = slider({ label: '步數 n', min: 1, max: 8, step: 1, value: st.n, fmt: v => v + ' 步', onInput: v => { st.n = v; st.sel = [Math.min(st.sel[0], v), Math.min(st.sel[1], Math.min(st.sel[0], v))]; upd(); } });
    const cKind = seg({ label: '種類', value: st.kind, options: [['call', '買權'], ['put', '賣權']], onChange: v => { st.kind = v; upd(); } });
    const cAm = seg({ label: '履約方式', value: st.american ? 'am' : 'eu', options: [['eu', '歐式'], ['am', '美式']], onChange: v => { st.american = v === 'am'; upd(); } });
    const ro = readout([
      { key: 'tree', label: '二元樹價格', main: true },
      { key: 'bs', label: 'Black-Scholes（歐式）', main: true },
      { key: 'diff', label: '差異（樹 − BS）' },
      { key: 'big', label: '200 步樹價格', hint: '同樣履約方式' },
      { key: 'u', label: 'u = e^(σ√Δt)' },
      { key: 'd', label: 'd = 1/u' },
      { key: 'p', label: '風險中立 p', hint: '(e^((r−q)Δt) − d)/(u − d)' },
      { key: 'dt', label: 'Δt（年）' },
    ]);
    const treeBox = h('div', { class: 'nq-tree-box' });
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'nq-tree-svg');
    treeBox.append(svg);
    const legend = h('div', { class: 'nq-legend', html: '<span class="nq-lg"><span class="nq-sw nq-sw-node"></span>上：股價　下：選擇權價值</span><span class="nq-lg"><span class="nq-sw nq-sw-ex"></span>提前履約節點</span><span class="nq-lg"><span class="nq-sw nq-sw-sel"></span>目前選取（點任一節點看計算）</span>' });
    const detail = h('div', { class: 'nq-detail', 'aria-live': 'polite' });
    root.append(
      h('div', { class: 'nq-controls' }, sS.el, sK.el, sV.el, sR.el, sQ.el, sD.el, sN.el),
      h('div', { class: 'nq-row2' }, cKind.el, cAm.el),
      ro.el, legend, treeBox, detail,
    );
    let W = 0, tr = null;
    observeWidth(treeBox, w => { if (Math.abs(w - W) > 0.5) { W = w; draw(); } });
    svg.addEventListener('click', e => {
      const g = e.target.closest('.nq-node');
      if (!g) return;
      st.sel = [+g.dataset.i, +g.dataset.j];
      draw(); showDetail();
    });

    function draw() {
      if (!tr) return;
      const n = tr.n, width = Math.max(W || treeBox.clientWidth || 600, (n + 1) * 66 + 16);
      const nodeW = clamp((width - 16) / (n + 1) - 10, 56, 96), nodeH = 42;
      const colX = i => 8 + nodeW / 2 + (n ? i * (width - 16 - nodeW) / n : (width - 16 - nodeW) / 2);
      const dy = Math.max(nodeH / 2 + 5, Math.min(52, 210 / n));
      const H = 2 * n * dy + nodeH + 16;
      const cy = (i, j) => H / 2 - (2 * j - i) * dy;
      const f = v => v.toFixed(1);
      let s = '<g class="nq-edges">';
      for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
        s += `<line x1="${f(colX(i))}" y1="${f(cy(i, j))}" x2="${f(colX(i + 1))}" y2="${f(cy(i + 1, j + 1))}"/>`;
        s += `<line x1="${f(colX(i))}" y1="${f(cy(i, j))}" x2="${f(colX(i + 1))}" y2="${f(cy(i + 1, j))}"/>`;
      }
      s += '</g>';
      for (let i = 0; i <= n; i++) for (let j = 0; j <= i; j++) {
        const x = colX(i), y = cy(i, j);
        const sel = st.sel[0] === i && st.sel[1] === j;
        const cls = 'nq-node' + (tr.ex[i][j] ? ' nq-ex' : '') + (sel ? ' nq-sel' : '') + (i === n ? ' nq-term' : '');
        s += `<g class="${cls}" data-i="${i}" data-j="${j}" role="button" tabindex="0" aria-label="節點 ${i},${j}：股價 ${fmtNum(tr.S[i][j], 2)}，選擇權 ${fmtNum(tr.V[i][j], 2)}">`;
        s += `<rect x="${f(x - nodeW / 2)}" y="${f(y - nodeH / 2)}" width="${f(nodeW)}" height="${nodeH}" rx="7"/>`;
        s += `<text class="nq-node-s" x="${f(x)}" y="${f(y - 5)}" text-anchor="middle">${fmtNum(tr.S[i][j], 2)}</text>`;
        s += `<text class="nq-node-v" x="${f(x)}" y="${f(y + 14)}" text-anchor="middle">${fmtNum(tr.V[i][j], 2)}</text>`;
        s += '</g>';
      }
      for (let i = 0; i <= n; i++) s += `<text class="nq-tree-col" x="${f(colX(i))}" y="${f(H + 10)}" text-anchor="middle">${i === 0 ? '今天' : '第 ' + i + ' 步'}</text>`;
      svg.setAttribute('viewBox', `0 0 ${width} ${H + 16}`);
      svg.setAttribute('width', width);
      svg.setAttribute('height', H + 16);
      svg.innerHTML = s;
    }

    function showDetail() {
      if (!tr) return;
      const [i, j] = st.sel, n = tr.n, S = tr.S[i][j], V = tr.V[i][j];
      const f4 = v => fmtNum(v, 4), f2 = v => fmtNum(v, 2);
      const payTxt = st.kind === 'call' ? 'S − K' : 'K − S';
      const intr = tr.sign * (S - st.K);
      const L = [];
      L.push(`<p><b>節點 (${i}, ${j})</b>：第 ${i} 步，上漲 ${j} 次、下跌 ${i - j} 次（時間 ${f2(i * tr.dt * 365)} 天）。</p>`);
      L.push(`<p>股價 = S × u<sup>${j}</sup> × d<sup>${i - j}</sup> = ${f2(st.S)} × ${f4(tr.u)}<sup>${j}</sup> × ${f4(tr.d)}<sup>${i - j}</sup> = <b>${f2(S)}</b></p>`);
      if (i === n) {
        L.push(`<p>到期價值 = max(${payTxt}, 0) = max(${f2(intr)}, 0) = <b>${f2(V)}</b></p>`);
      } else {
        const Vu = tr.V[i + 1][j + 1], Vd = tr.V[i + 1][j], Su = tr.S[i + 1][j + 1], Sd = tr.S[i + 1][j];
        L.push(`<p>持有價值 = e<sup>−rΔt</sup> × [p × V<sub>上</sub> + (1 − p) × V<sub>下</sub>] = ${f4(tr.disc)} × [${f4(tr.p)} × ${f2(Vu)} + ${f4(1 - tr.p)} × ${f2(Vd)}] = <b>${f4(tr.cont[i][j])}</b></p>`);
        if (st.american) {
          L.push(`<p>立即履約價值 = ${payTxt} = ${f4(intr)}　→　取較大者：${tr.ex[i][j] ? '<b class="nq-neg">提前履約</b>' : '繼續持有'}，節點價值 = <b>${f4(V)}</b></p>`);
        } else {
          L.push(`<p>歐式不能提前履約，節點價值 = 持有價值 = <b>${f4(V)}</b>${intr > tr.cont[i][j] + 1e-12 ? `（注意：此處內含價值 ${f4(intr)} 比持有價值高，若是美式就會提前履約）` : ''}</p>`);
        }
        L.push(`<p>此節點的 delta = (V<sub>上</sub> − V<sub>下</sub>) / (S<sub>上</sub> − S<sub>下</sub>) = (${f2(Vu)} − ${f2(Vd)}) / (${f2(Su)} − ${f2(Sd)}) = <b>${fmtNum((Vu - Vd) / (Su - Sd), 4)}</b></p>`);
      }
      if (tr.p < 0 || tr.p > 1) L.push('<p class="nq-neg">注意：p 不在 0～1 之間（Δt 太大或 r − q 太極端），這棵樹不是合理的風險中立樹。請增加步數或調整參數。</p>');
      detail.innerHTML = L.join('');
    }

    function update() {
      const t = st.days / NQMath.CAL, sig = st.vol / 100, r = st.r / 100, q = st.q / 100;
      tr = NQMath.crrTree(st.S, st.K, t, sig, r, q, st.n, st.kind, st.american);
      if (st.sel[0] > st.n) st.sel = [0, 0];
      const bsv = NQMath.bsPrice(st.S, st.K, t, sig, r, q, st.kind);
      const big = NQMath.binomialPrice(st.S, st.K, t, sig, r, q, 200, st.kind, st.american);
      ro.set('tree', fmtNum(tr.price, 4));
      ro.set('bs', fmtNum(bsv, 4));
      ro.set('diff', fmtSigned(tr.price - bsv, 4), signCls(tr.price - bsv));
      ro.set('big', fmtNum(big, 4));
      ro.set('u', fmtNum(tr.u, 5)); ro.set('d', fmtNum(tr.d, 5));
      ro.set('p', fmtNum(tr.p, 5), tr.p < 0 || tr.p > 1 ? 'nq-neg' : '');
      ro.set('dt', fmtNum(tr.dt, 5));
      draw(); showDetail();
    }
    update();
  }

  // =========================================================================
  // 6. 掛載
  // =========================================================================
  const TOOLS = {
    'option-explorer': mountExplorer,
    'strategy-builder': mountStrategy,
    'hedging-simulator': mountHedging,
    'distribution': mountDistribution,
    'binomial-tree': mountBinomial,
  };

  function mountAll() {
    for (let i = OBSERVERS.length - 1; i >= 0; i--) {
      if (!document.contains(OBSERVERS[i].el)) { OBSERVERS[i].ro.disconnect(); OBSERVERS.splice(i, 1); }
    }
    document.querySelectorAll('.nq-tool[data-tool]').forEach(el => {
      if (el.dataset.nqMounted) return;
      const fn = TOOLS[el.dataset.tool];
      el.dataset.nqMounted = '1';
      el.innerHTML = '';
      if (!fn) { el.textContent = '找不到互動工具：' + el.dataset.tool; return; }
      try { fn(el); } catch (err) {
        console.error('[nq-tools]', err);
        el.textContent = '互動工具載入失敗：' + (err && err.message);
      }
    });
  }

  if (typeof window.document$ !== 'undefined' && window.document$.subscribe) window.document$.subscribe(() => mountAll());
  else if (typeof document$ !== 'undefined' && document$.subscribe) document$.subscribe(() => mountAll()); // eslint-disable-line no-undef
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
})();
