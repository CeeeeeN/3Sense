import React, { useState, useEffect } from 'react';
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { calculateMoodCardData } from '../utils/sentimentAggregator';

// --- FIREBASE IMPORTS ---
import { db } from '../firebase/firebase'; 
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// --- REUSABLE SVG ICONS ---
const SmileIcon = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    <circle cx="15" cy="9" r="1.2" fill="currentColor" />
    <path d="M8 14c1.5 2 6.5 2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const NeutralIcon = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    <circle cx="15" cy="9" r="1.2" fill="currentColor" />
    <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const FrownIcon = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    <circle cx="15" cy="9" r="1.2" fill="currentColor" />
    <path d="M8 16c1.5-2 6.5-2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function AdminDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- FIREBASE REAL-TIME LISTENER ---
  useEffect(() => {
    // Note: Pointing to "Feedback" and ordering by uppercase "CreatedAt"
    const q = query(collection(db, "Feedback"), orderBy("CreatedAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        liveData.push({
          id: doc.id,
          ...data
        });
      });
      setFeedbacks(liveData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching live dashboard data:", error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // Run the math function on our live data
  const moodCardData = calculateMoodCardData(feedbacks);

  if (loading) {
    return (
      <AdminLayout>
        <div className="main-content" style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Loading Analytics...</h2>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="main-content">
        
        {/* --- SUMMARY CARDS --- */}
        <div className="card-grid">
          <div className="card">Total Households<br /><strong>120</strong></div>
          <div className="card">Total Residents<br /><strong>560</strong></div>
          <div className="card">Active Requests<br /><strong>23</strong></div>
          <div className="card">Pending Approvals<br /><strong>5</strong></div>
          {/* Dynamically counts total feedback submitted */}
          <div className="card">Total Feedbacks<br /><strong>{feedbacks.length}</strong></div>
        </div>

        {/* --- AI COMMUNITY SENTIMENT SUMMARY --- */}
        <div className="section">
          <h2>Community Sentiment Summary</h2>
          <div className="card-grid">
            
            {/* Dynamically map over the 4 categories from the math utility */}
            {moodCardData.map((card, index) => (
              <div className="card" key={index}>
                {card.categoryName}
                <div className="sentiment">
                  
                  <span className="positive">
                    <span className="face"><SmileIcon /></span>
                    {card.percentages.Positive}%
                  </span>

                  <span className="neutral">
                    <span className="face"><NeutralIcon /></span>
                    {card.percentages.Neutral}%
                  </span>

                  <span className="negative">
                    <span className="face"><FrownIcon /></span>
                    {card.percentages.Negative}%
                  </span>

                </div>
              </div>
            ))}

          </div>
        </div>

        {/* --- CHART PLACEHOLDER --- */}
        <div className="section">
          <h2>Service Satisfaction Comparison</h2>
          <div className="chart-placeholder">
            Chart goes here (Bar / Radar)
          </div>
        </div>

        {/* --- AI INSIGHTS --- */}
        <div className="section">
          <h2>AI Insights</h2>
          <div className="insight-card">
            <p><strong>Detected Issue:</strong> Long waiting time in document processing.</p>
            <p><strong>Suggested Action:</strong> Increase document processing window hours.</p>
            <p><strong>Impact:</strong> High</p>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}