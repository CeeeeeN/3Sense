import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const runStatusMaintenance = async () => {
  console.log("[Maintenance] Running background status checks for 3Sense...");
  const batch = writeBatch(db);
  let updatesCount = 0;
  
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
      // Look for anything that hasn't finished yet
      where("status", "in", ["Upcoming", "Approved", "Ongoing"]) 
    );
    const snapProg = await getDocs(qProg);

    snapProg.forEach((docSnap) => {
      const data = docSnap.data();
      const progDate = data.date; 
      const startTime = data.startTime || "00:00"; 
      const endTime = data.endTime || "23:59";     
      const currentStatus = data.status;

      let newStatus = null;

      // Logic Check 1: Is it entirely in the past?
      if (progDate && progDate < todayStr) {
        newStatus = "Completed";
      } 
      // Logic Check 2: Is it happening TODAY?
      else if (progDate === todayStr) {
        if (currentTimeStr >= endTime) {
          // Time has passed the end time
          newStatus = "Completed";
        } else if (currentTimeStr >= startTime && currentTimeStr < endTime) {
          // Time is currently between start and end time!
          newStatus = "Ongoing";
        }
      }

      // Only add to the update batch if the status actually needs to change
      if (newStatus && newStatus !== currentStatus) {
        batch.update(docSnap.ref, { status: newStatus });
        updatesCount++;

        const attendeesRef = collection(db, "Programs", docSnap.id, "attendees");
        getDocs(attendeesRef).then((attendeeSnap) => {
          attendeeSnap.forEach((attendeeDoc) => {
             updateDoc(attendeeDoc.ref, { status: "Completed" });
          });
        });
      }
    });

    // ── B. Check Facility Reservations ──
    const qRes = query(
      collection(db, "facility_reservations"),
      where("status", "in", ["Upcoming", "Approved", "Ongoing"])
    );
    const snapRes = await getDocs(qRes);

    snapRes.forEach((docSnap) => {
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
        batch.update(docSnap.ref, { status: newStatus });
        updatesCount++;
      }
    });

    // ── Commit the Batch ──
    if (updatesCount > 0) {
      await batch.commit();
      console.log(`[Maintenance] Successfully updated ${updatesCount} transactions.`);
    } else {
      console.log("[Maintenance] All statuses are up to date.");
    }

  } catch (error) {
    console.error("[Maintenance] Error running status checks:", error);
  }
};