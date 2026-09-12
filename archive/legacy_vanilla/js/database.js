// js/database.js
// Firestore-backed data layer with packaged JSON/localStorage fallback

let _cachedDefaultStories = null;
let _cachedDefaultChapters = null;
let _cachedFirestoreStories = null;
const FIRESTORE_CACHE_MS = 60000;
let _lastFirestoreStoriesFetch = 0;

function hasFirestore() {
  return !!(window.firebase && firebase.apps && firebase.apps.length && firebase.firestore);
}

function fromDoc(doc) {
  return { id: doc.id, ...doc.data() };
}

async function getFirestoreStories() {
  if (!hasFirestore()) return [];

  const now = Date.now();
  if (_cachedFirestoreStories && now - _lastFirestoreStoriesFetch < FIRESTORE_CACHE_MS) {
    return _cachedFirestoreStories;
  }

  try {
    const snapshot = await firebase.firestore().collection("stories").get();
    _cachedFirestoreStories = snapshot.docs.map(fromDoc);
    _lastFirestoreStoriesFetch = now;
    return _cachedFirestoreStories;
  } catch (error) {
    console.warn("Could not load Firestore stories:", error);
    return [];
  }
}

// STORIES
async function getStories() {
  if (_cachedDefaultStories === null) {
    try {
      const r = await fetch("data/stories.json", { cache: "default" });
      if (r.ok) {
        _cachedDefaultStories = await r.json();
        if (!Array.isArray(_cachedDefaultStories)) _cachedDefaultStories = [];
      } else {
        _cachedDefaultStories = [];
      }
    } catch (e) {
      console.warn("Could not load default stories:", e);
      _cachedDefaultStories = [];
    }
  }
  const defaultStories = _cachedDefaultStories;
  const firestoreStories = await getFirestoreStories();
  const custom = getCustomStories();
  const deleted = getDeletedStories();
  const byId = new Map();

  [...defaultStories, ...firestoreStories, ...custom].forEach(story => {
    if (story && story.id && !deleted.includes(story.id)) {
      byId.set(String(story.id), story);
    }
  });

  return Array.from(byId.values());
}

async function getStory(storyId) {
  if (!storyId) return null;
  const list = await getStories();
  return list.find(s => String(s.id) === String(storyId)) || null;
}

// CHAPTERS
async function getChapters(storyId) {
  if (hasFirestore() && storyId) {
    try {
      const snapshot = await firebase.firestore()
        .collection("stories")
        .doc(String(storyId))
        .collection("chapters")
        .get();

      if (!snapshot.empty) {
        return snapshot.docs
          .map(fromDoc)
          .sort((a, b) => (Number(a.order || a.id) || 0) - (Number(b.order || b.id) || 0));
      }
    } catch (error) {
      console.warn("Could not load Firestore chapters:", error);
    }
  }

  if (_cachedDefaultChapters === null) {
    try {
      const r = await fetch("data/chapters.json", { cache: "default" });
      if (r.ok) {
        _cachedDefaultChapters = await r.json();
      } else {
        _cachedDefaultChapters = {};
      }
    } catch (e) { 
      console.warn("Could not load chapters:", e); 
      _cachedDefaultChapters = {};
    }
  }
  const chapters = _cachedDefaultChapters;
  const custom = getCustomChapters();
  return custom[storyId] || chapters[storyId] || [];
}

async function getChapter(storyId, chapterId) {
  const ch = await getChapters(storyId);
  return ch.find(c => String(c.id) === String(chapterId)) || null;
}

// CUSTOM STORIES
function getCustomStories() {
  try { return JSON.parse(localStorage.getItem("nive_custom_stories") || "[]"); }
  catch (e) { console.error(e); return []; }
}
function saveCustomStories(list) {
  const stories = list || [];
  try { localStorage.setItem("nive_custom_stories", JSON.stringify(stories)); }
  catch (e) { console.error("Failed to save custom stories:", e); }
  syncStoriesToFirestore(stories);
}

// DELETED
function getDeletedStories() {
  try { return JSON.parse(localStorage.getItem("nive_deleted_stories") || "[]"); }
  catch (e) { console.error(e); return []; }
}
function saveDeletedStories(ids) {
  localStorage.setItem("nive_deleted_stories", JSON.stringify(ids || []));
  syncDeletedStoriesToFirestore(ids || []);
}

// CUSTOM CHAPTERS
function getCustomChapters() {
  try { return JSON.parse(localStorage.getItem("nive_custom_chapters") || "{}"); }
  catch (e) { console.error(e); return {}; }
}
function saveCustomChapters(obj) {
  const chapters = obj || {};
  localStorage.setItem("nive_custom_chapters", JSON.stringify(chapters));
  syncChaptersToFirestore(chapters);
}

async function syncStoriesToFirestore(stories) {
  if (!hasFirestore()) return;

  try {
    const batch = firebase.firestore().batch();
    stories.forEach(story => {
      if (!story || !story.id) return;
      const ref = firebase.firestore().collection("stories").doc(String(story.id));
      batch.set(ref, {
        ...story,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await batch.commit();
    _cachedFirestoreStories = null;
  } catch (error) {
    console.warn("Could not sync stories to Firestore:", error);
  }
}

async function syncDeletedStoriesToFirestore(ids) {
  if (!hasFirestore()) return;

  try {
    await firebase.firestore().collection("appState").doc("deletedStories").set({
      ids,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn("Could not sync deleted story list:", error);
  }
}

async function syncChaptersToFirestore(chaptersByStory) {
  if (!hasFirestore()) return;

  try {
    const batch = firebase.firestore().batch();
    Object.entries(chaptersByStory).forEach(([storyId, chapters]) => {
      (chapters || []).forEach((chapter, index) => {
        if (!chapter || !chapter.id) return;
        const ref = firebase.firestore()
          .collection("stories")
          .doc(String(storyId))
          .collection("chapters")
          .doc(String(chapter.id));
        batch.set(ref, {
          ...chapter,
          storyId: String(storyId),
          order: chapter.order || index + 1,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
    });
    await batch.commit();
  } catch (error) {
    console.warn("Could not sync chapters to Firestore:", error);
  }
}

async function getUserList() {
  if (!hasFirestore()) return [];

  try {
    const snapshot = await firebase.firestore().collection("users").get();
    return snapshot.docs.map(doc => {
      const user = doc.data();
      return {
        id: doc.id,
        name: user.username || user.email || "Reader",
        email: user.email || "",
        progress: user.chaptersRead || user.chaptersCompleted || 0,
        role: user.role || "reader",
        coins: user.coins || 0,
        level: user.level || 1
      };
    });
  } catch (error) {
    console.warn("Could not load users:", error);
    return [];
  }
}

async function updateUser(id, updates) {
  if (!hasFirestore() || !id) return;
  await firebase.firestore().collection("users").doc(String(id)).set({
    ...updates,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

async function deleteUserRecord(id) {
  if (!hasFirestore() || !id) return;
  await firebase.firestore().collection("users").doc(String(id)).delete();
}

async function seedPackagedDataToFirestore() {
  if (!hasFirestore()) throw new Error("Firestore is not available.");

  if (_cachedDefaultStories === null) {
    const storiesResponse = await fetch("data/stories.json", { cache: "default" });
    _cachedDefaultStories = storiesResponse.ok ? await storiesResponse.json() : [];
  }

  if (_cachedDefaultChapters === null) {
    const chaptersResponse = await fetch("data/chapters.json", { cache: "default" });
    _cachedDefaultChapters = chaptersResponse.ok ? await chaptersResponse.json() : {};
  }

  await syncStoriesToFirestore(_cachedDefaultStories || []);
  await syncChaptersToFirestore(_cachedDefaultChapters || {});
  _cachedFirestoreStories = null;

  return {
    stories: (_cachedDefaultStories || []).length,
    chapters: Object.values(_cachedDefaultChapters || {}).reduce((sum, list) => sum + (list || []).length, 0)
  };
}
