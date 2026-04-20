import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager  } from "firebase/firestore";
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

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const messaging = getMessaging(app);


export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export default app;