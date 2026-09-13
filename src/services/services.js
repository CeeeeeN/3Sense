import { db } from "../firebase/firebase";
import {
  collection, addDoc, getDocs,
  query, where, orderBy, serverTimestamp, limit, or,
  getDoc, doc, writeBatch, updateDoc, deleteDoc
} from "firebase/firestore";
import { generateHouseholdID, sendApprovalEmail } from "./admin";

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
    UID:             form.UID || "",                             // <-- INJECTED UID
    householdID,
    residentID,                                                  // Firestore doc ID of the resident
    documentID:      docType.id,                                 // renamed from documentId
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
    UID:           form.UID || "",                                 // <-- INJECTED UID
    householdID,
    residentID,                                                    // Firestore doc ID of the resident
    facilityID:    facility?.id || "",                             // renamed from facilityId
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
    UID:           form.UID || "",                                 // <-- INJECTED UID
    householdID,
    residentID,                                                    // Firestore doc ID of the resident
    equipmentID:   equipment?.id || "",            
    equipmentName: equipment?.equipmentName || equipment?.name || "Equipment",
    fullName:      form.fullName || userName,
    email:         form.email || "",
    contactNumber: form.contactNumber || "",
    purpose:       form.purpose,
    quantity:      Number(form.quantity),                          // Ensures quantity is saved as a number
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
    UID:            form.UID || "",                                // <-- INJECTED UID
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
    UID:            form.UID || "",                                // <-- INJECTED UID
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
    UID:         form.UID || "",                                   // <-- INJECTED UID
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
    UID:             form.UID || "",                               // <-- INJECTED UID
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
// 🏠 HOUSEHOLD TRANSFERS
// ══════════════════════════════
export async function submitHouseholdTransfer(currentHouseholdID, residentID, userUID, userName, form) {
  const transferID = `TRF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  
  const isExisting = form.transferType === "existing";

  await addDoc(collection(db, "household_transfers"), {
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
    newEmail:           form.transferType === "new" ? form.newEmail : "", // <-- NEW FIELD
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
      if (headResidentID) {
        await createUserNotification(
          form.targetHouseholdID, 
          headResidentID, 
          "Transfer Request", 
          `${userName} requested to join your household (${form.targetBranchID || "BR-001"}).`, 
          "transfer_approval", 
          transferID
        );
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
      
      // Initialize the unactivated household container using DB data
      batch.set(newHhRef, {
        householdID: finalTargetHouseholdID,
        houseNumber: transferDBData.newHouseNumber || "",
        street: transferDBData.newStreet || "",
        barangay: "Malanday",
        city: "Valenzuela City",
        province: "",
        region: "NCR",
        email: (transferDBData.newEmail || "").trim().toLowerCase(), // Secured from DB
        totalMembers: 1,
        householdClassification: "",
        activated: false,
        activatedAt: null,
        createdAt: serverTimestamp(),
        
        // Breadcrumbs for activation.js
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
      console.log(`[Email Trigger] Dispatching approval to: ${transferDBData.newEmail}`);
      try {
        await sendApprovalEmail(finalTargetHouseholdID, transferDBData.requesterName, transferDBData.newEmail);
        console.log("[Email Trigger] Successfully sent.");
      } catch(err) {
        console.warn("[Email Trigger] Failed:", err);
      }
    }

  } else {
    await updateDoc(transferRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
  }
}

/**
 * Verifies if a Target Household exists and fetches its valid branches.
 * @param {string} householdID
 */
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

  const branches = branchesSnap.docs.map(doc => ({
    id: doc.id,
    name: `${doc.id} ${doc.data().branchName ? `(${doc.data().branchName})` : ""}`.trim()
  }));

  // Ensure BR-001 is always an option
  if (!branches.some(b => b.id === "BR-001")) {
     branches.unshift({ id: "BR-001", name: "BR-001 (Main)" });
  }

  return { exists: true, branches };
}


// ══════════════════════════════
// 👑 HOUSEHOLD HEAD TRANSFER
// ══════════════════════════════
/**
 * Fetches all residents in a specific household to populate the transfer dropdown.
 */
export async function getHouseholdResidents(householdID) {
  if (!householdID) return [];
  const residentsRef = collection(db, "households", householdID, "residents");
  const snap = await getDocs(residentsRef);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Swaps the Household Head role between the current head and a target member.
 */
export async function transferHouseholdHeadRole(householdID, currentHeadID, newHeadID) {
  if (!householdID || !currentHeadID || !newHeadID) {
    throw new Error("Missing required parameters to transfer the head role.");
  }

  const currentHeadRef = doc(db, "households", householdID, "residents", currentHeadID);
  const newHeadRef = doc(db, "households", householdID, "residents", newHeadID);

  const batch = writeBatch(db);

  // Demote current head to Member
  batch.update(currentHeadRef, {
    role: "Member",
    updatedAt: serverTimestamp()
  });

  // Promote new head
  batch.update(newHeadRef, {
    role: "Household Head",
    updatedAt: serverTimestamp()
  });

  await batch.commit();
}

/**
 * Swaps the Branch Head role between the current branch head and a target member.
 */
export async function transferBranchHeadRole(householdID, currentHeadID, newHeadID) {
  if (!householdID || !currentHeadID || !newHeadID) {
    throw new Error("Missing required parameters to transfer the branch head role.");
  }

  const currentHeadRef = doc(db, "households", householdID, "residents", currentHeadID);
  const newHeadRef = doc(db, "households", householdID, "residents", newHeadID);

  const batch = writeBatch(db);

  // Demote current branch head to Member
  batch.update(currentHeadRef, {
    role: "Member",
    updatedAt: serverTimestamp()
  });

  // Promote new branch head
  batch.update(newHeadRef, {
    role: "Branch Head",
    updatedAt: serverTimestamp()
  });

  await batch.commit();
}

// ══════════════════════════════
// 🔒 PIN VERIFICATION
// ══════════════════════════════
const hashPin = async (pin) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

export async function verifyResidentPIN(householdID, residentID, inputPin) {
  if (!inputPin) throw new Error("Please enter your PIN.");
  
  const residentRef = doc(db, "households", householdID, "residents", residentID);
  const snap = await getDoc(residentRef);
  
  if (!snap.exists()) {
    throw new Error("Resident profile not found.");
  }
  
  const data = snap.data();
  const savedPinHash = data.pinHash; 
  
  if (!savedPinHash) {
    throw new Error("No PIN is set on your profile. Please set up a PIN in your settings first.");
  }

  // Hash the user's input using your exact SHA-256 logic
  const hashedInput = await hashPin(inputPin);

  // Compare the hashes
  if (savedPinHash !== hashedInput) {
    throw new Error("Incorrect PIN. Please try again.");
  }
  
  return true;
}


/**
 * Removes a member from the household after verifying their personal PIN.
 */
export async function removeHouseholdMember(householdID, targetResidentID, targetPin) {
  if (!householdID || !targetResidentID || !targetPin) {
    throw new Error("Missing required information to remove member.");
  }

  // 1. Verify the TARGET member's PIN using your existing function
  await verifyResidentPIN(householdID, targetResidentID, targetPin);

  // 2. If verification passes, delete the member document
  const residentRef = doc(db, "households", householdID, "residents", targetResidentID);
  await deleteDoc(residentRef);
  
  return true;
}


// ══════════════════════════════
// 🏠 HOUSEHOLD TRANSFER NOTIFICATIONS & APPROVAL
// ══════════════════════════════

import { createUserNotification } from "./userNotifications"; // <-- Make sure to import this at the top!

/**
 * Finds the head resident ID for a given household to dispatch targeted alerts.
 */
export async function getHouseholdHeadID(householdID) {
  const residentsRef = collection(db, "households", householdID, "residents");
  const q = query(residentsRef, where("role", "in", ["Household Head", "head"]));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].id;
  }
  return null;
}

/**
 * Fetches transfer request details for the consent modal.
 */
export async function getTransferRequestDetails(transferID) {
  const q = query(collection(db, "household_transfers"), where("transferID", "==", transferID), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Household/Branch Head approves or rejects the incoming member.
 */
export async function respondToTransferConsent(transferDocID, headDecision) {
  const transferRef = doc(db, "household_transfers", transferDocID);
  await updateDoc(transferRef, {
    headApproval: headDecision, // "Approved" or "Rejected"
    headRespondedAt: serverTimestamp(),
  });
}



// ══════════════════════════════
// 📋 USER TRANSACTION HISTORY
// ══════════════════════════════
export async function fetchUserTransactions(householdID, residentID, userID, role = "Member", userUID = null) {
  if (!residentID && !userUID && !householdID) return [];

  const fetchCollection = async (collectionName, mapper, limitCount = 50) => {
    const docMap = new Map();
    const queries = [];

    if (householdID && residentID) {
      queries.push(query(
        collection(db, collectionName),
        where("householdID", "==", householdID),
        where("residentID", "==", residentID),
        limit(limitCount)
      ));
    } else if (householdID) {
      queries.push(query(collection(db, collectionName), where("householdID", "==", householdID), limit(limitCount)));
    } else if (residentID) {
      queries.push(query(collection(db, collectionName), where("residentID", "==", residentID), limit(limitCount)));
    }

    if (userUID) {
      queries.push(query(collection(db, collectionName), where("UID", "==", userUID), limit(limitCount)));
    }

    for (const q of queries) {
      try {
        const snap = await getDocs(q);
        snap.forEach(d => {
          if (!docMap.has(d.id)) {
            docMap.set(d.id, d.data());
          }
        });
      } catch (err) {
        console.warn(`[${collectionName}] query error:`, err);
      }
    }

    const results = Array.from(docMap.entries()).map(([id, data]) => mapper({ id, data: () => data }));

    results.sort((a, b) => {
      const ta = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
      const tb = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
      return tb - ta;
    });

    return results.slice(0, limitCount);
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
    const rawStatus = rawData.status || "Pending";
    let effectiveStatus = rawStatus;
    const alreadyResolved = ['Returned', 'Unreturned', 'Rejected'].includes(rawStatus);
    if (!alreadyResolved && rawStatus === "Claimed" && rawData.returnDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const returnDate = new Date(rawData.returnDate + "T00:00:00");
      if (returnDate < today) {
        effectiveStatus = "Overdue";
      }
    }

    return {
      id: d.id,
      category: "Equipment",
      serviceName: rawData.equipmentName || "Equipment Rental",
      refNum: rawData.rentalID || rawData.refNum || "",
      status: effectiveStatus,
      firestoreStatus: rawStatus,
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

  // Merge all arrays and sort by date descending
  const all = [...docs, ...facs, ...eqs, ...fbs, ...pos, ...bswds, ...progs, ...lhs];
  all.sort((a, b) => {
    const ta = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
    const tb = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
    return tb - ta;
  });

  return all;
}