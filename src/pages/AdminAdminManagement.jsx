import { useState, useEffect } from "react";
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

export default function AdminManagement() {

  // ================= STATE =================
  const [currentUser, setCurrentUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

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

  const [requestPage, setRequestPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);

  const defaultRows = 3;
  const rowsPerPage = 10;

  // ================= STEP 1: CHECK IF SERVICE HEAD =================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);

        // Check pendingAdmins first
        const pendingQ = query(collection(db, "pendingAdmins"), where("uid", "==", user.uid));
        const pendingSnapshot = await getDocs(pendingQ);

        if (!pendingSnapshot.empty) {
          const userData = pendingSnapshot.docs[0].data();
          if (userData.position === "Service Head" || userData.position === "Super admin" || userData.position === "Super Admin") {
            setIsSuperAdmin(true);
          }
        }

        // Also check approvedAdmins
        const approvedQ = query(collection(db, "approvedAdmins"), where("uid", "==", user.uid));
        const approvedSnapshot = await getDocs(approvedQ);

        if (!approvedSnapshot.empty) {
          const userData = approvedSnapshot.docs[0].data();
          if (userData.position === "Service Head" || userData.position === "Super admin" || userData.position === "Super Admin") {
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

    const unsubRequests = onSnapshot(collection(db, "pendingAdmins"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        docId: doc.id,
        ...doc.data(),
        dateSubmitted: doc.data().createdAt?.toDate().toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric"
        }) || "N/A"
      }));
      setRequests(data);
    });

    const unsubAdmins = onSnapshot(collection(db, "approvedAdmins"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        docId: doc.id,
        ...doc.data()
      }));
      setAdmins(data);
    });

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
        username: selectedRequest.username,
        approvedAt: new Date()
      });

      await updateDoc(doc(db, "pendingAdmins", selectedRequest.docId), {
        status: "approved"
      });

      setSelectedRequest(null);
      setShowApproveModal(false);

    } catch (error) {
      console.error("Error approving admin:", error);
      alert("Failed to approve admin. Please try again.");
    }
  };

  // ================= STEP 4: REJECT =================
  const confirmReject = async () => {
    if (!selectedRequest) return;

    try {
      await updateDoc(doc(db, "pendingAdmins", selectedRequest.docId), {
        status: "rejected"
      });

      setSelectedRequest(null);
      setShowRejectModal(false);

    } catch (error) {
      console.error("Error rejecting admin:", error);
      alert("Failed to reject admin. Please try again.");
    }
  };

  // ================= STEP 5: DELETE APPROVED ADMIN =================
  const confirmDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      await deleteDoc(doc(db, "approvedAdmins", selectedAdmin.docId));

      setSelectedAdmin(null);
      setShowDeleteModal(false);

    } catch (error) {
      console.error("Error deleting admin:", error);
      alert("Failed to delete admin. Please try again.");
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
      const matchesStatus = filterStatus === "All" || req.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return 0;
    });

  const paginatedRequests =
    viewMode === "default"
      ? filteredRequests.slice(0, defaultRows)
      : filteredRequests.slice((requestPage - 1) * rowsPerPage, requestPage * rowsPerPage);

  const totalRequestPages =
    viewMode === "default" ? 1 : Math.ceil(filteredRequests.length / rowsPerPage);

  const paginatedAdmins =
    viewMode === "default"
      ? filteredAdmins.slice(0, defaultRows)
      : filteredAdmins.slice((adminPage - 1) * rowsPerPage, adminPage * rowsPerPage);

  const totalAdminPages =
    viewMode === "default" ? 1 : Math.ceil(filteredAdmins.length / rowsPerPage);

  useEffect(() => { setRequestPage(1); }, [searchRequest, filterStatus]);
  useEffect(() => { setAdminPage(1); }, [searchAdmin]);

  // ================= LOADING =================
  if (authLoading) {
    return (
      <AdminLayout>
        <div style={{ textAlign: "center", padding: "60px", fontSize: "1.2rem" }}>
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
              <h2>Admin Registration Requests ({filteredRequests.filter(r => r.status === "pending").length})</h2>
              {viewMode === "default" ? (
                <button className="view-btn" onClick={() => setViewMode("requests")}>See All</button>
              ) : (
                <button className="view-btn" onClick={() => setViewMode("default")}>Return</button>
              )}
            </div>
            <div className="card">
              <div className="table-controls">
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchRequest}
                  onChange={(e) => setSearchRequest(e.target.value)}
                />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="All">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <table className="admin-table">
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
                          <span className={`status-badge status-${req.status?.toLowerCase()}`}>
                            {req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
                          </span>
                        </td>
                        <td>
                          {req.status === "pending" ? (
                            <div className="btn-group">
                              <button className="approve-btn" onClick={() => { setSelectedRequest(req); setShowApproveModal(true); }}>
                                Approve
                              </button>
                              <button className="reject-btn" onClick={() => { setSelectedRequest(req); setShowRejectModal(true); }}>
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
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "16px" }}>No results found.</td></tr>
                  )}
                </tbody>
              </table>
              {viewMode === "requests" && totalRequestPages > 1 && (
                <div className="pagination">
                  <button disabled={requestPage === 1} onClick={() => setRequestPage(prev => prev - 1)}>Prev</button>
                  <span>Page {requestPage} of {totalRequestPages}</span>
                  <button disabled={requestPage === totalRequestPages} onClick={() => setRequestPage(prev => prev + 1)}>Next</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= ADMIN ACCOUNT MANAGEMENT ================= */}
        {(viewMode === "default" || viewMode === "admins") && (
          <div className="section">
            <div className="section-header">
              <h2>Admin Account Management</h2>
              {viewMode === "default" ? (
                <button className="view-btn" onClick={() => setViewMode("admins")}>See All</button>
              ) : (
                <button className="view-btn" onClick={() => setViewMode("default")}>Return</button>
              )}
            </div>
            <div className="card">
              <div className="table-controls">
                <input
                  type="text"
                  placeholder="Search admin..."
                  value={searchAdmin}
                  onChange={(e) => setSearchAdmin(e.target.value)}
                />
              </div>
              <table className="admin-table">
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
                          <button className="view-btn" onClick={() => { setSelectedAdmin(admin); setShowViewModal(true); }}>View</button>
                        </td>
                        <td>
                          <button className="reject-btn" onClick={() => { setSelectedAdmin(admin); setShowDeleteModal(true); }}>Delete</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: "16px" }}>No results found.</td></tr>
                  )}
                </tbody>
              </table>
              {viewMode === "admins" && totalAdminPages > 1 && (
                <div className="pagination">
                  <button disabled={adminPage === 1} onClick={() => setAdminPage(prev => prev - 1)}>Prev</button>
                  <span>Page {adminPage} of {totalAdminPages}</span>
                  <button disabled={adminPage === totalAdminPages} onClick={() => setAdminPage(prev => prev + 1)}>Next</button>
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
              Are you sure you want to approve <strong>{selectedRequest?.fullName}</strong>?
            </p>
            <div className="modal-actions">
              <button className="approve-btn" onClick={handleApprove}>Confirm Approval</button>
              <button className="reject-btn" onClick={() => { setShowApproveModal(false); setSelectedRequest(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Confirm Rejection</h3>
            <p style={{ fontSize: "0.85rem", textAlign: "center" }}>Are you sure you want to reject this request?</p>
            <div className="modal-actions">
              <button className="reject-btn" onClick={confirmReject}>Reject</button>
              <button className="approve-btn" onClick={() => { setShowRejectModal(false); setSelectedRequest(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Delete Admin</h3>
            <p style={{ fontSize: "0.85rem", textAlign: "center" }}>This action cannot be undone. <br /> Delete this admin?</p>
            <div className="modal-actions">
              <button className="reject-btn" onClick={confirmDeleteAdmin}>Delete</button>
              <button className="approve-btn" onClick={() => { setShowDeleteModal(false); setSelectedAdmin(null); }}>Cancel</button>
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
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}