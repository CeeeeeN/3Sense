import React, { useState, useEffect } from "react";
import "../AdminStyle.css";
import AdminLayout from "../components/AdminLayout";
import { calculateMoodCardData } from "../services/sentimentAggregator";
import AIInsightsWidget from "../components/AIInsightsWidget";
import { db } from "../firebase/firebase";
import { 
  collection, 
  collectionGroup,
  onSnapshot, 
  query, 
  orderBy, 
  where 
} from "firebase/firestore";

// --- REUSABLE SVG ICONS ---
const SmileIcon = () => (
  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="9" r="1.2" fill="currentColor" /><path d="M8 14c1.5 2 6.5 2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);
const NeutralIcon = () => (
  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="9" r="1.2" fill="currentColor" /><line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);
const FrownIcon = () => (
  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="9" r="1.2" fill="currentColor" /><path d="M8 16c1.5-2 6.5-2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);

export default function AdminDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- DASHBOARD STATISTICS STATE ---
  const [stats, setStats] = useState({
    households: 0,
    residents: 0,
    docRequests: 0,      // Tracking documents
    facilityRequests: 0, // Tracking facilities
    pendingApprovals: 0
  });

  // --- FIREBASE REAL-TIME LISTENERS ---
  useEffect(() => {
    // 1. Listen to Feedbacks
    const qFeedbacks = query(collection(db, "Feedback"), orderBy("CreatedAt", "desc"));
    const unsubFeedbacks = onSnapshot(qFeedbacks, (snapshot) => {
      const liveData = [];
      snapshot.forEach((doc) => liveData.push({ id: doc.id, ...doc.data() }));
      setFeedbacks(liveData);
      setLoading(false);
    });

    // 2. Listen to Total Households 
    const unsubHouseholds = onSnapshot(collection(db, "households"), (snapshot) => {
      setStats(prev => ({ ...prev, households: snapshot.size }));
    });

    // 3. Listen to Total Residents (Using collectionGroup for nested subcollections!)
    const unsubResidents = onSnapshot(collectionGroup(db, "members"), (snapshot) => {
      setStats(prev => ({ ...prev, residents: snapshot.size }));
    });

    // 4. Listen to Active Document Requests (Assuming "status" field is "Pending")
    const qDocRequests = query(collection(db, "documentRequests"), where("status", "==", "Pending"));
    const unsubDocRequests = onSnapshot(qDocRequests, (snapshot) => {
      setStats(prev => ({ ...prev, docRequests: snapshot.size }));
    });

    // 5. Listen to Active Facility Reservations (Assuming "status" field is "Pending")
    const qFacilityRequests = query(collection(db, "facilityReservations"), where("status", "==", "Pending"));
    const unsubFacilityRequests = onSnapshot(qFacilityRequests, (snapshot) => {
      setStats(prev => ({ ...prev, facilityRequests: snapshot.size }));
    });

    // 6. Listen to Pending Admin Approvals
    const unsubApprovals = onSnapshot(collection(db, "pending_registrations"), (snapshot) => {
      setStats(prev => ({ ...prev, pendingApprovals: snapshot.size }));
    });

    // Cleanup listeners on unmount
    return () => {
      unsubFeedbacks();
      unsubHouseholds();
      unsubResidents();
      unsubDocRequests();
      unsubFacilityRequests();
      unsubApprovals();
    };
  }, []);

  // Calculate combined requests
  const totalActiveRequests = stats.docRequests + stats.facilityRequests;
  
  // Run the math function on our live data
  const moodCardData = calculateMoodCardData(feedbacks);

  if (loading) {
    return (
      <AdminLayout>
        <div className="main-content" style={{ padding: "40px", textAlign: "center" }}>
          <h2>Loading Analytics...</h2>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="main-content">
        
        {/* --- DYNAMIC SUMMARY CARDS --- */}
        <div className="card-grid">
          <div className="card">
            Total Households
            <br />
            <strong>{stats.households}</strong>
          </div>
          <div className="card">
            Total Residents
            <br />
            <strong>{stats.residents}</strong>
          </div>
          <div className="card">
            Active Requests
            <br />
            <strong>{totalActiveRequests}</strong>
          </div>
          <div className="card">
            Pending Approvals
            <br />
            <strong>{stats.pendingApprovals}</strong>
          </div>
          <div className="card">
            Total Feedbacks
            <br />
            <strong>{feedbacks.length}</strong>
          </div>
        </div>

        {/* --- AI COMMUNITY SENTIMENT SUMMARY --- */}
        <div className="section">
          <h2>Community Sentiment Summary</h2>
          <div className="card-grid">
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
          <div className="chart-placeholder">Chart goes here (Bar / Radar)</div>
        </div>

        {/* --- AI INSIGHTS --- */}
        <div className="section">
          <div className="dashboard-section">
            <h2 className="section-title">AI Insights & Recommendations</h2>
            <AIInsightsWidget feedbacks={feedbacks} />
          </div>
        </div>
        
      </div>
    </AdminLayout>
  );
}