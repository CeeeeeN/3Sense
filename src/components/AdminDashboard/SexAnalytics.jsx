import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SEX_COLORS = { "Male": "#3b82f6", "Female": "#ec4899", "Other": "#8b5cf6" };

export default function SexAnalytics({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const counts = { "Male": 0, "Female": 0 }; // Pre-fill
    data.forEach(res => {
      const sex = res.sex || "Unknown";
      if(sex !== "Unknown") {
          counts[sex] = (counts[sex] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .map(key => ({ name: key, value: counts[key] }))
      .filter(item => item.value > 0); // Hide empties
  }, [data]);

  if (chartData.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No data yet.</div>;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
            {chartData.map((entry, index) => <Cell key={index} fill={SEX_COLORS[entry.name] || "#94a3b8"} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}