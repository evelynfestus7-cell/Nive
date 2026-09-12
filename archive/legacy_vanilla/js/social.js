// social.js
// Local-first community features: user search, follow/block, reading lists, coin sharing, chat, and chapter comments.

(function () {
  "use strict";

  const SOCIAL_KEY = "nive_social_state";
  const READING_LISTS_KEY = "nive_reading_lists";
  const COMMENTS_KEY = "nive_chapter_comments";
  const MESSAGE_COST = 2; // 2 coins per chat message as requested

  const SEEDED_USERS = [
    {
      id: "reader-mara",
      username: "MaraReads",
      displayName: "Mara",
      avatar: "assets/avatars/avatar1.png",
      bio: "Fantasy arcs, cliffhangers, and late-night theories.",
      followers: 128
    },
    {
      id: "noir-kai",
      username: "NoirKai",
      displayName: "Kai",
      avatar: "assets/avatars/avatar2.png",
      bio: "Thriller fan. I bookmark suspicious characters for sport.",
      followers: 94
    },
    {
      id: "luna-pages",
      username: "LunaPages",
      displayName: "Luna",
      avatar: "assets/avatars/avatar3.png",
      bio: "Romance, slow burns, and chapter comment essays.",
      followers: 211
    },
    {
      id: "atlas-ink",
      username: "AtlasInk",
      displayName: "Atlas",
      avatar: "assets/avatars/avatar4.png",
      bio: "Sci-fi reader. Here for worldbuilding and impossible choices.",
      followers: 167
    }
  ];

  const SEEDED_READING_LISTS = [
    {
      id: "list-1",
      title: "Late Night Cliffhangers",
      description: "Thrillers and mysteries that keep you up past midnight.",
      owner: "MaraReads",
      avatar: "assets/avatars/avatar1.png",
      storyIds: ["story-1", "story-2", "story-3"],
      isPublic: true,
      createdAt: "2026-08-15T10:00:00.000Z"
    },
    {
      id: "list-2",
      title: "Cyberpunk & Future Earth",
      description: "Dystopian worlds, AI rebellion, and high-tech adventures.",
      owner: "AtlasInk",
      avatar: "assets/avatars/avatar4.png",
      storyIds: ["story-4", "story-5"],
      isPublic: true,
      createdAt: "2026-08-20T14:30:00.000Z"
    },
    {
      id: "list-3",
      title: "Best Choice-Driven Romances",
      description: "Slow-burn romance stories with multiple endings.",
      owner: "LunaPages",
      avatar: "assets/avatars/avatar3.png",
      storyIds: ["story-2", "story-6"],
      isPublic: true,
      createdAt: "2026-08-25T18:15:00.000Z"
    }
  ];

  function safeParse(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function getCurrentUser() {
    if (typeof getUser === "function") return getUser();
    return safeParse(localStorage.getItem("nive_user") || "{}", {});
  }

  function saveCurrentUser(user) {
    if (typeof saveUser === "function") return saveUser(user);
    localStorage.setItem("nive_user", JSON.stringify(user || {}));
  }

  function getCurrentProfile() {
    const user = getCurrentUser();
    const username = (user.username || "Reader").toString().trim() || "Reader";
    const avatar = user.avatar && !String(user.avatar).includes("default.png")
      ? user.avatar
      : "assets/avatars/avatar1.png";
    return {
      id: "me",
      username,
      displayName: username,
      avatar,
      bio: "Your Nive profile",
      followers: 0,
      coins: Number(user.coins || 0),
      isCurrentUser: true
    };
  }

  function defaultState() {
    return {
      following: [],
      blocked: [],
      conversations: {},
      transfers: [],
      receivedCoins: {}
    };
  }

  function getState() {
    return {
      ...defaultState(),
      ...safeParse(localStorage.getItem(SOCIAL_KEY) || "{}", {})
    };
  }

  function saveState(state) {
    localStorage.setItem(SOCIAL_KEY, JSON.stringify({ ...defaultState(), ...(state || {}) }));
  }

  function getCommentsStore() {
    return safeParse(localStorage.getItem(COMMENTS_KEY) || "{}", {});
  }

  function saveCommentsStore(store) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(store || {}));
  }

  // READING LISTS API
  function getReadingLists() {
    const custom = safeParse(localStorage.getItem(READING_LISTS_KEY) || "[]", []);
    return [...SEEDED_READING_LISTS, ...custom];
  }

  function saveCustomReadingLists(lists) {
    localStorage.setItem(READING_LISTS_KEY, JSON.stringify(lists || []));
  }

  function createReadingList(title, description) {
    const name = String(title || "").trim();
    if (!name) return { ok: false, message: "Enter a reading list title." };

    const profile = getCurrentProfile();
    const custom = safeParse(localStorage.getItem(READING_LISTS_KEY) || "[]", []);
    const newList = {
      id: "list-" + Date.now(),
      title: name,
      description: String(description || "").trim(),
      owner: "@" + profile.username,
      avatar: profile.avatar,
      storyIds: [],
      isPublic: true,
      createdAt: new Date().toISOString()
    };
    custom.unshift(newList);
    saveCustomReadingLists(custom);
    return { ok: true, message: `Reading list "${name}" created!`, list: newList };
  }

  function addStoryToReadingList(listId, storyId) {
    const custom = safeParse(localStorage.getItem(READING_LISTS_KEY) || "[]", []);
    const target = custom.find(l => l.id === listId);
    if (!target) return { ok: false, message: "Reading list not found." };
    if (!target.storyIds.includes(String(storyId))) {
      target.storyIds.push(String(storyId));
      saveCustomReadingLists(custom);
    }
    return { ok: true, message: "Added story to reading list!" };
  }

  function removeStoryFromReadingList(listId, storyId) {
    const custom = safeParse(localStorage.getItem(READING_LISTS_KEY) || "[]", []);
    const target = custom.find(l => l.id === listId);
    if (!target) return { ok: false, message: "Reading list not found." };
    target.storyIds = target.storyIds.filter(id => id !== String(storyId));
    saveCustomReadingLists(custom);
    return { ok: true, message: "Removed story from reading list." };
  }

  function nowLabel(date = new Date()) {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function cleanText(value, max = 500) {
    return String(value || "").trim().slice(0, max);
  }

  function allUsers() {
    return [getCurrentProfile(), ...SEEDED_USERS];
  }

  function getUserById(id) {
    return allUsers().find(user => user.id === id) || null;
  }

  function searchUsers(query) {
    const q = String(query || "").trim().toLowerCase();
    const state = getState();
    return allUsers()
      .filter(user => !user.isCurrentUser)
      .filter(user => !state.blocked.includes(user.id))
      .filter(user => {
        if (!q) return true;
        return user.username.toLowerCase().includes(q)
          || user.displayName.toLowerCase().includes(q)
          || user.bio.toLowerCase().includes(q);
      });
  }

  function followUser(id) {
    const state = getState();
    if (state.blocked.includes(id)) return { ok: false, message: "Unblock this user before following." };
    if (!state.following.includes(id)) state.following.push(id);
    saveState(state);
    return { ok: true, message: "Now following." };
  }

  function unfollowUser(id) {
    const state = getState();
    state.following = state.following.filter(item => item !== id);
    saveState(state);
    return { ok: true, message: "Unfollowed." };
  }

  function blockUser(id) {
    const state = getState();
    if (!state.blocked.includes(id)) state.blocked.push(id);
    state.following = state.following.filter(item => item !== id);
    saveState(state);
    return { ok: true, message: "User blocked." };
  }

  function unblockUser(id) {
    const state = getState();
    state.blocked = state.blocked.filter(item => item !== id);
    saveState(state);
    return { ok: true, message: "User unblocked." };
  }

  function shareCoins(id, amount) {
    const target = getUserById(id);
    const coins = Math.floor(Number(amount || 0));
    if (!target || target.isCurrentUser) return { ok: false, message: "Choose another user." };
    if (coins <= 0) return { ok: false, message: "Enter a coin amount." };

    const state = getState();
    if (state.blocked.includes(id)) return { ok: false, message: "You cannot share coins with a blocked user." };

    const user = getCurrentUser();
    if (Number(user.coins || 0) < coins) return { ok: false, message: "Not enough coins." };

    user.coins = Number(user.coins || 0) - coins;
    saveCurrentUser(user);

    state.receivedCoins[id] = Number(state.receivedCoins[id] || 0) + coins;
    state.transfers.push({
      id: "transfer-" + Date.now(),
      to: id,
      amount: coins,
      createdAt: new Date().toISOString()
    });
    saveState(state);
    window.dispatchEvent(new Event("userUpdated"));
    return { ok: true, message: `Sent ${coins} coins to @${target.username}.` };
  }

  function conversationKey(id) {
    return ["me", id].sort().join("__");
  }

  function getConversation(id) {
    const state = getState();
    const key = conversationKey(id);
    return Array.isArray(state.conversations[key]) ? state.conversations[key] : [];
  }

  function sendMessage(id, text) {
    const target = getUserById(id);
    const body = cleanText(text, 700);
    if (!target || target.isCurrentUser) return { ok: false, message: "Choose another user." };
    if (!body) return { ok: false, message: "Write a message first." };

    const state = getState();
    if (state.blocked.includes(id)) return { ok: false, message: "You cannot message a blocked user." };

    const user = getCurrentUser();
    if (Number(user.coins || 0) < MESSAGE_COST) {
      return { ok: false, message: `Chat messages cost ${MESSAGE_COST} coins.` };
    }

    user.coins = Number(user.coins || 0) - MESSAGE_COST;
    saveCurrentUser(user);

    const key = conversationKey(id);
    const thread = Array.isArray(state.conversations[key]) ? state.conversations[key] : [];
    thread.push({
      id: "msg-" + Date.now(),
      from: "me",
      to: id,
      text: body,
      cost: MESSAGE_COST,
      createdAt: new Date().toISOString()
    });
    state.conversations[key] = thread;
    saveState(state);
    window.dispatchEvent(new Event("userUpdated"));
    return { ok: true, message: `Message sent. ${MESSAGE_COST} coins spent.` };
  }

  function commentKey(storyId, chapterId) {
    return `${storyId || "story"}::${chapterId || "chapter"}`;
  }

  function getChapterComments(storyId, chapterId) {
    const store = getCommentsStore();
    const state = getState();
    const comments = store[commentKey(storyId, chapterId)] || [];
    return comments.filter(comment => !state.blocked.includes(comment.userId));
  }

  function addChapterComment(storyId, chapterId, text) {
    const body = cleanText(text, 900);
    if (!body) return { ok: false, message: "Write a comment first." };

    const profile = getCurrentProfile();
    const store = getCommentsStore();
    const key = commentKey(storyId, chapterId);
    const comments = Array.isArray(store[key]) ? store[key] : [];
    comments.push({
      id: "comment-" + Date.now(),
      userId: profile.id,
      username: profile.username,
      avatar: profile.avatar,
      text: body,
      createdAt: new Date().toISOString()
    });
    store[key] = comments;
    saveCommentsStore(store);
    return { ok: true, message: "Comment posted." };
  }

  function showNotice(message) {
    const existing = document.getElementById("socialNotice");
    if (existing) existing.remove();
    const notice = document.createElement("div");
    notice.id = "socialNotice";
    notice.className = "social-notice";
    notice.textContent = message;
    document.body.appendChild(notice);
    setTimeout(() => notice.classList.add("show"), 30);
    setTimeout(() => {
      notice.classList.remove("show");
      setTimeout(() => notice.remove(), 250);
    }, 2400);
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

  function renderChapterComments(context) {
    const root = document.getElementById("chapterComments");
    if (!root || !context) return;

    const storyId = context.storyId || context.STORY_ID;
    const chapterId = context.chapterId || context.currentChapterId;
    const comments = getChapterComments(storyId, chapterId);
    const profile = getCurrentProfile();

    root.innerHTML = `
      <div class="chapter-community-head">
        <div>
          <div class="chapter-community-title">Chapter Comments</div>
          <div class="chapter-community-meta">${comments.length} ${comments.length === 1 ? "comment" : "comments"}</div>
        </div>
      </div>
      <div class="comment-list">
        ${comments.length ? comments.map(comment => `
          <article class="comment-item">
            <img src="${escapeHtml(comment.avatar || "assets/avatars/avatar1.png")}" alt="">
            <div>
              <div class="comment-top">
                <strong>@${escapeHtml(comment.username || "Reader")}</strong>
                <span>${escapeHtml(nowLabel(new Date(comment.createdAt)))}</span>
              </div>
              <p>${escapeHtml(comment.text)}</p>
            </div>
          </article>
        `).join("") : `<div class="comment-empty">Start the conversation for this chapter.</div>`}
      </div>
      <form class="comment-form" id="chapterCommentForm">
        <img src="${escapeHtml(profile.avatar)}" alt="">
        <textarea id="chapterCommentText" rows="2" maxlength="900" placeholder="Add a chapter comment..."></textarea>
        <button class="btn small" type="submit">Post</button>
      </form>
    `;

    const form = document.getElementById("chapterCommentForm");
    const textarea = document.getElementById("chapterCommentText");
    if (form && textarea) {
      form.addEventListener("submit", event => {
        event.preventDefault();
        const result = addChapterComment(storyId, chapterId, textarea.value);
        showNotice(result.message);
        if (result.ok) renderChapterComments({ storyId, chapterId });
      });
    }
  }

  function getConversationsList() {
    const state = getState();
    const result = [];
    Object.keys(state.conversations || {}).forEach(key => {
      const thread = state.conversations[key];
      if (Array.isArray(thread) && thread.length > 0) {
        const otherId = key.split("__").find(id => id !== "me");
        const target = getUserById(otherId);
        const lastMsg = thread[thread.length - 1];
        if (target) {
          result.push({
            user: target,
            lastMessage: lastMsg.text,
            createdAt: lastMsg.createdAt,
            threadLength: thread.length
          });
        }
      }
    });
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  }

  function submitReport(targetId, targetType, category, reason) {
    const user = getCurrentUser();
    const report = {
      id: "report-" + Date.now(),
      reporterId: user.uid || user.id || "guest",
      reporterName: user.username || "Guest",
      targetId: targetId,
      targetType: targetType,
      category: category || "Spam / Abuse",
      reason: reason || "",
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    try {
      const reports = JSON.parse(localStorage.getItem("nive_reports") || "[]");
      reports.push(report);
      localStorage.setItem("nive_reports", JSON.stringify(reports));
    } catch(e) {}

    if (window.db) {
      window.db.collection("reports").add(report).catch(() => {});
    }

    if (window.NiveAnalytics) {
      window.NiveAnalytics.trackEvent("submit_report", { targetId, targetType, category });
    }

    showNotice("Report submitted for administrator review.");
    return report;
  }

  window.NiveSocial = {
    MESSAGE_COST,
    getState,
    saveState,
    allUsers,
    searchUsers,
    getUserById,
    getFollowingUsers,
    getFollowersUsers,
    getConversationsList,
    followUser,
    unfollowUser,
    blockUser,
    unblockUser,
    shareCoins,
    getConversation,
    sendMessage,
    getReadingLists,
    createReadingList,
    addStoryToReadingList,
    removeStoryFromReadingList,
    getChapterComments,
    addChapterComment,
    renderChapterComments,
    submitReport,
    showNotice,
    escapeHtml,
    nowLabel
  };
})();


