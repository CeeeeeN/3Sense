import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const submitRegistration = async (formData) => {

    const docRef = await addDoc(
        collection(db, "pending_registrations"),
        {
            ...formData,
            status: "pending",
            createdAt: serverTimestamp()
        }
    );

    return docRef.id;

};
