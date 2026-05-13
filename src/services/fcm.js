import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "../firebase/firebase";
import { doc, setDoc, arrayUnion } from "firebase/firestore";

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

// Request notification permission, generate FCM token, and store it for the specified user.

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
        // Save token using the token itself as the document ID
        // This prevents duplicates and allows us to store the householdID & residentID as fields to be queried
        const userFcmRef = doc(db, "fcmTokens", token);
        await setDoc(userFcmRef, {
          token: token,
          householdID: householdID,
          residentID: residentID,
          updatedAt: new Date()
        }, { merge: true });

        console.log("FCM Token saved successfully.");
      }
    } else {
      console.log("Notification permission denied");
    }
  } catch (error) {
    console.error("An error occurred while retrieving token. ", error);
  }
};


// Attaches a listener for foreground FCM messages.

export const listenForForegroundMessages = () => {
  return onMessage(messaging, (payload) => {

    console.log("Push notification received in foreground: ", payload);
  });
};
