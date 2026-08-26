import React, { useState, useEffect, useMemo } from 'react';
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { Search, AlertTriangle, Clock, BarChart2, List } from 'lucide-react';
import { auth, db } from '../firebase/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDocs, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logTransaction } from '../services/logger';

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

  // States for 'All' tab filtering & sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSentiment, setFilterSentiment] = useState('All');
  const [sortOrder, setSortOrder] = useState('date_desc'); // date_desc, date_asc, name_asc, name_desc, rating_desc, rating_asc

  // Analytics States
  const [wordCloud, setWordCloud] = useState([]);
  const [stats, setStats] = useState({ total: 0, avgRating: 0, negative: 0, pending: 0 });
  const [heatmapData, setHeatmapData] = useState({});

  // Modal State
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
    const q = query(
      collection(db, "feedback"), 
      orderBy("createdAt", "desc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fbData = snapshot.docs.map(doc => {
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

    const stopWords = ['ang', 'are', 'mga', 'too', 'but', 'kaso', 'niyo', 'niya', 'sa', 'ng', 'na', 'po', 'at', 'ay', 'ito', 'yung', 'the', 'to', 'and', 'a', 'is', 'in', 'of', 'for', 'it', 'was', 'that', 'with'];
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

  // --- FILTERING & SORTING LOGIC ---
  const actionRequiredFeedbacks = useMemo(() => {
    return feedbacks.filter(fb =>
      String(fb.sentiment).toLowerCase() === 'negative' &&
      String(fb.status).toLowerCase() !== 'resolved'
    ).sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0));
  }, [feedbacks]);

  const allFilteredFeedbacks = useMemo(() => {
    return feedbacks.filter(fb => {
      const searchStr = String(searchTerm).toLowerCase();
      const matchesSearch =
        String(fb.facilityName || "").toLowerCase().includes(searchStr) ||
        String(fb.comment || "").toLowerCase().includes(searchStr) ||
        String(fb.referenceID || "").toLowerCase().includes(searchStr) ||
        String(fb.userName || "").toLowerCase().includes(searchStr);

      const matchesStatus = filterStatus === 'All' || String(fb.status).toLowerCase() === filterStatus.toLowerCase();
      const matchesSentiment = filterSentiment === 'All' || String(fb.sentiment).toLowerCase() === filterSentiment.toLowerCase();
      return matchesSearch && matchesStatus && matchesSentiment;
    }).sort((a, b) => {
      if (sortOrder === "date_desc") {
        return (b.rawDate || 0) - (a.rawDate || 0);
      }
      if (sortOrder === "date_asc") {
        return (a.rawDate || 0) - (b.rawDate || 0);
      }
      if (sortOrder === "name_asc") {
        return (a.userName || "").localeCompare(b.userName || "");
      }
      if (sortOrder === "name_desc") {
        return (b.userName || "").localeCompare(a.userName || "");
      }
      if (sortOrder === "rating_desc") {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortOrder === "rating_asc") {
        return (a.rating || 0) - (b.rating || 0);
      }
      return 0;
    });
  }, [feedbacks, searchTerm, filterStatus, filterSentiment, sortOrder]);

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
        `Updated feedback (Ref: ${selectedFeedback?.referenceID || docId}) - New Status: ${newStatus} - Admin Note: ${adminNote.substring(0, 50)}...`
      );
    } catch (error) {
      console.error("Error updating feedback:", error);
      alert("Failed to update feedback.");
      logTransaction(
        adminName,
        adminRole,
        "Failed Feedback Update",
        `Attempted to update feedback (Ref: ${selectedFeedback?.referenceID || docId}) - Error: ${error.message}`
      );
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
                  <div className="filter-group" style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' }}>
                    <select className="filter-select" value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)}>
                      <option value="All">All Sentiments</option>
                      <option value="Positive">Positive</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Negative">Negative</option>
                    </select>

                    <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="All">All Statuses</option>
                      <option value="analyzed">Analyzed</option>
                      <option value="under review">Under Review</option>
                      <option value="responded">Responded</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    <select className="filter-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
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