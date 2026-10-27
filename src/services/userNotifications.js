import {
  collection,
  setDoc, // <-- Imported setDoc
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch // <-- Imported writeBatch
} from "firebase/firestore";
import { db } from "../firebase/firebase";

/**
 * Internal helper to dispatch an Expo Push Notification to a device token
 */
async function dispatchExpoPush(pushToken, title, message, data = {}) {
  if (!pushToken || typeof pushToken !== "string" || !pushToken.startsWith("ExponentPushToken")) {
    return;
  }

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        sound: "default",
        title: title || "Barangay 3S+ Malanday",
        body: message,
        data: { screen: "notifications", ...data },
      }),
    });
  } catch (err) {
    console.error("Failed to dispatch push notification via Expo API:", err);
  }
}

/**
 * Resolves push tokens and sends real-time system alerts to the resident(s)
 */
async function sendPushToResidentOrHousehold(householdID, residentID, title, message, refNum = "") {
  if (!householdID) return;

  try {
    const cleanHH = householdID.trim();

    // Scenario A: Notification targeted to a specific resident (e.g., "head", "member_123")
    if (residentID && residentID !== "household" && residentID !== "all") {
      const resRef = doc(db, "households", cleanHH, "residents", residentID.trim());
      const resSnap = await getDoc(resRef);
      if (resSnap.exists()) {
        const token = resSnap.data()?.pushToken;
        if (token) {
          await dispatchExpoPush(token, title, message, { householdID: cleanHH, residentID, refNum });
        }
      }
    }
    // Scenario B: Household-wide broadcast notification
    else {
      const residentsSnap = await getDocs(collection(db, "households", cleanHH, "residents"));
      // Map over all residents and fire push requests concurrently
      const pushPromises = residentsSnap.docs.map(async (docSnap) => {
        const token = docSnap.data()?.pushToken;
        if (token) {
          return dispatchExpoPush(token, title, message, { householdID: cleanHH, refNum });
        }
      });
      await Promise.all(pushPromises);
    }
  } catch (err) {
    console.error("Error fetching push token for resident:", err);
  }
}

/**
 * Create a personal in-app notification and automatically trigger an Expo lock-screen push notification.
 *
 * @param {string} householdID – The household's Firestore document ID
 * @param {string} residentID  – The resident's doc ID within that household ("head", "member_xxx", or "household")
 * @param {string} title       – Notification title
 * @param {string} message     – Notification message body
 * @param {string} type        – "document_update" | "facility_update" | "equipment_update" | "announcement" | "general"
 * @param {string} [refNum]    – Optional reference number / deep-link ID
 */
export async function createUserNotification(householdID, residentID, title, message, type, refNum = "") {
  try {
    // ─── OPTIMIZED: 1-Write Creation ───
    // Generate the doc locally so we can include the ID in the initial setDoc payload
    const newNotifRef = doc(collection(db, "user_notifications"));

    await setDoc(newNotifRef, {
      userNotificationID: newNotifRef.id, // Set immediately, bypassing the old updateDoc
      householdID: householdID.trim(),
      residentID: residentID ? residentID.trim() : "household",
      title,
      message,
      type: type || "general",
      refNum: refNum || "",
      isRead: false,
      createdAt: serverTimestamp(),
    });

    // Dispatch Live Mobile Push Notification (Non-blocking)
    sendPushToResidentOrHousehold(householdID, residentID, title, message, refNum).catch(e => 
      console.warn("Silent push notification error:", e)
    );

  } catch (err) {
    console.error("Failed to create user notification:", err);
  }
}

/**
 * Top-level admin notification utility
 */
export async function createNotification(type, message, triggeredBy, refNum = "") {
  try {
    await setDoc(doc(collection(db, "notifications")), {
      type,
      message,
      triggeredBy,
      refNum,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to create admin notification:", err);
  }
}

/**
 * Real-time listener for in-app notifications
 */
export function subscribeToUserNotifications(householdID, residentID, callback) {
  if (!householdID || !residentID) {
    callback([]);
    return () => { };
  }

  const q = query(
    collection(db, "user_notifications"),
    where("householdID", "==", householdID.trim()),
    where("residentID", "in", [residentID.trim(), "household", "all"])
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    notifications.sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return tb - ta;
    });

    callback(notifications);
  }, (err) => {
    console.error("Notification listener error:", err);
    callback([]);
  });
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notifId) {
  if (!notifId) return;
  try {
    await updateDoc(doc(db, "user_notifications", notifId), { isRead: true });
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
  }
}

/**
 * Mark all notifications for a resident as read
 */
export async function markAllNotificationsAsRead(notifications) {
  try {
    const unread = (notifications || []).filter((n) => !n.isRead);
    if (unread.length === 0) return;

    // ─── OPTIMIZED: Batched Atomic Write ───
    // Updates up to 500 unread notifications in exactly 1 network request
    const batch = writeBatch(db);

    unread.forEach((n) => {
      const notifRef = doc(db, "user_notifications", n.id);
      batch.update(notifRef, { isRead: true });
    });

    await batch.commit();

  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
  }
}

/**
 * Delete a single notification
 */
export async function deleteUserNotification(notifId) {
  if (!notifId) return;
  try {
    await deleteDoc(doc(db, "user_notifications", notifId));
  } catch (err) {
    console.error("Failed to delete notification:", err);
  }
}