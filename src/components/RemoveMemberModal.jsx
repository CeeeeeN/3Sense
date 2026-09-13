import React, { useState, useEffect } from "react";
import ErrorMessage from "./ErrorMessage";
import { getHouseholdResidents, removeHouseholdMember } from "../services/services";

const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;

export default function RemoveMemberModal({ onClose, householdID, currentHeadID }) {
  const [step, setStep] = useState("loading"); // "loading", "list", "pin", "success"
  const [members, setMembers] = useState([]);
  const [targetMember, setTargetMember] = useState(null);
  
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch household members on mount
  useEffect(() => {
    let isMounted = true;
    getHouseholdResidents(householdID)
      .then(fetchedMembers => {
        if (!isMounted) return;
        // Exclude the head from the deletion list
        const removableMembers = fetchedMembers.filter(m => m.id !== currentHeadID);
        setMembers(removableMembers);
        setStep("list");
      })
      .catch(err => {
        console.error("Failed to fetch residents:", err);
        setErrorMsg("Failed to load household members.");
        setStep("list");
      });
    return () => { isMounted = false; };
  }, [householdID, currentHeadID]);

  const handleSelectMember = (member) => {
    setTargetMember(member);
    setPin("");
    setErrorMsg("");
    setStep("pin");
  };

  const handleRemove = async () => {
    if (!pin || pin.trim().length !== 4) {
      setErrorMsg("Please enter the exact 4-digit PIN.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setErrorMsg("PIN must contain only numbers.");
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently remove ${targetMember.firstName || 'this member'} from the household?`)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      await removeHouseholdMember(householdID, targetMember.id, pin);
      setStep("success");
    } catch (err) {
      console.error("Removal error:", err);
      setErrorMsg(err.message || "Failed to remove member. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pf-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal" style={{ maxWidth: "450px" }}>
        
        {/* HEADER */}
        <div className="pf-modal-head" style={{ borderBottom: step === "pin" ? "1px solid #fee2e2" : "1px solid #e5e7eb" }}>
          <div>
            <h3 style={{ color: step === "pin" ? "#b91c1c" : "var(--text)" }}>Remove Member</h3>
            <p>Delete a member from your household</p>
          </div>
          <button className="pf-modal-close" onClick={onClose} disabled={isSubmitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="pf-modal-body" style={{ padding: "1.5rem", maxHeight: "60vh", overflowY: "auto" }}>
          
          {/* LOADING STATE */}
          {step === "loading" && (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>
              Loading household members...
            </div>
          )}

          {/* LIST STATE */}
          {step === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {errorMsg && <ErrorMessage message={errorMsg} />}
              
              {members.length === 0 && !errorMsg ? (
                <div style={{ textAlign: "center", color: "var(--muted)", padding: "2rem", background: "#f8fafc", borderRadius: "8px" }}>
                  You are the only member in this household.
                </div>
              ) : (
                members.map(m => {
                  const fullName = [m.firstName, m.lastName].filter(Boolean).join(" ");
                  return (
                    <div 
                      key={m.id} 
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.95rem" }}>{fullName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{m.role || "Member"}</div>
                      </div>
                      <button 
                        onClick={() => handleSelectMember(m)}
                        style={{
                          background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", 
                          padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, 
                          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px"
                        }}
                      >
                        <IconTrash /> Remove
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* PIN VERIFICATION STATE */}
          {step === "pin" && (
            <div>
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px",
                color: "#991b1b", fontSize: "0.85rem", marginBottom: "1.25rem", lineHeight: "1.4"
              }}>
                <strong>Security Authorization Required:</strong><br/>
                To proceed with deletion, please ask <strong>{targetMember?.firstName || "this member"}</strong> to enter their 4-digit PIN below to authorize their removal.
              </div>

              <div className="pf-field">
                <label className="pf-lbl" style={{ textAlign: "center", display: "block" }}>
                  Enter {targetMember?.firstName}'s PIN <span className="req">*</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    // Prevent any non-numeric characters from being typed
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setPin(val);
                    // Clear the error message instantly when they attempt to correct it
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

              {errorMsg && (
                <ErrorMessage 
                  message={errorMsg} 
                  onDismiss={() => setErrorMsg("")} 
                  style={{ marginTop: "1rem" }} 
                />
              )}
            </div>
          )}

          {/* SUCCESS STATE */}
          {step === "success" && (
            <div style={{ textAlign: "center", padding: "1rem" }}>
              <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#111827", fontSize: "1.1rem" }}>Member Removed</h3>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
                {targetMember?.firstName} has been successfully deleted from your household.
              </p>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="pf-modal-foot" style={{ justifyContent: step === "pin" ? "space-between" : "flex-end", background: "#f8fafc" }}>
          {step === "pin" && (
            <button className="pf-btn-ghost" onClick={() => setStep("list")} disabled={isSubmitting}>
              ← Back
            </button>
          )}
          
          {step === "pin" ? (
            <button 
              className="pf-btn-primary" 
              onClick={handleRemove} 
              disabled={isSubmitting || pin.length !== 4}
              style={{ background: "#dc2626", borderColor: "#dc2626" }}
            >
              {isSubmitting ? "Removing..." : "Confirm Removal"}
            </button>
          ) : (
            <button className="pf-btn-ghost" onClick={onClose}>
              {step === "success" ? "Done" : "Close"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}