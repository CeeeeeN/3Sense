import React, { useState, useEffect, useRef } from "react";
import { HeartIcon, ServiceMapPinIcon, SendIcon } from "../../Icons";
import { submitBSWDReport, submitBSWDTip } from "../../../services/services";
import { createNotification } from "../../../services/notifications";

// ── SESSION HELPER ────────────────────────────────────────────────────────────
const getSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback; }
  catch { return fallback; }
};

// ── Small icons ──────────────────────────────────────────────────────────────
const sv = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const ArrowRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);
const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const LockIcon = () => (
  <svg {...sv}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
const ClockIcon = () => (
  <svg {...sv}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const PeopleIcon = () => (
  <svg {...sv}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);
const BigCheck = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);

const FACTS = [
  { icon: <PeopleIcon />, label: "Who can use this", value: "Anyone who sees a person in need" },
  { icon: <LockIcon />,   label: "Your privacy",     value: "You can stay anonymous" },
  { icon: <ClockIcon />,  label: "What happens next", value: "Our officer follows up in 24 to 48 hours" },
];

const BLANK_REPORT = { name: "", location: "", landmark: "", lastSeen: "", description: "", photo: "" };
const BLANK_TIP = { about: "", tip: "", contact: "" };

export default function BSWDTab({ userData, householdID }) {
  const [view, setView] = useState(null); // null | "report" | "tip"
  const topRef = useRef(null);

  const [reportForm, setReportForm] = useState(BLANK_REPORT);
  const [reportErrors, setReportErrors] = useState({});
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportFile, setReportFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tipForm, setTipForm] = useState(BLANK_TIP);
  const [tipSubmitted, setTipSubmitted] = useState(false);
  const [tipErrors, setTipErrors] = useState({});
  const [isTipSubmitting, setIsTipSubmitting] = useState(false);

  useEffect(() => {
    if (userData) {
      setReportForm(f => ({
        ...f,
        name: [userData.firstName, userData.lastName].filter(Boolean).join(" ")
      }));
    }
  }, [userData]);

  // Bring the person back to the top whenever the screen changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [view, reportSubmitted, tipSubmitted]);

  const setR = (k, v) => setReportForm(f => ({ ...f, [k]: v }));
  const setT = (k, v) => setTipForm(f => ({ ...f, [k]: v }));

  const submitReport = async () => {
    const e = {};
    if (!reportForm.location.trim()) e.location = "Please tell us where you saw the person.";
    if (!reportForm.description.trim()) e.description = "Please describe the person and what they need.";
    if (Object.keys(e).length) { setReportErrors(e); return; }

    setIsSubmitting(true);

    try {
      let finalPhotoUrl = "None";

      if (reportFile) {
        const formData = new FormData();
        formData.append("file", reportFile);
        formData.append("upload_preset", "3Sense+");
        const uploadRes = await fetch("https://api.cloudinary.com/v1_1/dfnqeiksu/image/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.secure_url) {
          finalPhotoUrl = uploadData.secure_url;
        } else {
          throw new Error("Image upload failed");
        }
      }

      // Permanent UID
      const userUID = userData?.UID || getSaved("UID", null);
      const finalReportData = { ...reportForm, photo: finalPhotoUrl, UID: userUID };

      await submitBSWDReport(householdID || "Public", userData?.userID || "", userData?.residentID || "", finalReportData);

      const reporterLabel = reportForm.name.trim() || "Anonymous";

      await createNotification(
        "feedback",
        `New BSWD homeless report at "${reportForm.location}" ${reportForm.landmark ? `(Landmark: ${reportForm.landmark})` : ""} ${reportForm.lastSeen ? `seen at ${reportForm.lastSeen}` : ""} by ${reporterLabel}.`,
        reporterLabel,
        ""
      );

      setReportErrors({});
      setReportSubmitted(true);
      setReportFile(null);
    } catch (err) {
      console.error("BSWD Report failed:", err);
      setReportErrors({ submit: "Sorry, the report could not be sent. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTip = async () => {
    const e = {};
    if (!tipForm.about.trim()) e.about = "Please tell us who this is about.";
    if (!tipForm.tip.trim()) e.tip = "Please tell us what you know.";
    if (Object.keys(e).length) { setTipErrors(e); return; }

    setIsTipSubmitting(true);

    try {
      // Permanent UID
      const userUID = userData?.UID || getSaved("UID", null);
      const finalTipData = { ...tipForm, UID: userUID };

      await submitBSWDTip(householdID || "Public", userData?.userID || "", userData?.residentID || "", finalTipData);

      const tipperLabel = tipForm.contact?.trim() || "Anonymous";
      await createNotification(
        "feedback",
        `New BSWD tip received about "${tipForm.about.substring(0, 60)}${tipForm.about.length > 60 ? "…" : ""}".`,
        tipperLabel,
        ""
      );

      setTipErrors({});
      setTipSubmitted(true);
    } catch (err) {
      console.error("BSWD Tip failed:", err);
      setTipErrors({ submit: "Sorry, your information could not be sent. Please try again." });
    } finally {
      setIsTipSubmitting(false);
    }
  };

  const BackButton = () => (
    <button type="button" className="vz-back" onClick={() => setView(null)}>
      <ArrowLeft /> Back to start
    </button>
  );

  return (
    <div className="bz-page">
      {/* Title */}
      <div className="svc-hero svc-hero--teal">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><HeartIcon /></span>BSWD</div>
            <h2 className="svc-hero__title">Barangay Social Welfare and Development</h2>
            <p className="svc-hero__sub">Seek information and assistance for social welfare concerns, including support for individuals and families in need of community services.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              Coordination: Barangay social welfare services and the appropriate city or municipal social welfare office
            </div>
          </div>
        </div>
      </div>

      <div className="bz-wrap" ref={topRef}>

        {/* ═════════ START SCREEN ═════════ */}
        {view === null && (
          <>
            <section className="bz-glance" aria-label="Quick facts">
              {FACTS.map((f) => (
                <div className="bz-fact" key={f.label}>
                  <span className="bz-fact__icon bz-fact__icon--teal">{f.icon}</span>
                  <div>
                    <div className="bz-fact__label">{f.label}</div>
                    <div className="bz-fact__value">{f.value}</div>
                  </div>
                </div>
              ))}
            </section>

            <section className="bz-card">
              <h3 className="bz-heading">What would you like to do?</h3>
              <p className="bz-text">Tap one of the big buttons below.</p>

              <div className="vz-choices">
                <button type="button" className="vz-choice" onClick={() => setView("report")}>
                  <span className="vz-choice__icon vz-choice__icon--teal"><ServiceMapPinIcon /></span>
                  <span className="vz-choice__body">
                    <span className="vz-choice__title">I saw someone who needs help.</span>
                    <span className="vz-choice__desc">Report a homeless or displaced person.</span>
                  </span>
                  <span className="vz-choice__arrow"><ArrowRight /></span>
                </button>

                <button type="button" className="vz-choice" onClick={() => setView("tip")}>
                  <span className="vz-choice__icon vz-choice__icon--green"><SendIcon /></span>
                  <span className="vz-choice__body">
                    <span className="vz-choice__title">I have information to share.</span>
                    <span className="vz-choice__desc">Send a tip about someone we may be able to help.</span>
                  </span>
                  <span className="vz-choice__arrow"><ArrowRight /></span>
                </button>
              </div>
            </section>

            <section className="bz-card bz-card--about">
              <h3 className="bz-heading">About BSWD</h3>
              <p className="bz-text">
                BSWD, the Barangay Social Welfare and Development office, helps with social welfare concerns, including support for individuals and families who need community services.
              </p>
              <div className="bz-legal">Coordination: Barangay social welfare services and the appropriate city or municipal social welfare office</div>
            </section>
          </>
        )}

        {/* ═════════ REPORT ═════════ */}
        {view === "report" && (
          <section className="bz-card">
            <BackButton />

            {reportSubmitted ? (
              <div className="bf-done">
                <span className="bf-done__icon"><BigCheck /></span>
                <h3 className="bz-heading">Report sent. Thank you!</h3>
                <p className="bz-text">Our BSWD officer will follow up within 24 to 48 hours.</p>
                <div className="bf-done__btns">
                  <button type="button" className="bf-secondary" onClick={() => { setReportForm(BLANK_REPORT); setReportSubmitted(false); setReportFile(null); }}>
                    Report another person
                  </button>
                  <button type="button" className="bf-secondary" onClick={() => { setReportForm(BLANK_REPORT); setReportSubmitted(false); setReportFile(null); setView(null); }}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="bz-heading">Report a person who needs help</h3>
                <p className="bz-text">Fill in what you know. You can skip anything marked optional.</p>

                <div className="bz-note bf-tip">
                  <strong>Tip:</strong> The more you tell us, the faster we can find them. Mention nearby stores or street corners, and what the person is wearing.
                </div>

                <div className="bf-form">
                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-location">Where did you see them? <span className="bf-pill bf-pill--req">Required</span></label>
                    <input id="bf-location" className={`bf-input${reportErrors.location ? " bf-input--error" : ""}`} value={reportForm.location} onChange={e => setR("location", e.target.value)} placeholder="Example: McArthur Highway" disabled={isSubmitting} />
                    {reportErrors.location && <div className="bf-error">{reportErrors.location}</div>}
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-landmark">Anything nearby? <span className="bf-pill">Optional</span></label>
                    <input id="bf-landmark" className="bf-input" value={reportForm.landmark} onChange={e => setR("landmark", e.target.value)} placeholder="Example: near the 7-Eleven" disabled={isSubmitting} />
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-lastseen">When did you see them? <span className="bf-pill">Optional</span></label>
                    <input id="bf-lastseen" className="bf-input" value={reportForm.lastSeen} onChange={e => setR("lastSeen", e.target.value)} placeholder="Example: today at 2:30 PM" disabled={isSubmitting} />
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-desc">Describe the person <span className="bf-pill bf-pill--req">Required</span></label>
                    <textarea id="bf-desc" className={`bf-textarea${reportErrors.description ? " bf-input--error" : ""}`} rows={4} value={reportForm.description} onChange={e => setR("description", e.target.value)} placeholder="Clothes, about how old, and what help they may need" disabled={isSubmitting} />
                    {reportErrors.description && <div className="bf-error">{reportErrors.description}</div>}
                  </div>

                  <div className="bf-field">
                    <div className="bf-label">Photo <span className="bf-pill">Optional</span></div>
                    <label className={`bf-photo${reportForm.photo ? " is-filled" : ""}`} style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? "not-allowed" : "pointer" }}>
                      <input
                        type="file" accept="image/*" style={{ display: "none" }} disabled={isSubmitting}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) { setReportFile(file); setR("photo", file.name); }
                        }}
                      />
                      <CameraIcon />
                      <span className="bf-photo__text">
                        {reportForm.photo ? (
                          <>
                            <strong>Photo added</strong>
                            <small>{reportForm.photo} · Tap to change</small>
                          </>
                        ) : (
                          <>
                            <strong>Tap here to add a photo</strong>
                            <small>Show the surroundings so we can find the spot</small>
                          </>
                        )}
                      </span>
                    </label>
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-name">Your name <span className="bf-pill">Optional</span></label>
                    <input id="bf-name" className="bf-input" value={reportForm.name} onChange={e => setR("name", e.target.value)} placeholder="Leave empty to stay anonymous" disabled={isSubmitting} />
                  </div>

                  {reportErrors.submit && <div className="bf-alert">{reportErrors.submit}</div>}

                  <button type="button" className="bf-submit" onClick={submitReport} disabled={isSubmitting}>
                    <SendIcon /> {isSubmitting ? "Sending, please wait..." : "Send Report"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ═════════ TIP ═════════ */}
        {view === "tip" && (
          <section className="bz-card">
            <BackButton />

            {tipSubmitted ? (
              <div className="bf-done">
                <span className="bf-done__icon"><BigCheck /></span>
                <h3 className="bz-heading">Information received. Thank you!</h3>
                <p className="bz-text">We have sent what you told us to the BSWD officer.</p>
                <div className="bf-done__btns">
                  <button type="button" className="bf-secondary" onClick={() => { setTipForm(BLANK_TIP); setTipSubmitted(false); }}>
                    Send more information
                  </button>
                  <button type="button" className="bf-secondary" onClick={() => { setTipForm(BLANK_TIP); setTipSubmitted(false); setView(null); }}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="bz-heading">Share information with us</h3>
                <p className="bz-text">Do you know something that could help us assist a homeless person? Tell us here.</p>

                <div className="bf-form">
                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-about">Who is this about? <span className="bf-pill bf-pill--req">Required</span></label>
                    <input id="bf-about" className={`bf-input${tipErrors.about ? " bf-input--error" : ""}`} value={tipForm.about} onChange={e => setT("about", e.target.value)} placeholder="Name or describe the person" disabled={isTipSubmitting} />
                    {tipErrors.about && <div className="bf-error">{tipErrors.about}</div>}
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-tip">What do you know? <span className="bf-pill bf-pill--req">Required</span></label>
                    <textarea id="bf-tip" className={`bf-textarea${tipErrors.tip ? " bf-input--error" : ""}`} rows={4} value={tipForm.tip} onChange={e => setT("tip", e.target.value)} placeholder="Anything that may help us" disabled={isTipSubmitting} />
                    {tipErrors.tip && <div className="bf-error">{tipErrors.tip}</div>}
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-contact">Your phone or email <span className="bf-pill">Optional</span></label>
                    <input id="bf-contact" className="bf-input" value={tipForm.contact} onChange={e => setT("contact", e.target.value)} placeholder="If you want us to contact you" disabled={isTipSubmitting} />
                  </div>

                  {tipErrors.submit && <div className="bf-alert">{tipErrors.submit}</div>}

                  <button type="button" className="bf-submit" onClick={submitTip} disabled={isTipSubmitting}>
                    <SendIcon /> {isTipSubmitting ? "Sending, please wait..." : "Send Information"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

      </div>
    </div>
  );
}