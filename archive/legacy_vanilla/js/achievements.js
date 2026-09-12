// achievements.js
// Unlocks achievements, rewards, reading-goal badges, and seasonal badges.

(function () {
  const ACHIEVEMENTS_URL = "data/achievements.json";

  const ACHIEVEMENT_RULES = [
    { id: "first-book", title: "First Book", when: stats => stats.booksRead >= 1, reward: { xp: 50, coins: 25, badge: "Story Starter" } },
    { id: "bookworm", title: "Bookworm", when: stats => stats.booksRead >= 5, reward: { xp: 120, coins: 60, badge: "Bookworm" } },
    { id: "library-legend", title: "Library Legend", when: stats => stats.booksRead >= 10, reward: { xp: 250, coins: 125, badge: "Library Legend" } },
    { id: "chapter-starter", title: "Chapter Starter", when: stats => stats.chaptersRead >= 1, reward: { xp: 20, coins: 10, badge: "Chapter Starter" } },
    { id: "chapter-sprinter", title: "Chapter Sprinter", when: stats => stats.chaptersRead >= 10, reward: { xp: 80, coins: 40, badge: "Sprinter" } },
    { id: "chapter-hero", title: "Chapter Hero", when: stats => stats.chaptersRead >= 25, reward: { xp: 180, coins: 90, badge: "Chapter Hero" } },
    { id: "page-turner", title: "Page Turner", when: stats => stats.pagesRead >= 50, reward: { xp: 70, coins: 35, badge: "Page Turner" } },
    { id: "page-master", title: "Page Master", when: stats => stats.pagesRead >= 250, reward: { xp: 220, coins: 110, badge: "Page Master" } },
    { id: "marathon-reader", title: "Marathon Reader", when: stats => stats.minutesRead >= 120, reward: { xp: 150, coins: 75, badge: "Marathon Reader" } },
    { id: "daily-spark", title: "Daily Spark", when: stats => stats.readToday && stats.chaptersRead >= 1, reward: { xp: 30, coins: 15, badge: "Daily Spark" } },
    { id: "three-day-streak", title: "Three-Day Flame", when: stats => stats.streak >= 3, reward: { xp: 75, coins: 35, badge: "Three-Day Flame" } },
    { id: "weekly-goal", title: "Weekly Goal", when: stats => stats.activeDays >= 3, reward: { xp: 90, coins: 45, badge: "Weekly Finisher" } },
    { id: "streak-week", title: "Streak Week", when: stats => stats.streak >= 7, reward: { xp: 175, coins: 90, badge: "Streak Week" } },
    { id: "monthly-goal", title: "Monthly Goal", when: stats => stats.pagesRead >= 100, reward: { xp: 130, coins: 65, badge: "Goal Crusher" } },
    { id: "level-5", title: "Level 5 Reached", when: stats => stats.level >= 5, reward: { xp: 100, coins: 50, badge: "Rising Reader" } },
    { id: "level-10", title: "Level 10 Reached", when: stats => stats.level >= 10, reward: { xp: 250, coins: 150, badge: "Elite Reader" } },
    { id: "first-favorite", title: "First Favorite", when: stats => stats.favorites >= 1, reward: { xp: 25, coins: 15, badge: "Curator" } },
    { id: "collector", title: "Collector", when: stats => stats.favorites >= 3, reward: { xp: 80, coins: 40, badge: "Collector" } },
    { id: "super-collector", title: "Super Collector", when: stats => stats.favorites >= 5, reward: { xp: 140, coins: 70, badge: "Super Collector" } },
    { id: "first-bookmark", title: "First Bookmark", when: stats => stats.bookmarks >= 1, reward: { xp: 25, coins: 15, badge: "Bookmark Keeper" } },
    { id: "explorer", title: "Explorer", when: stats => stats.bookmarks >= 3, reward: { xp: 75, coins: 35, badge: "Explorer" } },
    { id: "map-maker", title: "Map Maker", when: stats => stats.bookmarks >= 10, reward: { xp: 160, coins: 80, badge: "Map Maker" } },
    // 20 Extra Achievements:
    { id: "social-butterfly", title: "Social Butterfly", category: "Social", when: stats => (stats.following || 0) >= 3, reward: { xp: 60, coins: 30, badge: "Social Butterfly" } },
    { id: "generous-heart", title: "Generous Heart", category: "Social", when: stats => (stats.transfers || 0) >= 1, reward: { xp: 80, coins: 40, badge: "Generous Reader" } },
    { id: "commentator", title: "Voice of Nive", category: "Social", when: stats => (stats.comments || 0) >= 1, reward: { xp: 40, coins: 20, badge: "Voice of Nive" } },
    { id: "discussion-leader", title: "Discussion Leader", category: "Social", when: stats => (stats.comments || 0) >= 5, reward: { xp: 100, coins: 50, badge: "Discussion Leader" } },
    { id: "playlist-curator", title: "Playlist Curator", category: "Collection", when: stats => (stats.readingLists || 0) >= 1, reward: { xp: 75, coins: 35, badge: "Playlist Curator" } },
    { id: "coin-hoarder", title: "Treasure Chest", category: "Collection", when: stats => (stats.coins || 0) >= 500, reward: { xp: 150, coins: 75, badge: "Treasure Keeper" } },
    { id: "night-owl", title: "Night Owl", category: "Reading", when: stats => stats.readToday && (new Date().getHours() >= 22 || new Date().getHours() <= 4), reward: { xp: 90, coins: 45, badge: "Night Owl" } },
    { id: "early-bird", title: "Early Bird", category: "Reading", when: stats => stats.readToday && (new Date().getHours() >= 5 && new Date().getHours() <= 8), reward: { xp: 90, coins: 45, badge: "Early Bird" } },
    { id: "speed-reader", title: "Velocity Reader", category: "Reading", when: stats => (stats.chaptersRead || 0) >= 3, reward: { xp: 110, coins: 55, badge: "Speed Demon" } },
    { id: "genre-explorer", title: "Genre Explorer", category: "Story", when: stats => (stats.booksRead || 0) >= 2, reward: { xp: 120, coins: 60, badge: "Polymath Reader" } },
    { id: "choice-master", title: "Pathfinder", category: "Story", when: stats => (stats.chaptersRead || 0) >= 5, reward: { xp: 100, coins: 50, badge: "Pathfinder" } },
    { id: "cliffhanger-survivor", title: "Cliffhanger Survivor", category: "Story", when: stats => stats.booksRead >= 2, reward: { xp: 130, coins: 65, badge: "Survivor" } },
    { id: "romance-hopeless", title: "Hopeless Romantic", category: "Story", when: stats => stats.booksRead >= 3, reward: { xp: 100, coins: 50, badge: "Hopeless Romantic" } },
    { id: "sci-fi-pioneer", title: "Stargazer", category: "Story", when: stats => stats.booksRead >= 4, reward: { xp: 100, coins: 50, badge: "Stargazer" } },
    { id: "level-15", title: "Level 15 Reached", category: "Level", when: stats => stats.level >= 15, reward: { xp: 300, coins: 200, badge: "Master Reader" } },
    { id: "level-20", title: "Level 20 Reached", category: "Level", when: stats => stats.level >= 20, reward: { xp: 500, coins: 350, badge: "Nive Grandmaster" } },
    { id: "streak-14", title: "Two-Week Flame", category: "Goal", when: stats => stats.streak >= 14, reward: { xp: 250, coins: 125, badge: "Two-Week Flame" } },
    { id: "streak-30", title: "Monthly Legend", category: "Goal", when: stats => stats.streak >= 30, reward: { xp: 600, coins: 300, badge: "Monthly Legend" } },
    { id: "offline-reader", title: "Pocket Library", category: "Collection", when: stats => (stats.downloadedStories || 0) >= 2, reward: { xp: 80, coins: 40, badge: "Pocket Reader" } },
    { id: "nive-veteran", title: "Nive Veteran", category: "Story", when: stats => stats.booksRead >= 20, reward: { xp: 400, coins: 250, badge: "Nive Veteran" } },
    { id: "new-year-reader", title: "New Year Reader", when: stats => stats.readToday && stats.month === 0, reward: { xp: 100, coins: 75, badge: "New Year 2026" } },
    { id: "summer-reader", title: "Summer Reader", when: stats => stats.readToday && stats.month >= 5 && stats.month <= 7, reward: { xp: 100, coins: 75, badge: "Summer 2026" } },
    { id: "spooky-pages", title: "Spooky Pages", when: stats => stats.readToday && stats.month === 9, reward: { xp: 100, coins: 75, badge: "October 2026" } },
    { id: "holiday-reader", title: "Holiday Reader", when: stats => stats.readToday && stats.month === 11, reward: { xp: 100, coins: 75, badge: "Holiday 2026" } }
  ];


  if (!window._nive_shownAchievements) {
    window._nive_shownAchievements = new Set();
  }

  function normalizeId(id) {
    if (id === null || id === undefined) return null;
    return String(id);
  }

  function _getUser() {
    if (typeof getUser === "function") return getUser();
    try { return JSON.parse(localStorage.getItem("nive_user") || "{}"); } catch { return {}; }
  }

  function _saveUser(user) {
    if (typeof saveUser === "function") return saveUser(user);
    localStorage.setItem("nive_user", JSON.stringify(user || {}));
  }

  function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getStats(user) {
    const completedStories = Array.isArray(user.completedStories) ? user.completedStories.length : 0;
    const readChapters = Array.isArray(user.readChapters) ? user.readChapters.length : 0;
    const readingSeconds = Number(user.readingSeconds || ((user.minutesRead || 0) * 60));
    const activeDays = Array.isArray(user.activeDays) ? user.activeDays.length : Number(user.activeDays || 0);

    return {
      booksRead: Math.max(Number(user.booksRead || 0), completedStories),
      chaptersRead: readChapters || Number(user.chaptersRead || 0) || Number(user.chaptersCompleted || 0),
      pagesRead: Number(user.pagesRead || 0),
      minutesRead: Math.floor(readingSeconds / 60),
      activeDays,
      streak: Number(user.streak || 0),
      readToday: user.lastReadDate === todayKey(),
      level: Number(user.level || 1),
      favorites: Array.isArray(user.favorites) ? user.favorites.length : 0,
      bookmarks: Array.isArray(user.bookmarks) ? user.bookmarks.length : 0,
      library: Array.isArray(user.library) ? user.library.length : 0,
      month: new Date().getMonth()
    };
  }

  function showToast(title, reward) {
    try {
      if (typeof showAchievement === "function") {
        showAchievement(title);
        return;
      }
    } catch (e) {
      // Fall back to local toast.
    }

    const rewardText = reward
      ? `<div class="toast-reward">+${reward.xp || 0} XP / +${reward.coins || 0} coins${reward.badge ? " / " + reward.badge : ""}</div>`
      : "";
    const toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.innerHTML = `
      <div class="toast-header">Achievement Unlocked</div>
      <div class="toast-title">${title}</div>
      ${rewardText}
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  function applyReward(user, reward) {
    if (!reward) return;
    user.xp = Number(user.xp || 0) + Number(reward.xp || 0);
    user.coins = Number(user.coins || 0) + Number(reward.coins || 0);
    user.specialBadges = Array.isArray(user.specialBadges) ? user.specialBadges : [];
    if (reward.badge && !user.specialBadges.includes(reward.badge)) {
      user.specialBadges.push(reward.badge);
    }
    if (typeof updateLevel === "function") {
      updateLevel(user);
    } else {
      user.level = Math.floor(Number(user.xp || 0) / 100) + 1;
    }
  }

  function unlock(rule) {
    const id = normalizeId(rule.id);
    if (!id || window._nive_shownAchievements.has(id)) return false;

    const user = _getUser();
    user.achievements = Array.isArray(user.achievements) ? user.achievements.slice() : [];

    if (user.achievements.includes(id)) {
      window._nive_shownAchievements.add(id);
      return false;
    }

    user.achievements.push(id);
    applyReward(user, rule.reward);
    _saveUser(user);
    window._nive_shownAchievements.add(id);
    showToast(rule.title, rule.reward);
    return true;
  }

  window.fetchAchievements = async function fetchAchievements() {
    const res = await fetch(ACHIEVEMENTS_URL);
    if (!res.ok) throw new Error("Unable to load achievements.");
    return res.json();
  };

  window.getReadingGoals = function getReadingGoals(user = _getUser()) {
    const goals = {
      dailyChapters: 1,
      weeklyActiveDays: 3,
      monthlyPages: 100,
      ...(user.readingGoals || {})
    };
    const stats = getStats(user);
    return [
      {
        id: "daily-chapter-goal",
        title: "Daily Chapter",
        current: stats.readToday ? Math.min(stats.chaptersRead, goals.dailyChapters) : 0,
        target: goals.dailyChapters,
        reward: "+30 XP / +15 coins"
      },
      {
        id: "weekly-active-goal",
        title: "Weekly Active Days",
        current: Math.min(stats.activeDays, goals.weeklyActiveDays),
        target: goals.weeklyActiveDays,
        reward: "+90 XP / +45 coins"
      },
      {
        id: "monthly-pages-goal",
        title: "Monthly Pages",
        current: Math.min(stats.pagesRead, goals.monthlyPages),
        target: goals.monthlyPages,
        reward: "+130 XP / +65 coins"
      }
    ];
  };

  window.checkAchievements = function checkAchievements() {
    const user = _getUser();
    user.achievements = Array.isArray(user.achievements) ? user.achievements : [];
    user.favorites = Array.isArray(user.favorites) ? user.favorites : [];
    user.bookmarks = Array.isArray(user.bookmarks) ? user.bookmarks : [];
    user.readChapters = Array.isArray(user.readChapters) ? user.readChapters : [];
    user.activeDays = Array.isArray(user.activeDays) ? user.activeDays : [];
    user.specialBadges = Array.isArray(user.specialBadges) ? user.specialBadges : [];

    const stats = getStats(user);
    ACHIEVEMENT_RULES.forEach(rule => {
      if (!user.achievements.includes(rule.id) && rule.when(stats)) {
        unlock(rule);
      }
    });
  };

  // Colorful vector SVG icons for every achievement
  const SVG_ICONS = {
    "first-book": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-book" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#FFD700"/><stop offset="1" stop-color="#FF4500"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-book)" fill-opacity="0.2" stroke="url(#g-book)" stroke-width="1.5"/><path d="M12 14c0-1.1.9-2 2-2h10v22H14c-1.1 0-2-.9-2-2V14z" fill="url(#g-book)" fill-opacity="0.8"/><path d="M36 14c0-1.1-.9-2-2-2H24v22h10c1.1 0 2-.9 2-2V14z" fill="url(#g-book)"/><path d="M24 12v22" stroke="#FFF" stroke-width="2" stroke-linecap="round"/><path d="M16 18h5M16 23h5M27 18h5M27 23h5" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    "bookworm": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-worm" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#9A4BFF"/><stop offset="1" stop-color="#24A1DE"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-worm)" fill-opacity="0.2" stroke="url(#g-worm)" stroke-width="1.5"/><path d="M14 16h20v18H14z" fill="url(#g-worm)" rx="4"/><circle cx="24" cy="22" r="6" fill="#FFF"/><path d="M22 21a1 1 0 100-2 1 1 0 000 2zM26 21a1 1 0 100-2 1 1 0 000 2z" fill="#111"/><path d="M20 25c1 1.5 7 1.5 8 0" stroke="#111" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    "library-legend": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-leg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#F7971E"/><stop offset="1" stop-color="#FFD200"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-leg)" fill-opacity="0.2" stroke="url(#g-leg)" stroke-width="1.5"/><path d="M12 34l3-18 9 9 9-9 3 18H12z" fill="url(#g-leg)"/><circle cx="12" cy="16" r="2.5" fill="#FFF"/><circle cx="24" cy="13" r="2.5" fill="#FFF"/><circle cx="36" cy="16" r="2.5" fill="#FFF"/></svg>`,
    "chapter-starter": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-start" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#00F2FE"/><stop offset="1" stop-color="#4FACFE"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-start)" fill-opacity="0.2" stroke="url(#g-start)" stroke-width="1.5"/><path d="M26 10L14 26h10l-2 12 14-16H24l2-12z" fill="url(#g-start)"/></svg>`,
    "chapter-sprinter": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-sprint" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#FF416C"/><stop offset="1" stop-color="#FF4B2B"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-sprint)" fill-opacity="0.2" stroke="url(#g-sprint)" stroke-width="1.5"/><path d="M16 32l16-16m-12 0h12v12" stroke="url(#g-sprint)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    "chapter-hero": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-hero" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#FF512F"/><stop offset="1" stop-color="#DD2476"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-hero)" fill-opacity="0.2" stroke="url(#g-hero)" stroke-width="1.5"/><path d="M24 10l12 5v10c0 7-5 13-12 15-7-2-12-8-12-15V15l12-5z" fill="url(#g-hero)"/><path d="M24 18l2 4 4.5.5-3.5 3 1 4.5-4-2.5-4 2.5 1-4.5-3.5-3 4.5-.5 2-4z" fill="#FFF"/></svg>`,
    "page-turner": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-page" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#00B4DB"/><stop offset="1" stop-color="#0083B0"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-page)" fill-opacity="0.2" stroke="url(#g-page)" stroke-width="1.5"/><path d="M14 12h14a6 6 0 016 6v18H20a6 6 0 01-6-6V12z" fill="url(#g-page)"/><path d="M20 30a6 6 0 006 6h8" stroke="#FFF" stroke-width="2"/></svg>`,
    "page-master": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-pmaster" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#11998E"/><stop offset="1" stop-color="#38EF7D"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-pmaster)" fill-opacity="0.2" stroke="url(#g-pmaster)" stroke-width="1.5"/><path d="M24 12l4 8 8.5 1.2-6 6 1.4 8.5L24 31.5 16 35.7l1.4-8.5-6-6L20 20l4-8z" fill="url(#g-pmaster)"/></svg>`,
    "marathon-reader": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-time" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#8A2387"/><stop offset="0.5" stop-color="#E94057"/><stop offset="1" stop-color="#F27121"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-time)" fill-opacity="0.2" stroke="url(#g-time)" stroke-width="1.5"/><circle cx="24" cy="25" r="11" stroke="url(#g-time)" stroke-width="3"/><path d="M24 19v6l4 3" stroke="url(#g-time)" stroke-width="2.5" stroke-linecap="round"/><path d="M22 10h4" stroke="url(#g-time)" stroke-width="3" stroke-linecap="round"/></svg>`,
    "daily-spark": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-flame" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#FF512F"/><stop offset="1" stop-color="#F09819"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-flame)" fill-opacity="0.2" stroke="url(#g-flame)" stroke-width="1.5"/><path d="M24 10c1.5 4 5 7 5 11 0 4.5-3.5 8-8 8s-8-3.5-8-8c0-4 4-9 11-11z" fill="url(#g-flame)"/><path d="M24 21c.8 2 2.5 3 2.5 5 0 2-1.7 3.5-3.5 3.5s-3.5-1.5-3.5-3.5c0-2 2-4.5 4.5-5z" fill="#FFF"/></svg>`,
    "three-day-streak": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-3streak" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#FF0844"/><stop offset="1" stop-color="#FFB199"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-3streak)" fill-opacity="0.2" stroke="url(#g-3streak)" stroke-width="1.5"/><path d="M17 14c1 3 4 5 4 8s-2.5 6-6.5 6S8 25.5 8 22.5c0-3 3-6.5 9-8.5z" fill="url(#g-3streak)" fill-opacity="0.7"/><path d="M31 14c1 3 4 5 4 8s-2.5 6-6.5 6S22 25.5 22 22.5c0-3 3-6.5 9-8.5z" fill="url(#g-3streak)"/></svg>`,
    "streak-week": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-7streak" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#F857A6"/><stop offset="1" stop-color="#FF5858"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-7streak)" fill-opacity="0.2" stroke="url(#g-7streak)" stroke-width="1.5"/><path d="M24 8l5 10 11 1.5-8 7.8 2 10.7-10-5.3-10 5.3 2-10.7-8-7.8L23 18l1-10z" fill="url(#g-7streak)"/></svg>`,
    "weekly-goal": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-wgoal" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#00C9FF"/><stop offset="1" stop-color="#92FE9D"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-wgoal)" fill-opacity="0.2" stroke="url(#g-wgoal)" stroke-width="1.5"/><circle cx="24" cy="24" r="12" stroke="url(#g-wgoal)" stroke-width="3"/><path d="M18 24l4 4 8-8" stroke="url(#g-wgoal)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    "monthly-goal": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-mgoal" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#FC466B"/><stop offset="1" stop-color="#3F5EFB"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-mgoal)" fill-opacity="0.2" stroke="url(#g-mgoal)" stroke-width="1.5"/><path d="M24 10l12 7v14l-12 7-12-7V17l12-7z" fill="url(#g-mgoal)"/><path d="M19 24l3.5 3.5 7-7" stroke="#FFF" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    "level-5": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-lvl5" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#FFD700"/><stop offset="1" stop-color="#FFA500"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-lvl5)" fill-opacity="0.2" stroke="url(#g-lvl5)" stroke-width="1.5"/><circle cx="24" cy="24" r="13" fill="url(#g-lvl5)"/><text x="24" y="30" font-size="18" font-weight="900" text-anchor="middle" fill="#111">5</text></svg>`,
    "level-10": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-lvl10" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#E100FF"/><stop offset="1" stop-color="#7F00FF"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-lvl10)" fill-opacity="0.2" stroke="url(#g-lvl10)" stroke-width="1.5"/><circle cx="24" cy="24" r="13" fill="url(#g-lvl10)"/><text x="24" y="30" font-size="16" font-weight="900" text-anchor="middle" fill="#FFF">10</text></svg>`,
    "first-favorite": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-heart" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#ED213A"/><stop offset="1" stop-color="#93190B"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-heart)" fill-opacity="0.2" stroke="url(#g-heart)" stroke-width="1.5"/><path d="M24 35s-11-7-11-15a6 6 0 0111-3 6 6 0 0111 3c0 8-11 15-11 15z" fill="url(#g-heart)"/></svg>`,
    "collector": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-gem" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#00F2FE"/><stop offset="1" stop-color="#4FACFE"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-gem)" fill-opacity="0.2" stroke="url(#g-gem)" stroke-width="1.5"/><path d="M16 16h16l5 7-13 13-13-13 5-7z" fill="url(#g-gem)"/><path d="M16 16l8 20 8-20M11 23h26" stroke="#FFF" stroke-width="1.2" opacity="0.6"/></svg>`,
    "super-collector": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-sgem" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#F3A183"/><stop offset="1" stop-color="#EC6F66"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-sgem)" fill-opacity="0.2" stroke="url(#g-sgem)" stroke-width="1.5"/><path d="M24 10l12 12-12 16L12 22 24 10z" fill="url(#g-sgem)"/><path d="M12 22h24M24 10v28" stroke="#FFF" stroke-width="1.2" opacity="0.6"/></svg>`,
    "first-bookmark": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-bm" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#F2994A"/><stop offset="1" stop-color="#F2C94C"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-bm)" fill-opacity="0.2" stroke="url(#g-bm)" stroke-width="1.5"/><path d="M16 12h16v24l-8-6-8 6V12z" fill="url(#g-bm)"/></svg>`,
    "explorer": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-exp" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#56CCF2"/><stop offset="1" stop-color="#2F80ED"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-exp)" fill-opacity="0.2" stroke="url(#g-exp)" stroke-width="1.5"/><circle cx="24" cy="24" r="12" stroke="url(#g-exp)" stroke-width="2.5"/><path d="M28 20l-3 8-5 3 3-8 5-3z" fill="url(#g-exp)"/></svg>`,
    "map-maker": `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-map" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#11998E"/><stop offset="1" stop-color="#38EF7D"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-map)" fill-opacity="0.2" stroke="url(#g-map)" stroke-width="1.5"/><path d="M12 15l8-4 8 4 8-4v22l-8 4-8-4-8 4V15z" stroke="url(#g-map)" stroke-width="2" fill="none"/><path d="M20 11v22M28 15v22" stroke="url(#g-map)" stroke-width="1.5"/></svg>`
  };

  const DEFAULT_SVG = `<svg viewBox="0 0 48 48" width="42" height="42" fill="none"><defs><linearGradient id="g-def" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#FFD700"/><stop offset="1" stop-color="#FF4500"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g-def)" fill-opacity="0.2" stroke="url(#g-def)" stroke-width="1.5"/><path d="M24 12l3.5 7 7.5 1-5.5 5.5 1.5 7.5-6.5-3.5-6.5 3.5 1.5-7.5-5.5-5.5 7.5-1 3.5-7z" fill="url(#g-def)"/></svg>`;

  window.getAchievementIconSvg = function getAchievementIconSvg(id) {
    return SVG_ICONS[id] || DEFAULT_SVG;
  };
})();

