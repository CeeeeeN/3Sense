import React, { useState, useMemo } from 'react';
import { getSmartSuggestions } from '../services/suggestionEngine';
import { Lightbulb, AlertTriangle, Clock, Calendar, Activity, Layers } from 'lucide-react';

export default function AIInsightsWidget({ feedbacks }) {
  const [timeframe, setTimeframe] = useState('Month');
  const [selectedItem, setSelectedItem] = useState('Overall');

  // STATIC: Added the new services to the dropdown list
  const availableItems = [
    'Overall', 
    'Documents', 
    'Facilities', 
    'Equipment', 
    'Programs',
    'Peace and Order',
    'BOSCA',
    'BADAC',
    'BSWD',
    'VAWC',
    'Livelihood'
  ];

  // Helper function to aggressively group all items into their main parent categories
  const getItemName = (f) => {
    // Combine possible database fields into one lowercase string to check against
    const typeStr = [
      f.type, f.Type, f.serviceType, f.ServiceType, 
      f.service, f.Service, f.category
    ].join(" ").toLowerCase();

    // 1. Check for specific specialized services first
    if (typeStr.includes('vawc') || typeStr.includes('violence') || typeStr.includes('women') || typeStr.includes('children')) return 'VAWC';
    if (typeStr.includes('bswd') || typeStr.includes('welfare') || typeStr.includes('social')) return 'BSWD';
    if (typeStr.includes('badac') || typeStr.includes('drug') || typeStr.includes('anti-drug')) return 'BADAC';
    if (typeStr.includes('bosca') || typeStr.includes('sports') || typeStr.includes('youth')) return 'BOSCA';
    if (typeStr.includes('peace') || typeStr.includes('order') || typeStr.includes('tanod') || typeStr.includes('security')) return 'Peace and Order';
    if (typeStr.includes('livelihood') || typeStr.includes('job') || typeStr.includes('employment')) return 'Livelihood';
    
    // 2. Group all programs
    if (typeStr.includes('prog') || f.programName || f.ProgramName) {
      return 'Programs';
    }
    
    // 3. Group all equipment
    if (typeStr.includes('equip') || f.equipmentName || f.EquipmentName || f.equipment || f.Equipment) {
      return 'Equipment';
    }

    // 4. Group all documents
    if (typeStr.includes('doc') || typeStr.includes('req') || typeStr.includes('clearance') || typeStr.includes('permit') || f.documentType || f.DocumentType || f.documentName || f.DocumentName || f.requestType) {
      return 'Documents';
    }
    
    // 5. Group all facilities
    if (typeStr.includes('fac') || typeStr.includes('res') || typeStr.includes('court') || typeStr.includes('hall') || f.facilityName || f.FacilityName || f.facility || f.Facility) {
      return 'Facilities';
    }
    
    // Fallback for anything else
    return 'Other';
  };

  const topInsight = useMemo(() => {
    if (!feedbacks || feedbacks.length === 0) return null;

    const now = new Date();
    const cutoffDate = new Date();

    if (timeframe === 'Day') cutoffDate.setDate(now.getDate() - 1);
    if (timeframe === 'Week') cutoffDate.setDate(now.getDate() - 7);
    if (timeframe === 'Month') cutoffDate.setDate(now.getDate() - 30);

    const validIssues = feedbacks.filter((f) => {
      const timestamp = f.createdAt || f.CreatedAt;
      if (!timestamp) return false;
      
      const feedbackDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      const itemName = getItemName(f);
      const matchesItem = selectedItem === 'Overall' || itemName === selectedItem;

      const issue = f.detectedIssue || f.DetectedIssue;

      return (
        feedbackDate >= cutoffDate && 
        matchesItem && 
        issue && 
        issue !== "None" && 
        issue !== "Uncategorized Complaint"
      );
    });

    if (validIssues.length === 0) return null;

    const issueCounts = {};
    validIssues.forEach(f => {
      const issue = f.detectedIssue || f.DetectedIssue;
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
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
  }, [feedbacks, timeframe, selectedItem]); 

  return (
    <div className="ai-insights-card">
      {/* Header & Controls */}
      <div className="ai-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h3 className="ai-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Lightbulb size={20} className="ai-icon-primary" color="#d97706" /> 
          Service AI Insights
        </h3>
        
        <div className="ai-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px' }}>
            <Layers size={14} color="#64748b" style={{ marginRight: '6px' }} />
            <select 
              value={selectedItem} 
              onChange={(e) => setSelectedItem(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: '#334155', padding: '4px 0', cursor: 'pointer', minWidth: '120px' }}
            >
              {availableItems.map(item => (
                <option key={item} value={item}>{item}</option>
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
            <p style={{ margin: 0 }}>No major operational issues detected for <strong>{selectedItem}</strong> in this {timeframe.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="ai-issue-box" style={{ border: '1px solid #fef3c7', background: '#fffbeb', borderRadius: '8px', padding: '20px' }}>
            
            <div className="ai-issue-header" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div className="ai-warning-icon" style={{ background: '#fef08a', padding: '10px', borderRadius: '8px', color: '#b45309' }}>
                <AlertTriangle size={24} />
              </div>
              <div className="ai-issue-text">
                <span className="ai-issue-label" style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Top Recurring Issue ({selectedItem})
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