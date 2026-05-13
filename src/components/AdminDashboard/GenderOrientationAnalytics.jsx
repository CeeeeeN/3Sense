import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Distinct colors for various orientations/identities
const ORIENTATION_COLORS = {
  "Lesbian": "#d946ef",      // Fuchsia
  "Cisgender": "#f43f5e",    // Rose
  "Heterosexual": "#5180c2ff",
  "Non-Binary": "#14b8a6",   // Teal
  "Non-binary": "#14b8a6",   // Teal
  "Genderfluid": "#4fc9ebff",
  "Genderqueer": "#60044cff",
  "Transgender Woman": "#910283",
  "Transgender Man": "#d27cc9ff",
  "Gay": "#0ea5e9",          // Light Blue
  "Bisexual": "#8b5cf6",     // Purple
  "Transgender": "#14b8a6",  // Teal
  "Queer": "#f59e0b",        // Amber
  "Pansexual": "#f43f5e",    // Rose
  "Asexual": "#10b981",      // Emerald
  "Prefer not to say": "#94a3b8"
};

export default function GenderOrientationAnalytics({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const counts = {};

    data.forEach(res => {
      // Look for the new field. If it doesn't exist, we skip counting them in this specific chart
      // (or you can map them to "Straight/Heterosexual" if you track that as the default)
      const orientation = res.genderOrientation;

      if (orientation) {
        counts[orientation] = (counts[orientation] || 0) + 1;
      }
    });

    return Object.keys(counts)
      .map(key => ({ name: key, value: counts[key] }))
      .sort((a, b) => b.value - a.value); // Sort highest to lowest
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#64748b', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        No orientation data recorded yet.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={ORIENTATION_COLORS[entry.name] || "#94a3b8"}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value) => [`${value} Residents`, 'Count']}
          />
          <Legend
            verticalAlign="bottom"
            height={60}
            iconType="circle"
            wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}