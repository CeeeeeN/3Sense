import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence, enableIndexedDbPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD_KHXT4JA1nUJQoOJjS562iBc5FBn-XRU",
  authDomain: "sense-27203.firebaseapp.com",
  projectId: "sense-27203",
  storageBucket: "sense-27203.firebasestorage.app",
  messagingSenderId: "884277728129",
  appId: "1:884277728129:web:70dd4f699e21b82d164e80",
  measurementId: "G-7SR3JLXD3N"
};

const app = initializeApp(firebaseConfig);

// Enable Offline Persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // This happens if the user has multiple tabs of your app open at once.
      console.warn("Multiple tabs open, persistence disabled.");
    } else if (err.code === 'unimplemented') {
      // The user is on a very old browser.
      console.warn("Browser does not support offline persistence.");
    }
  });

export const db = getFirestore(app);
export const auth = getAuth(app);
export const messaging = getMessaging(app);

setPersistence(auth, browserLocalPersistence);



export default app;