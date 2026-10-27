import { db } from '../firebase/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Logs an admin action to the Firestore database.
 * 
 * @param {string} adminName Name of the admin performing the action
 * @param {string} adminRole Role of the admin (e.g., BSWD Head)
 * @param {string} actionType Short category (e.g., "APPROVED_REQUEST", "REJECTED_REQUEST")
 * @param {string} details A readable description of what happened
 * @param {object} [batch=null] (Optional) A Firestore writeBatch object to group this log with other writes atomically
 */
export const logTransaction = async (adminName, adminRole, actionType, details, batch = null) => {
  try {
    // Generate the document reference locally
    const logRef = doc(collection(db, "audit_logs"));
    
    const logData = {
      adminName: adminName || "Unknown Admin",
      adminRole: adminRole || "Unknown Role",
      actionType: actionType,
      details: details,
      timestamp: serverTimestamp()
    };

    // ─── OPTIMIZED: Append to Batch if provided, otherwise execute immediately ───
    if (batch) {
      batch.set(logRef, logData);
    } else {
      await setDoc(logRef, logData);
    }
    
  } catch (error) {
    console.error("Failed to write to audit log: ", error);
  }
};