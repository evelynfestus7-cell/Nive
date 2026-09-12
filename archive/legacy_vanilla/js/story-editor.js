// story-editor.js
let currentStoryId = new URLSearchParams(window.location.search).get("id");

let currentCharacters = [];
let currentAchievements = [];

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

async function loadStory() {
  if (!currentStoryId) return;
  let story = null;

  if (typeof getStory === "function") {
    story = await getStory(currentStoryId);
  }

  if (!story) {
    const stories = getCustomStories();
    story = stories.find(s => String(s.id) === String(currentStoryId));
  }

  if (!story) return;

  document.getElementById("title").value = story.title || "";
  document.getElementById("description").value = story.description || "";
  document.getElementById("author").value = story.author || "";
  document.getElementById("genre").value = story.genre || "";
  document.getElementById("cover").value = story.cover || "";
  document.getElementById("banner").value = story.banner || "";
  document.getElementById("rating").value = story.rating || 0;
  document.getElementById("premium").value = story.premium ? "true" : "false";
  if (document.getElementById("featured")) {
    document.getElementById("featured").checked = !!story.featured;
  }

  renderCharacters(story.characters || []);
  renderAchievements(story.achievements || []);
}

function saveStory() {
  const stories = getCustomStories();
  const id = currentStoryId || Date.now().toString();

  const story = {
    id,
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    author: document.getElementById("author").value.trim(),
    genre: document.getElementById("genre").value,
    cover: document.getElementById("cover").value.trim(),   // URL only
    banner: document.getElementById("banner").value.trim(), // URL only
    rating: parseInt(document.getElementById("rating").value) || 0,
    premium: document.getElementById("premium").value === "true",
    featured: document.getElementById("featured") ? document.getElementById("featured").checked : false,
    characters: currentCharacters.map(c => ({
      name: c.name,
      role: c.role,
      avatar: c.avatar // URL only
    })),
    achievements: [...currentAchievements],
    createdAt: new Date().toISOString()
  };

  const index = stories.findIndex(s => String(s.id) === String(story.id));
  if (index !== -1) {
    stories[index] = story;
  } else {
    stories.push(story);
  }
  saveCustomStories(stories);

  alert("Story saved successfully!");
  if (!currentStoryId) {
    location.href = "manage-stories.html";
  }
}

// Character handling
function addCharacter() {
  const name = document.getElementById("charName").value.trim();
  const role = document.getElementById("charRole").value.trim();
  const avatar = document.getElementById("charAvatar").value.trim(); // URL only
  if (!name || !role) return alert("Please enter name and role");

  currentCharacters.push({ name, role, avatar });
  renderCharacters(currentCharacters);

  document.getElementById("charName").value = "";
  document.getElementById("charRole").value = "";
  document.getElementById("charAvatar").value = "";
}

function renderCharacters(chars) {
  currentCharacters = chars;
  const list = document.getElementById("charactersList");
  list.innerHTML = "";
  chars.forEach((c, i) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<strong>${escapeHtml(c.name)}</strong> — ${escapeHtml(c.role)}
      <button data-action="remove-character" data-index="${i}" type="button">Remove</button>`;
    list.appendChild(div);
  });
}

function removeCharacter(index) {
  currentCharacters.splice(index, 1);
  renderCharacters(currentCharacters);
}

// Achievements
function addAchievement() {
  const text = document.getElementById("achievementText").value.trim();
  if (!text) return alert("Enter achievement text");
  currentAchievements.push(text);
  renderAchievements(currentAchievements);
  document.getElementById("achievementText").value = "";
}

function renderAchievements(achs) {
  currentAchievements = achs;
  const list = document.getElementById("achievementsList");
  list.innerHTML = "";
  achs.forEach((a, i) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `${escapeHtml(a)} <button data-action="remove-achievement" data-index="${i}" type="button">Remove</button>`;
    list.appendChild(div);
  });
}

function removeAchievement(index) {
  currentAchievements.splice(index, 1);
  renderAchievements(currentAchievements);
}

loadStory();

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const index = Number(button.dataset.index);
  if (button.dataset.action === "remove-character") removeCharacter(index);
  if (button.dataset.action === "remove-achievement") removeAchievement(index);
});
