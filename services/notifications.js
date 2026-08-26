// src/services/notifications.js
// ─────────────────────────────────────────────────────────────
// Utility: createNotification
// Writes one doc to the top-level "notifications" collection.
// Every approved admin will receive every alert (no per-user
// fan-out needed — the admin panel just reads the whole collection).
// ─────────────────────────────────────────────────────────────

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

/**
 * @param {"household_registration"|"document_request"|"facility_request"|"feedback"|"new_admin"} type
 * @param {string} message   – Short human-readable description
 * @param {string} triggeredBy – Name or email of the person who triggered it
 * @param {string} [refNum]  – Optional reference / HH number
 */
export async function createNotification(type, message, triggeredBy, refNum = "") {
  try {
    await addDoc(collection(db, "notifications"), {
      type,
      message,
      triggeredBy,
      refNum,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-blocking — notification failure should never break the main action
    console.error("Failed to create notification:", err);
  }
}