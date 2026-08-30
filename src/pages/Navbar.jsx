import { useState, useEffect, useRef } from "react";
import barangayLogo from "./barangay-logo.jpg";
import { IconBell, NavIconUser, IconProfile2, IconSettings, IconHelp, IconLogout } from "../components/Icons";
import NotificationModal from "../components/NotificationModal";
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteUserNotification,
} from "../services/userNotifications";
import { requestPushPermission } from "../services/fcm";

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { key: "services", label: "3S+", icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg> },
  { key: "scan", label: "Scan", icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="3" y1="12" x2="21" y2="12" /></svg> },
  { key: "activity", label: "Activity", icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { key: "emergency", label: "Emergency", icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>, emergency: true },
];

export default function Navbar({ activePage = "home", onNavigate, householdID = "", userName = "", userRole = "member", memberID = "", userID = "" }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [memberNotifs, setMemberNotifs] = useState([]);
  const [householdNotifs, setHouseholdNotifs] = useState([]);

  // Merge both streams, deduplicate by id, sort newest-first
  const notifications = [...memberNotifs, ...householdNotifs]
    .filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i)
    .sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return tb - ta;
    });

  const userRef = useRef(null);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (!householdID || !memberID) return;
    const unsub = subscribeToUserNotifications(householdID, memberID, setMemberNotifs);
    return () => unsub();
  }, [householdID, memberID]);

  useEffect(() => {
    if (!householdID) return;
    const unsub = subscribeToUserNotifications(householdID, "household", setHouseholdNotifs);
    return () => unsub();
  }, [householdID]);

  useEffect(() => {
    const handler = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!showLogoutModal) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowLogoutModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLogoutModal]);

  useEffect(() => {
    if (showLogoutModal) {
      document.body.style.overflow = "hidden";
    } else if (window.innerWidth <= 768 && userOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showLogoutModal, userOpen]);

  const clearAll = () => markAllNotificationsAsRead(notifications);
  const markRead = (id) => markNotificationAsRead(id);
  const handleDelete = async (id) => {
    await deleteUserNotification(id);
  };

  const handleNotifClick = (n) => {
    markRead(n.id);
    setNotifOpen(false);

    if (!onNavigate) return;

    const type = (n.type || "").toLowerCase();
    const text = [n.title || "", n.message || "", n.category || ""].join(" ").toLowerCase();

    // 1. Announcements -> Home popup
    if (type === "announcement" || text.includes("announcement")) {
      onNavigate("home", { announcementID: n.refNum });
      return;
    }

    // 2. Equipment requests / rentals -> Activity
    if (
      type.includes("equipment") ||
      text.includes("equipment") ||
      text.includes("rental") ||
      text.includes("chair") ||
      text.includes("tent")
    ) {
      onNavigate("activity", { tab: "equipment", refNum: n.refNum });
      return;
    }

    // 3. Documents / Clearance / Indigency -> Activity
    if (
      type.includes("document") ||
      text.includes("document") ||
      text.includes("clearance") ||
      text.includes("indigency") ||
      text.includes("certificate") ||
      text.includes("permit")
    ) {
      onNavigate("activity", { tab: "documents", refNum: n.refNum });
      return;
    }

    // 4. Facility reservations -> Activity
    if (
      type.includes("facility") ||
      text.includes("facility") ||
      text.includes("reservation") ||
      text.includes("court") ||
      text.includes("hall")
    ) {
      onNavigate("activity", { tab: "facilities", refNum: n.refNum });
      return;
    }

    // 5. Programs / Livelihood / Health
    if (
      type.includes("program") ||
      text.includes("program") ||
      text.includes("livelihood") ||
      text.includes("scholarship") ||
      text.includes("health")
    ) {
      onNavigate("services", { subTab: "programs", refNum: n.refNum });
      return;
    }

    // 6. Household / Profile
    if (text.includes("household") || text.includes("resident") || text.includes("member")) {
      onNavigate("profile");
      return;
    }

    // Default fallback
    onNavigate("activity");
  };

  const nav = (page) => { if (onNavigate) onNavigate(page); };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    nav("logout");
  };

  return (
    <>
      <div className="nb-root-spacer" />
      <div className="nb-root">

        {userOpen && (
          <div className="nb-backdrop" onClick={() => setUserOpen(false)} />
        )}

        {/* ── TOP BAR ── */}
        <div className="nb-topbar">
          <div className="nb-logo" onClick={() => nav("home")}>
            <img src={barangayLogo} alt="Logo" className="nb-logo-img" />
            <div>
              <div className="nb-logo-name">Barangay 3S+ Malanday</div>
              <span className="nb-logo-sub">Community Management System</span>
            </div>
          </div>

          <div className="nb-topbar-right">

            {/* BELL BUTTON */}
            <button
              className={`nb-icon-btn${notifOpen ? " active" : ""}`}
              onClick={() => {
                setNotifOpen(true);
                setUserOpen(false);
              }}
              title="Notifications"
            >
              <IconBell />
              {unreadCount > 0 && <span className="nb-notif-dot" />}
            </button>

            {/* USER ACCOUNT DROPDOWN */}
            <div className="nb-dropdown-wrap" ref={userRef}>
              <button
                className={`nb-icon-btn${userOpen ? " active" : ""}`}
                onClick={() => setUserOpen(v => !v)}
                title="Account"
              >
                <NavIconUser />
              </button>
              {userOpen && (
                <div className="nb-user-dropdown">
                  <div className="nb-user-info">
                    <div className="nb-user-info-name">{userName || "—"}</div>
                    <div className="nb-user-info-id">{householdID || "—"}</div>
                    <div className="nb-user-info-role">
                      {userRole === "Household Head" ? "⭐ Household Head" : 
                       userRole === "Branch Head" ? "⭐ Branch Head" : "👤 Member"}
                    </div>
                  </div>
                  <button className="nb-dd-item" onClick={() => { nav("profile"); setUserOpen(false); }}><IconProfile2 /> My Profile</button>
                  <div className="nb-dd-divider" />
                  <button
                    className="nb-dd-item danger"
                    onClick={() => {
                      setUserOpen(false);
                      setShowLogoutModal(true);
                    }}
                  >
                    <IconLogout /> Logout
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── BOTTOM NAV BAR ── */}
        <div className="nb-bottombar">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`nb-nav-item${item.emergency ? " emergency" : ""}${item.key === "scan" ? " nb-nav-item--scan" : ""}${activePage === item.key ? " active" : ""}`}
              onClick={() => nav(item.key)}
            >
              <item.icon />
              {item.label}
            </button>
          ))}
        </div>

        {/* ── NOTIFICATION POPUP MODAL ── */}
        <NotificationModal
          isOpen={notifOpen}
          onClose={() => setNotifOpen(false)}
          notifications={notifications}
          onNotificationClick={handleNotifClick}
          onMarkAllRead={clearAll}
          onDelete={handleDelete}
        />

        {/* ── LOGOUT MODAL ── */}
        {showLogoutModal && (
          <div
            className="nb-logout-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowLogoutModal(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
          >
            <div className="nb-logout-modal">
              <button
                type="button"
                className="nb-logout-modal-close"
                onClick={() => setShowLogoutModal(false)}
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <div className="nb-logout-modal-icon">
                <IconLogout />
              </div>
              <h3 id="logout-dialog-title" className="nb-logout-modal-title">Confirm Logout</h3>
              <p className="nb-logout-modal-desc">
                Are you sure you want to log out?
              </p>
              <div className="nb-logout-modal-actions">
                <button
                  type="button"
                  className="nb-logout-btn-cancel"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="nb-logout-btn-confirm"
                  onClick={handleLogoutConfirm}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}