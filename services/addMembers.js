import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

// Cloudinary Upload Helper (gracefully skips if given a remote URL or empty payload)
const uploadToCloudinary = async (base64String, folder) => {
    if (!base64String || base64String.startsWith("http://") || base64String.startsWith("https://")) {
        return base64String || "";
    }
    try {
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
    } catch (e) {
        console.warn("Cloudinary upload fallback:", e.message);
        return "";
    }
};

export const createBranch = async (householdID, branchName) => {
    if (!householdID) throw new Error("Household ID is required.");
    if (!branchName || !branchName.trim()) throw new Error("Branch name is required.");

    const branchesSnap = await getDocs(collection(db, "households", householdID, "branches"));
    let maxBranchNum = 0;
    branchesSnap.forEach(b => {
        const num = parseInt(b.id.replace("BR-", ""), 10);
        if (!isNaN(num) && num > maxBranchNum) maxBranchNum = num;
    });

    const newBranchNum = maxBranchNum + 1;
    const newBranchID = `BR-${String(newBranchNum).padStart(3, "0")}`;
    await setDoc(doc(db, "households", householdID, "branches", newBranchID), {
        branchName: branchName.trim(),
        familyNumber: `${householdID}-${newBranchNum}`,
        residentID: null,
        createdAt: serverTimestamp(),
    });

    return newBranchID;
};

export const addHouseholdMember = async (householdID, memberData) => {
    if (!householdID) throw new Error("Household ID is required.");
    
    // Selfie is required, but ID is completely OPTIONAL (matches mobile)
    if (!memberData.selfieImage && !memberData.selfieImageUrl) {
        throw new Error("Selfie image is REQUIRED before submission succeeds.");
    }

    const cleanID = householdID.trim();
    const hhSnap = await getDoc(doc(db, "households", cleanID));
    const hhUserID = hhSnap.data()?.userID || "";

    const residentsRef = collection(db, "households", cleanID, "residents");
    const newMemberRef = doc(residentsRef);
    const branchID = memberData.branchID || "BR-001";
    const residentID = newMemberRef.id;

    if (memberData.isBranchHead && branchID && branchID !== "BR-001") {
        await updateDoc(doc(db, "households", cleanID, "branches", branchID), {
            residentID: residentID,
        });
    }

    // Upload images conditionally
    let idImageUrl = "";
    if (memberData.idImage || memberData.idImageUrl) {
        idImageUrl = await uploadToCloudinary(
            memberData.idImage || memberData.idImageUrl, 
            `3Sense/residents/${residentID}`
        );
    }
    
    const selfieImageUrl = await uploadToCloudinary(
        memberData.selfieImage || memberData.selfieImageUrl, 
        `3Sense/residents/${residentID}`
    );

    const genderResolved = memberData.gender === "Others"
        ? (memberData.genderOther || "Others")
        : (memberData.gender || memberData.genderOrientation || "");

    const resident = {
        residentID: residentID,
        householdID: cleanID,
        role: memberData.isBranchHead && branchID !== "BR-001" ? "Branch Head" : (memberData.role || "Member"),
        userID: hhUserID,
        idNumber: memberData.idNumber || "",

        firstName: memberData.firstName || "",
        middleName: memberData.middleName || "",
        lastName: memberData.lastName || "",
        suffix: memberData.suffix === "None" ? "" : (memberData.suffix || ""),

        birthDate: memberData.birthDate || "",
        age: memberData.age ? Number(memberData.age) : null,
        birthPlace: memberData.birthPlace || "",
        sex: memberData.sex || "",
        gender: genderResolved,
        genderOrientation: genderResolved,
        civilStatus: memberData.civilStatus || "",
        religion: memberData.religion || "",
        citizenship: memberData.citizenship || "Filipino",
        residingSinceYear: memberData.residingSinceYear ? Number(memberData.residingSinceYear) : null,
        contactNumber: memberData.contactNumber
            ? Number(String(memberData.contactNumber).replace(/\D/g, ""))
            : null,
        email: (memberData.email || "").trim().toLowerCase(),

        categories: Array.isArray(memberData.categories)
            ? memberData.categories
            : memberData.category
                ? String(memberData.category).split(",").map(s => s.trim()).filter(Boolean)
                : [],
        pwdStatus: memberData.pwdStatus || "",
        disabilityType: memberData.disabilityType === "Others"
            ? (memberData.disabilityTypeOther || "Others")
            : (memberData.disabilityType || ""),
        disabilityTypeOther: memberData.disabilityTypeOther || "",

        educationAttainment: memberData.educationAttainment || "",
        educationStatus: memberData.educationStatus || "",
        occupation: memberData.occupation || "",
        employmentStatus: memberData.employmentStatus || "",

        sameAddress: memberData.sameAddress !== undefined ? !!memberData.sameAddress : true,
        branchID,

        idImageUrl: idImageUrl || "",
        selfieImageUrl: selfieImageUrl || "",
        idImage: idImageUrl || "",
        selfieImage: selfieImageUrl || "",
        pinHash: null,
        createdAt: serverTimestamp(),
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    if (!memberData.sameAddress) {
        resident.houseNumber = memberData.houseNumber || "";
        resident.street = memberData.street || "";
        resident.barangay = memberData.barangay || "Malanday";
        resident.city = memberData.city || "Valenzuela City";
        resident.province = memberData.province || "";
        resident.region = memberData.region || "NCR";
    }

    await setDoc(newMemberRef, resident);
    return residentID;
};
