import { useState, useEffect } from "react";
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";

export default function HouseholdManagement() {

  // ================= MOCK DATA =================
  const [residents, setResidents] = useState([
    { id: 1, fullName: "Juan Dela Cruz", householdId: "HH-001", category: ["Student"], address: "Blk 1 Lot 2 Malanday", birthDate: "Jan 1, 2000", sex: "Male", civilStatus: "Single", education: "College", employment: "Unemployed", members: 4, status: "Clear Case", remarks: "", incident: ""},
    { id: 2, fullName: "Maria Santos", householdId: "HH-002", category: ["PWD"], address: "Blk 3 Lot 5 Malanday", birthDate: "Feb 2, 1995", sex: "Female", civilStatus: "Married", education: "High School", employment: "Employed", members: 5, status: "Pending Case", remarks: "Under review", incident: "Noise complaint"}
  ]);

  const [hhRequests, setHhRequests] = useState([
    { id: 1, fullName: "Pedro Reyes", householdId: "HH-003", address: "Blk 2 Lot 3 Malanday", category: ["Student"], members: 3, dateSubmitted: "March 28, 2026", status: "pending", birthDate: "Mar 10, 1998", sex: "Male", civilStatus: "Single", education: "College", employment: "Unemployed" },
    { id: 2, fullName: "Ana Rivera", householdId: "HH-004", address: "Blk 5 Lot 1 Malanday", category: ["Senior Citizen"], members: 2, dateSubmitted: "March 27, 2026", status: "pending", birthDate: "Jun 5, 1950", sex: "Female", civilStatus: "Widowed", education: "High School", employment: "Retired" },
    { id: 3, fullName: "Carlo Bautista", householdId: "HH-005", address: "Blk 7 Lot 9 Malanday", category: ["Solo Parent"], members: 4, dateSubmitted: "March 25, 2026", status: "pending", birthDate: "Aug 22, 1990", sex: "Male", civilStatus: "Separated", education: "Vocational", employment: "Employed" },
    { id: 4, fullName: "Liza Gomez", householdId: "HH-006", address: "Blk 4 Lot 2 Malanday", category: ["PWD"], members: 5, dateSubmitted: "March 20, 2026", status: "pending", birthDate: "Dec 1, 1985", sex: "Female", civilStatus: "Married", education: "College", employment: "Unemployed" },
  ]);

  // ================= STATE =================
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
  const handleHhApprove = () => {
    if (!selectedHhRequest) return;

    const newResident = {
      id: Date.now(),
      fullName: selectedHhRequest.fullName,
      householdId: selectedHhRequest.householdId,
      category: selectedHhRequest.category,
      address: selectedHhRequest.address,
      birthDate: selectedHhRequest.birthDate,
      sex: selectedHhRequest.sex,
      civilStatus: selectedHhRequest.civilStatus,
      education: selectedHhRequest.education,
      employment: selectedHhRequest.employment,
      members: selectedHhRequest.members,
      status: "Clear Case",
      remarks: "",
      incident: "",
    };

    setResidents(prev => [...prev, newResident]);

    setHhRequests(prev =>
      prev.map(r =>
        r.id === selectedHhRequest.id ? { ...r, status: "approved" } : r
      )
    );

    setSelectedHhRequest(null);
    setShowHhApproveModal(false);
  };

  const handleHhReject = () => {
    if (!selectedHhRequest) return;

    setHhRequests(prev =>
      prev.map(r =>
        r.id === selectedHhRequest.id ? { ...r, status: "rejected" } : r
      )
    );

    setSelectedHhRequest(null);
    setShowHhRejectModal(false);
  };

  // ================= RESIDENT FILTERS =================
  const filteredResidents = residents.filter(r => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      r.fullName.toLowerCase().includes(searchText) ||
      r.householdId.toLowerCase().includes(searchText);

    const matchesCategory =
      filterCategory === "All" || r.category.includes(filterCategory);

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

  // ================= SAVE STATUS =================
  const handleSaveStatus = () => {
    setResidents(prev =>
      prev.map(r =>
        r.id === selectedResident.id ? selectedResident : r
      )
    );
    setShowResidentModal(false);
    setSelectedResident(null);
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

              {/* CONTROLS — always visible */}
              <div className="table-controls">
                <input
                  type="text"
                  placeholder="Search name or household ID..."
                  value={searchHhRequest}
                  onChange={(e) => setSearchHhRequest(e.target.value)}
                />
                <select
                  value={filterHhStatus}
                  onChange={(e) => setFilterHhStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* TABLE */}
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Household ID</th>
                    <th>Category</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedHhRequests.length > 0 ? (
                    paginatedHhRequests.map((req) => (
                      <tr key={req.id}>
                        <td>{req.fullName}</td>
                        <td>{req.householdId}</td>
                        <td>{req.category.join(", ")}</td>
                        <td>{req.dateSubmitted}</td>
                        <td>
                          <span className={`status-badge status-${req.status}`}>
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                        </td>
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
                      <td colSpan={6} style={{ textAlign: "center", padding: "16px" }}>
                        No results found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* PAGINATION */}
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

              {/* CONTROLS — always visible */}
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
                  <option value="PWD">PWD</option>
                  <option value="Solo Parent">Solo Parent</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Clear Case">Clear Case</option>
                  <option value="Pending Case">Pending Case</option>
                  <option value="Violation">Violation</option>
                </select>
              </div>

              {/* TABLE */}
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
                        <td>{res.category.join(", ")}</td>
                        <td>
                          <span className={`status-badge status-${res.status.toLowerCase().replace(" ", "")}`}>
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
                            <button
                              className="update-btn"
                              onClick={() => {
                                setStatusData({ ...res });
                                setShowStatusModal(true);
                              }}
                            >
                              Update Status
                            </button>
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

              {/* PAGINATION */}
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

              <div
                className="as-modal-body"
                style={{ alignItems: "stretch", textAlign: "left" }}
              >
                <div className="admin-details">
                  <p><strong>Full Name:</strong> {selectedResident.fullName}</p>
                  <p><strong>Birth Date:</strong> {selectedResident.birthDate}</p>
                  <p><strong>Sex:</strong> {selectedResident.sex}</p>
                  <p><strong>Civil Status:</strong> {selectedResident.civilStatus}</p>
                  <p><strong>Address:</strong> {selectedResident.address}</p>
                  <p><strong>Category:</strong> {selectedResident.category.join(", ")}</p>
                  <p><strong>Education:</strong> {selectedResident.education}</p>
                  <p><strong>Employment:</strong> {selectedResident.employment}</p>
                  <p><strong>Household ID:</strong> {selectedResident.householdId}</p>
                  <p><strong>Members:</strong> {selectedResident.members}</p>
                  <p>
                    <strong>Status:</strong><br />
                    <span
                      className={`status-badge status-${selectedResident.status
                        .toLowerCase()
                        .replace(" ", "")}`}
                    >
                      {selectedResident.status}
                    </span>
                  </p>
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

              <div
                className="as-modal-body"
                style={{ alignItems: "stretch", textAlign: "left" }}
              >

                <div className="admin-details">
                  <p><strong>Full Name:</strong> {statusData.fullName}</p>
                  <p><strong>Household ID:</strong> {statusData.householdId}</p>
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
                <button
                  className="approve-btn"
                  onClick={() => {
                    setResidents(prev =>
                      prev.map(r =>
                        r.id === statusData.id ? statusData : r
                      )
                    );
                    setShowStatusModal(false);
                    setStatusData(null);
                  }}
                >
                  Save Changes
                </button>

                <button
                  className="reject-btn"
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusData(null);
                  }}
                >
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

              <div
                className="as-modal-body"
                style={{ alignItems: "stretch", textAlign: "left" }}
              >
                <div className="admin-details">
                  <p><strong>Full Name:</strong> {selectedHhRequest.fullName}</p>
                  <p><strong>Birth Date:</strong> {selectedHhRequest.birthDate}</p>
                  <p><strong>Sex:</strong> {selectedHhRequest.sex}</p>
                  <p><strong>Civil Status:</strong> {selectedHhRequest.civilStatus}</p>
                  <p><strong>Address:</strong> {selectedHhRequest.address}</p>
                  <p><strong>Category:</strong> {selectedHhRequest.category.join(", ")}</p>
                  <p><strong>Education:</strong> {selectedHhRequest.education}</p>
                  <p><strong>Employment:</strong> {selectedHhRequest.employment}</p>
                  <p><strong>Household ID:</strong> {selectedHhRequest.householdId}</p>
                  <p><strong>Members:</strong> {selectedHhRequest.members}</p>
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
                Approving will add this resident to the Resident Account Management list.
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
                Are you sure you want to reject this resident registration?
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