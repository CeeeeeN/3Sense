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

    try {
        await signInWithEmailAndPassword(auth, householdData.email, password);
    } catch (err) {
        // If the old email is invalid, but we have a pendingEmail, try it.
        // This handles the case where the user verified their new email via the verification link,
        // which automatically switched their Firebase Auth email to the new one.
        if (err.code === "auth/invalid-credential") {
            let success = false;
            
            if (householdData.pendingEmail) {
                try {
                    await signInWithEmailAndPassword(auth, householdData.pendingEmail, password);
                    await updateDoc(householdRef, {
                        email: householdData.pendingEmail,
                        pendingEmail: null
                    });
                    householdData.email = householdData.pendingEmail;
                    success = true;
                } catch (innerErr) {
                    if (innerErr.code !== "auth/invalid-credential") throw innerErr;
                }
            }

            // Fallback for edge cases where pendingEmail wasn't set but the head resident doc HAS the new email
            if (!success) {
                const headRef = doc(db, "households", householdID.trim(), "residents", "head");
                const headSnap = await getDoc(headRef);
                if (headSnap.exists()) {
                    const headData = headSnap.data();
                    if (headData.email && headData.email !== householdData.email) {
                        try {
                            await signInWithEmailAndPassword(auth, headData.email, password);
                            await updateDoc(householdRef, { email: headData.email });
                            householdData.email = headData.email;
                            success = true;
                        } catch (innerErr) {
                            // let it fall through and throw original error
                        }
                    }
                }
            }

            if (!success) {
                throw err;
            }
        } else {
            throw err;
        }
    }

    // Load all residents from the sub-collection
    const residentsSnap = await getDocs(
        collection(db, "households", householdID.trim(), "residents")
    );

    const residents = residentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Load all branches from the sub-collection
    const branchesSnap = await getDocs(
        collection(db, "households", householdID.trim(), "branches")
    );
    
    const branches = branchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return {
        householdID: householdID.trim(),
        householdName: (() => {
            const head = residents.find(r => r.role === "Household Head" || r.role === "head");
            return [head?.firstName, head?.lastName].filter(Boolean).join(" ") || householdData.email;
        })(),
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
        branches,
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

const pinRequest = async (action, householdID, residentID, pin) => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Your session has expired. Please log in again.");
    }

    let response;
    try {
        const token = await user.getIdToken();
        response = await fetch("/api/pin-auth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action, householdID, residentID, pin }),
        });
    } catch {
        throw new Error("Unable to reach the server. Please check your connection and try again.");
    }

    let data = {};
    try {
        data = await response.json();
    } catch {}

    const known = ["LOCKED", "INCORRECT_PIN", "NO_PIN"];
    if (!response.ok && !known.includes(data.code)) {
        throw new Error(data.message || "Something went wrong. Please try again.");
    }
    return data;
};

export const saveMemberPin = async (householdID, residentID, pin) => {
    const data = await pinRequest("create", householdID, residentID, pin);
    if (!data.success) {
        throw new Error(data.message || "Unable to save your PIN. Please try again.");
    }
};

export const getMemberPinStatus = async (householdID, residentID) => {
    const data = await pinRequest("status", householdID, residentID);
    return {
        hasPin: !!data.hasPin,
        locked: !!data.locked,
        remainingSeconds: data.remainingSeconds || 0,
    };
};

export const verifyMemberPin = async (householdID, residentID, enteredPin) => {
    const data = await pinRequest("verify", householdID, residentID, enteredPin);
    if (data.success) return { ok: true };
    return {
        ok: false,
        code: data.code,
        message: data.message,
        attemptsRemaining: data.attemptsRemaining,
        remainingSeconds: data.remainingSeconds,
    };
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

    const result = await pinRequest("reset", householdID, residentID);
    if (!result.success) {
        throw new Error(result.message || "Unable to reset your PIN right now.");
    }

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