/**
 * Set Admin Script
 * Usage: node scripts/set-admin.js <user-email-or-uid>
 * 
 * Sets the 'role: admin' and custom user claim { admin: true } in Firebase.
 */

const admin = require('firebase-admin');

// If using service account key:
// const serviceAccount = require('./serviceAccountKey.json');
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

console.log(`
To make an account an Admin:
1. In the Firebase Console (https://console.firebase.google.com/):
   - Go to Firestore Database -> 'users' collection -> find the user's document.
   - Add/Set the field: "role" (string) with value: "admin"
   - Add/Set the field: "isAdmin" (boolean) with value: true

2. When you log in with that email & password on the Nive login page (Index.html):
   - The app detects role === 'admin' and automatically routes you straight to the Admin Dashboard!
`);
