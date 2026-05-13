import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export const generateHouseholdID = async () => {
  const snapshot = await getDocs(collection(db, "households"));
  let maxCount = 0;

  snapshot.forEach(doc => {
    const parts = doc.id.split('-');
    // Expected format: MAL-YYYY-NNNNN
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxCount) {
        maxCount = num;
      }
    }
  });

  const count = maxCount + 1;
  const year = new Date().getFullYear();
  const padded = String(count).padStart(5, "0");
  return `MAL-${year}-${padded}`;
};

export const approveRegistration = async (docID) => {
  const pendingRef = doc(db, "pending_registrations", docID);
  const snapshot = await getDoc(pendingRef);

  // Idempotency guard: bail out if the record was already processed
  if (!snapshot.exists()) {
    throw new Error("Registration not found or already processed.");
  }

  const data = snapshot.data();

  // Extra guard: if the record was somehow already marked approved, stop here
  if (data.status === "approved") {
    throw new Error("This registration has already been approved.");
  }
  const householdID = await generateHouseholdID();
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();

  const householdRef = doc(db, "households", householdID);
  await setDoc(householdRef, {
    householdID,
    email: data.email || "",

    houseNumber: data.houseNumber || "",
    street: data.street || "",
    barangay: data.barangay || "",
    city: data.city || "",
    province: data.province || "",
    region: data.region || "",
    totalMembers: data.totalMembers ?? null,
    householdClassification: data.householdClassification || "",
    createdAt: serverTimestamp(),
    activated: false,
    activatedAt: null,

    _pendingHeadData: {
      firstName: data.firstName || "",
      middleName: data.middleName || "",
      lastName: data.lastName || "",
      suffix: data.suffix || "",
      birthDate: data.birthDate || "",
      age: data.age ?? null,
      birthPlace: data.birthPlace || "",
      sex: data.sex || "",
      genderOrientation: data.genderOrientation || "",
      civilStatus: data.civilStatus || "",
      religion: data.religion || "",
      citizenship: data.citizenship || "",
      contactNumber: data.contactNumber ?? null,
      email: data.email || "",
      residingSinceYear: data.residingSinceYear ? Number(data.residingSinceYear) : null,
      categories: data.categories || [],
      pwdStatus: data.pwdStatus || "",
      disabilityType: data.disabilityType || "",
      educationAttainment: data.educationAttainment || "",
      educationStatus: data.educationStatus || "",
      occupation: data.occupation || "",
      employmentStatus: data.employmentStatus || "",
      
      // SENSE-52: Cascade image URLs to the household record
      idImageUrl: data.idImageUrl || "",
      selfieImageUrl: data.selfieImageUrl || "",
    },
  });

  // Email is fire-and-forget — a failure must NOT block the approval
  sendApprovalEmail(householdID, fullName, data.email).catch(err =>
    console.warn("Approval email failed (non-blocking):", err)
  );
  await deleteDoc(pendingRef);

  return { householdID, registrationID: docID, email: data.email, name: fullName };
};

const sendApprovalEmail = async (householdID, name, toEmail) => {
  try {
    const response = await fetch("/api/resend-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Barangay 3S+ Malanday <noreply@3s-sense.site>",
        to: [toEmail],
        subject: "Your Barangay 3S+ Registration Has Been Approved",
        html: buildApprovalEmail(householdID, name),
      }),
    });

    if (!response.ok) {
      let errMsg = response.statusText;
      try {
        const errBody = await response.json();
        errMsg = errBody.message || errMsg;
      } catch (_) { /* empty or non-JSON body — ignore */ }
      throw new Error(`Failed to send email: ${errMsg}`);
    }
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

const buildApprovalEmail = (householdID, name) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d7a55,#317D89);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Barangay 3S+ Malanday</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Community Management System</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#1a2e2a;font-size:16px;font-weight:600;">Hello, ${name}!</p>
              <p style="margin:0 0 20px;color:#4a5e5a;font-size:14px;line-height:1.7;">
                Your household registration with <strong>Barangay 3S+ Malanday</strong>
                has been <strong style="color:#0d7a55;">approved</strong>.
              </p>
              <p style="margin:0 0 12px;color:#4a5e5a;font-size:14px;">Your assigned <strong>Household ID</strong> is:</p>
              <div style="background:#f0faf6;border:2px dashed #0d7a55;border-radius:10px;padding:20px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 4px;font-size:12px;color:#4a5e5a;text-transform:uppercase;letter-spacing:1px;">Household ID</p>
                <p style="margin:0;font-size:28px;font-weight:800;color:#0d7a55;letter-spacing:1px;font-family:monospace;">${householdID}</p>
              </div>
              <p style="margin:0 0 8px;color:#4a5e5a;font-size:14px;font-weight:600;">Next Steps:</p>
              <ol style="margin:0 0 24px;padding-left:20px;color:#4a5e5a;font-size:14px;line-height:2.2;">
                <li>Go to the 3S Sense portal and click <strong>Activate Account</strong>.</li>
                <li>Enter your Household ID above and create a secure password.</li>
                <li>After activation, add your household members.</li>
                <li>Everyone in your household logs in using the <strong>same Household ID and password</strong>, then selects their own profile.</li>
              </ol>
              <p style="margin:0;color:#4a5e5a;font-size:13px;background:#fffbea;border-left:4px solid #e8a020;padding:12px 16px;border-radius:0 6px 6px 0;line-height:1.6;">
                ⚠️ Keep your Household ID private. Do not share it with anyone outside your household.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f4f6f8;padding:20px 40px;text-align:center;border-top:1px solid #e8edf0;">
              <p style="margin:0;font-size:12px;color:#8a9e9a;">
                © 2026 Barangay 3S+ Malanday. All rights reserved.<br/>
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();