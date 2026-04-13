import { db } from "../firebase/firebase";
import {
  collection, addDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";

const generateRef = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ══════════════════════════════
// 📄 DOCUMENT REQUESTS
// ══════════════════════════════
export async function submitDocumentRequest(householdID, userID, userName, docType, form, customData = {}) {
  const refNum = generateRef();
  await addDoc(collection(db, "documentRequests"), {
    refNum, householdID, userID,
    requesterName: userName,
    documentType: docType.name || docType.title,
    documentId: docType.id,
    fee: docType.fee || "Free",
    processingDays: docType.days || docType.processingTime || "",
    firstName: form.firstName,
    middleName: form.middleName || "",
    lastName: form.lastName,
    fullName: `${form.firstName} ${form.middleName || ""} ${form.lastName}`.trim(),
    dateOfBirth: form.dob,
    civilStatus: form.civilStatus,
    address: form.address,
    contact: form.contact,
    email: form.email || "",
    residingSince: form.residingSince,
    purpose: form.purpose,
    validIdFileName: form.validId || "",
    status: "Pending",
    ...customData,
    submittedAt: serverTimestamp(),
  });
  return refNum;
}

export async function getDocumentRequests(householdID) {
  const q = query(
    collection(db, "documentRequests"),
    where("householdID", "==", householdID),
    orderBy("submittedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ══════════════════════════════
// 🏢 FACILITY RESERVATIONS
// ══════════════════════════════
export async function submitFacilityReservation(householdID, userID, userName, facility, form, customData = {}) {
  const refNum = generateRef();
  await addDoc(collection(db, "facilityReservations"), {
    refNum, householdID, userID,
    requesterName: form.fullName || userName,
    fullName: form.fullName || userName,
    email: form.email || "",
    contactNumber: form.contactNumber || "",
    facilityName: facility?.name || facility?.title || "Barangay Multi-Purpose Hall",
    facilityId: facility?.id || 1,
    purpose: form.purpose,
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    attendees: form.attendees || "",
    notes: form.notes || "",
    status: "Pending",
    ...customData,
    submittedAt: serverTimestamp(),
  });
  return refNum;
}

// ══════════════════════════════
// 🚔 INCIDENT REPORTS
// ══════════════════════════════
export async function submitIncidentReport(householdID, form) {
  const refNum = `PO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "incidentReports"), {
    refNum, householdID,
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
export async function submitBSWDReport(householdID, form) {
  await addDoc(collection(db, "bswdReports"), {
    householdID,
    type: "homeless_report",
    reporterName: form.name || "Anonymous",
    location: form.location,
    description: form.description,
    photoFileName: form.photo || "",
    status: "received",
    submittedAt: serverTimestamp(),
  });
}

export async function submitBSWDTip(householdID, form) {
  await addDoc(collection(db, "bswdReports"), {
    householdID,
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
export async function submitLivelihoodRegistration(householdID, form, program) {
  const regNum = `LH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "livelihoodRegistrations"), {
    regNum, householdID,
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

export async function getLivelihoodRegistrations(householdID) {
  const q = query(
    collection(db, "livelihoodRegistrations"),
    where("householdID", "==", householdID),
    orderBy("submittedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}