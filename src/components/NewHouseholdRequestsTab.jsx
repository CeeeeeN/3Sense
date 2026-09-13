import React, { useState } from "react";
import { processHouseholdTransfer } from "../services/services";

export default function NewHouseholdRequestsTab({ newHouseholds }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleReview = (req) => {
    setSelectedRequest(req);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this request as ${newStatus}?`)) return;
    
    setIsSaving(true);
    try {
      // Processes the new household creation and migrates the resident
      await processHouseholdTransfer(id, newStatus, selectedRequest);
      
      // Update local modal state to reflect the change immediately
      setSelectedRequest(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error("Error updating status:", error);
      alert(error.message || "Failed to update status. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="req-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="req-table" style={{ minWidth: "850px" }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Request ID</th>
              <th>Requester Name</th>
              <th>UID</th>
              <th>Current Household</th>
              <th>New Address Target</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {newHouseholds.length > 0 ? (
              newHouseholds.map((req) => (
                <tr key={req.id}>
                  <td>{req.dateSubmitted}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem" }}>{req.transferID || req.id.slice(0, 8)}</td>
                  <td>{req.requesterName}</td>
                  <td style={{ color: "#0d7a55", fontWeight: 600 }}>{req.UID || "—"}</td>
                  <td>{req.currentHouseholdID}</td>
                  <td>{req.newHouseNumber} {req.newStreet}</td>
                  <td>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', display: 'inline-block', fontSize: '0.8rem', fontWeight: 600,
                      background: req.status === 'Approved' ? '#dcfce7' : req.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                      color: req.status === 'Approved' ? '#166534' : req.status === 'Rejected' ? '#991b1b' : '#92400e'
                    }}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="as-btn-ghost" 
                      style={{ padding: '6px 12px' }}
                      onClick={() => handleReview(req)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>No new household requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── NEW HOUSEHOLD REVIEW MODAL ── */}
      {showModal && selectedRequest && (
        <div className="as-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="as-modal-content" style={{ maxWidth: "600px" }}>
            
            <div className="as-modal-header">
              <h2>Review New Household Request</h2>
              <button className="as-modal-close" onClick={closeModal} disabled={isSaving}>&times;</button>
            </div>

            <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left", maxHeight: "70vh", overflowY: "auto" }}>
              <div className="admin-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                
                {/* Header Information */}
                <div style={{ gridColumn: '1 / -1', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>Request ID: {selectedRequest.transferID || selectedRequest.id}</span>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', display: 'inline-block', fontSize: '0.8rem', fontWeight: 600,
                      background: selectedRequest.status === 'Approved' ? '#dcfce7' : selectedRequest.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                      color: selectedRequest.status === 'Approved' ? '#166534' : selectedRequest.status === 'Rejected' ? '#991b1b' : '#92400e'
                    }}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  <strong style={{ display: "block", marginBottom: "4px" }}>Date Submitted:</strong>
                  <span>{selectedRequest.dateSubmitted}</span>
                </div>

                {/* Identity Information */}
                <div>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "2px" }}>Requester Name:</strong>
                  <span style={{ fontSize: "1.05rem", fontWeight: 500, color: "#111827" }}>{selectedRequest.requesterName}</span>
                </div>
                <div>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "2px" }}>Barangay UID:</strong>
                  <span style={{ color: "#0d7a55", fontWeight: "bold", letterSpacing: "0.5px" }}>{selectedRequest.UID || "—"}</span>
                </div>

                {/* Household Details */}
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#64748b", fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Separating From:</strong>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{selectedRequest.currentHouseholdID}</span>
                </div>
                <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                  <strong style={{ color: "#3b82f6", fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>New Address Target:</strong>
                  <span style={{ fontWeight: 600, color: "#1d4ed8" }}>{selectedRequest.newHouseNumber} {selectedRequest.newStreet}</span>
                </div>

                {/* Reason */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>Reason for Separation:</strong>
                  <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem", color: "#374151" }}>
                    {selectedRequest.reason || "No reason provided."}
                  </div>
                </div>

                {/* Proof Document */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "8px" }}>Proof Document:</strong>
                  {selectedRequest.proofURL ? (
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px", background: "#f9fafb", display: "inline-block" }}>
                      <a href={selectedRequest.proofURL} target="_blank" rel="noopener noreferrer" title="Click to view full size">
                        <img 
                          src={selectedRequest.proofURL} 
                          alt="Proof of Residency" 
                          style={{ maxWidth: "100%", maxHeight: "250px", objectFit: "contain", borderRadius: "4px", cursor: "pointer", display: "block" }} 
                        />
                      </a>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px", textAlign: "center" }}>Click document to view full size</div>
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.85rem", color: "#6b7280", background: "#f3f4f6", padding: "6px 12px", borderRadius: "6px" }}>
                      📄 {selectedRequest.proofFileName || "No document provided"}
                    </span>
                  )}
                </div>
                
              </div>
            </div>

            {/* Admin Action Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              {selectedRequest.status === "Pending" ? (
                <>
                  <button 
                    className="reject-btn" 
                    onClick={() => handleUpdateStatus(selectedRequest.id, "Rejected")}
                    disabled={isSaving}
                  >
                    {isSaving ? "Processing..." : "Reject"}
                  </button>
                  <button 
                    className="approve-btn" 
                    onClick={() => handleUpdateStatus(selectedRequest.id, "Approved")}
                    disabled={isSaving}
                  >
                    {isSaving ? "Creating..." : "Approve & Create"}
                  </button>
                </>
              ) : (
                <button className="as-btn-ghost" onClick={closeModal} style={{ padding: "8px 24px" }}>
                  Close
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}