import { useState, useRef, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import "../AdminStyle.css";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function AdminLayout({ children }) {
  const location = useLocation();

  const titles = {
    "/dashboard": "Dashboard",
    "/manage": "Manage",
    "/requests": "Requests",
    "/feedback": "Feedback",
    "/admin-management": "Admin Management",
    "/household-management": "Household Management",
    "/reports": "Reports",
    "/profile": "My Profile"
  };

  const topBarTitle = titles[location.pathname] || "Dashboard";

  const [isOpen, setIsOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef(null)

  const [currentUserData, setCurrentUserData] = useState({
    fullName: "Loading...",
    position: "..."
  });

  const [notifications, setNotifications] = useState([
    { id: 1, title: "New Household Registration", desc: "A resident has submitted a new household record.", time: "2 minutes ago", read: false },
    { id: 2, title: "New Document Request", desc: "A barangay document request needs approval.", time: "5 hours ago", read: false },
    { id: 3, title: "New Feedback Submitted", desc: "A resident submitted feedback.", time: "2 days ago", read: false },
    { id: 4, title: "New Household Registration", desc: "A resident has submitted a new household record.", time: "3 days ago", read: true }
  ])

  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Fetch logged-in user data from Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check approvedAdmins first
        const approvedQ = query(
          collection(db, "approvedAdmins"),
          where("uid", "==", user.uid)
        );
        const approvedSnapshot = await getDocs(approvedQ);

        if (!approvedSnapshot.empty) {
          const data = approvedSnapshot.docs[0].data();
          setCurrentUserData({
            fullName: data.fullName || "Admin",
            position: data.position || "Admin"
          });
          return;
        }

        // Fallback: check pendingAdmins
        const pendingQ = query(
          collection(db, "pendingAdmins"),
          where("uid", "==", user.uid)
        );
        const pendingSnapshot = await getDocs(pendingQ);

        if (!pendingSnapshot.empty) {
          const data = pendingSnapshot.docs[0].data();
          setCurrentUserData({
            fullName: data.fullName || "Admin",
            position: data.position || "Admin"
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.href = "/admin/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="admin-layout">
      <div className={`left-panel ${isOpen ? "active" : ""}`}>
        <div className="left-logo">
          <img src="/icons/logo.png" className="logo-img" />
          <div className="logo-text-group">
            <div className="admin-panel-label">Admin Panel</div>
            <div className="left-logo-text">Barangay 3S+ Malanday</div>
          </div>
        </div>

        <div className="nav-links">
          <Link className={location.pathname === "/dashboard" ? "active" : ""} to="/admin/dashboard">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M3 13h8V3H3v10zm10 8h8v-6h-8v6zM3 21h8v-6H3v6zm10-18v6h8V3h-8z" stroke="currentColor" strokeWidth="2" />
            </svg>
            Dashboard
          </Link>

          <Link className={location.pathname === "/manage" ? "active" : ""} to="/admin/manage">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            </svg>
            Manage
          </Link>

          <Link className={location.pathname === "/requests" ? "active" : ""} to="/admin/requests">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2" />
              <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" />
            </svg>
            Requests
          </Link>

          <Link className={location.pathname === "/feedback" ? "active" : ""} to="/admin/feedback">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" stroke="currentColor" strokeWidth="2" />
            </svg>
            Feedback
          </Link>

          <div className="nav-divider"></div>

          <Link className={location.pathname === "/admin-management" ? "active" : ""} to="/admin/admin-management">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M17 11c2.5 0 4 1.5 4 4v2h-6" stroke="currentColor" strokeWidth="2" />
              <path d="M2 21v-2c0-2.5 2-4 5-4s5 1.5 5 4v2" stroke="currentColor" strokeWidth="2" />
            </svg>
            Admin Management
          </Link>

          <Link className={location.pathname === "/household-management" ? "active" : ""} to="/admin/household-management">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M3 10l9-7 9 7" stroke="currentColor" strokeWidth="2" />
              <path d="M5 10v10h14V10" stroke="currentColor" strokeWidth="2" />
            </svg>
            Household Management
          </Link>

          <Link className={location.pathname === "/reports" ? "active" : ""} to="/admin/reports">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M4 19V5M10 19V9M16 19V13M22 19V3" stroke="currentColor" strokeWidth="2" />
            </svg>
            Reports
          </Link>

          <Link className={location.pathname === "/profile" ? "active" : ""} to="/admin/profile">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
            </svg>
            My Profile
          </Link>
        </div>

        <div className="sidebar-bottom">
          <a href="#" className="logout-link" onClick={(e) => { e.preventDefault(); setShowLogoutModal(true); }}>
            <svg viewBox="0 0 24 24" fill="none" className="logout-icon">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="white" strokeWidth="2" />
              <path d="M16 17l5-5-5-5M21 12H9" stroke="white" strokeWidth="2" />
            </svg>
            Logout
          </a>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <button className="burger-menu" onClick={() => setIsOpen(!isOpen)}>☰</button>

        <div className="top-bar">
          <h1>{topBarTitle}</h1>
          <div className="top-actions">

            {/* NOTIFICATIONS */}
            <div className="notif-wrapper" ref={notifRef}>
              <button className="bell-btn" onClick={() => setShowNotif(!showNotif)}>
                <svg className="bell-btn2" viewBox="0 0 24 24" fill="none">
                  <path d="M15 17h5l-1.5-1.5A2 2 0 0 1 18 14V10a6 6 0 1 0-12 0v4a2 2 0 0 1-.5 1.5L4 17h5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 17a3 3 0 0 0 6 0" stroke="white" strokeWidth="2" />
                </svg>
                {notifications.some(n => !n.read) && <span className="notif-dot"></span>}
              </button>

              {showNotif && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <div className="notif-title">
                      Notifications <span className="notif-count">{notifications.filter(n => !n.read).length}</span>
                    </div>
                    <button onClick={markAllAsRead}>Mark all read</button>
                  </div>
                  <div className="notif-list">
                    {notifications.map(n => (
                      <div key={n.id} className={`notif-item ${n.read ? "read" : ""}`}>
                        <div className="notif-icon">🔔</div>
                        <div className="notif-text">
                          <strong>{n.title}</strong>
                          <p>{n.desc}</p>
                          <span className="notif-time">{n.time}</span>
                        </div>
                        {!n.read && <span className="notif-dot"></span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="top-divider"></div>

            {/* PROFILE — shows fullName and position from Firestore */}
            <div className="profile-wrapper">
              <p className="admin-name">{currentUserData.fullName}</p>
              <div className="dropdown-role">{currentUserData.position}</div>
            </div>

          </div>
        </div>

        {/* MAIN CONTENT */}
        {children}

        {/* LOGOUT MODAL */}
        {showLogoutModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3 className="modal-title">Confirm Logout</h3>
              <div className="btn-group modal-actions">
                <button className="reject-btn" onClick={handleLogout}>Logout</button>
                <button className="approve-btn" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}