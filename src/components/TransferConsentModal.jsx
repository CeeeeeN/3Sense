import React, { useState, useEffect } from "react";
import { getTransferRequestDetails, respondToTransferConsent, verifyResidentPIN } from "../services/services";
import ErrorMessage from "./ErrorMessage"; // <-- IMPORT ERROR MESSAGE

export default function TransferConsentModal({ transferID, householdID, currentHeadID, onClose, onHandled }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [actionType, setActionType] = useState(null); // 'Approved' or 'Rejected'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!transferID) return;
    getTransferRequestDetails(transferID)
      .then((data) => {
        setRequest(data);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg("Failed to load transfer request details.");
      })
      .finally(() => setLoading(false));
  }, [transferID]);

  const handleConfirmAction = async () => {
    if (!actionType) return;
    
    // ── STRICT INPUT VALIDATION ──
    if (actionType === "Approved") {
      if (!pin || pin.trim().length === 0) {
        setErrorMsg("PIN is required. Please enter your 4-digit PIN to authorize this transfer.");
        return;
      }
      if (pin.trim().length !== 4) {
        setErrorMsg("Please enter your exact 4-digit PIN to authorize this transfer.");
        return;
      }
      if (!/^\d{4}$/.test(pin)) {
        setErrorMsg("PIN must contain only numbers.");
        return;
      }
    }
    // ─────────────────────────────

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (actionType === "Approved") {
        await verifyResidentPIN(householdID, currentHeadID, pin);
      }

      await respondToTransferConsent(request.id, actionType);
      if (onHandled) onHandled(actionType);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to process request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transferID) return null;

  return (
    <div className="pf-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal" style={{ maxWidth: "520px" }}>
        <div className="pf-modal-head">
          <div>
            <h3>Household Transfer Authorization</h3>
            <p>A resident requested to join your household</p>
          </div>
          <button className="pf-modal-close" onClick={onClose} disabled={isSubmitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="pf-modal-body" style={{ padding: "1.5rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading details...</div>
          ) : !request ? (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "#ef4444" }}>Request not found.</div>
          ) : request.headApproval !== "Pending" ? (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "#64748b" }}>
              This request has already been <strong>{request.headApproval}</strong>.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Requester Name</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>{request.requesterName}</div>
                <div style={{ fontSize: "0.8rem", color: "#0d7a55", fontWeight: 600, marginTop: "2px" }}>
                  UID: {request.UID || "—"}
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1, background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Current Household</div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: "2px" }}>{request.currentHouseholdID}</div>
                </div>
                <div style={{ flex: 1, background: "#f0fdf4", padding: "10px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#166534" }}>Target Branch</div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#15803d", marginTop: "2px" }}>
                    {request.targetBranchID || "BR-001"}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Reason Provided:</div>
                <div style={{ background: "#f1f5f9", padding: "10px", borderRadius: "6px", fontSize: "0.85rem", color: "#334155" }}>
                  {request.reason || "None specified"}
                </div>
              </div>

              {request.proofURL && (
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Proof Document:</div>
                  <a href={request.proofURL} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem", color: "#317D89" }}>
                    📄 View Uploaded Proof
                  </a>
                </div>
              )}

              {/* Action Selection */}
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>Your Decision:</div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => { setActionType("Approved"); setErrorMsg(""); }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: actionType === "Approved" ? "2px solid #0d7a55" : "1px solid #cbd5e1",
                      background: actionType === "Approved" ? "#ecfdf5" : "#ffffff",
                      color: actionType === "Approved" ? "#065f46" : "#334155",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✓ Allow Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActionType("Rejected"); setPin(""); setErrorMsg(""); }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: actionType === "Rejected" ? "2px solid #dc2626" : "1px solid #cbd5e1",
                      background: actionType === "Rejected" ? "#fef2f2" : "#ffffff",
                      color: actionType === "Rejected" ? "#991b1b" : "#334155",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✕ Deny Entry
                  </button>
                </div>
              </div>

              {/* Enter PIN only if approving */}
              {actionType === "Approved" && (
                <div style={{ marginTop: "0.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                    Authorize with your PIN <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => {
                      // Prevent non-numeric input
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setPin(val);
                      if (errorMsg) setErrorMsg("");
                    }}
                    disabled={isSubmitting}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: errorMsg ? "2px solid #dc2626" : "2px solid #cbd5e1",
                      background: errorMsg ? "#fef2f2" : "#fff",
                      color: errorMsg ? "#991b1b" : "var(--text)",
                      fontSize: "1.5rem",
                      letterSpacing: "8px",
                      textAlign: "center",
                      outline: "none",
                      transition: "all 0.2s ease-in-out"
                    }}
                  />
                </div>
              )}

              {/* <-- NEW: Display the custom ErrorMessage component --> */}
              {errorMsg && (
                <ErrorMessage 
                  message={errorMsg} 
                  onDismiss={() => setErrorMsg("")} 
                  style={{ marginTop: "0.5rem" }} 
                />
              )}
            </div>
          )}
        </div>

        <div className="pf-modal-foot" style={{ justifyContent: request?.headApproval === "Pending" ? "space-between" : "center" }}>
          {request?.headApproval === "Pending" ? (
            <>
              <button className="pf-btn-ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                className="pf-btn-primary"
                onClick={handleConfirmAction}
                disabled={isSubmitting || !actionType}
              >
                {isSubmitting ? "Submitting..." : "Confirm Decision"}
              </button>
            </>
          ) : (
            <button className="pf-btn-ghost" onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}