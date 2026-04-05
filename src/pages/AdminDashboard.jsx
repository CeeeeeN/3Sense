import React, { useState, useEffect } from 'react';
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout";
import { calculateMoodCardData } from '../services/sentimentAggregator';
import { SmileIcon, NeutralIcon, FrownIcon } from '../components/Icons';

export default function AdminDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);

  // --- TEMPORARY MOCK DATA (To be replaced by Firebase onSnapshot) ---
  useEffect(() => {
    const mockDbData = [
      { category: "Services", sentiment: "Positive" },
      { category: "Services", sentiment: "Positive" },
      { category: "Services", sentiment: "Negative" },
      { category: "Facilities", sentiment: "Neutral" },
      { category: "Documents", sentiment: "Positive" },
      { category: "Programs", sentiment: "Negative" },
      { category: "Programs", sentiment: "Negative" },
    ];
    setFeedbacks(mockDbData);
  }, []);

  // Run the math function we created earlier
  const moodCardData = calculateMoodCardData(feedbacks);

  return (
    <AdminLayout>
      <div className="main-content">
        
        {/* --- SUMMARY CARDS --- */}
        <div className="card-grid">
          <div className="card">Total Households<br /><strong>120</strong></div>
          <div className="card">Total Residents<br /><strong>560</strong></div>
          <div className="card">Active Requests<br /><strong>23</strong></div>
          <div className="card">Pending Approvals<br /><strong>5</strong></div>
          <div className="card">Feedback This Month<br /><strong>{feedbacks.length}</strong></div>
        </div>

        {/* --- AI COMMUNITY SENTIMENT SUMMARY --- */}
        <div className="section">
          <h2>Community Sentiment Summary</h2>
          <div className="card-grid">
            
            {/* Dynamically map over the 4 categories */}
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
