import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import {
  collection, onSnapshot, addDoc, doc, updateDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";
import FormBuilder from "../../components/FormBuilder";

const formatTs = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const StatusBadge = ({ status }) => {
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

export default function ServiceLivelihood({ onBack }) {
  // ── Programs ─────────────────────────────────────────────────────
  const [programs, setPrograms]               = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // ── Registrations ─────────────────────────────────────────────────
  const [participants, setParticipants]       = useState([]);
  const [loadingParts, setLoadingParts]       = useState(true);

  // ── Modals ────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [rejectTarget, setRejectTarget]       = useState(null);
  const [removeTarget, setRemoveTarget]       = useState(null);
  const [rejectReason, setRejectReason]       = useState("");
  const [saving, setSaving]                   = useState(false);

  // ── New program form ──────────────────────────────────────────────
  const BLANK = { title: "", description: "", date: "", startTime: "", endTime: "", location: "", slots: "", demographic: "", customFields: [] };
  const [newProgram, setNewProgram] = useState(BLANK);

  // ── Real-time: Programs ───────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "Programs"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPrograms(snap.docs.map(d => {
        const r = d.data();
        return {
          id:          d.id,
          title:       r.title || r.name || "Untitled Program",
          description: r.description || r.customFields?.description || "",
          date:        r.date || r.customFields?.date || "",
          startTime:   r.startTime || r.customFields?.startTime || "",
          endTime:     r.endTime   || r.customFields?.endTime   || "",
          location:    r.location  || r.customFields?.location  || "",
          slots:       parseInt(r.slots || r.requirements?.slots || "0", 10) || 0,
          status:      r.status || "Upcoming",
        };
      }));
      setLoadingPrograms(false);
    });
    return () => unsub();
  }, []);

  // ── Real-time: Registrations ──────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "livelihoodRegistrations"), orderBy("submittedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingParts(false);
    });
    return () => unsub();
  }, []);

  // ── Slot logic: only APPROVED count ──────────────────────────────
  const getApprovedCount = (programId) =>
    participants.filter(p => p.programId === programId && (p.status || "").toLowerCase() === "approved").length;

  const getSlotsLeft = (prog) => {
    if (!prog.slots) return null;
    return prog.slots - getApprovedCount(prog.id);
  };

  // ── Add program ───────────────────────────────────────────────────
  const handleAddProgram = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "Programs"), {
        title:        newProgram.title,
        description:  newProgram.description,
        date:         newProgram.date,
        startTime:    newProgram.startTime,
        endTime:      newProgram.endTime,
        time:         `${newProgram.startTime}${newProgram.endTime ? ` - ${newProgram.endTime}` : ""}`,
        location:     newProgram.location,
        slots:        newProgram.slots,
        demographic:  newProgram.demographic,
        customFields: newProgram.customFields || [],
        status:       "Upcoming",
        attendees:    [],
        updatedAt:    serverTimestamp(),
      });
      setNewProgram(BLANK);
      setShowAddModal(false);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  // ── Approve ───────────────────────────────────────────────────────
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
    } catch (err) { console.error(err); }
  };

  // ── Reject ────────────────────────────────────────────────────────
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "livelihoodRegistrations", rejectTarget), {
        status: "rejected", rejectReason: rejectReason.trim(), updatedAt: serverTimestamp(),
      });
      setShowRejectModal(false); setRejectTarget(null); setRejectReason("");
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  // ── Remove approval → back to pending ────────────────────────────
  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "livelihoodRegistrations", removeTarget), {
        status: "pending", rejectReason: "", updatedAt: serverTimestamp(),
      });
      setShowRemoveModal(false); setRemoveTarget(null);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = {
    total:    participants.length,
    approved: participants.filter(p => (p.status || "").toLowerCase() === "approved").length,
    pending:  participants.filter(p => (p.status || "").toLowerCase() === "pending").length,
    rejected: participants.filter(p => (p.status || "").toLowerCase() === "rejected").length,
  };

  // ─────────────────────────────────────────────────────────────────
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
        <button className="as-btn-aqua" onClick={() => setShowAddModal(true)} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
          + Add New Program
        </button>
      </div>

      {/* ── Programs ── */}
      <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "20px", paddingBottom: "20px" }}>
        <h3 style={{ marginBottom: "10px" }}>Active Programs</h3>
        {loadingPrograms ? <p style={{ color: "#9ca3af" }}>Loading…</p> : programs.length === 0 ? <p style={{ color: "#9ca3af" }}>No programs yet.</p> : (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {programs.map(prog => {
              const approved  = getApprovedCount(prog.id);
              const left      = getSlotsLeft(prog);
              const full      = left !== null && left <= 0;
              return (
                <div key={prog.id} style={{ padding: "16px", border: `2px solid ${full ? "#fca5a5" : "#2DB17B"}`, background: full ? "#fff1f2" : "#f0fdf4", borderRadius: "8px", minWidth: "250px", maxWidth: "300px" }}>
                  <div style={{ fontWeight: "bold", color: full ? "#991b1b" : "#166534" }}>{prog.title}</div>
                  <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: "4px" }}>
                    {prog.date}{prog.startTime ? ` • ${prog.startTime}${prog.endTime ? ` - ${prog.endTime}` : ""}` : ""}
                  </div>
                  {prog.location && <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>📍 {prog.location}</div>}
                  <div style={{ marginTop: "8px", fontSize: "0.82rem" }}>
                    <span style={{ fontWeight: 600, color: "#166534" }}>{approved} approved</span>
                    {prog.slots > 0 && (
                      <span style={{ color: "#6b7280" }}> / {prog.slots} slots · <span style={{ fontWeight: 600, color: full ? "#991b1b" : "#15803d" }}>{full ? "Full" : `${left} left`}</span></span>
                    )}
                  </div>
                  {prog.slots > 0 && (
                    <div style={{ marginTop: "8px", height: "6px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min((approved / prog.slots) * 100, 100)}%`, background: full ? "#ef4444" : "#2DB17B", borderRadius: "4px", transition: "width 0.3s" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <h3 style={{ marginBottom: "10px" }}>Participant Registrations</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total",    value: stats.total,    bg: "#fff",    border: "#e5e7eb", color: "#111827" },
          { label: "Approved", value: stats.approved, bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
          { label: "Pending",  value: stats.pending,  bg: "#fffbeb", border: "#fde68a", color: "#a16207" },
          { label: "Rejected", value: stats.rejected, bg: "#fff1f2", border: "#fecdd3", color: "#be123c" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, padding: "18px 20px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
            <div style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      {loadingParts ? <p style={{ color: "#9ca3af" }}>Loading registrations…</p> : (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <tr>
                {["Ref #", "Full Name", "Contact", "Program", "Slots Left", "Applied", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 16px", fontWeight: 600, color: "#4b5563", fontSize: "0.82rem", textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>No registrations yet.</td></tr>
              )}
              {participants.map(p => {
                const prog      = programs.find(pr => pr.id === p.programId);
                const left      = prog ? getSlotsLeft(prog) : null;
                const status    = (p.status || "pending").toLowerCase();
                const slotsFull = left !== null && left <= 0 && status === "pending";

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "#6b7280" }}>{p.regNum || p.id.slice(0, 8)}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 500 }}>{p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "—"}</td>
                    <td style={{ padding: "14px 16px", color: "#6b7280" }}>{p.contact || p.contactNumber || "—"}</td>
                    <td style={{ padding: "14px 16px", maxWidth: "160px" }}>
                      <div style={{ fontWeight: 500, color: "#111827", fontSize: "0.85rem" }}>{p.programName || "—"}</div>
                      {p.programDate && <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{p.programDate}</div>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {left !== null ? (
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: left <= 0 ? "#991b1b" : left <= 5 ? "#a16207" : "#166534" }}>
                          {left <= 0 ? "Full" : `${left} left`}
                        </span>
                      ) : <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "0.85rem" }}>{formatTs(p.submittedAt)}</td>
                    <td style={{ padding: "14px 16px" }}><StatusBadge status={p.status} /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      {/* PENDING */}
                      {status === "pending" && (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            style={{ padding: "5px 12px", background: slotsFull ? "#e5e7eb" : "#2DB17B", color: slotsFull ? "#9ca3af" : "#fff", border: "none", borderRadius: "6px", cursor: slotsFull ? "not-allowed" : "pointer", fontSize: "0.8rem" }}
                            onClick={() => !slotsFull && handleApprove(p)}
                            disabled={slotsFull}
                            title={slotsFull ? "No slots available" : "Approve"}
                          >Approve</button>
                          <button
                            style={{ padding: "5px 12px", background: "#fff", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
                            onClick={() => { setRejectTarget(p.id); setRejectReason(""); setShowRejectModal(true); }}
                          >Reject</button>
                        </div>
                      )}
                      {/* APPROVED */}
                      {status === "approved" && (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                          <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>Approved</span>
                          <button
                            style={{ padding: "5px 12px", background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
                            onClick={() => { setRemoveTarget(p.id); setShowRemoveModal(true); }}
                          >Remove</button>
                        </div>
                      )}
                      {/* REJECTED */}
                      {status === "rejected" && (
                        <div style={{ textAlign: "right" }}>
                          <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>Rejected</span>
                          {p.rejectReason && (
                            <div style={{ color: "#ef4444", fontSize: "0.75rem", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }} title={p.rejectReason}>
                              "{p.rejectReason}"
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
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
              <button className="as-modal-close" onClick={() => { setShowAddModal(false); setNewProgram(BLANK); }}>&times;</button>
            </div>
            <div className="as-modal-body">
              <form onSubmit={handleAddProgram}>
                <div style={{ marginBottom: "15px" }}>
                  <label className="as-form-label">Program Title <span style={{ color: "red" }}>*</span></label>
                  <input type="text" className="as-form-input" required value={newProgram.title} onChange={e => setNewProgram({ ...newProgram, title: e.target.value })} placeholder="e.g. Food Processing & Packaging" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                  <div>
                    <label className="as-form-label">Date <span style={{ color: "red" }}>*</span></label>
                    <input type="date" className="as-form-input" required value={newProgram.date} onChange={e => setNewProgram({ ...newProgram, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="as-form-label">Location</label>
                    <input type="text" className="as-form-input" value={newProgram.location} onChange={e => setNewProgram({ ...newProgram, location: e.target.value })} placeholder="e.g. Barangay Multi-Purpose Hall" />
                  </div>
                  <div>
                    <label className="as-form-label">Start Time <span style={{ color: "red" }}>*</span></label>
                    <input type="time" className="as-form-input" required value={newProgram.startTime} onChange={e => setNewProgram({ ...newProgram, startTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="as-form-label">End Time <span style={{ color: "red" }}>*</span></label>
                    <input type="time" className="as-form-input" required value={newProgram.endTime} onChange={e => setNewProgram({ ...newProgram, endTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="as-form-label">Total Slots</label>
                    <input type="number" min="1" className="as-form-input" value={newProgram.slots} onChange={e => setNewProgram({ ...newProgram, slots: e.target.value })} placeholder="e.g. 30" />
                  </div>
                  <div>
                    <label className="as-form-label">Target Demographic</label>
                    <input type="text" className="as-form-input" value={newProgram.demographic} onChange={e => setNewProgram({ ...newProgram, demographic: e.target.value })} placeholder="e.g. Students, Women, Senior" />
                  </div>
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label className="as-form-label">Description <span style={{ color: "red" }}>*</span></label>
                  <textarea className="as-form-textarea" required rows="3" value={newProgram.description} onChange={e => setNewProgram({ ...newProgram, description: e.target.value })} placeholder="Describe the program objectives…" />
                </div>
                <div style={{ marginTop: "16px", background: "#f9fafb", padding: "14px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "#374151" }}>🔒 Default Collected Fields</h4>
                  <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0 0 8px 0" }}>These are automatically collected. Do not recreate them.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {["Full Name", "Complete Address", "Contact Number", "Email", "Valid ID / Clearance"].map(f => (
                      <span key={f} style={{ background: "#e5e7eb", color: "#4b5563", padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 500 }}>🔒 {f}</span>
                    ))}
                  </div>
                </div>
                <FormBuilder fields={newProgram.customFields} onChange={fields => setNewProgram({ ...newProgram, customFields: fields })} />
                <div className="as-modal-actions" style={{ marginTop: "20px" }}>
                  <button type="button" className="as-btn-ghost" onClick={() => { setShowAddModal(false); setNewProgram(BLANK); }}>Cancel</button>
                  <button type="submit" className="as-btn-aqua" style={{ padding: "8px 18px" }} disabled={saving}>{saving ? "Saving…" : "Save Program"}</button>
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
              <h2>Reject Registration</h2>
              <button className="as-modal-close" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>&times;</button>
            </div>
            <div className="as-modal-body">
              <form onSubmit={handleConfirmReject}>
                <label className="as-form-label">Reason for Rejection <span style={{ color: "red" }}>*</span></label>
                <textarea className="as-form-textarea" rows="3" required placeholder="Provide a brief explanation…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
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
                This will move the registration back to <strong>Pending</strong>, freeing up the slot. The participant can then be re-approved or rejected.
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