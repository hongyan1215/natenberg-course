const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ console });
for (const filename of ["nq-common.js", "nq-videos.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "site_src", "javascripts", filename), "utf8"), context, { filename });
}
const V = context.NQ.videos;
const episode = (change = {}) => Object.assign({
  id: "ch01", chapter: "ch01", title: "金融合約", duration: 112,
  src: "assets/videos/ch01.mp4", captions: "assets/videos/ch01.vtt", poster: "assets/videos/ch01.jpg",
}, change);

test("video asset paths accept only local packaged files of the expected type", () => {
  assert.equal(V.assetPath("assets/videos/ch01.mp4", "video"), "assets/videos/ch01.mp4");
  assert.equal(V.assetPath("assets/videos/appB.vtt", "captions"), "assets/videos/appB.vtt");
  assert.equal(V.assetPath("assets/videos/ch01.webp", "poster"), "assets/videos/ch01.webp");
  for (const unsafe of [
    "/assets/videos/ch01.mp4", "//example.test/ch01.mp4", "https://example.test/ch01.mp4",
    "javascript:alert(1)", "data:video/mp4;base64,AAAA", "assets/videos/../ch01.mp4",
    "assets/videos/%2e%2e/ch01.mp4", "assets/videos/ch01.mp4?download=1", "assets/videos/ch01.mp4#t=1",
    "assets/videos/subfolder/ch01.mp4", "assets/videos/ch01.svg", "assets/videos/ch01.vtt", "",
  ]) assert.equal(V.assetPath(unsafe, "video"), null, unsafe);
  assert.equal(V.assetPath(null, "video"), null);
  assert.equal(V.assetPath("assets/videos/ch01.mp4", "unknown"), null);
});

test("episode normalization skips malformed media, duplicate chapters and invalid durations", () => {
  const input = [episode(), episode({ id: "ch01-repeat" }), episode({ chapter: "ch02" }), episode({ id: "appB", chapter: "appB", src: "assets/videos/appB.mp4", captions: "assets/videos/appB.vtt", poster: "assets/videos/appB.jpg" }),
    episode({ id: "wrong-chapter", chapter: "p01" }), episode({ id: "badurl", chapter: "ch02", src: "https://example.test/a.mp4" }),
    ...[0, -1, Infinity, NaN, 3601, undefined].map((duration, i) => episode({ id: "duration-" + i, chapter: "ch03", duration })),
    null];
  const actual = V.normalizeEpisodes({ episodes: input });
  assert.equal(actual.length, 2);
  assert.equal(actual[0].chapter, "ch01");
  assert.equal(actual[1].chapter, "appB");
  assert.equal(V.normalizeEpisodes({}).length, 0);
  assert.equal(V.normalizeEpisodes(null).length, 0);
});

test("saved video positions are bounded and invalid imported values are neutral", () => {
  assert.equal(V.savedState({ time: 210, completed: false }, 100).time, 100);
  assert.equal(V.savedState({ time: 32.5, updatedAt: 20, completed: true }, 100).time, 32.5);
  assert.equal(V.savedState({ time: NaN, completed: "true" }, 100).completed, false);
  for (const time of [NaN, Infinity, -20, "not a number", undefined]) {
    assert.equal(V.savedState({ time }, 100).time, 0);
  }
  assert.equal(V.savedState(null, 100).time, 0);
  assert.equal(V.savedState([], 100).completed, false);
});

test("only an ended event completes a video, and later replays preserve completion", () => {
  const nearEnd = V.progressUpdate({}, 99.9, 100, false, 10);
  assert.equal(nearEnd.completed, false);
  assert.equal(V.progressUpdate({}, 100, 100, false, 20).completed, false);
  const ended = V.progressUpdate(nearEnd, 100, 100, true, 30);
  assert.equal(ended.completed, true);
  assert.equal(ended.time, 100);
  assert.equal(ended.updatedAt, 30);
  const replay = V.progressUpdate(ended, 12, 100, false, 40);
  assert.equal(replay.completed, true);
  assert.equal(replay.time, 12);
  assert.equal(V.progressUpdate({}, 250, 100, false, 50).time, 100);
  assert.equal(V.progressUpdate({ time: 25 }, NaN, 100, false, 50).time, 25);
});

test("video timestamps display minutes and padded whole seconds", () => {
  for (const [input, expected] of [[0, "0:00"], [9, "0:09"], [59.9, "0:59"], [60, "1:00"], [128, "2:08"], [3600, "60:00"], [-10, "0:00"], [NaN, "0:00"], [Infinity, "0:00"]]) {
    assert.equal(V.formatTime(input), expected);
  }
});

test("chapter labels connect conceptual video titles to their course chapter", () => {
  assert.equal(V.chapterLabel("ch01"), "第 1 章");
  assert.equal(V.chapterLabel("ch25"), "第 25 章");
  assert.equal(V.chapterLabel("appB"), "附錄 B");
  assert.equal(V.chapterLabel("ch99"), "學習短片");
  assert.equal(V.chapterLabel(null), "學習短片");
});
