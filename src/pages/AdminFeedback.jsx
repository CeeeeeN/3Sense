import React, { useState, useEffect, useMemo } from "react";
import AdminLayout from "../components/AdminLayout";
import "../AdminStyle.css";
import { db } from "../firebase/firebase"; 
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

import { getSmartSuggestions } from "../services/suggestionEngine"; 

// --- STAR RATING HELPER ---
const StarRating = ({ rating }) => {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="16" height="16"
          fill={star <= rating ? "#374151" : "#D1D5DB"}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterService, setFilterService] = useState("All");
  const [filterTag, setFilterTag] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Helper to assign CSS classes
  const getBadgeClass = (text) => {
    if (!text) return "af-badge";
    const lowerText = text.toLowerCase().replace(" ", "-");
    return `af-badge ${lowerText}`;
  };

  // Fetch Real-Time Data
  useEffect(() => {
    const q = query(collection(db, "Feedback"), orderBy("CreatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData = snapshot.docs.map((doc) => {
        const data = doc.data();
        let formattedDate = "Unknown Date";
        if (data.CreatedAt) {
          formattedDate = data.CreatedAt.toDate().toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
          });
        }

        return {
          id: doc.id,
          date: formattedDate,
          service: data.FacilityName || "Barangay Service",
          name: data.UserName || "Resident",
          rating: data.Rating || 0,
          tag: data.Sentiment || "Pending",
          status: data.Status === 'analyzed' ? 'Received' : 
                  data.Status === 'pending' ? 'Under Review' : 'Resolved',
          text: data.Comment || "",
          confidence: data.Confidence ? `${Math.round(data.Confidence * 100)}%` : "N/A",
          detectedIssue: data.DetectedIssue || "None",
          issueConfidence: data.IssueConfidence ? `${Math.round(data.IssueConfidence * 100)}%` : "N/A",
        };
      });
      setFeedbacks(liveData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const uniqueServices = ["All", ...new Set(feedbacks.map(item => item.service))];

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.text.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesService = filterService === "All" || item.service === filterService;
      const matchesTag = filterTag === "All" || item.tag === filterTag;
      const matchesStatus = filterStatus === "All" || item.status === filterStatus;

      return matchesSearch && matchesService && matchesTag && matchesStatus;
    });
  }, [feedbacks, searchTerm, filterService, filterTag, filterStatus]);

  const activeSuggestions = selectedFeedback && selectedFeedback.tag === "Negative" 
    ? getSmartSuggestions(selectedFeedback.detectedIssue) 
    : null;

  return (
    <AdminLayout>
      <div className="af-container">
        <div className="af-header-section">
          <h1 className="af-title">Feedbacks</h1>
          <p className="af-subtitle">Review the Residents' Feedbacks</p>
        </div>

        {/* --- CONTROLS: SEARCH & FILTERS --- */}
        <div className="af-controls">
          <div className="af-search-box">
            <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input 
              type="text" 
              placeholder="Search names or comments..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="af-filters">
            <span className="af-filter-label">Filters:</span>
            
            <select 
              className="af-select"
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
            >
              {uniqueServices.map(service => (
                <option key={service} value={service}>{service === "All" ? "All Services" : service}</option>
              ))}
            </select>

            <select 
              className="af-select"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="All">All Tags</option>
              <option value="Positive">Positive</option>
              <option value="Neutral">Neutral</option>
              <option value="Negative">Negative</option>
              <option value="Pending">Pending AI</option>
            </select>

            <select 
              className="af-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Received">Received</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* --- TABLE --- */}
        <div className="af-table-wrapper">
          <table className="af-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Name</th>
                <th>Rating</th>
                <th>Tag</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading feedbacks...</td></tr>
              ) : filteredFeedbacks.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No feedbacks found matching your filters.</td></tr>
              ) : (
                filteredFeedbacks.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{item.service}</td>
                    <td>{item.name}</td>
                    <td><StarRating rating={item.rating} /></td>
                    <td><span className={getBadgeClass(item.tag)}>{item.tag}</span></td>
                    <td><span className={getBadgeClass(item.status)}>{item.status}</span></td>
                    <td>
                      <button className="af-view-btn" onClick={() => setSelectedFeedback(item)}>View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <div className="af-pagination">
            <button className="af-page-btn">Previous</button>
            <button className="af-page-btn active">1</button>
            <button className="af-page-btn">Next</button>
          </div>
        </div>
      </div>

      {/* --- POPUP MODAL --- */}
      {selectedFeedback && (
        <div className="af-modal-overlay">
          <div className="af-modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="af-modal-header">
              <h2>Feedback Response</h2>
              <button className="af-modal-close" onClick={() => setSelectedFeedback(null)}>&times;</button>
            </div>
            <div className="af-modal-body">
              <h3>Feedback - {selectedFeedback.name}</h3>
              <p style={{ fontStyle: 'italic', color: '#4b5563', backgroundColor: '#f9fafb', padding: '10px', borderRadius: '6px' }}>
                "{selectedFeedback.text}"
              </p>
              
              <h3>AI Sentiment Classification</h3>
              <ul className="af-sentiment-list">
                <li>
                  <strong>Overall Sentiment: </strong>
                  <span className={getBadgeClass(selectedFeedback.tag)}>{selectedFeedback.tag}</span>
                </li>
                <li><strong>AI Confidence:</strong> {selectedFeedback.confidence}</li>
                {selectedFeedback.tag === "Negative" && selectedFeedback.detectedIssue !== "None" && (
                  <li style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb' }}>
                    <strong>Detected Issue: </strong>
                    <span style={{ fontWeight: 'bold', color: '#b91c1c' }}>{selectedFeedback.detectedIssue}</span>
                    <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>(Confidence: {selectedFeedback.issueConfidence})</span>
                  </li>
                )}
              </ul>

              {activeSuggestions && (
                <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                  <h3 style={{ color: '#166534', marginTop: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    AI Smart Suggestions
                  </h3>

                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ fontSize: '14px', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Immediate Actions (24-48 Hours):
                    </strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '24px', fontSize: '14px', color: '#374151' }}>
                      {activeSuggestions.actions.map((act, i) => (
                        <li key={i} style={{ marginBottom: '4px' }}>{act}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <strong style={{ fontSize: '14px', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Long-Term Strategies:
                    </strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '24px', fontSize: '14px', color: '#374151' }}>
                      {activeSuggestions.strategy.map((strat, i) => (
                        <li key={i} style={{ marginBottom: '4px' }}>{strat}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}