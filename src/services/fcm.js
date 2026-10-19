import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

/**
 * Request notification permission, generate FCM token, and store it for the specified user.
 * OPTIMIZED: Uses local storage to prevent redundant database writes on page refresh.
 */
export const requestPushPermission = async (householdID, residentID) => {
  if (!householdID || !residentID) return;

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.log("This browser does not support desktop notification or service workers");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Explicitly register the service worker for Vercel/Vite
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration 
      });

      if (token) {
        // ─── OPTIMIZED: Dirty Check / Cache Check ───
        // Prevent writing to Firestore if we already saved this exact token for this user
        const cacheKey = `fcm_sync_${householdID}_${residentID}`;
        const cachedToken = localStorage.getItem(cacheKey);

        if (cachedToken === token) {
          console.log("FCM Token already synced to database. Skipping write.");
          return;
        }

        // Save token using the token itself as the document ID
        const userFcmRef = doc(db, "fcmTokens", token);
        await setDoc(userFcmRef, {
          token: token,
          householdID: householdID,
          residentID: residentID,
          updatedAt: new Date()
        }, { merge: true });

        // Cache the successful sync
        localStorage.setItem(cacheKey, token);
        console.log("FCM Token saved successfully to database.");
      }
    } else {
      console.log("Notification permission denied");
    }
  } catch (error) {
    console.error("An error occurred while retrieving token. ", error);
  }
};

/**
 * Attaches a listener for foreground FCM messages.
 */
export const listenForForegroundMessages = () => {
  return onMessage(messaging, (payload) => {
    console.log("Push notification received in foreground: ", payload);
    // You can dispatch a custom event or React state update here if you want 
    // to show an in-app toast notification when the app is open.
  });
};