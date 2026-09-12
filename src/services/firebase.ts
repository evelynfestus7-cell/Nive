import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDgS2S1lRRnfQsQKb_U_glSbZncASVuTPM",
  authDomain: "nive-app-a79b9.firebaseapp.com",
  projectId: "nive-app-a79b9",
  storageBucket: "nive-app-a79b9.firebasestorage.app",
  messagingSenderId: "798346828163",
  appId: "1:798346828163:web:e26608a4f4cb7f0571beb6"
};

// Initialize Firebase safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported in this browser');
    }
  });
}

/**
 * Format Firebase Auth error codes into clear, user-friendly messages
 */
export function formatAuthError(err: any): string {
  if (!err) return 'An unknown error occurred.';
  const code = err.code || '';
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Domain not authorized in Firebase Console (Add localhost / your domain to Authorized Domains).';
    case 'auth/operation-not-allowed':
      return 'Sign-in provider is disabled in Firebase Console (Authentication -> Sign-in method).';
    case 'auth/configuration-not-found':
      return 'Provider is not configured in Firebase Console yet. Please configure it or use Email/Guest login.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by browser. Please allow popups or use Email login.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please log in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    default:
      return err.message || 'Authentication failed. Please try again.';
  }
}

