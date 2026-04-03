import {
    collection,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export const addHouseholdMember = async (householdID, memberData) => {
    if (!householdID) throw new Error("Household ID is required.");

    const membersRef = collection(db, "households", householdID, "members");

    const docRef = await addDoc(membersRef, {
        ...memberData,
        addedAt: serverTimestamp(),
    });

    return docRef.id;
};