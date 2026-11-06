import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebase";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, limit, getDocs, getCountFromServer, where
} from "firebase/firestore";
import FormBuilder from "../../components/FormBuilder";
import { createUserNotification } from "../../services/userNotifications";
import { runStatusMaintenance } from "../../services/statusUpdater";
import EmailBlastModal from "../../components/EmailBlastModal";
import { buildLivelihoodEmail } from "../../utils/emailTemplates";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext'; // NEW: Language Hook
import { useAlert } from "../../context/AlertContext";

const getTodayStr = () => new Date().toISOString().split("T")[0];

const formatTs = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const StatusBadge = ({ status, t }) => {
  const rawStatus = status || "Pending";
  const statusClass = String(rawStatus).toLowerCase().replace(/\s+/g, '-');
  
  // Translate the common status words, fallback to capitalized string
  let formattedText = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
  if (statusClass === 'pending') formattedText = t('admin_srv_lh_stat_pending');
  if (statusClass === 'approved') formattedText = t('admin_srv_lh_stat_approved');
  if (statusClass === 'rejected') formattedText = t('admin_srv_lh_stat_rejected');

  return (
    <span className={`status-badge ${statusClass}`}>
      {formattedText}
    </span>
  );
};

const BLANK = {
  title: "", description: "", date: "", startTime: "", endTime: "",
  location: "", slots: "", demographic: "", customFields: [],
};

export default function ServiceLivelihood({ onBack }) {
  const queryClient = useQueryClient();
  const { t } = useLanguage(); // NEW: Destructure hook
  const { showAlert, showConfirm } = useAlert();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("date_desc");

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingProgramId, setEditingProgramId] = useState(null);
  const [emailBlastTarget, setEmailBlastTarget] = useState(null);
  const [newProgram, setNewProgram] = useState(BLANK);

  useEffect(() => {
    runStatusMaintenance();
  }, []);

  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ['adminManage_livelihoodPrograms'],
    queryFn: async () => {
      const q = query(
        collection(db, "Programs"),
        where("programType", "==", "livelihood"), 
        orderBy("updatedAt", "desc"),
        limit(100)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const r = d.data();
        return {
          id: d.id,
          title: r.title || r.name || "Untitled Program",
          description: r.description || r.customFields?.description || "",
          date: r.date || r.customFields?.date || "",
          endDate: r.endDate || r.date || "",
          startTime: r.startTime || r.customFields?.startTime || "",
          endTime: r.endTime || r.customFields?.endTime || "",
          location: r.location || r.customFields?.location || "",
          slots: parseInt(r.slots || r.requirements?.slots || "0", 10) || 0,
          demographic: r.demographic || "",
          customFields: r.customFields || [],
          status: r.status || "Upcoming",
        };
      });
    },
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  const { data: participants = [], isLoading: loadingParts } = useQuery({
    queryKey: ['adminManage_livelihoodRegistrations'],
    queryFn: async () => {
      const q = query(
        collection(db, "livelihoodRegistrations"), 
        orderBy("submittedAt", "desc"),
        limit(200)
      );
      const snap = await getDocs(q);
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
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  const { data: stats = { total: 0, approved: 0, pending: 0, rejected: 0 } } = useQuery({
    queryKey: ['adminManage_livelihoodStats'],
    queryFn: async () => {
      const pRef = collection(db, "livelihoodRegistrations");
      const [total, approved, pending, rejected] = await Promise.all([
        getCountFromServer(pRef),
        getCountFromServer(query(pRef, where("status", "==", "approved"))),
        getCountFromServer(query(pRef, where("status", "==", "pending"))),
        getCountFromServer(query(pRef, where("status", "==", "rejected")))
      ]);
      return {
        total: total.data().count,
        approved: approved.data().count,
        pending: pending.data().count,
        rejected: rejected.data().count
      };
    },
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, sortOrder]);

  const getApprovedCount = (programId) =>
    participants.filter(p => p.programId === programId && (p.status || "").toLowerCase() === "approved").length;

  const getSlotsLeft = (prog) => {
    if (!prog.slots) return null;
    return prog.slots - getApprovedCount(prog.id);
  };

  const openAddModal = () => {
    setEditingProgramId(null);
    setNewProgram(BLANK);
    setShowAddModal(true);
  };

  const handleEdit = (prog) => {
    setNewProgram({
      title: prog.title || "",
      description: prog.description || "",
      date: prog.date || "",
      endDate: prog.endDate || prog.date || "",
      startTime: prog.startTime || "",
      endTime: prog.endTime || "",
      location: prog.location || "",
      demographic: prog.demographic || "",
      slots: prog.slots ? String(prog.slots) : "",
      customFields: prog.customFields || [],
    });
    setEditingProgramId(prog.id);
    setShowAddModal(true);
  };

  const handleDelete = async (id, progTitle) => {
      const isConfirmed = await showConfirm(
        "Confirm Deletion",
        `${t('admin_srv_lh_confirm_delete')} "${progTitle}"?`
      );
      if (!isConfirmed) return;

      try {
        await deleteDoc(doc(db, "Programs", id));
        queryClient.invalidateQueries({ queryKey: ['adminManage_livelihoodPrograms'] });
        await showAlert("Success", "Program deleted successfully.");
      } catch (error) {
        console.error("Error deleting program:", error);
        await showAlert("Error", t('admin_srv_lh_err_delete'));
      }
    };

  const handleAddProgram = async (e) => {
    e.preventDefault();
    setSaving(true);

    // --- CALCULATE CORRECT STATUS ON SAVE ---
    const now = new Date();
    const localNow = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    const todayStr = localNow.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    const sDate = newProgram.date;
    const eDate = newProgram.endDate || newProgram.date;
    const sTime = newProgram.startTime || "00:00";
    const eTime = newProgram.endTime || "23:59";

    let calculatedStatus = "Upcoming";
    const isPastEnd = (todayStr > eDate) || (todayStr === eDate && currentTimeStr >= eTime);
    const isPastStart = (todayStr > sDate) || (todayStr === sDate && currentTimeStr >= sTime);

    if (isPastEnd) {
      calculatedStatus = "Completed";
    } else if (isPastStart) {
      calculatedStatus = "Ongoing";
    }

    const programData = {
      title: newProgram.title,
      description: newProgram.description,
      date: newProgram.date,
      endDate: newProgram.endDate || newProgram.date,
      startTime: newProgram.startTime,
      endTime: newProgram.endTime,
      time: newProgram.startTime && newProgram.endTime
        ? `${newProgram.startTime} - ${newProgram.endTime}`
        : newProgram.startTime || "",
      location: newProgram.location,
      slots: newProgram.slots,
      demographic: newProgram.demographic,
      customFields: newProgram.customFields || [],
      status: calculatedStatus, // Force the status update here
    };

    try {
      if (editingProgramId) {
        await updateDoc(doc(db, "Programs", editingProgramId), {
          ...programData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "Programs"), {
          ...programData,
          programType: "livelihood",
          attendees: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['adminManage_livelihoodPrograms'] });

      setNewProgram(BLANK);
      setEditingProgramId(null);
      setShowAddModal(false);
    } catch (err) {
      console.error("Error saving program:", err);
      await showAlert("Error", t('admin_srv_lh_err_save'));
    }
    setSaving(false);
  };

  const handleApprove = async (p) => {
    const prog = programs.find(pr => pr.id === p.programId);
    if (prog && prog.slots > 0) {
      const left = getSlotsLeft(prog);
      if (left !== null && left <= 0) {
        await showAlert("Slots Full", `No slots left for "${prog.title}". Cannot approve.`);
        return;
      }
    }
    try {
      await updateDoc(doc(db, "livelihoodRegistrations", p.id), {
        status: "approved", updatedAt: serverTimestamp(),
      });
      const residentID = p.residentID || p.userID;
      const hhID = p.householdID;
      if (residentID && hhID) {
        await createUserNotification(
          hhID,
          residentID,
          "Livelihood Registration Approved",
          `Your registration for "${prog?.title || p.programName || "the program"}" has been approved!`,
          "general",
          p.regNum || p.id
        );
      }
      if (selectedParticipant && selectedParticipant.id === p.id) {
        setSelectedParticipant(prev => ({ ...prev, status: "approved" }));
      }

      queryClient.invalidateQueries({ queryKey: ['adminManage_livelihoodRegistrations'] });
      queryClient.invalidateQueries({ queryKey: ['adminManage_livelihoodStats'] });
    } catch (err) { console.error(err); }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;
    setSaving(true);
    try {
      const p = participants.find(x => x.id === rejectTarget);
      await updateDoc(doc(db, "livelihoodRegistrations", rejectTarget), {
        status: "rejected", rejectReason: rejectReason.trim(), updatedAt: serverTimestamp(),
      });
      const residentID = p?.residentID || p?.userID;
      const hhID = p?.householdID;
      if (residentID && hhID) {
        await createUserNotification(
          hhID,
          residentID,
          "Livelihood Registration Rejected",
          `Your registration for "${p.programName || "the program"}" was rejected. Reason: ${rejectReason.trim()}`,
          "general",
          p.regNum || p.id
        );
      }
      if (selectedParticipant && selectedParticipant.id === rejectTarget) {
        setSelectedParticipant(prev => ({ ...prev, status: "rejected", rejectReason: rejectReason.trim() }));
      }
      
      queryClient.invalidateQueries({ queryKey: ['adminManage_livelihoodRegistrations'] });
      queryClient.invalidateQueries({ queryKey: ['adminManage_livelihoodStats'] });

      setShowRejectModal(false); setRejectTarget(null); setRejectReason("");
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const filteredParticipants = useMemo(() => {
    return participants
      .filter(p => {
        const s = (p.status || "pending").toLowerCase();
        if (filterStatus === "All") return true;
        return s === filterStatus.toLowerCase();
      })
      .sort((a, b) => {
        if (sortOrder === "date_desc") return (b.rawDate || 0) - (a.rawDate || 0);
        if (sortOrder === "date_asc") return (a.rawDate || 0) - (b.rawDate || 0);
        if (sortOrder === "name_asc") {
          const nameA = a.fullName || `${a.firstName || ""} ${a.lastName || ""}`.trim();
          const nameB = b.fullName || `${b.firstName || ""} ${b.lastName || ""}`.trim();
          return nameA.localeCompare(nameB);
        }
        if (sortOrder === "name_desc") {
          const nameA = a.fullName || `${a.firstName || ""} ${a.lastName || ""}`.trim();
          const nameB = b.fullName || `${b.firstName || ""} ${b.lastName || ""}`.trim();
          return nameB.localeCompare(nameA);
        }
        if (sortOrder === "prog_asc") {
          return (a.programName || "").localeCompare(b.programName || "");
        }
        return 0;
      });
  }, [participants, filterStatus, sortOrder]);

  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParticipants = filteredParticipants.slice(
    startIndex,
    startIndex + itemsPerPage
  );

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
    <>
      <div style={{ animation: "fadeIn 0.3s ease", paddingBottom: "40px" }}>
        <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
          {t('admin_srv_lh_back')}
        </button>

        <div className="as-header-section">
          <div className="as-title-wrap">
            <h1>{t('admin_srv_lh_title')}</h1>
            <p className="as-subtitle">{t('admin_srv_lh_subtitle')}</p>
          </div>
          <button className="as-btn-aqua" onClick={openAddModal} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
            {t('admin_srv_lh_btn_add')}
          </button>
        </div>

        {/* ── Active Programs Grid ── */}
        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "20px", paddingBottom: "20px" }}>
          <h3 style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            {t('admin_srv_lh_active_programs')}
            <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#6b7280" }}>
              ({programs.length})
            </span>
          </h3>
          {loadingPrograms ? (
            <p style={{ color: "#9ca3af" }}>{t('admin_srv_lh_loading')}</p>
          ) : programs.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>{t('admin_srv_lh_empty_programs')}</p>
          ) : (
            <div
              style={{
                maxHeight: "460px",
                overflowY: "auto",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "14px",
                }}
              >
                {programs.map(prog => {
                  const approved = getApprovedCount(prog.id);
                  const left = getSlotsLeft(prog);
                  const full = left !== null && left <= 0;

                  return (
                    <div
                      key={prog.id}
                      style={{
                        padding: "16px",
                        border: `2px solid ${full ? "#fca5a5" : "#2DB17B"}`,
                        background: full ? "#fff1f2" : "#ffffff",
                        borderRadius: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                    >
                      <div style={{ fontWeight: "bold", fontSize: "0.95rem", color: full ? "#991b1b" : "#166534" }}>
                        {prog.title}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                        {prog.date}
                        {prog.endDate && prog.endDate !== prog.date ? ` → ${prog.endDate}` : ""}
                        {prog.startTime ? ` • ${prog.startTime}${prog.endTime ? ` - ${prog.endTime}` : ""}` : ""}
                      </div>
                      {prog.location && (
                        <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>{prog.location}</div>
                      )}
                      {prog.demographic && (
                        <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                          <strong>{t('admin_srv_lh_target')}</strong> {prog.demographic}
                        </div>
                      )}
                      <div style={{ marginTop: "4px", fontSize: "0.82rem" }}>
                        <span style={{ fontWeight: 600, color: "#166534" }}>{approved} {t('admin_srv_lh_approved')}</span>
                        {prog.slots > 0 && (
                          <span style={{ color: "#6b7280" }}>
                            {" / "}{prog.slots} {t('admin_srv_lh_slots')} ·{" "}
                            <span style={{ fontWeight: 600, color: full ? "#991b1b" : "#15803d" }}>
                              {full ? t('admin_srv_lh_slots_full') : `${left} ${t('admin_srv_lh_slots_left')}`}
                            </span>
                          </span>
                        )}
                      </div>
                      {prog.slots > 0 && (
                        <div style={{ marginTop: "4px", height: "6px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.min((approved / prog.slots) * 100, 100)}%`,
                            background: full ? "#ef4444" : "#2DB17B",
                            borderRadius: "4px",
                            transition: "width 0.3s",
                          }} />
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
                        <button
                          className="as-btn-ghost"
                          style={{ flex: 1, padding: "6px 10px", fontSize: "0.8rem", background: "#fff" }}
                          onClick={() => handleEdit(prog)}
                        >
                          {t('admin_srv_lh_btn_edit')}
                        </button>
                        <button
                          className="as-btn-ghost"
                          style={{ flex: 1, padding: "6px 10px", fontSize: "0.8rem", color: "#0369a1", borderColor: "#bae6fd", background: "#fff" }}
                          onClick={() => setEmailBlastTarget(prog)}
                          title={t('admin_srv_lh_btn_email_title')}
                        >
                          {t('admin_srv_lh_btn_email')}
                        </button>
                        <button
                          className="as-btn-ghost"
                          style={{ flex: 1, padding: "6px 10px", fontSize: "0.8rem", color: "#dc2626", borderColor: "#fca5a5", background: "#fff" }}
                          onClick={() => handleDelete(prog.id, prog.title)}
                        >
                          {t('admin_srv_lh_btn_delete')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ margin: 0 }}>{t('admin_srv_lh_reg_title')}</h3>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff" }}
            >
              <option value="All">{t('admin_srv_lh_filter_all')}</option>
              <option value="pending">{t('admin_srv_lh_stat_pending')}</option>
              <option value="approved">{t('admin_srv_lh_stat_approved')}</option>
              <option value="rejected">{t('admin_srv_lh_stat_rejected')}</option>
            </select>

            <select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff" }}
            >
              <option value="date_desc">{t('admin_srv_lh_sort_date_new')}</option>
              <option value="date_asc">{t('admin_srv_lh_sort_date_old')}</option>
              <option value="name_asc">{t('admin_srv_lh_sort_name_asc')}</option>
              <option value="name_desc">{t('admin_srv_lh_sort_name_desc')}</option>
              <option value="prog_asc">{t('admin_srv_lh_sort_prog_asc')}</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: t('admin_srv_lh_stat_total'), value: stats.total, bg: "#fff", border: "#e5e7eb", color: "#111827" },
            { label: t('admin_srv_lh_stat_approved'), value: stats.approved, bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
            { label: t('admin_srv_lh_stat_pending'), value: stats.pending, bg: "#fffbeb", border: "#fde68a", color: "#a16207" },
            { label: t('admin_srv_lh_stat_rejected'), value: stats.rejected, bg: "#fff1f2", border: "#fecdd3", color: "#be123c" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, padding: "18px 20px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
              <div style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "6px" }}>{s.label}</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        {loadingParts ? (
          <p style={{ color: "#9ca3af" }}>{t('admin_srv_lh_loading')}</p>
        ) : (
          <div className="req-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="req-table" style={{ width: "100%", minWidth: "850px" }}>
              <thead>
                <tr style={{ textAlign: "center" }}>
                  {[t('admin_srv_lh_th_ref'), t('admin_srv_lh_th_name'), t('admin_srv_lh_th_prog'), t('admin_srv_lh_th_slots'), t('admin_srv_lh_th_applied'), t('admin_srv_lh_th_status'), t('admin_srv_lh_th_action')].map(h => (
                    <th key={h} style={{ textAlign: "center" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>
                      {t('admin_srv_lh_table_empty')}
                    </td>
                  </tr>
                )}
                {paginatedParticipants.map(p => {
                  const prog = programs.find(pr => pr.id === p.programId);
                  const left = prog ? getSlotsLeft(prog) : null;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedParticipant(p)}
                      style={{ cursor: "pointer", textAlign: "center" }}
                    >
                      <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        {p.regNum || p.id.slice(0, 8)}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "—"}
                      </td>
                      <td style={{ maxWidth: "160px" }}>
                        <div style={{ fontWeight: 500, color: "#111827", fontSize: "0.85rem" }}>
                          {p.programName || "—"}
                        </div>
                        {p.programDate && (
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{p.programDate}</div>
                        )}
                      </td>
                      <td>
                        {left !== null ? (
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: left <= 0 ? "#991b1b" : left <= 5 ? "#a16207" : "#166534" }}>
                            {left <= 0 ? t('admin_srv_lh_td_full') : `${left} ${t('admin_srv_lh_slots_left')}`}
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>—</span>
                        )}
                      </td>
                      <td style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                        {formatTs(p.submittedAt)}
                      </td>
                      <td>
                        <StatusBadge status={p.status} t={t} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-view"
                          style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedParticipant(p);
                          }}
                        >
                          {t('admin_srv_lh_btn_details')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredParticipants.length > 0 && (
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
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + itemsPerPage, filteredParticipants.length)} of{" "}
                  {filteredParticipants.length} entries
                </div>

                {totalPages > 1 && (
                  <div className="af-pagination" style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="af-page-btn"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    {renderPageNumbers()}
                    <button
                      className="af-page-btn"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Add / Edit Program Modal ── */}
        {showAddModal && (
          <div className="as-modal-overlay" onClick={() => { setShowAddModal(false); setNewProgram(BLANK); setEditingProgramId(null); }}>
            <div className="as-modal-content" style={{ maxWidth: "700px", width: "100%" }} onClick={e => e.stopPropagation()}>
              <div className="as-modal-header">
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                  {editingProgramId ? t('admin_srv_lh_modal_edit_title') : t('admin_srv_lh_modal_add_title')}
                </h2>
                <button className="as-modal-close" onClick={() => { setShowAddModal(false); setNewProgram(BLANK); setEditingProgramId(null); }}>&times;</button>
              </div>
              <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left" }}>
                <form onSubmit={handleAddProgram}>
                  <div style={{ marginBottom: "15px" }}>
                    <label className="as-form-label">{t('admin_srv_lh_modal_prog_title')} <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="text"
                      className="as-form-input"
                      required
                      value={newProgram.title}
                      onChange={e => setNewProgram({ ...newProgram, title: e.target.value })}
                      placeholder={t('admin_srv_lh_modal_prog_title_ph')}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                    <div>
                      <label className="as-form-label">{t('admin_srv_lh_modal_start_date')} <span style={{ color: "red" }}>*</span></label>
                      <input
                        type="date"
                        className="as-form-input"
                        required
                        min={getTodayStr()}
                        value={newProgram.date}
                        onChange={e => {
                          const newDate = e.target.value;
                          setNewProgram(prev => ({
                            ...prev,
                            date: newDate,
                            endDate: prev.endDate && prev.endDate < newDate ? newDate : prev.endDate,
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="as-form-label">
                        {t('admin_srv_lh_modal_end_date')}
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>{t('admin_srv_lh_modal_end_date_hint')}</span>
                      </label>
                      <input
                        type="date"
                        className="as-form-input"
                        min={newProgram.date || getTodayStr()}
                        value={newProgram.endDate || ""}
                        onChange={e => setNewProgram({ ...newProgram, endDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="as-form-label">{t('admin_srv_lh_modal_start_time')} <span style={{ color: "red" }}>*</span></label>
                      <input
                        type="time"
                        className="as-form-input"
                        required
                        value={newProgram.startTime}
                        onChange={e => setNewProgram({ ...newProgram, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="as-form-label">{t('admin_srv_lh_modal_end_time')} <span style={{ color: "red" }}>*</span></label>
                      <input
                        type="time"
                        className="as-form-input"
                        required
                        value={newProgram.endTime}
                        onChange={e => setNewProgram({ ...newProgram, endTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="as-form-label">{t('admin_srv_lh_modal_location')}</label>
                      <input
                        type="text"
                        className="as-form-input"
                        value={newProgram.location}
                        onChange={e => setNewProgram({ ...newProgram, location: e.target.value })}
                        placeholder={t('admin_srv_lh_modal_location_ph')}
                      />
                    </div>
                    <div>
                      <label className="as-form-label">{t('admin_srv_lh_modal_total_slots')}</label>
                      <input
                        type="number"
                        min="1"
                        className="as-form-input"
                        value={newProgram.slots}
                        onChange={e => setNewProgram({ ...newProgram, slots: e.target.value })}
                        placeholder={t('admin_srv_lh_modal_total_slots_ph')}
                      />
                    </div>
                    <div>
                      <label className="as-form-label">{t('admin_srv_lh_modal_target')}</label>
                      <select
                        className="as-form-input"
                        value={newProgram.demographic}
                        onChange={e => setNewProgram({ ...newProgram, demographic: e.target.value })}
                      >
                        <option value="">{t('admin_srv_lh_modal_target_select')}</option>
                        <option value="All Residents">{t('admin_srv_lh_modal_target_all')}</option>
                        <option value="Student">Student</option>
                        <option value="Senior Citizen">Senior Citizen</option>
                        <option value="PWD">PWD</option>
                        <option value="Solo Parent">Solo Parent</option>
                        <option value="OFW">OFW</option>
                        <option value="Indigenous People">Indigenous People</option>
                        <option value="LGBT">LGBT</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: "15px" }}>
                    <label className="as-form-label">{t('admin_srv_lh_modal_desc')} <span style={{ color: "red" }}>*</span></label>
                    <textarea
                      className="as-form-textarea"
                      required
                      rows="3"
                      value={newProgram.description}
                      onChange={e => setNewProgram({ ...newProgram, description: e.target.value })}
                      placeholder={t('admin_srv_lh_modal_desc_ph')}
                    />
                  </div>

                  <div style={{ marginTop: "16px", background: "#f9fafb", padding: "14px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "#374151" }}>{t('admin_srv_lh_modal_default_fields')}</h4>
                    <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0 0 8px 0" }}>
                      {t('admin_srv_lh_modal_default_desc')}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {["Full Name", "Complete Address", "Contact Number", "Email", "Valid ID / Clearance"].map(f => (
                        <span key={f} style={{ background: "#e5e7eb", color: "#4b5563", padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 500 }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <FormBuilder
                    fields={newProgram.customFields}
                    onChange={fields => setNewProgram({ ...newProgram, customFields: fields })}
                  />

                  <div style={{ padding: "14px 0 0 0", marginTop: "20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: '8px' }}>
                    <button type="button" className="as-btn-ghost" onClick={() => { setShowAddModal(false); setNewProgram(BLANK); setEditingProgramId(null); }}>{t('admin_srv_lh_modal_btn_cancel')}</button>
                    <button
                      type="submit"
                      className="as-btn-aqua"
                      style={{ padding: "8px 20px" }}
                      disabled={saving}
                    >
                      {saving ? t('admin_srv_lh_modal_btn_saving') : editingProgramId ? t('admin_srv_lh_modal_btn_update') : t('admin_srv_lh_modal_btn_save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── Participant Details Modal ── */}
        {selectedParticipant && (() => {
          const prog = programs.find(pr => pr.id === selectedParticipant.programId);
          const left = prog ? getSlotsLeft(prog) : null;
          const status = (selectedParticipant.status || "pending").toLowerCase();
          const slotsFull = left !== null && left <= 0 && status === "pending";

          return (
            <div className="as-modal-overlay" onClick={() => setSelectedParticipant(null)}>
              <div
                className="as-modal-content"
                style={{ maxWidth: "560px" }}
                onClick={e => e.stopPropagation()}
              >
                <div className="as-modal-header">
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>{t('admin_srv_lh_det_title')}</h2>
                  <button className="as-modal-close" onClick={() => setSelectedParticipant(null)}>&times;</button>
                </div>

                <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left", maxHeight: "70vh", overflowY: "auto" }}>
                  <div className="admin-details" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                      <div style={{ fontSize: "1rem" }}>
                        <strong>{t('admin_srv_lh_det_ref')}</strong>{" "}
                        <span style={{ fontSize: "1rem", color: "#111827", fontWeight: 500 }}>
                          {selectedParticipant.regNum || selectedParticipant.id}
                        </span>
                      </div>
                      <StatusBadge status={selectedParticipant.status} t={t} />
                    </div>

                    <p><strong>{t('admin_srv_lh_det_name')}</strong> <span>{selectedParticipant.fullName || `${selectedParticipant.firstName || ""} ${selectedParticipant.lastName || ""}`.trim() || "—"}</span></p>
                    <p><strong>{t('admin_srv_lh_det_prog')}</strong> <span>{selectedParticipant.programName || prog?.title || "—"}</span></p>
                    <p><strong>{t('admin_srv_lh_det_schedule')}</strong> <span>{selectedParticipant.programDate || prog?.date || "—"}</span></p>
                    <p><strong>{t('admin_srv_lh_det_applied')}</strong> <span>{formatTs(selectedParticipant.submittedAt)}</span></p>

                    {selectedParticipant.rejectReason && (
                      <div style={{ marginTop: "8px", background: "#fef2f2", padding: "10px", borderRadius: "6px", border: "1px solid #fecaca" }}>
                        <strong style={{ color: "#991b1b" }}>{t('admin_srv_lh_det_reject_reason')}</strong>
                        <p style={{ margin: "4px 0 0 0", color: "#b91c1c" }}>{selectedParticipant.rejectReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {status === "pending" && (
                  <div style={{ padding: "14px 24px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      className="btn-reject"
                      onClick={() => {
                        const targetId = selectedParticipant.id;
                        setSelectedParticipant(null);
                        setRejectTarget(targetId);
                        setRejectReason("");
                        setShowRejectModal(true);
                      }}
                    >
                      {t('admin_srv_lh_det_btn_reject')}
                    </button>
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(selectedParticipant)}
                      disabled={slotsFull}
                      style={{ opacity: slotsFull ? 0.6 : 1, cursor: slotsFull ? "not-allowed" : "pointer" }}
                    >
                      {slotsFull ? t('admin_srv_lh_det_btn_full') : t('admin_srv_lh_det_btn_approve')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Reject Modal ── */}
        {showRejectModal && (
          <div className="as-modal-overlay" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>
            <div className="as-modal-content" style={{ maxWidth: "420px" }} onClick={e => e.stopPropagation()}>
              <div className="as-modal-header">
                <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>{t('admin_srv_lh_rej_title')}</h2>
                <button className="as-modal-close" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>&times;</button>
              </div>
              <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left" }}>
                <form onSubmit={handleConfirmReject}>
                  <label className="as-form-label">{t('admin_srv_lh_rej_reason')} <span style={{ color: "red" }}>*</span></label>
                  <textarea
                    className="as-form-textarea"
                    rows="3"
                    required
                    placeholder={t('admin_srv_lh_rej_ph')}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: '8px' }}>
                    <button type="button" className="as-btn-ghost" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>{t('admin_srv_lh_modal_btn_cancel')}</button>
                    <button
                      type="submit"
                      style={{ padding: "8px 18px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
                      disabled={saving}
                    >
                      {saving ? t('admin_srv_lh_rej_btn_processing') : t('admin_srv_lh_rej_btn_confirm')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {emailBlastTarget && (
        <EmailBlastModal
          sourceType="livelihood"
          sourceId={emailBlastTarget.id}
          subject={`[3S+ Sense] Livelihood Program: ${emailBlastTarget.title}`}
          html={buildLivelihoodEmail(emailBlastTarget)}
          label="Approved Registrants"
          program={emailBlastTarget}
          onClose={() => setEmailBlastTarget(null)}
        />
      )}
    </>
  );
}