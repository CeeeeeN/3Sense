import React, { useState, useEffect } from "react";
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

// ── EXTRACTED COMPONENTS ────────────────────────────────────────────────
import DashboardSummaryCards from '../components/AdminDashboard/DashboardSummaryCards';
import SentimentSummaryCard from '../components/AdminDashboard/SentimentSummaryCard';
import ServiceFacilityAnalytics from '../components/AdminDashboard/ServiceFacilityAnalytics';
// ────────────────────────────────────────────────────────────────────────

import { db } from "../firebase/firebase";
import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

export default function AdminDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [residentsData, setResidentsData] = useState([]);
  const [docRequestsData, setDocRequestsData] = useState([]);
  const [facilityRequestsData, setFacilityRequestsData] = useState([]);
  const [generalAttendees, setGeneralAttendees] = useState([]);
  const [livelihoodAttendees, setLivelihoodAttendees] = useState([]);
  const [incidentData, setIncidentData] = useState([]);
  const [bswdData, setBswdData] = useState([]);

  const [stats, setStats] = useState({
    households: 0,
    residents: 0,
    docRequests: 0,
    facilityRequests: 0,
    pendingApprovals: 0
  });

  useEffect(() => {
    const qFeedbacks = query(collection(db, "Feedback"), orderBy("CreatedAt", "desc"));
    const unsubFeedbacks = onSnapshot(qFeedbacks, (snapshot) => {
      const liveData = [];
      snapshot.forEach((doc) => liveData.push({ id: doc.id, ...doc.data() }));
      setFeedbacks(liveData);
      setLoading(false);
    });

    const unsubHouseholds = onSnapshot(collection(db, "households"), (snapshot) => {
      setStats(prev => ({ ...prev, households: snapshot.size }));
    });

    const unsubResidents = onSnapshot(collectionGroup(db, "residents"), (snapshot) => {
      setStats(prev => ({ ...prev, residents: snapshot.size }));
      const resData = [];
      snapshot.forEach(doc => resData.push(doc.data()));
      setResidentsData(resData);
    });

    const unsubDocRequests = onSnapshot(collection(db, "document_requests"), (snapshot) => {
      const docs = [];
      let pendingCount = 0;
      snapshot.forEach((doc) => {
        const d = doc.data();
        docs.push({ id: doc.id, ...d });
        if (d.status === "Pending") pendingCount++;
      });
      setDocRequestsData(docs);
      setStats(prev => ({ ...prev, docRequests: pendingCount }));
    });

    const unsubFacilityRequests = onSnapshot(collection(db, "facility_reservations"), (snapshot) => {
      const facs = [];
      let pendingCount = 0;
      snapshot.forEach((doc) => {
        const d = doc.data();
        facs.push({ id: doc.id, ...d });
        if (d.status === "Pending") pendingCount++;
      });
      setFacilityRequestsData(facs);
      setStats(prev => ({ ...prev, facilityRequests: pendingCount }));
    });

    const unsubApprovals = onSnapshot(collection(db, "pending_registrations"), (snapshot) => {
      setStats(prev => ({ ...prev, pendingApprovals: snapshot.size }));
    });

    const unsubAttendees = onSnapshot(collectionGroup(db, "attendees"), (snapshot) => {
      const atts = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const parentId = doc.ref.parent.parent?.id; 
        const name = data.programName || data.eventName || parentId || "General Program";
        atts.push({ id: doc.id, programName: name, ...data });
      });
      setGeneralAttendees(atts);
    });

    const unsubLivelihood = onSnapshot(collection(db, "livelihoodRegistrations"), (snapshot) => {
      const lives = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const name = data.programName || data.eventName || "Livelihood Program";
        lives.push({ id: doc.id, programName: name, ...data });
      });
      setLivelihoodAttendees(lives);
    });

    const unsubIncidents = onSnapshot(collection(db, "incidentReports"), (snapshot) => {
      const incidents = [];
      snapshot.forEach(doc => incidents.push({ id: doc.id, ...doc.data() }));
      setIncidentData(incidents);
    });

    const unsubBSWD = onSnapshot(collection(db, "bswdReports"), (snapshot) => {
      const reports = [];
      snapshot.forEach(doc => reports.push({ id: doc.id, ...doc.data() }));
      setBswdData(reports);
    });

    return () => {
      unsubFeedbacks();
      unsubHouseholds();
      unsubResidents();
      unsubDocRequests();
      unsubFacilityRequests();
      unsubApprovals();
      unsubAttendees();
      unsubLivelihood();
      unsubIncidents();
      unsubBSWD();
    };
  }, []);

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

        {/* TOP HEADER */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#1e293b" }}>
            Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            Welcome back — here's what's happening in your barangay.
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <DashboardSummaryCards 
          stats={stats} 
          totalFeedbacks={feedbacks.length} 
        />

        {/* ROW 1: RESIDENT DEMOGRAPHICS (4 Columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '24px' }}>
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

        {/* ROW 2: SERVICE & FACILITY USAGE (Full Width) */}
        <ServiceFacilityAnalytics 
          docRequestsData={docRequestsData} 
          facilityRequestsData={facilityRequestsData} 
        />

        {/* ROW 3: PROGRAM ATTENDANCE (Full Width) */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Program & Livelihood Attendance</h1>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Total registered residents across all programs</p>
          <ProgramAnalytics data={[...generalAttendees, ...livelihoodAttendees]} />
        </div>

        {/* ROW 4: SENTIMENT & SATISFACTION (2 Columns) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
          <SentimentSummaryCard feedbacks={feedbacks} />

          <div style={{ flex: '2 1 500px' }}>
            <SentimentComparisonChart />
          </div>
        </div>

        {/* ROW 5: PEACE & ORDER ANALYTICS */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Peace & Order Overview</h1>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Analytics for incident reports, urgency levels, and location hotspots</p>
          
          <PeaceAndOrderAnalytics data={incidentData} />
        </div>

        {/* ROW 6: BSWD ANALYTICS */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Social Welfare (BSWD) Overview</h1>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Analytics for displaced persons reports, tips, and sighting locations</p>
          
          <BSWDAnalytics data={bswdData} />
        </div>

        {/* ROW 7: AI INSIGHTS */}
        <div className="section" style={{ marginTop: '20px' }}>
          <div className="dashboard-section">
            <AIInsightsWidget feedbacks={feedbacks} />
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}