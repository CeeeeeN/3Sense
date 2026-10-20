import React, { useState, useEffect, useMemo } from 'react';
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { Search, AlertTriangle, Clock, BarChart2, List } from 'lucide-react';
import { auth, db } from '../firebase/firebase';
import { collection, query, orderBy, doc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logTransaction } from '../services/logger';
import { useAlert } from '../context/AlertContext';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 

import SummaryDashboard from '../components/Feedback/SummaryDashboard';
import FeedbackTable from '../components/Feedback/FeedbackTable';
import ReviewModal from '../components/Feedback/ReviewModal';

const SLA_HOURS = 72;
const SLA_MS = SLA_HOURS * 60 * 60 * 1000;

export default function AdminFeedback() {
  const queryClient = useQueryClient(); 
  const { showAlert } = useAlert();
  
  const [activeTab, setActiveTab] = useState('summary');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // ─── OPTIMIZED: Conditional Timer avoids global re-render thrashing ───
  useEffect(() => {
    // Only run the intensive 60-second tick when the admin is actually looking at the Action tab
    if (activeTab !== 'action') return;
    
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [activeTab]);

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  const [actionSearchTerm, setActionSearchTerm] = useState('');
  const [actionFilterStatus, setActionFilterStatus] = useState('All');
  const [actionFilterUrgency, setActionFilterUrgency] = useState('All'); 
  const [actionSortOrder, setActionSortOrder] = useState('date_desc'); 

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSentiment, setFilterSentiment] = useState('All');
  const [sortOrder, setSortOrder] = useState('date_desc');

  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ─── OPTIMIZED: Fetch Admin Profile from Session Cache ───
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const cachedProfile = sessionStorage.getItem(`admin_profile_${user.uid}`);
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          setAdminName(parsed.fullName);
          setAdminRole(parsed.role);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // ─── OPTIMIZED: Bounded React Query ───
  const { data: feedbacks = [], isLoading: loading } = useQuery({
    queryKey: ['adminManage_feedback'],
    queryFn: async () => {
      const q = query(
        collection(db, "feedback"), 
        orderBy("createdAt", "desc"),
        limit(200)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();

        let formattedDate = "Unknown";
        let rawDate = 0;
        if (data.createdAt?.toDate) {
          formattedDate = data.createdAt.toDate().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
          rawDate = data.createdAt.toDate().getTime();
        } else if (typeof data.createdAt === 'string') {
          formattedDate = data.createdAt;
          rawDate = new Date(data.createdAt).getTime() || 0;
        }

        return {
          docId: doc.id,
          ...data,
          userName: data.userName || data.UserName || "Resident",
          comment: data.comment || data.Comment || "",
          rating: Number(data.rating || data.Rating || 0),
          facilityName: data.facilityName || data.FacilityName || "General",
          sentiment: data.sentiment || data.Sentiment || "Pending AI",
          severity: data.severity || data.Severity || null,
          status: data.status || data.Status || "pending",
          referenceID: data.referenceID || data.ReferenceID || "Unknown",
          createdAt: formattedDate,
          rawDate: rawDate,
        };
      });
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const actionRequiredFeedbacks = useMemo(() => {
    return feedbacks.filter(fb =>
      String(fb.sentiment).toLowerCase() === 'negative' &&
      String(fb.status).toLowerCase() !== 'resolved'
    );
  }, [feedbacks]);

  const processedActionRequired = useMemo(() => {
    return actionRequiredFeedbacks.map(fb => {
      let timerText = "N/A";
      let isOverdue = false;

      if (fb.rawDate > 0) {
        const deadline = fb.rawDate + SLA_MS;
        const diff = deadline - currentTime;
        isOverdue = diff < 0;

        const absDiff = Math.abs(diff);
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
        
        if (days > 0) timerText = `${days}d ${hours}h`;
        else timerText = `${hours}h`;
      }

      return {
        ...fb,
        isOverdue,
        timerText: timerText === "N/A" ? timerText : (isOverdue ? `Overdue by ${timerText}` : `Due in ${timerText}`)
      };
    });
  }, [actionRequiredFeedbacks, currentTime]);

  const filteredActionRequiredFeedbacks = useMemo(() => {
    return processedActionRequired
      .filter(fb => {
        const searchStr = String(actionSearchTerm).toLowerCase();
        const matchesSearch =
          String(fb.facilityName || "").toLowerCase().includes(searchStr) ||
          String(fb.comment || "").toLowerCase().includes(searchStr) ||
          String(fb.referenceID || "").toLowerCase().includes(searchStr) ||
          String(fb.userName || "").toLowerCase().includes(searchStr);

        const matchesStatus =
          actionFilterStatus === 'All' ||
          String(fb.status).toLowerCase() === actionFilterStatus.toLowerCase();

        const matchesUrgency = 
          actionFilterUrgency === 'All' || 
          (actionFilterUrgency === 'Overdue' && fb.isOverdue);

        return matchesSearch && matchesStatus && matchesUrgency;
      })
      .sort((a, b) => {
        if (actionSortOrder === "date_desc") return (b.rawDate || 0) - (a.rawDate || 0);
        if (actionSortOrder === "date_asc") return (a.rawDate || 0) - (b.rawDate || 0);
        if (actionSortOrder === "name_asc") return (a.userName || "").localeCompare(b.userName || "");
        if (actionSortOrder === "name_desc") return (b.userName || "").localeCompare(a.userName || "");
        return 0;
      });
  }, [processedActionRequired, actionSearchTerm, actionFilterStatus, actionFilterUrgency, actionSortOrder]);

  const allFilteredFeedbacks = useMemo(() => {
    return feedbacks
      .filter(fb => {
        const searchStr = String(searchTerm).toLowerCase();
        const matchesSearch =
          String(fb.facilityName || "").toLowerCase().includes(searchStr) ||
          String(fb.comment || "").toLowerCase().includes(searchStr) ||
          String(fb.referenceID || "").toLowerCase().includes(searchStr) ||
          String(fb.userName || "").toLowerCase().includes(searchStr);

        const matchesStatus =
          filterStatus === 'All' ||
          String(fb.status).toLowerCase() === filterStatus.toLowerCase();
        const matchesSentiment =
          filterSentiment === 'All' ||
          String(fb.sentiment).toLowerCase() === filterSentiment.toLowerCase();

        return matchesSearch && matchesStatus && matchesSentiment;
      })
      .sort((a, b) => {
        if (sortOrder === "date_desc") return (b.rawDate || 0) - (a.rawDate || 0);
        if (sortOrder === "date_asc") return (a.rawDate || 0) - (b.rawDate || 0);
        if (sortOrder === "name_asc") return (a.userName || "").localeCompare(b.userName || "");
        if (sortOrder === "name_desc") return (b.userName || "").localeCompare(a.userName || "");
        if (sortOrder === "rating_desc") return (b.rating || 0) - (a.rating || 0);
        if (sortOrder === "rating_asc") return (a.rating || 0) - (b.rating || 0);
        return 0;
      });
  }, [feedbacks, searchTerm, filterStatus, filterSentiment, sortOrder]);

  const handleReviewClick = (fb) => {
    setSelectedFeedback(fb);
    setIsModalOpen(true);
  };

  // ─── OPTIMIZED: Zero-Read Local Cache Update ───
  const handleSaveModal = async (docId, adminNote, newStatus) => {
    try {
      const fbRef = doc(db, "feedback", docId);
      await updateDoc(fbRef, {
        adminNotes: adminNote,
        status: newStatus,
        processedBy: adminName,
        processedRole: adminRole,
        processedAt: new Date()
      });

      queryClient.setQueryData(['adminManage_feedback'], (old = []) => 
        old.map(fb => fb.docId === docId ? { 
          ...fb, 
          status: newStatus, 
          adminNotes: adminNote,
          processedBy: adminName,
          processedRole: adminRole
        } : fb)
      );

      await showAlert("Success", "Feedback updated successfully!");
      setIsModalOpen(false);
      logTransaction(
        adminName,
        adminRole,
        "Update Feedback",
        `Updated feedback (Ref: ${selectedFeedback?.referenceID || docId}) - New Status: ${newStatus}`
      );
    } catch (error) {
      console.error("Error updating feedback:", error);
      await showAlert("Error", "Failed to update feedback.");
    }
  };

  return (
    <AdminLayout>
      <div className="requests-container">

        <div className="requests-header">
          <h1 className="requests-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={28} color="#317D89" /> Feedback & Sentiment Analytics
          </h1>
          <p className="requests-subtitle">Analyze AI insights, resolve negative complaints, and view historical feedback data.</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'summary' ? '3px solid #317D89' : '3px solid transparent',
              color: activeTab === 'summary' ? '#317D89' : '#64748b',
              fontWeight: activeTab === 'summary' ? 700 : 500,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <BarChart2 size={18} /> Dashboard Summary
          </button>
          <button
            onClick={() => setActiveTab('action')}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'action' ? '3px solid #e11d48' : '3px solid transparent',
              color: activeTab === 'action' ? '#e11d48' : '#64748b',
              fontWeight: activeTab === 'action' ? 700 : 500,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertTriangle size={18} /> Action Required
            {actionRequiredFeedbacks.length > 0 && (
              <span style={{ background: '#e11d48', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                {actionRequiredFeedbacks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'all' ? '3px solid #317D89' : '3px solid transparent',
              color: activeTab === 'all' ? '#317D89' : '#64748b',
              fontWeight: activeTab === 'all' ? 700 : 500,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <List size={18} /> All Feedback
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <Clock className="animate-spin mb-2" size={32} />
            <h3>Loading...</h3>
          </div>
        ) : (
          <>
            {activeTab === 'summary' && (
              <SummaryDashboard feedbacks={feedbacks} />
            )}

            {activeTab === 'action' && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
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
                      placeholder="Search by Name, Facility or Ref #..."
                      className="search-input"
                      value={actionSearchTerm}
                      onChange={(e) => setActionSearchTerm(e.target.value)}
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
                      flexWrap: "nowrap",
                    }}
                  >
                    <select
                      className="filter-select"
                      value={actionFilterStatus}
                      onChange={(e) => setActionFilterStatus(e.target.value)}
                    >
                      <option value="All">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="analyzed">Analyzed</option>
                      <option value="under review">Under Review</option>
                      <option value="responded">Responded</option>
                    </select>

                    <select
                      className="filter-select"
                      value={actionFilterUrgency}
                      onChange={(e) => setActionFilterUrgency(e.target.value)}
                    >
                      <option value="All">All Timers</option>
                      <option value="Overdue">Overdue Only</option>
                    </select>

                    <select
                      className="filter-select"
                      value={actionSortOrder}
                      onChange={(e) => setActionSortOrder(e.target.value)}
                    >
                      <option value="date_desc">Date: Newest First</option>
                      <option value="date_asc">Date: Oldest First</option>
                      <option value="name_asc">Resident: A to Z</option>
                      <option value="name_desc">Resident: Z to A</option>
                    </select>
                  </div>
                </div>

                <FeedbackTable
                  dataList={filteredActionRequiredFeedbacks}
                  emptyMessage={
                    actionSearchTerm || actionFilterStatus !== 'All' || actionFilterUrgency !== 'All'
                      ? "No action-required feedback matches your search criteria."
                      : "Hooray! No negative feedback requires admin action right now."
                  }
                  onReview={handleReviewClick}
                  isActionTab={true}
                />
              </div>
            )}

            {activeTab === 'all' && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
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
                      placeholder="Search Facility, Name, or Ref #..."
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
                      flexWrap: "nowrap",
                    }}
                  >
                    <select
                      className="filter-select"
                      value={filterSentiment}
                      onChange={(e) => setFilterSentiment(e.target.value)}
                    >
                      <option value="All">All Sentiments</option>
                      <option value="Positive">Positive</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Negative">Negative</option>
                    </select>

                    <select
                      className="filter-select"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="analyzed">Analyzed</option>
                      <option value="under review">Under Review</option>
                      <option value="responded">Responded</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    <select
                      className="filter-select"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                    >
                      <option value="date_desc">Date: Newest First</option>
                      <option value="date_asc">Date: Oldest First</option>
                      <option value="name_asc">Resident: A to Z</option>
                      <option value="name_desc">Resident: Z to A</option>
                      <option value="rating_desc">Rating: Highest First</option>
                      <option value="rating_asc">Rating: Lowest First</option>
                    </select>
                  </div>
                </div>

                <FeedbackTable
                  dataList={allFilteredFeedbacks}
                  emptyMessage="No feedback matches your search criteria."
                  onReview={handleReviewClick}
                  isActionTab={false}
                />
              </div>
            )}
          </>
        )}

        <ReviewModal
          isOpen={isModalOpen}
          feedback={selectedFeedback}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveModal}
        />
      </div>
    </AdminLayout>
  );
}