import React, { useState, useMemo } from 'react';
import { getSmartSuggestions } from '../services/suggestionEngine';
import { Lightbulb, AlertTriangle, Clock, Calendar, Activity, MapPin } from 'lucide-react';

export default function AIInsightsWidget({ feedbacks }) {
  const [timeframe, setTimeframe] = useState('Month');
  
  const [selectedFacility, setSelectedFacility] = useState('Overall');

  const uniqueFacilities = useMemo(() => {
    if (!feedbacks) return ['Overall'];
    const facilities = feedbacks
      .map(f => f.FacilityName || f.Facility || "Unknown")
      .filter((val, index, self) => self.indexOf(val) === index && val !== "Unknown");
    
    return ['Overall', ...facilities];
  }, [feedbacks]);

  const topInsight = useMemo(() => {
    if (!feedbacks || feedbacks.length === 0) return null;

    const now = new Date();
    const cutoffDate = new Date();

    if (timeframe === 'Day') cutoffDate.setDate(now.getDate() - 1);
    if (timeframe === 'Week') cutoffDate.setDate(now.getDate() - 7);
    if (timeframe === 'Month') cutoffDate.setDate(now.getDate() - 30);

    const validIssues = feedbacks.filter((f) => {
      if (!f.CreatedAt) return false;
      const feedbackDate = f.CreatedAt.toDate ? f.CreatedAt.toDate() : new Date(f.CreatedAt);
      
      const matchesFacility = selectedFacility === 'Overall' || 
                              (f.FacilityName === selectedFacility || f.Facility === selectedFacility);

      return (
        feedbackDate >= cutoffDate && 
        matchesFacility && // Apply the facility filter here
        f.DetectedIssue && 
        f.DetectedIssue !== "None" && 
        f.DetectedIssue !== "Uncategorized Complaint"
      );
    });

    if (validIssues.length === 0) return null;

    const issueCounts = {};
    validIssues.forEach(f => {
      issueCounts[f.DetectedIssue] = (issueCounts[f.DetectedIssue] || 0) + 1;
    });

    let topIssue = null;
    let maxCount = 0;
    for (const [issue, count] of Object.entries(issueCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topIssue = issue;
      }
    }

    const suggestions = getSmartSuggestions(topIssue);

    return {
      issue: topIssue,
      count: maxCount,
      advice: suggestions
    };
  }, [feedbacks, timeframe, selectedFacility]); // Added selectedFacility to dependency array

  return (
    <div className="ai-insights-card">
      {/* Header & Controls */}
      <div className="ai-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h3 className="ai-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Lightbulb size={20} className="ai-icon-primary" color="#d97706" /> 
          Operational AI Insights
        </h3>
        
        <div className="ai-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px' }}>
            <MapPin size={14} color="#64748b" style={{ marginRight: '6px' }} />
            <select 
              value={selectedFacility} 
              onChange={(e) => setSelectedFacility(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: '#334155', padding: '4px 0', cursor: 'pointer' }}
            >
              {uniqueFacilities.map(fac => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>
          </div>

          <div className="ai-tabs" style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
            {['Day', 'Week', 'Month'].map((tab) => (
              <button
                key={tab}
                onClick={() => setTimeframe(tab)}
                style={{
                  border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer',
                  background: timeframe === tab ? '#fff' : 'transparent',
                  color: timeframe === tab ? '#0f172a' : '#64748b',
                  boxShadow: timeframe === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: timeframe === tab ? '600' : '400'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="ai-content" style={{ marginTop: '20px' }}>
        {!topInsight ? (
          <div className="ai-empty-state" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <Activity size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p style={{ margin: 0 }}>No major operational issues detected for <strong>{selectedFacility}</strong> in this {timeframe.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="ai-issue-box" style={{ border: '1px solid #fef3c7', background: '#fffbeb', borderRadius: '8px', padding: '20px' }}>
            
            <div className="ai-issue-header" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div className="ai-warning-icon" style={{ background: '#fef08a', padding: '10px', borderRadius: '8px', color: '#b45309' }}>
                <AlertTriangle size={24} />
              </div>
              <div className="ai-issue-text">
                <span className="ai-issue-label" style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Top Recurring Issue ({selectedFacility})
                </span>
                <h4 className="ai-issue-name" style={{ margin: '4px 0', fontSize: '1.25rem', color: '#78350f' }}>{topInsight.issue}</h4>
                <p className="ai-issue-stats" style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
                  Detected <strong>{topInsight.count} times</strong> in the past {
                    timeframe === 'Day' ? '24 hours' : timeframe === 'Week' ? '7 days' : '30 days'
                  }.
                </p>
              </div>
            </div>

            {topInsight.advice && (
              <div className="ai-suggestions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', borderTop: '1px solid #fde68a', paddingTop: '16px' }}>
                <div className="ai-suggestion-col immediate">
                  <h5 style={{ margin: '0 0 12px 0', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> Immediate Actions</h5>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#78350f', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {topInsight.advice.actions.map((act, i) => <li key={i}>{act}</li>)}
                  </ul>
                </div>
                <div className="ai-suggestion-col strategy">
                  <h5 style={{ margin: '0 0 12px 0', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> Long-Term Strategy</h5>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#78350f', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {topInsight.advice.strategy.map((strat, i) => <li key={i}>{strat}</li>)}
                  </ul>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}