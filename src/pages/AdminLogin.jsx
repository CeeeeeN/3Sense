import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import '../AdminStyle.css';
import { auth, db } from "../firebase/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

const LoginPage = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const togglePassword = () => setPasswordVisible(!passwordVisible);

  // Helper: look up email by username from both collections
  const getEmailFromUsername = async (username) => {
    // Check approvedAdmins
    const approvedQ = query(
      collection(db, "approvedAdmins"),
      where("username", "==", username)
    );
    const approvedSnap = await getDocs(approvedQ);
    if (!approvedSnap.empty) {
      return approvedSnap.docs[0].data().email;
    }

    // Check pendingAdmins
    const pendingQ = query(
      collection(db, "pendingAdmins"),
      where("username", "==", username)
    );
    const pendingSnap = await getDocs(pendingQ);
    if (!pendingSnap.empty) {
      return pendingSnap.docs[0].data().email;
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Determine if input is email or username
      const isEmail = identifier.includes("@");
      let emailToUse = identifier;

      if (!isEmail) {
        // Look up email from username
        const foundEmail = await getEmailFromUsername(identifier);
        if (!foundEmail) {
          setError("No account found with that username.");
          setLoading(false);
          return;
        }
        emailToUse = foundEmail;
      }

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      const user = userCredential.user;

      // Check if user exists in approvedAdmins
      const approvedQ = query(
        collection(db, "approvedAdmins"),
        where("uid", "==", user.uid)
      );
      const approvedSnapshot = await getDocs(approvedQ);

      if (!approvedSnapshot.empty) {
        navigate("/dashboard");
        return;
      }

      // Check if still pending
      const pendingQ = query(
        collection(db, "pendingAdmins"),
        where("uid", "==", user.uid)
      );
      const pendingSnapshot = await getDocs(pendingQ);

      if (!pendingSnapshot.empty) {
        const data = pendingSnapshot.docs[0].data();
        if (data.status === "pending") {
          setError("Your account is still pending approval. Please wait.");
        } else if (data.status === "rejected") {
          setError("Your account was rejected. Contact the Barangay.");
        } else {
          setError("Your account status is unknown. Contact the Barangay.");
        }
      } else {
        setError("You are not authorized to access the admin panel.");
      }

      await auth.signOut();

    } catch (err) {
      setError("Invalid credentials. Please try again.");
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const isEmail = identifier.includes("@");
    let emailToReset = identifier;

    if (!identifier) {
      setError("Please enter your email or username first, then click Forgot Password.");
      return;
    }

    setResetLoading(true);
    setError("");
    setResetSent(false);

    try {
      if (!isEmail) {
        const foundEmail = await getEmailFromUsername(identifier);
        if (!foundEmail) {
          setError("No account found with that username.");
          setResetLoading(false);
          return;
        }
        emailToReset = foundEmail;
      }

      await sendPasswordResetEmail(auth, emailToReset);
      setResetSent(true);
    } catch (err) {
      setError("Could not send reset email. Make sure the email or username is correct.");
    }

    setResetLoading(false);
  };

  return (
    <div className="login-page">
      <div className="left-panel">
        <a className="left-logo">
          <img src="icons/logo.png" className="logo-img" alt="Logo" />
          <div className="left-logo-text">Barangay 3S+ Malanday</div>
        </a>

        <div className="left-content">
          <h2>
            Administrative<br />
            <span>Control Panel</span>
          </h2>
          <p>
            Secure access for authorized barangay officials to manage residents,
            documents, reports, and announcements.
          </p>
          <div className="feature-box">📋 Manage document requests</div>
          <div className="feature-box">👥 Resident & household management</div>
          <div className="feature-box">📢 Post barangay announcements</div>
          <div className="feature-box">📊 View reports and analytics</div>
        </div>

        <div className="footer">© 2026 Barangay 3S+ Malanday. All rights reserved.</div>
      </div>

      <div className="right-panel">
        <div className="login-box">
          <div className="screen-tag">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Admin Access
          </div>

          <h2>Welcome, Admin</h2>
          <p>Log in using your approved administrator credentials.</p>

          {error && (
            <p style={{ color: "#d9534f", fontSize: "14px", marginBottom: "10px" }}>
              {error}
            </p>
          )}

          {resetSent && (
            <p style={{ color: "#28a745", fontSize: "14px", marginBottom: "10px", background: "#f0fff4", padding: "10px", borderRadius: "8px" }}>
              ✅ Password reset email sent! Check your inbox.
            </p>
          )}

          <form id="adminLoginForm" onSubmit={handleSubmit}>
            <div className="field">
              <label>Username / Email</label>
              <div className="input-wrap">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="7" r="4"/>
                  <path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>
                </svg>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email or username"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="input-wrap has-toggle">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <button className="toggle-pw" onClick={togglePassword} type="button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {passwordVisible ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right", marginBottom: "12px" }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--teal)",
                  cursor: "pointer",
                  fontSize: "13px",
                  padding: 0,
                  textDecoration: "underline"
                }}
              >
                {resetLoading ? "Sending..." : "Forgot Password?"}
              </button>
            </div>

            <button type="submit" className="btn-main" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="bottom-link">
            Need access? <Link to="/admin/signup">Request Admin Approval</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;