import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const getMemberProfile = async (householdID, residentID) => {
    if (!householdID || !residentID) throw new Error("Missing household or resident ID.");

    const residentRef = doc(db, "households", householdID, "residents", residentID);
    const residentSnap = await getDoc(residentRef);

    if (!residentSnap.exists()) throw new Error("Resident profile not found.");

    const d = residentSnap.data();

    // If the resident shares the household address, load it from the household doc
    let address = {
        houseNumber: d.houseNumber || "",
        street: d.street || "",
        barangay: d.barangay || "",
        city: d.city || "",
        province: d.province || "",
        region: d.region || "",
    };

    const hasOwnAddress = !!(d.houseNumber || d.street || d.barangay || d.city);
    const sameAddress = d.sameAddress !== undefined ? !!d.sameAddress : !hasOwnAddress;

    const householdRef = doc(db, "households", householdID);
    const householdSnap = await getDoc(householdRef);
    const h = householdSnap.exists() ? householdSnap.data() : {};

    if (sameAddress) {
        address = {
            houseNumber: h.houseNumber || "",
            street: h.street || "",
            barangay: h.barangay || "",
            city: h.city || "",
            province: h.province || "",
            region: h.region || "",
        };
    }

    const normalizedCategories = Array.isArray(d.categories)
        ? d.categories
        : d.category
            ? String(d.category)
                .split(",")
                .map(s => s.trim())
                .filter(Boolean)
            : [];

    // Normalize status history — each entry is a plain object stored via arrayUnion
    const rawHistory = Array.isArray(d.statusHistory) ? d.statusHistory : [];
    const statusHistory = rawHistory
        .map(entry => ({
            status: entry.status || "Clear Case",
            remarks: entry.remarks || "",
            incident: entry.incident || "",
            setBy: entry.setBy || "Admin",
            setByPosition: entry.setByPosition || "",
            // setAt is stored as ISO string
            setAt: entry.setAt || null,
        }))
        // Sort newest first
        .sort((a, b) => {
            if (!a.setAt) return 1;
            if (!b.setAt) return -1;
            return new Date(b.setAt) - new Date(a.setAt);
        });

    return {
        role: d.role || "member",
        firstName: d.firstName || "",
        middleName: d.middleName || "",
        lastName: d.lastName || "",
        suffix: d.suffix || "",

        birthDate: d.birthDate || "",
        age: d.age ?? null,
        birthPlace: d.birthPlace || "",
        sex: d.sex || "",
        civilStatus: d.civilStatus || "",
        religion: d.religion || "",
        citizenship: d.citizenship || "",
        contactNumber: d.contactNumber ?? null,
        email: d.email || "",

        ...address,
        sameAddress,

        categories: normalizedCategories,
        pwdStatus: d.pwdStatus || "",
        disabilityType: d.disabilityType || "",

        totalMembers: d.totalMembers ?? d.householdMembers ?? h.totalMembers ?? "",
        householdClassification: d.householdClassification || h.householdClassification || "",

        educationAttainment: d.educationAttainment || "",
        educationStatus: d.educationStatus || "",
        occupation: d.occupation || "",
        employmentStatus: d.employmentStatus || "",

        // Admin-managed record status
        adminStatus: d.adminStatus || "Clear Case",
        adminRemarks: d.adminRemarks || "",
        adminIncident: d.adminIncident || "",
        adminLastUpdatedBy: d.adminLastUpdatedBy || "",
        adminLastUpdatedByPosition: d.adminLastUpdatedByPosition || "",
        // Firestore Timestamp → JS Date for display
        adminLastUpdatedAt: d.adminLastUpdatedAt ? d.adminLastUpdatedAt.toDate().toLocaleDateString("en-PH", {
            year: "numeric", month: "short", day: "numeric"
        }) : null,

        statusHistory,
    };
};

export const updateMemberProfile = async (householdID, residentID, updatedData) => {
    if (!householdID || !residentID) throw new Error("Missing household or resident ID.");

    const residentRef = doc(db, "households", householdID, "residents", residentID);

    const normalizedCategories = Array.isArray(updatedData.categories)
        ? updatedData.categories
        : updatedData.category
            ? String(updatedData.category).split(",").map(s => s.trim()).filter(Boolean)
            : [];

    const isHead = String(updatedData.role || "").toLowerCase() === "head";
    const sameAddress = !!updatedData.sameAddress;

    const payload = {
        // Identity 
        role: isHead ? "head" : "member",
        firstName: updatedData.firstName || "",
        middleName: updatedData.middleName || "",
        lastName: updatedData.lastName || "",
        suffix: updatedData.suffix || "",

        // Personal 
        birthDate: updatedData.birthDate || "",
        age: updatedData.age ? Number(updatedData.age) : null,
        birthPlace: updatedData.birthPlace || "",
        sex: updatedData.sex || "",
        civilStatus: updatedData.civilStatus || "",
        religion: updatedData.religion || "",
        citizenship: updatedData.citizenship || "",
        contactNumber: updatedData.contactNumber
            ? Number(String(updatedData.contactNumber).replace(/\D/g, ""))
            : null,
        email: updatedData.email || "",

        categories: normalizedCategories,
        pwdStatus: updatedData.pwdStatus || "",
        disabilityType: updatedData.disabilityType || "",

        totalMembers: updatedData.totalMembers || updatedData.householdMembers || "",
        householdClassification: updatedData.householdClassification || "",

        educationAttainment: updatedData.educationAttainment || "",
        educationStatus: updatedData.educationStatus || "",
        occupation: updatedData.occupation || "",
        employmentStatus: updatedData.employmentStatus || "",

        // Always store householdID so the resident knows their household (foreign key)
        householdID,

        updatedAt: serverTimestamp(),
    };

    // Only write address fields when the member has their own address
    if (!sameAddress) {
        payload.houseNumber = updatedData.houseNumber || "";
        payload.street = updatedData.street || "";
        payload.barangay = updatedData.barangay || "";
        payload.city = updatedData.city || "";
        payload.province = updatedData.province || "";
        payload.region = updatedData.region || "";
    }

    await updateDoc(residentRef, payload);

    // Keep household master record in sync when head updates profile fields.
    if (payload.role === "head") {
        const householdRef = doc(db, "households", householdID);
        const householdSnap = await getDoc(householdRef);
        const existingHousehold = householdSnap.exists() ? householdSnap.data() : {};

        const totalMembersValue = updatedData.totalMembers ?? existingHousehold.totalMembers ?? null;

        const householdUpdate = {
            houseNumber: (sameAddress ? (updatedData.houseNumber || existingHousehold.houseNumber || "") : (payload.houseNumber || existingHousehold.houseNumber || "")),
            street: (sameAddress ? (updatedData.street || existingHousehold.street || "") : (payload.street || existingHousehold.street || "")),
            barangay: (sameAddress ? (updatedData.barangay || existingHousehold.barangay || "") : (payload.barangay || existingHousehold.barangay || "")),
            city: (sameAddress ? (updatedData.city || existingHousehold.city || "") : (payload.city || existingHousehold.city || "")),
            province: (sameAddress ? (updatedData.province || existingHousehold.province || "") : (payload.province || existingHousehold.province || "")),
            region: (sameAddress ? (updatedData.region || existingHousehold.region || "") : (payload.region || existingHousehold.region || "")),
            totalMembers: Number(totalMembersValue) || null,
            householdClassification: updatedData.householdClassification || existingHousehold.householdClassification || "",
        };

        await updateDoc(householdRef, householdUpdate);
    }
};