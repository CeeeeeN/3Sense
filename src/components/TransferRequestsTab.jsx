import React, { useState, useEffect } from "react";
import { processHouseholdTransfer } from "../services/services";
import { useAlert } from "../context/AlertContext"; // <-- IMPORT HOOK

export default function TransferRequestsTab({ transfers }) {
  const { showAlert, showConfirm } = useAlert(); // <-- INITIALIZE HOOK

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // State for sorting
  const [sortFilter, setSortFilter] = useState("Date: Newest First");

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortFilter]);

  const handleReview = (req) => {
    setSelectedRequest(req);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    // <-- REPLACED window.confirm
    const isConfirmed = await showConfirm(
      "Confirm Action",
      `Are you sure you want to mark this request as ${newStatus}?`
    );
    if (!isConfirmed) return;
    
    setIsSaving(true);
    try {
      await processHouseholdTransfer(id, newStatus, selectedRequest);
      setSelectedRequest(prev => ({ ...prev, status: newStatus }));
      
      // <-- ADDED success alert
      await showAlert("Success", `Transfer request marked as ${newStatus}.`);
    } catch (error) {
      console.error("Error updating transfer status:", error);
      // <-- REPLACED native alert
      await showAlert("Error", error.message || "Failed to update status. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter logic combining search text and status dropdown
  const filteredTransfers = transfers.filter((req) => {
    const matchesStatus = statusFilter === "All" || req.status === statusFilter;
    
    if (!searchTerm) return matchesStatus;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (req.requesterName?.toLowerCase().includes(searchLower)) ||
      (req.UID?.toLowerCase().includes(searchLower)) ||
      (req.transferID?.toLowerCase().includes(searchLower)) ||
      (req.id?.toLowerCase().includes(searchLower)) ||
      (req.currentHouseholdID?.toLowerCase().includes(searchLower)) ||
      (req.targetHouseholdID?.toLowerCase().includes(searchLower));

    return matchesStatus && matchesSearch;
  });

  // Sort logic applied after filtering
  const sortedTransfers = [...filteredTransfers].sort((a, b) => {
    if (sortFilter === "Date: Newest First") {
      return new Date(b.dateSubmitted || 0) - new Date(a.dateSubmitted || 0);
    } else if (sortFilter === "Date: Oldest First") {
      return new Date(a.dateSubmitted || 0) - new Date(b.dateSubmitted || 0);
    } else if (sortFilter === "Name: A to Z") {
      return (a.requesterName || "").localeCompare(b.requesterName || "");
    } else if (sortFilter === "Name: Z to A") {
      return (b.requesterName || "").localeCompare(a.requesterName || "");
    }
    return 0;
  });

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedTransfers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedTransfers.length / itemsPerPage);

  return (
    <>
      {/* Search and Filter Bar */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        
        <input 
          type="text" 
          placeholder="Search requests..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: "250px", 
            padding: "10px 14px", 
            borderRadius: "8px", 
            border: "1px solid #d1d5db",
            fontSize: "0.9rem"
          }}
        />

        <select 
          value={sortFilter}
          onChange={(e) => setSortFilter(e.target.value)}
          style={{ 
            padding: "10px 14px", 
            borderRadius: "8px", 
            border: "1px solid #d1d5db", 
            backgroundColor: "#fff",
            fontSize: "0.9rem",
            minWidth: "160px"
          }}
        >
          <option value="Date: Newest First">Date: Newest First</option>
          <option value="Date: Oldest First">Date: Oldest First</option>
          <option value="Name: A to Z">Name: A to Z</option>
          <option value="Name: Z to A">Name: Z to A</option>
        </select>

        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ 
            padding: "10px 14px", 
            borderRadius: "8px", 
            border: "1px solid #d1d5db", 
            backgroundColor: "#fff",
            fontSize: "0.9rem",
            minWidth: "150px"
          }}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="req-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="req-table" style={{ minWidth: "850px" }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Request ID</th>
              <th>Requester Name</th>
              <th>UID</th>
              <th>Current Household</th>
              <th>Target Household</th>
              <th>Head Approval</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((req) => (
                <tr key={req.id}>
                  <td>{req.dateSubmitted}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem" }}>{req.transferID || req.id.slice(0, 8)}</td>
                  <td>{req.requesterName}</td>
                  <td style={{ color: "#0d7a55", fontWeight: 600 }}>{req.UID || "—"}</td>
                  <td>{req.currentHouseholdID}</td>
                  <td>{req.targetHouseholdID} <span style={{fontSize: "0.75rem", color: "#64748b"}}>({req.targetBranchID || "BR-001"})</span></td>
                  <td>
                    <span style={{
                      fontSize: "0.75rem",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      background: req.headApproval === "Approved" ? "#dcfce7" : req.headApproval === "Rejected" ? "#fee2e2" : "#f1f5f9",
                      color: req.headApproval === "Approved" ? "#166534" : req.headApproval === "Rejected" ? "#991b1b" : "#475569"
                    }}>
                    {req.headApproval || "N/A"}
                    </span>
                  </td>
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
              <tr><td colSpan={9} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>No household transfer requests found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", padding: "12px 16px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedTransfers.length)} of {sortedTransfers.length} entries
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="as-btn-ghost"
              style={{ 
                padding: "6px 12px", 
                fontSize: "0.85rem", 
                opacity: currentPage === 1 ? 0.5 : 1, 
                cursor: currentPage === 1 ? "not-allowed" : "pointer" 
              }}
            >
              Previous
            </button>
            <span style={{ display: "flex", alignItems: "center", fontSize: "0.85rem", fontWeight: 500, padding: "0 8px", color: "#374151" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="as-btn-ghost"
              style={{ 
                padding: "6px 12px", 
                fontSize: "0.85rem", 
                opacity: currentPage === totalPages ? 0.5 : 1, 
                cursor: currentPage === totalPages ? "not-allowed" : "pointer" 
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showModal && selectedRequest && (
        <div className="as-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="as-modal-content" style={{ maxWidth: "600px" }}>
            
            <div className="as-modal-header">
              <h2>Review Transfer Request</h2>
              <button className="as-modal-close" onClick={closeModal} disabled={isSaving}>&times;</button>
            </div>

            <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left", maxHeight: "70vh", overflowY: "auto" }}>
              <div className="admin-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                
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

                <div>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "2px" }}>Requester Name:</strong>
                  <span style={{ fontSize: "1.05rem", fontWeight: 500, color: "#111827" }}>{selectedRequest.requesterName}</span>
                </div>
                <div>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "2px" }}>Barangay UID:</strong>
                  <span style={{ color: "#0d7a55", fontWeight: "bold", letterSpacing: "0.5px" }}>{selectedRequest.UID || "—"}</span>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#64748b", fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Current Household:</strong>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{selectedRequest.currentHouseholdID}</span>
                </div>
                <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                  <strong style={{ color: "#3b82f6", fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Target Household & Branch:</strong>
                  <span style={{ fontWeight: 600, color: "#1d4ed8" }}>{selectedRequest.targetHouseholdID} ({selectedRequest.targetBranchID || "BR-001"})</span>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>Reason for Transfer:</strong>
                  <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem", color: "#374151" }}>
                    {selectedRequest.reason || "No reason provided."}
                  </div>
                </div>

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
                    disabled={isSaving || (selectedRequest.transferType === "existing" && selectedRequest.headApproval !== "Approved")}
                    title={selectedRequest.headApproval !== "Approved" ? "Target Household Head has not approved this transfer yet." : ""}
                    style={{
                      opacity: (selectedRequest.transferType === "existing" && selectedRequest.headApproval !== "Approved") ? 0.5 : 1,
                      cursor: (selectedRequest.transferType === "existing" && selectedRequest.headApproval !== "Approved") ? "not-allowed" : "pointer"
                    }}
                  >
                    {isSaving ? "Processing..." : "Approve Transfer"}
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