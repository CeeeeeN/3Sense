export const getFamilyNumber = (householdID, branchID) => {
    if (!householdID) return null;
    const effectiveBranch = branchID || "BR-001";
    const num = parseInt(effectiveBranch.replace("BR-", ""), 10);
    if (isNaN(num)) return null;
    return `${householdID}-${num}`;
};

export const formatHouseholdNumbers = (householdID, branchID) => {
    return {
        householdNumber: householdID || null,
        familyNumber: getFamilyNumber(householdID, branchID),
    };
};
