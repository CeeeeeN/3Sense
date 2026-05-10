// public/firebase-messaging-sw.js

// Import Firebase App & Messaging from the CDN (Compat version)
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker
const firebaseConfig = {
  apiKey: "AIzaSyD_KHXT4JA1nUJQoOJjS562iBc5FBn-XRU",
  authDomain: "sense-27203.firebaseapp.com",
  projectId: "sense-27203",
  storageBucket: "sense-27203.firebasestorage.app",
  messagingSenderId: "884277728129",
  appId: "1:884277728129:web:70dd4f699e21b82d164e80",
  measurementId: "G-7SR3JLXD3N"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so it can handle background messages
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'System Notification';
  const notificationBody  = payload.notification?.body  || payload.data?.message || '';

  // Use a stable tag derived from the content to prevent OS-level duplication.
  // If the same message arrives twice, the browser replaces the existing notification
  // instead of showing a second one.
  const tagSource = `${notificationTitle}__${notificationBody}`;
  let hash = 0;
  for (let i = 0; i < tagSource.length; i++) {
    hash = (Math.imul(31, hash) + tagSource.charCodeAt(i)) | 0;
  }
  const dedupeTag = `brgy-notif-${Math.abs(hash)}`;

  const notificationOptions = {
    body: notificationBody,
    icon: '/barangay-logo.jpg',
    tag: dedupeTag,          // OS deduplication key
    renotify: false,         // do NOT re-vibrate/re-sound if tag already exists
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
