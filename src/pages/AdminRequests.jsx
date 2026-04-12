import React, { useState, useEffect } from 'react';
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { Search, Eye, CheckCircle, XCircle, X, Calendar, FileText, User, Info, Clock } from 'lucide-react';
import { db } from '../firebase/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('Facility'); // 'Facility' or 'Document'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

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

  // --- REAL-TIME FIREBASE FETCH ---
  useEffect(() => {
    const unsubscribeDocs = onSnapshot(collection(db, 'documentRequests'), (snapshot) => {
      const docData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          docId: doc.id,
          collectionName: 'documentRequests',
          id: data.refNum || data.referenceNumber || doc.id.substring(0, 8).toUpperCase(),
          residentName: data.fullName || data.residentName || formatName(data.firstName, data.middleName, data.lastName),
          contact: data.email || 'No email provided',
          category: 'Document',
          type: data.documentType || 'Unknown Document',
          purpose: data.purpose || 'No purpose stated',
          dateRequested: formatDate(data.submittedAt || data.dateRequested),
          dateNeeded: formatDate(data.dateNeeded),
          status: data.status || 'Pending',
          allData: data // Store all data for the View modal
        };
      });

      const unsubscribeFacilities = onSnapshot(collection(db, 'facilityReservations'), (facSnapshot) => {
        const facData = facSnapshot.docs.map(doc => {
          const data = doc.data();
          const time = data.timeSlot ? ` (${data.timeSlot})` : '';

          return {
            docId: doc.id,
            collectionName: 'facilityReservations',
            id: data.refNum || data.referenceNumber || doc.id.substring(0, 8).toUpperCase(),
            residentName: data.requesterName,
            contact: data.email || 'No email provided',
            category: 'Facility',
            type: data.facilityName || data.facility || 'Unknown Facility',
            purpose: data.purpose || 'No purpose stated',
            dateRequested: formatDate(data.submittedAt || data.dateRequested),
            dateNeeded: data.date ? `${data.date} (${formatTime(data.startTime)} - ${formatTime(data.endTime)})` : (formatDate(data.reservationDate) + time),
            status: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase() : 'Pending',
            allData: data
          };
        });

        const combined = [...docData, ...facData].sort((a, b) => b.id.localeCompare(a.id));
        setRequests(combined);
        setLoading(false);
      });

      return () => unsubscribeFacilities();
    });

    return () => unsubscribeDocs();
  }, []);

  // --- FILTERING LOGIC ---
  const filteredRequests = requests.filter(req => {
    const matchesTab = req.category === activeTab;
    const matchesSearch = req.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || req.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesTab && matchesSearch && matchesStatus;
  });

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
        if (r.status.toLowerCase() !== 'approved') return false;

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
      await updateDoc(requestRef, { status: 'approved' });
      alert("Request Approved Successfully!");
      closeModal();
    } catch (error) {
      console.error("Error approving request: ", error);
      alert("Failed to approve request.");
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
        status: 'rejected',
        rejectionReason: rejectReason
      });
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
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
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
                      <span className={`status-badge ${req.status.toLowerCase()}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="req-actions">
                        {req.status.toLowerCase() === 'pending' && (
                          <>
                            <button className="btn-approve" title="Approve" onClick={(e) => { e.stopPropagation(); handleApprove(req); }}>
                              <CheckCircle size={16} /> Approve
                            </button>
                            <button className="btn-reject" title="Reject" onClick={(e) => { e.stopPropagation(); openRejectModal(req); }}>
                              <XCircle size={16} /> Reject
                            </button>
                          </>
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
                      <p className="detail-value" style={{ fontWeight: 600, letterSpacing: '1px' }}>{selectedRequest.id?.toUpperCase()}</p>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Household Number</label>
                      <p className="detail-value">{selectedRequest.allData?.hhId || 'N/A'}</p>
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
                        <span className={`status-badge ${selectedRequest.status.toLowerCase()}`}>
                          {selectedRequest.status}
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
                    {selectedRequest.allData && Object.entries(selectedRequest.allData)
                      .filter(([key, value]) => {
                        const standardFields = [
                          'id', 'status', 'firstName', 'middleName', 'lastName', 'residentName', 'requesterName', 'fullName',
                          'email', 'contact', 'contactNumber', 'purpose', 'dateRequested', 'dateNeeded', 'reservationDate',
                          'timeSlot', 'documentType', 'facility', 'referenceNumber', 'allData', 'docId', 'facilityName',
                          'collectionName', 'category', 'type', 'rejectionReason', 'birthDate', 'dateOfBirth', 'dob',
                          'civilStatus', 'address', 'residingSince', 'paxCount', 'mobile', 'ctc', 'notes', 'attendees',
                          'date', 'startTime', 'endTime', 'facilityId', 'documentId', 'processingDays', 'fee', 'refNum', 'validIdFileName', 'hhId', 'submittedAt'
                        ];
                        return !standardFields.includes(key) && typeof value !== 'object' && value !== '';
                      })
                      .map(([key, value]) => (
                        <div className="detail-item" key={key}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                          <p className="detail-value">{String(value)}</p>
                        </div>
                      ))}

                    {(!selectedRequest.allData || Object.entries(selectedRequest.allData)
                      .filter(([key, value]) => {
                        const standardFields = ['id', 'status', 'firstName', 'middleName', 'lastName', 'residentName', 'requesterName', 'fullName', 'email', 'contact', 'contactNumber', 'purpose', 'dateRequested', 'dateNeeded', 'reservationDate', 'timeSlot', 'documentType', 'facility', 'referenceNumber', 'allData', 'docId', 'facilityName', 'collectionName', 'category', 'type', 'rejectionReason', 'birthDate', 'dateOfBirth', 'dob', 'civilStatus', 'address', 'residingSince', 'paxCount', 'mobile', 'ctc', 'notes', 'attendees', 'date', 'startTime', 'endTime', 'facilityId', 'documentId', 'processingDays', 'fee', 'refNum', 'validIdFileName', 'hhId', 'submittedAt'];
                        return !standardFields.includes(key) && typeof value !== 'object' && value !== '';
                      }).length === 0) && (
                        <p style={{ gridColumn: 'span 2', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No additional requirements answered for this request.</p>
                      )}

                    {selectedRequest.status.toLowerCase() === 'rejected' && selectedRequest.allData?.rejectionReason && (
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
                {selectedRequest.status.toLowerCase() === 'pending' && (
                  <>
                    <button className="btn-reject" onClick={() => openRejectModal(selectedRequest)}>
                      <XCircle size={16} /> Reject
                    </button>
                    <button className="btn-approve" onClick={() => handleApprove()}>
                      <CheckCircle size={16} /> Approve
                    </button>
                  </>
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
