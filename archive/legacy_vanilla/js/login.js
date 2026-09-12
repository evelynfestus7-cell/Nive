// login.js - Handles Firebase login for the index page
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const signupBtn = document.getElementById("signupBtn");
    const forgotLink = document.getElementById("forgotPasswordLink");
    const googleBtn = document.getElementById("googleLoginBtn");
    const appleBtn = document.getElementById("appleLoginBtn");

    function setBusy(isBusy) {
      const submit = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
      if (!submit) return;
      submit.disabled = isBusy;
      submit.textContent = isBusy ? "Signing in..." : "Login ->";
    }

    function friendlyAuthError(error) {
      const code = error && error.code ? error.code : "";
      if (code.includes("wrong-password") || code.includes("invalid-credential")) return "Email or password is incorrect.";
      if (code.includes("user-not-found")) return "No account exists for that email.";
      if (code.includes("too-many-requests")) return "Too many attempts. Please wait a moment and try again.";
      if (code.includes("popup-closed-by-user")) return "Sign-in was cancelled.";
      if (code.includes("operation-not-allowed")) return "This sign-in method is not enabled in Firebase.";
      if (code.includes("unauthorized-domain")) return "This local address is not allowed in Firebase Auth. Add it in Firebase Authorized domains or use localhost.";
      if (code.includes("network-request-failed")) return "Network request failed. Check your connection and Firebase configuration.";
      return error && error.message ? error.message : "Sign-in failed. Please try again.";
    }

    async function signInWithProvider(provider) {
      if (!window.firebase) {
        showToast("Firebase is not available yet.");
        return;
      }

      try {
        const result = await firebase.auth().signInWithPopup(provider);
        const profile = await hydrateUserFromFirebase(result.user);
        const redirect = typeof getPostAuthRedirect === "function"
          ? await getPostAuthRedirect(result.user, profile)
          : "home.html";
        window.location.replace(redirect);
      } catch (error) {
        showToast(friendlyAuthError(error));
      }
    }

    if (loginForm) {
      loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const emailInput = document.getElementById("emailInput");
        const passwordInput = document.getElementById("passwordInput");
        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";

        if (!window.firebase) {
          showToast("Firebase is not available yet.");
          return;
        }

        setBusy(true);
        try {
          const result = await firebase.auth().signInWithEmailAndPassword(email, password);
          const profile = await hydrateUserFromFirebase(result.user);

          // Check if user is an Administrator
          const redirect = typeof getPostAuthRedirect === "function"
            ? await getPostAuthRedirect(result.user, profile)
            : "home.html";
          window.location.replace(redirect);
        } catch (error) {
          showToast(friendlyAuthError(error));
        } finally {
          setBusy(false);
        }
      });
    }

    if (signupBtn) {
      signupBtn.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.href = "signup.html";
      });
    }

    if (forgotLink) {
      forgotLink.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.href = "forgot-password.html";
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener("click", function () {
        signInWithProvider(new firebase.auth.GoogleAuthProvider());
      });
    }

    if (appleBtn) {
      appleBtn.addEventListener("click", function () {
        signInWithProvider(new firebase.auth.OAuthProvider("apple.com"));
      });
    }
  });
})();
