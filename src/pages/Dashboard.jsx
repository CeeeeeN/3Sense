import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, getCountFromServer, orderBy, limit } from "firebase/firestore";
import { subscribeToAnnouncements } from "../services/announcements";
import FeedbackAlerts from "../components/Feedback/FeedbackAlerts";
import {
  ScholarshipIcon, HealthIcon, AssistanceIcon,
  VerifiedVisitIcon, DocumentIcon, FeedbackIcon, BarangayStatusIcon,
  TrendUpIcon, ClockIcon, CheckSmallIcon, BoltIcon, GridIcon, BellIcon,
  ArrowRightIcon, ChevronIcon, XIcon, CalendarIcon, MapPinIcon
} from "../components/Icons";

function SectionCard({ icon, title, subtitle, action, children }) {
  return (
    <div className="sc-card">
      <div className="sc-card-header">
        <div className="sc-card-header-left">
          <div className="sc-card-icon-wrap">{icon}</div>
          <div>
            <div className="sc-card-title">{title}</div>
            {subtitle && <div className="sc-card-subtitle">{subtitle}</div>}
          </div>
        </div>
        {action && action}
      </div>
      <div>{children}</div>
    </div>
  );
}

function UnifiedAnnouncementPopup({ ann, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const dotColors = {
    teal: "#317D89", blue: "#1a4f8a", green: "#0d7a55",
    amber: "#e8a020", red: "#e03e3e",
  };
  const annColor = dotColors[ann.dotColor] || "#317D89";

  return (
    <div className="db-popup-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="db-popup-modal">
        <div className="db-popup-bar" style={{ background: annColor }} />
        <button className="db-popup-close" onClick={onClose}><XIcon /></button>
        <div className="db-popup-scroll">
          <div className="db-popup-header">
            <div className="db-popup-tags">
              <span className={`ann-row__cat-tag ${ann.catClass || "db-cat-service"}`}>{ann.announcementCategory || "General"}</span>
              <span className="db-popup-badge" style={{ background: `${annColor}1A`, color: annColor, marginLeft: '8px' }}>Target: {ann.category}</span>
            </div>
            <h2 className="db-popup-title">{ann.title}</h2>
            <p className="db-popup-desc" style={{ whiteSpace: 'pre-wrap' }}>{ann.description}</p>
          </div>
          <div className="db-popup-details">
            <div className="db-popup-detail-item">
              <span className="db-popup-detail-icon"><CalendarIcon /></span>
              <div>
                <div className="db-popup-detail-label">Date &amp; Time</div>
                <div className="db-popup-detail-value">{ann.time ? new Date(ann.time).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : ann.date}</div>
              </div>
            </div>
            <div className="db-popup-detail-item">
              <span className="db-popup-detail-icon"><MapPinIcon /></span>
              <div>
                <div className="db-popup-detail-label">Location</div>
                <div className="db-popup-detail-value">{ann.location || "TBA"}</div>
              </div>
            </div>
          </div>
          {ann.requirements && ann.requirements.length > 0 && (
            <div className="db-popup-section">
              <div className="db-popup-section-title">Requirements</div>
              <ul className="db-popup-req-list">
                {ann.requirements.map((r, i) => (
                  <li key={i} className="db-popup-req-item">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={annColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="db-popup-section">
            <div className="db-popup-section-title">Posted by</div>
            <div className="db-popup-posted-by">{ann.postedBy || "Barangay Admin"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AllAnnouncementsPopup({ announcements, onClose, onSelectAnn }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="db-popup-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="db-popup-modal">
        <div className="db-popup-bar" style={{ background: "#317D89" }} />
        <button className="db-popup-close" onClick={onClose}><XIcon /></button>
        <div className="db-popup-scroll">
          <div className="db-popup-header">
            <div className="db-popup-tags">
              <span className="db-popup-badge" style={{ background: "rgba(49,125,137,0.1)", color: "#317D89" }}>
                {announcements.length} Announcements
              </span>
            </div>
            <h2 className="db-popup-title">All Announcements</h2>
            <p className="db-popup-desc" style={{ marginBottom: 0 }}>Showing combined alerts and general announcements.</p>
          </div>
          <div className="db-popup-ann-list">
            {announcements.map((ann) => (
              <button key={ann.id} className="db-popup-ann-row" onClick={() => onSelectAnn(ann)}>
                <div className="db-popup-ann-body">
                  <div className="db-popup-ann-top">
                    {ann.isSmartAlert && <span className="ann-row__new-badge" style={{ background: "#ffe4e6", color: "#e11d48", marginRight: '8px' }}>ALERT</span>}
                    <span className={`ann-row__cat-tag ${ann.catClass || "db-cat-service"}`}>{ann.announcementCategory}</span>
                    <span className="db-popup-ann-date">{ann.date}</span>
                  </div>
                  <div className="db-popup-ann-title">{ann.title}</div>
                  <div className="db-popup-ann-desc" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>{ann.description}</div>
                </div>
                <ChevronIcon />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EquipmentRentalAlertModal({ rentals, currentIdx, total, onClose, onPrev, onNext }) {
  const rental = rentals[currentIdx];
  const isUnreturned = rental?.status === 'Unreturned';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!rental) return null;

  const fmt = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  const accentColor  = isUnreturned ? '#c2410c' : '#dc2626';
  const accentLight  = isUnreturned ? '#fff7ed' : '#fef2f2';
  const accentBorder = isUnreturned ? '#fed7aa' : '#fecaca';
  const badgeLabel   = isUnreturned ? 'Unreturned' : 'Overdue';
  const warningText  = isUnreturned
    ? 'The Barangay has formally reported this equipment as unreturned. Please visit the Barangay Hall immediately to resolve this matter.'
    : 'Return date has passed. Please return the equipment to the Barangay Hall as soon as possible to avoid further penalties.';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '420px',
        overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
        animation: 'modalIn 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        fontFamily: "'Poppins', sans-serif",
      }}>

      <div style={{ height: '5px', background: `linear-gradient(90deg, ${accentColor}, ${isUnreturned ? '#f97316' : '#f87171'})` }} />

      <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Equipment Rental</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>Return Reminder</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9', border: 'none', cursor: 'pointer',
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', transition: 'background 0.15s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '12px', padding: '14px 16px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
              {[
                { label: 'Equipment', value: rental.equipmentName || rental.type || 'N/A' },
                { label: 'Quantity', value: `${rental.quantity || 1} unit${rental.quantity > 1 ? 's' : ''}` },
                { label: 'Pickup Date', value: fmt(rental.pickUpDate) },
                { label: 'Return Date', value: fmt(rental.returnDate), highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: highlight ? accentColor : '#1e293b' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>Status:</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '3px 10px', borderRadius: '100px',
                background: accentLight, border: `1px solid ${accentBorder}`,
                fontSize: '0.72rem', fontWeight: 800, color: accentColor, letterSpacing: '0.06em',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, display: 'inline-block' }} />
                {badgeLabel.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            background: accentLight, border: `1px solid ${accentBorder}`,
            borderRadius: '10px', padding: '12px 14px', fontSize: '0.82rem', color: accentColor,
          }}>
            <svg style={{ flexShrink: 0, marginTop: '1px' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ lineHeight: 1.6 }}>{warningText}</span>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: total > 1 ? 'space-between' : 'flex-end',
          padding: '16px 20px 20px', gap: '10px',
        }}>
          {total > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={onPrev} disabled={currentIdx === 0}
                style={{
                  width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #e2e8f0',
                  background: currentIdx === 0 ? '#f8fafc' : '#fff',
                  cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: currentIdx === 0 ? '#cbd5e1' : '#475569',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{currentIdx + 1} / {total}</span>
              <button
                onClick={onNext} disabled={currentIdx === total - 1}
                style={{
                  width: 30, height: 30, borderRadius: '50%', border: '1.5px solid #e2e8f0',
                  background: currentIdx === total - 1 ? '#f8fafc' : '#fff',
                  cursor: currentIdx === total - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: currentIdx === total - 1 ? '#cbd5e1' : '#475569',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              background: accentColor, color: '#fff', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif",
              transition: 'opacity 0.15s',
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.85'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

function SubLabel({ icon, label }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.85rem 0 0.75rem",
      borderBottom: "1.5px solid #f0f4f9",
      marginBottom: "1rem",
      color: "#5e7a99",
    }}>
      {icon}
      <span style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}>{label}</span>
    </div>
  );
}

const ITEMS_PER_PAGE = 4;

function PaginationBar({ current, total, onChange }) {
  if (total <= 1) return null;
  return (
    <div className="db-pagination">
      <button
        className="db-pagination__btn"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        aria-label="Previous page"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <div className="db-pagination__pages">
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            className={`db-pagination__dot${p === current ? ' db-pagination__dot--active' : ''}`}
            onClick={() => onChange(p)}
            aria-label={`Page ${p}`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        className="db-pagination__btn"
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        aria-label="Next page"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}

export default function Dashboard({ userName = "", onNavigate, householdID: propsHouseholdID, memberID, userRole, pendingAnnID, onAnnConsumed }) {
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [showAllAnns, setShowAllAnns] = useState(false);
  const [alertPage, setAlertPage] = useState(1);
  const [annPage, setAnnPage] = useState(1);
  const [realUserName, setRealUserName] = useState(userName);
  const [dataLoading, setDataLoading] = useState(true);
  const [announcementsData, setAnnouncementsData] = useState([]);
  const [userCategories, setUserCategories] = useState([]);

  const [overdueRentals, setOverdueRentals] = useState([]);
  const [eqAlertIdx, setEqAlertIdx] = useState(0);
  const [showEqModal, setShowEqModal] = useState(true);
  const [isMobile480, setIsMobile480] = useState(typeof window !== 'undefined' ? window.innerWidth <= 480 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile480(window.innerWidth <= 480);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [widgets, setWidgets] = useState([
    { icon: <VerifiedVisitIcon />, color: "teal", value: "...", label: "Verified Visits", sub: "via QR scans", badge: "Active", badgeIcon: <TrendUpIcon /> },
    { icon: <DocumentIcon />, color: "amber", value: "...", label: "Document Requests", sub: "currently active", badge: "Loading", badgeIcon: <ClockIcon /> },
    { icon: <FeedbackIcon />, color: "green", value: "...", label: "Feedback", sub: "submitted", badge: "Done", badgeIcon: <CheckSmallIcon /> },
    { icon: <BarangayStatusIcon />, color: "purple", value: "...", label: "Barangay Status", sub: "current standing", badge: "Active", badgeIcon: <TrendUpIcon /> },
  ]);

  useEffect(() => {
    const unsubAnns = subscribeToAnnouncements((data) => {
      setAnnouncementsData(data);
    });
    return () => unsubAnns();
  }, []);

  useEffect(() => {
    if (!propsHouseholdID || !memberID) return;

    const q = query(
      collection(db, 'equipment_rentals'),
      where('householdID', '==', propsHouseholdID),
      where('residentID', '==', memberID),
      orderBy('submittedAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const alerts = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => {
          const s = r.status || '';
          if (s === 'Unreturned') return true;
          if (s === 'Claimed' && r.returnDate) {
            const rd = new Date(r.returnDate + 'T00:00:00');
            return rd < today;
          }
          return false;
        })
        .map(r => ({
          ...r,
          status: r.status === 'Claimed' ? 'Overdue' : r.status,
        }));

      setOverdueRentals(alerts);
      if (alerts.length > 0) {
        setEqAlertIdx(0);
      } else {
        setShowEqModal(false);
      }
    });

    return () => unsub();
  }, [propsHouseholdID, memberID]);

  // Deep-link: open a specific announcement popup when arriving from a notification
  useEffect(() => {
    if (!pendingAnnID || announcementsData.length === 0) return;
    const raw = announcementsData.find((a) => a.id === pendingAnnID);
    if (raw) {
      const processed = mapAnnouncements([raw])[0];
      setSelectedAnn(processed);
      if (onAnnConsumed) onAnnConsumed();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnnID, announcementsData]);

  useEffect(() => {
    let unsubResident = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setDataLoading(false); return; }
      try {
        const hhQ = query(collection(db, "households"), where("userID", "==", user.uid));
        const hhSnap = await getDocs(hhQ);
        if (hhSnap.empty) { setDataLoading(false); return; }

        const hhDoc = hhSnap.docs[0];
        const householdID = hhDoc.id;

        const residentIdToFetch = memberID;
        if (!residentIdToFetch) {
          console.warn("[Dashboard] No memberID provided, skipping category fetch.");
          setDataLoading(false);
          return;
        }

        const headRef = doc(db, "households", householdID, "residents", residentIdToFetch);
        if (unsubResident) unsubResident();
        unsubResident = onSnapshot(headRef, (headSnap) => {
          let firstName = userName;
          let adminStatus = "Clear";
          let uCats = [];

          if (headSnap.exists()) {
            const d = headSnap.data();
            firstName = d.firstName || userName;
            adminStatus = d.adminStatus || "Clear";
            let rawCats = d.categories || d.category;
            let normalizedCategories = [];
            if (Array.isArray(rawCats)) {
              normalizedCategories = rawCats;
            } else if (typeof rawCats === "string") {
              normalizedCategories = rawCats.split(",").map(c => c.trim());
            }
            uCats = normalizedCategories
              .map(c => (typeof c === "string" ? c.trim() : String(c).trim()))
              .filter(Boolean);
          }

          setRealUserName(firstName);
          setUserCategories(uCats);

          setWidgets([
            { icon: <VerifiedVisitIcon />, color: "teal", value: "...", label: "Verified Visits", sub: "via QR scans", badge: "Active", badgeIcon: <TrendUpIcon /> },
            { icon: <DocumentIcon />, color: "amber", value: "...", label: "Document Requests", sub: "currently active", badge: "Loading", badgeIcon: <ClockIcon /> },
            { icon: <FeedbackIcon />, color: "green", value: "...", label: "Feedback", sub: "submitted", badge: "Done", badgeIcon: <CheckSmallIcon /> },
            { icon: <BarangayStatusIcon />, color: "purple", value: adminStatus, label: "Barangay Status", sub: "current standing", badge: adminStatus === "Clear" ? "Active" : "Flagged", badgeIcon: <TrendUpIcon /> },
          ]);
        });

        const [frCount, drCount, fbCount] = await Promise.all([
          getCountFromServer(query(collection(db, "facility_reservations"), where("householdID", "==", householdID), where("residentID", "==", residentIdToFetch))),
          getCountFromServer(query(collection(db, "document_requests"), where("householdID", "==", householdID), where("residentID", "==", residentIdToFetch))),
          getCountFromServer(query(collection(db, "feedback"), where("householdID", "==", householdID), where("residentID", "==", residentIdToFetch)))
        ]);

        setWidgets([
          { icon: <VerifiedVisitIcon />, color: "teal", value: frCount.data().count.toString(), label: "Verified Visits", sub: "via QR scans", badge: "Active", badgeIcon: <TrendUpIcon /> },
          { icon: <DocumentIcon />, color: "amber", value: drCount.data().count.toString(), label: "Document Requests", sub: "currently active", badge: "Updated", badgeIcon: <ClockIcon /> },
          { icon: <FeedbackIcon />, color: "green", value: fbCount.data().count.toString(), label: "Feedback", sub: "submitted", badge: "Done", badgeIcon: <CheckSmallIcon /> },
          { icon: <BarangayStatusIcon />, color: "purple", value: "...", label: "Barangay Status", sub: "current standing", badge: "Active", badgeIcon: <TrendUpIcon /> },
        ]);
        
      } catch (err) {
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    });
    return () => {
      unsubscribe();
      if (unsubResident) unsubResident();
    };
  }, [memberID]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const mapAnnouncements = (data) => {
    return data.map(ann => {
      let dc = "teal";
      let cc = "db-cat-service";
      let icon = <BoltIcon />;
      const acType = (ann.announcementCategory || "").toLowerCase();

      switch (acType) {
        case "health": dc = "green"; cc = "db-cat-health"; icon = <HealthIcon />; break;
        case "event": dc = "blue"; cc = "db-cat-event"; icon = <AssistanceIcon />; break;
        case "documents": dc = "amber"; cc = "db-cat-service"; icon = <DocumentIcon />; break;
        case "programs": dc = "purple"; cc = "db-cat-service"; icon = <ScholarshipIcon />; break;
        case "facilities": dc = "amber"; cc = "db-cat-service"; icon = <VerifiedVisitIcon />; break;
        default: break;
      }

      const annCatClean = (ann.category || "").trim().toLowerCase();
      const annAudienceClean = (ann.targetAudience || "").trim().toLowerCase();

      // "All Residents" → general announcements only, NOT alerts
      const targetsEveryone = annCatClean === "all residents" || annAudienceClean === "all residents";

      // Exact match: announcement category must equal one of the user's profile categories
      const isAlert = !targetsEveryone && userCategories.some(uc => {
        const u = uc.trim().toLowerCase();
        if (!u) return false;
        // Exact match only — the announcement's category field must equal the user's category
        return annCatClean === u || annAudienceClean === u;
      });

      return { ...ann, dotColor: dc, catClass: cc, icon, isSmartAlert: isAlert };
    });
  };

  const processedAnns = mapAnnouncements(announcementsData);
  // Already ordered newest-first by Firestore (orderBy createdAt desc)
  const smartAlertsList = processedAnns.filter(a => a.isSmartAlert);
  const generalAnnsList = processedAnns.filter(a => {
    const cat = (a.category || "").trim().toLowerCase();
    return cat === "all residents" || cat === "";
  });
  const combinedAnns = [...smartAlertsList, ...generalAnnsList];

  // Pagination derived values
  const alertTotalPages = Math.max(1, Math.ceil(smartAlertsList.length / ITEMS_PER_PAGE));
  const annTotalPages = Math.max(1, Math.ceil(generalAnnsList.length / ITEMS_PER_PAGE));
  const pagedAlerts = smartAlertsList.slice((alertPage - 1) * ITEMS_PER_PAGE, alertPage * ITEMS_PER_PAGE);
  const pagedAnns = generalAnnsList.slice((annPage - 1) * ITEMS_PER_PAGE, annPage * ITEMS_PER_PAGE);

  // Reset pages when data refreshes
  // (safe because these are render-time derivations, not effects)

  return (
    <main className="db-page">
      <div className="db-welcome-banner">
        <div className="db-welcome-banner-inner">
          <div className="db-welcome-left">
            <div className="db-welcome-eyebrow">My Dashboard</div>
            <h1 className="db-welcome-heading">{getGreeting()}, <span>{realUserName}!</span></h1>
            <p className="db-welcome-sub">Here's what's happening in your barangay today.</p>
          </div>
        </div>
      </div>

      <div className="db-content">

        {overdueRentals.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div
              onClick={() => setShowEqModal(true)}
              style={{
                display: isMobile480 ? "block" : "flex",
                alignItems: isMobile480 ? "unset" : "center",
                justifyContent: isMobile480 ? "unset" : "space-between",
                gap: isMobile480 ? "0" : "12px",
                backgroundColor: overdueRentals.some(r => r.status === 'Unreturned') ? "#fff7ed" : "#fef2f2",
                borderLeft: `4px solid ${overdueRentals.some(r => r.status === 'Unreturned') ? "#ea580c" : "#ef4444"}`,
                padding: "12px 16px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                cursor: "pointer",
                transition: "transform 0.1s ease-in-out",
                textAlign: isMobile480 ? "center" : "left"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.01)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <div style={{ flex: isMobile480 ? "unset" : 1, marginBottom: isMobile480 ? "10px" : "0" }}>
                <h4 style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  color: overdueRentals.some(r => r.status === 'Unreturned') ? "#9a3412" : "#991b1b",
                  fontFamily: "'Poppins', sans-serif"
                }}>
                  {overdueRentals.some(r => r.status === 'Unreturned')
                    ? (overdueRentals.length > 1 ? `Action Required: ${overdueRentals.length} Equipment Rentals Unreturned` : `Action Required: Equipment Reported as Unreturned`)
                    : (overdueRentals.length > 1 ? `Action Required: ${overdueRentals.length} Equipment Rentals Overdue` : `Action Required: Overdue Equipment Return`)
                  }
                </h4>

                <p style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: overdueRentals.some(r => r.status === 'Unreturned') ? "#c2410c" : "#b91c1c",
                  fontFamily: "'Poppins', sans-serif"
                }}>
                  {overdueRentals.length > 1
                    ? <>Please return your rented <strong>{overdueRentals[0]?.equipmentName || overdueRentals[0]?.type || "Equipment"}</strong> and {overdueRentals.length - 1} other item(s) to the Barangay Hall.</>
                    : <>Please return your rented <strong>{overdueRentals[0]?.equipmentName || overdueRentals[0]?.type || "Equipment"}</strong> to the Barangay Hall as soon as possible.</>
                  }
                </p>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setShowEqModal(true); }}
                style={{
                  backgroundColor: overdueRentals.some(r => r.status === 'Unreturned') ? "#ea580c" : "#ef4444",
                  color: "#fff",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontFamily: "'Poppins', sans-serif",
                  whiteSpace: "nowrap",
                  display: "block",
                  margin: isMobile480 ? "10px auto 0 auto" : "0"
                }}
              >
                Review Now
              </button>
            </div>
          </div>
        )}

        <FeedbackAlerts 
          householdID={propsHouseholdID} 
          residentID={memberID}
          onNavigate={onNavigate}
        />

        {/* ── 1. Your Summary ── */}
        <SectionCard icon={<GridIcon />} title="Your Summary" subtitle="Overview of your barangay activity">
          <div className="db-widgets-grid">
            {widgets.map((w, i) => (
              <div key={i} className={`summary-widget summary-widget--${w.color}`}>
                <div className="summary-widget__header">
                  <div className="summary-widget__icon-wrap">{w.icon}</div>
                  <span className="summary-widget__badge">{w.badgeIcon} {w.badge}</span>
                </div>
                <div className="summary-widget__value">{dataLoading ? "..." : w.value}</div>
                <div className="summary-widget__divider" />
                <div className="summary-widget__label">{w.label}</div>
                <div className="summary-widget__sub">{w.sub}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 2. Alerts & Announcements ── */}
        <SectionCard
          icon={<BoltIcon />}
          title="Alerts & Announcements"
          subtitle="Personalized alerts and latest barangay news"
          action={
            <button className="db-view-all-btn" onClick={() => setShowAllAnns(true)}>
              View All <ArrowRightIcon />
            </button>
          }
        >
          {/* Alerts */}
          <div style={{ padding: "0 1.5rem" }}>
            <SubLabel icon={<BoltIcon />} label="Based on Your Profile Category" />
            {smartAlertsList.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>No alerts based on your profile category at this time.</p>
            ) : (
              <>
                <div className="db-alerts-grid" style={{ marginBottom: "0.5rem" }}>
                  {pagedAlerts.map((a) => (
                    <div key={a.id} className={`alert-card alert-card--${a.dotColor}`}>
                      <div className="alert-card__header">
                        <div className="alert-card__icon-wrap">{a.icon}</div>
                        <span className="alert-card__tag">{a.category}</span>
                      </div>
                      <div className="alert-card__body">
                        <div className="alert-card__title">{a.title}</div>
                        <div className="alert-card__desc" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>{a.description}</div>
                        <button className="alert-card__cta" onClick={() => setSelectedAnn(a)}>
                          View Details <ArrowRightIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationBar current={alertPage} total={alertTotalPages} onChange={setAlertPage} />
              </>
            )}
          </div>

          {/* Barangay Announcements */}
          <div style={{ padding: "0.5rem 1.5rem 1.25rem" }}>
            <SubLabel icon={<BellIcon />} label="Barangay Announcements" />
            {generalAnnsList.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>No new announcements at this time.</p>
            ) : (
              <>
                <div className="ann-table-header">
                  {["TITLE", "DATE", "CATEGORY", ""].map((h, i) => (
                    <div key={i} className="ann-table-header__cell">{h}</div>
                  ))}
                </div>
                {pagedAnns.map((a, idx) => (
                  <div
                    key={a.id}
                    className={`ann-row${idx === pagedAnns.length - 1 ? " ann-row--last" : ""}`}
                    onClick={() => setSelectedAnn(a)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="ann-row__body">
                      <div className="ann-row__title-line">
                        <span className="ann-row__title">{a.title}</span>
                        {a.isSmartAlert && <span className="ann-row__new-badge" style={{ background: "#ffe4e6", color: "#e11d48" }}>ALERT</span>}
                      </div>
                      <div className="ann-row__desc" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{a.description}</div>
                    </div>
                    <div className="ann-row__date">{a.time ? new Date(a.time).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : a.date}</div>
                    <div className="ann-row__cat">
                      <span className={`ann-row__cat-tag ${a.catClass || "db-cat-service"}`}>{a.announcementCategory}</span>
                    </div>
                    <button className="ann-row__chevron" onClick={e => { e.stopPropagation(); setSelectedAnn(a); }}>
                      <ChevronIcon />
                    </button>
                  </div>
                ))}
                <PaginationBar current={annPage} total={annTotalPages} onChange={setAnnPage} />
              </>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Footer ── */}
      <footer className="db-footer" style={{ marginTop: 0 }}>
        <div className="db-footer-inner">
          <div className="db-footer-top">
            <div className="db-footer-brand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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

      {showAllAnns && !selectedAnn && (
        <AllAnnouncementsPopup
          announcements={combinedAnns}
          onClose={() => setShowAllAnns(false)}
          onSelectAnn={(ann) => { setShowAllAnns(false); setSelectedAnn(ann); }}
        />
      )}
      {selectedAnn && <UnifiedAnnouncementPopup ann={selectedAnn} onClose={() => setSelectedAnn(null)} />}
      {showEqModal && overdueRentals.length > 0 && (
        <EquipmentRentalAlertModal
          rentals={overdueRentals}
          currentIdx={Math.min(eqAlertIdx, overdueRentals.length - 1)}
          total={overdueRentals.length}
          onClose={() => setShowEqModal(false)}
          onPrev={() => setEqAlertIdx(i => Math.max(0, i - 1))}
          onNext={() => setEqAlertIdx(i => Math.min(overdueRentals.length - 1, i + 1))}
        />
      )}
    </main>
  );
}
