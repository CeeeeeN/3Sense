import { useState, useEffect, useMemo } from "react";
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../services/logger";
import {
  collection,
  doc,
  deleteDoc,
  updateDoc,
  collectionGroup,
  arrayUnion,
  serverTimestamp,
  query,
  getDocs,
  orderBy,
  limit,
  where // <-- Ensure where is imported
} from "firebase/firestore";
import { approveRegistration, generateResidentUID } from "../services/admin";
import { createUserNotification } from "../services/userNotifications";
import { Search } from "lucide-react";
import { formatDisplayEmail } from "../utils/maskEmail";
import { getFamilyNumber } from "../utils/householdNumbers";
import { useAlert } from "../context/AlertContext"; 
import { useQuery, useQueryClient } from "@tanstack/react-query"; 

import TransferRequestsTab from "../components/TransferRequestsTab"; 
import NewHouseholdRequestsTab from "../components/NewHouseholdRequestsTab"; 

export default function HouseholdManagement() {
  const queryClient = useQueryClient(); 
  const { showAlert, showConfirm } = useAlert(); 

  // ── TABS ──
  const [activeTab, setActiveTab] = useState("requests");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortResident, setSortResident] = useState("name_asc");

  const [selectedResident, setSelectedResident] = useState(null);
  const [showResidentModal, setShowResidentModal] = useState(false);

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
  const [isApproving, setIsApproving] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [adminProfile, setAdminProfile] = useState({ fullName: "Admin", position: "" });

  // ─── 1. OPTIMIZED: Zero-Read Admin Verification ───
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const cachedProfile = sessionStorage.getItem(`admin_profile_${user.uid}`);
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          setAdminName(parsed.fullName || "Admin");
          setAdminRole(parsed.role || "Standard Admin");
          setAdminProfile({
            fullName: parsed.fullName || parsed.username || user.email,
            position: parsed.position || "Admin",
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // ─── 2. LAZY LOADED: Pending Registrations ───
  const { data: hhRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['adminManage_hhRequests'],
    queryFn: async () => {
      const q = query(
        collection(db, "pending_registrations"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const snap = await getDocs(q);
      return snap.docs.map(docSnap => {
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
    },
    enabled: activeTab === "requests", 
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // ─── 3. LAZY LOADED & SERVER-FILTERED: Active Residents & Unactivated Households ───
  const { data: residents = [], isLoading: loadingResidents } = useQuery({
    queryKey: ['adminManage_residents'],
    queryFn: async () => {
      // OPTIMIZATION: Use where("activated", "==", false) so we only fetch exactly what we need
      const [resSnap, unactivatedHhSnap] = await Promise.all([
        getDocs(query(collectionGroup(db, "residents"), limit(300))),
        getDocs(query(collection(db, "households"), where("activated", "==", false), limit(100)))
      ]);

      const resDocs = resSnap.docs.map(docSnap => {
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

      const unactDocs = [];
      unactivatedHhSnap.docs.forEach(hhDoc => {
        const hhData = hhDoc.data();
        if (hhData._pendingHeadData) {
          const head = hhData._pendingHeadData;
          unactDocs.push({
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

      // Deduplicate
      const seen = new Set();
      const dedupedRes = resDocs.filter(r => {
        const key = `${r.householdId}__${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return [...dedupedRes, ...unactDocs];
    },
    enabled: activeTab === "residents",
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // ─── 4. LAZY LOADED: Household Transfers & New Households ───
  const { data: allTransfers = [] } = useQuery({
    queryKey: ['adminManage_transfers'],
    queryFn: async () => {
      const q = query(
        collection(db, "household_transfers"),
        orderBy("submittedAt", "desc"),
        limit(200)
      );
      const snap = await getDocs(q);
      return snap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          dateSubmitted: data.submittedAt ? data.submittedAt.toDate().toLocaleDateString() : "N/A",
          ...data
        };
      });
    },
    enabled: activeTab === "transfers" || activeTab === "new_households",
    staleTime: 1000 * 60 * 30,
  });

  const transfers = useMemo(() => allTransfers.filter(t => t.transferType === "existing"), [allTransfers]);
  const newHouseholds = useMemo(() => allTransfers.filter(t => t.transferType === "new"), [allTransfers]);

  // ─── Filter Logic ───
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
        if (sortHhRequest === "date_desc") return (b.rawDate || 0) - (a.rawDate || 0);
        if (sortHhRequest === "date_asc") return (a.rawDate || 0) - (b.rawDate || 0);
        if (sortHhRequest === "name_asc") return a.fullName.localeCompare(b.fullName);
        if (sortHhRequest === "name_desc") return b.fullName.localeCompare(a.fullName);
        return 0;
      });
  }, [hhRequests, searchHhRequest, filterHhStatus, sortHhRequest]);

  const totalHhRequestPages = Math.ceil(filteredHhRequests.length / hhRowsPerPage);
  const hhStartIndex = (hhRequestPage - 1) * hhRowsPerPage;
  const paginatedHhRequests = filteredHhRequests.slice(hhStartIndex, hhStartIndex + hhRowsPerPage);

  useEffect(() => {
    setHhRequestPage(1);
  }, [searchHhRequest, filterHhStatus, sortHhRequest, hhRowsPerPage]);

  const filteredResidents = useMemo(() => {
    // Re-dedupe just in case
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

      const matchesStatus =
        filterStatus === "All" ||
        (r.status || "").toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (sortResident === "name_asc") return a.fullName.localeCompare(b.fullName);
      if (sortResident === "name_desc") return b.fullName.localeCompare(a.fullName);
      if (sortResident === "id_asc") return (a.householdId || "").localeCompare(b.householdId || "");
      if (sortResident === "id_desc") return (b.householdId || "").localeCompare(a.householdId || "");
      return 0;
    });
  }, [residents, search, filterStatus, sortResident]);

  const totalPages = Math.ceil(filteredResidents.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const paginatedResidents = filteredResidents.slice(startIndex, startIndex + rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, sortResident, rowsPerPage]);

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

  // ─── 5. OPTIMIZED: Zero-Read Local Mutations ───
  const handleHhApprove = async (req) => {
    const isConfirmed = await showConfirm(
      "Approve Resident Registration",
      "Approving will create a Household ID and email the resident. They will appear in the Account Management tab."
    );

    if (!isConfirmed) return;
    if (isApproving) return;

    setIsApproving(true);
    try {
      await approveRegistration(req.id);
      
      // Zero-Read Mutation
      queryClient.setQueryData(['adminManage_hhRequests'], (old = []) => 
        old.map(r => r.id === req.id ? { ...r, status: 'approved' } : r)
      );
      // Invalidate residents cache so it pulls the new household next time the tab is clicked
      queryClient.invalidateQueries({ queryKey: ['adminManage_residents'] });

      logTransaction(
        adminName,
        adminRole,
        "Approved Registration",
        `Approved household registration for ${req.fullName} (Household ID: ${req.householdId})`
      );
      await showAlert("Success", "Registration approved successfully. An email has been sent to the head.");
    } catch (error) {
      console.error("Error approving registration:", error);
      await showAlert("Error", "Error approving registration: " + error.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleHhReject = async (req) => {
    const isConfirmed = await showConfirm(
      "Confirm Rejection",
      "Are you sure you want to reject this resident registration? This will delete the request permanently."
    );

    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, "pending_registrations", req.id));

      // Zero-Read Mutation
      queryClient.setQueryData(['adminManage_hhRequests'], (old = []) => 
        old.filter(r => r.id !== req.id)
      );

      logTransaction(
        adminName,
        adminRole,
        "Rejected Registration",
        `Rejected household registration for ${req.fullName} (Household ID: ${req.householdId})`
      );
      await showAlert("Success", "Registration rejected successfully.");
    } catch (error) {
      console.error("Error rejecting registration:", error);
      await showAlert("Error", "Error rejecting registration: " + error.message);
    }
  };

  const handleDeleteResident = async (res) => {
    const isConfirmed = await showConfirm(
      "Confirm Deletion",
      `Are you sure you want to delete the resident ${res.fullName}? This action cannot be undone.`
    );

    if (!isConfirmed) return;

    try {
      if (res.isPendingActivation) {
        await deleteDoc(doc(db, "households", res.householdId));
        logTransaction(
          adminName,
          adminRole,
          "Deleted Unactivated Household",
          `Deleted unactivated household with ID: ${res.householdId} (Head: ${res.fullName})`
        );
      } else {
        const residentsQuery = query(collection(db, "households", res.householdId, "residents"));
        const residentsSnapshot = await getDocs(residentsQuery);

        await deleteDoc(doc(db, "households", res.householdId, "residents", res.id));

        logTransaction(
          adminName,
          adminRole,
          "Deleted Resident",
          `Deleted resident ${res.fullName} (ID: ${res.id}) from household ${res.householdId}`
        );
        if (residentsSnapshot.size <= 1) {
          await deleteDoc(doc(db, "households", res.householdId));
        }
      }

      // Zero-Read Mutation
      queryClient.setQueryData(['adminManage_residents'], (old = []) => 
        old.filter(r => r.id !== res.id)
      );

      await showAlert("Success", "Resident deleted successfully.");
    } catch (error) {
      console.error("Error deleting resident:", error);
      await showAlert("Error", "Error deleting resident: " + error.message);
    }
  };

  const handleSaveStatus = async () => {
    if (!statusData) return;

    if (statusData.isPendingActivation) {
      await showAlert("Action Denied", "Cannot update status of accounts that are pending activation. Wait for the user to activate their profile.");
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

      // Zero-Read Mutation
      queryClient.setQueryData(['adminManage_residents'], (old = []) => 
        old.map(r => r.id === statusData.id ? { 
          ...r, 
          status: statusData.status,
          remarks: statusData.remarks,
          incident: statusData.incident,
          adminLastUpdatedBy: adminProfile.fullName,
          adminLastUpdatedByPosition: adminProfile.position
        } : r)
      );

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
      await showAlert("Error", "Failed to update status.");
    }
  };

  const handleViewResident = async (res) => {
    setSelectedResident(res);
    setShowResidentModal(true);

    if (!res.isPendingActivation && !res.UID) {
      try {
        const newUID = generateResidentUID();
        const residentRef = doc(db, "households", res.householdId, "residents", res.id);
        
        await updateDoc(residentRef, { 
          UID: newUID,
          updatedAt: serverTimestamp() 
        });
        
        // Zero-Read Mutation
        queryClient.setQueryData(['adminManage_residents'], (old = []) => 
          old.map(r => r.id === res.id ? { ...r, UID: newUID } : r)
        );

        setSelectedResident(prev => ({ ...prev, UID: newUID }));
      } catch (error) {
        console.error("Silent UID patch failed:", error);
      }
    }
  };

  return (
    <AdminLayout>
      <div className="requests-container">
        <div className="requests-header">
          <h1 className="requests-title">Household Management</h1>
          <p className="requests-subtitle">Manage household registrations, residents, and transfer requests.</p>
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
          <button
            className={`req-tab ${activeTab === "transfers" ? "active" : ""}`}
            onClick={() => setActiveTab("transfers")}
          >
            Household Transfers
          </button>
          <button
            className={`req-tab ${activeTab === "new_households" ? "active" : ""}`}
            onClick={() => setActiveTab("new_households")}
          >
            New Household Requests
          </button>
        </div>

        {/* ── TAB: REGISTRATION REQUESTS ── */}
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
                  <tr style={{ textAlign: "center" }}>
                    <th>Full Name</th>
                    <th>Household Number</th>
                    <th>Family Number</th>
                    <th>Date Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRequests ? (
                     <tr><td colSpan={5} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>Loading requests...</td></tr>
                  ) : paginatedHhRequests.length > 0 ? (
                    paginatedHhRequests.map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => {
                          setSelectedHhRequest(req);
                          setShowHhViewModal(true);
                        }}
                        style={{ cursor: "pointer", textAlign: "center" }}
                      >
                        <td>{req.fullName}</td>
                        <td>{req.householdId}</td>
                        <td>{req.branchId ? getFamilyNumber(req.householdId, req.branchId) : "Pending"}</td>
                        <td>{req.dateSubmitted}</td>
                        <td>
                          <button
                            className="btn-view"
                            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHhRequest(req);
                              setShowHhViewModal(true);
                            }}
                          >
                            More Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>No pending requests found.</td></tr>
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

        {/* ── TAB: RESIDENT ACCOUNTS ── */}
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
                  <tr style={{ textAlign: "center" }}>
                    <th>Full Name</th>
                    <th>Household Number</th>
                    <th>Family Number</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingResidents ? (
                     <tr><td colSpan={5} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>Loading residents...</td></tr>
                  ) : paginatedResidents.length > 0 ? (
                    paginatedResidents.map((res) => (
                      <tr
                        key={`${res.householdId}__${res.id}`}
                        onClick={() => handleViewResident(res)}
                        style={{ cursor: "pointer", textAlign: "center" }}
                      >
                        <td>{res.fullName}</td>
                        <td>{res.householdId}</td>
                        <td>{res.familyNumber || getFamilyNumber(res.householdId, res.branchID)}</td>
                        <td>
                          <span className={`status-badge status-${res.status.toLowerCase().replace(/\s+/g, "")}`} style={{
                            padding: '4px 10px', borderRadius: '12px', display: 'inline-block',
                            background: res.status === 'Clear Case' ? '#dcfce7' : res.status === 'Pending Case' ? '#fef3c7' : res.status === 'Violation' ? '#fee2e2' : '#e5e7eb',
                            color: res.status === 'Clear Case' ? '#166534' : res.status === 'Pending Case' ? '#92400e' : res.status === 'Violation' ? '#991b1b' : '#374151',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em'
                          }}>
                            {res.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-view"
                            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewResident(res);
                            }}
                          >
                            More Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>No results found.</td></tr>
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

        {/* ── TAB: HOUSEHOLD TRANSFERS ── */}
        {activeTab === "transfers" && <TransferRequestsTab transfers={transfers} />}

        {/* ── TAB: NEW HOUSEHOLD REQUESTS ── */}
        {activeTab === "new_households" && <NewHouseholdRequestsTab newHouseholds={newHouseholds} />}
      </div>

      {/* DATA VIEW MODALS */}
  {showResidentModal && selectedResident && (
    <div
      className="as-modal-overlay"
      onClick={() => {
        setShowResidentModal(false);
        setSelectedResident(null);
      }}
    >
    <div
      className="as-modal-content"
      style={{ maxWidth: "600px" }}
      onClick={(e) => e.stopPropagation()}
    >
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
                  <strong>Barangay UID:</strong> <span style={{ color: "#0d7a55", fontWeight: "bold", letterSpacing: "0.5px" }}>{selectedResident.UID || "Generating..."}</span><br />
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
                <div>
                  <strong>Category:</strong><br />
                  {selectedResident.category && selectedResident.category.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                      {selectedResident.category.map((c, i) => (
                        <span key={i} style={{ background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "None"
                  )}
                </div>
                <div style={{ gridColumn: '1 / -1', paddingTop: '10px', borderTop: '1px solid #eee' }}><strong>Address:</strong><br />{selectedResident.address}</div>
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
           <div className="modal-footer">
              <button
                className="btn-reject"
                onClick={() => {
                  handleDeleteResident(selectedResident);
                  setShowResidentModal(false);
                  setSelectedResident(null);
                }}
              >
                Delete
              </button>
              {!selectedResident.isPendingActivation && (
                <button
                  className="btn-approve"
                  onClick={() => {
                    setStatusData({ ...selectedResident });
                    setShowResidentModal(false);
                    setShowStatusModal(true);
                  }}
                >
                  Update Status
                </button>
              )}
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
        <div className="as-modal-overlay" onClick={() => { setShowHhViewModal(false); setSelectedHhRequest(null); }}>
          <div className="as-modal-content" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
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
                <div>
                  <strong>Category:</strong><br />
                  {selectedHhRequest.category && selectedHhRequest.category.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                      {selectedHhRequest.category.map((c, i) => (
                        <span key={i} style={{ background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "None"
                  )}
                </div>
                <div style={{ gridColumn: '1 / -1', paddingTop: '10px', borderTop: '1px solid #eee' }}><strong>Address:</strong><br />{selectedHhRequest.address}</div>
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

            {selectedHhRequest.status === "pending" && (
              <div className="modal-footer">
                <button
                  className="btn-reject"
                  onClick={() => {
                    handleHhReject(selectedHhRequest);
                    setShowHhViewModal(false);
                    setSelectedHhRequest(null);
                  }}
                >
                  Reject
                </button>
                <button
                  className="btn-approve"
                  onClick={() => {
                    handleHhApprove(selectedHhRequest);
                    setShowHhViewModal(false);
                    setSelectedHhRequest(null);
                  }}
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </AdminLayout>
  );
}