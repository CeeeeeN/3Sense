import React, { useState, useEffect } from 'react';
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { Search, Eye, CheckCircle, XCircle, X } from 'lucide-react';
import { db } from '../firebase/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- STATE MANAGEMENT ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // --- FIREBASE HELPER FUNCTIONS ---
  // Safely format Firestore Timestamps into readable text
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // If it's a Firestore Timestamp, it has a toDate() method
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    // If it's already a string, just return it
    return String(timestamp);
  };

  // Format resident name cleanly even if middle name is missing
  const formatName = (firstName, middleName, lastName) => {
    const mName = middleName ? `${middleName} ` : '';
    return `${firstName || ''} ${mName}${lastName || ''}`.trim() || 'Unknown Resident';
  };

  // --- REAL-TIME FIREBASE FETCH ---
  useEffect(() => {
    // 1. Listen to Document Requests
    const unsubscribeDocs = onSnapshot(collection(db, 'documentRequests'), (snapshot) => {
      const docData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          docId: doc.id, // The actual Firebase document ID for updating later
          collectionName: 'documentRequest', // To know which collection to update
          id: data.referenceNumber || doc.id.substring(0, 8).toUpperCase(), // Display ID
          residentName: formatName(data.firstName, data.middleName, data.lastName),
          contact: data.email || 'No email provided',
          category: 'Document',
          type: data.documentType || 'Unknown Document',
          purpose: data.purpose || 'No purpose stated',
          dateRequested: formatDate(data.dateRequested),
          dateNeeded: formatDate(data.dateNeeded),
          status: data.status || 'Pending',
        };
      });

      // 2. Listen to Facility Reservations
      const unsubscribeFacilities = onSnapshot(collection(db, 'facilityReservations'), (facSnapshot) => {
        const facData = facSnapshot.docs.map(doc => {
          const data = doc.data();
          const time = data.timeSlot ? ` (${data.timeSlot})` : '';
          
          return {
            docId: doc.id,
            collectionName: 'facilityReservations',
            id: data.referenceNumber || doc.id.substring(0, 8).toUpperCase(),
            residentName: data.requesterName,
            contact: data.email || 'No email provided',
            category: 'Facility',
            type: data.facility || 'Unknown Facility',
            purpose: data.purpose || 'No purpose stated',
            dateRequested: formatDate(data.dateRequested),
            dateNeeded: formatDate(data.reservationDate) + time,
            status: data.status || 'Pending',
          };
        });

        // 3. Combine both collections into one array and update state
        // Sort them so the newest requests are at the top (based on ID/Ref string comparison)
        const combined = [...docData, ...facData].sort((a, b) => b.id.localeCompare(a.id));
        setRequests(combined);
        setLoading(false);
      });

      // Cleanup listener on unmount
      return () => unsubscribeFacilities();
    });

    // Cleanup listener on unmount
    return () => unsubscribeDocs();
  }, []);

  // --- FILTERING LOGIC ---
  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.residentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || req.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || req.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // --- ACTION HANDLERS ---
  const openModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
    setShowRejectReason(false);
    setRejectReason('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  // Update Firebase: APPROVE
  const handleApprove = async () => {
    try {
      const requestRef = doc(db, selectedRequest.collectionName, selectedRequest.docId);
      await updateDoc(requestRef, {
        status: 'Approved'
      });
      closeModal();
    } catch (error) {
      console.error("Error approving request: ", error);
      alert("Failed to approve request. Please try again.");
    }
  };

  // Update Firebase: REJECT
  const handleReject = async () => {
    if (!showRejectReason) {
      setShowRejectReason(true);
      return;
    }
    
    if (rejectReason.trim() === '') {
      alert("Please provide a reason for rejection.");
      return;
    }

    try {
      const requestRef = doc(db, selectedRequest.collectionName, selectedRequest.docId);
      await updateDoc(requestRef, {
        status: 'Rejected',
        rejectionReason: rejectReason
      });
      closeModal();
    } catch (error) {
      console.error("Error rejecting request: ", error);
      alert("Failed to reject request. Please try again.");
    }
  };

  return (
    <AdminLayout>
      <div className="requests-container">
        
        {/* HEADER SECTION */}
        <div className="requests-header">
          <h1 className="requests-title">Requests Management</h1>
          <p className="requests-subtitle">Review and manage document and facility requests.</p>
        </div>

        {/* FILTER & SEARCH CONTROLS */}
        <div className="requests-controls">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search by Ref # or Resident Name..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select 
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Document">Documents Only</option>
              <option value="Facility">Facilities Only</option>
            </select>

            <select 
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="table-container">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Resident Name</th>
                <th>Request Type</th>
                <th>Date Requested</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">Loading requests from database...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">No requests found matching your filters.</td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.docId}>
                    <td className="req-id">{req.id}</td>
                    <td className="req-name">{req.residentName}</td>
                    <td>
                      <div className="req-type">{req.type}</div>
                      <div className="req-category">{req.category}</div>
                    </td>
                    <td className="req-date">{req.dateRequested}</td>
                    <td>
                      <span className={`status-badge ${req.status.toLowerCase()}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <button className="btn-view" onClick={() => openModal(req)}>
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* VIEW DETAILS MODAL */}
        {isModalOpen && selectedRequest && (
          <div className="modal-overlay">
            <div className="modal-content">
              
              <div className="modal-header">
                <h2>Request Details</h2>
                <button className="btn-close-icon" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Reference #</label>
                    <p className="detail-value bold">{selectedRequest.id}</p>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <p className="detail-value">
                       <span className={`status-badge ${selectedRequest.status.toLowerCase()}`}>
                        {selectedRequest.status}
                      </span>
                    </p>
                  </div>
                  <div className="detail-item">
                    <label>Resident Name</label>
                    <p className="detail-value">{selectedRequest.residentName}</p>
                  </div>
                  <div className="detail-item">
                    <label>Contact Email</label>
                    <p className="detail-value">{selectedRequest.contact}</p>
                  </div>
                  <div className="detail-item full-width has-border">
                    <label>Requested Item</label>
                    <p className="detail-value large">
                      {selectedRequest.type} <span>({selectedRequest.category})</span>
                    </p>
                  </div>
                  <div className="detail-item full-width">
                    <label>Purpose / Reason</label>
                    <div className="purpose-box">{selectedRequest.purpose}</div>
                  </div>
                  <div className="detail-item">
                    <label>Date Requested</label>
                    <p className="detail-value">{selectedRequest.dateRequested}</p>
                  </div>
                  <div className="detail-item">
                    <label>
                      {selectedRequest.category === 'Facility' ? 'Reservation Date' : 'Date Needed By'}
                    </label>
                    <p className="detail-value bold">{selectedRequest.dateNeeded}</p>
                  </div>
                </div>

                {showRejectReason && selectedRequest.status === 'Pending' && (
                  <div className="reject-reason-section">
                    <label>Reason for Rejection (Required):</label>
                    <textarea 
                      rows="3"
                      placeholder="E.g., Invalid ID submitted, Covered Court is under maintenance..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    ></textarea>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn-cancel" onClick={closeModal}>Close</button>
                
                {selectedRequest.status.toLowerCase() == 'pending' && (
                  <>
                    <button className="btn-reject" onClick={handleReject}>
                      <XCircle size={16} /> {showRejectReason ? 'Confirm' : 'Reject'}
                    </button>
                    
                    {!showRejectReason && (
                      <button className="btn-approve" onClick={handleApprove}>
                        <CheckCircle size={16} /> Approve
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}