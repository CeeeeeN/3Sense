import { db } from "../firebase/firebase";
import {
  collection, addDoc, getDocs,
  query, where, orderBy, serverTimestamp, limit
} from "firebase/firestore";

// ══════════════════════════════
// 📄 DOCUMENT REQUESTS
// ══════════════════════════════
/**
 * @param {string} householdID
 * @param {string} residentID  - Firestore doc ID of the resident (was userID/activeUserId)
 * @param {string} userName
 * @param {object} docType
 * @param {object} form
 * @param {object} customData
 */
export async function submitDocumentRequest(householdID, residentID, userName, docType, form, customData = {}) {
  const requestID = `DOC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "document_requests"), {
    requestID,
    householdID,
    residentID,                                   // Firestore doc ID of the resident
    documentID:      docType.id,                   // renamed from documentId
    documentType:    docType.documentName || docType.name || docType.title, // display name
    fee:             docType.fee || "Free",
    processingDays:  docType.days || docType.processingTime || "",
    firstName:       form.firstName,
    middleName:      form.middleName || "",
    lastName:        form.lastName,
    fullName:        `${form.firstName} ${form.middleName || ""} ${form.lastName}`.trim(),
    dateOfBirth:     form.dob,
    civilStatus:     form.civilStatus,
    address:         form.address,
    contact:         form.contact,
    email:           form.email || "",
    residingSince:   form.residingSince,
    purpose:         form.purpose,
    validIdFileName: form.validId || "",
    validIdUrl:      form.validIdUrl || "",
    status:          "Pending",
    customFields:    customData,
    submittedAt:     serverTimestamp(),
  });
  return requestID;
}

export async function getDocumentRequests(householdID) {
  const q = query(
    collection(db, "document_requests"),
    where("householdID", "==", householdID),
    orderBy("submittedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ══════════════════════════════
// 🏢 FACILITY RESERVATIONS
// ══════════════════════════════
/**
 * @param {string} householdID
 * @param {string} residentID  - Firestore doc ID of the resident
 * @param {string} userName
 * @param {object} facility
 * @param {object} form
 * @param {object} customData
 */
export async function submitFacilityReservation(householdID, residentID, userName, facility, form, customData = {}) {
  const reservationID = `FAC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "facility_reservations"), {
    reservationID,
    householdID,
    residentID,                                    // Firestore doc ID of the resident
    facilityID:    facility?.id || "",             // renamed from facilityId
    facilityName:  facility?.facilityName || facility?.name || facility?.title || "Barangay Multi-Purpose Hall",
    fullName:      form.fullName || userName,
    email:         form.email || "",
    contactNumber: form.contactNumber || "",
    purpose:       form.purpose,
    date:          form.date,
    startTime:     form.startTime,
    endTime:       form.endTime,
    attendees:     form.attendees || "",
    notes:         form.notes || "",
    status:        "Pending",
    customFields:  customData,
    submittedAt:   serverTimestamp(),
  });
  return reservationID;
}

// ══════════════════════════════
// 🛠️ EQUIPMENT RENTALS
// ══════════════════════════════
/**
 * @param {string} householdID
 * @param {string} residentID  - Firestore doc ID of the resident
 * @param {string} userName
 * @param {object} equipment
 * @param {object} form
 * @param {object} customData
 */
export async function submitEquipmentRental(householdID, residentID, userName, equipment, form, customData = {}) {
  const rentalID = `EQU-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "equipment_rentals"), {
    rentalID,
    householdID,
    residentID,                                    // Firestore doc ID of the resident
    equipmentID:   equipment?.id || "",            
    equipmentName: equipment?.equipmentName || equipment?.name || "Equipment",
    fullName:      form.fullName || userName,
    email:         form.email || "",
    contactNumber: form.contactNumber || "",
    purpose:       form.purpose,
    quantity:      Number(form.quantity),          // Ensures quantity is saved as a number
    pickUpDate:    form.pickUpDate,
    returnDate:    form.returnDate,
    notes:         form.notes || "",
    status:        "Pending",
    customFields:  customData,
    submittedAt:   serverTimestamp(),
  });
  return rentalID;
}


// ══════════════════════════════
// 🚔 INCIDENT REPORTS
// ══════════════════════════════
/**
 * @param {string} householdID
 * @param {string} userID      - Firebase Auth UID
 * @param {string} residentID  - Firestore doc ID
 * @param {object} form
 */
export async function submitIncidentReport(householdID, userID, residentID, form) {
  const refNum = `PO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "incidentReports"), {
    refNum,
    householdID,
    userID,       // Firebase Auth UID
    residentID,   // Firestore doc ID
    isAnonymous:    form.isAnonymous,
    reporterName:   form.isAnonymous ? "Anonymous" : form.reporterName || "",
    contact:        form.isAnonymous ? "" : form.contact || "",
    reporterAddress: form.isAnonymous ? "" : form.reporterAddress || "",
    incidentType:   form.incidentType,
    location:       form.location,
    date:           form.date,
    time:           form.time,
    description:    form.description,
    urgency:        form.urgency,
    photoFileName:  form.photoFile ? form.photoFile.name : "",
    photoURL:       form.photoURL || "",
    status:         "received",
    updates:        [`${form.date} – Report received`],
    submittedAt:    serverTimestamp(),
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
export async function submitBSWDReport(householdID, userID, residentID, form) {
  const refNum = `BSWD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "bswdReports"), {
    householdID,
    userID,      // Firebase Auth UID
    residentID,  // Firestore doc ID
    refNum,
    type:           "homeless_report",
    reporterName:   form.name || "Anonymous",
    location:       form.location,
    description:    form.description,
    photoFileName:  form.photo || "",
    status:         "received",
    submittedAt:    serverTimestamp(),
  });
}

export async function submitBSWDTip(householdID, userID, residentID, form) {
  const refNum = `BSWD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "bswdReports"), {
    householdID,
    userID,      // Firebase Auth UID
    residentID,  // Firestore doc ID
    refNum,
    type:    "tip",
    about:   form.about,
    tip:     form.tip,
    contact: form.contact || "",
    status:  "received",
    submittedAt: serverTimestamp(),
  });
}

// ══════════════════════════════
// 💼 LIVELIHOOD REGISTRATIONS
// ══════════════════════════════
export async function submitLivelihoodRegistration(householdID, userID, residentID, form, program) {
  const regNum = `LH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  await addDoc(collection(db, "livelihoodRegistrations"), {
    regNum,
    householdID,
    userID,      // Firebase Auth UID
    residentID,  // Firestore doc ID
    fullName:        `${form.firstName} ${form.middleName || ""} ${form.lastName}`.trim(),
    firstName:       form.firstName,
    middleName:      form.middleName || "",
    lastName:        form.lastName,
    address:         form.address,
    contact:         form.contact,
    email:           form.email || "",
    idFileName:      form.idFile || "",
    programId:       program.id,
    programName:     program.name,
    programDate:     program.date,
    programTime:     program.time,
    programLocation: program.location,
    status:          "pending",
    submittedAt:     serverTimestamp(),
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

// ══════════════════════════════
// 📋 USER TRANSACTION HISTORY
// ══════════════════════════════
export async function fetchUserTransactions(householdID, residentID, userID, role = "Member") {
  if (!householdID) return [];

  const isMyRecord = (item) => {
    const rId = item.residentID || "";
    const uId = item.userID || "";
    if (rId === residentID || uId === residentID || rId === userID || uId === userID) return true;
    return false;
  };

  const fetchWithFallback = async (collectionName, dateField, mapper, limitCount = 50) => {
    try {
      const q = query(
        collection(db, collectionName), 
        where("householdID", "==", householdID),
        orderBy(dateField, "desc"),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(mapper).filter(isMyRecord);
    } catch (err) {
      console.warn(`[${collectionName}] Index missing. Falling back to unindexed query.`, err);
      const fallbackQ = query(
        collection(db, collectionName), 
        where("householdID", "==", householdID)
      );
      const fallbackSnap = await getDocs(fallbackQ);
      return fallbackSnap.docs.map(mapper).filter(isMyRecord);
    }
  };

  const docs = await fetchWithFallback("document_requests", "submittedAt", d => ({
    id: d.id,
    category: "Document",
    serviceName: d.data().documentType || "Document Request",
    refNum: d.data().requestID || d.data().refNum || "",
    status: d.data().status || "Pending",
    date: d.data().submittedAt,
    ...d.data(),
  }));

  const facs = await fetchWithFallback("facility_reservations", "submittedAt", d => ({
    id: d.id,
    category: "Facility",
    serviceName: d.data().facilityName || "Facility Reservation",
    refNum: d.data().reservationID || d.data().refNum || "",
    status: d.data().status || "Pending",
    date: d.data().submittedAt,
    ...d.data(),
  }));

  const eqs = await fetchWithFallback("equipment_rentals", "submittedAt", d => ({
    id: d.id,
    category: "Equipment",
    serviceName: d.data().equipmentName || "Equipment Rental",
    refNum: d.data().rentalID || d.data().refNum || "",
    status: d.data().status || "Pending",
    date: d.data().submittedAt,
    ...d.data(),
  }));

  const fbs = await fetchWithFallback("feedback", "createdAt", d => ({
    id: d.id,
    category: d.data().category || "Feedback",
    serviceName: d.data().facilityName || "Feedback",
    refNum: d.data().referenceID || d.data().refNum || "",
    status: d.data().status || "Submitted",
    date: d.data().createdAt,
    ...d.data(),
  }));

  const pos = await fetchWithFallback("incidentReports", "submittedAt", d => ({
    id: d.id,
    category: "Peace & Order",
    serviceName: d.data().incidentType || "Incident Report",
    refNum: d.data().refNum || "",
    status: d.data().status || "Submitted",
    date: d.data().submittedAt,
    ...d.data(),
  }));

  const bswds = await fetchWithFallback("bswdReports", "submittedAt", d => ({
    id: d.id,
    category: "BSWD",
    serviceName: d.data().type === "tip" ? "Anonymous Tip" : "BSWD Report",
    refNum: d.data().refNum || "",
    status: d.data().status || "Submitted",
    date: d.data().submittedAt,
    ...d.data(),
  }));

  const lhs = await fetchWithFallback("livelihoodRegistrations", "submittedAt", d => ({
    id: d.id,
    category: "Livelihood",
    serviceName: d.data().programName || "Registration",
    refNum: d.data().regNum || d.data().refNum || "",
    status: d.data().status || "Submitted",
    date: d.data().submittedAt,
    ...d.data(),
  }));

  // Merge all arrays and sort by date descending
  const all = [...docs, ...facs, ...eqs, ...fbs, ...pos, ...bswds, ...lhs];
  all.sort((a, b) => {
    const ta = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
    const tb = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
    return tb - ta;
  });

  return all;
}