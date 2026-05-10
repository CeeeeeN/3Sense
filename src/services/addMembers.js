import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

// ─── Create a new branch document ────────────────────────────────────────────
// Called from the UI *before* adding the first member to the new branch.
// Returns the new branch ID (e.g. "BR-002").
export const createBranch = async (householdID, branchName) => {
    if (!householdID) throw new Error("Household ID is required.");
    if (!branchName || !branchName.trim()) throw new Error("Branch name is required.");

    const branchesSnap = await getDocs(collection(db, "households", householdID, "branches"));
    let maxBranchNum = 0;
    branchesSnap.forEach(b => {
        const num = parseInt(b.id.replace("BR-", ""), 10);
        if (!isNaN(num) && num > maxBranchNum) maxBranchNum = num;
    });

    const newBranchID = `BR-${String(maxBranchNum + 1).padStart(3, "0")}`;
    await setDoc(doc(db, "households", householdID, "branches", newBranchID), {
        branchName: branchName.trim(),
        residentID: null, // no head yet
        createdAt: serverTimestamp(),
    });

    return newBranchID;
};

// ─── Add a member to an existing branch ──────────────────────────────────────
export const addHouseholdMember = async (householdID, memberData) => {
    if (!householdID) throw new Error("Household ID is required.");

    // Get the household's Firebase Auth UID (shared across all members)
    const hhSnap = await getDoc(doc(db, "households", householdID));
    const hhUserID = hhSnap.data()?.userID || "";

    const residentsRef = collection(db, "households", householdID, "residents");
    const newMemberRef = doc(residentsRef);
    const branchID = memberData.branchID || null;

    // If this member is being set as branch head AND it's not BR-001
    // (BR-001's residentID is always "head" — set by activation, never changed here)
    if (memberData.isBranchHead && branchID && branchID !== "BR-001") {
        await updateDoc(doc(db, "households", householdID, "branches", branchID), {
            residentID: newMemberRef.id,
        });
    }

    const resident = {
        residentID: newMemberRef.id,
        householdID,
        role: memberData.isBranchHead && branchID && branchID !== "BR-001" ? "Branch Head" : "Member",
        userID: hhUserID,

        firstName: memberData.firstName || "",
        middleName: memberData.middleName || "",
        lastName: memberData.lastName || "",
        suffix: memberData.suffix || "",

        birthDate: memberData.birthDate || "",
        age: memberData.age ? Number(memberData.age) : null,
        birthPlace: memberData.birthPlace || "",
        sex: memberData.sex || "",
        genderOrientation: memberData.gender === "Others"
            ? (memberData.genderOther || "Others")
            : (memberData.gender || ""),
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
        disabilityType: memberData.disabilityType === "Others"
            ? (memberData.disabilityTypeOther || "Others")
            : (memberData.disabilityType || ""),

        educationAttainment: memberData.educationAttainment || "",
        educationStatus: memberData.educationStatus || "",
        occupation: memberData.occupation || "",
        employmentStatus: memberData.employmentStatus || "",

        sameAddress: memberData.sameAddress !== undefined ? !!memberData.sameAddress : true,

        branchID,

        pinHash: null,
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