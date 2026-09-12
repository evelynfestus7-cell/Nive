// profile.js — Handles user profile rendering, edit modal, and stats display
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof checkAchievements === "function") {
      checkAchievements();
    }

    const user = getUser();
    let selectedAvatar = user.avatar || "";

    // Elements
    const avatarImg = document.getElementById("profileAvatar");
    const avatarFallback = document.getElementById("profileAvatarFallback");
    const nameEl = document.getElementById("profileName");
    const usernameEl = document.getElementById("profileUsername");
    const levelEl = document.getElementById("profileLevel");
    const coinEl = document.getElementById("coinCount");
    const xpFill = document.getElementById("xpFill");
    const xpPercentLabel = document.getElementById("xpPercentLabel");
    const booksReadEl = document.getElementById("booksRead");
    const achievementsCountEl = document.getElementById("achievementsCount");
    const streakEl = document.getElementById("streak");
    const chaptersEl = document.getElementById("chaptersRead");
    const hoursEl = document.getElementById("hoursSpent");
    const streakMessageEl = document.getElementById("streakMessage");
    const streakTodayEl = document.getElementById("streakToday");
    const pagesEl = document.getElementById("pagesRead");
    const minutesEl = document.getElementById("minutesRead");
    const activeDaysEl = document.getElementById("activeDays");
    const achievementGrid = document.getElementById("achievementGrid");
    const favoriteGenres = document.getElementById("favoriteGenres");
    const readingGoals = document.getElementById("readingGoals");
    const specialBadges = document.getElementById("specialBadges");

    // Modal elements
    const editModal = document.getElementById("editModal");
    const usernameInput = document.getElementById("usernameInput");
    const avatarPicker = document.getElementById("avatarPicker");
    const modalAvatarPreview = document.getElementById("modalAvatarPreview");
    const modalAvatarFallback = document.getElementById("modalAvatarFallback");
    const saveBtn = document.getElementById("saveProfileBtn");
    const closeBtn = document.getElementById("closeModalBtn");

    function formatHours(seconds) {
      const hours = (Number(seconds) || 0) / 3600;
      if (hours <= 0) return "0h";
      if (hours < 0.1) return "<0.1h";
      if (hours < 1) return hours.toFixed(1) + "h";
      return Math.round(hours * 10) / 10 + "h";
    }

    function getRealStats(u) {
      const completedStories = Array.isArray(u.completedStories) ? u.completedStories.length : 0;
      const readChapters = Array.isArray(u.readChapters) ? u.readChapters.length : 0;
      const activeDays = Array.isArray(u.activeDays) ? u.activeDays.length : Number(u.activeDays || 0);
      const readingSeconds = Number(u.readingSeconds || ((u.minutesRead || 0) * 60));
      return {
        booksRead: Math.max(Number(u.booksRead || 0), completedStories),
        chaptersRead: readChapters || Number(u.chaptersRead || 0) || Number(u.chaptersCompleted || 0),
        readingSeconds,
        minutesRead: Math.floor(readingSeconds / 60),
        activeDays,
        streak: Number(u.streak || 0),
        pagesRead: Number(u.pagesRead || 0),
        readToday: u.lastReadDate === todayKey()
      };
    }

    // Render profile
    function renderProfile() {
      const u = getUser();
      const stats = getRealStats(u);
      if (nameEl) nameEl.textContent = u.username || "Guest";
      if (usernameEl) usernameEl.textContent = "@" + ((u.username || "reader").toString().replace(/\s+/g, "").toLowerCase());

      const bioEl = document.getElementById("profileBio");
      const followersEl = document.getElementById("followersCount");
      const followingEl = document.getElementById("followingCount");

      if (bioEl) bioEl.textContent = u.bio || "Passionate reader & storyteller.";
      const followingCount = (typeof NiveSocial !== "undefined" && NiveSocial.getState().following) 
        ? NiveSocial.getState().following.length 
        : (Array.isArray(u.following) ? u.following.length : Number(u.following || 4));
      const followersCount = Number(u.followers || 12);

      if (followersEl) followersEl.textContent = followersCount;
      if (followingEl) followingEl.textContent = followingCount;

      if (levelEl) levelEl.textContent = "Level " + (u.level || 1);
      const activeCoinEl = document.getElementById("profileCoinCount") || document.getElementById("coinCount");
      if (activeCoinEl) activeCoinEl.textContent = Number(u.coins || 0).toLocaleString();
      if (booksReadEl) booksReadEl.textContent = stats.booksRead;
      achievementsCountEl.textContent = (u.achievements ? u.achievements.length : 0);
      streakEl.textContent = stats.streak + (stats.streak === 1 ? " day" : " days");
      chaptersEl.textContent = stats.chaptersRead;
      hoursEl.textContent = formatHours(stats.readingSeconds);
      pagesEl.textContent = stats.pagesRead;
      minutesEl.textContent = stats.minutesRead;
      activeDaysEl.textContent = stats.activeDays;
      streakMessageEl.textContent = stats.readToday
        ? `You kept your ${stats.streak}-day streak alive.`
        : stats.streak > 0
          ? "Read one chapter today to keep your streak alive."
          : "Read one chapter to start your first streak.";
      streakTodayEl.textContent = stats.readToday ? "Done today" : "Read today";
      streakTodayEl.classList.toggle("is-done", stats.readToday);


      // XP bar
      const xp = (u.xp || 0);
      const percent = Math.min(100, Math.round((xp % 100)));
      xpFill.style.width = percent + "%";
      xpPercentLabel.textContent = percent + "%";

      // Avatar
      if (u.avatar) {
        avatarImg.src = u.avatar;
        avatarImg.style.display = "";
        avatarFallback.style.display = "none";
      } else {
        avatarImg.style.display = "none";
        avatarFallback.style.display = "";
      }

      // Favorite genres
      favoriteGenres.innerHTML = "";
      (u.favoriteGenres || ["Thriller","Fantasy","Romance","Sci-Fi"]).forEach(g => {
        const el = document.createElement("div");
        el.className = "card";
        el.textContent = g;
        el.style.padding = "8px 12px";
        el.style.borderRadius = "999px";
        el.style.background = "var(--card)";
        el.style.border = "1px solid var(--border)";
        favoriteGenres.appendChild(el);
      });

      renderReadingGoals(u);
      renderSpecialBadges(u);
    }

    function renderReadingGoals(u) {
      if (!readingGoals) return;
      const goals = typeof getReadingGoals === "function" ? getReadingGoals(u) : [];
      readingGoals.innerHTML = "";

      if (!goals.length) {
        readingGoals.innerHTML = '<div class="empty-state"><strong>No goals yet</strong><span>Your reading goals will appear here.</span></div>';
        return;
      }

      goals.forEach(goal => {
        const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
        const card = document.createElement("div");
        card.className = "card goal-card";
        card.innerHTML = `
          <div class="goal-card-head">
            <div class="goal-title">${escapeHtml(goal.title)}</div>
            <div class="small muted">${goal.current}/${goal.target}</div>
          </div>
          <div class="goal-progress" aria-hidden="true">
            <div class="goal-progress-fill" style="width:${percent}%"></div>
          </div>
          <div class="small muted">${escapeHtml(goal.reward)}</div>
        `;
        readingGoals.appendChild(card);
      });
    }

    function renderSpecialBadges(u) {
      if (!specialBadges) return;
      const badges = Array.isArray(u.specialBadges) ? u.specialBadges : [];
      specialBadges.innerHTML = "";

      if (!badges.length) {
        specialBadges.innerHTML = '<div class="empty-state"><strong>No badges yet</strong><span>Unlock achievements to earn special badges.</span></div>';
        return;
      }

      badges.forEach(badge => {
        const el = document.createElement("div");
        el.className = "special-badge";
        el.innerHTML = `<span class="material-symbols-rounded">military_tech</span><span>${escapeHtml(badge)}</span>`;
        specialBadges.appendChild(el);
      });
    }

    // Load achievements with compact filtering
    let allAchievementsList = [];
    const categorySelect = document.getElementById("achievementCategorySelect");
    const toggleExpandBtn = document.getElementById("toggleAchievementExpandBtn");
    const gridContainer = document.getElementById("achievementGridContainer");
    const unlockedCountEl = document.getElementById("unlockedAchievementCount");
    const totalCountEl = document.getElementById("totalAchievementCount");
    let isExpanded = false;

    function renderFilteredAchievements() {
      if (!achievementGrid) return;
      achievementGrid.innerHTML = "";
      const profileUser = getUser();
      const unlocked = new Set((profileUser.achievements || []));
      const filterCategory = categorySelect ? categorySelect.value : "all";

      let filtered = allAchievementsList.slice();
      if (filterCategory === "unlocked") {
        filtered = filtered.filter(a => unlocked.has(a.id));
      } else if (filterCategory !== "all") {
        filtered = filtered.filter(a => a.category === filterCategory || (a.category === "Goal" && filterCategory === "Goal"));
      }

      if (unlockedCountEl) unlockedCountEl.textContent = unlocked.size;
      if (totalCountEl) totalCountEl.textContent = allAchievementsList.length;

      if (!filtered.length) {
        achievementGrid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; padding:24px 12px; text-align:center;"><strong>No achievements found</strong><span>Try choosing another category.</span></div>';
        return;
      }

      filtered.forEach(a => {
        const reward = a.reward || {};
        const rewardText = [
          reward.xp ? `+${reward.xp} XP` : "",
          reward.coins ? `+${reward.coins} coins` : "",
          reward.badge || ""
        ].filter(Boolean).join(" / ");
        const svgIconHtml = window.getAchievementIconSvg ? window.getAchievementIconSvg(a.id) : `<img src="${a.icon}" alt="${escapeHtml(a.title)}" class="achievement-icon">`;
        const card = document.createElement("div");
        card.className = "card achievement-card";
        card.innerHTML = `
          <div class="achievement-card-inner">
            <div class="achievement-icon-wrap">${svgIconHtml}</div>
            <div class="achievement-copy">
              <div class="achievement-title">${escapeHtml(a.title)}</div>
              <div class="achievement-desc small muted">${escapeHtml(a.description)}</div>
              <div class="achievement-meta small muted">${escapeHtml(a.category || "Achievement")}${rewardText ? " / " + rewardText : ""}</div>
            </div>
            <div class="achievement-state ${unlocked.has(a.id) ? "is-unlocked" : ""}">
              ${unlocked.has(a.id) ? '✓' : '🔒'}
            </div>
          </div>
        `;
        achievementGrid.appendChild(card);
      });
    }

    async function loadAchievements() {
      try {
        if (typeof fetchAchievements === "function") {
          allAchievementsList = await fetchAchievements();
        } else {
          const res = await fetch("data/achievements.json").catch(() => null);
          if (res && res.ok) allAchievementsList = await res.json();
        }
        renderFilteredAchievements();
      } catch (e) {
        console.error("loadAchievements error", e);
      }
    }

    if (categorySelect) categorySelect.addEventListener("change", renderFilteredAchievements);
    if (toggleExpandBtn && gridContainer) {
      toggleExpandBtn.addEventListener("click", () => {
        isExpanded = !isExpanded;
        if (isExpanded) {
          gridContainer.style.maxHeight = "none";
          toggleExpandBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;">unfold_less</span> Collapse';
        } else {
          gridContainer.style.maxHeight = "280px";
          toggleExpandBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;">unfold_more</span> View All';
          gridContainer.scrollTop = 0;
        }
      });
    }


    // Modal logic
    function openEditModal() {
      const u = getUser();
      const bioInput = document.getElementById("bioInput");
      usernameInput.value = u.username || "";
      if (bioInput) bioInput.value = u.bio || "";
      selectedAvatar = u.avatar || "";
      if (selectedAvatar) {
        modalAvatarPreview.src = selectedAvatar;
        modalAvatarPreview.style.display = "";
        modalAvatarFallback.style.display = "none";
      } else {
        modalAvatarPreview.style.display = "none";
        modalAvatarFallback.style.display = "";
      }
      editModal.style.display = "flex";
      editModal.setAttribute("aria-hidden", "false");
    }
    function closeEditModal() {
      editModal.style.display = "none";
      editModal.setAttribute("aria-hidden", "true");
    }

    // Custom Photo Upload & Canvas Resizing
    const avatarFileInput = document.getElementById("avatarFileInput");
    const uploadAvatarBtn = document.getElementById("uploadAvatarBtn");

    function resizeAndCropAvatar(file, maxDimension = 220) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = maxDimension;
            canvas.height = maxDimension;
            const ctx = canvas.getContext("2d");

            // Crop to square aspect ratio (object-fit: cover equivalent)
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxDimension, maxDimension);
            resolve(canvas.toDataURL("image/jpeg", 0.88));
          };
          img.onerror = () => reject(new Error("Failed to load image."));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(file);
      });
    }

    if (uploadAvatarBtn && avatarFileInput) {
      uploadAvatarBtn.addEventListener("click", () => avatarFileInput.click());
      avatarFileInput.addEventListener("change", async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try {
          uploadAvatarBtn.disabled = true;
          uploadAvatarBtn.innerHTML = '<span class="material-symbols-rounded">sync</span> Resizing...';
          const resizedDataUrl = await resizeAndCropAvatar(file, 220);
          selectedAvatar = resizedDataUrl;
          modalAvatarPreview.src = selectedAvatar;
          modalAvatarPreview.style.display = "";
          modalAvatarFallback.style.display = "none";
          showToast("Photo uploaded & resized!");
        } catch (err) {
          showToast("Failed to process image file.");
        } finally {
          uploadAvatarBtn.disabled = false;
          uploadAvatarBtn.innerHTML = '<span class="material-symbols-rounded">upload</span> Upload Custom Photo';
          avatarFileInput.value = "";
        }
      });
    }

    // Avatar picker wiring
    avatarPicker.querySelectorAll(".avatar-option").forEach(img => {
      img.addEventListener("click", () => {
        avatarPicker.querySelectorAll(".avatar-option").forEach(i => i.style.border = "2px solid transparent");
        img.style.border = "2px solid var(--accent)";
        selectedAvatar = img.getAttribute("src");
        modalAvatarPreview.src = selectedAvatar;
        modalAvatarPreview.style.display = "";
        modalAvatarFallback.style.display = "none";
      });
    });

    // Save profile
    saveBtn.addEventListener("click", async () => {
      const bioInput = document.getElementById("bioInput");
      const newName = (usernameInput.value || "").trim();
      if (!newName) return showToast("Please enter a username.");
      const latestUser = getUser();
      latestUser.username = newName;
      if (bioInput) latestUser.bio = (bioInput.value || "").trim();
      if (selectedAvatar) latestUser.avatar = selectedAvatar;
      if (typeof saveUserAsync === "function") await saveUserAsync(latestUser);
      else saveUser(latestUser);
      renderProfile();
      closeEditModal();
      window.dispatchEvent(new Event("userUpdated"));
      showToast("Profile updated successfully!");
    });

    closeBtn.addEventListener("click", closeEditModal);
    document.getElementById("editProfileBtn").addEventListener("click", openEditModal);

    // Followers & Following Modal Wiring
    const socialListModal = document.getElementById("socialListModal");
    const socialListTitle = document.getElementById("socialListTitle");
    const socialListContent = document.getElementById("socialListContent");
    const closeSocialListBtn = document.getElementById("closeSocialListBtn");

    function openSocialModal(type) {
      if (!socialListModal || !socialListContent) return;
      const isFollowers = type === "followers";
      socialListTitle.textContent = isFollowers ? "Followers" : "Following";
      
      const users = isFollowers 
        ? (window.NiveSocial ? window.NiveSocial.getFollowersUsers() : [])
        : (window.NiveSocial ? window.NiveSocial.getFollowingUsers() : []);

      if (!users.length) {
        socialListContent.innerHTML = isFollowers
          ? '<div class="empty-state" style="padding:24px 12px; text-align:center;"><strong>No followers yet</strong><span class="small muted" style="display:block; margin-top:4px;">When other readers follow you, they will appear here.</span></div>'
          : '<div class="empty-state" style="padding:24px 12px; text-align:center;"><strong>Not following anyone yet</strong><span class="small muted" style="display:block; margin-top:4px;">Find readers on the Social page to build your circle!</span><button class="btn small" style="margin-top:12px;" data-action="open-social" type="button">Explore Social</button></div>';
      } else {
        socialListContent.innerHTML = users.map(u => `
          <div class="compact-user" style="padding:10px 0; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px;">
            <img src="${escapeHtml(u.avatar || 'assets/avatars/avatar1.png')}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
            <div style="flex:1; min-width:0;">
              <strong style="display:block; font-size:14px;">@${escapeHtml(u.username)}</strong>
              <span class="small muted" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">${escapeHtml(u.bio || u.displayName || '')}</span>
            </div>
            <button class="btn small ghost" data-action="open-social" type="button">Message</button>
          </div>
        `).join("");
      }

      socialListModal.style.display = "flex";
      socialListModal.setAttribute("aria-hidden", "false");
    }

    const followersLabel = document.getElementById("followersCountLabel");
    const followingLabel = document.getElementById("followingCountLabel");

    if (followersLabel) {
      followersLabel.style.cursor = "pointer";
      followersLabel.addEventListener("click", () => openSocialModal("followers"));
    }
    if (followingLabel) {
      followingLabel.style.cursor = "pointer";
      followingLabel.addEventListener("click", () => openSocialModal("following"));
    }
    if (closeSocialListBtn) {
      closeSocialListBtn.addEventListener("click", () => {
        socialListModal.style.display = "none";
        socialListModal.setAttribute("aria-hidden", "true");
      });
    }
    if (socialListContent) {
      socialListContent.addEventListener("click", event => {
        if (event.target.closest('[data-action="open-social"]')) {
          location.href = "social.html";
        }
      });
    }

    // Initial render
    renderProfile();
    loadAchievements();

    window.addEventListener("userUpdated", () => {
      renderProfile();
    });

    // Ensure navigation is present and active
    if (typeof renderNavigation === "function") {
      renderNavigation("profile");
    } else {
      setTimeout(() => { if (typeof renderNavigation === "function") renderNavigation("profile"); }, 120);
    }
  });
})();
