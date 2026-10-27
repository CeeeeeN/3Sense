import {
  collection,
  collectionGroup,
  getDocs,
  setDoc, // <-- Imported setDoc
  doc,
  query,
  where,
  orderBy, // <-- Imported orderBy
  limit,   // <-- Imported limit
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

export async function fetchRecipientsForAnnouncement(announcement) {
  const { category = "All Residents" } = announcement;
  const isGeneral = !category || category.trim().toLowerCase() === "all residents";

  let snap;

  // ─── OPTIMIZED: Targeted Server-Side Query ───
  if (!isGeneral) {
    const baseCategory = category.trim();
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
    snap = await getDocs(q);
  } else {
    // "All Residents" inherently requires fetching everyone
    snap = await getDocs(collectionGroup(db, "residents"));
  }

  if (snap.empty) return [];

  const emailSet = new Set();
  snap.docs.forEach((d) => {
    const data = d.data();
    const email = (data.email || "").trim().toLowerCase();
    if (email) emailSet.add(email);
  });

  return [...emailSet];
}

export async function fetchRecipientsForProgram(programId) {
  const attendeesRef = collection(db, "Programs", programId, "attendees");
  const q = query(attendeesRef, where("status", "==", "approved"));
  const snap = await getDocs(q);

  const emailSet = new Set();
  snap.docs.forEach((d) => {
    const data = d.data();
    const email = (data.email || "").trim().toLowerCase();
    if (email) emailSet.add(email);
  });

  return [...emailSet];
}

export async function fetchRecipientsForLivelihood(programId) {
  const q = query(
    collection(db, "livelihoodRegistrations"),
    where("programId", "==", programId),
    where("status", "==", "approved")
  );
  const snap = await getDocs(q);

  const emailSet = new Set();
  snap.docs.forEach((d) => {
    const data = d.data();
    const email = (data.email || "").trim().toLowerCase();
    if (email) emailSet.add(email);
  });

  return [...emailSet];
}

export async function checkExistingBlast(sourceId) {
  if (!sourceId) return null;
  
  // ─── OPTIMIZED: Server-Side Sort & Limit ───
  // Downloads exactly 1 document instead of pulling the whole history
  const q = query(
    collection(db, "emailBlasts"),
    where("sourceId", "==", sourceId),
    orderBy("sentAt", "desc"),
    limit(1)
  );
  
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function sendEmailBlast({
  sourceType,
  sourceId,
  recipients,
  subject,
  html,
  onProgress,
}) {
  const from =
    import.meta.env?.VITE_RESEND_FROM_EMAIL ||
    "Barangay 3S+ Malanday <noreply@3s-sense.site>";

  const response = await fetch("/api/email-blast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      recipients: recipients.map((to) => ({ to, subject, html })),
    }),
  });

  let results = [];
  if (response.ok) {
    const data = await response.json();
    results = data.results || [];
  } else {
    results = recipients.map((email) => ({
      email,
      status: "failed",
      error: `HTTP ${response.status}`,
    }));
  }

  const totalSent = results.filter((r) => r.status === "sent").length;
  const totalFailed = results.filter((r) => r.status === "failed").length;

  if (typeof onProgress === "function") {
    onProgress({ sent: totalSent, failed: totalFailed, total: recipients.length });
  }

  // ─── OPTIMIZED: 1-Write Logging ───
  const blastRef = doc(collection(db, "emailBlasts"));
  
  const blastData = {
    blastId: blastRef.id,
    sourceType,
    sourceId,
    sentBy: auth.currentUser?.uid || "admin",
    sentByEmail: auth.currentUser?.email || "",
    sentAt: serverTimestamp(),
    totalRecipients: recipients.length,
    totalSent,
    totalFailed,
    subject,
    status: totalFailed === 0 ? "completed" : totalSent === 0 ? "failed" : "partial",
    results: results.map((r) => ({
      email: r.email,
      status: r.status,
      ...(r.messageId ? { messageId: r.messageId } : {}),
      ...(r.error ? { error: r.error } : {}),
    })),
  };

  await setDoc(blastRef, blastData);

  return {
    blastId: blastRef.id,
    results,
    totalSent,
    totalFailed,
  };
}