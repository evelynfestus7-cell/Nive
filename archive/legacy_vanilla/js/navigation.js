// navigation.js - shared liquid-glass top header and bottom navigation
(function () {
  "use strict";

  // Shortened bottom navbar containing only 4 main items
  const NAV_ITEMS = [
    { id: "home", label: "Home", icon: "home", href: "home.html" },
    { id: "library", label: "Library", icon: "local_library", href: "library.html" },
    { id: "social", label: "Social", icon: "groups", href: "social.html" },
    { id: "settings", label: "Settings", icon: "settings", href: "settings.html" }
  ];

  function ensureManifestLink() {
    if (document.querySelector('link[rel="manifest"]')) return;
    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.href = "manifest.json";
    document.head.appendChild(manifestLink);
  }

  function ensureIconFont() {
    ensureManifestLink();
    if (document.querySelector('link[data-nive-icons="material-symbols"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded";
    link.dataset.niveIcons = "material-symbols";
    document.head.appendChild(link);
  }

  function getUserData() {
    try {
      if (typeof getUser === "function") return getUser();
      return JSON.parse(localStorage.getItem("nive_user") || "{}");
    } catch (e) {
      return {};
    }
  }

  function renderAppHeader(activePage) {
    const user = getUserData();
    const coins = user.coins !== undefined ? user.coins : 0;
    const avatar = user.avatar || "assets/avatars/avatar1.png";

    let header = document.body.querySelector(".app-header");
    if (!header) {
      if (document.body.classList.contains("no-header")) return;
      header = document.createElement("header");
      header.className = "app-header";
      document.body.insertBefore(header, document.body.firstChild);
    }

    const isSearchActive = activePage === "search" ? "active" : "";
    const isStoreActive = activePage === "store" ? "active" : "";
    const isProfileActive = activePage === "profile" ? "active" : "";

    header.innerHTML = `
      <div class="brand">
        <a href="home.html" class="brand-link" aria-label="Nive Home">
          <img loading="lazy" src="assets/logos/logo.png" alt="Nive" class="logo">
          <span class="brand-name">Nive</span>
        </a>
      </div>
      <div class="header-right">
        <a href="search.html" class="header-icon-btn ${isSearchActive}" aria-label="Search" title="Search">
          <span class="material-symbols-rounded" aria-hidden="true">search</span>
          <span class="header-btn-label">Search</span>
        </a>
        <a href="store.html" class="header-icon-btn store-badge-btn ${isStoreActive}" aria-label="Store" title="Store">
          <span class="material-symbols-rounded" aria-hidden="true">shopping_bag</span>
          <span id="headerCoinCount" class="coin-badge">🪙 ${coins}</span>
        </a>
        <a href="profile.html" class="header-icon-btn profile-btn ${isProfileActive}" aria-label="Profile" title="Profile">
          <img src="${avatar}" class="header-avatar" alt="Profile" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='inline-flex';">
          <span class="material-symbols-rounded profile-fallback-icon" style="display:none;" aria-hidden="true">person</span>
          <span class="header-btn-label">Profile</span>
        </a>
      </div>
    `;
  }

  function buildNavHtml(activeId) {
    return NAV_ITEMS.map(item => {
      const activeClass = item.id === activeId ? "active" : "";
      return `<a href="${item.href}" class="nav-btn ${activeClass}" data-nav-id="${item.id}" aria-label="${item.label}">
        <span class="material-symbols-rounded nav-icon" aria-hidden="true">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </a>`;
    }).join("");
  }

  function createNavElement(activePage) {
    const nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.setAttribute("role", "navigation");
    nav.setAttribute("aria-label", "Main navigation");
    nav.innerHTML = buildNavHtml(activePage);
    return nav;
  }

  function renderNavigation(activePage) {
    ensureIconFont();
    renderAppHeader(activePage);

    let container = document.getElementById("nav-container");
    let appendToBody = false;

    if (container) {
      const style = window.getComputedStyle(container);
      if (style.overflow === "hidden") appendToBody = true;
    } else {
      appendToBody = true;
    }

    const nav = createNavElement(activePage);
    const existing = document.body.querySelector(".bottom-nav");
    if (existing) existing.remove();

    if (appendToBody) {
      document.body.appendChild(nav);
    } else {
      container.innerHTML = "";
      container.appendChild(nav);
    }

    nav.querySelectorAll(".nav-btn").forEach(a => {
      a.addEventListener("click", () => {
        nav.querySelectorAll(".nav-btn").forEach(n => n.classList.remove("active"));
        a.classList.add("active");
      });
      a.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          a.click();
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const active = document.body.getAttribute("data-nav-active");
    if (active) renderNavigation(active);
  });

  window.addEventListener("userUpdated", () => {
    const active = document.body.getAttribute("data-nav-active");
    if (active) renderNavigation(active);
  });

  // Register PWA Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(err => {
        console.warn("[SW] Service worker notice:", err);
      });
    });
  }

  window.renderNavigation = renderNavigation;
})();

