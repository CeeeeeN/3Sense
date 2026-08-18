import React, { useState, useMemo } from "react";
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

export default function SentimentSummaryCard({ feedbacks }) {
  const [selectedFacility, setSelectedFacility] = useState('Overall');

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

  return (
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
  );
}