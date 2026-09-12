// admin-auth.js - Shared Firebase admin route protection
(function () {
  "use strict";

  const ADMIN_LOGIN_PAGE = "admin-login.html";
  const ADMIN_EMAIL = "evelynfestus7@gmail.com";

  function isAdminLoginPage() {
    return window.location.pathname.toLowerCase().endsWith(ADMIN_LOGIN_PAGE);
  }

  function lockAdminPage() {
    if (isAdminLoginPage()) return;
    document.documentElement.setAttribute("data-admin-auth", "checking");
    const style = document.createElement("style");
    style.id = "admin-auth-lock-style";
    style.textContent = 'html[data-admin-auth="checking"] body{visibility:hidden}';
    document.head.appendChild(style);
  }

  function unlockAdminPage() {
    document.documentElement.setAttribute("data-admin-auth", "ready");
    document.getElementById("admin-auth-lock-style")?.remove();
  }

  function redirectToAdminLogin() {
    localStorage.removeItem("nive_admin_logged_in");
    if (!isAdminLoginPage()) window.location.replace(ADMIN_LOGIN_PAGE);
  }

  lockAdminPage();

  async function userIsAdmin(firebaseUser) {
    if (!firebaseUser || !window.firebase) return false;
    return (firebaseUser.email || "").trim().toLowerCase() === ADMIN_EMAIL;
  }

  window.requireAdmin = function requireAdmin() {
    if (!window.firebase || !firebase.auth) {
      redirectToAdminLogin();
      return;
    }

    firebase.auth().onAuthStateChanged(async function (user) {
      const ok = await userIsAdmin(user);
      if (!ok) {
        redirectToAdminLogin();
        return;
      }
      localStorage.removeItem("nive_admin_logged_in");
      unlockAdminPage();
      window.dispatchEvent(new Event("adminReady"));
    });
  };

  window.adminSignIn = async function adminSignIn(email, password) {
    const result = await firebase.auth().signInWithEmailAndPassword(email, password);
    const ok = await userIsAdmin(result.user);
    if (!ok) {
      await firebase.auth().signOut();
      throw new Error("This account does not have admin access. Set role: 'admin' in Firestore for user " + result.user.uid);
    }
    return result.user;
  };

  window.adminSignOut = async function adminSignOut() {
    localStorage.removeItem("nive_admin_logged_in");
    if (window.firebase && firebase.auth().currentUser) {
      await firebase.auth().signOut();
    }
    window.location.replace(ADMIN_LOGIN_PAGE);
  };

  window.userIsAdmin = userIsAdmin;
})();
