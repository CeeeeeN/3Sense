import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CATEGORY_COLORS = {
  "Student": "#3b82f6", "Senior Citizen": "#8b5cf6", "Solo Parent": "#ec4899",
  "OFW": "#f59e0b", "LGBT": "#10b981", "Indigenous People": "#f97316", "PWD": "#ef4444"
};

export default function ResidentDemographics({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const counts = {};
    data.forEach(res => {
      (res.categories || []).forEach(cat => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .map(key => ({ name: key, value: counts[key] }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  if (chartData.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No data yet.</div>;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
            {chartData.map((entry, index) => <Cell key={index} fill={CATEGORY_COLORS[entry.name] || "#94a3b8"} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          {/* Adjusted legend to prevent overlapping */}
          <Legend verticalAlign="bottom" height={60} iconType="circle" wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}