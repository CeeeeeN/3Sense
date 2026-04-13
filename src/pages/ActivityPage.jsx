import { useState } from "react";
import { ActivityIcon, ProgramIcon, DocumentIcon, ReservationIcon, StarIcon, ShieldCheckIcon, AlertCircleIcon, InboxIcon } from "../components/Icons";

// STATUS CONFIG 

const STATUS = {
  open:         { label: "Open",             color: "#317D89", bg: "rgba(49,125,137,0.1)"  },
  ongoing:      { label: "Ongoing",           color: "#1a56a0", bg: "rgba(26,86,160,0.1)"   },
  completed:    { label: "Completed",         color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
  pending:      { label: "Pending",           color: "#e8a020", bg: "rgba(232,160,32,0.1)"  },
  approved:     { label: "Approved",          color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
  rejected:     { label: "Rejected",          color: "#e03e3e", bg: "rgba(224,62,62,0.1)"   },
  received:     { label: "Received",          color: "#317D89", bg: "rgba(49,125,137,0.1)"  },
  under_review: { label: "Under Review",      color: "#e8a020", bg: "rgba(232,160,32,0.1)"  },
  resolved:     { label: "Resolved",          color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
  processing:   { label: "Processing",        color: "#e8a020", bg: "rgba(232,160,32,0.1)"  },
  ready:        { label: "Ready for Pickup",  color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
};

// Feedback keyed by item id so each tab can look up its own feedback
const FEEDBACK_MAP = {
  // Programs & Facilities
  "pf-001": {
    rating: 5,
    status: "resolved",
    comment: "Very helpful program, makakapagcheckout na ko sa shopee",
    adminResponse: "Thank you for your kind feedback! We are glad the scholarship helped you. We will continue to improve our programs for residents like you.",
  },
  "pf-002": {
    rating: 4,
    status: "under_review",
    comment: "The staff were very accommodating and professional.",
    adminResponse: null,
  },
  "pf-004": {
    rating: 3,
    status: "received",
    comment: "ambagal i-process pero mabait ung staff",
    adminResponse: null,
  },
  // Documents
  "doc-001": {
    rating: 4,
    status: "under_review",
    comment: "Mabilis na ma-process, salamat!",
    adminResponse: null,
  },
  "doc-002": {
    rating: 5,
    status: "resolved",
    comment: "Very smooth transaction, highly satisfied.",
    adminResponse: "Thank you for your kind feedback! We are glad to have served you efficiently.",
  },
  // Reservations
  "rsv-002": {
    rating: 4,
    status: "under_review",
    comment: "Great facility, well-maintained court!",
    adminResponse: null,
  },
};

const PROGRAMS_FACILITIES = [
  { id: "pf-001", name: "Local Scholarship Grant 2026",       category: "Program",  date: "March 18, 2026", status: "ongoing"   },
  { id: "pf-002", name: "Senior Citizen Health Assistance",   category: "Program",  date: "March 15, 2026", status: "completed" },
  { id: "pf-003", name: "Livelihood Training — April Batch",  category: "Program",  date: "March 10, 2026", status: "open"      },
  { id: "pf-004", name: "Community Health & Wellness Program",category: "Facility", date: "March 8, 2026",  status: "completed" },
  { id: "pf-005", name: "Free Tutorial & Career Orientation", category: "Program",  date: "March 3, 2026",  status: "completed" },
];

const DOCUMENTS = [
  { id: "doc-001", name: "Barangay Clearance",               dateRequested: "March 15, 2026", status: "ready",      refId: "DOC-2026-441" },
  { id: "doc-002", name: "Certificate of Indigency",         dateRequested: "March 10, 2026", status: "completed",  refId: "DOC-2026-389" },
  { id: "doc-003", name: "First Time Job Seeker Certificate",dateRequested: "March 5, 2026",  status: "processing", refId: "DOC-2026-320" },
  { id: "doc-004", name: "Building Permit Endorsement",      dateRequested: "Feb 28, 2026",   status: "rejected",   refId: "DOC-2026-275" },
  { id: "doc-005", name: "Certificate of Good Moral",        dateRequested: "Feb 20, 2026",   status: "completed",  refId: "DOC-2026-201" },
];

const RESERVATIONS = [
  { id: "rsv-001", purpose: "Birthday Celebration",        facility: "Barangay Multi-Purpose Hall", date: "April 5, 2026",  time: "3:00 PM – 9:00 PM",  status: "approved",  remarks: null },
  { id: "rsv-002", purpose: "Community Sports Tournament", facility: "Basketball Court",            date: "March 25, 2026", time: "6:00 AM – 6:00 PM",  status: "completed", remarks: null },
  { id: "rsv-003", purpose: "Business Meeting / Seminar",  facility: "Barangay Multi-Purpose Hall", date: "March 30, 2026", time: "9:00 AM – 12:00 PM", status: "rejected",  remarks: "The facility is already booked for a barangay assembly on this date. Please choose another date." },
  { id: "rsv-004", purpose: "Family Reunion",              facility: "Barangay Multi-Purpose Hall", date: "May 1, 2026",    time: "10:00 AM – 8:00 PM", status: "pending",   remarks: null },
];

// ── Reusable Components ──

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span className="act2-status" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function StarRating({ rating }) {
  return (
    <div className="act2-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width="24"
          height="25"
          viewBox="0 0 24 24"
          fill={s <= rating ? "#f59e0b" : "none"}
          stroke={s <= rating ? "#f59e0b" : "#d1d5db"}
          strokeWidth="1.5"
          style={{ flexShrink: 0 }}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="act2-stars__label">{rating}/5</span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="act2-empty">
      <div className="act2-empty__icon"><InboxIcon /></div>
      <div className="act2-empty__title">No records yet</div>
      <div className="act2-empty__sub">{message}</div>
    </div>
  );
}

// ── Inline Feedback Block ──
// Shown below a divider inside completed items.
// - If feedback exists: shows rating, comment, admin response or awaiting notice
// - If no feedback: shows a neutral "no feedback submitted" message
function InlineFeedback({ itemId }) {
  const fb = FEEDBACK_MAP[itemId];

  if (!fb) {
    return (
      <div className="act2-card__extra">
        <span className="act2-card__no-rating">No feedback submitted for this service.</span>
      </div>
    );
  }

  return (
    <div className="act2-card__extra act2-card__extra--col">
      <StarRating rating={fb.rating} />

      {fb.comment && (
        <p className="act2-card__comment">"{fb.comment}"</p>
      )}

      {fb.adminResponse ? (
        <div className="act2-card__response">
          <div className="act2-card__response-header">
            <ShieldCheckIcon />
            <span>Official Barangay Response</span>
          </div>
          <p className="act2-card__response-body">{fb.adminResponse}</p>
        </div>
      ) : (
        fb.status !== "received" && (
          <div className="act2-card__awaiting">
            <AlertCircleIcon />
            <span>Awaiting official response from the barangay.</span>
          </div>
        )
      )}
    </div>
  );
}

// ── 6.1 Programs & Facilities Tab ──
function ProgramsFacilitiesTab() {
  if (PROGRAMS_FACILITIES.length === 0)
    return <EmptyState message="You have not availed any programs or facilities yet." />;

  return (
    <div className="act2-list">
      {PROGRAMS_FACILITIES.map((item) => (
        <div key={item.id} className="act2-card">
          <div className="act2-card__row">
            <div className="act2-card__main">
              <span className="act2-card__cat">{item.category}</span>
              <div className="act2-card__title">{item.name}</div>
              <div className="act2-card__meta">Date: {item.date}</div>
            </div>
            <StatusBadge status={item.status} />
          </div>

          {item.status === "completed" && (
            <InlineFeedback itemId={item.id} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── 6.2 Documents Tab ──
function DocumentsTab() {
  if (DOCUMENTS.length === 0)
    return <EmptyState message="You have not requested any documents yet." />;

  return (
    <div className="act2-list">
      {DOCUMENTS.map((item) => (
        <div key={item.id} className="act2-card">
          <div className="act2-card__row">
            <div className="act2-card__main">
              <div className="act2-card__title">{item.name}</div>
              <div className="act2-card__meta">Date Requested: {item.dateRequested}</div>
              <div className="act2-card__ref">Ref: {item.refId}</div>
            </div>
            <StatusBadge status={item.status} />
          </div>

          {item.status === "completed" && (
            <InlineFeedback itemId={item.id} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── 6.3 Reservations Tab ──
function ReservationsTab() {
  if (RESERVATIONS.length === 0)
    return <EmptyState message="You have no facility reservations yet." />;

  return (
    <div className="act2-list">
      {RESERVATIONS.map((item) => (
        <div key={item.id} className="act2-card">
          <div className="act2-card__row">
            <div className="act2-card__main">
              <div className="act2-card__title">{item.purpose}</div>
              <div className="act2-card__subtitle">{item.facility}</div>
              <div className="act2-card__meta">{item.date} · {item.time}</div>
            </div>
            <StatusBadge status={item.status} />
          </div>

          {/* Rejection Remarks */}
          {item.status === "rejected" && item.remarks && (
            <div className="act2-card__remarks">
              <div className="act2-card__remarks-header">
                <AlertCircleIcon /> Remarks
              </div>
              <p className="act2-card__remarks-body">{item.remarks}</p>
            </div>
          )}

          {item.status === "completed" && (
            <InlineFeedback itemId={item.id} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── TABS CONFIG (Feedback tab removed) ──

const TABS = [
  { key: "programs",     label: "Programs & Facilities", icon: <ProgramIcon />,     count: PROGRAMS_FACILITIES.length, component: <ProgramsFacilitiesTab /> },
  { key: "documents",    label: "Documents",             icon: <DocumentIcon />,    count: DOCUMENTS.length,           component: <DocumentsTab />           },
  { key: "reservations", label: "Reservations",          icon: <ReservationIcon />, count: RESERVATIONS.length,        component: <ReservationsTab />        },
];

// ── MAIN ACTIVITY PAGE ──

export default function ActivityPage({ onNavigate, userName = "Juan Dela Cruz" }) {
  const [activeTab, setActiveTab] = useState("programs");
  const current = TABS.find((t) => t.key === activeTab);

  return (
    <main className="act2-page" style={{ minHeight: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Banner ── */}
      <div className="act2-banner">
        <div className="act2-banner__inner">
          <div className="act2-banner__eyebrow">My Activity</div>
          <h1 className="act2-banner__title">
            Activity <span>History</span>
          </h1>
          <p className="act2-banner__sub">
            Track all your barangay transactions, feedback, reservations, and QR scan history in one place.
          </p>
        </div>
      </div>

      {/* ── Card ── */}
      <div className="act2-content" style={{ flex: 1 }}>
        <div className="sc-card sc-card--tabbed">

          {/* Tab Bar */}
          <div className="act2-tabbar">
            <div className="act2-tabbar__inner">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`act2-tab${activeTab === tab.key ? " act2-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="act2-tab__icon">{tab.icon}</span>
                  <span className="act2-tab__label">{tab.label}</span>
                  <span className={`act2-tab__count${activeTab === tab.key ? " act2-tab__count--active" : ""}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="act2-tab-body">
            {current?.component}
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="db-footer" style={{ marginTop: 'auto' }}>
        <div className="db-footer-inner">
          <div className="db-footer-top">
            <div className="db-footer-brand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Barangay 3S+ Malanday</span>
              <span className="db-footer-divider">|</span>
              <span className="db-footer-tagline">Community Management System</span>
            </div>
            <nav className="db-footer-links">
              <a className="db-footer-link" href="#">Privacy Policy</a>
              <a className="db-footer-link" href="#">Terms of Use</a>
              <a className="db-footer-link" href="#">Contact Support</a>
            </nav>
          </div>
          <div className="db-footer-bottom">
            <p>© 2026 Barangay 3S+ Malanday. All rights reserved.</p>
            <p>Powered by the Barangay 3S+ Community Management System</p>
          </div>
        </div>
      </footer>
    </main>
  );
}