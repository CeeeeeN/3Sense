import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

// ─── Cloudinary Upload Helper ────────────────────────────────────────────────
const uploadToCloudinary = async (base64String, folder) => {
    const cloudName = "dfnqeiksu"; 
    const uploadPreset = "3Sense+_ID"; 

    const formData = new FormData();
    formData.append("file", base64String);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) throw new Error("Failed to upload image to Cloudinary");
    const data = await res.json();
    return data.secure_url;
};
// ─────────────────────────────────────────────────────────────────────────────

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
        residentID: null, 
        createdAt: serverTimestamp(),
    });

    return newBranchID;
};

export const addHouseholdMember = async (householdID, memberData) => {
    if (!householdID) throw new Error("Household ID is required.");
    
    if (!memberData.idImage || !memberData.selfieImage) {
        throw new Error("Selfie image and ID are REQUIRED before submission succeeds.");
    }

    const hhSnap = await getDoc(doc(db, "households", householdID));
    const hhUserID = hhSnap.data()?.userID || "";

    const residentsRef = collection(db, "households", householdID, "residents");
    const newMemberRef = doc(residentsRef);
    const branchID = memberData.branchID || null;
    const residentID = newMemberRef.id;

    if (memberData.isBranchHead && branchID && branchID !== "BR-001") {
        await updateDoc(doc(db, "households", householdID, "branches", branchID), {
            residentID: residentID,
        });
    }
    
    // ONLY upload the Selfie. The ID image is intentionally discarded/deleted here.
    const selfieImageUrl = await uploadToCloudinary(
        memberData.selfieImage, 
        `3Sense/residents/${residentID}`
    );

    const resident = {
        residentID: residentID,
        householdID,
        role: memberData.isBranchHead && branchID && branchID !== "BR-001" ? "Branch Head" : "Member",
        userID: hhUserID,

        // Auto-filler Fix: Explicitly saving the idNumber
        idNumber: memberData.idNumber || "",

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

        // Meta (Only saving the Selfie URL)
        selfieImageUrl,
        pinHash: null,
        createdAt: serverTimestamp(),
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    if (!memberData.sameAddress) {
        resident.houseNumber = memberData.houseNumber || "";
        resident.street = memberData.street || "";
        resident.barangay = memberData.barangay || "";
        resident.city = memberData.city || "";
        resident.province = memberData.province || "";
        resident.region = memberData.region || "";
    }

    await setDoc(newMemberRef, resident);
    return residentID;
};