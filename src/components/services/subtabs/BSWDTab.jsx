import React, { useState, useEffect, useRef } from "react";
import { HeartIcon, ServiceMapPinIcon, SendIcon } from "../../Icons";
import { submitBSWDReport, submitBSWDTip } from "../../../services/services";
import { createNotification } from "../../../services/notifications";
import { useLanguage } from "../../../context/LanguageContext";

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

const BLANK_REPORT = { name: "", location: "", landmark: "", lastSeen: "", description: "", photo: "" };
const BLANK_TIP = { about: "", tip: "", contact: "" };

const getInitialReportState = (userData) => {
  return {
    ...BLANK_REPORT,
    name: userData ? [userData.firstName, userData.lastName].filter(Boolean).join(" ") : ""
  };
};

export default function BSWDTab({ userData, householdID }) {
  const { t } = useLanguage();
  const [view, setView] = useState(null); // null | "report" | "tip"
  const topRef = useRef(null);

  const [reportForm, setReportForm] = useState(() => getInitialReportState(userData));
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

  const facts = [
    { icon: <PeopleIcon />, label: t("bswd_fact_who_label"), value: t("bswd_fact_who_val") },
    { icon: <LockIcon />,   label: t("bswd_fact_privacy_label"), value: t("bswd_fact_privacy_val") },
    { icon: <ClockIcon />,  label: t("bswd_fact_next_label"), value: t("bswd_fact_next_val") },
  ];

  const submitReport = async () => {
    const e = {};
    if (!reportForm.location.trim()) e.location = t("bswd_rep_err_location");
    if (!reportForm.description.trim()) e.description = t("bswd_rep_err_desc");
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
      setReportErrors({ submit: t("bswd_rep_err_submit") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTip = async () => {
    const e = {};
    if (!tipForm.about.trim()) e.about = t("bswd_tip_err_about");
    if (!tipForm.tip.trim()) e.tip = t("bswd_tip_err_tip");
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
      setTipErrors({ submit: t("bswd_tip_err_submit") });
    } finally {
      setIsTipSubmitting(false);
    }
  };

  const BackButton = () => (
    <button type="button" className="vz-back" onClick={() => setView(null)}>
      <ArrowLeft /> {t("bswd_back_start")}
    </button>
  );

  return (
    <div className="bz-page">
      {/* Title */}
      <div className="svc-hero svc-hero--teal bz-hero">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><HeartIcon /></span>{t("bswd_eyebrow")}</div>
            <h2 className="svc-hero__title">{t("bswd_hero_title")}</h2>
            <p className="svc-hero__sub">{t("bswd_sub")}</p>
          </div>
        </div>
      </div>

      <div className="bz-wrap" ref={topRef}>

        {/* ═════════ START SCREEN ═════════ */}
        {view === null && (
          <>
            <section className="bz-glance" aria-label={t("bswd_fact_who_label")}>
              {facts.map((f, i) => (
                <div className="bz-fact" key={i}>
                  <span className="bz-fact__icon bz-fact__icon--teal">{f.icon}</span>
                  <div>
                    <div className="bz-fact__label">{f.label}</div>
                    <div className="bz-fact__value">{f.value}</div>
                  </div>
                </div>
              ))}
            </section>

            <section className="bz-card">
              <h3 className="bz-heading">{t("bswd_choice_heading")}</h3>
              <p className="bz-text">{t("bswd_choice_sub")}</p>

              <div className="vz-choices">
                <button type="button" className="vz-choice" onClick={() => setView("report")}>
                  <span className="vz-choice__icon vz-choice__icon--teal"><ServiceMapPinIcon /></span>
                  <span className="vz-choice__body">
                    <span className="vz-choice__title">{t("bswd_choice_report_title")}</span>
                    <span className="vz-choice__desc">{t("bswd_choice_report_desc")}</span>
                  </span>
                  <span className="vz-choice__arrow"><ArrowRight /></span>
                </button>

                <button type="button" className="vz-choice" onClick={() => setView("tip")}>
                  <span className="vz-choice__icon vz-choice__icon--green"><SendIcon /></span>
                  <span className="vz-choice__body">
                    <span className="vz-choice__title">{t("bswd_choice_tip_title")}</span>
                    <span className="vz-choice__desc">{t("bswd_choice_tip_desc")}</span>
                  </span>
                  <span className="vz-choice__arrow"><ArrowRight /></span>
                </button>
              </div>
            </section>

            <section className="bz-card bz-card--about">
              <h3 className="bz-heading">{t("bswd_about_heading")}</h3>
              <p className="bz-text">{t("bswd_about_desc")}</p>
              <div className="bz-legal">{t("bswd_legal")}</div>
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
                <h3 className="bz-heading">{t("bswd_rep_done_heading")}</h3>
                <p className="bz-text">{t("bswd_rep_done_sub")}</p>
                <div className="bf-done__btns">
                  <button type="button" className="bf-secondary" onClick={() => { setReportForm(getInitialReportState(userData)); setReportSubmitted(false); setReportFile(null); }}>
                    {t("bswd_rep_btn_another")}
                  </button>
                  <button type="button" className="bf-secondary" onClick={() => { setReportForm(getInitialReportState(userData)); setReportSubmitted(false); setReportFile(null); setView(null); }}>
                    {t("bswd_rep_btn_done")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="bz-heading">{t("bswd_rep_form_heading")}</h3>
                <p className="bz-text">{t("bswd_rep_form_sub")}</p>

                <div className="bz-note bf-tip">
                  <strong>{t("bswd_rep_tip_strong")}</strong> {t("bswd_rep_tip_text")}
                </div>

                <div className="bf-form">
                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-location">{t("bswd_rep_lbl_location")} <span className="bf-pill bf-pill--req">{t("bswd_pill_required")}</span></label>
                    <input id="bf-location" className={`bf-input${reportErrors.location ? " bf-input--error" : ""}`} value={reportForm.location} onChange={e => setR("location", e.target.value)} placeholder={t("bswd_rep_ph_location")} disabled={isSubmitting} />
                    {reportErrors.location && <div className="bf-error">{reportErrors.location}</div>}
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-landmark">{t("bswd_rep_lbl_landmark")} <span className="bf-pill">{t("bswd_pill_optional")}</span></label>
                    <input id="bf-landmark" className="bf-input" value={reportForm.landmark} onChange={e => setR("landmark", e.target.value)} placeholder={t("bswd_rep_ph_landmark")} disabled={isSubmitting} />
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-lastseen">{t("bswd_rep_lbl_lastseen")} <span className="bf-pill">{t("bswd_pill_optional")}</span></label>
                    <input id="bf-lastseen" className="bf-input" value={reportForm.lastSeen} onChange={e => setR("lastSeen", e.target.value)} placeholder={t("bswd_rep_ph_lastseen")} disabled={isSubmitting} />
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-desc">{t("bswd_rep_lbl_desc")} <span className="bf-pill bf-pill--req">{t("bswd_pill_required")}</span></label>
                    <textarea id="bf-desc" className={`bf-textarea${reportErrors.description ? " bf-input--error" : ""}`} rows={4} value={reportForm.description} onChange={e => setR("description", e.target.value)} placeholder={t("bswd_rep_ph_desc")} disabled={isSubmitting} />
                    {reportErrors.description && <div className="bf-error">{reportErrors.description}</div>}
                  </div>

                  <div className="bf-field">
                    <div className="bf-label">{t("bswd_rep_lbl_photo")} <span className="bf-pill">{t("bswd_pill_optional")}</span></div>
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
                            <strong>{t("bswd_rep_photo_added")}</strong>
                            <small>{reportForm.photo} · {t("bswd_rep_photo_change")}</small>
                          </>
                        ) : (
                          <>
                            <strong>{t("bswd_rep_photo_add")}</strong>
                            <small>{t("bswd_rep_photo_hint")}</small>
                          </>
                        )}
                      </span>
                    </label>
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-name">{t("bswd_rep_lbl_name")} <span className="bf-pill">{t("bswd_pill_optional")}</span></label>
                    <input id="bf-name" className="bf-input" value={reportForm.name} onChange={e => setR("name", e.target.value)} placeholder={t("bswd_rep_ph_name")} disabled={isSubmitting} />
                  </div>

                  {reportErrors.submit && <div className="bf-alert">{reportErrors.submit}</div>}

                  <button type="button" className="bf-submit" onClick={submitReport} disabled={isSubmitting}>
                    <SendIcon /> {isSubmitting ? t("bswd_rep_btn_submitting") : t("bswd_rep_btn_submit")}
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
                <h3 className="bz-heading">{t("bswd_tip_done_heading")}</h3>
                <p className="bz-text">{t("bswd_tip_done_sub")}</p>
                <div className="bf-done__btns">
                  <button type="button" className="bf-secondary" onClick={() => { setTipForm(BLANK_TIP); setTipSubmitted(false); }}>
                    {t("bswd_tip_btn_more")}
                  </button>
                  <button type="button" className="bf-secondary" onClick={() => { setTipForm(BLANK_TIP); setTipSubmitted(false); setView(null); }}>
                    {t("bswd_tip_btn_done")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="bz-heading">{t("bswd_tip_form_heading")}</h3>
                <p className="bz-text">{t("bswd_tip_form_sub")}</p>

                <div className="bf-form">
                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-about">{t("bswd_tip_lbl_about")} <span className="bf-pill bf-pill--req">{t("bswd_pill_required")}</span></label>
                    <input id="bf-about" className={`bf-input${tipErrors.about ? " bf-input--error" : ""}`} value={tipForm.about} onChange={e => setT("about", e.target.value)} placeholder={t("bswd_tip_ph_about")} disabled={isTipSubmitting} />
                    {tipErrors.about && <div className="bf-error">{tipErrors.about}</div>}
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-tip">{t("bswd_tip_lbl_tip")} <span className="bf-pill bf-pill--req">{t("bswd_pill_required")}</span></label>
                    <textarea id="bf-tip" className={`bf-textarea${tipErrors.tip ? " bf-input--error" : ""}`} rows={4} value={tipForm.tip} onChange={e => setT("tip", e.target.value)} placeholder={t("bswd_tip_ph_tip")} disabled={isTipSubmitting} />
                    {tipErrors.tip && <div className="bf-error">{tipErrors.tip}</div>}
                  </div>

                  <div className="bf-field">
                    <label className="bf-label" htmlFor="bf-contact">{t("bswd_tip_lbl_contact")} <span className="bf-pill">{t("bswd_pill_optional")}</span></label>
                    <input id="bf-contact" className="bf-input" value={tipForm.contact} onChange={e => setT("contact", e.target.value)} placeholder={t("bswd_tip_ph_contact")} disabled={isTipSubmitting} />
                  </div>

                  {tipErrors.submit && <div className="bf-alert">{tipErrors.submit}</div>}

                  <button type="button" className="bf-submit" onClick={submitTip} disabled={isTipSubmitting}>
                    <SendIcon /> {isTipSubmitting ? t("bswd_tip_btn_submitting") : t("bswd_tip_btn_submit")}
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
