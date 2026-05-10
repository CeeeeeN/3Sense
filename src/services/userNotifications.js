import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/firebase";

/**
 * Create a personal notification for a specific resident.
 * Stores both householdID and residentID so the subscription query can
 * filter by both, preventing cross-household notification leakage
 * (e.g. all heads share residentID="head" across households).
 *
 * @param {string} householdID – The household's Firestore document ID
 * @param {string} residentID  – The resident's doc ID within that household
 *                               (use "household" for household-wide notifs like announcements)
 * @param {string} title       – Notification title
 * @param {string} message     – Notification message body
 * @param {string} type        – "document_update" | "facility_update" | "announcement" | "general"
 * @param {string} [refNum]    – Optional reference number / deep-link ID
 */
export async function createUserNotification(householdID, residentID, title, message, type, refNum = "") {
  try {
    const ref = await addDoc(collection(db, "user_notifications"), {
      householdID,  // for compound filtering — prevents cross-household leakage
      residentID,   // the resident doc ID ("head", "member_xxx", or "household" for announcements)
      title,
      message,
      type,
      refNum,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    await updateDoc(ref, { userNotificationID: ref.id });

    fetch("/api/pushNotification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdID, residentID, title, message })
    }).catch(err => console.log("Silent error from FCM push endpoint", err));
  } catch (err) {
    console.error("Failed to create user notification:", err);
  }
}

/**
 * Subscribe to real-time notifications for a specific resident within a household.
 * Filters by BOTH householdID and residentID so residents with the same
 * doc name (e.g. "head") across different households stay isolated.
 *
 * @param {string}   householdID – The household's Firestore document ID
 * @param {string}   residentID  – The resident's doc ID (or "household" for announcements)
 * @param {function} callback    – Called with array of notification objects
 * @returns {function} unsubscribe function
 */
export function subscribeToUserNotifications(householdID, residentID, callback) {
  if (!householdID || !residentID) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, "user_notifications"),
    where("householdID", "==", householdID), // SECURE: isolates to this household
    where("residentID",  "==", residentID),  // SECURE: isolates to this specific resident
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    // Sort newest-first in memory (avoids needing a composite Firestore index)
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
    await updateDoc(doc(db, "user_notifications", notifId), { isRead: true });
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
  }
}

/**
 * Mark all notifications for a resident as read.
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
    await deleteDoc(doc(db, "user_notifications", notifId));
  } catch (err) {
    console.error("Failed to delete notification:", err);
  }
}
