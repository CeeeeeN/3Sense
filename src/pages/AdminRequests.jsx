import React, { useState, useEffect } from 'react';
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { Search, Eye, CheckCircle, XCircle, X, Calendar, FileText, User, Info, Clock } from 'lucide-react';
import { auth, db } from '../firebase/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";
import { createUserNotification } from '../services/userNotifications';
import { logTransaction } from '../services/logger';

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
  const [activeTab, setActiveTab] = useState('Facility'); // 'Facility' or 'Document'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

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
      // Listen for the currently logged-in user
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Find their document in the approvedAdmins collection
          const q = query(
            collection(db, "approvedAdmins"), 
            where("uid", "==", user.uid)
          );
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

  // --- REAL-TIME FIREBASE FETCH ---
  useEffect(() => {
    const unsubscribeDocs = onSnapshot(collection(db, 'document_requests'), (snapshot) => {
      const docData = snapshot.docs.map(doc => {
        const data = doc.data();
        let rawDate = data.submittedAt || data.dateRequested || null;
        return {
          docId: doc.id,
          collectionName: 'document_requests',
          id: data.refNum || data.referenceNumber || doc.id.substring(0, 8).toUpperCase(),
          residentName: data.fullName || data.residentName || formatName(data.firstName, data.middleName, data.lastName),
          contact: data.email || 'No email provided',
          category: 'Document',
          type: data.documentType || 'Unknown Document',
          purpose: data.purpose || 'No purpose stated',
          dateRequested: formatDate(rawDate),
          rawDate: rawDate,
          dateNeeded: formatDate(data.dateNeeded),
          status: data.status || 'Pending',
          allData: data 
        };
      });

      const unsubscribeFacilities = onSnapshot(collection(db, 'facility_reservations'), (facSnapshot) => {
        const facData = facSnapshot.docs.map(doc => {
          const data = doc.data();
          const time = data.timeSlot ? ` (${data.timeSlot})` : '';
          let rawDate = data.submittedAt || data.dateRequested || null;
          return {
            docId: doc.id,
            collectionName: 'facility_reservations',
            id: data.refNum || data.referenceNumber || doc.id.substring(0, 8).toUpperCase(),
            residentName: data.requesterName || 'Unknown Resident',
            contact: data.email || 'No email provided',
            category: 'Facility',
            type: data.facilityName || data.facility || 'Unknown Facility',
            purpose: data.purpose || 'No purpose stated',
            dateRequested: formatDate(rawDate),
            rawDate: rawDate,
            dateNeeded: data.date ? `${data.date} (${formatTime(data.startTime)} - ${formatTime(data.endTime)})` : (formatDate(data.reservationDate) + time),
            status: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase() : 'Pending',
            allData: data
          };
        });

        const combined = [...docData, ...facData].sort((a, b) => {
          const dateA = a.rawDate?.toDate ? a.rawDate.toDate().getTime() : (a.rawDate ? new Date(a.rawDate).getTime() : 0);
          const dateB = b.rawDate?.toDate ? b.rawDate.toDate().getTime() : (b.rawDate ? new Date(b.rawDate).getTime() : 0);
          return dateB - dateA;
        });
        setRequests(combined);
        setLoading(false);
      });

      return () => unsubscribeFacilities();
    });

    return () => unsubscribeDocs();
  }, []);

  // --- FILTERING LOGIC (FIXED) ---
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

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

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

    // Check for overlap before approving Facility Reservations
    if (target.category === 'Facility') {
      const hasOverlap = requests.some(r => {
        if (r.category !== 'Facility') return false;
        if (r.docId === target.docId) return false;
        if (String(r.status || "").toLowerCase() !== 'approved') return false;

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
        processedAt: new Date()});

      logTransaction(
        adminName,
        adminRole,
        "APPROVED_REQUEST",
        `Approved ${target.category} request (Ref: ${target.docId}) for ${target.residentName}`
      );

      // Notify the resident
      const memberID = target.allData?.userID || "";
      const refNum = target.id || "";
      if (memberID) {
        const label = target.category === 'Document' ? target.type : target.type;
        await createUserNotification(
          memberID,
          `${target.category} Request Approved`,
          `Your request for "${label}" has been approved.`,
          target.category === 'Document' ? 'document_update' : 'facility_update',
          refNum
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

      logTransaction(
        adminName,
        adminRole,
        "READY_FOR_PICKUP",
        `Marked ${target.category} request (Ref: ${target.docId}) as ready for pickup for ${target.residentName}`
      );

      const memberID = target.allData?.userID || "";
      const refNum = target.id || "";
      if (memberID) {
        await createUserNotification(
          memberID,
          "Document Ready for Pickup",
          `Your document "${target.type}" is now ready for pickup at the Barangay Hall.`,
          'document_update',
          refNum
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

      logTransaction(
        adminName,
        adminRole,
        "CLAIMED_REQUEST",
        `Marked ${target.category} request (Ref: ${target.docId}) as claimed for ${target.residentName}`
      );

      const memberID = target.allData?.userID || "";
      const refNum = target.id || "";
      if (memberID) {
        await createUserNotification(
          memberID,
          "Document Claimed",
          `Your document "${target.type}" has been marked as claimed. Thank you!`,
          'document_update',
          refNum
        );
      }

      alert("Request Marked as Claimed.");
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

      logTransaction(
        adminName,
        adminRole,
        "REJECT_REQUEST",
        `Rejected ${target.category} request (Ref: ${target.docId}) for ${target.residentName}`
      );

      const memberID = selectedRequest.allData?.userID || "";
      const refNum = selectedRequest.id || "";
      if (memberID) {
        const label = selectedRequest.type || 'Request';
        await createUserNotification(
          memberID,
          `${selectedRequest.category} Request Rejected`,
          `Your request for "${label}" has been rejected. Reason: ${rejectReason}`,
          selectedRequest.category === 'Document' ? 'document_update' : 'facility_update',
          refNum
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
          <p className="requests-subtitle">Efficiently manage and respond to resident applications and reservations.</p>
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
        </div>

        {/* FILTERS */}
        <div className="requests-controls">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder={`Search by Name, ${activeTab === 'Facility' ? 'Facility' : 'Document'} or Ref #...`}
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
              {activeTab === 'Document' && (
                <>
                  <option value="Ready for Pickup">Ready for Pickup</option>
                  <option value="Claimed">Claimed</option>
                </>
              )}
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="req-table-wrapper">
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
            <table className="req-table">
              <thead>
                <tr>
                  <th>Ref Number</th>
                  <th>Requester</th>
                  <th>Type</th>
                  <th>Scheduled Date</th>
                  <th>Date Submitted</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
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
                        <span className="req-res-email">{req.contact}</span>
                      </div>
                    </td>
                    <td>
                      <span className="req-type-badge">{req.type}</span>
                    </td>
                    <td>
                      <div className="req-date-cell">
                        <strong>{activeTab === 'Facility' ? req.dateNeeded : req.dateRequested}</strong>
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
                        {String(req.status || "").toLowerCase() === 'approved' && req.category === 'Document' && (
                          <button className="btn-approve" title="Ready for Pickup" onClick={(e) => { e.stopPropagation(); handleReadyForPickup(req); }}>
                            <CheckCircle size={16} /> Mark Ready
                          </button>
                        )}
                        {String(req.status || "").toLowerCase() === 'ready for pickup' && req.category === 'Document' && (
                          <button className="btn-approve" title="Claimed" onClick={(e) => { e.stopPropagation(); handleClaimed(req); }}>
                            <CheckCircle size={16} /> Mark Claimed
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
        </div>

        {/* VIEW DETAILS MODAL */}
        {isModalOpen && selectedRequest && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{activeTab === 'Facility' ? 'Reservation' : 'Request'} Details</h2>
                <button className="btn-close-icon" onClick={closeModal}><X size={22} /></button>
              </div>

              <div className="modal-body">
                {/* Section 1: Information */}
                <div className="modal-section">
                  <h3 className="section-title" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#334155' }}>Section 1: {activeTab === 'Facility' ? 'Reservation' : 'Document'} Information</h3>
                  <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div className="detail-item">
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Reference Number</label>
                      <p className="detail-value" style={{ fontWeight: 600, letterSpacing: '1px' }}>{String(selectedRequest.id || "").toUpperCase()}</p>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Household Number</label>
                      <p className="detail-value">{selectedRequest.allData?.householdID || 'N/A'}</p>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>{activeTab === 'Facility' ? 'Facility' : 'Document Type'}</label>
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

                {/* Section 2: Personal Information */}
                <div className="modal-section" style={{ marginTop: '1.5rem' }}>
                  <h3 className="section-title" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#334155' }}>Section 2: {activeTab === 'Facility' ? 'Reservation Details' : 'Personal Information'}</h3>
                  <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>

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
                          <p className="detail-value">{selectedRequest.allData?.email || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Reservation Date</label>
                          <p className="detail-value">{selectedRequest.allData?.date || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Estimated Number of Pax</label>
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
                          <p className="detail-value">{selectedRequest.allData?.email || 'N/A'}</p>
                        </div>
                        <div className="detail-item">
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Residing Since (Year)</label>
                          <p className="detail-value">{selectedRequest.allData?.residingSince || 'N/A'}</p>
                        </div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Purpose</label>
                          <p className="detail-value">{selectedRequest.purpose || 'N/A'}</p>
                        </div>
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
                {String(selectedRequest.status || "").toLowerCase() === 'approved' && selectedRequest.category === 'Document' && (
                  <button className="btn-approve" onClick={() => handleReadyForPickup()}>
                    <CheckCircle size={16} /> Mark Ready for Pickup
                  </button>
                )}
                {String(selectedRequest.status || "").toLowerCase() === 'ready for pickup' && selectedRequest.category === 'Document' && (
                  <button className="btn-approve" onClick={() => handleClaimed()}>
                    <CheckCircle size={16} /> Mark Claimed
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REJECT REMARKS MODAL */}
        {isRejectModalOpen && selectedRequest && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Confirm Rejection</h2>
                <button className="btn-close-icon" onClick={closeModal}><X size={22} /></button>
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
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #e2e8f0',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      marginTop: '0.5rem',
                      resize: 'none',
                      outline: 'none'
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