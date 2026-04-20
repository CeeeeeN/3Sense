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
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || '',
    icon: '/barangay-logo.jpg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
