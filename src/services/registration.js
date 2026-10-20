import { doc, collection, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebase";

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

export const submitRegistration = async (formData) => {
    if (!formData.selfieImage && !formData.selfieImageUrl) {
        throw new Error("Selfie image is REQUIRED before submission succeeds.");
    }

    const pendingRef = doc(collection(db, "pending_registrations"));
    const registrationID = pendingRef.id;

    // ─── OPTIMIZED: Parallel Image Uploads ───
    // Instead of waiting for ID to finish before starting Selfie, we fire both at the same time
    let idImagePromise = Promise.resolve("");
    if (formData.idImage || formData.idImageUrl) {
        idImagePromise = uploadToCloudinary(
            formData.idImage || formData.idImageUrl,
            `3Sense/pending_registrations/${registrationID}`
        );
    }

    let selfieImagePromise = uploadToCloudinary(
        formData.selfieImage || formData.selfieImageUrl,
        `3Sense/pending_registrations/${registrationID}`
    );

    // Wait for both uploads to finish simultaneously
    const [idImageUrl, selfieImageUrl] = await Promise.all([idImagePromise, selfieImagePromise]);

    const genderResolved = formData.gender === "Others" 
        ? (formData.genderOther || "Others") 
        : (formData.gender || formData.genderOrientation || "");

    // ─── OPTIMIZED: Batched Atomic Write (Registration + Notification) ───
    const batch = writeBatch(db);

    // 1. Create the Pending Registration Document
    batch.set(pendingRef, {
        idNumber: formData.idNumber || "",
        firstName: (formData.firstName || "").trim(),
        middleName: (formData.middleName || "").trim(),
        lastName: (formData.lastName || "").trim(),
        suffix: formData.suffix === "None" ? "" : (formData.suffix || ""),
        birthDate: formData.birthDate || "",
        age: formData.age ? Number(formData.age) : null,
        birthPlace: (formData.birthPlace || "").trim(),
        sex: formData.sex || "",
        gender: genderResolved,
        genderOrientation: genderResolved,
        civilStatus: formData.civilStatus || "",
        religion: (formData.religion || "").trim(),
        citizenship: formData.citizenship || "Filipino",
        residingSinceYear: formData.residingSinceYear ? Number(formData.residingSinceYear) : null,
        contactNumber: formData.contactNumber ? Number(String(formData.contactNumber).replace(/\D/g, "")) : null,
        email: (formData.email || "").trim().toLowerCase(),

        houseNumber: (formData.houseNumber || "").trim(),
        street: (formData.street || "").trim(),
        barangay: formData.barangay || "Malanday",
        city: formData.city || "Valenzuela City",
        province: (formData.province || "").trim(),
        region: formData.region || "NCR",

        categories: Array.isArray(formData.categories) ? formData.categories : (formData.category ? [formData.category] : []),
        pwdStatus: formData.pwdStatus || "",
        disabilityType: formData.disabilityType === "Others" ? (formData.disabilityTypeOther || "Others") : (formData.disabilityType || ""),
        disabilityTypeOther: formData.disabilityTypeOther || "",

        educationAttainment: formData.educationAttainment || "",
        educationStatus: formData.educationStatus || "",
        occupation: (formData.occupation || "").trim(),
        employmentStatus: formData.employmentStatus || "",

        totalMembers: formData.totalMembers ? Number(formData.totalMembers) : 1,
        householdClassification: formData.householdClassification || "",

        idImageUrl: idImageUrl || "",
        selfieImageUrl: selfieImageUrl || "",
        idImage: idImageUrl || "",
        selfieImage: selfieImageUrl || "",
        status: "pending",
        createdAt: serverTimestamp(),
    });

    // 2. Alert the Admins
    const notifRef = doc(collection(db, "notifications"));
    batch.set(notifRef, {
        type: "household_registration",
        message: `New household registration submitted by ${(formData.firstName || "").trim()} ${(formData.lastName || "").trim()}.`,
        triggeredBy: (formData.email || "").trim().toLowerCase() || "Resident",
        refNum: registrationID,
        isRead: false,
        createdAt: serverTimestamp()
    });

    // Commit both writes as a single network request
    await batch.commit();

    return registrationID;
};