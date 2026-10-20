import { db } from "../firebase/firebase";
import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, limit, getDoc, writeBatch, or
} from "firebase/firestore";
import { generateHouseholdID, sendApprovalEmail } from "./admin";
import { verifyMemberPin } from "./login";

// ══════════════════════════════
// 📄 DOCUMENT REQUESTS
// ══════════════════════════════
export async function submitDocumentRequest(householdID, residentID, userName, docType, form, customData = {}, batch = null) {
  const requestID = `DOC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const ref = doc(collection(db, "document_requests"));
  
  const payload = {
    requestID,
    UID:             form.UID || "",
    householdID,
    residentID, 
    documentID:      docType.id,
    documentType:    docType.documentName || docType.name || docType.title,
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
  };

  if (batch) batch.set(ref, payload);
  else await setDoc(ref, payload);
  
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
export async function submitFacilityReservation(householdID, residentID, userName, facility, form, customData = {}, batch = null) {
  const reservationID = `FAC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const ref = doc(collection(db, "facility_reservations"));

  const payload = {
    reservationID,
    UID:           form.UID || "",
    householdID,
    residentID,
    facilityID:    facility?.id || "", 
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
  };

  if (batch) batch.set(ref, payload);
  else await setDoc(ref, payload);

  return reservationID;
}

// ══════════════════════════════
// 🛠️ EQUIPMENT RENTALS
// ══════════════════════════════
export async function submitEquipmentRental(householdID, residentID, userName, equipment, form, customData = {}, batch = null) {
  const rentalID = `EQU-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const ref = doc(collection(db, "equipment_rentals"));

  const payload = {
    rentalID,
    UID:           form.UID || "",
    householdID,
    residentID, 
    equipmentID:   equipment?.id || "",            
    equipmentName: equipment?.equipmentName || equipment?.name || "Equipment",
    fullName:      form.fullName || userName,
    email:         form.email || "",
    contactNumber: form.contactNumber || "",
    purpose:       form.purpose,
    quantity:      Number(form.quantity), 
    pickUpDate:    form.pickUpDate,
    returnDate:    form.returnDate,
    notes:         form.notes || "",
    status:        "Pending",
    customFields:  customData,
    submittedAt:   serverTimestamp(),
  };

  if (batch) batch.set(ref, payload);
  else await setDoc(ref, payload);

  return rentalID;
}

// ══════════════════════════════
// 🚔 INCIDENT REPORTS
// ══════════════════════════════
export async function submitIncidentReport(householdID, userID, residentID, form, batch = null) {
  const refNum = `PO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const ref = doc(collection(db, "incidentReports"));

  const payload = {
    refNum,
    UID:             form.UID || "",
    householdID,
    userID, 
    residentID,
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
  };

  if (batch) batch.set(ref, payload);
  else await setDoc(ref, payload);

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
export async function submitBSWDReport(householdID, userID, residentID, form, batch = null) {
  const refNum = `BSWD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const ref = doc(collection(db, "bswdReports"));

  const payload = {
    householdID,
    UID:            form.UID || "", 
    userID,
    residentID,
    refNum,
    type:           "homeless_report",
    reporterName:   form.name || "Anonymous",
    location:       form.location,
    description:    form.description,
    photoFileName:  form.photo || "",
    status:         "received",
    submittedAt:    serverTimestamp(),
  };

  if (batch) batch.set(ref, payload);
  else await setDoc(ref, payload);
}

export async function submitBSWDTip(householdID, userID, residentID, form, batch = null) {
  const refNum = `BSWD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const ref = doc(collection(db, "bswdReports"));

  const payload = {
    householdID,
    UID:         form.UID || "", 
    userID,
    residentID,
    refNum,
    type:    "tip",
    about:   form.about,
    tip:     form.tip,
    contact: form.contact || "",
    status:  "received",
    submittedAt: serverTimestamp(),
  };

  if (batch) batch.set(ref, payload);
  else await setDoc(ref, payload);
}

// ══════════════════════════════
// 💼 LIVELIHOOD REGISTRATIONS
// ══════════════════════════════
export async function submitLivelihoodRegistration(householdID, userID, residentID, form, program, batch = null) {
  const regNum = `LH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const ref = doc(collection(db, "livelihoodRegistrations"));

  const payload = {
    regNum,
    UID:             form.UID || "", 
    householdID,
    userID,
    residentID, 
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
  };

  if (batch) batch.set(ref, payload);
  else await setDoc(ref, payload);

  return regNum;
}

// ══════════════════════════════
// 🏠 HOUSEHOLD TRANSFERS
// ══════════════════════════════
export async function submitHouseholdTransfer(currentHouseholdID, residentID, userUID, userName, form) {
  const transferID = `TRF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const isExisting = form.transferType === "existing";
  
  const ref = doc(collection(db, "household_transfers"));
  await setDoc(ref, {
    transferID,
    UID:                userUID || "", 
    residentID,
    requesterName:      userName || "Unknown",
    currentHouseholdID,
    transferType:       form.transferType, 
    targetHouseholdID:  isExisting ? form.targetHouseholdID : "",
    targetBranchID:     isExisting ? (form.targetBranchID || "BR-001") : "",
    newHouseNumber:     form.transferType === "new" ? form.newHouseNumber : "",
    newStreet:          form.transferType === "new" ? form.newStreet : "",
    newEmail:           form.transferType === "new" ? form.newEmail : "",
    reason:             form.reason,
    proofFileName:      form.proofFileName || "",
    proofURL:           form.proofURL || "",
    status:             "Pending",
    headApproval:       isExisting ? "Pending" : "N/A",
    submittedAt:        serverTimestamp(),
  });

  if (isExisting) {
    try {
      const headResidentID = await getHouseholdHeadID(form.targetHouseholdID);
      // Inline notification to avoid circular import issues
      if (headResidentID) {
        await setDoc(doc(collection(db, "user_notifications")), {
          householdID: form.targetHouseholdID.trim(),
          residentID: headResidentID.trim(),
          title: "Transfer Request",
          message: `${userName} requested to join your household (${form.targetBranchID || "BR-001"}).`,
          type: "transfer_approval",
          refNum: transferID,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn("Could not dispatch transfer notification to target head:", err);
    }
  }
  return transferID;
}

export async function processHouseholdTransfer(transferDocID, newStatus, requestData) {
  const transferRef = doc(db, "household_transfers", transferDocID);
  
  const transferSnap = await getDoc(transferRef);
  if (!transferSnap.exists()) {
    throw new Error("Transfer request not found in database.");
  }
  const transferDBData = transferSnap.data();

  if (newStatus === "Approved") {
    const oldResidentRef = doc(db, "households", requestData.currentHouseholdID, "residents", requestData.residentID);
    const residentSnap = await getDoc(oldResidentRef);

    if (!residentSnap.exists()) {
      throw new Error("Resident data not found. They may have already been moved or deleted.");
    }

    const residentData = residentSnap.data();
    const batch = writeBatch(db);

    let finalTargetHouseholdID = requestData.targetHouseholdID;
    let newRole = "Member";
    let newBranch = requestData.targetBranchID || "BR-001";

    // ── CREATE NEW HOUSEHOLD LOGIC ──
    if (transferDBData.transferType === "new") {
      finalTargetHouseholdID = await generateHouseholdID();
      const newHhRef = doc(db, "households", finalTargetHouseholdID);
      
      batch.set(newHhRef, {
        householdID: finalTargetHouseholdID,
        houseNumber: transferDBData.newHouseNumber || "",
        street: transferDBData.newStreet || "",
        barangay: "Malanday",
        city: "Valenzuela City",
        province: "",
        region: "NCR",
        email: (transferDBData.newEmail || "").trim().toLowerCase(),
        totalMembers: 1,
        householdClassification: "",
        activated: false,
        activatedAt: null,
        createdAt: serverTimestamp(),
        branchingData: {
          isBranching: true,
          oldHouseholdID: requestData.currentHouseholdID,
          residentID: requestData.residentID
        }
      });
      
    } else {
      // ── MIGRATION LOGIC (Existing Household ONLY) ──
      const newResidentRef = doc(db, "households", finalTargetHouseholdID, "residents", requestData.residentID);

      if (oldResidentRef.path === newResidentRef.path) {
        batch.update(newResidentRef, {
          branchID: newBranch,
          role: newRole,
          updatedAt: serverTimestamp()
        });
      } else {
        batch.set(newResidentRef, {
          ...residentData,
          householdID: finalTargetHouseholdID,
          branchID: newBranch,
          role: newRole,
          updatedAt: serverTimestamp()
        });
        batch.delete(oldResidentRef);
      }
    }

    batch.update(transferRef, {
      status: newStatus,
      targetHouseholdID: finalTargetHouseholdID, 
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    if (transferDBData.transferType === "new" && transferDBData.newEmail) {
      sendApprovalEmail(finalTargetHouseholdID, transferDBData.requesterName, transferDBData.newEmail).catch(err =>
        console.warn("[Email Trigger] Failed:", err)
      );
    }
  } else {
    await updateDoc(transferRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
  }
}

export async function fetchHouseholdBranchesForTransfer(householdID) {
  if (!householdID) return { exists: false, branches: [] };
  
  const hhRef = doc(db, "households", householdID);
  const hhSnap = await getDoc(hhRef);
  
  if (!hhSnap.exists()) {
    return { exists: false, branches: [] };
  }

  const branchesRef = collection(db, "households", householdID, "branches");
  const branchesSnap = await getDocs(branchesRef);
  
  if (branchesSnap.empty) {
    return { exists: true, branches: [{ id: "BR-001", name: "BR-001 (Main)" }] };
  }

  const branches = branchesSnap.docs.map(d => ({
    id: d.id,
    name: `${d.id} ${d.data().branchName ? `(${d.data().branchName})` : ""}`.trim()
  }));

  if (!branches.some(b => b.id === "BR-001")) {
     branches.unshift({ id: "BR-001", name: "BR-001 (Main)" });
  }

  return { exists: true, branches };
}

// ══════════════════════════════
// 👑 HEAD ROLE TRANSFERS
// ══════════════════════════════
export async function getHouseholdResidents(householdID) {
  if (!householdID) return [];
  const residentsRef = collection(db, "households", householdID, "residents");
  const snap = await getDocs(residentsRef);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function transferHouseholdHeadRole(householdID, currentHeadID, newHeadID) {
  const batch = writeBatch(db);
  batch.update(doc(db, "households", householdID, "residents", currentHeadID), { role: "Member", updatedAt: serverTimestamp() });
  batch.update(doc(db, "households", householdID, "residents", newHeadID), { role: "Household Head", updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function transferBranchHeadRole(householdID, currentHeadID, newHeadID) {
  const batch = writeBatch(db);
  batch.update(doc(db, "households", householdID, "residents", currentHeadID), { role: "Member", updatedAt: serverTimestamp() });
  batch.update(doc(db, "households", householdID, "residents", newHeadID), { role: "Branch Head", updatedAt: serverTimestamp() });
  await batch.commit();
}

// ══════════════════════════════
// 🔒 PIN VERIFICATION & REMOVAL
// ══════════════════════════════
export async function verifyResidentPIN(householdID, residentID, inputPin) {
  if (!inputPin) throw new Error("Please enter your PIN.");
  const result = await verifyMemberPin(householdID, residentID, inputPin);
  if (!result.ok) {
    if (result.code === "NO_PIN") throw new Error("No PIN is set on your profile. Please set up a PIN in your settings first.");
    throw new Error(result.message || "Incorrect PIN. Please try again.");
  }
  return true;
}

export async function removeHouseholdMember(householdID, targetResidentID, targetPin) {
  await verifyResidentPIN(householdID, targetResidentID, targetPin);
  await deleteDoc(doc(db, "households", householdID, "residents", targetResidentID));
  return true;
}

export async function getHouseholdHeadID(householdID) {
  const q = query(collection(db, "households", householdID, "residents"), where("role", "in", ["Household Head", "head"]));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

export async function getTransferRequestDetails(transferID) {
  const q = query(collection(db, "household_transfers"), where("transferID", "==", transferID), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function respondToTransferConsent(transferDocID, headDecision) {
  await updateDoc(doc(db, "household_transfers", transferDocID), {
    headApproval: headDecision,
    headRespondedAt: serverTimestamp(),
  });
}

// ══════════════════════════════
// 📋 USER TRANSACTION HISTORY
// ══════════════════════════════
export async function fetchUserTransactions(householdID, residentID, userID, role = "Member", userUID = null) {
  if (!residentID && !userUID && !householdID) return [];

  // ─── OPTIMIZED: Native OR() Queries ───
  // Reduces network requests from 24 -> 8 by doing all multi-variable matching in 1 pass per collection
  const fetchCollection = async (collectionName, mapper, limitCount = 50) => {
    try {
      const conditions = [];
      if (householdID && residentID) conditions.push(where("residentID", "==", residentID));
      else if (householdID) conditions.push(where("householdID", "==", householdID));
      else if (residentID) conditions.push(where("residentID", "==", residentID));

      if (userUID) conditions.push(where("UID", "==", userUID));

      // Build native query
      const q = conditions.length > 1 
        ? query(collection(db, collectionName), or(...conditions), limit(limitCount))
        : query(collection(db, collectionName), conditions[0], limit(limitCount));

      const snap = await getDocs(q);
      const results = snap.docs.map(d => mapper({ id: d.id, data: () => d.data() }));

      return results.sort((a, b) => {
        const ta = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
        const tb = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
        return tb - ta;
      });
    } catch (err) {
      console.warn(`[${collectionName}] query error:`, err);
      return [];
    }
  };

  const docs = await fetchCollection("document_requests", d => ({
    id: d.id,
    category: "Document",
    serviceName: d.data().documentType || "Document Request",
    refNum: d.data().requestID || d.data().refNum || "",
    status: d.data().status || "Pending",
    date: d.data().submittedAt,
    ...d.data(),
  }));

  const facs = await fetchCollection("facility_reservations", d => ({
    id: d.id,
    category: "Facility",
    serviceName: d.data().facilityName || "Facility Reservation",
    refNum: d.data().reservationID || d.data().refNum || "",
    status: d.data().status || "Pending",
    date: d.data().submittedAt || d.data().date,
    ...d.data(),
  }));

  const eqs = await fetchCollection("equipment_rentals", d => {
    const rawData = d.data();
    let effectiveStatus = rawData.status || "Pending";
    if (!['Returned', 'Unreturned', 'Rejected'].includes(effectiveStatus) && effectiveStatus === "Claimed" && rawData.returnDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(rawData.returnDate + "T00:00:00") < today) effectiveStatus = "Overdue";
    }
    return {
      id: d.id,
      category: "Equipment",
      serviceName: rawData.equipmentName || "Equipment Rental",
      refNum: rawData.rentalID || rawData.refNum || "",
      status: effectiveStatus,
      firestoreStatus: rawData.status,
      date: rawData.submittedAt,
      ...rawData,
    };
  });

  const fbs = await fetchCollection("feedback", d => ({
    id: d.id,
    category: d.data().category || "Feedback",
    serviceName: d.data().facilityName || "Feedback",
    refNum: d.data().referenceID || d.data().refNum || "",
    status: d.data().status || "Submitted",
    date: d.data().createdAt || d.data().submittedAt,
    ...d.data(),
  }));

  const pos = await fetchCollection("incidentReports", d => ({
    id: d.id,
    category: "Peace & Order",
    serviceName: d.data().incidentType || "Incident Report",
    refNum: d.data().refNum || "",
    status: d.data().status || "Submitted",
    date: d.data().submittedAt || d.data().date,
    ...d.data(),
  }));

  const bswds = await fetchCollection("bswdReports", d => ({
    id: d.id,
    category: "BSWD",
    serviceName: d.data().type === "tip" ? "Anonymous Tip" : "BSWD Report",
    refNum: d.data().refNum || "",
    status: d.data().status || "Submitted",
    date: d.data().submittedAt,
    ...d.data(),
  }));

  const progs = await fetchCollection("programRegistrations", d => ({
    id: d.id,
    category: "Program",
    serviceName: d.data().programName || "Barangay Program",
    refNum: d.data().regNum || d.data().refNum || "",
    status: d.data().status || "Registered",
    date: d.data().programDate || d.data().submittedAt,
    ...d.data(),
  }));

  const lhs = await fetchCollection("livelihoodRegistrations", d => ({
    id: d.id,
    category: "Livelihood",
    serviceName: d.data().programName || "Registration",
    refNum: d.data().regNum || d.data().refNum || "",
    status: d.data().status || "Submitted",
    date: d.data().submittedAt,
    ...d.data(),
  }));

  const all = [...docs, ...facs, ...eqs, ...fbs, ...pos, ...bswds, ...progs, ...lhs];
  return all.sort((a, b) => {
    const ta = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
    const tb = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
    return tb - ta;
  });
}