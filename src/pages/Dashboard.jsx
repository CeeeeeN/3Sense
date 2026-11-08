import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, getCountFromServer, orderBy, limit } from "firebase/firestore";
import { subscribeToAnnouncements } from "../services/announcements";
import { createAnnouncementNotification } from "../services/userNotifications";
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
  const { t } = useLanguage();
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const dotColors = {
    teal: "#317D89", blue: "#1a4f8a", green: "#0d7a55",
    amber: "#e8a020", red: "#e03e3e",
  };
  const annColor = TONE_HEX[ann.toneKey] || dotColors[ann.dotColor] || "#317D89";

  return (
    <div className="db-popup-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="db-popup-modal">
        <div className="db-popup-bar" style={{ background: annColor }} />
        <button className="db-popup-close" onClick={onClose}><XIcon /></button>
        <div className="db-popup-scroll">
          <div className="db-popup-header">
            <div className="db-popup-tags">
              <span className={`ann-row__cat-tag ${ann.catClass || "db-cat-service"}`}>{ann.announcementCategory || t('dashboard_general', 'General')}</span>
              <span className="db-popup-badge" style={{ background: `${annColor}1A`, color: annColor, marginLeft: '8px' }}>{t('dashboard_target_prefix', 'Target: ')}{ann.category}</span>
            </div>
            <h2 className="db-popup-title">{ann.title}</h2>
            <p className="db-popup-desc" style={{ whiteSpace: 'pre-wrap' }}>{ann.description}</p>
          </div>
          <div className="db-popup-details">
            <div className="db-popup-detail-item">
              <span className="db-popup-detail-icon"><CalendarIcon /></span>
              <div>
                <div className="db-popup-detail-label">{t('dashboard_date_time')}</div>
                <div className="db-popup-detail-value">{ann.time ? new Date(ann.time).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : ann.date}</div>
              </div>
            </div>
            <div className="db-popup-detail-item">
              <span className="db-popup-detail-icon"><MapPinIcon /></span>
              <div>
                <div className="db-popup-detail-label">{t('dashboard_location')}</div>
                <div className="db-popup-detail-value">{ann.location || t('tba')}</div>
              </div>
            </div>
          </div>
          {ann.requirements && ann.requirements.length > 0 && (
            <div className="db-popup-section">
              <div className="db-popup-section-title">{t('dashboard_requirements')}</div>
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
        </div>
      </div>
    </div>
  );
}

function AllAnnouncementsPopup({ announcements, onClose, onSelectAnn }) {
  const { t } = useLanguage();
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
                {t('dashboard_ann_count', announcements.length)}
              </span>
            </div>
            <h2 className="db-popup-title">{t('dashboard_all_ann')}</h2>
            <p className="db-popup-desc" style={{ marginBottom: 0 }}>{t('dashboard_all_ann_desc')}</p>
          </div>
          <div className="db-popup-ann-list">
            {announcements.map((ann) => (
              <button key={ann.id} className="db-popup-ann-row" onClick={() => onSelectAnn(ann)}>
                <div className="db-popup-ann-body">
                  <div className="db-popup-ann-top">
                    {ann.isSmartAlert && <span className="ann-row__new-badge" style={{ background: "#ffe4e6", color: "#e11d48", marginRight: '8px' }}>{t('dashboard_alert_badge', 'ALERT')}</span>}
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
  const { t } = useLanguage();
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

  const accentColor = isUnreturned ? '#c2410c' : '#dc2626';
  const accentLight = isUnreturned ? '#fff7ed' : '#fef2f2';
  const accentBorder = isUnreturned ? '#fed7aa' : '#fecaca';
  const badgeLabel = isUnreturned ? t('status_unreturned') : t('status_overdue');
  const warningText = isUnreturned
    ? t('dashboard_unreturned_msg')
    : t('dashboard_overdue_msg');

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
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('dashboard_eq_rental')}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{t('dashboard_return_reminder')}</div>
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
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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
                { label: t('dashboard_equipment_label'), value: rental.equipmentName || rental.type || t('n_a') },
                { label: t('dashboard_quantity_label'), value: `${rental.quantity || 1} ${(rental.quantity > 1) ? t('qty_units') : t('qty_unit')}` },
                { label: t('dashboard_pickup_label'), value: fmt(rental.pickUpDate) },
                { label: t('dashboard_return_label'), value: fmt(rental.returnDate), highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: highlight ? accentColor : '#1e293b' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>{t('dashboard_status_label')}:</span>
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
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
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
                  <polyline points="15 18 9 12 15 6" />
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
                  <polyline points="9 18 15 12 9 6" />
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
            {t('dashboard_i_understand')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TagIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function SubLabel({ icon, label, count }) {
  return (
    <div className="db-sublabel">
      <span className="db-sublabel__icon">{icon}</span>
      <span className="db-sublabel__text">{label}</span>
      {count > 0 && <span className="db-sublabel__count">{count}</span>}
    </div>
  );
}

const ITEMS_PER_PAGE = 4;   // announcements list
const ALERTS_PER_PAGE = 6;  // alert cards (3 columns x 2 rows)

function PaginationBar({ current, total, onChange }) {
  const { t } = useLanguage();
  if (total <= 1) return null;
  return (
    <div className="db-pagination">
      <button
        className="db-pagination__btn"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        aria-label={t('aria_prev_page', 'Previous page')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <div className="db-pagination__pages">
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            className={`db-pagination__dot${p === current ? ' db-pagination__dot--active' : ''}`}
            onClick={() => onChange(p)}
            aria-label={t('aria_page_num', p)}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        className="db-pagination__btn"
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        aria-label={t('aria_next_page', 'Next page')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}

// ── Colour by resident category ──
// Add or change rows to match your real category names. The first keyword
// found inside the category name wins. Colours: pink, blue, purple, green,
// amber, orange, indigo, red, teal.
const CATEGORY_TONES = [
  ["student",        "pink"],
  ["lgbt",           "blue"],
  ["senior",         "purple"],
  ["pwd",            "indigo"],
  ["disab",          "indigo"],
  ["solo parent",    "amber"],
  ["pregnan",        "orange"],
  ["4ps",            "green"],
  ["youth",          "teal"],
  ["indigent",       "red"],
];

const TONE_HEX = {
  pink: "#c2185b", blue: "#1a56a0", purple: "#703381", green: "#1e8a5e",
  amber: "#b45309", orange: "#c2410c", indigo: "#4338ca", red: "#c62828", teal: "#317D89",
};

const getCategoryTone = (category) => {
  const c = String(category || "").trim().toLowerCase();
  const hit = CATEGORY_TONES.find(([keyword]) => c.includes(keyword));
  return hit ? hit[1] : "teal";
};

// ── Helpers for Alerts & Announcements ──
const extractCategories = (d) => {
  if (!d) return [];
  const rawCats = d.categories || d.category;
  let normalizedCategories = [];
  if (Array.isArray(rawCats)) {
    normalizedCategories = rawCats;
  } else if (typeof rawCats === "string") {
    normalizedCategories = rawCats.split(",").map(c => c.trim());
  }
  return normalizedCategories
    .map(c => (typeof c === "string" ? c.trim() : String(c).trim()))
    .filter(Boolean);
};


const getPostedAt = (a) => a.createdAt?.toDate?.() || a.time || null; // adjust to your field name

const timeAgo = (value, translate) => {
  const t = new Date(value).getTime();
  if (!value || isNaN(t)) return "";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return translate ? translate('just_now') : "Just now";
  if (m < 60) return translate ? translate('time_mins_ago', m) : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return translate ? translate('time_hours_ago', h) : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return translate ? translate('time_days_ago', d) : `${d}d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const isRecent = (value, days = 3) => {
  if (!value) return false;
  const t = new Date(value).getTime();
  return !isNaN(t) && Date.now() - t < days * 86400000;
};

function EmptyState({ icon, title, text }) {
  return (
    <div className="db-empty">
      <div className="db-empty__icon">{icon}</div>
      <div className="db-empty__title">{title}</div>
      <div className="db-empty__text">{text}</div>
    </div>
  );
}

function SkeletonCards({ count = 2 }) {
  return (
    <div className="db-alerts-grid">
      {Array.from({ length: count }).map((_, i) => <div key={i} className="db-skeleton" />)}
    </div>
  );
}

export default function Dashboard({ userName = "", onNavigate, householdID: propsHouseholdID, memberID, pendingAnnID, onAnnConsumed }) {
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [showAllAnns, setShowAllAnns] = useState(false);
  const [alertPage, setAlertPage] = useState(1);
  const [annPage, setAnnPage] = useState(1);
  const [annLoading, setAnnLoading] = useState(true);
  const [annFilter, setAnnFilter] = useState("All");
  const [annSearch, setAnnSearch] = useState("");
  const [realUserName, setRealUserName] = useState(userName);
  const [dataLoading, setDataLoading] = useState(true);
  const [announcementsData, setAnnouncementsData] = useState([]);
  const [userCategories, setUserCategories] = useState(() => {
    try {
      const session = JSON.parse(localStorage.getItem("brgy_session") || "{}");
      const cleanHH = propsHouseholdID || session.householdID;
      const cleanMem = memberID || session.memberID;
      if (cleanHH && cleanMem) {
        const cached = JSON.parse(localStorage.getItem(`hh_residents_${cleanHH}`) || "[]");
        const res = cached.find(r => r.id === cleanMem || r.residentID === cleanMem || (cleanMem === "head" && (r.role === "Household Head" || r.role === "head")));
        if (res) {
          return extractCategories(res);
        }
      }
    } catch (e) { void e; }
    return [];
  });

  const [overdueRentals, setOverdueRentals] = useState([]);
  const [eqAlertIdx, setEqAlertIdx] = useState(0);
  const [showEqModal, setShowEqModal] = useState(true);

  const [widgets, setWidgets] = useState([
    { icon: <VerifiedVisitIcon />, color: "teal", value: "...", labelKey: "widget_verified_visits", subKey: "widget_verified_sub", badgeKey: "widget_badge_active", badgeIcon: <TrendUpIcon /> },
    { icon: <DocumentIcon />, color: "amber", value: "...", labelKey: "widget_docs", subKey: "widget_docs_sub", badgeKey: "widget_badge_loading", badgeIcon: <ClockIcon /> },
    { icon: <FeedbackIcon />, color: "green", value: "...", labelKey: "widget_feedback", subKey: "widget_feedback_sub", badgeKey: "widget_badge_done", badgeIcon: <CheckSmallIcon /> },
    { icon: <BarangayStatusIcon />, color: "purple", value: "...", labelKey: "widget_brgy_status", subKey: "widget_brgy_sub", badgeKey: "widget_badge_active", badgeIcon: <TrendUpIcon /> },
  ]);

  useEffect(() => {
    const unsubAnns = subscribeToAnnouncements((data) => {
      setAnnouncementsData(data);
      setAnnLoading(false);
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
    if (!pendingAnnID) return;
    let cancelled = false;

    const findAndShow = async () => {
      let raw = announcementsData.find((a) => a.id === pendingAnnID || a.announcementID === pendingAnnID);
      if (!raw) {
        try {
          const snap = await getDoc(doc(db, "announcements", pendingAnnID));
          if (snap.exists() && !cancelled) {
            const data = snap.data();
            let displayDate = "";
            if (data.createdAt) {
              displayDate = data.createdAt.toDate
                ? data.createdAt.toDate().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
                : new Date(data.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
            } else {
              displayDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
            }
            raw = { id: snap.id, ...data, date: displayDate };
          }
        } catch (e) {
          console.warn("[Dashboard] Could not fetch announcement by ID:", e);
        }
      }

      if (raw && !cancelled) {
        const processed = mapAnnouncements([raw])[0];
        setSelectedAnn(processed);
        if (onAnnConsumed) onAnnConsumed();
      }
    };

    findAndShow();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnnID, announcementsData, userCategories]);

  useEffect(() => {
    let unsubResident = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setDataLoading(false); return; }
      try {
        let householdID = propsHouseholdID;
        if (!householdID) {
          const hhQ = query(collection(db, "households"), where("userID", "==", user.uid));
          const hhSnap = await getDocs(hhQ);
          if (!hhSnap.empty) {
            householdID = hhSnap.docs[0].id;
          }
        }
        if (!householdID) {
          const session = JSON.parse(localStorage.getItem("brgy_session") || "{}");
          householdID = session.householdID;
        }

        const residentIdToFetch = memberID || JSON.parse(localStorage.getItem("brgy_session") || "{}").memberID || "head";
        if (!householdID || !residentIdToFetch) {
          console.warn("[Dashboard] Missing householdID or memberID, skipping category fetch.");
          setDataLoading(false);
          return;
        }

        const headRef = doc(db, "households", householdID, "residents", residentIdToFetch);
        if (unsubResident) unsubResident();
        unsubResident = onSnapshot(headRef, async (headSnap) => {
          let firstName = userName;
          let adminStatus = "Clear";
          let uCats = [];

          if (headSnap.exists()) {
            const d = headSnap.data();
            firstName = d.firstName || userName;
            adminStatus = d.adminStatus || "Clear";
            uCats = extractCategories(d);
          } else {
            try {
              const allResSnap = await getDocs(collection(db, "households", householdID, "residents"));
              const matchedDoc = allResSnap.docs.find(d =>
                d.id === residentIdToFetch ||
                d.data().residentID === residentIdToFetch ||
                d.data().UID === residentIdToFetch ||
                (residentIdToFetch === "head" && (d.data().role === "Household Head" || d.data().role === "head"))
              );
              if (matchedDoc) {
                const d = matchedDoc.data();
                firstName = d.firstName || userName;
                adminStatus = d.adminStatus || "Clear";
                uCats = extractCategories(d);
              }
            } catch (err) {
              console.warn("[Dashboard] Error looking up resident in subcollection:", err);
            }
          }

          if (uCats.length === 0) {
            try {
              const cached = JSON.parse(localStorage.getItem(`hh_residents_${householdID}`) || "[]");
              const res = cached.find(r => r.id === residentIdToFetch || r.residentID === residentIdToFetch || (residentIdToFetch === "head" && (r.role === "Household Head" || r.role === "head")));
              if (res) {
                uCats = extractCategories(res);
              }
            } catch (e) { void e; }
          }

          setRealUserName(firstName);
          if (uCats.length > 0) {
            setUserCategories(uCats);
          }

          setWidgets([
            { icon: <VerifiedVisitIcon />, color: "teal", value: "...", labelKey: "widget_verified_visits", subKey: "widget_verified_sub", badgeKey: "widget_badge_active", badgeIcon: <TrendUpIcon /> },
            { icon: <DocumentIcon />, color: "amber", value: "...", labelKey: "widget_docs", subKey: "widget_docs_sub", badgeKey: "widget_badge_loading", badgeIcon: <ClockIcon /> },
            { icon: <FeedbackIcon />, color: "green", value: "...", labelKey: "widget_feedback", subKey: "widget_feedback_sub", badgeKey: "widget_badge_done", badgeIcon: <CheckSmallIcon /> },
            { icon: <BarangayStatusIcon />, color: "purple", value: adminStatus, labelKey: "widget_brgy_status", subKey: "widget_brgy_sub", badgeKey: adminStatus === "Clear" ? "widget_badge_active" : "widget_badge_flagged", badgeIcon: <TrendUpIcon /> },
          ]);
        });

        const [frCount, drCount, fbCount] = await Promise.all([
          getCountFromServer(query(collection(db, "facility_reservations"), where("householdID", "==", householdID), where("residentID", "==", residentIdToFetch))),
          getCountFromServer(query(collection(db, "document_requests"), where("householdID", "==", householdID), where("residentID", "==", residentIdToFetch))),
          getCountFromServer(query(collection(db, "feedback"), where("householdID", "==", householdID), where("residentID", "==", residentIdToFetch)))
        ]);

        setWidgets([
          { icon: <VerifiedVisitIcon />, color: "teal", value: frCount.data().count.toString(), labelKey: "widget_verified_visits", subKey: "widget_verified_sub", badgeKey: "widget_badge_active", badgeIcon: <TrendUpIcon /> },
          { icon: <DocumentIcon />, color: "amber", value: drCount.data().count.toString(), labelKey: "widget_docs", subKey: "widget_docs_sub", badgeKey: "widget_badge_updated", badgeIcon: <ClockIcon /> },
          { icon: <FeedbackIcon />, color: "green", value: fbCount.data().count.toString(), labelKey: "widget_feedback", subKey: "widget_feedback_sub", badgeKey: "widget_badge_done", badgeIcon: <CheckSmallIcon /> },
          { icon: <BarangayStatusIcon />, color: "purple", value: "...", labelKey: "widget_brgy_status", subKey: "widget_brgy_sub", badgeKey: "widget_badge_active", badgeIcon: <TrendUpIcon /> },
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
  }, [memberID, propsHouseholdID, userName]);

  const { t } = useLanguage();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard_greeting_morning');
    if (h < 18) return t('dashboard_greeting_afternoon');
    return t('dashboard_greeting_evening');
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

      const annRawCat = ann.category || "";
      const annRawAudience = ann.targetAudience || "";

      const annCategories = (
        Array.isArray(annRawCat) ? annRawCat :
          typeof annRawCat === "string" ? annRawCat.split(",") : []
      ).map(c => String(c).trim().toLowerCase()).filter(Boolean);

      if (typeof annRawAudience === "string" && annRawAudience.trim()) {
        annRawAudience.split(",").forEach(c => {
          const clean = c.trim().toLowerCase();
          if (clean && !annCategories.includes(clean)) annCategories.push(clean);
        });
      }

      // "All Residents" or empty → general announcement, NOT a category-targeted alert
      const targetsEveryone = annCategories.length === 0 || annCategories.includes("all residents");

      // Targeted alert: announcement category must equal one of the resident's profile categories
      const matchedCategory = targetsEveryone ? null : annCategories.find(c =>
        userCategories.some(uc => String(uc).trim().toLowerCase() === c)
      );
      const isAlert = Boolean(matchedCategory);

      // Who the announcement is for (keeps the original spelling, e.g. "PWD", "Students")
      const audienceNames = (Array.isArray(annRawCat) ? annRawCat : String(annRawCat).split(","))
        .map(c => String(c).trim())
        .filter(c => c && c.toLowerCase() !== "all residents");
      const audience = isAlert
        ? (audienceNames.find(n => n.toLowerCase() === matchedCategory) || audienceNames[0])
        : audienceNames[0];

      // Colour follows the audience (students = pink, LGBT = blue, PWD = indigo ...)
      const toneKey = getCategoryTone(audience || "");

      return { ...ann, dotColor: dc, toneKey, audience, catClass: cc, icon, isSmartAlert: isAlert };
    });
  };

  const getTimestamp = (a) => {
    if (a.createdAt?.toDate) return a.createdAt.toDate().getTime();
    if (a.createdAt?.seconds) return a.createdAt.seconds * 1000;
    if (a.createdAt) return new Date(a.createdAt).getTime();
    if (a.time) return new Date(a.time).getTime();
    return 0;
  };

  const processedAnns = mapAnnouncements(announcementsData);

  // Alert Announcements: category-specific announcements that match the logged-in resident's category
  const smartAlertsList = processedAnns
    .filter(a => a.isSmartAlert)
    .sort((a, b) => getTimestamp(b) - getTimestamp(a));

  // General Announcements
  const generalAnnsList = processedAnns
    .filter(a => !a.isSmartAlert)
    .sort((a, b) => getTimestamp(b) - getTimestamp(a));

  // View All: ALL published announcements, prioritizing category-targeted announcements for the resident at top
  const combinedAnns = [...smartAlertsList, ...generalAnnsList];

  // Self-heal: ensure in-app notification exists for matching alert announcements
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("brgy_session") || "{}");
    const hhID = propsHouseholdID || session.householdID;
    const memID = memberID || session.memberID;
    if (!hhID || !memID || smartAlertsList.length === 0) return;

    smartAlertsList.forEach(a => {
      if (a.id && a.isSmartAlert) {
        createAnnouncementNotification({
          householdID: hhID,
          residentID: memID,
          announcementID: a.id,
          title: "New Announcement",
          message: a.description ? `${a.title} — ${a.description}`.slice(0, 200) : a.title,
          category: a.category || "",
        }).catch(e => { void e; });
      }
    });
  }, [propsHouseholdID, memberID, smartAlertsList]);

  // Pagination + filter derived values
  const alertTotalPages = Math.max(1, Math.ceil(smartAlertsList.length / ALERTS_PER_PAGE));
  const pagedAlerts = smartAlertsList.slice((alertPage - 1) * ALERTS_PER_PAGE, alertPage * ALERTS_PER_PAGE);

  const filterOptions = ["All", ...new Set(generalAnnsList.map(a => a.announcementCategory).filter(Boolean))];

  const filteredAnns = generalAnnsList.filter(a =>
    (annFilter === "All" || a.announcementCategory === annFilter) &&
    (!annSearch.trim() || `${a.title} ${a.description}`.toLowerCase().includes(annSearch.trim().toLowerCase()))
  );

  const annTotalPages = Math.max(1, Math.ceil(filteredAnns.length / ITEMS_PER_PAGE));
  const pagedAnns = filteredAnns.slice((annPage - 1) * ITEMS_PER_PAGE, annPage * ITEMS_PER_PAGE);

  // Equipment banner: values used by the .db-banner markup below
  const hasUnreturned = overdueRentals.some(r => r.status === 'Unreturned');
  const rentalName = overdueRentals[0]?.equipmentName || overdueRentals[0]?.type || 'Equipment';
  const bannerTitle = hasUnreturned
    ? (overdueRentals.length > 1
      ? t('dashboard_eq_unreturned_multi', overdueRentals.length)
      : t('dashboard_eq_unreturned_single'))
    : (overdueRentals.length > 1
      ? t('dashboard_eq_overdue_multi', overdueRentals.length)
      : t('dashboard_eq_overdue_single'));

  return (
    <main className="db-page">
      <div className="db-welcome-banner">
        <div className="db-welcome-banner-inner">
          <div className="db-welcome-left">
            <div className="db-welcome-eyebrow">{t('dashboard_eyebrow')}</div>
            <h1 className="db-welcome-heading">{getGreeting()}, <span>{realUserName}!</span></h1>
            <p className="db-welcome-sub">{t('dashboard_sub')}</p>
          </div>
        </div>
      </div>

      <div className="db-content">

        {/* ── Action banners (styles in the Dashboard CSS: .db-banner) ── */}
        <div className="db-banners">
          {overdueRentals.length > 0 && (
            <div
              className={`db-banner db-banner--clickable ${hasUnreturned ? 'db-banner--orange' : 'db-banner--red'}`}
              role="button"
              tabIndex={0}
              onClick={() => setShowEqModal(true)}
              onKeyDown={(e) => e.key === 'Enter' && setShowEqModal(true)}
            >
              <div className="db-banner__icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <div className="db-banner__body">
                <h4 className="db-banner__title">{bannerTitle}</h4>
                <p className="db-banner__text">
                  {overdueRentals.length > 1 ? (
                    <>
                      {t('dashboard_eq_return_multi_prefix', 'Please return your rented ')}
                      <strong>{rentalName}</strong>
                      {t('dashboard_eq_return_multi_suffix', overdueRentals.length - 1)}
                    </>
                  ) : (
                    <>
                      {t('dashboard_eq_return_single_prefix', 'Please return your rented ')}
                      <strong>{rentalName}</strong>
                      {t('dashboard_eq_return_single_suffix', ' to the Barangay Hall as soon as possible.')}
                    </>
                  )}
                </p>
              </div>

              <button
                type="button"
                className="db-banner__btn"
                onClick={(e) => { e.stopPropagation(); setShowEqModal(true); }}
              >
                {t('dashboard_review_now')}
              </button>
            </div>
          )}

          <FeedbackAlerts
            householdID={propsHouseholdID}
            residentID={memberID}
            onNavigate={onNavigate}
          />
        </div>

        {/* ── 1. Your Summary ── */}
        <SectionCard icon={<GridIcon />} title={t('dashboard_summary_title')} subtitle={t('dashboard_summary_sub')}>
          <div className="db-widgets-grid">
            {widgets.map((w, i) => (
              <div key={i} className={`summary-widget summary-widget--${w.color}`}>
                <div className="summary-widget__header">
                  <div className="summary-widget__icon-wrap">{w.icon}</div>
                  <span className="summary-widget__badge">{w.badgeIcon} {t(w.badgeKey)}</span>
                </div>
                <div className="summary-widget__value">{dataLoading ? "..." : w.value}</div>
                <div className="summary-widget__divider" />
                <div className="summary-widget__label">{t(w.labelKey)}</div>
                <div className="summary-widget__sub">{t(w.subKey)}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 2. Alerts & Announcements ── */}
        <SectionCard
          icon={<BoltIcon />}
          title={t('dashboard_ann_title')}
          subtitle={t('dashboard_ann_sub')}
          action={
            <button className="db-view-all-btn" onClick={() => setShowAllAnns(true)}>
              {t('view_all')} <ArrowRightIcon />
            </button>
          }
        >
          {/* Alerts */}
          <div className="db-block">
            <SubLabel icon={<BoltIcon />} label={t('dashboard_alerts_label')} count={smartAlertsList.length} />
            {annLoading ? (
              <SkeletonCards count={3} />
            ) : smartAlertsList.length === 0 ? (
              <EmptyState
                icon={<BoltIcon />}
                title={t('dashboard_caught_up')}
                text={t('dashboard_alerts_empty')}
              />
            ) : (
              <>
                <div className="db-alerts-grid">
                  {pagedAlerts.map((a) => {
                    const posted = getPostedAt(a);
                    return (
                      <div
                        key={a.id}
                        className={`alert-card tone-${a.toneKey || a.dotColor}`}
                        onClick={() => setSelectedAnn(a)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && setSelectedAnn(a)}
                      >
                        <div className="alert-card__top">
                          <div className="alert-card__icon-wrap">{a.icon}</div>
                          <div className="alert-card__top-text">
                            <span className="alert-card__tag"><TagIcon /> {a.category}</span>
                            <div className="alert-card__meta">
                              {isRecent(posted) && <span className="alert-card__new">{t('dashboard_new_badge', 'New')}</span>}
                              <span className="alert-card__time"><ClockIcon /> {timeAgo(posted, t)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="alert-card__title">{a.title}</div>
                        <div className="alert-card__desc">{a.description}</div>

                        <div className="alert-card__foot">
                          <span className="alert-card__cta">
                            {t('view_details')}
                            <span className="alert-card__arrow"><ArrowRightIcon /></span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <PaginationBar current={alertPage} total={alertTotalPages} onChange={setAlertPage} />
              </>
            )}
          </div>

          {/* Barangay Announcements */}
          <div className="db-block">
            <SubLabel icon={<BellIcon />} label={t('dashboard_ann_label')} count={generalAnnsList.length} />

            <div className="ann-toolbar">
              <div className="ann-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder={t('dashboard_search_ann')}
                  value={annSearch}
                  onChange={(e) => { setAnnSearch(e.target.value); setAnnPage(1); }}
                />
              </div>
              <div className="ann-chips">
                {filterOptions.map((opt) => (
                  <button
                    key={opt}
                    className={`ann-chip${annFilter === opt ? " ann-chip--active" : ""}`}
                    onClick={() => { setAnnFilter(opt); setAnnPage(1); }}
                  >
                    {opt === "All" ? t('filter_all', 'All') : opt}
                  </button>
                ))}
              </div>
            </div>

            {annLoading ? (
              <div className="db-skeleton db-skeleton--row" />
            ) : filteredAnns.length === 0 ? (
              <EmptyState
                icon={<BellIcon />}
                title={t('dashboard_no_ann')}
                text={annSearch || annFilter !== "All" ? t('dashboard_no_ann_search') : t('dashboard_no_ann_empty')}
              />
            ) : (
              <>
                <div className="ann-list">
                  <div className="ann-table-header">
                    {["", t('dashboard_th_title', 'TITLE'), t('dashboard_th_date', 'DATE'), t('dashboard_th_category', 'CATEGORY'), ""].map((h, i) => (
                      <div key={i} className="ann-table-header__cell">{h}</div>
                    ))}
                  </div>
                  {pagedAnns.map((a, idx) => (
                    <div
                      key={a.id}
                      className={`ann-row tone-${a.toneKey || a.dotColor}${idx === pagedAnns.length - 1 ? " ann-row--last" : ""}`}
                      onClick={() => setSelectedAnn(a)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedAnn(a)}
                    >
                      <div className="ann-row__icon" aria-hidden="true">{a.icon}</div>

                      <div className="ann-row__body">
                        <div className="ann-row__title-line">
                          <span className="ann-row__title">{a.title}</span>
                          {a.isSmartAlert && <span className="ann-row__alert-badge">{t('dashboard_alert_badge', 'ALERT')}</span>}
                        </div>
                        <div className="ann-row__desc">{a.description}</div>
                        <div className="ann-row__mobile-meta">
                          <span><ClockIcon /> {timeAgo(getPostedAt(a), t) || a.date}</span>
                          <span className={`ann-row__cat-tag ${a.catClass || "db-cat-service"}`}>{a.announcementCategory}</span>
                          {a.audience && <span className="ann-row__aud"><TagIcon /> {a.audience}</span>}
                        </div>
                      </div>

                      <div className="ann-row__date">
                        {isRecent(getPostedAt(a)) && <span className="ann-row__fresh" />}
                        <ClockIcon /> {timeAgo(getPostedAt(a), t) || a.date}
                      </div>

                      <div className="ann-row__cat">
                        <span className={`ann-row__cat-tag ${a.catClass || "db-cat-service"}`}>{a.announcementCategory}</span>
                        {a.audience && <span className="ann-row__aud"><TagIcon /> {a.audience}</span>}
                      </div>

                      <button
                        type="button"
                        className="ann-row__chevron"
                        aria-label={t('view_details')}
                        onClick={e => { e.stopPropagation(); setSelectedAnn(a); }}
                      >
                        <ChevronIcon />
                      </button>
                    </div>
                  ))}
                </div>
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
              <a className="db-footer-link" href="#">{t('footer_privacy')}</a>
              <a className="db-footer-link" href="#">{t('footer_terms')}</a>
              <a className="db-footer-link" href="#">{t('footer_support')}</a>
            </nav>
          </div>
          <div className="db-footer-bottom">
            <p>{t('footer_rights', new Date().getFullYear())}</p>
            <p>{t('footer_powered')}</p>
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