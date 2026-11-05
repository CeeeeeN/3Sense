import React, { useState, useEffect } from "react";
import { processHouseholdTransfer } from "../services/services";
import { useAlert } from "../context/AlertContext";
import { Search } from "lucide-react";

// NEW: Import Language Hook
import { useLanguage } from '../context/LanguageContext';

export default function NewHouseholdRequestsTab({ newHouseholds }) {
  const { showAlert, showConfirm } = useAlert(); 
  const { t } = useLanguage(); // NEW: Destructure hook

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State for search, status filtering, and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
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
    const isConfirmed = await showConfirm(
      t('admin_nh_confirm_title'),
      `${t('admin_nh_confirm_desc')} ${newStatus}?`
    );
    if (!isConfirmed) return;
    
    setIsSaving(true);
    try {
      // Processes the new household creation and migrates the resident
      await processHouseholdTransfer(id, newStatus, selectedRequest);
      
      // Update local modal state to reflect the change immediately
      setSelectedRequest(prev => ({ ...prev, status: newStatus }));

      await showAlert("Success", `${t('admin_nh_success_mark')} ${newStatus}.`);
    } catch (error) {
      console.error("Error updating status:", error);
      await showAlert("Error", error.message || t('admin_nh_err_update'));
    } finally {
      setIsSaving(false);
    }
  };

  // Filter logic
  const filteredHouseholds = newHouseholds.filter((req) => {
    const matchesStatus = statusFilter === "All" || req.status === statusFilter;
    
    if (!searchTerm) return matchesStatus;

    const searchLower = searchTerm.toLowerCase();
    const addressString = `${req.newHouseNumber || ""} ${req.newStreet || ""}`.toLowerCase();
    
    const matchesSearch = 
      (req.requesterName?.toLowerCase().includes(searchLower)) ||
      (req.UID?.toLowerCase().includes(searchLower)) ||
      (req.transferID?.toLowerCase().includes(searchLower)) ||
      (req.id?.toLowerCase().includes(searchLower)) ||
      (req.currentHouseholdID?.toLowerCase().includes(searchLower)) ||
      (addressString.includes(searchLower));

    return matchesStatus && matchesSearch;
  });

  // Sort logic
  const sortedHouseholds = [...filteredHouseholds].sort((a, b) => {
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
  const currentItems = sortedHouseholds.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedHouseholds.length / itemsPerPage);

  return (
    <>
      <div className="requests-controls">
        <div className="search-wrapper" style={{ position: "relative" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder={t('admin_nh_search_ph')}
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "36px" }}
          />
        </div>

        <div
          className="filter-group"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "12px",
            alignItems: "center",
            flexWrap: "nowrap"
          }}
        >
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">{t('admin_nh_filter_status')}</option>
            <option value="Pending">{t('admin_nh_filter_pending')}</option>
            <option value="Approved">{t('admin_nh_filter_approved')}</option>
            <option value="Rejected">{t('admin_nh_filter_rejected')}</option>
          </select>

          <select
            className="filter-select"
            value={sortFilter}
            onChange={(e) => setSortFilter(e.target.value)}
          >
            <option value="Date: Newest First">{t('admin_nh_sort_date_new')}</option>
            <option value="Date: Oldest First">{t('admin_nh_sort_date_old')}</option>
            <option value="Name: A to Z">{t('admin_nh_sort_name_asc')}</option>
            <option value="Name: Z to A">{t('admin_nh_sort_name_desc')}</option>
          </select>
        </div>
      </div>

      <div className="req-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table className="req-table" style={{ minWidth: "850px" }}>
          <thead>
            <tr style={{ textAlign: 'center' }}>
              <th>{t('admin_nh_th_date')}</th>
              <th>{t('admin_nh_th_req_id')}</th>
              <th>{t('admin_nh_th_req_name')}</th>
              <th>{t('admin_nh_th_uid')}</th>
              <th>{t('admin_nh_th_cur_hh')}</th>
              <th>{t('admin_nh_th_new_address')}</th>
              <th>{t('admin_nh_th_status')}</th>
              <th>{t('admin_nh_th_action')}</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((req) => (
                <tr 
                  key={req.id} 
                  onClick={() => handleReview(req)} 
                  style={{ cursor: "pointer", textAlign: "center" }}
                >
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
                      {(() => {
                        const st = (req.status || "Pending");
                        if (st === "Approved") return t('admin_nh_filter_approved');
                        if (st === "Rejected") return t('admin_nh_filter_rejected');
                        if (st === "Pending") return t('admin_nh_filter_pending');
                        return st;
                      })()}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-view" 
                      style={{ padding: '6px 12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReview(req);
                      }}
                    >
                      {t('admin_nh_btn_review')}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} style={{ textAlign: "center", color: '#6b7280', padding: "32px" }}>{t('admin_nh_empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", padding: "12px 16px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            {t('admin_nh_page_show')} {indexOfFirstItem + 1} {t('admin_nh_page_to')} {Math.min(indexOfLastItem, sortedHouseholds.length)} {t('admin_nh_page_of')} {sortedHouseholds.length} {t('admin_nh_page_entries')}
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
              {t('admin_nh_page_prev')}
            </button>
            <span style={{ display: "flex", alignItems: "center", fontSize: "0.85rem", fontWeight: 500, padding: "0 8px", color: "#374151" }}>
              {t('admin_nh_page')} {currentPage} {t('admin_nh_page_of')} {totalPages}
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
              {t('admin_nh_page_next')}
            </button>
          </div>
        </div>
      )}

      {/* ── NEW HOUSEHOLD REVIEW MODAL ── */}
      {showModal && selectedRequest && (
        <div className="as-modal-overlay" onClick={closeModal}>
          <div 
            className="as-modal-content" 
            style={{ maxWidth: "600px" }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="as-modal-header">
              <h2>{t('admin_nh_modal_title')}</h2>
              <button className="as-modal-close" onClick={closeModal} disabled={isSaving}>&times;</button>
            </div>

            <div className="as-modal-body" style={{ alignItems: "stretch", textAlign: "left", maxHeight: "70vh", overflowY: "auto" }}>
              <div className="admin-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                
                {/* Header Information */}
                <div style={{ gridColumn: '1 / -1', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>{t('admin_nh_modal_lbl_req_id')} {selectedRequest.transferID || selectedRequest.id}</span>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', display: 'inline-block', fontSize: '0.8rem', fontWeight: 600,
                      background: selectedRequest.status === 'Approved' ? '#dcfce7' : selectedRequest.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                      color: selectedRequest.status === 'Approved' ? '#166534' : selectedRequest.status === 'Rejected' ? '#991b1b' : '#92400e'
                    }}>
                      {(() => {
                        const st = (selectedRequest.status || "Pending");
                        if (st === "Approved") return t('admin_nh_filter_approved');
                        if (st === "Rejected") return t('admin_nh_filter_rejected');
                        if (st === "Pending") return t('admin_nh_filter_pending');
                        return st;
                      })()}
                    </span>
                  </div>
                  <strong style={{ display: "block", marginBottom: "4px" }}>{t('admin_nh_modal_lbl_date')}</strong>
                  <span>{selectedRequest.dateSubmitted}</span>
                </div>

                {/* Identity Information */}
                <div>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "2px" }}>{t('admin_nh_modal_lbl_req_name')}</strong>
                  <span style={{ fontSize: "1.05rem", fontWeight: 500, color: "#111827" }}>{selectedRequest.requesterName}</span>
                </div>
                <div>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "2px" }}>{t('admin_nh_modal_lbl_uid')}</strong>
                  <span style={{ color: "#0d7a55", fontWeight: "bold", letterSpacing: "0.5px" }}>{selectedRequest.UID || "—"}</span>
                </div>

                {/* Household Details */}
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#64748b", fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>{t('admin_nh_modal_lbl_cur_hh')}</strong>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>{selectedRequest.currentHouseholdID}</span>
                </div>
                <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                  <strong style={{ color: "#3b82f6", fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>{t('admin_nh_modal_lbl_tar_addr')}</strong>
                  <span style={{ fontWeight: 600, color: "#1d4ed8" }}>{selectedRequest.newHouseNumber} {selectedRequest.newStreet}</span>
                </div>

                {/* Reason */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>{t('admin_nh_modal_lbl_reason')}</strong>
                  <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "0.95rem", color: "#374151" }}>
                    {selectedRequest.reason || t('admin_nh_modal_no_reason')}
                  </div>
                </div>

                {/* Proof Document */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: "#6b7280", fontSize: "0.85rem", display: "block", marginBottom: "8px" }}>{t('admin_nh_modal_lbl_proof')}</strong>
                  {selectedRequest.proofURL ? (
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px", background: "#f9fafb", display: "inline-block" }}>
                      <a href={selectedRequest.proofURL} target="_blank" rel="noopener noreferrer" title="Click to view full size">
                        <img 
                          src={selectedRequest.proofURL} 
                          alt="Proof of Residency" 
                          style={{ maxWidth: "100%", maxHeight: "250px", objectFit: "contain", borderRadius: "4px", cursor: "pointer", display: "block" }} 
                        />
                      </a>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px", textAlign: "center" }}>{t('admin_nh_modal_proof_hint')}</div>
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.85rem", color: "#6b7280", background: "#f3f4f6", padding: "6px 12px", borderRadius: "6px" }}>
                      📄 {selectedRequest.proofFileName || t('admin_nh_modal_no_proof')}
                    </span>
                  )}
                </div>
                
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            {selectedRequest.status === "Pending" && (
                  <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    <button 
                      className="reject-btn" 
                      onClick={() => handleUpdateStatus(selectedRequest.id, "Rejected")}
                      disabled={isSaving}
                    >
                      {isSaving ? t('admin_nh_modal_btn_processing') : t('admin_nh_modal_btn_reject')}
                    </button>
                    <button 
                      className="approve-btn" 
                      onClick={() => handleUpdateStatus(selectedRequest.id, "Approved")}
                      disabled={isSaving}
                    >
                      {isSaving ? t('admin_nh_modal_btn_creating') : t('admin_nh_modal_btn_approve')}
                    </button>
                  </div>
                )}
              </div>
            </div>
        </div>
      )}
    </>
  );
}