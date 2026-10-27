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
  orderBy,
  limit
} from "firebase/firestore";
import { Search } from "lucide-react";
import { formatDisplayEmail } from "../utils/maskEmail";
import { useAlert } from "../context/AlertContext"; 
import { useQuery, useQueryClient } from "@tanstack/react-query"; // <-- Added React Query

export default function AdminManagement() {
  const queryClient = useQueryClient(); // <-- For local cache mutations
  const [currentUser, setCurrentUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const { showAlert, showConfirm } = useAlert(); 

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState("requests");

  const [searchAdmin, setSearchAdmin] = useState("");
  const [searchRequest, setSearchRequest] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortRequest, setSortRequest] = useState("date_desc");
  const [sortAdmin, setSortAdmin] = useState("name_asc");

  const [showViewModal, setShowViewModal] = useState(false);
  const [editedRole, setEditedRole] = useState("Standard Admin");

  const [requestPage, setRequestPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const [requestRowsPerPage, setRequestRowsPerPage] = useState(10);
  const [adminRowsPerPage, setAdminRowsPerPage] = useState(10);

  // ─── 1. OPTIMIZED: Zero-Read Auth & Role Verification ───
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const cachedProfile = sessionStorage.getItem(`admin_profile_${user.uid}`);
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          setAdminName(parsed.fullName || "Admin");
          setAdminRole(parsed.role || "Standard Admin");
          
          if (
            parsed.position === "Service Head" ||
            parsed.role === "Super admin" ||
            parsed.role === "Super Admin"
          ) {
            setIsSuperAdmin(true);
          }
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ─── 2. LAZY LOADED: Pending Admin Requests ───
  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['adminManage_pendingAdmins'],
    queryFn: async () => {
      const q = query(
        collection(db, "pendingAdmins"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
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
    },
    enabled: isSuperAdmin && activeTab === "requests", // <-- Only fetches when on this tab
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // ─── 3. LAZY LOADED: Approved Admin Accounts ───
  const { data: admins = [], isLoading: loadingAdmins } = useQuery({
    queryKey: ['adminManage_approvedAdmins'],
    queryFn: async () => {
      const q = query(collection(db, "approvedAdmins"), limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          docId: doc.id,
          ...docData,
          email: formatDisplayEmail(docData.email, adminRole, currentUser?.uid === docData.uid),
        };
      });
    },
    enabled: isSuperAdmin && activeTab === "admins", // <-- Only fetches when on this tab
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // ─── 4. OPTIMIZED: Zero-Read Mutations ───
  const handleApprove = async (req) => {
    const isConfirmed = await showConfirm(
      "Approve Admin Account",
      `Are you sure you want to approve ${req.fullName}?`
    );
    
    if (!isConfirmed) return;

    try {
      await addDoc(collection(db, "approvedAdmins"), {
        uid: req.uid,
        fullName: req.fullName,
        email: req.email, // using original format, masking handles display later
        contact: req.contact,
        position: req.position,
        role: "Standard Admin",
        username: req.username,
        approvedAt: new Date(),
      });

      await updateDoc(doc(db, "pendingAdmins", req.docId), {
        status: "approved",
      });

      // Surgically update local cache (0 Reads)
      queryClient.setQueryData(['adminManage_pendingAdmins'], (old = []) => 
        old.map(r => r.docId === req.docId ? { ...r, status: 'approved' } : r)
      );
      // Invalidate admins so it correctly refetches the new addition when the tab is clicked
      queryClient.invalidateQueries({ queryKey: ['adminManage_approvedAdmins'] });

      logTransaction(
        adminName,
        adminRole,
        "Approved Admin Request",
        `Approved admin registration for ${req.fullName} (${req.email}) (ID: ${req.uid})`
      );

      await showAlert("Success", "Admin approved successfully!");
    } catch (error) {
      console.error("Error approving admin:", error);
      await showAlert("Error", "Failed to approve admin. Please try again.");
    }
  };

  const handleReject = async (req) => {
    const isConfirmed = await showConfirm(
      "Confirm Rejection",
      "Are you sure you want to reject this request?"
    );

    if (!isConfirmed) return;

    try {
      await updateDoc(doc(db, "pendingAdmins", req.docId), {
        status: "rejected",
      });

      // Surgically update local cache (0 Reads)
      queryClient.setQueryData(['adminManage_pendingAdmins'], (old = []) => 
        old.map(r => r.docId === req.docId ? { ...r, status: 'rejected' } : r)
      );

      logTransaction(
        adminName,
        adminRole,
        "Rejected Admin Request",
        `Rejected admin registration for ${req.fullName} (${req.email}) (ID: ${req.uid})`
      );

      await showAlert("Success", "Admin request rejected.");
    } catch (error) {
      console.error("Error rejecting admin:", error);
      await showAlert("Error", "Failed to reject admin. Please try again.");
    }
  };

  const handleDeleteAdmin = async (admin) => {
    const isConfirmed = await showConfirm(
      "Delete Admin",
      `This action cannot be undone. Delete admin account for ${admin.fullName}?`
    );

    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, "approvedAdmins", admin.docId));

      // Surgically remove from local cache (0 Reads)
      queryClient.setQueryData(['adminManage_approvedAdmins'], (old = []) => 
        old.filter(a => a.docId !== admin.docId)
      );

      logTransaction(
        adminName,
        adminRole,
        "Deleted Admin Account",
        `Deleted admin account of ${admin.fullName} (${admin.email}) (ID: ${admin.uid})`
      );

      await showAlert("Success", "Admin account deleted successfully.");
    } catch (error) {
      console.error("Error deleting admin:", error);
      await showAlert("Error", "Failed to delete admin. Please try again.");
    }
  };

  const handleSaveRole = async () => {
    if (!selectedAdmin) return;

    try {
      await updateDoc(doc(db, "approvedAdmins", selectedAdmin.docId), {
        role: editedRole,
      });

      // Surgically update local cache (0 Reads)
      queryClient.setQueryData(['adminManage_approvedAdmins'], (old = []) => 
        old.map(a => a.docId === selectedAdmin.docId ? { ...a, role: editedRole } : a)
      );

      logTransaction(
        adminName,
        adminRole,
        "Updated Admin Role",
        `Updated system role of ${selectedAdmin.fullName} (${selectedAdmin.email}) (ID: ${selectedAdmin.uid}) to ${editedRole}`
      );

      setSelectedAdmin(null);
      setShowViewModal(false);
      await showAlert("Success", "Admin system role updated successfully!");
    } catch (error) {
      console.error("Error updating role:", error);
      await showAlert("Error", "Failed to update role. Please try again.");
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
        const matchesSearch = (req.fullName || "").toLowerCase().includes(searchText);
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
        <div style={{ textAlign: "center", padding: "60px" }}>
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
                  <tr style={{ textAlign: "center" }}>
                    <th>Full Name</th>
                    <th>Position</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRequests ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "#9ca3af" }}>
                        Loading requests...
                      </td>
                    </tr>
                  ) : paginatedRequests.length > 0 ? (
                    paginatedRequests.map((req) => (
                      <tr
                        key={req.docId}
                        onClick={() => {
                          setSelectedAdmin(req);
                          setShowViewModal(true);
                        }}
                        style={{ cursor: "pointer", textAlign: "center" }}
                      >
                        <td>{req.fullName}</td>
                        <td>{req.position}</td>
                        <td>{req.dateSubmitted}</td>
                        <td>
                          <span
                            className={`status-badge ${(req.status || "pending").toLowerCase()}`}
                          >
                            {(req.status || "Pending").charAt(0).toUpperCase() + (req.status || "Pending").slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn-view"
                            style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAdmin(req);
                              setShowViewModal(true);
                            }}
                          >
                            More Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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

                <div style={{ color: '#64748b' }}>
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
                  <tr style={{ textAlign: "center" }}>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Position</th>
                    <th>System Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAdmins ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "#9ca3af" }}>
                        Loading admins...
                      </td>
                    </tr>
                  ) : paginatedAdmins.length > 0 ? (
                    paginatedAdmins.map((admin) => (
                      <tr
                        key={admin.docId}
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setEditedRole(admin.role || "Standard Admin");
                          setShowViewModal(true);
                        }}
                        style={{ cursor: "pointer", textAlign: "center" }}
                      >
                        <td>{admin.fullName}</td>
                        <td>{admin.username}</td>
                        <td>{admin.position}</td>
                        <td>
                          <span
                            style={{
                              background: admin.role === 'Super Admin' ? '#e0e7ff' : '#f1f5f9',
                              color: admin.role === 'Super Admin' ? '#3730a3' : '#475569',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                minWidth: '6px',
                                minHeight: '6px',
                                borderRadius: '50%',
                                backgroundColor: admin.role === 'Super Admin' ? '#4f46e5' : '#94a3b8',
                                display: 'inline-block',
                                flexShrink: 0,
                              }}
                            />
                            {admin.role || 'Standard Admin'}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn-view"
                            style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAdmin(admin);
                              setEditedRole(admin.role || "Standard Admin");
                              setShowViewModal(true);
                            }}
                          >
                            More Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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

                <div style={{ color: '#64748b' }}>
                  Showing {adminStartIndex + 1} to{" "}
                  {Math.min(adminStartIndex + adminRowsPerPage, filteredAdmins.length)} of{" "}
                  {filteredAdmins.length}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showViewModal && selectedAdmin && (
        <div className="as-modal-overlay" onClick={() => { setShowViewModal(false); setSelectedAdmin(null); }}>
          <div className="as-modal-content" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <h2>{activeTab === "requests" ? "Request Details" : "Admin Details"}</h2>
              <button className="as-modal-close" onClick={() => { setShowViewModal(false); setSelectedAdmin(null); }}>&times;</button>
            </div>

            <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left" }}>
              <div className="admin-details">
                <p><strong>Full Name:</strong> {selectedAdmin.fullName}</p>
                <p><strong>Email:</strong> {formatDisplayEmail(selectedAdmin.email, adminRole, currentUser?.uid === selectedAdmin.uid)}</p>
                <p><strong>Contact:</strong> {selectedAdmin.contact}</p>
                <p><strong>Position:</strong> {selectedAdmin.position}</p>

                {activeTab === "admins" && (
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
                          borderRadius: "20px"
                        }}>
                          {selectedAdmin.role || "Standard Admin"}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with actions and no redundant Close button */}
            <div className="modal-footer">
              {activeTab === "requests" ? (
                selectedAdmin.status === "pending" ? (
                  <>
                    <button
                      className="btn-reject"
                      onClick={() => {
                        handleReject(selectedAdmin);
                        setShowViewModal(false);
                      }}
                    >
                      Reject
                    </button>
                    <button
                      className="btn-approve"
                      onClick={() => {
                        handleApprove(selectedAdmin);
                        setShowViewModal(false);
                      }}
                    >
                      Approve
                    </button>
                  </>
                ) : null
              ) : (
                <>
                  {isSuperAdmin && currentUser?.uid !== selectedAdmin.uid && (
                    <button
                      className="btn-reject"
                      onClick={() => {
                        handleDeleteAdmin(selectedAdmin);
                        setShowViewModal(false);
                      }}
                    >
                      Delete Account
                    </button>
                  )}
                  {isSuperAdmin && currentUser?.uid !== selectedAdmin.uid && editedRole !== (selectedAdmin.role || "Standard Admin") && (
                    <button className="btn-approve" onClick={handleSaveRole}>
                      Save Role Changes
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}