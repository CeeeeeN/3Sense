import {
    doc,
    getDoc,
    updateDoc,
    setDoc,
    deleteField,
    serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase/firebase";

export const activateAccount = async (householdID, password, confirmPassword) => {
    if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
    }

    const householdRef = doc(db, "households", householdID);
    const snapshot = await getDoc(householdRef);

    if (!snapshot.exists()) {
        throw new Error("Invalid Household ID. Please check the ID in your approval email.");
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
    const headRef = doc(db, "households", householdID, "residents", "head");

    await setDoc(headRef, {
        residentID:  "head",       // canonical self-reference
        householdID,               // parent household
        role:        "Household Head",
        userID:      userCredential.user.uid,  // Firebase Auth UID

        firstName:   head.firstName || "",
        middleName:  head.middleName || "",
        lastName:    head.lastName || "",
        suffix:      head.suffix || "",

        birthDate:   head.birthDate || "",
        age:         head.age ?? null,
        birthPlace:  head.birthPlace || "",
        sex:         head.sex || "",
        genderOrientation: head.genderOrientation || "",
        civilStatus: head.civilStatus || "",
        religion:    head.religion || "",
        citizenship: head.citizenship || "",
        contactNumber: head.contactNumber ?? null,
        email:       head.email || "",
        residingSinceYear: head.residingSinceYear ? Number(head.residingSinceYear) : null,

        categories: Array.isArray(head.categories)
            ? head.categories
            : (head.category ? String(head.category).split(",").map(s => s.trim()).filter(Boolean) : []),
        pwdStatus:    head.pwdStatus || "",
        disabilityType: head.disabilityType || "",

        educationAttainment: head.educationAttainment || "",
        educationStatus:     head.educationStatus || "",
        occupation:          head.occupation || "",
        employmentStatus:    head.employmentStatus || "",

        branchID: "BR-001",

        // SENSE-52: Assign the images to the final Head Resident Profile
        idImageUrl: head.idImageUrl || "",
        selfieImageUrl: head.selfieImageUrl || "",

        pinHash:   null,
        createdAt: serverTimestamp(),
        addedAt:   serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    await updateDoc(householdRef, {
        activated: true,
        activatedAt: serverTimestamp(),
        userID: userCredential.user.uid,
        _pendingHeadData: deleteField(), // clean up the temp staging field
    });

    const branchRef = doc(db, "households", householdID, "branches", "BR-001");
    await setDoc(branchRef, {
        branchName: `${head.lastName || ""} Family`.trim(),
        residentID: "head",
        createdAt: serverTimestamp(),
    });

    return {
        householdID,
        name: [head.firstName, head.lastName].filter(Boolean).join(" "),
        email: data.email,
        address: {
            houseNumber: data.houseNumber || "",
            street: data.street || "",
            barangay: data.barangay || "",
            city: data.city || "",
            province: data.province || "",
            region: data.region || "",
        },
    };
};