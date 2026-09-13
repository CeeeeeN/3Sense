import React, { useState, useEffect } from "react";
import { submitHouseholdTransfer, fetchHouseholdBranchesForTransfer } from "../services/services";
import ErrorMessage from "../components/ErrorMessage";

export default function TransferHouseholdModal({ onClose, currentHouseholdID, userData, memberID, onNavigate }) {
  const [step, setStep] = useState(1);
  const [transferType, setTransferType] = useState(""); // "existing" or "new"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors] = useState({});
  
  // Dynamic Branch State (for existing households)
  const [availableBranches, setAvailableBranches] = useState([{ id: "BR-001", name: "BR-001 (Main)" }]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [targetError, setTargetError] = useState("");
  
  // Form State
  const [form, setForm] = useState({
    currentHouseholdID: currentHouseholdID || "",
    
    // For joining existing household
    targetHouseholdID: "",
    targetBranchID: "BR-001",
    
    // For creating new household
    newHouseNumber: "",
    newStreet: "",
    newEmail: "",

    // Shared
    reason: "",
    proofFileName: "",
    proofFile: null
  });

  const updateField = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    if (errorMsg) setErrorMsg("");
  };

  // Debounced query to validate target household and fetch its branches (ONLY for existing)
  useEffect(() => {
    if (transferType !== "existing") return;

    const fetchBranches = async () => {
      const target = form.targetHouseholdID.trim().toUpperCase();
      if (!target || target.length < 8) {
        setAvailableBranches([{ id: "BR-001", name: "BR-001 (Main)" }]);
        setTargetError("");
        return;
      }

      setLoadingBranches(true);
      setTargetError("");
      
      try {
        const { exists, branches } = await fetchHouseholdBranchesForTransfer(target);
        if (!exists) {
          setTargetError("Household ID not found in database.");
          setAvailableBranches([]);
          setForm(f => ({ ...f, targetBranchID: "" }));
        } else {
          setAvailableBranches(branches);
          if (!branches.some(b => b.id === form.targetBranchID)) {
            setForm(f => ({ ...f, targetBranchID: branches[0].id }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
        setTargetError("Error verifying household.");
      } finally {
        setLoadingBranches(false);
      }
    };

    const timer = setTimeout(() => { fetchBranches(); }, 600);
    return () => clearTimeout(timer);
  }, [form.targetHouseholdID, transferType]);

  const handleNext = () => {
    if (step === 1 && !transferType) return;
    setErrors({});
    setErrorMsg("");
    setStep(s => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- STRICT INPUT VALIDATION ---
    const errs = {};

    // Validation Branching based on Type
    if (transferType === "existing") {
      const targetHH = form.targetHouseholdID?.trim();
      if (!targetHH) {
        errs.targetHouseholdID = "Target Household ID is required.";
      } else if (targetHH.length < 8) {
        errs.targetHouseholdID = "Please enter a valid Target Household ID.";
      } else if (targetError) {
        errs.targetHouseholdID = targetError;
      }
    } else if (transferType === "new") {
      const hNum = form.newHouseNumber?.trim();
      const street = form.newStreet?.trim();
      const email = form.newEmail?.trim();

      if (!hNum) {
        errs.newHouseNumber = "Please provide your house or unit number.";
      }
      if (!street) {
        errs.newStreet = "Please provide your street or purok name.";
      } else if (street.length < 3) {
        errs.newStreet = "Street or purok name must be at least 3 characters.";
      }
      if (!email) {
        errs.newEmail = "Contact email is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errs.newEmail = "A valid email address is required to receive your new Household ID.";
      }
    }

    const reasonText = form.reason?.trim();
    if (!reasonText) {
      errs.reason = "Please provide a reason for the transfer.";
    } else if (reasonText.length < 10) {
      errs.reason = "Please provide a clearer reason for the transfer (minimum 10 characters).";
    }

    if (!form.proofFile) {
      errs.proofFile = "Please upload a valid proof document or ID.";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    // -------------------------------

    if (targetError) return;

    setIsSubmitting(true);
    setErrorMsg("");
    
    try {
      let uploadedProofUrl = null;

      if (form.proofFile) {
        const formData = new FormData();
        formData.append("file", form.proofFile);
        formData.append("upload_preset", "3Sense+_ID"); 
        const cloudName = "dfnqeiksu";

        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: formData }
        );

        if (!cloudinaryResponse.ok) throw new Error("Failed to upload proof document.");

        const cloudinaryData = await cloudinaryResponse.json();
        uploadedProofUrl = cloudinaryData.secure_url;
      }

      const submissionData = {
        ...form,
        transferType,
        proofURL: uploadedProofUrl
      };

      const residentID = memberID || userData?.id || "";
      const userUID = userData?.UID || "";
      const userName = [userData?.firstName, userData?.lastName].filter(Boolean).join(" ");

      // Submits to the backend pipeline
      await submitHouseholdTransfer(currentHH, residentID, userUID, userName, submissionData);
      
      setStep(3); 
    } catch (error) {
      console.error("Transfer request failed:", error);
      setErrorMsg(error.message || "Failed to submit transfer request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal" style={{ maxWidth: '550px' }}>
        <div className="pf-modal-head">
          <div>
            <h3>Household Transfer Request</h3>
            <p>Move your profile to a different household</p>
          </div>
          <button className="pf-modal-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="pf-modal-body" style={{ padding: '1.5rem', maxHeight: "75vh", overflowY: "auto" }}>
          
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{
                display: "flex", alignItems: "flex-start", gap: "12px", background: "#fffbeb",
                border: "1px solid #fcd34d", borderRadius: "8px", padding: "12px 16px", color: "#92400e", fontSize: "0.85rem"
              }}>
                <svg style={{ flexShrink: 0, marginTop: "2px" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div style={{ lineHeight: "1.5" }}>
                  <strong style={{ display: "block", color: "#78350f", marginBottom: "4px", fontSize: "0.9rem" }}>Admin Approval Required</strong>
                  Household transfers involve legal residency records. All requests will be reviewed by the Barangay Administration before any changes are applied.
                </div>
              </div>

              <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>What would you like to do?</div>

              <button 
                onClick={() => { setTransferType("existing"); setErrors({}); setErrorMsg(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "10px", textAlign: "left",
                  background: transferType === "existing" ? "#f0fdf4" : "#f9fafb",
                  border: transferType === "existing" ? "2px solid #2DB17B" : "2px solid #e5e7eb",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: transferType === "existing" ? "#dcfce7" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: transferType === "existing" ? "#166534" : "#6b7280" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: "1rem" }}>Join an Existing Household</div>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "2px" }}>Move into another registered household using their ID.</div>
                </div>
              </button>

              <button 
                onClick={() => { setTransferType("new"); setErrors({}); setErrorMsg(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "10px", textAlign: "left",
                  background: transferType === "new" ? "#eff6ff" : "#f9fafb",
                  border: transferType === "new" ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: transferType === "new" ? "#dbeafe" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: transferType === "new" ? "#1d4ed8" : "#6b7280" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: "1rem" }}>Create a New Household</div>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "2px" }}>Branch off and register a brand new household.</div>
                </div>
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              <div className="pf-field">
                <label className="pf-lbl">Current Household ID <span className="req">*</span></label>
                <input 
                  className="pf-inp" 
                  placeholder="e.g. MAL-2026-00000"
                  value={form.currentHouseholdID} 
                  readOnly // Block editing to prevent errors
                  style={{ background: "#f8fafc", color: "#64748b" }}
                />
              </div>

              {/* ── CONDITIONAL RENDER: JOINING EXISTING ── */}
              {transferType === "existing" && (
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div className="pf-field" style={{ flex: 2 }}>
                    <label className="pf-lbl">Target Household ID <span className="req">*</span></label>
                    <input 
                      className={`pf-inp ${errors.targetHouseholdID || targetError ? 'error' : ''}`} 
                      style={(errors.targetHouseholdID || targetError) ? { borderColor: '#dc2626', background: '#fef2f2' } : {}}
                      placeholder="MAL-2026-XXXXX" 
                      value={form.targetHouseholdID} 
                      onChange={e => updateField("targetHouseholdID", e.target.value.toUpperCase())} 
                    />
                    {(errors.targetHouseholdID || targetError) && (
                      <div style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                        {errors.targetHouseholdID || targetError}
                      </div>
                    )}
                  </div>
                  
                  <div className="pf-field" style={{ flex: 1 }}>
                    <label className="pf-lbl">Target Branch</label>
                    <select 
                      className="pf-inp" 
                      style={{ padding: "0.6rem", background: loadingBranches ? "#f1f5f9" : "#fff" }}
                      value={form.targetBranchID} 
                      onChange={e => setForm({...form, targetBranchID: e.target.value})} 
                      disabled={loadingBranches || availableBranches.length === 0}
                    >
                      {loadingBranches ? (
                        <option value="">Loading...</option>
                      ) : availableBranches.length === 0 ? (
                        <option value="">Not Found</option>
                      ) : (
                        availableBranches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* ── CONDITIONAL RENDER: CREATING NEW ── */}
              {transferType === "new" && (
                <>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div className="pf-field" style={{ flex: 1 }}>
                      <label className="pf-lbl">New House/Unit Number <span className="req">*</span></label>
                      <input 
                        className={`pf-inp ${errors.newHouseNumber ? 'error' : ''}`} 
                        style={errors.newHouseNumber ? { borderColor: '#dc2626', background: '#fef2f2' } : {}}
                        placeholder="e.g. 142" 
                        value={form.newHouseNumber} 
                        onChange={e => updateField("newHouseNumber", e.target.value)} 
                      />
                      {errors.newHouseNumber && (
                        <div style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                          {errors.newHouseNumber}
                        </div>
                      )}
                    </div>
                    <div className="pf-field" style={{ flex: 2 }}>
                      <label className="pf-lbl">New Street / Purok <span className="req">*</span></label>
                      <input 
                        className={`pf-inp ${errors.newStreet ? 'error' : ''}`} 
                        style={errors.newStreet ? { borderColor: '#dc2626', background: '#fef2f2' } : {}}
                        placeholder="e.g. Malanday Street" 
                        value={form.newStreet} 
                        onChange={e => updateField("newStreet", e.target.value)} 
                      />
                      {errors.newStreet && (
                        <div style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                          {errors.newStreet}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="pf-field">
                    <label className="pf-lbl">Contact Email <span className="req">*</span></label>
                    <input 
                      type="email"
                      className={`pf-inp ${errors.newEmail ? 'error' : ''}`} 
                      style={errors.newEmail ? { borderColor: '#dc2626', background: '#fef2f2' } : {}}
                      placeholder="We will send your new Household ID here" 
                      value={form.newEmail} 
                      onChange={e => updateField("newEmail", e.target.value)} 
                    />
                    {errors.newEmail && (
                      <div style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                        {errors.newEmail}
                      </div>
                    )}
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                      This email will be used to activate your new household account.
                    </div>
                  </div>
                </>
              )}

              {/* ── SHARED FIELDS ── */}
              <div className="pf-field">
                <label className="pf-lbl">Reason for Transfer <span className="req">*</span></label>
                <textarea 
                  className={`pf-inp ${errors.reason ? 'error' : ''}`} 
                  rows="3" 
                  placeholder="Please briefly explain why you are requesting this transfer..."
                  value={form.reason}
                  onChange={e => updateField("reason", e.target.value)}
                  style={{ 
                    resize: "vertical", 
                    minHeight: "80px",
                    ...(errors.reason ? { borderColor: '#dc2626', background: '#fef2f2' } : {})
                  }}
                />
                {errors.reason && (
                  <div style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                    {errors.reason}
                  </div>
                )}
              </div>

              <div className="pf-field">
                <label className="pf-lbl">Proof Document <span className="req">*</span></label>
                <label className="dr-upload-box" style={{ 
                  padding: "20px", 
                  textAlign: "center", 
                  border: errors.proofFile ? "2px dashed #dc2626" : "2px dashed #cbd5e1", 
                  borderRadius: "8px", 
                  background: errors.proofFile ? "#fef2f2" : "#f8fafc", 
                  cursor: "pointer", 
                  display: "block" 
                }}>
                  <input 
                    type="file" 
                    accept=".jpg,.jpeg,.png,.pdf" 
                    style={{ display: "none" }} 
                    onChange={e => {
                      if (e.target.files[0]) {
                        setForm(f => ({ ...f, proofFile: e.target.files[0], proofFileName: e.target.files[0].name }));
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.proofFile;
                          return copy;
                        });
                        if (errorMsg) setErrorMsg("");
                      }
                    }}
                  />
                  {form.proofFileName ? (
                    <div style={{ color: "#0d7a55", fontWeight: 600, fontSize: "0.85rem" }}>
                      ✓ {form.proofFileName}
                    </div>
                  ) : (
                    <div>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={errors.proofFile ? "#dc2626" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px" }}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                      <div style={{ fontSize: "0.85rem", color: errors.proofFile ? "#991b1b" : "#475569", fontWeight: 500 }}>Upload ID or Proof of Residency</div>
                      <div style={{ fontSize: "0.75rem", color: errors.proofFile ? "#b91c1c" : "#94a3b8", marginTop: "4px" }}>JPG, PNG or PDF (Max 5MB)</div>
                    </div>
                  )}
                </label>
                {errors.proofFile && (
                  <div style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                    {errors.proofFile}
                  </div>
                )}
              </div>

              {errorMsg && (
                <ErrorMessage 
                  message={errorMsg} 
                  onDismiss={() => setErrorMsg("")} 
                  style={{ marginTop: "0.5rem" }} 
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#111827", fontSize: "1.25rem" }}>Request Submitted</h3>
              <p style={{ color: "#6b7280", fontSize: "0.95rem", lineHeight: "1.5", margin: 0 }}>
                Your request to {transferType === "new" ? "create a new household" : "transfer to an existing household"} has been sent to the Barangay Administration. You will be notified once it is approved.
              </p>
            </div>
          )}

        </div>

        <div className="pf-modal-foot" style={{ justifyContent: step === 3 ? "center" : "space-between" }}>
          {step < 3 && (
            <button className="pf-btn-ghost" onClick={() => step === 1 ? onClose() : setStep(1)} disabled={isSubmitting}>
              {step === 1 ? "Cancel" : "← Back"}
            </button>
          )}
          
          {step === 1 && (
            <button className="pf-btn-primary" onClick={handleNext} disabled={!transferType}>
              Next Step →
            </button>
          )}
          
          {step === 2 && (
            <button 
              className="pf-btn-primary" 
              onClick={handleSubmit} 
              disabled={isSubmitting || loadingBranches}
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          )}

          {step === 3 && (
            <button className="pf-btn-ghost" onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}