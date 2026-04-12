import React, { useState, useMemo } from 'react';
import { getSmartSuggestions } from '../services/suggestionEngine';
import { Lightbulb, AlertTriangle, Clock, Calendar, Activity } from 'lucide-react';

export default function AIInsightsWidget({ feedbacks }) {
  const [timeframe, setTimeframe] = useState('Month');

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
      return (
        feedbackDate >= cutoffDate && 
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
  }, [feedbacks, timeframe]);

  return (
    <div className="ai-insights-card">
      {/* Header & Tabs */}
      <div className="ai-header">
        <h3 className="ai-title">
          <Lightbulb size={20} className="ai-icon-primary" /> 
          Operational AI Insights
        </h3>
        
        <div className="ai-tabs">
          {['Day', 'Week', 'Month'].map((tab) => (
            <button
              key={tab}
              onClick={() => setTimeframe(tab)}
              className={`ai-tab-btn ${timeframe === tab ? 'active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="ai-content">
        {!topInsight ? (
          <div className="ai-empty-state">
            <Activity size={32} />
            <p>No major operational issues detected for this {timeframe.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="ai-issue-box">
            
            <div className="ai-issue-header">
              <div className="ai-warning-icon">
                <AlertTriangle size={24} />
              </div>
              <div className="ai-issue-text">
                <span className="ai-issue-label">Top Recurring Issue ({timeframe})</span>
                <h4 className="ai-issue-name">{topInsight.issue}</h4>
                <p className="ai-issue-stats">
                  Detected <strong>{topInsight.count} times</strong> in the past {
                    timeframe === 'Day' ? '24 hours' : timeframe === 'Week' ? '7 days' : '30 days'
                  }.
                </p>
              </div>
            </div>

            {topInsight.advice && (
              <div className="ai-suggestions-grid">
                <div className="ai-suggestion-col immediate">
                  <h5><Clock size={16} /> Immediate Actions</h5>
                  <ul>
                    {topInsight.advice.actions.map((act, i) => <li key={i}>{act}</li>)}
                  </ul>
                </div>
                <div className="ai-suggestion-col strategy">
                  <h5><Calendar size={16} /> Long-Term Strategy</h5>
                  <ul>
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