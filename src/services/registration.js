import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
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

export const submitRegistration = async (formData) => {
    // 1. Validation 
    if (!formData.idImage || !formData.selfieImage) {
        throw new Error("Selfie image and ID are REQUIRED before submission succeeds.");
    }

    const pendingRef = doc(collection(db, "pending_registrations"));
    const registrationID = pendingRef.id;

    // 2. ONLY upload the Selfie. The ID image is intentionally discarded/deleted here.
    const selfieImageUrl = await uploadToCloudinary(
        formData.selfieImage, 
        `3Sense/pending_registrations/${registrationID}`
    );

    // 3. Save to Firestore
    await setDoc(pendingRef, {
        // Auto-filler Fix: Explicitly saving the idNumber
        idNumber: formData.idNumber || "",
        
        // Personal Info
        firstName: formData.firstName || "",
        middleName: formData.middleName || "",
        lastName: formData.lastName || "",
        suffix: formData.suffix || "",
        birthDate: formData.birthDate || "",
        age: formData.age ? Number(formData.age) : null,
        birthPlace: formData.birthPlace || "",
        sex: formData.sex || "",
        genderOrientation: formData.gender === "Others" ? (formData.genderOther || "Others") : (formData.gender || ""),
        civilStatus: formData.civilStatus || "",
        religion: formData.religion || "",
        citizenship: formData.citizenship || "",
        residingSinceYear: formData.residingSinceYear ? Number(formData.residingSinceYear) : null,
        contactNumber: formData.contactNumber ? Number(String(formData.contactNumber).replace(/\D/g, "")) : null,
        email: formData.email || "",

        // Address 
        houseNumber: formData.houseNumber || "",
        street: formData.street || "",
        barangay: formData.barangay || "",
        city: formData.city || "",
        province: formData.province || "",
        region: formData.region || "",

        // Category 
        categories: formData.categories || [],
        pwdStatus: formData.pwdStatus || "",
        disabilityType: formData.disabilityType === "Others" ? (formData.disabilityTypeOther || "Others") : (formData.disabilityType || ""),

        // Education & Employment 
        educationAttainment: formData.educationAttainment || "",
        educationStatus: formData.educationStatus || "",
        occupation: formData.occupation || "",
        employmentStatus: formData.employmentStatus || "",

        // Household 
        totalMembers: formData.totalMembers ? Number(formData.totalMembers) : null,
        householdClassification: formData.householdClassification || "",

        // Meta (Only saving the Selfie URL)
        selfieImageUrl,
        status: "pending",
        createdAt: serverTimestamp(),
    });

    return registrationID;
};