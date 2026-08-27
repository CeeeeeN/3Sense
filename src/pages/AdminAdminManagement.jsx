import { useState, useEffect, useMemo } from "react";
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
  orderBy,
  limit
} from "firebase/firestore";
import { Search } from "lucide-react";
import { formatDisplayEmail } from "../utils/maskEmail";

export default function AdminManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  const [admins, setAdmins] = useState([]);
  const [requests, setRequests] = useState([]);

  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [activeTab, setActiveTab] = useState("requests");

  const [searchAdmin, setSearchAdmin] = useState("");
  const [searchRequest, setSearchRequest] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortRequest, setSortRequest] = useState("date_desc");
  const [sortAdmin, setSortAdmin] = useState("name_asc");

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [editedRole, setEditedRole] = useState("Standard Admin");

  const [requestPage, setRequestPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const [requestRowsPerPage, setRequestRowsPerPage] = useState(10);
  const [adminRowsPerPage, setAdminRowsPerPage] = useState(10);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);

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

  useEffect(() => {
    if (!isSuperAdmin) return;

    const pendingQuery = query(
      collection(db, "pendingAdmins"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubRequests = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const docData = doc.data();
          return {
            docId: doc.id,
            ...docData,
            email: formatDisplayEmail(docData.email, adminRole, currentUser?.uid === docData.uid),
            rawDate: docData.createdAt?.toDate ? docData.createdAt.toDate().getTime() : 0,
            dateSubmitted:
              docData.createdAt?.toDate().toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }) || "N/A",
          };
        });
        setRequests(data);
      },
    );

    const approvedQuery = query(
      collection(db, "approvedAdmins"),
      limit(100)
    );

    const unsubAdmins = onSnapshot(
      approvedQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const docData = doc.data();
          return {
            docId: doc.id,
            ...docData,
            email: formatDisplayEmail(docData.email, adminRole, currentUser?.uid === docData.uid),
          };
        });
        setAdmins(data);
      },
    );

    return () => {
      unsubRequests();
      unsubAdmins();
    };
  }, [isSuperAdmin, adminRole, currentUser]);

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

  const filteredAdmins = useMemo(() => {
    return admins
      .filter((admin) => {
        return (admin.fullName || "").toLowerCase().includes(searchAdmin.toLowerCase()) ||
          (admin.username || "").toLowerCase().includes(searchAdmin.toLowerCase()) ||
          (admin.position || "").toLowerCase().includes(searchAdmin.toLowerCase());
      })
      .sort((a, b) => {
        if (sortAdmin === "name_asc") return (a.fullName || "").localeCompare(b.fullName || "");
        if (sortAdmin === "name_desc") return (b.fullName || "").localeCompare(a.fullName || "");
        if (sortAdmin === "role_asc") return (a.role || "Standard Admin").localeCompare(b.role || "Standard Admin");
        if (sortAdmin === "role_desc") return (b.role || "Standard Admin").localeCompare(a.role || "Standard Admin");
        return 0;
      });
  }, [admins, searchAdmin, sortAdmin]);

  const filteredRequests = useMemo(() => {
    return requests
      .filter((req) => {
        const searchText = searchRequest.toLowerCase();
        const matchesSearch =
          (req.fullName || "").toLowerCase().includes(searchText) ||
          (req.email || "").toLowerCase().includes(searchText) ||
          (req.username || "").toLowerCase().includes(searchText);
        const matchesStatus =
          filterStatus === "All" || req.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortRequest === "date_desc") return (b.rawDate || 0) - (a.rawDate || 0);
        if (sortRequest === "date_asc") return (a.rawDate || 0) - (b.rawDate || 0);
        if (sortRequest === "name_asc") return (a.fullName || "").localeCompare(b.fullName || "");
        if (sortRequest === "name_desc") return (b.fullName || "").localeCompare(a.fullName || "");
        return 0;
      });
  }, [requests, searchRequest, filterStatus, sortRequest]);

  const totalRequestPages = Math.ceil(filteredRequests.length / requestRowsPerPage);
  const requestStartIndex = (requestPage - 1) * requestRowsPerPage;
  const paginatedRequests = filteredRequests.slice(requestStartIndex, requestStartIndex + requestRowsPerPage);

  const totalAdminPages = Math.ceil(filteredAdmins.length / adminRowsPerPage);
  const adminStartIndex = (adminPage - 1) * adminRowsPerPage;
  const paginatedAdmins = filteredAdmins.slice(adminStartIndex, adminStartIndex + adminRowsPerPage);

  useEffect(() => {
    setRequestPage(1);
  }, [searchRequest, filterStatus, sortRequest, requestRowsPerPage]);

  useEffect(() => {
    setAdminPage(1);
  }, [searchAdmin, sortAdmin, adminRowsPerPage]);

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

  if (authLoading) {
    return (
      <AdminLayout>
        <div style={{ textAlign: "center", padding: "60px", fontSize: "1.2rem" }}>
          Loading...
        </div>
      </AdminLayout>
    );
  }

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

  return (
    <AdminLayout>
      <div className="requests-container">
        <div className="requests-header">
          <h1 className="requests-title">Admin Management</h1>
          <p className="requests-subtitle">Manage system administrative privileges, registrations, and accounts.</p>
        </div>

        <div className="req-tabs">
          <button
            className={`req-tab ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            Registration Requests
          </button>
          <button
            className={`req-tab ${activeTab === "admins" ? "active" : ""}`}
            onClick={() => setActiveTab("admins")}
          >
            Admin Accounts
          </button>
        </div>

        {activeTab === "requests" && (
          <>
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

              <div
                className="filter-group"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "nowrap"
                }}
              >
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

                <select
                  className="filter-select"
                  value={sortRequest}
                  onChange={(e) => setSortRequest(e.target.value)}
                >
                  <option value="date_desc">Date: Newest First</option>
                  <option value="date_asc">Date: Oldest First</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                </select>
              </div>
            </div>

            <div className="req-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table className="req-table" style={{ minWidth: "850px" }}>
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Contact</th>
                    <th>Position</th>
                    <th>Username</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.length > 0 ? (
                    paginatedRequests.map((req) => (
                      <tr key={req.docId}>
                        <td style={{ fontWeight: 500 }}>{req.fullName}</td>
                        <td>{formatDisplayEmail(req.email, adminRole, currentUser?.uid === req.uid)}</td>
                        <td>{req.contact}</td>
                        <td>{req.position}</td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem" }}>{req.username}</td>
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
                            <div className="btn-group" style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
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
                            <span className="action-disabled" style={{ display: "block", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>Completed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}
                      >
                        No requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredRequests.length > 0 && (
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

                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Showing {requestStartIndex + 1} to{" "}
                  {Math.min(requestStartIndex + requestRowsPerPage, filteredRequests.length)} of{" "}
                  {filteredRequests.length}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "admins" && (
          <>
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
                  style={{ paddingLeft: "36px" }}
                />
              </div>

              <div
                className="filter-group"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "nowrap"
                }}
              >
                <select
                  className="filter-select"
                  value={sortAdmin}
                  onChange={(e) => setSortAdmin(e.target.value)}
                >
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                  <option value="role_asc">System Role: Ascending</option>
                  <option value="role_desc">System Role: Descending</option>
                </select>
              </div>
            </div>

            <div className="req-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table className="req-table" style={{ minWidth: "850px" }}>
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Position</th>
                    <th>System Role</th>
                    <th style={{ textAlign: "center" }}>More Details</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAdmins.length > 0 ? (
                    paginatedAdmins.map((admin) => (
                      <tr key={admin.docId}>
                        <td style={{ fontWeight: 500 }}>{admin.fullName}</td>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem" }}>{admin.username}</td>
                        <td>{admin.position}</td>
                        <td>
                          <span style={{
                            background: admin.role === 'Super Admin' ? '#e0e7ff' : '#f3f4f6',
                            color: admin.role === 'Super Admin' ? '#3730a3' : '#4b5563',
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "0.78rem",
                            fontWeight: "600"
                          }}>
                            {admin.role || "Standard Admin"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="as-btn-ghost"
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setEditedRole(admin.role || "Standard Admin");
                              setShowViewModal(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="reject-btn"
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
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
                        colSpan={6}
                        style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}
                      >
                        No admin accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredAdmins.length > 0 && (
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

                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Showing {adminStartIndex + 1} to{" "}
                  {Math.min(adminStartIndex + adminRowsPerPage, filteredAdmins.length)} of{" "}
                  {filteredAdmins.length}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showApproveModal && (
        <div className="as-modal-overlay">
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

      {showRejectModal && (
        <div className="as-modal-overlay">
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

      {showDeleteModal && (
        <div className="as-modal-overlay">
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
                <p><strong>Email:</strong> {formatDisplayEmail(selectedAdmin.email, adminRole, currentUser?.uid === selectedAdmin.uid)}</p>
                <p><strong>Contact:</strong> {selectedAdmin.contact}</p>
                <p><strong>Position:</strong> {selectedAdmin.position}</p>
                <p><strong>Username:</strong> {selectedAdmin.username}</p>

                <div style={{ marginTop: "16px", borderTop: "1px dashed #ccc", paddingTop: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <strong>System Role:</strong>

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