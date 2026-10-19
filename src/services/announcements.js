import { 
    collection, 
    collectionGroup, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    serverTimestamp, 
    query, 
    orderBy, 
    getDocs, 
    limit, 
    where 
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { createUserNotification } from "./userNotifications";

/**
 * Fan out an in-app notification to every HOUSEHOLD that has at least one
 * resident whose categories array contains the announcement's target category.
 */
const fanOutAnnouncementNotification = async ({ title, description, category, announcementID }) => {
  if (!category || category.trim().toLowerCase() === "all residents") return;

  const baseCategory = category.trim();
  console.log(`[fanOut] Starting fan-out for category: "${baseCategory}"`);

  try {
    // ─── OPTIMIZED: Targeted Server-Side Query ───
    // Instead of downloading 5,000 residents to find 50, we ask Firestore to only 
    // send us the residents who match. We use variations to catch capitalization differences.
    const variations = [...new Set([
        baseCategory,
        baseCategory.toLowerCase(),
        baseCategory.toUpperCase(),
        baseCategory.charAt(0).toUpperCase() + baseCategory.slice(1).toLowerCase()
    ])];

    const q = query(
        collectionGroup(db, "residents"),
        where("categories", "array-contains-any", variations)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      console.warn(`[fanOut] No residents found matching category: ${baseCategory}`);
      return;
    }

    // Collect unique householdIDs
    const matchedHouseholdIDs = new Set();
    snap.docs.forEach((d) => {
      const householdID = d.ref.parent.parent?.id;
      if (householdID) matchedHouseholdIDs.add(householdID);
    });

    console.log(`[fanOut] Matched ${matchedHouseholdIDs.size} household(s) for category "${baseCategory}"`);

    if (matchedHouseholdIDs.size === 0) return;

    // Fire network requests in parallel
    // (Note: We will optimize createUserNotification's internal writes when we review userNotifications.js)
    const results = await Promise.allSettled(
      [...matchedHouseholdIDs].map((householdID) =>
        createUserNotification(
          householdID,                           // householdID field
          "household",                           // residentID = "household" for household-wide
          `New Announcement`,
          `${title} — ${description}`.slice(0, 200),
          "announcement",
          announcementID                         // refNum
        )
      )
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.warn(`[fanOut] ${failed.length} notification(s) failed:`, failed);
    } else {
      console.log(`[fanOut] ✅ Sent to ${matchedHouseholdIDs.size} household(s) successfully.`);
    }
  } catch (err) {
    console.error("[fanOut] Announcement notification error:", err);
  }
};

export const createAnnouncement = async (data, adminID) => {
  const announcementsRef = collection(db, "announcements");
  
  // ─── OPTIMIZED: 1-Write Creation ───
  // Generate the ID locally, then set it in a single payload.
  const newRef = doc(announcementsRef);
  
  await setDoc(newRef, {
    announcementID: newRef.id,
    adminID: adminID || "Admin",
    title: data.title || "",
    description: data.description || "",
    category: data.category || "All Residents",
    announcementCategory: data.announcementCategory || "General",
    requirements: Array.isArray(data.requirements) ? data.requirements.filter(r => (r || "").trim() !== "") : [],
    location: data.location || "",
    time: data.time || "",
    postedBy: data.postedBy || "Barangay Admin",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Fire-and-forget: notify matching residents
  fanOutAnnouncementNotification({
    title: data.title || "",
    description: data.description || "",
    category: data.category || "All Residents",
    announcementID: newRef.id,
  });
};

export const updateAnnouncement = async (id, data) => {
  const annRef = doc(db, "announcements", id);

  const updates = {
    title: data.title || "",
    description: data.description || "",
    category: data.category || "All Residents",
    announcementCategory: data.announcementCategory || "General",
    requirements: Array.isArray(data.requirements) ? data.requirements.filter(r => (r || "").trim() !== "") : [],
    location: data.location || "",
    time: data.time || "",
    postedBy: data.postedBy || "Barangay Admin",
    updatedAt: serverTimestamp(),
  };

  await updateDoc(annRef, updates);
};

export const deleteAnnouncement = async (id) => {
  const annRef = doc(db, "announcements", id);
  await deleteDoc(annRef);
};

export const subscribeToAnnouncements = (callback) => {
  // ─── OPTIMIZED: Capped Listener ───
  // Prevents downloading years of history on mount
  const q = query(
      collection(db, "announcements"), 
      orderBy("createdAt", "desc"),
      limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map(doc => {
      const data = doc.data();
      let displayDate = "";

      if (data.createdAt) {
        displayDate = data.createdAt.toDate 
            ? data.createdAt.toDate().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) 
            : new Date(data.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
      } else {
        displayDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
      }

      return {
        id: doc.id,
        ...data,
        date: displayDate,
      };
    });
    callback(announcements);
  });
};