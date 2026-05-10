import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { MapPin, AlertTriangle } from 'lucide-react';

const URGENCY_COLORS = {
  "emergency": "#ef4444",          // Red
  "urgent": "#f59e0b",             // Amber
  "docs": "#3b82f6",                // Blue
  "Unknown": "#94a3b8"             // Gray
};

export default function PeaceAndOrderAnalytics({ data }) {
  const { typeData, urgencyData, topLocations } = useMemo(() => {
    if (!data || data.length === 0) return { typeData: [], urgencyData: [], topLocations: [] };

    const typeCounts = {};
    const urgencyCounts = {};
    const locCounts = {};

    data.forEach(incident => {
      // 1. Tally Incident Types
      const type = incident.incidentType || incident.type || "Other";
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      // 2. Tally Urgency Levels
      const urgency = incident.urgencyLevel || incident.urgency || "Unknown";
      urgencyCounts[urgency] = (urgencyCounts[urgency] || 0) + 1;

      // 3. Tally Locations (Hotspots) - Normalize string to prevent duplicates like "Purok 1" and "purok 1 "
      if (incident.location) {
        // Clean the string: lowercase, remove extra spaces
        const rawLoc = incident.location.trim().toLowerCase();
        // Capitalize first letter of each word for clean display
        const cleanLoc = rawLoc.replace(/\b\w/g, char => char.toUpperCase());
        locCounts[cleanLoc] = (locCounts[cleanLoc] || 0) + 1;
      }
    });

    // Format Types for Recharts (Sort highest to lowest)
    const formattedTypes = Object.keys(typeCounts)
      .map(key => ({ name: key, count: typeCounts[key] }))
      .sort((a, b) => b.count - a.count);

    // Format Urgency for Recharts
    const formattedUrgency = Object.keys(urgencyCounts)
      .map(key => ({ name: key, value: urgencyCounts[key] }))
      .sort((a, b) => b.value - a.value);

    // Format Locations and get Top 5
    const formattedLocs = Object.keys(locCounts)
      .map(key => ({ name: key, count: locCounts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Only take the top 5 hotspots

    return { typeData: formattedTypes, urgencyData: formattedUrgency, topLocations: formattedLocs };
  }, [data]);

  if (!data || data.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No Peace & Order data available yet.</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      
      {/* CHART 1: INCIDENT TYPES */}
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: '2 1 400px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="#ef4444" /> Incidents by Type
        </h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={150} 
                tick={{ fontSize: 11, fill: '#475569' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => value.length > 22 ? `${value.substring(0, 22)}...` : value}
              />
              <Tooltip cursor={{ fill: '#e2e8f0' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#ef4444" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 2: URGENCY LEVELS */}
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: '1 1 300px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155' }}>Urgency Breakdown</h3>
        <div style={{ height: 250 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={urgencyData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {urgencyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={URGENCY_COLORS[entry.name] || URGENCY_COLORS["Unknown"]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LIST: TOP HOTSPOTS */}
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: '1 1 300px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={18} color="#f59e0b" /> Top Incident Hotspots
        </h3>
        {topLocations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topLocations.map((loc, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500 }}>
                  <span style={{ color: '#94a3b8', marginRight: '8px' }}>#{idx + 1}</span> {loc.name}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: '999px' }}>
                  {loc.count} {loc.count === 1 ? 'case' : 'cases'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginTop: '40px' }}>No location data reported.</p>
        )}
      </div>

    </div>
  );
}