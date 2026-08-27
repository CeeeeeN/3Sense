import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
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

    let idImageUrl = "";
    if (formData.idImage || formData.idImageUrl) {
        idImageUrl = await uploadToCloudinary(
            formData.idImage || formData.idImageUrl,
            `3Sense/pending_registrations/${registrationID}`
        );
    }

    const selfieImageUrl = await uploadToCloudinary(
        formData.selfieImage || formData.selfieImageUrl,
        `3Sense/pending_registrations/${registrationID}`
    );

    const genderResolved = formData.gender === "Others" 
        ? (formData.genderOther || "Others") 
        : (formData.gender || formData.genderOrientation || "");

    await setDoc(pendingRef, {
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

    return registrationID;
};
