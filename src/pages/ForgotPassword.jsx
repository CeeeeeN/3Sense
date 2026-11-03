import barangayLogo from "./barangay-logo.jpg";
import { useState, useEffect, useRef } from "react";
import { forgotHouseholdPassword } from "../services/login";
import { LockIcon, MailIcon, HomeIcon, ArrowIcon } from "../components/Icons";
import { useLanguage } from "../context/LanguageContext";

function MobileHeader({ onBack, t }) {
  return (
    <div className="mobile-auth-header" onClick={onBack} style={{ cursor: "pointer" }}>
      <img src={barangayLogo} alt="Barangay Logo" />
      <div>
        <div className="mobile-auth-header-text">
          Barangay 3S+ Malanday
          <span className="mobile-auth-header-sub">{t('landing_community_system')}</span>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPassword({ onBack, onLoginClick, onRegister }) {
  const { t } = useLanguage();
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
            <span>{t('landing_community_system')}</span>
          </div>
        </div>
        <div className="fp-left-content">
          <h2>{t('fp_left_heading')}<br/><span>{t('fp_left_heading_highlight')}</span></h2>
          <p>{t('fp_left_sub')}</p>
          <div className="recovery-steps">
            {[
              { label: t('fp_step1_label'),  sub: t('fp_step1_sub') },
              { label: t('fp_step2_label'), sub: t('fp_step2_sub') },
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
              <MobileHeader onBack={onBack} t={t} />
              <div className="fp-screen-tag"><LockIcon /> {t('fp_tag')}</div>
              <h2>{t('fp_title')}</h2>
              <p>{t('fp_desc')}</p>

              <div className="fp-field">
                <label className="fp-label">{t('fp_hh_label')} <span className="req">*</span></label>
                <div className="fp-input-wrap">
                  <span className="fp-field-icon"><HomeIcon /></span>
                  <input
                    type="text"
                    className={`fp-input ${hhError ? "error-state" : hhValue ? "valid-state" : ""}`}
                    placeholder="e.g. MAL-2026-00142"
                    value={hhValue}
                    onChange={e => setHhValue(e.target.value)}
                    autoComplete="off"
                    onKeyDown={e => e.key === "Enter" && verifyIdentity()}
                  />
                </div>
                {hhError && <div className="field-error">{t('fp_hh_error')}</div>}
                <div className="field-hint">{t('fp_hh_hint')}</div>
              </div>

              <button className="fp-btn-main" onClick={verifyIdentity} disabled={loading}>
                {loading ? t('fp_sending') : <> {t('fp_send_btn')} <ArrowIcon /> </>}
              </button>
              <div style={{ display:"flex", justifyContent:"center", marginTop:"1rem" }}>
                <button className="fp-btn-ghost" onClick={onBack}>{t('fp_back_login')}</button>
              </div>
              <div className="fp-bottom-link">
                {t('fp_no_account')} <a onClick={onRegister}>{t('register_title')}</a>
              </div>
            </div>
          )}

          {/* ── SCREEN 2: Reset link sent confirmation ── */}
          {screen === 2 && (
            <div className="fp-screen" key={`s2-${screenKey}`}>
              <MobileHeader onBack={onBack} t={t} />
              <div className="fp-screen-tag"><MailIcon size={12} /> {t('fp_email_sent_tag')}</div>
              <h2>{t('fp_check_email_title')}</h2>
              <p>{t('fp_check_email_desc')}</p>

              <div className="email-card">
                <div className="email-card-icon"><MailIcon color="#317D89" /></div>
                <div>
                  <div className="email-card-value">{maskedEmail}</div>
                  <div className="email-card-sub">{t('fp_check_inbox')}</div>
                </div>
              </div>

              <div className="otp-timer">
                {t('fp_link_expires')} <strong>{formatTime(timeLeft)}</strong>
                {canResend && (
                  <button className="resend-btn" onClick={resendLink}>{t('fp_resend')}</button>
                )}
              </div>

              <div style={{ background:"rgba(49,125,137,0.06)", border:"1px solid rgba(49,125,137,0.18)", borderRadius:"10px", padding:"0.9rem 1.1rem", marginTop:"1rem", fontSize:"0.83rem", color:"#4a5e5a", lineHeight:"1.7" }}>
                  {t('fp_instruction')}
              </div>

              <button className="fp-btn-main" onClick={onLoginClick} style={{ marginTop:"1.5rem" }}>
                {t('fp_back_login_btn')} <ArrowIcon />
              </button>
              <div style={{ display:"flex", justifyContent:"center", marginTop:"0.75rem" }}>
                <button className="fp-btn-ghost" onClick={() => goScreen(1)}>{t('fp_change_hh')}</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}