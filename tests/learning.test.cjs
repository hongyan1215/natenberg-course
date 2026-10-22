const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({console, URL, URLSearchParams, Date, setTimeout, clearTimeout});
for (const name of ['nq-common','nq-progress','nq-quiz','nq-foundations','nq-learning-home']) {
  vm.runInContext(fs.readFileSync(`site_src/javascripts/${name}.js`,'utf8'),context);
}
const {NQ} = context;
test('all four expiry positions include premium and the correct sign', () => {
  for (const [s, lc, lp, sc, sp] of [[0,-5,95,5,-95],[95,-5,0,5,0],[100,-5,-5,5,5],[105,0,-5,0,5],[110,5,-5,-5,5],[1000,895,-5,-895,5]]) {
    for (const [p,want] of [['long-call',lc],['long-put',lp],['short-call',sc],['short-put',sp]]) assert.equal(NQ.firstOption.profit(p,s),want,`${p} S=${s}`);
  }
});
test('payoff exposure of a buyer and seller cancels at every tested price', () => {
  for (let s=0; s<=500; s+=5) for (const kind of ['call','put']) assert.equal(NQ.firstOption.profit(`long-${kind}`,s)+NQ.firstOption.profit(`short-${kind}`,s),0);
});
test('subdirectory deployment and deep page roots keep stable storage paths', () => {
  assert.equal(NQ.normalizePath('/natenberg-course/lessons/ch01/','/natenberg-course/'),'lessons/ch01/');
  assert.equal(NQ.normalizePath('/natenberg-course/index.html','/natenberg-course/'),'');
});
test('learning backup preserves notes across devices and chooses newest edits', () => {
  const a={notes:{ch01:{text:'current',updatedAt:20}},reader:{mode:'focus'},preferences:{minutes:30}};
  const b={notes:{ch01:{text:'older',updatedAt:10},ch02:{text:'new',updatedAt:30}},reader:{fontSize:'large'}};
  const result=NQ.progress.mergeLearning(a,b);
  assert.equal(result.notes.ch01.text,'current'); assert.equal(result.notes.ch02.text,'new');
  assert.equal(result.reader.mode,'focus'); assert.equal(result.reader.fontSize,'large');
  const roundTrip=NQ.progress.parseImport(NQ.progress.buildExport({extra:{'nq:learning':result}}));
  assert.equal(roundTrip.extra['nq:learning'].notes.ch02.text,'new');
});
test('only attempted questions with fewer than two consecutive correct answers are due', () => {
  assert.equal(NQ.isDue(undefined),false);
  assert.equal(NQ.isDue({seen:1,streak:0}),true);
  assert.equal(NQ.isDue({seen:1,streak:1}),true);
  assert.equal(NQ.isDue({seen:2,streak:2}),false);
});
test('latest-answer accuracy differs from historical accuracy after relearning', () => {
  const stats=NQ.quizStats([{id:'a'},{id:'b'}],{a:{seen:10,right:1,streak:1},b:{seen:10,right:1,streak:1}});
  assert.equal(stats.ok/stats.total,1); assert.equal(stats.acc,0.1);
});

test('chapter verification requires full coverage, 85% latest answers and all checklist items', () => {
  const chapter = {key:'ch01',url:'lessons/ch01/'};
  const qs=Array.from({length:20},(_,i)=>({id:`q${i}`}));
  const quiz=Object.fromEntries(qs.map((q,i)=>[q.id,{seen:10,right:1,streak:i<17?1:0}]));
  const check = {[chapter.url]:{_total:2,0:true,1:true,100:true}};
  const summarize=()=>NQ.learningHome.summarize([chapter],{ch01:qs},{quiz,check,visited:{[chapter.url]:123}});
  assert.equal(summarize().verified,1);
  quiz.q16.streak=0; assert.equal(summarize().verified,0);
  quiz.q16.streak=1; delete quiz.q19; assert.equal(summarize().verified,0);
  quiz.q19={seen:1,streak:0}; delete check[chapter.url][1]; assert.equal(summarize().verified,0);
  assert.equal(NQ.learningHome.summarize([chapter],{ch01:qs},{visited:{[chapter.url]:123}}).verified,0);
});
test('advanced and appendix progress do not inflate 25-chapter core progress', () => {
  const chapters=[{key:'ch01',url:'lessons/ch01/'},{key:'appB',url:'lessons/appB/'},{key:'p01',url:'prep/p01/'}];
  const result=NQ.learningHome.summarize(chapters,{},{});
  assert.equal(result.core.length,1); assert.equal(result.rows.length,2);
  assert.equal(result.target.key,'ch01');
});
test('time preferences accept only the offered session lengths', () => {
  for (const m of [15,30,60]) assert.equal(NQ.learningHome.minutes(m),m);
  for (const m of [0,-5,999,'bad',undefined]) assert.equal(NQ.learningHome.minutes(m),15);
});

test('video backup uses the newest playback position and preserves having watched to the end', () => {
  const a = {videos:{ch01:{time:80,updatedAt:20,completed:true}}};
  const b = {videos:{ch01:{time:12,updatedAt:30,completed:false},ch02:{time:9,updatedAt:10,completed:false}}};
  const result = NQ.progress.mergeLearning(a,b);
  assert.equal(result.videos.ch01.time,12);
  assert.equal(result.videos.ch01.completed,true);
  assert.equal(result.videos.ch02.time,9);
  assert.equal(a.videos.ch01.time,80);
});
