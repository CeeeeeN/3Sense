import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "../AdminStyle.css";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch
} from "firebase/firestore";

export default function AdminLayout({ children }) {
  const location = useLocation();

  const titles = {
    "/admin/dashboard": "Dashboard",
    "/admin/manage": "Manage",
    "/admin/requests": "Requests",
    "/admin/feedback": "Feedback",
    "/admin/admin-management": "Admin Management",
    "/admin/household-management": "Household Management",
    "/admin/reports": "Reports",
    "/admin/profile": "My Profile"
  };

  const topBarTitle = titles[location.pathname] || "Dashboard";

  const [isOpen, setIsOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  const [currentUserData, setCurrentUserData] = useState({
    fullName: "Loading...",
    position: "..."
  });

  // 🔥 REAL-TIME NOTIFICATIONS
  const [notifications, setNotifications] = useState([]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ─── FETCH USER DATA ─────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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

  // 🔥 REAL-TIME NOTIFICATION LISTENER
  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(data);
    });

    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔥 MARK SINGLE AS READ
  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), {
        isRead: true
      });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  // 🔥 MARK ALL AS READ (BATCH)
  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    const batch = writeBatch(db);

    unread.forEach(n => {
      batch.update(doc(db, "notifications", n.id), {
        isRead: true
      });
    });

    try {
      await batch.commit();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.href = "/admin/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="admin-layout">
      
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          style={{ position: "fixed", inset: 0, zIndex: 40, backgroundColor: "rgba(0,0,0,0.5)" }} 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div className={`left-panel ${isOpen ? "active" : ""}`} style={{ zIndex: 50 }}>
        <div className="left-logo">
          <img src="/icons/logo.png" className="logo-img" alt="Logo" />
          <div className="logo-text-group">
            <div className="admin-panel-label">Admin Panel</div>
            <div className="left-logo-text">Barangay 3S+ Malanday</div>
          </div>
        </div>

        <div className="nav-links">
          <Link onClick={handleLinkClick} className={location.pathname === "/admin/dashboard" ? "active" : ""} to="/admin/dashboard">Dashboard</Link>
          <Link onClick={handleLinkClick} className={location.pathname === "/admin/manage" ? "active" : ""} to="/admin/manage">Manage</Link>
          <Link onClick={handleLinkClick} className={location.pathname === "/admin/requests" ? "active" : ""} to="/admin/requests">Requests</Link>
          <Link onClick={handleLinkClick} className={location.pathname === "/admin/feedback" ? "active" : ""} to="/admin/feedback">Feedback</Link>

          <div className="nav-divider"></div>

          <Link onClick={handleLinkClick} className={location.pathname === "/admin/admin-management" ? "active" : ""} to="/admin/admin-management">Admin Management</Link>
          <Link onClick={handleLinkClick} className={location.pathname === "/admin/household-management" ? "active" : ""} to="/admin/household-management">Household Management</Link>
          <Link onClick={handleLinkClick} className={location.pathname === "/admin/reports" ? "active" : ""} to="/admin/reports">Reports</Link>
          <Link onClick={handleLinkClick} className={location.pathname === "/admin/profile" ? "active" : ""} to="/admin/profile">My Profile</Link>
        </div>

        <div className="sidebar-bottom">
          <a 
            href="#" 
            className="logout-link" 
            onClick={(e) => { e.preventDefault(); setShowLogoutModal(true); }}
            style={{ 
              display: "block", 
              width: "100%", 
              position: "relative", 
              zIndex: 10 
            }}
          >
            Logout
          </a>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">

        <div className="top-bar">
          <h1>{topBarTitle}</h1>

          <div className="top-actions">

            {/* 🔔 NOTIFICATIONS */}
            <div className="notif-wrapper" ref={notifRef}>
              <button className="bell-btn" onClick={() => setShowNotif(!showNotif)}>
                🔔
                {unreadCount > 0 && <span className="notif-dot"></span>}
              </button>

              {showNotif && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <div className="notif-title">
                      Notifications <span className="notif-count">{unreadCount}</span>
                    </div>
                    <button onClick={markAllAsRead}>Mark all read</button>
                  </div>

                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No notifications yet</div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`notif-item ${n.isRead ? "read" : ""}`}
                          onClick={() => !n.isRead && markAsRead(n.id)}
                        >
                          <div className="notif-icon">🔔</div>

                          <div className="notif-text">
                            <strong>{n.type?.replace("_", " ").toUpperCase()}</strong>
                            <p>{n.message}</p>
                            <span className="notif-time">
                              {n.createdAt?.toDate().toLocaleString()}
                            </span>
                          </div>

                          {!n.isRead && <span className="notif-dot"></span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="top-divider"></div>

            {/* PROFILE */}
            <div className="profile-wrapper">
              <p className="admin-name">{currentUserData.fullName}</p>
              <div className="dropdown-role">{currentUserData.position}</div>
            </div>

            {/* The hamburger button that was here has been removed! */}

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
  );
}