import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase'; 
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { MapPin } from 'lucide-react';

export default function SentimentComparisonChart() {
  const [rawFeedbacks, setRawFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState('Overall');

  // Fetch data ONCE and store it raw
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "Feedback"), (snapshot) => {
      const rawData = snapshot.docs.map(doc => doc.data());
      setRawFeedbacks(rawData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Dynamically extract unique facilities
  const uniqueFacilities = useMemo(() => {
    if (!rawFeedbacks || rawFeedbacks.length === 0) return ['Overall'];
    const facilities = rawFeedbacks
      .map(f => f.FacilityName || f.Facility || "Unknown")
      .filter((val, index, self) => self.indexOf(val) === index && val !== "Unknown");
    
    return ['Overall', ...facilities];
  }, [rawFeedbacks]);

  // Calculate percentages for the ONE selected facility
  const chartData = useMemo(() => {
    const filteredFeedbacks = rawFeedbacks.filter(f => {
      if (selectedFacility === 'Overall') return true;
      return f.FacilityName === selectedFacility || f.Facility === selectedFacility;
    });

    const total = filteredFeedbacks.length;
    if (total === 0) return [];

    let pos = 0, neu = 0, neg = 0;
    filteredFeedbacks.forEach(f => {
      const s = (f.Sentiment || "").toLowerCase();
      if (s === 'positive') pos++;
      else if (s === 'neutral') neu++;
      else if (s === 'negative') neg++;
    });

    // Return a single object in an array so Recharts renders exactly one vertical bar
    return [{
      name: selectedFacility,
      Positive: parseFloat(((pos / total) * 100).toFixed(1)),
      Neutral: parseFloat(((neu / total) * 100).toFixed(1)),
      Negative: parseFloat(((neg / total) * 100).toFixed(1)),
      totalFeedbacks: total 
    }];
  }, [rawFeedbacks, selectedFacility]);

  if (loading) {
    return (
      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontWeight: 500 }}>
        Loading Chart Data...
      </div>
    );
  }

  const hasData = chartData.length > 0;

  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header & Dropdown */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: 600 }}>Service Satisfaction Chart</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>AI-analyzed satisfaction levels</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px' }}>
          <MapPin size={16} color="#64748b" style={{ marginRight: '6px' }} />
          <select 
            value={selectedFacility} 
            onChange={(e) => setSelectedFacility(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}
          >
            {uniqueFacilities.map(fac => (
              <option key={fac} value={fac}>{fac}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart Area */}
      <div style={{ flex: 1, minHeight: '280px' }}>
        {!hasData ? (
           <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontStyle: 'italic', background: '#f8fafc', borderRadius: '8px' }}>
             No feedback data available for {selectedFacility}.
           </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 500 }} dy={10} />
              <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip formatter={(value, name) => [`${value}%`, name]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} cursor={{ fill: '#f1f5f9' }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
              
              {/* MaxBarSize ensures the single bar isn't overwhelmingly thick */}
              <Bar dataKey="Positive" stackId="a" fill="#22c55e" animationDuration={1000} maxBarSize={120} />
              <Bar dataKey="Neutral"  stackId="a" fill="#facc15" animationDuration={1000} maxBarSize={120} />
              <Bar dataKey="Negative" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={1000} maxBarSize={120} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}