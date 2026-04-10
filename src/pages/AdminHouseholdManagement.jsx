import { useState, useEffect, useMemo } from "react";
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
  const defaultRows = 10;

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

  useEffect(() => {
    let latestActive = [];
    let latestPending = [];

    const merge = () => {

      const seen = new Set();
      const deduped = latestActive.filter(r => {
        const key = `${r.householdId}__${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      // pendingHeads only exist when activated===false, so they
      // cannot overlap with any active resident doc. Just append.
      setResidents([...deduped, ...latestPending]);
    };

    // Listener 1: all activated residents (households/{id}/residents/*)
    const unsubResidents = onSnapshot(collectionGroup(db, "residents"), (snap) => {
      latestActive = snap.docs.map(docSnap => {
        const data = docSnap.data();
        const householdId = docSnap.ref.parent.parent?.id || "Unknown";
        return {
          ...data,
          id: docSnap.id,
          householdId,
          fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          category: Array.isArray(data.categories) ? data.categories
            : Array.isArray(data.category) ? data.category
              : typeof data.category === "string" && data.category ? [data.category]
                : [],
          address: data.houseNumber
            ? `${data.houseNumber} ${data.street || ""}, ${data.barangay || ""}`
            : "Shared Household Address",
          status: data.adminStatus || "Clear Case",
          remarks: data.adminRemarks || "",
          incident: data.adminIncident || "",
          statusHistory: data.statusHistory || [],
        };
      });
      merge();
    });

    // Listener 2: households not yet activated (pending heads)
    const unsubHouseholds = onSnapshot(collection(db, "households"), (snap) => {
      latestPending = [];
      snap.docs.forEach(hhDoc => {
        const hhData = hhDoc.data();
        if (hhData.activated === false && hhData._pendingHeadData) {
          const head = hhData._pendingHeadData;
          latestPending.push({
            ...head,
            id: `unactivated-${hhDoc.id}`,
            householdId: hhDoc.id,
            fullName: `${head.firstName || ""} ${head.lastName || ""}`.trim(),
            category: Array.isArray(head.categories) ? head.categories
              : Array.isArray(head.category) ? head.category
                : typeof head.category === "string" && head.category ? [head.category]
                  : [],
            address: hhData.houseNumber
              ? `${hhData.houseNumber} ${hhData.street || ""}, ${hhData.barangay || ""}`
              : "",
            status: "Pending Activation",
            isPendingActivation: true,
            statusHistory: [],
          });
        }
      });
      merge();
    });

    return () => {
      unsubResidents();
      unsubHouseholds();
    };
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
  const filteredResidents = useMemo(() => {
    const seenKeys = new Set();
    const unique = residents.filter(r => {
      const key = `${r.householdId}__${r.id}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    return unique.filter(r => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        r.fullName.toLowerCase().includes(searchText) ||
        (r.householdId || "").toLowerCase().includes(searchText);

      const matchesCategory =
        filterCategory === "All" ||
        (Array.isArray(r.category) && r.category.some(cat => {
          // strip emoji / non-word chars and compare
          const cleaned = cat.replace(/[^\w\s]/g, "").trim();
          return cleaned.toLowerCase().includes(filterCategory.toLowerCase());
        }));

      const matchesStatus =
        filterStatus === "All" ||
        (r.status || "").toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [residents, search, filterCategory, filterStatus]);

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
          <div style={{ marginBottom: "40px" }}>
            <div className="af-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="af-title" style={{ fontSize: '24px' }}>
                  Registration Requests
                </h2>
                <p className="af-subtitle">Pending approval ({filteredHhRequests.filter(r => r.status === "pending").length})</p>
              </div>
              {hhViewMode === "default" ? (
                <button className="af-view-btn" onClick={() => setHhViewMode("requests")}>See All Requests</button>
              ) : (
                <button className="af-view-btn" style={{ background: '#6b7280' }} onClick={() => { setHhViewMode("default"); setSearchHhRequest(""); setFilterHhStatus("All"); }}>Return</button>
              )}
            </div>

            <div className="af-controls">
              <div className="af-search-box">
                <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" placeholder="Search by name..." value={searchHhRequest} onChange={(e) => setSearchHhRequest(e.target.value)} />
              </div>
            </div>

            <div className="af-table-wrapper">
              <table className="af-table">
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th>Full Name</th>
                    <th>Household ID</th>
                    <th>Category</th>
                    <th>Date Submitted</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHhRequests.length > 0 ? (
                    paginatedHhRequests.map((req) => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 500 }}>{req.fullName}</td>
                        <td style={{ color: '#4b5563' }}>{req.householdId}</td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {req.category && req.category.map((c, i) => (
                              <span key={i} style={{ fontSize: '0.75rem', background: '#e5e7eb', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>{c}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ color: '#6b7280' }}>{req.dateSubmitted}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="as-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setSelectedHhRequest(req); setShowHhViewModal(true); }}>View</button>
                            {req.status === "pending" && (
                              <>
                                <button className="as-btn-aqua" style={{ background: '#0d7a55', padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setSelectedHhRequest(req); setShowHhApproveModal(true); }}>Approve</button>
                                <button className="as-btn-aqua" style={{ background: '#ef4444', padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setSelectedHhRequest(req); setShowHhRejectModal(true); }}>Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>No pending requests found.</td></tr>
                  )}
                </tbody>
              </table>

              {hhViewMode === "requests" && totalHhRequestPages > 1 && (
                <div className="af-pagination">
                  <button className="af-page-btn" disabled={hhRequestPage === 1} onClick={() => setHhRequestPage(prev => prev - 1)}>Prev</button>
                  <span style={{ margin: '0 8px', alignSelf: 'center', fontSize: '0.9rem', color: '#4b5563' }}>Page {hhRequestPage} of {totalHhRequestPages}</span>
                  <button className="af-page-btn" disabled={hhRequestPage === totalHhRequestPages} onClick={() => setHhRequestPage(prev => prev + 1)}>Next</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= REGISTERED RESIDENTS ================= */}
        {(residentViewMode === "default" || residentViewMode === "residents") && hhViewMode === "default" && (
          <div style={{ marginBottom: "40px" }}>
            <div className="af-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="af-title" style={{ fontSize: '24px' }}>Resident Account Management</h2>
                <p className="af-subtitle">Manage approved residents and update their status</p>
              </div>
              {residentViewMode === "default" ? (
                <button className="af-view-btn" onClick={() => setResidentViewMode("residents")}>See All Residents</button>
              ) : (
                <button className="af-view-btn" style={{ background: '#6b7280' }} onClick={() => { setResidentViewMode("default"); setSearch(""); setFilterCategory("All"); setFilterStatus("All"); }}>Return</button>
              )}
            </div>

            <div className="af-controls">
              <div className="af-filters" style={{ flexGrow: 1, gap: '16px' }}>
                <div className="af-search-box" style={{ maxWidth: '350px' }}>
                  <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  <input type="text" placeholder="Search name or household ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className="af-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="All">All Categories</option>
                  <option value="Student">Student</option>
                  <option value="Senior Citizen">Senior Citizen</option>
                  <option value="Solo Parent">Solo Parent</option>
                  <option value="OFW">OFW</option>
                  <option value="LGBT">LGBT</option>
                  <option value="Indigenous">Indigenous</option>
                  <option value="PWD">PWD</option>
                </select>
                <select className="af-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="All">All Status</option>
                  <option value="Clear Case">Clear Case</option>
                  <option value="Pending Case">Pending Case</option>
                  <option value="Violation">Violation</option>
                  <option value="Pending Activation">Pending Activation</option>
                </select>
              </div>
            </div>

            <div className="af-table-wrapper">
              <table className="af-table">
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th>Full Name</th>
                    <th>Household ID</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResidents.length > 0 ? (
                    paginatedResidents.map((res) => (
                      <tr key={`${res.householdId}__${res.id}`}>
                        <td style={{ fontWeight: 500 }}>{res.fullName}</td>
                        <td style={{ color: '#4b5563' }}>{res.householdId}</td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {res.category && res.category.map((c, i) => (
                              <span key={i} style={{ fontSize: '0.75rem', background: '#e5e7eb', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>{c}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${res.status.toLowerCase().replace(/\s+/g, "")}`} style={{
                            padding: '4px 10px', fontSize: '0.8rem', borderRadius: '12px', fontWeight: 600, display: 'inline-block',
                            background: res.status === 'Clear Case' ? '#dcfce7' : res.status === 'Pending Case' ? '#fef3c7' : res.status === 'Violation' ? '#fee2e2' : '#e5e7eb',
                            color: res.status === 'Clear Case' ? '#166534' : res.status === 'Pending Case' ? '#92400e' : res.status === 'Violation' ? '#991b1b' : '#374151'
                          }}>
                            {res.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="as-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setSelectedResident(res); setShowResidentModal(true); }}>View Profile</button>
                            {!res.isPendingActivation && (
                              <button className="as-btn-aqua" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#eab308', color: 'white', borderColor: '#eab308' }} onClick={() => { setStatusData({ ...res }); setShowStatusModal(true); }}>Update Status</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>No results found.</td></tr>
                  )}
                </tbody>
              </table>

              {residentViewMode === "residents" && totalPages > 1 && (
                <div className="af-pagination">
                  <button className="af-page-btn" disabled={page === 1} onClick={() => setPage(prev => prev - 1)}>Prev</button>
                  <span style={{ margin: '0 8px', alignSelf: 'center', fontSize: '0.9rem', color: '#4b5563' }}>Page {page} of {totalPages}</span>
                  <button className="af-page-btn" disabled={page === totalPages} onClick={() => setPage(prev => prev + 1)}>Next</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= RESIDENT DETAILS MODAL ================= */}
        {showResidentModal && selectedResident && (
          <div className="as-modal-overlay">
            <div className="as-modal-content" style={{ maxWidth: "600px" }}>

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

              <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left", maxHeight: "70vh", overflowY: "auto" }}>
                <div className="admin-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', fontSize: '0.9rem' }}>
                  <div style={{ gridColumn: '1 / -1', paddingBottom: '10px', borderBottom: '1px solid #eee', marginBottom: '4px' }}>
                    <strong>Household ID:</strong> {selectedResident.householdId}<br />
                    <div style={{ marginTop: '8px' }}>
                      <strong>Status:</strong> <span className={`status-badge status-${selectedResident.status.toLowerCase().replace(/\s+/g, "")}`}>{selectedResident.status}</span>
                    </div>
                  </div>
                  <div><strong>Full Name:</strong><br />{selectedResident.fullName}</div>
                  <div><strong>Contact No:</strong><br />{selectedResident.contactNumber || "N/A"}</div>
                  <div><strong>Email:</strong><br />{selectedResident.email || "N/A"}</div>
                  <div><strong>Birth Date:</strong><br />{selectedResident.birthDate} {selectedResident.age ? `(${selectedResident.age} yrs)` : ""}</div>
                  <div><strong>Birth Place:</strong><br />{selectedResident.birthPlace || "N/A"}</div>
                  <div><strong>Sex:</strong><br />{selectedResident.sex}</div>
                  <div><strong>Civil Status:</strong><br />{selectedResident.civilStatus}</div>
                  <div><strong>Religion:</strong><br />{selectedResident.religion || "N/A"}</div>
                  <div><strong>Citizenship:</strong><br />{selectedResident.citizenship || "N/A"}</div>
                  <div style={{ gridColumn: '1 / -1', paddingTop: '10px', borderTop: '1px solid #eee' }}><strong>Address:</strong><br />{selectedResident.address}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>Category:</strong><br />{selectedResident.category && selectedResident.category.length > 0 ? selectedResident.category.join(", ") : "None"}</div>
                  {selectedResident.pwdStatus && <div><strong>PWD Status:</strong><br />{selectedResident.pwdStatus}</div>}
                  {selectedResident.disabilityType && <div><strong>Disability Type:</strong><br />{selectedResident.disabilityType}</div>}
                  <div style={{ gridColumn: '1 / -1', paddingTop: '10px', borderTop: '1px solid #eee', marginTop: '-4px' }}></div>
                  <div><strong>Education:</strong><br />{selectedResident.educationAttainment || selectedResident.education || "N/A"}</div>
                  <div><strong>Ed. Status:</strong><br />{selectedResident.educationStatus || "N/A"}</div>
                  <div><strong>Employment:</strong><br />{selectedResident.employmentStatus || selectedResident.employment || "N/A"}</div>
                  <div><strong>Occupation:</strong><br />{selectedResident.occupation || "N/A"}</div>
                  <div><strong>Total Members:</strong><br />{selectedResident.totalMembers || selectedResident.members || "N/A"}</div>
                  <div><strong>Household Class.:</strong><br />{selectedResident.householdClassification || "N/A"}</div>

                  {(selectedResident.remarks || selectedResident.incident) && (
                    <div style={{ gridColumn: '1 / -1', paddingTop: '10px', borderTop: '1px solid #eee', color: '#b91c1c' }}>
                      {selectedResident.remarks && <div style={{ marginBottom: '8px' }}><strong>Remarks:</strong><br />{selectedResident.remarks}</div>}
                      {selectedResident.incident && <div><strong>Incident Details:</strong><br />{selectedResident.incident}</div>}
                    </div>
                  )}
                  {selectedResident.adminLastUpdatedBy && (
                    <div style={{ gridColumn: '1 / -1', fontSize: "0.8rem", color: "#888", marginTop: "8px" }}>
                      Last updated by <strong>{selectedResident.adminLastUpdatedBy}</strong>
                      {selectedResident.adminLastUpdatedByPosition ? ` (${selectedResident.adminLastUpdatedByPosition})` : ""}
                    </div>
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
            <div className="as-modal-content" style={{ maxWidth: "600px" }}>

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

              <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left", maxHeight: "70vh", overflowY: "auto" }}>
                <div className="admin-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', fontSize: '0.9rem' }}>
                  <div style={{ gridColumn: '1 / -1', paddingBottom: '10px', borderBottom: '1px solid #eee', marginBottom: '4px' }}>
                    <strong>Date Submitted:</strong> {selectedHhRequest.dateSubmitted}<br />
                    <div style={{ marginTop: '8px' }}>
                      <strong>Status:</strong> <span className={`status-badge status-${selectedHhRequest.status}`}>
                        {selectedHhRequest.status.charAt(0).toUpperCase() + selectedHhRequest.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div><strong>Full Name:</strong><br />{selectedHhRequest.fullName}</div>
                  <div><strong>Contact No:</strong><br />{selectedHhRequest.contactNumber || "N/A"}</div>
                  <div><strong>Email:</strong><br />{selectedHhRequest.email || "N/A"}</div>
                  <div><strong>Birth Date:</strong><br />{selectedHhRequest.birthDate} {selectedHhRequest.age ? `(${selectedHhRequest.age} yrs)` : ""}</div>
                  <div><strong>Birth Place:</strong><br />{selectedHhRequest.birthPlace || "N/A"}</div>
                  <div><strong>Sex:</strong><br />{selectedHhRequest.sex}</div>
                  <div><strong>Civil Status:</strong><br />{selectedHhRequest.civilStatus}</div>
                  <div><strong>Religion:</strong><br />{selectedHhRequest.religion || "N/A"}</div>
                  <div><strong>Citizenship:</strong><br />{selectedHhRequest.citizenship || "N/A"}</div>
                  <div style={{ gridColumn: '1 / -1', paddingTop: '10px', borderTop: '1px solid #eee' }}><strong>Address:</strong><br />{selectedHhRequest.address}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>Category:</strong><br />{selectedHhRequest.category && selectedHhRequest.category.length > 0 ? selectedHhRequest.category.join(", ") : "None"}</div>
                  {selectedHhRequest.pwdStatus && <div><strong>PWD Status:</strong><br />{selectedHhRequest.pwdStatus}</div>}
                  {selectedHhRequest.disabilityType && <div><strong>Disability Type:</strong><br />{selectedHhRequest.disabilityType}</div>}
                  <div style={{ gridColumn: '1 / -1', paddingTop: '10px', borderTop: '1px solid #eee', marginTop: '-4px' }}></div>
                  <div><strong>Education:</strong><br />{selectedHhRequest.educationAttainment || "N/A"}</div>
                  <div><strong>Ed. Status:</strong><br />{selectedHhRequest.educationStatus || "N/A"}</div>
                  <div><strong>Employment:</strong><br />{selectedHhRequest.employmentStatus || "N/A"}</div>
                  <div><strong>Occupation:</strong><br />{selectedHhRequest.occupation || "N/A"}</div>
                  <div><strong>Total Members:</strong><br />{selectedHhRequest.totalMembers || "N/A"}</div>
                  <div><strong>Household Class.:</strong><br />{selectedHhRequest.householdClassification || "N/A"}</div>
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