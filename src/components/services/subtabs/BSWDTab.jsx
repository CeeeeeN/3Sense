import { useState, useEffect } from "react";

// ── BSWD Tab ──
export default function BSWDTab({ userData, householdID }) {
  const [reportForm, setReportForm] = useState({ name: "", location: "", description: "", photo: "" });
  const [reportErrors, setReportErrors]   = useState({});
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [tipForm, setTipForm]             = useState({ about: "", tip: "", contact: "" });
  const [tipSubmitted, setTipSubmitted]   = useState(false);
  const [tipErrors, setTipErrors]         = useState({});

  useEffect(() => {
    if (userData) {
      setReportForm(f => ({
        ...f,
        name: [userData.firstName, userData.lastName].filter(Boolean).join(" ")
      }));
    }
  }, [userData]);

  const setR = (k, v) => setReportForm(f => ({ ...f, [k]: v }));
  const setT = (k, v) => setTipForm(f => ({ ...f, [k]: v }));

  const submitReport = async () => {
    const e = {};
    if (!reportForm.location.trim())    e.location    = "Location is required.";
    if (!reportForm.description.trim()) e.description = "Please describe what you observed.";
    if (Object.keys(e).length) { setReportErrors(e); return; }
    
    try {
      await submitBSWDReport(householdID || "Public", userData?.userID || "", reportForm);
      setReportErrors({}); 
      setReportSubmitted(true);
    } catch (err) {
      console.error("BSWD Report failed:", err);
      setReportErrors({ submit: "Failed to submit report. Please try again." });
    }
  };

  const submitTip = async () => {
    const e = {};
    if (!tipForm.about.trim()) e.about = "Please describe who this is about.";
    if (!tipForm.tip.trim())   e.tip   = "Please share what you know.";
    if (Object.keys(e).length) { setTipErrors(e); return; }

    try {
      await submitBSWDTip(householdID || "Public", userData?.userID || "", tipForm);
      setTipErrors({}); 
      setTipSubmitted(true);
    } catch (err) {
      console.error("BSWD Tip failed:", err);
      setTipErrors({ submit: "Failed to send tip. Please try again." });
    }
  };

  return (
    <div className="bswd-page">
      <div className="svc-hero svc-hero--teal">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><HeartIcon /></span>Social Welfare & Development</div>
            <h2 className="svc-hero__title">Barangay Social Welfare and Development</h2>
            <p className="svc-hero__abbr">BSWD</p>
            <p className="svc-hero__sub">Providing social protection, welfare programs, and community development services to all residents of Barangay 3S+ Malanday.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Coordinating with <strong>DSWD</strong> — Department of Social Welfare and Development
            </div>
          </div>
          <div className="svc-hero__right">
            <div className="svc-hero__hotline-pill">
              <div className="svc-hero__hotline-item">
                <span className="svc-hero__hotline-label">BSWD Hotline</span>
                <a href="tel:044000000" className="svc-hero__hotline-num">(044) 000-0000</a>
              </div>
              <div className="svc-hero__hotline-sep" />
              <div className="svc-hero__hotline-item">
                <span className="svc-hero__hotline-label">DSWD National</span>
                <a href="tel:8888" className="svc-hero__hotline-num">8-888</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bswd-section">
        <div className="bswd-section__title"><ServiceMapPinIcon /> Report a Homeless or Displaced Person</div>
        <p className="bswd-section__sub">If you see a homeless or displaced individual who may need assistance, please let us know.</p>
        {reportSubmitted ? (
          <div className="bswd-submitted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2DB17B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <div>
              <div className="bswd-submitted-title">Report Submitted</div>
              <div className="bswd-submitted-sub">Thank you. Our BSWD officer will follow up within 24–48 hours.</div>
            </div>
            <button className="sv-btn-outline" style={{ fontSize: "0.75rem", padding: "0.4rem 0.9rem" }} onClick={() => { setReportForm({ name: "", location: "", description: "", photo: "" }); setReportSubmitted(false); }}>Submit Another</button>
          </div>
        ) : (
          <div className="bswd-form-card">
            <div className="dr-field-row dr-field-row--wrap">
              <div className="dr-field">
                <label className="sv-label">Your Name <span className="sv-optional">(Optional)</span></label>
                <input className="sv-input" value={reportForm.name} onChange={e => setR("name", e.target.value)} placeholder="Leave blank to stay anonymous" />
              </div>
              <div className="dr-field">
                <label className="sv-label">Location of Person <span className="sv-required">*</span></label>
                <input className={`sv-input${reportErrors.location ? " sv-input--error" : ""}`} value={reportForm.location} onChange={e => setR("location", e.target.value)} placeholder="Street, landmark, or area" />
                {reportErrors.location && <span className="sv-error-msg">{reportErrors.location}</span>}
              </div>
            </div>
            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">Description of Concern <span className="sv-required">*</span></label>
              <textarea className={`sv-textarea${reportErrors.description ? " sv-input--error" : ""}`} rows={3} value={reportForm.description} onChange={e => setR("description", e.target.value)} placeholder="Describe what you observed..." />
              {reportErrors.description && <span className="sv-error-msg">{reportErrors.description}</span>}
            </div>
            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">Photo <span className="sv-optional">(Optional)</span></label>
              <label className="dr-upload-box">
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && setR("photo", e.target.files[0].name)} />
                {reportForm.photo ? (
                  <div className="dr-upload-done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{reportForm.photo}</div>
                ) : (
                  <div className="dr-upload-placeholder">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>Upload a photo</span><span className="dr-upload-hint">JPG or PNG · Max 5MB</span>
                  </div>
                )}
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="sv-btn-primary" onClick={submitReport}><SendIcon /> Submit Report</button>
            </div>
          </div>
        )}
      </div>

      <div className="bswd-section bswd-section--last">
        <div className="bswd-section__title"><SendIcon /> Send a Tip or Additional Information</div>
        <p className="bswd-section__sub">Do you have information about a homeless individual that could help us assist them?</p>
        {tipSubmitted ? (
          <div className="bswd-submitted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2DB17B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <div>
              <div className="bswd-submitted-title">Tip Received</div>
              <div className="bswd-submitted-sub">Your information has been forwarded to the BSWD officer. Thank you for caring.</div>
            </div>
            <button className="sv-btn-outline" style={{ fontSize: "0.75rem", padding: "0.4rem 0.9rem" }} onClick={() => { setTipForm({ about: "", tip: "", contact: "" }); setTipSubmitted(false); }}>Send Another</button>
          </div>
        ) : (
          <div className="bswd-form-card">
            <div className="dr-field">
              <label className="sv-label">Who is this about? <span className="sv-required">*</span></label>
              <input className={`sv-input${tipErrors.about ? " sv-input--error" : ""}`} value={tipForm.about} onChange={e => setT("about", e.target.value)} placeholder="Name (if known), description, or case reference" />
              {tipErrors.about && <span className="sv-error-msg">{tipErrors.about}</span>}
            </div>
            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">What do you know? <span className="sv-required">*</span></label>
              <textarea className={`sv-textarea${tipErrors.tip ? " sv-input--error" : ""}`} rows={3} value={tipForm.tip} onChange={e => setT("tip", e.target.value)} placeholder="Share any information that may help..." />
              {tipErrors.tip && <span className="sv-error-msg">{tipErrors.tip}</span>}
            </div>
            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">Your Contact (Optional)</label>
              <input className="sv-input" value={tipForm.contact} onChange={e => setT("contact", e.target.value)} placeholder="Phone or email — only if you wish to be contacted" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="sv-btn-primary" onClick={submitTip}><SendIcon /> Send Tip</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}