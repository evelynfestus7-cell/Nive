/* story.js — Story detail page logic
   - Loads story metadata and chapters
   - Handles library, favorites, download, premium unlock
   - Renders chapter preview with choices
*/
(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const STORY_ID = params.get("id");

  const startBtn = document.getElementById("startReadingBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const addBtn = document.getElementById("addToLibraryBtn");
  const favoriteBtn = document.getElementById("favoriteBtn");
  const progressFill = document.getElementById("storyProgress");
  const chaptersList = document.getElementById("chaptersList");
  const choicesContainer = document.getElementById("choicesContainer");

  let currentStory = null;
  let storyChapters = [];

  function buildReaderUrl(chapterId) {
    const url = new URL("reader.html", location.href);
    url.searchParams.set("id", STORY_ID);
    if (chapterId) url.searchParams.set("chapter", chapterId);
    return url.toString();
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

  /* Load story metadata and chapters */
  async function loadStory() {
    if (!STORY_ID) {
      document.body.innerHTML = '<h2 style="text-align:center;padding:40px">No story selected</h2>';
      return;
    }

    const user = getUser();

    if (typeof getStory === "function") {
      currentStory = await getStory(STORY_ID);
    } else {
      const stories = typeof getCustomStories === "function" ? getCustomStories() : [];
      currentStory = stories.find(s => normalizeId(s.id) === normalizeId(STORY_ID));
    }

    if (!currentStory) {
      document.body.innerHTML = '<h2 style="text-align:center;padding:40px">Story not found</h2>';
      return;
    }

    // Basic metadata
    document.title = (currentStory.title || "Story") + " — Nive";
    document.getElementById("storyGenre").textContent = currentStory.genre || "";
    document.getElementById("storyTitle").textContent = currentStory.title || "";
    document.getElementById("storyAuthor").textContent = "By " + (currentStory.author || "Unknown");

    const authorAvatar = document.getElementById("storyAuthorAvatar");
    if (currentStory.avatar) {
      authorAvatar.style.display = "block";
      authorAvatar.style.backgroundImage = `url('${currentStory.avatar}')`;
    } else {
      authorAvatar.style.display = "none";
    }

    document.getElementById("storyDescription").textContent = currentStory.description || "";
    document.getElementById("storyRating").textContent = "★★★★★ " + (currentStory.rating || 0);
    document.getElementById("banner").style.backgroundImage =
      `url('${currentStory.banner || currentStory.cover || "assets/covers/default.png"}')`;

    // Characters
    const charactersList = document.getElementById("charactersList");
    charactersList.innerHTML = "";
    (currentStory.characters || []).forEach(c => {
      const div = document.createElement("div");
      div.className = "character";
      div.innerHTML = `<div class="avatar" style="background-image:url('${c.avatar || ""}')"></div><div><strong>${escapeHtml(c.name)}</strong><br>${escapeHtml(c.role || "")}</div>`;
      charactersList.appendChild(div);
    });
    if ((currentStory.characters || []).length === 0) {
      charactersList.innerHTML = '<div class="empty-note">No characters defined for this story.</div>';
    }

    // Achievements (story-specific)
    const achievementsList = document.getElementById("achievementsList");
    achievementsList.innerHTML = "";
    (currentStory.achievements || []).forEach(a => {
      const div = document.createElement("div");
      div.className = "achievement-card";
      div.textContent = a;
      achievementsList.appendChild(div);
    });
    if ((currentStory.achievements || []).length === 0) {
      achievementsList.innerHTML = '<div class="empty-note">No achievements defined for this story.</div>';
    }

    // Chapters
    if (typeof getChapters === "function") {
      storyChapters = await getChapters(STORY_ID);
    } else {
      const chapters = typeof getCustomChapters === "function" ? getCustomChapters() : {};
      storyChapters = Array.isArray(chapters[STORY_ID]) ? chapters[STORY_ID].slice() : [];
    }
    chaptersList.innerHTML = "";
    if (storyChapters.length === 0) {
      chaptersList.innerHTML = '<div class="empty-note">No chapters yet. Add chapters in the Admin panel.</div>';
    } else {
      storyChapters.forEach((ch, idx) => {
        const div = document.createElement("div");
        div.className = "chapter-item";
        div.textContent = ch.title || `Chapter ${idx + 1}`;
        div.onclick = () => renderChapterByIndex(idx);
        chaptersList.appendChild(div);
      });
    }

    // Ensure user arrays exist
    user.library = user.library || [];
    user.favorites = user.favorites || [];
    user.readingProgress = user.readingProgress || {};
    user.lastChapter = user.lastChapter || {};
    user.unlockedStories = user.unlockedStories || [];
    saveUser(user);

    // Update UI states
    addBtn.textContent = user.library.includes(STORY_ID) ? "✓ In Library" : "Add To Library";
    favoriteBtn.textContent = user.favorites.includes(STORY_ID) ? "♥ Favorited" : "♡ Add To Favorites";
    progressFill.style.width = (user.readingProgress?.[STORY_ID] || 0) + "%";
    updateDownloadButton();
    updateStartButton();

    // Auto-resume preview
    const lastSaved = user.lastChapter?.[STORY_ID];
    if (storyChapters.length > 0) {
      if (lastSaved) {
        const byIdIndex = storyChapters.findIndex(c => normalizeId(c.id) === normalizeId(lastSaved));
        if (byIdIndex !== -1) { renderChapterByIndex(byIdIndex); return; }
        const asIndex = Number(lastSaved);
        if (!isNaN(asIndex) && storyChapters[asIndex]) { renderChapterByIndex(asIndex); return; }
      }
      renderChapterByIndex(0);
    }
  }

  /* Update Start Reading button (handles premium/unlock) */
  function updateStartButton() {
    const user = getUser();
    const unlocked = (user.unlockedStories || []).includes(STORY_ID);
    if (currentStory.premium && !unlocked) {
      startBtn.textContent = "Unlock Story (200 Coins)";
      startBtn.onclick = function () {
        const u = getUser();
        if ((u.coins || 0) < 200) {
          showToast("Not enough coins to unlock this story.");
          return;
        }
        u.coins = (u.coins || 0) - 200;
        u.unlockedStories = u.unlockedStories || [];
        if (!u.unlockedStories.includes(STORY_ID)) u.unlockedStories.push(STORY_ID);
        saveUser(u);
        showToast("Story unlocked! 🎉");
        updateStartButton();
      };
    } else {
      startBtn.textContent = "Start Reading";
      startBtn.onclick = function () {
        const u = getUser();
        const last = u.lastChapter?.[STORY_ID];
        let chapterId = null;
        if (last) {
          const byId = storyChapters.find(c => normalizeId(c.id) === normalizeId(last));
          if (byId) chapterId = normalizeId(last);
          else {
            const idx = Number(last);
            if (!isNaN(idx) && storyChapters[idx]) chapterId = normalizeId(storyChapters[idx].id);
          }
        }
        if (!chapterId && storyChapters.length > 0) chapterId = normalizeId(storyChapters[0].id);
        location.href = buildReaderUrl(chapterId);
      };
    }
  }

  /* Render chapter preview by index */
  function renderChapterByIndex(index) {
    const chapter = storyChapters[index];
    if (!chapter) return;
    renderChapter(chapter, index);
  }

  /* Render chapter preview and save progress */
  function renderChapter(chapter, index) {
    document.getElementById("chapterTitle")?.remove();
    document.getElementById("chapterContent")?.remove();

    const titleEl = document.createElement("h2");
    titleEl.id = "chapterTitle";
    titleEl.textContent = chapter.title || `Chapter ${index + 1}`;

    const contentEl = document.createElement("p");
    contentEl.id = "chapterContent";
    contentEl.innerHTML = sanitizeChapterHtml(chapter.content || "");

    chaptersList.insertAdjacentElement("beforebegin", titleEl);
    chaptersList.insertAdjacentElement("beforebegin", contentEl);

    // Save progress
    const user = getUser();
    user.lastChapter = user.lastChapter || {};
    user.lastChapter[STORY_ID] = normalizeId(chapter.id ?? index);
    user.readingProgress = user.readingProgress || {};
    user.readingProgress[STORY_ID] = Math.round(((index + 1) / Math.max(1, storyChapters.length)) * 100);
    saveUser(user);

    progressFill.style.width = user.readingProgress[STORY_ID] + "%";

    // Render choices preview
    choicesContainer.innerHTML = "";
    (chapter.choices || []).forEach(choice => {
      const btn = document.createElement("button");
      btn.textContent = choice.text || "Choice";
      btn.onclick = () => {
        const nextIndex = storyChapters.findIndex(c => normalizeId(c.id) === normalizeId(choice.next));
        if (nextIndex !== -1) renderChapterByIndex(nextIndex);
        else showToast("Next chapter not found. Check chapter IDs in the Admin panel.");
      };
      choicesContainer.appendChild(btn);
    });
    if ((chapter.choices || []).length === 0) {
      const note = document.createElement("div");
      note.className = "empty-note";
      note.textContent = "This chapter has no choices. Readers will see a Finish button in the reader.";
      choicesContainer.appendChild(note);
    }
  }

  /* Library button */
  addBtn.addEventListener("click", function () {
    const user = getUser();
    user.library = user.library || [];
    if (!user.library.includes(STORY_ID)) {
      user.library.push(STORY_ID);
      saveUser(user);
      addBtn.textContent = "✓ In Library";
      showToast("Added to your library!");
      if (typeof checkAchievements === "function") checkAchievements();
    }
  });

  /* Favorite button */
  favoriteBtn.addEventListener("click", function () {
    const user = getUser();
    user.favorites = user.favorites || [];
    if (user.favorites.includes(STORY_ID)) {
      user.favorites = user.favorites.filter(id => id !== STORY_ID);
      favoriteBtn.textContent = "♡ Add To Favorites";
      showToast("Removed from favorites.");
    } else {
      user.favorites.push(STORY_ID);
      favoriteBtn.textContent = "♥ Favorited";
      showToast("Added to favorites! ❤️");
    }
    saveUser(user);
    if (typeof checkAchievements === "function") checkAchievements();
  });

  /* Download button */
  downloadBtn.addEventListener("click", async function () {
    if (typeof downloadStory === "function") {
      const success = await downloadStory(STORY_ID);
      if (success) {
        updateDownloadButton();
        showToast("Story downloaded for offline reading! 📥");
        if (typeof checkAchievements === "function") checkAchievements();
      } else {
        showToast("Download failed. Please try again.");
      }
    } else {
      showToast("Download not available in this build.");
    }
  });

  function updateDownloadButton() {
    const downloaded = (typeof isStoryDownloaded === "function") ? isStoryDownloaded(STORY_ID) : false;
    if (downloaded) {
      downloadBtn.textContent = "✓ Downloaded";
      downloadBtn.classList.add("downloaded");
    } else {
      downloadBtn.textContent = "Download";
      downloadBtn.classList.remove("downloaded");
    }
  }

  /* Initialize */
  document.addEventListener("DOMContentLoaded", loadStory);
})();
