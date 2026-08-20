import React from 'react';
import './FeedbackModal.css';

/* ─────────────────────────────────────────────
   Dynamic content maps
───────────────────────────────────────────── */
const FEEDBACK_CONFIG = {
  DOCUMENT: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    label: 'Document Request',
    message:
      'Your document request has been successfully claimed. Please share your experience with the request process.',
  },
  FACILITY: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
    label: 'Facility Reservation',
    message:
      'Your facility reservation has ended. Please share your experience regarding the facility and reservation process.',
  },
  EQUIPMENT: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    ),
    label: 'Equipment Rental',
    message: 'Your rented equipment has been successfully returned. Please share your experience with the rental process.',
  },
  GENERAL_PROGRAM: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: 'Barangay Program',
    message:
      'Thank you for participating in today\'s barangay program. Your feedback helps improve future community activities.',
  },
  PEACE_AND_ORDER: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    label: 'Peace & Order',
    message:
      'Your concern has been marked as resolved. Please tell us about your experience with the assistance provided.',
  },
  LIVELIHOOD: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    label: 'Livelihood Program',
    message:
      'Your livelihood program session has been completed. Help us improve future livelihood opportunities.',
  },
  BSWD_REPORT: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    label: 'BSWD Report',
    message:
      'Your BSWD report has been successfully resolved. Your feedback helps improve resident assistance.',
  },
  BSWD_TIPS: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    label: 'BSWD Assistance',
    message:
      'Your assistance request has been completed. Please rate your experience with the support provided.',
  },
  BADAC: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    label: 'BADAC',
    message:
      'Thank you for visiting the Barangay Anti-Drug Abuse Council. Please share your experience with the service provided today.',
  },
  VAWC: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    label: 'VAWC Desk',
    message:
      'Thank you for visiting the Violence Against Women and Children Desk. Your feedback helps improve community support services.',
  },
  BOSCA: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="23" y1="11" x2="17" y2="11" />
        <line x1="20" y1="8" x2="20" y2="14" />
      </svg>
    ),
    label: 'BOSCA',
    message:
      'Thank you for visiting the Barangay Office of Senior Citizens Affairs. Please help us improve our senior citizen services.',
  },
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const FeedbackModal = ({ isOpen, feedbackType, onAnswer, onLater }) => {
  if (!isOpen) return null;

  const config = FEEDBACK_CONFIG[feedbackType] ?? {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    label: 'Feedback',
    message: 'Please share your experience with us.',
  };

  return (
    <div
      className="fm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fm-title"
      onClick={(e) => { if (e.target === e.currentTarget) onLater?.(); }}
    >
      <div className="fm-card">

        {/* ── Icon badge ── */}
        <div className="fm-icon-wrap" aria-hidden="true">
          <div className="fm-icon-ring">
            <div className="fm-icon">{config.icon}</div>
          </div>
          <div className="fm-icon-glow" />
        </div>

        {/* ── Header ── */}
        <div className="fm-header">
          <p className="fm-type-label">{config.label}</p>
          <h2 id="fm-title" className="fm-title">We Value Your Feedback</h2>
          <p className="fm-message">{config.message}</p>
        </div>

        {/* ── Divider ── */}
        <div className="fm-divider" />

        {/* ── Actions ── */}
        <div className="fm-actions">
          <button
            id="fm-btn-answer"
            className="fm-btn fm-btn-primary"
            onClick={onAnswer}
          >
            <svg className="fm-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Answer Feedback
          </button>

          <button
            id="fm-btn-later"
            className="fm-btn fm-btn-secondary"
            onClick={onLater}
          >
            Later
          </button>
        </div>

      </div>
    </div>
  );
};

export default FeedbackModal;
