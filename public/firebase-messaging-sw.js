// public/firebase-messaging-sw.js

// Import the Firebase SDK for Firebase Cloud Messaging (FCM)
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_KHXT4JA1nUJQoOJjS562iBc5FBn-XRU",
  authDomain: "sense-27203.firebaseapp.com",
  projectId: "sense-27203",
  storageBucket: "sense-27203.appspot.com",
  messagingSenderId: "884277728129",
  appId: "1:884277728129:web:70dd4f699e21b82d164e80",
  measurementId: "G-7SR3JLXD3N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle background messages
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.data?.title || 'System Notification';
  const notificationBody = payload.data?.message || '';

  // Use a stable tag derived from the content to prevent OS-level duplication
  const tagSource = `${notificationTitle}__${notificationBody}`;
  let hash = 0;
  for (let i = 0; i < tagSource.length; i++) {
    hash = (Math.imul(31, hash) + tagSource.charCodeAt(i)) | 0;
  }
  const dedupeTag = `brgy-notif-${Math.abs(hash)}`;

  const notificationOptions = {
    body: notificationBody,
    icon: '/barangay-logo.jpg',
    tag: dedupeTag,
    renotify: false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
