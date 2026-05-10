import { db } from "../firebase/firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";

// Static services defined in the app that don't have dedicated collections
const VALID_STATIC_SERVICES = [
  "peace and order",
  "livelihood",
  "bswd",
  "badac",
  "vawc",
  "bosca"
];

/**
 * Validates the scanned QR data against Firestore (when applicable) and logs the scan event.
 * @param {string} qrUrl
 * @param {string} residentID 
 * @param {string} householdID 
 * @param {string} userID 
 */
export async function processQRScan({ qrUrl, residentID, householdID, userID }) {
  if (!qrUrl) throw new Error("No QR code data provided.");
  if (!residentID || !householdID || !userID) throw new Error("Missing user authentication context.");

  let parsedUrl;
  try {
    parsedUrl = new URL(qrUrl);
  } catch (error) {
    throw new Error("Invalid QR code format. Not a recognizable URL.");
  }

  const serviceId = parsedUrl.searchParams.get("serviceId");
  const serviceName = parsedUrl.searchParams.get("serviceName");
  const category = parsedUrl.searchParams.get("category");

  if (!serviceId || !category) {
    throw new Error("Invalid QR code: Missing required identifying parameters.");
  }

  let isValid = false;
  let validationName = serviceName || "Unknown Service";

  // Strict Server-Side Validation based on the category
  try {
    if (category === "Services") {
      if (VALID_STATIC_SERVICES.includes(serviceId.toLowerCase())) {
        isValid = true;
      }
    } else if (category === "Programs") {
      const docRef = doc(db, "Programs", serviceId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        isValid = true;
        validationName = docSnap.data().title || validationName;
      }
    } else if (category === "Facilities") {
      if (serviceId === "facilities_global") {
        isValid = true;
      } else {
        const docRef = doc(db, "facilities", serviceId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          isValid = true;
          validationName = docSnap.data().name || docSnap.data().title || validationName;
        }
      }
    } else if (category === "Documents") {
      if (serviceId === "documents_global") {
        isValid = true;
      } else {
        const docRef = doc(db, "documents", serviceId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          isValid = true;
          validationName = docSnap.data().title || validationName;
        }
      }
    }

    if (!isValid) {
      throw new Error("Scanned item does not exist or matches no active records.");
    }
  } catch (error) {
    console.error("QR Validation Error:", error);
    throw new Error("Validation failed. Please try again or assure internet connection.");
  }

  // Construct Data Payload (snake_case collection / camelCase fields)
  const scanData = {
    userID,        // Auth UID
    residentID,    // Member Doc ID
    householdID,
    scanDate: serverTimestamp(),
    category,
    serviceName: validationName,
  };

  // Map to the requested dynamic field naming
  if (category === "Services") {
    scanData.serviceID = serviceId;
  } else if (category === "Programs") {
    scanData.programID = serviceId;
  } else if (category === "Facilities") {
    scanData.facilityID = serviceId;
  } else if (category === "Documents") {
    scanData.documentID = serviceId;
  } else {
    scanData.serviceID = serviceId;
  }

  // Add to firestore
  try {
    await addDoc(collection(db, "qr_scans"), scanData);
  } catch (err) {
    console.error("Failed to log scan record:", err);

    throw new Error("Failed to record scan activity.");
  }

  return {
    isValid: true,
    data: scanData,
  };
}
