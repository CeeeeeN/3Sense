import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "../firebase/firebase";
import { doc, setDoc, arrayUnion } from "firebase/firestore";

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

// Request notification permission, generate FCM token, and store it for the specified user.

export const requestPushPermission = async (userID) => {
  if (!userID) return;

  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
        // Save token to Firestore array
        const userFcmRef = doc(db, "fcmTokens", userID);
        await setDoc(userFcmRef, {
          tokens: arrayUnion(token)
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
