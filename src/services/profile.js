import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const getMemberProfile = async (householdID, memberID) => {
    if (!householdID || !memberID) throw new Error("Missing household or member ID.");

    const memberRef = doc(db, "households", householdID, "members", memberID);
    const snapshot = await getDoc(memberRef);

    if (!snapshot.exists()) {
        throw new Error("Member profile not found.");
    }

    const data = snapshot.data();

    // Normalize address — stored as object in Firestore
    return {
        firstName: data.firstName || "",
        middleName: data.middleName || "",
        lastName: data.lastName || "",
        suffix: data.suffix || "",
        birthDate: data.birthDate || "",
        birthPlace: data.birthPlace || "",
        sex: data.sex || "Male",
        civilStatus: data.civilStatus || "",
        citizenship: data.citizenship || "",
        religion: data.religion || "",
        contactNumber: data.contactNumber || "",
        email: data.email || "",
        // address stored as nested object
        houseNumber: data.address?.house || data.houseNumber || "",
        street: data.address?.street || data.street || "",
        region: data.address?.region || data.region || "",
        province: data.address?.province || data.province || "",
        city: data.address?.city || data.city || "",
        barangay: data.address?.barangay || data.barangay || "",
        // category
        categories: data.categories || [],
        pwdStatus: data.pwdStatus || "",
        disabilityType: data.disabilityType || "",
        // education & employment
        educationAttainment: data.educationAttainment || "",
        educationStatus: data.educationStatus || "",
        occupation: data.occupation || "",
        employmentStatus: data.employmentStatus || "",
        // household
        householdMembers: data.householdMembers || "",
        householdClassification: data.householdClassification || "",
        // meta
        role: data.role || "member",
        fullName: data.fullName || "",
    };
};

// Updates the member's profile in Firestore
export const updateMemberProfile = async (householdID, memberID, updatedData) => {
    if (!householdID || !memberID) throw new Error("Missing household or member ID.");

    const memberRef = doc(db, "households", householdID, "members", memberID);

    await updateDoc(memberRef, {
        firstName: updatedData.firstName || "",
        middleName: updatedData.middleName || "",
        lastName: updatedData.lastName || "",
        suffix: updatedData.suffix || "",
        birthDate: updatedData.birthDate || "",
        birthPlace: updatedData.birthPlace || "",
        sex: updatedData.sex || "",
        civilStatus: updatedData.civilStatus || "",
        citizenship: updatedData.citizenship || "",
        religion: updatedData.religion || "",
        contactNumber: updatedData.contactNumber || "",
        email: updatedData.email || "",
        // store address as nested object for consistency
        address: {
            house: updatedData.houseNumber || "",
            street: updatedData.street || "",
            region: updatedData.region || "",
            province: updatedData.province || "",
            city: updatedData.city || "",
            barangay: updatedData.barangay || "",
        },
        // keep flat address fields too for backwards compatibility
        houseNumber: updatedData.houseNumber || "",
        street: updatedData.street || "",
        region: updatedData.region || "",
        province: updatedData.province || "",
        city: updatedData.city || "",
        barangay: updatedData.barangay || "",
        // category
        categories: updatedData.categories || [],
        pwdStatus: updatedData.pwdStatus || "",
        disabilityType: updatedData.disabilityType || "",
        // education & employment
        educationAttainment: updatedData.educationAttainment || "",
        educationStatus: updatedData.educationStatus || "",
        occupation: updatedData.occupation || "",
        employmentStatus: updatedData.employmentStatus || "",
        // household
        householdMembers: updatedData.householdMembers || "",
        householdClassification: updatedData.householdClassification || "",
        // update fullName
        fullName: [
            updatedData.firstName,
            updatedData.middleName,
            updatedData.lastName,
            updatedData.suffix,
        ].filter(Boolean).join(" "),
        updatedAt: serverTimestamp(),
    });
};