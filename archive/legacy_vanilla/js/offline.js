// ======================
// OFFLINE STORIES
// IndexedDB-backed storage with localStorage index compatibility.
// ======================

const OFFLINE_DB_NAME = "nive_offline_db";
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE = "stories";
const OFFLINE_INDEX_KEY = "offlineStoryIds";
const LEGACY_OFFLINE_KEY = "offlineStories";

function getOfflineIndex() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_INDEX_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveOfflineIndex(ids) {
  localStorage.setItem(OFFLINE_INDEX_KEY, JSON.stringify(Array.from(new Set(ids || []))));
}

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported in this browser."));
      return;
    }

    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: "storyId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline database."));
  });
}

async function putOfflineRecord(record) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    tx.objectStore(OFFLINE_STORE).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error || new Error("Could not save offline story."));
  });
}

async function getOfflineRecord(storyId) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(OFFLINE_STORE, "readonly")
      .objectStore(OFFLINE_STORE)
      .get(String(storyId));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Could not read offline story."));
  });
}

async function deleteOfflineRecord(storyId) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    tx.objectStore(OFFLINE_STORE).delete(String(storyId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Could not delete offline story."));
  });
}

function getLegacyOfflineStories() {
  try {
    return JSON.parse(localStorage.getItem(LEGACY_OFFLINE_KEY) || "{}");
  } catch {
    return {};
  }
}

async function migrateLegacyOfflineStories() {
  const legacy = getLegacyOfflineStories();
  const ids = Object.keys(legacy);
  if (!ids.length) return;

  await Promise.all(ids.map(id => putOfflineRecord({
    storyId: String(id),
    ...legacy[id],
    savedAt: legacy[id]?.savedAt || new Date().toISOString()
  })));
  saveOfflineIndex([...getOfflineIndex(), ...ids]);
  localStorage.removeItem(LEGACY_OFFLINE_KEY);
}

async function downloadStory(storyId) {
  const normalizedStoryId = String(storyId || "");
  const user = getUser();
  const story = await getStory(normalizedStoryId);

  if (!story) return false;

  user.unlockedStories = Array.isArray(user.unlockedStories) ? user.unlockedStories : [];
  if (story.premium && !user.unlockedStories.includes(normalizedStoryId)) {
    alert("Unlock this story first.");
    return false;
  }

  const chapters = await getChapters(normalizedStoryId);
  await putOfflineRecord({
    storyId: normalizedStoryId,
    story,
    chapters,
    savedAt: new Date().toISOString()
  });
  saveOfflineIndex([...getOfflineIndex(), normalizedStoryId]);
  return true;
}

async function deleteOfflineStory(storyId) {
  const normalizedStoryId = String(storyId || "");
  await deleteOfflineRecord(normalizedStoryId);
  saveOfflineIndex(getOfflineIndex().filter(id => id !== normalizedStoryId));
}

function isStoryDownloaded(storyId) {
  return getOfflineIndex().includes(String(storyId || ""));
}

async function getOfflineStory(storyId) {
  const record = await getOfflineRecord(storyId).catch(() => null);
  if (record) return { story: record.story, chapters: record.chapters };
  return getLegacyOfflineStories()[storyId] || null;
}

function getOfflineStories() {
  return getOfflineIndex();
}

migrateLegacyOfflineStories().catch(error => {
  console.warn("Offline story migration skipped:", error);
});
