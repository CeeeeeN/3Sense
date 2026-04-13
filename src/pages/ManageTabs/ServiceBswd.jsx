import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import {
  collection, onSnapshot, doc, updateDoc,
  serverTimestamp, query, orderBy,
} from "firebase/firestore";

const formatTs = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const StatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const isResolved  = s.includes("resolved") || s === "resolved (handled)" || s === "resolved";
  const isResponded = s === "responded";
  const style = {
    padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600,
    background: isResolved ? "#dcfce7" : isResponded ? "#e0e7ff" : "#fef3c7",
    color:      isResolved ? "#166534" : isResponded ? "#3730a3" : "#92400e",
  };
  return <span style={style}>{status || "pending"}</span>;
};

export default function ServiceBswd({ onBack }) {
  const [activeTab, setActiveTab] = useState("reports");

  // ── bswdReports ──────────────────────────────────────────────────
  const [reports, setReports]         = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

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
    } catch (err) {
      console.error("Error updating status:", err);
    }
    setSaving(false);
  };

  // ── Stats ─────────────────────────────────────────────────────────
  const reportsStats = {
    total:    displacementReports.length,
    pending:  displacementReports.filter(r => (r.status || "").toLowerCase() === "pending").length,
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
                {["Date", "HH ID", "Reporter Name", "Location", "Description", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 16px", fontWeight: 600, color: "#4b5563", fontSize: "0.82rem", textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displacementReports.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>No displacement reports yet.</td></tr>
              )}
              {displacementReports.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{formatTs(r.submittedAt)}</td>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "0.82rem" }}>{r.hhid || "—"}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 500 }}>{r.reporterName || "Anonymous"}</td>
                  <td style={{ padding: "14px 16px", color: "#111827" }}>{r.location || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#4b5563", maxWidth: "260px" }}>
                    <div style={{ marginBottom: r.photoFileName ? "6px" : 0 }}>{r.description || "—"}</div>
                    {r.photoFileName && (
                      <span style={{ fontSize: "0.75rem", color: "#317D89", background: "#e0f2fe", padding: "2px 8px", borderRadius: "12px" }}>
                        📸 {r.photoFileName}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    {!(r.status || "").toLowerCase().includes("resolved") ? (
                      <select
                        defaultValue={r.status || "pending"}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        disabled={saving}
                        style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "0.8rem", cursor: "pointer" }}
                      >
                        <option value="pending">Pending</option>
                        <option value="responded">Responded</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : (

        /* ── Community Tips Table ── */
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <tr>
                {["Date", "HH ID", "Reporter Name", "Location", "Description", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 16px", fontWeight: 600, color: "#4b5563", fontSize: "0.82rem", textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {communityTips.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>No community tips yet.</td></tr>
              )}
              {communityTips.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{formatTs(t.submittedAt)}</td>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "0.82rem" }}>{t.hhid || "—"}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 500 }}>{t.reporterName || "Anonymous"}</td>
                  <td style={{ padding: "14px 16px", color: "#111827" }}>{t.location || "—"}</td>
                  <td style={{ padding: "14px 16px", color: "#4b5563", maxWidth: "280px" }}>
                    <div>{t.description || "—"}</div>
                    {t.photoFileName && (
                      <span style={{ fontSize: "0.75rem", color: "#317D89", background: "#e0f2fe", padding: "2px 8px", borderRadius: "12px", marginTop: "4px", display: "inline-block" }}>
                        📸 {t.photoFileName}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}><StatusBadge status={t.status} /></td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    {!(t.status || "").toLowerCase().includes("resolved") && !(t.status || "").toLowerCase().includes("handled") ? (
                      <button
                        style={{ padding: "5px 12px", background: "#fff", border: "1px solid #2DB17B", color: "#2DB17B", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
                        onClick={() => updateStatus(t.id, "resolved")}
                        disabled={saving}
                      >
                        Mark Handled
                      </button>
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}