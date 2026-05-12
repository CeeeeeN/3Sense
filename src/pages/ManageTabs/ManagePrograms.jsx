import React, { useState, useEffect } from "react";
import {
  Manage_IconLocation,
  Manage_IconCalendar,
  IconAdd,
  Manage_IconQR,
  IconDownload,
  IconConfirmCheck,
} from "../../components/Icons";
import { QRCodeSVG } from "qrcode.react";
import FormBuilder from "../../components/FormBuilder";
import { auth, db } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../../services/logger";
import { runStatusMaintenance } from "../../services/statusUpdater";
import { createUserNotification } from "../../services/userNotifications";

// ── Helpers ───────────────────────────────────────────────────────────────────
const PREVIEW_LIMIT = 120;
const getTodayStr = () => new Date().toISOString().split("T")[0];

const formatTs = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

// ── Sub-components ────────────────────────────────────────────────────────────
function DescriptionPreview({ text }) {
  const [expanded, setExpanded] = React.useState(false);
  if (!text) return null;
  const isLong = text.length > PREVIEW_LIMIT;
  return (
    <p className="as-card-desc" style={{ marginBottom: 0 }}>
      {isLong && !expanded ? text.slice(0, PREVIEW_LIMIT) + "…" : text}
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            marginLeft: 6, background: "none", border: "none", padding: 0,
            color: "#317D89", fontWeight: 700, fontSize: "0.8rem",
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          {expanded ? "Show Less" : "Read More"}
        </button>
      )}
    </p>
  );
}

function StatusBadge({ status }) {
  const s = (status || "pending").toLowerCase();
  const map = {
    approved: { bg: "#dcfce7", color: "#166534" },
    pending: { bg: "#fef3c7", color: "#92400e" },
    rejected: { bg: "#fee2e2", color: "#991b1b" },
    registered: { bg: "#dbeafe", color: "#1e40af" },
  };
  const c = map[s] || map.pending;
  return (
    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600, background: c.bg, color: c.color }}>
      {status || "pending"}
    </span>
  );
}

// ── StatBar (from ManageServices) ─────────────────────────────────────────────
function StatBar({ stats }) {
  const statusColors = {
    pending: { bg: "#fef3c7", text: "#92400e" },
    approved: { bg: "#dcfce7", text: "#166534" },
    rejected: { bg: "#fee2e2", text: "#991b1b" },
    registered: { bg: "#dbeafe", text: "#1e40af" },
    analyzed: { bg: "#e0e7ff", text: "#3730a3" },
  };
  return (
    <div style={{ marginTop: "12px", padding: "10px 12px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>Total registrations</span>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>{stats.total}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
        {Object.entries(stats.byStatus).map(([status, count]) => {
          const c = statusColors[status.toLowerCase()] || { bg: "#f3f4f6", text: "#4b5563" };
          return (
            <span key={status} style={{ fontSize: "0.72rem", padding: "2px 7px", borderRadius: "10px", background: c.bg, color: c.text, fontWeight: 600 }}>
              {status}: {count}
            </span>
          );
        })}
      </div>
      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Latest: {stats.latest}</div>
    </div>
  );
}

// ── ProgramWorkspace (with approve / reject / remove like ServiceLivelihood) ──
function ProgramWorkspace({ program, onBack, adminName, adminRole }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Real-time attendees from subcollection
  useEffect(() => {
    const attendeesRef = collection(db, "Programs", program.id, "attendees");
    const unsub = onSnapshot(
      attendeesRef,
      (snap) => {
        setAttendees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.error("Error loading attendees:", err); setLoading(false); }
    );
    return () => unsub();
  }, [program.id]);

  // ── Slot logic (only APPROVED count against slots, mirroring ServiceLivelihood) ──
  const totalSlots = parseInt(program.slots || "0", 10);
  const getApprovedCount = () =>
    attendees.filter((a) => (a.status || "").toLowerCase() === "approved").length;
  const getSlotsLeft = () => {
    if (!totalSlots) return null;
    return totalSlots - getApprovedCount();
  };
  const slotsLeft = getSlotsLeft();
  const isFull = slotsLeft !== null && slotsLeft <= 0;

  // ── Stats ──────────────────────────────────────────────────────────
  const stats = {
    total: attendees.length,
    approved: attendees.filter((a) => (a.status || "").toLowerCase() === "approved").length,
    pending: attendees.filter((a) => (a.status || "pending").toLowerCase() === "pending").length,
    rejected: attendees.filter((a) => (a.status || "").toLowerCase() === "rejected").length,
    registered: attendees.filter((a) => (a.status || "").toLowerCase() === "registered").length,
  };

  // ── Approve ────────────────────────────────────────────────────────
  const handleApprove = async (a) => {
    if (totalSlots > 0) {
      const left = getSlotsLeft();
      if (left !== null && left <= 0) {
        alert(`No slots left for "${program.title}". Cannot approve.`);
        return;
      }
    }
    try {
      await updateDoc(doc(db, "Programs", program.id, "attendees", a.id), {
        status: "approved",
        updatedAt: serverTimestamp(),
      });

      // sync flat collection
      const regQ = query(
        collection(db, "programRegistrations"),
        where("programId", "==", program.id),
        where("userID", "==", a.userID)
      );

      const regSnap = await getDocs(regQ);

      for (const regDoc of regSnap.docs) {
        await updateDoc(doc(db, "programRegistrations", regDoc.id), {
          status: "approved",
          updatedAt: serverTimestamp(),
        });
      }
      const residentID = a.userID || a.residentID;
      const hhID = a.householdID;
      if (residentID && hhID) {
        await createUserNotification(
          hhID, residentID,
          "Program Registration Approved",
          `Your registration for "${program.title}" has been approved!`,
          "general",
          a.id
        );
      }
    } catch (err) { console.error(err); }
  };

  // ── Reject ─────────────────────────────────────────────────────────
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;
    setSaving(true);
    try {
      const a = attendees.find((x) => x.id === rejectTarget);
      await updateDoc(doc(db, "Programs", program.id, "attendees", rejectTarget), {
        status: "rejected",
        rejectReason: rejectReason.trim(),
        updatedAt: serverTimestamp(),
      });

      // sync flat collection
      const regQ = query(
        collection(db, "programRegistrations"),
        where("programId", "==", program.id),
        where("userID", "==", a.userID)
      );

      const regSnap = await getDocs(regQ);

      for (const regDoc of regSnap.docs) {
        await updateDoc(doc(db, "programRegistrations", regDoc.id), {
          status: "rejected",
          rejectReason: rejectReason.trim(),
          updatedAt: serverTimestamp(),
        });
      }
      const residentID = a?.userID || a?.residentID;
      const hhID = a?.householdID;
      if (residentID && hhID) {
        await createUserNotification(
          hhID, residentID,
          "Program Registration Rejected",
          `Your registration for "${program.title}" was rejected. Reason: ${rejectReason.trim()}`,
          "general",
          a.id
        );
      }
      setShowRejectModal(false); setRejectTarget(null); setRejectReason("");
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  // ── Remove approval → back to pending ─────────────────────────────
  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "Programs", program.id, "attendees", removeTarget), {
        status: "pending",
        rejectReason: "",
        updatedAt: serverTimestamp(),
      });

      // get attendee
      const attendee = attendees.find((x) => x.id === removeTarget);

      const regQ = query(
        collection(db, "programRegistrations"),
        where("programId", "==", program.id),
        where("userID", "==", attendee?.userID)
      );

      const regSnap = await getDocs(regQ);

      for (const regDoc of regSnap.docs) {
        await updateDoc(doc(db, "programRegistrations", regDoc.id), {
          status: "pending",
          rejectReason: "",
          updatedAt: serverTimestamp(),
        });
      }
      setShowRemoveModal(false); setRemoveTarget(null);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", paddingBottom: "40px" }}>
      <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
        &larr; Back to Programs
      </button>

      {/* ── Program Header ── */}
      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>{program.title}</h1>
          <p className="as-subtitle">
            {program.date && (
              <>
                {program.date}
                {program.endDate && program.endDate !== program.date ? ` → ${program.endDate}` : ""}
              </>
            )}
            {program.location && <> · <span style={{ color: "#ef4444" }}>📍</span> {program.location}</>}
            {program.time && <> · <span>🕐</span> {program.time}</>}
          </p>
        </div>

        {/* Slot indicator */}
        {totalSlots > 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "12px 20px", borderRadius: "12px",
            background: isFull ? "#fff1f2" : "#f0fdf4",
            border: `1px solid ${isFull ? "#fecdd3" : "#bbf7d0"}`,
            minWidth: "100px",
          }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: isFull ? "#be123c" : "#15803d" }}>
              {isFull ? "Full" : slotsLeft}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              {isFull ? `0 / ${totalSlots} slots` : `of ${totalSlots} slots left`}
            </div>
            <div style={{ marginTop: "8px", width: "100%", height: "6px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min((getApprovedCount() / totalSlots) * 100, 100)}%`,
                background: isFull ? "#ef4444" : "#2DB17B",
                borderRadius: "4px", transition: "width 0.3s",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total", value: stats.total, bg: "#fff", border: "#e5e7eb", color: "#111827" },
          { label: "Approved", value: stats.approved, bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
          { label: "Pending", value: stats.pending, bg: "#fffbeb", border: "#fde68a", color: "#a16207" },
          { label: "Rejected", value: stats.rejected, bg: "#fff1f2", border: "#fecdd3", color: "#be123c" },
          { label: "Registered", value: stats.registered, bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg, padding: "18px 20px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
            <div style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <p style={{ color: "#9ca3af" }}>Loading registrations…</p>
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <tr>
                {["User ID", "Name", "Contact", "Date Registered", "Slots Left", "Status", "Actions"].map((h) => (
                  <th key={h} style={{
                    padding: "14px 16px", fontWeight: 600, color: "#4b5563",
                    fontSize: "0.82rem", textAlign: h === "Actions" ? "right" : "left",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", color: "#9ca3af", textAlign: "center" }}>
                    No one has registered for this program yet.
                  </td>
                </tr>
              ) : (
                attendees.map((a) => {
                  const status = (a.status || "pending").toLowerCase();
                  const left = getSlotsLeft();
                  const slotsFull = left !== null && left <= 0 && status === "pending";

                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#6b7280" }}>
                        {a.userID || a.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 500 }}>
                        {a.userName || a.fullName || `${a.firstName || ""} ${a.lastName || ""}`.trim() || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#6b7280" }}>
                        {a.contact || a.contactNumber || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "0.85rem" }}>
                        {a.createdAt ? formatTs(a.createdAt) : "—"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {left !== null ? (
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: left <= 0 ? "#991b1b" : left <= 5 ? "#a16207" : "#166534" }}>
                            {left <= 0 ? "Full" : `${left} left`}
                          </span>
                        ) : <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <StatusBadge status={a.status || "pending"} />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {status === "pending" || status === "registered" ? (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              style={{ padding: "5px 12px", background: slotsFull ? "#e5e7eb" : "#2DB17B", color: slotsFull ? "#9ca3af" : "#fff", border: "none", borderRadius: "6px", cursor: slotsFull ? "not-allowed" : "pointer", fontSize: "0.8rem" }}
                              onClick={() => !slotsFull && handleApprove(a)}
                              disabled={slotsFull}
                              title={slotsFull ? "No slots available" : "Approve"}
                            >Approve</button>
                            <button
                              style={{ padding: "5px 12px", background: "#fff", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
                              onClick={() => { setRejectTarget(a.id); setRejectReason(""); setShowRejectModal(true); }}
                            >Reject</button>
                          </div>
                        ) : status === "approved" ? (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                            <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>Approved</span>
                            <button
                              style={{ padding: "5px 12px", background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
                              onClick={() => { setRemoveTarget(a.id); setShowRemoveModal(true); }}
                            >Remove</button>
                          </div>
                        ) : status === "rejected" ? (
                          <div style={{ textAlign: "right" }}>
                            <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>Rejected</span>
                            {a.rejectReason && (
                              <div style={{ color: "#ef4444", fontSize: "0.75rem", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }} title={a.rejectReason}>
                                "{a.rejectReason}"
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: "400px" }}>
            <div className="as-modal-header">
              <h2>Reject Registration</h2>
              <button className="as-modal-close" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>&times;</button>
            </div>
            <div className="as-modal-body">
              <form onSubmit={handleConfirmReject}>
                <label className="as-form-label">Reason for Rejection <span style={{ color: "red" }}>*</span></label>
                <textarea className="as-form-textarea" rows="3" required placeholder="Provide a brief explanation…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                <div className="as-modal-actions" style={{ marginTop: "15px" }}>
                  <button type="button" className="as-btn-ghost" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>Cancel</button>
                  <button type="submit" style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }} disabled={saving}>
                    {saving ? "Processing…" : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Modal ── */}
      {showRemoveModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: "400px" }}>
            <div className="as-modal-header">
              <h2>Remove Approval</h2>
              <button className="as-modal-close" onClick={() => { setShowRemoveModal(false); setRemoveTarget(null); }}>&times;</button>
            </div>
            <div className="as-modal-body">
              <p style={{ color: "#4b5563", marginBottom: "20px", lineHeight: 1.6 }}>
                This will move the registration back to <strong>Pending</strong>, freeing up the slot.
              </p>
              <div className="as-modal-actions">
                <button className="as-btn-ghost" onClick={() => { setShowRemoveModal(false); setRemoveTarget(null); }}>Cancel</button>
                <button style={{ padding: "8px 16px", background: "#6b7280", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }} onClick={handleConfirmRemove} disabled={saving}>
                  {saving ? "Processing…" : "Yes, Remove Approval"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty form state ──────────────────────────────────────────────────────────
const EMPTY_PROGRAM = {
  title: "", description: "", date: "", endDate: "",
  startTime: "", endTime: "", location: "", demographic: "",
  slots: "", requirements: [""], customFields: [],
};

// ── ManagePrograms (default export) ──────────────────────────────────────────
export default function ManagePrograms() {
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [selectedQR, setSelectedQR] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newProgram, setNewProgram] = useState(EMPTY_PROGRAM);
  const [activeProgramWorkspace, setActiveProgramWorkspace] = useState(null);

  // Per-program real-time registration stats (mirroring ManageServices StatBar pattern)
  const [programStats, setProgramStats] = useState({}); // { [programId]: { total, byStatus, latest } }

  // ── Auth ──────────────────────────────────────────────────────────
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

  // ── Real-time Programs (general only, exclude livelihood) ─────────
  useEffect(() => {
    // Maintenance: auto-update program statuses based on current date
    runStatusMaintenance();

    const unsubscribe = onSnapshot(
      collection(db, "Programs"),
      (snapshot) => {
        setPrograms(
          snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((p) => p.programType !== "livelihood")
        );
        setLoadingPrograms(false);
      },
      (error) => { console.error("Error fetching programs:", error); setLoadingPrograms(false); }
    );
    return () => unsubscribe();
  }, []);

  // ── Real-time per-program attendee stats (from subcollections) ────
  // Subscribe to each program's attendees subcollection for live StatBar data
  useEffect(() => {
    if (programs.length === 0) return;
    const unsubs = programs.map((prog) => {
      const attendeesRef = collection(db, "Programs", prog.id, "attendees");
      return onSnapshot(attendeesRef, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const byStatus = {};
        let latest = null;
        docs.forEach((doc) => {
          const s = doc.status || "pending";
          byStatus[s] = (byStatus[s] || 0) + 1;
          const ts = doc.createdAt;
          if (ts) {
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            if (!latest || d > latest) latest = d;
          }
        });
        setProgramStats((prev) => ({
          ...prev,
          [prog.id]: {
            total: docs.length,
            byStatus,
            latest: latest ? latest.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—",
          },
        }));
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [programs]);

  // ── QR Generation ─────────────────────────────────────────────────
  const handleGenerateQR = (prog) => {
    const today = getTodayStr();
    const startDate = prog.date || today;
    const endDate = prog.endDate || prog.date || today;
    const base = "https://3-sense.vercel.app/";
    const url =
      `${base}?serviceId=${encodeURIComponent(prog.id)}` +
      `&serviceName=${encodeURIComponent(prog.title)}` +
      `&category=Programs` +
      `&type=program` +
      `&dt=${today}` +
      `&startDate=${startDate}` +
      `&endDate=${endDate}`;
    setSelectedQR({ name: prog.title, qrValue: url });
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById("as-qr-svg");
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `3Sense-QR-${selectedQR.name}-${getTodayStr()}.png`;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // ── Requirements helpers ──────────────────────────────────────────
  const handleReqChange = (index, value) => { const u = [...newProgram.requirements]; u[index] = value; setNewProgram({ ...newProgram, requirements: u }); };
  const addReqField = () => setNewProgram({ ...newProgram, requirements: [...newProgram.requirements, ""] });
  const removeReqField = (index) => setNewProgram({ ...newProgram, requirements: newProgram.requirements.filter((_, i) => i !== index) });

  // ── Edit ──────────────────────────────────────────────────────────
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
      slots: prog.slots || "",
      requirements: prog.requirements?.length > 0 ? prog.requirements : [""],
      customFields: prog.customFields || [],
    });
    setEditingProgramId(prog.id);
    setShowAddModal(true);
  };

  // ── Delete ────────────────────────────────────────────────────────
  const handleDelete = async (id, progTitle) => {
    if (!window.confirm("Are you sure you want to delete this program?")) return;
    try {
      await deleteDoc(doc(db, "Programs", id));
      logTransaction(adminName, adminRole, "DELETED_PROGRAM", `Deleted program "${progTitle}" ID: ${id}`);
    } catch (error) {
      console.error("Error deleting program:", error);
      logTransaction(adminName, adminRole, "FAILED_DELETE_PROGRAM", `Failed to delete program "${progTitle}" ID: ${id} - ${error.message}`);
      alert("Failed to delete program. Please try again.");
    }
  };

  // ── Save (add / update) ───────────────────────────────────────────
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
      time: newProgram.startTime && newProgram.endTime ? `${newProgram.startTime} - ${newProgram.endTime}` : "",
      location: newProgram.location,
      demographic: newProgram.demographic,
      slots: newProgram.slots,
      requirements: newProgram.requirements.filter((r) => r.trim() !== ""),
      customFields: newProgram.customFields || [],
    };
    try {
      if (editingProgramId) {
        await updateDoc(doc(db, "Programs", editingProgramId), { ...programData, updatedAt: serverTimestamp() });
        logTransaction(adminName, adminRole, "UPDATED_PROGRAM", `Updated program "${newProgram.title}" ID: ${editingProgramId}`);
      } else {
        await addDoc(collection(db, "Programs"), {
          ...programData,
          programType: "general",
          status: "Upcoming",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        logTransaction(adminName, adminRole, "CREATED_PROGRAM", `Created new program: "${newProgram.title}"`);
      }
      setNewProgram(EMPTY_PROGRAM);
      setEditingProgramId(null);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving program:", error);
      alert("Failed to save program. Please try again.");
      logTransaction(adminName, adminRole,
        editingProgramId ? "FAILED_UPDATE_PROGRAM" : "FAILED_CREATE_PROGRAM",
        `Failed to ${editingProgramId ? "update" : "create"} program "${newProgram.title}" - ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => { setEditingProgramId(null); setNewProgram(EMPTY_PROGRAM); setShowAddModal(true); };

  // ── Pagination ────────────────────────────────────────────────────
  const filteredPrograms = programs.filter((p) => p.title?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filteredPrograms.length / ITEMS_PER_PAGE);
  const paginatedPrograms = filteredPrograms.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const handleSearch = (val) => { setSearchTerm(val); setCurrentPage(1); };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 3) pages.push(1, 2, 3, 4, "...", totalPages);
    else if (currentPage >= totalPages - 2) pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    return pages.map((page, index) => (
      <button
        key={index}
        className={`af-page-btn ${currentPage === page ? "active" : ""}`}
        onClick={() => typeof page === "number" && setCurrentPage(page)}
        disabled={typeof page !== "number"}
        style={{ cursor: typeof page === "number" ? "pointer" : "default", border: typeof page !== "number" ? "none" : "", background: typeof page !== "number" ? "transparent" : "" }}
      >{page}</button>
    ));
  };

  // ── Route to Workspace ────────────────────────────────────────────
  if (activeProgramWorkspace) {
    return (
      <div className="as-container" style={{ padding: 0 }}>
        <ProgramWorkspace
          program={activeProgramWorkspace}
          onBack={() => setActiveProgramWorkspace(null)}
          adminName={adminName}
          adminRole={adminRole}
        />
      </div>
    );
  }

  // ── Render Programs List ──────────────────────────────────────────
  return (
    <div className="as-container" style={{ padding: 0 }}>
      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Programs</h1>
          <p className="as-subtitle">Manage barangay programs, slots, and requirements</p>
        </div>
        <button className="as-btn-aqua" onClick={openAddModal}><IconAdd /> Add New Program</button>
      </div>

      <div className="as-controls">
        <div className="as-search-box">
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search programs..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {loadingPrograms ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "0.95rem" }}>Loading programs...</div>
      ) : filteredPrograms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "0.95rem" }}>
          {searchTerm ? "No programs match your search." : "No programs yet. Click 'Add New Program' to create one."}
        </div>
      ) : (
        <>
          <div className="as-card-grid">
            {paginatedPrograms.map((prog) => {
              const stats = programStats[prog.id] || { total: 0, byStatus: {}, latest: "—" };
              return (
                <div className="as-card" key={prog.id}>
                  <div className="as-card-header">
                    <h2 className="as-card-title">{prog.title}</h2>
                    <span className={`as-badge ${prog.status?.toLowerCase().replace(" ", "-")}`}>{prog.status}</span>
                  </div>
                  <DescriptionPreview text={prog.description} />
                  <ul className="as-card-details">
                    <li><Manage_IconLocation /> {prog.location}</li>
                    <li>
                      <Manage_IconCalendar />
                      {prog.date}
                      {prog.endDate && prog.endDate !== prog.date ? ` → ${prog.endDate}` : ""}
                      {" • "}{prog.time}
                    </li>
                    <li><strong>Target:</strong> {prog.demographic}</li>
                    <li><strong>Slots:</strong> {prog.slots || "Unlimited"}</li>
                  </ul>
                  <div style={{ marginTop: "10px", fontSize: "0.85rem", color: "#6B7280" }}>
                    <strong>Requirements:</strong>{" "}
                    {prog.requirements?.length > 0 ? prog.requirements.join(", ") : "None"}
                  </div>

                  {/* ── Live StatBar per card (from ManageServices) ── */}
                  <StatBar stats={stats} />

                  <div className="as-card-footer" style={{ gap: "10px", display: "flex", flexWrap: "wrap" }}>
                    <button
                      className="as-btn-aqua"
                      style={{ padding: "8px 16px", flex: 1 }}
                      onClick={() => setActiveProgramWorkspace(prog)}
                    >
                      Workspace &rarr;
                    </button>
                    <button
                      className="as-btn-ghost"
                      style={{ padding: "8px 16px", flex: 1 }}
                      onClick={() => handleEdit(prog)}
                    >
                      Edit
                    </button>
                    <button
                      className="as-btn-ghost"
                      style={{ padding: "8px 16px", flex: 1, color: "red", borderColor: "#fca5a5" }}
                      onClick={() => handleDelete(prog.id, prog.title)}
                    >
                      Delete
                    </button>
                    <button
                      className="as-qr-btn"
                      style={{ width: "100%", marginTop: "5px" }}
                      onClick={() => handleGenerateQR(prog)}
                    >
                      <Manage_IconQR /> Generate QR Code
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="af-pagination" style={{ display: "flex", justifyContent: "center", gap: "8px", padding: "16px" }}>
              <button
                className="af-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >Previous</button>
              {renderPageNumbers()}
              <button
                className="af-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
              >Next</button>
            </div>
          )}
        </>
      )}

      {/* ── Add / Edit Modal ── */}
      {showAddModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: "700px", width: "100%" }}>
            <div className="as-modal-header">
              <h2>{editingProgramId ? "Edit Program" : "Add Program"}</h2>
              <button className="as-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="as-modal-body" style={{ alignItems: "stretch" }}>
              <form className="as-form" onSubmit={handleAddProgram}>

                <div className="as-form-group">
                  <label className="as-form-label">Program Title</label>
                  <input type="text" className="as-form-input" required value={newProgram.title}
                    onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })} />
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Description</label>
                  <textarea className="as-form-textarea" required value={newProgram.description}
                    onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })} />
                </div>

                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">Location</label>
                    <input type="text" className="as-form-input" required value={newProgram.location}
                      onChange={(e) => setNewProgram({ ...newProgram, location: e.target.value })} />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Target Demographic</label>
                    <input type="text" className="as-form-input" required placeholder="e.g. Students, Seniors" value={newProgram.demographic}
                      onChange={(e) => setNewProgram({ ...newProgram, demographic: e.target.value })} />
                  </div>
                </div>

                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">Start Date</label>
                    <input type="date" className="as-form-input" required value={newProgram.date}
                      onChange={(e) => setNewProgram({ ...newProgram, date: e.target.value })} />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">
                      End Date
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>(same as start if 1 day)</span>
                    </label>
                    <input type="date" className="as-form-input" min={newProgram.date || undefined}
                      value={newProgram.endDate} onChange={(e) => setNewProgram({ ...newProgram, endDate: e.target.value })} />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Start Time</label>
                    <input type="time" className="as-form-input" required value={newProgram.startTime}
                      onChange={(e) => setNewProgram({ ...newProgram, startTime: e.target.value })} />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">End Time</label>
                    <input type="time" className="as-form-input" required value={newProgram.endTime}
                      onChange={(e) => setNewProgram({ ...newProgram, endTime: e.target.value })} />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Available Slots</label>
                    <input type="number" className="as-form-input" placeholder="Leave blank if unlimited" value={newProgram.slots}
                      onChange={(e) => setNewProgram({ ...newProgram, slots: e.target.value })} />
                  </div>
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Requirements (List)</label>
                  {newProgram.requirements.map((req, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                      <input type="text" className="as-form-input" placeholder="e.g. Valid ID" value={req}
                        onChange={(e) => handleReqChange(i, e.target.value)} />
                      {newProgram.requirements.length > 1 && (
                        <button type="button" className="as-btn-ghost" onClick={() => removeReqField(i)} style={{ padding: "0 10px", color: "red" }}>&times;</button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="as-btn-ghost" onClick={addReqField} style={{ width: "fit-content", padding: "5px 10px", fontSize: "0.9rem" }}>
                    + Add Requirement
                  </button>
                </div>

                <div className="as-form-section" style={{ marginTop: "20px" }}>
                  <h3 className="as-form-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Default Collected Fields
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "12px", marginTop: "-10px" }}>
                    The following information is automatically collected. Do not recreate them in the form builder.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {["Full Name", "Complete Address", "Contact Number", "Email (Optional)", "Upload Valid ID / Clearance"].map((f) => (
                      <span key={f} style={{ background: "#f3f4f6", color: "#4b5563", padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <FormBuilder
                  fields={newProgram.customFields}
                  onChange={(fields) => setNewProgram({ ...newProgram, customFields: fields })}
                />

                <div className="as-modal-actions">
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="as-btn-aqua" style={{ padding: "8px 16px", fontSize: "0.9rem" }} disabled={saving}>
                    {saving ? "Saving..." : "Save Program"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Modal ── */}
      {selectedQR && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: "450px" }}>
            <div className="as-modal-header">
              <h2>QR Code Generated</h2>
              <button className="as-modal-close" onClick={() => setSelectedQR(null)}>&times;</button>
            </div>
            <div className="as-modal-body" style={{ textAlign: "center" }}>
              <div className="as-modal-confirm-icon"><IconConfirmCheck /></div>
              <h3>{selectedQR.name}</h3>
              <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "0.82rem", color: "#92400e", textAlign: "left" }}>
                ⚠️ <strong>This QR is valid for today only ({getTodayStr()}).</strong> Generate a new one each day the program is active.
              </div>
              <p className="as-modal-desc">Residents can scan this code to access {selectedQR.name}.</p>
              <div className="as-qr-holder" style={{ margin: "20px auto", display: "flex", justifyContent: "center" }}>
                <QRCodeSVG id="as-qr-svg" value={selectedQR.qrValue} size={150} level={"H"} includeMargin={true} />
              </div>
              <button className="as-btn-ghost" onClick={handleDownloadQR} style={{ width: "100%" }}>
                <IconDownload /> Download QR Code (PNG)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}