/* First option: expiry values per unit, K=100, premium=5; no fees or financing. */
(function (root) {
  "use strict";
  const NQ = root.NQ;
  if (!NQ) return;
  const F = (NQ.firstOption = {}), h = NQ.h;
  F.profit = function (position, spot, strike = 100, premium = 5) {
    const payoff = position.endsWith("call") ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0);
    return position.startsWith("long") ? payoff - premium : premium - payoff;
  };
  function svg(tag, attrs) {
    const el = root.document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs || {})) el.setAttribute(key, value);
    return el;
  }
  function mount(host) {
    let position = "long-call";
    const names = {"long-call":"買入買權", "long-put":"買入賣權", "short-call":"賣出買權", "short-put":"賣出賣權"};
    const price = h("input", {type:"range", min:60, max:140, step:1, value:100, id:"first-option-price"});
    const current = h("output", {for:"first-option-price"});
    const result = h("div", {class:"nq-first-result", "aria-live":"polite"});
    const chart = svg("svg", {viewBox:"0 0 500 240", role:"img", "aria-label":"到期損益曲線，橫軸為到期股價，縱軸為每單位損益"});
    const title = svg("title"); title.textContent = "四種基本部位的到期損益"; chart.append(title);
    const x = s => 40 + (s - 60) * 5.25, y = p => 112 - p * 2.4;
    chart.append(svg("path", {d:"M40 16V208H460 M40 112H460 M250 16V208", stroke:"currentColor", opacity:".25", fill:"none"}));
    [[40,230,"60"],[245,230,"100"],[440,230,"140 股價"],[4,116,"0"],[2,25,"+35"],[2,202,"−35"]].forEach(([a,b,t]) => {
      const text = svg("text", {x:a,y:b,"font-size":12,fill:"currentColor"}); text.textContent=t; chart.append(text);
    });
    const line = svg("path", {stroke:"#218578", "stroke-width":3, fill:"none"});
    const dot = svg("circle", {r:5,fill:"#218578",stroke:"currentColor"}); chart.append(line,dot);
    const controls = h("div", {class:"nq-first-positions", role:"group", "aria-label":"選擇基本部位"});
    const buttons = Object.entries(names).map(([key,label]) => h("button", {type:"button",class:"nq-btn",text:label,onclick:() => {position=key; draw();}}));
    controls.append(...buttons);
    function draw() {
      const spot = Number(price.value), profit = F.profit(position,spot), long = position.startsWith("long");
      const value = position.endsWith("call") ? Math.max(spot-100,0) : Math.max(100-spot,0);
      const signed = n => n > 0 ? `+${n}` : String(n);
      current.textContent = `${spot} 元`;
      buttons.forEach((button,i) => button.setAttribute("aria-pressed", String(Object.keys(names)[i] === position)));
      line.setAttribute("d", Array.from({length:81},(_,i) => `${i ? "L" : "M"}${x(i+60)},${y(F.profit(position,i+60))}`).join(" "));
      dot.setAttribute("cx",x(spot)); dot.setAttribute("cy",y(profit));
      chart.setAttribute("aria-label",`${names[position]}：到期股價${spot}，每單位損益${signed(profit)}。股價範圍60到140，範圍之外仍可能有損失。`);
      result.replaceChildren(h("strong", {text:`${names[position]}：損益 ${signed(profit)} 元`}),h("p", {text:long ? `到期價值 ${value} − 已付權利金 5 = ${signed(profit)}` : `已收權利金 5 − 到期給付 ${value} = ${signed(profit)}`}));
    }
    price.addEventListener("input",draw);
    host.replaceChildren(h("h3", {text:"換你試試：股價變了，誰賺誰賠？"}), h("p",{text:"先預測，再拖動股價。固定履約價 100、權利金 5、乘數 1，忽略費用與利息；只看到期損益。"}),controls,h("label",{for:"first-option-price",text:"到期股價："},current),price,chart,result,h("p",{text:"觀察範圍僅為 60–140；賣出買權的損失可隨股價上漲持續擴大。",class:"nq-setup-help"}));
    draw();
  }
  NQ.onPage(() => {
    root.document.querySelectorAll(".nq-first-option").forEach(host => {if (NQ.claim(host)) mount(host);});
    root.document.querySelectorAll(".nq-game-setting").forEach(host => {
      if (!NQ.claim(host)) return;
      const toggle = h("input", {type:"checkbox",id:"nq-game-toggle"});
      toggle.checked = NQ.store.get("nq:learning").gameEnabled === true;
      const status = h("span", {"aria-live":"polite"});
      toggle.addEventListener("change",() => {
        NQ.store.update("nq:learning", s => {s.gameEnabled=toggle.checked;});
        if (!NQ.store.available()) {status.textContent="目前無法保存設定，請改用一般瀏覽模式。"; return;}
        root.location.reload();
      });
      host.replaceChildren(h("label",{for:"nq-game-toggle"},toggle," 開啟關卡、經驗值與 Boss 挑戰"),status);
    });
  });
})(typeof window !== "undefined" ? window : globalThis);
