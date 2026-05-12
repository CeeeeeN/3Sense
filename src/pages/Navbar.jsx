import { useState, useEffect, useRef } from "react";
import barangayLogo from "./barangay-logo.jpg";
import { IconBell, NavIconUser, IconProfile2, IconSettings, IconHelp, IconLogout } from "../components/Icons";
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

const NOTIF_ICONS = {
  document_update: { icon: "📄", bg: "rgba(232,160,32,0.1)" },
  facility_update: { icon: "🏛️", bg: "rgba(49,125,137,0.1)" },
  program_reminder: { icon: "📢", bg: "rgba(13,122,85,0.1)" },
  announcement: { icon: "📣", bg: "rgba(49,125,137,0.12)" },
  general: { icon: "🔔", bg: "rgba(100,100,200,0.1)" },
};

function formatNotifTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Navbar({ activePage = "home", onNavigate, householdID = "", userName = "", userRole = "member", memberID = "", userID = "" }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
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
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Transaction notifications (document_update, facility_update, etc.)

  useEffect(() => {
    if (!householdID || !memberID) return;
    const unsub = subscribeToUserNotifications(householdID, memberID, setMemberNotifs);
    return () => unsub();
  }, [householdID, memberID]);

  // Announcement notifications — residentID="household" marks household-wide notifs
  useEffect(() => {
    if (!householdID) return;
    const unsub = subscribeToUserNotifications(householdID, "household", setHouseholdNotifs);
    return () => unsub();
  }, [householdID]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      document.body.style.overflow = (notifOpen || userOpen) ? "hidden" : "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [notifOpen, userOpen]);

  const clearAll = () => markAllNotificationsAsRead(notifications);
  const markRead = (id) => markNotificationAsRead(id);
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteUserNotification(id);
  };
  const handleNotifClick = (n) => {
    markRead(n.id);
    setNotifOpen(false);
    // Announcement notifications deep-link to the announcement popup
    if (n.type === "announcement" && n.refNum && onNavigate) {
      onNavigate("home", { announcementID: n.refNum });
    }
  };
  const nav = (page) => { if (onNavigate) onNavigate(page); };

  return (
    <>
      <div className="nb-root-spacer" />
      <div className="nb-root">

        {(notifOpen || userOpen) && (
          <div className="nb-backdrop" onClick={() => { setNotifOpen(false); setUserOpen(false); }} />
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

            {/* BELL */}
            <div className="nb-dropdown-wrap" ref={notifRef}>
              <button
                className={`nb-icon-btn${notifOpen ? " active" : ""}`}
                onClick={() => {
                  setNotifOpen(v => !v);
                  setUserOpen(false);
                  if (householdID && memberID) requestPushPermission(householdID, memberID);
                }}
                title="Notifications"
              >
                <IconBell />
                {unreadCount > 0 && <span className="nb-notif-dot" />}
              </button>
              {notifOpen && (
                <div className="nb-notif-dropdown">
                  <div className="nb-notif-head">
                    <h4>Notifications {unreadCount > 0 && <span className="nb-notif-count">{unreadCount}</span>}</h4>
                    {unreadCount > 0 && <button className="nb-notif-clear" onClick={clearAll}>Mark all read</button>}
                  </div>
                  <div className="nb-notif-body-wrap" style={{ maxHeight: "350px", overflowY: "auto" }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(n => {
                        const style = NOTIF_ICONS[n.type] || NOTIF_ICONS.general;
                        return (
                          <div key={n.id} className={`nb-notif-item${!n.isRead ? " unread" : ""}`} onClick={() => handleNotifClick(n)}>
                            <div className="nb-notif-icon" style={{ background: style.bg }}>{style.icon}</div>
                            <div className="nb-notif-body">
                              <div className="nb-notif-title">{n.title}</div>
                              <div className="nb-notif-desc">{n.message}</div>
                              <div className="nb-notif-time">{formatNotifTime(n.createdAt)}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                              {!n.isRead && <div className="nb-unread-dot" />}
                              <button
                                className="nb-notif-delete-btn"
                                title="Delete"
                                onClick={(e) => handleDelete(e, n.id)}
                                style={{
                                  background: "none", border: "none", cursor: "pointer",
                                  padding: "4px", borderRadius: "4px", color: "var(--muted)",
                                  fontSize: "0.7rem", lineHeight: 1, display: "flex",
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = "#e03e3e"}
                                onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* USER */}
            <div className="nb-dropdown-wrap" ref={userRef}>
              <button
                className={`nb-icon-btn${userOpen ? " active" : ""}`}
                onClick={() => { setUserOpen(v => !v); setNotifOpen(false); }}
                title="Account"
              >
                <NavIconUser />
              </button>
              {userOpen && (
                <div className="nb-user-dropdown">
                  <div className="nb-user-info">
                    <div className="nb-user-info-name">{userName || "—"}</div>
                    <div className="nb-user-info-id">{householdID || "—"}</div>
                    { }
                    <div className="nb-user-info-role">
                      {userRole === "Household Head" ? "⭐ Household Head" : 
                       userRole === "Branch Head" ? "⭐ Branch Head" : "👤 Member"}
                    </div>
                  </div>
                  <button className="nb-dd-item" onClick={() => { nav("profile"); setUserOpen(false); }}><IconProfile2 /> My Profile</button>
                  <div className="nb-dd-divider" />
                  <button className="nb-dd-item danger" onClick={() => nav("logout")}><IconLogout /> Logout</button>
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

      </div>
    </>
  );
}