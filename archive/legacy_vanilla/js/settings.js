// settings.js — replacement with app-level theme application, nav wiring, and defensive checks
(function () {
  "use strict";

  // Defensive helpers
  function safeGetUser() {
    if (typeof getUser === "function") return getUser();
    try { return JSON.parse(localStorage.getItem("nive_user") || "{}"); } catch { return {}; }
  }
  function safeSaveUser(u) {
    if (typeof saveUser === "function") return saveUser(u);
    localStorage.setItem("nive_user", JSON.stringify(u || {}));
  }

  const SETTINGS_KEY = "nive_reader_settings";
  function getReaderSettings() {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      return s ? JSON.parse(s) : { theme: "dark", fontSize: 18, lineSpacing: 1.8, fontFamily: "serif", narrator: false, music: false, offline: true };
    } catch { return { theme: "dark", fontSize: 18, lineSpacing: 1.8, fontFamily: "serif", narrator: false, music: false, offline: true }; }
  }
  function saveReaderSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  // DOM refs (may be null if markup changed)
  const themeBtns = Array.from(document.querySelectorAll(".theme-btn"));
  const fontSizeInput = document.getElementById("readerFontSize");
  const fontSizeLabel = document.getElementById("readerFontSizeLabel");
  const lineSpacingInput = document.getElementById("readerLineSpacing");
  const lineSpacingLabel = document.getElementById("readerLineSpacingLabel");
  const fontFamilySelect = document.getElementById("readerFontFamily");
  const narratorToggle = document.getElementById("narratorToggle");
  const musicToggle = document.getElementById("musicToggle");
  const offlineToggle = document.getElementById("offlineToggle");
  const manageDownloads = document.getElementById("manageDownloads");
  const exportBtn = document.getElementById("exportSettings");
  const importBtn = document.getElementById("importSettings");
  const importFile = document.getElementById("importFile");
  const resetBtn = document.getElementById("resetSettings");
  const logoutBtn = document.getElementById("logoutBtn");
  const manageAccount = document.getElementById("manageAccount");
  const preview = document.getElementById("readerPreview");

  const settings = getReaderSettings();

  // Apply theme globally to documentElement and notify other scripts
  function applyAppTheme(theme) {
    document.documentElement.classList.remove("theme-dark", "theme-light", "theme-sepia");
    if (theme === "light") document.documentElement.classList.add("theme-light");
    else if (theme === "sepia") document.documentElement.classList.add("theme-sepia");
    else document.documentElement.classList.add("theme-dark");

    // Dispatch event so other modules can react
    try {
      const ev = new CustomEvent("nive:theme-changed", { detail: { theme } });
      window.dispatchEvent(ev);
    } catch (e) { /* ignore */ }
  }

  function updateThemeButtons() {
    themeBtns.forEach(b => b.setAttribute("aria-checked", b.dataset.theme === settings.theme ? "true" : "false"));
  }

  function applyPreview() {
    if (!preview) return;
    preview.style.fontSize = (settings.fontSize || 18) + "px";
    preview.style.lineHeight = (settings.lineSpacing || 1.8);
    preview.style.fontFamily = settings.fontFamily === "sans-serif" ? "system-ui, sans-serif" : "serif";
    preview.classList.remove("theme-dark", "theme-light", "theme-sepia");
    preview.classList.add(settings.theme === "light" ? "theme-light" : settings.theme === "sepia" ? "theme-sepia" : "theme-dark");
  }

  // Initialize controls and wire events (defensive)
  function initControls() {
    // Theme buttons
    themeBtns.forEach(b => {
      const t = b.dataset.theme;
      b.setAttribute("aria-checked", t === settings.theme ? "true" : "false");
      b.addEventListener("click", () => {
        settings.theme = t;
        saveReaderSettings(settings);
        updateThemeButtons();
        applyAppTheme(settings.theme);
        applyPreview();
      });
    });

    // Font size
    if (fontSizeInput && fontSizeLabel) {
      fontSizeInput.value = settings.fontSize || 18;
      fontSizeLabel.textContent = (settings.fontSize || 18) + " px";
      fontSizeInput.addEventListener("input", () => {
        settings.fontSize = Number(fontSizeInput.value);
        fontSizeLabel.textContent = settings.fontSize + " px";
        saveReaderSettings(settings);
        applyPreview();
      });
    }

    // Line spacing
    if (lineSpacingInput && lineSpacingLabel) {
      lineSpacingInput.value = settings.lineSpacing || 1.8;
      lineSpacingLabel.textContent = (settings.lineSpacing || 1.8).toFixed(1) + " line";
      lineSpacingInput.addEventListener("input", () => {
        settings.lineSpacing = Number(lineSpacingInput.value);
        lineSpacingLabel.textContent = settings.lineSpacing.toFixed(1) + " line";
        saveReaderSettings(settings);
        applyPreview();
      });
    }

    // Font family
    if (fontFamilySelect) {
      fontFamilySelect.value = settings.fontFamily || "serif";
      fontFamilySelect.addEventListener("change", () => {
        settings.fontFamily = fontFamilySelect.value;
        saveReaderSettings(settings);
        applyPreview();
      });
    }

    // Toggles
    if (narratorToggle) { narratorToggle.checked = !!settings.narrator; narratorToggle.addEventListener("change", () => { settings.narrator = narratorToggle.checked; saveReaderSettings(settings); }); }
    if (musicToggle) { musicToggle.checked = !!settings.music; musicToggle.addEventListener("change", () => { settings.music = musicToggle.checked; saveReaderSettings(settings); }); }
    if (offlineToggle) { offlineToggle.checked = settings.offline !== false; offlineToggle.addEventListener("change", () => { settings.offline = offlineToggle.checked; saveReaderSettings(settings); }); }

    // Manage downloads
    if (manageDownloads) {
      manageDownloads.addEventListener("click", () => {
        if (typeof getOfflineStories === "function") {
          const list = getOfflineStories();
          alert("Downloaded stories: " + (list.join(", ") || "None"));
        } else alert("Offline manager not available.");
      });
    }

    // Export
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const payload = { user: safeGetUser(), reader: settings };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "nive-settings.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      });
    }

    // Import
    if (importBtn && importFile) {
      importBtn.addEventListener("click", () => importFile.click());
      importFile.addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = JSON.parse(evt.target.result);
            if (data.reader) { saveReaderSettings(data.reader); Object.assign(settings, data.reader); }
            if (data.user) { safeSaveUser(Object.assign(safeGetUser(), data.user)); }
            alert("Settings imported. Reloading page to apply.");
            location.reload();
          } catch (err) { alert("Invalid file"); }
        };
        reader.readAsText(f);
      });
    }

    // Reset
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (!confirm("Reset settings to defaults?")) return;
        localStorage.removeItem(SETTINGS_KEY);
        location.reload();
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";

        try {
          if (typeof logoutUser === "function") {
            await logoutUser();
            return;
          }

          if (window.firebase && firebase.auth().currentUser) {
            await firebase.auth().signOut();
          }
          localStorage.removeItem("nive_logged_in");
          localStorage.removeItem("nive_admin_logged_in");
          localStorage.removeItem("nive_user");
          location.href = "Index.html";
        } catch (error) {
          console.error("Logout failed:", error);
          alert("Logout failed. Please try again.");
          logoutBtn.disabled = false;
          logoutBtn.textContent = "Log Out";
        }
      });
    }

    document.getElementById("adminSettingsCard")?.remove();
  }

  // On DOM ready: init controls, apply theme, render nav
  document.addEventListener("DOMContentLoaded", () => {
    try {
      updateThemeButtons();
      initControls();
      applyAppTheme(settings.theme);
      applyPreview();
    } catch (e) { console.error("settings init error", e); }

    // Render navigation (ensure navigation.js loaded)
    if (typeof renderNavigation === "function") {
      renderNavigation("settings");
    } else {
      // try again shortly if navigation.js loads late
      setTimeout(() => { if (typeof renderNavigation === "function") renderNavigation("settings"); }, 120);
    }
  });

  // Expose for other modules
  window.niveSettings = { getReaderSettings: () => settings, applyAppTheme };

})();
