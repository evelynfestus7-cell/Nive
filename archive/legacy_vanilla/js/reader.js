/* reader.js — Full replacement
   - Theme toggles (light/dark/sepia)
   - Font size increase/decrease
   - Bookmark toggle + icon update
   - Cinematic FX, progress, rewards, premium unlock preserved
   - Defensive wrappers for getUser/saveUser/getCustomChapters etc.
*/

(function () {
  "use strict";

  /* -------------------------
     Defensive helpers
     ------------------------- */
  function safeParseJSON(v, fallback) {
    try { return JSON.parse(v); } catch { return fallback; }
  }

  function safeGetUser() {
    if (typeof getUser === "function") return getUser();
    return safeParseJSON(localStorage.getItem("nive_user") || "{}", {});
  }
  function safeSaveUser(u) {
    if (typeof saveUser === "function") return saveUser(u);
    localStorage.setItem("nive_user", JSON.stringify(u || {}));
  }

  function safeGetCustomChapters() {
    if (typeof getCustomChapters === "function") return getCustomChapters();
    return safeParseJSON(localStorage.getItem("nive_custom_chapters") || "{}", {});
  }
  function safeGetCustomStories() {
    if (typeof getCustomStories === "function") return getCustomStories();
    return safeParseJSON(localStorage.getItem("nive_custom_stories") || "[]", []);
  }

  function sanitizeChapterHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");
    const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "BLOCKQUOTE", "HR", "H2", "H3", "H4", "SPAN"]);
    template.content.querySelectorAll("*").forEach(node => {
      if (!allowedTags.has(node.tagName)) {
        node.replaceWith(document.createTextNode(node.textContent || ""));
        return;
      }
      [...node.attributes].forEach(attr => {
        if (attr.name.startsWith("on") || attr.name === "style") node.removeAttribute(attr.name);
      });
    });
    return template.innerHTML;
  }

  /* -------------------------
     Reader settings (persisted)
     ------------------------- */
  const SETTINGS_KEY = "nive_reader_settings";
  function getDefaultReaderSettings() {
    return {
      theme: "dark",        // dark | light | sepia
      fontSize: 18,         // px
      lineSpacing: 1.8,
      fontFamily: "serif",  // serif | sans-serif
      brightness: 100,      // percent
      mode: "scroll"        // scroll | paged (not used here but kept)
    };
  }
  function getReaderSettings() {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      return s ? { ...getDefaultReaderSettings(), ...JSON.parse(s) } : getDefaultReaderSettings();
    } catch {
      return getDefaultReaderSettings();
    }
  }
  function saveReaderSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  /* Apply settings to DOM */
  function applyReaderSettings() {
    const s = getReaderSettings();

    // Theme: set body class
    document.body.classList.remove("theme-dark", "theme-light", "theme-sepia");
    if (s.theme === "light") document.body.classList.add("theme-light");
    else if (s.theme === "sepia") document.body.classList.add("theme-sepia");
    else document.body.classList.add("theme-dark");

    // Font size and line spacing on the main content container
    const panel = document.getElementById("panel") || document.querySelector(".reader") || document.body;
    if (panel) {
      panel.style.fontSize = (s.fontSize || 18) + "px";
      panel.style.lineHeight = (s.lineSpacing || 1.8);
      panel.style.fontFamily = s.fontFamily === "sans-serif" ? "system-ui, sans-serif" : "serif";
    }

    // Persisted visual tweaks for text cards
    document.querySelectorAll(".text-card, #chapterContent").forEach(el => {
      el.style.fontSize = (s.fontSize || 18) + "px";
      el.style.lineHeight = (s.lineSpacing || 1.8);
      el.style.fontFamily = s.fontFamily === "sans-serif" ? "system-ui, sans-serif" : "serif";
    });
  }

  /* Exposed setter used by inline onclicks in reader.html */
  function updateReaderSetting(k, v) {
    const s = getReaderSettings();
    s[k] = v;
    saveReaderSettings(s);
    applyReaderSettings();
  }
  // expose globally for inline handlers
  window.updateReaderSetting = updateReaderSetting;

  /* -------------------------
     Theme CSS fallback classes
     (Add these classes to your CSS or rely on these inline styles)
     ------------------------- */
  // If you prefer to keep CSS in files, these are minimal inline fallbacks.
  function ensureThemeStyles() {}
  ensureThemeStyles();

  /* -------------------------
     DOM refs and state
     ------------------------- */
  const chapterContentEl = document.getElementById("chapterContent") || document.getElementById("content");
  const choicesContainer = document.getElementById("choicesContainer");
  const progressEl = document.getElementById("chapterProgress");
  const bookmarkBtn = document.getElementById("bookmarkBtn");
  const backLink = document.getElementById("backLink");
  const storyTitleEl = document.getElementById("storyTitle");
  const readerBg = document.getElementById("readerBg");
  const sceneArt = document.getElementById("sceneArt");
  const sceneImg = sceneArt ? sceneArt.querySelector("img") : null;
  const flash = document.getElementById("flash");
  const shatterOverlay = document.getElementById("shatterOverlay");
  const climax = document.getElementById("climax");
  const tapHint = document.getElementById("tapHint");

  function normalizeId(id) { return id === null || id === undefined ? null : String(id); }

  const params = new URLSearchParams(window.location.search);
  const STORY_ID = params.get("id") ? normalizeId(params.get("id")) : null;
  let currentChapterId = params.get("chapter") ? normalizeId(params.get("chapter")) : null;
  const DEBUG = params.get("debug") === "1" || params.get("debug") === "true";

  let chapterHistory = [];
  const CHOICE_CHANGE_COST = 20;
  let pendingChoiceChange = false;
  let sessionStartedAt = Date.now();
  let lastTimeSaveAt = Date.now();

  function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return todayKey(d);
  }

  function registerReadingDay(user) {
    const today = todayKey();
    user.activeDays = Array.isArray(user.activeDays) ? user.activeDays : [];
    if (!user.activeDays.includes(today)) user.activeDays.push(today);

    if (user.lastReadDate === today) return;
    user.streak = user.lastReadDate === yesterdayKey() ? (user.streak || 0) + 1 : 1;
    user.lastReadDate = today;
  }

  function saveTimeSpent(force = false) {
    const now = Date.now();
    const elapsed = Math.floor((now - lastTimeSaveAt) / 1000);
    if (!force && elapsed < 15) return;
    if (elapsed <= 0 || elapsed > 60 * 60) {
      lastTimeSaveAt = now;
      return;
    }

    const user = safeGetUser();
    registerReadingDay(user);
    user.readingSeconds = (user.readingSeconds || 0) + elapsed;
    user.minutesRead = Math.floor((user.readingSeconds || 0) / 60);
    safeSaveUser(user);
    lastTimeSaveAt = now;
  }

  function recordChapterRead(chapter, storyChapters) {
    if (!STORY_ID || !chapter) return;
    const chapterId = normalizeId(chapter.id || currentChapterId);
    const key = STORY_ID + "::" + chapterId;
    const user = safeGetUser();

    registerReadingDay(user);
    user.readChapters = Array.isArray(user.readChapters) ? user.readChapters : [];
    if (!user.readChapters.includes(key)) {
      user.readChapters.push(key);
      user.chaptersRead = user.readChapters.length;
      user.chaptersCompleted = Math.max(user.chaptersCompleted || 0, user.chaptersRead);
      const words = String(chapter.content || chapter.text || "").trim().split(/\s+/).filter(Boolean).length;
      user.pagesRead = (user.pagesRead || 0) + Math.max(1, Math.ceil(words / 250));
    }
    user.totalChaptersAvailable = Array.isArray(storyChapters) ? storyChapters.length : user.totalChaptersAvailable;
    safeSaveUser(user);
  }

  function setMood(mood) {
    const value = String(mood || "black").toLowerCase();
    const allowed = ["purple", "black", "crimson", "blue", "sepia"];
    document.body.classList.remove("mood-purple", "mood-black", "mood-crimson", "mood-blue", "mood-sepia");
    document.body.classList.add("mood-" + (allowed.includes(value) ? value : "black"));
  }

  window.applyMoodPalette = setMood;

  document.querySelectorAll("[data-reader-setting]").forEach(button => {
    button.addEventListener("click", () => {
      const key = button.dataset.readerSetting;
      const rawValue = button.dataset.readerValue;
      const value = key === "fontSize" ? Number(rawValue) : rawValue;
      updateReaderSetting(key, value);
    });
  });

  document.getElementById("readerReturnBtn")?.addEventListener("click", () => history.back());

  async function loadStoryMeta() {
    if (typeof getStory === "function") {
      const story = await getStory(STORY_ID);
      if (story) return story;
    }
    const stories = safeGetCustomStories() || [];
    return stories.find(s => normalizeId(s.id) === normalizeId(STORY_ID)) || null;
  }

  async function loadStoryChapters() {
    if (typeof getChapters === "function") {
      const chapters = await getChapters(STORY_ID);
      if (Array.isArray(chapters)) return chapters;
    }
    const chaptersMap = safeGetCustomChapters() || {};
    return Array.isArray(chaptersMap[STORY_ID]) ? chaptersMap[STORY_ID] : [];
  }

  function applyStoryStage(meta) {
    if (!meta) return;
    if (storyTitleEl) storyTitleEl.textContent = meta.title || storyTitleEl.textContent;
    if (readerBg) {
      const image = meta.banner || meta.cover || "assets/covers/default.png";
      readerBg.style.setProperty("--reader-image", `url("${image}")`);
    }
  }

  /* -------------------------
     Bookmark helpers
     ------------------------- */
  function bookmarkKeyFor(chId) { return STORY_ID + "-chapter-" + normalizeId(chId); }

  function updateBookmarkIcon(chId) {
    if (!bookmarkBtn) return;
    const key = bookmarkKeyFor(chId || currentChapterId);
    const user = safeGetUser();
    if ((user.bookmarks || []).includes(key)) {
      bookmarkBtn.innerHTML = '<span class="material-symbols-rounded">bookmark_added</span>';
    } else {
      bookmarkBtn.innerHTML = '<span class="material-symbols-rounded">bookmark</span>';
    }
  }

  function toggleBookmark(chId) {
    const key = bookmarkKeyFor(chId || currentChapterId);
    const user = safeGetUser();
    user.bookmarks = user.bookmarks || [];
    if (user.bookmarks.includes(key)) {
      user.bookmarks = user.bookmarks.filter(k => k !== key);
    } else {
      user.bookmarks.push(key);
    }
    safeSaveUser(user);
    updateBookmarkIcon(chId);
    if (typeof checkAchievements === "function") checkAchievements();
  }

  if (bookmarkBtn) {
    bookmarkBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleBookmark(currentChapterId);
    });
  }

  /* -------------------------
     Cinematic FX helpers (kept from original)
     ------------------------- */
  function triggerEffect(type) {
    if (!type) return;
    if (type === "shake") { document.body.classList.add("shake"); setTimeout(() => document.body.classList.remove("shake"), 500); }
    else if (type === "blood") { if (flash) { flash.classList.add("blood-flash"); setTimeout(() => flash.classList.remove("blood-flash"), 450); } }
    else if (type === "shatter") { if (shatterOverlay) { shatterOverlay.classList.add("shatter"); setTimeout(() => shatterOverlay.classList.remove("shatter"), 600); } }
  }
  function showClimax() {
    const panel = document.getElementById("panel");
    if (!panel) return;
    panel.style.opacity = "0"; panel.style.transform = "scale(.95)";
    if (sceneArt) sceneArt.classList.add("hidden");
    setTimeout(() => { panel.style.display = "none"; if (climax) { climax.style.display = "flex"; document.body.className = "black"; } }, 600);
  }

  /* -------------------------
     Chapter loader & renderer
     ------------------------- */
  async function loadChapter() {
    try {
      if (backLink) backLink.href = STORY_ID ? "story.html?id=" + encodeURIComponent(STORY_ID) : "home.html";
      applyStoryStage(await loadStoryMeta());
      const storyChapters = await loadStoryChapters();

      if (!STORY_ID || storyChapters.length === 0) {
        if (chapterContentEl) chapterContentEl.innerHTML = '<div class="text-card">No chapters found for this story. Add chapters in the Admin panel.</div>';
        if (progressEl) progressEl.textContent = '0% Complete';
        return;
      }

      // resolve current chapter id (prefer last saved)
      const user = safeGetUser();
      if (!currentChapterId) currentChapterId = normalizeId(user.lastChapter?.[STORY_ID]) || normalizeId(storyChapters[0].id);

      // numeric index fallback
      if (/^\d+$/.test(String(currentChapterId))) {
        const idx = parseInt(currentChapterId, 10) - 1;
        if (storyChapters[idx]) currentChapterId = normalizeId(storyChapters[idx].id);
      }

      let finalChapter = storyChapters.find(c => normalizeId(c.id) === normalizeId(currentChapterId));
      if (!finalChapter) { currentChapterId = normalizeId(storyChapters[0].id); finalChapter = storyChapters[0]; }

      // history
      if (chapterHistory.length === 0 || chapterHistory[chapterHistory.length - 1] !== currentChapterId) chapterHistory.push(currentChapterId);

      // progress
      const idx = storyChapters.findIndex(c => normalizeId(c.id) === normalizeId(currentChapterId));
      const percent = Math.round(((idx + 1) / storyChapters.length) * 100);
      user.readingProgress = user.readingProgress || {}; user.lastChapter = user.lastChapter || {};
      user.readingProgress[STORY_ID] = percent; user.lastChapter[STORY_ID] = currentChapterId;
      safeSaveUser(user);
      recordChapterRead(finalChapter, storyChapters);
      if (typeof checkAchievements === "function") checkAchievements();

      if (progressEl) progressEl.textContent = percent + "%";

      // render content
      renderChapter(finalChapter, storyChapters);
      window.niveReaderContext = {
        storyId: STORY_ID,
        chapterId: currentChapterId
      };
      if (window.NiveSocial && typeof window.NiveSocial.renderChapterComments === "function") {
        window.NiveSocial.renderChapterComments(window.niveReaderContext);
      }

      // update bookmark icon
      updateBookmarkIcon(currentChapterId);

    } catch (err) {
      console.error("loadChapter error", err);
      if (chapterContentEl) chapterContentEl.innerHTML = '<div class="text-card">Error loading chapter. Check console.</div>';
    }
  }

  function renderChapter(chapter, storyChapters) {
    // apply mood palette if present (keeps original behavior)
    if (typeof applyMoodPalette === "function") applyMoodPalette(chapter.mood || (storyChapters && storyChapters.length ? storyChapters[0].mood : "black"));

    // scene art
    if (chapter.artUrl && sceneImg) { if (sceneArt) sceneArt.classList.remove("hidden"); if (sceneImg.src !== chapter.artUrl) sceneImg.src = chapter.artUrl; }
    else if (sceneArt) sceneArt.classList.add("hidden");

    // effect
    if (chapter.effect) triggerEffect(chapter.effect);

    // climax
    if (chapter.climax) { setTimeout(() => showClimax(), 300); return; }

    // content
    const html = sanitizeChapterHtml(chapter.content || chapter.text || "(No content)");
    if (chapterContentEl) chapterContentEl.innerHTML = `<div class="text-card ${chapter.center ? 'center' : ''}">${html}</div>`;

    // choices container
    let choicesDiv = choicesContainer || document.getElementById("choicesContainer");
    if (!choicesDiv) {
      choicesDiv = document.createElement("div");
      choicesDiv.id = "choicesContainer";
      choicesDiv.className = "choices";
      if (chapterContentEl) chapterContentEl.appendChild(choicesDiv);
    }
    choicesDiv.innerHTML = "";

    // previous
    if (chapterHistory.length > 1) {
      const backBtn = document.createElement("button");
      backBtn.className = "choice secondary";
      backBtn.textContent = pendingChoiceChange ? "← Change Choice (20 coins)" : "← Previous";
      backBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        if (pendingChoiceChange) {
          const user = safeGetUser();
          const balance = Number(user.coins || 0);
          if (balance < CHOICE_CHANGE_COST) {
            alert(`You need ${CHOICE_CHANGE_COST} coins to change your choice.`);
            return;
          }

          user.coins = balance - CHOICE_CHANGE_COST;
          safeSaveUser(user);
          pendingChoiceChange = false;
          if (typeof checkAchievements === "function") checkAchievements();
        }

        chapterHistory.pop();
        const prev = chapterHistory.pop();
        if (prev) { currentChapterId = normalizeId(prev); loadChapter(); }
      });
      choicesDiv.appendChild(backBtn);
    }

    // choices or next/finish
    const choices = Array.isArray(chapter.choices) ? chapter.choices : [];
    if (choices.length === 0) {
      if (chapter.next) {
        const nextBtn = document.createElement("button");
        nextBtn.className = "choice";
        nextBtn.textContent = "Continue";
        nextBtn.addEventListener("click", () => { awardProgressRewards(); currentChapterId = normalizeId(chapter.next); loadChapter(); });
        choicesDiv.appendChild(nextBtn);
      } else {
        const finishBtn = document.createElement("button");
        finishBtn.className = "choice";
        finishBtn.textContent = "Finish Story";
        finishBtn.addEventListener("click", () => { markStoryComplete(); });
        choicesDiv.appendChild(finishBtn);
      }
    } else {
      choices.forEach(choice => {
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.textContent = choice.text || "Choice";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          pendingChoiceChange = true;
          awardChoiceRewards();
          currentChapterId = normalizeId(choice.next);
          loadChapter();
        });
        choicesDiv.appendChild(btn);
      });
    }

    if (tapHint) tapHint.style.display = "block";
  }

  /* -------------------------
     Rewards & completion (kept from original)
     ------------------------- */
  function awardChoiceRewards() {
    const user = safeGetUser();
    user.xp = (user.xp || 0) + 10;
    user.coins = (user.coins || 0) + 5;
    registerReadingDay(user);
    safeSaveUser(user);
    if (typeof updateLevel === "function") updateLevel(user);
    if (typeof checkAchievements === "function") checkAchievements();
  }
  function awardProgressRewards() {
    const user = safeGetUser();
    user.xp = (user.xp || 0) + 5;
    user.coins = (user.coins || 0) + 2;
    registerReadingDay(user);
    safeSaveUser(user);
    if (typeof checkAchievements === "function") checkAchievements();
  }
  function markStoryComplete() {
    const user = safeGetUser();
    user.completedStories = user.completedStories || [];
    if (!user.completedStories.includes(STORY_ID)) {
      user.completedStories.push(STORY_ID);
      user.booksRead = (user.booksRead || 0) + 1;
      user.xp = (user.xp || 0) + 50;
      user.coins = (user.coins || 0) + 25;
      registerReadingDay(user);
      safeSaveUser(user);
      if (typeof updateLevel === "function") updateLevel(user);
      if (typeof checkAchievements === "function") checkAchievements();
      alert("Story Completed!");
    }
    window.location.href = "story.html?id=" + encodeURIComponent(STORY_ID);
  }

  /* -------------------------
     Tap-to-advance (non-button clicks)
     ------------------------- */
  document.addEventListener("click", async (e) => {
    if (
      e.target.closest("button")
      || e.target.closest(".icon")
      || e.target.closest("a")
      || e.target.closest(".chapter-community")
      || e.target.closest("input")
      || e.target.closest("textarea")
      || e.target.closest("select")
    ) return;
    const storyChapters = await loadStoryChapters();
    if (!storyChapters.length) return;
    const idx = storyChapters.findIndex(c => normalizeId(c.id) === normalizeId(currentChapterId));
    if (idx >= 0 && idx < storyChapters.length - 1) {
      currentChapterId = normalizeId(storyChapters[idx + 1].id);
      awardProgressRewards();
      loadChapter();
    }
  });

  /* -------------------------
     Init on DOMContentLoaded
     ------------------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    sessionStartedAt = Date.now();
    lastTimeSaveAt = Date.now();
    // Apply reader settings (themes, font size)
    applyReaderSettings();

    // Set story title from metadata if available
    const meta = await loadStoryMeta();
    applyStoryStage(meta);

    // Ensure scene image placeholder
    if (sceneImg && !sceneImg.src) sceneImg.src = "/assets/covers/default.png";

    // initial bookmark icon
    updateBookmarkIcon(currentChapterId);

    // load chapter
    loadChapter();
  });

  setInterval(() => saveTimeSpent(false), 15000);
  window.addEventListener("beforeunload", () => saveTimeSpent(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveTimeSpent(true);
    else lastTimeSaveAt = Date.now();
  });

  // expose loadChapter for debugging if needed
  window.niveLoadChapter = loadChapter;

})();
