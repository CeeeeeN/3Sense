import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, collectionGroup, query, where, orderBy, onSnapshot } from "firebase/firestore";
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
  approved:     { label: "Approved",         color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
  rejected:     { label: "Rejected",         color: "#e03e3e", bg: "rgba(224,62,62,0.1)"   },
  received:     { label: "Received",         color: "#317D89", bg: "rgba(49,125,137,0.1)"  },
  under_review: { label: "Under Review",     color: "#e8a020", bg: "rgba(232,160,32,0.1)"  },
  resolved:     { label: "Resolved",         color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
  processing:   { label: "Processing",       color: "#e8a020", bg: "rgba(232,160,32,0.1)"  },
  ready:        { label: "Ready for Pickup", color: "#2DB17B", bg: "rgba(45,177,123,0.1)"  },
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

  // Grab the specific user's ID right out of local storage
  const activeUserId = getSaved("userID", null);

  // --- FIREBASE REAL-TIME LISTENERS ---
  useEffect(() => {
    if (!activeUserId) {
      setLoading(true);
      return; 
    }

    setLoading(false);

    // A. Fetch Programs/Facilities
    const qPrograms = query(
      collectionGroup(db, "attendees"), 
      where("userID", "==", activeUserId),
      orderBy("createdAt", "desc")
    );
    const unsubPrograms = onSnapshot(qPrograms, (snapshot) => {
      setPrograms(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().programName, 
        date: doc.data().programDate,
        ...doc.data() 
      })));
    });

    // B. Fetch Documents
    const qDocs = query(
      collection(db, "documentRequests"),
      where("userID", "==", activeUserId),
      orderBy("createdAt", "desc")
    );
    const unsubDocs = onSnapshot(qDocs, (snapshot) => {
      setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // C. Fetch Reservations
    const qReservations = query(
      collection(db, "facilityReservations"),
      where("userID", "==", activeUserId),
      orderBy("createdAt", "desc")
    );
    const unsubReservations = onSnapshot(qReservations, (snapshot) => {
      setReservations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false); 
    });

    return () => {
      unsubPrograms();
      unsubDocs();
      unsubReservations();
    };
  }, [activeUserId]);

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
        {programs.map((item) => (
          <div key={item.id} className="act2-card">
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
                <div className="act2-card__meta">Date Requested: {formatDate(item.createdAt)}</div>
                <div className="act2-card__ref">Ref: {item.refId || item.id}</div>
              </div>
              <StatusBadge status={item.status} />
            </div>
          </div>
        ))}
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
                <div className="act2-card__subtitle">{item.facility || item.facilityName}</div>
                <div className="act2-card__meta">{formatDate(item.date || item.createdAt)} · {item.time || "TBA"}</div>
              </div>
              <StatusBadge status={item.status} />
            </div>

            {/* Rejection Remarks */}
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
      </div>
    );
  };

  // ── TABS CONFIG ──
  const TABS = [
    { key: "programs",     label: "Programs & Facilities", icon: <ProgramIcon />,     count: programs.length,     component: <ProgramsFacilitiesTab /> },
    { key: "documents",    label: "Documents",             icon: <DocumentIcon />,    count: documents.length,    component: <DocumentsTab /> },
    { key: "reservations", label: "Reservations",          icon: <ReservationIcon />, count: reservations.length, component: <ReservationsTab /> },
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