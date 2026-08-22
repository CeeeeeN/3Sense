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
    const genderResolved = head.gender === "Others"
        ? (head.genderOther || "Others")
        : (head.gender || head.genderOrientation || "");

    await setDoc(headRef, {
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
