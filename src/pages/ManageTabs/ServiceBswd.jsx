import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import {
  collection, onSnapshot, doc, updateDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { createUserNotification } from "../../services/userNotifications";

const formatTs = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const StatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const isResolved  = s.includes("resolved") || s === "resolved (handled)" || s === "resolved";
  const isResponded = s === "responded";
  const style = {
    padding: "4px 12px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600,
    background: isResolved ? "#dcfce7" : isResponded ? "#e0e7ff" : "#fef3c7",
    color:      isResolved ? "#166534" : isResponded ? "#3730a3" : "#92400e",
    display: "inline-block"
  };
  return <span style={style}>{status || "pending"}</span>;
};

export default function ServiceBswd({ onBack }) {
  const [activeTab, setActiveTab] = useState("reports");

  // ── bswdReports ──────────────────────────────────────────────────
  const [reports, setReports]         = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  
  // ── Modal State ──────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState(null);

  // We treat "homeless_report" type as Displacement Reports and
  // "community_tip" / all others without a specific type as Community Tips.
  const displacementReports = reports.filter(r => (r.type || "") === "homeless_report");
  const communityTips       = reports.filter(r => (r.type || "") !== "homeless_report");

  // ── Saving state ─────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // ── Real-time listener ───────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "bswdReports"), orderBy("submittedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(data);
      setLoadingReports(false);
    }, (err) => {
      console.error("bswdReports listener error:", err);
      setLoadingReports(false);
    });
    return () => unsub();
  }, []);

  // ── Update status ────────────────────────────────────────────────
  const updateStatus = async (id, newStatus) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "bswdReports", id), {
        status:    newStatus,
        updatedAt: serverTimestamp(),
      });

      if (newStatus === "responded" || newStatus === "resolved") {
        const p = reports.find(r => r.id === id);
        if (p && p.userID) {
          const typeLabel = p.type === "tip" ? "Community Tip" : "Displacement Report";
          await createUserNotification(
            p.userID,
            `${typeLabel} Update`,
            `Your ${typeLabel.toLowerCase()} has been marked as ${newStatus}.`,
            "general",
            p.id
          );
        }
      }

      // Update local selected item status if modal is open
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
    setSaving(false);
  };

  // ── Stats ─────────────────────────────────────────────────────────
  const reportsStats = {
    total:    displacementReports.length,
    pending:  displacementReports.filter(r => (r.status || "").toLowerCase() === "pending" || (r.status || "").toLowerCase() === "received").length,
    responded:displacementReports.filter(r => (r.status || "").toLowerCase() === "responded").length,
    resolved: displacementReports.filter(r => (r.status || "").toLowerCase().includes("resolved")).length,
  };
  const tipsStats = {
    total:   communityTips.length,
    pending: communityTips.filter(t => !(t.status || "").toLowerCase().includes("resolved") && (t.status || "").toLowerCase() !== "responded").length,
    handled: communityTips.filter(t => (t.status || "").toLowerCase().includes("resolved") || (t.status || "").toLowerCase().includes("handled")).length,
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
        &larr; Back to Services Hub
      </button>

      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Social Welfare &amp; Development</h1>
          <p className="as-subtitle">Manage displaced person reports and community welfare tips</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" }}>
        {[
          { key: "reports", label: `Displacement Reports (${displacementReports.length})` },
          { key: "tips",    label: `Community Tips (${communityTips.length})` },
        ].map(tab => (
          <button key={tab.key}
            style={{ padding: "8px 16px", background: activeTab === tab.key ? "#111827" : "transparent", color: activeTab === tab.key ? "#fff" : "#6b7280", borderRadius: "6px", border: "none", fontWeight: 600, cursor: "pointer" }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stat row */}
      {activeTab === "reports" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: "Total",     value: reportsStats.total,     bg: "#fff",    border: "#e5e7eb", color: "#111827" },
            { label: "Pending",   value: reportsStats.pending,   bg: "#fffbeb", border: "#fde68a", color: "#a16207" },
            { label: "Responded", value: reportsStats.responded, bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
            { label: "Resolved",  value: reportsStats.resolved,  bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, padding: "14px 18px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
              <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
      {activeTab === "tips" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: "Total Tips", value: tipsStats.total,   bg: "#fff",    border: "#e5e7eb", color: "#111827" },
            { label: "Pending",    value: tipsStats.pending, bg: "#fffbeb", border: "#fde68a", color: "#a16207" },
            { label: "Handled",    value: tipsStats.handled, bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, padding: "14px 18px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
              <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {loadingReports ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>Loading…</div>
      ) : activeTab === "reports" ? (

        /* ── Displacement Reports Table ── */
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <tr>
                {["Date", "Reporter Name", "Location", "Description", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 16px", fontWeight: 600, color: "#4b5563", fontSize: "0.82rem", textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displacementReports.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>No displacement reports yet.</td></tr>
              )}
              {displacementReports.map(r => {
                const hasPhoto = r.photoFileName && r.photoFileName !== "None" && r.photoFileName !== "";
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{formatTs(r.submittedAt)}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 500 }}>{r.reporterName || "Anonymous"}</td>
                    <td style={{ padding: "14px 16px", color: "#111827", maxWidth: "150px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.location || "—"}</td>
                    <td style={{ padding: "14px 16px", color: "#4b5563", maxWidth: "220px" }}>
                      {/* Truncated description for clean table */}
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description || "—"}</div>
                      
                      {/* Clean Photo Badge instead of URL */}
                      {hasPhoto && (
                        <span style={{ fontSize: "0.75rem", color: "#317D89", background: "#e0f2fe", padding: "2px 8px", borderRadius: "12px", marginTop: "6px", display: "inline-block", fontWeight: 500 }}>
                          📸 Photo Attached
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button 
                        style={{ padding: "6px 12px", background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500 }}
                        onClick={() => setSelectedItem(r)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      ) : (

        /* ── Community Tips Table ── */
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <tr>
                {["Date", "Reporter Name", "Subject", "Tip Info", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 16px", fontWeight: 600, color: "#4b5563", fontSize: "0.82rem", textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {communityTips.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>No community tips yet.</td></tr>
              )}
              {communityTips.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{formatTs(t.submittedAt)}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 500 }}>{t.contact || "Anonymous"}</td>
                  <td style={{ padding: "14px 16px", color: "#111827" }}>{t.about || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#4b5563", maxWidth: "260px" }}>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.tip || "—"}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}><StatusBadge status={t.status} /></td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button 
                      style={{ padding: "6px 12px", background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500 }}
                      onClick={() => setSelectedItem(t)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DETAIL MODAL POPUP ── */}
      {selectedItem && (
        <div 
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(17, 24, 39, 0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} 
          onClick={() => setSelectedItem(null)}
        >
          <div 
            style={{ background: "#fff", padding: "0", borderRadius: "12px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }} 
            onClick={e => e.stopPropagation()} // Prevent clicks inside modal from closing it
          >
            {/* Modal Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#111827" }}>
                {selectedItem.type === "tip" ? "Community Tip Details" : "Displacement Report Details"}
              </h2>
              <button 
                onClick={() => setSelectedItem(null)}
                style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#6b7280" }}
              >&times;</button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Reported By</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 500, color: "#111827", marginTop: "4px" }}>
                    {selectedItem.reporterName || selectedItem.contact || "Anonymous"}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "2px" }}>Date: {formatTs(selectedItem.submittedAt)}</div>
                </div>
                <StatusBadge status={selectedItem.status} />
              </div>

              <div style={{ marginBottom: "20px", background: "#f3f4f6", padding: "16px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "8px" }}>
                  {selectedItem.type === "tip" ? "Subject / About" : "Location"}
                </div>
                <div style={{ color: "#111827", fontWeight: 500, fontSize: "1.05rem" }}>
                  {selectedItem.location || selectedItem.about || "Not specified"}
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "8px" }}>
                  Description / Information
                </div>
                <p style={{ margin: 0, color: "#374151", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                  {selectedItem.description || selectedItem.tip || "No description provided."}
                </p>
              </div>

              {/* Conditionally Render Photo if it's a valid URL */}
              {selectedItem.photoFileName && selectedItem.photoFileName.startsWith('http') && (
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "12px" }}>
                    Attached Evidence
                  </div>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", background: "#f9fafb", padding: "4px" }}>
                    <img 
                      src={selectedItem.photoFileName} 
                      alt="Report Evidence" 
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: "4px" }} 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer / Actions */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 500 }}>Update Status:</span>
                <select
                  value={selectedItem.status || "pending"}
                  onChange={(e) => updateStatus(selectedItem.id, e.target.value)}
                  disabled={saving}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.9rem", cursor: "pointer", background: "#fff", fontWeight: 500 }}
                >
                  <option value="pending">Pending</option>
                  <option value="received">Received</option>
                  <option value="responded">Responded</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                style={{ padding: "8px 16px", background: "#111827", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 500, cursor: "pointer" }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}