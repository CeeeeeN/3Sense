import { useState, useEffect } from "react";
import { ScholarshipIcon, AcademicIcon, HealthIcon, AssistanceIcon, VerifiedVisitIcon, DocumentIcon, FeedbackIcon, BarangayStatusIcon, TrendUpIcon, ClockIcon, CheckSmallIcon, BoltIcon, GridIcon, BellIcon, ArrowRightIcon, ChevronIcon, XIcon, CalendarIcon, MapPinIcon } from "../components/Icons";

// DATA

const ALERTS = [
  {
    id: 1, color: "teal", icon: <ScholarshipIcon />, tag: "Student",
    title: "Scholarship Programs Now Open",
    desc: "Applications for the 2026 Local Scholarship Grant are accepted at the barangay hall. Deadline: April 15.",
    fullDesc: "The Barangay 3S+ Malanday Local Scholarship Grant provides financial assistance to qualified residents enrolled in college or TESDA-accredited vocational programs. Grantees receive a one-time stipend to help cover tuition and school supply costs for the current academic year.",
    date: "April 15, 2026",
    location: "Barangay 3S+ Hall, Malanday, Valenzuela City",
    requirements: ["Valid barangay ID", "School enrollment form", "1×1 ID photo", "Grade / transcript of records"],
  },
  {
    id: 2, color: "amber", icon: <AcademicIcon />, tag: "Student",
    title: "Academic Events This Month",
    desc: "Free tutorial sessions and career orientation seminar on March 18–22 at the community center.",
    fullDesc: "A week-long learning event offering free academic tutorial sessions in Math, Science, and English, followed by a career orientation seminar featuring guest speakers from various industries. Open to all high school and college students residing in Barangay Malanday.",
    date: "March 18–22, 2026",
    location: "Barangay Multi-Purpose Hall",
    requirements: ["Barangay residency", "Registration form (on-site)"],
  },
  {
    id: 3, color: "green", icon: <HealthIcon />, tag: "Senior / PWD",
    title: "Free Health Checkup – March 15",
    desc: "Free medical consultation for senior citizens and PWDs. Bring your barangay ID and health record.",
    fullDesc: "A monthly barangay health program offering free blood pressure monitoring, blood sugar testing, and medicine subsidies for senior citizens. A dedicated health team visits every second Saturday to provide consultations and dispense maintenance medicines.",
    date: "Every 2nd Saturday",
    location: "Barangay Health Center",
    requirements: ["Senior Citizen ID", "Health booklet (if available)"],
  },
  {
    id: 4, color: "purple", icon: <AssistanceIcon />, tag: "Senior / PWD",
    title: "Assistance Programs Available",
    desc: "Social welfare assistance for qualified senior citizens and PWD residents. Deadline is March 31.",
    fullDesc: "This program provides financial and social welfare assistance to persons with disabilities (PWD) residing in Barangay Malanday. Qualified beneficiaries may receive cash assistance, assistive device referrals, and access to DSWD-linked programs.",
    date: "April 1–30, 2026",
    location: "Barangay 3S+ Hall – Social Welfare Desk",
    requirements: ["PWD ID", "Medical certificate", "1×1 ID photo", "Barangay clearance"],
  },
];

const ANNOUNCEMENTS = [
  {
    id: 1, dotColor: "teal", title: "Free Medical Consultation – March 15",
    cat: "Health", catClass: "db-cat-health",
    desc: "Free medical check-up at Barangay Hall, 8AM–4PM. All residents welcome.",
    fullDesc: "The Barangay Health Center will be conducting a free medical consultation event on March 15, 2026 from 8:00 AM to 4:00 PM at the Barangay Hall grounds. Services include blood pressure monitoring, blood sugar testing, general consultation, and free medicines for qualifying residents. No appointment needed — walk-in basis only. Please bring a valid ID.",
    date: "March 9, 2026", unread: true,
    location: "Barangay Hall Grounds",
    postedBy: "Barangay Health Officer",
  },
  {
    id: 2, dotColor: "blue", title: "Community Clean-Up Drive – March 22",
    cat: "Event", catClass: "db-cat-event",
    desc: "Join the monthly clean-up drive. Volunteers receive a certificate.",
    fullDesc: "The Barangay 3S+ Malanday invites all residents to join the monthly Community Clean-Up Drive on March 22, 2026 starting at 6:00 AM. Volunteers will clean common areas, drainage canals, and streets within the barangay. Gloves and garbage bags will be provided. All participants will receive a Certificate of Participation.",
    date: "March 7, 2026", unread: false,
    location: "Barangay Hall — Assembly Point",
    postedBy: "Barangay Environmental Committee",
  },
  {
    id: 3, dotColor: "green", title: "Barangay ID Renewal Now Open",
    cat: "Service", catClass: "db-cat-service",
    desc: "Submit your renewal online or visit the barangay hall Mon–Fri, 8AM–5PM.",
    fullDesc: "The Barangay ID Renewal Program is now open for all residents with expired or expiring barangay IDs. You may submit your renewal application online through the portal or visit the Barangay Hall in person from Monday to Friday, 8:00 AM to 5:00 PM. Bring one (1) valid government-issued ID and one (1) 1×1 ID photo.",
    date: "March 5, 2026", unread: false,
    location: "Barangay Hall — Records Section",
    postedBy: "Barangay Secretary",
  },
  {
    id: 4, dotColor: "amber", title: "Livelihood Training Program – April Batch",
    cat: "Training", catClass: "db-cat-info",
    desc: "Free skills training on food processing and basic entrepreneurship.",
    fullDesc: "Register now for the April Batch of the Barangay Livelihood Training Program. This free three-day training covers food processing techniques (longganisa, bottled goods) and basic entrepreneurship fundamentals. Participants will receive a training certificate and starter kit upon completion. Limited slots — register at the Barangay Hall before March 31.",
    date: "March 3, 2026", unread: false,
    location: "Barangay Multi-Purpose Hall",
    postedBy: "Barangay Livelihood Office",
  },
  {
    id: 5, dotColor: "teal", title: "Scholarship Grant Deadline – April 15",
    cat: "Service", catClass: "db-cat-service",
    desc: "Final call for scholarship applications. Submit at the Barangay Hall.",
    fullDesc: "This is the final call for all interested applicants of the 2026 Local Scholarship Grant. Deadline for submission is April 15, 2026. Requirements: Valid Barangay ID, School Enrollment Form, 1×1 ID Photo, and latest grade or transcript of records. Submit all requirements at the Barangay Hall during office hours.",
    date: "Feb 28, 2026", unread: false,
    location: "Barangay Hall — Scholarship Desk",
    postedBy: "Barangay Education Committee",
  },
  {
    id: 6, dotColor: "red", title: "Emergency Preparedness Seminar",
    cat: "Alert", catClass: "db-cat-alert",
    desc: "All households are encouraged to attend the disaster readiness seminar.",
    fullDesc: "The Barangay Disaster Risk Reduction and Management Council (BDRRMC) will conduct an Emergency Preparedness Seminar on April 3, 2026 at 9:00 AM at the Barangay Multi-Purpose Hall. Topics include evacuation procedures, basic first aid, and disaster kit preparation. At least one household representative is encouraged to attend.",
    date: "Feb 25, 2026", unread: false,
    location: "Barangay Multi-Purpose Hall",
    postedBy: "BDRRMC Coordinator",
  },
];

// ── Reusable section card ──
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

// ALERT DETAIL POPUP

function AlertDetailPopup({ alert, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const colorMap = {
    teal:   { bar: "#317D89", badge: "rgba(49,125,137,0.10)",  text: "#317D89" },
    amber:  { bar: "#BDBD64", badge: "rgba(189,189,100,0.15)", text: "#7a7200" },
    green:  { bar: "#2DB17B", badge: "rgba(45,177,123,0.10)",  text: "#1e8a5e" },
    purple: { bar: "#703381", badge: "rgba(112,51,129,0.10)",  text: "#703381" },
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
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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

// ANNOUNCEMENT DETAIL POPUP
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

// MAIN DASHBOARD

export default function Dashboard({ userName = "Mark", onNavigate }) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedAnn, setSelectedAnn]     = useState(null);
  const [showAllAnns, setShowAllAnns]     = useState(false);

  const widgets = [
    { icon: <VerifiedVisitIcon />, color: "teal",   value: "12",    label: "Verified Visits",   sub: "via QR scans",     badge: "Active",    badgeIcon: <TrendUpIcon /> },
    { icon: <DocumentIcon />,      color: "amber",  value: "3",     label: "Document Requests", sub: "currently active", badge: "2 Pending", badgeIcon: <ClockIcon />   },
    { icon: <FeedbackIcon />,      color: "green",  value: "1",     label: "Feedback",          sub: "submitted",        badge: "Done",      badgeIcon: <CheckSmallIcon /> },
    { icon: <BarangayStatusIcon />,color: "purple", value: "Clear", label: "Barangay Status",   sub: "current standing", badge: "Active",    badgeIcon: <TrendUpIcon /> },
  ];

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  };
  const dateStr = new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="db-page">

      {/* ── Welcome Banner ── */}
      <div className="db-welcome-banner">
        <div className="db-welcome-banner-inner">
          <div className="db-welcome-left">
            <div className="db-welcome-eyebrow">My Dashboard</div>
            <h1 className="db-welcome-heading">{getGreeting()}, <span>{userName}!</span></h1>
            <p className="db-welcome-sub">Here's what's happening in your barangay today.</p>
          </div>
          <div className="db-welcome-right">
            <div className="db-date-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {dateStr}
            </div>
            <div className="db-status-pill">
              <span className="db-status-dot" />Verified Resident
            </div>
          </div>
        </div>
      </div>

      {/* ── THE FIX: override db-content bottom padding on mobile ── */}
      <div className="db-content" style={{ paddingBottom: '1.5rem' }}>

        {/* ── Smart Alerts ── */}
        <SectionCard
          icon={<BoltIcon />}
          title="Smart Alerts for You"
          subtitle="Personalized based on your barangay profile"
        >
          <div className="db-alerts-grid">
            {ALERTS.map((a) => (
              <div key={a.id} className={`alert-card alert-card--${a.color}`}>
                <div className="alert-card__top-bar" />
                <div className="alert-card__header">
                  <div className="alert-card__icon-wrap">{a.icon}</div>
                  <span className="alert-card__tag">{a.tag}</span>
                </div>
                <div className="alert-card__body">
                  <div className="alert-card__title">{a.title}</div>
                  <div className="alert-card__desc">{a.desc}</div>
                  <div className="alert-card__divider" />
                  <button className="alert-card__cta" onClick={() => setSelectedAlert(a)}>
                    View Details <ArrowRightIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Your Summary ── */}
        <SectionCard
          icon={<GridIcon />}
          title="Your Summary"
          subtitle="Overview of your barangay activity"
        >
          <div className="db-widgets-grid">
            {widgets.map((w, i) => (
              <div key={i} className={`summary-widget summary-widget--${w.color}`}>
                <div className="summary-widget__header">
                  <div className="summary-widget__icon-wrap">{w.icon}</div>
                  <span className="summary-widget__badge">{w.badgeIcon} {w.badge}</span>
                </div>
                <div className="summary-widget__value">{w.value}</div>
                <div className="summary-widget__divider" />
                <div className="summary-widget__label">{w.label}</div>
                <div className="summary-widget__sub">{w.sub}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Announcements ── */}
        <SectionCard
          icon={<BellIcon />}
          title="Barangay Announcements"
          subtitle="Stay updated with the latest news"
          action={
            <button className="db-view-all-btn" onClick={() => setShowAllAnns(true)}>
              View All <ArrowRightIcon />
            </button>
          }
        >
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
        </SectionCard>

      </div>

      {/* ── Footer ── */}
      <footer className="db-footer" style={{ marginTop: 0 }}>
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

      {/* ── Popups ── */}
      {selectedAlert && (
        <AlertDetailPopup alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
      {showAllAnns && !selectedAnn && (
        <AllAnnouncementsPopup
          onClose={() => setShowAllAnns(false)}
          onSelectAnn={(ann) => { setShowAllAnns(false); setSelectedAnn(ann); }}
        />
      )}
      {selectedAnn && (
        <AnnouncementDetailPopup ann={selectedAnn} onClose={() => setSelectedAnn(null)} />
      )}

    </main>
  );
}