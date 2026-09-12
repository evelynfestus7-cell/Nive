// forgot-password.js - Firebase password reset
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("forgotPasswordForm");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const email = document.getElementById("emailInput").value.trim();
      const submit = form.querySelector('button[type="submit"]');

      submit.disabled = true;
      submit.textContent = "Sending...";

      try {
        await firebase.auth().sendPasswordResetEmail(email);
        showToast("Password reset email sent.");
      } catch (error) {
        showToast(error && error.message ? error.message : "Could not send reset email.");
      } finally {
        submit.disabled = false;
        submit.textContent = "Send Reset Link";
      }
    });
  });
})();
