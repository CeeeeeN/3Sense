import React, { useState } from "react";
import RequestAnalytics from './RequestAnalytics';
import AIInsightsCard from '../AIInsightsCard'; // Adjust path if needed based on your folder structure

// Helper for safe timestamp extraction
const safeDate = (ts) => {
  if (!ts) return "Recent";
  if (ts.toDate) return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function ServiceFacilityAnalytics({ docRequestsData, facilityRequestsData }) {
  const [requestTimeFilter, setRequestTimeFilter] = useState('Month');

  return (
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
        dateRange={`Filtered by: ${requestTimeFilter}`}
      />
    </div>
  );
}