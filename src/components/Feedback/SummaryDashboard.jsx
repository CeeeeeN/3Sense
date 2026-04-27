import React from 'react';
import { PieChart, MessageSquare } from 'lucide-react';

export default function SummaryDashboard({ stats, heatmapData, wordCloud }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #317D89' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Total Feedback</p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: '#1e293b' }}>{stats.total}</h2>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #e8a020' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Average Rating</p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: '#1e293b' }}>{stats.avgRating} <span style={{fontSize:'1.2rem', color:'#e8a020'}}>★</span></h2>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #e11d48' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Negative Feedback</p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: '#e11d48' }}>{stats.negative}</h2>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Pending Resolution</p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: '#3b82f6' }}>{stats.pending}</h2>
        </div>
      </div>

      {/* Heatmap & Word Cloud Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Heatmap */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={18} /> Sentiment Heatmap by Facility
          </h3>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #cbd5e1', color: '#64748b' }}>Facility</th>
                  <th style={{ textAlign: 'center', padding: '8px', borderBottom: '2px solid #cbd5e1', color: '#166534' }}>Positive</th>
                  <th style={{ textAlign: 'center', padding: '8px', borderBottom: '2px solid #cbd5e1', color: '#92400e' }}>Neutral</th>
                  <th style={{ textAlign: 'center', padding: '8px', borderBottom: '2px solid #cbd5e1', color: '#991b1b' }}>Negative</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(heatmapData).map(([facility, data]) => (
                  <tr key={facility} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600, color: '#334155' }}>{facility}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ background: `rgba(22, 101, 52, ${Math.max(0.1, data.Positive / data.Total)})`, padding: '6px', borderRadius: '4px', color: data.Positive > 0 ? '#166534' : '#cbd5e1', fontWeight: 'bold' }}>{data.Positive}</div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ background: `rgba(146, 64, 14, ${Math.max(0.1, data.Neutral / data.Total)})`, padding: '6px', borderRadius: '4px', color: data.Neutral > 0 ? '#92400e' : '#cbd5e1', fontWeight: 'bold' }}>{data.Neutral}</div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ background: `rgba(153, 27, 27, ${Math.max(0.1, data.Negative / data.Total)})`, padding: '6px', borderRadius: '4px', color: data.Negative > 0 ? '#991b1b' : '#cbd5e1', fontWeight: 'bold' }}>{data.Negative}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Word Cloud */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} /> Most Mentioned Terms
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', alignItems: 'center', minHeight: '200px', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
            {wordCloud.length === 0 ? (
              <span style={{ color: '#94a3b8' }}>Not enough data to generate word cloud.</span>
            ) : (
              wordCloud.map((word, idx) => {
                const fontSize = Math.max(12, Math.min(word.count * 5 + 10, 40));
                const colors = ['#317D89', '#1a56a0', '#e11d48', '#e8a020', '#166534'];
                return (
                  <span key={word.text} style={{ fontSize: `${fontSize}px`, color: colors[idx % colors.length], fontWeight: fontSize > 20 ? 800 : 500, lineHeight: 1, cursor: 'default' }} title={`Mentioned ${word.count} times`}>
                    {word.text}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}