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
  where,
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

// ─── OPTIMIZATION: SHARED QUERY CONFIG ───
// This stops React Query from burning reads every time the admin switches browser tabs
const OPTIMIZED_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 30,     // Data stays fresh for 30 minutes
  gcTime: 1000 * 60 * 60,        // Keep in cache for 60 minutes
  refetchOnWindowFocus: false,   // Prevents alt-tab read burns
  refetchOnMount: false,         // Prevents refetching if navigating between internal pages
  retry: false,
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('resident');

  // ─── 1. CORE SUMMARY QUERY ───
  const { data: summaryData, isLoading: isSummaryLoading, isError: isSummaryError, error: summaryError } = useQuery({
    queryKey: ['adminDashboard_summary'],
    queryFn: async () => {
      const [hhCount, resCount, pendingCount, docPendingCount, facPendingCount, fbSnap] = await Promise.all([
        getCountFromServer(collection(db, "households")),
        getCountFromServer(collectionGroup(db, "residents")),
        getCountFromServer(collection(db, "pending_registrations")),
        getCountFromServer(query(collection(db, "document_requests"), where("status", "==", "Pending"))),
        getCountFromServer(query(collection(db, "facility_reservations"), where("status", "==", "Pending"))),
        // OPTIMIZATION: Reduced limit from 300 to 150. AI insights rarely need more than the latest 150 feedbacks.
        getDocs(query(collection(db, "feedback"), orderBy("createdAt", "desc"), limit(150)))
      ]);

      return {
        feedbacks: fbSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        stats: {
          households: hhCount.data().count,
          residents: resCount.data().count,
          pendingApprovals: pendingCount.data().count,
          docRequests: docPendingCount.data().count,
          facilityRequests: facPendingCount.data().count
        }
      };
    },
    ...OPTIMIZED_QUERY_OPTIONS
  });

  // ─── 2. LAZY LOADED TAB QUERIES ───

  const { data: residentData, isLoading: isResidentLoading } = useQuery({
    queryKey: ['adminDashboard_resident'],
    queryFn: async () => {
      // OPTIMIZATION: Cap at 300 to prevent massive payload downloads on large populations
      const snap = await getDocs(query(collectionGroup(db, "residents"), limit(300)));
      return snap.docs.map(doc => doc.data());
    },
    enabled: activeTab === 'resident',
    ...OPTIMIZED_QUERY_OPTIONS
  });

  const { data: servicesData, isLoading: isServicesLoading } = useQuery({
    queryKey: ['adminDashboard_services'],
    queryFn: async () => {
      const [docSnap, facSnap, equSnap, invSnap] = await Promise.all([
        getDocs(query(collection(db, "document_requests"), orderBy("submittedAt", "desc"), limit(150))),
        getDocs(query(collection(db, "facility_reservations"), orderBy("submittedAt", "desc"), limit(150))),
        getDocs(query(collection(db, "equipment_rentals"), orderBy("submittedAt", "desc"), limit(150))),
        getDocs(collection(db, "equipment"))
      ]);
      return {
        docRequestsData: docSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        facilityRequestsData: facSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        equipmentData: equSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        inventoryData: invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      };
    },
    enabled: activeTab === 'services',
    ...OPTIMIZED_QUERY_OPTIONS
  });

  const { data: programsData, isLoading: isProgramsLoading } = useQuery({
    queryKey: ['adminDashboard_programs'],
    queryFn: async () => {
      const [attSnap, livSnap] = await Promise.all([
        getDocs(query(collectionGroup(db, "attendees"), limit(200))),
        getDocs(query(collection(db, "livelihoodRegistrations"), limit(200)))
      ]);
      const generalAttendees = attSnap.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, programName: d.programName || d.eventName || doc.ref.parent.parent?.id || "General Program", ...d };
      });
      const livelihoodAttendees = livSnap.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, programName: d.programName || d.eventName || "Livelihood Program", ...d };
      });
      return [...generalAttendees, ...livelihoodAttendees];
    },
    enabled: activeTab === 'programs',
    ...OPTIMIZED_QUERY_OPTIONS
  });

  const { data: peaceData, isLoading: isPeaceLoading } = useQuery({
    queryKey: ['adminDashboard_peace'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "incidentReports"), orderBy("submittedAt", "desc"), limit(150)));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: activeTab === 'peace',
    ...OPTIMIZED_QUERY_OPTIONS
  });

  const { data: bswdData, isLoading: isBswdLoading } = useQuery({
    queryKey: ['adminDashboard_bswd'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "bswdReports"), orderBy("submittedAt", "desc"), limit(150)));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: activeTab === 'bswd',
    ...OPTIMIZED_QUERY_OPTIONS
  });

  // ─── RENDER LOGIC ───

  if (isSummaryError) {
    return (
      <AdminLayout>
        <div className="main-content" style={{ padding: "40px", textAlign: "center", color: "#b91c1c" }}>
          <h2>Analytics failed to load.</h2>
          <p style={{ background: "#fee2e2", padding: "16px", borderRadius: "8px", display: "inline-block" }}>
            {summaryError?.message || "Unknown error occurred"}
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (isSummaryLoading || !summaryData) {
    return (
      <AdminLayout>
        <div className="main-content" style={{ padding: "40px", textAlign: "center" }}>
          <h2>Loading Dashboard... (This may take a moment)</h2>
        </div>
      </AdminLayout>
    );
  }

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
          stats={summaryData.stats} 
          totalFeedbacks={summaryData.feedbacks.length} 
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
            isResidentLoading ? <p>Loading resident data...</p> :
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                <h1 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Resident Analytics</h1>
                <div className="resident-analytics-grid">
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#1e293b' }}>Resident Demographic</h2>
                    <ResidentDemographics data={residentData} />
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#1e293b' }}>Age Distribution</h2>
                    <AgeAnalytics data={residentData} />
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#1e293b' }}>Sex Assigned at Birth</h2>
                    <SexAnalytics data={residentData} />
                  </div>
                  <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#1e293b' }}>Gender Orientation</h2>
                    <GenderOrientationAnalytics data={residentData} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SERVICES & FACILITIES */}
          {activeTab === 'services' && (
            isServicesLoading ? <p>Loading services data...</p> :
            <ServiceFacilityAnalytics 
              docRequestsData={servicesData.docRequestsData} 
              facilityRequestsData={servicesData.facilityRequestsData}
              equipmentData={servicesData.equipmentData}
              inventoryData={servicesData.inventoryData}
            />
          )}

          {/* TAB: PROGRAMS & LIVELIHOOD */}
          {activeTab === 'programs' && (
            isProgramsLoading ? <p>Loading programs data...</p> :
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Program & Livelihood Attendance</h1>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Total registered residents across all programs</p>
              <ProgramAnalytics data={programsData} />
            </div>
          )}

          {/* TAB: SENTIMENT & SATISFACTION */}
          {activeTab === 'sentiment' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              <SentimentSummaryCard feedbacks={summaryData.feedbacks} />
              <div style={{ flex: '2 1 500px' }}>
                <SentimentComparisonChart />
              </div>
            </div>
          )}

          {/* TAB: PEACE & ORDER */}
          {activeTab === 'peace' && (
            isPeaceLoading ? <p>Loading incident data...</p> :
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h1 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Peace & Order Overview</h1>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Analytics for incident reports, urgency levels, and location hotspots</p>
              <PeaceAndOrderAnalytics data={peaceData} />
            </div>
          )}

          {/* TAB: SOCIAL WELFARE (BSWD) */}
          {activeTab === 'bswd' && (
            isBswdLoading ? <p>Loading welfare data...</p> :
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
            <AIInsightsWidget feedbacks={summaryData.feedbacks} />
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}