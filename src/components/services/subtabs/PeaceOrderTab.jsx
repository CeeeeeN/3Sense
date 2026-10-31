import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { submitIncidentReport } from "../../../services/services";
import { createNotification } from "../../../services/notifications";
import { SirenIcon, SendIcon, PhoneCallIcon } from "../../Icons";

const HOTLINE = "0927-373-6727";
const HOTLINE_TEL = "tel:09273736727";

const INCIDENT_TYPES = [
  "Fight / Physical Altercation", "Noise Complaint", "Theft / Robbery",
  "Disturbance / Disorderly Conduct", "Public Intoxication", "Vandalism / Property Damage",
  "Illegal Parking / Obstruction", "Suspicious Person / Activity", "Domestic Dispute", "Other",
];

// Values are saved to the database, so they are unchanged
const URGENCY_LEVELS = [
  { value: "emergency", label: "Emergency",         desc: "Immediate danger to life or property" },
  { value: "urgent",    label: "Urgent",            desc: "Needs response within the hour" },
  { value: "docs",      label: "For documentation", desc: "No immediate danger, for records only" },
];

const STATUS_CONFIG = {
  received:  { label: "Received",  color: "#25636e", bg: "rgba(49,125,137,0.12)" },
  responded: { label: "Responded", color: "#8a6d00", bg: "rgba(189,189,100,0.22)" },
  resolved:  { label: "Resolved",  color: "#17714d", bg: "rgba(45,177,123,0.14)" },
};

// ── SESSION HELPER ────────────────────────────────────────────────────────────
const getSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback; }
  catch { return fallback; }
};

// ── Helper: returns today's date string "YYYY-MM-DD" ──────────────────────────
const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentTimeStr = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ico = ({ size = 26, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONS = {
  report:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></>,
  search:    <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  camera:    <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
  alert:     <><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  warning:   <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  clipboard: <><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></>,
  inbox:     <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
  shield:    <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
  check:     <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
  pin:       <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  calendar:  <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  tag:       <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>,
};
const URGENCY_ICON = { emergency: "alert", urgent: "warning", docs: "clipboard" };
const STATUS_ICON = { received: "inbox", responded: "shield", resolved: "check" };

const ArrowRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);
const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const BigCheck = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);

const BLANK_FORM = {
  reporterName: "", isAnonymous: false, contact: "", reporterAddress: "",
  incidentType: "", location: "", date: "", time: "", description: "", urgency: "",
  photo: "", photoFile: null,
};

export default function PeaceOrderTab({ userData, householdID }) {
  const [view, setView] = useState("home");
  const [refNum, setRefNum] = useState("");
  const [trackInput, setTrackInput] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const topRef = useRef(null);

  const [form, setForm] = useState(BLANK_FORM);

  useEffect(() => {
    if (userData && !form.isAnonymous) {
      const name = [userData.firstName, userData.lastName].filter(Boolean).join(" ");
      const fullAddress = [userData.houseNumber, userData.street, userData.barangay].filter(Boolean).join(", ");
      setForm(f => ({ ...f, reporterName: name, contact: userData.contactNumber || "", reporterAddress: fullAddress }));
    }
  }, [userData, form.isAnonymous]);

  // Bring the person back to the top whenever the screen changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [view]);

  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    const today = getTodayStr();
    const nowTime = getCurrentTimeStr();
    if (!form.incidentType) e.incidentType = "Please choose what kind of incident it was.";
    if (!form.location.trim()) e.location = "Please tell us where it happened.";
    if (!form.date) {
      e.date = "Please choose the date.";
    } else if (form.date > today) {
      e.date = "The date cannot be in the future.";
    }
    if (!form.time) {
      e.time = "Please choose the time.";
    } else if (form.date === today && form.time > nowTime) {
      e.time = "The time cannot be in the future.";
    }
    if (!form.description.trim()) e.description = "Please describe what happened.";
    if (!form.urgency) e.urgency = "Please choose how urgent it is.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setIsSubmitting(true);

    try {
      let uploadedImageUrl = null;

      if (form.photoFile) {
        const formData = new FormData();
        formData.append("file", form.photoFile);
        formData.append("upload_preset", "3Sense+_PeaceAndOrder");
        const cloudName = "dfnqeiksu";

        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: formData }
        );

        if (!cloudinaryResponse.ok) throw new Error("Failed to upload photo to Cloudinary");

        const cloudinaryData = await cloudinaryResponse.json();
        uploadedImageUrl = cloudinaryData.secure_url;
      }

      // Permanent UID
      const userUID = userData?.UID || getSaved("UID", null);
      const submissionData = { ...form, photoURL: uploadedImageUrl, UID: userUID };

      const generatedRef = await submitIncidentReport(householdID, userData?.userID || "", userData?.residentID || "", submissionData);
      const finalRef = generatedRef || Array.from({ length: 8 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 36))).join("");

      const reporterLabel = form.isAnonymous ? "Anonymous" : (form.reporterName || "Unknown");
      await createNotification(
        "feedback",
        `New incident report (${form.incidentType}) filed by ${reporterLabel} at ${form.location}.`,
        reporterLabel,
        finalRef
      );

      setRefNum(finalRef);
      setView("submitted");
    } catch (error) {
      console.error("Failed to submit incident report:", error);
      setErrors({ submit: "Sorry, the report could not be sent. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrack = async () => {
    setTrackError(""); setTrackResult(null);
    const key = trackInput.trim();
    if (!key) { setTrackError("Please type your reference number."); return; }
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
      if (!reportData) { setTrackError("We could not find a report with that number. Please check it and try again."); setIsSearching(false); return; }

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
      setTrackError("Something went wrong while searching. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const goHome = () => { setView("home"); setErrors({}); setTrackResult(null); setTrackError(""); };

  const BackButton = ({ label = "Back to start" }) => (
    <button type="button" className="vz-back" onClick={goHome}>
      <ArrowLeft /> {label}
    </button>
  );

  return (
    <div className="bz-page">
      {/* Title */}
      <div className="svc-hero svc-hero--navy bz-hero">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><SirenIcon /></span>Barangay Tanod</div>
            <h2 className="svc-hero__title">Peace and Order</h2>
            <p className="svc-hero__sub">Report community disturbances and safety concerns, request assistance, and help maintain peace and order within the barangay.</p>
          </div>
        </div>
      </div>

      <div className="bz-wrap" ref={topRef}>

        {/* The ONLY place the hotline appears. It stays on every screen. */}
        <section className="vz-emergency" aria-label="Emergency hotline">
          <div className="vz-emergency__text">
            <span className="vz-emergency__icon"><Ico size={24}>{ICONS.warning}</Ico></span>
            <div>
              <div className="vz-emergency__title">Need the Tanod right now?</div>
              <div className="vz-emergency__sub">Call for fights, theft, or any danger.</div>
            </div>
          </div>
          <div className="vz-emergency__btns">
            <a href={HOTLINE_TEL} className="vz-emergency__btn vz-emergency__btn--stack">
              <PhoneCallIcon />
              <span className="vz-emergency__body">
                <span className="vz-emergency__call">Tap to call</span>
                <strong>{HOTLINE}</strong>
                <small>Barangay Tanod hotline</small>
              </span>
            </a>
          </div>
        </section>

        {/* ═════════ HOME ═════════ */}
        {view === "home" && (
          <>
            <section className="bz-card">
              <h3 className="bz-heading">What would you like to do?</h3>
              <p className="bz-text">Tap one of the big buttons below.</p>

              <div className="vz-choices">
                <button type="button" className="vz-choice" onClick={() => setView("report")}>
                  <span className="vz-choice__icon vz-choice__icon--teal"><Ico size={30}>{ICONS.report}</Ico></span>
                  <span className="vz-choice__body">
                    <span className="vz-choice__title">I want to report a problem.</span>
                    <span className="vz-choice__desc">File an incident report online. You can stay anonymous.</span>
                  </span>
                  <span className="vz-choice__arrow"><ArrowRight /></span>
                </button>

                <button type="button" className="vz-choice" onClick={() => setView("track")}>
                  <span className="vz-choice__icon vz-choice__icon--purple"><Ico size={30}>{ICONS.search}</Ico></span>
                  <span className="vz-choice__body">
                    <span className="vz-choice__title">I want to check my report.</span>
                    <span className="vz-choice__desc">See what happened to a report, using your reference number.</span>
                  </span>
                  <span className="vz-choice__arrow"><ArrowRight /></span>
                </button>
              </div>
            </section>

            <div className="bz-legal bd-legal">Service focus: Community safety and public order</div>
          </>
        )}

        {/* ═════════ REPORT FORM ═════════ */}
        {view === "report" && (
          <section className="bz-card">
            <BackButton />
            <h3 className="bz-heading">Report a problem</h3>
            <p className="bz-text">Fill in what you know. Fields marked required must be filled in.</p>

            <div className="bf-form">
              {/* About you */}
              <div className="bf-group">
                <div className="bf-group__title">About you <span className="bf-pill">All optional</span></div>

                <label className={`bf-check${form.isAnonymous ? " is-on" : ""}`}>
                  <input
                    type="checkbox"
                    className="bf-check__box"
                    checked={form.isAnonymous}
                    onChange={e => { set("isAnonymous", e.target.checked); if (e.target.checked) { set("reporterName", ""); set("contact", ""); set("reporterAddress", ""); } }}
                  />
                  <span>Report anonymously. Your name will not be recorded.</span>
                </label>

                {!form.isAnonymous && (
                  <div className="bf-form bf-form--tight">
                    <div className="bf-field">
                      <label className="bf-label" htmlFor="po-name">Your name</label>
                      <input id="po-name" className="bf-input" value={form.reporterName} onChange={e => set("reporterName", e.target.value)} placeholder="Juan Dela Cruz" />
                    </div>
                    <div className="bf-row">
                      <div className="bf-field">
                        <label className="bf-label" htmlFor="po-contact">Phone number</label>
                        <input id="po-contact" className="bf-input" value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="0912 345 6789" />
                      </div>
                      <div className="bf-field">
                        <label className="bf-label" htmlFor="po-address">Your address</label>
                        <input id="po-address" className="bf-input" value={form.reporterAddress} onChange={e => set("reporterAddress", e.target.value)} placeholder="Purok / Street" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* What happened */}
              <div className="bf-group">
                <div className="bf-group__title">What happened</div>

                <div className="bf-form bf-form--tight">
                  <div className="bf-field">
                    <label className="bf-label" htmlFor="po-type">What kind of problem was it? <span className="bf-pill bf-pill--req">Required</span></label>
                    <select id="po-type" className={`bf-input bf-select${errors.incidentType ? " bf-input--error" : ""}`} value={form.incidentType} onChange={e => set("incidentType", e.target.value)}>
                      <option value="">Choose from the list...</option>
                      {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.incidentType && <div className="bf-error">{errors.incidentType}</div>}
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="po-location">Where did it happen? <span className="bf-pill bf-pill--req">Required</span></label>
                    <input id="po-location" className={`bf-input${errors.location ? " bf-input--error" : ""}`} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Street, Purok, or a landmark nearby" />
                    {errors.location && <div className="bf-error">{errors.location}</div>}
                  </div>

                  <div className="bf-row">
                    <div className="bf-field">
                      <label className="bf-label" htmlFor="po-date">What day? <span className="bf-pill bf-pill--req">Required</span></label>
                      <input
                        id="po-date"
                        className={`bf-input${errors.date ? " bf-input--error" : ""}`}
                        type="date"
                        value={form.date}
                        max={getTodayStr()}
                        onChange={e => {
                          const val = e.target.value;
                          const today = getTodayStr();
                          const targetDate = val > today ? today : val;
                          set("date", targetDate);
                          setErrors(errs => {
                            const { date, ...rest } = errs;
                            return rest;
                          });
                          if (targetDate === today && form.time && form.time > getCurrentTimeStr()) {
                            set("time", "");
                          }
                        }}
                      />
                      {errors.date && <div className="bf-error">{errors.date}</div>}
                    </div>
                    <div className="bf-field">
                      <label className="bf-label" htmlFor="po-time">What time? <span className="bf-pill bf-pill--req">Required</span></label>
                      <input
                        id="po-time"
                        className={`bf-input${errors.time ? " bf-input--error" : ""}`}
                        type="time"
                        value={form.time}
                        max={form.date === getTodayStr() ? getCurrentTimeStr() : undefined}
                        onChange={e => {
                          const val = e.target.value;
                          const today = getTodayStr();
                          if (form.date === today) {
                            const nowTime = getCurrentTimeStr();
                            if (val > nowTime) {
                              set("time", nowTime);
                              setErrors(errs => ({ ...errs, time: "The time cannot be in the future." }));
                              return;
                            }
                          }
                          setErrors(errs => {
                            const { time, ...rest } = errs;
                            return rest;
                          });
                          set("time", val);
                        }}
                      />
                      {errors.time && <div className="bf-error">{errors.time}</div>}
                    </div>
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="po-desc">Tell us what happened <span className="bf-pill bf-pill--req">Required</span></label>
                    <textarea id="po-desc" className={`bf-textarea${errors.description ? " bf-input--error" : ""}`} rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Who was involved, what they did, and anything else we should know" />
                    {errors.description && <div className="bf-error">{errors.description}</div>}
                  </div>

                  <div className="bf-field">
                    <div className="bf-label">How urgent is it? <span className="bf-pill bf-pill--req">Required</span></div>
                    <div className="bf-urgency" role="radiogroup" aria-label="Urgency level">
                      {URGENCY_LEVELS.map(u => (
                        <button
                          type="button"
                          key={u.value}
                          role="radio"
                          aria-checked={form.urgency === u.value}
                          className={`bf-urgency__btn bf-urgency__btn--${u.value}${form.urgency === u.value ? " is-active" : ""}`}
                          onClick={() => set("urgency", u.value)}
                        >
                          <span className="bf-urgency__icon"><Ico size={26}>{ICONS[URGENCY_ICON[u.value]]}</Ico></span>
                          <span className="bf-urgency__label">{u.label}</span>
                          <span className="bf-urgency__desc">{u.desc}</span>
                        </button>
                      ))}
                    </div>
                    {errors.urgency && <div className="bf-error">{errors.urgency}</div>}
                  </div>

                  <div className="bf-field">
                    <div className="bf-label">Photo <span className="bf-pill">Optional</span></div>
                    <label className={`bf-photo${form.photo ? " is-filled" : ""}`}>
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        if (e.target.files[0]) {
                          set("photo", e.target.files[0].name);
                          set("photoFile", e.target.files[0]);
                        }
                      }} />
                      <Ico size={28}>{ICONS.camera}</Ico>
                      <span className="bf-photo__text">
                        {form.photo ? (
                          <>
                            <strong>Photo added</strong>
                            <small>{form.photo} · Tap to change</small>
                          </>
                        ) : (
                          <>
                            <strong>Tap here to add a photo</strong>
                            <small>A picture can help the Tanod understand the problem</small>
                          </>
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {errors.submit && <div className="bf-alert">{errors.submit}</div>}

              <button type="button" className="bf-submit" onClick={handleSubmit} disabled={isSubmitting}>
                <SendIcon /> {isSubmitting ? "Sending, please wait..." : "Send Report"}
              </button>
            </div>
          </section>
        )}

        {/* ═════════ SUBMITTED ═════════ */}
        {view === "submitted" && (
          <section className="bz-card">
            <div className="bf-done">
              <span className="bf-done__icon"><BigCheck /></span>
              <h3 className="bz-heading">Report sent. Thank you!</h3>
              <p className="bz-text">The Barangay Tanod has received your report and will respond.</p>

              <div className="bt-ref">
                <div className="bt-ref__label">Your reference number</div>
                <div className="bt-ref__num">{refNum}</div>
                <div className="bt-ref__hint">Write this number down. You will need it to check your report later.</div>
              </div>

              <div className="bf-done__btns">
                <button type="button" className="bf-secondary" onClick={() => { setTrackInput(refNum); setView("track"); }}>
                  Check this report
                </button>
                <button type="button" className="bf-secondary" onClick={() => { setForm(BLANK_FORM); goHome(); }}>
                  Done
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ═════════ TRACK ═════════ */}
        {view === "track" && (
          <section className="bz-card">
            <BackButton />
            <h3 className="bz-heading">Check your report</h3>
            <p className="bz-text">Type the reference number you received when you sent your report.</p>

            <div className="bf-form">
              <div className="bf-field">
                <label className="bf-label" htmlFor="po-ref">Reference number</label>
                <input
                  id="po-ref"
                  className={`bf-input bt-input${trackError ? " bf-input--error" : ""}`}
                  value={trackInput}
                  onChange={e => { setTrackInput(e.target.value); setTrackError(""); setTrackResult(null); }}
                  placeholder="Type it here"
                  onKeyDown={e => e.key === "Enter" && handleTrack()}
                />
                {trackError && <div className="bf-error">{trackError}</div>}
              </div>

              <button type="button" className="bf-submit" onClick={handleTrack} disabled={isSearching}>
                <Ico size={24}>{ICONS.search}</Ico> {isSearching ? "Searching, please wait..." : "Find My Report"}
              </button>
            </div>

            {trackResult && (() => {
              const sc = STATUS_CONFIG[trackResult.status] || STATUS_CONFIG.received;
              const statusKey = STATUS_CONFIG[trackResult.status] ? trackResult.status : "received";
              return (
                <div className="bt-result">
                  <div className="bt-result__head">
                    <div>
                      <div className="bt-result__label">Reference number</div>
                      <div className="bt-result__ref">{trackResult.ref}</div>
                    </div>
                    <span className="bt-badge" style={{ background: sc.bg, color: sc.color }}>
                      <Ico size={20}>{ICONS[STATUS_ICON[statusKey]]}</Ico> {sc.label}
                    </span>
                  </div>

                  <div className="bt-details">
                    <div className="bt-detail"><span className="bt-detail__icon"><Ico size={22}>{ICONS.tag}</Ico></span><div><div className="bt-detail__label">Type of problem</div><div className="bt-detail__value">{trackResult.type}</div></div></div>
                    <div className="bt-detail"><span className="bt-detail__icon"><Ico size={22}>{ICONS.pin}</Ico></span><div><div className="bt-detail__label">Where</div><div className="bt-detail__value">{trackResult.location}</div></div></div>
                    <div className="bt-detail"><span className="bt-detail__icon"><Ico size={22}>{ICONS.calendar}</Ico></span><div><div className="bt-detail__label">Date filed</div><div className="bt-detail__value">{trackResult.date}</div></div></div>
                  </div>

                  <div className="bt-timeline">
                    <div className="bt-timeline__title">What happened so far</div>
                    <ol className="bt-timeline__list">
                      {trackResult.updates.map((u, i) => {
                        const last = i === trackResult.updates.length - 1;
                        return (
                          <li key={i} className={`bt-timeline__item${last ? " is-last" : ""}`}>
                            <span className="bt-timeline__dot" style={last ? { background: sc.color, borderColor: sc.color } : {}} />
                            <span className="bt-timeline__text">{u}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </div>
              );
            })()}

            <BackButton />
          </section>
        )}

      </div>
    </div>
  );
}