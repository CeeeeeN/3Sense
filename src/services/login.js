import {
    doc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
} from "firebase/firestore";
import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
} from "firebase/auth";
import { db, auth } from "../firebase/firebase";

const hashPin = async (pin) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

export const loginWithHouseholdID = async (householdID, password) => {
    if (!householdID || !password) {
        throw new Error("Please enter your Household ID and password.");
    }

    const householdRef = doc(db, "households", householdID.trim());
    const snapshot = await getDoc(householdRef);

    if (!snapshot.exists()) {
        throw new Error("Invalid Household ID.");
    }

    const householdData = snapshot.data();

    if (!householdData.activated) {
        throw new Error(
            "This account has not been activated yet. Please check your email for your Household ID and activate first."
        );
    }

    await signInWithEmailAndPassword(auth, householdData.email, password);

    const membersSnap = await getDocs(
        collection(db, "households", householdID.trim(), "members")
    );

    const members = membersSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
    }));

    return {
        householdID: householdID.trim(),
        householdName: householdData.name,
        email: householdData.email,
        members,
    };
};

export const forgotHouseholdPassword = async (householdID) => {
    if (!householdID) throw new Error("Please enter your Household ID.");

    const householdRef = doc(db, "households", householdID.trim());
    const snapshot = await getDoc(householdRef);

    if (!snapshot.exists()) {
        throw new Error("Invalid Household ID.");
    }

    const email = snapshot.data().email;

    // Firebase sends reset link to household head's email
    await sendPasswordResetEmail(auth, email);

    const [user, domain] = email.split("@");
    const masked = user[0] + "***@" + domain;
    return masked;
};

// Checks if a member already has a PIN set in Firestore
export const getMemberPin = async (householdID, memberID) => {
    const memberRef = doc(db, "households", householdID, "members", memberID);
    const snapshot = await getDoc(memberRef);
    if (!snapshot.exists()) return null;
    return snapshot.data().pinHash || null;
};

export const saveMemberPin = async (householdID, memberID, pin) => {
    const pinHash = await hashPin(pin);
    const memberRef = doc(db, "households", householdID, "members", memberID);
    await updateDoc(memberRef, { pinHash });
};

export const verifyMemberPin = async (householdID, memberID, enteredPin) => {
    const storedHash = await getMemberPin(householdID, memberID);
    if (!storedHash) return false;
    const enteredHash = await hashPin(enteredPin);
    return enteredHash === storedHash;
};

export const resetMemberPin = async (householdID, memberID) => {
    const memberRef = doc(db, "households", householdID, "members", memberID);
    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
        throw new Error("Member not found.");
    }

    const memberData = memberSnap.data();
    const memberEmail = memberData.email;

    if (!memberEmail) {
        throw new Error(
            "No email found for this member. Please contact the Barangay office to reset your PIN."
        );
    }

    // Clear the PIN 
    await updateDoc(memberRef, { pinHash: null });

    const apiKey = import.meta.env.VITE_RESEND_API_KEY;
    if (apiKey) {
        await fetch("/resend/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Barangay 3S+ Malanday <onboarding@resend.dev>",
                to: [memberEmail],
                subject: "Your 3S Sense PIN Has Been Reset",
                html: buildPinResetEmail(memberData.fullName || memberData.firstName || "Member"),
            }),
        });
    }

    // Return masked email for display 
    const [user, domain] = memberEmail.split("@");
    const masked = user[0] + "***@" + domain;
    return masked;
};

const buildPinResetEmail = (name) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#fff;border-radius:12px;overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d7a55,#317D89);padding:28px 36px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Barangay 3S+ Malanday</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">Community Management System</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 14px;color:#1a2e2a;font-size:15px;font-weight:600;">Hello, ${name}!</p>
              <p style="margin:0 0 20px;color:#4a5e5a;font-size:14px;line-height:1.7;">
                Your <strong>4-digit PIN</strong> for the 3S Sense app has been reset.
                The next time you log in and select your profile, you will be asked to create a new PIN.
              </p>
              <p style="margin:0;color:#4a5e5a;font-size:13px;background:#fffbea;
                        border-left:4px solid #e8a020;padding:12px 16px;
                        border-radius:0 6px 6px 0;line-height:1.6;">
                ⚠️ If you did not request this reset, please contact the Barangay office immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f4f6f8;padding:18px 36px;text-align:center;border-top:1px solid #e8edf0;">
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

export const logout = async () => {
    await firebaseSignOut(auth);
};