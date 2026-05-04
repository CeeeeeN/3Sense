import { useState, useEffect } from "react";
import "../AdminStyle.css";
import AdminLayout from "../components/AdminLayout";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../services/logger";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { Search } from "lucide-react";

export default function AdminManagement() {
  // ================= STATE =================
  const [currentUser, setCurrentUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // For logging purposes
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  const [admins, setAdmins] = useState([]);
  const [requests, setRequests] = useState([]);

  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [viewMode, setViewMode] = useState("default");

  const [searchAdmin, setSearchAdmin] = useState("");
  const [searchRequest, setSearchRequest] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [editedRole, setEditedRole] = useState("Standard Admin");

  const [requestPage, setRequestPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const [requestRowsPerPage, setRequestRowsPerPage] = useState(10);
  const [adminRowsPerPage, setAdminRowsPerPage] = useState(10);

  const defaultRows = 3;

  useEffect(() => {
    // Listen for the currently logged-in user
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Find their document in the approvedAdmins collection
        const q = query(
          collection(db, "approvedAdmins"),
          where("uid", "==", user.uid)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setAdminName(data.fullName || "Admin");
          setAdminRole(data.role || "Standard Admin");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ================= STEP 1: CHECK IF SERVICE HEAD =================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);

        // Check pendingAdmins first
        const pendingQ = query(
          collection(db, "pendingAdmins"),
          where("uid", "==", user.uid),
        );
        const pendingSnapshot = await getDocs(pendingQ);

        if (!pendingSnapshot.empty) {
          const userData = pendingSnapshot.docs[0].data();
          if (
            userData.position === "Service Head" ||
            userData.role === "Super admin" ||
            userData.role === "Super Admin"
          ) {
            setIsSuperAdmin(true);
          }
        }

        // Also check approvedAdmins
        const approvedQ = query(
          collection(db, "approvedAdmins"),
          where("uid", "==", user.uid),
        );
        const approvedSnapshot = await getDocs(approvedQ);

        if (!approvedSnapshot.empty) {
          const userData = approvedSnapshot.docs[0].data();
          if (
            userData.position === "Service Head" ||
            userData.role === "Super admin" ||
            userData.role === "Super Admin"
          ) {
            setIsSuperAdmin(true);
          }
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ================= STEP 2: FETCH DATA FROM FIRESTORE =================
  useEffect(() => {
    if (!isSuperAdmin) return;

    const unsubRequests = onSnapshot(
      collection(db, "pendingAdmins"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          docId: doc.id,
          ...doc.data(),
          dateSubmitted:
            doc.data().createdAt?.toDate().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }) || "N/A",
        }));
        setRequests(data);
      },
    );

    const unsubAdmins = onSnapshot(
      collection(db, "approvedAdmins"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          docId: doc.id,
          ...doc.data(),
        }));
        setAdmins(data);
      },
    );

    return () => {
      unsubRequests();
      unsubAdmins();
    };
  }, [isSuperAdmin]);

  // ================= STEP 3: APPROVE =================
  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await addDoc(collection(db, "approvedAdmins"), {
        uid: selectedRequest.uid,
        fullName: selectedRequest.fullName,
        email: selectedRequest.email,
        contact: selectedRequest.contact,
        position: selectedRequest.position,
        role: "Standard Admin",
        username: selectedRequest.username,
        approvedAt: new Date(),
      });

      await updateDoc(doc(db, "pendingAdmins", selectedRequest.docId), {
        status: "approved",
      });

      logTransaction(
        adminName,
        adminRole,
        "Approved Admin Request",
        `Approved admin registration for ${selectedRequest.fullName} (${selectedRequest.email}) (ID: ${selectedRequest.uid})`
      );

      setSelectedRequest(null);
      setShowApproveModal(false);
    } catch (error) {
      console.error("Error approving admin:", error);
      logTransaction(
        adminName,
        adminRole,
        "Failed to Approve Admin",
        `Failed to approve admin registration for ${selectedRequest.fullName} (${selectedRequest.email}) (ID: ${selectedRequest.uid}). Error: ${error.message}`
      );
      alert("Failed to approve admin. Please try again.");
    }
  };

  // ================= STEP 4: REJECT =================
  const confirmReject = async () => {
    if (!selectedRequest) return;

    try {
      await updateDoc(doc(db, "pendingAdmins", selectedRequest.docId), {
        status: "rejected",
      });

      logTransaction(
        adminName,
        adminRole,
        "Rejected Admin Request",
        `Rejected admin registration for ${selectedRequest.fullName} (${selectedRequest.email}) (ID: ${selectedRequest.uid})`
      );

      setSelectedRequest(null);
      setShowRejectModal(false);
    } catch (error) {
      console.error("Error rejecting admin:", error);
      logTransaction(
        adminName,
        adminRole,
        "Failed to Reject Admin",
        `Failed to reject admin registration for ${selectedRequest.fullName} (${selectedRequest.email}) (ID: ${selectedRequest.uid}). Error: ${error.message}`
      );
      alert("Failed to reject admin. Please try again.");
    }
  };

  // ================= STEP 5: DELETE APPROVED ADMIN =================
  const confirmDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      await deleteDoc(doc(db, "approvedAdmins", selectedAdmin.docId));

      logTransaction(
        adminName,
        adminRole,
        "Deleted Admin Account",
        `Deleted admin account of ${selectedAdmin.fullName} (${selectedAdmin.email}) (ID: ${selectedAdmin.uid})`
      );

      setSelectedAdmin(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting admin:", error);
      logTransaction(
        adminName,
        adminRole,
        "Failed to Delete Admin Account",
        `Failed to delete admin account of ${selectedAdmin.fullName} (${selectedAdmin.email}) (ID: ${selectedAdmin.uid}). Error: ${error.message}`
      );
      alert("Failed to delete admin. Please try again.");
    }
  };

  // ================= STEP 6: UPDATE ROLE =================
  const handleSaveRole = async () => {
    if (!selectedAdmin) return;

    try {
      await updateDoc(doc(db, "approvedAdmins", selectedAdmin.docId), {
        role: editedRole,
      });

      logTransaction(
        adminName,
        adminRole,
        "Updated Admin Role",
        `Updated system role of ${selectedAdmin.fullName} (${selectedAdmin.email}) (ID: ${selectedAdmin.uid}) to ${editedRole}`
      );

      setSelectedAdmin(null);
      setShowViewModal(false);
      alert("Admin system role updated successfully!");
    } catch (error) {
      console.error("Error updating role:", error);
      logTransaction(
        adminName,
        adminRole,
        "Failed to Update Admin Role",
        `Failed to update system role of ${selectedAdmin.fullName} (${selectedAdmin.email}) (ID: ${selectedAdmin.uid}) to ${editedRole}. Error: ${error.message}`
      );
      alert("Failed to update role. Please try again.");
    }
  };

  // ================= FILTERED DATA =================
  const filteredAdmins = admins
    .filter((admin) => {
      return admin.fullName?.toLowerCase().includes(searchAdmin.toLowerCase());
    })
    .slice()
    .reverse();

  const filteredRequests = requests
    .filter((req) => {
      const searchText = searchRequest.toLowerCase();
      const matchesSearch =
        req.fullName?.toLowerCase().includes(searchText) ||
        req.email?.toLowerCase().includes(searchText) ||
        req.username?.toLowerCase().includes(searchText);
      const matchesStatus =
        filterStatus === "All" || req.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return 0;
    });

  const totalRequestPages = Math.ceil(filteredRequests.length / requestRowsPerPage);
  const requestStartIndex = (requestPage - 1) * requestRowsPerPage;

  const paginatedRequests =
    viewMode === "default"
      ? filteredRequests.slice(0, defaultRows)
      : filteredRequests.slice(
        requestStartIndex,
        requestStartIndex + requestRowsPerPage
      );

  const totalAdminPages = Math.ceil(filteredAdmins.length / adminRowsPerPage);
  const adminStartIndex = (adminPage - 1) * adminRowsPerPage;

  const paginatedAdmins =
    viewMode === "default"
      ? filteredAdmins.slice(0, defaultRows)
      : filteredAdmins.slice(
        adminStartIndex,
        adminStartIndex + adminRowsPerPage
      );

  useEffect(() => {
    setRequestPage(1);
  }, [searchRequest, filterStatus, requestRowsPerPage]);

  useEffect(() => {
    setAdminPage(1);
  }, [searchAdmin, adminRowsPerPage]);

  useEffect(() => {
    if (viewMode === "default") {
      setRequestPage(1);
      setAdminPage(1);
    }
  }, [viewMode]);

  const renderPageNumbers = (currentPage, totalPages, setPage) => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }

    return pages.map((page, index) => (
      <button
        key={index}
        className={`af-page-btn ${currentPage === page ? "active" : ""}`}
        onClick={() => typeof page === "number" ? setPage(page) : null}
        disabled={typeof page !== "number"}
        style={{
          cursor: typeof page === "number" ? "pointer" : "default",
          border: typeof page !== "number" ? "none" : "",
          background: typeof page !== "number" ? "transparent" : ""
        }}
      >
        {page}
      </button>
    ));
  };

  // ================= LOADING =================
  if (authLoading) {
    return (
      <AdminLayout>
        <div
          style={{ textAlign: "center", padding: "60px", fontSize: "1.2rem" }}
        >
          Loading...
        </div>
      </AdminLayout>
    );
  }

  // ================= ACCESS GUARD =================
  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div style={{ textAlign: "center", padding: "60px" }}>
          <h2 style={{ color: "#d9534f", marginTop: "16px" }}>Access Denied</h2>
          <p style={{ color: "#666", marginTop: "8px" }}>
            Only Service Heads can access this page.
          </p>
        </div>
      </AdminLayout>
    );
  }

  // ================= RENDER =================
  return (
    <AdminLayout>
      <div className="main-content">
        {/* ================= REGISTRATION REQUESTS ================= */}
        {(viewMode === "default" || viewMode === "requests") && (
          <div className="section">
            <div className="section-header">
              <div>
                <h2 className="requests-title">
                  Admin Registration Requests
                </h2>
                <p className="af-subtitle">Pending approval (
                  {filteredRequests.filter((r) => r.status === "pending").length})</p>
              </div>

              {viewMode === "default" ? (
                <button
                  className="view-btn"
                  onClick={() => setViewMode("requests")}
                >
                  See All Requests
                </button>
              ) : (
                <button
                  className="view-btn"
                  onClick={() => setViewMode("default")}
                >
                  Return
                </button>
              )}
            </div>
            <div className="requests-controls">
              <div className="search-wrapper" style={{ position: "relative" }}>
                <Search
                  size={18}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                    pointerEvents: "none",
                  }}
                />

                <input
                  type="text"
                  placeholder="Search admin..."
                  className="search-input"
                  value={searchAdmin}
                  onChange={(e) => setSearchAdmin(e.target.value)}
                  style={{ paddingLeft: "36px" }} // important so text doesn't overlap icon
                />
              </div>

              <div className="filter-group">
                <select
                  className="filter-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="req-table-wrapper">
              <table className="req-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Contact</th>
                    <th>Position</th>
                    <th>Username</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.length > 0 ? (
                    paginatedRequests.map((req) => (
                      <tr key={req.docId}>
                        <td>{req.fullName}</td>
                        <td>{req.email}</td>
                        <td>{req.contact}</td>
                        <td>{req.position}</td>
                        <td>{req.username}</td>
                        <td>{req.dateSubmitted}</td>
                        <td>
                          <span
                            className={`status-badge status-${req.status?.toLowerCase()}`}
                          >
                            {req.status?.charAt(0).toUpperCase() +
                              req.status?.slice(1)}
                          </span>
                        </td>
                        <td>
                          {req.status === "pending" ? (
                            <div className="btn-group">
                              <button
                                className="approve-btn"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowApproveModal(true);
                                }}
                              >
                                Approve
                              </button>
                              <button
                                className="reject-btn"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setShowRejectModal(true);
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="action-disabled">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        style={{ textAlign: "center", padding: "16px" }}
                      >
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {viewMode === "requests" && filteredRequests.length > 0 && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 24px",
                  borderTop: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  flexWrap: "wrap",
                  gap: "16px"
                }}>

                  {/* Rows per page */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                    <span>Rows per page:</span>
                    <select
                      value={requestRowsPerPage}
                      onChange={(e) => setRequestRowsPerPage(Number(e.target.value))}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: 'white',
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  {/* Pagination buttons */}
                  {totalRequestPages > 1 && (
                    <div className="af-pagination" style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="af-page-btn"
                        onClick={() => setRequestPage(prev => Math.max(prev - 1, 1))}
                        disabled={requestPage === 1}
                      >
                        Previous
                      </button>

                      {renderPageNumbers(requestPage, totalRequestPages, setRequestPage)}

                      <button
                        className="af-page-btn"
                        onClick={() => setRequestPage(prev => Math.min(prev + 1, totalRequestPages))}
                        disabled={requestPage === totalRequestPages}
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {/* Showing text */}
                  <div style={{ fontSize: "0.85rem" }}>
                    Showing {requestStartIndex + 1} to{" "}
                    {Math.min(requestStartIndex + requestRowsPerPage, filteredRequests.length)} of{" "}
                    {filteredRequests.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= ADMIN ACCOUNT MANAGEMENT ================= */}
        {(viewMode === "default" || viewMode === "admins") && (
          <div className="section">
            <div className="section-header">
              <h2 className="requests-title"> Admin Account Management</h2>
              {viewMode === "default" ? (
                <button
                  className="view-btn"
                  onClick={() => setViewMode("admins")}
                >
                  See All Admins
                </button>
              ) : (
                <button
                  className="view-btn"
                  onClick={() => setViewMode("default")}
                >
                  Return
                </button>
              )}
            </div>
            <div className="requests-controls">
              <div className="search-wrapper" style={{ position: "relative" }}>
                <Search
                  size={18}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                    pointerEvents: "none",
                  }}
                />

                <input
                  type="text"
                  placeholder="Search requests..."
                  className="search-input"
                  value={searchRequest}
                  onChange={(e) => setSearchRequest(e.target.value)}
                  style={{ paddingLeft: "36px" }}
                />
              </div>
            </div>
            <div className="req-table-wrapper">
              <table className="req-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Position</th>
                    <th>More Details</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAdmins.length > 0 ? (
                    paginatedAdmins.map((admin) => (
                      <tr key={admin.docId}>
                        <td>{admin.fullName}</td>
                        <td>{admin.username}</td>
                        <td>{admin.position}</td>
                        <td>
                          <button
                            className="view-btn"
                            onClick={() => {
                              setSelectedAdmin(admin);
                              // Load current role, default to Standard if none exists yet
                              setEditedRole(admin.role || "Standard Admin");
                              setShowViewModal(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                        <td>
                          <button
                            className="reject-btn"
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowDeleteModal(true);
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ textAlign: "center", padding: "16px" }}
                      >
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {viewMode === "admins" && filteredAdmins.length > 0 && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 24px",
                  borderTop: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  flexWrap: "wrap",
                  gap: "16px"
                }}>

                  {/* Rows per page */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                    <span>Rows per page:</span>
                    <select
                      value={adminRowsPerPage}
                      onChange={(e) => setAdminRowsPerPage(Number(e.target.value))}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: 'white',
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  {/* Pagination buttons */}
                  {totalAdminPages > 1 && (
                    <div className="af-pagination" style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="af-page-btn"
                        onClick={() => setAdminPage(prev => Math.max(prev - 1, 1))}
                        disabled={adminPage === 1}
                      >
                        Previous
                      </button>

                      {renderPageNumbers(adminPage, totalAdminPages, setAdminPage)}

                      <button
                        className="af-page-btn"
                        onClick={() => setAdminPage(prev => Math.min(prev + 1, totalAdminPages))}
                        disabled={adminPage === totalAdminPages}
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {/* Showing text */}
                  <div style={{ fontSize: "0.85rem" }}>
                    Showing {adminStartIndex + 1} to{" "}
                    {Math.min(adminStartIndex + adminRowsPerPage, filteredAdmins.length)} of{" "}
                    {filteredAdmins.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Approve Admin Account</h3>
            <p style={{ fontSize: "0.85rem", textAlign: "center" }}>
              Are you sure you want to approve{" "}
              <strong>{selectedRequest?.fullName}</strong>?
            </p>
            <div className="modal-actions">
              <button className="approve-btn" onClick={handleApprove}>
                Confirm Approval
              </button>
              <button
                className="reject-btn"
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRequest(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Confirm Rejection</h3>
            <p style={{ fontSize: "0.85rem", textAlign: "center" }}>
              Are you sure you want to reject this request?
            </p>
            <div className="modal-actions">
              <button className="reject-btn" onClick={confirmReject}>
                Reject
              </button>
              <button
                className="approve-btn"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Admin</h3>
            <p style={{ fontSize: "0.85rem", textAlign: "center" }}>
              This action cannot be undone. <br /> Delete this admin?
            </p>
            <div className="modal-actions">
              <button className="reject-btn" onClick={confirmDeleteAdmin}>
                Delete
              </button>
              <button
                className="approve-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAdmin(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Admin Details Modal */}
      {showViewModal && selectedAdmin && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: "420px" }}>

            <div className="as-modal-header">
              <h2>Admin Details</h2>
              <button className="as-modal-close" onClick={() => { setShowViewModal(false); setSelectedAdmin(null); }}>&times;</button>
            </div>

            <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left" }}>
              <div className="admin-details">
                <p><strong>Full Name:</strong> {selectedAdmin.fullName}</p>
                <p><strong>Email:</strong> {selectedAdmin.email}</p>
                <p><strong>Contact:</strong> {selectedAdmin.contact}</p>
                <p><strong>Position:</strong> {selectedAdmin.position}</p>
                <p><strong>Username:</strong> {selectedAdmin.username}</p>

                {/* --- NEW: SYSTEM ROLE SECTION --- */}
                <div style={{ marginTop: "16px", borderTop: "1px dashed #ccc", paddingTop: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <strong>System Role:</strong>

                    {/* Logic: Only Super Admin can edit, and cannot edit themselves */}
                    {isSuperAdmin && currentUser?.uid !== selectedAdmin.uid ? (
                      <select
                        value={editedRole}
                        onChange={(e) => setEditedRole(e.target.value)}
                        style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #ccc", outline: "none", cursor: "pointer" }}
                      >
                        <option value="Super Admin">Super Admin</option>
                        <option value="Standard Admin">Standard Admin</option>
                        <option value="Secretary">Secretary</option>
                        <option value="BSWD Head">BSWD Head</option>
                        <option value="BSWD Staff">BSWD Staff</option>
                        <option value="VAWC Head">VAWC Head</option>
                        <option value="VAWC Staff">VAWC Staff</option>
                        <option value="BOSCA Head">BOSCA Head</option>
                        <option value="BOSCA Staff">BOSCA Staff</option>
                        <option value="Peace&Order Head">Peace&Order Head</option>
                        <option value="Peace&Order Staff">Peace&Order Staff</option>
                        <option value="BADAC Head">BADAC Head</option>
                        <option value="BADAC Staff">BADAC Staff</option>
                        <option value="Livelihood Head">Livelihood Head</option>
                        <option value="Livelihood Staff">Livelihood Staff</option>
                      </select>
                    ) : (
                      <span style={{
                        background: selectedAdmin.role === 'Super Admin' ? '#e0e7ff' : '#f3f4f6',
                        color: selectedAdmin.role === 'Super Admin' ? '#3730a3' : '#4b5563',
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        fontWeight: "600"
                      }}>
                        {selectedAdmin.role || "Standard Admin"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* --- NEW: SAVE CHANGES BUTTON --- */}
              {/* Only shows if user is Super Admin, is not editing themselves, and actually changed the dropdown */}
              {isSuperAdmin && currentUser?.uid !== selectedAdmin.uid && editedRole !== (selectedAdmin.role || "Standard Admin") && (
                <div className="modal-actions" style={{ marginTop: "20px", justifyContent: "flex-end", borderTop: "1px solid #eee", paddingTop: "16px" }}>
                  <button className="approve-btn" onClick={handleSaveRole}>Save Role Changes</button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
