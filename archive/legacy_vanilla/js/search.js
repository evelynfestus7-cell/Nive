// search.js
// Discover page: search, filters, sorting, recent searches, and story cards.

(function () {
  "use strict";

  const RECENT_KEY = "nive_recent_searches";

  const els = {
    searchInput: document.getElementById("searchInput"),
    clearBtn: document.getElementById("clearBtn"),
    results: document.getElementById("results"),
    noResults: document.getElementById("noResults"),
    genreGrid: document.getElementById("genreGrid"),
    sortSelect: document.getElementById("sortSelect"),
    recentList: document.getElementById("recentList"),
    filterDownloaded: document.getElementById("filterDownloaded"),
    filterPremium: document.getElementById("filterPremium"),
    filterFree: document.getElementById("filterFree"),
    filterFeatured: document.getElementById("filterFeatured"),
    resultSummary: document.getElementById("resultSummary")
  };

  let allStories = [];
  let activeGenre = "all";
  let recent = readJson(RECENT_KEY, []);

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

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

  function normalizePath(path) {
    if (!path) return "assets/covers/default.png";
    return (path.startsWith("/") || path.startsWith("http") || path.startsWith("data:")) ? path : path;
  }

  function debounce(fn, wait = 160) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function storyStats(story) {
    return [
      story.genre,
      story.rating ? `${story.rating} stars` : "",
      story.premium ? "Premium" : "Free",
      story.featured ? "Featured" : ""
    ].filter(Boolean).join(" / ");
  }

  function scoreStory(story, query) {
    if (!query) return Number(story.rating || 0);
    const q = query.toLowerCase();
    let score = 0;
    if ((story.title || "").toLowerCase().includes(q)) score += 12;
    if ((story.author || "").toLowerCase().includes(q)) score += 8;
    if ((story.genre || "").toLowerCase().includes(q)) score += 6;
    if ((story.description || "").toLowerCase().includes(q)) score += 3;
    if (story.featured) score += 1;
    return score + Number(story.rating || 0);
  }

  async function loadStories() {
    if (typeof getAllStories === "function") return getAllStories();
    if (typeof getStories === "function") return getStories();
    const response = await fetch("data/stories.json", { cache: "no-store" });
    return response.ok ? response.json() : [];
  }

  function buildGenres() {
    const genres = ["all", ...Array.from(new Set(allStories.map(story => story.genre).filter(Boolean))).sort()];
    els.genreGrid.innerHTML = genres.map(genre => `
      <button class="genre-card ${genre === activeGenre ? "active" : ""}" type="button" data-genre="${escapeAttr(genre)}">
        ${escapeHtml(genre)}
      </button>
    `).join("");
  }

  function saveRecent(query) {
    const q = String(query || "").trim();
    if (!q) return;
    recent = recent.filter(item => item.toLowerCase() !== q.toLowerCase());
    recent.unshift(q);
    recent = recent.slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    renderRecent();
  }

  function renderRecent() {
    if (!recent.length) {
      els.recentList.innerHTML = '<div class="empty-note compact">No recent searches</div>';
      return;
    }

    els.recentList.innerHTML = recent.map(query => `
      <button class="recent-item" type="button" data-query="${escapeAttr(query)}">
        <span class="material-symbols-rounded" aria-hidden="true">history</span>
        ${escapeHtml(query)}
      </button>
    `).join("");
  }

  function applyFilters() {
    const query = (els.searchInput.value || "").trim();
    let list = allStories.slice();

    if (activeGenre !== "all") list = list.filter(story => story.genre === activeGenre);
    if (els.filterPremium.checked) list = list.filter(story => story.premium);
    if (els.filterFree.checked) list = list.filter(story => !story.premium);
    if (els.filterFeatured.checked) list = list.filter(story => story.featured);
    if (els.filterDownloaded.checked && typeof isStoryDownloaded === "function") {
      list = list.filter(story => isStoryDownloaded(story.id));
    }

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(story => {
        return (story.title || "").toLowerCase().includes(q)
          || (story.author || "").toLowerCase().includes(q)
          || (story.genre || "").toLowerCase().includes(q)
          || (story.description || "").toLowerCase().includes(q);
      });
    }

    const sort = els.sortSelect.value;
    if (sort === "alpha") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sort === "newest") list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    else if (sort === "trending") list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    else if (sort === "free") list.sort((a, b) => Number(Boolean(a.premium)) - Number(Boolean(b.premium)) || Number(b.rating || 0) - Number(a.rating || 0));
    else list.sort((a, b) => scoreStory(b, query) - scoreStory(a, query));

    renderResults(list, query);
  }

  function renderResults(list, query) {
    els.results.innerHTML = "";
    els.noResults.hidden = list.length > 0;
    if (!list.length) {
      els.noResults.classList.add("empty-state");
      if (!els.noResults.querySelector("strong")) {
        els.noResults.innerHTML = `<strong>No matching stories</strong><span>Try removing a filter or searching by author, genre, or title.</span>`;
      }
    }
    els.resultSummary.textContent = query
      ? `${list.length} ${list.length === 1 ? "result" : "results"} for "${query}"`
      : `${list.length} stories available`;

    if (!list.length) return;

    const fragment = document.createDocumentFragment();
    list.forEach(story => fragment.appendChild(createCard(story)));
    els.results.appendChild(fragment);
  }

  function createCard(story) {
    const card = document.createElement("article");
    card.className = "book-card";
    card.tabIndex = 0;
    card.innerHTML = `
      <img class="book-cover" src="${escapeAttr(normalizePath(story.cover))}" alt="${escapeAttr(story.title || "Story cover")}">
      <div class="book-info">
        <div class="book-title">${escapeHtml(story.title || "Untitled")}</div>
        <div class="book-author">${escapeHtml(story.author || "Unknown author")}</div>
        <div class="book-description">${escapeHtml((story.description || "").slice(0, 150))}${(story.description || "").length > 150 ? "..." : ""}</div>
        <div class="book-stats">${escapeHtml(storyStats(story))}</div>
      </div>
    `;

    card.addEventListener("click", () => {
      location.href = `story.html?id=${encodeURIComponent(story.id)}`;
    });
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
    return card;
  }

  function bindEvents() {
    const debouncedApply = debounce(() => {
      applyFilters();
      saveRecent(els.searchInput.value);
    });

    els.searchInput.addEventListener("input", debouncedApply);
    els.clearBtn.addEventListener("click", () => {
      els.searchInput.value = "";
      applyFilters();
      els.searchInput.focus();
    });

    els.genreGrid.addEventListener("click", event => {
      const button = event.target.closest("[data-genre]");
      if (!button) return;
      activeGenre = button.dataset.genre || "all";
      buildGenres();
      applyFilters();
    });

    els.recentList.addEventListener("click", event => {
      const button = event.target.closest("[data-query]");
      if (!button) return;
      els.searchInput.value = button.dataset.query || "";
      applyFilters();
      els.searchInput.focus();
    });

    els.filterPremium.addEventListener("change", () => {
      if (els.filterPremium.checked) els.filterFree.checked = false;
      applyFilters();
    });
    els.filterFree.addEventListener("change", () => {
      if (els.filterFree.checked) els.filterPremium.checked = false;
      applyFilters();
    });

    [
      els.sortSelect,
      els.filterDownloaded,
      els.filterFeatured
    ].forEach(el => el.addEventListener("change", applyFilters));
  }

  async function init() {
    allStories = (await loadStories()).filter(story => story && story.id);
    buildGenres();
    renderRecent();
    bindEvents();
    applyFilters();
    if (typeof renderNavigation === "function") renderNavigation("search");
  }

  document.addEventListener("DOMContentLoaded", init);
  window.niveSearch = { refresh: init };
})();
