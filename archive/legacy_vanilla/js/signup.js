// signup.js - Firebase email/password and social registration
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("signupForm");
    const googleBtn = document.getElementById("googleSignupBtn");
    const appleBtn = document.getElementById("appleSignupBtn");

    function friendlyAuthError(error) {
      const code = error && error.code ? error.code : "";
      if (code.includes("email-already-in-use")) return "An account already exists for that email.";
      if (code.includes("weak-password")) return "Password is too weak. Please use at least 6 characters.";
      if (code.includes("popup-closed-by-user")) return "Sign-up was cancelled.";
      if (code.includes("operation-not-allowed")) return "This sign-in method is not enabled in Firebase.";
      if (code.includes("network-request-failed")) return "Network request failed. Check your connection.";
      return error && error.message ? error.message : "Could not create your account.";
    }

    async function signUpWithProvider(provider) {
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

    if (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = document.getElementById("usernameInput").value.trim();
        const email = document.getElementById("emailInput").value.trim();
        const password = document.getElementById("passwordInput").value;
        const submit = form.querySelector('button[type="submit"]');

        if (password.length < 6) {
          showToast("Password must be at least 6 characters.");
          return;
        }

        if (submit) {
          submit.disabled = true;
          submit.textContent = "Creating account...";
        }

        try {
          const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
          await result.user.updateProfile({ displayName: username });
          
          try {
            await result.user.sendEmailVerification();
          } catch (e) {
            console.warn("Email verification could not be sent:", e);
          }

          const profile = {
            ...getDefaultUser(),
            username,
            email,
            emailVerified: false,
            onboardingComplete: false,
            createdAt: new Date().toISOString()
          };

          await saveUserAsync(profile, result.user.uid);
          window.location.replace("onboarding.html");
        } catch (error) {
          showToast(friendlyAuthError(error));
        } finally {
          if (submit) {
            submit.disabled = false;
            submit.textContent = "Create Account";
          }
        }
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener("click", function () {
        signUpWithProvider(new firebase.auth.GoogleAuthProvider());
      });
    }

    if (appleBtn) {
      appleBtn.addEventListener("click", function () {
        signUpWithProvider(new firebase.auth.OAuthProvider("apple.com"));
      });
    }
  });
})();
