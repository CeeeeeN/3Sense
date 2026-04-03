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
  const count = snapshot.size + 1;
  const year = new Date().getFullYear();
  const padded = String(count).padStart(5, "0");
  return `HH-${year}-${padded}`;
};

export const approveRegistration = async (docID) => {
  const pendingRef = doc(db, "pending_registrations", docID);
  const snapshot = await getDoc(pendingRef);

  if (!snapshot.exists()) {
    throw new Error("Registration not found");
  }

  const data = snapshot.data();
  const householdID = await generateHouseholdID();
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  const householdRef = doc(db, "households", householdID);
  await setDoc(householdRef, {
    email: data.email,
    name: fullName,
    address: {
      house: data.houseNumber || "",
      street: data.street || "",
      region: data.region || "",
      province: data.province || "",
      city: data.city || "",
      barangay: data.barangay || "",
    },

    registrationData: {
      firstName: data.firstName || "",
      middleName: data.middleName || "",
      lastName: data.lastName || "",
      suffix: data.suffix || "",
      birthDate: data.birthDate || "",
      age: data.age || "",
      birthPlace: data.birthPlace || "",
      sex: data.sex || "",
      civilStatus: data.civilStatus || "",
      religion: data.religion || "",
      citizenship: data.citizenship || "",
      contactNumber: data.contactNumber || "",
      email: data.email || "",
      categories: data.categories || [],
      pwdStatus: data.pwdStatus || "",
      disabilityType: data.disabilityType || "",
      educationAttainment: data.educationAttainment || "",
      educationStatus: data.educationStatus || "",
      occupation: data.occupation || "",
      employmentStatus: data.employmentStatus || "",
      householdMembers: data.householdMembers || "",
      householdClassification: data.householdClassification || "",
    },
    activated: false,
    createdAt: serverTimestamp(),
  });

  await sendApprovalEmail(householdID, fullName, data.email);
  await deleteDoc(pendingRef);

  return {
    householdID,
    email: data.email,
    name: fullName,
  };
};

const sendApprovalEmail = async (householdID, name, toEmail) => {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY;

  if (!apiKey) {
    console.warn("VITE_RESEND_API_KEY is not set. Skipping email.");
    return;
  }

  const response = await fetch("/resend/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Barangay 3S+ Malanday <onboarding@resend.dev>",
      to: [toEmail],
      subject: "Your Barangay 3S+ Registration Has Been Approved",
      html: buildApprovalEmail(householdID, name),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to send email: ${error.message || response.statusText}`);
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