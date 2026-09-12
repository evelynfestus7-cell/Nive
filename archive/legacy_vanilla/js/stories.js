// js/stories.js
(function(){
  "use strict";
  const LOCAL_KEY = "nive_custom_stories";
  const DELETED_KEY = "nive_deleted_stories";

  function loadLocalStories(){
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); }
    catch(e){ console.error(e); return []; }
  }
  function saveLocalStories(list){
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list || [])); }
    catch(e){ console.error(e); }
  }
  function loadDeleted(){ try { return JSON.parse(localStorage.getItem(DELETED_KEY) || "[]"); } catch(e){ return []; } }

  async function loadRemote(){
    try {
      const r = await fetch("data/stories.json", { cache: "no-store" });
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    } catch(e){ console.warn("Could not load remote stories:", e); return []; }
  }

  async function getAllStories(){
    const local = Array.isArray(loadLocalStories()) ? loadLocalStories() : [];
    const loadedRemote = await loadRemote();
    const remote = Array.isArray(loadedRemote) ? loadedRemote : [];
    const deleted = loadDeleted();
    const map = new Map();
    remote.forEach(s => { if (s && s.id) map.set(String(s.id), s); });
    local.forEach(s => { if (s && s.id) map.set(String(s.id), s); });
    return Array.from(map.values()).filter(s => !deleted.includes(s.id));
  }

  async function getStoryById(id){
    if (!id) return null;
    const list = await getAllStories();
    return list.find(s => String(s.id) === String(id)) || null;
  }

  async function searchStories(q){
    if (!q) return await getAllStories();
    const ql = String(q).trim().toLowerCase();
    const list = await getAllStories();
    return list.filter(s => (s.title||'').toLowerCase().includes(ql) || (s.author||'').toLowerCase().includes(ql) || (s.genre||'').toLowerCase().includes(ql) || (s.description||'').toLowerCase().includes(ql));
  }

  window.getAllStories = getAllStories;
  window.getStoryById = getStoryById;
  window.searchStories = searchStories;
  window.loadLocalStories = loadLocalStories;
  window.saveLocalStories = saveLocalStories;
})();
