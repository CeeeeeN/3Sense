import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminSignup from "./pages/AdminSignup";
import ApprovalPending from "./pages/AdminApprovalPending";
import AdminLogin from "./pages/adminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminManage from "./pages/AdminManage";
import AdminRequests from "./pages/AdminRequests";
import AdminFeedback from "./pages/AdminFeedback";
import AdminAdminManagement from "./pages/AdminAdminManagement";
import AdminHouseholdManagement from "./pages/AdminHouseholdManagement";
import AdminReports from "./pages/AdminReports";
import AdminProfile from "./pages/AdminProfile";

import UserApp from "./pages/UserApp";

function App() {
  return (
    <Router>
      <Routes>

        {/* Default page */}
       <Route path="/admin" element={<Navigate to="/admin/login" />} />
        
        {/* Auth pages */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/signup" element={<AdminSignup />} />
        <Route path="/admin/approval-pending" element={<ApprovalPending />} />

        {/* Main pages */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/manage" element={<AdminManage />} />
        <Route path="/admin/requests" element={<AdminRequests />} />
        <Route path="/admin/feedback" element={<AdminFeedback />} />
        <Route path="/admin/admin-management" element={<AdminAdminManagement />} />
        <Route path="/admin/household-management" element={<AdminHouseholdManagement />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/profile" element={<AdminProfile />} />

        <Route path="/*" element={<UserApp />} />

        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;