import React, { useState, useEffect, useMemo } from "react";
import "../AdminStyle.css";
import AdminLayout from "../components/AdminLayout";
import AIInsightsWidget from "../components/AIInsightsWidget";
import SentimentComparisonChart from '../components/SentimentComparisonChart';
import ResidentDemographics from '../components/AdminDashboard/ResidentDemographics';
import AgeAnalytics from '../components/AdminDashboard/AgeAnalytics';
import SexAnalytics from '../components/AdminDashboard/SexAnalytics';
import GenderOrientationAnalytics from '../components/AdminDashboard/GenderOrientationAnalytics';
import RequestAnalytics from '../components/AdminDashboard/RequestAnalytics';
import ProgramAnalytics from '../components/AdminDashboard/ProgramAnalytics';
import PeaceAndOrderAnalytics from '../components/AdminDashboard/PeaceAndOrderAnalytics';
import BSWDAnalytics from '../components/AdminDashboard/BSWDAnalytics';
import { db } from "../firebase/firebase";
import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { MapPin } from "lucide-react";

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
  const [selectedFacility, setSelectedFacility] = useState('Overall');
  const [residentsData, setResidentsData] = useState([]);
  const [docRequestsData, setDocRequestsData] = useState([]);
  const [facilityRequestsData, setFacilityRequestsData] = useState([]);
  const [requestTimeFilter, setRequestTimeFilter] = useState('Month');
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

    // Fetch ALL doc requests for the chart, but count pending for the cards
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

    // Fetch ALL facility requests for the chart, but count pending for the cards
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

    // 1. Fetch from the 'attendees' subcollection inside 'Programs'
    // collectionGroup searches EVERY subcollection named 'attendees' in your entire database
    const unsubAttendees = onSnapshot(collectionGroup(db, "attendees"), (snapshot) => {
      const atts = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // If the attendee document doesn't save the program name directly, 
        // we can cleverly extract the Program's ID from the parent path!
        const parentId = doc.ref.parent.parent?.id; 
        const name = data.programName || data.eventName || parentId || "General Program";
        
        atts.push({ id: doc.id, programName: name, ...data });
      });
      setGeneralAttendees(atts);
    });

    // 2. Fetch from the standalone 'livelihoodRegistrations' collection
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

  const totalActiveRequests = stats.docRequests + stats.facilityRequests;

  const uniqueFacilities = useMemo(() => {
    if (!feedbacks || feedbacks.length === 0) return ['Overall'];
    const facilities = feedbacks
      .map(f => f.FacilityName || f.Facility || "Unknown")
      .filter((val, index, self) => self.indexOf(val) === index && val !== "Unknown");
    
    return ['Overall', ...facilities];
  }, [feedbacks]);

  const sentimentStats = useMemo(() => {
    const filtered = feedbacks.filter(f => {
      if (selectedFacility === 'Overall') return true;
      return f.FacilityName === selectedFacility || f.Facility === selectedFacility;
    });

    const total = filtered.length;
    if (total === 0) return null;

    let pos = 0, neu = 0, neg = 0;
    filtered.forEach(f => {
      const s = (f.Sentiment || "").toLowerCase();
      if (s === 'positive') pos++;
      else if (s === 'neutral') neu++;
      else if (s === 'negative') neg++;
    });

    return {
      total,
      Positive: parseFloat(((pos / total) * 100).toFixed(1)),
      Neutral: parseFloat(((neu / total) * 100).toFixed(1)),
      Negative: parseFloat(((neg / total) * 100).toFixed(1))
    };
  }, [feedbacks, selectedFacility]);

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
        <div className="card-grid">
          <div className="card">Total Households<br /><strong>{stats.households}</strong></div>
          <div className="card">Total Residents<br /><strong>{stats.residents}</strong></div>
          <div className="card">Active Requests<br /><strong>{totalActiveRequests}</strong></div>
          <div className="card">Pending Approvals<br /><strong>{stats.pendingApprovals}</strong></div>
          <div className="card">Total Feedbacks<br /><strong>{feedbacks.length}</strong></div>
        </div>

        {/* ROW 1: RESIDENT DEMOGRAPHICS (4 Columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '24px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
            <h1 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Resident Analytics</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
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
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h1 style={{ margin: '0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Service & Facility Usage Trends</h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Volume of document and facility requests</p>
            </div>

            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
              <button 
                onClick={() => setRequestTimeFilter('Day')}
                style={{ 
                  padding: '6px 16px', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                  background: requestTimeFilter === 'Day' ? '#fff' : 'transparent', 
                  fontWeight: requestTimeFilter === 'Day' ? 600 : 500, 
                  color: requestTimeFilter === 'Day' ? '#0f172a' : '#64748b', 
                  boxShadow: requestTimeFilter === 'Day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' 
                }}
              >
                Day
              </button>
              <button 
                onClick={() => setRequestTimeFilter('Month')}
                style={{ 
                  padding: '6px 16px', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                  background: requestTimeFilter === 'Month' ? '#fff' : 'transparent', 
                  fontWeight: requestTimeFilter === 'Month' ? 600 : 500, 
                  color: requestTimeFilter === 'Month' ? '#0f172a' : '#64748b', 
                  boxShadow: requestTimeFilter === 'Month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' 
                }}
              >
                Month
              </button>
            </div>
          </div>
          <RequestAnalytics 
            docRequests={docRequestsData} 
            facilityRequests={facilityRequestsData} 
            timeFilter={requestTimeFilter} 
          />
        </div>

        {/* ROW 3: PROGRAM ATTENDANCE (Full Width) */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Program & Livelihood Attendance</h1>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Total registered residents across all programs</p>
          <ProgramAnalytics data={[...generalAttendees, ...livelihoodAttendees]} />
        </div>

        {/* ROW 4: SENTIMENT & SATISFACTION (2 Columns) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
          <div style={{ flex: '1 1 350px', background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Community Sentiment Summary</h2>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px' }}>
                <MapPin size={16} color="#64748b" style={{ marginRight: '6px' }} />
                <select 
                  value={selectedFacility} 
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}
                >
                  {uniqueFacilities.map(fac => <option key={fac} value={fac}>{fac}</option>)}
                </select>
              </div>
            </div>

            {!sentimentStats ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', minHeight: '150px' }}>
                No sentiment data available.
              </div>
            ) : (
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 0, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b', textAlign: 'center' }}>
                  {selectedFacility === 'All Facilities' ? 'Overall Barangay Sentiment' : `${selectedFacility} Sentiment`}
                </div>
                <div className="sentiment" style={{ display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
                  <span className="positive" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span className="face"><SmileIcon /></span>{sentimentStats.Positive}%
                  </span>
                  <span className="neutral" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span className="face"><NeutralIcon /></span>{sentimentStats.Neutral}%
                  </span>
                  <span className="negative" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span className="face"><FrownIcon /></span>{sentimentStats.Negative}%
                  </span>
                </div>
                <div style={{ marginTop: '20px', fontSize: '0.85rem', color: '#64748b', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  Based on <strong>{sentimentStats.total}</strong> feedback entries
                </div>
              </div>
            )}
          </div>

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