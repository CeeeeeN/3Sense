import { useState, useEffect } from "react";
import { auth, db } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { createNotification } from '../services/notifications';
import {
  StarIcon, CheckCircleIcon, BoltIcon, ShieldIcon,
  MapPinIcon, UploadIcon, ArrowLeftIcon, HomeIcon, ActivityIcon, CheckSmallIcon
} from '../components/Icons';
import { useLanguage } from '../context/LanguageContext';

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

const generateRefId = () => {
  const num = Math.floor(Math.random() * 900) + 100;
  return `FB-${new Date().getFullYear()}-${num}`;
};

// ── SESSION HELPER ────────────────────────────────────────────────────────────
const getSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback; }
  catch { return fallback; }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getTodayStr = () => new Date().toISOString().split("T")[0]; // YYYY-MM-DD

/**
 * Validate the QR URL parameters.
 * Returns: { valid: true } | { valid: false, reason: "expired" | "ended" | "not_started" | "unknown" }
 *
 * Rules:
 *  1. `dt` must equal today's date (daily rotation)
 *  2. If type === "program", today must be >= startDate AND <= endDate
 */
const validateQRParams = (params) => {
  const dt        = params.get("dt");
  const type      = params.get("type");      // "program" | "service" | null (legacy)
  const startDate = params.get("startDate");
  const endDate   = params.get("endDate");
  const today     = getTodayStr();

  // ── If no dt param at all, this is a legacy QR (pre-feature) — allow it ──
  if (!dt) return { valid: true };

  // 1. Daily token check
  if (dt !== today) {
    return { valid: false, reason: "expired", dt, today };
  }

  // 2. Program date range check
  if (type === "program" && startDate && endDate) {
    if (today < startDate) return { valid: false, reason: "not_started", startDate, endDate };
    if (today > endDate)   return { valid: false, reason: "ended",       startDate, endDate };
  }

  return { valid: true };
};

// ── QR Invalid Screen ─────────────────────────────────────────────────────────
function QRInvalidScreen({ reason, startDate, endDate, onGoHome }) {
  const { t } = useLanguage();
  const config = {
    expired: {
      icon:    "🔒",
      title:   "QR Code Expired",
      message: "This QR code was valid only for a specific date. Please ask the barangay staff to generate a new QR code for today.",
      color:   "#dc2626",
      bg:      "#fee2e2",
      border:  "#fca5a5",
    },
    ended: {
      icon:    "📅",
      title:   "Program Has Ended",
      message: `This program ran from ${startDate} to ${endDate} and is no longer active. This QR code can no longer be used.`,
      color:   "#7c3aed",
      bg:      "#ede9fe",
      border:  "#c4b5fd",
    },
    not_started: {
      icon:    "⏳",
      title:   "Program Not Yet Started",
      message: `This program starts on ${startDate}. Please come back on or after that date to use this QR code.`,
      color:   "#b45309",
      bg:      "#fef3c7",
      border:  "#fde68a",
    },
    unknown: {
      icon:    "⚠️",
      title:   "Invalid QR Code",
      message: "This QR code is not recognized or may have been tampered with. Please request a valid QR code from barangay staff.",
      color:   "#6b7280",
      bg:      "#f3f4f6",
      border:  "#e5e7eb",
    },
  };

  const c = config[reason] || config.unknown;

  return (
    <main className="fb-page">
      <div className="fb-topbar">
        <div className="fb-topbar__title">{t('qr_verification', 'QR Verification')}</div>
      </div>
      <div className="fb-card" style={{ textAlign: "center", padding: "40px 24px" }}>
        {/* Icon */}
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>{c.icon}</div>

        {/* Status badge */}
        <div style={{ display: "inline-block", background: c.bg, border: `1px solid ${c.border}`, color: c.color, borderRadius: "9999px", padding: "4px 14px", fontSize: "0.78rem", fontWeight: 700, marginBottom: "16px", letterSpacing: "0.04em" }}>
          {reason === "expired"     && "EXPIRED"}
          {reason === "ended"       && "PROGRAM ENDED"}
          {reason === "not_started" && "NOT YET ACTIVE"}
          {reason === "unknown"     && "INVALID"}
        </div>

        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>{c.title}</h2>
        <p style={{ color: "#6b7280", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: "28px" }}>{c.message}</p>

        {/* Date info for program reasons */}
        {(reason === "ended" || reason === "not_started") && startDate && endDate && (
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 16px", marginBottom: "24px", fontSize: "0.85rem", color: "#374151" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
              <div><div style={{ color: "#9ca3af", fontSize: "0.75rem", marginBottom: 2 }}>START DATE</div><strong>{startDate}</strong></div>
              <div><div style={{ color: "#9ca3af", fontSize: "0.75rem", marginBottom: 2 }}>END DATE</div><strong>{endDate}</strong></div>
              <div><div style={{ color: "#9ca3af", fontSize: "0.75rem", marginBottom: 2 }}>TODAY</div><strong>{getTodayStr()}</strong></div>
            </div>
          </div>
        )}

        {/* Today vs QR date for expired */}
        {reason === "expired" && (
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 16px", marginBottom: "24px", fontSize: "0.85rem", color: "#374151" }}>
            <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginBottom: 4 }}>TODAY'S DATE</div>
            <strong style={{ fontSize: "1rem" }}>{getTodayStr()}</strong>
            <div style={{ marginTop: 8, color: "#9ca3af", fontSize: "0.78rem" }}>Ask staff to generate today's QR code.</div>
          </div>
        )}



        <button
          onClick={onGoHome}
          style={{ width: "100%", padding: "14px", background: "#317D89", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}
        >
          <HomeIcon style={{ marginRight: 6, verticalAlign: "middle" }} /> {t('feedback_confirm_home', 'Back to Home')}
        </button>
      </div>
    </main>
  );
}

// ── Success Confirmation ──────────────────────────────────────────────────────
function FeedbackConfirmation({ refId, serviceName, onGoHome, onGoActivity }) {
  const { t } = useLanguage();
  return (
    <div className="fb-confirm-wrap">
      <div className="fb-confirm-icon"><CheckCircleIcon /></div>
      <h2 className="fb-confirm-title">{t('feedback_confirm_title')}</h2>
      <p className="fb-confirm-sub">
        {t('feedback_confirm_sub', serviceName)}
      </p>
      <div className="fb-confirm-ref">
        <span className="fb-confirm-ref__label">{t('feedback_confirm_ref')}</span>
        <span className="fb-confirm-ref__id">{refId}</span>
      </div>
      <div className="fb-confirm-status-wrap">
        <div className="fb-confirm-status-title">{t('feedback_confirm_status')}</div>
        <div className="fb-confirm-timeline">
          <div className="fb-confirm-timeline__track">
            <div className="fb-confirm-timeline__fill" style={{ width: "50%" }} />
          </div>
          <div className="fb-confirm-timeline__steps">
            <div className="fb-confirm-timeline__step fb-confirm-timeline__step--done">
              <div className="fb-confirm-timeline__dot fb-confirm-timeline__dot--done"><CheckSmallIcon /></div>
              <span>{t('feedback_confirm_submitted')}</span>
            </div>
            <div className="fb-confirm-timeline__step fb-confirm-timeline__step--active">
              <div className="fb-confirm-timeline__dot fb-confirm-timeline__dot--active" />
              <span>{t('feedback_confirm_review')}</span>
            </div>
            <div className="fb-confirm-timeline__step">
              <div className="fb-confirm-timeline__dot" />
              <span>{t('feedback_confirm_resolved')}</span>
            </div>
          </div>
        </div>
        <div className="fb-confirm-ai-note">
          {t('feedback_confirm_ai_note')}
        </div>
      </div>
      <div className="fb-confirm-actions">
        <button className="fb-confirm-btn-primary" onClick={onGoActivity}><ActivityIcon /> {t('feedback_confirm_view_activity')}</button>
        <button className="fb-confirm-btn-ghost"   onClick={onGoHome}><HomeIcon /> {t('feedback_confirm_home')}</button>
      </div>
      <p className="fb-confirm-footnote">{t('feedback_confirm_footnote')}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FeedbackForm({ onNavigate, service, userName = "Resident", householdID, userID, userData }) {
  const { t } = useLanguage();
  const starLabels = ["", t('feedback_star_poor'), t('feedback_star_fair'), t('feedback_star_good'), t('feedback_star_vgood'), t('feedback_star_excellent')];
  const [rating,       setRating]       = useState(0);
  const [hoverRating,  setHoverRating]  = useState(0);
  const [comment,      setComment]      = useState("");
  const [photo,        setPhoto]        = useState(null);
  const [photoName,    setPhotoName]    = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [refId,        setRefId]        = useState("");
  const [errors,       setErrors]       = useState({});

  const [serviceId,    setServiceId]    = useState("general");
  const [serviceName,  setServiceName]  = useState("General Barangay Service");
  const [category,     setCategory]     = useState("General");
  const [authChecked,  setAuthChecked]  = useState(false);

  const [alertTxId,    setAlertTxId]    = useState(null);
  const [alertTxType,  setAlertTxType]  = useState(null);

  // ── QR validation state ───────────────────────────────────────────────────────
  // null = not yet checked, { valid, reason, startDate, endDate } after check
  const [qrValidation, setQrValidation] = useState(null);

  // ── Auth check ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) { if (onNavigate) onNavigate("logout"); }
      else        { setAuthChecked(true); }
    });
    return () => unsubscribe();
  }, [onNavigate]);

  // ── Parse URL params + run QR validation ─────────────────────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    if (service && service.name) {
      // Service passed via props
      setServiceId(service.id);
      setServiceName(service.name || service.fullName || "General Barangay Service");
      setCategory(service.category || "General");
      setQrValidation({ valid: true });
    } else {
      // Extract QR params AND Alert params safely
      const scannedId   = urlParams.get("serviceId");
      const scannedName = urlParams.get("serviceName");
      const scannedCat  = urlParams.get("category");
      
      const alertRefId  = urlParams.get("refId");
      const alertTitle  = urlParams.get("title");
      const alertType   = urlParams.get("type");

      if (scannedId) {
        // Came from a QR Scan
        setServiceId(scannedId);
        setServiceName(scannedName || "General Barangay Service");
        setCategory(scannedCat || "General");
      } else if (alertRefId) {
        // Came from a Dashboard Alert Banner
        setServiceId(alertRefId); 
        setServiceName(alertTitle || "Barangay Service");
        setCategory(alertType || "General");
        setQrValidation({ valid: true }); // Automatically approve alerts
        setAlertTxId(alertRefId);
        setAlertTxType(alertType);
        return; 
      }

      // Run QR validation ONLY if it wasn't an alert link
      const result = validateQRParams(urlParams);
      setQrValidation(result);
    }
  }, [service]);

  // ── Loading screens ───────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <main className="fb-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Loading authentication...
      </main>
    );
  }

  if (qrValidation === null) {
    return (
      <main className="fb-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Verifying QR code...
      </main>
    );
  }

  // ── QR Invalid → show error screen ───────────────────────────────────────────
  if (!qrValidation.valid) {
    const fallbackParams = new URLSearchParams(window.location.search);
    return (
      <QRInvalidScreen
        reason={qrValidation.reason || "unknown"}
        startDate={qrValidation.startDate || fallbackParams.get("startDate")}
        endDate={qrValidation.endDate   || fallbackParams.get("endDate")}
        onGoHome={() => onNavigate && onNavigate("home")}
      />
    );
  }

  // ── Normal form below (QR is valid) ──────────────────────────────────────────
  const defaultService = {
    description: "Your feedback helps us improve public services.",
    color:  "#317D89",
    bg:     "rgba(49,125,137,0.08)",
    border: "rgba(49,125,137,0.2)",
  };
  const currentService = { ...defaultService, ...(service || {}) };

  const displayRating = hoverRating || rating;

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File must be under 5MB."); return; }
    setPhoto(file);
    setPhotoName(file.name);
  };

  const validate = () => {
    const e = {};
    if (!rating)         e.rating  = "Please select a star rating.";
    if (!comment.trim()) e.comment = "Please describe your experience.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      let uploadedImageUrl = null;

      if (photo) {
        const formData = new FormData();
        formData.append("file", photo);
        formData.append("upload_preset", "3Sense+_Feedback");

        const cloudinaryResponse = await fetch(
          "https://api.cloudinary.com/v1_1/dfnqeiksu/image/upload",
          { method: "POST", body: formData }
        );
        if (!cloudinaryResponse.ok) throw new Error("Failed to upload image to Cloudinary");
        const cloudinaryData = await cloudinaryResponse.json();
        uploadedImageUrl = cloudinaryData.secure_url;
      }

      const ref    = generateRefId();
      
      // <-- EXTRACT & INJECT PERMANENT UID HERE
      const userUID = userData?.UID || getSaved("UID", null);

      const docRef = await addDoc(collection(db, "feedback"), {
        referenceID:     ref,
        UID:             userUID || "", // <-- INJECTED UID
        facilityID:      serviceId,
        facilityName:    serviceName,
        category,
        rating,
        comment,
        status:          "pending_ai",
        createdAt:       serverTimestamp(),
        userName,
        householdID:     householdID || "",
        residentID:      userID || "",
        imageUrl:        uploadedImageUrl,
        severity:        null, sentiment: null, confidence: null,
        hybridScore:     null, textScore: null,
        detectedIssue:   "None", issueConfidence: null,
      });

      // Update the original document so the Alert disappears
      const urlParams = new URLSearchParams(window.location.search);
      const alertType = urlParams.get("type"); // e.g., "DOCUMENT", "FACILITY"
      const alertRefId = urlParams.get("refId"); // The ID of the original transaction

      try {
        if (alertTxId && alertTxType) {
        let collectionName = "";
        
        // Map the alert type to the exact Firestore collection
        if (alertTxType === "DOCUMENT") collectionName = "document_requests";
        else if (alertTxType === "FACILITY") collectionName = "facility_reservations";
        else if (alertTxType === "LIVELIHOOD") collectionName = "livelihoodRegistrations";
        else if (alertTxType === "PEACE_AND_ORDER") collectionName = "incidentReports";
        else if (alertTxType === "BSWD_REPORT") collectionName = "bswdReports";
        else if (alertTxType === "GENERAL_PROGRAM") {
             await updateDoc(doc(db, alertTxId), {
                feedbackSubmitted: true,
                feedbackReferenceID: ref 
             });
             return; 
          }
          

        if (collectionName) {
          await updateDoc(doc(db, collectionName, alertTxId), {
            feedbackSubmitted: true,
            feedbackReferenceID: ref 
          });
        }
      }
      } catch (error) {
        
      }

      setRefId(ref);
      setSubmitted(true);
      setSubmitting(false);

      // Background AI analysis
      analyzeAndSyncFeedback(docRef.id, comment, rating);

      // Notify admins
      await createNotification(
        "feedback",
        `New ${STAR_LABELS[rating]} (${rating}★) feedback on "${serviceName}" submitted by ${userName}.`,
        userName,
        ref
      );
    } catch (error) {
      console.error("Full Error Details:", error);
      alert(`System Error: ${error.message}`);
      setSubmitting(false);
    }
  };

  const analyzeAndSyncFeedback = async (documentId, text, rtg) => {
    try {
      const aiResponse = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text, rating: rtg }),
      });
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        await updateDoc(doc(db, "feedback", documentId), {
          sentiment:       aiData.sentiment      || null,
          confidence:      aiData.confidence     || null,
          hybridScore:     aiData.hybridScore    || null,
          severity:        aiData.severity       || (aiData.sentiment === "Negative" ? "High" : "Normal"),
          textScore:       aiData.textScore      || null,
          detectedIssue:   aiData.detectedIssue  || "None",
          issueConfidence: aiData.issueConfidence || null,
          status:          aiData.sentiment ? "analyzed" : "pending",
          aiNotes:         aiData.suggestions
            ? `AI Suggestions:\n- Actions: ${aiData.suggestions.actions.join("; ")}\n- Strategy: ${aiData.suggestions.strategy.join("; ")}`
            : "No suggestions available.",
          adminNotes: "",
        });
      } else {
        await updateDoc(doc(db, "feedback", documentId), { status: "analysis_failed" });
      }
    } catch (err) {
      console.error("Background AI Analysis Failed:", err);
      await updateDoc(doc(db, "feedback", documentId), { status: "analysis_failed" });
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="fb-page">
        <div className="fb-topbar"><div className="fb-topbar__title">{t('feedback_title')}</div></div>
        <div className="fb-card">
          <FeedbackConfirmation
            refId={refId}
            serviceName={serviceName}
            onGoHome={() => onNavigate && onNavigate("home")}
            onGoActivity={() => onNavigate && onNavigate("activity")}
          />
        </div>
      </main>
    );
  }

  // ── Feedback form ─────────────────────────────────────────────────────────────
  return (
    <main className="fb-page">
      <div className="fb-topbar">
        <button className="fb-topbar__back" onClick={() => onNavigate && onNavigate("scan")}><ArrowLeftIcon /></button>
        <div className="fb-topbar__title">{t('feedback_title')}</div>
      </div>
      <div className="fb-card">
        <div className="fb-verified-banner">
          <CheckCircleIcon style={{ width: 16, height: 16 }} />
          <span>{t('feedback_attendance_verified')}</span>
        </div>
        <div className="fb-service-info" style={{ background: currentService.bg, borderColor: currentService.border }}>
          <div className="fb-service-info__icon" style={{ color: currentService.color }}><MapPinIcon /></div>
          <div>
            <div className="fb-service-info__label">Service / Event • {category}</div>
            <div className="fb-service-info__name">{serviceName}</div>
            <div className="fb-service-info__desc">{currentService.description}</div>
          </div>
        </div>

        <div className="fb-field">
          <label className="fb-label">{t('feedback_rate_label')} <span className="fb-required">*</span></label>
          <p className="fb-hint">{t('feedback_rate_hint')}</p>
          <div className="fb-stars-wrap">
            <p className="fb-stars-prompt">{t('feedback_rate_prompt')}</p>
            <div className="fb-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`fb-star-btn${displayRating >= star ? " fb-star-btn--filled" : ""}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  type="button"
                  aria-label={`Rate ${star} star`}
                >
                  <StarIcon filled={displayRating >= star} />
                  <span className="fb-star-label">{starLabels[star]}</span>
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <div className="fb-star-selected-label" style={{ color: currentService.color }}>
                {starLabels[displayRating]} ({displayRating}/5)
              </div>
            )}
          </div>
          {errors.rating && <span className="fb-error-msg">{errors.rating}</span>}
        </div>

        <div className="fb-field">
          <label className="fb-label">{t('feedback_comments_label')} <span className="fb-required">*</span></label>
          <p className="fb-hint">{t('feedback_comments_hint')}</p>
          <textarea
            className={`fb-textarea${errors.comment ? " fb-textarea--error" : ""}`}
            rows={5} placeholder={t('feedback_comments_placeholder')}
            value={comment} onChange={(e) => setComment(e.target.value)}
          />
          <p className="fb-char-hint">{t('feedback_comments_details')}</p>
          {errors.comment && <span className="fb-error-msg">{errors.comment}</span>}
        </div>

        <div className="fb-field">
          <label className="fb-label">{t('feedback_image_label')}</label>
          <p className="fb-hint">{t('feedback_image_hint')}</p>
          <label className="fb-upload-box">
            <input type="file" accept=".jpg,.jpeg,.png" style={{ display: "none" }} onChange={handlePhotoUpload} />
            {photoName ? (
              <div className="fb-upload-done">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2DB17B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{photoName}</span>
              </div>
            ) : (
              <div className="fb-upload-placeholder">
                <UploadIcon />
                <span className="fb-upload-text">{t('feedback_click_upload')}</span>
                <span className="fb-upload-hint">{t('feedback_upload_hint')}</span>
              </div>
            )}
          </label>
        </div>

        <div className="fb-ai-notice">
          <div className="fb-ai-notice__icon"><BoltIcon /></div>
          <div>
            <div className="fb-ai-notice__title">{t('feedback_ai_title')}</div>
            <div className="fb-ai-notice__desc">{t('feedback_ai_desc')}</div>
          </div>
        </div>

        <div className="fb-privacy-notice">
          <ShieldIcon />
          <span>
            <strong>{t('feedback_privacy_title')}</strong> {t('feedback_privacy_desc')}
          </span>
        </div>

        <button
          className="fb-submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ background: submitting ? "#a0b5c8" : currentService?.color || "#317D89", cursor: submitting ? "not-allowed" : "pointer" }}
        >
          {submitting ? <><span className="fb-submit-spinner" /> {t('feedback_submitting')}</> : t('feedback_submit')}
        </button>
        <p className="fb-submit-note">{t('feedback_submit_note')}</p>
      </div>
    </main>
  );
}