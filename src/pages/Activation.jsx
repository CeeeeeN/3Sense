import barangayLogo from "./barangay-logo.jpg";
import { useState } from "react";
import {HomeIcon, LockIcon, ArrowIcon, EyeIcon, EyeOffIcon} from "../components/Icons";
import { activateAccount } from "../services/activation";

function MobileHeader({ onBack }) {
  return (
    <div className="mobile-auth-header" onClick={onBack} style={{ cursor: "pointer" }}>
      <img src={barangayLogo} alt="Barangay Logo" />
      <div>
        <div className="mobile-auth-header-text">
          Barangay 3S+ Malanday
          <span className="mobile-auth-header-sub">Community Management System</span>
        </div>
      </div>
    </div>
  );
}

const GUIDE_STEPS = [
  { label: "Registration Submitted", status: "done" },
  { label: "Barangay Approval Received", status: "done" },
  { label: "Activate Your Account ← You are here", status: "active" },
  { label: "Add Household Members", status: "" },
  { label: "Log In to Your Account", status: "" },
];

export default function Activation({ onBack, onLoginClick, onSuccess }) {
  const [screen, setScreen] = useState("activate");
  const [householdID, setHouseholdID] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [confirmedId, setConfirmedId] = useState("");
  const [householdData, setHouseholdData] = useState(null);

  const pwLen   = pw1.length >= 8;
  const pwUpper = /[A-Z]/.test(pw1);
  const pwNum   = /[0-9]/.test(pw1);
  const pwScore = [pwLen, pwUpper, pwNum].filter(Boolean).length;
  const pwMatch = pw2.length > 0 && pw1 === pw2;

  const strengthColors = ["#e03e3e", "#e8a020", "#0d7a55"];
  const strengthLabels = ["Weak", "Fair", "Strong"];
  const strengthWidths = ["33%", "66%", "100%"];

  const handleActivate = async () => {
    if (!householdID.trim())   { alert("Please enter your Household ID."); return; }
    if (pw1.length < 8) { alert("Password must be at least 8 characters."); return; }
    if (pw1 !== pw2)    { alert("Passwords do not match."); return; }

    try {
      const result = await activateAccount(householdID.trim(), pw1, pw2);
      setConfirmedId(result.householdID);
      setHouseholdData(result);
      setScreen("success");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="act-root">
      {/* LEFT PANEL */}
      <div className="act-left">
        <div className="act-logo" onClick={onBack}>
          <img src={barangayLogo} alt="Barangay Logo" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          <div className="act-logo-text">
            Barangay 3S+ Malanday
            <span>Community Management System</span>
          </div>
        </div>

        <div className="act-left-content">
          <h2>Almost there!<br/><span>Activate your account.</span></h2>
          <p>Your registration has been approved by the Barangay. Complete the steps below to get started with your household account.</p>

          <div className="act-steps-guide">
            {GUIDE_STEPS.map((s, i) => (
              <div key={i} className="act-guide-step">
                <div className={`act-guide-num ${s.status}`}>
                  {s.status === "done" ? "✓" : i + 1}
                </div>
                <span className={`act-guide-text ${s.status}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="act-left-footer">© 2026 Barangay 3S+ Malanday. All rights reserved.</div>
      </div>

      {/* RIGHT PANEL */}
      <div className="act-right">
        <div className="act-form-box">

          {/* ── ACTIVATE SCREEN ── */}
          {screen === "activate" && (
            <div className="act-screen" key="activate">
              <MobileHeader onBack={onBack} />
              <div className="act-screen-tag">
                <HomeIcon /> Account Activation
              </div>
              <h2>Activate Household Account</h2>
              <p>Enter your assigned Household ID sent to your email after approval, then create a secure password.</p>

              <div className="act-field">
                <label className="act-label">Household ID <span className="req">*</span></label>
                <div className="act-input-wrap">
                  <span className="act-field-icon"><HomeIcon /></span>
                  <input
                    type="text"
                    className="act-input"
                    placeholder="MAL-2026-00142"
                    value={householdID}
                    onChange={e => setHouseholdID(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="act-divider">Password Setup</div>

              <div className="act-field">
                <label className="act-label">Create Password <span className="req">*</span></label>
                <div className="act-input-wrap">
                  <span className="act-field-icon"><LockIcon /></span>
                  <input
                    type={showPw1 ? "text" : "password"}
                    className="act-input has-toggle-pad"
                    placeholder="At least 8 characters"
                    value={pw1}
                    onChange={e => setPw1(e.target.value)}
                  />
                  <button className="act-toggle-pw" type="button" onClick={() => setShowPw1(v => !v)}>
                    {showPw1 ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className="act-strength-bar">
                  <div className="act-strength-fill" style={{
                    width: pw1 ? (strengthWidths[pwScore - 1] || "10%") : "0%",
                    background: pw1 ? (strengthColors[pwScore - 1] || "#e03e3e") : ""
                  }} />
                </div>
                <div className="act-strength-label" style={{ color: pw1 ? (strengthColors[pwScore - 1] || "#e03e3e") : "var(--muted)" }}>
                  {pw1 ? (strengthLabels[pwScore - 1] || "Weak") : "Enter a password"}
                </div>
                <div className="act-pw-rules">
                  {[
                    { pass: pwLen,   label: "At least 8 characters" },
                    { pass: pwUpper, label: "One uppercase letter" },
                    { pass: pwNum,   label: "One number" },
                  ].map((r, i) => (
                    <div key={i} className={`act-pw-rule ${r.pass ? "pass" : ""}`}>
                      <span className="act-rule-dot">{r.pass ? "✓" : ""}</span>
                      {r.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="act-field">
                <label className="act-label">Confirm Password <span className="req">*</span></label>
                <div className="act-input-wrap">
                  <span className="act-field-icon"><LockIcon /></span>
                  <input
                    type={showPw2 ? "text" : "password"}
                    className="act-input has-toggle-pad"
                    placeholder="Re-enter your password"
                    value={pw2}
                    onChange={e => setPw2(e.target.value)}
                  />
                  <button className="act-toggle-pw" type="button" onClick={() => setShowPw2(v => !v)}>
                    {showPw2 ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className={`act-pw-rule ${pwMatch ? "pass" : ""}`} style={{ marginTop: "6px" }}>
                  <span className="act-rule-dot">{pwMatch ? "✓" : ""}</span>
                  Passwords match
                </div>
              </div>

              <button className="act-btn-main" onClick={handleActivate}>
                Activate Account <ArrowIcon />
              </button>

              <div className="act-bottom-link">
                Already activated? <a onClick={onLoginClick}>Login here</a>
              </div>
            </div>
          )}

          {/* ── SUCCESS SCREEN ── */}
          {screen === "success" && (
            <div className="act-screen" key="success">
              <MobileHeader onBack={onBack} />
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div className="act-success-icon">✅</div>
                <h2 style={{ marginBottom: "0.5rem" }}>Account Activated!</h2>
                <p style={{ fontSize: "0.86rem", color: "var(--muted)", lineHeight: "1.7", marginBottom: "1.5rem" }}>
                  Your household account has been successfully activated. You can now log in and add your household members.
                </p>

                <div className="act-info-card" style={{ justifyContent: "center" }}>
                  <div className="act-info-card-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#317D89" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div className="act-info-card-label">Your Household ID</div>
                    <div className="act-info-card-value">{confirmedId}</div>
                  </div>
                </div>

                <button
                  className="act-btn-main"
                  onClick={() => { if (onSuccess) onSuccess(householdData); else onLoginClick(); }}
                  style={{ maxWidth: "300px", margin: "0 auto" }}
                >
                  Add Household Members <ArrowIcon />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}