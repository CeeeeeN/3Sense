import { db } from "../firebase/firebase";
import {
  collection, addDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";

// ══════════════════════════════
// 📄 DOCUMENT REQUESTS
// ══════════════════════════════
export async function submitDocumentRequest(hhId, userName, docType, form) {
  const refNum = `BM-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "documentRequests"), {
    refNum, hhId,
    requesterName: userName,
    documentType: docType.name,
    documentId: docType.id,
    fee: docType.fee,
    processingDays: docType.days,
    firstName: form.firstName,
    middleName: form.middleName || "",
    lastName: form.lastName,
    fullName: `${form.firstName} ${form.middleName || ""} ${form.lastName}`.trim(),
    dateOfBirth: form.dob,
    civilStatus: form.civilStatus,
    address: form.address,
    contact: form.contact,
    email: form.email || "",
    ctcNumber: form.ctc,
    residingSince: form.residingSince,
    purpose: form.purpose,
    validIdFileName: form.validId || "",
    status: "pending",
    submittedAt: serverTimestamp(),
  });
  return refNum;
}

export async function getDocumentRequests(hhId) {
  const q = query(
    collection(db, "documentRequests"),
    where("hhId", "==", hhId),
    orderBy("submittedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ══════════════════════════════
// 🏢 FACILITY RESERVATIONS
// ══════════════════════════════
export async function submitFacilityReservation(hhId, userName, facility, form) {
  const refNum = `FR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "facilityReservations"), {
    refNum, hhId,
    requesterName: userName,
    facilityName: facility?.title || "Barangay Multi-Purpose Hall",
    facilityId: facility?.id || 1,
    purpose: form.purpose,
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    attendees: form.attendees || "",
    notes: form.notes || "",
    status: "pending",
    submittedAt: serverTimestamp(),
  });
  return refNum;
}

// ══════════════════════════════
// 🚔 INCIDENT REPORTS
// ══════════════════════════════
export async function submitIncidentReport(hhId, form) {
  const refNum = `PO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "incidentReports"), {
    refNum, hhId,
    isAnonymous: form.isAnonymous,
    reporterName: form.isAnonymous ? "Anonymous" : form.reporterName || "",
    contact: form.isAnonymous ? "" : form.contact || "",
    reporterAddress: form.isAnonymous ? "" : form.reporterAddress || "",
    incidentType: form.incidentType,
    location: form.location,
    date: form.date,
    time: form.time,
    description: form.description,
    urgency: form.urgency,
    photoFileName: form.photo || "",
    status: "received",
    updates: [`${form.date} – Report received`],
    submittedAt: serverTimestamp(),
  });
  return refNum;
}

export async function trackIncidentReport(refNum) {
  const q = query(
    collection(db, "incidentReports"),
    where("refNum", "==", refNum.toUpperCase())
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

// ══════════════════════════════
// 💚 BSWD REPORTS & TIPS
// ══════════════════════════════
export async function submitBSWDReport(hhId, form) {
  await addDoc(collection(db, "bswdReports"), {
    hhId,
    type: "homeless_report",
    reporterName: form.name || "Anonymous",
    location: form.location,
    description: form.description,
    photoFileName: form.photo || "",
    status: "received",
    submittedAt: serverTimestamp(),
  });
}

export async function submitBSWDTip(hhId, form) {
  await addDoc(collection(db, "bswdReports"), {
    hhId,
    type: "tip",
    about: form.about,
    tip: form.tip,
    contact: form.contact || "",
    status: "received",
    submittedAt: serverTimestamp(),
  });
}

// ══════════════════════════════
// 💼 LIVELIHOOD REGISTRATIONS
// ══════════════════════════════
export async function submitLivelihoodRegistration(hhId, form, program) {
  const regNum = `LH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "livelihoodRegistrations"), {
    regNum, hhId,
    fullName: `${form.firstName} ${form.middleName || ""} ${form.lastName}`.trim(),
    firstName: form.firstName,
    middleName: form.middleName || "",
    lastName: form.lastName,
    address: form.address,
    contact: form.contact,
    email: form.email || "",
    idFileName: form.idFile || "",
    programId: program.id,
    programName: program.name,
    programDate: program.date,
    programTime: program.time,
    programLocation: program.location,
    status: "pending",
    submittedAt: serverTimestamp(),
  });
  return regNum;
}

export async function getLivelihoodRegistrations(hhId) {
  const q = query(
    collection(db, "livelihoodRegistrations"),
    where("hhId", "==", hhId),
    orderBy("submittedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}