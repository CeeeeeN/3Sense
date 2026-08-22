import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, onSnapshot, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export async function createUserNotification(householdID, residentID, title, message, type, refNum = "") {
  try {
    const ref = await addDoc(collection(db, "user_notifications"), {
      householdID: (householdID || "").trim(),
      residentID: (residentID || "").trim(),
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

export function subscribeToUserNotifications(householdID, residentID, userRole, callback) {
  if (!householdID) {
    callback([]);
    return () => {};
  }

  const isHead =
    userRole === "Household Head" ||
    userRole === "head" ||
    residentID === "head";

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const q = isHead
    ? query(
        collection(db, "user_notifications"),
        where("householdID", "==", householdID.trim())
      )
    : query(
        collection(db, "user_notifications"),
        where("householdID", "==", householdID.trim()),
        where("residentID", "in", [residentID.trim(), "household", "all"])
      );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(item => {
        if (!item.createdAt) return false;
        const itemDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
        return itemDate >= thirtyDaysAgo;
      });

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

export async function markNotificationAsRead(notifId) {
  try {
    await updateDoc(doc(db, "user_notifications", notifId), { isRead: true });
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
  }
}

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

export async function deleteUserNotification(notifId) {
  try {
    await deleteDoc(doc(db, "user_notifications", notifId));
  } catch (err) {
    console.error("Failed to delete notification:", err);
  }
}
