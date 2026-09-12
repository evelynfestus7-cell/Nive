// onboarding.js - First-run reader preferences
(function () {
  "use strict";

  const selectedGenres = new Set();

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("onboardingForm");
    const chips = document.querySelectorAll("[data-genre]");
    const avatarButtons = document.querySelectorAll("[data-avatar]");
    const avatarInput = document.getElementById("avatarInput");

    chips.forEach(chip => {
      chip.addEventListener("click", function () {
        const genre = chip.dataset.genre;
        if (selectedGenres.has(genre)) selectedGenres.delete(genre);
        else selectedGenres.add(genre);
        chip.classList.toggle("selected", selectedGenres.has(genre));
      });
    });

    avatarButtons.forEach(button => {
      button.addEventListener("click", function () {
        avatarButtons.forEach(item => item.classList.remove("selected"));
        button.classList.add("selected");
        avatarInput.value = button.dataset.avatar;
      });
    });

    if (!form) return;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const user = getUser();
      user.avatar = avatarInput.value || user.avatar;
      user.favoriteGenres = Array.from(selectedGenres);
      user.onboardingComplete = true;
      await saveUserAsync(user);
      const firebaseUser = window.firebase && firebase.auth().currentUser;
      const redirect = typeof getPostAuthRedirect === "function"
        ? await getPostAuthRedirect(firebaseUser, user)
        : "home.html";
      window.location.replace(redirect);
    });
  });
})();
