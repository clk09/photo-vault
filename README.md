# Photo Vault — Scrapbook Edition

A responsive scrapbook-style photo vault for GitHub Pages + Firebase. Visitors enter one shared vault password. Only the creator can add/edit/delete photos, write letters, and customize the site. Every photo appears in a paper envelope; clicking it opens the letter.

## Important security design
GitHub Pages is static hosting, so a password check written only in browser JavaScript would not protect private files. This starter uses Firebase Authentication + Firestore + Cloud Storage rules:
- **Visitor vault password:** the creator chooses a password for a dedicated read-only Firebase email/password account.
- **Creator identity:** the creator signs in with their Google account. A Firebase custom claim `creator: true` grants write access. The Google account is not a second vault password.
- The app is not a public site: visitors must authenticate before photos and letters can be read. Do not publish private images elsewhere publicly.

## 1. Create Firebase services
1. Go to https://console.firebase.google.com/ and create a project.
2. Add a Web App and copy the Firebase config into `firebase-config.js`.
3. Authentication → Sign-in method: enable **Email/Password** and **Google**.
4. Authentication → Users → Add user:
   - Email: `vault-viewer@example.com`
   - Password: choose the vault password you want to share with viewers.
   - This is the only vault password visitors need. To change it later, edit this user's password in Firebase Authentication.
5. Create a Firestore database.
6. Enable Firebase Storage.
7. In Firebase Authentication → Settings → Authorized domains, add your GitHub Pages domain (for example `yourname.github.io`).

## 2. Give the creator account write access
The creator must sign in with Google. First, deploy the app and sign in once using the Google account you want as the creator. Then, from a trusted local computer with Firebase Admin SDK installed, use the Admin SDK to assign the custom claim to that account's UID. Never put service-account credentials in this website or GitHub.

Example Node.js script run locally by the project owner:
```js
// set-creator-claim.cjs — run only on your own computer.
// Requires: npm install firebase-admin
const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json"); // download from Firebase Console
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const creatorUid = "PASTE_THE_CREATOR_UID_HERE";
admin.auth().setCustomUserClaims(creatorUid, { creator: true })
  .then(() => { console.log("Creator claim added. Sign out and sign in again."); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
```
Keep `service-account.json` and this script OUT of the GitHub repository. Never share service-account keys. To find the creator UID, check Authentication → Users after the creator has signed in. Run the script on your own computer, not in the browser.

## 3. Publish with GitHub Pages
1. Create a GitHub repository, e.g. `photo-vault`.
2. Upload `index.html`, `style.css`, `app.js`, and `firebase-config.js` to the repository root. Do **not** upload service account keys.
3. In the repository: Settings → Pages → deploy from branch → `main` → `/ (root)` → Save.
4. Wait for GitHub Pages to publish, then open the URL and test the viewer password and creator sign-in.
5. Set Firestore rules from `firestore.rules` and Storage rules from `storage.rules` in Firebase Console.

## 4. Editing
- Creator sign-in → Add memory → select photo → enter title/date/description/letter → Save.
- Use Edit or Delete under each memory.
- Customize lets the creator change website name, headings, subtitle, accent color, and theme.
- There is no fixed count of photos in the app. The practical limit is your Firebase Storage quota, upload size rule, and billing plan. This starter caps each photo at 20 MB.

## Notes
- For production, consider enabling Firebase App Check, reviewing billing limits, and making a backup/export plan.
- Do not rely on a GitHub repository being private as a substitute for Firebase security rules.
- Firebase web config is intended to be visible in the browser; security comes from Auth and correctly deployed rules, not hiding the API key.
