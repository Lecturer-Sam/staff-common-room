import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Secondary Firebase app used ONLY to create student auth accounts from
 * a teacher's session. `createUserWithEmailAndPassword` signs the new user
 * in on whichever Auth instance it runs against — running it on the primary
 * instance would log the teacher out. The secondary instance is created on
 * demand and immediately signed back out after each provisioning batch.
 */
let secondaryApp = null;
export function getSecondaryAuth() {
  if (!secondaryApp) secondaryApp = initializeApp(firebaseConfig, "student-provisioning");
  return getAuth(secondaryApp);
}

// Offline-first Firestore: reads are served from an IndexedDB cache and writes
// are queued locally when offline, then synced automatically on reconnect.
// The multi-tab manager keeps the cache consistent across open tabs/PWA windows.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
