// chapter-editor.js
const params = new URLSearchParams(window.location.search);
const STORY_ID = params.get("id") || params.get("story");
if (!STORY_ID) {
  document.body.innerHTML = "<h2 style='text-align:center;'>No story selected. Open with ?id=story-id</h2>";
  throw new Error("Missing STORY_ID");
}

let currentChapters = [];
let currentChoices = [];

// UI refs
const titleEl = document.getElementById("chapterTitle");
const contentEl = document.getElementById("chapterContent");
const moodEl = document.getElementById("chapterMood");
const effectEl = document.getElementById("chapterEffect");
const centerEl = document.getElementById("chapterCenter");
const climaxEl = document.getElementById("chapterClimax");
const artFileEl = document.getElementById("chapterArtFile");
const artPreviewEl = document.getElementById("chapterArtPreview");
const useArtBtn = document.getElementById("useArtBtn");
const clearArtBtn = document.getElementById("clearArtBtn");
const artMsgEl = document.getElementById("artMsg");
const idStyleEl = document.getElementById("idStyle");
const manualIdEl = document.getElementById("manualId");
const generatedIdEl = document.getElementById("generatedId");
const generateIdBtn = document.getElementById("generateIdBtn");
const saveChapterBtn = document.getElementById("saveChapterBtn");
const clearFormBtn = document.getElementById("clearFormBtn");
const choiceTextEl = document.getElementById("choiceText");
const choiceNextSelect = document.getElementById("choiceNextSelect");
const addChoiceBtn = document.getElementById("addChoiceBtn");
const choicesListEl = document.getElementById("choicesList");
const chaptersListEl = document.getElementById("chaptersList");
let currentArtUrl = "";

// Utility: normalize id to string
function normalizeId(id){ return id === null || id === undefined ? null : String(id); }
function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

// Generate slug from title
function makeSlug(title){
  if(!title) return 'ch-' + Date.now().toString().slice(-6);
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g,'')
    .trim()
    .replace(/\s+/g,'-')
    .replace(/-+/g,'-');
}

// Generate branch style id (1a, 1b, 2a)
// Strategy: use chapter index + letter for branches. If creating a new chapter after index N, use N+1 + 'a'.
// If manual branch exists, ensure uniqueness by incrementing letter.
function makeBranchId(title){
  // base index = number of top-level chapters + 1
  const base = currentChapters.length + 1;
  // find existing ids that start with `${base}`
  const prefix = String(base);
  const existing = currentChapters.map(c => String(c.id)).filter(id => id.startsWith(prefix));
  if(existing.length === 0) return prefix + 'a';
  // find next letter
  const letters = existing.map(id => id.slice(prefix.length)).filter(s => /^[a-z]$/.test(s));
  let nextCharCode = 97; // 'a'
  while(letters.includes(String.fromCharCode(nextCharCode))) nextCharCode++;
  return prefix + String.fromCharCode(nextCharCode);
}

// Timestamp id
function makeTimestampId(){ return 'ch-' + Date.now(); }

// Ensure uniqueness across currentChapters
function ensureUniqueId(candidate){
  candidate = normalizeId(candidate);
  if(!candidate) candidate = makeTimestampId();
  const exists = currentChapters.some(c => normalizeId(c.id) === candidate);
  if(!exists) return candidate;
  // append suffix until unique
  let i = 1;
  while(currentChapters.some(c => normalizeId(c.id) === candidate + '-' + i)) i++;
  return candidate + '-' + i;
}

function readImage(file){
  return new Promise((resolve, reject) => {
    if(!file) return reject(new Error("Select an image first"));
    if(!file.type || !file.type.startsWith("image/")) return reject(new Error("Select an image file"));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function setArt(url){
  currentArtUrl = url || "";
  if(artPreviewEl) artPreviewEl.style.backgroundImage = currentArtUrl ? `url("${currentArtUrl}")` : "";
}

// Generate id according to selected style or manual override
function generateId(){
  const manual = manualIdEl.value.trim();
  if(manual){
    // validate allowed chars
    if(!/^[A-Za-z0-9_-]+$/.test(manual)){
      alert('Manual ID may only contain letters, numbers, hyphen and underscore.');
      return;
    }
    const unique = ensureUniqueId(manual);
    generatedIdEl.textContent = unique;
    return unique;
  }

  const style = idStyleEl.value;
  let id;
  if(style === 'slug') id = makeSlug(titleEl.value || '') || makeTimestampId();
  else if(style === 'branch') id = makeBranchId(titleEl.value || '');
  else id = makeTimestampId();

  id = ensureUniqueId(id);
  generatedIdEl.textContent = id;
  return id;
}

// Render chapters list
async function loadChapters(){
  const chaptersMap = getCustomChapters();
  currentChapters = chaptersMap[STORY_ID] || [];

  if (!currentChapters.length && typeof getChapters === "function") {
    currentChapters = await getChapters(STORY_ID);
  }

  chaptersListEl.innerHTML = '';
  currentChapters.forEach((ch, i) => {
    const div = document.createElement('div');
    div.className = 'chapter';
    div.innerHTML = `<strong>${escapeHtml(ch.title || 'Untitled')}</strong> — <span style="opacity:.8">${escapeHtml(ch.id)}</span>
      <div style="margin-top:8px;">
        <button data-action="edit-chapter" data-index="${i}" class="small inline" type="button">Edit</button>
        <button data-action="delete-chapter" data-index="${i}" class="small inline" type="button">Delete</button>
      </div>`;
    chaptersListEl.appendChild(div);
  });
  populateNextDropdown();
}

// Populate Next Chapter dropdown for choices
function populateNextDropdown(){
  const chaptersMap = getCustomChapters();
  const list = currentChapters.length ? currentChapters : (chaptersMap[STORY_ID] || []);
  choiceNextSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select next chapter';
  choiceNextSelect.appendChild(placeholder);
  list.forEach((c, idx) => {
    const opt = document.createElement('option');
    opt.value = normalizeId(c.id);
    opt.textContent = `${c.title || 'Chapter ' + (idx+1)} — ${c.id}`;
    choiceNextSelect.appendChild(opt);
  });
}

// Add choice to currentChoices
function addChoice(){
  const text = choiceTextEl.value.trim();
  const next = choiceNextSelect.value;
  if(!text) return alert('Enter choice text');
  if(!next) return alert('Select next chapter from dropdown');
  currentChoices.push({ text, next: normalizeId(next) });
  renderChoices();
  choiceTextEl.value = '';
  choiceNextSelect.selectedIndex = 0;
}

function renderChoices(){
  choicesListEl.innerHTML = '';
  currentChoices.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `${escapeHtml(c.text)} → <em>${escapeHtml(c.next)}</em> <button data-action="remove-choice" data-index="${i}" type="button">Remove</button>`;
    choicesListEl.appendChild(div);
  });
}
function removeChoice(i){ currentChoices.splice(i,1); renderChoices(); }

// Save chapter (new or edited)
function saveChapter(){
  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
  if(!title) return alert('Please enter a chapter title');
  // generate id (or use generated display)
  let id = generatedIdEl.textContent && generatedIdEl.textContent !== '—' ? generatedIdEl.textContent : generateId();
  if(!id) id = ensureUniqueId(makeTimestampId());

  const chapter = {
    id: normalizeId(id),
    title,
    content,
    mood: moodEl.value || "black",
    effect: effectEl.value || "",
    center: !!centerEl.checked,
    climax: !!climaxEl.checked,
    artUrl: currentArtUrl,
    choices: currentChoices.slice()
  };

  // If editing existing (we detect by id present in currentChapters), replace; otherwise push
  const existingIndex = currentChapters.findIndex(c => normalizeId(c.id) === normalizeId(chapter.id));
  if(existingIndex !== -1){
    currentChapters[existingIndex] = chapter;
  } else {
    currentChapters.push(chapter);
  }

  // persist
  const chaptersMap = getCustomChapters();
  chaptersMap[STORY_ID] = currentChapters;
  saveCustomChapters(chaptersMap);

  // reset form
  clearForm();
  loadChapters();
  alert('Chapter saved');
}

// Edit chapter by index
window.editChapter = function(index){
  const ch = currentChapters[index];
  if(!ch) return;
  titleEl.value = ch.title;
  contentEl.value = ch.content;
  moodEl.value = ch.mood || "black";
  effectEl.value = ch.effect || "";
  centerEl.checked = !!ch.center;
  climaxEl.checked = !!ch.climax;
  setArt(ch.artUrl || "");
  manualIdEl.value = ch.id;
  generatedIdEl.textContent = ch.id;
  currentChoices = (ch.choices || []).slice();
  renderChoices();
};

// Delete chapter
window.deleteChapter = function(index){
  if(!confirm('Delete this chapter?')) return;
  currentChapters.splice(index,1);
  const chaptersMap = getCustomChapters();
  chaptersMap[STORY_ID] = currentChapters;
  saveCustomChapters(chaptersMap);
  loadChapters();
};

// Clear form
function clearForm(){
  titleEl.value = '';
  contentEl.value = '';
  moodEl.value = 'black';
  effectEl.value = '';
  centerEl.checked = false;
  climaxEl.checked = false;
  setArt('');
  manualIdEl.value = '';
  generatedIdEl.textContent = '—';
  currentChoices = [];
  renderChoices();
}

// Event bindings
generateIdBtn.addEventListener('click', generateId);
addChoiceBtn.addEventListener('click', addChoice);
saveChapterBtn.addEventListener('click', saveChapter);
clearFormBtn.addEventListener('click', clearForm);
useArtBtn.addEventListener('click', async () => {
  try {
    artMsgEl.textContent = "Adding...";
    const url = await readImage(artFileEl.files[0]);
    setArt(url);
    artMsgEl.textContent = "Added";
  } catch(err) {
    artMsgEl.textContent = err.message || "Image failed";
  }
});
clearArtBtn.addEventListener('click', () => {
  setArt('');
  artMsgEl.textContent = '';
});
chaptersListEl.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const index = Number(button.dataset.index);
  if (button.dataset.action === 'edit-chapter') editChapter(index);
  if (button.dataset.action === 'delete-chapter') deleteChapter(index);
});
choicesListEl.addEventListener('click', event => {
  const button = event.target.closest('[data-action="remove-choice"]');
  if (button) removeChoice(Number(button.dataset.index));
});

// Initial load
loadChapters();
renderChoices();

