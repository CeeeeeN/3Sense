import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../AdminStyle.css";
import { UserIcon, EmailIcon, PhoneIcon, LockIcon, PositionIcon } from "../components/icons";
import InputField from "../components/InputField";
import { auth, db } from "../firebase/firebase";                          // 🆕 import Firebase
import { createUserWithEmailAndPassword } from "firebase/auth"; // 🆕 signup function
import { collection, addDoc } from "firebase/firestore";        // 🆕 save to database

const AdminSignup = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");       // 🆕 email state for Firebase
  const [error, setError] = useState("");       // 🆕 show Firebase errors
  const [loading, setLoading] = useState(false); // 🆕 loading state

  // 🆕 track other fields for saving to Firestore
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [position, setPosition] = useState("");

  const togglePw = () => setShowPw(!showPw);
  const toggleConfirmPw = () => setShowConfirmPw(!showConfirmPw);

  const handleContactChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4) + " " + value.slice(4);
    if (value.length > 8) value = value.slice(0, 8) + " " + value.slice(8, 12);
    setContact(value);
  };

  // 🆕 Updated handleSubmit — now creates Firebase account + saves profile
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 🆕 Step 1: Create the account in Firebase Auth using email + password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🆕 Step 2: Save extra profile info to Firestore under "pendingAdmins"
      // (They go here first because they need barangay approval before becoming admins)
      await addDoc(collection(db, "pendingAdmins"), {
        uid: user.uid,           // link to their Firebase Auth account
        fullName: fullName,
        email: email,
        contact: contact,
        username: username,
        position: position,
        status: "pending",       // 🆕 approval status — starts as "pending"
        createdAt: new Date()
      });

      // 🆕 Step 3: Redirect to approval pending page
      navigate("/approval-pending");

    } catch (err) {
      // 🆕 Show Firebase error (e.g. "email already in use")
      setError(err.message);
      setLoading(false);
    }
  };

  // Password rules (unchanged)
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasLength = password.length >= 8;
  const score = [hasUpper, hasNumber, hasLength].filter(Boolean).length;
  const strength = ["Weak", "Fair", "Strong"][score - 1];
  const strengthColor = ["#d9534f", "#f0ad4e", "#28a745"][score - 1];

  return (
    <div>
      {/* NAVBAR — unchanged */}
      <nav>
        <a href="/" className="nav-logo">
          <img src="/icons/logo.png" className="logo-img" />
          <div className="nav-logo-text">Barangay 3S+ Malanday</div>
        </a>
      </nav>

      <section className="auth-section">
        <div className="signnup-card">
          <h2 className="auth-title">Admin Registration Request</h2>
          <p className="auth-sub">Submit your credentials for Barangay approval.</p>

          {/* 🆕 Show Firebase error message */}
          {error && (
            <p style={{ color: "#d9534f", fontSize: "14px", marginBottom: "10px" }}>
              {error}
            </p>
          )}

          <form className="adminSignupForm" onSubmit={handleSubmit}>
            {/* 🆕 Added onChange to capture value */}
            <InputField
              label="Full Name"
              required
              icon={UserIcon}
              placeholder="Juan Dela Cruz"
              fullWidth
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            {/* 🆕 Added value and onChange — Firebase needs this email */}
            <InputField
              label="Email Address"
              required
              icon={EmailIcon}
              type="email"
              placeholder="yourname@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <InputField
              label="Contact Number"
              required
              icon={PhoneIcon}
              placeholder="09XX XXX XXXX"
              value={contact}
              onChange={handleContactChange}
            />

            {/* 🆕 Added onChange to capture value */}
            <InputField
              label="Username"
              required
              icon={UserIcon}
              placeholder="JDC123"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            {/* 🆕 Added onChange to capture value */}
            <InputField
              label="Position"
              required
              icon={PositionIcon}
              placeholder="Barangay Staff"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />

            {/* PASSWORD — unchanged */}
            <div className="password-container">
              <InputField
                label="Password"
                required
                icon={LockIcon}
                type={showPw ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              >
                <button type="button" className="toggle-password" onClick={togglePw}>
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </InputField>

              <div className="password-strength-left">
                <div className="strength-bar">
                  <div className="strength-fill" style={{ width: `${score * 33}%`, background: strengthColor, height: "100%", transition: "0.3s ease" }} />
                </div>
                <small className="strength-text" style={{ color: strengthColor }}>{strength}</small>
                <div className={`pw-rule ${hasLength ? "pass" : ""}`}><span className="rule-dot"></span> At least 8 characters</div>
                <div className={`pw-rule ${hasUpper ? "pass" : ""}`}><span className="rule-dot"></span> At least 1 uppercase letter</div>
                <div className={`pw-rule ${hasNumber ? "pass" : ""}`}><span className="rule-dot"></span> At least 1 number</div>
              </div>
            </div>

            {/* CONFIRM PASSWORD — unchanged */}
            <div className="password-container">
              <InputField
                label="Confirm Password"
                required
                icon={LockIcon}
                type={showConfirmPw ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              >
                <button type="button" className="toggle-password" onClick={toggleConfirmPw}>
                  {showConfirmPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </InputField>

              <div className="password-strength-left">
                <small className="match-text" style={{ color: confirmPassword && confirmPassword === password ? "#28a745" : "#d9534f" }}>
                  {confirmPassword && (confirmPassword === password ? "Passwords match" : "Passwords do not match")}
                </small>
              </div>
            </div>

            {/* 🆕 Button shows "Registering..." while Firebase is working */}
            <button type="submit" className="btn-main full-width" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <div className="auth-bottom">
            Already approved? <Link to="/">Login here</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminSignup;