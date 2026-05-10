import React, { useState, useEffect } from 'react';
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { Search, AlertTriangle, Clock, BarChart2, List } from 'lucide-react';
import { auth, db } from '../firebase/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logTransaction } from '../services/logger';

// Import our newly separated components
import SummaryDashboard from '../components/Feedback/SummaryDashboard';
import FeedbackTable from '../components/Feedback/FeedbackTable';
import ReviewModal from '../components/Feedback/ReviewModal';

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  // For logging purposes
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  // States for 'All' tab filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Analytics States
  const [wordCloud, setWordCloud] = useState([]);
  const [stats, setStats] = useState({ total: 0, avgRating: 0, negative: 0, pending: 0 });
  const [heatmapData, setHeatmapData] = useState({});

  // Modal State
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // --- FETCH FIREBASE DATA ---
  useEffect(() => {
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fbData = snapshot.docs.map(doc => {
        const data = doc.data();

        let formattedDate = "Unknown";
        if (data.createdAt?.toDate) {
          formattedDate = data.createdAt.toDate().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
        } else if (typeof data.createdAt === 'string') {
          formattedDate = data.createdAt;
        }

        return {
          docId: doc.id,
          ...data,
          userName: data.userName || data.UserName || "Resident",
          comment: data.comment || data.Comment || "",
          rating: data.rating || data.Rating || 0,
          facilityName: data.facilityName || data.FacilityName || "General",
          sentiment: data.sentiment || data.Sentiment || "Pending AI",
          severity: data.severity || data.Severity || null,
          status: data.status || data.Status || "pending",
          referenceID: data.referenceID || data.ReferenceID || "Unknown",
          createdAt: formattedDate,
        };
      });

      setFeedbacks(fbData);
      generateAnalytics(fbData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- ANALYTICS ENGINE ---
  const generateAnalytics = (data) => {
    if (data.length === 0) return;

    let totalRating = 0;
    let negativeCount = 0;
    let pendingCount = 0;

    data.forEach(fb => {
      totalRating += Number(fb.rating || 0);
      if (String(fb.sentiment).toLowerCase() === 'negative') negativeCount++;
      if (['pending', 'analyzed', 'under review'].includes(String(fb.status).toLowerCase())) pendingCount++;
    });

    setStats({
      total: data.length,
      avgRating: (totalRating / data.length).toFixed(1),
      negative: negativeCount,
      pending: pendingCount
    });

    const stopWords = ['ang', 'mga', 'sa', 'ng', 'na', 'po', 'at', 'ay', 'ito', 'yung', 'the', 'to', 'and', 'a', 'is', 'in', 'of', 'for', 'it', 'was', 'that', 'with'];
    const wordCounts = {};
    data.forEach(fb => {
      if (fb.comment) {
        const words = fb.comment.toLowerCase().replace(/[^\w\s\u0900-\u097F]/gi, '').split(/\s+/);
        words.forEach(word => {
          if (word.length > 2 && !stopWords.includes(word)) wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
      }
    });
    setWordCloud(Object.entries(wordCounts).map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 30));

    const hData = {};
    data.forEach(fb => {
      const facility = fb.facilityName || "General";
      const sentiment = fb.sentiment || "Neutral";
      if (!hData[facility]) hData[facility] = { Positive: 0, Neutral: 0, Negative: 0, Total: 0 };
      if (hData[facility][sentiment] !== undefined) {
        hData[facility][sentiment]++;
        hData[facility].Total++;
      }
    });
    setHeatmapData(hData);
  };

  // --- FILTERING LOGIC ---

  // Rule: Only show Negative feedback that is NOT resolved
  const actionRequiredFeedbacks = feedbacks.filter(fb =>
    String(fb.sentiment).toLowerCase() === 'negative' &&
    String(fb.status).toLowerCase() !== 'resolved'
  );

  const allFilteredFeedbacks = feedbacks.filter(fb => {
    const searchStr = String(searchTerm).toLowerCase();
    const matchesSearch =
      String(fb.facilityName || "").toLowerCase().includes(searchStr) ||
      String(fb.comment || "").toLowerCase().includes(searchStr) ||
      String(fb.referenceID || "").toLowerCase().includes(searchStr) ||
      String(fb.userName || "").toLowerCase().includes(searchStr);

    const matchesStatus = filterStatus === 'All' || String(fb.status).toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // --- HANDLERS ---
  const handleReviewClick = (fb) => {
    setSelectedFeedback(fb);
    setIsModalOpen(true);
  };

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
      alert("Feedback updated successfully!");
      setIsModalOpen(false);
      logTransaction(
        adminName,
        adminRole,
        "Update Feedback",
        `Updated feedback (Ref: ${selectedFeedback.ReferenceID || docId}) - New Status: ${newStatus} - Admin Note: ${adminNote.substring(0, 50)}...`
      )
    } catch (error) {
      console.error("Error updating feedback:", error);
      alert("Failed to update feedback.");
      logTransaction(
        adminName,
        adminRole,
        "Failed Feedback Update",
        `Attempted to update feedback (Ref: ${selectedFeedback.ReferenceID || docId}) - Error: ${error.message}`
      )
    }
  };

  return (
    <AdminLayout>
      <div className="requests-container">

        {/* Page Header */}
        <div className="requests-header">
          <h1 className="requests-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={28} color="#317D89" /> Feedback & Sentiment Analytics
          </h1>
          <p className="requests-subtitle">Analyze AI insights, resolve negative complaints, and view historical feedback data.</p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('summary')}
            style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'summary' ? '3px solid #317D89' : '3px solid transparent', color: activeTab === 'summary' ? '#317D89' : '#64748b', fontWeight: activeTab === 'summary' ? 700 : 500, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <BarChart2 size={18} /> Dashboard Summary
          </button>
          <button
            onClick={() => setActiveTab('action')}
            style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'action' ? '3px solid #e11d48' : '3px solid transparent', color: activeTab === 'action' ? '#e11d48' : '#64748b', fontWeight: activeTab === 'action' ? 700 : 500, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <AlertTriangle size={18} /> Action Required
            {actionRequiredFeedbacks.length > 0 && <span style={{ background: '#e11d48', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{actionRequiredFeedbacks.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'all' ? '3px solid #317D89' : '3px solid transparent', color: activeTab === 'all' ? '#317D89' : '#64748b', fontWeight: activeTab === 'all' ? 700 : 500, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <List size={18} /> All Feedback
          </button>
        </div>

        {/* Tab Content Routing */}
        {loading ? (
          <div className="empty-state"><Clock className="animate-spin mb-2" size={32} /><h3>Loading...</h3></div>
        ) : (
          <>
            {activeTab === 'summary' && (
              <SummaryDashboard stats={stats} heatmapData={heatmapData} wordCloud={wordCloud} />
            )}

            {activeTab === 'action' && (
              <FeedbackTable
                dataList={actionRequiredFeedbacks}
                emptyMessage="Hooray! No negative feedback requires admin action right now."
                onReview={handleReviewClick}
              />
            )}

            {activeTab === 'all' && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <div className="requests-controls">
                  <div className="search-wrapper">
                    <Search className="search-icon" size={20} />
                    <input type="text" placeholder="Search Facility, Name, or Ref #..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="filter-group">
                    <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="All">All Statuses</option>
                      <option value="analyzed">Analyzed</option>
                      <option value="under review">Under Review</option>
                      <option value="responded">Responded</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
                <FeedbackTable
                  dataList={allFilteredFeedbacks}
                  emptyMessage="No feedback matches your search criteria."
                  onReview={handleReviewClick}
                />
              </div>
            )}
          </>
        )}

        {/* Modal Overlay Component */}
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