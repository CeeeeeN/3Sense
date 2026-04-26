import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, collectionGroup, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { ActivityIcon, ProgramIcon, DocumentIcon, ReservationIcon, ShieldCheckIcon, AlertCircleIcon, InboxIcon } from "../components/Icons";

// ── SESSION HELPER ──
const getSaved = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback;
  } catch {
    return fallback;
  }
};

// ── STATUS CONFIG ──
const STATUS = {
  open:         { label: "Open",             color: "#317D89", bg: "rgba(49,125,137,0.1)"  },
  ongoing:      { label: "Ongoing",          color: "#1a56a0", bg: "rgba(26,86,160,0.1)"   },
  completed:    { label: "Completed",        color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
  pending:      { label: "Pending",          color: "#e8a020", bg: "rgba(232,160,32,0.1)"  },
  pending_ai:   { label: "Pending AI",       color: "#e8a020", bg: "rgba(232,160,32,0.1)"  },
  analyzed:     { label: "Analyzed",         color: "#1a56a0", bg: "rgba(26,86,160,0.1)"   },
  approved:     { label: "Approved",         color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
  rejected:     { label: "Rejected",         color: "#e03e3e", bg: "rgba(224,62,62,0.1)"   },
  received:     { label: "Received",         color: "#317D89", bg: "rgba(49,125,137,0.1)"  },
  under_review: { label: "Under Review",     color: "#e8a020", bg: "rgba(232,160,32,0.1)"  },
  resolved:     { label: "Resolved",         color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
  claimed:      { label: "Claimed",          color: "#c125d6", bg: "rgba(45,177,123,0.1)"  },
  processing:   { label: "Processing",       color: "#e8a020", bg: "rgba(232,160,32,0.1)"  },
  ready_for_pickup: { label: "Ready for Pickup", color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
};

// ── Reusable Components ──
function StatusBadge({ status }) {
  const safeStatus = status ? status.toLowerCase().replace(/ /g, "_") : "pending";
  const s = STATUS[safeStatus] || STATUS.pending;
  return (
    <span className="act2-status" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
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

// ── MAIN ACTIVITY PAGE ──
export default function ActivityPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("programs");
  const [loading, setLoading] = useState(true);

  // Dynamic Data States
  const [programs, setPrograms] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [feedback, setFeedback] = useState([]); // --- ADDED: Feedback State ---

  // Limits for "Load More" functionality
  const [progLimit, setProgLimit] = useState(5);
  const [docLimit, setDocLimit] = useState(5);
  const [resLimit, setResLimit] = useState(5);
  const [feedbackLimit, setFeedbackLimit] = useState(5); // --- ADDED: Feedback Limit ---

  const activeUserId = getSaved("userID", null);

  // --- FIREBASE REAL-TIME LISTENERS ---

  // Initial Loading Check
  useEffect(() => {
    if (!activeUserId) { setLoading(true); return; }
    setLoading(false);
  }, [activeUserId]);

  // A. Fetch Programs/Facilities
  useEffect(() => {
    if (!activeUserId) return;
    const qPrograms = query(
      collectionGroup(db, "attendees"), 
      where("userID", "==", activeUserId),
      orderBy("createdAt", "desc"),
      limit(progLimit)
    );
    const unsubPrograms = onSnapshot(qPrograms, (snapshot) => {
      setPrograms(snapshot.docs.map(doc => ({ 
        id: doc.id, name: doc.data().programName, date: doc.data().programDate, ...doc.data() 
      })));
    });
    return () => unsubPrograms();
  }, [activeUserId, progLimit]);

  // B. Fetch Documents
  useEffect(() => {
    if (!activeUserId) return;
    const qDocs = query(
      collection(db, "document_requests"),
      where("userID", "==", activeUserId),
      orderBy("submittedAt", "desc"),
      limit(docLimit)
    );
    const unsubDocs = onSnapshot(qDocs, (snapshot) => {
      setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubDocs();
  }, [activeUserId, docLimit]);

  // C. Fetch Reservations
  useEffect(() => {
    if (!activeUserId) return;
    const qReservations = query(
      collection(db, "facility_reservations"),
      where("userID", "==", activeUserId),
      orderBy("submittedAt", "desc"),
      limit(resLimit)
    );
    const unsubReservations = onSnapshot(qReservations, (snapshot) => {
      setReservations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubReservations();
  }, [activeUserId, resLimit]);

  // D. Fetch Feedback --- ADDED ---
  useEffect(() => {
    if (!activeUserId) return;
    const qFeedback = query(
      collection(db, "Feedback"),
      where("userID", "==", activeUserId),
      orderBy("CreatedAt", "desc"), // Ensure this matches your Firebase field exactly
      limit(feedbackLimit)
    );
    const unsubFeedback = onSnapshot(qFeedback, (snapshot) => {
      setFeedback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubFeedback();
  }, [activeUserId, feedbackLimit]);

  // Helper to format Firestore Timestamps safely
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown Date";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };


  // ── 6.1 Programs & Facilities Tab ──
  const ProgramsFacilitiesTab = () => {
    if (programs.length === 0) return <EmptyState message="You have not availed any programs or facilities yet." />;
    return (
      <div className="act2-list">
        {programs.map((item, index) => (
          <div key={`${item.programId}-${index}`} className="act2-card">
            <div className="act2-card__row">
              <div className="act2-card__main">
                <span className="act2-card__cat">{item.category || "Program"}</span>
                <div className="act2-card__title">{item.name || item.eventName}</div>
                <div className="act2-card__meta">Date: {formatDate(item.createdAt || item.date)}</div>
              </div>
              <StatusBadge status={item.status} />
            </div>
          </div>
        ))}
        {/* LOAD MORE BUTTON */}
        {programs.length >= progLimit && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', paddingBottom: '16px' }}>
            <button 
              onClick={() => setProgLimit(prev => prev + 5)}
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151", padding: "8px 24px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── 6.2 Documents Tab ──
  const DocumentsTab = () => {
    if (documents.length === 0) return <EmptyState message="You have not requested any documents yet." />;
    return (
      <div className="act2-list">
        {documents.map((item) => (
          <div key={item.id} className="act2-card">
            <div className="act2-card__row">
              <div className="act2-card__main">
                <div className="act2-card__title">{item.documentType || item.name}</div>
                <div className="act2-card__meta">Date Requested: {formatDate(item.submittedAt || item.createdAt)}</div>
                <div className="act2-card__ref">Ref: {item.refNum || item.refId || item.id}</div>
              </div>
              <StatusBadge status={item.status} />
            </div>
          </div>
        ))}
        {/* LOAD MORE BUTTON */}
        {documents.length >= docLimit && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', paddingBottom: '16px' }}>
            <button 
              onClick={() => setDocLimit(prev => prev + 5)}
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151", padding: "8px 24px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── 6.3 Reservations Tab ──
  const ReservationsTab = () => {
    if (reservations.length === 0) return <EmptyState message="You have no facility reservations yet." />;
    return (
      <div className="act2-list">
        {reservations.map((item) => (
          <div key={item.id} className="act2-card">
            <div className="act2-card__row">
              <div className="act2-card__main">
                <div className="act2-card__title">{item.purpose || item.eventName}</div>
                <div className="act2-card__subtitle">{item.facilityName || item.facility}</div>
                <div className="act2-card__meta">{formatDate(item.date || item.submittedAt)} · {item.time || item.startTime || "TBA"}</div>
              </div>
              <StatusBadge status={item.status} />
            </div>
            {item.status?.toLowerCase() === "rejected" && item.remarks && (
              <div className="act2-card__remarks">
                <div className="act2-card__remarks-header">
                  <AlertCircleIcon /> Remarks
                </div>
                <p className="act2-card__remarks-body">{item.remarks}</p>
              </div>
            )}
          </div>
        ))}
        {/* LOAD MORE BUTTON */}
        {reservations.length >= resLimit && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', paddingBottom: '16px' }}>
            <button 
              onClick={() => setResLimit(prev => prev + 5)}
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151", padding: "8px 24px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── 6.4 Feedback Tab
  const FeedbackTab = () => {
    if (feedback.length === 0) return <EmptyState message="You have not submitted any feedback yet." />;
    return (
      <div className="act2-list">
        {feedback.map((item) => (
          <div key={item.id} className="act2-card">
            <div className="act2-card__row">
              <div className="act2-card__main">
                <div className="act2-card__title">{item.FacilityName || "General Service"}</div>
                <div className="act2-card__subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <span style={{ color: '#e8a020' }}>★</span> {item.Rating} / 5 Rating
                </div>
                <div className="act2-card__meta" style={{ marginTop: '4px' }}>Date Submitted: {formatDate(item.CreatedAt)}</div>
                <div className="act2-card__ref">Ref: {item.ReferenceID || item.id}</div>
              </div>
              <StatusBadge status={item.Status || "pending"} />
            </div>
          </div>
        ))}
        {/* LOAD MORE BUTTON */}
        {feedback.length >= feedbackLimit && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', paddingBottom: '16px' }}>
            <button 
              onClick={() => setFeedbackLimit(prev => prev + 5)}
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151", padding: "8px 24px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── TABS CONFIG ──
  const TABS = [
    { key: "programs",     label: "Programs & Facilities", icon: <ProgramIcon />,     count: programs.length,     component: <ProgramsFacilitiesTab /> },
    { key: "documents",    label: "Documents",             icon: <DocumentIcon />,    count: documents.length,    component: <DocumentsTab /> },
    { key: "reservations", label: "Reservations",          icon: <ReservationIcon />, count: reservations.length, component: <ReservationsTab /> },
    { key: "feedback",     label: "Feedback",              icon: <ActivityIcon />,    count: feedback.length,     component: <FeedbackTab /> }, // --- ADDED ---
  ];

  const current = TABS.find((t) => t.key === activeTab);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>
        Loading your activity...
      </div>
    );
  }

  if (!activeUserId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>
        Please select a profile to view activity history.
      </div>
    );
  }

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
          <div className="act2-tabbar" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
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