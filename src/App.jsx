import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase/firebase";

import { ROLE_PERMISSIONS } from "./services/permissions";

import AdminSignup from "./pages/AdminSignup";
import ApprovalPending from "./pages/AdminApprovalPending";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminManage from "./pages/AdminManage";
import AdminRequests from "./pages/AdminRequests";
import AdminFeedback from "./pages/AdminFeedback";
import AdminAdminManagement from "./pages/AdminAdminManagement";
import AdminHouseholdManagement from "./pages/AdminHouseholdManagement";
import AdminReports from "./pages/AdminReports";
import AdminProfile from "./pages/AdminProfile";
import UserApp from "./pages/UserApp";

// ================================================================
// 🔒 PROTECTED ROUTE (NOW WITH RBAC!)
// Blocks access if:
// - Not logged in
// - Logged in but NOT in approvedAdmins collection
// - Approved, but ROLE doesn't allow access to this specific page
// ================================================================
function ProtectedRoute({ user, isApprovedAdmin, userRole, reqPath, loading, children }) {
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "1.2rem", color: "#555" }}>
        Loading...
      </div>
    );
  }

  // ❌ Not logged in OR not an approved admin → send to login
  if (!user || !isApprovedAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  // 👑 Super Admin Bypass: Automatically allow access to everything
  if (userRole === "Super Admin") {
    return children;
  }

  // 🛡️ Role Check: Look up their allowed pages in the dictionary
  const allowedPages = ROLE_PERMISSIONS[userRole]?.pages || [];
  
  // ❌ If they are trying to access a page not in their list, bounce them to the dashboard
  if (!allowedPages.includes(reqPath)) {
    console.warn(`Access Denied: ${userRole} attempted to access ${reqPath}`);
    return <Navigate to="/admin/dashboard" replace />;
  }

  // ✅ Approved admin with correct role → show the page
  return children;
}

// ================================================================
// 🔓 PUBLIC ROUTE
// ================================================================
function PublicRoute({ user, isApprovedAdmin, loading, children }) {
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "1.2rem", color: "#555" }}>
        Loading...
      </div>
    );
  }

  // ✅ Already logged in as approved admin → go to dashboard
  if (user && isApprovedAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // ❌ Not approved → show login/signup
  return children;
}

// ================================================================
// 🏠 MAIN APP
// ================================================================
function App() {
  const [user, setUser] = useState(null);
  const [isApprovedAdmin, setIsApprovedAdmin] = useState(false);
  // --- ADDED: Track the user's role globally ---
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // 🔒 Check if this user is in approvedAdmins collection
        try {
          const q = query(
            collection(db, "approvedAdmins"),
            where("uid", "==", firebaseUser.uid)
          );
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            // ✅ They are an approved admin
            setIsApprovedAdmin(true);
            
            // --- ADDED: Extract their role from the database ---
            const adminData = snapshot.docs[0].data();
            setUserRole(adminData.role || "Standard Admin"); 

          } else {
            // ❌ Not an approved admin
            setIsApprovedAdmin(false);
            setUserRole(null);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsApprovedAdmin(false);
          setUserRole(null);
        }

      } else {
        // No user logged in
        setUser(null);
        setIsApprovedAdmin(false);
        setUserRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>

        {/* Default redirect */}
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/admin/login" element={
          <PublicRoute user={user} isApprovedAdmin={isApprovedAdmin} loading={loading}>
            <AdminLogin />
          </PublicRoute>
        } />

        <Route path="/admin/signup" element={
          <PublicRoute user={user} isApprovedAdmin={isApprovedAdmin} loading={loading}>
            <AdminSignup />
          </PublicRoute>
        } />

        {/* Approval pending — always accessible */}
        <Route path="/admin/approval-pending" element={<ApprovalPending />} />

        {/* ===== PROTECTED ROUTES (Now passing userRole and reqPath) ===== */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute user={user} isApprovedAdmin={isApprovedAdmin} userRole={userRole} reqPath="/admin/dashboard" loading={loading}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin/manage" element={
          <ProtectedRoute user={user} isApprovedAdmin={isApprovedAdmin} userRole={userRole} reqPath="/admin/manage" loading={loading}>
            <AdminManage />
          </ProtectedRoute>
        } />

        <Route path="/admin/requests" element={
          <ProtectedRoute user={user} isApprovedAdmin={isApprovedAdmin} userRole={userRole} reqPath="/admin/requests" loading={loading}>
            <AdminRequests />
          </ProtectedRoute>
        } />

        <Route path="/admin/feedback" element={
          <ProtectedRoute user={user} isApprovedAdmin={isApprovedAdmin} userRole={userRole} reqPath="/admin/feedback" loading={loading}>
            <AdminFeedback />
          </ProtectedRoute>
        } />

        <Route path="/admin/admin-management" element={
          <ProtectedRoute user={user} isApprovedAdmin={isApprovedAdmin} userRole={userRole} reqPath="/admin/admin-management" loading={loading}>
            <AdminAdminManagement />
          </ProtectedRoute>
        } />

        <Route path="/admin/household-management" element={
          <ProtectedRoute user={user} isApprovedAdmin={isApprovedAdmin} userRole={userRole} reqPath="/admin/household-management" loading={loading}>
            <AdminHouseholdManagement />
          </ProtectedRoute>
        } />

        <Route path="/admin/reports" element={
          <ProtectedRoute user={user} isApprovedAdmin={isApprovedAdmin} userRole={userRole} reqPath="/admin/reports" loading={loading}>
            <AdminReports />
          </ProtectedRoute>
        } />

        <Route path="/admin/profile" element={
          <ProtectedRoute user={user} isApprovedAdmin={isApprovedAdmin} userRole={userRole} reqPath="/admin/profile" loading={loading}>
            <AdminProfile />
          </ProtectedRoute>
        } />

        {/* User side */}
        <Route path="/*" element={<UserApp />} />

        {/* 404 */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />

      </Routes>
    </Router>
  );
}

export default App;