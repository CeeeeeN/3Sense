import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AgeAnalytics({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const brackets = { "0-14 (Child)": 0, "15-24 (Youth)": 0, "25-59 (Adult)": 0, "60+ (Senior)": 0 };
    
    data.forEach(res => {
      if (!res.birthDate) return;
      const birthYear = new Date(res.birthDate).getFullYear();
      const age = new Date().getFullYear() - birthYear; // simplified age calc
      
      if (age <= 14) brackets["0-14 (Child)"]++;
      else if (age <= 24) brackets["15-24 (Youth)"]++;
      else if (age <= 59) brackets["25-59 (Adult)"]++;
      else brackets["60+ (Senior)"]++;
    });

    return Object.keys(brackets).map(key => ({ name: key, count: brackets[key] }));
  }, [data]);

  if (chartData.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No data yet.</div>;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="#317D89" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}