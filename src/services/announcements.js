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
    limit
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { createAnnouncementNotification } from "./userNotifications";

/**
 * Fan out an in-app notification to every resident whose category matches
 * the announcement's target category.
 * Only residents belonging to the targeted category receive the notification.
 * Duplicate notifications for the same resident and announcement are prevented.
 */
const fanOutAnnouncementNotification = async ({ title, description, category, announcementID }) => {
  if (!category || category.trim().toLowerCase() === "all residents" || !announcementID) return;

  const baseCategory = category.trim();
  const targetLower = baseCategory.toLowerCase();
  console.log(`[fanOut] Starting targeted fan-out for category: "${baseCategory}" (announcement: ${announcementID})`);

  try {
    let residentDocs = [];

    // Attempt 1: Fetch via collectionGroup("residents") without 'where' (no composite index needed)
    try {
      const cgSnap = await getDocs(collectionGroup(db, "residents"));
      if (!cgSnap.empty) {
        residentDocs = cgSnap.docs;
      }
    } catch (cgErr) {
      console.warn("[fanOut] collectionGroup query failed or blocked, falling back to household traversal:", cgErr);
    }

    // Attempt 2: If collectionGroup failed or returned nothing, traverse households
    if (residentDocs.length === 0) {
      try {
        const hhSnap = await getDocs(collection(db, "households"));
        const subPromises = hhSnap.docs.map(hDoc =>
          getDocs(collection(db, "households", hDoc.id, "residents"))
        );
        const subSnaps = await Promise.allSettled(subPromises);
        subSnaps.forEach(res => {
          if (res.status === "fulfilled" && !res.value.empty) {
            res.value.docs.forEach(d => residentDocs.push(d));
          }
        });
      } catch (hhErr) {
        console.error("[fanOut] Error traversing households for residents:", hhErr);
      }
    }

    if (residentDocs.length === 0) {
      console.warn("[fanOut] No resident records found in database.");
      return;
    }

    const matchedResidents = [];
    const seenResidentKeys = new Set();

    residentDocs.forEach(d => {
      const data = d.data();
      const residentID = d.id || data.residentID;
      const householdID = d.ref.parent.parent?.id || data.householdID;
      if (!householdID || !residentID) return;

      const rawCat = data.categories || data.category;
      let cats = [];
      if (Array.isArray(rawCat)) {
        cats = rawCat;
      } else if (typeof rawCat === "string") {
        cats = rawCat.split(",");
      }

      const isMatch = cats.some(c => String(c).trim().toLowerCase() === targetLower);
      if (isMatch) {
        const uniqueKey = `${householdID}_${residentID}`;
        if (!seenResidentKeys.has(uniqueKey)) {
          seenResidentKeys.add(uniqueKey);
          matchedResidents.push({ householdID, residentID });
        }
      }
    });

    if (matchedResidents.length === 0) {
      console.warn(`[fanOut] No residents found matching category: "${baseCategory}"`);
      return;
    }

    console.log(`[fanOut] Matched ${matchedResidents.length} targeted resident(s) for category "${baseCategory}"`);

    const notifMessage = description ? `${title} — ${description}`.slice(0, 200) : title;

    const results = await Promise.allSettled(
      matchedResidents.map(({ householdID, residentID }) =>
        createAnnouncementNotification({
          householdID,
          residentID,
          announcementID,
          title: "New Announcement",
          message: notifMessage,
          category: baseCategory,
        })
      )
    );

    const sentCount = results.filter(r => r.status === "fulfilled" && r.value === true).length;
    console.log(`[fanOut] ✅ Sent ${sentCount} new notification(s) to targeted resident(s) of category "${baseCategory}".`);
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

  // Fire-and-forget: notify matching residents belonging to targeted category
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

  // If targeted to a specific category, ensure matching residents are notified (duplicate-safe)
  if (data.category && data.category.trim().toLowerCase() !== "all residents") {
    fanOutAnnouncementNotification({
      title: data.title || "",
      description: data.description || "",
      category: data.category,
      announcementID: id,
    });
  }
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
