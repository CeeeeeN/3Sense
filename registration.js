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
    // 1. Hard Validation Requirement: Only Selfie Image is mandatory
    if (!formData.selfieImage) {
        throw new Error("Selfie image is REQUIRED before submission succeeds.");
    }

    // 2. Generate the ID first so we can organize the Cloudinary folders cleanly
    const pendingRef = doc(collection(db, "pending_registrations"));
    const registrationID = pendingRef.id;

    // 3. Upload Images to Cloudinary (Upload ID image conditionally)
    let idImageUrl = null;
    if (formData.idImage) {
        idImageUrl = await uploadToCloudinary(
            formData.idImage,
            `3Sense/pending_registrations/${registrationID}`
        );
    }

    const selfieImageUrl = await uploadToCloudinary(
        formData.selfieImage,
        `3Sense/pending_registrations/${registrationID}`
    );

    // 4. Save to Firestore with the Cloudinary URLs
    await setDoc(pendingRef, {
        // Personal Info
        idNumber: formData.idNumber || "",
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

        // Meta & Cloudinary Images
        idImageUrl: idImageUrl || "",
        selfieImageUrl,
        status: "pending",
        createdAt: serverTimestamp(),
    });

    return registrationID;
};