import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminStyle.css";
import { auth, db } from "../firebase/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

const LoginPage = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const togglePassword = () => setPasswordVisible(!passwordVisible);

  const getEmailFromUsername = async (username) => {
    const approvedQ = query(
      collection(db, "approvedAdmins"),
      where("username", "==", username)
    );
    const approvedSnap = await getDocs(approvedQ);
    if (!approvedSnap.empty) {
      return approvedSnap.docs[0].data().email;
    }

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
      const isEmail = identifier.includes("@");
      let emailToUse = identifier;

      if (!isEmail) {
        const foundEmail = await getEmailFromUsername(identifier);
        if (!foundEmail) {
          setError("No account found with that username.");
          setLoading(false);
          return;
        }
        emailToUse = foundEmail;
      }

      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      const user = userCredential.user;

      const approvedQ = query(
        collection(db, "approvedAdmins"),
        where("uid", "==", user.uid)
      );
      const approvedSnapshot = await getDocs(approvedQ);

      if (!approvedSnapshot.empty) {
        const adminDoc = approvedSnapshot.docs[0].data();
        const adminData = {
          fullName: adminDoc.fullName || adminDoc.username || "Admin",
          position: adminDoc.position || "Admin",
          role: adminDoc.role || adminDoc.position || "Super Admin",
        };
        sessionStorage.setItem("adminUserData", JSON.stringify(adminData));
        navigate("/admin/dashboard");
        return;
      }

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

  const adminFeatures = [
    {
      title: "Manage document requests",
      desc: "Review, issue, and track barangay clearances and certificates.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="15" y2="16" />
        </svg>
      ),
    },
    {
      title: "Resident & household management",
      desc: "Maintain demographic databases and resident verification status.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: "Post barangay announcements",
      desc: "Broadcast emergency alerts and official community notices.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      title: "View reports and analytics",
      desc: "Generate summary data on incidents and service analytics.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  return (
    <div className="login-page">
      <div className="left-panel">
        <a className="left-logo">
          <img src="/icons/logo.png" className="logo-img" alt="Logo" />
          <div className="left-logo-text">
            Barangay 3S+ Malanday
            <span>Administrative Management System</span>
          </div>
        </a>

        <div className="left-content">
          <h2>
            Administrative <span>Control Panel</span>
          </h2>
          <p>
            Secure access for authorized barangay officials to manage residents,
            documents, reports, and announcements.
          </p>

          <ul className="admin-features-list">
            {adminFeatures.map((f) => (
              <li className="admin-feature-item" key={f.title}>
                <span className="admin-feature-icon">{f.icon}</span>
                <div className="admin-feature-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer">© 2026 Barangay 3S+ Malanday. All rights reserved.</div>
      </div>

      <div className="right-panel">
        <div className="login-box">
          <div className="screen-tag">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Admin Access
          </div>

          <h2>Welcome back!</h2>
          <p>Enter your Administrator credentials to continue.</p>

          {error && (
            <div className="login-alert-error">
              {error}
            </div>
          )}

          {resetSent && (
            <div className="login-alert-success">
              Password reset email sent! Check your inbox.
            </div>
          )}

          <form id="adminLoginForm" onSubmit={handleSubmit}>
            <div className="field">
              <label>Username / Email</label>
              <div className="input-wrap">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin@malanday.gov.ph"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="input-wrap has-toggle">
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="btn-ghost-sm"
              >
                {resetLoading ? "Sending..." : "Forgot password?"}
              </button>
            </div>

            <button type="submit" className="btn-main" disabled={loading}>
              {loading ? "Signing in..." : <>Sign In <span style={{ marginLeft: "4px" }}>&rarr;</span></>}
            </button>
          </form>

          <div className="divider">or</div>

          <div className="bottom-link">
            Need access? <Link to="/admin/signup">Request Admin Approval</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;