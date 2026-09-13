import {
    doc,
    getDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    deleteField,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase/firebase";

// Fallback UID generator for legacy accounts missing a UID
const generateResidentUID = () => {
    const year = new Date().getFullYear();
    const timeSlice = Date.now().toString().slice(-4);
    const random4 = Math.floor(1000 + Math.random() * 9000).toString();
    return `MAL-${year}-${timeSlice}${random4}`;
};

export const activateAccount = async (householdID, password, confirmPassword) => {
    if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
    }

    const cleanID = householdID.trim();
    const householdRef = doc(db, "households", cleanID);
    const snapshot = await getDoc(householdRef);

    if (!snapshot.exists()) {
        throw new Error("Invalid Household ID. Please check the ID in your approval email (e.g. MAL-2026-XXXXX).");
    }

    const data = snapshot.data();

    if (data.activated === true) {
        throw new Error("This account has already been activated. Please log in instead.");
    }

    let userCredential;
    try {
        userCredential = await createUserWithEmailAndPassword(auth, data.email, password);
    } catch (authError) {
        if (authError.code === "auth/email-already-in-use") {
            throw new Error(
                "This account's email is already registered. If you previously started activation, please log in instead, or contact the Barangay office."
            );
        }
        throw authError;
    }

    const head = data._pendingHeadData || {};
    const headRef = doc(db, "households", cleanID, "residents", "head");
    
    // ─── NEW: BRANCH-OFF MIGRATION LOGIC ───
    if (data.branchingData && data.branchingData.oldHouseholdID && data.branchingData.residentID) {
        // Fetch the resident's actual, mature profile from their old household
        const oldResidentRef = doc(db, "households", data.branchingData.oldHouseholdID, "residents", data.branchingData.residentID);
        const oldResidentSnap = await getDoc(oldResidentRef);
        
        if (oldResidentSnap.exists()) {
            const oldData = oldResidentSnap.data();
            const batch = writeBatch(db);

            // Copy their old profile exactly, but promote them and update their location
            batch.set(headRef, {
                ...oldData,
                householdID: cleanID,
                residentID: "head",
                role: "Household Head",
                branchID: "BR-001",
                userID: userCredential.user.uid,
                // Update their address to match the newly registered household
                houseNumber: data.houseNumber || "",
                street: data.street || "",
                barangay: data.barangay || "Malanday",
                city: data.city || "Valenzuela City",
                province: data.province || "",
                region: data.region || "NCR",
                updatedAt: serverTimestamp()
            });

            // Delete their old ghost profile
            batch.delete(oldResidentRef);
            
            // Clean up the household container
            batch.update(householdRef, {
                activated: true,
                activatedAt: serverTimestamp(),
                userID: userCredential.user.uid,
                _pendingHeadData: deleteField(),
                branchingData: deleteField() // Clean up the breadcrumb
            });

            // Set up their branch
            const branchRef = doc(db, "households", cleanID, "branches", "BR-001");
            batch.set(branchRef, {
                branchName: `${oldData.lastName || head.lastName || ""} Family`.trim(),
                familyNumber: `${cleanID}-1`,
                residentID: "head",
                createdAt: serverTimestamp(),
            });

            await batch.commit();

            return {
                householdID: cleanID,
                name: [oldData.firstName, oldData.lastName].filter(Boolean).join(" "),
                email: data.email,
                address: {
                    houseNumber: data.houseNumber || "",
                    street: data.street || "",
                    barangay: data.barangay || "Malanday",
                    city: data.city || "Valenzuela City",
                    province: data.province || "",
                    region: data.region || "NCR",
                },
            };
        }
        // If the old resident profile went missing, the code naturally falls through 
        // to standard registration logic below to ensure they aren't locked out.
    }
    // ───────────────────────────────────────

    // STANDARD REGISTRATION LOGIC
    const genderResolved = head.gender === "Others"
        ? (head.genderOther || "Others")
        : (head.gender || head.genderOrientation || "");

    const finalUID = head.UID || generateResidentUID();

    await setDoc(headRef, {
        UID:         finalUID,
        residentID:  "head",
        householdID: cleanID,
        role:        "Household Head",
        userID:      userCredential.user.uid,
        idNumber:    head.idNumber || "",

        firstName:   head.firstName || "",
        middleName:  head.middleName || "",
        lastName:    head.lastName || "",
        suffix:      head.suffix === "None" ? "" : (head.suffix || ""),

        birthDate:   head.birthDate || "",
        age:         head.age ?? null,
        birthPlace:  head.birthPlace || "",
        sex:         head.sex || "",
        gender:      genderResolved,
        genderOrientation: genderResolved,
        civilStatus: head.civilStatus || "",
        religion:    head.religion || "",
        citizenship: head.citizenship || "Filipino",
        contactNumber: head.contactNumber ?? null,
        email:       (head.email || data.email || "").trim().toLowerCase(),
        residingSinceYear: head.residingSinceYear ? Number(head.residingSinceYear) : null,

        categories: Array.isArray(head.categories)
            ? head.categories
            : (head.category ? String(head.category).split(",").map(s => s.trim()).filter(Boolean) : []),
        pwdStatus:    head.pwdStatus || "",
        disabilityType: head.disabilityType || "",
        disabilityTypeOther: head.disabilityTypeOther || "",

        educationAttainment: head.educationAttainment || "",
        educationStatus:     head.educationStatus || "",
        occupation:          head.occupation || "",
        employmentStatus:    head.employmentStatus || "",

        branchID: "BR-001",

        idImageUrl: head.idImageUrl || head.idImage || "",
        selfieImageUrl: head.selfieImageUrl || head.selfieImage || "",
        idImage: head.idImage || head.idImageUrl || "",
        selfieImage: head.selfieImage || head.selfieImageUrl || "",

        pinHash:   null,
        createdAt: serverTimestamp(),
        addedAt:   serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    await updateDoc(householdRef, {
        activated: true,
        activatedAt: serverTimestamp(),
        userID: userCredential.user.uid,
        _pendingHeadData: deleteField(),
    });

    const branchRef = doc(db, "households", cleanID, "branches", "BR-001");
    await setDoc(branchRef, {
        branchName: `${head.lastName || ""} Family`.trim(),
        familyNumber: `${cleanID}-1`,
        residentID: "head",
        createdAt: serverTimestamp(),
    });

    return {
        householdID: cleanID,
        name: [head.firstName, head.lastName].filter(Boolean).join(" "),
        email: data.email,
        address: {
            houseNumber: data.houseNumber || "",
            street: data.street || "",
            barangay: data.barangay || "Malanday",
            city: data.city || "Valenzuela City",
            province: data.province || "",
            region: data.region || "NCR",
        },
    };
};