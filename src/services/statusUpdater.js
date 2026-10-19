import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const runStatusMaintenance = async () => {
  console.log("[Maintenance] Running background status checks for 3Sense...");
  
  let batch = writeBatch(db);
  let batchOperationCount = 0;
  let totalUpdatesCount = 0;
  
  // ─── OPTIMIZED: Chunked Batch Handler ───
  // Prevents the script from crashing if it exceeds Firestore's 500-write limit
  const commitAndResetBatch = async () => {
    if (batchOperationCount > 0) {
      await batch.commit();
      totalUpdatesCount += batchOperationCount;
      batch = writeBatch(db);
      batchOperationCount = 0;
    }
  };

  const safeBatchUpdate = async (ref, data) => {
    batch.update(ref, data);
    batchOperationCount++;
    if (batchOperationCount >= 450) {
      await commitAndResetBatch();
    }
  };

  // 1. Get accurate LOCAL date and time
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const todayStr = `${year}-${month}-${day}`; // e.g., "2026-05-12"
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`; // e.g., "14:30"

  try {
    // ── A. Check ALL Programs (General & Livelihood) ──
    const qProg = query(
      collection(db, "Programs"), 
      where("status", "in", ["Upcoming", "Approved", "Ongoing"]) 
    );
    const snapProg = await getDocs(qProg);

    // MUST use for...of loop. .forEach() ignores async/await!
    for (const docSnap of snapProg.docs) {
      const data = docSnap.data();
      const progDate = data.date; 
      const startTime = data.startTime || "00:00"; 
      const endTime = data.endTime || "23:59";     
      const currentStatus = data.status;

      let newStatus = null;

      if (progDate && progDate < todayStr) {
        newStatus = "Completed";
      } else if (progDate === todayStr) {
        if (currentTimeStr >= endTime) {
          newStatus = "Completed";
        } else if (currentTimeStr >= startTime && currentTimeStr < endTime) {
          newStatus = "Ongoing";
        }
      }

      if (newStatus && newStatus !== currentStatus) {
        await safeBatchUpdate(docSnap.ref, { status: newStatus });

        // Safely and atomically batch the attendee updates
        if (newStatus === "Completed") {
          const attendeesRef = collection(db, "Programs", docSnap.id, "attendees");
          const attendeeSnap = await getDocs(attendeesRef);
          
          for (const attendeeDoc of attendeeSnap.docs) {
            await safeBatchUpdate(attendeeDoc.ref, { status: "Completed" });
          }
        }
      }
    }

    // ── B. Check Facility Reservations ──
    const qRes = query(
      collection(db, "facility_reservations"),
      where("status", "in", ["Upcoming", "Approved", "Ongoing"])
    );
    const snapRes = await getDocs(qRes);

    for (const docSnap of snapRes.docs) {
      const data = docSnap.data();
      const resDate = data.date; 
      const resStartTime = data.startTime || data.time || "00:00"; 
      const resEndTime = data.endTime || "23:59";
      const currentStatus = data.status;

      let newStatus = null;

      if (resDate && resDate < todayStr) {
        newStatus = "Completed";
      } else if (resDate === todayStr) {
        if (currentTimeStr >= resEndTime) {
          newStatus = "Completed";
        } else if (currentTimeStr >= resStartTime && currentTimeStr < resEndTime) {
          newStatus = "Ongoing";
        }
      }

      if (newStatus && newStatus !== currentStatus) {
        await safeBatchUpdate(docSnap.ref, { status: newStatus });
      }
    }

    // ── Commit any remaining updates in the final Batch ──
    await commitAndResetBatch();

    if (totalUpdatesCount > 0) {
      console.log(`[Maintenance] Successfully updated ${totalUpdatesCount} transactions.`);
    } else {
      console.log("[Maintenance] All statuses are up to date.");
    }

  } catch (error) {
    console.error("[Maintenance] Error running status checks:", error);
  }
};