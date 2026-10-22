/* Chapter micro-lessons: one native video, captions and an equivalent transcript. */
(function (root) {
  "use strict";
  const NQ = root.NQ;
  if (!NQ) return;
  const V = (NQ.videos = NQ.videos || {});
  const h = (...args) => NQ.h(...args);
  const STORE = "nq:learning";
  const CHAPTER = /^(?:ch(?:0[1-9]|1[0-9]|2[0-5])|appB)$/;
  const players = new Set();
  const libraries = new WeakMap();
  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  V.assetPath = function assetPath(value, kind) {
    const extensions = { video: "mp4", captions: "vtt", poster: "(?:jpg|jpeg|png|webp)" };
    if (typeof value !== "string" || !extensions[kind]) return null;
    return new RegExp("^assets/videos/[A-Za-z0-9_-]+\\." + extensions[kind] + "$", "i").test(value) ? value : null;
  };
  V.chapterLabel = function chapterLabel(key) {
    if (key === "appB") return "附錄 B";
    return CHAPTER.test(key || "") ? `第 ${Number(String(key).slice(2))} 章` : "學習短片";
  };
  V.formatTime = function formatTime(value) {
    const number = Number(value);
    const seconds = Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  V.savedState = function savedState(value, duration) {
    const state = object(value), time = Number(state.time), max = Number(duration);
    return { time: Number.isFinite(time) && time > 0 ? Math.min(time, max > 0 ? max : time) : 0,
      updatedAt: Number(state.updatedAt) || 0, completed: state.completed === true };
  };
  V.progressUpdate = function progressUpdate(previous, time, duration, ended, now) {
    const saved = V.savedState(previous, duration), current = Number(time), limit = Number(duration);
    return { time: Number.isFinite(current) && current >= 0 ? Math.min(current, Number.isFinite(limit) && limit > 0 ? limit : current) : saved.time,
      updatedAt: now == null ? Date.now() : now, completed: saved.completed || ended === true };
  };
  V.normalizeEpisodes = function normalizeEpisodes(manifest) {
    const seen = new Set(), ids = new Set();
    return (Array.isArray(manifest && manifest.episodes) ? manifest.episodes : []).filter((episode) => {
      if (!episode || !/^[A-Za-z0-9_-]{1,80}$/.test(episode.id || "") || !CHAPTER.test(episode.chapter || "") || seen.has(episode.chapter) || ids.has(episode.id) || ["__proto__", "constructor", "prototype"].includes(episode.id)) return false;
      if (!V.assetPath(episode.src, "video") || !V.assetPath(episode.captions, "captions") || !V.assetPath(episode.poster, "poster")) return false;
      if (!(Number(episode.duration) > 0) || Number(episode.duration) > 3600) return false;
      seen.add(episode.chapter); ids.add(episode.id);
      return true;
    });
  };
  function saved(episode) { return V.savedState(object(NQ.store.get(STORE).videos)[episode.id], episode.duration); }
  function external(value) {
    if (typeof value !== "string") return null;
    try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url : null; } catch (error) { return null; }
  }
  function chapterUrl(episode, chapters) {
    const chapter = (chapters || []).find((row) => row.key === episode.chapter);
    return NQ.url(chapter && /^lessons\/[A-Za-z0-9_-]+\/$/.test(chapter.url || "") ? chapter.url : "course/");
  }
  function sceneList(episode) {
    return (Array.isArray(episode.scenes) ? episode.scenes : []).filter((scene) => scene &&
      Number.isFinite(Number(scene.start)) && Number(scene.start) >= 0 && Number(scene.start) < Number(episode.duration));
  }
  function watchLabel(episode) {
    const state = saved(episode);
    return state.completed ? "已看完" : state.time > 1 ? `已看到 ${V.formatTime(state.time)}` : "尚未觀看";
  }
  function questionBlock(episode) {
    const question = object(episode.question), choices = question.choices;
    if (!question.prompt || !Array.isArray(choices) || choices.length < 2 || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= choices.length) return null;
    const answerId = `nqv-answer-${episode.id}`;
    const feedback = h("p", { id: answerId, class: "nqv-question-feedback", role: "status", "aria-live": "polite" });
    const group = h("div", { class: "nqv-question-choices", role: "group", "aria-label": "選擇答案" });
    choices.forEach((choice, index) => {
      group.append(h("button", { type: "button", "aria-describedby": answerId, "aria-pressed": "false",
        onclick: (event) => {
          group.querySelectorAll("button").forEach((button) => { button.setAttribute("aria-pressed", "false"); button.classList.remove("is-correct", "is-retry"); });
          const button = event.currentTarget, correct = index === question.answer;
          button.setAttribute("aria-pressed", "true");
          button.classList.add(correct ? "is-correct" : "is-retry");
          feedback.classList.toggle("is-correct", correct);
          feedback.textContent = `${correct ? "答對了。" : "再想一下。"}${question.explanation || "回看影片中的例子，分開列出每一步。"}`;
        } }, h("span", { "aria-hidden": "true", text: String.fromCharCode(65 + index) }), String(choice)));
    });
    return h("section", { class: "nqv-question", "aria-label": "看完後想一想" },
      h("p", { class: "nqv-small-label", text: "看完後，確認一個觀念" }),
      h("p", { class: "nqv-question-prompt", text: question.prompt }), group, feedback,
      h("p", { class: "nqv-fine", text: "這題幫你確認直覺，不會取代章末測驗或改變章節驗證。" }));
  }
  function player(host, episode, data, onProgress) {
    const video = h("video", { controls: true, playsinline: true, preload: "none", poster: NQ.url(episode.poster),
      class: "nqv-video", "aria-label": `${episode.title}，AI 語音教學短片` },
      h("source", { src: NQ.url(episode.src), type: "video/mp4" }),
      h("track", { kind: "captions", src: NQ.url(episode.captions), srclang: "zh-TW", label: "繁體中文字幕" }),
      "這個瀏覽器無法播放影片，請閱讀下方逐字稿。");
    const playback = h("select", { id: `nqv-speed-${episode.id}`, "aria-label": "播放速度" },
      [0.75, 1, 1.25, 1.5, 2].map((speed) => h("option", { value: speed, selected: speed === 1, text: `${speed}×` })));
    const status = h("span", { class: "nqv-watch-state", text: watchLabel(episode) });
    const actionStatus = h("p", { class: "nqv-action-status", role: "status", "aria-live": "polite" });
    const scenes = sceneList(episode);
    const jumps = h("div", { class: "nqv-scene-jumps", role: "group", "aria-label": "跳到片段，播放由你按下" });
    const transcript = h("details", { class: "nqv-transcript" }, h("summary", { text: "閱讀逐字稿與片段時間" }));
    let lastWrite = 0, pendingSeek = null, disposed = false;
    const listeners = [];
    function listen(target, type, callback) { target.addEventListener(type, callback); listeners.push(() => target.removeEventListener(type, callback)); }
    function persist(ended) {
      if (!video.currentTime && !ended) return;
      const time = video.currentTime, duration = Number.isFinite(video.duration) ? video.duration : Number(episode.duration);
      NQ.store.update(STORE, (state) => {
        state.videos = object(state.videos);
        state.videos[episode.id] = V.progressUpdate(state.videos[episode.id], time, duration, ended, Date.now());
      });
      status.textContent = watchLabel(episode);
      if (onProgress) onProgress();
      lastWrite = Date.now();
    }
    function seek(time) {
      const wasPlaying = !video.paused;
      // A scene jump never starts (or silently continues) playback.
      video.pause();
      pendingSeek = Number(time);
      if (video.readyState >= 1) {
        video.currentTime = pendingSeek;
        pendingSeek = null;
      } else video.load();
      actionStatus.textContent = `已選擇 ${V.formatTime(time)} 的片段，按播放器的播放鍵開始。`;
      if (wasPlaying) persist(false);
    }
    scenes.forEach((scene, index) => {
      const label = `${V.formatTime(scene.start)} ${scene.title || `片段 ${index + 1}`}`;
      jumps.append(h("button", { type: "button", text: label, onclick: () => seek(scene.start) }));
      transcript.append(h("section", { class: "nqv-transcript-scene" },
        h("button", { type: "button", class: "nqv-transcript-time", text: label, onclick: () => seek(scene.start) }),
        h("p", { text: scene.narration || "此片段沒有額外逐字稿。" })));
    });
    const sources = (Array.isArray(episode.sources) ? episode.sources : []).map(external).filter(Boolean);
    const sourceBlock = sources.length ? h("details", { class: "nqv-sources" }, h("summary", { text: "核對概念來源" }),
      h("ul", {}, sources.map((url, index) => h("li", {}, h("a", { href: url.href, target: "_blank", rel: "noopener noreferrer", text: `${index + 1}. ${url.hostname.replace(/^www\./, "")}${url.pathname === "/" ? "" : " · " + String(url.pathname.split("/").filter(Boolean).pop() || "來源").replace(/[-_]/g, " ")}` }))))) : null;
    host.replaceChildren(h("div", { class: "nqv-player" }, video,
      h("div", { class: "nqv-player-controls" },
        h("span", { class: "nqv-voice-label", text: "AI 語音 · 繁體中文字幕" }),
        h("label", { for: playback.id }, "速度 ", playback), status),
      h("p", { class: "nqv-player-note", text: "影片已內嵌中文字幕；可按需開啟播放器字幕，或直接閱讀逐字稿。" }),
      jumps, actionStatus, transcript, questionBlock(episode),
      h("div", { class: "nqv-after-video" }, h("a", { class: "nq-home-button", href: chapterUrl(episode, data.chapters), text: "回講義，親手算一次 →" }),
        h("span", { class: "nqv-fine", text: "看完 ≠ 已學會，接著試做章末練習。" })), sourceBlock));
    listen(playback, "change", () => { video.playbackRate = Number(playback.value); });
    listen(video, "loadedmetadata", () => {
      const state = saved(episode);
      const time = pendingSeek == null ? state.completed ? 0 : state.time : pendingSeek;
      pendingSeek = null;
      if (time > 0) video.currentTime = Math.min(time, Math.max(0, video.duration - 0.25));
      video.playbackRate = Number(playback.value);
    });
    listen(video, "timeupdate", () => { if (Date.now() - lastWrite > 5000) persist(false); });
    listen(video, "pause", () => persist(false));
    listen(video, "ended", () => {
      persist(true);
      actionStatus.textContent = "已記錄為看完。接著試答下方的一題，再回講義練習。";
    });
    listen(video, "error", () => { actionStatus.textContent = "影片暫時無法播放；仍可閱讀逐字稿與回答下方問題。"; });
    const entry = { host, pause: () => { video.pause(); persist(false); }, dispose: () => {
      if (disposed) return;
      disposed = true;
      video.pause(); persist(false);
      listeners.forEach((remove) => remove());
      video.removeAttribute("src"); video.querySelectorAll("source, track").forEach((node) => node.removeAttribute("src"));
      video.load(); players.delete(entry);
    } };
    players.add(entry);
    return entry;
  }
  function setQuery(chapter) {
    try { const url = new URL(root.location.href); url.searchParams.set("chapter", chapter); root.history.replaceState(root.history.state, "", url.href); } catch (error) { /* Library still works without history access. */ }
  }
  function selectedQuery() { try { return new URL(root.location.href).searchParams.get("chapter"); } catch (error) { return null; } }
  function library(host, data) {
    const episodes = data.episodes, first = episodes.find((episode) => episode.chapter === selectedQuery()) || episodes.find((episode) => !saved(episode).completed) || episodes[0];
    const moduleByChapter = new Map();
    (data.course.modules || []).forEach((module) => (module.keys || []).forEach((key) => moduleByChapter.set(key, module)));
    const title = h("h2", { id: "nqv-current-title", class: "nqv-current-title" });
    const summary = h("p", { class: "nqv-current-summary" });
    const stage = h("section", { class: "nqv-stage", "aria-labelledby": title.id }, title, summary);
    const playerHost = h("div", { class: "nqv-player-host" });
    stage.append(playerHost);
    const count = h("p", { class: "nqv-library-count", role: "status" });
    const search = h("input", { type: "search", id: "nqv-search", placeholder: "搜尋章節或概念，例如：避險", autocomplete: "off" });
    const filter = h("select", { id: "nqv-module" }, h("option", { value: "", text: "全部模組" }),
      (data.course.modules || []).map((module, index) => h("option", { value: String(module.id), text: `${String(index + 1).padStart(2, "0")} ${module.title}` })));
    const grid = h("div", { class: "nqv-library-grid", "aria-label": "選擇教學短片" });
    const cards = new Map();
    let current = null, activePlayer = null;
    function updateProgress() {
      for (const episode of episodes) {
        const card = cards.get(episode.chapter);
        if (card) card.querySelector(".nqv-card-state").textContent = watchLabel(episode);
      }
    }
    function choose(episode, updateUrl, focus) {
      if (current && current.chapter === episode.chapter) return;
      if (activePlayer) activePlayer.dispose();
      current = episode;
      title.textContent = `${V.chapterLabel(episode.chapter)}｜${episode.title}`;
      summary.textContent = episode.summary || "先抓住本章直覺，再回講義計算與驗證。";
      activePlayer = player(playerHost, episode, data, updateProgress);
      cards.forEach((card, key) => { card.setAttribute("aria-pressed", String(key === episode.chapter)); });
      if (updateUrl) setQuery(episode.chapter);
      if (focus) { title.tabIndex = -1; title.focus({ preventScroll: true }); stage.scrollIntoView({ behavior: "auto", block: "start" }); }
    }
    function renderGrid() {
      const query = search.value.trim().toLocaleLowerCase("zh-TW"), moduleId = filter.value;
      const list = episodes.filter((episode) => {
        const module = moduleByChapter.get(episode.chapter);
        return (!moduleId || module && String(module.id) === moduleId) && (!query || `${episode.title} ${episode.summary || ""} ${episode.chapter} ${module ? module.title : ""}`.toLocaleLowerCase("zh-TW").includes(query));
      });
      cards.clear();
      grid.replaceChildren(...list.map((episode) => {
        const module = moduleByChapter.get(episode.chapter);
        const card = h("button", { type: "button", class: "nqv-card", "aria-pressed": String(current && current.chapter === episode.chapter), onclick: () => choose(episode, true, true) },
          h("span", { class: "nqv-card-poster" }, h("img", { src: NQ.url(episode.poster), alt: "", loading: "lazy", decoding: "async" }),
            h("span", { class: "nqv-card-play", "aria-hidden": "true", text: "▶" }), h("span", { class: "nqv-card-duration", text: V.formatTime(episode.duration) })),
          h("span", { class: "nqv-card-body" }, h("span", { class: "nqv-card-module", text: `${V.chapterLabel(episode.chapter)} · ${module ? module.title : episode.chapter === "appB" ? "數學補給" : "核心課程"}` }),
            h("strong", { text: episode.title }), h("span", { class: "nqv-card-description", text: episode.summary || "用一個例子理解本章的核心觀念。" }),
            h("span", { class: "nqv-card-state", text: watchLabel(episode) })));
        cards.set(episode.chapter, card);
        return card;
      }));
      if (!list.length) grid.append(h("p", { class: "nqv-no-results", text: "沒有符合的短片，換個關鍵字或選擇全部模組。" }));
      count.textContent = `顯示 ${list.length} / ${episodes.length} 部短片。選擇卡片後，在上方播放器觀看。`;
    }
    const voice = object(data.manifest.voice);
    host.replaceChildren(h("div", { class: "nqv-library-meta" },
      h("span", { text: `${episodes.length} 部章節短片` }), h("span", { text: "AI 語音" }), h("span", { text: "繁體中文字幕" }),
      h("span", { text: /^zh[-_]TW$/i.test(voice.locale || "") ? "台灣中文 AI 配音" : "中文 AI 配音" })), stage,
      h("section", { class: "nqv-browse", "aria-label": "尋找章節影片" },
        h("div", { class: "nqv-browse-heading" }, h("h2", { text: "選一章，先建立直覺。" }), h("a", { href: NQ.url("course/"), text: "對照完整學習路線 →" })),
        h("div", { class: "nqv-filters" }, h("label", { for: search.id }, "找一個概念", search), h("label", { for: filter.id }, "依模組選擇", filter)), count, grid));
    search.addEventListener("input", renderGrid);
    filter.addEventListener("change", renderGrid);
    renderGrid(); choose(first, false, false);
    libraries.set(host, { choose: (chapter) => { const episode = episodes.find((item) => item.chapter === chapter); if (episode) choose(episode, false, false); } });
  }
  function chapterVideo(host, data) {
    const episode = data.episodes.find((row) => row.chapter === host.dataset.chapter);
    if (!episode) { host.replaceChildren(h("p", { class: "nqv-fallback" }, "這章的短片暫時無法顯示。", h("a", { href: NQ.url("videos/"), text: "前往短片教室 →" }))); return; }
    const state = h("span", { class: "nqv-chapter-state", text: watchLabel(episode) });
    const disclosure = h("details", { class: "nqv-chapter-disclosure" },
      h("summary", {}, h("img", { src: NQ.url(episode.poster), alt: "", loading: "lazy" }),
        h("span", { class: "nqv-chapter-copy" }, h("span", { class: "nqv-small-label", text: `先看 ${V.formatTime(episode.duration)}，抓住這章直覺` }),
          h("strong", { text: episode.title }), h("small", { text: "AI 語音 · 繁體中文字幕 · 可讀逐字稿" }), state),
        h("span", { class: "nqv-chapter-open", text: "展開影片", "aria-hidden": "true" })));
    const slot = h("div", { class: "nqv-chapter-player" });
    disclosure.append(slot);
    let activePlayer;
    disclosure.addEventListener("toggle", () => {
      disclosure.querySelector(".nqv-chapter-open").textContent = disclosure.open ? "收合影片" : "展開影片";
      if (disclosure.open && !activePlayer) activePlayer = player(slot, episode, data, () => { state.textContent = watchLabel(episode); });
      else if (!disclosure.open && activePlayer) activePlayer.pause();
    });
    host.replaceChildren(disclosure);
  }
  let pending;
  function load() {
    if (!pending) {
      pending = Promise.all([NQ.fetchJSON("assets/videos/manifest.json"), NQ.loadChapters().catch(() => []), NQ.fetchJSON("assets/learning/course.json").catch(() => ({}))]).then(([manifest, chapters, course]) => {
        const episodes = V.normalizeEpisodes(manifest);
        if (!episodes.length) throw new Error("No playable episodes");
        return { manifest, episodes, chapters, course };
      });
      pending.catch(() => { pending = null; });
    }
    return pending;
  }
  async function mount(host) {
    try {
      const data = await load();
      if (!host.isConnected) return;
      if (host.matches(".nq-video-library")) library(host, data); else chapterVideo(host, data);
    } catch (error) {
      if (!host.isConnected) return;
      const retry = h("button", { type: "button", text: "重新載入", onclick: () => { retry.disabled = true; mount(host); } });
      host.replaceChildren(h("div", { class: "nqv-fallback", role: "status" },
        h("p", { text: "短片暫時無法載入。可以先用白話例子學習，稍後再回來觀看。" }),
        h("a", { href: NQ.url("start/first-option/"), text: "先讀第一課 →" }), retry));
    }
  }
  if (!root.document) return;
  function cleanup() { players.forEach((entry) => { if (!entry.host.isConnected) entry.dispose(); }); }
  NQ.onPage(() => {
    cleanup();
    root.document.querySelectorAll(".nq-video-library, .nq-chapter-video[data-chapter]").forEach((host) => {
      if (NQ.claim(host, "nqVideo")) mount(host);
    });
  });
  // Material replaces article DOM without unloading the window; stop detached audio promptly.
  const observer = new root.MutationObserver(cleanup);
  observer.observe(root.document.documentElement, { childList: true, subtree: true });
  root.addEventListener("pagehide", () => players.forEach((entry) => entry.pause()));
  root.addEventListener("popstate", () => {
    root.document.querySelectorAll(".nq-video-library").forEach((host) => { const entry = libraries.get(host); if (entry) entry.choose(selectedQuery()); });
  });
})(typeof window !== "undefined" ? window : globalThis);
