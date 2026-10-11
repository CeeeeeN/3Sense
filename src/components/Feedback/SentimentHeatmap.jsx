import React, { useState, useMemo } from 'react';
import { PieChart } from 'lucide-react';

export default function SentimentHeatmap({ feedbacks = [] }) {
  const [activeTab, setActiveTab] = useState('Facilities');

  const categories = ['Documents', 'Equipment', 'Facilities', 'General Programs', 'Livelihood Programs', 'Peace & Order', 'Others'];

  const getCategory = (fb) => {
    const type = String(fb.category || fb.type || fb._type || fb.serviceType || "").toLowerCase();
    const name = String(fb.facilityName || fb.title || "").toLowerCase();

    if (type.includes('doc') || name.includes('document') || name.includes('clearance') || name.includes('certificate') || name.includes('indigency')) return 'Documents';
    if (type.includes('equip') || name.includes('chair') || name.includes('tent') || name.includes('monobloc')) return 'Equipment';
    if (type.includes('facil') || name.includes('court') || name.includes('hall') || name.includes('plaza')) return 'Facilities';
    
    if (type.includes('livelihood') || name.includes('livelihood')) return 'Livelihood Programs';
    if (type.includes('prog') || type.includes('general_program') || name.includes('program')) return 'General Programs';
    
    if (type.includes('peace') || type.includes('order') || type.includes('incident') || name.includes('parking') || name.includes('obstruction') || name.includes('noise')) return 'Peace & Order';
    
    return 'Others';
  };

  const computedHeatmapData = useMemo(() => {
    if (!feedbacks || feedbacks.length === 0) return {};

    const filtered = feedbacks.filter(fb => {
      const facilityName = String(fb.facilityName || "General").trim().toLowerCase();
      if (facilityName === 'test' || facilityName.includes('test')) return false;
      return getCategory(fb) === activeTab;
    });

    const hData = {};
    filtered.forEach(fb => {
      const facility = fb.facilityName || "General";
      const sentiment = fb.sentiment || "Neutral";
      
      if (!hData[facility]) hData[facility] = { Positive: 0, Neutral: 0, Negative: 0, Total: 0 };
      
      if (hData[facility][sentiment] !== undefined) {
        hData[facility][sentiment]++;
        hData[facility].Total++;
      }
    });

    return hData;
  }, [feedbacks, activeTab]);

  const heatmapEntries = Object.entries(computedHeatmapData);

  const getHeatmapStyle = (value, total, baseRgb, darkTextColor) => {
    if (total === 0 || value === 0) {
      return { background: `rgba(${baseRgb}, 0.08)`, color: '#cbd5e1', padding: '6px', borderRadius: '4px', fontWeight: 'bold' };
    }
    const ratio = value / total;
    const opacity = Math.max(0.15, ratio); 
    const textColor = opacity > 0.4 ? '#ffffff' : darkTextColor;
    
    return {
      background: `rgba(${baseRgb}, ${opacity})`,
      color: textColor,
      fontWeight: 'bold',
      padding: '6px',
      borderRadius: '4px',
      transition: 'all 0.2s ease'
    };
  };

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <PieChart size={18} /> Sentiment Heatmap by Category
      </h3>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: activeTab === cat ? 600 : 500,
              backgroundColor: activeTab === cat ? '#317D89' : '#f8fafc',
              color: activeTab === cat ? '#fff' : '#64748b',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ width: '100%', overflowX: 'auto', flex: 1 }}>
        {heatmapEntries.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
            No feedback data available for this category right now.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #cbd5e1', color: '#64748b' }}>Service / Facility</th>
                <th style={{ textAlign: 'center', padding: '8px', borderBottom: '2px solid #cbd5e1', color: '#166534' }}>Positive</th>
                <th style={{ textAlign: 'center', padding: '8px', borderBottom: '2px solid #cbd5e1', color: '#ea580c' }}>Neutral</th>
                <th style={{ textAlign: 'center', padding: '8px', borderBottom: '2px solid #cbd5e1', color: '#991b1b' }}>Negative</th>
              </tr>
            </thead>
            <tbody>
              {heatmapEntries.map(([facility, data]) => (
                <tr key={facility} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 600, color: '#334155' }}>{facility}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <div style={getHeatmapStyle(data.Positive, data.Total, '22, 101, 52', '#166534')}>{data.Positive}</div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <div style={getHeatmapStyle(data.Neutral, data.Total, '249, 115, 22', '#c2410c')}>{data.Neutral}</div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <div style={getHeatmapStyle(data.Negative, data.Total, '153, 27, 27', '#991b1b')}>{data.Negative}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}