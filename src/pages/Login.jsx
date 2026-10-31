import barangayLogo from "./barangay-logo.jpg";
import { useState, useEffect, useCallback } from "react";
import { loginWithHouseholdID, getMemberPinStatus, saveMemberPin, verifyMemberPin, resetMemberPin } from "../services/login";
import { LoginLockIcon, LoginHomeIcon, LoginArrowIcon, LoginEyeIcon, LoginEyeOffIcon, HouseholdHeadIcon, MemberIcon, IconUser } from "../components/Icons";
import ErrorMessage from "../components/ErrorMessage";
import { useLanguage } from "../context/LanguageContext";

function MobileHeader({ onBack, t }) {
  return (
    <div className="mobile-auth-header" onClick={onBack} style={{ cursor: "pointer" }}>
      <img src={barangayLogo} alt="Barangay Logo" />
      <div>
        <div className="mobile-auth-header-text">
          Barangay 3S+ Malanday
          <span className="mobile-auth-header-sub">{t("landing_community_system")}</span>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ profile, selected, onSelect, t }) {
  const roleDisplay = profile.role === "Household Head"
    ? t("profile_household_head")
    : profile.role === "Branch Head"
      ? t("profile_branch_head")
      : t("login_member_label");

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
        <div className={`profile-badge ${profile.role === "Household Head" ? "badge-household-head" :
          profile.role === "Branch Head" ? "badge-head" : "badge-member"
          }`}>
          {profile.role === "Member" ? <MemberIcon /> : <HouseholdHeadIcon />}
          {roleDisplay}
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

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Login({ onBack, onForgotPassword, onSuccess, onRegister, onActivate, onAddMember }) {
  const { lang, setLang, t } = useLanguage();
  const [screen, setScreen] = useState("credentials");
  const [screenKey, setScreenKey] = useState(0);
  const [hhNumber, setHhNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState(false);
  const [firstPin, setFirstPin] = useState("");
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [pinLabel, setPinLabel] = useState(t("login_enter_pin"));
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [redirectProgress, setRedirectProgress] = useState(0);
  const [loginLoading, setLoginLoading] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const lockRemaining = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const isLocked = lockRemaining > 0;

  const loginFeatures = [
    {
      title: t("login_feat_manage"),
      desc: t("login_feat_manage_desc"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      title: t("login_feat_track"),
      desc: t("login_feat_track_desc"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      title: t("login_feat_informed"),
      desc: t("login_feat_informed_desc"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      title: t("login_feat_emergency"),
      desc: t("login_feat_emergency_desc"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  ];

  function startLock(seconds) {
    const t = Date.now();
    setNow(t);
    setLockedUntil(t + seconds * 1000);
  }

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockedUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  function toggleBranch(branchId) {
    setExpandedBranches(prev => ({ ...prev, [branchId]: !prev[branchId] }));
  }

  function switchScreen(s) {
    setScreen(s);
    setScreenKey(k => k + 1);
  }

  async function handleLogin() {
    if (!hhNumber.trim() || !password) return;
    setLoginLoading(true);
    setErrorMsg("");

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
        const fullName = [m.firstName, m.lastName].filter(Boolean).join(" ") || `${t("login_member_label")} ${i + 1}`;
        const initials = ((m.firstName?.[0] || "") + (m.lastName?.[0] || "M")).toUpperCase();

        const activeBranchID = m.branchID || "BR-001";
        const myBranch = result.branches?.find(b => b.id === activeBranchID);

        // Normalize role — backward compat with old "head" value
        const rawRole = m.role || "Member";
        const isHouseholdHead = rawRole === "Household Head" || rawRole === "head";
        const isBranchHead = !isHouseholdHead &&
          (rawRole === "Branch Head" || (myBranch ? myBranch.residentID === m.id : false));

        const displayRole = isHouseholdHead ? "Household Head"
          : isBranchHead ? "Branch Head" : "Member";

        return {
          id: m.id,
          userID: m.userID || "",
          name: fullName,
          initials: initials || "M",
          role: displayRole,
          branchID: activeBranchID,
          isBranchHead: isHouseholdHead || isBranchHead,
          color: COLORS[i % COLORS.length],
          profilePhoto: m.profilePhoto || null,
        };
      });

      mapped.sort((a) => (a.role === "Household Head" ? -1 : a.role === "Branch Head" ? 0 : 1));
      setProfiles(mapped);
      setBranches(result.branches || []);
      switchScreen("profiles");
    } catch (err) {
      let message = err.message || "An unexpected error occurred.";
      if (message.includes("auth/invalid-credential") || message.includes("auth/user-not-found") || message.includes("auth/wrong-password")) {
        message = t("login_incorrect_credentials");
      }
      setErrorMsg(message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleContinueToPin() {
    if (!selectedProfile) return;
    setPinValue(""); setFirstPin(""); setIsConfirmingPin(false);
    setPinMessage(""); setPinError(false);
    try {
      const status = await getMemberPinStatus(hhNumber.trim(), selectedProfile.id);
      if (status.hasPin) {
        setHasExistingPin(true);
        setPinLabel(t("login_enter_pin"));
      } else {
        setHasExistingPin(false);
        setPinLabel(t("login_create_pin"));
      }
      if (status.locked) startLock(status.remainingSeconds);
      else setLockedUntil(0);
    } catch (err) {
      alert(err.message || "Unable to continue right now. Please try again.");
      return;
    }
    switchScreen("pin");
  }

  const handlePinPress = useCallback((digit) => {
    if (isLocked) return;
    setPinMessage("");
    setPinValue(prev => prev.length >= 4 ? prev : prev + digit);
  }, [isLocked]);

  const handlePinDelete = useCallback(() => {
    setPinValue(prev => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    if (pinValue.length === 4 && !isLocked) {
      const timer = setTimeout(async () => {
        if (hasExistingPin) {
          let result;
          try {
            result = await verifyMemberPin(hhNumber.trim(), selectedProfile?.id, pinValue);
          } catch (err) {
            setPinMessage(err.message || "Unable to verify your PIN. Please try again.");
            setPinValue("");
            return;
          }

          if (result.ok) {
            loginSuccess();
          } else if (result.code === "NO_PIN") {
            setHasExistingPin(false);
            setPinValue("");
            setPinLabel(t("login_create_pin"));
          } else {
            if (result.code === "LOCKED") {
              setPinMessage("");
              startLock(result.remainingSeconds || 15 * 60);
            } else {
              setPinMessage(result.message || t("login_wrong_pin"));
            }
            setPinError(true);
            setPinLabel(t("login_wrong_pin"));
            setTimeout(() => {
              setPinError(false);
              setPinValue("");
              setPinLabel(t("login_enter_pin"));
            }, 700);
          }
        } else {
          // First time — create PIN flow
          if (!isConfirmingPin) {
            setFirstPin(pinValue);
            setPinValue("");
            setIsConfirmingPin(true);
            setPinLabel(t("login_confirm_pin"));
          } else {
            if (pinValue === firstPin) {
              try {
                await saveMemberPin(hhNumber.trim(), selectedProfile?.id, pinValue);
              } catch (err) {
                setPinMessage(err.message || "Unable to save your PIN. Please try again.");
                setPinValue(""); setFirstPin("");
                setIsConfirmingPin(false); setPinLabel(t("login_create_pin"));
                return;
              }
              loginSuccess();
            } else {
              setPinError(true);
              setPinLabel(t("login_pin_mismatch"));
              setTimeout(() => {
                setPinError(false); setPinValue(""); setFirstPin("");
                setIsConfirmingPin(false); setPinLabel(t("login_create_pin"));
              }, 700);
            }
          }
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pinValue, isConfirmingPin, firstPin, hasExistingPin, hhNumber, selectedProfile, isLocked, t]);

  function loginSuccess() {
    switchScreen("success");
    setTimeout(() => setRedirectProgress(100), 100);
    setTimeout(() => {
      if (onSuccess) onSuccess({
        ...selectedProfile,
        memberID: selectedProfile.id,
        householdID: hhNumber.trim(),
        userID: selectedProfile.userID || "",
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
    if (isLocked) return;
    if (!window.confirm(t("login_reset_pin_confirm"))) return;
    try {
      const masked = await resetMemberPin(hhNumber.trim(), selectedProfile?.id);
      alert(t("login_reset_pin_success", masked));
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
            <span>{t("landing_community_system")}</span>
          </div>
        </div>
        <div className="left-content">
          <h2>{t("login_left_heading")} <span style={{ color: "#D9E232" }}>{t("login_left_heading_highlight")}</span></h2>
          <p>{t("login_left_sub")}</p>

          <ul className="left-features">
            {loginFeatures.map((f) => (
              <li className="left-feature" key={f.title}>
                <span className="left-feature-icon">{f.icon}</span>
                <div className="left-feature-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="left-footer">{t("footer_rights", 2026)}</div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <div className="login-box">

          {/* ── STEP 1: Credentials ── */}
          {screen === "credentials" && (
            <div key={screenKey} className="screen-enter">
              <MobileHeader onBack={onBack} t={t} />
              <div className="act-screen-tag"> <LoginLockIcon /> {t("login_step_of", 1, 3)} </div>
              <h2 className="screen-title">{t("login_welcome")}</h2>
              <p className="screen-sub">{t("login_welcome_sub")}</p>

              <div className="field">
                <label>{t("login_hh_number")}</label>
                <div className="input-wrap">
                  <span className="field-icon"><LoginHomeIcon /></span>
                  <input type="text" placeholder="e.g. MAL-2026-00142"
                    value={hhNumber}
                    onChange={e => {
                      setHhNumber(e.target.value);
                      setErrorMsg("");
                    }}
                    autoComplete="off" onKeyDown={e => e.key === "Enter" && handleLogin()} />
                </div>
              </div>

              <div className="field">
                <label>{t("login_password")}</label>
                <div className="input-wrap has-toggle">
                  <span className="field-icon"><LoginLockIcon /></span>
                  <input type={showPw ? "text" : "password"} placeholder={t("act_pw_placeholder", "Enter your password")}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setErrorMsg("");
                    }}
                    onKeyDown={e => e.key === "Enter" && handleLogin()} />
                  <button className="toggle-pw" onClick={() => setShowPw(v => !v)} type="button">
                    {showPw ? <LoginEyeOffIcon /> : <LoginEyeIcon />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                <button className="btn-ghost-sm" onClick={onForgotPassword}>{t("login_forgot_password")}</button>
              </div>

              {errorMsg && (
                <ErrorMessage
                  message={errorMsg}
                  onDismiss={() => setErrorMsg("")}
                  style={{ marginBottom: "1rem" }}
                />
              )}

              <button className="act-btn-main" onClick={handleLogin} disabled={!hhNumber.trim() || !password || loginLoading}>
                {loginLoading ? t("login_signing_in") : <> {t("login_sign_in")} <LoginArrowIcon /> </>}
              </button>

              <div className="divider">{t("or", "or")}</div>

              <div className="act-bottom-link">
                {t("login_no_account")} <a onClick={onRegister}>{t("landing_register_btn")}</a>
              </div>
              <div className="act-bottom-link" style={{ marginTop: "0.5rem" }}>
                {t("login_need_activation")} <a onClick={onActivate}>{t("login_activate")}</a>
              </div>
            </div>
          )}

          {/* ── STEP 2: Profile Selection ── */}
          {screen === "profiles" && (
            <div key={screenKey} className="screen-enter">
              <MobileHeader onBack={onBack} t={t} />
              <div className="act-screen-tag"> <LoginLockIcon /> {t("login_step_of", 2, 3)} </div>
              <h2 className="screen-title">{t("login_step_profile")}</h2>
              <p className="screen-sub">{t("login_step_profile_sub")}</p>

              <div className="profile-groups">
                {branches.map(branch => {
                  const branchProfiles = profiles.filter(p => p.branchID === branch.id);
                  if (branchProfiles.length === 0) return null;
                  const isExpanded = expandedBranches[branch.id] === true;
                  const hasSelected = branchProfiles.some(p => p.branchID === branch.id && selectedProfile?.id === p.id);
                  return (
                    <div
                      key={branch.id}
                      className={`branch-card${hasSelected ? " has-selection" : ""}`}
                    >
                      <button
                        onClick={() => toggleBranch(branch.id)}
                        className={`branch-header-btn${isExpanded ? " expanded" : ""}`}
                      >
                        <div className="branch-header-left">
                          <div className="branch-icon-tile">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          </div>
                          <div className="branch-title-group">
                            <div className="branch-name">{branch.branchName}</div>
                            <div className="branch-member-count">
                              {branch.familyNumber || (() => {
                                const num = parseInt((branch.id || "").replace("BR-", ""), 10);
                                return !isNaN(num) ? `${hhNumber.trim()}-${num}` : "";
                              })()}
                            </div>
                            <div className="branch-member-sub">
                              {branchProfiles.length} {branchProfiles.length === 1 ? t("login_member_label") : t("login_members_label")}
                            </div>
                          </div>
                        </div>
                        <div className={`branch-chevron${isExpanded ? " expanded" : ""}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke={isExpanded ? "#317D89" : "#64748b"} strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>

                      {/* Members list */}
                      {isExpanded && (
                        <div className="branch-members-body">
                          <div className="profile-grid">
                            {branchProfiles.map(profile => (
                              <ProfileCard key={profile.id} profile={profile}
                                selected={selectedProfile?.id === profile.id}
                                onSelect={setSelectedProfile} t={t} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="act-btn-main" onClick={handleContinueToPin} disabled={!selectedProfile}>
                {t("login_continue")} <LoginArrowIcon />
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                {t("login_add_new_member")}
              </button>

              <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
                <button className="btn-ghost-sm" onClick={() => switchScreen("credentials")}>{t("reg_back", "← Back")}</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: PIN ── */}
          {screen === "pin" && (
            <div key={screenKey} className="screen-enter">
              <MobileHeader onBack={onBack} t={t} />
              <div className="act-screen-tag"> <LoginLockIcon /> {t("login_step_of", 3, 3)} </div>
              <h2 className="screen-title">
                {hasExistingPin
                  ? t("login_enter_pin")
                  : isConfirmingPin ? t("login_confirm_pin") : t("login_create_pin")}
              </h2>
              <p className="screen-sub">
                {hasExistingPin
                  ? t("login_enter_pin_sub")
                  : t("login_create_pin_sub")}
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

              <div className="pin-label">{isLocked ? t("login_account_locked") : pinLabel}</div>
              <div className="pin-dots">
                {[0, 1, 2, 3].map(i => (
                  <PinDot key={i} filled={i < pinValue.length} error={pinError} />
                ))}
              </div>

              {isLocked ? (
                <div style={{ marginBottom: "1rem" }}>
                  <ErrorMessage message={t("login_locked_message")} />
                  <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {t("login_time_remaining")}
                    </div>
                    <div
                      role="timer"
                      style={{ fontSize: "1.6rem", fontWeight: 700, color: "#b91c1c", fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatCountdown(lockRemaining)}
                    </div>
                  </div>
                </div>
              ) : (
                pinMessage && <ErrorMessage message={pinMessage} style={{ marginBottom: "1rem" }} />
              )}

              <div className="pin-pad">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => (
                  <button key={d} className="pin-key" disabled={isLocked} onClick={() => handlePinPress(d)}>{d}</button>
                ))}
                <button className="pin-key empty" disabled />
                <button className="pin-key" disabled={isLocked} onClick={() => handlePinPress("0")}>0</button>
                <button className="pin-key del" disabled={isLocked} onClick={handlePinDelete}>⌫</button>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "0.5rem" }}>
                <button className="btn-ghost-sm" onClick={() => switchScreen("profiles")}>{t("login_back_to_profiles")}</button>
                {hasExistingPin && (
                  <button className="btn-ghost-sm" onClick={handleForgotPin} disabled={isLocked} style={isLocked ? { opacity: 0.45, cursor: "not-allowed" } : undefined}>{t("login_forgot_pin")}</button>
                )}
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {screen === "success" && (
            <div key={screenKey} className="screen-enter">
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div className="success-wrap" style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 80, height: 80, borderRadius: "50%",
                  background: "linear-gradient(135deg, #e6f7f0, #d0f0e4)",
                  boxShadow: "0 8px 32px rgba(13,122,85,0.18)",
                  marginBottom: "1rem",
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0d7a55" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="screen-title" style={{ marginBottom: "0.5rem" }}>{t("login_success_title")}</h2>
                <p className="screen-sub" style={{ marginBottom: "2rem" }}>{t("login_redirecting")}</p>
                <div style={{ width: "100%", height: "4px", background: "var(--border)", borderRadius: "100px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "var(--teal)", borderRadius: "100px", width: `${redirectProgress}%`, transition: "width 2s ease" }} />
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.75rem", fontFamily: "'Inter',sans-serif" }}>
                  {t("login_taking_to")} <strong>{selectedProfile?.name}</strong>{t("login_taking_to_suffix")}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}