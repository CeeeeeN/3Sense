import { doc, getDoc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const addHouseholdMember = async (householdID, memberData) => {
    if (!householdID) throw new Error("Household ID is required.");

    const hhRef = doc(db, "households", householdID);
    const hhSnap = await getDoc(hhRef);
    const hhUserID = hhSnap.data()?.userID || "";

    const residentsRef = collection(db, "households", householdID, "residents");
    const newMemberRef = doc(residentsRef);

    const resident = {
        role: memberData.isHead ? "head" : "member",
        userID: memberData.isHead ? hhUserID : newMemberRef.id,
        firstName: memberData.firstName || "",
        middleName: memberData.middleName || "",
        lastName: memberData.lastName || "",
        suffix: memberData.suffix || "",

        birthDate: memberData.birthDate || "",
        age: memberData.age ? Number(memberData.age) : null,
        birthPlace: memberData.birthPlace || "",
        sex: memberData.sex || "",
        civilStatus: memberData.civilStatus || "",
        religion: memberData.religion || "",
        citizenship: memberData.citizenship || "",
        residingSinceYear: memberData.residingSinceYear ? Number(memberData.residingSinceYear) : null,
        contactNumber: memberData.contactNumber
            ? Number(String(memberData.contactNumber).replace(/\D/g, ""))
            : null,
        email: memberData.email || "",

        categories: Array.isArray(memberData.categories)
            ? memberData.categories
            : memberData.category
                ? String(memberData.category).split(",").map(s => s.trim()).filter(Boolean)
                : [],
        pwdStatus: memberData.pwdStatus || "",
        disabilityType: memberData.disabilityType || "",

        educationAttainment: memberData.educationAttainment || "",
        educationStatus: memberData.educationStatus || "",
        occupation: memberData.occupation || "",
        employmentStatus: memberData.employmentStatus || "",

        pin: null,

        createdAt: serverTimestamp(),
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    // Only store address fields when the member has a different address
    if (!memberData.sameAddress) {
        resident.houseNumber = memberData.houseNumber || "";
        resident.street = memberData.street || "";
        resident.barangay = memberData.barangay || "";
        resident.city = memberData.city || "";
        resident.province = memberData.province || "";
        resident.region = memberData.region || "";
    }

    await setDoc(newMemberRef, resident);
    return newMemberRef.id;
};