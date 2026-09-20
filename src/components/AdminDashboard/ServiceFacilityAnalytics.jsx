import React, { useState, useMemo } from "react";
import RequestAnalytics from './RequestAnalytics';
import AIInsightsCard from '../AIInsightsCard'; 
import EquipmentAnalytics from './EquipmentAnalytics';

// Helper for safe timestamp extraction
const safeDate = (ts) => {
  if (!ts) return "Recent";
  if (ts.toDate) return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Helper to find the most frequent item in an array
const getTopItem = (arr, key) => {
  if (!arr || !arr.length) return "N/A";
  const counts = {};
  let maxCount = 0;
  let topItem = "N/A";
  arr.forEach(item => {
    const val = item[key];
    if (val) {
      counts[val] = (counts[val] || 0) + 1;
      if (counts[val] > maxCount) {
        maxCount = counts[val];
        topItem = val;
      }
    }
  });
  return topItem;
};

export default function ServiceFacilityAnalytics({ docRequestsData = [], facilityRequestsData = [], equipmentData = [], inventoryData = [] }) {
  const [requestTimeFilter, setRequestTimeFilter] = useState('Month');
  const [activeTab, setActiveTab] = useState('overview'); // overview, documents, facilities, equipment

  // --- CALCULATE IN-DEPTH DOCUMENT STATS ---
  const docStats = useMemo(() => {
    const pending = docRequestsData.filter(d => d.status === 'Pending').length;
    const processing = docRequestsData.filter(d => d.status === 'Processing').length;
    const completed = docRequestsData.filter(d => ['Ready for Pickup', 'Completed', 'Released'].includes(d.status)).length;
    const topDoc = getTopItem(docRequestsData, 'documentType');
    return { total: docRequestsData.length, pending, processing, completed, topDoc };
  }, [docRequestsData]);

  // --- CALCULATE IN-DEPTH FACILITY STATS ---
  const facStats = useMemo(() => {
    const pending = facilityRequestsData.filter(d => d.status === 'Pending').length;
    const approved = facilityRequestsData.filter(d => d.status === 'Approved').length;
    const rejected = facilityRequestsData.filter(d => d.status === 'Rejected' || d.status === 'Cancelled').length;
    const topFac = getTopItem(facilityRequestsData, 'facilityName');
    return { total: facilityRequestsData.length, pending, approved, rejected, topFac };
  }, [facilityRequestsData]);

  // --- REUSABLE STAT CARD COMPONENT ---
  const StatCard = ({ title, value, subtitle, colorTheme }) => (
    <div style={{ background: colorTheme.bg, border: `1px solid ${colorTheme.border}`, borderRadius: "10px", padding: "16px" }}>
      <div style={{ fontSize: "0.85rem", color: colorTheme.textSoft, fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colorTheme.dot }} />
        {title}
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: colorTheme.textHard, marginTop: "8px" }}>
        {value}
      </div>
      {subtitle && <div style={{ fontSize: "0.75rem", color: colorTheme.textSoft, marginTop: "4px" }}>{subtitle}</div>}
    </div>
  );

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
      
      {/* HEADER & TIME FILTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ margin: '0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>Service, Facility & Equipment Hub</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Manage requests, view trends, and track inventory.</p>
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
            {['Day', 'Month'].map(tf => (
              <button 
                key={tf}
                onClick={() => setRequestTimeFilter(tf)}
                style={{ 
                  padding: '6px 16px', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                  background: requestTimeFilter === tf ? '#fff' : 'transparent', 
                  fontWeight: requestTimeFilter === tf ? 600 : 500, 
                  color: requestTimeFilter === tf ? '#0f172a' : '#64748b', 
                  boxShadow: requestTimeFilter === tf ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' 
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
        {[
          { id: 'overview', label: 'Overview Trends' },
          { id: 'documents', label: 'Documents' },
          { id: 'facilities', label: 'Facilities' },
          { id: 'equipment', label: 'Equipment' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: activeTab === tab.id ? '#317d89' : '#f8fafc',
              color: activeTab === tab.id ? '#fff' : '#64748b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: OVERVIEW (Charts & AI) */}
      {activeTab === 'overview' && (
        <div className="fade-in">
          <RequestAnalytics 
            docRequests={docRequestsData} 
            facilityRequests={facilityRequestsData} 
            equipmentRequests={equipmentData}
            timeFilter={requestTimeFilter} 
          />

          <AIInsightsCard 
            documentData={docRequestsData.map(d => ({
              date: safeDate(d.createdAt || d.submittedAt || d.date),
              type: d.documentType || d.type || "Document",
              count: 1
            }))}
            facilityData={facilityRequestsData.map(d => ({
              date: safeDate(d.createdAt || d.submittedAt || d.date),
              type: d.facilityName || d.facility || "Facility",
              count: 1
            }))}
            equipmentData={equipmentData.map(d => ({
              date: safeDate(d.createdAt || d.submittedAt || d.date),
              type: d.equipmentName || d.equipment || "Equipment",
              count: 1
            }))}
            dateRange={`Filtered by: ${requestTimeFilter}`}
          />
        </div>
      )}

      {/* TAB CONTENT: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <StatCard 
              title="Total Requests" 
              value={docStats.total} 
              subtitle="All time requests"
              colorTheme={{ bg: '#f8fafc', border: '#e2e8f0', textSoft: '#64748b', textHard: '#0f172a', dot: '#94a3b8' }} 
            />
            <StatCard 
              title="Pending Approval" 
              value={docStats.pending} 
              subtitle="Requires admin action"
              colorTheme={{ bg: '#fffbeb', border: '#fcd34d', textSoft: '#92400e', textHard: '#78350f', dot: '#f59e0b' }} 
            />
            <StatCard 
              title="Processing" 
              value={docStats.processing} 
              subtitle="Currently being drafted"
              colorTheme={{ bg: '#eff6ff', border: '#bfdbfe', textSoft: '#1e40af', textHard: '#1e3a8a', dot: '#3b82f6' }} 
            />
            <StatCard 
              title="Completed / Released" 
              value={docStats.completed} 
              subtitle="Successfully fulfilled"
              colorTheme={{ bg: '#f0fdf4', border: '#bbf7d0', textSoft: '#166534', textHard: '#14532d', dot: '#22c55e' }} 
            />
          </div>
          <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Most Requested Document:</span>
            <span style={{ marginLeft: '8px', fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6' }}>{docStats.topDoc}</span>
          </div>
        </div>
      )}

      {/* TAB CONTENT: FACILITIES */}
      {activeTab === 'facilities' && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <StatCard 
              title="Total Reservations" 
              value={facStats.total} 
              subtitle="All time requests"
              colorTheme={{ bg: '#f8fafc', border: '#e2e8f0', textSoft: '#64748b', textHard: '#0f172a', dot: '#94a3b8' }} 
            />
            <StatCard 
              title="Pending Approval" 
              value={facStats.pending} 
              subtitle="Awaiting schedule check"
              colorTheme={{ bg: '#fffbeb', border: '#fcd34d', textSoft: '#92400e', textHard: '#78350f', dot: '#f59e0b' }} 
            />
            <StatCard 
              title="Approved" 
              value={facStats.approved} 
              subtitle="Scheduled & Confirmed"
              colorTheme={{ bg: '#f0fdf4', border: '#bbf7d0', textSoft: '#166534', textHard: '#14532d', dot: '#22c55e' }} 
            />
            <StatCard 
              title="Rejected / Cancelled" 
              value={facStats.rejected} 
              subtitle="Schedule conflicts"
              colorTheme={{ bg: '#fef2f2', border: '#fecaca', textSoft: '#991b1b', textHard: '#7f1d1d', dot: '#ef4444' }} 
            />
          </div>
          <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Most Popular Facility:</span>
            <span style={{ marginLeft: '8px', fontSize: '1.1rem', fontWeight: 700, color: '#ec4899' }}>{facStats.topFac}</span>
          </div>
        </div>
      )}

      {/* TAB CONTENT: EQUIPMENT */}
      {activeTab === 'equipment' && (
        <div className="fade-in">
          {/* We reuse the dedicated Equipment component we just built, hiding its duplicate container styling */}
          <div style={{ margin: "-24px -24px 0 -24px" }}>
             <EquipmentAnalytics data={equipmentData} inventoryData={inventoryData} />
          </div>
        </div>
      )}
      
      <style>{`
        .fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}