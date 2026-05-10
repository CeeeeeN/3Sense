import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { verifyBeforeUpdateEmail } from "firebase/auth";

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

    // Resolve branch name from the branches sub-collection
    const branchID = d.branchID || (residentID === "head" ? "BR-001" : null);
    let branchName = "";
    if (branchID) {
        const branchRef = doc(db, "households", householdID, "branches", branchID);
        const branchSnap = await getDoc(branchRef);
        if (branchSnap.exists()) {
            branchName = branchSnap.data().branchName || "";
        }
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
        // Identity
        residentID:  residentID,        // Firestore doc ID
        householdID: householdID,        // parent household
        userID:      d.userID || "",     // Firebase Auth UID
        role: d.role || "Member",
        branchID:    branchID || "",
        branchName:  branchName,

        firstName:   d.firstName || "",
        middleName:  d.middleName || "",
        lastName:    d.lastName || "",
        suffix:      d.suffix || "",

        birthDate:        d.birthDate || "",
        age:              d.age ?? null,
        birthPlace:       d.birthPlace || "",
        sex:              d.sex || "",
        gender:           ["Cisgender", "Non-binary", "Transgender Man", "Transgender Woman", "Genderqueer", "Prefer not to say", ""].includes(d.genderOrientation) ? (d.genderOrientation || "") : "Others",
        genderOther:      ["Cisgender", "Non-binary", "Transgender Man", "Transgender Woman", "Genderqueer", "Prefer not to say", ""].includes(d.genderOrientation) ? "" : d.genderOrientation,
        civilStatus:      d.civilStatus || "",
        religion:         d.religion || "",
        citizenship:      d.citizenship || "",
        contactNumber:    d.contactNumber ?? null,
        email:            d.email || "",
        residingSinceYear: d.residingSinceYear ? Number(d.residingSinceYear) : null,

        ...address,
        sameAddress,

        categories:    normalizedCategories,
        pwdStatus:     d.pwdStatus || "",
        disabilityType: ["Physical Disability", "Visual Disability", "Hearing Disability", "Speech Impairment", "Intellectual Disability", "Learning Disability", "Psychosocial Disability", "Multiple Disabilities", "Chronic Illness", "Rare Disease", ""].includes(d.disabilityType) ? (d.disabilityType || "") : "Others",
        disabilityTypeOther: ["Physical Disability", "Visual Disability", "Hearing Disability", "Speech Impairment", "Intellectual Disability", "Learning Disability", "Psychosocial Disability", "Multiple Disabilities", "Chronic Illness", "Rare Disease", ""].includes(d.disabilityType) ? "" : d.disabilityType,

        totalMembers:             d.totalMembers ?? d.householdMembers ?? h.totalMembers ?? "",
        householdClassification:  d.householdClassification || h.householdClassification || "",

        educationAttainment: d.educationAttainment || "",
        educationStatus:     d.educationStatus || "",
        occupation:          d.occupation || "",
        employmentStatus:    d.employmentStatus || "",

        // Admin-managed record status
        adminStatus:         d.adminStatus || "Clear Case",
        adminRemarks:        d.adminRemarks || "",
        adminIncident:       d.adminIncident || "",
        adminLastUpdatedBy:  d.adminLastUpdatedBy || "",
        adminLastUpdatedByPosition: d.adminLastUpdatedByPosition || "",
        adminLastUpdatedAt:  d.adminLastUpdatedAt ? d.adminLastUpdatedAt.toDate().toLocaleDateString("en-PH", {
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

    const sameAddress = !!updatedData.sameAddress;

    const payload = {
        // Identity 
        role: residentID === "head" ? "Household Head" : (updatedData.role || "Member"),
        firstName: updatedData.firstName || "",
        middleName: updatedData.middleName || "",
        lastName: updatedData.lastName || "",
        suffix: updatedData.suffix || "",

        // Personal 
        birthDate: updatedData.birthDate || "",
        age: updatedData.age ? Number(updatedData.age) : null,
        birthPlace: updatedData.birthPlace || "",
        sex: updatedData.sex || "",
        genderOrientation: updatedData.gender === "Others" ? (updatedData.genderOther || "Others") : (updatedData.gender || ""),
        civilStatus: updatedData.civilStatus || "",
        religion: updatedData.religion || "",
        citizenship: updatedData.citizenship || "",
        contactNumber: updatedData.contactNumber
            ? Number(String(updatedData.contactNumber).replace(/\D/g, ""))
            : null,
        email: updatedData.email || "",
        residingSinceYear: updatedData.residingSinceYear ? Number(updatedData.residingSinceYear) : null,

        categories: normalizedCategories,
        pwdStatus: updatedData.pwdStatus || "",
        disabilityType: updatedData.disabilityType === "Others" ? (updatedData.disabilityTypeOther || "Others") : (updatedData.disabilityType || ""),

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
    if (residentID === "head" || payload.role === "Household Head" || payload.role === "head") {
        const householdRef = doc(db, "households", householdID);
        const householdSnap = await getDoc(householdRef);
        const existingHousehold = householdSnap.exists() ? householdSnap.data() : {};

        const totalMembersValue = updatedData.totalMembers ?? existingHousehold.totalMembers ?? null;
        const newEmail = payload.email || existingHousehold.email || "";

        let displayMessage = null;
        if (newEmail && existingHousehold.email && newEmail !== existingHousehold.email) {
            if (!auth.currentUser) {
                throw new Error("You must be logged in to change the household login email.");
            }
            try {
                await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
                displayMessage = `A verification link was sent to ${newEmail}. Your login email will not change until you verify it.`;
            } catch (err) {
                console.error("Firebase Auth email update failed:", err);
                if (err.code === "auth/requires-recent-login") {
                    throw new Error("For security reasons, changing the login email requires a recent login. Please log out, log back in, and try again.");
                }
                throw new Error(`Failed to initiate email change: ${err.message}`);
            }
        }

        const householdUpdate = {
            // Only update the master email if we didn't require verification, otherwise keep the old one so login doesn't break.
            email: displayMessage ? existingHousehold.email : newEmail,
            pendingEmail: displayMessage ? newEmail : null,
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

    // If an email verification was sent, we throw an error so the UI displays it,
    // but ONLY after we have successfully saved all other profile and household updates!
    if (displayMessage) {
        throw new Error(displayMessage); // This will show up in the UI as a red alert, but the save actually succeeded.
    }
    }
};