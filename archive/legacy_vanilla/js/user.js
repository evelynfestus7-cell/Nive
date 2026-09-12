// ======================
// USER MANAGEMENT
// Centralized user helpers used across all pages
// ======================

const USER_KEY = "nive_user";
const LOGIN_KEY = "nive_logged_in";
const ADMIN_EMAIL = "evelynfestus7@gmail.com";

// ======================
// DEFAULT USER
// ======================
function getDefaultUser() {
  return {
    username: "Reader",
    email: "",
    avatar: "assets/avatars/avatar1.png",
    bio: "Passionate reader & storyteller.",
    followers: [],
    following: [],

    level: 1,

    xp: 0,
    booksRead: 0,
    chaptersCompleted: 0,
    chaptersRead: 0,
    pagesRead: 0,
    minutesRead: 0,
    readingSeconds: 0,
    activeDays: [],
    readChapters: [],
    achievements: [],
    specialBadges: [],
    readingGoals: {
      dailyChapters: 1,
      weeklyActiveDays: 3,
      monthlyPages: 100
    },
    coins: 100,
    streak: 0,
    lastReadDate: "",
    lastChapter: {},
    bookmarks: [],
    library: [],
    favorites: [],
    completedStories: [],
    unlockedStories: [],
    readingProgress: {},
    unlockedChapters: {},
    premium: false,
    role: "reader",
    onboardingComplete: true,
    joined: new Date().toISOString()
  };
}

// ======================
// GET USER (safe, always returns valid object)
// ======================
function getUser() {
  const saved = localStorage.getItem(USER_KEY);
  if (!saved) return getDefaultUser();
  try {
    return { ...getDefaultUser(), ...JSON.parse(saved) };
  } catch (e) {
    console.warn("Failed to parse user data:", e);
    return getDefaultUser();
  }
}

// ======================
// SAVE USER (Local + Firestore)
// ======================
function saveUser(user) {
  try {
    // 1. Save locally
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    // 2. Sync to Firestore if authenticated
    if (window.firebase && firebase.auth().currentUser) {
      const uid = firebase.auth().currentUser.uid;
      firebase.firestore().collection("users").doc(uid).set(user, { merge: true })
        .catch(e => console.error("Firestore sync failed:", e));
    }

    // 3. Dispatch event to update all UI badges & profile stats
    window.dispatchEvent(new Event("userUpdated"));
  } catch (e) {
    console.error("Failed to save user:", e);
  }
}

async function saveUserAsync(user, uid) {
  const targetUid = uid || (window.firebase && firebase.auth().currentUser ? firebase.auth().currentUser.uid : null);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  if (!window.firebase || !targetUid) {
    window.dispatchEvent(new Event("userUpdated"));
    return user;
  }

  try {
    await firebase.firestore().collection("users").doc(targetUid).set({
      ...user,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.warn("Firestore profile sync failed; using local profile cache:", error);
  }

  window.dispatchEvent(new Event("userUpdated"));
  return user;
}

async function hydrateUserFromFirebase(firebaseUser) {
  if (!window.firebase || !firebaseUser) return getUser();

  const fallbackProfile = {
    ...getDefaultUser(),
    ...getUser(),
    email: firebaseUser.email || getUser().email || "",
    username: firebaseUser.displayName || getUser().username || "Reader",
    avatar: firebaseUser.photoURL || getUser().avatar || getDefaultUser().avatar,
    emailVerified: !!firebaseUser.emailVerified,
    uid: firebaseUser.uid
  };

  let userData = fallbackProfile;

  try {
    const docRef = firebase.firestore().collection("users").doc(firebaseUser.uid);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      userData = { ...fallbackProfile, ...docSnap.data(), uid: firebaseUser.uid };
    } else {
      userData = {
        ...fallbackProfile,
        onboardingComplete: false,
        createdAt: new Date().toISOString()
      };
      await docRef.set(userData);
    }
  } catch (error) {
    console.warn("Firestore profile hydration failed; continuing with local profile:", error);
  }

  localStorage.setItem(USER_KEY, JSON.stringify(userData));
  loginUser();
  window.dispatchEvent(new Event("userUpdated"));
  return userData;
}

async function userHasAdminAccess(firebaseUser) {
  if (!window.firebase || !firebaseUser) return false;
  return (firebaseUser.email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

async function getPostAuthRedirect(firebaseUser, userData) {
  if (await userHasAdminAccess(firebaseUser)) return "admin-dashboard.html";
  return userData && userData.onboardingComplete === false ? "onboarding.html" : "home.html";
}

// ======================
// LOGIN / LOGOUT / CHECK
// ======================
function loginUser() {
  localStorage.setItem(LOGIN_KEY, "true");
}

function logoutUser() {
  const clearLocalSession = () => {
    localStorage.removeItem(LOGIN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("nive_admin_logged_in");
    window.location.replace("Index.html");
  };

  if (window.firebase) {
    return firebase.auth().signOut().catch(error => {
      console.error("Firebase sign out failed:", error);
    }).finally(() => {
      clearLocalSession();
    });
  }

  clearLocalSession();
  return Promise.resolve();
}

function isLoggedIn() {
  return !!(window.firebase && firebase.auth().currentUser);
}

function isAuthPage() {
  const currentPath = window.location.pathname.toLowerCase();
  return ["index.html", "signup.html", "forgot-password.html"].some(page => currentPath.endsWith(page)) || currentPath.endsWith("/");
}

function isProtectedPage() {
  const currentPath = window.location.pathname.toLowerCase();
  const protectedPages = [
    "home.html",
    "library.html",
    "profile.html",
    "settings.html",
    "social.html",
    "store.html",
    "search.html",
    "story.html",
    "reader.html",
    "onboarding.html"
  ];
  return protectedPages.some(page => currentPath.endsWith(page));
}

// ======================
// FIREBASE AUTH LISTENER
// ======================
if (window.firebase) {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const userData = await hydrateUserFromFirebase(user);
        if (isAuthPage()) {
          window.location.replace(await getPostAuthRedirect(user, userData));
        }
      } catch (err) {
        console.error("Error fetching Firestore user:", err);
      }
    } else {
      localStorage.removeItem(LOGIN_KEY);
      if (isProtectedPage()) {
        window.location.href = "Index.html";
      }
    }
  });
}

// ======================
// SHARED UTILITY HELPERS
// These were duplicated across 5+ files — now centralized
// ======================

/**
 * Normalize any ID to a string for consistent comparison.
 * Returns null for null/undefined, string for everything else.
 */
function normalizeId(id) {
  return id === null || id === undefined ? null : String(id);
}

/**
 * XSS-safe HTML escaping for user-generated content.
 */
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

/**
 * Returns today's date as a YYYY-MM-DD string.
 */
function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns yesterday's date as a YYYY-MM-DD string.
 */
function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

/**
 * Show a toast notification using the global toast system.
 * Falls back to creating one if the #toast element doesn't exist.
 */
function showToast(message, duration = 2500) {
  // Remove any existing toast
  const existing = document.getElementById("toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toast";
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-60px);
    background: var(--card, #111);
    color: var(--text, #fff);
    padding: 12px 20px;
    border-radius: 14px;
    z-index: 99999;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.1);
    font-size: 14px;
    font-weight: 600;
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
  `;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });

  // Animate out
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-20px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Checks if the daily login reward is available and displays the reward modal
 */
function checkDailyRewardModal() {
  const user = getUser();
  const today = todayKey();
  
  // Only trigger once per day
  if (user.lastDailyRewardDate === today) return;

  const rewardCoins = 25;
  const modal = document.createElement("div");
  modal.className = "daily-reward-modal";
  modal.id = "dailyRewardModal";
  modal.innerHTML = `
    <div class="daily-reward-card">
      <div class="daily-reward-icon">🎁</div>
      <div class="daily-reward-title">Daily Login Reward!</div>
      <p class="daily-reward-desc">Welcome back to Nive! Here is your daily reader bonus.</p>
      <div class="daily-reward-amount">🪙 +${rewardCoins} Coins</div>
      <button type="button" class="daily-reward-btn" id="claimRewardBtn">Claim Reward</button>
    </div>
  `;

  document.body.appendChild(modal);

  const claimBtn = modal.querySelector("#claimRewardBtn");
  if (claimBtn) {
    claimBtn.addEventListener("click", async () => {
      claimBtn.disabled = true;
      claimBtn.textContent = "Claimed!";
      
      user.coins = (Number(user.coins) || 0) + rewardCoins;
      user.lastDailyRewardDate = today;
      saveUser(user);

      // Save to Firestore if connected
      if (window.firebase && firebase.auth().currentUser) {
        try {
          await firebase.firestore().collection("users").doc(firebase.auth().currentUser.uid).set({
            coins: user.coins,
            lastDailyRewardDate: today
          }, { merge: true });
        } catch (e) {
          console.warn("Could not sync daily reward to firestore:", e);
        }
      }

      showToast(`🎁 Claimed ${rewardCoins} free coins!`);
      
      // Update header coin display if present
      const headerCoin = document.getElementById("headerCoinCount");
      if (headerCoin) headerCoin.textContent = `🪙 ${user.coins}`;
      const homeCoin = document.getElementById("coinCount");
      if (homeCoin) homeCoin.textContent = `🪙 ${user.coins}`;

      setTimeout(() => {
        modal.style.opacity = "0";
        setTimeout(() => modal.remove(), 250);
      }, 400);
    });
  }
}
