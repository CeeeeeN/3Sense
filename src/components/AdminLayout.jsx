import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../AdminStyle.css";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ROLE_PERMISSIONS } from "../services/permissions";
import NotificationModal from "./NotificationModal";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const titles = {
    "/admin/dashboard": "Dashboard",
    "/admin/manage": "Manage",
    "/admin/requests": "Requests",
    "/admin/feedback": "Feedback",
    "/admin/admin-management": "Admin Management",
    "/admin/household-management": "Household Management",
    "/admin/logs": "Audit Logs",
    "/admin/reports": "Reports",
    "/admin/profile": "My Profile",
  };

  const topBarTitle = titles[location.pathname] || "Dashboard";

  const [isOpen, setIsOpen] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);

  const [currentUserData, setCurrentUserData] = useState({
    fullName: "Loading...",
    position: "...",
    role: "Standard Admin",
  });

  const [notifications, setNotifications] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ─── 1. FETCH AUTH & USER PROFILE ────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const approvedQ = query(
            collection(db, "approvedAdmins"),
            where("uid", "==", user.uid)
          );
          const approvedSnapshot = await getDocs(approvedQ);

          if (!approvedSnapshot.empty) {
            const data = approvedSnapshot.docs[0].data();
            setCurrentUserData({
              fullName: data.fullName || data.username || "Admin",
              position: data.position || "Admin",
              role: data.role || data.position || "Standard Admin",
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
              fullName: data.fullName || data.username || "Admin",
              position: data.position || "Admin",
              role: data.role || data.position || "Standard Admin",
            });
          }
        } catch (error) {
          console.error("Error fetching admin profile:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ─── 2. REAL-TIME NOTIFICATION LISTENER ────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setNotifications(data);
      },
      (error) => {
        console.error("Notifications listener error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // ─── 3. PRIORITIZED ROLE-BASED NOTIFICATION FILTER ────────────
  const filteredNotifications = useMemo(() => {
    const cleanRole = (currentUserData.role || "").toLowerCase().replace(/[\s&_-]/g, "");
    const cleanPos  = (currentUserData.position || "").toLowerCase().replace(/[\s&_-]/g, "");

    const isSuperAdmin =
      cleanRole.includes("superadmin") ||
      cleanPos.includes("servicehead") ||
      cleanRole.includes("servicehead");

    if (isSuperAdmin) return notifications;

    return notifications.filter((n) => {
      const tag = [
        n.type || "",
        n.title || "",
        n.category || "",
        n.message || "",
      ]
        .join(" ")
        .toLowerCase();

      if (tag.includes("new admin") || tag.includes("admin registration") || tag.includes("admin_registration")) {
        return false;
      }
      if (tag.includes("bswd") || tag.includes("displacement") || tag.includes("homeless") || tag.includes("tip")) {
        return cleanRole.includes("bswd") || cleanPos.includes("bswd");
      }
      if (
        tag.includes("incident") ||
        tag.includes("blotter") ||
        tag.includes("tanod") ||
        tag.includes("peace") ||
        tag.includes("altercation") ||
        tag.includes("dispute") ||
        tag.includes("vandalism")
      ) {
        return cleanRole.includes("peaceorder") || cleanPos.includes("peaceorder");
      }
      if (tag.includes("vawc") || tag.includes("violence against women")) {
        return cleanRole.includes("vawc") || cleanPos.includes("vawc");
      }
      if (tag.includes("bosca") || tag.includes("senior citizen")) {
        return cleanRole.includes("bosca") || cleanPos.includes("bosca");
      }
      if (tag.includes("badac") || tag.includes("drug")) {
        return cleanRole.includes("badac") || cleanPos.includes("badac");
      }
      if (tag.includes("livelihood") || tag.includes("skills training") || tag.includes("program")) {
        return (
          cleanRole.includes("livelihood") ||
          cleanPos.includes("livelihood") ||
          cleanRole.includes("secretary") ||
          cleanRole.includes("standardadmin")
        );
      }
      if (
        tag.includes("document") ||
        tag.includes("facility") ||
        tag.includes("equipment") ||
        tag.includes("reservation") ||
        tag.includes("rental")
      ) {
        return cleanRole.includes("secretary") || cleanRole.includes("standardadmin");
      }
      if (tag.includes("household") || tag.includes("resident")) {
        return cleanRole.includes("secretary") || cleanRole.includes("standardadmin");
      }
      if (tag.includes("feedback") || tag.includes("sentiment") || tag.includes("rating")) {
        return cleanRole.includes("secretary") || cleanRole.includes("standardadmin");
      }

      return cleanRole.includes("secretary") || cleanRole.includes("standardadmin");
    });
  }, [notifications, currentUserData]);

  // ─── 4. MARK AS READ & DELETE ─────────────────────────────────
  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { isRead: true });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    const unread = filteredNotifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, "notifications", n.id), { isRead: true });
    });

    try {
      await batch.commit();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const deleteAdminNotification = async (id) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const unreadCount = filteredNotifications.filter((n) => !n.isRead).length;

  // ─── 5. CLICKABLE ROUTING ─────────────────────────────────────
  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await markAsRead(n.id);
    }
    setShowNotifModal(false);

    const tag = [
      n.type || "",
      n.title || "",
      n.category || "",
      n.message || "",
      n.link || "",
    ]
      .join(" ")
      .toLowerCase();

    if (tag.includes("new admin") || tag.includes("admin registration") || tag.includes("admin_registration")) {
      navigate("/admin/admin-management");
    } else if (
      tag.includes("bswd") ||
      tag.includes("displacement") ||
      tag.includes("homeless") ||
      tag.includes("incident") ||
      tag.includes("blotter") ||
      tag.includes("tanod") ||
      tag.includes("peace") ||
      tag.includes("vawc") ||
      tag.includes("bosca") ||
      tag.includes("badac") ||
      tag.includes("livelihood") ||
      tag.includes("program") ||
      tag.includes("manage")
    ) {
      navigate("/admin/manage");
    } else if (
      tag.includes("document") ||
      tag.includes("facility") ||
      tag.includes("equipment") ||
      tag.includes("reservation") ||
      tag.includes("rental")
    ) {
      navigate("/admin/requests");
    } else if (tag.includes("household") || tag.includes("resident")) {
      navigate("/admin/household-management");
    } else if (tag.includes("feedback") || tag.includes("sentiment")) {
      navigate("/admin/feedback");
    } else if (tag.includes("log") || tag.includes("audit")) {
      navigate("/admin/logs");
    } else if (tag.includes("report") || tag.includes("rbi")) {
      navigate("/admin/reports");
    } else {
      navigate("/admin/dashboard");
    }
  };

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

  useEffect(() => {
    if (showLogoutModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLogoutModal]);

  const userPages = ROLE_PERMISSIONS[currentUserData.role]?.pages || [
    "/admin/dashboard",
    "/admin/manage",
    "/admin/requests",
    "/admin/feedback",
    "/admin/profile"
  ];

  return (
    <div className="admin-layout">
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`left-panel ${isOpen ? "active" : ""}`}
        style={{ zIndex: 50 }}
      >
        <div className="left-logo">
          <img src="/icons/logo.png" className="logo-img" alt="Logo" />
          <div className="logo-text-group">
            <div className="admin-panel-label">Admin Panel</div>
            <div className="left-logo-text">Barangay 3S+ Malanday</div>
          </div>
        </div>

        <div className="nav-links">
          {userPages.includes("/admin/dashboard") && (
            <Link
              onClick={handleLinkClick}
              className={location.pathname === "/admin/dashboard" ? "active" : ""}
              to="/admin/dashboard"
            >
              Dashboard
            </Link>
          )}

          {userPages.includes("/admin/manage") && (
            <Link
              onClick={handleLinkClick}
              className={location.pathname === "/admin/manage" ? "active" : ""}
              to="/admin/manage"
            >
              Manage
            </Link>
          )}

          {userPages.includes("/admin/requests") && (
            <Link
              onClick={handleLinkClick}
              className={location.pathname === "/admin/requests" ? "active" : ""}
              to="/admin/requests"
            >
              Requests
            </Link>
          )}

          {userPages.includes("/admin/feedback") && (
            <Link
              onClick={handleLinkClick}
              className={location.pathname === "/admin/feedback" ? "active" : ""}
              to="/admin/feedback"
            >
              Feedback
            </Link>
          )}

          <div className="nav-divider"></div>

          {userPages.includes("/admin/admin-management") && (
            <Link
              onClick={handleLinkClick}
              className={location.pathname === "/admin/admin-management" ? "active" : ""}
              to="/admin/admin-management"
            >
              Admin Management
            </Link>
          )}

          {userPages.includes("/admin/household-management") && (
            <Link
              onClick={handleLinkClick}
              className={location.pathname === "/admin/household-management" ? "active" : ""}
              to="/admin/household-management"
            >
              Household Management
            </Link>
          )}

          {userPages.includes("/admin/logs") && (
            <Link
              onClick={handleLinkClick}
              className={location.pathname === "/admin/logs" ? "active" : ""}
              to="/admin/logs"
            >
              Audit Logs
            </Link>
          )}

          {userPages.includes("/admin/reports") && (
            <Link
              onClick={handleLinkClick}
              className={location.pathname === "/admin/reports" ? "active" : ""}
              to="/admin/reports"
            >
              Reports
            </Link>
          )}

          {userPages.includes("/admin/profile") && (
            <Link
              onClick={handleLinkClick}
              className={location.pathname === "/admin/profile" ? "active" : ""}
              to="/admin/profile"
            >
              My Profile
            </Link>
          )}
        </div>

        <div className="sidebar-bottom">
          <a
            href="#"
            className="logout-link"
            onClick={(e) => {
              e.preventDefault();
              setShowLogoutModal(true);
            }}
            style={{
              display: "block",
              width: "100%",
              position: "relative",
              zIndex: 10,
            }}
          >
            Logout
          </a>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <div className="top-bar">
          <button
            className="burger-menu"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            ☰
          </button>
          <h1>{topBarTitle}</h1>

          <div className="top-actions">
            {/* NOTIFICATIONS BELL BUTTON */}
            <button
              className="bell-btn"
              onClick={() => setShowNotifModal(true)}
              title="Notifications"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>

              {unreadCount > 0 && <span className="notif-dot"></span>}
            </button>

            <div className="top-divider"></div>

            {/* PROFILE DISPLAY */}
            <div className="profile-wrapper">
              <p className="admin-name">{currentUserData.fullName}</p>
              <div className="dropdown-role">{currentUserData.role || currentUserData.position}</div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        {children}
      </div>

      {/* CENTERED NOTIFICATION MODAL */}
      <NotificationModal
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        notifications={filteredNotifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={markAllAsRead}
        onDelete={deleteAdminNotification}
      />

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                border: "none",
                background: "#f1f5f9",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="modal-title">Confirm Logout</h3>
            <p
              style={{
                textAlign: "center",
                color: "#5e7a99",
                fontSize: "0.9rem",
                margin: "0 0 1.25rem 0",
              }}
            >
              Are you sure you want to log out?
            </p>
            <div className="btn-group modal-actions">
              <button
                type="button"
                className="approve-btn"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reject-btn"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}