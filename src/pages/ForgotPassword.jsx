import barangayLogo from "./barangay-logo.jpg";
import { useState, useEffect, useRef } from "react";
import { forgotHouseholdPassword } from "../services/login";
import { LockIcon, MailIcon, HomeIcon, ArrowIcon } from "../components/Icons";

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

export default function ForgotPassword({ onBack, onLoginClick, onRegister }) {
  const [screen, setScreen]         = useState(1);
  const [screenKey, setScreenKey]   = useState(0);
  const [hhValue, setHhValue]       = useState("");
  const [hhError, setHhError]       = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [householdId, setHouseholdId] = useState("");
  const [loading, setLoading]       = useState(false);
  const [timeLeft, setTimeLeft]     = useState(300);
  const [canResend, setCanResend]   = useState(false);
  const timerRef = useRef(null);

  const goScreen = (n) => { setScreen(n); setScreenKey(k => k + 1); };

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(300); setCanResend(false);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setCanResend(true); return 0; }
        return t - 1;
      });
    }, 1000);
  };
  useEffect(() => () => clearInterval(timerRef.current), []);

  const formatTime = (t) => `${String(Math.floor(t / 60)).padStart(2,"0")}:${String(t % 60).padStart(2,"0")}`;

  const verifyIdentity = async () => {
    if (!hhValue.trim()) { setHhError(true); return; }
    setHhError(false);
    setLoading(true);
    try {
      const masked = await forgotHouseholdPassword(hhValue.trim());
      setMaskedEmail(masked);
      setHouseholdId(hhValue.trim());
      startTimer();
      goScreen(2);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendLink = async () => {
    try {
      await forgotHouseholdPassword(householdId);
    } catch (err) {
      alert(err.message);
      return;
    }
    startTimer();
  };

  const stepStatus = (i) => {
    if (i < screen) return "done";
    if (i === screen) return "active";
    return "";
  };

  return (
    <div className="fp-root">
      {/* LEFT */}
      <div className="fp-left">
        <div className="fp-logo" onClick={onBack}>
          <img src={barangayLogo} alt="Barangay Logo" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          <div className="fp-logo-text">
            Barangay 3S+ Malanday
            <span>Community Management System</span>
          </div>
        </div>
        <div className="fp-left-content">
          <h2>Reset your<br/><span>password.</span></h2>
          <p>Enter your Household ID and we'll send a password reset link to the household head's registered email.</p>
          <div className="recovery-steps">
            {[
              { label: "Verify Identity",  sub: "Enter your Household ID" },
              { label: "Check Your Email", sub: "Reset link sent to head's email" },
            ].map((step, idx) => {
              const status = stepStatus(idx + 1);
              return (
                <div className="rstep" key={idx}>
                  <div className={`rstep-dot ${status}`}>{status === "done" ? "✓" : idx + 1}</div>
                  <div className="rstep-info">
                    <div className={`rstep-title ${status}`}>{step.label}</div>
                    <div className="rstep-sub">{step.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="fp-left-footer">© 2026 Barangay 3S+ Malanday. All rights reserved.</div>
      </div>

      {/* RIGHT */}
      <div className="fp-right">
        <div className="fp-form-box">

          {/* ── SCREEN 1: Enter Household ID ── */}
          {screen === 1 && (
            <div className="fp-screen" key={`s1-${screenKey}`}>
              <MobileHeader onBack={onBack} />
              <div className="fp-screen-tag"><LockIcon /> Password Recovery</div>
              <h2>Forgot your password?</h2>
              <p>Enter your Household ID. A password reset link will be sent to the household head's registered email address.</p>

              <div className="fp-field">
                <label className="fp-label">Household ID <span className="req">*</span></label>
                <div className="fp-input-wrap">
                  <span className="fp-field-icon"><HomeIcon /></span>
                  <input
                    type="text"
                    className={`fp-input ${hhError ? "error-state" : hhValue ? "valid-state" : ""}`}
                    placeholder="e.g. HH-2024-00142"
                    value={hhValue}
                    onChange={e => setHhValue(e.target.value)}
                    autoComplete="off"
                    onKeyDown={e => e.key === "Enter" && verifyIdentity()}
                  />
                </div>
                {hhError && <div className="field-error">Please enter your Household ID.</div>}
                <div className="field-hint">The reset link will be sent to the household head's email only.</div>
              </div>

              <button className="fp-btn-main" onClick={verifyIdentity} disabled={loading}>
                {loading ? "Sending..." : <> Send Reset Link <ArrowIcon /> </>}
              </button>
              <div style={{ display:"flex", justifyContent:"center", marginTop:"1rem" }}>
                <button className="fp-btn-ghost" onClick={onBack}>← Back to Login</button>
              </div>
              <div className="fp-bottom-link">
                Don't have an account? <a onClick={onRegister}>Register Household</a>
              </div>
            </div>
          )}

          {/* ── SCREEN 2: Reset link sent confirmation ── */}
          {screen === 2 && (
            <div className="fp-screen" key={`s2-${screenKey}`}>
              <MobileHeader onBack={onBack} />
              <div className="fp-screen-tag"><MailIcon size={12} /> Email Sent</div>
              <h2>Check your email</h2>
              <p>A password reset link has been sent to the household head's registered email address.</p>

              <div className="email-card">
                <div className="email-card-icon"><MailIcon color="#317D89" /></div>
                <div>
                  <div className="email-card-value">{maskedEmail}</div>
                  <div className="email-card-sub">Check your inbox and spam folder</div>
                </div>
              </div>

              <div className="otp-timer">
                Link expires in <strong>{formatTime(timeLeft)}</strong>
                {canResend && (
                  <button className="resend-btn" onClick={resendLink}>Resend Link</button>
                )}
              </div>

              <div style={{ background:"rgba(49,125,137,0.06)", border:"1px solid rgba(49,125,137,0.18)", borderRadius:"10px", padding:"0.9rem 1.1rem", marginTop:"1rem", fontSize:"0.83rem", color:"#4a5e5a", lineHeight:"1.7" }}>
                  Click the link in your email to reset your password. Once reset, return here and log in with your new password.
              </div>

              <button className="fp-btn-main" onClick={onLoginClick} style={{ marginTop:"1.5rem" }}>
                Back to Login <ArrowIcon />
              </button>
              <div style={{ display:"flex", justifyContent:"center", marginTop:"0.75rem" }}>
                <button className="fp-btn-ghost" onClick={() => goScreen(1)}>← Change Household ID</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}