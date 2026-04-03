import { useState, useEffect, useRef } from "react";
import barangayLogo from "./barangay-logo.jpg";
import { IconBell, NavIconUser, IconProfile2, IconSettings, IconHelp, IconLogout } from "../components/Icons";

const NOTIFICATIONS = [
  { id:1, icon:"📢", bg:"rgba(49,125,137,0.1)",  title:"Free Medical Mission",         desc:"Register now for the free medical mission on March 15.", time:"2 hours ago", unread:true },
  { id:2, icon:"🎓", bg:"rgba(232,160,32,0.1)",   title:"Scholarship Applications Open", desc:"Submit your applications before March 30.",               time:"Yesterday",  unread:true },
  { id:3, icon:"✅", bg:"rgba(13,122,85,0.1)",    title:"Clearance Ready",               desc:"Your barangay clearance is ready for pickup.",             time:"Feb 14",     unread:false },
  { id:4, icon:"🚨", bg:"rgba(224,62,62,0.1)",    title:"Barangay Clean-Up Drive",       desc:"Join the clean-up drive on March 10 at 7:00 AM.",          time:"Feb 10",     unread:false },
];

const NAV_ITEMS = [
  { key:"home",      label:"Home",      icon: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { key:"services",  label:"3S+",       icon: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { key:"scan",      label:"Scan",      icon: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></svg> },
  { key:"activity",  label:"Activity",  icon: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { key:"emergency", label:"Emergency", icon: ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, emergency:true },
];

export default function Navbar({ activePage = "home", onNavigate, hhId = "", userName = "", userRole = "member" }) {
  const [notifOpen, setNotifOpen]         = useState(false);
  const [userOpen, setUserOpen]           = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const notifRef  = useRef(null);
  const userRef   = useRef(null);

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
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

  const clearAll = () => setNotifications(n => n.map(x => ({ ...x, unread: false })));
  const markRead = (id) => setNotifications(n => n.map(x => x.id === id ? { ...x, unread: false } : x));
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
              onClick={() => { setNotifOpen(v => !v); setUserOpen(false); }}
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
                {notifications.map(n => (
                  <div key={n.id} className={`nb-notif-item${n.unread ? " unread" : ""}`} onClick={() => markRead(n.id)}>
                    <div className="nb-notif-icon" style={{ background: n.bg }}>{n.icon}</div>
                    <div className="nb-notif-body">
                      <div className="nb-notif-title">{n.title}</div>
                      <div className="nb-notif-desc">{n.desc}</div>
                      <div className="nb-notif-time">{n.time}</div>
                    </div>
                    {n.unread && <div className="nb-unread-dot" />}
                  </div>
                ))}
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
                  <div className="nb-user-info-id">{hhId || "—"}</div>
                  {}
                  <div className="nb-user-info-role">
                    {userRole === "head" ? "⭐ Household Head" : "👤 Member"}
                  </div>
                </div>
                <button className="nb-dd-item" onClick={() => { nav("profile"); setUserOpen(false); }}><IconProfile2 /> My Profile</button>
                <button className="nb-dd-item" onClick={() => { nav("settings"); setUserOpen(false); }}><IconSettings /> Settings</button>
                <button className="nb-dd-item" onClick={() => { nav("help"); setUserOpen(false); }}><IconHelp /> Help & Support</button>
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