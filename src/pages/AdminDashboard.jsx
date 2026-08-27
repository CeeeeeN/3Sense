import React, { useState } from "react";
import "../AdminStyle.css";
import AdminLayout from "../components/AdminLayout";
import AIInsightsWidget from "../components/AIInsightsWidget";
import SentimentComparisonChart from '../components/SentimentComparisonChart';
import ResidentDemographics from '../components/AdminDashboard/ResidentDemographics';
import AgeAnalytics from '../components/AdminDashboard/AgeAnalytics';
import SexAnalytics from '../components/AdminDashboard/SexAnalytics';
import GenderOrientationAnalytics from '../components/AdminDashboard/GenderOrientationAnalytics';
import ProgramAnalytics from '../components/AdminDashboard/ProgramAnalytics';
import PeaceAndOrderAnalytics from '../components/AdminDashboard/PeaceAndOrderAnalytics';
import BSWDAnalytics from '../components/AdminDashboard/BSWDAnalytics';
import DashboardSummaryCards from '../components/AdminDashboard/DashboardSummaryCards';
import SentimentSummaryCard from '../components/AdminDashboard/SentimentSummaryCard';
import ServiceFacilityAnalytics from '../components/AdminDashboard/ServiceFacilityAnalytics';

import { useQuery } from '@tanstack/react-query';
import { db } from "../firebase/firebase";
import {
  collection,
  collectionGroup,
  query,
  orderBy,
  getDocs,
  getCountFromServer,
  limit
} from "firebase/firestore";

const TABS = [
  { id: 'resident', label: 'Resident Analytics' },
  { id: 'services', label: 'Services & Facilities' },
  { id: 'programs', label: 'Programs & Livelihood' },
  { id: 'sentiment', label: 'Sentiment & Satisfaction' },
  { id: 'peace', label: 'Peace & Order' },
  { id: 'bswd', label: 'Social Welfare' }
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('resident');

  // ── REACT QUERY: The centralized data fetcher ──
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['adminDashboardAnalytics'],
    queryFn: async () => {
      // 1. ULTRA-OPTIMIZED COUNTS: Get totals without downloading the actual documents (1 read each!)
      const [hhCount, resCount, pendingCount] = await Promise.all([
        getCountFromServer(collection(db, "households")),
        getCountFromServer(collectionGroup(db, "residents")),
        getCountFromServer(collection(db, "pending_registrations"))
      ]);
 
      // 2. PARALLEL BOUNDED FETCHES: Download the data for charts (capped to prevent read spikes)
      const [
        fbSnap, resSnap, docSnap, facSnap, attSnap, livSnap, incSnap, bswdSnap
      ] = await Promise.all([
        getDocs(query(collection(db, "Feedback"), orderBy("CreatedAt", "desc"), limit(300))),
        getDocs(query(collectionGroup(db, "residents"), limit(500))), // For demographic charts
        getDocs(query(collection(db, "document_requests"), orderBy("submittedAt", "desc"), limit(300))),
        getDocs(query(collection(db, "facility_reservations"), orderBy("submittedAt", "desc"), limit(300))),
        getDocs(query(collectionGroup(db, "attendees"), limit(400))),
        getDocs(query(collection(db, "livelihoodRegistrations"), limit(400))),
        getDocs(query(collection(db, "incidentReports"), orderBy("submittedAt", "desc"), limit(300))),
        getDocs(query(collection(db, "bswdReports"), orderBy("submittedAt", "desc"), limit(300)))
      ]);

      // 3. MAP DATA
      const feedbacks = fbSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const residentsData = resSnap.docs.map(doc => doc.data());
      
      const docRequestsData = docSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const facilityRequestsData = facSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const generalAttendees = attSnap.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, programName: d.programName || d.eventName || doc.ref.parent.parent?.id || "General Program", ...d };
      });
      
      const livelihoodAttendees = livSnap.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, programName: d.programName || d.eventName || "Livelihood Program", ...d };
      });
      
      const incidentData = incSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const bswdData = bswdSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 4. CALCULATE PENDING STATS
      const docPending = docRequestsData.filter(d => d.status === "Pending").length;
      const facPending = facilityRequestsData.filter(d => d.status === "Pending").length;

      // 5. RETURN ALL STATE TO REACT QUERY
      return {
        feedbacks,
        residentsData,
        docRequestsData,
        facilityRequestsData,
        generalAttendees,
        livelihoodAttendees,
        incidentData,
        bswdData,
        stats: {
          households: hhCount.data().count,
          residents: resCount.data().count,
          pendingApprovals: pendingCount.data().count,
          docRequests: docPending,
          facilityRequests: facPending
        }
      };
    },
    // Keep data fresh in memory for 10 minutes before checking Firebase again
    staleTime: 1000 * 60 * 10,
    // Keep inactive data cached for 30 minutes
    gcTime: 1000 * 60 * 30,
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="main-content" style={{ padding: "40px", textAlign: "center" }}>
          <h2>Loading Analytics... (This may take a moment)</h2>
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <div className="main-content" style={{ padding: "40px", textAlign: "center", color: "#b91c1c" }}>
          <h2>Analytics failed to load.</h2>
          <p style={{ background: "#fee2e2", padding: "16px", borderRadius: "8px", display: "inline-block" }}>
            {error.message}
          </p>
        </div>
      </AdminLayout>
    );
  }

  // Destructure the data provided by React Query
  const { 
    feedbacks, residentsData, docRequestsData, facilityRequestsData, 
    generalAttendees, livelihoodAttendees, incidentData, bswdData, stats 
  } = data;

  return (
    <AdminLayout>
      <div className="main-content">

        {/* TOP HEADER */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#1e293b" }}>
            Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Welcome back — here's what's happening in your barangay.
          </p>
        </div>

        {/* PINNED: SUMMARY CARDS */}
        <DashboardSummaryCards 
          stats={stats} 
          totalFeedbacks={feedbacks.length} 
        />

        {/* TAB NAVIGATION */}
        <div className="analytics-tabs-container">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`analytics-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div style={{ minHeight: "400px" }}>
          
          {/* TAB: RESIDENT ANALYTICS */}
          {activeTab === 'resident' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                <h1 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Resident Analytics</h1>
                <div className="resident-analytics-grid">
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#1e293b' }}>Resident Demographic</h2>
                    <ResidentDemographics data={residentsData} />
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#1e293b' }}>Age Distribution</h2>
                    <AgeAnalytics data={residentsData} />
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#1e293b' }}>Sex Assigned at Birth</h2>
                    <SexAnalytics data={residentsData} />
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#1e293b' }}>Gender Orientation</h2>
                    <GenderOrientationAnalytics data={residentsData} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SERVICES & FACILITIES */}
          {activeTab === 'services' && (
            <ServiceFacilityAnalytics 
              docRequestsData={docRequestsData} 
              facilityRequestsData={facilityRequestsData} 
            />
          )}

          {/* TAB: PROGRAMS & LIVELIHOOD */}
          {activeTab === 'programs' && (
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Program & Livelihood Attendance</h1>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Total registered residents across all programs</p>
              <ProgramAnalytics data={[...generalAttendees, ...livelihoodAttendees]} />
            </div>
          )}

          {/* TAB: SENTIMENT & SATISFACTION */}
          {activeTab === 'sentiment' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              <SentimentSummaryCard feedbacks={feedbacks} />
              <div style={{ flex: '2 1 500px' }}>
                <SentimentComparisonChart />
              </div>
            </div>
          )}

          {/* TAB: PEACE & ORDER */}
          {activeTab === 'peace' && (
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Peace & Order Overview</h1>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Analytics for incident reports, urgency levels, and location hotspots</p>
              <PeaceAndOrderAnalytics data={incidentData} />
            </div>
          )}

          {/* TAB: SOCIAL WELFARE (BSWD) */}
          {activeTab === 'bswd' && (
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Social Welfare (BSWD) Overview</h1>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Analytics for displaced persons reports, tips, and sighting locations</p>
              <BSWDAnalytics data={bswdData} />
            </div>
          )}

        </div>

        {/* PINNED: AI INSIGHTS */}
        <div className="section" style={{ marginTop: '32px' }}>
          <div className="dashboard-section">
            <AIInsightsWidget feedbacks={feedbacks} />
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}