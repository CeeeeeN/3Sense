import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/firebase";

/**
 * Create a personal notification for a specific resident.
 * @param {string} memberID – The resident's subcollection document ID
 * @param {string} title – Notification title
 * @param {string} message – Notification message body
 * @param {string} type – "document_update" | "facility_update" | "program_reminder" | "general"
 * @param {string} [refNum] – Optional reference number
 */
export async function createUserNotification(memberID, title, message, type, refNum = "") {
  try {
    await addDoc(collection(db, "user_notifications"), {
      memberID,
      title,
      message,
      type,
      refNum,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    fetch("/api/pushNotification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberID, title, message })
    }).catch(err => console.log("Silent error from FCM push endpoint", err));
  } catch (err) {
    console.error("Failed to create user notification:", err);
  }
}

/**
 * Subscribe to real-time notifications for a specific resident.
 * @param {string} memberID – The resident's subcollection document ID
 * @param {function} callback – Called with array of notification objects
 * @returns {function} unsubscribe function
 */
export function subscribeToUserNotifications(memberID, callback) {
  if (!memberID) {
    callback([]);
    return () => { };
  }

  const q = query(
    collection(db, "user_notifications"),
    where("memberID", "==", memberID)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    // Sort in memory by createdAt descending
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
 * Mark a single notification as read.
 * @param {string} notifId – Firestore document ID
 */
export async function markNotificationAsRead(notifId) {
  try {
    const ref = doc(db, "user_notifications", notifId);
    await updateDoc(ref, { isRead: true });
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
  }
}

/**
 * Mark all notifications for a member as read.
 * @param {Array} notifications – Array of notification objects with id field
 */
export async function markAllNotificationsAsRead(notifications) {
  try {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(
      unread.map(n => updateDoc(doc(db, "user_notifications", n.id), { isRead: true }))
    );
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
  }
}

/**
 * Delete a single notification.
 * @param {string} notifId – Firestore document ID
 */
export async function deleteUserNotification(notifId) {
  try {
    const ref = doc(db, "user_notifications", notifId);
    await deleteDoc(ref);
  } catch (err) {
    console.error("Failed to delete notification:", err);
  }
}
