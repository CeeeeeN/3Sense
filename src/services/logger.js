import { db } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Logs an admin action to the Firestore database.
 * @param {string} adminName - Name of the admin performing the action
 * @param {string} adminRole - Role of the admin (e.g., BSWD Head)
 * @param {string} actionType - Short category (e.g., "APPROVED_REQUEST", "REJECTED_REQUEST")
 * @param {string} details - A readable description of what happened
 */
export const logTransaction = async (adminName, adminRole, actionType, details) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      adminName: adminName || "Unknown Admin",
      adminRole: adminRole || "Unknown Role",
      actionType: actionType,
      details: details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to write to audit log: ", error);
  }
};