import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";

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
        displayDate = data.createdAt.toDate ? data.createdAt.toDate().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : new Date(data.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      } else {
        displayDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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
