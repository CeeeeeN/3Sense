import {
  collection,
  collectionGroup,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

export async function fetchRecipientsForAnnouncement(announcement) {
  const { category = "All Residents" } = announcement;
  const isGeneral =
    !category || category.trim().toLowerCase() === "all residents";

  const snap = await getDocs(collectionGroup(db, "residents"));
  if (snap.empty) return [];

  const categoryClean = category.trim().toLowerCase();
  const emailSet = new Set();

  snap.docs.forEach((d) => {
    const data = d.data();
    const email = (data.email || "").trim().toLowerCase();
    if (!email) return;

    if (isGeneral) {
      emailSet.add(email);
    } else {
      const cats = Array.isArray(data.categories) ? data.categories : [];
      const matches = cats.some(
        (c) => String(c).trim().toLowerCase() === categoryClean
      );
      if (matches) emailSet.add(email);
    }
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
  const q = query(
    collection(db, "emailBlasts"),
    where("sourceId", "==", sourceId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const docs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.sentAt?.toDate ? a.sentAt.toDate() : new Date(a.sentAt || 0);
      const tb = b.sentAt?.toDate ? b.sentAt.toDate() : new Date(b.sentAt || 0);
      return tb - ta;
    });

  return docs[0];
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
    (typeof process !== "undefined" && process.env?.RESEND_FROM_EMAIL) ||
    "3Sense Barangay <noreply@resend.dev>";

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

  const blastData = {
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

  const blastRef = await addDoc(collection(db, "emailBlasts"), blastData);
  await updateDoc(blastRef, { blastId: blastRef.id });

  return {
    blastId: blastRef.id,
    results,
    totalSent,
    totalFailed,
  };
}
