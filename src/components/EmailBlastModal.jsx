import React, { useState, useEffect } from "react";
import {
  checkExistingBlast,
  sendEmailBlast,
  fetchRecipientsForAnnouncement,
  fetchRecipientsForProgram,
  fetchRecipientsForLivelihood,
} from "../services/emailBlast";

export default function EmailBlastModal({
  sourceType,
  sourceId,
  subject,
  html,
  label = "All Recipients",
  announcement,
  program,
  onClose,
}) {
  const [phase, setPhase] = useState("idle");
  const [recipients, setRecipients] = useState([]);
  const [existingBlast, setExistingBlast] = useState(null);
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");

    (async () => {
      try {
        let emails = [];
        if (sourceType === "announcement" && announcement) {
          emails = await fetchRecipientsForAnnouncement(announcement);
        } else if (sourceType === "program" && sourceId) {
          emails = await fetchRecipientsForProgram(sourceId);
        } else if (sourceType === "livelihood" && sourceId) {
          emails = await fetchRecipientsForLivelihood(sourceId);
        }

        const prior = await checkExistingBlast(sourceId);

        if (!cancelled) {
          setRecipients(emails);
          setExistingBlast(prior);
          setPhase("confirm");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message || "Failed to fetch recipients.");
          setPhase("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [sourceType, sourceId, announcement]);

  const handleSend = async () => {
    if (recipients.length === 0) return;
    setPhase("sending");
    setProgress({ sent: 0, failed: 0, total: recipients.length });

    try {
      const result = await sendEmailBlast({
        sourceType,
        sourceId,
        recipients,
        subject,
        html,
        onProgress: (p) => setProgress(p),
      });
      setResults(result);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      setPhase("error");
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  const sourceLabel = {
    announcement: "Announcement",
    program: "Program",
    livelihood: "Livelihood Program",
  }[sourceType] || "Notification";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: "16px", width: "100%",
          maxWidth: "520px", overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          animation: "fadeIn 0.2s ease",
        }}
      >
        <div style={{ background: "linear-gradient(135deg,#2DB17B 0%,#1a6e4d 100%)", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "2px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", marginBottom: "4px" }}>
              Email Blast
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>
              Send {sourceLabel} Notification
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {phase === "loading" && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>Loading recipients…</p>
            </div>
          )}

          {phase === "error" && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ color: "#dc2626", fontWeight: 600, marginBottom: "8px" }}>Something went wrong</p>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>{errorMsg}</p>
            </div>
          )}

          {phase === "confirm" && (
            <>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "16px 20px", marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>Recipients</div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: "#15803d" }}>{recipients.length}</div>
                <div style={{ fontSize: "13px", color: "#374151", marginTop: "2px" }}>
                  {label} · with registered email
                </div>
              </div>

              {recipients.length === 0 && (
                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#c2410c", fontWeight: 600 }}>
                    No eligible recipients found.
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#92400e" }}>
                    This may be because no residents have a registered email address, or no approved registrations exist.
                  </p>
                </div>
              )}

              {existingBlast && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#92400e", fontWeight: 700 }}>
                    A blast was already sent for this {sourceLabel}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#92400e" }}>
                    Sent {formatDate(existingBlast.sentAt)} · {existingBlast.totalSent} sent · {existingBlast.totalFailed} failed.
                    Sending again will re-notify recipients.
                  </p>
                </div>
              )}

              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Subject</div>
                <div style={{ fontSize: "13px", color: "#374151" }}>{subject}</div>
              </div>
            </>
          )}

          {phase === "sending" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ fontWeight: 700, color: "#374151", marginBottom: "8px" }}>Sending emails…</p>
              <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden", marginBottom: "12px" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progress.total ? Math.round(((progress.sent + progress.failed) / progress.total) * 100) : 0}%`,
                    background: "#2DB17B",
                    borderRadius: "4px",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                {progress.sent} sent · {progress.failed} failed · {progress.total} total
              </p>
            </div>
          )}

          {phase === "done" && results && (
            <>
              <div style={{
                background: results.totalFailed === 0 ? "#f0fdf4" : "#fffbeb",
                border: `1px solid ${results.totalFailed === 0 ? "#bbf7d0" : "#fde68a"}`,
                borderRadius: "10px", padding: "16px 20px", marginBottom: "16px",
                display: "flex", gap: "16px",
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#15803d" }}>{results.totalSent}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Sent</div>
                </div>
                <div style={{ width: "1px", background: "#e5e7eb" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#dc2626" }}>{results.totalFailed}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Failed</div>
                </div>
                <div style={{ width: "1px", background: "#e5e7eb" }} />
                <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#374151" }}>
                    {results.totalFailed === 0
                      ? "All emails delivered successfully."
                      : results.totalSent === 0
                        ? "All emails failed to send."
                        : "Some emails failed. Check the list below."}
                  </p>
                </div>
              </div>

              {results.results && results.results.length > 0 && (
                <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: "#6b7280", fontWeight: 600 }}>Email</th>
                        <th style={{ padding: "8px 12px", textAlign: "right", color: "#6b7280", fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.results.map((r, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "7px 12px", color: "#374151", wordBreak: "break-all" }}>{r.email}</td>
                          <td style={{ padding: "7px 12px", textAlign: "right" }}>
                            <span style={{
                              padding: "2px 8px", borderRadius: "12px", fontWeight: 700,
                              fontSize: "11px",
                              background: r.status === "sent" ? "#dcfce7" : "#fee2e2",
                              color: r.status === "sent" ? "#166534" : "#991b1b",
                            }}>
                              {r.status === "sent" ? "Sent" : "Failed"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: "0 28px 24px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          {(phase === "confirm" || phase === "error") && (
            <button
              onClick={onClose}
              style={{ padding: "9px 20px", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", fontWeight: 600, color: "#374151", fontSize: "14px" }}
            >
              Cancel
            </button>
          )}

          {phase === "confirm" && recipients.length > 0 && (
            <button
              onClick={handleSend}
              style={{ padding: "9px 22px", background: "linear-gradient(135deg,#2DB17B,#1a6e4d)", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, color: "#fff", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              Send to {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
            </button>
          )}

          {phase === "done" && (
            <button
              onClick={onClose}
              style={{ padding: "9px 22px", background: "linear-gradient(135deg,#2DB17B,#1a6e4d)", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, color: "#fff", fontSize: "14px" }}
            >
              Done
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
}
