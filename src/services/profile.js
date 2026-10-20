import { doc, getDoc, collection, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { verifyBeforeUpdateEmail } from "firebase/auth";

export const getMemberProfile = async (householdID, residentID) => {
    if (!householdID || !residentID) throw new Error("Missing household or resident ID.");

    // ─── OPTIMIZED: Cache-First Profile Load ───
    const cacheKeyResidents = `hh_residents_${householdID}`;
    const cacheKeyBranches = `hh_branches_${householdID}`;
    
    let residents = JSON.parse(localStorage.getItem(cacheKeyResidents) || "[]");
    let branches = JSON.parse(localStorage.getItem(cacheKeyBranches) || "[]");

    let d;
    // Check Cache first
    if (residents.length > 0) {
        d = residents.find(r => r.id === residentID || r.residentID === residentID);
    }
    
    // Fallback to Network if cache missed or empty
    if (!d) {
        const residentRef = doc(db, "households", householdID, "residents", residentID);
        const residentSnap = await getDoc(residentRef);
        if (!residentSnap.exists()) throw new Error("Resident profile not found.");
        d = residentSnap.data();
    }

    const hasOwnAddress = !!(d.houseNumber || d.street || d.barangay || d.city);
    const sameAddress = d.sameAddress !== undefined ? !!d.sameAddress : !hasOwnAddress;

    let address = {
        houseNumber: d.houseNumber || "",
        street: d.street || "",
        barangay: d.barangay || "",
        city: d.city || "",
        province: d.province || "",
        region: d.region || "",
    };

    let h = {};
    if (sameAddress) {
        // Fallback to Network for Household Parent
        const householdRef = doc(db, "households", householdID);
        const householdSnap = await getDoc(householdRef);
        h = householdSnap.exists() ? householdSnap.data() : {};

        address = {
            houseNumber: h.houseNumber || "",
            street: h.street || "",
            barangay: h.barangay || "",
            city: h.city || "",
            province: h.province || "",
            region: h.region || "",
        };
    }

    // Resolve branch name from the branches cache (or network fallback)
    const branchID = d.branchID || (residentID === "head" ? "BR-001" : "BR-001");
    let branchName = "";
    let familyNumber = null;
    
    if (branchID) {
        let branchData;
        if (branches.length > 0) {
            branchData = branches.find(b => b.id === branchID);
        } else {
            const branchRef = doc(db, "households", householdID, "branches", branchID);
            const branchSnap = await getDoc(branchRef);
            if (branchSnap.exists()) branchData = branchSnap.data();
        }

        if (branchData) {
            branchName = branchData.branchName || "";
            if (branchData.familyNumber) {
                familyNumber = branchData.familyNumber;
            } else {
                const num = parseInt(branchID.replace("BR-", ""), 10);
                if (!isNaN(num)) familyNumber = `${householdID}-${num}`;
            }
        } else {
            const num = parseInt(branchID.replace("BR-", ""), 10);
            if (!isNaN(num)) familyNumber = `${householdID}-${num}`;
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

    const rawHistory = Array.isArray(d.statusHistory) ? d.statusHistory : [];
    const statusHistory = rawHistory
        .map(entry => ({
            status: entry.status || "Clear Case",
            remarks: entry.remarks || "",
            incident: entry.incident || "",
            setBy: entry.setBy || "Admin",
            setByPosition: entry.setByPosition || "",
            setAt: entry.setAt || null,
        }))
        .sort((a, b) => {
            if (!a.setAt) return 1;
            if (!b.setAt) return -1;
            return new Date(b.setAt) - new Date(a.setAt);
        });

    return {
        UID:         d.UID || "",
        residentID:  residentID,
        householdID: householdID,
        householdNumber: householdID,
        familyNumber,
        userID:      d.userID || "",
        role: d.role || "Member",
        branchID:    branchID || "",
        branchName:  branchName,
        profilePhoto: d.profilePhoto || null,

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
    const batch = writeBatch(db); // ─── OPTIMIZED: Batched Atomic Write ───

    const normalizedCategories = Array.isArray(updatedData.categories)
        ? updatedData.categories
        : updatedData.category
            ? String(updatedData.category).split(",").map(s => s.trim()).filter(Boolean)
            : [];

    const sameAddress = !!updatedData.sameAddress;

    const payload = {
        role: residentID === "head" ? "Household Head" : (updatedData.role || "Member"),
        firstName: updatedData.firstName || "",
        middleName: updatedData.middleName || "",
        lastName: updatedData.lastName || "",
        suffix: updatedData.suffix || "",
        birthDate: updatedData.birthDate || "",
        age: updatedData.age ? Number(updatedData.age) : null,
        birthPlace: updatedData.birthPlace || "",
        sex: updatedData.sex || "",
        genderOrientation: updatedData.gender === "Others" ? (updatedData.genderOther || "Others") : (updatedData.gender || ""),
        civilStatus: updatedData.civilStatus || "",
        religion: updatedData.religion || "",
        citizenship: updatedData.citizenship || "",
        contactNumber: updatedData.contactNumber ? Number(String(updatedData.contactNumber).replace(/\D/g, "")) : null,
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
        householdID,
        updatedAt: serverTimestamp(),
    };

    if (updatedData.UID !== undefined) payload.UID = updatedData.UID;
    if (updatedData.profilePhoto !== undefined) payload.profilePhoto = updatedData.profilePhoto;

    if (!sameAddress) {
        payload.houseNumber = updatedData.houseNumber || "";
        payload.street = updatedData.street || "";
        payload.barangay = updatedData.barangay || "";
        payload.city = updatedData.city || "";
        payload.province = updatedData.province || "";
        payload.region = updatedData.region || "";
    }

    batch.update(residentRef, payload);

    let displayMessage = null;

    if (residentID === "head" || payload.role === "Household Head" || payload.role === "head") {
        const householdRef = doc(db, "households", householdID);
        const householdSnap = await getDoc(householdRef);
        const existingHousehold = householdSnap.exists() ? householdSnap.data() : {};

        const totalMembersValue = updatedData.totalMembers ?? existingHousehold.totalMembers ?? null;
        const newEmail = payload.email || existingHousehold.email || "";

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

        batch.update(householdRef, householdUpdate);
    }

    // Fire both updates simultaneously
    await batch.commit();

    // Fire and forget cache invalidation
    const cacheKeyResidents = `hh_residents_${householdID}`;
    localStorage.removeItem(cacheKeyResidents);

    if (displayMessage) {
        throw new Error(displayMessage); 
    }
};