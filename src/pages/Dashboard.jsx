import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import {
  ScholarshipIcon, AcademicIcon, HealthIcon, AssistanceIcon,
  VerifiedVisitIcon, DocumentIcon, FeedbackIcon, BarangayStatusIcon,
  TrendUpIcon, ClockIcon, CheckSmallIcon, BoltIcon, GridIcon, BellIcon,
  ArrowRightIcon, ChevronIcon, XIcon, CalendarIcon, MapPinIcon
} from "../components/Icons";

const ALERTS = [
  {
    id: 1, color: "teal", icon: <ScholarshipIcon />, tag: "Student",
    title: "Scholarship Programs Now Open",
    desc: "Applications for the 2026 Local Scholarship Grant are accepted at the barangay hall. Deadline: April 15.",
    fullDesc: "The Barangay 3S+ Malanday Local Scholarship Grant provides financial assistance to qualified residents enrolled in college or TESDA-accredited vocational programs.",
    date: "April 15, 2026",
    location: "Barangay 3S+ Hall, Malanday, Valenzuela City",
    requirements: ["Valid barangay ID", "School enrollment form", "1×1 ID photo", "Grade / transcript of records"],
  },
  {
    id: 2, color: "amber", icon: <AcademicIcon />, tag: "Student",
    title: "Academic Events This Month",
    desc: "Free tutorial sessions and career orientation seminar on March 18–22 at the community center.",
    fullDesc: "A week-long learning event offering free academic tutorial sessions in Math, Science, and English.",
    date: "March 18–22, 2026",
    location: "Barangay Multi-Purpose Hall",
    requirements: ["Barangay residency", "Registration form (on-site)"],
  },
  {
    id: 3, color: "green", icon: <HealthIcon />, tag: "Senior / PWD",
    title: "Free Health Checkup – March 15",
    desc: "Free medical consultation for senior citizens and PWDs. Bring your barangay ID and health record.",
    fullDesc: "A monthly barangay health program offering free blood pressure monitoring and blood sugar testing.",
    date: "Every 2nd Saturday",
    location: "Barangay Health Center",
    requirements: ["Senior Citizen ID", "Health booklet (if available)"],
  },
  {
    id: 4, color: "purple", icon: <AssistanceIcon />, tag: "Senior / PWD",
    title: "Assistance Programs Available",
    desc: "Social welfare assistance for qualified senior citizens and PWD residents. Deadline is March 31.",
    fullDesc: "This program provides financial and social welfare assistance to persons with disabilities (PWD).",
    date: "April 1–30, 2026",
    location: "Barangay 3S+ Hall – Social Welfare Desk",
    requirements: ["PWD ID", "Medical certificate", "Barangay clearance"],
  },
];

const ANNOUNCEMENTS = [
  {
    id: 1, dotColor: "teal", title: "Free Medical Consultation – March 15",
    cat: "Health", catClass: "db-cat-health",
    desc: "Free medical check-up at Barangay Hall, 8AM–4PM. All residents welcome.",
    fullDesc: "The Barangay Health Center will be conducting a free medical consultation event on March 15, 2026.",
    date: "March 9, 2026", unread: true,
    location: "Barangay Hall Grounds",
    postedBy: "Barangay Health Officer",
  },
  {
    id: 2, dotColor: "blue", title: "Community Clean-Up Drive – March 22",
    cat: "Event", catClass: "db-cat-event",
    desc: "Join the monthly clean-up drive. Volunteers receive a certificate.",
    fullDesc: "The Barangay 3S+ Malanday invites all residents to join the monthly Community Clean-Up Drive.",
    date: "March 7, 2026", unread: false,
    location: "Barangay Hall — Assembly Point",
    postedBy: "Barangay Environmental Committee",
  },
  {
    id: 3, dotColor: "green", title: "Barangay ID Renewal Now Open",
    cat: "Service", catClass: "db-cat-service",
    desc: "Submit your renewal online or visit the barangay hall Mon–Fri, 8AM–5PM.",
    fullDesc: "The Barangay ID Renewal Program is now open for all residents with expired IDs.",
    date: "March 5, 2026", unread: false,
    location: "Barangay Hall — Records Section",
    postedBy: "Barangay Secretary",
  },
];

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

function AlertDetailPopup({ alert, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const colorMap = {
    teal: { bar: "#317D89", badge: "rgba(49,125,137,0.10)", text: "#317D89" },
    amber: { bar: "#BDBD64", badge: "rgba(189,189,100,0.15)", text: "#7a7200" },
    green: { bar: "#2DB17B", badge: "rgba(45,177,123,0.10)", text: "#1e8a5e" },
    purple: { bar: "#703381", badge: "rgba(112,51,129,0.10)", text: "#703381" },
  };
  const c = colorMap[alert.color] || colorMap.teal;

  return (
    <div className="db-popup-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="db-popup-modal">
        <div className="db-popup-bar" style={{ background: c.bar }} />
        <button className="db-popup-close" onClick={onClose}><XIcon /></button>
        <div className="db-popup-scroll">
          <div className="db-popup-header">
            <div className="db-popup-tags">
              <span className="db-popup-badge" style={{ background: c.badge, color: c.text }}>{alert.tag}</span>
            </div>
            <h2 className="db-popup-title">{alert.title}</h2>
            <p className="db-popup-desc">{alert.fullDesc}</p>
          </div>
          <div className="db-popup-details">
            <div className="db-popup-detail-item">
              <span className="db-popup-detail-icon"><CalendarIcon /></span>
              <div>
                <div className="db-popup-detail-label">Date</div>
                <div className="db-popup-detail-value">{alert.date}</div>
              </div>
            </div>
            <div className="db-popup-detail-item">
              <span className="db-popup-detail-icon"><MapPinIcon /></span>
              <div>
                <div className="db-popup-detail-label">Location</div>
                <div className="db-popup-detail-value">{alert.location}</div>
              </div>
            </div>
          </div>
          <div className="db-popup-section">
            <div className="db-popup-section-title">Requirements</div>
            <ul className="db-popup-req-list">
              {alert.requirements.map((r, i) => (
                <li key={i} className="db-popup-req-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnouncementDetailPopup({ ann, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const dotColors = {
    teal: "#317D89", blue: "#1a4f8a", green: "#0d7a55",
    amber: "#e8a020", red: "#e03e3e",
  };

  return (
    <div className="db-popup-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="db-popup-modal">
        <div className="db-popup-bar" style={{ background: dotColors[ann.dotColor] || "#317D89" }} />
        <button className="db-popup-close" onClick={onClose}><XIcon /></button>
        <div className="db-popup-scroll">
          <div className="db-popup-header">
            <div className="db-popup-tags">
              <span className={`ann-row__cat-tag ${ann.catClass}`}>{ann.cat}</span>
              {ann.unread && <span className="ann-row__new-badge">NEW</span>}
            </div>
            <h2 className="db-popup-title">{ann.title}</h2>
            <p className="db-popup-desc">{ann.fullDesc}</p>
          </div>
          <div className="db-popup-details">
            <div className="db-popup-detail-item">
              <span className="db-popup-detail-icon"><CalendarIcon /></span>
              <div>
                <div className="db-popup-detail-label">Posted</div>
                <div className="db-popup-detail-value">{ann.date}</div>
              </div>
            </div>
            <div className="db-popup-detail-item">
              <span className="db-popup-detail-icon"><MapPinIcon /></span>
              <div>
                <div className="db-popup-detail-label">Location</div>
                <div className="db-popup-detail-value">{ann.location}</div>
              </div>
            </div>
          </div>
          <div className="db-popup-section">
            <div className="db-popup-section-title">Posted by</div>
            <div className="db-popup-posted-by">{ann.postedBy}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ALL ANNOUNCEMENT POPUP

function AllAnnouncementsPopup({ onClose, onSelectAnn }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const dotColors = {
    teal: "#317D89", blue: "#1a4f8a", green: "#0d7a55",
    amber: "#e8a020", red: "#e03e3e",
  };

  return (
    <div className="db-popup-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="db-popup-modal">
        <div className="db-popup-bar" style={{ background: "#317D89" }} />
        <button className="db-popup-close" onClick={onClose}><XIcon /></button>
        <div className="db-popup-scroll">
          <div className="db-popup-header">
            <div className="db-popup-tags">
              <span className="db-popup-badge" style={{ background: "rgba(49,125,137,0.1)", color: "#317D89" }}>
                {ANNOUNCEMENTS.length} Announcements
              </span>
            </div>
            <h2 className="db-popup-title">Barangay Announcements</h2>
            <p className="db-popup-desc" style={{ marginBottom: 0 }}>All recent announcements from Barangay 3S+ Malanday.</p>
          </div>
          <div className="db-popup-ann-list">
            {ANNOUNCEMENTS.map((ann) => (
              <button key={ann.id} className="db-popup-ann-row" onClick={() => onSelectAnn(ann)}>
                <div className="db-popup-ann-dot" style={{ background: dotColors[ann.dotColor] || "#317D89" }} />
                <div className="db-popup-ann-body">
                  <div className="db-popup-ann-top">
                    <span className={`ann-row__cat-tag ${ann.catClass}`}>{ann.cat}</span>
                    {ann.unread && <span className="ann-row__new-badge">NEW</span>}
                    <span className="db-popup-ann-date">{ann.date}</span>
                  </div>
                  <div className="db-popup-ann-title">{ann.title}</div>
                  <div className="db-popup-ann-desc">{ann.desc}</div>
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

/* ── Sub-section label divider ── */
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

export default function Dashboard({ userName = "Mark", onNavigate }) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [showAllAnns, setShowAllAnns] = useState(false);

  const [realUserName, setRealUserName] = useState(userName);
  const [dataLoading, setDataLoading] = useState(true);

  const [widgets, setWidgets] = useState([
    { icon: <VerifiedVisitIcon />, color: "teal", value: "...", label: "Verified Visits", sub: "via QR scans", badge: "Active", badgeIcon: <TrendUpIcon /> },
    { icon: <DocumentIcon />, color: "amber", value: "...", label: "Document Requests", sub: "currently active", badge: "Loading", badgeIcon: <ClockIcon /> },
    { icon: <FeedbackIcon />, color: "green", value: "...", label: "Feedback", sub: "submitted", badge: "Done", badgeIcon: <CheckSmallIcon /> },
    { icon: <BarangayStatusIcon />, color: "purple", value: "...", label: "Barangay Status", sub: "current standing", badge: "Active", badgeIcon: <TrendUpIcon /> },
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setDataLoading(false); return; }
      try {
        const hhQ = query(collection(db, "households"), where("userID", "==", user.uid));
        const hhSnap = await getDocs(hhQ);
        if (hhSnap.empty) { setDataLoading(false); return; }

        const hhDoc = hhSnap.docs[0];
        const householdID = hhDoc.id;

        let firstName = userName;
        let adminStatus = "Clear";

        const headRef = doc(db, "households", householdID, "residents", "head");
        const headSnap = await getDoc(headRef);
        if (headSnap.exists()) {
          firstName = headSnap.data().firstName || userName;
          adminStatus = headSnap.data().adminStatus || "Clear";
        }

        setRealUserName(firstName);

        const frSnap = await getDocs(query(collection(db, "facilityReservations"), where("householdID", "==", householdID)));
        const drSnap = await getDocs(query(collection(db, "documentRequests"), where("householdID", "==", householdID)));
        const fbSnap = await getDocs(query(collection(db, "Feedback"), where("householdID", "==", householdID)));

        setWidgets([
          { icon: <VerifiedVisitIcon />, color: "teal", value: frSnap.size.toString(), label: "Verified Visits", sub: "via QR scans", badge: "Active", badgeIcon: <TrendUpIcon /> },
          { icon: <DocumentIcon />, color: "amber", value: drSnap.size.toString(), label: "Document Requests", sub: "currently active", badge: "Updated", badgeIcon: <ClockIcon /> },
          { icon: <FeedbackIcon />, color: "green", value: fbSnap.size.toString(), label: "Feedback", sub: "submitted", badge: "Done", badgeIcon: <CheckSmallIcon /> },
          { icon: <BarangayStatusIcon />, color: "purple", value: adminStatus, label: "Barangay Status", sub: "current standing", badge: adminStatus === "Clear" ? "Active" : "Flagged", badgeIcon: <TrendUpIcon /> },
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  };

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

        {/* ── 2. Alerts & Announcements (merged into one card) ── */}
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

          {/* Smart Alerts sub-section */}
          <div style={{ padding: "0 1.5rem" }}>
            <SubLabel icon={<BoltIcon />} label="Smart Alerts for You" />
            <div className="db-alerts-grid" style={{ marginBottom: "0.5rem" }}>
              {ALERTS.map((a) => (
                <div key={a.id} className={`alert-card alert-card--${a.color}`}>
                  <div className="alert-card__header">
                    <div className="alert-card__icon-wrap">{a.icon}</div>
                    <span className="alert-card__tag">{a.tag}</span>
                  </div>
                  <div className="alert-card__body">
                    <div className="alert-card__title">{a.title}</div>
                    <div className="alert-card__desc">{a.desc}</div>
                    <button className="alert-card__cta" onClick={() => setSelectedAlert(a)}>
                      View Details <ArrowRightIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements sub-section */}
          <div style={{ padding: "0.5rem 1.5rem 1.25rem" }}>
            <SubLabel icon={<BellIcon />} label="Barangay Announcements" />

            <div className="ann-table-header">
              {["TITLE", "DATE", "CATEGORY", ""].map((h, i) => (
                <div key={i} className="ann-table-header__cell">{h}</div>
              ))}
            </div>


            {ANNOUNCEMENTS.slice(0, 4).map((a, idx) => (
              <div
                key={a.id}
                className={`ann-row${a.unread ? " ann-row--unread" : ""}${idx === 3 ? " ann-row--last" : ""}`}
                onClick={() => setSelectedAnn(a)}
                style={{ cursor: "pointer" }}
              >
                <div className={`ann-row__body${a.unread ? " ann-row__body--unread" : ""}`}>
                  <div className="ann-row__title-line">
                    <div className={`ann-row__dot db-dot-${a.dotColor}`} />
                    <span className="ann-row__title">{a.title}</span>
                    {a.unread && <span className="ann-row__new-badge">NEW</span>}
                  </div>
                  <div className="ann-row__desc">{a.desc}</div>
                </div>
                <div className="ann-row__date">{a.date}</div>
                <div className="ann-row__cat">
                  <span className={`ann-row__cat-tag ${a.catClass}`}>{a.cat}</span>
                </div>
                <button className="ann-row__chevron" onClick={e => { e.stopPropagation(); setSelectedAnn(a); }}>
                  <ChevronIcon />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Footer ── */}
      <footer className="db-footer">
        <div className="db-footer-inner">
          <p>© 2026 Barangay 3S+ Malanday. All rights reserved.</p>
        </div>
      </footer>

      {selectedAlert && <AlertDetailPopup alert={selectedAlert} onClose={() => setSelectedAlert(null)} />}
      {showAllAnns && !selectedAnn && (
        <AllAnnouncementsPopup
          onClose={() => setShowAllAnns(false)}
          onSelectAnn={(ann) => { setShowAllAnns(false); setSelectedAnn(ann); }}
        />
      )}
      {selectedAnn && <AnnouncementDetailPopup ann={selectedAnn} onClose={() => setSelectedAnn(null)} />}
    </main>
  );
}
