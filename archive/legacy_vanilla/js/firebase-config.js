// js/firebase-config.js
// Firebase Compat SDK Initialization

const firebaseConfig = {
  apiKey: "AIzaSyDgS2S1lRRnfQsQKb_U_glSbZncASVuTPM",
  authDomain: "nive-app-a79b9.firebaseapp.com",
  projectId: "nive-app-a79b9",
  storageBucket: "nive-app-a79b9.firebasestorage.app",
  messagingSenderId: "798346828163",
  appId: "1:798346828163:web:e26608a4f4cb7f0571beb6"
};

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Enable offline persistence for Firestore
try {
  firebase.firestore().enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn("Firestore persistence: Multiple tabs open, persistence can only be enabled in one tab at a time.");
      } else if (err.code === 'unimplemented') {
        console.warn("Firestore persistence: The current browser does not support offline persistence.");
      }
    });
} catch (e) {
  console.warn("Firestore persistence error", e);
}
