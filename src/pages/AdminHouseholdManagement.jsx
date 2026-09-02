import { useState, useEffect, useMemo } from "react";
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../services/logger";
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
  orderBy,
  limit
} from "firebase/firestore";
import { approveRegistration } from "../services/admin";
import { createUserNotification } from "../services/userNotifications";
import { Search } from "lucide-react";
import { formatDisplayEmail } from "../utils/maskEmail";
import { getFamilyNumber } from "../utils/householdNumbers";

export default function HouseholdManagement() {
  const [residents, setResidents] = useState([]);
  const [hhRequests, setHhRequests] = useState([]);

  const [activeTab, setActiveTab] = useState("requests");

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortResident, setSortResident] = useState("name_asc");

  const [selectedResident, setSelectedResident] = useState(null);
  const [showResidentModal, setShowResidentModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState(null);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [hhRowsPerPage, setHhRowsPerPage] = useState(10);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusData, setStatusData] = useState(null);

  const [hhRequestPage, setHhRequestPage] = useState(1);
  const [searchHhRequest, setSearchHhRequest] = useState("");
  const [filterHhStatus, setFilterHhStatus] = useState("All");
  const [sortHhRequest, setSortHhRequest] = useState("date_desc");
  const [selectedHhRequest, setSelectedHhRequest] = useState(null);
  const [showHhViewModal, setShowHhViewModal] = useState(false);
  const [showHhApproveModal, setShowHhApproveModal] = useState(false);
  const [showHhRejectModal, setShowHhRejectModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [adminProfile, setAdminProfile] = useState({ fullName: "Admin", position: "" });

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

  useEffect(() => {
    const pendingQuery = query(
      collection(db, "pending_registrations"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(pendingQuery, (snapshot) => {
      const requests = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          householdId: "Pending",
          fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          category: data.categories || (data.category ? [data.category] : []),
          address: `${data.houseNumber || ""} ${data.street || ""}, ${data.barangay || ""}`.trim(),
          dateSubmitted: data.createdAt ? data.createdAt.toDate().toLocaleDateString() : "N/A",
          rawDate: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : 0,
          status: data.status || "pending",
          ...data,
          email: formatDisplayEmail(data.email, adminRole)
        };
      });
      setHhRequests(requests);
    });
    return () => unsub();
  }, [adminRole]);

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
      setResidents([...deduped, ...latestPending]);
    };

    const residentsQuery = query(
      collectionGroup(db, "residents"),
      limit(300) 
    );

    const unsubResidents = onSnapshot(residentsQuery, (snap) => {
      latestActive = snap.docs.map(docSnap => {
        const data = docSnap.data();
        const householdId = docSnap.ref.parent.parent?.id || "Unknown";
        const effectiveBranchID = data.branchID || "BR-001";
        return {
          ...data,
          id: docSnap.id,
          householdId,
          familyNumber: getFamilyNumber(householdId, effectiveBranchID),
          fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          email: formatDisplayEmail(data.email, adminRole),
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
          rawDate: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : 0,
        };
      });
      merge();
    });

    const householdsQuery = query(
      collection(db, "households"),
      limit(300)
    );

    const unsubHouseholds = onSnapshot(householdsQuery, (snap) => {
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
            email: formatDisplayEmail(head.email, adminRole),
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
            rawDate: hhData.createdAt?.toDate ? hhData.createdAt.toDate().getTime() : 0,
          });
        }
      });
      merge();
    });

    return () => {
      unsubResidents();
      unsubHouseholds();
    };
  }, [adminRole]);

  const filteredHhRequests = useMemo(() => {
    return hhRequests
      .filter((req) => {
        const searchText = searchHhRequest.toLowerCase();
        const matchesSearch =
          req.fullName.toLowerCase().includes(searchText) ||
          (req.householdId || "").toLowerCase().includes(searchText) ||
          (req.familyId || "").toLowerCase().includes(searchText);
        const matchesStatus =
          filterHhStatus === "All" || req.status === filterHhStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortHhRequest === "date_desc") {
          return (b.rawDate || 0) - (a.rawDate || 0);
        }
        if (sortHhRequest === "date_asc") {
          return (a.rawDate || 0) - (b.rawDate || 0);
        }
        if (sortHhRequest === "name_asc") {
          return a.fullName.localeCompare(b.fullName);
        }
        if (sortHhRequest === "name_desc") {
          return b.fullName.localeCompare(a.fullName);
        }
        return 0;
      });
  }, [hhRequests, searchHhRequest, filterHhStatus, sortHhRequest]);

  const totalHhRequestPages = Math.ceil(filteredHhRequests.length / hhRowsPerPage);
  const hhStartIndex = (hhRequestPage - 1) * hhRowsPerPage;
  const paginatedHhRequests = filteredHhRequests.slice(hhStartIndex, hhStartIndex + hhRowsPerPage);

  useEffect(() => {
    setHhRequestPage(1);
  }, [searchHhRequest, filterHhStatus, sortHhRequest, hhRowsPerPage]);

  const handleHhApprove = async () => {
    if (!selectedHhRequest) return;
    if (isApproving) return;
    setIsApproving(true);
    try {
      await approveRegistration(selectedHhRequest.id);
      setSelectedHhRequest(null);
      setShowHhApproveModal(false);
      logTransaction(
        adminName,
        adminRole,
        "Approved Registration",
        `Approved household registration for ${selectedHhRequest.fullName} (Household ID: ${selectedHhRequest.householdId})`
      );
      alert("Registration approved successfully. An email has been sent to the head.");
    } catch (error) {
      console.error("Error approving registration:", error);
      logTransaction(
        adminName,
        adminRole,
        "Failed to Approve Registration",
        `Failed to approve household registration for ${selectedHhRequest.fullName} (Household ID: ${selectedHhRequest.householdId}). Error: ${error.message}`
      );
      alert("Error approving registration: " + error.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleHhReject = async () => {
    if (!selectedHhRequest) return;
    try {
      await deleteDoc(doc(db, "pending_registrations", selectedHhRequest.id));
      logTransaction(
        adminName,
        adminRole,
        "Rejected Registration",
        `Rejected household registration for ${selectedHhRequest.fullName} (Household ID: ${selectedHhRequest.householdId})`
      );
      setSelectedHhRequest(null);
      setShowHhRejectModal(false);
    } catch (error) {
      console.error("Error rejecting registration:", error);
      logTransaction(
        adminName,
        adminRole,
        "Failed to Reject Registration",
        `Failed to reject household registration for ${selectedHhRequest.fullName} (Household ID: ${selectedHhRequest.householdId}). Error: ${error.message}`
      );
      alert("Error rejecting registration: " + error.message);
    }
  };

  const handleDeleteResident = async () => {
    if (!residentToDelete) return;
    try {
      if (residentToDelete.isPendingActivation) {
        await deleteDoc(doc(db, "households", residentToDelete.householdId));
        logTransaction(
          adminName,
          adminRole,
          "Deleted Unactivated Household",
          `Deleted unactivated household with ID: ${residentToDelete.householdId} (Head: ${residentToDelete.fullName})`
        );
      } else {
        const residentsQuery = query(collection(db, "households", residentToDelete.householdId, "residents"));
        const residentsSnapshot = await getDocs(residentsQuery);

        await deleteDoc(doc(db, "households", residentToDelete.householdId, "residents", residentToDelete.id));

        logTransaction(
          adminName,
          adminRole,
          "Deleted Resident",
          `Deleted resident ${residentToDelete.fullName} (ID: ${residentToDelete.id}) from household ${residentToDelete.householdId}`
        );
        if (residentsSnapshot.size <= 1) {
          await deleteDoc(doc(db, "households", residentToDelete.householdId));
        }
      }
      setShowDeleteModal(false);
      setResidentToDelete(null);
      alert("Resident deleted successfully.");
    } catch (error) {
      console.error("Error deleting resident:", error);
      logTransaction(
        adminName,
        adminRole,
        "Failed to Delete Resident",
        `Failed to delete resident ${residentToDelete.fullName} (ID: ${residentToDelete.id}) from household ${residentToDelete.householdId}. Error: ${error.message}`
      );
      alert("Error deleting resident: " + error.message);
    }
  };

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
        (r.householdId || "").toLowerCase().includes(searchText) ||
        (r.familyId || "").toLowerCase().includes(searchText);

      const matchesCategory =
        filterCategory === "All" ||
        (Array.isArray(r.category) && r.category.some(cat => {
          const cleaned = cat.replace(/[^\w\s]/g, "").trim();
          return cleaned.toLowerCase().includes(filterCategory.toLowerCase());
        }));

      const matchesStatus =
        filterStatus === "All" ||
        (r.status || "").toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => {
      if (sortResident === "name_asc") {
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortResident === "name_desc") {
        return b.fullName.localeCompare(a.fullName);
      }
      if (sortResident === "id_asc") {
        return (a.householdId || "").localeCompare(b.householdId || "");
      }
      if (sortResident === "id_desc") {
        return (b.householdId || "").localeCompare(a.householdId || "");
      }
      return 0;
    });
  }, [residents, search, filterCategory, filterStatus, sortResident]);

  const totalPages = Math.ceil(filteredResidents.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const paginatedResidents = filteredResidents.slice(startIndex, startIndex + rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterStatus, sortResident, rowsPerPage]);

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

  const handleSaveStatus = async () => {
    if (!statusData) return;

    if (statusData.isPendingActivation) {
      alert("Cannot update status of accounts that are pending activation. Wait for the user to activate their profile.");
      return;
    }

    try {
      const residentRef = doc(db, "households", statusData.householdId, "residents", statusData.id);

      const historyEntry = {
        status: statusData.status,
        remarks: statusData.remarks || "",
        incident: statusData.incident || "",
        setBy: adminProfile.fullName,
        setByPosition: adminProfile.position,
        setAt: new Date().toISOString(),
      };

      await updateDoc(residentRef, {
        adminStatus: statusData.status,
        adminRemarks: statusData.remarks || "",
        adminIncident: statusData.incident || "",
        adminLastUpdatedBy: adminProfile.fullName,
        adminLastUpdatedByPosition: adminProfile.position,
        adminLastUpdatedAt: serverTimestamp(),
        statusHistory: arrayUnion(historyEntry),
      });

      const notifMsg = statusData.status === "Clear Case"
        ? "Your barangay status is now Clear."
        : `Your barangay status has been updated to: ${statusData.status}.`;
      await createUserNotification(statusData.householdId, statusData.id, "Status Update", notifMsg, "general");

      logTransaction(
        adminName,
        adminRole,
        "Updated Resident Status",
        `Updated status for resident ${statusData.fullName} (ID: ${statusData.id}) in household ${statusData.householdId} to "${statusData.status}". Remarks: "${statusData.remarks || "None"}". Incident: "${statusData.incident || "None"}".`
      );

      setShowStatusModal(false);
      setStatusData(null);
    } catch (error) {
      console.error("Error updating resident status:", error);
      logTransaction(
        adminName,
        adminRole,
        "Failed to Update Resident Status",
        `Failed to update status for resident ${statusData.fullName} (ID: ${statusData.id}) in household ${statusData.householdId}. Error: ${error.message}`
      );
      alert("Failed to update status.");
    }
  };

  return (
    <AdminLayout>
      <div className="requests-container">
        <div className="requests-header">
          <h1 className="requests-title">Household Management</h1>
          <p className="requests-subtitle">Manage household registration requests and resident records.</p>
        </div>

        <div className="req-tabs">
          <button
            className={`req-tab ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            Registration Requests
          </button>
          <button
            className={`req-tab ${activeTab === "residents" ? "active" : ""}`}
            onClick={() => setActiveTab("residents")}
          >
            Resident Accounts
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
                  placeholder="Search resident..."
                  className="search-input"
                  value={searchHhRequest}
                  onChange={(e) => setSearchHhRequest(e.target.value)}
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
                  value={filterHhStatus}
                  onChange={(e) => setFilterHhStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  className="filter-select"
                  value={sortHhRequest}
                  onChange={(e) => setSortHhRequest(e.target.value)}
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
                    <th>Household Number</th>
                    <th>Family Number</th>
                    <th>Category</th>
                    <th>Date Submitted</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHhRequests.length > 0 ? (
                    paginatedHhRequests.map((req) => (
                      <tr key={req.id}>
                        <td>{req.fullName}</td>
                        <td>{req.householdId}</td>
                        <td>{req.branchId ? getFamilyNumber(req.householdId, req.branchId) : "Pending"}</td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {req.category && req.category.map((c, i) => (
                              <span key={i} style={{ background: '#e5e7eb', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>{c}</span>
                            ))}
                          </div>
                        </td>
                        <td>{req.dateSubmitted}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="as-btn-ghost" style={{ padding: '6px 12px' }} onClick={() => { setSelectedHhRequest(req); setShowHhViewModal(true); }}>View</button>
                            {req.status === "pending" && (
                              <>
                                <button className="as-btn-aqua" style={{ background: '#0d7a55', padding: '6px 12px' }} onClick={() => { setSelectedHhRequest(req); setShowHhApproveModal(true); }}>Approve</button>
                                <button className="as-btn-aqua" style={{ background: '#ef4444', padding: '6px 12px' }} onClick={() => { setSelectedHhRequest(req); setShowHhRejectModal(true); }}>Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>No pending requests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredHhRequests.length > 0 && (
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
                    value={hhRowsPerPage}
                    onChange={(e) => setHhRowsPerPage(Number(e.target.value))}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {totalHhRequestPages > 1 && (
                  <div className="af-pagination" style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="af-page-btn"
                      onClick={() => setHhRequestPage(prev => Math.max(prev - 1, 1))}
                      disabled={hhRequestPage === 1}
                    >
                      Previous
                    </button>
                    {renderPageNumbers(hhRequestPage, totalHhRequestPages, setHhRequestPage)}
                    <button
                      className="af-page-btn"
                      onClick={() => setHhRequestPage(prev => Math.min(prev + 1, totalHhRequestPages))}
                      disabled={hhRequestPage === totalHhRequestPages}
                    >
                      Next
                    </button>
                  </div>
                )}

                <div style={{ color: '#64748b' }}>
                  Showing {hhStartIndex + 1} to{" "}
                  {Math.min(hhStartIndex + hhRowsPerPage, filteredHhRequests.length)} of{" "}
                  {filteredHhRequests.length}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "residents" && (
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
                  placeholder="Search resident..."
                  className="search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: "36px" }}
                />
              </div>

              <div className="filter-group"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "nowrap"
                }}>
                <select
                  className="filter-select"
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
                  className="filter-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Clear Case">Clear Case</option>
                  <option value="Pending Case">Pending Case</option>
                  <option value="Violation">Violation</option>
                  <option value="Pending Activation">Pending Activation</option>
                </select>

                <select
                  className="filter-select"
                  value={sortResident}
                  onChange={(e) => setSortResident(e.target.value)}
                >
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                  <option value="id_asc">Household ID: Ascending</option>
                  <option value="id_desc">Household ID: Descending</option>
                </select>
              </div>
            </div>

            <div className="req-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table className="req-table" style={{ minWidth: "850px" }}>
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Household Number</th>
                    <th>Family Number</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResidents.length > 0 ? (
                    paginatedResidents.map((res) => (
                      <tr key={`${res.householdId}__${res.id}`}>
                        <td>{res.fullName}</td>
                        <td>{res.householdId}</td>
                        <td>{res.familyNumber || getFamilyNumber(res.householdId, res.branchID)}</td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {res.category && res.category.map((c, i) => (
                              <span key={i} style={{ background: '#e5e7eb', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>{c}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${res.status.toLowerCase().replace(/\s+/g, "")}`} style={{
                            padding: '4px 10px', borderRadius: '12px', display: 'inline-block',
                            background: res.status === 'Clear Case' ? '#dcfce7' : res.status === 'Pending Case' ? '#fef3c7' : res.status === 'Violation' ? '#fee2e2' : '#e5e7eb',
                            color: res.status === 'Clear Case' ? '#166534' : res.status === 'Pending Case' ? '#92400e' : res.status === 'Violation' ? '#991b1b' : '#374151'
                          }}>
                            {res.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="as-btn-ghost" style={{ padding: '6px 12px' }} onClick={() => { setSelectedResident(res); setShowResidentModal(true); }}>View</button>
                            {!res.isPendingActivation && (
                              <button className="as-btn-aqua" style={{ padding: '6px 12px', background: '#eab308', color: 'white', borderColor: '#eab308' }} onClick={() => { setStatusData({ ...res }); setShowStatusModal(true); }}>Update Status</button>
                            )}
                            <button className="as-btn-aqua" style={{ padding: '6px 12px', background: '#ef4444', color: 'white', borderColor: '#ef4444' }} onClick={() => { setResidentToDelete(res); setShowDeleteModal(true); }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>No results found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredResidents.length > 0 && (
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
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {totalPages > 1 && (
                  <div className="af-pagination" style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="af-page-btn"
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                    {renderPageNumbers(page, totalPages, setPage)}
                    <button
                      className="af-page-btn"
                      onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={page === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}

                <div style={{ color: '#64748b' }}>
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + rowsPerPage, filteredResidents.length)} of{" "}
                  {filteredResidents.length}
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
              <div className="admin-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                <div style={{ gridColumn: '1 / -1', paddingBottom: '10px', borderBottom: '1px solid #eee', marginBottom: '4px' }}>
                  <strong>Household Number:</strong> <span>{selectedResident.householdId}</span><br />
                  <strong>Family Number:</strong> <span>{selectedResident.familyNumber || getFamilyNumber(selectedResident.householdId, selectedResident.branchID)}</span><br />
                  <div style={{ marginTop: '8px' }}>
                    <strong>Status:</strong> <span className={`status-badge status-${selectedResident.status.toLowerCase().replace(/\s+/g, "")}`}>{selectedResident.status}</span>
                  </div>
                </div>
                <div><strong>Full Name:</strong><br />{selectedResident.fullName}</div>
                <div><strong>Contact No:</strong><br />{selectedResident.contactNumber || "N/A"}</div>
                <div><strong>Email:</strong><br />{formatDisplayEmail(selectedResident.email, adminRole)}</div>
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
                  <div style={{ gridColumn: '1 / -1', color: "#888", marginTop: "8px" }}>
                    Last updated by <strong>{selectedResident.adminLastUpdatedBy}</strong>
                    {selectedResident.adminLastUpdatedByPosition ? ` (${selectedResident.adminLastUpdatedByPosition})` : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                <p><strong>Household Number:</strong> <span>{statusData.householdId}</span></p>
                <p><strong>Family Number:</strong> <span>{statusData.familyNumber || getFamilyNumber(statusData.householdId, statusData.branchID)}</span></p>
                <p style={{ color: "#888" }}>
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
              <div className="admin-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
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
                <div><strong>Email:</strong><br />{formatDisplayEmail(selectedHhRequest.email, adminRole)}</div>
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

      {showHhApproveModal && (
        <div className="as-modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Approve Resident Registration</h3>
            <p style={{ textAlign: "center" }}>
              Approving will create a Household ID and email the resident. They will appear in the Account Management tab.
            </p>
            <div className="modal-actions">
              <button
                className="approve-btn"
                onClick={handleHhApprove}
                disabled={isApproving}
                style={{ opacity: isApproving ? 0.6 : 1, cursor: isApproving ? "not-allowed" : "pointer" }}
              >
                {isApproving ? "⏳ Approving…" : "Confirm Approval"}
              </button>
              <button
                className="reject-btn"
                onClick={() => {
                  setShowHhApproveModal(false);
                  setSelectedHhRequest(null);
                }}
                disabled={isApproving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showHhRejectModal && (
        <div className="as-modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Confirm Rejection</h3>
            <p style={{ textAlign: "center" }}>
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

      {showDeleteModal && residentToDelete && (
        <div className="as-modal-overlay">
          <div className="modal">
            <h3 className="modal-title">Confirm Deletion</h3>
            <p style={{ textAlign: "center" }}>
              Are you sure you want to delete the resident <strong>{residentToDelete.fullName}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="reject-btn" onClick={handleDeleteResident}>
                Delete Resident
              </button>
              <button
                className="approve-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setResidentToDelete(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}