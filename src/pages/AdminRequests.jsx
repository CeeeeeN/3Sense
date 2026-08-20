import React, { useState, useEffect } from 'react';
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { Search, Eye, CheckCircle, XCircle, X, Calendar, FileText, User, Info, Clock } from 'lucide-react';
import { auth, db } from '../firebase/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";
import { createUserNotification } from '../services/userNotifications';
import { logTransaction } from '../services/logger';
import { formatDisplayEmail } from '../utils/maskEmail';
import { getFamilyNumber } from '../utils/householdNumbers';

const getSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback; }
  catch { return fallback; }
};

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // For logging purposes
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('Facility'); // 'Facility', 'Document', or 'Equipment'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // --- FIREBASE HELPER FUNCTIONS ---
  const formatTime = (time24) => {
    if (!time24) return 'N/A';
    const [h, m] = time24.split(':');
    if (!h || !m) return time24;
    const hh = parseInt(h, 10);
    const suffix = hh >= 12 ? 'PM' : 'AM';
    let h12 = hh % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${m} ${suffix}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // If it's a string like YYYY-MM-DD
    if (typeof timestamp === 'string' && timestamp.includes('-')) {
      const d = new Date(timestamp);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return String(timestamp);
  };

  const formatName = (firstName, middleName, lastName) => {
    const mName = middleName ? `${middleName} ` : '';
    return `${firstName || ''} ${mName}${lastName || ''}`.trim() || 'Unknown Resident';
  };
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, "approvedAdmins"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setAdminName(data.fullName || "Admin");
          setAdminRole(data.role || "Standard Admin");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Run listeners in parallel to prevent memory leaks
    let docList = [];
    let facList = [];
    let eqList = [];

    const updateCombined = () => {
      const combined = [...docList, ...facList, ...eqList].sort((a, b) => {
        const dateA = a.rawDate?.toDate ? a.rawDate.toDate().getTime() : (a.rawDate ? new Date(a.rawDate).getTime() : 0);
        const dateB = b.rawDate?.toDate ? b.rawDate.toDate().getTime() : (b.rawDate ? new Date(b.rawDate).getTime() : 0);
        return dateB - dateA;
      });
      setRequests(combined);
      setLoading(false);
    };

    const unsubDocs = onSnapshot(collection(db, 'document_requests'), (snapshot) => {
      docList = snapshot.docs.map(doc => {
        const data = doc.data();
        let rawDate = data.submittedAt || data.dateRequested || data.createdAt || null;
        const sanitizedEmail = formatDisplayEmail(data.email, adminRole);
        return {
          docId: doc.id,
          collectionName: 'document_requests',
          id: data.requestID || data.refNum || doc.id.substring(0, 8).toUpperCase(),
          residentName: data.fullName || data.residentName || formatName(data.firstName, data.middleName, data.lastName),
          contact: sanitizedEmail,
          category: 'Document',
          type: data.documentType || 'Unknown Document',
          purpose: data.purpose || 'No purpose stated',
          dateRequested: formatDate(rawDate),
          rawDate: rawDate,
          dateNeeded: formatDate(data.dateNeeded),
          status: data.status || 'Pending',
          allData: { ...data, email: sanitizedEmail }
        };
      });
      updateCombined();
    });

    const unsubFacs = onSnapshot(collection(db, 'facility_reservations'), (snapshot) => {
      facList = snapshot.docs.map(doc => {
        const data = doc.data();
        const time = data.timeSlot ? ` (${data.timeSlot})` : '';
        let rawDate = data.submittedAt || data.dateRequested || data.createdAt || null;
        const sanitizedEmail = formatDisplayEmail(data.email, adminRole);
        return {
          docId: doc.id,
          collectionName: 'facility_reservations',
          id: data.reservationID || data.refNum || doc.id.substring(0, 8).toUpperCase(),
          residentName: data.requesterName || data.fullName || 'Unknown Resident',
          contact: sanitizedEmail,
          category: 'Facility',
          type: data.facilityName || data.facility || 'Unknown Facility',
          purpose: data.purpose || 'No purpose stated',
          dateRequested: formatDate(rawDate),
          rawDate: rawDate,
          dateNeeded: data.date ? `${formatDate(data.date)} (${formatTime(data.startTime)} - ${formatTime(data.endTime)})` : (formatDate(data.reservationDate) + time),
          status: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase() : 'Pending',
          allData: { ...data, email: sanitizedEmail }
        };
      });
      updateCombined();
    });

    const unsubEqs = onSnapshot(collection(db, 'equipment_rentals'), (snapshot) => {
      eqList = snapshot.docs.map(doc => {
        const data = doc.data();
        let rawDate = data.submittedAt || data.createdAt || null;
        const sanitizedEmail = formatDisplayEmail(data.email, adminRole);
        return {
          docId: doc.id,
          collectionName: 'equipment_rentals',
          id: data.rentalID || data.refNum || doc.id.substring(0, 8).toUpperCase(),
          residentName: data.fullName || 'Unknown Resident',
          contact: sanitizedEmail,
          category: 'Equipment',
          type: data.equipmentName || 'Unknown Equipment',
          purpose: data.purpose || 'No purpose stated',
          dateRequested: formatDate(rawDate),
          rawDate: rawDate,
          dateNeeded: `Pick-up: ${formatDate(data.pickUpDate)}`,
          status: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase() : 'Pending',
          allData: { ...data, email: sanitizedEmail }
        };
      });
      updateCombined();
    });

    return () => {
      unsubDocs();
      unsubFacs();
      unsubEqs();
    };
  }, [adminRole]);

  // --- FILTERING LOGIC ---
  const filteredRequests = requests.filter(req => {
    const matchesTab = req.category === activeTab;
    const safeSearchTerm = String(searchTerm || "").toLowerCase();
    const safeResidentName = String(req.residentName || "").toLowerCase();
    const safeType = String(req.type || "").toLowerCase();
    const safeId = String(req.id || "").toLowerCase();
    const safeStatus = String(req.status || "").toLowerCase();

    const matchesSearch = 
      safeResidentName.includes(safeSearchTerm) ||
      safeType.includes(safeSearchTerm) ||
      safeId.includes(safeSearchTerm);
      
    const matchesStatus = filterStatus === 'All' || safeStatus === filterStatus.toLowerCase();
    
    return matchesTab && matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setFilterStatus('All');
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages.map((page, index) => (
      <button
        key={index}
        className={`af-page-btn ${currentPage === page ? "active" : ""}`}
        onClick={() => typeof page === 'number' ? setCurrentPage(page) : null}
        disabled={typeof page !== 'number'}
        style={{ 
          cursor: typeof page === 'number' ? 'pointer' : 'default', 
          border: typeof page !== 'number' ? 'none' : '',
          background: typeof page !== 'number' ? 'transparent' : ''
        }}
      >
        {page}
      </button>
    ));
  };

  const openViewModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setIsRejectModalOpen(true);
    setRejectReason('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsRejectModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApprove = async (req) => {
    const target = req || selectedRequest;
    if (!target) return;

    // Optional: Overlap check for Facility Reservations
    if (target.category === 'Facility') {
      const hasOverlap = requests.some(r => {
        if (r.category !== 'Facility' || r.docId === target.docId || String(r.status || "").toLowerCase() !== 'approved') return false;
        const targetData = target.allData;
        const rData = r.allData;
        if (String(rData.facilityId) !== String(targetData.facilityId)) return false;
        if (rData.date !== targetData.date) return false;
        return targetData.startTime < rData.endTime && rData.startTime < targetData.endTime;
      });

      if (hasOverlap) {
        alert("Cannot approve: The selected time slot conflicts with an existing approved reservation.");
        return;
      }
    }

    try {
      const requestRef = doc(db, target.collectionName, target.docId);
      await updateDoc(requestRef, { 
        status: 'Approved',
        processedBy: adminName,
        processedRole: adminRole,
        processedAt: new Date()
      });

      logTransaction(adminName, adminRole, "APPROVED_REQUEST", `Approved ${target.category} request (Ref: ${target.docId}) for ${target.residentName}`);

      const residentID = target.allData?.residentID || target.allData?.userID || "";
      const hhID       = target.allData?.householdID || "";
      const refNum     = target.id || "";
      
      if (residentID && hhID) {
        const label = target.type;
        // Dynamically select the correct notification type based on category
        let notifType = 'document_update';
        if (target.category === 'Facility') notifType = 'facility_update';
        if (target.category === 'Equipment') notifType = 'equipment_update';

        await createUserNotification(
          hhID, residentID,
          `${target.category} Request Approved`,
          `Your request for "${label}" has been approved.`,
          notifType, refNum
        );
      }

      alert("Request Approved Successfully!");
      closeModal();
    } catch (error) {
      console.error("Error approving request: ", error);
      alert("Failed to approve request.");
    }
  };

  const handleReadyForPickup = async (req) => {
    const target = req || selectedRequest;
    if (!target) return;
    try {
      const requestRef = doc(db, target.collectionName, target.docId);
      await updateDoc(requestRef, { 
        status: 'Ready for Pickup',
        processedBy: adminName,
        processedRole: adminRole,
        processedAt: new Date()
      });

      logTransaction(adminName, adminRole, "READY_FOR_PICKUP", `Marked ${target.category} request (Ref: ${target.docId}) as ready for pickup for ${target.residentName}`);

      const residentID = target.allData?.residentID || target.allData?.userID || "";
      const hhID       = target.allData?.householdID || "";
      const refNum     = target.id || "";
      
      if (residentID && hhID) {
        const notifType = target.category === 'Equipment' ? 'equipment_update' : 'document_update';
        await createUserNotification(
          hhID, residentID,
          `${target.category} Ready for Pickup`,
          `Your ${target.category.toLowerCase()} "${target.type}" is now ready for pickup at the Barangay Hall.`,
          notifType, refNum
        );
      }

      alert("Request Marked as Ready for Pickup.");
      closeModal();
    } catch (error) {
      console.error("Error updating request: ", error);
      alert("Failed to update request.");
    }
  };

  const handleClaimed = async (req) => {
    const target = req || selectedRequest;
    if (!target) return;
    try {
      const requestRef = doc(db, target.collectionName, target.docId);
      await updateDoc(requestRef, { 
        status: 'Claimed',
        processedBy: adminName,
        processedRole: adminRole,
        processedAt: new Date()
      });

      if (target.category === 'Equipment') {
        const eqId = target.allData?.equipmentID;
        const requestedQty = Number(target.allData?.quantity || 0);
        
        if (eqId && requestedQty > 0) {
          const eqRef = doc(db, 'equipment', eqId);
          // Use a negative increment to subtract the quantity
          await updateDoc(eqRef, {
            quantity: increment(-requestedQty)
          });
        }
      }

      logTransaction(adminName, adminRole, "CLAIMED_REQUEST", `Marked ${target.category} request (Ref: ${target.docId}) as claimed for ${target.residentName}`);

      const residentID = target.allData?.residentID || target.allData?.userID || "";
      const hhID       = target.allData?.householdID || "";
      const refNum     = target.id || "";
      
      if (residentID && hhID) {
        const notifType = target.category === 'Equipment' ? 'equipment_update' : 'document_update';
        await createUserNotification(
          hhID, residentID,
          `${target.category} Claimed`,
          `Your ${target.category.toLowerCase()} "${target.type}" has been marked as claimed. Thank you!`,
          notifType, refNum
        );
      }

      alert("Request Marked as Claimed.");
      closeModal();
    } catch (error) {
      console.error("Error updating request: ", error);
      alert("Failed to update request.");
    }
  };

  const handleReturned = async (req) => {
    const target = req || selectedRequest;
    if (!target) return;
    try {
      const requestRef = doc(db, target.collectionName, target.docId);
      await updateDoc(requestRef, { 
        status: 'Returned',
        returnedProcessedBy: adminName,
        returnedProcessedRole: adminRole,
        returnedAt: new Date()
      });

      if (target.category === 'Equipment') {
        const eqId = target.allData?.equipmentID;
        const requestedQty = Number(target.allData?.quantity || 0);
        
        if (eqId && requestedQty > 0) {
          const eqRef = doc(db, 'equipment', eqId);
          // Use a positive increment to restore the quantity
          await updateDoc(eqRef, {
            quantity: increment(requestedQty)
          });
        }
      }

      logTransaction(adminName, adminRole, "RETURNED_EQUIPMENT", `Marked ${target.category} request (Ref: ${target.docId}) as returned for ${target.residentName}`);

      const residentID = target.allData?.residentID || target.allData?.userID || "";
      const hhID       = target.allData?.householdID || "";
      const refNum     = target.id || "";
      
      if (residentID && hhID) {
        await createUserNotification(
          hhID, residentID,
          `${target.category} Returned`,
          `Your ${target.category.toLowerCase()} "${target.type}" has been successfully returned and logged by the admin. Thank you!`,
          'equipment_update', refNum
        );
      }

      alert("Equipment Marked as Returned.");
      closeModal();
    } catch (error) {
      console.error("Error updating request: ", error);
      alert("Failed to update request.");
    }
  };

  const handleConfirmReject = async () => {
    if (rejectReason.trim() === '') {
      alert("Please provide a reason for rejection.");
      return;
    }

    try {
      const requestRef = doc(db, selectedRequest.collectionName, selectedRequest.docId);
      await updateDoc(requestRef, {
        status: 'Rejected',
        rejectionReason: rejectReason,
        processedBy: adminName,
        processedRole: adminRole,
        processedAt: new Date()
      });

      logTransaction(adminName, adminRole, "REJECT_REQUEST", `Rejected ${selectedRequest.category} request (Ref: ${selectedRequest.docId}) for ${selectedRequest.residentName}`);

      const residentID = selectedRequest.allData?.residentID || selectedRequest.allData?.userID || "";
      const hhID       = selectedRequest.allData?.householdID || "";
      const refNum     = selectedRequest.id || "";
      
      if (residentID && hhID) {
        const label = selectedRequest.type || 'Request';
        let notifType = 'document_update';
        if (selectedRequest.category === 'Facility') notifType = 'facility_update';
        if (selectedRequest.category === 'Equipment') notifType = 'equipment_update';

        await createUserNotification(
          hhID, residentID,
          `${selectedRequest.category} Request Rejected`,
          `Your request for "${label}" has been rejected. Reason: ${rejectReason}`,
          notifType, refNum
        );
      }

      alert("Request Rejected.");
      closeModal();
    } catch (error) {
      console.error("Error rejecting request: ", error);
      alert("Failed to reject request.");
    }
  };

  return (
    <AdminLayout>
      <div className="requests-container">

        <div className="requests-header">
          <h1 className="requests-title">Requests Management</h1>
          <p className="requests-subtitle">Efficiently manage and respond to resident applications, reservations, and rentals.</p>
        </div>

        {/* TABS */}
        <div className="req-tabs">
          <button
            className={`req-tab ${activeTab === 'Facility' ? 'active' : ''}`}
            onClick={() => setActiveTab('Facility')}
          >
            Facility Requests
          </button>
          <button
            className={`req-tab ${activeTab === 'Document' ? 'active' : ''}`}
            onClick={() => setActiveTab('Document')}
          >
            Document Requests
          </button>
          <button
            className={`req-tab ${activeTab === 'Equipment' ? 'active' : ''}`}
            onClick={() => setActiveTab('Equipment')}
          >
            Equipment Rentals
          </button>
        </div>

        {/* FILTERS */}
        <div className="requests-controls">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder={`Search by Name, ${activeTab} or Ref #...`}
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              {/* Document and Equipment specific statuses */}
              {(activeTab === 'Document' || activeTab === 'Equipment') && (
                <>
                  <option value="Ready for Pickup">Ready for Pickup</option>
                  <option value="Claimed">Claimed</option>
                </>
              )}
              {activeTab === 'Equipment' && (
                <option value="Returned">Returned</option>
              )}
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="req-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div className="empty-state">
              <Clock className="animate-spin mb-2" size={32} />
              <h3>Loading requests...</h3>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="empty-state">
              <Info className="empty-state-icon" size={48} />
              <h3>No {activeTab.toLowerCase()} requests found</h3>
              <p>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <table className="req-table" style={{ minWidth: '850px' }}>
              <thead>
                <tr>
                  <th>Ref Number</th>
                  <th>Requester</th>
                  <th>Type</th>
                  <th>{activeTab === 'Equipment' ? 'Pick-up / Date Needed' : 'Scheduled Date'}</th>
                  <th>Date Submitted</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRequests.map((req) => (
                  <tr key={req.docId} onClick={() => openViewModal(req)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {String(req.id).toUpperCase()}
                    </td>
                    <td>
                      <div className="req-res-info">
                        <span className="req-res-name">{req.residentName}</span>
                        <span className="req-res-email">{formatDisplayEmail(req.contact, adminRole)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="req-type-badge">{req.type}</span>
                    </td>
                    <td>
                      <div className="req-date-cell">
                        <strong>{activeTab === 'Document' ? req.dateRequested : req.dateNeeded}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="req-date-cell">{req.dateRequested}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${String(req.status || "pending").toLowerCase()}`}>
                        {String(req.status || "Pending").charAt(0).toUpperCase() + String(req.status || "Pending").slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="req-actions" style={{ justifyContent: 'flex-end' }}>
                        {String(req.status || "").toLowerCase() === 'pending' && (
                          <>
                            <button className="btn-approve" title="Approve" onClick={(e) => { e.stopPropagation(); handleApprove(req); }}>
                              <CheckCircle size={16} /> Approve
                            </button>
                            <button className="btn-reject" title="Reject" onClick={(e) => { e.stopPropagation(); openRejectModal(req); }}>
                              <XCircle size={16} /> Reject
                            </button>
                          </>
                        )}
                        {String(req.status || "").toLowerCase() === 'approved' && (req.category === 'Document' || req.category === 'Equipment') && (
                          <button className="btn-approve" title="Ready for Pickup" onClick={(e) => { e.stopPropagation(); handleReadyForPickup(req); }}>
                            <CheckCircle size={16} /> Mark Ready
                          </button>
                        )}
                        {String(req.status || "").toLowerCase() === 'ready for pickup' && (req.category === 'Document' || req.category === 'Equipment') && (
                          <button className="btn-approve" title="Claimed" onClick={(e) => { e.stopPropagation(); handleClaimed(req); }}>
                            <CheckCircle size={16} /> Mark Claimed
                          </button>
                        )}
                        {String(req.status || "").toLowerCase() === 'claimed' && req.category === 'Equipment' && (
                          <button className="btn-approve" title="Returned" onClick={(e) => { e.stopPropagation(); handleReturned(req); }}>
                            <CheckCircle size={16} /> Mark Returned
                          </button>
                        )}
                        <button className="btn-view" title="View Details" onClick={(e) => { e.stopPropagation(); openViewModal(req); }}>
                          <Eye size={16} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filteredRequests.length > 0 && totalPages > 1 && (
          <div className="af-pagination" style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' }}>
            <button 
              className="af-page-btn" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            {renderPageNumbers()}
            <button 
              className="af-page-btn" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        )}

        {/* VIEW DETAILS MODAL */}
        {isModalOpen && selectedRequest && (
          <div className="as-modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="as-modal-header">
                <h2>{activeTab === 'Facility' ? 'Reservation' : activeTab === 'Equipment' ? 'Rental' : 'Request'} Details</h2>
                <button className="as-modal-close" onClick={closeModal}><X size={22} /></button>
              </div>

              <div className="modal-body">
                {/* Section 1: Information */}
                <div className="modal-section">
                  <h3 className="section-title" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#334155' }}>
                    Section 1: {activeTab === 'Facility' ? 'Reservation' : activeTab === 'Equipment' ? 'Equipment' : 'Document'} Information
                  </h3>
                  <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div className="detail-item">
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Reference Number</label>
                      <p className="detail-value" style={{ fontWeight: 600, letterSpacing: '1px' }}>{String(selectedRequest.id || "").toUpperCase()}</p>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Household Number</label>
                      <p className="detail-value" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedRequest.allData?.householdID || 'N/A'}</p>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Family Number</label>
                      <p className="detail-value" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {selectedRequest.allData?.householdID
                          ? getFamilyNumber(selectedRequest.allData.householdID, selectedRequest.allData?.branchID || "BR-001")
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>
                        {activeTab === 'Facility' ? 'Facility' : activeTab === 'Equipment' ? 'Equipment Item' : 'Document Type'}
                      </label>
                      <p className="detail-value" style={{ fontWeight: 500 }}>{selectedRequest.type}</p>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Date Submitted</label>
                      <p className="detail-value">{selectedRequest.dateRequested}</p>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Status</label>
                      <div className="detail-value badge">
                        <span className={`status-badge ${String(selectedRequest.status || "").toLowerCase()}`}>
                          {selectedRequest.status || "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Request Details */}
                <div className="modal-section" style={{ marginTop: '1.5rem' }}>
                  <h3 className="section-title" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#334155' }}>
                    Section 2: {activeTab === 'Document' ? 'Personal Information' : 'Request Details'}
                  </h3>
                  <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>

                    {/* Facility Specific Layout */}
                    {activeTab === 'Facility' && (
                      <>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Full Name</label>
                          <p className="detail-value">{selectedRequest.allData?.requesterName || selectedRequest.allData?.fullName || selectedRequest.residentName || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Contact Number</label>
                          <p className="detail-value">{selectedRequest.allData?.contactNumber || selectedRequest.allData?.contact || selectedRequest.contact || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Email Address</label>
                          <p className="detail-value">{formatDisplayEmail(selectedRequest.allData?.email, adminRole)}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Reservation Date</label>
                          <p className="detail-value">{formatDate(selectedRequest.allData?.date) || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Estimated Pax</label>
                          <p className="detail-value">{selectedRequest.allData?.attendees || selectedRequest.allData?.paxCount || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Start Time</label>
                          <p className="detail-value">{formatTime(selectedRequest.allData?.startTime)}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>End Time</label>
                          <p className="detail-value">{formatTime(selectedRequest.allData?.endTime)}</p>
                        </div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Purpose</label>
                          <p className="detail-value">{selectedRequest.purpose || 'N/A'}</p>
                        </div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Additional Notes</label>
                          <p className="detail-value">{selectedRequest.allData?.notes || 'None'}</p>
                        </div>
                      </>
                    )}

                    {/* Equipment Specific Layout */}
                    {activeTab === 'Equipment' && (
                      <>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Full Name</label>
                          <p className="detail-value">{selectedRequest.allData?.fullName || selectedRequest.residentName || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Contact Number</label>
                          <p className="detail-value">{selectedRequest.allData?.contactNumber || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Email Address</label>
                          <p className="detail-value">{formatDisplayEmail(selectedRequest.allData?.email, adminRole)}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Pick-up Date</label>
                          <p className="detail-value">{formatDate(selectedRequest.allData?.pickUpDate) || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Return Date</label>
                          <p className="detail-value">{formatDate(selectedRequest.allData?.returnDate) || 'N/A'}</p>
                        </div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Quantity Requested</label>
                          <p className="detail-value" style={{ fontWeight: 600 }}>{selectedRequest.allData?.quantity || 'N/A'} units</p>
                        </div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Purpose</label>
                          <p className="detail-value">{selectedRequest.purpose || 'N/A'}</p>
                        </div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Additional Notes</label>
                          <p className="detail-value">{selectedRequest.allData?.notes || 'None'}</p>
                        </div>
                      </>
                    )}

                    {/* Document Specific Layout */}
                    {activeTab === 'Document' && (
                      <>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>First Name</label>
                          <p className="detail-value">{selectedRequest.allData?.firstName || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Middle Name</label>
                          <p className="detail-value">{selectedRequest.allData?.middleName || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Last Name</label>
                          <p className="detail-value">{selectedRequest.allData?.lastName || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Date of Birth</label>
                          <p className="detail-value">{selectedRequest.allData?.dob || selectedRequest.allData?.birthDate || selectedRequest.allData?.dateOfBirth || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Civil Status</label>
                          <p className="detail-value">{selectedRequest.allData?.civilStatus || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Contact Number</label>
                          <p className="detail-value">{selectedRequest.allData?.contactNumber || selectedRequest.allData?.contact || selectedRequest.contact || 'N/A'}</p>
                        </div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Complete Address</label>
                          <p className="detail-value">{selectedRequest.allData?.address || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Email Address</label>
                          <p className="detail-value">{formatDisplayEmail(selectedRequest.allData?.email, adminRole)}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Residing Since (Year)</label>
                          <p className="detail-value">{selectedRequest.allData?.residingSince || 'N/A'}</p>
                        </div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Purpose</label>
                          <p className="detail-value">{selectedRequest.purpose || 'N/A'}</p>
                        </div>
                        {selectedRequest.allData?.validIdUrl && (
                          <div style={{ marginTop: '16px', gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Attached Valid ID Verification</label>
                            <div style={{ marginTop: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', background: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
                              <a href={selectedRequest.allData.validIdUrl} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={selectedRequest.allData.validIdUrl} 
                                  alt="Resident Valid ID" 
                                  style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '4px' }} 
                                />
                              </a>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', textAlign: 'center' }}>Click to view full size</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Section 3: Additional Details (Dynamic) */}
                <div className="modal-section" style={{ marginTop: '1.5rem' }}>
                  <h3 className="section-title" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#334155' }}>Section 3: Additional Specific Requirements</h3>
                  <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    {/* Dynamic Fields Mapping */}
                    {selectedRequest.allData?.customFields && Object.entries(selectedRequest.allData.customFields)
                      .filter(([key, value]) => typeof value !== 'object' && value !== '')
                      .map(([key, value]) => (
                        <div className="detail-item" key={key}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                          <p className="detail-value">{String(value)}</p>
                        </div>
                      ))}

                    {(!selectedRequest.allData?.customFields || Object.entries(selectedRequest.allData.customFields)
                      .filter(([key, value]) => typeof value !== 'object' && value !== '').length === 0) && (
                        <p style={{ gridColumn: 'span 2', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No additional requirements answered for this request.</p>
                      )}

                    {String(selectedRequest.status || "").toLowerCase() === 'rejected' && selectedRequest.allData?.rejectionReason && (
                      <div className="detail-item" style={{ gridColumn: 'span 2', marginTop: '1rem', background: '#fff1f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                        <label style={{ display: 'block', color: '#e11d48', fontWeight: 700, marginBottom: '0.3rem' }}>Admin Remarks / Rejection Reason</label>
                        <p className="detail-value" style={{ color: '#be123c', fontWeight: 400 }}>{selectedRequest.allData.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button className="btn-view" onClick={closeModal}>Close</button>
                {String(selectedRequest.status || "").toLowerCase() === 'pending' && (
                  <>
                    <button className="btn-reject" onClick={() => openRejectModal(selectedRequest)}>
                      <XCircle size={16} /> Reject
                    </button>
                    <button className="btn-approve" onClick={() => handleApprove()}>
                      <CheckCircle size={16} /> Approve
                    </button>
                  </>
                )}
                {String(selectedRequest.status || "").toLowerCase() === 'approved' && (selectedRequest.category === 'Document' || selectedRequest.category === 'Equipment') && (
                  <button className="btn-approve" onClick={() => handleReadyForPickup()}>
                    <CheckCircle size={16} /> Mark Ready for Pickup
                  </button>
                )}
                {String(selectedRequest.status || "").toLowerCase() === 'ready for pickup' && (selectedRequest.category === 'Document' || selectedRequest.category === 'Equipment') && (
                  <button className="btn-approve" onClick={() => handleClaimed()}>
                    <CheckCircle size={16} /> Mark Claimed
                  </button>
                )}
                {String(selectedRequest.status || "").toLowerCase() === 'claimed' && selectedRequest.category === 'Equipment' && (
                  <button className="btn-approve" onClick={() => handleReturned()}>
                    <CheckCircle size={16} /> Mark Returned
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REJECT REMARKS MODAL */}
        {isRejectModalOpen && selectedRequest && (
          <div className="as-modal-overlay" onClick={closeModal}>
            <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
              <div className="as-modal-header">
                <h2>Confirm Rejection</h2>
                <button className="as-modal-close" onClick={closeModal}><X size={22} /></button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem', color: '#64748b', lineHeight: '1.6' }}>
                  Please providing a clear reason for rejecting the request from <strong>{selectedRequest.residentName}</strong>.
                  This info will be visible to the resident.
                </p>
                <div className="detail-item">
                  <label>Remarks / Reason for Rejection</label>
                  <textarea
                    rows="4"
                    placeholder="E.g., Incomplete documentation, Missing field information, Under maintenance..."
                    style={{
                      width: '100%', padding: '1rem', borderRadius: '8px',
                      border: '1.5px solid #e2e8f0', fontFamily: 'inherit',
                      fontSize: '0.9rem', marginTop: '0.5rem', resize: 'none', outline: 'none'
                    }}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    autoFocus
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-view" onClick={closeModal}>Cancel</button>
                <button
                  className="btn-reject"
                  onClick={handleConfirmReject}
                  style={{ background: '#ef4444', color: 'white', border: 'none' }}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}