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

    if (!snapshot.exists()) throw new Error("Invalid Household ID.");

    const householdData = snapshot.data();

    if (!householdData.activated) {
        throw new Error(
            "This account has not been activated yet. Please check your email for your Household ID and activate first."
        );
    }

    await signInWithEmailAndPassword(auth, householdData.email, password);

    // Load all residents from the sub-collection
    const residentsSnap = await getDocs(
        collection(db, "households", householdID.trim(), "residents")
    );

    const residents = residentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return {
        householdID: householdID.trim(),
        householdName: [residents.find(r => r.role === "head")?.firstName,
        residents.find(r => r.role === "head")?.lastName]
            .filter(Boolean).join(" ") || householdData.email,
        email: householdData.email,
        address: {
            houseNumber: householdData.houseNumber || "",
            street: householdData.street || "",
            barangay: householdData.barangay || "",
            city: householdData.city || "",
            province: householdData.province || "",
            region: householdData.region || "",
        },
        residents,
    };
};

export const forgotHouseholdPassword = async (householdID) => {
    if (!householdID) throw new Error("Please enter your Household ID.");

    const householdRef = doc(db, "households", householdID.trim());
    const snapshot = await getDoc(householdRef);

    if (!snapshot.exists()) throw new Error("Invalid Household ID.");

    const email = snapshot.data().email;
    await sendPasswordResetEmail(auth, email);

    const [user, domain] = email.split("@");
    return user[0] + "***@" + domain;
};

export const getMemberPin = async (householdID, residentID) => {
    const ref = doc(db, "households", householdID, "residents", residentID);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    // pin is stored as a hash under the field `pinHash`
    return snap.data().pinHash || null;
};

export const saveMemberPin = async (householdID, residentID, pin) => {
    const pinHash = await hashPin(pin);
    const ref = doc(db, "households", householdID, "residents", residentID);
    await updateDoc(ref, { pinHash, updatedAt: new Date() });
};

export const verifyMemberPin = async (householdID, residentID, enteredPin) => {
    const storedHash = await getMemberPin(householdID, residentID);
    if (!storedHash) return false;
    const enteredHash = await hashPin(enteredPin);
    return enteredHash === storedHash;
};

export const resetMemberPin = async (householdID, residentID) => {
    const ref = doc(db, "households", householdID, "residents", residentID);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw new Error("Resident not found.");

    const residentData = snap.data();
    const residentEmail = residentData.email;

    if (!residentEmail) {
        throw new Error(
            "No email found for this resident. Please contact the Barangay office to reset your PIN."
        );
    }

    await updateDoc(ref, { pinHash: null, updatedAt: new Date() });

    try {
        await fetch("/api/resend-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Barangay 3S+ Malanday <noreply@3s-sense.site>",
                to: [residentEmail],
                subject: "Your 3S Sense PIN Has Been Reset",
                html: buildPinResetEmail(
                    residentData.firstName || residentData.lastName || "Resident"
                ),
            }),
        });
    } catch (error) {
        console.error("Failed to send PIN reset email:", error);
        // Don't throw - the PIN was still reset, email is just a courtesy
    }

    const [user, domain] = residentEmail.split("@");
    return user[0] + "***@" + domain;
};

export const logout = async () => {
    await firebaseSignOut(auth);
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