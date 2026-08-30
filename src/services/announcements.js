import { collection, collectionGroup, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { createUserNotification } from "./userNotifications";

/**
 * Fan out an in-app notification to every HOUSEHOLD that has at least one
 * resident whose categories array contains the announcement's target category.
 * Targets the householdID (globally unique) instead of the resident doc ID
 * (which is NOT unique — e.g. "head" exists in every household).
 * Only runs for specific-category announcements — skips "All Residents".
 * Fire-and-forget: errors are silently swallowed so they never block the post.
 */
const fanOutAnnouncementNotification = async ({ title, description, category, announcementID }) => {
  // "All Residents" announcements do NOT trigger notifications
  if (!category || category.trim().toLowerCase() === "all residents") return;

  const categoryClean = category.trim().toLowerCase();
  console.log(`[fanOut] Starting fan-out for category: "${category}"`);

  try {
    // Fetch all residents across all households (no composite index needed)
    const snap = await getDocs(collectionGroup(db, "residents"));

    if (snap.empty) {
      console.warn("[fanOut] No residents found in collectionGroup.");
      return;
    }

    // Collect unique householdIDs that have at least one resident matching the category
    const matchedHouseholdIDs = new Set();
    snap.docs.forEach((d) => {
      const data = d.data();
      const cats = Array.isArray(data.categories) ? data.categories : [];
      const matches = cats.some((c) => String(c).trim().toLowerCase() === categoryClean);
      if (matches) {
        // d.ref.parent.parent.id is the householdID — always globally unique
        const householdID = d.ref.parent.parent?.id;
        if (householdID) matchedHouseholdIDs.add(householdID);
      }
    });

    console.log(`[fanOut] Matched ${matchedHouseholdIDs.size} household(s) for category "${category}"`);

    if (matchedHouseholdIDs.size === 0) return;

    // Send ONE notification per household.
    // residentID = "household" marks it as a household-wide notification
    // so the Navbar's household stream can subscribe to (householdID, "household").
    const results = await Promise.allSettled(
      [...matchedHouseholdIDs].map((householdID) =>
        createUserNotification(
          householdID,                           // householdID field
          "household",                           // residentID = "household" for household-wide
          `New Announcement`,
          `${title} — ${description}`.slice(0, 200),
          "announcement",
          announcementID                         // refNum — used to deep-link to the announcement
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
  const newRef = await addDoc(announcementsRef, {
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
  await updateDoc(newRef, { announcementID: newRef.id });

  // Fire-and-forget: notify matching residents (category-specific only)
  fanOutAnnouncementNotification({
    title: data.title || "",
    description: data.description || "",
    category: data.category || "All Residents",
    announcementID: newRef.id,
  });
};

export const updateAnnouncement = async (id, data) => {
  const annRef = doc(db, "announcements", id);

  // Create a clean updates object without complex nested things
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
  const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map(doc => {
      const data = doc.data();
      let displayDate = "";

      if (data.createdAt) {
        // handle firestore timestamp
        displayDate = data.createdAt.toDate ? data.createdAt.toDate().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : new Date(data.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
      } else {
        displayDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
      }

      return {
        id: doc.id,
        ...data,
        date: displayDate, // for display purposes in ui
      };
    });
    callback(announcements);
  });
};
