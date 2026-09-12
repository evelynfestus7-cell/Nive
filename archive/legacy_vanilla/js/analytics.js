// js/analytics.js - Nive Lightweight Analytics & Event Tracker
(function () {
  "use strict";

  const STORAGE_KEY = "nive_analytics_events";

  window.NiveAnalytics = {
    trackEvent: function (eventName, eventParams = {}) {
      const timestamp = new Date().toISOString();
      const currentUser = typeof getUser === "function" ? getUser() : null;
      
      const payload = {
        event: eventName,
        params: eventParams,
        userId: currentUser?.uid || currentUser?.id || "guest",
        username: currentUser?.username || "Guest",
        timestamp: timestamp,
        path: window.location.pathname
      };

      console.log(`[Analytics] ${eventName}`, payload);

      // Local persistence log
      try {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        history.push(payload);
        // Keep last 100 events
        if (history.length > 100) history.shift();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (err) {
        console.warn("[Analytics] Local storage log error:", err);
      }

      // Firestore persistence if Firebase Firestore is available
      if (window.db && currentUser?.uid) {
        try {
          window.db.collection("analytics_events").add(payload).catch(() => {});
        } catch (e) {
          // Silent fallback
        }
      }
    },

    getEventLog: function () {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      } catch (e) {
        return [];
      }
    }
  };

  // Register automatic page view track
  document.addEventListener("DOMContentLoaded", () => {
    window.NiveAnalytics.trackEvent("page_view", {
      title: document.title,
      url: window.location.href
    });
  });
})();
