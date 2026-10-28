// 1. Create a Firebase project at https://console.firebase.google.com/
// 2. Register a Web App and copy its config here.
// 3. Enable Authentication: Email/Password and Google.
// 4. Create a Firestore database and enable Storage.
export const firebaseConfig = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

// This email is the dedicated read-only account that the shared vault password signs into.
// Create this exact email as a Firebase Authentication Email/Password user.
// Set its password to the password the creator chooses for visitors.
export const viewerEmail = "vault-viewer@example.com";
