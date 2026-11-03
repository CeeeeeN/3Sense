import barangayLogo from "./barangay-logo.jpg";
import { useState } from "react";
import {HomeIcon, LockIcon, ArrowIcon, EyeIcon, EyeOffIcon} from "../components/Icons";
import { activateAccount } from "../services/activation";
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

export default function Activation({ onBack, onLoginClick, onSuccess }) {
  const { t } = useLanguage();
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
  const strengthLabels = [t('act_pw_weak'), t('act_pw_fair'), t('act_pw_strong')];
  const strengthWidths = ["33%", "66%", "100%"];

  const GUIDE_STEPS = [
    { label: t('act_step1'), status: "done" },
    { label: t('act_step2'), status: "done" },
    { label: t('act_step3'), status: "active" },
    { label: t('act_step4'), status: "" },
    { label: t('act_step5'), status: "" },
  ];

  const handleActivate = async () => {
    if (!householdID.trim())   { alert(t('act_hh_error')); return; }
    if (pw1.length < 8) { alert(t('act_pw_length_error')); return; }
    if (pw1 !== pw2)    { alert(t('act_pw_mismatch_error')); return; }

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
            <span>{t('landing_community_system')}</span>
          </div>
        </div>

        <div className="act-left-content">
          <h2>{t('act_left_heading')} <span>{t('act_left_heading_highlight')}</span></h2>
          <p>{t('act_left_sub')}</p>

          <ol className="act-stepper">
            {GUIDE_STEPS.map((s, i) => (
              <li
                key={i}
                className={`act-step ${s.status}`}
                aria-current={s.status === "active" ? "step" : undefined}
              >
                <span className="act-step-marker">
                  {s.status === "done" ? "✓" : i + 1}
                </span>
                <span className="act-step-label">
                  {s.label}
                  {s.status === "active" && <span className="act-step-tag">{t('act_you_are_here')}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="act-left-footer">© 2026 Barangay 3S+ Malanday. All rights reserved.</div>
      </div>

      {/* RIGHT PANEL */}
      <div className="act-right">
        <div className="act-form-box">

          {/* ── ACTIVATE SCREEN ── */}
          {screen === "activate" && (
            <div className="act-screen" key="activate">
              <MobileHeader onBack={onBack} t={t} />
              <div className="act-screen-tag">
                <HomeIcon /> {t('act_tag')}
              </div>
              <h2>{t('act_title')}</h2>
              <p>{t('act_desc')}</p>

              <div className="act-field">
                <label className="act-label">{t('act_hh_label')} <span className="req">*</span></label>
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

              <div className="act-divider">{t('act_pw_divider')}</div>

              <div className="act-field">
                <label className="act-label">{t('act_pw_create')} <span className="req">*</span></label>
                <div className="act-input-wrap">
                  <span className="act-field-icon"><LockIcon /></span>
                  <input
                    type={showPw1 ? "text" : "password"}
                    className="act-input has-toggle-pad"
                    placeholder={t('act_pw_placeholder')}
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
                  {pw1 ? (strengthLabels[pwScore - 1] || t('act_pw_weak')) : t('act_pw_enter')}
                </div>
                <div className="act-pw-rules">
                  {[
                    { pass: pwLen,   label: t('act_pw_rule_length') },
                    { pass: pwUpper, label: t('act_pw_rule_upper') },
                    { pass: pwNum,   label: t('act_pw_rule_number') },
                  ].map((r, i) => (
                    <div key={i} className={`act-pw-rule ${r.pass ? "pass" : ""}`}>
                      <span className="act-rule-dot">{r.pass ? "✓" : ""}</span>
                      {r.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="act-field">
                <label className="act-label">{t('act_pw_confirm')} <span className="req">*</span></label>
                <div className="act-input-wrap">
                  <span className="act-field-icon"><LockIcon /></span>
                  <input
                    type={showPw2 ? "text" : "password"}
                    className="act-input has-toggle-pad"
                    placeholder={t('act_pw_confirm_placeholder')}
                    value={pw2}
                    onChange={e => setPw2(e.target.value)}
                  />
                  <button className="act-toggle-pw" type="button" onClick={() => setShowPw2(v => !v)}>
                    {showPw2 ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className={`act-pw-rule ${pwMatch ? "pass" : ""}`} style={{ marginTop: "6px" }}>
                  <span className="act-rule-dot">{pwMatch ? "✓" : ""}</span>
                  {t('act_pw_match')}
                </div>
              </div>

              <button className="act-btn-main" onClick={handleActivate}>
                {t('act_activate_btn')} <ArrowIcon />
              </button>

              <div className="act-bottom-link">
                {t('act_already_activated')} <a onClick={onLoginClick}>{t('act_login_here')}</a>
              </div>
            </div>
          )}

          {/* ── SUCCESS SCREEN ── */}
          {screen === "success" && (
            <div className="act-screen" key="success">
              <MobileHeader onBack={onBack} t={t} />
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div className="act-success-icon">✅</div>
                <h2 style={{ marginBottom: "0.5rem" }}>{t('act_success_title')}</h2>
                <p style={{ fontSize: "0.86rem", color: "var(--muted)", lineHeight: "1.7", marginBottom: "1.5rem" }}>
                  {t('act_success_desc')}
                </p>

                <div className="act-info-card" style={{ justifyContent: "center" }}>
                  <div className="act-info-card-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#317D89" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div className="act-info-card-label">{t('act_your_hh_id')}</div>
                    <div className="act-info-card-value">{confirmedId}</div>
                  </div>
                </div>

                <button
                  className="act-btn-main"
                  onClick={() => { if (onSuccess) onSuccess(householdData); else onLoginClick(); }}
                  style={{ maxWidth: "300px", margin: "0 auto" }}
                >
                  {t('act_add_members_btn')} <ArrowIcon />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}