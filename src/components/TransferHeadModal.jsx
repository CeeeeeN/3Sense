import React, { useState, useEffect } from "react";
import { getHouseholdResidents, transferHouseholdHeadRole, verifyResidentPIN } from "../services/services";
import ErrorMessage from "./ErrorMessage"; // <-- IMPORT ERROR MESSAGE

export default function TransferHeadModal({ onClose, householdID, currentHeadID, onLogout }) {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTargetID, setSelectedTargetID] = useState("");
  const [pin, setPin] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let isMounted = true;
    getHouseholdResidents(householdID)
      .then((data) => {
        if (!isMounted) return;
        const eligibleMembers = data.filter(res => res.id !== currentHeadID);
        setResidents(eligibleMembers);
        if (eligibleMembers.length > 0) {
          setSelectedTargetID(eligibleMembers[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch residents:", err);
        setErrorMsg("Could not load household members.");
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, [householdID, currentHeadID]);

  const handleSubmit = async () => {
    if (!selectedTargetID) {
      setErrorMsg("Please select a new Household Head.");
      return;
    }

    // ── STRICT INPUT VALIDATION ──
    if (!pin || pin.trim().length !== 4) {
      setErrorMsg("Please enter your exact 4-digit PIN.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setErrorMsg("PIN must contain only numbers.");
      return;
    }
    // ─────────────────────────────
    
    if (!window.confirm("Are you sure? You will lose all administrative privileges for this household and will be logged out immediately.")) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // 1. Verify PIN securely against the database
      await verifyResidentPIN(householdID, currentHeadID, pin);

      // 2. Transfer Role
      await transferHouseholdHeadRole(householdID, currentHeadID, selectedTargetID);
      
      // 3. Immediately log the user out
      onLogout();
    } catch (err) {
      console.error("Transfer role failed:", err);
      setErrorMsg(err.message || "Failed to transfer the Household Head role.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal" style={{ maxWidth: '450px' }}>
        <div className="pf-modal-head">
          <div>
            <h3>Transfer Head Role</h3>
            <p>Assign your administrative privileges to another member</p>
          </div>
          <button className="pf-modal-close" onClick={onClose} disabled={isSubmitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="pf-modal-body" style={{ padding: '1.5rem' }}>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "12px", background: "#fef2f2",
            border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", color: "#991b1b", fontSize: "0.85rem", marginBottom: "1rem"
          }}>
            <svg style={{ flexShrink: 0, marginTop: "2px" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div style={{ lineHeight: "1.5" }}>
              <strong style={{ display: "block", color: "#7f1d1d", marginBottom: "4px", fontSize: "0.9rem" }}>Warning: Irreversible Action</strong>
              By transferring the Household Head role, you will immediately lose your ability to manage household members, approve transfers, and update primary household data. You will be logged out upon completion.
            </div>
          </div>

          <div className="pf-field">
            <label className="pf-lbl">Select New Household Head</label>
            {loading ? (
              <div style={{ padding: "12px", background: "#f1f5f9", borderRadius: "6px", color: "#64748b", fontSize: "0.85rem", textAlign: "center" }}>
                Loading household members...
              </div>
            ) : residents.length === 0 ? (
              <div style={{ padding: "12px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "6px", color: "#92400e", fontSize: "0.85rem" }}>
                There are no other eligible members in this household. You must add a member before transferring the role.
              </div>
            ) : (
              <select 
                className="pf-inp" 
                style={{ padding: "0.6rem", marginBottom: "1rem" }}
                value={selectedTargetID} 
                onChange={e => setSelectedTargetID(e.target.value)}
                disabled={isSubmitting}
              >
                {residents.map(res => (
                  <option key={res.id} value={res.id}>
                    {res.firstName} {res.lastName} {res.branchID ? `(${res.branchID})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="pf-field">
            <label className="pf-lbl" style={{ textAlign: "center", display: "block" }}>
              Enter PIN to Confirm <span className="req">*</span>
            </label>
            <input 
              type="password" 
              className="pf-inp" 
              placeholder="••••" 
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => {
                // Prevent any non-numeric characters
                const val = e.target.value.replace(/[^0-9]/g, "");
                setPin(val);
                // Auto-clear error state when user types
                if (errorMsg) setErrorMsg("");
              }}
              disabled={isSubmitting || residents.length === 0}
              style={{ 
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: errorMsg ? "2px solid #dc2626" : "1px solid #cbd5e1",
                background: errorMsg ? "#fef2f2" : "#fff",
                color: errorMsg ? "#991b1b" : "var(--text)",
                letterSpacing: "8px", 
                fontSize: "1.5rem", 
                textAlign: "center",
                transition: "all 0.2s ease-in-out"
              }}
            />
          </div>

          {/* <-- NEW: Display the custom ErrorMessage component --> */}
          {errorMsg && (
            <ErrorMessage 
              message={errorMsg} 
              onDismiss={() => setErrorMsg("")} 
              style={{ marginTop: "1rem" }} 
            />
          )}
        </div>

        <div className="pf-modal-foot" style={{ justifyContent: "space-between" }}>
          <button className="pf-btn-ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          
          <button 
            className="pf-btn-primary" 
            style={{ background: "#dc2626", borderColor: "#dc2626" }}
            onClick={handleSubmit} 
            disabled={isSubmitting || residents.length === 0 || !selectedTargetID || pin.length !== 4}
          >
            {isSubmitting ? "Verifying..." : "Confirm Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}