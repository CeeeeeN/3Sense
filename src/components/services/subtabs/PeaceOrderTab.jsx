import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { submitIncidentReport } from "../../../services/services";
import { createNotification } from "../../../services/notifications"; // 🆕
import { SirenIcon, SendIcon } from "../../Icons";

const INCIDENT_TYPES = [
  "Fight / Physical Altercation", "Noise Complaint", "Theft / Robbery",
  "Disturbance / Disorderly Conduct", "Public Intoxication", "Vandalism / Property Damage",
  "Illegal Parking / Obstruction", "Suspicious Person / Activity", "Domestic Dispute", "Other",
];

const URGENCY_LEVELS = [
  { value: "emergency", label: "🚨 Emergency",        desc: "Immediate danger to life or property" },
  { value: "urgent",    label: "⚠️ Urgent",            desc: "Needs response within the hour" },
  { value: "docs",      label: "📋 For Documentation", desc: "No immediate danger, for records only" },
];

const STATUS_CONFIG = {
  received:  { label: "Received",  color: "#317D89", bg: "rgba(49,125,137,0.1)",   icon: "📥" },
  responded: { label: "Responded", color: "#BDBD64", bg: "rgba(189,189,100,0.15)", icon: "🚔" },
  resolved:  { label: "Resolved",  color: "#2DB17B", bg: "rgba(45,177,123,0.1)",   icon: "✅" },
};

export default function PeaceOrderTab({ userData, householdID }) {
  const [view, setView]               = useState("home");
  const [refNum, setRefNum]           = useState("");
  const [trackInput, setTrackInput]   = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError]   = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [callExpanded, setCallExpanded] = useState(false);

  const [form, setForm] = useState({
    reporterName: "", isAnonymous: false, contact: "", reporterAddress: "",
    incidentType: "", location: "", date: "", time: "", description: "", urgency: "", photo: "",
  });

  useEffect(() => {
    if (userData && !form.isAnonymous) {
      const name = [userData.firstName, userData.lastName].filter(Boolean).join(" ");
      const fullAddress = [userData.houseNumber, userData.street, userData.barangay].filter(Boolean).join(", ");
      setForm(f => ({ ...f, reporterName: name, contact: userData.contactNumber || "", reporterAddress: fullAddress }));
    }
  }, [userData, form.isAnonymous]);

  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.incidentType)       e.incidentType = "Please select an incident type.";
    if (!form.location.trim())    e.location     = "Location is required.";
    if (!form.date)               e.date         = "Date is required.";
    if (!form.time)               e.time         = "Time is required.";
    if (!form.description.trim()) e.description  = "Please describe what happened.";
    if (!form.urgency)            e.urgency      = "Please select urgency level.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    try {
      const generatedRef = await submitIncidentReport(householdID, userData?.userID || "", form);
      const finalRef = generatedRef || Array.from({length:8}, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random()*36))).join("");

      // 🆕 Notify admins about new incident report
      const reporterLabel = form.isAnonymous ? "Anonymous" : (form.reporterName || "Unknown");
      await createNotification(
        "feedback", // closest available type; shows as "Feedback" in bell
        `New incident report (${form.incidentType}) filed by ${reporterLabel} at ${form.location}.`,
        reporterLabel,
        finalRef
      );

      setRefNum(finalRef);
      setView("submitted");
    } catch (error) {
      console.error("Failed to submit incident report:", error);
      setErrors({ submit: "Failed to submit. Please try again." });
    }
  };

  const handleTrack = async () => {
    setTrackError(""); setTrackResult(null);
    const key = trackInput.trim();
    if (!key) { setTrackError("Please enter a reference number."); return; }
    setIsSearching(true);
    try {
      let reportData = null;
      const q = query(collection(db, "incidentReports"), where("refNum", "==", key));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        reportData = querySnapshot.docs[0].data();
      } else {
        const docRef = doc(db, "incidentReports", key);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) reportData = docSnap.data();
      }
      if (!reportData) { setTrackError("No report found with that reference number. Please check and try again."); setIsSearching(false); return; }

      let reportDate = "Unknown Date";
      if (reportData.createdAt?.toDate) reportDate = reportData.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      else if (reportData.date) reportDate = reportData.date;

      const timeline = reportData.updates || [`${reportDate} – Report received and under review by Barangay Tanod`];
      setTrackResult({
        ref: key,
        status: (reportData.status || "received").toLowerCase(),
        type: reportData.incidentType || reportData.type || "Incident Report",
        location: reportData.location || "N/A",
        date: reportDate,
        updates: timeline
      });
    } catch (error) {
      console.error("Error searching for report:", error);
      setTrackError("An error occurred while communicating with the database.");
    } finally {
      setIsSearching(false);
    }
  };

  if (view === "home") return (
    <div className="po-page">
      <div className="svc-hero svc-hero--navy">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><SirenIcon /></span>Barangay Tanod</div>
            <h2 className="svc-hero__title">Peace & Order</h2>
            <p className="svc-hero__abbr">BARANGAY 3S+ MALANDAY</p>
            <p className="svc-hero__sub">Report incidents, request assistance, and help keep our community safe.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Barangay Tanod Unit · Barangay 3S+ Malanday, Valenzuela City
            </div>
          </div>
        </div>
      </div>

      <div className="po-hotline-section">
        <a href="tel:09273736727" className="po-hotline-btn" onClick={e => { e.preventDefault(); setCallExpanded(v => !v); }}>
          <div className="po-hotline-btn__pulse" />
          <div className="po-hotline-btn__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>
          </div>
          <div className="po-hotline-btn__text">
            <div className="po-hotline-btn__label">Emergency Hotline</div>
            <div className="po-hotline-btn__number">0927-373-6727</div>
            <div className="po-hotline-btn__sub">Call for immediate response!</div>
          </div>
          <div className="po-hotline-btn__chevron" style={{ transform: callExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </a>
        {callExpanded && (
          <div className="po-incident-types">
            <div className="po-incident-types__label">Call for any of these incidents:</div>
            <div className="po-incident-chips">
              {["⚔️ Fights","📢 Noise Complaints","🔓 Theft","😤 Disturbances","🍺 Public Intoxication"].map(i => (
                <span key={i} className="po-incident-chip">{i}</span>
              ))}
            </div>
            <a href="tel:09273736727" className="sv-btn-primary" style={{ marginTop: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>
              Tap to Call Now
            </a>
          </div>
        )}
      </div>

      <div className="po-actions">
        <button className="po-action-card po-action-card--report" onClick={() => setView("report")}>
          <div className="po-action-card__icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg></div>
          <div className="po-action-card__title">File a Report</div>
          <div className="po-action-card__desc">Submit an incident report online. Anonymous reporting available.</div>
          <div className="po-action-card__cta">Start Report →</div>
        </button>
        <button className="po-action-card po-action-card--track" onClick={() => setView("track")}>
          <div className="po-action-card__icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <div className="po-action-card__title">Track a Report</div>
          <div className="po-action-card__desc">Check the status of a previously filed report using your reference number.</div>
          <div className="po-action-card__cta">Track Now →</div>
        </button>
      </div>
    </div>
  );

  if (view === "report") return (
    <div className="po-page">
      <div className="po-form-wrap">
        <div className="po-form-topbar">
          <button className="vawc-back-btn" onClick={() => { setView("home"); setErrors({}); }}>‹ Back</button>
          <div className="po-form-topbar__title">File an Incident Report</div>
        </div>
        <div className="po-form-section">
          <div className="po-form-section__title">Reporter Information <span className="po-optional-badge">All fields optional</span></div>
          <label className="po-anon-toggle">
            <input type="checkbox" checked={form.isAnonymous} onChange={e => { set("isAnonymous", e.target.checked); if (e.target.checked) { set("reporterName",""); set("contact",""); set("reporterAddress",""); }}} className="dr-checkbox" />
            <span>Report anonymously — your identity will not be recorded</span>
          </label>
          {!form.isAnonymous && (
            <div className="dr-field-row" style={{ marginTop: "0.85rem" }}>
              <div className="dr-field"><label className="sv-label">Your Name</label><input className="sv-input" value={form.reporterName} onChange={e => set("reporterName", e.target.value)} placeholder="Juan Dela Cruz" /></div>
              <div className="dr-field"><label className="sv-label">Contact Number</label><input className="sv-input" value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="+63 912 345 6789" /></div>
              <div className="dr-field"><label className="sv-label">Your Address</label><input className="sv-input" value={form.reporterAddress} onChange={e => set("reporterAddress", e.target.value)} placeholder="Purok / Street" /></div>
            </div>
          )}
        </div>
        <div className="po-form-section">
          <div className="po-form-section__title">Incident Information</div>
          <div className="dr-field-row" style={{ marginBottom: "0.85rem" }}>
            <div className="dr-field">
              <label className="sv-label">Type of Incident <span className="sv-required">*</span></label>
              <select className={`sv-input sv-select${errors.incidentType ? " sv-input--error" : ""}`} value={form.incidentType} onChange={e => set("incidentType", e.target.value)}>
                <option value="">Select incident type...</option>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.incidentType && <span className="sv-error-msg">{errors.incidentType}</span>}
            </div>
            <div className="dr-field">
              <label className="sv-label">Location <span className="sv-required">*</span></label>
              <input className={`sv-input${errors.location ? " sv-input--error" : ""}`} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Street, Purok, or landmark" />
              {errors.location && <span className="sv-error-msg">{errors.location}</span>}
            </div>
          </div>
          <div className="dr-field-row" style={{ marginBottom: "0.85rem" }}>
            <div className="dr-field">
              <label className="sv-label">Date <span className="sv-required">*</span></label>
              <input className={`sv-input${errors.date ? " sv-input--error" : ""}`} type="date" value={form.date} onChange={e => set("date", e.target.value)} />
              {errors.date && <span className="sv-error-msg">{errors.date}</span>}
            </div>
            <div className="dr-field">
              <label className="sv-label">Time <span className="sv-required">*</span></label>
              <input className={`sv-input${errors.time ? " sv-input--error" : ""}`} type="time" value={form.time} onChange={e => set("time", e.target.value)} />
              {errors.time && <span className="sv-error-msg">{errors.time}</span>}
            </div>
          </div>
          <div className="dr-field" style={{ marginBottom: "0.85rem" }}>
            <label className="sv-label">Description <span className="sv-required">*</span></label>
            <textarea className={`sv-textarea${errors.description ? " sv-input--error" : ""}`} rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe what happened in detail..." />
            {errors.description && <span className="sv-error-msg">{errors.description}</span>}
          </div>
          <div className="dr-field" style={{ marginBottom: "0.85rem" }}>
            <label className="sv-label">Urgency Level <span className="sv-required">*</span></label>
            <div className="po-urgency-row">
              {URGENCY_LEVELS.map(u => (
                <button key={u.value} className={`po-urgency-btn${form.urgency === u.value ? " po-urgency-btn--active" : ""} po-urgency-btn--${u.value}`} onClick={() => set("urgency", u.value)}>
                  <span className="po-urgency-label">{u.label}</span>
                  <span className="po-urgency-desc">{u.desc}</span>
                </button>
              ))}
            </div>
            {errors.urgency && <span className="sv-error-msg">{errors.urgency}</span>}
          </div>
          <div className="dr-field">
            <label className="sv-label">Upload Photo <span className="sv-optional">(Optional)</span></label>
            <label className="dr-upload-box">
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && set("photo", e.target.files[0].name)} />
              {form.photo
                ? <div className="dr-upload-done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{form.photo}</div>
                : <div className="dr-upload-placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Upload photo evidence</span><span className="dr-upload-hint">JPG or PNG · Max 5MB</span></div>
              }
            </label>
          </div>
        </div>
        <div className="po-form-actions">
          <button className="sv-btn-ghost" onClick={() => { setView("home"); setErrors({}); }}>Cancel</button>
          <button className="sv-btn-primary" onClick={handleSubmit}><SendIcon /> Submit Report</button>
        </div>
      </div>
    </div>
  );

  if (view === "submitted") return (
    <div className="po-page">
      <div className="po-submitted-wrap">
        <div className="po-submitted-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <h3 className="po-submitted-title">Report Submitted</h3>
        <p className="po-submitted-sub">Your incident report has been received by the Barangay Tanod.</p>
        <div className="po-ref-box">
          <div className="po-ref-label">Your Reference Number</div>
          <div className="po-ref-num">{refNum}</div>
          <div className="po-ref-hint">Save this number to track your report's status</div>
        </div>
        <div className="po-submitted-notes">
          <div className="po-submitted-note"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>Barangay Tanod will respond to your report.</div>
          <div className="po-submitted-note"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>For emergencies, call <strong>0927-373-6727</strong> directly.</div>
        </div>
        <div className="po-submitted-btns">
          <button className="sv-btn-outline" onClick={() => { setTrackInput(refNum); setView("track"); }}>Track This Report</button>
          <button className="sv-btn-ghost" onClick={() => { setView("home"); setForm({ reporterName:"", isAnonymous:false, contact:"", reporterAddress:"", incidentType:"", location:"", date:"", time:"", description:"", urgency:"", photo:"" }); }}>Done</button>
        </div>
      </div>
    </div>
  );

  if (view === "track") return (
    <div className="po-page">
      <div className="po-form-wrap">
        <div className="po-form-topbar">
          <button className="vawc-back-btn" onClick={() => { setView("home"); setTrackResult(null); setTrackError(""); }}>‹ Back</button>
          <div className="po-form-topbar__title">Track a Report</div>
        </div>
        <div className="po-form-section">
          <div className="po-form-section__title">Enter your Reference Number</div>
          <div className="po-track-input-row">
            <input className="sv-input" value={trackInput} onChange={e => { setTrackInput(e.target.value); setTrackError(""); setTrackResult(null); }}
              placeholder="Enter your reference ID" onKeyDown={e => e.key === "Enter" && handleTrack()}
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, letterSpacing: "0.05em" }} />
            <button className="sv-btn-primary" onClick={handleTrack} disabled={isSearching}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
          {trackError && <span className="sv-error-msg" style={{ marginTop: "0.5rem", display: "block" }}>{trackError}</span>}
        </div>
        {trackResult && (() => {
          const sc = STATUS_CONFIG[trackResult.status] || STATUS_CONFIG.received;
          return (
            <div className="po-track-result">
              <div className="po-track-result__header">
                <div className="po-track-result__ref">{trackResult.ref}</div>
                <span className="po-status-badge" style={{ background: sc.bg, color: sc.color }}>{sc.icon} {sc.label}</span>
              </div>
              <div className="po-track-details">
                <div className="po-track-detail"><span className="po-track-detail__label">Incident Type</span><span className="po-track-detail__value">{trackResult.type}</span></div>
                <div className="po-track-detail"><span className="po-track-detail__label">Location</span><span className="po-track-detail__value">{trackResult.location}</span></div>
                <div className="po-track-detail"><span className="po-track-detail__label">Date Filed</span><span className="po-track-detail__value">{trackResult.date}</span></div>
              </div>
              <div className="po-timeline">
                <div className="po-timeline__title">Status Timeline</div>
                {trackResult.updates.map((u, i) => (
                  <div key={i} className="po-timeline-item">
                    <div className={`po-timeline-dot${i === trackResult.updates.length - 1 ? " po-timeline-dot--active" : ""}`} style={i === trackResult.updates.length - 1 ? { background: sc.color, borderColor: sc.color } : {}} />
                    {i < trackResult.updates.length - 1 && <div className="po-timeline-line" />}
                    <div className="po-timeline-text">{u}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}