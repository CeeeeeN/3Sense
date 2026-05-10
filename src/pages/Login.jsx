import barangayLogo from "./barangay-logo.jpg";
import { useState, useEffect, useCallback } from "react";
import { loginWithHouseholdID, getMemberPin, saveMemberPin, verifyMemberPin, resetMemberPin } from "../services/login";
import {LoginLockIcon, LoginHomeIcon, LoginArrowIcon, LoginEyeIcon, LoginEyeOffIcon, HouseholdHeadIcon, MemberIcon, IconUser} from "../components/Icons";

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

function ScreenTag({ step, icon }) {
  return (
    <div className="screen-tag">
      {icon}
      {step}
    </div>
  );
}

function ProfileCard({ profile, selected, onSelect }) {
  return (
    <div
      className={`profile-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(profile)}
    >
      <div 
        className="profile-avatar" 
        style={{ 
          background: profile.color,
          overflow: "hidden"
        }}
      >
        {profile.profilePhoto ? (
          <img 
            src={profile.profilePhoto} 
            alt={profile.name} 
            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
          />
        ) : (
          profile.initials
        )}
      </div>
      <div className="profile-info">
        <div className="profile-name">{profile.name}</div>
        <div className={`profile-badge ${profile.role === "head" ? "badge-head" : "badge-member"}`}>
          {profile.role === "head" ? <HouseholdHeadIcon /> : <MemberIcon />}
          {profile.role === "head" ? "Household Head" : "Member"}
        </div>
      </div>
      <div className="profile-check">{selected ? "✓" : ""}</div>
    </div>
  );
}

function PinDot({ filled, error }) {
  let cls = "pin-dot";
  if (error) cls += " error";
  else if (filled) cls += " filled";
  return <div className={cls} />;
}

// ADDED onAddMember to props
export default function Login({ onBack, onForgotPassword, onSuccess, onRegister, onActivate, onAddMember }) {
  const [screen, setScreen]                   = useState("credentials");
  const [screenKey, setScreenKey]             = useState(0);
  const [hhNumber, setHhNumber]               = useState("");
  const [password, setPassword]               = useState("");
  const [showPw, setShowPw]                   = useState(false);
  const [profiles, setProfiles]               = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [pinValue, setPinValue]               = useState("");
  const [pinError, setPinError]               = useState(false);
  const [firstPin, setFirstPin]               = useState("");
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [pinLabel, setPinLabel]               = useState("Enter PIN");
  const [hasExistingPin, setHasExistingPin]   = useState(false);
  const [redirectProgress, setRedirectProgress] = useState(0);
  const [loginLoading, setLoginLoading]       = useState(false);

  function switchScreen(s) {
    setScreen(s);
    setScreenKey(k => k + 1);
  }

  async function handleLogin() {
    if (!hhNumber.trim() || !password) return;
    setLoginLoading(true);
    try {
      const result = await loginWithHouseholdID(hhNumber.trim(), password);
      const COLORS = [
        "linear-gradient(135deg,#1a4f8a,#2563b0)",
        "linear-gradient(135deg,#317D89,#3fa3b3)",
        "linear-gradient(135deg,#6a3fa3,#8b5fcb)",
        "linear-gradient(135deg,#0d7a55,#13a87a)",
        "linear-gradient(135deg,#e8a020,#f5c04a)",
      ];
      const mapped = result.residents.map((m, i) => {
        const fullName = [m.firstName, m.lastName].filter(Boolean).join(" ") || `Member ${i + 1}`;
        const initials = ((m.firstName?.[0] || "") + (m.lastName?.[0] || "M")).toUpperCase();
        return {
          id: m.id,
          userID: m.userID || "",
          name: fullName,
          initials: initials || "M",
          role: m.role === "head" ? "head" : "member",
          color: COLORS[i % COLORS.length],
          profilePhoto: m.profilePhoto || null,
        };
      });
      // head always first
      mapped.sort((a, b) => (a.role === "head" ? -1 : 1));
      setProfiles(mapped);
      switchScreen("profiles");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleContinueToPin() {
    if (!selectedProfile) return;
    setPinValue(""); setFirstPin(""); setIsConfirmingPin(false);
    // Check Firestore for existing PIN
    const existingPinHash = await getMemberPin(hhNumber.trim(), selectedProfile.id);
    if (existingPinHash) {
      setHasExistingPin(true);
      setPinLabel("Enter your PIN");
    } else {
      setHasExistingPin(false);
      setPinLabel("Create your PIN");
    }
    switchScreen("pin");
  }

  const handlePinPress = useCallback((digit) => {
    setPinValue(prev => prev.length >= 4 ? prev : prev + digit);
  }, []);

  const handlePinDelete = useCallback(() => {
    setPinValue(prev => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    if (pinValue.length === 4) {
      const timer = setTimeout(async () => {
        if (hasExistingPin) {
          // Returning user — verify against Firestore hash
          const isCorrect = await verifyMemberPin(hhNumber.trim(), selectedProfile?.id, pinValue);
          if (isCorrect) {
            loginSuccess();
          } else {
            setPinError(true);
            setPinLabel("Wrong PIN. Try again.");
            setTimeout(() => {
              setPinError(false);
              setPinValue("");
              setPinLabel("Enter your PIN");
            }, 700);
          }
        } else {
          // First time — create PIN flow
          if (!isConfirmingPin) {
            setFirstPin(pinValue);
            setPinValue("");
            setIsConfirmingPin(true);
            setPinLabel("Confirm your PIN");
          } else {
            if (pinValue === firstPin) {
              // Save hashed PIN to Firestore
              await saveMemberPin(hhNumber.trim(), selectedProfile?.id, pinValue);
              loginSuccess();
            } else {
              setPinError(true);
              setPinLabel("PINs do not match. Try again.");
              setTimeout(() => {
                setPinError(false); setPinValue(""); setFirstPin("");
                setIsConfirmingPin(false); setPinLabel("Create your PIN");
              }, 700);
            }
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pinValue, isConfirmingPin, firstPin, hasExistingPin, hhNumber, selectedProfile]);

  function loginSuccess() {
    switchScreen("success");
    setTimeout(() => setRedirectProgress(100), 100);
    setTimeout(() => {
      if (onSuccess) onSuccess({
        ...selectedProfile,
        memberID:    selectedProfile.id,
        householdID: hhNumber.trim(),
        userID:      selectedProfile.userID || "",
      });
    }, 2200);
  }

  useEffect(() => {
    if (screen !== "pin") return;
    function onKey(e) {
      if (e.key >= "0" && e.key <= "9") handlePinPress(e.key);
      if (e.key === "Backspace") handlePinDelete();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, handlePinPress, handlePinDelete]);

  async function handleForgotPin() {
    if (!window.confirm("Reset your PIN? A notification will be sent to your registered email.")) return;
    try {
      const masked = await resetMemberPin(hhNumber.trim(), selectedProfile?.id);
      alert(`PIN reset successfully. A notification was sent to ${masked}.\nYou will be asked to create a new PIN on your next login.`);
      switchScreen("profiles");
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  return (
    <div className="brgy-root">

      {/* LEFT PANEL — desktop only */}
      <div className="left-panel">
        <div className="left-logo" onClick={onBack} style={{ cursor: "pointer" }}>
          <img src={barangayLogo} alt="Barangay Logo" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          <div className="left-logo-text">
            Barangay 3S+ Malanday
            <span>Community Management System</span>
          </div>
        </div>
        <div className="left-content">
          <h2>Your barangay,<br /><span style={{ color: "#D9E232" }}>at your fingertips.</span></h2>
          <p>Sign in to manage your household, request documents, and access all barangay services — securely and conveniently.</p>

          <div
            className="feature-pills"
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem" }}
          >
            {[
              [
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                "Manage your household profile"
              ],
              [
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
                "Track document requests in real time"
              ],
              [
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
                "Stay updated with barangay announcements"
              ],
              [
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
                "Quick access to emergency services"
              ],
            ].map(([icon, text]) => (
              <div
                className="pill"
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "999px",
                  padding: "0.45rem 0.85rem",
                  fontSize: "0.78rem",
                  color: "rgba(255,255,255,0.85)",
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  className="pill-icon"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  {icon}
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="left-footer">© 2026 Barangay 3S+ Malanday. All rights reserved.</div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <div className="login-box">

          {/* ── STEP 1: Credentials ── */}
          {screen === "credentials" && (
            <div key={screenKey} className="screen-enter">
              <MobileHeader onBack={onBack} />
              <div className="act-screen-tag"> <LoginLockIcon /> Step 1 of 3 </div>
              <h2 className="screen-title">Welcome back!</h2>
              <p className="screen-sub">Enter your Household Number and password to continue.</p>

              <div className="field">
                <label>Household Number</label>
                <div className="input-wrap">
                  <span className="field-icon"><LoginHomeIcon /></span>
                  <input type="text" placeholder="e.g. MAL-2026-00142"
                    value={hhNumber} onChange={e => setHhNumber(e.target.value)}
                    autoComplete="off" onKeyDown={e => e.key === "Enter" && handleLogin()} />
                </div>
              </div>

              <div className="field">
                <label>Password</label>
                <div className="input-wrap has-toggle">
                  <span className="field-icon"><LoginLockIcon /></span>
                  <input type={showPw ? "text" : "password"} placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()} />
                  <button className="toggle-pw" onClick={() => setShowPw(v => !v)} type="button">
                    {showPw ? <LoginEyeOffIcon /> : <LoginEyeIcon />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                <button className="btn-ghost-sm" onClick={onForgotPassword}>Forgot password?</button>
              </div>

              <button className="act-btn-main" onClick={handleLogin} disabled={!hhNumber.trim() || !password || loginLoading}>
                {loginLoading ? "Signing in..." : <> Login <LoginArrowIcon /> </>}
              </button>

              <div className="divider">or</div>

              <div className="act-bottom-link">
                Don't have an account? <a onClick={onRegister}>Register Household</a>
              </div>
              <div className="act-bottom-link" style={{ marginTop: "0.5rem" }}>
                Have an approval email? <a onClick={onActivate}>Activate Account</a>
              </div>
            </div>
          )}

          {/* ── STEP 2: Profile Selection ── */}
          {screen === "profiles" && (
            <div key={screenKey} className="screen-enter">
              <MobileHeader onBack={onBack} />
              <div className="act-screen-tag"> <LoginLockIcon /> Step 2 of 3 </div>
              <h2 className="screen-title">Select Your Profile</h2>
              <p className="screen-sub">Choose which household member you are to continue.</p>

              <div className="profile-grid">
                {profiles.map(profile => (
                  <ProfileCard key={profile.id} profile={profile}
                    selected={selectedProfile?.id === profile.id}
                    onSelect={setSelectedProfile} />
                ))}
              </div>

              <button className="act-btn-main" onClick={handleContinueToPin} disabled={!selectedProfile}>
                Continue <LoginArrowIcon />
              </button>

              <button 
                onClick={() => onAddMember && onAddMember(hhNumber.trim())}
                style={{ 
                  width: "100%", 
                  marginTop: "0.75rem", 
                  padding: "14px", 
                  background: "#fff", 
                  border: "1.5px solid #317D89", 
                  color: "#317D89", 
                  borderRadius: "12px", 
                  fontSize: "0.95rem", 
                  fontWeight: 600, 
                  cursor: "pointer", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: "8px" 
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Add New Member
              </button>

              <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
                <button className="btn-ghost-sm" onClick={() => switchScreen("credentials")}>← Back</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: PIN ── */}
          {screen === "pin" && (
            <div key={screenKey} className="screen-enter">
              <MobileHeader onBack={onBack} />
              <div className="act-screen-tag"> <LoginLockIcon /> Step 3 of 3 </div>
              <h2 className="screen-title">
                {hasExistingPin
                  ? "Enter Your PIN"
                  : isConfirmingPin ? "Confirm Your PIN" : "Create Your PIN"}
              </h2>
              <p className="screen-sub">
                {hasExistingPin
                  ? "Enter your 4-digit PIN to access your profile."
                  : "Set a 4-digit PIN to secure your profile."}
              </p>

              <div className="pin-profile-mini">
                <div 
                  className="mini-avatar" 
                  style={{ 
                    background: selectedProfile?.color,
                    overflow: "hidden"
                  }}
                >
                  {selectedProfile?.profilePhoto ? (
                    <img 
                      src={selectedProfile.profilePhoto} 
                      alt={selectedProfile.name} 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                  ) : (
                    selectedProfile?.initials
                  )}
                </div>
                <span className="mini-name">{selectedProfile?.name}</span>
              </div>

              <div className="pin-label">{pinLabel}</div>
              <div className="pin-dots">
                {[0, 1, 2, 3].map(i => (
                  <PinDot key={i} filled={i < pinValue.length} error={pinError} />
                ))}
              </div>

              <div className="pin-pad">
                {["1","2","3","4","5","6","7","8","9"].map(d => (
                  <button key={d} className="pin-key" onClick={() => handlePinPress(d)}>{d}</button>
                ))}
                <button className="pin-key empty" disabled />
                <button className="pin-key" onClick={() => handlePinPress("0")}>0</button>
                <button className="pin-key del" onClick={handlePinDelete}>⌫</button>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "0.5rem" }}>
                <button className="btn-ghost-sm" onClick={() => switchScreen("profiles")}>← Back to Profiles</button>
                {hasExistingPin && (
                  <button className="btn-ghost-sm" onClick={handleForgotPin}>Forgot PIN?</button>
                )}
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {screen === "success" && (
            <div key={screenKey} className="screen-enter">
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div className="success-wrap">✅</div>
                <h2 className="screen-title" style={{ marginBottom: "0.5rem" }}>Login Successful!</h2>
                <p className="screen-sub" style={{ marginBottom: "2rem" }}>Redirecting you to your dashboard...</p>
                <div style={{ width: "100%", height: "4px", background: "var(--border)", borderRadius: "100px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "var(--teal)", borderRadius: "100px", width: `${redirectProgress}%`, transition: "width 2s ease" }} />
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.75rem", fontFamily: "'Inter',sans-serif" }}>
                  Taking you to <strong>{selectedProfile?.name}</strong>'s dashboard
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}