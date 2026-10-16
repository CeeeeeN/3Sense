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
import { useQuery, useQueryClient } from '@tanstack/react-query'; // <-- Added React Query

const getTodayStr = () => new Date().toISOString().split("T")[0];

const formatTs = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const StatusBadge = ({ status }) => {
  const rawStatus = status || "Pending";
  const statusClass = String(rawStatus).toLowerCase().replace(/\s+/g, '-');
  const formattedText = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

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
  const queryClient = useQueryClient(); // <-- For cache invalidation

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("date_desc");

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingProgramId, setEditingProgramId] = useState(null);
  const [emailBlastTarget, setEmailBlastTarget] = useState(null);
  const [newProgram, setNewProgram] = useState(BLANK);

  useEffect(() => {
    runStatusMaintenance();
  }, []);

  // ─── 1. OPTIMIZED: React Query for Programs ───
  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ['adminManage_livelihoodPrograms'],
    queryFn: async () => {
      const q = query(
        collection(db, "Programs"), 
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

  // ─── 2. OPTIMIZED: React Query for Participants ───
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

  // ─── 3. OPTIMIZED: Server-side Counts for Stats ───
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
    if (!window.confirm(`Are you sure you want to delete "${progTitle}"?`)) return;
    try {
      await deleteDoc(doc(db, "Programs", id));
      queryClient.invalidateQueries({ queryKey: ['adminManage_livelihoodPrograms'] });
    } catch (error) {
      console.error("Error deleting program:", error);
      alert("Failed to delete program. Please try again.");
    }
  };

  const handleAddProgram = async (e) => {
    e.preventDefault();
    setSaving(true);

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
          status: "Upcoming",
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
      alert("Failed to save program. Please try again.");
    }
    setSaving(false);
  };

  const handleApprove = async (p) => {
    const prog = programs.find(pr => pr.id === p.programId);
    if (prog && prog.slots > 0) {
      const left = getSlotsLeft(prog);
      if (left !== null && left <= 0) {
        alert(`No slots left for "${prog.title}". Cannot approve.`);
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
          &larr; Back to Services Hub
        </button>

        <div className="as-header-section">
          <div className="as-title-wrap">
            <h1>Livelihood Skills Training</h1>
            <p className="as-subtitle">Manage livelihood programs, skills training, and registrations</p>
          </div>
          <button className="as-btn-aqua" onClick={openAddModal} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
            + Add New Program
          </button>
        </div>

        {/* ── Active Programs Grid ── */}
        <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "20px", paddingBottom: "20px" }}>
          <h3 style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            Active Programs
            <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#6b7280" }}>
              ({programs.length})
            </span>
          </h3>
          {loadingPrograms ? (
            <p style={{ color: "#9ca3af" }}>Loading…</p>
          ) : programs.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>No programs yet.</p>
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
                          <strong>Target:</strong> {prog.demographic}
                        </div>
                      )}
                      <div style={{ marginTop: "4px", fontSize: "0.82rem" }}>
                        <span style={{ fontWeight: 600, color: "#166534" }}>{approved} approved</span>
                        {prog.slots > 0 && (
                          <span style={{ color: "#6b7280" }}>
                            {" / "}{prog.slots} slots ·{" "}
                            <span style={{ fontWeight: 600, color: full ? "#991b1b" : "#15803d" }}>
                              {full ? "Full" : `${left} left`}
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
                          Edit
                        </button>
                        <button
                          className="as-btn-ghost"
                          style={{ flex: 1, padding: "6px 10px", fontSize: "0.8rem", color: "#0369a1", borderColor: "#bae6fd", background: "#fff" }}
                          onClick={() => setEmailBlastTarget(prog)}
                          title="Send email to approved registrants"
                        >
                          Email
                        </button>
                        <button
                          className="as-btn-ghost"
                          style={{ flex: 1, padding: "6px 10px", fontSize: "0.8rem", color: "#dc2626", borderColor: "#fca5a5", background: "#fff" }}
                          onClick={() => handleDelete(prog.id, prog.title)}
                        >
                          Delete
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
          <h3 style={{ margin: 0 }}>Participant Registrations</h3>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff" }}
            >
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff" }}
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="name_asc">Participant: A to Z</option>
              <option value="name_desc">Participant: Z to A</option>
              <option value="prog_asc">Program: A to Z</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "Total", value: stats.total, bg: "#fff", border: "#e5e7eb", color: "#111827" },
            { label: "Approved", value: stats.approved, bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
            { label: "Pending", value: stats.pending, bg: "#fffbeb", border: "#fde68a", color: "#a16207" },
            { label: "Rejected", value: stats.rejected, bg: "#fff1f2", border: "#fecdd3", color: "#be123c" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, padding: "18px 20px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
              <div style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "6px" }}>{s.label}</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        {loadingParts ? (
          <p style={{ color: "#9ca3af" }}>Loading registrations…</p>
        ) : (
          <div className="req-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="req-table" style={{ width: "100%", minWidth: "850px" }}>
              <thead>
                <tr style={{ textAlign: "center" }}>
                  {["Ref #", "Full Name", "Program", "Slots Left", "Applied", "Status", "Action"].map(h => (
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
                      No registrations match your criteria.
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
                            {left <= 0 ? "Full" : `${left} left`}
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>—</span>
                        )}
                      </td>
                      <td style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                        {formatTs(p.submittedAt)}
                      </td>
                      <td>
                        <StatusBadge status={p.status} />
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
                          More Details
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
              <div className="as-modal-header" style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <h2 style={{ color: "#111827", margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                  {editingProgramId ? "Edit Livelihood Program" : "Add Livelihood Program"}
                </h2>
                <button className="as-modal-close" style={{ color: "#6b7280" }} onClick={() => { setShowAddModal(false); setNewProgram(BLANK); setEditingProgramId(null); }}>&times;</button>
              </div>
              <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left" }}>
                <form onSubmit={handleAddProgram}>
                  <div style={{ marginBottom: "15px" }}>
                    <label className="as-form-label">Program Title <span style={{ color: "red" }}>*</span></label>
                    <input
                      type="text"
                      className="as-form-input"
                      required
                      value={newProgram.title}
                      onChange={e => setNewProgram({ ...newProgram, title: e.target.value })}
                      placeholder="e.g. Food Processing & Packaging"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                    <div>
                      <label className="as-form-label">Start Date <span style={{ color: "red" }}>*</span></label>
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
                        End Date
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>(same as start if 1 day)</span>
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
                      <label className="as-form-label">Start Time <span style={{ color: "red" }}>*</span></label>
                      <input
                        type="time"
                        className="as-form-input"
                        required
                        value={newProgram.startTime}
                        onChange={e => setNewProgram({ ...newProgram, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="as-form-label">End Time <span style={{ color: "red" }}>*</span></label>
                      <input
                        type="time"
                        className="as-form-input"
                        required
                        value={newProgram.endTime}
                        onChange={e => setNewProgram({ ...newProgram, endTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="as-form-label">Location</label>
                      <input
                        type="text"
                        className="as-form-input"
                        value={newProgram.location}
                        onChange={e => setNewProgram({ ...newProgram, location: e.target.value })}
                        placeholder="e.g. Barangay Multi-Purpose Hall"
                      />
                    </div>
                    <div>
                      <label className="as-form-label">Total Slots</label>
                      <input
                        type="number"
                        min="1"
                        className="as-form-input"
                        value={newProgram.slots}
                        onChange={e => setNewProgram({ ...newProgram, slots: e.target.value })}
                        placeholder="e.g. 30"
                      />
                    </div>
                    <div>
                      <label className="as-form-label">Target Demographic</label>
                      <input
                        type="text"
                        className="as-form-input"
                        value={newProgram.demographic}
                        onChange={e => setNewProgram({ ...newProgram, demographic: e.target.value })}
                        placeholder="e.g. Students, Women, Senior"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "15px" }}>
                    <label className="as-form-label">Description <span style={{ color: "red" }}>*</span></label>
                    <textarea
                      className="as-form-textarea"
                      required
                      rows="3"
                      value={newProgram.description}
                      onChange={e => setNewProgram({ ...newProgram, description: e.target.value })}
                      placeholder="Describe the program objectives…"
                    />
                  </div>

                  <div style={{ marginTop: "16px", background: "#f9fafb", padding: "14px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "#374151" }}>Default Collected Fields</h4>
                    <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0 0 8px 0" }}>
                      These are automatically collected. Do not recreate them.
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

                  <div style={{ padding: "14px 0 0 0", marginTop: "20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      className="as-btn-aqua"
                      style={{ padding: "8px 20px" }}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : editingProgramId ? "Update Program" : "Save Program"}
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
                <div className="as-modal-header" style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <h2 style={{ color: "#111827", margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Registration Details</h2>
                  <button className="as-modal-close" style={{ color: "#6b7280" }} onClick={() => setSelectedParticipant(null)}>&times;</button>
                </div>

                <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left", maxHeight: "70vh", overflowY: "auto" }}>
                  <div className="admin-details" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                      <div>
                        <strong>Ref #:</strong> <span style={{ fontFamily: "monospace" }}>{selectedParticipant.regNum || selectedParticipant.id}</span>
                      </div>
                      <StatusBadge status={selectedParticipant.status} />
                    </div>

                    <p><strong>Full Name:</strong> <span>{selectedParticipant.fullName || `${selectedParticipant.firstName || ""} ${selectedParticipant.lastName || ""}`.trim() || "—"}</span></p>
                    <p><strong>Program:</strong> <span>{selectedParticipant.programName || prog?.title || "—"}</span></p>
                    <p><strong>Schedule:</strong> <span>{selectedParticipant.programDate || prog?.date || "—"}</span></p>
                    <p><strong>Date Applied:</strong> <span>{formatTs(selectedParticipant.submittedAt)}</span></p>

                    {selectedParticipant.rejectReason && (
                      <div style={{ marginTop: "8px", background: "#fef2f2", padding: "10px", borderRadius: "6px", border: "1px solid #fecaca" }}>
                        <strong style={{ color: "#991b1b" }}>Rejection Reason:</strong>
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
                      Reject
                    </button>
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(selectedParticipant)}
                      disabled={slotsFull}
                      style={{ opacity: slotsFull ? 0.6 : 1, cursor: slotsFull ? "not-allowed" : "pointer" }}
                    >
                      {slotsFull ? "Slots Full" : "Approve"}
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
              <div className="as-modal-header" style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <h2 style={{ color: "#111827", margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Reject Registration</h2>
                <button className="as-modal-close" style={{ color: "#6b7280" }} onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>&times;</button>
              </div>
              <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left" }}>
                <form onSubmit={handleConfirmReject}>
                  <label className="as-form-label">Reason for Rejection <span style={{ color: "red" }}>*</span></label>
                  <textarea
                    className="as-form-textarea"
                    rows="3"
                    required
                    placeholder="Provide a brief explanation…"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                  <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      style={{ padding: "8px 18px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
                      disabled={saving}
                    >
                      {saving ? "Processing…" : "Confirm Rejection"}
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