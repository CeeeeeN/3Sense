import React, { useState, useEffect, useMemo } from "react";
import { auth, db } from "../../firebase/firebase";
import {
  collection, doc, updateDoc, serverTimestamp, arrayUnion, arrayRemove, query, where, getDocs, addDoc, deleteDoc, orderBy, limit, getCountFromServer
} from "firebase/firestore";
import { ServiceAlertTriangleIcon } from "../../components/Icons";
import { createUserNotification } from "../../services/userNotifications";
import { logTransaction } from '../../services/logger';
import { onAuthStateChanged } from "firebase/auth";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext'; // NEW: Language Hook
import { useAlert } from "../../context/AlertContext";

const URGENCY_MAP = {
  "Domestic Dispute": "emergency",
  "Fight / Physical Altercation": "emergency",
  "Noise Complaint": "urgent",
  "Suspicious Person / Activity": "urgent",
  "Vandalism": "urgent",
};

const getUrgency = (type) => URGENCY_MAP[type] || "docs";

const getUrgencyColor = (u) => {
  if (u === "emergency") return { bg: "#fee2e2", text: "#b91c1c" };
  if (u === "urgent") return { bg: "#fef08a", text: "#a16207" };
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

export default function ServicePeaceOrder({ onBack }) {
  const queryClient = useQueryClient();
  const { t } = useLanguage(); // NEW: Destructure hook
  const { showConfirm } = useAlert();

  const [selectedReport, setSelectedReport] = useState(null);
  const [assignedTanod, setAssignedTanod] = useState("Unassigned");
  const [saving, setSaving] = useState(false);

  // ── Tanod Groups State ────────────────────────────────────────────
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newMemberInputs, setNewMemberInputs] = useState({});

  // ── Pagination & Filter State ─────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [filterStatus, setFilterStatus] = useState("All");
  const [filterUrgency, setFilterUrgency] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [sortOrder, setSortOrder] = useState("date_desc");

  // For logging purposes
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterUrgency, filterType, sortOrder]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const cachedProfile = sessionStorage.getItem(`admin_profile_${user.uid}`);
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          setAdminName(parsed.fullName);
          setAdminRole(parsed.role);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const { data: reports = [], isLoading: loading } = useQuery({
    queryKey: ['adminManage_incidentReports'],
    queryFn: async () => {
      const reportsQuery = query(
        collection(db, "incidentReports"),
        orderBy("submittedAt", "desc"),
        limit(200)
      );
      const snap = await getDocs(reportsQuery);
      return snap.docs.map(d => {
        const docData = d.data();
        const rawDate = docData.submittedAt?.toDate ? docData.submittedAt.toDate().getTime() : (docData.submittedAt ? new Date(docData.submittedAt).getTime() : 0);
        return {
          id: d.id,
          rawDate,
          ...docData
        };
      });
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  useEffect(() => {
    setSelectedReport(prev => prev ? (reports.find(r => r.id === prev.id) || prev) : null);
  }, [reports]);

  const { data: tanodGroups = [] } = useQuery({
    queryKey: ['adminManage_tanodGroups'],
    queryFn: async () => {
      const q = query(
        collection(db, "tanodGroups"),
        orderBy("createdAt", "asc"),
        limit(50)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: counts = { total: 0, pending: 0, responded: 0, resolved: 0 } } = useQuery({
    queryKey: ['adminManage_peaceStats'],
    queryFn: async () => {
      const rRef = collection(db, "incidentReports");
      const [total, pending, responded, resolved] = await Promise.all([
        getCountFromServer(rRef),
        getCountFromServer(query(rRef, where("status", "in", ["received", "Received", "pending", "Pending"]))),
        getCountFromServer(query(rRef, where("status", "in", ["responded", "Responded"]))),
        getCountFromServer(query(rRef, where("status", "in", ["resolved", "Resolved"])))
      ]);
      return {
        total: total.data().count,
        pending: pending.data().count,
        responded: responded.data().count,
        resolved: resolved.data().count
      };
    },
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (selectedReport) setAssignedTanod(selectedReport.tanod || t('admin_srv_po_det_unassigned'));
  }, [selectedReport?.id, t]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    try {
      const docRef = await addDoc(collection(db, "tanodGroups"), {
        groupName: trimmed,
        members: [],
        createdAt: serverTimestamp()
      });
      setNewGroupName("");
      queryClient.setQueryData(['adminManage_tanodGroups'], (old = []) => [
        ...old,
        { id: docRef.id, groupName: trimmed, members: [] }
      ]);
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  const handleAddMember = async (groupId) => {
    const memberName = newMemberInputs[groupId]?.trim();
    if (!memberName) return;
    try {
      await updateDoc(doc(db, "tanodGroups", groupId), {
        members: arrayUnion(memberName)
      });
      setNewMemberInputs(prev => ({ ...prev, [groupId]: "" }));
      queryClient.setQueryData(['adminManage_tanodGroups'], (old = []) =>
        old.map(g => g.id === groupId ? { ...g, members: [...(g.members || []), memberName] } : g)
      );
    } catch (err) {
      console.error("Error adding member:", err);
    }
  };

  const handleRemoveMember = async (groupId, memberName) => {
    try {
      await updateDoc(doc(db, "tanodGroups", groupId), {
        members: arrayRemove(memberName)
      });
      queryClient.setQueryData(['adminManage_tanodGroups'], (old = []) =>
        old.map(g => g.id === groupId ? { ...g, members: (g.members || []).filter(m => m !== memberName) } : g)
      );
    } catch (err) {
      console.error("Error removing member:", err);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (window.confirm(`${t('admin_srv_po_confirm_delete_grp')} ${groupName}?`)) {
      try {
        await deleteDoc(doc(db, "tanodGroups", groupId));
        queryClient.setQueryData(['adminManage_tanodGroups'], (old = []) =>
          old.filter(g => g.id !== groupId)
        );
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
      const hhID = selectedReport.householdID;
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

      queryClient.setQueryData(['adminManage_incidentReports'], (old = []) =>
        old.map(r => r.id === selectedReport.id ? {
          ...r,
          status: newStatus,
          tanod: assignedTanod,
          updates: [...(r.updates || []), updateEntry]
        } : r)
      );

      queryClient.invalidateQueries({ queryKey: ['adminManage_peaceStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminManage_servicesStats'] });

    } catch (err) {
      console.error("Error updating status:", err);
      logTransaction(
        adminName,
        adminRole,
        "ERROR_UPDATING_REPORT_STATUS",
        `Error updating report ${selectedReport.refNum || selectedReport.id} status to ${newStatus}\n${err.message}`,
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

      queryClient.setQueryData(['adminManage_incidentReports'], (old = []) =>
        old.map(r => r.id === selectedReport.id ? { ...r, tanod: tanodName } : r)
      );
    } catch (err) {
      console.error("Error assigning tanod:", err);
      logTransaction(
        adminName,
        adminRole,
        "ERROR_UPDATING_REPORT_TANOD",
        `Error updating report ${selectedReport.refNum || selectedReport.id} tanod assignment to ${tanodName}\n${err.message}`,
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

const handleResolve = async () => {
    if (!selectedReport) return;
    
    const isConfirmed = showConfirm
      ? await showConfirm(
          t('admin_srv_po_confirm_resolve_title') || "Confirm Resolution",
          t('admin_srv_po_confirm_resolve_desc') || "Are you sure you want to mark this incident report as Resolved? This will notify the resident."
        )
      : window.confirm(t('admin_srv_po_confirm_resolve_desc') || "Are you sure you want to mark this incident report as Resolved?");

    if (!isConfirmed) return;
    updateStatus("resolved");
  };

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 2) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 1) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage, "...", totalPages);
      }
    }

    return pages.map((page, index) => (
      <button
        key={index}
        className={`af-page-btn ${currentPage === page ? "active" : ""}`}
        onClick={() => (typeof page === "number" ? setCurrentPage(page) : null)}
        disabled={typeof page !== "number"}
        style={{
          cursor: typeof page === "number" ? "pointer" : "default",
          border: typeof page !== "number" ? "none" : "",
          background: typeof page !== "number" ? "transparent" : "",
        }}
      >
        {page}
      </button>
    ));
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
        {t('admin_srv_po_back')}
      </button>

      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>{t('admin_srv_po_title')}</h1>
          <p className="as-subtitle">{t('admin_srv_po_subtitle')}</p>
        </div>
      </div>

      <div className="po-stats-grid">
        {[
          { label: t('admin_srv_po_stat_total'), value: counts.total, bg: "#fff", border: "#e5e7eb", color: "#111827" },
          { label: t('admin_srv_po_stat_pending'), value: counts.pending, bg: "#fffbeb", border: "#fde68a", color: "#a16207" },
          { label: t('admin_srv_po_stat_responded'), value: counts.responded, bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
          { label: t('admin_srv_po_stat_resolved'), value: counts.resolved, bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, padding: "16px 20px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
            <div style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>{t('admin_srv_po_loading')}</div>
      ) : (
        <div className="po-workspace-grid">

          {/* ── Inbox list ── */}
          <div className={`po-inbox-panel ${selectedReport ? 'mobile-hidden' : ''}`}>
            <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", fontWeight: "bold", background: "#f9fafb" }}>
              {t('admin_srv_po_incoming')} ({filteredReports.length})
            </div>

{/* FILTER & SORT PANEL */}
<div style={{ padding: "12px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: "8px" }}>
  <div style={{ display: "flex", gap: "8px" }}>
    <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: 1, minWidth: 0, padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151" }}>
      <option value="All">{t('admin_srv_po_filter_status')}</option>
      <option value="received">{t('admin_srv_po_filter_received')}</option>
      <option value="pending">{t('admin_srv_po_stat_pending')}</option>
      <option value="responded">{t('admin_srv_po_stat_responded')}</option>
      <option value="resolved">{t('admin_srv_po_stat_resolved')}</option>
    </select>

    <select className="filter-select" value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)} style={{ flex: 1, minWidth: 0, padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151" }}>
      <option value="All">{t('admin_srv_po_filter_urgency')}</option>
      <option value="emergency">{t('admin_srv_po_filter_emergency')}</option>
      <option value="urgent">{t('admin_srv_po_filter_urgent')}</option>
      <option value="docs">{t('admin_srv_po_filter_docs')}</option>
    </select>
  </div>

  <div style={{ display: "flex", gap: "8px" }}>
    <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ flex: 1, minWidth: 0, padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151" }}>
      <option value="All">{t('admin_srv_po_filter_type')}</option>
      {uniqueIncidentTypes.map(type => (
        <option key={type} value={type}>{type}</option>
      ))}
    </select>

    <select className="filter-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ flex: 1, minWidth: 0, padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", color: "#374151" }}>
      <option value="date_desc">{t('admin_srv_po_sort_date_new')}</option>
      <option value="date_asc">{t('admin_srv_po_sort_date_old')}</option>
      <option value="type_asc">{t('admin_srv_po_sort_type_asc')}</option>
      <option value="type_desc">{t('admin_srv_po_sort_type_desc')}</option>
      <option value="status_asc">{t('admin_srv_po_sort_status')}</option>
    </select>
  </div>
</div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {filteredReports.length === 0 && (
                <div style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>{t('admin_srv_po_empty')}</div>
              )}
              {paginatedReports.map(r => {
                const urgency = getUrgency(r.incidentType);
                const uColor = getUrgencyColor(urgency);
                const isActive = selectedReport?.id === r.id;

                // Translate urgency label
                let translatedUrgency = urgency.toUpperCase();
                if (urgency === 'emergency') translatedUrgency = t('admin_srv_po_filter_emergency').toUpperCase();
                if (urgency === 'urgent') translatedUrgency = t('admin_srv_po_filter_urgent').toUpperCase();
                if (urgency === 'docs') translatedUrgency = 'DOCS';

                // Translate status label for the badge
                let statusRaw = (r.status || "received");
                let displayStatus = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase();
                if (statusRaw.toLowerCase() === 'pending') displayStatus = t('admin_srv_po_stat_pending');
                if (statusRaw.toLowerCase() === 'received') displayStatus = t('admin_srv_po_filter_received');
                if (statusRaw.toLowerCase() === 'responded') displayStatus = t('admin_srv_po_stat_responded');
                if (statusRaw.toLowerCase() === 'resolved') displayStatus = t('admin_srv_po_stat_resolved');

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
                        {translatedUrgency}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>{r.incidentType || "Incident"}</div>
                    <div style={{ fontSize: "0.83rem", color: "#4b5563", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.location} — {r.description}
                    </div>
                    <div style={{ marginTop: "6px" }}>
                      <span className={`status-badge ${(r.status || "pending").toLowerCase()}`}>
                        {displayStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredReports.length > 0 && (
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
                flexWrap: "wrap",
                gap: "8px"
              }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredReports.length)} of {filteredReports.length}
                </div>

                {totalPages > 1 && (
                  <div className="af-pagination" style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="af-page-btn"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    >
                      {t('admin_srv_po_page_prev')}
                    </button>
                    {renderPageNumbers()}
                    <button
                      className="af-page-btn"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    >
                      {t('admin_srv_po_page_next')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Detail panel ── */}
          <div className={`po-detail-panel ${!selectedReport ? 'mobile-hidden' : ''}`}>
            {selectedReport ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Mobile-only back button */}
                <button
                  type="button"
                  className="as-btn-ghost po-mobile-back-btn"
                  onClick={() => setSelectedReport(null)}
                >
                  {t('admin_srv_po_btn_back_incoming') || '← Back to Incoming Reports'}
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", borderBottom: "1px solid #e5e7eb", paddingBottom: "16px", marginBottom: "20px" }}>
                  <div>
                    <h2 style={{ margin: "0 0 6px 0" }}>{t('admin_srv_po_det_title')}</h2>
                    <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>{t('admin_srv_po_det_ref')} {selectedReport.refNum || selectedReport.id}</span>
                  </div>
                  <span className={`status-badge ${(selectedReport.status || "received").toLowerCase()}`}>
                    {(() => {
                      let statusRaw = (selectedReport.status || "received");
                      let displayStatus = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase();
                      if (statusRaw.toLowerCase() === 'pending') displayStatus = t('admin_srv_po_stat_pending');
                      if (statusRaw.toLowerCase() === 'received') displayStatus = t('admin_srv_po_filter_received');
                      if (statusRaw.toLowerCase() === 'responded') displayStatus = t('admin_srv_po_stat_responded');
                      if (statusRaw.toLowerCase() === 'resolved') displayStatus = t('admin_srv_po_stat_resolved');
                      return displayStatus;
                    })()}
                  </span>
                </div>

                <div className="po-details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>{t('admin_srv_po_det_type')}</p>
                    <p style={{ fontWeight: 600, margin: 0 }}>{selectedReport.incidentType || "—"}</p>
                  </div>
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>{t('admin_srv_po_det_datetime')}</p>
                    <p style={{ fontWeight: 600, margin: 0 }}>
                      {selectedReport.date || formatTs(selectedReport.submittedAt)} at {selectedReport.time || formatTime(selectedReport.submittedAt)}
                    </p>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>{t('admin_srv_po_det_loc')}</p>
                    <p style={{ fontWeight: 600, margin: 0 }}>{selectedReport.location || "—"}</p>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>{t('admin_srv_po_det_desc')}</p>
                    <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem" }}>
                      {selectedReport.description || t('admin_srv_po_det_no_desc')}
                    </div>
                  </div>

                  {(selectedReport.photoURL || selectedReport.photoFileName || selectedReport.photo) && (
                    <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                      <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 8px 0" }}>{t('admin_srv_po_det_photo')}</p>
                      {selectedReport.photoURL ? (
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px", background: "#f9fafb", display: "inline-block", maxWidth: "100%" }}>
                          <a href={selectedReport.photoURL} target="_blank" rel="noopener noreferrer" title="Click to view full size">
                            <img
                              src={selectedReport.photoURL}
                              alt="Incident Evidence"
                              style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "4px", cursor: "pointer", display: "block" }}
                            />
                          </a>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px", textAlign: "center" }}>{t('admin_srv_po_det_photo_hint')}</div>
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
                  <h3 style={{ margin: "0 0 14px 0", fontSize: "1rem" }}>{t('admin_srv_po_det_rep_info')}</h3>
                  {selectedReport.isAnonymous || !selectedReport.reporterName ? (
                    <div style={{ padding: "12px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "0.9rem" }}>
                      <strong>{t('admin_srv_po_det_anon')}</strong> — {t('admin_srv_po_det_anon_desc')}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>{t('admin_srv_po_det_name')}</p>
                        <p style={{ margin: 0, fontWeight: 500 }}>{selectedReport.reporterName}</p>
                        {selectedReport.UID && (
                          <div style={{ fontSize: "0.85rem", color: "#317D89", marginTop: "4px", fontWeight: 600 }}>
                            {t('admin_srv_po_det_uid')} {selectedReport.UID}
                          </div>
                        )}
                      </div>
                      <div>
                        <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>{t('admin_srv_po_det_contact')}</p>
                        <p style={{ margin: 0 }}>{selectedReport.contact || "—"}</p>
                      </div>
                      {selectedReport.reporterAddress && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 4px 0" }}>{t('admin_srv_po_det_address')}</p>
                          <p style={{ margin: 0 }}>{selectedReport.reporterAddress}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedReport.updates?.length > 0 && (
                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#334155" }}>{t('admin_srv_po_det_updates')}</h3>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        {selectedReport.updates.length} {selectedReport.updates.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    <div style={{
                      maxHeight: "140px",
                      overflowY: "auto",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}>
                      {selectedReport.updates.map((u, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#475569" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#317D89", flexShrink: 0 }} />
                          <span>{u}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "18px" }}>
                  <h3 style={{ margin: "0 0 14px 0", fontSize: "0.95rem", color: "#334155" }}>{t('admin_srv_po_det_action_panel')}</h3>
                  <div className="po-action-inputs">
                    {/* Assign Tanod */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                        <label style={{ color: "#64748b", fontSize: "0.82rem", fontWeight: 600 }}>{t('admin_srv_po_det_assign_tanod')}</label>
                        <button
                          type="button"
                          onClick={() => setShowGroupModal(true)}
                          style={{ background: "none", border: "none", color: "#317D89", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", padding: 0 }}
                        >
                          {t('admin_srv_po_det_manage_groups')}
                        </button>
                      </div>
                      <select
                        className="filter-select"
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", background: "#fff" }}
                        value={assignedTanod}
                        onChange={(e) => saveTanod(e.target.value)}
                        disabled={saving}
                      >
                        <option value="Unassigned">{t('admin_srv_po_det_unassigned')}</option>
                        {tanodGroups.map(g => (
                          <option key={g.id} value={g.groupName}>
                            {g.groupName} ({g.members?.length || 0} members)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", color: "#64748b", fontSize: "0.82rem", marginBottom: "6px", fontWeight: 600 }}>{t('admin_srv_po_det_update_status')}</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => updateStatus("responded")}
                          disabled={saving || (selectedReport.status || "").toLowerCase() === "resolved"}
                          className={`po-btn-status po-btn-responded ${(selectedReport.status || "").toLowerCase() === "responded" ? "active" : ""}`}
                        >
                          <span className="dot" /> {t('admin_srv_po_stat_responded')}
                        </button>
<button
  type="button"
  onClick={handleResolve}
  disabled={saving || (selectedReport.status || "").toLowerCase() === "resolved"}
  className={`po-btn-status po-btn-resolved ${(selectedReport.status || "").toLowerCase() === "resolved" ? "active" : ""}`}
>
  <span className="dot" /> {t('admin_srv_po_stat_resolved')}
</button>
                      </div>
                    </div>
                  </div>
                  {saving && <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "8px" }}>{t('admin_srv_po_det_saving')}</p>}
                </div>
              </div>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", flexDirection: "column" }}>
                <ServiceAlertTriangleIcon />
                <p style={{ marginTop: "16px" }}>{t('admin_srv_po_det_select_prompt')}</p>
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
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#111827" }}>{t('admin_srv_po_grp_title')}</h2>
              <button onClick={() => setShowGroupModal(false)} style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#6b7280" }}>&times;</button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto", flex: 1, background: "#f9fafb" }}>

              <form onSubmit={handleCreateGroup} style={{ display: "flex", gap: "10px", marginBottom: "24px", background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: "6px", fontWeight: 600 }}>{t('admin_srv_grp_create')}</label>
                  <input
                    type="text"
                    placeholder={t('admin_srv_grp_create_ph')}
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                  />
                </div>
                <button type="submit" disabled={!newGroupName.trim()} style={{ alignSelf: "flex-end", padding: "9px 16px", background: newGroupName.trim() ? "#317D89" : "#d1d5db", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 500, cursor: newGroupName.trim() ? "pointer" : "not-allowed" }}>
                  {t('admin_srv_grp_btn_add')}
                </button>
              </form>

              {tanodGroups.length === 0 ? (
                <p style={{ textAlign: "center", color: "#9ca3af", margin: "20px 0" }}>{t('admin_srv_grp_empty')}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {tanodGroups.map(group => (
                    <div key={group.id} style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f3f4f6" }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>{group.groupName}</span>
                        <button onClick={() => handleDeleteGroup(group.id, group.groupName)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: "0.8rem", cursor: "pointer" }}>{t('admin_srv_grp_btn_delete')}</button>
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
                            <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>{t('admin_srv_grp_members_empty')}</span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <input
                            type="text"
                            placeholder={t('admin_srv_grp_add_member_ph')}
                            value={newMemberInputs[group.id] || ""}
                            onChange={e => setNewMemberInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddMember(group.id); } }}
                            style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem" }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddMember(group.id)}
                            disabled={!newMemberInputs[group.id]?.trim()}
                            style={{ padding: "6px 12px", background: newMemberInputs[group.id]?.trim() ? "#111827" : "#e5e7eb", color: newMemberInputs[group.id]?.trim() ? "#fff" : "#9ca3af", border: "none", borderRadius: "6px", fontSize: "0.85rem", cursor: newMemberInputs[group.id]?.trim() ? "pointer" : "not-allowed" }}
                          >
                            {t('admin_srv_grp_btn_add_member')}
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