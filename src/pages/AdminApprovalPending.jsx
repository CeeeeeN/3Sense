import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../AdminStyle.css";
import { auth, db } from "../firebase/firebase";                     // 🆕 import Firebase
import { collection, query, where, getDocs } from "firebase/firestore"; // 🆕 Firestore
import { onAuthStateChanged } from "firebase/auth";         // 🆕 Auth

const ApprovalPending = () => {
  const [userData, setUserData] = useState(null);   // 🆕 store user's profile
  const [loading, setLoading] = useState(true);     // 🆕 loading while fetching

  useEffect(() => {
    // 🆕 Step 1: Detect who is currently logged in
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 🆕 Step 2: Find their record in the "pendingAdmins" collection
          const q = query(
            collection(db, "pendingAdmins"),
            where("uid", "==", user.uid)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // 🆕 Step 3: Save their profile data to state
            const data = querySnapshot.docs[0].data();
            setUserData(data);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      setLoading(false);
    });

    // Cleanup listener when page unmounts
    return () => unsubscribe();
  }, []);

  return (
    <div className="auth-section">
      <nav>
        <Link to="/landing-page" className="nav-logo">
          <img src="/icons/logo.png" alt="Logo" className="logo-img" />
          <div className="nav-logo-text">Barangay 3S+ Malanday</div>
        </Link>
      </nav>

      <div className="pending-card">
        <div
          className="icon"
          style={{
            width: "80px",
            height: "80px",
            background: "var(--teal)",
            color: "white",
            fontSize: "2.5rem",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          ⏳
        </div>

        <h2 className="auth-title">Approval Pending</h2>

        {/* 🆕 Show loading while fetching from Firebase */}
        {loading ? (
          <p className="auth-sub">Loading your details...</p>
        ) : userData ? (
          // 🆕 Show personalized info fetched from Firestore
          <>
            <p className="auth-sub">
              Hi <strong>{userData.fullName}</strong>! Your admin registration
              request has been submitted successfully.
            </p>

            {/* 🆕 Summary card of what they submitted */}
            <div style={{
              background: "#f5f5f5",
              borderRadius: "10px",
              padding: "16px",
              margin: "16px 0",
              textAlign: "left",
              fontSize: "14px"
            }}>
              <p><strong>📧 Email:</strong> {userData.email}</p>
              <p><strong>👤 Username:</strong> {userData.username}</p>
              <p><strong>💼 Position:</strong> {userData.position}</p>
              <p><strong>📋 Status:</strong>{" "}
                <span style={{ color: "#f0ad4e", fontWeight: "bold" }}>
                  ⏳ Pending Approval
                </span>
              </p>
            </div>
          </>
        ) : (
          // Fallback if no data found
          <p className="auth-sub">
            Your admin registration request has been submitted successfully.
          </p>
        )}

        <p className="auth-sub">
          Please wait for Barangay verification and approval. You will be
          notified once your account is reviewed.
        </p>

        <Link to="/login" className="btn-pending">
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ApprovalPending;