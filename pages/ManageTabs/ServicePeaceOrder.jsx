import React, { useState, useEffect, useMemo } from "react";
import { auth, db } from "../../firebase/firebase";
import {
  collection, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, arrayRemove, query, where, getDocs, addDoc, deleteDoc, orderBy, limit
} from "firebase/firestore";
import { ServiceAlertTriangleIcon } from "../../components/Icons";
import { createUserNotification } from "../../services/userNotifications";
import { logTransaction } from '../../services/logger';
import { onAuthStateChanged } from "firebase/auth";

const URGENCY_MAP = {
  "Domestic Dispute":             "emergency",
  "Fight / Physical Altercation": "emergency",
  "Noise Complaint":              "urgent",
  "Suspicious Person / Activity": "urgent",
  "Vandalism":                    "urgent",
};

const getUrgency = (type) => URGENCY_MAP[type] || "docs";

const getUrgencyColor = (u) => {
  if (u === "emergency") return { bg: "#fee2e2", text: "#b91c1c" };
  if (u === "urgent")    return { bg: "#fef08a", text: "#a16207" };
  return { bg: "#e0e7ff", text: "#4338ca" };
};

const formatTs = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const formatTime = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
};

const PaginationControls = ({ currentPage, totalPages, setCurrentPage }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
    <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
      Page <span style={{ fontWeight: 600, color: "#111827" }}>{currentPage}</span> of <span style={{ fontWeight: 600, color: "#111827" }}>{totalPages || 1}</span>
    </span>
    <div style={{ display: "flex", gap: "8px" }}>
      <button
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        style={{ padding: "6px 12px", border: "1px solid #d1d5db", background: currentPage === 1 ? "#f3f4f6" : "#fff", color: currentPage === 1 ? "#9ca3af" : "#374151", borderRadius: "6px", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 500 }}
      >
        Previous
      </button>
      <button
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages || totalPages === 0}
        style={{ padding: "6px 12px", border: "1px solid #d1d5db", background: currentPage === totalPages || totalPages === 0 ? "#f3f4f6" : "#fff", color: currentPage === totalPages || totalPages === 0 ? "#9ca3af" : "#374151", borderRadius: "6px", cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 500 }}
      >
        Next
      </button>
    </div>
  </div>
);

export default function ServicePeaceOrder({ onBack }) {
  const [reports, setReports]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [assignedTanod, setAssignedTanod]   = useState("Unassigned");
  const [saving, setSaving]                 = useState(false);

  // ── Tanod Groups State ────────────────────────────────────────────
  const [tanodGroups, setTanodGroups]       = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName]     = useState("");
  const [newMemberInputs, setNewMemberInputs] = useState({});

  // ── Pagination & Filter State ─────────────────────────────────────
  const [currentPage, setCurrentPage]       = useState(1);
  const itemsPerPage                        = 7; 
  
  const [filterStatus, setFilterStatus]     = useState("All");
  const [filterUrgency, setFilterUrgency]   = useState("All");
  const [filterType, setFilterType]         = useState("All");
  const [sortOrder, setSortOrder]           = useState("date_desc"); // date_desc, date_asc, type_asc, type_desc, status_asc

  // For logging purposes
  const [adminName, setAdminName]           = useState("");
  const [adminRole, setAdminRole]           = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterUrgency, filterType, sortOrder]);

  // ── Real-time listener for Reports ────────────────────────────────
  useEffect(() => {
    const reportsQuery = query(
      collection(db, "incidentReports"),
      orderBy("submittedAt", "desc"),
      limit(150)
    );

    const unsub = onSnapshot(reportsQuery, (snap) => {
      const data = snap.docs.map(d => {
        const docData = d.data();
        const rawDate = docData.submittedAt?.toDate ? docData.submittedAt.toDate().getTime() : (docData.submittedAt ? new Date(docData.submittedAt).getTime() : 0);
        return {
          id: d.id,
          rawDate,
          ...docData
        };
      });
      
      setReports(data);
      setLoading(false);
      
      setSelectedReport(prev => prev ? (data.find(r => r.id === prev.id) || prev) : null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "tanodGroups"), 
      orderBy("createdAt", "asc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setTanodGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, "approvedAdmins"), where("uid", "==", user.uid));
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
    if (selectedReport) setAssignedTanod(selectedReport.tanod || "Unassigned");
  }, [selectedReport?.id]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await addDoc(collection(db, "tanodGroups"), {
        groupName: newGroupName.trim(),
        members: [],
        createdAt: serverTimestamp()
      });
      setNewGroupName("");
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  const handleAddMember = async (groupId) => {
    const memberName = newMemberInputs[groupId];
    if (!memberName || !memberName.trim()) return;
    try {
      await updateDoc(doc(db, "tanodGroups", groupId), {
        members: arrayUnion(memberName.trim())
      });
      setNewMemberInputs(prev => ({ ...prev, [groupId]: "" }));
    } catch (err) {
      console.error("Error adding member:", err);
    }
  };

  const handleRemoveMember = async (groupId, memberName) => {
    try {
      await updateDoc(doc(db, "tanodGroups", groupId), {
        members: arrayRemove(memberName)
      });
    } catch (err) {
      console.error("Error removing member:", err);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (window.confirm(`Are you sure you want to delete ${groupName}?`)) {
      try {
        await deleteDoc(doc(db, "tanodGroups", groupId));
      } catch (err) {
        console.error("Error deleting group:", err);
      }
    }
  };

  const updateStatus = async (newStatus) => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      const docRef = doc(db, "incidentReports", selectedReport.id);
      const updateEntry = `${new Date().toISOString().slice(0, 10)} – ${newStatus}`;
      await updateDoc(docRef, {
        status: newStatus,
        tanod: assignedTanod,
        updates: arrayUnion(updateEntry),
        updatedAt: serverTimestamp(),
      });

      logTransaction(
        adminName,
        adminRole,
        "UPDATED_REPORT_STATUS",
        `Updated report ${selectedReport.refNum || selectedReport.id} status to ${newStatus} and assigned tanod ${assignedTanod}`,
      );

      const residentID = selectedReport.residentID || selectedReport.userID;
      const hhID       = selectedReport.householdID;
      if ((newStatus === "responded" || newStatus === "resolved") && residentID && hhID) {
        await createUserNotification(
          hhID,
          residentID,
          "Incident Report Update",
          `Your incident report (${selectedReport.refNum || 'N/A'}) has been marked as ${newStatus}.`,
          "general",
          selectedReport.refNum || selectedReport.id
        );
      }
    } catch (err) {
      console.error("Error updating status:", err);
      logTransaction(
        adminName,
        adminRole,
        "ERROR_UPDATING_REPORT_STATUS",
        `Error updating report ${selectedReport.refNum || selectedReport.id} status to ${newStatus} - ${err.message}`,
      );
    }
    setSaving(false);
  };

  const saveTanod = async (tanodName) => {
    if (!selectedReport) return;
    setAssignedTanod(tanodName);
    try {
      await updateDoc(doc(db, "incidentReports", selectedReport.id), {
        tanod: tanodName,
        updatedAt: serverTimestamp(),
      });
      logTransaction(
        adminName,
        adminRole,
        "UPDATED_REPORT_TANOD",
        `Updated report ${selectedReport.refNum || selectedReport.id} tanod assignment to ${tanodName}`,
      );
    } catch (err) {
      console.error("Error assigning tanod:", err);
      logTransaction(
        adminName,
        adminRole,
        "ERROR_UPDATING_REPORT_TANOD",
        `Error updating report ${selectedReport.refNum || selectedReport.id} tanod assignment to ${tanodName} - ${err.message}`,
      );
    }
  };

  const uniqueIncidentTypes = [...new Set(reports.map(r => r.incidentType).filter(Boolean))].sort();

  const filteredReports = useMemo(() => {
    return reports
      .filter(r => {
        const rStatus = (r.status || "received").trim().toLowerCase();
        const rUrgency = getUrgency(r.incidentType).trim().toLowerCase();

        const matchesStatus = filterStatus === "All" || rStatus === filterStatus.toLowerCase();
        const matchesUrgency = filterUrgency === "All" || rUrgency === filterUrgency.toLowerCase();
        const matchesType = filterType === "All" || r.incidentType === filterType;

        return matchesStatus && matchesUrgency && matchesType;
      })
      .sort((a, b) => {
        if (sortOrder === "date_desc") return (b.rawDate || 0) - (a.rawDate || 0);
        if (sortOrder === "date_asc") return (a.rawDate || 0) - (b.rawDate || 0);
        if (sortOrder === "type_asc") return (a.incidentType || "").localeCompare(b.incidentType || "");
        if (sortOrder === "type_desc") return (b.incidentType || "").localeCompare(a.incidentType || "");
        if (sortOrder === "status_asc") return (a.status || "").localeCompare(b.status || "");
        return 0;
      });
  }, [reports, filterStatus, filterUrgency, filterType, sortOrder]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const counts = {
    total:     reports.length,
    pending:   reports.filter(r => (r.status || "").toLowerCase() === "received" || (r.status || "").toLowerCase() === "pending").length,
    responded: reports.filter(r => (r.status || "").toLowerCase() === "responded").length,
    resolved:  reports.filter(r => (r.status || "").toLowerCase() === "resolved").length,
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
        &larr; Back to Services Hub
      </button>

      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Peace &amp; Order Workspace</h1>
          <p className="as-subtitle">Manage incident reports, dispatch tanod groups, and update blotters</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
        {[
          { label: "Total Reports", value: counts.total,     bg: "#fff",     border: "#e5e7eb", color: "#111827" },
          { label: "Pending",       value: counts.pending,   bg: "#fffbeb",  border: "#fde68a", color: "#a16207" },
          { label: "Responded",     value: counts.responded, bg: "#eff6ff",  border: "#bfdbfe", color: "#1d4ed8" },
          { label: "Resolved",      value: counts.resolved,  bg: "#f0fdf4",  border: "#bbf7d0", color: "#15803d" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, padding: "16px 20px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
            <div style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>Loading reports…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(380px, 1.1fr) 1.9fr", gap: "20px", minHeight: "60vh" }}>

          {/* ── Inbox list ── */}
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", fontWeight: "bold", background: "#f9fafb" }}>
              Incoming Reports ({filteredReports.length})
            </div>

            {/* FILTER & SORT PANEL - HORIZONTALLY SCATTERED */}
            <div style={{ padding: "12px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151" }}>
                  <option value="All">All Statuses</option>
                  <option value="received">Received</option>
                  <option value="pending">Pending</option>
                  <option value="responded">Responded</option>
                  <option value="resolved">Resolved</option>
                </select>
                
                <select value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151" }}>
                  <option value="All">All Urgencies</option>
                  <option value="emergency">Emergency</option>
                  <option value="urgent">Urgent</option>
                  <option value="docs">Docs / Normal</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151" }}>
                  <option value="All">All Types</option>
                  {uniqueIncidentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151" }}>
                  <option value="date_desc">Date: Newest</option>
                  <option value="date_asc">Date: Oldest</option>
                  <option value="type_asc">Type: A to Z</option>
                  <option value="type_desc">Type: Z to A</option>
                  <option value="status_asc">Status Order</option>
                </select>
              </div>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {filteredReports.length === 0 && (
                <div style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>No reports match your filters.</div>
              )}
              {paginatedReports.map(r => {
                const urgency = getUrgency(r.incidentType);
                const uColor  = getUrgencyColor(urgency);
                const isActive = selectedReport?.id === r.id;
                return (
                  <div key={r.id} onClick={() => setSelectedReport(r)}
                    style={{
                      padding: "16px", borderBottom: "1px solid #e5e7eb", cursor: "pointer",
                      background: isActive ? "#f0fdf4" : "#fff", transition: "background 0.2s",
                      borderLeft: isActive ? "4px solid #2DB17B" : "4px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "bold" }}>{r.refNum || r.id.slice(0, 12)}</span>
                      <span style={{ fontSize: "0.72rem", padding: "2px 7px", borderRadius: "12px", background: uColor.bg, color: uColor.text, fontWeight: "bold" }}>
                        {urgency.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>{r.incidentType || "Incident"}</div>
                    <div style={{ fontSize: "0.83rem", color: "#4b5563", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.location} — {r.description}
                    </div>
                    <div style={{ marginTop: "6px" }}>
                      <span style={{
                        fontSize: "0.72rem", padding: "2px 7px", borderRadius: "10px", fontWeight: 600,
                        background: (r.status || "").toLowerCase() === "resolved" ? "#dcfce7" : (r.status || "").toLowerCase() === "responded" ? "#e0e7ff" : "#fef3c7",
                        color:      (r.status || "").toLowerCase() === "resolved" ? "#166534" : (r.status || "").toLowerCase() === "responded" ? "#3730a3" : "#92400e",
                      }}>
                        {r.status || "received"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {filteredReports.length > 0 && (
              <PaginationControls 
                currentPage={currentPage} 
                totalPages={totalPages} 
                setCurrentPage={setCurrentPage} 
              />
            )}
          </div>

          {/* ── Detail panel ── */}
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "24px", display: "flex", flexDirection: "column" }}>
            {selectedReport ? (
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb", paddingBottom: "16px", marginBottom: "20px" }}>
                  <div>
                    <h2 style={{ margin: "0 0 6px 0" }}>Incident Details</h2>
                    <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>Ref: {selectedReport.refNum || selectedReport.id}</span>
                  </div>
                  <span className={`as-badge ${(selectedReport.status || "received").toLowerCase()}`}>
                    {selectedReport.status || "received"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>Incident Type</p>
                    <p style={{ fontWeight: 600, margin: 0 }}>{selectedReport.incidentType || "—"}</p>
                  </div>
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>Date &amp; Time</p>
                    <p style={{ fontWeight: 600, margin: 0 }}>
                      {selectedReport.date || formatTs(selectedReport.submittedAt)} at {selectedReport.time || formatTime(selectedReport.submittedAt)}
                    </p>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>Exact Location</p>
                    <p style={{ fontWeight: 600, margin: 0 }}>{selectedReport.location || "—"}</p>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>Description</p>
                    <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}>
                      {selectedReport.description || "No description provided."}
                    </div>
                  </div>

                  {(selectedReport.photoURL || selectedReport.photoFileName || selectedReport.photo) && (
                    <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                      <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 8px 0" }}>Attached Photo Evidence</p>
                      {selectedReport.photoURL ? (
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px", background: "#f9fafb", display: "inline-block", maxWidth: "100%" }}>
                          <a href={selectedReport.photoURL} target="_blank" rel="noopener noreferrer" title="Click to view full size">
                            <img 
                              src={selectedReport.photoURL} 
                              alt="Incident Evidence" 
                              style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "4px", cursor: "pointer", display: "block" }} 
                            />
                          </a>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px", textAlign: "center" }}>Click image to view full size</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "#317D89", background: "#e0f2fe", padding: "6px 12px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          📸 {selectedReport.photoFileName || selectedReport.photo}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "20px", marginBottom: "24px" }}>
                  <h3 style={{ margin: "0 0 14px 0", fontSize: "1rem" }}>Reporter Information</h3>
                  {selectedReport.isAnonymous || !selectedReport.reporterName ? (
                    <div style={{ padding: "12px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "0.9rem" }}>
                      <strong>Anonymous Report</strong> — The user opted not to provide personal details.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>Name</p>
                        <p style={{ margin: 0 }}>{selectedReport.reporterName}</p>
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>Contact</p>
                        <p style={{ margin: 0 }}>{selectedReport.contact || "—"}</p>
                      </div>
                      {selectedReport.reporterAddress && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>Address</p>
                          <p style={{ margin: 0 }}>{selectedReport.reporterAddress}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedReport.updates?.length > 0 && (
                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", marginBottom: "24px" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "1rem" }}>Updates Log</h3>
                    <ul style={{ margin: 0, padding: "0 0 0 18px", color: "#4b5563", fontSize: "0.85rem" }}>
                      {selectedReport.updates.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                )}

                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "20px", marginTop: "auto" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem" }}>Admin Action Panel</h3>
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                        <label style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 500 }}>Assign Tanod Group</label>
                        <button 
                          onClick={() => setShowGroupModal(true)} 
                          style={{ background: "none", border: "none", color: "#317D89", fontSize: "0.8rem", cursor: "pointer", padding: 0 }}
                        >
                          + Manage Groups
                        </button>
                      </div>
                      <select
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                        value={assignedTanod}
                        onChange={(e) => saveTanod(e.target.value)}
                        disabled={saving}
                      >
                        <option value="Unassigned">Unassigned</option>
                        {tanodGroups.map(g => (
                          <option key={g.id} value={g.groupName}>
                            {g.groupName} ({g.members?.length || 0} members)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", color: "#6b7280", fontSize: "0.85rem", marginBottom: "6px", fontWeight: 500 }}>Update Status</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="as-btn-ghost"
                          style={{ flex: 1, padding: "10px", borderColor: (selectedReport.status || "").toLowerCase() === "responded" ? "#BDBD64" : "#e5e7eb" }}
                          onClick={() => updateStatus("responded")}
                          disabled={saving || (selectedReport.status || "").toLowerCase() === "resolved"}
                        >
                          Responded
                        </button>
                        <button
                          className="as-btn-ghost"
                          style={{ flex: 1, padding: "10px", borderColor: (selectedReport.status || "").toLowerCase() === "resolved" ? "#2DB17B" : "#e5e7eb", color: (selectedReport.status || "").toLowerCase() === "resolved" ? "#2DB17B" : "inherit" }}
                          onClick={() => updateStatus("resolved")}
                          disabled={saving}
                        >
                          Resolved
                        </button>
                      </div>
                    </div>
                  </div>
                  {saving && <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "8px" }}>Saving…</p>}
                </div>
              </div>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", flexDirection: "column" }}>
                <ServiceAlertTriangleIcon />
                <p style={{ marginTop: "16px" }}>Select an incident report from the inbox to view details.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MANAGE TANOD GROUPS MODAL ── */}
      {showGroupModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(17, 24, 39, 0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "600px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#111827" }}>Manage Tanod Groups</h2>
              <button onClick={() => setShowGroupModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#6b7280" }}>&times;</button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto", flex: 1, background: "#f9fafb" }}>
              
              <form onSubmit={handleCreateGroup} style={{ display: "flex", gap: "10px", marginBottom: "24px", background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: "6px", fontWeight: 600 }}>Create New Group</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Group A, Night Shift Team..." 
                    value={newGroupName} 
                    onChange={e => setNewGroupName(e.target.value)} 
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                  />
                </div>
                <button type="submit" disabled={!newGroupName.trim()} style={{ alignSelf: "flex-end", padding: "9px 16px", background: newGroupName.trim() ? "#317D89" : "#d1d5db", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 500, cursor: newGroupName.trim() ? "pointer" : "not-allowed" }}>
                  Add Group
                </button>
              </form>

              {tanodGroups.length === 0 ? (
                <p style={{ textAlign: "center", color: "#9ca3af", margin: "20px 0" }}>No Tanod groups created yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {tanodGroups.map(group => (
                    <div key={group.id} style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f3f4f6" }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>{group.groupName}</span>
                        <button onClick={() => handleDeleteGroup(group.id, group.groupName)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: "0.8rem", cursor: "pointer" }}>Delete Group</button>
                      </div>
                      
                      <div style={{ padding: "16px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                          {group.members && group.members.length > 0 ? (
                            group.members.map((member, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "16px", fontSize: "0.8rem", fontWeight: 500 }}>
                                {member}
                                <button onClick={() => handleRemoveMember(group.id, member)} style={{ background: "none", border: "none", color: "#0369a1", fontSize: "1rem", lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>&times;</button>
                              </div>
                            ))
                          ) : (
                            <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>No members in this group yet.</span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <input 
                            type="text" 
                            placeholder="Add Tanod name..." 
                            value={newMemberInputs[group.id] || ""}
                            onChange={e => setNewMemberInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
                            onKeyDown={e => { if(e.key === "Enter") { e.preventDefault(); handleAddMember(group.id); }}}
                            style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem" }}
                          />
                          <button 
                            type="button"
                            onClick={() => handleAddMember(group.id)}
                            disabled={!newMemberInputs[group.id]?.trim()}
                            style={{ padding: "6px 12px", background: newMemberInputs[group.id]?.trim() ? "#111827" : "#e5e7eb", color: newMemberInputs[group.id]?.trim() ? "#fff" : "#9ca3af", border: "none", borderRadius: "6px", fontSize: "0.85rem", cursor: newMemberInputs[group.id]?.trim() ? "pointer" : "not-allowed" }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  ); 
}