/* nq-drills.js — Optiver 培訓準備：三個計時練習
 *   <div class="nq-drill" data-drill="mental-math"></div>  心算速練
 *   <div class="nq-drill" data-drill="arbitrage"></div>    套利偵測
 *   <div class="nq-drill" data-drill="coach"></div>        教練拍肩問
 * 純函式集中在 Core（Node 可 require 做測試）；UI 只在瀏覽器掛載。
 * 紀錄存在 localStorage 鍵 "nq:drills"。無外部依賴。
 */
(function (G) {
  'use strict';

  const Core = (() => {
    /* =================================================================
     * 亂數、格式、數學
     * ================================================================= */
    function mulberry32(seed) {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const r9 = (x) => Math.round(x * 1e9) / 1e9;
    const r2 = (x) => Math.round(x * 100) / 100;
    const roundTo = (x, d) => { const m = Math.pow(10, d); return Math.round(x * m) / m; };

    function Rand(rng) {
      const f = rng || Math.random;
      return {
        f,
        range: (a, b) => a + (b - a) * f(),
        int: (a, b) => a + Math.floor(f() * (b - a + 1)),
        pick: (arr) => arr[Math.floor(f() * arr.length)],
        sign: () => (f() < 0.5 ? -1 : 1),
        chance: (p) => f() < p,
        step: (a, b, s) => r9(a + s * Math.floor(f() * (Math.round((b - a) / s) + 1))),
      };
    }

    const MINUS = '−';
    const groupInt = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    /** 數字格式：d 省略時自動取 0–2 位小數（maxD 可調）；負號用 U+2212、千分位逗號。 */
    function fmt(x, d, maxD) {
      if (typeof x !== 'number' || !isFinite(x)) return '—';
      if (d == null) {
        const m = maxD == null ? 2 : maxD;
        d = m;
        for (let k = 0; k <= m; k++) if (Math.abs(x - roundTo(x, k)) < 1e-9) { d = k; break; }
      }
      const s = Math.abs(x).toFixed(d);
      const parts = s.split('.');
      const body = groupInt(parts[0]) + (parts[1] ? '.' + parts[1] : '');
      return (x < 0 && Number(s) !== 0 ? MINUS : '') + body;
    }
    function fmtS(x, d, maxD) {
      const s = fmt(x, d, maxD);
      return x > 0 && /[1-9]/.test(s) ? '+' + s : s;
    }
    const par = (x, d, maxD) => (x < 0 ? '(' + fmt(x, d, maxD) + ')' : fmt(x, d, maxD));

    function parseNum(str) {
      if (str == null) return NaN;
      const s = String(str).trim().replace(/[,，\s]/g, '').replace(/[−–—]/g, '-').replace(/%$/, '');
      if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
      return parseFloat(s);
    }

    function median(a) {
      if (!a.length) return NaN;
      const s = a.slice().sort((x, y) => x - y), m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }
    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }

    function npdf(x) { return Math.exp(-0.5 * x * x) / 2.5066282746310002; }
    /** 標準常態 CDF（Hart 1968 / West 2005，雙精度）。 */
    function ncdf(x) {
      const z = Math.abs(x);
      let c = 0;
      if (z <= 37) {
        const e = Math.exp(-z * z / 2);
        if (z < 7.07106781186547) {
          let n = 3.52624965998911e-2 * z + 0.700383064443688;
          n = n * z + 6.37396220353165; n = n * z + 33.912866078383; n = n * z + 112.079291497871;
          n = n * z + 221.213596169931; n = n * z + 220.206867912376;
          let d = 8.83883476483184e-2 * z + 1.75566716318264;
          d = d * z + 16.064177579207; d = d * z + 86.7807322029461; d = d * z + 296.564248779674;
          d = d * z + 637.333633378831; d = d * z + 793.826512519948; d = d * z + 440.413735824752;
          c = e * n / d;
        } else {
          let b = z + 0.65;
          b = z + 4 / b; b = z + 3 / b; b = z + 2 / b; b = z + 1 / b;
          c = e / b / 2.506628274631;
        }
      }
      return x > 0 ? 1 - c : c;
    }
    /** Black-Scholes（無股利）：vega 每 1 vol 點、theta 每日曆日。 */
    function bs(S, K, T, sig, r, kind) {
      const sq = Math.sqrt(T), vs = sig * sq, D = Math.exp(-r * T);
      const d1 = (Math.log(S / K) + (r + 0.5 * sig * sig) * T) / vs, d2 = d1 - vs;
      const isC = kind !== 'put';
      const call = S * ncdf(d1) - K * D * ncdf(d2);
      const thY = -S * npdf(d1) * sig / (2 * sq) + (isC ? -r * K * D * ncdf(d2) : r * K * D * ncdf(-d2));
      return {
        price: isC ? call : call - S + K * D,
        delta: isC ? ncdf(d1) : ncdf(d1) - 1,
        gamma: npdf(d1) / (S * vs),
        vega: S * npdf(d1) * sq / 100,
        theta: thY / 365,
      };
    }
    /** SSVI 總變異數（Gatheral–Jacquier 2014），冪次 φ；η(1+|ρ|) ≤ 2、γ ≤ 1/2 時無靜態套利。 */
    function ssviW(k, theta, sm) {
      const phi = sm.eta / (Math.pow(theta, sm.gamma) * Math.pow(1 + theta, 1 - sm.gamma));
      const a = phi * k + sm.rho;
      return theta / 2 * (1 + sm.rho * phi * k + Math.sqrt(a * a + 1 - sm.rho * sm.rho));
    }

    /* =================================================================
     * 1. 心算速練
     * ================================================================= */
    const MM_CATS = [
      { key: 'taylor', label: '泰勒 PnL', mult: 1.5 },
      { key: 'newdelta', label: '新 Delta', mult: 1.25 },
      { key: 'atm', label: '價平／跨式估價', mult: 1.25 },
      { key: 'volscale', label: '波動率換算 ÷16', mult: 1 },
      { key: 'parity', label: '買賣權平價', mult: 1.25 },
      { key: 'ev', label: '期望值', mult: 1.25 },
      { key: 'arith', label: '百分比與速算', mult: 1 },
    ];

    function genTaylor(R, L) {
      const D = R.sign() * R.step(L === 1 ? 100 : 50, L === 1 ? 1000 : L === 2 ? 1500 : 2000, L === 1 ? 100 : 50);
      const Gm = R.sign() * R.step(L === 1 ? 20 : 10, L === 1 ? 200 : L === 2 ? 300 : 400, L === 1 ? 20 : 10);
      let V = 0, Th = 0, dS, dv = 0, dt = 0;
      if (L === 1) dS = R.sign() * R.pick([1, 2]);
      else if (L === 2) {
        V = R.sign() * R.step(200, 2000, 100); dS = R.sign() * R.pick([1, 2, 3]); dv = R.sign() * R.pick([1, 2]);
        if (R.chance(0.5)) { Th = -Math.sign(Gm) * R.step(100, 1500, 50); dt = 1; }
      } else {
        V = R.sign() * R.step(100, 5000, 100); Th = -Math.sign(Gm) * R.step(100, 3000, 50);
        dS = R.sign() * R.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]); dv = R.sign() * R.pick([0.5, 1, 1.5, 2, 3]); dt = R.pick([1, 2, 3]);
      }
      const tD = D * dS, tG = 0.5 * Gm * dS * dS, tV = V * dv, tT = Th * dt;
      const ans = r9(tD + tG + tV + tT);
      const abs = Math.abs(tD) + Math.abs(tG) + Math.abs(tV) + Math.abs(tT);
      const gk = [`Δ = ${fmtS(D)} 股`, `Γ = ${fmtS(Gm)}（每點）`];
      if (V) gk.push(`Vega = ${fmtS(V)} 元／vol 點`);
      if (Th) gk.push(`Θ = ${fmtS(Th)} 元／天`);
      const sc = [`標的 ${fmtS(dS)} 點`];
      if (dv) sc.push(`vol ${fmtS(dv)} 點`);
      if (dt) sc.push(`過 ${dt} 天`);
      const work = [`Δ·δS = ${fmt(D)} × ${par(dS)} = ${fmtS(tD)}`, `½Γ·δS² = ½ × ${par(Gm)} × ${fmt(dS * dS)} = ${fmtS(tG)}`];
      if (V) work.push(`Vega·δσ = ${fmt(V)} × ${par(dv)} = ${fmtS(tV)}`);
      if (Th) work.push(`Θ·δt = ${fmt(Th)} × ${dt} = ${fmtS(tT)}`);
      work.push(`合計 ≈ ${fmtS(ans)} 元`);
      return {
        prompt: `部位：${gk.join('、')}。<br>情境：${sc.join('、')}。<br>泰勒估計 PnL ≈ ?`,
        answer: ans, tol: Math.max(1, 0.01 * abs), unit: '元', work,
        tip: '½Γ(δS)² 的正負永遠跟著 Γ（與漲跌方向無關）；先寫下每一項的正負號再相加。',
        params: { D, G: Gm, V, Th, dS, dv, dt },
      };
    }

    function genNewDelta(R, L) {
      const D = R.sign() * R.step(0, 2000, 50), Gm = R.sign() * R.step(10, L === 1 ? 200 : 400, 10);
      let S = null, X = null, dS, va = 0, dv = 0;
      if (L === 1) dS = R.sign() * R.pick([1, 2, 3, 5]);
      else { S = R.pick([50, 80, 100, 120, 150, 200, 250, 400]); X = R.sign() * R.pick([0.5, 1, 2, 3, 5]); dS = r9(S * X / 100); }
      if (L === 3) { va = R.sign() * R.step(20, 300, 10); dv = R.sign() * R.pick([1, 2, 3, 4]); }
      const ans = r9(D + Gm * dS + va * dv);
      const head = S ? `S = ${S}，目前 ` : '目前 ';
      let p = `${head}Δ = ${fmtS(D)} 股、Γ = ${fmtS(Gm)}（每點）`;
      if (va) p += `、Vanna = ${fmtS(va)}（每 vol 點的 Δ 變化）`;
      p += '。<br>';
      p += S ? `標的${X > 0 ? '上漲' : '下跌'} ${fmt(Math.abs(X))}%` : `標的${dS > 0 ? '上漲' : '下跌'} ${fmt(Math.abs(dS))} 點`;
      if (va) p += `，vol ${dv > 0 ? '上升' : '下降'} ${Math.abs(dv)} 點`;
      p += '，新 Δ ≈ ?';
      const work = [];
      if (S) work.push(`δS = ${S} × ${fmtS(X)}% = ${fmtS(dS)} 點`);
      work.push(`Γ·δS = ${fmt(Gm)} × ${par(dS)} = ${fmtS(Gm * dS)}`);
      if (va) work.push(`Vanna·δσ = ${fmt(va)} × ${par(dv)} = ${fmtS(va * dv)}`);
      work.push(`新 Δ = ${fmtS(D)} ${fmtS(r9(Gm * dS))}${va ? ' ' + fmtS(va * dv) : ''} = ${fmtS(ans)} 股`);
      return {
        prompt: p, answer: ans, tol: Math.max(2, 0.01 * (Math.abs(D) + Math.abs(Gm * dS) + Math.abs(va * dv))), unit: '股', work,
        tip: 'Long gamma：漲了 delta 變多、跌了變少；short gamma 相反。先判斷方向再算大小。',
        params: { D, G: Gm, S, X, dS, va, dv },
      };
    }

    const ATM_T = [
      { l: '1 年', t: 1, s: '1' }, { l: '3 個月', t: 0.25, s: '0.5' }, { l: '1 個月', t: 1 / 12, s: '0.289' },
      { l: '6 個月', t: 0.5, s: '0.707' }, { l: '1 週', t: 1 / 52, s: '0.139' }, { l: '4 個月', t: 1 / 3, s: '0.577' },
      { l: '2 週', t: 1 / 26, s: '0.196' },
    ];
    function genATM(R, L) {
      const Ts = R.pick(L === 1 ? ATM_T.slice(0, 2) : ATM_T);
      const st = Math.sqrt(Ts.t);
      const S = L === 1 ? R.pick([50, 100, 200]) : R.pick([50, 80, 100, 120, 150, 200, 250, 400]);
      const kind = L === 3 && R.chance(0.35) ? 'rev' : R.pick(['call', 'put', 'straddle']);
      if (kind === 'rev') {
        const sigT = R.step(15, 60, 1);
        const P = roundTo(0.8 * S * sigT / 100 * st, 1);
        const ans = P / (0.8 * S * st) * 100;
        return {
          prompt: `S = ${S}，${Ts.l}到期的價平跨式報價 ${fmt(P, 1)}。<br>隱含波動率 ≈ ?（%）`,
          answer: ans, tol: 0.05 * ans, unit: '%',
          work: [`σ ≈ 跨式 ÷ (0.8 × S × √t) = ${fmt(P, 1)} ÷ (0.8 × ${S} × ${Ts.s}) ≈ ${fmt(ans, 1)}%`],
          tip: '跨式 ≈ 0.8·S·σ·√t，反過來 σ ≈ 跨式 ÷ (0.8·S·√t)。', params: { kind, S, t: Ts.t, P },
        };
      }
      const sig = L === 1 ? R.pick([10, 20, 25, 30, 40, 50]) : R.step(15, 60, 5);
      const c = kind === 'straddle' ? 0.8 : 0.4;
      const ans = c * S * sig / 100 * st;
      const exactCall = S * (2 * ncdf(sig / 100 * st / 2) - 1);
      const exact = kind === 'straddle' ? 2 * exactCall : exactCall;
      const name = kind === 'call' ? '買權' : kind === 'put' ? '賣權' : '跨式（買權＋賣權）';
      return {
        prompt: `S = ${S}、σ = ${sig}%、${Ts.l}到期。<br>價平${name} ≈ ?`,
        answer: ans, tol: 0.05 * ans, unit: '',
        work: [`${c} × S × σ × √t = ${c} × ${S} × ${fmt(sig / 100)} × ${Ts.s} ≈ ${fmt(ans, 2)}`, `精確 BS（r = 0）：${fmt(exact, 2)}`],
        tip: '0.4 ≈ 1/√(2π)。√(1 個月) ≈ 0.29、√(3 個月) = 0.5、√(1 週) ≈ 0.14。', params: { kind, S, sig, t: Ts.t },
      };
    }

    function genVol(R, L) {
      const mode = R.pick(L === 1 ? ['day'] : L === 2 ? ['day', 'dayPts', 'week'] : ['dayPts', 'week', 'month', 'rev', 'revWeek']);
      const sig = L === 1 ? R.pick([16, 24, 32, 40, 48, 64, 80]) : R.step(12, 80, 4);
      let prompt, ans, work, unit = '%', S = null, m = null;
      if (mode === 'day') {
        ans = sig / 16; prompt = `年化波動率 ${sig}%。<br>標的一天的 1 個標準差約多少 %？`;
        work = [`${sig}% ÷ 16 = ${fmt(ans, 2)}%（一年約 256 個交易日，√256 = 16）`];
      } else if (mode === 'dayPts') {
        S = R.pick([50, 80, 100, 200, 250, 400]); ans = S * sig / 100 / 16; unit = '點';
        prompt = `S = ${S}、年化波動率 ${sig}%。<br>一天的 1 個標準差約幾點？`;
        work = [`${S} × ${sig}% ÷ 16 = ${fmt(S * sig / 100)} ÷ 16 ≈ ${fmt(ans, 2)} 點`];
      } else if (mode === 'week') {
        ans = sig / Math.sqrt(52); prompt = `年化波動率 ${sig}%。<br>一週的 1 個標準差約多少 %？`;
        work = [`√52 ≈ 7.2：${sig}% ÷ 7.2 ≈ ${fmt(ans, 2)}%（也可用 日波動 × √5 ≈ × 2.24）`];
      } else if (mode === 'month') {
        ans = sig / Math.sqrt(12); prompt = `年化波動率 ${sig}%。<br>一個月的 1 個標準差約多少 %？`;
        work = [`√12 ≈ 3.46：${sig}% ÷ 3.46 ≈ ${fmt(ans, 2)}%`];
      } else if (mode === 'rev') {
        m = R.pick([0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]); ans = m * 16;
        prompt = `標的平常一天約波動 ${fmt(m)}%（1 個標準差）。<br>換算年化波動率 ≈ ?（%）`;
        work = [`${fmt(m)}% × 16 = ${fmt(ans)}%`];
      } else {
        m = R.pick([1, 1.5, 2, 2.5, 3, 4, 5]); ans = m * Math.sqrt(52);
        prompt = `標的一週約波動 ${fmt(m)}%（1 個標準差）。<br>換算年化波動率 ≈ ?（%）`;
        work = [`${fmt(m)}% × √52 ≈ ${fmt(m)} × 7.2 ≈ ${fmt(ans, 1)}%`];
      }
      return { prompt, answer: ans, tol: 0.04 * ans, unit, work, tip: '日：÷16；週：÷7.2；月：÷3.46；反推年化就乘回去。', params: { mode, sig, S, m } };
    }

    function genParity(R, L) {
      for (;;) {
        const S = r9(R.pick([50, 80, 100, 120, 150, 200]) + R.step(-3, 3, 0.5));
        const K = Math.round(S / 5) * 5 + R.pick([0, 5, -5]);
        const r = L === 1 ? 0 : R.pick([2, 3, 4, 5, 6]);
        const mo = R.pick([1, 3, 6, 12]);
        const carry = r9(K * r / 100 * mo / 12);
        const div = L === 3 && R.chance(0.5) ? R.step(0.5, 2, 0.25) : 0;
        const P = R.step(0.5, 8, 0.05);
        const Cc = r9(P + S - div - K + carry);
        if (Cc < 0.2) continue;
        const unk = R.pick(['C', 'P', 'S']);
        const vals = { C: Cc, P, S };
        const known = ['S', 'C', 'P'].filter((k) => k !== unk).map((k) => `${k} = ${fmt(vals[k], null, 4)}`);
        known.push(`K = ${K}`);
        let cond = r ? `r = ${r}%（單利近似：K·r·t）、t = ${mo} 個月` : 'r = 0';
        if (div) cond += `、到期前股利現值 ${fmt(div)}`;
        const rel = `C − P = S − K${carry ? ' + K·r·t' : ''}${div ? ' − 股利' : ''}`;
        const rhs = r9(S - K + carry - div);
        const work = [];
        if (carry) work.push(`K·r·t = ${K} × ${r}% × ${mo}/12 = ${fmt(carry, null, 4)}`);
        work.push(`${rel} = ${fmt(S, null, 4)} − ${K}${carry ? ' + ' + fmt(carry, null, 4) : ''}${div ? ' − ' + fmt(div) : ''} = ${fmtS(rhs, null, 4)}`);
        if (unk === 'C') work.push(`C = P + (S − K…) = ${fmt(P)} ${fmtS(rhs, null, 4)} = ${fmt(Cc, null, 4)}`);
        if (unk === 'P') work.push(`P = C − (S − K…) = ${fmt(Cc, null, 4)} − ${par(rhs, null, 4)} = ${fmt(P, null, 4)}`);
        if (unk === 'S') work.push(`S = C − P + K${carry ? ' − K·r·t' : ''}${div ? ' + 股利' : ''} = ${fmt(S, null, 4)}`);
        return {
          prompt: `${known.join('、')}，${cond}。<br>${unk} = ?`, answer: vals[unk], tol: 0.02, unit: '', work,
          tip: '買權 − 賣權 = 遠期 − 履約價（折現）。利率讓買權變貴；股利讓買權變便宜。', params: { S, K, r, mo, div, P, C: Cc, unk },
        };
      }
    }

    const DICE2 = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
    function genEV(R, L) {
      const v = R.pick(L === 1 ? ['pq', 'coins', 'die'] : L === 2 ? ['pq', 'die', 'dieK', 'coins'] : ['pq', 'dieK', 'dice2', 'cards', 'max2']);
      let prompt, ans, work, scale;
      if (v === 'pq') {
        const p = R.pick([10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90]), A = R.step(10, 200, 10), B = R.step(5, 100, 5);
        ans = p / 100 * A - (1 - p / 100) * B; scale = Math.max(A, B);
        prompt = `一個賭局：${p}% 機率贏 ${A} 元，否則輸 ${B} 元。<br>每局期望值 ≈ ?（元）`;
        work = [`EV = ${p}% × ${A} − ${100 - p}% × ${B} = ${fmt(p / 100 * A)} − ${fmt((1 - p / 100) * B)} = ${fmtS(ans)}`];
      } else if (v === 'coins') {
        const n = R.int(2, 4), X = R.step(2, 20, 2), c = R.step(0, n * X, 1);
        ans = n * X / 2 - c; scale = n * X;
        prompt = `擲 ${n} 次公正硬幣，每個正面得 ${X} 元；參加費 ${c} 元。<br>期望淨收益 ≈ ?（元）`;
        work = [`期望正面數 = ${n} × ½ = ${fmt(n / 2)}；${fmt(n / 2)} × ${X} − ${c} = ${fmtS(ans)}`];
      } else if (v === 'die') {
        const m = R.int(1, 10), c = R.step(1, 6 * m, 1);
        ans = 3.5 * m - c; scale = 6 * m;
        prompt = `擲一顆骰子，得「點數 × ${m}」元；參加費 ${c} 元。<br>期望淨收益 ≈ ?（元）`;
        work = [`E[點數] = 3.5；3.5 × ${m} − ${c} = ${fmtS(ans)}`];
      } else if (v === 'dieK') {
        const k = R.int(2, 6), X = R.step(6, 60, 6), c = L === 3 ? R.step(0, X, 1) : 0;
        ans = X * (7 - k) / 6 - c; scale = X;
        prompt = `擲一顆骰子，點數 ≥ ${k} 得 ${X} 元，否則 0${c ? `；參加費 ${c} 元` : ''}。<br>${c ? '期望淨收益' : '公平價格'} ≈ ?（元）`;
        work = [`P(≥ ${k}) = ${7 - k}/6；${X} × ${7 - k}/6${c ? ' − ' + c : ''} = ${fmtS(ans)}`];
      } else if (v === 'dice2') {
        const s = R.int(2, 12), X = R.step(36, 360, 36), c = R.step(0, Math.round(X / 6), 1);
        ans = X * DICE2[s] / 36 - c; scale = X;
        prompt = `擲兩顆骰子，點數和恰為 ${s} 得 ${X} 元；參加費 ${c} 元。<br>期望淨收益 ≈ ?（元）`;
        work = [`和為 ${s} 的組合有 ${DICE2[s]} 種（共 36 種）；${X} × ${DICE2[s]}/36 − ${c} = ${fmtS(ans)}`];
      } else if (v === 'cards') {
        const X = R.step(13, 130, 13), Y = R.step(1, 20, 1);
        ans = X * 3 / 13 - Y * 10 / 13; scale = Math.max(X, Y);
        prompt = `從 52 張牌抽一張：人頭牌（J／Q／K）得 ${X} 元，否則付 ${Y} 元。<br>期望值 ≈ ?（元）`;
        work = [`P(人頭) = 12/52 = 3/13；${X} × 3/13 − ${Y} × 10/13 = ${fmt(X * 3 / 13)} − ${fmt(Y * 10 / 13)} = ${fmtS(ans)}`];
      } else {
        const m = R.int(1, 6);
        ans = m * 161 / 36; scale = 6 * m;
        prompt = `擲兩顆骰子，取較大的點數，得「較大點數 × ${m}」元。<br>公平價格 ≈ ?（元）`;
        work = [`P(max = k) = (2k − 1)/36；E[max] = (1·1 + 2·3 + 3·5 + 4·7 + 5·9 + 6·11)/36 = 161/36 ≈ 4.47；× ${m} = ${fmt(ans)}`];
      }
      return { prompt, answer: r9(ans), tol: Math.max(0.05, 0.01 * scale), unit: '元', work, tip: 'EV = Σ 機率 × 結果；先算機率（分數），最後才乘金額。', params: { v } };
    }

    function genArith(R, L) {
      const v = R.pick(L === 1 ? ['pct', 'mul', 'div16'] : L === 2 ? ['pct', 'mul', 'frac', 'chg', 'div16'] : ['pct', 'mul', 'frac', 'chg', 'sq']);
      let prompt, ans, work;
      if (v === 'pct') {
        const p = R.pick(L === 1 ? [5, 10, 20, 25, 50] : L === 2 ? [1.5, 2.5, 7.5, 12.5, 15, 35] : [0.8, 1.25, 3.7, 6.25, 17]);
        const y = L === 3 ? R.int(120, 990) : R.step(20, 2000, 20);
        ans = p * y / 100; prompt = `${fmt(p)}% × ${fmt(y)} = ?`;
        work = [`${fmt(y)} × ${fmt(p)} ÷ 100 = ${fmt(ans, null, 4)}`];
      } else if (v === 'mul') {
        let a, b;
        if (L === 1) { a = R.int(11, 99); b = R.int(2, 9); } else if (L === 2) { a = R.int(11, 99); b = R.int(11, 99); } else { a = R.pick([1.25, 2.5, 0.75, 1.5, 0.35, 0.125]); b = R.int(12, 999); }
        ans = r9(a * b); prompt = `${fmt(a, null, 3)} × ${fmt(b)} = ?`;
        work = [`${fmt(a, null, 3)} × ${fmt(b)} = ${fmt(ans, null, 4)}（拆解：例如 a × b = a × (b 的整十) + a × (餘數)）`];
      } else if (v === 'div16') {
        const y = L === 1 ? R.step(16, 320, 8) : R.int(10, 500);
        ans = y / 16; prompt = `${y} ÷ 16 = ?`;
        work = [`÷16 = ÷2 四次：${y} → ${fmt(y / 2, null, 4)} → ${fmt(y / 4, null, 4)} → ${fmt(y / 8, null, 4)} → ${fmt(ans, null, 4)}`];
      } else if (v === 'frac') {
        const d = R.pick([8, 16, 32]); let n = R.int(1, d - 1); if (n % 2 === 0) n += 1; if (n >= d) n = d - 1;
        ans = n / d; prompt = `${n}/${d} = ?（小數）`;
        work = [`1/${d} = ${fmt(1 / d, null, 5)}；× ${n} = ${fmt(ans, null, 5)}`];
      } else if (v === 'chg') {
        const a = R.step(20, 200, 4), x = R.sign() * R.pick([5, 10, 12.5, 20, 25, 40]);
        const b = r9(a * (1 + x / 100)); ans = x;
        prompt = `價格從 ${fmt(a)} 變成 ${fmt(b)}，變動幾 %？`;
        work = [`(${fmt(b)} − ${fmt(a)}) ÷ ${fmt(a)} = ${fmtS(b - a)} ÷ ${fmt(a)} = ${fmtS(x)}%`];
      } else {
        const x = R.pick([1.01, 1.02, 1.03, 1.05, 0.95, 0.98, 1.1, 0.9]);
        ans = r9(x * x); prompt = `${x}² = ?`;
        work = [`(1 + ε)² = 1 + 2ε + ε²：${fmt(ans, null, 4)}`];
      }
      return { prompt, answer: ans, tol: Math.max(v === 'frac' ? 0.001 : 0.01, 0.001 * Math.abs(ans)), unit: v === 'chg' ? '%' : '', work, tip: '百分比先找 1% 或 10%，再倍數調整。', params: { v } };
    }

    const MM_GEN = { taylor: genTaylor, newdelta: genNewDelta, atm: genATM, volscale: genVol, parity: genParity, ev: genEV, arith: genArith };
    function mmGenerate(cat, level, rng) {
      const R = Rand(rng);
      const c = MM_CATS.find((x) => x.key === cat) || MM_CATS[0];
      const q = MM_GEN[c.key](R, level || 2);
      q.cat = c.key; q.catLabel = c.label; q.level = level || 2; q.mult = c.mult;
      return q;
    }
    function mmGrade(q, v) {
      if (typeof v !== 'number' || !isFinite(v)) return { ok: false, sign: false };
      const ok = Math.abs(v - q.answer) <= q.tol + 1e-9;
      const sign = !ok && Math.abs(q.answer) > q.tol && Math.abs(v + q.answer) <= q.tol + 1e-9;
      return { ok, sign };
    }

    /* =================================================================
     * 2. 套利偵測
     * 報價表 = SSVI 無套利曲面算出的 mid，bid 向下、ask 向上取整到 tick，
     * 所以 bid ≤ mid ≤ ask：存在一組無套利價格落在每個買賣價內 ⇒ 可成交價格下無靜態套利。
     * 注入違規後用 arbCheck 窮舉各種結構，確認只有注入的那一類違規。
     * ================================================================= */
    const ARB_LABEL = { vertical: '垂直價差', butterfly: '蝶式', calendar: '日曆價差', parity: '買賣權平價', none: '無套利', bound: '價格上下限' };
    const ARB_LAYOUTS = {
      puts: { label: '單一到期＋賣權', types: ['vertical', 'butterfly', 'parity'] },
      cal: { label: '雙到期（買權）', types: ['vertical', 'butterfly', 'calendar'] },
      calls: { label: '單一到期（買權）', types: ['vertical', 'butterfly'] },
    };
    const instId = (kind, e, i) => kind + e + '_' + i;
    const NICE = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];
    function niceSpacing(x) {
      let best = NICE[0];
      for (const v of NICE) if (Math.abs(Math.log(v / x)) < Math.abs(Math.log(best / x))) best = v;
      return best;
    }
    function smileVol(ex, K, sm) { return Math.sqrt(ssviW(Math.log(K / ex.F), ex.theta, sm) / ex.T); }

    /** 數值保險：網格上檢查買權價格遞減、斜率 ≥ −D、凸性，以及 total variance 隨期限遞增。 */
    function modelOk(S, r, exps, sm) {
      for (const ex of exps) {
        const sd = ex.s0 * Math.sqrt(ex.T);
        let pK = null, pC = null, pSl = null;
        for (let k = 0; k <= 240; k++) {
          const z = -6 + k * 0.05, K = ex.F * Math.exp(z * sd);
          const v = smileVol(ex, K, sm);
          if (!(v > 0.01 && v < 3)) return false;
          const C = bs(S, K, ex.T, v, r, 'call').price;
          if (!isFinite(C)) return false;
          if (pK != null) {
            const sl = (C - pC) / (K - pK);
            if (sl > 1e-9 || sl < -ex.D - 1e-9) return false;
            if (pSl != null && sl < pSl - 1e-6) return false;
            pSl = sl;
          }
          pK = K; pC = C;
        }
      }
      for (let e = 1; e < exps.length; e++) {
        const a = exps[e - 1], b = exps[e], sd = b.s0 * Math.sqrt(b.T);
        for (let z = -6; z <= 6.0001; z += 0.05) {
          const x = z * sd;
          if (!(ssviW(x, b.theta, sm) > ssviW(x, a.theta, sm))) return false;
        }
      }
      return true;
    }

    function arbBase(R, layout, level) {
      for (let tries = 0; tries < 1000; tries++) {
        const S = R.pick([50, 80, 100, 120, 150, 200, 250, 400]);
        const tick = S >= 80 ? 0.05 : 0.01;
        const r = R.pick([0, 0.01, 0.02, 0.03, 0.04, 0.05]);
        const days = [R.pick([14, 21, 30, 45, 60])];
        if (layout === 'cal') days.push(days[0] + R.pick([7, 14, 21, 28, 30, 45, 60]));
        const s1 = R.range(0.15, 0.45);
        const sig = [s1];
        if (layout === 'cal') sig.push(Math.max(s1 * R.range(0.9, 1.1), s1 * Math.sqrt(1.06 * days[0] / days[1])));
        const rho = -R.range(0.15, 0.75);
        const sm = { rho, gamma: 0.45, eta: R.range(0.5, Math.min(1.2, 1.9 / (1 + Math.abs(rho)))) };
        const exps = days.map((d, e) => {
          const T = d / 365;
          return { days: d, T, D: Math.exp(-r * T), F: S * Math.exp(r * T), s0: sig[e], theta: sig[e] * sig[e] * T };
        });
        if (!modelOk(S, r, exps, sm)) continue;
        const n = level === 1 ? 5 : level === 2 ? R.int(5, 6) : R.int(6, 7);
        const mixed = level === 1 ? false : R.chance(level === 2 ? 0.3 : 0.5);
        const base = niceSpacing(0.4 * S * s1 * Math.sqrt(exps[0].T) * (mixed ? 0.7 : 1));
        const inner = R.int(1, 2);
        const nDown = R.int(2, n - 3), nUp = n - 1 - nDown;
        const c0 = Math.round(S / base) * base + R.int(-1, 1) * base;
        const offs = [0];
        let cur = 0;
        for (let k = 1; k <= nUp; k++) { cur += (!mixed || k <= inner) ? base : 2 * base; offs.push(cur); }
        cur = 0;
        for (let k = 1; k <= nDown; k++) { cur -= (!mixed || k <= inner) ? base : 2 * base; offs.unshift(cur); }
        const strikes = offs.map((o) => r9(c0 + o));
        if (strikes[0] <= 0) continue;
        let bad = false;
        for (const ex of exps) for (const K of strikes) if (Math.abs(Math.log(K / ex.F) / (ex.s0 * Math.sqrt(ex.T))) > 1.9) bad = true;
        if (bad) continue;
        const sh = S >= 200 ? 0.02 : 0.01;
        const tb = {
          layout, level, S, sBid: r2(S - sh), sAsk: r2(S + sh), r, tick, strikes, hasPuts: layout === 'puts',
          exps: exps.map((x) => ({ days: x.days, T: x.T, D: x.D, F: x.F, s0: x.s0, theta: x.theta })), smile: sm, inst: {},
        };
        tb.inst.S = { id: 'S', kind: 'S', e: -1, i: -1, K: 0, bid: tb.sBid, ask: tb.sAsk, mid: S };
        const minMid = Math.max(0.1, 3 * tick);
        const wf = R.range(0.8, 1.3);
        for (let e = 0; e < exps.length && !bad; e++) {
          const ex = exps[e];
          strikes.forEach((K, i) => {
            const cm = bs(S, K, ex.T, smileVol(ex, K, sm), r, 'call').price;
            const mids = { C: cm };
            if (tb.hasPuts) mids.P = cm - S + K * ex.D;
            for (const kind of Object.keys(mids)) {
              const mid = mids[kind];
              if (!(mid >= minMid)) { bad = true; return; }
              const hw = (0.0002 * S + 0.012 * mid) * wf;
              let b = Math.floor((mid - hw) / tick + 1e-9), a = Math.ceil((mid + hw) / tick - 1e-9);
              if (b < 0) b = 0;
              if (a <= b) a = b + 1;
              tb.inst[instId(kind, e, i)] = { id: instId(kind, e, i), kind, e, i, K, bid: r2(b * tick), ask: r2(a * tick), mid };
            }
          });
        }
        if (bad) continue;
        return tb;
      }
      throw new Error('arbBase: 無法產生報價表');
    }

    /** 估算一組交易：現金流（買付 ask、賣收 bid）、最早到期日的最差損益、鎖定獲利（現值）。
     *  較晚到期的選擇權只允許買方，於較早到期日以下限 (S − K·D₁₂)⁺／(K·D₁₂ − S)⁺ 估值（保守）。 */
    function evalTrade(tb, legs) {
      let cash = 0, stockQ = 0;
      const opt = [];
      for (const l of legs) {
        const ins = tb.inst[l.id];
        if (!ins) return { ok: false, profit: -Infinity };
        const sg = l.side === 'buy' ? 1 : -1;
        cash -= sg * l.qty * (l.side === 'buy' ? ins.ask : ins.bid);
        if (ins.kind === 'S') stockQ += sg * l.qty; else opt.push({ ins, q: sg * l.qty });
      }
      if (!opt.length) return { ok: false, profit: -Infinity };
      const e0 = Math.min(...opt.map((o) => o.ins.e)), D0 = tb.exps[e0].D;
      const parts = [], kinks = [0];
      for (const o of opt) {
        let K = o.ins.K;
        if (o.ins.e !== e0) {
          if (o.q < 0) return { ok: false, profit: -Infinity };
          K = K * tb.exps[o.ins.e].D / D0;
        }
        parts.push({ K, kind: o.ins.kind, q: o.q });
        kinks.push(K);
      }
      const pay = (s) => parts.reduce((a, p) => a + p.q * (p.kind === 'C' ? Math.max(s - p.K, 0) : Math.max(p.K - s, 0)), stockQ * s);
      const slope = parts.reduce((a, p) => a + (p.kind === 'C' ? p.q : 0), stockQ);
      if (slope < -1e-12) return { ok: true, cash: r9(cash), minPay: -Infinity, profit: -Infinity, D: D0, e0 };
      let minPay = Infinity;
      for (const k of kinks) minPay = Math.min(minPay, pay(k));
      return { ok: true, cash: r9(cash), minPay: r9(minPay), profit: r9(cash + D0 * minPay), D: D0, e0 };
    }

    function flyQty(K1, K2, K3) {
      const a = Math.round((K3 - K2) * 100), b = Math.round((K2 - K1) * 100), g = gcd(a, b);
      return [a / g, b / g];
    }

    function arbCandidates(tb) {
      const out = [], n = tb.strikes.length, kinds = tb.hasPuts ? ['C', 'P'] : ['C'];
      const L = (id, side, qty) => ({ id, side, qty: qty || 1 });
      const opp = (s) => (s === 'buy' ? 'sell' : 'buy');
      for (let e = 0; e < tb.exps.length; e++) {
        for (const k of kinds) {
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (const s of ['buy', 'sell'])
            out.push({ type: 'vertical', legs: [L(instId(k, e, i), s), L(instId(k, e, j), opp(s))] });
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let m = j + 1; m < n; m++) {
            const [qa, qb] = flyQty(tb.strikes[i], tb.strikes[j], tb.strikes[m]);
            for (const s of ['buy', 'sell'])
              out.push({ type: 'butterfly', legs: [L(instId(k, e, i), s, qa), L(instId(k, e, j), opp(s), qa + qb), L(instId(k, e, m), s, qb)] });
          }
          for (let i = 0; i < n; i++) {
            const id = instId(k, e, i);
            if (k === 'C') { out.push({ type: 'bound', legs: [L(id, 'buy'), L('S', 'sell')] }); out.push({ type: 'bound', legs: [L(id, 'sell'), L('S', 'buy')] }); }
            else { out.push({ type: 'bound', legs: [L(id, 'buy'), L('S', 'buy')] }); out.push({ type: 'bound', legs: [L(id, 'sell')] }); }
          }
        }
        if (tb.hasPuts) {
          for (let i = 0; i < n; i++) {
            const c = instId('C', e, i), p = instId('P', e, i);
            out.push({ type: 'parity', legs: [L(c, 'sell'), L(p, 'buy'), L('S', 'buy')] });
            out.push({ type: 'parity', legs: [L(c, 'buy'), L(p, 'sell'), L('S', 'sell')] });
          }
          for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (const s of ['buy', 'sell'])
            out.push({ type: 'parity', legs: [L(instId('C', e, i), s), L(instId('C', e, j), opp(s)), L(instId('P', e, j), s), L(instId('P', e, i), opp(s))] });
        }
      }
      for (const k of kinds) for (let i = 0; i < n; i++) for (let e = 0; e < tb.exps.length; e++) for (let f = e + 1; f < tb.exps.length; f++)
        out.push({ type: 'calendar', legs: [L(instId(k, f, i), 'buy'), L(instId(k, e, i), 'sell')] });
      return out;
    }

    function arbEvalAll(tb) { return arbCandidates(tb).map((c) => Object.assign(c, evalTrade(tb, c.legs))); }
    const byPrimary = (a, b) => a.legs.length - b.legs.length || b.profit - a.profit;
    /** 所有在可成交價格下獲利 > 0 的結構。 */
    function arbCheck(tb) { return arbEvalAll(tb).filter((c) => c.ok && c.profit > 1e-9).sort(byPrimary); }
    /** 無套利表裡「最接近違規」的組合（獲利最大、但仍 ≤ 0）。 */
    function arbClosest(tb) {
      const all = arbEvalAll(tb).filter((c) => c.ok && isFinite(c.profit) && c.type !== 'bound');
      all.sort((a, b) => b.profit - a.profit);
      return all[0] || null;
    }

    function setQ(tb, ins, bid, ask) {
      const t = tb.tick;
      let b = Math.round(bid / t), a = Math.round(ask / t);
      if (b < 0) b = 0;
      if (a <= b) a = b + 1;
      ins.bid = r2(b * t); ins.ask = r2(a * t); ins.mod = true;
    }
    const flT = (tb, x) => r2(Math.floor(x / tb.tick + 1e-9) * tb.tick);
    const ceT = (tb, x) => r2(Math.ceil(x / tb.tick - 1e-9) * tb.tick);
    const Q = (tb, kind, e, i) => tb.inst[instId(kind, e, i)];
    function shiftPut(tb, e, i, d) { if (!tb.hasPuts) return; const p = Q(tb, 'P', e, i); setQ(tb, p, p.bid + d, p.ask + d); }
    const kPick = (R, level) => (level === 1 ? R.int(3, 5) : level === 2 ? R.int(2, 3) : 2);

    const INJECT = {
      vertical(tb, R, level) {
        const n = tb.strikes.length, e = tb.exps.length > 1 ? (R.chance(0.7) ? 1 : 0) : 0, k = kPick(R, level);
        if (R.chance(0.5)) {
          const a = Q(tb, 'C', e, n - 2), b = Q(tb, 'C', e, n - 1);
          const w = b.ask - b.bid, nb = r2(a.ask + k * tb.tick), d = r2(nb - b.bid);
          setQ(tb, b, nb, nb + w); shiftPut(tb, e, n - 1, d);
          return { variant: 'mono', e };
        }
        const a = Q(tb, 'C', e, 0), b = Q(tb, 'C', e, 1);
        const x = b.ask + tb.exps[e].D * (tb.strikes[1] - tb.strikes[0]);
        const nb = r2(flT(tb, x) + k * tb.tick), w = a.ask - a.bid, d = r2(nb - a.bid);
        if (d <= 0) return null;
        setQ(tb, a, nb, nb + w); shiftPut(tb, e, 0, d);
        return { variant: 'spread', e };
      },
      butterfly(tb, R, level) {
        const n = tb.strikes.length, K = tb.strikes, e = R.int(0, tb.exps.length - 1), k = kPick(R, level);
        const cands = []; for (let j = 1; j < n - 1; j++) cands.push(j);
        const uneq = cands.filter((j) => Math.abs((K[j] - K[j - 1]) - (K[j + 1] - K[j])) > 1e-9);
        const j = uneq.length && R.chance(0.7) ? R.pick(uneq) : R.pick(cands);
        const A = Q(tb, 'C', e, j - 1), B = Q(tb, 'C', e, j), C = Q(tb, 'C', e, j + 1);
        const w = (K[j + 1] - K[j]) / (K[j + 1] - K[j - 1]);
        const x = w * A.ask + (1 - w) * C.ask;
        const nb = r2(flT(tb, x) + k * tb.tick), d = r2(nb - B.bid);
        if (d <= 0) return null;
        setQ(tb, B, nb, nb + (B.ask - B.bid)); shiftPut(tb, e, j, d);
        return { variant: 'body', e, j };
      },
      calendar(tb, R, level) {
        if (tb.exps.length < 2) return null;
        const i = R.int(0, tb.strikes.length - 1), k = kPick(R, level);
        const A = Q(tb, 'C', 0, i), B = Q(tb, 'C', 1, i);
        if (R.chance(0.5)) {
          const na = r2(A.bid - k * tb.tick);
          if (na < 2 * tb.tick) return null;
          setQ(tb, B, na - (B.ask - B.bid), na);
          return { variant: 'far-low', i };
        }
        const nb = r2(B.ask + k * tb.tick);
        setQ(tb, A, nb, nb + (A.ask - A.bid));
        return { variant: 'near-high', i };
      },
      parity(tb, R, level) {
        if (!tb.hasPuts) return null;
        const i = R.int(0, tb.strikes.length - 1), k = kPick(R, level), t = tb.tick;
        const C = Q(tb, 'C', 0, i), P = Q(tb, 'P', 0, i), KD = tb.strikes[i] * tb.exps[0].D;
        const wC = C.ask - C.bid, wP = P.ask - P.bid;
        switch (R.int(0, 3)) {
          case 0: { const nb = r2(flT(tb, P.ask + tb.sAsk - KD) + k * t); if (nb <= C.bid) return null; setQ(tb, C, nb, nb + wC); return { variant: 'conv', i }; }
          case 1: { const na = r2(ceT(tb, C.bid - tb.sAsk + KD) - k * t); if (na >= P.ask || na < 2 * t) return null; setQ(tb, P, na - wP, na); return { variant: 'conv', i }; }
          case 2: { const na = r2(ceT(tb, tb.sBid + P.bid - KD) - k * t); if (na >= C.ask || na < 2 * t) return null; setQ(tb, C, na - wC, na); return { variant: 'rev', i }; }
          default: { const nb = r2(flT(tb, C.ask + KD - tb.sBid) + k * t); if (nb <= P.bid) return null; setQ(tb, P, nb, nb + wP); return { variant: 'rev', i }; }
        }
      },
    };
    const cloneTable = (tb) => JSON.parse(JSON.stringify(tb));

    /** opts: {layout:'auto'|'puts'|'cal'|'calls', level:1–3, force?: type, noneRate?: 0.25} */
    function arbGenerate(opts, rng) {
      const R = Rand(rng), o = opts || {}, level = o.level || 2;
      let layout = o.layout;
      if (!ARB_LAYOUTS[layout]) layout = R.pick(['puts', 'cal', 'calls', 'puts', 'cal']);
      const types = ARB_LAYOUTS[layout].types;
      const want = o.force || (R.chance(o.noneRate == null ? 0.25 : o.noneRate) ? 'none' : R.pick(types));
      for (let attempt = 0; attempt < 80; attempt++) {
        const tb = arbBase(R, layout, level);
        if (want === 'none') {
          if (arbCheck(tb).length) continue; // 依構造不會發生；測試會統計
          tb.answer = { type: 'none', primary: null, all: [], closest: arbClosest(tb) };
          return tb;
        }
        for (let inj = 0; inj < 10; inj++) {
          const t2 = cloneTable(tb);
          const info = INJECT[want](t2, R, level);
          if (!info) continue;
          const vs = arbCheck(t2);
          if (!vs.length || vs.some((v) => v.type !== want)) continue;
          if (vs[0].profit < t2.tick - 1e-9) continue;
          t2.answer = { type: want, primary: vs[0], all: vs, info };
          return t2;
        }
      }
      throw new Error('arbGenerate: 無法注入 ' + want);
    }

    /** 學習者點選的腿（只有方向）→ 結構類型與數量。 */
    function arbClassify(tb, sel) {
      const I = (s) => tb.inst[s.id];
      if (sel.some((s) => !I(s))) return null;
      const st = sel.filter((s) => s.id === 'S'), op = sel.filter((s) => s.id !== 'S');
      const L = (s, qty) => ({ id: s.id, side: s.side, qty: qty || 1 });
      const byK = (x, y) => I(x).K - I(y).K;
      if (!st.length && op.length === 2) {
        const [a, b] = op, A = I(a), B = I(b);
        if (A.kind === B.kind && a.side !== b.side) {
          if (A.e === B.e && A.K !== B.K) return { type: 'vertical', legs: [L(a), L(b)] };
          if (A.e !== B.e && A.K === B.K) return { type: 'calendar', legs: [L(a), L(b)] };
        }
        return null;
      }
      if (!st.length && op.length === 3) {
        const [a, b, c] = op.slice().sort(byK);
        const same = [a, b, c].every((x) => I(x).kind === I(a).kind && I(x).e === I(a).e);
        if (same && I(a).K < I(b).K && I(b).K < I(c).K && a.side === c.side && b.side !== a.side) {
          const [qa, qb] = flyQty(I(a).K, I(b).K, I(c).K);
          return { type: 'butterfly', legs: [L(a, qa), L(b, qa + qb), L(c, qb)] };
        }
        return null;
      }
      if (st.length === 1 && op.length === 2) {
        const c = op.find((x) => I(x).kind === 'C'), p = op.find((x) => I(x).kind === 'P');
        if (c && p && I(c).e === I(p).e && I(c).K === I(p).K && c.side !== p.side && st[0].side === p.side)
          return { type: 'parity', legs: [L(c), L(p), L(st[0])] };
        return null;
      }
      if (!st.length && op.length === 4) {
        const cs = op.filter((x) => I(x).kind === 'C').sort(byK), ps = op.filter((x) => I(x).kind === 'P').sort(byK);
        if (cs.length === 2 && ps.length === 2 && op.every((x) => I(x).e === I(op[0]).e) &&
            I(cs[0]).K === I(ps[0]).K && I(cs[1]).K === I(ps[1]).K && I(cs[0]).K < I(cs[1]).K &&
            cs[0].side !== cs[1].side && ps[0].side !== ps[1].side && cs[0].side === ps[1].side)
          return { type: 'parity', legs: op.map((x) => L(x)) };
        return null;
      }
      return null;
    }

    function arbGrade(tb, type, sel) {
      const ans = tb.answer.type;
      if (ans === 'none') return { verdict: type === 'none' ? 'full' : 'wrong', typeOk: type === 'none', falseAlarm: !!type && type !== 'none', user: null };
      if (!type || type === 'none') return { verdict: 'wrong', typeOk: false, miss: type === 'none', user: null };
      const cls = arbClassify(tb, sel || []);
      const user = cls ? Object.assign(cls, evalTrade(tb, cls.legs)) : null;
      if (user && user.ok && user.profit > 1e-9 && user.type === type) return { verdict: 'full', typeOk: type === ans, user };
      return { verdict: type === ans ? 'partial' : 'wrong', typeOk: type === ans, user };
    }

    /* ----- 文字說明 ----- */
    const fK = (K) => fmt(K, null, 2);
    const f2 = (x) => fmt(x, 2);
    function instLabel(tb, ins) {
      if (ins.kind === 'S') return '標的';
      return `${tb.exps.length > 1 ? tb.exps[ins.e].days + '天 ' : ''}${fK(ins.K)} ${ins.kind === 'C' ? '買權' : '賣權'}`;
    }
    function legText(tb, l) {
      const ins = tb.inst[l.id], px = l.side === 'buy' ? ins.ask : ins.bid;
      return `${l.side === 'buy' ? '買' : '賣'} ${l.qty} × ${instLabel(tb, ins)} @ ${f2(px)}`;
    }
    function arbReason(tb, c) {
      const I = (l) => tb.inst[l.id];
      const legs = c.legs;
      if (c.type === 'vertical') {
        const [a, b] = legs.slice().sort((x, y) => I(x).K - I(y).K);
        const A = I(a), B = I(b), D = tb.exps[A.e].D, dK = B.K - A.K;
        if (A.kind === 'C') {
          if (a.side === 'buy') return `履約價 ${fK(B.K)} 買權的 bid ${f2(B.bid)} 高於履約價 ${fK(A.K)} 買權的 ask ${f2(A.ask)}：履約價較高的買權不可能比較貴（單調性）。`;
          return `${fK(A.K)}／${fK(B.K)} 買權價差可以賣到 ${f2(A.bid)} − ${f2(B.ask)} = ${f2(A.bid - B.ask)}，超過履約價差的現值 ${fK(dK)} × D = ${f2(dK * D)}：買權價差最多只值折現後的履約價差。`;
        }
        if (a.side === 'sell') return `履約價 ${fK(A.K)} 賣權的 bid ${f2(A.bid)} 高於履約價 ${fK(B.K)} 賣權的 ask ${f2(B.ask)}：履約價較低的賣權不可能比較貴（單調性）。`;
        return `${fK(B.K)}／${fK(A.K)} 賣權價差可以賣到 ${f2(B.bid)} − ${f2(A.ask)} = ${f2(B.bid - A.ask)}，超過履約價差的現值 ${fK(dK)} × D = ${f2(dK * D)}。`;
      }
      if (c.type === 'butterfly') {
        const [a, b, d] = legs.slice().sort((x, y) => I(x).K - I(y).K);
        const A = I(a), B = I(b), C = I(d), w = (C.K - B.K) / (C.K - A.K);
        const nm = A.kind === 'C' ? '買權' : '賣權';
        const uneq = Math.abs((B.K - A.K) - (C.K - B.K)) > 1e-9;
        const wt = uneq ? `（間距不等，權重 w = (K₃ − K₂)/(K₃ − K₁) = ${fmt(w, null, 3)}，數量比 ${a.qty} : ${b.qty} : ${d.qty}）` : '';
        if (b.side === 'sell') {
          const x = w * A.ask + (1 - w) * C.ask;
          return `中間履約價 ${fK(B.K)} ${nm}的 bid ${f2(B.bid)} 高於兩翼 ask 的加權平均 ${fmt(w, null, 3)} × ${f2(A.ask)} + ${fmt(1 - w, null, 3)} × ${f2(C.ask)} = ${fmt(x, null, 3)}${wt}：${nm}價格對履約價必須是凸的，蝶式不可能是負價。`;
        }
        return `蝶式可以賣到比「到期最大收益的現值」還高的價格${wt}，賣出蝶式穩賺。`;
      }
      if (c.type === 'calendar') {
        const far = I(legs.find((l) => l.side === 'buy')), near = I(legs.find((l) => l.side === 'sell'));
        if (far.kind === 'C') return `同履約價 ${fK(far.K)} 的 ${tb.exps[far.e].days} 天買權 ask ${f2(far.ask)} 低於 ${tb.exps[near.e].days} 天買權 bid ${f2(near.bid)}：無股利、r ≥ 0 時，到期較長的買權至少和較短的一樣值錢（近月到期時，遠月買權至少值 S − K·e^{−rΔT} ≥ S − K）。等價說法：遠月的 total variance σ²T 不可以比近月低。`;
        return `近月賣權比遠月賣權貴超過 K·(D₁ − D₂)：賣近月、買遠月，近月被履約時的資金成本也覆蓋得了。`;
      }
      if (c.type === 'parity') {
        const D = tb.exps[I(legs[0]).e].D;
        if (legs.length === 3) {
          const cL = legs.find((l) => I(l).kind === 'C'), pL = legs.find((l) => I(l).kind === 'P');
          const C = I(cL), P = I(pL), KD = C.K * D;
          if (cL.side === 'sell') return `平價：C − P 應約等於 S − K·D。可成交價下 C_bid − P_ask = ${f2(C.bid)} − ${f2(P.ask)} = ${f2(C.bid - P.ask)}，高於 S_ask − K·D = ${f2(tb.sAsk)} − ${f2(KD)} = ${f2(tb.sAsk - KD)}。轉換（conversion）：賣買權、買賣權、買標的，到期一定以 K 交出標的。`;
          return `平價：C − P 應約等於 S − K·D。可成交價下 C_ask − P_bid = ${f2(C.ask)} − ${f2(P.bid)} = ${f2(C.ask - P.bid)}，低於 S_bid − K·D = ${f2(tb.sBid)} − ${f2(KD)} = ${f2(tb.sBid - KD)}。逆轉換（reversal）：買買權、賣賣權、放空標的，到期一定以 K 買回標的。`;
        }
        const Ks = [...new Set(legs.map((l) => I(l).K))].sort((x, y) => x - y);
        return `箱型價差（${fK(Ks[0])}／${fK(Ks[1])}）到期一定值 ${fK(Ks[1] - Ks[0])}，現值 ${f2((Ks[1] - Ks[0]) * D)}；可成交價格偏離這個值，等於兩個履約價的平價關係不一致。`;
      }
      return '違反選擇權價格的上下限。';
    }
    /** 交易的現金流明細與鎖定獲利。 */
    function arbTradeLines(tb, c) {
      const ev = c.minPay != null ? c : Object.assign({}, c, evalTrade(tb, c.legs));
      const lines = c.legs.map((l) => {
        const ins = tb.inst[l.id], px = l.side === 'buy' ? ins.ask : ins.bid, cf = (l.side === 'buy' ? -1 : 1) * px * l.qty;
        return `${legText(tb, l)} → 現金 ${fmtS(cf, 2)}`;
      });
      lines.push(`今天淨現金：${fmtS(ev.cash, 2)}`);
      const exd = tb.exps[ev.e0].days;
      lines.push(`到期（${exd} 天）最差情況損益：${fmtS(ev.minPay, 2)}，折現 × D = ${fmt(ev.D, 4)} → ${fmtS(ev.minPay * ev.D, 2)}`);
      lines.push(`鎖定獲利（現值）：${fmtS(ev.profit, 2)}／組，乘數 100 → ${fmtS(ev.profit * 100, 0)} 元`);
      return lines;
    }

    /* =================================================================
     * 3. 教練拍肩問
     * ================================================================= */
    const COACH_Q = [
      { key: 'tot', label: '加總 Greeks' },
      { key: 'newdelta', label: '漲跌後新 Delta' },
      { key: 'pnl', label: '情境 PnL' },
      { key: 'hedge', label: 'Delta 中性避險' },
      { key: 'maxvega', label: '最大 Vega 來源' },
      { key: 'gammasign', label: 'Long／Short Gamma' },
    ];
    const GREEK_NAME = { delta: 'delta', gamma: 'gamma', vega: 'vega', theta: 'theta' };
    const GREEK_UNIT = { delta: '股', gamma: '每點 Δ 變化', vega: '元／vol 點', theta: '元／天' };

    function coachPortfolio(R, level, perUnit) {
      const S = R.pick([50, 80, 100, 120, 150, 200, 250]);
      const r = R.pick([0.02, 0.03, 0.04]);
      const s0 = R.range(0.18, 0.4);
      const sm = { rho: -R.range(0.3, 0.7), gamma: 0.45, eta: R.range(0.6, 1.0) };
      const d0 = R.pick([14, 21, 30]);
      const EXP = [{ name: '近月', days: d0 }, { name: '次月', days: d0 + 28 }, { name: '季月', days: d0 + 91 }];
      const spacing = S <= 50 ? 2.5 : S <= 150 ? 5 : 10;
      const nL = level === 1 ? R.int(3, 4) : level === 2 ? R.int(4, 5) : R.int(5, 6);
      const gd = S >= 150 ? 4 : 3;
      const lines = [], seen = new Set();
      let guard = 0;
      while (lines.length < nL && guard++ < 200) {
        const ei = R.chance(0.5) ? 0 : R.int(1, 2);
        const kind = R.chance(0.5) ? 'C' : 'P';
        const K = r9(Math.round(S * (1 + R.range(-0.12, 0.12)) / spacing) * spacing);
        const key = ei + kind + K;
        if (seen.has(key)) continue;
        seen.add(key);
        const ex = EXP[ei], T = ex.days / 365, F = S * Math.exp(r * T);
        const vol = Math.sqrt(ssviW(Math.log(K / F), s0 * s0 * T, sm) / T);
        const g = bs(S, K, T, vol, r, kind === 'C' ? 'call' : 'put');
        const qty = R.sign() * R.step(5, level === 1 ? 50 : 100, 5);
        const unit = { delta: roundTo(g.delta, 2), gamma: roundTo(g.gamma, gd), vega: roundTo(g.vega, 2), theta: roundTo(g.theta, 3) };
        const tot = perUnit
          ? { delta: r9(qty * unit.delta * 100), gamma: r9(qty * unit.gamma * 100), vega: r9(qty * unit.vega * 100), theta: r9(qty * unit.theta * 100) }
          : { delta: Math.round(qty * g.delta * 100), gamma: Math.round(qty * g.gamma * 100), vega: Math.round(qty * g.vega * 100), theta: Math.round(qty * g.theta * 100) };
        lines.push({ ei, exp: ex.name, days: ex.days, kind, K, qty, unit, tot, vol });
      }
      lines.sort((a, b) => a.ei - b.ei || a.K - b.K || (a.kind < b.kind ? -1 : 1));
      const uq = R.chance(0.7) ? R.sign() * R.step(100, level === 1 ? 2000 : 4000, 100) : 0;
      const sum = (f) => r9(lines.reduce((a, l) => a + l.tot[f], 0));
      const tot = { delta: r9(sum('delta') + uq), gamma: sum('gamma'), vega: sum('vega'), theta: sum('theta') };
      return { S, r, lines, uq, mult: 100, perUnit: !!perUnit, gdec: gd, tot };
    }

    function lineDesc(pf, l) {
      const m = l.K / pf.S - 1;
      const mon = Math.abs(m) <= 0.02 ? 'ATM' : (l.kind === 'C' ? (m > 0 ? 'OTM' : 'ITM') : (m < 0 ? 'OTM' : 'ITM'));
      return `${l.exp} ${mon} ${fK(l.K)} ${l.kind === 'C' ? 'call' : 'put'}`;
    }
    const ls = (x) => (x >= 0 ? 'long' : 'short');

    function coachQuestion(R, pf, type) {
      const T = pf.tot, Ls = pf.lines;
      const absSum = (f) => Ls.reduce((a, l) => a + Math.abs(l.tot[f]), 0) + (f === 'delta' ? Math.abs(pf.uq) : 0);
      const keepAlts = (ans, tol, alts) => alts.filter((a) => Math.abs(a - ans) > 2 * tol);
      let q = null;
      if (type === 'tot') {
        const g = R.pick(['delta', 'gamma', 'vega', 'theta']);
        const ans = T[g], tol = Math.max(g === 'delta' ? 5 : 1, 0.01 * absSum(g));
        if (Math.abs(ans) < 2 * tol) return null;
        const terms = Ls.map((l) => l.tot[g]);
        if (g === 'delta' && pf.uq) terms.push(pf.uq);
        q = { prompt: `整體 ${GREEK_NAME[g]} 是多少？（${GREEK_UNIT[g]}）`, answer: ans, tol, unit: GREEK_UNIT[g], alts: keepAlts(ans, tol, [-ans]), greek: g,
          work: [`逐行加總：${terms.map((x, i) => (i ? fmtS(x) : fmt(x))).join(' ').replace(/ \+/g, ' + ').replace(/ −/g, ' − ')} = ${fmtS(ans)}`] };
      } else if (type === 'newdelta') {
        const X = R.sign() * R.pick([1, 2, 3, 5]), dS = r9(pf.S * X / 100), gS = r9(T.gamma * dS);
        const ans = r9(T.delta + gS), tol = Math.max(5, 0.03 * (Math.abs(T.delta) + Math.abs(gS)));
        if (Math.abs(ans) < 2 * tol || Math.abs(gS) < 2 * tol) return null;
        q = { prompt: `如果標的${X > 0 ? '漲' : '跌'} ${Math.abs(X)}%，新的 delta 大約是多少？（股）`, answer: ans, tol, unit: '股', X, dS,
          alts: keepAlts(ans, tol, [-ans, T.delta - gS]),
          work: [`δS = ${pf.S} × ${fmtS(X)}% = ${fmtS(dS)} 點`, `Γ·δS = ${fmt(T.gamma)} × ${par(dS)} = ${fmtS(gS)}`, `新 Δ = ${fmtS(T.delta)} ${fmtS(gS)} = ${fmtS(ans)}`] };
      } else if (type === 'pnl') {
        const X = R.chance(0.4) ? -2 : R.sign() * R.pick([1, 2, 3]);
        const dv = X === -2 && R.chance(0.6) ? 3 : R.sign() * R.pick([1, 2, 3, 4]);
        const dS = r9(pf.S * X / 100), tD = r9(T.delta * dS), tG = r9(0.5 * T.gamma * dS * dS), tV = r9(T.vega * dv);
        const ans = r9(tD + tG + tV), tol = Math.max(10, 0.05 * (Math.abs(tD) + Math.abs(tG) + Math.abs(tV)));
        if (Math.abs(ans) < 2 * tol) return null;
        q = { prompt: `標的${X > 0 ? '漲' : '跌'} ${Math.abs(X)}%、vol ${dv > 0 ? '升' : '降'} ${Math.abs(dv)} 點，部位損益大約多少？（泰勒：Δ、Γ、vega 三項；元）`, answer: ans, tol, unit: '元', X, dv, dS, tD, tG, tV,
          alts: keepAlts(ans, tol, [-ans, -tD + tG + tV, tD + tG - tV, tD - tG + tV]),
          work: [`δS = ${pf.S} × ${fmtS(X)}% = ${fmtS(dS)} 點`, `Δ·δS = ${fmt(T.delta)} × ${par(dS)} = ${fmtS(tD)}`, `½Γ·δS² = ½ × ${par(T.gamma)} × ${fmt(r9(dS * dS))} = ${fmtS(tG)}`, `Vega·δσ = ${fmt(T.vega)} × ${par(dv)} = ${fmtS(tV)}`, `合計 ≈ ${fmtS(ans)} 元`] };
      } else if (type === 'hedge') {
        const ans = -Math.round(T.delta), tol = Math.max(10, 0.02 * absSum('delta'));
        if (Math.abs(ans) < 2 * tol) return null;
        q = { prompt: '要讓部位 delta 中性，標的要買或賣多少股？（買入輸入正數、賣出輸入負數）', answer: ans, tol, unit: '股', alts: keepAlts(ans, tol, [-ans]),
          work: [`目前總 delta ${fmtS(T.delta)}，要加上 ${fmtS(ans)} 才會歸零 → ${ans > 0 ? '買進' : '賣出'} ${fmt(Math.abs(ans))} 股`] };
      } else if (type === 'maxvega') {
        const idx = Ls.map((l, i) => i).sort((a, b) => Math.abs(Ls[b].tot.vega) - Math.abs(Ls[a].tot.vega));
        if (Ls.length > 1 && Math.abs(Ls[idx[0]].tot.vega) < 1.15 * Math.abs(Ls[idx[1]].tot.vega)) return null;
        q = { prompt: '哪一行貢獻最多 vega（看絕對值）？', choices: Ls.map((l) => `${lineDesc(pf, l)}（${fmtS(l.qty)} 口）`), correct: idx[0], unit: '',
          work: [`各行 vega：${Ls.map((l) => fmtS(l.tot.vega)).join('、')}；絕對值最大的是 ${lineDesc(pf, Ls[idx[0]])}（${fmtS(Ls[idx[0]].tot.vega)}）`] };
      } else if (type === 'gammasign') {
        if (Math.abs(T.gamma) < 0.15 * absSum('gamma') || Math.abs(T.gamma) < 1) return null;
        q = { prompt: '整體是 long 還是 short gamma？', choices: ['Long gamma（Γ 合計 > 0）', 'Short gamma（Γ 合計 < 0）'], correct: T.gamma > 0 ? 0 : 1, unit: '', signChoice: true,
          work: [`Γ 合計 = ${Ls.map((l, i) => (i ? fmtS(l.tot.gamma) : fmt(l.tot.gamma))).join(' ')} = ${fmtS(T.gamma)}（標的部位沒有 gamma）`] };
      }
      if (!q) return null;
      q.type = type;
      q.typeLabel = (COACH_Q.find((x) => x.key === type) || {}).label;
      q.speech = coachSpeech(pf, q);
      return q;
    }

    function coachSpeech(pf, q) {
      const T = pf.tot, Ls = pf.lines;
      const top = Ls.slice().sort((a, b) => Math.abs(b.tot.vega) - Math.abs(a.tot.vega))[0];
      const main = `我目前 ${ls(T.delta)} ${fmt(Math.abs(T.delta))} delta、${ls(T.gamma)} gamma（${fmtS(T.gamma)}／點）、${ls(T.vega)} ${fmt(Math.abs(T.vega))} vega，vega ${Math.sign(top.tot.vega) === Math.sign(T.vega) ? '主要在' : '最大一筆在'}${lineDesc(pf, top)}（${fmtS(top.tot.vega)}）；theta 每天 ${fmtS(T.theta)}。`;
      let extra = '';
      if (q.type === 'tot') extra = `合計 ${q.greek} ${fmtS(q.answer)}。`;
      else if (q.type === 'newdelta') extra = `標的${q.X < 0 ? '跌' : '漲'} ${Math.abs(q.X)}%（${fmtS(q.dS)} 點）時，delta 約變 ${fmtS(q.answer)}（Γ × δS = ${fmtS(r9(T.gamma * q.dS))}）。`;
      else if (q.type === 'pnl') extra = `若${q.X < 0 ? '跌' : '漲'} ${Math.abs(q.X)}%、vol ${q.dv > 0 ? '升' : '降'} ${Math.abs(q.dv)} 點：delta 項 ${fmtS(q.tD)}、gamma 項 ${fmtS(q.tG)}、vega 項 ${fmtS(q.tV)}，合計約 ${fmtS(q.answer)}。`;
      else if (q.type === 'hedge') extra = `要 delta 中性，我要${q.answer > 0 ? '買進' : '賣出'}約 ${fmt(Math.abs(q.answer))} 股標的。`;
      else if (q.type === 'maxvega') extra = `vega 最大的來源是${lineDesc(pf, Ls[q.correct])}（${fmtS(Ls[q.correct].tot.vega)}）。`;
      else if (q.type === 'gammasign') extra = `我是 ${ls(T.gamma)} gamma：標的大漲大跌對我${T.gamma > 0 ? '有利' : '不利'}，${T.gamma > 0 ? '代價是' : '換來'}每天 theta ${fmtS(T.theta)}。`;
      return `「${main}${extra}」`;
    }

    /** opts: {level, perUnit, qtypes:[...]} */
    function coachGenerate(opts, rng) {
      const R = Rand(rng), o = opts || {};
      const qt = (o.qtypes && o.qtypes.length) ? o.qtypes : COACH_Q.map((x) => x.key);
      for (let tries = 0; tries < 500; tries++) {
        const pf = coachPortfolio(R, o.level || 2, o.perUnit);
        const q = coachQuestion(R, pf, R.pick(qt));
        if (q) return { pf, q };
      }
      throw new Error('coachGenerate failed');
    }
    function coachGrade(q, v) {
      if (q.choices) {
        const ok = v === q.correct;
        return { ok, sign: !ok && !!q.signChoice };
      }
      if (typeof v !== 'number' || !isFinite(v)) return { ok: false, sign: false };
      const ok = Math.abs(v - q.answer) <= q.tol + 1e-9;
      const sign = !ok && (q.alts || []).some((a) => Math.abs(v - a) <= q.tol + 1e-9);
      return { ok, sign };
    }

    return {
      mulberry32, Rand, fmt, fmtS, parseNum, median, ncdf, bs, ssviW,
      MM_CATS, mmGenerate, mmGrade,
      ARB_LABEL, ARB_LAYOUTS, arbBase, arbGenerate, arbCheck, arbCandidates, arbClosest, evalTrade, arbClassify, arbGrade,
      arbReason, arbTradeLines, legText, instLabel, flyQty, modelOk, smileVol,
      COACH_Q, coachGenerate, coachGrade, coachPortfolio, coachQuestion, lineDesc,
    };
  })();

  if (typeof module === 'object' && module.exports) module.exports = Core;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  G.NQDrills = Core;

  /* =====================================================================
   * UI（瀏覽器）
   * ===================================================================== */
  const C = Core;
  const KEY = 'nq:drills';
  const nq = () => G.NQ || {};

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const renderMath = (el) => { const N = nq(); if (N.renderMath) N.renderMath(el); };
  const fine = () => !!(G.matchMedia && G.matchMedia('(pointer: fine)').matches);
  const focusQuiet = (el) => { if (fine() && el) { try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } };
  const secs = (ms) => (isFinite(ms) ? (ms / 1000).toFixed(1) + ' 秒' : '—');
  const pct = (x) => (x == null || !isFinite(x) ? '—' : Math.round(x * 100) + '%');

  /* ---------- 儲存 ---------- */
  function loadAll() {
    const N = nq();
    if (N.store) return N.store.get(KEY);
    try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; }
  }
  function saveAll(v) {
    const N = nq();
    if (N.store) { N.store.set(KEY, v); return; }
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* ignore */ }
  }
  function loadDrill(name) { const d = loadAll()[name]; return d && typeof d === 'object' ? d : {}; }
  function updDrill(name, fn) {
    const all = loadAll();
    const d = all[name] && typeof all[name] === 'object' ? all[name] : {};
    fn(d);
    all[name] = d;
    saveAll(all);
    return d;
  }
  /** 存一輪紀錄：history 最多 30 筆；best 依 bestKey 保留最高分。 */
  function saveSession(name, rec, bestKey) {
    return updDrill(name, (d) => {
      d.history = Array.isArray(d.history) ? d.history : [];
      d.history.unshift(rec);
      d.history = d.history.slice(0, 30);
      d.best = d.best && typeof d.best === 'object' ? d.best : {};
      const b = d.best[bestKey];
      rec.isBest = !b || rec.score > b.score;
      if (rec.isBest) d.best[bestKey] = { score: rec.score, acc: rec.acc, med: rec.med, t: rec.t };
    });
  }

  /* ---------- 控制元件 ---------- */
  function seg(opts, value, onChange) {
    const box = h('div', { class: 'nqd-seg', role: 'group' });
    const btns = opts.map((o) => {
      const b = h('button', { type: 'button', class: 'nqd-seg-btn', 'aria-pressed': String(o.value === value) }, o.label);
      b.addEventListener('click', () => { btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); onChange(o.value); });
      return b;
    });
    box.append(...btns);
    return box;
  }
  function chips(opts, selected, onChange) {
    const box = h('div', { class: 'nqd-chips' });
    for (const o of opts) {
      const b = h('button', { type: 'button', class: 'nqd-chip', 'aria-pressed': String(selected.has(o.value)) }, o.label);
      b.addEventListener('click', () => {
        if (selected.has(o.value)) { if (selected.size === 1) return; selected.delete(o.value); } else selected.add(o.value);
        b.setAttribute('aria-pressed', String(selected.has(o.value)));
        onChange(selected);
      });
      box.append(b);
    }
    return box;
  }
  function field(label, ctl, hint) {
    return h('div', { class: 'nqd-field' }, h('div', { class: 'nqd-field-l' }, label), ctl, hint ? h('div', { class: 'nqd-hint' }, hint) : null);
  }
  function rangeCtl(min, max, step, value, fmtFn, onChange) {
    const out = h('span', { class: 'nqd-range-v' }, fmtFn(value));
    const inp = h('input', { type: 'range', min, max, step, value, class: 'nqd-range', 'aria-label': fmtFn(value) });
    inp.addEventListener('input', () => { const v = Number(inp.value); out.textContent = fmtFn(v); onChange(v); });
    return h('div', { class: 'nqd-range-row' }, inp, out);
  }
  function btn(label, onclick, cls) { return h('button', { type: 'button', class: 'nqd-btn ' + (cls || ''), onclick }, label); }

  function Timer(fill, label, onExpire) {
    let t0 = 0, tEnd = 0, limit = 1, iv = null;
    function tick() {
      if (!fill.isConnected) { stop(); return; }
      const el = performance.now() - t0, frac = Math.max(0, 1 - el / limit);
      fill.style.transform = `scaleX(${frac})`;
      fill.classList.toggle('nqd-warn', frac < 0.3);
      if (label) label.textContent = (Math.max(0, limit - el) / 1000).toFixed(1) + ' 秒';
      if (el >= limit) { stop(); onExpire(); }
    }
    function start(ms) { stop(); limit = ms; t0 = performance.now(); tEnd = 0; iv = setInterval(tick, 100); tick(); }
    function stop() { if (iv) { clearInterval(iv); iv = null; tEnd = performance.now(); } }
    function elapsed() { return (iv ? performance.now() : tEnd) - t0; }
    return { start, stop, elapsed, get limit() { return limit; } };
  }

  function keypad(input, onSubmit) {
    const grid = h('div', { class: 'nqd-keypad' });
    const press = (k) => {
      if (input.disabled) return;
      let v = input.value;
      if (k === '±') v = v.startsWith('-') ? v.slice(1) : '-' + v;
      else if (k === 'del') v = v.slice(0, -1);
      else if (k === '.') { if (!v.includes('.')) v += (v === '' || v === '-') ? '0.' : '.'; }
      else v += k;
      input.value = v;
      input.dispatchEvent(new Event('input'));
    };
    for (const k of ['7', '8', '9', 'del', '4', '5', '6', '±', '1', '2', '3', 'ok', '0', '.']) {
      if (k === 'ok') grid.append(h('button', { type: 'button', class: 'nqd-key nqd-key-ok', onclick: onSubmit }, '送出'));
      else if (k === 'del') grid.append(h('button', { type: 'button', class: 'nqd-key nqd-key-fn', 'aria-label': '刪除', onclick: () => press('del') }, '⌫'));
      else grid.append(h('button', { type: 'button', class: 'nqd-key' + (k === '0' ? ' nqd-key-0' : '') + (k === '±' ? ' nqd-key-fn' : ''), 'aria-label': k === '±' ? '正負號' : null, onclick: () => press(k) }, k));
    }
    return grid;
  }
  function answerInput() {
    const input = h('input', { type: 'text', inputmode: 'decimal', class: 'nqd-input', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done', 'aria-label': '你的答案' });
    input.addEventListener('input', () => { const v = input.value.replace(/[^0-9.,\-−+]/g, ''); if (v !== input.value) input.value = v; });
    return input;
  }
  function stat(label, value, sub) {
    return h('div', { class: 'nqd-stat' }, h('div', { class: 'nqd-stat-l' }, label), h('div', { class: 'nqd-stat-v' }, value), sub ? h('div', { class: 'nqd-stat-s' }, sub) : null);
  }
  function table(head, rows, cls) {
    return h('div', { class: 'nqd-tablewrap' }, h('table', { class: 'nqd-table ' + (cls || '') },
      h('thead', null, h('tr', null, head.map((x) => h('th', null, x)))),
      h('tbody', null, rows.map((r) => h('tr', null, r.map((x) => h('td', null, x)))))));
  }
  function historyBlock(name, d, bestLabels, extraCol) {
    const hist = Array.isArray(d.history) ? d.history : [];
    const best = d.best || {};
    const bestRows = Object.keys(bestLabels).filter((k) => best[k]).map((k) => [bestLabels[k], fmtInt(best[k].score), pct(best[k].acc), secs(best[k].med), new Date(best[k].t).toLocaleDateString('zh-TW')]);
    const box = h('details', { class: 'nqd-history' }, h('summary', null, `紀錄（最近 ${Math.min(hist.length, 10)} 輪／最佳分數）`));
    if (!hist.length) { box.append(h('p', { class: 'nqd-hint' }, '還沒有紀錄。完成一輪後會存在這台裝置的瀏覽器裡。')); return box; }
    if (bestRows.length) box.append(h('div', { class: 'nqd-sub' }, '最佳'), table(['難度', '分數', '正確率', '中位時間', '日期'], bestRows));
    box.append(h('div', { class: 'nqd-sub' }, '最近'), table(['日期', '難度', '題數', '正確率', '中位時間', '分數'].concat(extraCol ? [extraCol.label] : []),
      hist.slice(0, 10).map((x) => [new Date(x.t).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }), bestLabels[x.levelKey] || '', String(x.n), pct(x.acc), secs(x.med), fmtInt(x.score)].concat(extraCol ? [extraCol.get(x)] : []))));
    box.append(h('div', { class: 'nqd-actions' }, btn('清除這個練習的紀錄', () => {
      if (G.confirm && !G.confirm('確定清除這個練習的所有紀錄？')) return;
      updDrill(name, (dd) => { dd.history = []; dd.best = {}; dd.cats = {}; });
      box.replaceWith(historyBlock(name, loadDrill(name), bestLabels, extraCol));
    }, 'nqd-btn-danger')));
    return box;
  }
  const fmtInt = (x) => C.fmt(Math.round(x || 0), 0);
  const LEVELS = [{ value: 1, label: '入門' }, { value: 2, label: '標準' }, { value: 3, label: '進階' }];
  const LEVEL_LABEL = { L1: '入門', L2: '標準', L3: '進階' };

  function playShell(onStop) {
    const fill = h('div', { class: 'nqd-timer-fill' });
    const els = {
      prog: h('span', { class: 'nqd-prog' }), score: h('span', { class: 'nqd-score' }), tleft: h('span', { class: 'nqd-tleft' }), fill,
    };
    els.bar = h('div', { class: 'nqd-bar' }, els.prog, els.score, els.tleft, btn('結束', onStop, 'nqd-btn-sm'));
    els.timer = h('div', { class: 'nqd-timer', 'aria-hidden': 'true' }, fill);
    return els;
  }
  function verdictEl(kind, text) { return h('div', { class: 'nqd-verdict nqd-v-' + kind }, text); }
  function workList(lines) { return h('ul', { class: 'nqd-work' }, lines.map((l) => h('li', { html: l }))); }

  /* =====================================================================
   * 心算速練
   * ===================================================================== */
  function mountMental(root) {
    const NAME = 'mental-math';
    const keys = C.MM_CATS.map((c) => c.key);
    const sv = loadDrill(NAME).settings || {};
    const st = {
      cats: new Set((Array.isArray(sv.cats) ? sv.cats : keys).filter((k) => keys.includes(k))),
      level: [1, 2, 3].includes(sv.level) ? sv.level : 2,
      limit: sv.limit >= 3 && sv.limit <= 20 ? sv.limit : 8,
      count: [10, 20, 30, 0].includes(sv.count) ? sv.count : 20,
      extra: sv.extra !== false,
    };
    if (!st.cats.size) keys.forEach((k) => st.cats.add(k));
    const view = h('div', { class: 'nqd-view' });
    root.replaceChildren(view);
    let timer = null, cur = null;
    const save = () => updDrill(NAME, (d) => { d.settings = { cats: [...st.cats], level: st.level, limit: st.limit, count: st.count, extra: st.extra }; });
    settings();

    function settings() {
      if (timer) timer.stop();
      const d = loadDrill(NAME);
      view.replaceChildren(
        h('div', { class: 'nqd-title' }, '心算速練'),
        field('題型（可複選）', chips(C.MM_CATS.map((c) => ({ value: c.key, label: c.label })), st.cats, save)),
        field('難度', seg(LEVELS, st.level, (v) => { st.level = v; save(); }), '進階：泰勒四項含小數、新 delta 加 vanna、由跨式反推隱含波動率、月／週換算'),
        field('每題秒數', rangeCtl(3, 20, 1, st.limit, (v) => v + ' 秒', (v) => { st.limit = v; save(); })),
        field('複雜題自動加時', seg([{ value: true, label: '加時（泰勒 ×1.5、其他 ×1.25）' }, { value: false, label: '不加時' }], st.extra, (v) => { st.extra = v; save(); })),
        field('題數', seg([{ value: 10, label: '10' }, { value: 20, label: '20' }, { value: 30, label: '30' }, { value: 0, label: '不限' }], st.count, (v) => { st.count = v; save(); })),
        h('div', { class: 'nqd-actions' }, btn('開始', start, 'nqd-btn-primary nqd-btn-big')),
        historyBlock(NAME, d, LEVEL_LABEL),
      );
    }

    function start() {
      const ses = { res: [], q: null, answered: true, score: 0, last: null };
      cur = ses;
      const sh = playShell(() => finish());
      const cat = h('div', { class: 'nqd-cat' });
      const prompt = h('div', { class: 'nqd-prompt', 'aria-live': 'polite' });
      const input = answerInput();
      const unit = h('span', { class: 'nqd-unit' });
      const msg = h('div', { class: 'nqd-msg', role: 'status' });
      const padwrap = h('div', { class: 'nqd-padwrap' }, keypad(input, () => submit()));
      const fb = h('div', { class: 'nqd-fb', hidden: true });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (ses.answered) next(); else submit(); } });
      input.addEventListener('input', () => { msg.textContent = ''; });
      view.replaceChildren(sh.bar, sh.timer, cat, prompt, h('div', { class: 'nqd-ansrow' }, input, unit), msg, padwrap, fb);
      timer = Timer(sh.fill, sh.tleft, () => grade(null, true));
      next();

      function next() {
        if (st.count && ses.res.length >= st.count) { finish(); return; }
        const cats = [...st.cats];
        let q;
        for (let i = 0; i < 5; i++) { q = C.mmGenerate(cats[Math.floor(Math.random() * cats.length)], st.level); if (q.prompt !== ses.last) break; }
        ses.q = q; ses.last = q.prompt; ses.answered = false;
        sh.prog.textContent = `第 ${ses.res.length + 1}${st.count ? ' / ' + st.count : ''} 題`;
        sh.score.textContent = `分數 ${ses.score}`;
        cat.textContent = q.catLabel;
        prompt.innerHTML = q.prompt;
        renderMath(prompt);
        unit.textContent = q.unit || '';
        input.value = ''; input.disabled = false;
        msg.textContent = '';
        padwrap.hidden = false; fb.hidden = true;
        q.limit = st.limit * 1000 * (st.extra ? q.mult : 1);
        timer.start(q.limit);
        focusQuiet(input);
      }
      function submit() {
        if (ses.answered) return;
        const v = C.parseNum(input.value);
        if (!isFinite(v)) { msg.textContent = '請輸入數字（可用 ± 鍵切換正負）'; return; }
        grade(v, false);
      }
      function grade(v, timeout) {
        if (ses.answered) return;
        ses.answered = true;
        timer.stop();
        const q = ses.q, ms = timeout ? q.limit : Math.min(timer.elapsed(), q.limit);
        const typed = timeout ? C.parseNum(input.value) : v;
        const g = timeout ? { ok: false, sign: false } : C.mmGrade(q, v);
        const pts = g.ok ? 10 + Math.round(10 * Math.max(0, 1 - ms / q.limit)) : 0;
        ses.score += pts;
        ses.res.push({ cat: q.cat, ok: g.ok, sign: g.sign, timeout, ms, prompt: q.prompt, answer: q.answer, typed, unit: q.unit });
        sh.score.textContent = `分數 ${ses.score}`;
        input.disabled = true;
        const verdict = g.ok ? verdictEl('ok', `✔ 正確　+${pts}`) : timeout ? verdictEl('bad', '⏱ 時間到') : verdictEl('bad', g.sign ? '✘ 正負號錯了' : '✘ 不對');
        const nextBtn = btn(st.count && ses.res.length >= st.count ? '看結果' : '下一題', next, 'nqd-btn-primary nqd-btn-big');
        fb.replaceChildren(verdict,
          h('div', { class: 'nqd-line' }, `你的答案：${isFinite(typed) ? C.fmt(typed, null, 4) : '—'}　正確答案：`, h('b', null, C.fmt(q.answer, null, q.tol < 0.01 ? 4 : 2) + (q.unit ? ' ' + q.unit : '')), `（容許 ±${C.fmt(q.tol, null, q.tol < 0.01 ? 3 : 2)}）　用時 ${secs(ms)}`),
          h('div', { class: 'nqd-sub' }, '算法'), workList(q.work),
          q.tip ? h('div', { class: 'nqd-tip' }, '捷徑：' + q.tip) : null,
          h('div', { class: 'nqd-actions' }, nextBtn));
        renderMath(fb);
        padwrap.hidden = true; fb.hidden = false;
        focusQuiet(nextBtn);
      }
    }

    function finish() {
      if (timer) timer.stop();
      const ses = cur;
      cur = null;
      if (!ses || !ses.res.length) { settings(); return; }
      const res = ses.res;
      const ok = res.filter((r) => r.ok).length;
      const med = C.median(res.map((r) => r.ms));
      const rec = { t: Date.now(), levelKey: 'L' + st.level, n: res.length, ok, acc: ok / res.length, med, score: ses.score, limit: st.limit, cats: [...st.cats] };
      const d = saveSession(NAME, rec, rec.levelKey);
      updDrill(NAME, (dd) => {
        dd.cats = dd.cats && typeof dd.cats === 'object' ? dd.cats : {};
        for (const r of res) { const c = dd.cats[r.cat] || (dd.cats[r.cat] = { n: 0, ok: 0 }); c.n++; if (r.ok) c.ok++; }
      });
      const allCats = loadDrill(NAME).cats || {};
      const rows = C.MM_CATS.filter((c) => res.some((r) => r.cat === c.key)).map((c) => {
        const rs = res.filter((r) => r.cat === c.key), k = rs.filter((r) => r.ok).length, life = allCats[c.key];
        return [c.label, String(rs.length), String(k), pct(k / rs.length), secs(C.median(rs.map((r) => r.ms))), life ? pct(life.ok / life.n) + `（${life.n}）` : '—'];
      });
      const wrong = res.filter((r) => !r.ok);
      view.replaceChildren(
        h('div', { class: 'nqd-title' }, '本輪結果'),
        h('div', { class: 'nqd-stats' },
          stat('正確率', pct(rec.acc), `${ok} / ${res.length}`),
          stat('中位時間', secs(med)),
          stat('分數', fmtInt(rec.score), rec.isBest ? '新紀錄！' : `本難度最佳 ${fmtInt((d.best[rec.levelKey] || {}).score)}`),
          stat('正負號錯誤', String(res.filter((r) => r.sign).length))),
        h('div', { class: 'nqd-sub' }, '各題型'),
        table(['題型', '題數', '答對', '正確率', '中位時間', '累計正確率'], rows),
        wrong.length ? h('details', { class: 'nqd-review' }, h('summary', null, `檢討錯題（${wrong.length}）`),
          h('ol', null, wrong.map((r) => h('li', null, h('div', { html: r.prompt }), h('div', { class: 'nqd-hint' },
            `你答 ${isFinite(r.typed) ? C.fmt(r.typed, null, 4) : (r.timeout ? '（超時）' : '—')}，正解 ${C.fmt(r.answer, null, 2)}${r.unit ? ' ' + r.unit : ''}${r.sign ? '（正負號錯）' : ''}`))))) : null,
        h('div', { class: 'nqd-actions' }, btn('再來一輪', start, 'nqd-btn-primary nqd-btn-big'), btn('回設定', settings)),
      );
      renderMath(view);
    }
  }

  /* =====================================================================
   * 套利偵測
   * ===================================================================== */
  function mountArb(root) {
    const NAME = 'arbitrage';
    const sv = loadDrill(NAME).settings || {};
    const st = {
      layout: ['auto', 'puts', 'cal', 'calls'].includes(sv.layout) ? sv.layout : 'auto',
      level: [1, 2, 3].includes(sv.level) ? sv.level : 2,
      limit: sv.limit >= 15 && sv.limit <= 120 ? sv.limit : 45,
      count: [5, 10, 20].includes(sv.count) ? sv.count : 10,
    };
    const view = h('div', { class: 'nqd-view' });
    root.replaceChildren(view);
    let timer = null, cur = null;
    const save = () => updDrill(NAME, (d) => { d.settings = Object.assign({}, st); });
    settings();

    function settings() {
      if (timer) timer.stop();
      view.replaceChildren(
        h('div', { class: 'nqd-title' }, '套利偵測'),
        field('報價表', seg([{ value: 'auto', label: '隨機' }, { value: 'puts', label: '單一到期＋賣權' }, { value: 'cal', label: '雙到期買權' }, { value: 'calls', label: '只有買權' }], st.layout, (v) => { st.layout = v; save(); }),
          '單一到期＋賣權：垂直／蝶式／平價；雙到期：垂直／蝶式／日曆。約四分之一的表完全沒有套利。'),
        field('難度', seg(LEVELS, st.level, (v) => { st.level = v; save(); }), '入門：5 個履約價、違規幅度 3–5 個 tick；進階：6–7 個履約價、間距不等、只差 1–2 個 tick'),
        field('每張表秒數', rangeCtl(15, 120, 5, st.limit, (v) => v + ' 秒', (v) => { st.limit = v; save(); })),
        field('張數', seg([{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 20, label: '20' }], st.count, (v) => { st.count = v; save(); })),
        h('div', { class: 'nqd-actions' }, btn('開始', start, 'nqd-btn-primary nqd-btn-big')),
        historyBlock(NAME, loadDrill(NAME), LEVEL_LABEL, { label: '誤報／漏判', get: (x) => `${x.fa || 0}／${x.miss || 0}` }),
      );
    }

    function start() {
      const ses = { res: [], score: 0, tb: null, answered: true, type: null, sel: new Map(), cells: {} };
      cur = ses;
      const sh = playShell(() => finish());
      const info = h('div', { class: 'nqd-arb-info' });
      const tableBox = h('div', { class: 'nqd-tablewrap' });
      const typeBox = h('div', { class: 'nqd-arb-types' });
      const legsLine = h('div', { class: 'nqd-legs', 'aria-live': 'polite' });
      const msg = h('div', { class: 'nqd-msg', role: 'status' });
      const submitBtn = btn('送出', () => submit(false), 'nqd-btn-primary nqd-btn-big');
      const clearBtn = btn('清除選擇', () => { ses.sel.clear(); paint(); });
      const ctl = h('div', { class: 'nqd-arb-ctl' },
        h('div', { class: 'nqd-step' }, '① 違規類型'), typeBox,
        h('div', { class: 'nqd-step' }, '② 點報價組成交易：點 Ask = 買入、點 Bid = 賣出（再點一次取消）'), legsLine, msg,
        h('div', { class: 'nqd-actions' }, submitBtn, clearBtn));
      const fb = h('div', { class: 'nqd-fb', hidden: true });
      view.replaceChildren(sh.bar, sh.timer, info, tableBox, ctl, fb);
      timer = Timer(sh.fill, sh.tleft, () => submit(true));
      next();

      function quoteBtn(id, side) {
        const tb = ses.tb, ins = tb.inst[id], px = side === 'buy' ? ins.ask : ins.bid;
        const b = h('button', { type: 'button', class: 'nqd-q nqd-q-' + (side === 'buy' ? 'ask' : 'bid'), 'aria-label': `${side === 'buy' ? '買入' : '賣出'} ${C.instLabel(tb, ins)} ${C.fmt(px, 2)}` }, C.fmt(px, 2));
        b.addEventListener('click', () => {
          if (ses.answered) return;
          if (ses.sel.get(id) === side) ses.sel.delete(id); else ses.sel.set(id, side);
          if (!ses.type || ses.type === 'none') setType(null);
          paint();
        });
        ses.cells[id + '|' + side] = b;
        return b;
      }
      function setType(t) {
        ses.type = t;
        typeBox.querySelectorAll('.nqd-seg-btn').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.t === t)));
        if (t === 'none') ses.sel.clear();
        paint();
      }
      function paint() {
        for (const [k, b] of Object.entries(ses.cells)) {
          const [id, side] = k.split('|');
          const on = ses.sel.get(id) === side;
          b.classList.toggle('nqd-sel', on);
          b.setAttribute('aria-pressed', String(on));
        }
        const tb = ses.tb;
        const sel = [...ses.sel.entries()].map(([id, side]) => ({ id, side }));
        if (!sel.length) { legsLine.textContent = ses.type === 'none' ? '已選：無套利' : '尚未選腿'; return; }
        const cls = C.arbClassify(tb, sel);
        const legs = cls ? cls.legs : sel.map((s) => Object.assign({ qty: 1 }, s));
        legsLine.textContent = '已選：' + legs.map((l) => C.legText(tb, l)).join('、') + (cls ? `（${C.ARB_LABEL[cls.type]}結構）` : '');
      }
      function next() {
        if (ses.res.length >= st.count) { finish(); return; }
        let tb;
        try { tb = C.arbGenerate({ layout: st.layout, level: st.level }); } catch (e) { tb = C.arbGenerate({ layout: st.layout, level: st.level, force: 'none' }); }
        ses.tb = tb; ses.answered = false; ses.sel.clear(); ses.cells = {}; ses.type = null;
        sh.prog.textContent = `第 ${ses.res.length + 1} / ${st.count} 張`;
        sh.score.textContent = `分數 ${ses.score}`;
        info.replaceChildren(
          h('span', { class: 'nqd-arb-s' }, `標的 S ≈ ${C.fmt(tb.S, 2)}　`, quoteBtn('S', 'sell'), quoteBtn('S', 'buy')),
          h('span', null, `r = ${C.fmt(tb.r * 100)}%（連續複利）`),
          ...tb.exps.map((x) => h('span', null, `${x.days} 天：D = e^(−rT) = ${C.fmt(x.D, 4)}`)),
          h('span', null, `tick ${C.fmt(tb.tick, 2)}；無股利；歐式`));
        const head1 = [h('th', { rowspan: 2, scope: 'col' }, '履約價')], head2 = [];
        const cols = [];
        if (tb.layout === 'cal') tb.exps.forEach((x, e) => cols.push({ kind: 'C', e, label: `${x.days} 天 買權 C` }));
        else { cols.push({ kind: 'C', e: 0, label: `${tb.exps[0].days} 天 買權 C` }); if (tb.hasPuts) cols.push({ kind: 'P', e: 0, label: `${tb.exps[0].days} 天 賣權 P` }); }
        for (const c of cols) { head1.push(h('th', { colspan: 2, scope: 'colgroup' }, c.label)); head2.push(h('th', null, 'Bid'), h('th', null, 'Ask')); }
        const rows = tb.strikes.map((K, i) => h('tr', null, h('th', { scope: 'row' }, C.fmt(K, null, 2)),
          cols.map((c) => { const id = c.kind + c.e + '_' + i; return [h('td', null, quoteBtn(id, 'sell')), h('td', null, quoteBtn(id, 'buy'))]; })));
        tableBox.replaceChildren(h('table', { class: 'nqd-qt' }, h('thead', null, h('tr', null, head1), h('tr', null, head2)), h('tbody', null, rows)));
        const types = C.ARB_LAYOUTS[tb.layout].types.concat(['none']);
        typeBox.replaceChildren(h('div', { class: 'nqd-seg' }, types.map((t) => {
          const b = h('button', { type: 'button', class: 'nqd-seg-btn', 'aria-pressed': 'false', 'data-t': t }, C.ARB_LABEL[t]);
          b.addEventListener('click', () => { if (!ses.answered) setType(t); });
          return b;
        })));
        msg.textContent = '';
        ctl.hidden = false; fb.hidden = true;
        paint();
        timer.start(st.limit * 1000);
      }
      function submit(timeout) {
        if (ses.answered) return;
        const sel = [...ses.sel.entries()].map(([id, side]) => ({ id, side }));
        if (!timeout) {
          if (!ses.type) { msg.textContent = '先選違規類型（或「無套利」）'; return; }
          if (ses.type !== 'none' && !sel.length) { msg.textContent = '點表格中的報價來組成你的套利交易'; return; }
        }
        ses.answered = true;
        timer.stop();
        const tb = ses.tb, ms = Math.min(timer.elapsed(), st.limit * 1000);
        const g = C.arbGrade(tb, ses.type, sel);
        const pts = g.verdict === 'full' ? 100 + Math.round(50 * Math.max(0, 1 - ms / (st.limit * 1000))) : g.verdict === 'partial' ? 40 : 0;
        ses.score += pts;
        ses.res.push({ ans: tb.answer.type, type: ses.type, verdict: g.verdict, typeOk: g.typeOk, fa: !!g.falseAlarm, miss: !!g.miss, timeout: timeout && !ses.type, ms });
        sh.score.textContent = `分數 ${ses.score}`;
        reveal(g, pts, timeout);
      }
      function reveal(g, pts, timeout) {
        const tb = ses.tb, A = tb.answer;
        if (A.primary) for (const l of A.primary.legs) {
          const b = ses.cells[l.id + '|' + l.side];
          if (b) b.classList.add(l.side === 'buy' ? 'nqd-ans-buy' : 'nqd-ans-sell');
        }
        const parts = [];
        if (g.verdict === 'full') parts.push(verdictEl('ok', `✔ 正確　+${pts}`));
        else if (g.verdict === 'partial') parts.push(verdictEl('mid', `△ 類型對，但交易不成立　+${pts}`));
        else parts.push(verdictEl('bad', timeout && !ses.type ? '⏱ 時間到' : g.falseAlarm ? '✘ 誤報：這張表沒有套利' : g.miss ? '✘ 漏判：這張表有套利' : '✘ 不對'));
        parts.push(h('div', { class: 'nqd-line' }, '答案：', h('b', null, C.ARB_LABEL[A.type])));
        if (A.primary) {
          parts.push(h('p', { class: 'nqd-reason' }, C.arbReason(tb, A.primary)));
          parts.push(h('div', { class: 'nqd-sub' }, '套利交易（表格中外框標「買」＝在 ask 買、標「賣」＝在 bid 賣；你點過的格子有 ✓）'), workList(C.arbTradeLines(tb, A.primary)));
          if (A.all.length > 1) parts.push(h('div', { class: 'nqd-hint' }, `同一個錯價還衍生出 ${A.all.length - 1} 個同類型的套利組合，任何一個都算對。`));
        } else if (A.closest) {
          parts.push(h('p', { class: 'nqd-reason' }, `在 bid/ask 成交的前提下，沒有任何垂直、蝶式、日曆或平價組合能鎖定獲利。最接近的是 ${C.ARB_LABEL[A.closest.type]}：${A.closest.legs.map((l) => C.legText(tb, l)).join('、')}，鎖定 ${C.fmtS(A.closest.profit, 2)}（仍是負的）。`));
        }
        const u = g.user;
        if (u && g.verdict === 'full' && A.primary && JSON.stringify(u.legs.map((l) => l.id + l.side).sort()) !== JSON.stringify(A.primary.legs.map((l) => l.id + l.side).sort())) {
          parts.push(h('div', { class: 'nqd-sub' }, '你的交易也成立'), workList(C.arbTradeLines(tb, u)));
        } else if (g.verdict !== 'full' && ses.type && ses.type !== 'none' && ses.sel.size) {
          if (!u) parts.push(h('div', { class: 'nqd-hint' }, '你選的腿組不成垂直／蝶式／日曆／平價（轉換、逆轉換、箱型）任何一種結構。'));
          else if (u.type !== ses.type) parts.push(h('div', { class: 'nqd-hint' }, `你選的腿是${C.ARB_LABEL[u.type]}結構，和選的類型不一致。`));
          else parts.push(h('div', { class: 'nqd-hint' }, `你的組合以可成交價格計算鎖定 ${isFinite(u.profit) ? C.fmtS(u.profit, 2) : '無下限的虧損'}，不是套利（記得：買在 ask、賣在 bid）。`));
        }
        const nextBtn = btn(ses.res.length >= st.count ? '看結果' : '下一張', next, 'nqd-btn-primary nqd-btn-big');
        parts.push(h('div', { class: 'nqd-actions' }, nextBtn));
        fb.replaceChildren(...parts);
        renderMath(fb);
        ctl.hidden = true; fb.hidden = false;
        focusQuiet(nextBtn);
      }
    }

    function finish() {
      if (timer) timer.stop();
      const ses = cur;
      cur = null;
      if (!ses || !ses.res.length) { settings(); return; }
      const res = ses.res, n = res.length;
      const full = res.filter((r) => r.verdict === 'full').length, tOk = res.filter((r) => r.typeOk).length;
      const med = C.median(res.map((r) => r.ms));
      const fa = res.filter((r) => r.fa).length, miss = res.filter((r) => r.miss).length;
      const rec = { t: Date.now(), levelKey: 'L' + st.level, n, ok: full, acc: full / n, med, score: ses.score, fa, miss, layout: st.layout };
      const d = saveSession(NAME, rec, rec.levelKey);
      const rows = ['vertical', 'butterfly', 'calendar', 'parity', 'none'].filter((t) => res.some((r) => r.ans === t)).map((t) => {
        const rs = res.filter((r) => r.ans === t);
        return [C.ARB_LABEL[t], String(rs.length), String(rs.filter((r) => r.typeOk).length), String(rs.filter((r) => r.verdict === 'full').length), secs(C.median(rs.map((r) => r.ms)))];
      });
      view.replaceChildren(
        h('div', { class: 'nqd-title' }, '本輪結果'),
        h('div', { class: 'nqd-stats' },
          stat('完全正確', pct(full / n), `${full} / ${n}`),
          stat('類型判斷正確', pct(tOk / n)),
          stat('中位時間', secs(med)),
          stat('分數', fmtInt(ses.score), rec.isBest ? '新紀錄！' : `本難度最佳 ${fmtInt((d.best[rec.levelKey] || {}).score)}`),
          stat('誤報／漏判', `${fa}／${miss}`, '誤報＝無套利說有；漏判＝有套利說無')),
        h('div', { class: 'nqd-sub' }, '依正確答案分類'),
        table(['答案類型', '張數', '類型判斷對', '完全正確', '中位時間'], rows),
        h('div', { class: 'nqd-actions' }, btn('再來一輪', start, 'nqd-btn-primary nqd-btn-big'), btn('回設定', settings)),
      );
    }
  }

  /* =====================================================================
   * 教練拍肩問
   * ===================================================================== */
  function mountCoach(root) {
    const NAME = 'coach';
    const keys = C.COACH_Q.map((x) => x.key);
    const sv = loadDrill(NAME).settings || {};
    const st = {
      level: [1, 2, 3].includes(sv.level) ? sv.level : 2,
      perUnit: !!sv.perUnit,
      qtypes: new Set((Array.isArray(sv.qtypes) ? sv.qtypes : keys).filter((k) => keys.includes(k))),
      limit: sv.limit >= 5 && sv.limit <= 60 ? sv.limit : 20,
      count: [10, 20, 0].includes(sv.count) ? sv.count : 10,
    };
    if (!st.qtypes.size) keys.forEach((k) => st.qtypes.add(k));
    const view = h('div', { class: 'nqd-view' });
    root.replaceChildren(view);
    let timer = null, cur = null;
    const save = () => updDrill(NAME, (d) => { d.settings = { level: st.level, perUnit: st.perUnit, qtypes: [...st.qtypes], limit: st.limit, count: st.count }; });
    settings();

    function settings() {
      if (timer) timer.stop();
      view.replaceChildren(
        h('div', { class: 'nqd-title' }, '教練拍肩問'),
        field('部位大小', seg([{ value: 1, label: '入門 3–4 行' }, { value: 2, label: '標準 4–5 行' }, { value: 3, label: '進階 5–6 行' }], st.level, (v) => { st.level = v; save(); })),
        field('Greeks 顯示', seg([{ value: false, label: '每行合計（只要加總）' }, { value: true, label: '每口（要乘口數 × 100）' }], st.perUnit, (v) => { st.perUnit = v; save(); })),
        field('問題類型（可複選）', chips(C.COACH_Q.map((x) => ({ value: x.key, label: x.label })), st.qtypes, save)),
        field('每題秒數', rangeCtl(5, 60, 1, st.limit, (v) => v + ' 秒', (v) => { st.limit = v; save(); })),
        field('題數', seg([{ value: 10, label: '10' }, { value: 20, label: '20' }, { value: 0, label: '不限' }], st.count, (v) => { st.count = v; save(); })),
        h('div', { class: 'nqd-actions' }, btn('開始', start, 'nqd-btn-primary nqd-btn-big')),
        historyBlock(NAME, loadDrill(NAME), LEVEL_LABEL, { label: '正負號錯', get: (x) => String(x.sign || 0) }),
      );
    }

    function pfTable(pf) {
      const U = pf.perUnit;
      const f = (x, d) => C.fmtS(x, d);
      const head = ['合約', '口數', U ? 'Δ／口' : 'Δ（股）', U ? 'Γ／口' : 'Γ（每點）', U ? 'Vega／口' : 'Vega（元）', U ? 'Θ／口' : 'Θ（元／天）'];
      const rows = pf.lines.map((l) => {
        const g = U ? l.unit : l.tot;
        return [C.lineDesc(pf, l), C.fmtS(l.qty), U ? f(g.delta, 2) : f(g.delta, 0), U ? f(g.gamma, pf.gdec) : f(g.gamma, 0), U ? f(g.vega, 2) : f(g.vega, 0), U ? f(g.theta, 3) : f(g.theta, 0)];
      });
      if (pf.uq) rows.push(['標的（股）', C.fmtS(pf.uq), U ? '1（每股）' : C.fmtS(pf.uq), '—', '—', '—']);
      return h('div', { class: 'nqd-pf' },
        h('div', { class: 'nqd-pf-cap' }, `S = ${C.fmt(pf.S)}　乘數 100${U ? '；部位 Greek = 口數 × 每口 × 100' : ''}；Γ＝每 1 點的 Δ 變化、vega＝每 1 vol 點、θ＝每日曆日`),
        table(head, rows, 'nqd-pf-t'));
    }

    function start() {
      const ses = { res: [], score: 0, item: null, answered: true };
      cur = ses;
      const sh = playShell(() => finish());
      const pfBox = h('div');
      const cat = h('div', { class: 'nqd-cat' });
      const prompt = h('div', { class: 'nqd-prompt', 'aria-live': 'polite' });
      const input = answerInput();
      const unit = h('span', { class: 'nqd-unit' });
      const msg = h('div', { class: 'nqd-msg', role: 'status' });
      const numBox = h('div', null, h('div', { class: 'nqd-ansrow' }, input, unit), msg, h('div', { class: 'nqd-padwrap' }, keypad(input, () => submit())));
      const choiceBox = h('div', { class: 'nqd-choices' });
      const ansBox = h('div', null, numBox, choiceBox);
      const fb = h('div', { class: 'nqd-fb', hidden: true });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (ses.answered) next(); else submit(); } });
      input.addEventListener('input', () => { msg.textContent = ''; });
      view.replaceChildren(sh.bar, sh.timer, pfBox, cat, prompt, ansBox, fb);
      timer = Timer(sh.fill, sh.tleft, () => grade(null, true));
      next();

      function next() {
        if (st.count && ses.res.length >= st.count) { finish(); return; }
        const item = C.coachGenerate({ level: st.level, perUnit: st.perUnit, qtypes: [...st.qtypes] });
        ses.item = item; ses.answered = false;
        const q = item.q;
        sh.prog.textContent = `第 ${ses.res.length + 1}${st.count ? ' / ' + st.count : ''} 題`;
        sh.score.textContent = `分數 ${ses.score}`;
        pfBox.replaceChildren(pfTable(item.pf));
        cat.textContent = '教練：' + q.typeLabel;
        prompt.textContent = q.prompt;
        if (q.choices) {
          numBox.hidden = true; choiceBox.hidden = false;
          choiceBox.replaceChildren(...q.choices.map((c, i) => h('button', { type: 'button', class: 'nqd-choice', onclick: () => grade(i, false) }, c)));
        } else {
          numBox.hidden = false; choiceBox.hidden = true;
          input.value = ''; input.disabled = false; unit.textContent = q.unit || ''; msg.textContent = '';
          focusQuiet(input);
        }
        ansBox.hidden = false; fb.hidden = true;
        timer.start(st.limit * 1000);
      }
      function submit() {
        if (ses.answered) return;
        const v = C.parseNum(input.value);
        if (!isFinite(v)) { msg.textContent = '請輸入數字（± 鍵切換正負）'; return; }
        grade(v, false);
      }
      function grade(v, timeout) {
        if (ses.answered) return;
        ses.answered = true;
        timer.stop();
        const { pf, q } = ses.item, lim = st.limit * 1000, ms = timeout ? lim : Math.min(timer.elapsed(), lim);
        const g = timeout ? { ok: false, sign: false } : C.coachGrade(q, v);
        const pts = g.ok ? 10 + Math.round(10 * Math.max(0, 1 - ms / lim)) : 0;
        ses.score += pts;
        ses.res.push({ type: q.type, ok: g.ok, sign: g.sign, timeout, ms });
        sh.score.textContent = `分數 ${ses.score}`;
        const yours = q.choices ? (v == null ? '—' : q.choices[v]) : (isFinite(v) ? C.fmt(v, null, 2) : (isFinite(C.parseNum(input.value)) ? C.fmt(C.parseNum(input.value), null, 2) : '—'));
        const right = q.choices ? q.choices[q.correct] : C.fmtS(q.answer, null, 2) + (q.unit ? ' ' + q.unit : '') + `（容許 ±${C.fmt(q.tol, 0)}）`;
        const nextBtn = btn(st.count && ses.res.length >= st.count ? '看結果' : '下一題', next, 'nqd-btn-primary nqd-btn-big');
        fb.replaceChildren(
          g.ok ? verdictEl('ok', `✔ 正確　+${pts}`) : timeout ? verdictEl('bad', '⏱ 時間到') : verdictEl('bad', g.sign ? '✘ 正負號（方向）錯了' : '✘ 不對'),
          h('div', { class: 'nqd-line' }, `你的答案：${yours}　正確答案：`, h('b', null, right)),
          h('div', { class: 'nqd-sub' }, '示範口述'),
          h('blockquote', { class: 'nqd-speech' }, q.speech),
          h('div', { class: 'nqd-sub' }, '算法'), workList(q.work),
          h('div', { class: 'nqd-actions' }, nextBtn));
        void pf;
        ansBox.hidden = true; fb.hidden = false;
        focusQuiet(nextBtn);
      }
    }

    function finish() {
      if (timer) timer.stop();
      const ses = cur;
      cur = null;
      if (!ses || !ses.res.length) { settings(); return; }
      const res = ses.res, n = res.length, ok = res.filter((r) => r.ok).length, sign = res.filter((r) => r.sign).length;
      const med = C.median(res.map((r) => r.ms));
      const rec = { t: Date.now(), levelKey: 'L' + st.level, n, ok, acc: ok / n, med, score: ses.score, sign, perUnit: st.perUnit };
      const d = saveSession(NAME, rec, rec.levelKey);
      const life = d.history.reduce((a, x) => { a.n += x.n || 0; a.s += x.sign || 0; return a; }, { n: 0, s: 0 });
      const rows = C.COACH_Q.filter((x) => res.some((r) => r.type === x.key)).map((x) => {
        const rs = res.filter((r) => r.type === x.key), k = rs.filter((r) => r.ok).length;
        return [x.label, String(rs.length), String(k), pct(k / rs.length), String(rs.filter((r) => r.sign).length), secs(C.median(rs.map((r) => r.ms)))];
      });
      const wrong = n - ok;
      view.replaceChildren(
        h('div', { class: 'nqd-title' }, '本輪結果'),
        h('div', { class: 'nqd-stats' },
          stat('正確率', pct(ok / n), `${ok} / ${n}`),
          stat('中位時間', secs(med)),
          stat('分數', fmtInt(ses.score), rec.isBest ? '新紀錄！' : `本難度最佳 ${fmtInt((d.best[rec.levelKey] || {}).score)}`),
          stat('正負號錯誤', String(sign), wrong ? `占錯題 ${pct(sign / wrong)}；累計 ${life.s} / ${life.n} 題` : `累計 ${life.s} / ${life.n} 題`)),
        sign ? h('p', { class: 'nqd-tip' }, '正負號錯誤是盤中最貴的錯：避險方向做反等於把風險加倍。回答前先說一次「我是 long／short ___」，再決定買或賣。') : null,
        h('div', { class: 'nqd-sub' }, '各問題類型'),
        table(['類型', '題數', '答對', '正確率', '正負號錯', '中位時間'], rows),
        h('div', { class: 'nqd-actions' }, btn('再來一輪', start, 'nqd-btn-primary nqd-btn-big'), btn('回設定', settings)),
      );
    }
  }

  /* =====================================================================
   * 掛載（相容 navigation.instant：document$ 每次換頁都會觸發；每個元素只掛一次）
   * ===================================================================== */
  const MOUNTS = { 'mental-math': mountMental, arbitrage: mountArb, coach: mountCoach };
  function mountAll() {
    document.querySelectorAll('.nq-drill[data-drill]').forEach((el) => {
      if (el.dataset.nqdMounted) return;
      const fn = MOUNTS[el.dataset.drill];
      if (!fn) return;
      el.dataset.nqdMounted = '1';
      el.classList.add('nqd');
      try { fn(el); } catch (e) {
        if (G.console) G.console.error('[nq-drills]', e);
        el.textContent = '練習載入失敗，請重新整理頁面。';
      }
    });
  }
  if (G.document$ && typeof G.document$.subscribe === 'function') G.document$.subscribe(() => mountAll());
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
})(typeof window !== 'undefined' ? window : globalThis);
