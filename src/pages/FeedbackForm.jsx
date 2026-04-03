import { useState, useEffect } from "react";
import { db } from '../firebase/firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { StarIcon, CheckCircleIcon, BoltIcon, ShieldIcon, MapPinIcon, UploadIcon, ArrowLeftIcon, HomeIcon, ActivityIcon, CheckSmallIcon } from '../components/Icons';

// STAR RATING LABEL
const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

// GENERATE REFERENCE ID
const generateRefId = () => {
  const num = Math.floor(Math.random() * 900) + 100;
  return `MAL-2026-${num}`;
};

// CONFIRMATION SCREEN
function FeedbackConfirmation({ refId, serviceName, onGoHome, onGoActivity }) {
  return (
    <div className="fb-confirm-wrap">
      {/* Success Icon */}
      <div className="fb-confirm-icon">
        <CheckCircleIcon />
      </div>

      <h2 className="fb-confirm-title">Feedback Successfully Submitted</h2>
      <p className="fb-confirm-sub">
        Thank you for submitting your feedback regarding the {serviceName}. Your submission has been received and recorded.
      </p>

      {/* Reference ID */}
      <div className="fb-confirm-ref">
        <span className="fb-confirm-ref__label">Reference ID</span>
        <span className="fb-confirm-ref__id">{refId}</span>
      </div>

      {/* Submission Status */}
      <div className="fb-confirm-status-wrap">
        <div className="fb-confirm-status-title">Submission Status</div>
        <div className="fb-confirm-timeline">
          <div className="fb-confirm-timeline__track">
            <div className="fb-confirm-timeline__fill" style={{ width: "50%" }} />
          </div>
          <div className="fb-confirm-timeline__steps">
            <div className="fb-confirm-timeline__step fb-confirm-timeline__step--done">
              <div className="fb-confirm-timeline__dot fb-confirm-timeline__dot--done">
                <CheckSmallIcon />
              </div>
              <span>Submitted</span>
            </div>
            <div className="fb-confirm-timeline__step fb-confirm-timeline__step--active">
              <div className="fb-confirm-timeline__dot fb-confirm-timeline__dot--active" />
              <span>Under Review</span>
            </div>
            <div className="fb-confirm-timeline__step">
              <div className="fb-confirm-timeline__dot" />
              <span>Resolved</span>
            </div>
          </div>
        </div>

        {/* AI Notice */}
        <div className="fb-confirm-ai-note">
          Automated analysis has been completed. Your feedback is currently under review.
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fb-confirm-actions">
        <button className="fb-confirm-btn-primary" onClick={onGoActivity}>
          <ActivityIcon /> View Progress in Activity
        </button>
        <button className="fb-confirm-btn-ghost" onClick={onGoHome}>
          <HomeIcon /> Back to Home
        </button>
      </div>

      <p className="fb-confirm-footnote">This submission has been recorded for reference purposes.</p>
    </div>
  );
}

// MAIN FEEDBACK FORM
export default function FeedbackForm({ onNavigate, service, userName = "Resident" }) {
  const [rating, setRating]         = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment]       = useState("");
  const [photo, setPhoto]           = useState(null);
  const [photoName, setPhotoName]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [refId, setRefId]           = useState("");
  const [errors, setErrors]         = useState({});

  const [serviceId, setServiceId] = useState("general");
  const [serviceName, setServiceName] = useState("General Barangay Service");

  useEffect(() => {
    // Check if the app successfully passed the service as a prop (e.g. from QR scan or navigation)
    if (service && service.name) {
      setServiceId(service.id);
      setServiceName(service.name || service.fullName || "General Barangay Service");
    } else {
      // Fallback: Grab BOTH the ID and Name from the QR Code URL
      const urlParams = new URLSearchParams(window.location.search);
      const scannedId = urlParams.get('serviceId');
      const scannedName = urlParams.get('serviceName');

      if (scannedId) {
        setServiceId(scannedId);
        setServiceName(scannedName || "General Barangay Service");
      }
    }
  }, [service]);

  // Fallback styling if no service prop is passed
  const currentService = service || {
    description: "Your feedback helps us improve public services.",
    color: "#317D89",
    bg: "rgba(49,125,137,0.08)",
    border: "rgba(49,125,137,0.2)",
  };

  const displayRating = hoverRating || rating;

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be under 5MB.");
      return;
    }
    setPhoto(file);
    setPhotoName(file.name);
  };

  const validate = () => {
    const e = {};
    if (!rating) e.rating = "Please select a star rating.";
    if (!comment.trim()) e.comment = "Please describe your experience.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    
    try {
      const ref = generateRefId();

      // default AI fallback values
      let finalSentiment = null;
      let finalConfidence = null;
      let finalStatus = 'pending'; // Default if AI fails
      
      // Try to send feedback to AI analysis API, but don't block submission if it fails (e.g. 405 or network error)
      try {
        const aiResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: comment })
        });

        // Only parse JSON if the API actually succeeded (Not a 405!)
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          finalSentiment = aiData.sentiment || null;
          finalConfidence = aiData.confidence || null;
          if (finalSentiment) {
            finalStatus = 'analyzed';
          } else {
            console.warn("API succeeded, but returned null data. Setting to pending.");
            finalStatus = 'pending'; 
          }
        } else {
          console.warn(`AI API returned a ${aiResponse.status} error. Skipping AI analysis.`);
          finalStatus = 'analysis_failed';
        }
      } catch (apiError) {
        console.warn("AI API completely unreachable. Skipping AI analysis.");
        finalStatus = 'analysis_failed';
      }

      // Save dynamic QR Code data to Firestore
      await addDoc(collection(db, "Feedback"), {
        ReferenceID: ref,
        FacilityID: serviceId,        // Uses dynamic QR ID
        FacilityName: serviceName,    // Uses dynamic UI Name
        Rating: rating,
        Comment: comment,
        Status: finalStatus,              // Save the final status after AI attempt
        Sentiment: finalSentiment,
        Confidence: finalConfidence,
        CreatedAt: serverTimestamp(),
        UserName: userName,
        HasPhoto: !!photo,
      });

      setRefId(ref);
      setSubmitted(true);
      
    } catch (error) {
      console.error("Full Error Details:", error);
      alert(`System Error: ${error.message}`); 
    } finally {
      setSubmitting(false);
    }
  };

  // SUBMITTED/CONFIRMATION SCREEN
  if (submitted) {
    return (
      <main className="fb-page">
        <div className="fb-topbar">
          <div className="fb-topbar__title">Feedback Confirmation</div>
        </div>
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

  // FEEDBACK FORM
  return (
    <main className="fb-page">
      {/* ── Top Bar ── */}
      <div className="fb-topbar">
        <button className="fb-topbar__back" onClick={() => onNavigate && onNavigate("scan")}>
          <ArrowLeftIcon />
        </button>
        <div className="fb-topbar__title">Service Feedback</div>
      </div>

      <div className="fb-card">

        {/* ── Attendance Verified Banner ── */}
        <div className="fb-verified-banner">
          <CheckCircleIcon style={{ width: 16, height: 16 }} />
          <span>Attendance Verified!</span>
        </div>

        {/* ── Service Info ── */}
        <div className="fb-service-info" style={{ background: currentService.bg, borderColor: currentService.border }}>
          <div className="fb-service-info__icon" style={{ color: currentService.color }}>
            <MapPinIcon />
          </div>
          <div>
            <div className="fb-service-info__label">Service / Event</div>
            {/* UPDATED: Displays dynamic name */}
            <div className="fb-service-info__name">{serviceName}</div>
            <div className="fb-service-info__desc">{currentService.description}</div>
          </div>
        </div>

        {/* ── Star Rating ── */}
        <div className="fb-field">
          <label className="fb-label">
            Rate your experience <span className="fb-required">*</span>
          </label>
          <p className="fb-hint">Please rate your overall experience with the service provided</p>

          <div className="fb-stars-wrap">
            <p className="fb-stars-prompt">How would you rate your experience today?</p>
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
                  <span className="fb-star-label">{STAR_LABELS[star]}</span>
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <div className="fb-star-selected-label" style={{ color: currentService.color }}>
                {STAR_LABELS[displayRating]} ({displayRating}/5)
              </div>
            )}
          </div>
          {errors.rating && <span className="fb-error-msg">{errors.rating}</span>}
        </div>

        {/* ── Comments ── */}
        <div className="fb-field">
          <label className="fb-label">
            Comments or Suggestions <span className="fb-required">*</span>
          </label>
          <p className="fb-hint">Share your experience to help us improve our services</p>
          <textarea
            className={`fb-textarea${errors.comment ? " fb-textarea--error" : ""}`}
            rows={5}
            placeholder="Write your detailed feedback..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="fb-char-hint">Please provide specific details to help us understand your concern.</p>
          {errors.comment && <span className="fb-error-msg">{errors.comment}</span>}
        </div>

        {/* ── Photo Upload ── */}
        <div className="fb-field">
          <label className="fb-label">Image (Optional)</label>
          <p className="fb-hint">Attach photo documentation if applicable</p>
          <label className="fb-upload-box">
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={handlePhotoUpload}
            />
            {photoName ? (
              <div className="fb-upload-done">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2DB17B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>{photoName}</span>
              </div>
            ) : (
              <div className="fb-upload-placeholder">
                <UploadIcon />
                <span className="fb-upload-text">Click to upload</span>
                <span className="fb-upload-hint">Supports JPG, PNG (Max 5MB)</span>
              </div>
            )}
          </label>
        </div>

        {/* ── AI Notice ── */}
        <div className="fb-ai-notice">
          <div className="fb-ai-notice__icon">
            <BoltIcon />
          </div>
          <div>
            <div className="fb-ai-notice__title">AI-Powered Analysis System</div>
            <div className="fb-ai-notice__desc">
              Your feedback will be automatically analyzed by our intelligent system to detect priority concerns and route them to the appropriate department for faster resolution.
            </div>
          </div>
        </div>

        {/* ── Privacy Notice ── */}
        <div className="fb-privacy-notice">
          <ShieldIcon />
          <span>
            <strong>Data Privacy Statement:</strong> Your personal information and feedback are protected under the Data Privacy Act of 2012 (RA 10173). All submissions are confidential and will only be used for service improvement purposes. For questions, contact our Barangay Data Privacy Officer.
          </span>
        </div>

        {/* ── Submit ── */}
        <button
          className="fb-submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ background: submitting ? "#a0b5c8" : currentService.color }}
        >
          {submitting ? (
            <>
              <span className="fb-submit-spinner" /> Submitting...
            </>
          ) : (
            "Submit Feedback"
          )}
        </button>

        <p className="fb-submit-note">
          By submitting this form, you acknowledge that the information provided is accurate and complete.
        </p>
      </div>
    </main>
  );
}