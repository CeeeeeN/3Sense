import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const submitRegistration = async (formData) => {
    const docRef = await addDoc(collection(db, "pending_registrations"), {
        // Personal Info
        firstName: formData.firstName || "",
        middleName: formData.middleName || "",
        lastName: formData.lastName || "",
        suffix: formData.suffix || "",
        birthDate: formData.birthDate || "",
        age: formData.age ? Number(formData.age) : null,
        birthPlace: formData.birthPlace || "",
        sex: formData.sex || "",
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
        disabilityType: formData.disabilityType || "",

        // Education & Employment 
        educationAttainment: formData.educationAttainment || "",
        educationStatus: formData.educationStatus || "",
        occupation: formData.occupation || "",
        employmentStatus: formData.employmentStatus || "",

        // Household 
        totalMembers: formData.totalMembers ? Number(formData.totalMembers) : null,
        householdClassification: formData.householdClassification || "",

        // Meta 
        status: "pending",
        createdAt: serverTimestamp(),
    });

    return docRef.id;
};