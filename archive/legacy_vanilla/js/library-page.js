// library-page.js
// Library page rendering for browse, saved stories, favorites, bookmarks, and downloads.

(function () {
  "use strict";

  const els = {
    summary: document.getElementById("librarySummary"),
    searchInput: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),
    genreList: document.getElementById("genreList"),
    sortSelect: document.getElementById("sortSelect"),
    featuredContainer: document.getElementById("featuredContainer"),
    libraryGrid: document.getElementById("libraryGrid"),
    libraryEmpty: document.getElementById("libraryEmpty"),
    savedGrid: document.getElementById("savedGrid"),
    savedEmpty: document.getElementById("savedEmpty"),
    favoritesGrid: document.getElementById("favoritesGrid"),
    favoritesEmpty: document.getElementById("favoritesEmpty"),
    bookmarksGrid: document.getElementById("bookmarksGrid"),
    bookmarksEmpty: document.getElementById("bookmarksEmpty"),
    downloadsGrid: document.getElementById("downloadsGrid"),
    downloadsEmpty: document.getElementById("downloadsEmpty")
  };

  let allStories = [];
  let activeGenre = "all";
  let user = null;

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function safeGetUser() {
    if (typeof getUser === "function") return getUser();
    try { return JSON.parse(localStorage.getItem("nive_user") || "{}"); } catch { return {}; }
  }

  async function loadStories() {
    if (typeof getAllStories === "function") return getAllStories();
    if (typeof getStories === "function") return getStories();
    const response = await fetch("data/stories.json", { cache: "no-store" });
    return response.ok ? response.json() : [];
  }

  function storyStats(story) {
    return [
      story.genre,
      story.rating ? `${story.rating} stars` : "",
      story.premium ? "Premium" : "Free",
      story.featured ? "Featured" : ""
    ].filter(Boolean).join(" / ");
  }

  function storyById(id) {
    return allStories.find(story => String(story.id) === String(id)) || null;
  }

  function progressFor(story) {
    return Number(user?.readingProgress?.[story.id] || 0);
  }

  function sortStories(list) {
    const mode = els.sortSelect.value;
    const sorted = list.slice();
    if (mode === "alpha") sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (mode === "recent") sorted.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    else if (mode === "rating") sorted.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    else if (mode === "progress") sorted.sort((a, b) => progressFor(b) - progressFor(a));
    else sorted.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(b.rating || 0) - Number(a.rating || 0));
    return sorted;
  }

  function filteredStories() {
    const query = (els.searchInput.value || "").trim().toLowerCase();
    let list = allStories.slice();

    if (activeGenre !== "all") list = list.filter(story => story.genre === activeGenre);
    if (query) {
      list = list.filter(story => {
        return (story.title || "").toLowerCase().includes(query)
          || (story.author || "").toLowerCase().includes(query)
          || (story.genre || "").toLowerCase().includes(query)
          || (story.description || "").toLowerCase().includes(query);
      });
    }

    return sortStories(list);
  }

  function buildGenres() {
    const genres = ["all", ...Array.from(new Set(allStories.map(story => story.genre).filter(Boolean))).sort()];
    els.genreList.innerHTML = genres.map(genre => `
      <button class="category ${genre === activeGenre ? "active" : ""}" type="button" data-genre="${escapeAttr(genre)}">
        ${escapeHtml(genre)}
      </button>
    `).join("");
  }

  function createStoryCard(story) {
    const progress = progressFor(story);
    const card = document.createElement("article");
    card.className = "library-card";
    card.tabIndex = 0;
    card.innerHTML = `
      <img class="library-cover" src="${escapeAttr(story.cover || "assets/covers/default.png")}" alt="${escapeAttr(story.title || "Story cover")}">
      <div class="library-card-body">
        <div class="story-title">${escapeHtml(story.title || "Untitled")}</div>
        <div class="story-author">${escapeHtml(story.author || "Unknown author")}</div>
        <div class="story-description">${escapeHtml((story.description || "").slice(0, 96))}${(story.description || "").length > 96 ? "..." : ""}</div>
        <div class="story-stats">${escapeHtml(storyStats(story))}</div>
        ${progress ? `<div class="library-progress"><span style="width:${Math.min(100, progress)}%"></span></div>` : ""}
      </div>
    `;

    card.addEventListener("click", () => location.href = `story.html?id=${encodeURIComponent(story.id)}`);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
    return card;
  }

  function renderGrid(grid, empty, stories) {
    grid.innerHTML = "";
    empty.hidden = stories.length > 0;
    if (!stories.length) {
      empty.classList.add("empty-state");
      if (!empty.querySelector("strong")) {
        empty.innerHTML = `<strong>No stories found</strong><span>Try a different filter or search term.</span>`;
      }
      return;
    }

    const fragment = document.createDocumentFragment();
    stories.forEach(story => fragment.appendChild(createStoryCard(story)));
    grid.appendChild(fragment);
  }

  function renderFeatured() {
    const featured = allStories.filter(story => story.featured).slice(0, 5);
    if (!featured.length) {
      els.featuredContainer.innerHTML = "";
      return;
    }

    const lead = featured[0];
    els.featuredContainer.innerHTML = `
      <section class="featured-library card">
        <img src="${escapeAttr(lead.banner || lead.cover || "assets/covers/default.png")}" alt="${escapeAttr(lead.title)}">
        <div class="featured-library-copy">
          <div class="story-stats">Featured / ${escapeHtml(storyStats(lead))}</div>
          <h2>${escapeHtml(lead.title)}</h2>
          <p>${escapeHtml((lead.description || "").slice(0, 190))}${(lead.description || "").length > 190 ? "..." : ""}</p>
          <button class="btn small" type="button" data-featured-id="${escapeAttr(lead.id)}">Read</button>
        </div>
      </section>
    `;
  }

  function renderBookmarks() {
    const bookmarks = Array.isArray(user.bookmarks) ? user.bookmarks : [];
    const items = bookmarks.map(key => {
      const [storyId, chapterPart] = String(key).split("-chapter-");
      const story = storyById(storyId);
      if (!story) return null;
      return { story, chapterId: chapterPart || "" };
    }).filter(Boolean);

    els.bookmarksGrid.innerHTML = "";
    els.bookmarksEmpty.hidden = items.length > 0;
    if (!items.length) return;

    els.bookmarksGrid.innerHTML = items.map(item => `
      <a class="bookmark-item" href="reader.html?id=${encodeURIComponent(item.story.id)}&chapter=${encodeURIComponent(item.chapterId)}">
        <img src="${escapeAttr(item.story.cover || "assets/covers/default.png")}" alt="">
        <div>
          <strong>${escapeHtml(item.story.title)}</strong>
          <span>Chapter ${escapeHtml(item.chapterId || "saved")}</span>
        </div>
        <span class="material-symbols-rounded">chevron_right</span>
      </a>
    `).join("");
  }

  function renderSavedSections() {
    const savedIds = Array.isArray(user.library) ? user.library : [];
    const favoriteIds = Array.isArray(user.favorites) ? user.favorites : [];
    const downloadedIds = typeof getOfflineStories === "function" ? getOfflineStories() : [];

    renderGrid(els.savedGrid, els.savedEmpty, savedIds.map(storyById).filter(Boolean));
    renderGrid(els.favoritesGrid, els.favoritesEmpty, favoriteIds.map(storyById).filter(Boolean));
    renderGrid(els.downloadsGrid, els.downloadsEmpty, downloadedIds.map(storyById).filter(Boolean));
    renderBookmarks();
    renderReadingLists();
  }

  function renderReadingLists() {
    const root = document.getElementById("libraryReadingListsGrid");
    if (!root) return;
    const lists = window.NiveSocial ? window.NiveSocial.getReadingLists() : [];
    root.innerHTML = lists.length ? lists.map(list => `
      <article class="reading-list-card">
        <div>
          <div class="reading-list-top">
            <img src="${escapeHtml(list.avatar || 'assets/avatars/avatar1.png')}" alt="">
            <span class="small muted">${escapeHtml(list.owner || 'Community')}</span>
          </div>
          <div class="reading-list-title">${escapeHtml(list.title)}</div>
          <div class="reading-list-desc">${escapeHtml(list.description)}</div>
        </div>
        <div class="reading-list-meta">
          <span>📖 ${(list.storyIds || []).length} stories</span>
          <button class="btn small ghost" data-action="open-social" type="button">Social Community</button>
        </div>
      </article>
    `).join("") : '<div class="empty-note muted">No reading lists found.</div>';
  }

  document.addEventListener("click", event => {
    if (event.target.closest('[data-action="open-social"]')) {
      location.href = "social.html";
    }
  });

  function renderAll() {
    const list = filteredStories();
    renderGrid(els.libraryGrid, els.libraryEmpty, list);
    renderSavedSections();
    els.summary.textContent = `${allStories.length} stories / ${list.length} visible / ${Array.isArray(user.library) ? user.library.length : 0} saved`;
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", renderAll);
    els.clearSearch.addEventListener("click", () => {
      els.searchInput.value = "";
      renderAll();
      els.searchInput.focus();
    });
    els.sortSelect.addEventListener("change", renderAll);
    els.genreList.addEventListener("click", event => {
      const button = event.target.closest("[data-genre]");
      if (!button) return;
      activeGenre = button.dataset.genre || "all";
      buildGenres();
      renderAll();
    });
    els.featuredContainer.addEventListener("click", event => {
      const button = event.target.closest("[data-featured-id]");
      if (!button) return;
      location.href = `story.html?id=${encodeURIComponent(button.dataset.featuredId)}`;
    });
  }

  async function init() {
    user = safeGetUser();
    allStories = (await loadStories()).filter(story => story && story.id);
    buildGenres();
    renderFeatured();
    bindEvents();
    renderAll();
    if (typeof renderNavigation === "function") renderNavigation("library");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
