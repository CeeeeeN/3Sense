import {
    doc,
    getDoc,
    updateDoc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase/firebase";

export const activateAccount = async (householdID, password, confirmPassword) => {
    if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
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

    const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        password
    );

    await updateDoc(householdRef, {
        activated: true,
        userUID: userCredential.user.uid,
        activatedAt: serverTimestamp(),
    });

    // Seed household head with FULL registration data
    const reg = data.registrationData || {};
    const headMemberRef = doc(db, "households", householdID, "members", "head");
    await setDoc(headMemberRef, {
        id: "head",
        role: "head",
        fullName: data.name || "",
        // personal info
        firstName: reg.firstName || "",
        middleName: reg.middleName || "",
        lastName: reg.lastName || "",
        suffix: reg.suffix || "",
        birthDate: reg.birthDate || "",
        age: reg.age || "",
        birthPlace: reg.birthPlace || "",
        sex: reg.sex || "",
        civilStatus: reg.civilStatus || "",
        religion: reg.religion || "",
        citizenship: reg.citizenship || "",
        contactNumber: reg.contactNumber || "",
        email: reg.email || "",
        // address
        address: data.address || {},
        // category
        categories: reg.categories || [],
        pwdStatus: reg.pwdStatus || "",
        disabilityType: reg.disabilityType || "",
        // education & employment
        educationAttainment: reg.educationAttainment || "",
        educationStatus: reg.educationStatus || "",
        occupation: reg.occupation || "",
        employmentStatus: reg.employmentStatus || "",
        // household
        householdMembers: reg.householdMembers || "",
        householdClassification: reg.householdClassification || "",
        addedAt: serverTimestamp(),
    });

    return {
        householdID,
        name: data.name || "",
        email: data.email,
        address: data.address || {},
    };
};