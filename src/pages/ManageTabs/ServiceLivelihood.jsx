import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import {
  collection, onSnapshot, addDoc, doc, updateDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { UsersIcon } from "../../components/Icons";
import FormBuilder from "../../components/FormBuilder";
import { createUserNotification } from "../../services/userNotifications";

const formatTs = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

export default function ServiceLivelihood({ onBack }) {
  // ── Programs ────────────────────────────────────────────────────
  const [programs, setPrograms]       = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // ── Registrations ───────────────────────────────────────────────
  const [participants, setParticipants] = useState([]);
  const [loadingParts, setLoadingParts] = useState(true);

  // ── Modals ───────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget]   = useState(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [saving, setSaving]               = useState(false);

  // ── New program form ─────────────────────────────────────────────
  const BLANK_PROGRAM = {
    title: "", description: "", date: "", startTime: "", endTime: "",
    location: "", slots: "", demographic: "", customFields: [],
  };
  const [newProgram, setNewProgram] = useState(BLANK_PROGRAM);

  // ── Real-time: Programs collection ──────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "Programs"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const raw = d.data();
        // Support both flat and nested (customFields inside root)
        return {
          id: d.id,
          title:       raw.title || raw.name || "Untitled Program",
          description: raw.description || raw.customFields?.description || "",
          date:        raw.date || raw.customFields?.date || "",
          startTime:   raw.startTime || raw.customFields?.startTime || "",
          endTime:     raw.endTime || raw.customFields?.endTime || "",
          location:    raw.location || raw.customFields?.location || "",
          slots:       raw.slots || raw.requirements?.slots || "",
          status:      raw.status || "Upcoming",
          updatedAt:   raw.updatedAt,
        };
      });
      setPrograms(data);
      setLoadingPrograms(false);
    }, (err) => {
      console.error("Programs listener error:", err);
      setLoadingPrograms(false);
    });
    return () => unsub();
  }, []);

  // ── Real-time: livelihoodRegistrations collection ────────────────
  useEffect(() => {
    const q = query(collection(db, "livelihoodRegistrations"), orderBy("submittedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setParticipants(data);
      setLoadingParts(false);
    }, (err) => {
      console.error("livelihoodRegistrations listener error:", err);
      setLoadingParts(false);
    });
    return () => unsub();
  }, []);

  // ── Add new program ──────────────────────────────────────────────
  const handleAddProgram = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const timeLabel = newProgram.startTime && newProgram.endTime
        ? `${newProgram.startTime} - ${newProgram.endTime}` : newProgram.startTime || "";

      await addDoc(collection(db, "Programs"), {
        title:       newProgram.title,
        description: newProgram.description,
        date:        newProgram.date,
        startTime:   newProgram.startTime,
        endTime:     newProgram.endTime,
        time:        timeLabel,
        location:    newProgram.location,
        slots:       newProgram.slots,
        demographic: newProgram.demographic,
        customFields: newProgram.customFields || [],
        status:      "Upcoming",
        attendees:   [],
        updatedAt:   serverTimestamp(),
      });
      setNewProgram(BLANK_PROGRAM);
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding program:", err);
    }
    setSaving(false);
  };

  // ── Approve registration ─────────────────────────────────────────
  const handleApprove = async (id) => {
    try {
      await updateDoc(doc(db, "livelihoodRegistrations", id), {
        status:    "approved",
        updatedAt: serverTimestamp(),
      });

      const p = participants.find(part => part.id === id);
      if (p && p.userID) {
        await createUserNotification(
          p.userID,
          "Program Registration Approved",
          `Your registration for the Livelihood Program "${p.programName || 'Unknown Program'}" has been approved.`,
          "general",
          p.regNum || p.id
        );
      }
    } catch (err) {
      console.error("Error approving:", err);
    }
  };

  // ── Reject flow ──────────────────────────────────────────────────
  const handleRejectClick = (id) => {
    setRejectTarget(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "livelihoodRegistrations", rejectTarget), {
        status:       "rejected",
        rejectReason: rejectReason.trim(),
        updatedAt:    serverTimestamp(),
      });

      const p = participants.find(part => part.id === rejectTarget);
      if (p && p.userID) {
        await createUserNotification(
          p.userID,
          "Program Registration Rejected",
          `Your registration for the Livelihood Program "${p.programName || 'Unknown Program'}" was rejected. Remarks: ${rejectReason.trim()}`,
          "general",
          p.regNum || p.id
        );
      }

      setShowRejectModal(false);
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      console.error("Error rejecting:", err);
    }
    setSaving(false);
  };

  // ── Computed stats ───────────────────────────────────────────────
  const stats = {
    total:    participants.length,
    approved: participants.filter(p => (p.status || "").toLowerCase() === "approved").length,
    pending:  participants.filter(p => (p.status || "").toLowerCase() === "pending").length,
    rejected: participants.filter(p => (p.status || "").toLowerCase() === "rejected").length,
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const statusBadge = (status) => {
    const s = (status || "pending").toLowerCase();
    const map = {
      approved: { bg: "#dcfce7", color: "#166534" },
      pending:  { bg: "#fef3c7", color: "#92400e" },
      rejected: { bg: "#fee2e2", color: "#991b1b" },
    };
    const c = map[s] || map.pending;
    return (
      <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600, background: c.bg, color: c.color }}>
        {status || "pending"}
      </span>
    );
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", paddingBottom: "40px" }}>
      <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
        &larr; Back to Services Hub
      </button>

      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Livelihood Skills Training</h1>
          <p className="as-subtitle">Manage livelihood programs, skills training, and registrations</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="as-btn-aqua" onClick={() => setShowAddModal(true)} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
            + Add New Program
          </button>
        </div>
      </div>

      {/* ── Active Programs ── */}
      <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "20px", paddingBottom: "20px" }}>
        <h3 style={{ marginBottom: "10px" }}>Active Programs</h3>
        {loadingPrograms ? (
          <p style={{ color: "#9ca3af" }}>Loading programs…</p>
        ) : programs.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No programs yet. Add one above.</p>
        ) : (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {programs.map(lp => (
              <div key={lp.id} style={{ padding: "16px", border: "2px solid #2DB17B", background: "#f0fdf4", borderRadius: "8px", minWidth: "250px", maxWidth: "320px" }}>
                <div style={{ fontWeight: "bold", color: "#166534" }}>{lp.title}</div>
                <div style={{ fontSize: "0.82rem", color: "#15803d", marginTop: "4px" }}>{lp.date} {lp.startTime && `• ${lp.startTime}${lp.endTime ? ` - ${lp.endTime}` : ""}`}</div>
                {lp.location && <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: "2px" }}>📍 {lp.location}</div>}
                {lp.slots     && <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>Slots: {lp.slots}</div>}
                <div style={{ marginTop: "6px" }}>
                  <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "10px", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
                    {lp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Participant Registrations Stats ── */}
      <h3 style={{ marginBottom: "10px" }}>Participant Registrations</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Registered", value: stats.total,    bg: "#fff",    border: "#e5e7eb", color: "#111827" },
          { label: "Approved",         value: stats.approved, bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
          { label: "Pending",          value: stats.pending,  bg: "#fffbeb", border: "#fde68a", color: "#a16207" },
          { label: "Rejected",         value: stats.rejected, bg: "#fff1f2", border: "#fecdd3", color: "#be123c" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, padding: "18px 20px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
            <div style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Participants Table ── */}
      {loadingParts ? (
        <p style={{ color: "#9ca3af" }}>Loading registrations…</p>
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <tr>
                {["Ref #", "Full Name", "Contact", "Program", "Date Applied", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 16px", fontWeight: 600, color: "#4b5563", fontSize: "0.82rem", textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>No registrations yet.</td></tr>
              )}
              {participants.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#6b7280" }}>{p.regNum || p.id.slice(0, 8)}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 500 }}>{p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#6b7280" }}>{p.contact || p.contactNumber || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "0.85rem" }}>{p.programName || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "0.85rem" }}>{formatTs(p.submittedAt)}</td>
                  <td style={{ padding: "14px 16px" }}>{statusBadge(p.status)}</td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    {(p.status || "").toLowerCase() === "pending" ? (
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button
                          style={{ padding: "5px 12px", background: "#2DB17B", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
                          onClick={() => handleApprove(p.id)}
                        >Approve</button>
                        <button
                          style={{ padding: "5px 12px", background: "#fff", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
                          onClick={() => handleRejectClick(p.id)}
                        >Reject</button>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.82rem", color: "#9ca3af", textAlign: "right" }}>
                        <span>Action taken</span>
                        {p.rejectReason && (
                          <div style={{ color: "#ef4444", fontSize: "0.75rem", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.rejectReason}>
                            "{p.rejectReason}"
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Program Modal ── */}
      {showAddModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: "700px", width: "100%" }}>
            <div className="as-modal-header">
              <h2>Add Livelihood Program</h2>
              <button className="as-modal-close" onClick={() => { setShowAddModal(false); setNewProgram(BLANK_PROGRAM); }}>&times;</button>
            </div>
            <div className="as-modal-body">
              <form onSubmit={handleAddProgram}>
                <div style={{ marginBottom: "15px" }}>
                  <label className="as-form-label">Program Title <span style={{ color: "red" }}>*</span></label>
                  <input type="text" className="as-form-input" required value={newProgram.title}
                    onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                    placeholder="e.g. Food Processing & Packaging" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                  <div>
                    <label className="as-form-label">Date <span style={{ color: "red" }}>*</span></label>
                    <input type="date" className="as-form-input" required value={newProgram.date}
                      onChange={(e) => setNewProgram({ ...newProgram, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="as-form-label">Location</label>
                    <input type="text" className="as-form-input" value={newProgram.location}
                      onChange={(e) => setNewProgram({ ...newProgram, location: e.target.value })}
                      placeholder="e.g. Barangay Multi-Purpose Hall" />
                  </div>
                  <div>
                    <label className="as-form-label">Start Time <span style={{ color: "red" }}>*</span></label>
                    <input type="time" className="as-form-input" required value={newProgram.startTime}
                      onChange={(e) => setNewProgram({ ...newProgram, startTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="as-form-label">End Time <span style={{ color: "red" }}>*</span></label>
                    <input type="time" className="as-form-input" required value={newProgram.endTime}
                      onChange={(e) => setNewProgram({ ...newProgram, endTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="as-form-label">Slots</label>
                    <input type="number" min="1" className="as-form-input" value={newProgram.slots}
                      onChange={(e) => setNewProgram({ ...newProgram, slots: e.target.value })}
                      placeholder="e.g. 30" />
                  </div>
                  <div>
                    <label className="as-form-label">Target Demographic</label>
                    <input type="text" className="as-form-input" value={newProgram.demographic}
                      onChange={(e) => setNewProgram({ ...newProgram, demographic: e.target.value })}
                      placeholder="e.g. Students, Women, Senior" />
                  </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label className="as-form-label">Description <span style={{ color: "red" }}>*</span></label>
                  <textarea className="as-form-textarea" required rows="3" value={newProgram.description}
                    onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                    placeholder="Describe the program objectives…" />
                </div>

                {/* Default fields notice */}
                <div className="as-form-section" style={{ marginTop: "16px", background: "#f9fafb", padding: "14px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "#374151" }}>🔒 Default Collected Fields</h4>
                  <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0 0 8px 0" }}>
                    These are automatically collected from residents. Do not recreate them.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {["Full Name", "Complete Address", "Contact Number", "Email", "Valid ID / Clearance"].map(f => (
                      <span key={f} style={{ background: "#e5e7eb", color: "#4b5563", padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 500 }}>
                        🔒 {f}
                      </span>
                    ))}
                  </div>
                </div>

                <FormBuilder
                  fields={newProgram.customFields}
                  onChange={(fields) => setNewProgram({ ...newProgram, customFields: fields })}
                />

                <div className="as-modal-actions" style={{ marginTop: "20px" }}>
                  <button type="button" className="as-btn-ghost" onClick={() => { setShowAddModal(false); setNewProgram(BLANK_PROGRAM); }}>Cancel</button>
                  <button type="submit" className="as-btn-aqua" style={{ padding: "8px 18px" }} disabled={saving}>
                    {saving ? "Saving…" : "Save Program"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: "400px" }}>
            <div className="as-modal-header">
              <h2>Reject Participant</h2>
              <button className="as-modal-close" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>&times;</button>
            </div>
            <div className="as-modal-body">
              <form onSubmit={handleConfirmReject}>
                <div className="as-form-group">
                  <label className="as-form-label">Reason for Rejection <span style={{ color: "red" }}>*</span></label>
                  <textarea
                    className="as-form-textarea" rows="3" required
                    placeholder="Provide a brief explanation…"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
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
    </div>
  );
}