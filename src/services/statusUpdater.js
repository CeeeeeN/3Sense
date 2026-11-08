import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const runStatusMaintenance = async () => {
  console.log("[Maintenance] Running background status checks for 3Sense...");
  
  let batch = writeBatch(db);
  let batchOperationCount = 0;
  let totalUpdatesCount = 0;
  
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

  const now = new Date();
  // Adjust for local timezone to ensure accurate day comparison
  const localNow = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  const todayStr = localNow.toISOString().split('T')[0];
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;

  try {
    // ── A. Check ALL Programs (General & Livelihood) ──
    const qProg = query(
      collection(db, "Programs"), 
      where("status", "in", ["Upcoming", "Approved", "Ongoing"]) 
    );
    const snapProg = await getDocs(qProg);

    for (const docSnap of snapProg.docs) {
      const data = docSnap.data();
      
      const startDate = data.startDate || data.date; 
      // Ensure we explicitly grab endDate if it exists, otherwise fallback to startDate
      const endDate = data.endDate || startDate; 
      
      const startTime = data.startTime || "00:00"; 
      const endTime = data.endTime || "23:59";     
      const currentStatus = data.status;

      let newStatus = null;

      // 1. Are we past the exact end moment?
      // For multi-day, we only care about the time on the FINAL day
      const isPastEnd = (todayStr > endDate) || (todayStr === endDate && currentTimeStr >= endTime);
      
      // 2. Are we past the exact start moment?
      const isPastStart = (todayStr > startDate) || (todayStr === startDate && currentTimeStr >= startTime);

      if (isPastEnd) {
        newStatus = "Completed";
      } else if (isPastStart) {
        newStatus = "Ongoing";
      }

      if (newStatus && newStatus !== currentStatus) {
        await safeBatchUpdate(docSnap.ref, { status: newStatus });

        if (newStatus === "Completed") {
          // 1. Update standard program attendees (Sub-collection)
          const attendeesRef = collection(db, "Programs", docSnap.id, "attendees");
          const attendeeSnap = await getDocs(attendeesRef);
          
          for (const attendeeDoc of attendeeSnap.docs) {
            await safeBatchUpdate(attendeeDoc.ref, { status: "Completed" });
          }

          // 2. Update livelihood registrants (Root collection matching the programId)
          if (data.programType === "livelihood") {
            const livelihoodRef = collection(db, "livelihoodRegistrations");
            const qLivelihood = query(livelihoodRef, where("programId", "==", docSnap.id));
            const livelihoodSnap = await getDocs(qLivelihood);
            
            for (const livelihoodDoc of livelihoodSnap.docs) {
              // Only update those that were approved (don't mark rejected/pending as completed)
              const livStatus = (livelihoodDoc.data().status || "").toLowerCase();
              if (livStatus === "approved" || livStatus === "ongoing") {
                await safeBatchUpdate(livelihoodDoc.ref, { status: "Completed" });
              }
            }
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
      
      // Apply the same multi-day logic to reservations
      const startDate = data.startDate || data.date; 
      const endDate = data.endDate || startDate; 
      const startTime = data.startTime || data.time || "00:00"; 
      const endTime = data.endTime || "23:59";
      const currentStatus = data.status;

      let newStatus = null;

      const isPastEnd = (todayStr > endDate) || (todayStr === endDate && currentTimeStr >= endTime);
      const isPastStart = (todayStr > startDate) || (todayStr === startDate && currentTimeStr >= startTime);

      if (isPastEnd) {
        newStatus = "Completed";
      } else if (isPastStart) {
        newStatus = "Ongoing";
      }

      if (newStatus && newStatus !== currentStatus) {
        await safeBatchUpdate(docSnap.ref, { status: newStatus });
      }
    }

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