import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Custom Tooltip to ensure the FULL text is readable on hover
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ 
        background: '#fff', 
        padding: '12px', 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', 
        maxWidth: '300px' // Prevents tooltip from getting too wide
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' }}>
          {payload[0].payload.name}
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{payload[0].value}</span> Residents Registered
        </p>
      </div>
    );
  }
  return null;
};

export default function ProgramAnalytics({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const counts = {};
    
    data.forEach(item => {
      const name = item.programName || item.eventName || item.title || 'Unknown Program';
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.keys(counts)
      .map(key => ({ name: key, attendees: counts[key] }))
      .sort((a, b) => b.attendees - a.attendees); 
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b', height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        No program data available yet.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis 
            type="number" 
            tick={{ fontSize: 12, fill: '#64748b' }} 
            axisLine={false} 
            tickLine={false} 
            allowDecimals={false} 
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={180} // Increased width to give the truncated text a bit more room
            tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} 
            axisLine={false} 
            tickLine={false}
            // TRUNCATE LONG TEXT: Cuts off after 25 characters so it stays on one single line
            tickFormatter={(value) => value.length > 25 ? `${value.substring(0, 25)}...` : value}
          />
          <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
          <Bar dataKey="attendees" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="#8b5cf6" /> 
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}