loadStories();

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function loadStories() {
  const stories = getCustomStories();
  const customChapters = getCustomChapters();
  const container = document.getElementById("storiesContainer");

  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const genreFilter = document.getElementById("genreFilter").value;
  const premiumFilter = document.getElementById("premiumFilter").value;

  container.innerHTML = "";

  let filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm);
    const matchesGenre = !genreFilter || story.genre === genreFilter;
    const matchesPremium = !premiumFilter || String(story.premium) === premiumFilter;
    return matchesSearch && matchesGenre && matchesPremium;
  });

  if (filteredStories.length === 0) {
    container.innerHTML = `<div style="text-align:center;opacity:.7;padding:40px;">No stories match your filters</div>`;
    return;
  }

  filteredStories.forEach(story => {
    const chapterCount = (customChapters[story.id] || []).length;

    const card = document.createElement("div");
    card.className = "story-card";
    card.dataset.storyId = story.id;
    card.innerHTML = `
        <div class="story-cover"></div>
        <div class="story-content">
          <div class="story-title">${escapeHtml(story.title)}</div>
          <div class="story-description">${escapeHtml(story.description)}</div>
          <div class="story-meta">
            Author: ${escapeHtml(story.author)}<br>
            Genre: ${escapeHtml(story.genre)}<br>
            Chapters: ${chapterCount}<br>
            Status: ${story.premium ? "Premium" : "Free"}
          </div>
          <div class="story-buttons">
            <button class="edit-btn" data-action="edit" type="button">Edit Story</button>
            <button class="chapter-btn" data-action="chapters" type="button">Edit Chapters</button>
            <button class="preview-btn" data-action="preview" type="button">Preview</button>
            <button class="delete-btn" data-action="delete" type="button">Delete</button>
          </div>
        </div>
    `;
    card.querySelector(".story-cover").style.backgroundImage = `url("${story.cover || "https://picsum.photos/400/200"}")`;
    container.appendChild(card);
  });
}

function editStory(storyId) {
  location.href = "story-editor.html?id=" + storyId;
}

function editChapters(storyId) {
  location.href = "chapter-editor.html?id=" + storyId;
}

function previewStory(storyId) {
  location.href = "story.html?id=" + storyId;
}

function deleteStory(storyId) {
  if (!confirm("Delete this story permanently?")) return;

  const stories = getCustomStories().filter(s => s.id !== storyId);
  saveCustomStories(stories);

  const chapters = getCustomChapters();
  delete chapters[storyId];
  saveCustomChapters(chapters);

  alert("Story deleted");
  loadStories();
}

// Hook filters
document.getElementById("searchInput").addEventListener("input", loadStories);
document.getElementById("genreFilter").addEventListener("change", loadStories);
document.getElementById("premiumFilter").addEventListener("change", loadStories);
document.getElementById("storiesContainer").addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  const card = event.target.closest("[data-story-id]");
  if (!button || !card) return;
  const storyId = card.dataset.storyId;
  if (button.dataset.action === "edit") editStory(storyId);
  if (button.dataset.action === "chapters") editChapters(storyId);
  if (button.dataset.action === "preview") previewStory(storyId);
  if (button.dataset.action === "delete") deleteStory(storyId);
});
