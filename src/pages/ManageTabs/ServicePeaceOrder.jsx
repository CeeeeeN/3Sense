import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase/firebase";
import {
  collection, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, query, where, getDocs
} from "firebase/firestore";
import { ServiceAlertTriangleIcon } from "../../components/Icons";
import { createUserNotification } from "../../services/userNotifications";
import { logTransaction } from '../../services/logger';
import { onAuthStateChanged } from "firebase/auth";

const TANOD_LIST = ["Unassigned", "Tanod Reyes", "Tanod Garcia", "Tanod Santos"];

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

export default function ServicePeaceOrder({ onBack }) {
  const [reports, setReports]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [assignedTanod, setAssignedTanod]   = useState("Unassigned");
  const [saving, setSaving]           = useState(false);

  // For logging purposes
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  // ── Real-time listener ──────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "incidentReports"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort newest first
      data.sort((a, b) => {
        const ta = a.submittedAt?.toDate?.() ?? new Date(0);
        const tb = b.submittedAt?.toDate?.() ?? new Date(0);
        return tb - ta;
      });
      setReports(data);
      setLoading(false);
      // Keep selected report in sync
      setSelectedReport(prev => prev ? (data.find(r => r.id === prev.id) || prev) : null);
    });
    return () => unsub();
  }, []);

    useEffect(() => {
      // Listen for the currently logged-in user
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Find their document in the approvedAdmins collection
          const q = query(
            collection(db, "approvedAdmins"),
            where("uid", "==", user.uid),
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

  // Sync tanod select when a new report is selected
  useEffect(() => {
    if (selectedReport) setAssignedTanod(selectedReport.tanod || "Unassigned");
  }, [selectedReport?.id]);

  // ── Update status + append to updates array ─────────────────────
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

  // ── Save tanod assignment separately ───────────────────────────
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

  // ── Stat counters ───────────────────────────────────────────────
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
          <p className="as-subtitle">Manage incident reports, dispatch tanods, and update blotters</p>
        </div>
      </div>

      {/* Stat row */}
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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(350px, 1fr) 2fr", gap: "20px", minHeight: "60vh" }}>

          {/* ── Inbox list ── */}
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", fontWeight: "bold", background: "#f9fafb" }}>
              Incoming Reports ({reports.length})
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {reports.length === 0 && (
                <div style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>No reports yet.</div>
              )}
              {reports.map(r => {
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
          </div>

          {/* ── Detail panel ── */}
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "24px" }}>
            {selectedReport ? (
              <div>
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

                  {/* ── UPDATED: PHOTO EVIDENCE DISPLAY ── */}
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
                        // Fallback for older reports before we added Cloudinary URLs
                        <span style={{ fontSize: "0.8rem", color: "#317D89", background: "#e0f2fe", padding: "6px 12px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          📸 {selectedReport.photoFileName || selectedReport.photo}
                        </span>
                      )}
                    </div>
                  )}
                  {/* ───────────────────────────────────── */}
                </div>

                {/* Reporter info */}
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

                {/* Updates log */}
                {selectedReport.updates?.length > 0 && (
                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", marginBottom: "24px" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "1rem" }}>Updates Log</h3>
                    <ul style={{ margin: 0, padding: "0 0 0 18px", color: "#4b5563", fontSize: "0.85rem" }}>
                      {selectedReport.updates.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                )}

                {/* Admin action panel */}
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem" }}>Admin Action Panel</h3>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", color: "#6b7280", fontSize: "0.85rem", marginBottom: "4px" }}>Assign Tanod</label>
                      <select
                        className="as-form-select"
                        value={assignedTanod}
                        onChange={(e) => saveTanod(e.target.value)}
                        disabled={saving}
                      >
                        {TANOD_LIST.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", color: "#6b7280", fontSize: "0.85rem", marginBottom: "4px" }}>Update Status</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="as-btn-ghost"
                          style={{ flex: 1, borderColor: (selectedReport.status || "").toLowerCase() === "responded" ? "#BDBD64" : "#e5e7eb" }}
                          onClick={() => updateStatus("responded")}
                          disabled={saving || (selectedReport.status || "").toLowerCase() === "resolved"}
                        >
                          Responded
                        </button>
                        <button
                          className="as-btn-ghost"
                          style={{ flex: 1, borderColor: (selectedReport.status || "").toLowerCase() === "resolved" ? "#2DB17B" : "#e5e7eb", color: (selectedReport.status || "").toLowerCase() === "resolved" ? "#2DB17B" : "inherit" }}
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
    </div>
  );
}