import React, { useState, useMemo } from 'react';
import { getSmartSuggestions } from '../services/suggestionEngine';
import { Lightbulb, AlertTriangle, Clock, Calendar, Activity, Layers } from 'lucide-react';

const AVAILABLE_ITEMS = [
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

// Extracted outside component to prevent re-creation on every render
const getItemName = (f) => {
  const vals = [
    f.type, f.Type, f.serviceType, f.ServiceType, 
    f.service, f.Service, f.category, f.Category,
    f.facilityName, f.FacilityName,
    f.programName, f.ProgramName,
    f.equipmentName, f.EquipmentName,
    f.documentType, f.DocumentType
  ];
  
  const typeStr = vals.filter(Boolean).join(" ").toLowerCase();

  if (typeStr.includes('vawc') || typeStr.includes('violence') || typeStr.includes('women')) return 'VAWC';
  if (typeStr.includes('bswd') || typeStr.includes('welfare') || typeStr.includes('social')) return 'BSWD';
  if (typeStr.includes('badac') || typeStr.includes('drug')) return 'BADAC';
  if (typeStr.includes('bosca') || typeStr.includes('senior')) return 'BOSCA';
  if (typeStr.includes('peace') || typeStr.includes('order') || typeStr.includes('tanod')) return 'Peace and Order';
  if (typeStr.includes('livelihood') || typeStr.includes('job') || typeStr.includes('skill')) return 'Livelihood';
  if (typeStr.includes('prog')) return 'Programs';
  if (typeStr.includes('equip')) return 'Equipment';
  if (typeStr.includes('doc') || typeStr.includes('req') || typeStr.includes('clearance') || typeStr.includes('permit')) return 'Documents';
  if (typeStr.includes('fac') || typeStr.includes('res') || typeStr.includes('court') || typeStr.includes('hall')) return 'Facilities';
  
  return 'Other';
};

export default function AIInsightsWidget({ feedbacks }) {
  const [timeframe, setTimeframe] = useState('Today');
  const [selectedItem, setSelectedItem] = useState('Overall');

  // ─── STAGE 1: HEAVY DATA PRE-PROCESSING ───
  // Runs ONLY when new data arrives from Firestore. Parses dates, strips wrappers, and filters out non-issues.
  const processedFeedbacks = useMemo(() => {
    if (!feedbacks || !Array.isArray(feedbacks) || feedbacks.length === 0) return [];
    
    const nowMs = Date.now();
    const validData = [];

    for (let i = 0; i < feedbacks.length; i++) {
      const raw = feedbacks[i];
      const f = typeof raw.data === 'function' ? raw.data() : (raw.data || raw);

      // Validate Sentiment & Issue FIRST (Don't waste time parsing dates for positive feedback)
      const sentimentStr = String(f.sentiment || f.Sentiment || "").trim().toLowerCase();
      const ratingNum = Number(f.rating || f.Rating || 5);
      const isNegative = sentimentStr.includes("negative") || ratingNum <= 2;
      
      if (!isNegative) continue;

      const rawIssue = f.detectedIssue || f.DetectedIssue || f.issue || f.Issue;
      const issueStr = rawIssue ? String(rawIssue).trim().toLowerCase() : "";
      if (!issueStr || issueStr === "none" || issueStr.includes("uncategorized") || issueStr === "n/a") continue;

      // Extract Date to milliseconds integer
      const timestamp = f.createdAt || f.CreatedAt || f.date || f.timestamp;
      let timeMs = nowMs;
      
      if (timestamp) {
        if (timestamp.toMillis) timeMs = timestamp.toMillis();
        else if (typeof timestamp.toDate === 'function') timeMs = timestamp.toDate().getTime();
        else if (timestamp.seconds !== undefined) timeMs = timestamp.seconds * 1000;
        else if (timestamp._seconds !== undefined) timeMs = timestamp._seconds * 1000;
        else if (timestamp instanceof Date) timeMs = timestamp.getTime();
        else if (typeof timestamp === 'number') timeMs = timestamp > 20000000000 ? timestamp : timestamp * 1000;
        else {
          const cleanStr = String(timestamp).replace(/ at /gi, " ").replace(/UTC[+-]\d+/gi, "").trim();
          const parsed = Date.parse(cleanStr);
          if (!isNaN(parsed)) timeMs = parsed;
        }
      }

      // Format Issue String
      const cleanRawIssue = String(rawIssue).trim();
      const normalizedIssue = cleanRawIssue.charAt(0).toUpperCase() + cleanRawIssue.slice(1);

      validData.push({
        _category: getItemName(f),
        _timeMs: timeMs,
        _issue: normalizedIssue
      });
    }
    
    return validData;
  }, [feedbacks]);

  // ─── STAGE 2: LIGHTWEIGHT UI FILTERING ───
  // Runs instantly when user clicks tabs/dropdowns. Loops fast integers/strings instead of parsing.
  const topInsight = useMemo(() => {
    if (processedFeedbacks.length === 0) return null;

    let cutoffMs = 0;
    if (timeframe !== 'All Time') {
      const now = new Date();
      if (timeframe === 'Today') {
        cutoffMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      } else if (timeframe === 'Week') {
        cutoffMs = now.getTime() - 604800000; // 7 days in ms
      } else if (timeframe === 'Month') {
        cutoffMs = now.getTime() - 2592000000; // 30 days in ms
      }
    }

    const issueCounts = {};
    let topIssue = null;
    let maxCount = 0;

    // Single-pass count and max finder
    for (let i = 0; i < processedFeedbacks.length; i++) {
      const item = processedFeedbacks[i];
      
      if (timeframe !== 'All Time' && item._timeMs < cutoffMs) continue;
      if (selectedItem !== 'Overall' && item._category !== selectedItem) continue;

      const currentCount = (issueCounts[item._issue] || 0) + 1;
      issueCounts[item._issue] = currentCount;
      
      if (currentCount > maxCount) {
        maxCount = currentCount;
        topIssue = item._issue;
      }
    }

    if (!topIssue) return null;

    return {
      issue: topIssue,
      count: maxCount,
      advice: getSmartSuggestions(topIssue)
    };
  }, [processedFeedbacks, timeframe, selectedItem]); 

  return (
    <div className="ai-insights-card">
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
              {AVAILABLE_ITEMS.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="ai-tabs" style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
            {['Today', 'Week', 'Month', 'All Time'].map((tab) => (
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

      <div className="ai-content" style={{ marginTop: '20px' }}>
        {!topInsight ? (
          <div className="ai-empty-state" style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <Activity size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p style={{ margin: 0 }}>No major operational issues detected for <strong>{selectedItem}</strong> {timeframe === 'All Time' ? 'in historical data' : timeframe === 'Today' ? 'today' : `in this ${timeframe.toLowerCase()}`}.</p>
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
                  Detected <strong>{topInsight.count} times</strong> {
                    timeframe === 'All Time' ? 'overall' : timeframe === 'Today' ? 'today' : `in the past ${timeframe === 'Week' ? '7 days' : '30 days'}`
                  }.
                </p>
              </div>
            </div>

            {topInsight.advice?.statement && (
              <div style={{ 
                padding: '16px 0', 
                margin: '20px 0', 
                fontSize: '0.95rem', 
                color: '#78350f', 
                lineHeight: '1.5' 
              }}>
                {topInsight.advice.statement}
              </div>
            )}

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