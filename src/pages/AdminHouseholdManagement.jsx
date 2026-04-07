import { useState, useEffect } from "react";
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { db, auth } from "../firebase/firebase";
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  collectionGroup,
  arrayUnion,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { approveRegistration } from "../services/admin";

export default function HouseholdManagement() {

  // ================= STATE =================
  const [residents, setResidents] = useState([]);
  const [hhRequests, setHhRequests] = useState([]);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const [selectedResident, setSelectedResident] = useState(null);
  const [showResidentModal, setShowResidentModal] = useState(false);

  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const defaultRows = 3;

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusData, setStatusData] = useState(null);

  // Resident view mode
  const [residentViewMode, setResidentViewMode] = useState("default");

  // HH Requests state
  const [hhViewMode, setHhViewMode] = useState("default");
  const [hhRequestPage, setHhRequestPage] = useState(1);
  const [searchHhRequest, setSearchHhRequest] = useState("");
  const [filterHhStatus, setFilterHhStatus] = useState("All");
  const [selectedHhRequest, setSelectedHhRequest] = useState(null);
  const [showHhViewModal, setShowHhViewModal] = useState(false);
  const [showHhApproveModal, setShowHhApproveModal] = useState(false);
  const [showHhRejectModal, setShowHhRejectModal] = useState(false);

  // Current admin profile
  const [adminProfile, setAdminProfile] = useState({ fullName: "Admin", position: "" });

  // Fetch current admin's display name from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fetchAdmin = async () => {
      const q = query(collection(db, "approvedAdmins"), where("uid", "==", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        setAdminProfile({
          fullName: d.fullName || d.username || user.email,
          position: d.position || "Admin",
        });
      }
    };
    fetchAdmin();
  }, []);

  // Fetch Pending Registrations
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pending_registrations"), (snapshot) => {
      const requests = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          householdId: "Pending",
          fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          category: data.categories || (data.category ? [data.category] : []),
          address: `${data.houseNumber || ""} ${data.street || ""}, ${data.barangay || ""}`.trim(),
          dateSubmitted: data.createdAt ? data.createdAt.toDate().toLocaleDateString() : "N/A",
          status: data.status || "pending",
          ...data
        };
      });
      setHhRequests(requests);
    });
    return () => unsub();
  }, []);

  // Fetch Active Residents & Pending Activations
  useEffect(() => {
    const unsubResidents = onSnapshot(collectionGroup(db, "residents"), (resSnapshot) => {
      const activeResidents = resSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const householdId = docSnap.ref.parent.parent.id;
        return {
          id: docSnap.id,
          householdId,
          fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          category: data.categories || [],
          address: data.houseNumber ? `${data.houseNumber} ${data.street}, ${data.barangay}` : 'Shared Household Address',
          status: data.adminStatus || "Clear Case",
          remarks: data.adminRemarks || "",
          incident: data.adminIncident || "",
          statusHistory: data.statusHistory || [],
          ...data
        };
      });

      const unsubHouseholds = onSnapshot(collection(db, "households"), (hhSnapshot) => {
        const pendingHeads = [];
        hhSnapshot.docs.forEach(hhDoc => {
          const hhData = hhDoc.data();
          if (hhData.activated === false && hhData._pendingHeadData) {
            const head = hhData._pendingHeadData;
            pendingHeads.push({
              id: `unactivated-${hhDoc.id}`,
              householdId: hhDoc.id,
              fullName: `${head.firstName || ""} ${head.lastName || ""}`.trim(),
              category: head.categories || [],
              address: hhData.houseNumber ? `${hhData.houseNumber} ${hhData.street}, ${hhData.barangay}` : '',
              status: "Pending Activation",
              isPendingActivation: true,
              statusHistory: [],
              ...head
            });
          }
        });

        setResidents([...activeResidents, ...pendingHeads]);
      });

      return () => unsubHouseholds();
    });

    return () => unsubResidents();
  }, []);


  // ================= HH REQUEST FILTERS =================
  const filteredHhRequests = hhRequests
    .filter((req) => {
      const searchText = searchHhRequest.toLowerCase();
      const matchesSearch =
        req.fullName.toLowerCase().includes(searchText) ||
        req.householdId.toLowerCase().includes(searchText);
      const matchesStatus =
        filterHhStatus === "All" || req.status === filterHhStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return 0;
    });

  const paginatedHhRequests =
    hhViewMode === "default"
      ? filteredHhRequests.slice(0, defaultRows)
      : filteredHhRequests.slice(
        (hhRequestPage - 1) * rowsPerPage,
        hhRequestPage * rowsPerPage
      );

  const totalHhRequestPages =
    hhViewMode === "default"
      ? 1
      : Math.ceil(filteredHhRequests.length / rowsPerPage);

  useEffect(() => {
    setHhRequestPage(1);
  }, [searchHhRequest, filterHhStatus]);

  // ================= HH REQUEST ACTIONS =================
  const handleHhApprove = async () => {
    if (!selectedHhRequest) return;
    try {
      await approveRegistration(selectedHhRequest.id);
      setSelectedHhRequest(null);
      setShowHhApproveModal(false);
      alert("Registration approved successfully. An email has been sent to the head.");
    } catch (error) {
      console.error("Error approving registration:", error);
      alert("Error approving registration: " + error.message);
    }
  };

  const handleHhReject = async () => {
    if (!selectedHhRequest) return;
    try {
      await deleteDoc(doc(db, "pending_registrations", selectedHhRequest.id));
      setSelectedHhRequest(null);
      setShowHhRejectModal(false);
    } catch (error) {
      console.error("Error rejecting registration:", error);
      alert("Error rejecting registration: " + error.message);
    }
  };

  // ================= RESIDENT FILTERS =================
  const filteredResidents = residents.filter(r => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      r.fullName.toLowerCase().includes(searchText) ||
      r.householdId.toLowerCase().includes(searchText);

    const matchesCategory =
      filterCategory === "All" || 
      (r.category && r.category.some(cat => 
        cat.toLowerCase().includes(filterCategory.toLowerCase())
      ));

    const matchesStatus =
      filterStatus === "All" || r.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const paginatedResidents = residentViewMode === "default"
    ? filteredResidents.slice(0, defaultRows)
    : filteredResidents.slice(
      (page - 1) * rowsPerPage,
      page * rowsPerPage
    );

  const totalPages = residentViewMode === "default"
    ? 1
    : Math.ceil(filteredResidents.length / rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterStatus]);

  // ================= SAVE RESIDENT STATUS =================
  const handleSaveStatus = async () => {
    if (!statusData) return;

    if (statusData.isPendingActivation) {
      alert("Cannot update status of accounts that are pending activation. Wait for the user to activate their profile.");
      return;
    }

    try {
      const residentRef = doc(db, "households", statusData.householdId, "residents", statusData.id);

      // Build the history log entry
      const historyEntry = {
        status: statusData.status,
        remarks: statusData.remarks || "",
        incident: statusData.incident || "",
        setBy: adminProfile.fullName,
        setByPosition: adminProfile.position,
        setAt: new Date().toISOString(), // ISO string so it's readable client-side without Firestore conversion
      };

      await updateDoc(residentRef, {
        adminStatus: statusData.status,
        adminRemarks: statusData.remarks || "",
        adminIncident: statusData.incident || "",
        adminLastUpdatedBy: adminProfile.fullName,
        adminLastUpdatedByPosition: adminProfile.position,
        adminLastUpdatedAt: serverTimestamp(),
        // Append to history array (Firestore arrayUnion won't deduplicate objects, use array append instead)
        statusHistory: arrayUnion(historyEntry),
      });

      setShowStatusModal(false);
      setStatusData(null);
    } catch (error) {
      console.error("Error updating resident status:", error);
      alert("Failed to update status.");
    }
  };

  return (
    <AdminLayout>
      <div className="main-content">

        {/* ================= HOUSEHOLD REGISTRATION REQUESTS ================= */}
        {(hhViewMode === "default" || hhViewMode === "requests") && residentViewMode === "default" && (
          <div className="section">
            <div className="section-header">
              <h2>
                Resident Registration Requests ({filteredHhRequests.filter(r => r.status === "pending").length})
              </h2>
              {hhViewMode === "default" ? (
                <button
                  className="view-btn"
                  onClick={() => setHhViewMode("requests")}
                >
                  See All
                </button>
              ) : (
                <button
                  className="view-btn"
                  onClick={() => {
                    setHhViewMode("default");
                    setSearchHhRequest("");
                    setFilterHhStatus("All");
                  }}
                >
                  Return
                </button>
              )}
            </div>

            <div className="card">
              <div className="table-controls">
                <input
                  type="text"
                  placeholder="Search name..."
                  value={searchHhRequest}
                  onChange={(e) => setSearchHhRequest(e.target.value)}
                />
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Household ID</th>
                    <th>Category</th>
                    <th>Date Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedHhRequests.length > 0 ? (
                    paginatedHhRequests.map((req) => (
                      <tr key={req.id}>
                        <td>{req.fullName}</td>
                        <td>{req.householdId}</td>
                        <td>{req.category && req.category.join(", ")}</td>
                        <td>{req.dateSubmitted}</td>
                        <td>
                          <div className="resident-btns">
                            <button
                              className="view-btn"
                              onClick={() => {
                                setSelectedHhRequest(req);
                                setShowHhViewModal(true);
                              }}
                            >
                              View
                            </button>
                            {req.status === "pending" && (
                              <>
                                <button
                                  className="approve-btn"
                                  onClick={() => {
                                    setSelectedHhRequest(req);
                                    setShowHhApproveModal(true);
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  className="reject-btn"
                                  onClick={() => {
                                    setSelectedHhRequest(req);
                                    setShowHhRejectModal(true);
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "16px" }}>
                        No pending requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {hhViewMode === "requests" && totalHhRequestPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={hhRequestPage === 1}
                    onClick={() => setHhRequestPage(prev => prev - 1)}
                  >
                    Prev
                  </button>
                  <span>Page {hhRequestPage} of {totalHhRequestPages}</span>
                  <button
                    disabled={hhRequestPage === totalHhRequestPages}
                    onClick={() => setHhRequestPage(prev => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= REGISTERED RESIDENTS ================= */}
        {(residentViewMode === "default" || residentViewMode === "residents") && hhViewMode === "default" && (
          <div className="section">
            <div className="section-header">
              <h2>Resident Account Management</h2>
              {residentViewMode === "default" ? (
                <button
                  className="view-btn"
                  onClick={() => setResidentViewMode("residents")}
                >
                  See All
                </button>
              ) : (
                <button
                  className="view-btn"
                  onClick={() => {
                    setResidentViewMode("default");
                    setSearch("");
                    setFilterCategory("All");
                    setFilterStatus("All");
                  }}
                >
                  Return
                </button>
              )}
            </div>
            <div className="card">

              <div className="table-controls">
                <input
                  type="text"
                  placeholder="Search name or household ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  <option value="Student">Student</option>
                  <option value="Senior Citizen">Senior Citizen</option>
                  <option value="Solo Parent">Solo Parent</option>
                  <option value="OFW">OFW</option>
                  <option value="LGBT">LGBT</option>
                  <option value="Indigenous">Indigenous</option>
                  <option value="PWD">PWD</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Clear Case">Clear Case</option>
                  <option value="Pending Case">Pending Case</option>
                  <option value="Violation">Violation</option>
                  <option value="Pending Activation">Pending Activation</option>
                </select>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Household ID</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedResidents.length > 0 ? (
                    paginatedResidents.map((res) => (
                      <tr key={res.id}>
                        <td>{res.fullName}</td>
                        <td>{res.householdId}</td>
                        <td>{res.category && res.category.join(", ")}</td>
                        <td>
                          <span className={`status-badge status-${res.status.toLowerCase().replace(/\s+/g, "")}`}>
                            {res.status}
                          </span>
                        </td>
                        <td>
                          <div className="resident-btns">
                            <button
                              className="view-btn"
                              onClick={() => {
                                setSelectedResident(res);
                                setShowResidentModal(true);
                              }}
                            >
                              View Profile
                            </button>
                            {!res.isPendingActivation && (
                              <button
                                className="update-btn"
                                onClick={() => {
                                  setStatusData({ ...res });
                                  setShowStatusModal(true);
                                }}
                              >
                                Update Status
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "16px" }}>
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {residentViewMode === "residents" && totalPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(prev => prev - 1)}
                  >
                    Prev
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= RESIDENT DETAILS MODAL ================= */}
        {showResidentModal && selectedResident && (
          <div className="as-modal-overlay">
            <div className="as-modal-content" style={{ maxWidth: "420px" }}>

              <div className="as-modal-header">
                <h2>Resident Details</h2>
                <button
                  className="as-modal-close"
                  onClick={() => {
                    setShowResidentModal(false);
                    setSelectedResident(null);
                  }}
                >
                  &times;
                </button>
              </div>

              <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left" }}>
                <div className="admin-details">
                  <p><strong>Full Name:</strong> {selectedResident.fullName}</p>
                  <p><strong>Birth Date:</strong> {selectedResident.birthDate}</p>
                  <p><strong>Sex:</strong> {selectedResident.sex}</p>
                  <p><strong>Civil Status:</strong> {selectedResident.civilStatus}</p>
                  <p><strong>Address:</strong> {selectedResident.address}</p>
                  <p><strong>Category:</strong> {selectedResident.category && selectedResident.category.join(", ")}</p>
                  <p><strong>Education:</strong> {selectedResident.educationAttainment || selectedResident.education}</p>
                  <p><strong>Employment:</strong> {selectedResident.employmentStatus || selectedResident.employment}</p>
                  <p><strong>Household ID:</strong> {selectedResident.householdId}</p>
                  <p><strong>Total Members:</strong> {selectedResident.totalMembers || selectedResident.members}</p>
                  <p>
                    <strong>Status:</strong><br />
                    <span className={`status-badge status-${selectedResident.status.toLowerCase().replace(/\s+/g, "")}`}>
                      {selectedResident.status}
                    </span>
                  </p>
                  {selectedResident.remarks && (
                    <p><strong>Remarks:</strong> {selectedResident.remarks}</p>
                  )}
                  {selectedResident.incident && (
                    <p><strong>Incident Details:</strong> {selectedResident.incident}</p>
                  )}
                  {selectedResident.adminLastUpdatedBy && (
                    <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "8px" }}>
                      Last updated by <strong>{selectedResident.adminLastUpdatedBy}</strong>
                      {selectedResident.adminLastUpdatedByPosition ? ` (${selectedResident.adminLastUpdatedByPosition})` : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= UPDATE STATUS MODAL ================= */}
        {showStatusModal && statusData && (
          <div className="as-modal-overlay">
            <div className="as-modal-content" style={{ maxWidth: "420px" }}>

              <div className="as-modal-header">
                <h2>Update Record Status</h2>
                <button
                  className="as-modal-close"
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusData(null);
                  }}
                >
                  &times;
                </button>
              </div>

              <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left" }}>

                <div className="admin-details">
                  <p><strong>Full Name:</strong> {statusData.fullName}</p>
                  <p><strong>Household ID:</strong> {statusData.householdId}</p>
                  <p style={{ fontSize: "0.8rem", color: "#888" }}>
                    Setting as: <strong>{adminProfile.fullName}</strong>
                    {adminProfile.position ? ` · ${adminProfile.position}` : ""}
                  </p>
                </div>

                <div style={{ marginTop: "15px" }}>

                  <label className="hm-label">Status</label>
                  <select
                    className="hm-input"
                    value={statusData.status}
                    onChange={(e) =>
                      setStatusData({ ...statusData, status: e.target.value })
                    }
                  >
                    <option>Clear Case</option>
                    <option>Pending Case</option>
                    <option>Violation</option>
                  </select>

                  <label className="hm-label">Remarks</label>
                  <textarea
                    className="hm-textarea"
                    placeholder="Enter remarks..."
                    value={statusData.remarks}
                    onChange={(e) => {
                      setStatusData({ ...statusData, remarks: e.target.value });
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                  />

                  <label className="hm-label">Incident Description</label>
                  <textarea
                    className="hm-textarea hm-textarea-large"
                    placeholder="Enter incident details..."
                    value={statusData.incident}
                    onChange={(e) => {
                      setStatusData({ ...statusData, incident: e.target.value });
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                  />
                </div>
              </div>

              <div className="modal-actions hm-status-actions">
                <button className="approve-btn" onClick={handleSaveStatus}>
                  Save Changes
                </button>
                <button className="reject-btn" onClick={() => { setShowStatusModal(false); setStatusData(null); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= HH REQUEST VIEW MODAL ================= */}
        {showHhViewModal && selectedHhRequest && (
          <div className="as-modal-overlay">
            <div className="as-modal-content" style={{ maxWidth: "420px" }}>

              <div className="as-modal-header">
                <h2>Household Request Details</h2>
                <button
                  className="as-modal-close"
                  onClick={() => {
                    setShowHhViewModal(false);
                    setSelectedHhRequest(null);
                  }}
                >
                  &times;
                </button>
              </div>

              <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left" }}>
                <div className="admin-details">
                  <p><strong>Full Name:</strong> {selectedHhRequest.fullName}</p>
                  <p><strong>Birth Date:</strong> {selectedHhRequest.birthDate}</p>
                  <p><strong>Sex:</strong> {selectedHhRequest.sex}</p>
                  <p><strong>Civil Status:</strong> {selectedHhRequest.civilStatus}</p>
                  <p><strong>Address:</strong> {selectedHhRequest.address}</p>
                  <p><strong>Contact Number:</strong> {selectedHhRequest.contactNumber}</p>
                  <p><strong>Email:</strong> {selectedHhRequest.email}</p>
                  <p><strong>Category:</strong> {selectedHhRequest.category && selectedHhRequest.category.join(", ")}</p>
                  <p><strong>Education:</strong> {selectedHhRequest.educationAttainment}</p>
                  <p><strong>Employment:</strong> {selectedHhRequest.employmentStatus}</p>
                  <p><strong>Total Members:</strong> {selectedHhRequest.totalMembers}</p>
                  <p><strong>Date Submitted:</strong> {selectedHhRequest.dateSubmitted}</p>
                  <p>
                    <strong>Status:</strong><br />
                    <span className={`status-badge status-${selectedHhRequest.status}`}>
                      {selectedHhRequest.status.charAt(0).toUpperCase() + selectedHhRequest.status.slice(1)}
                    </span>
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= HH APPROVE MODAL ================= */}
        {showHhApproveModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3 className="modal-title">Approve Resident Registration</h3>

              <p style={{ fontSize: "0.85rem", textAlign: "center" }}>
                Approving will create a Household ID and email the resident. They will appear in the Account Management tab.
              </p>

              <div className="modal-actions">
                <button className="approve-btn" onClick={handleHhApprove}>
                  Confirm Approval
                </button>
                <button
                  className="reject-btn"
                  onClick={() => {
                    setShowHhApproveModal(false);
                    setSelectedHhRequest(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= HH REJECT MODAL ================= */}
        {showHhRejectModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3 className="modal-title">Confirm Rejection</h3>

              <p style={{ fontSize: "0.85rem", textAlign: "center" }}>
                Are you sure you want to reject this resident registration? This will delete the request permanently.
              </p>

              <div className="modal-actions">
                <button className="reject-btn" onClick={handleHhReject}>
                  Reject
                </button>
                <button
                  className="approve-btn"
                  onClick={() => {
                    setShowHhRejectModal(false);
                    setSelectedHhRequest(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}