import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { MapPin, HeartHandshake } from 'lucide-react';

const TYPE_COLORS = {
  "Direct Report": "#0ea5e9", // Light Blue
  "Tip / Info": "#f43f5e",    // Rose
  "Unknown": "#94a3b8"
};

export default function BSWDAnalytics({ data }) {
  const { trendData, typeData, topLocations } = useMemo(() => {
    if (!data || data.length === 0) return { trendData: [], typeData: [], topLocations: [] };

    const typeCounts = { "Direct Report": 0, "Tip / Info": 0 };
    const locCounts = {};
    const monthMap = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    data.forEach(report => {
      // 1. Tally Types (Assuming your DB saves a field like reportType: 'report' or 'tip')
      const isTip = report.type === 'tip' || report.whoIsThisAbout; // Checking for Tip-specific fields
      const typeLabel = isTip ? "Tip / Info" : "Direct Report";
      typeCounts[typeLabel]++;

      // 2. Tally Locations (Only for direct reports since tips might not have a location field)
      if (report.location || report.locationOfPerson) {
        const rawLoc = (report.location || report.locationOfPerson).trim().toLowerCase();
        const cleanLoc = rawLoc.replace(/\b\w/g, char => char.toUpperCase());
        locCounts[cleanLoc] = (locCounts[cleanLoc] || 0) + 1;
      }

      // 3. Tally Timeline Trend
      const dateVal = report.createdAt || report.submittedAt;
      if (dateVal) {
        const dateObj = typeof dateVal.toDate === 'function' ? dateVal.toDate() : new Date(dateVal);
        if (!isNaN(dateObj)) {
          const monthKey = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
          const sortKey = dateObj.getFullYear() * 100 + dateObj.getMonth();
          
          if (!monthMap[monthKey]) {
            monthMap[monthKey] = { name: monthKey, count: 0, sortKey };
          }
          monthMap[monthKey].count++;
        }
      }
    });

    // Format Timeline Trend
    const formattedTrend = Object.values(monthMap).sort((a, b) => a.sortKey - b.sortKey);

    // Format Submission Types
    const formattedTypes = Object.keys(typeCounts)
      .map(key => ({ name: key, value: typeCounts[key] }))
      .filter(item => item.value > 0);

    // Format Locations (Top 5)
    const formattedLocs = Object.keys(locCounts)
      .map(key => ({ name: key, count: locCounts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { trendData: formattedTrend, typeData: formattedTypes, topLocations: formattedLocs };
  }, [data]);

  if (!data || data.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No BSWD reports available yet.</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      
      {/* CHART 1: REPORTING TREND */}
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: '2 1 400px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeartHandshake size={18} color="#0ea5e9" /> Submission Volume
        </h3>
        <div style={{ height: 250 }}>
          <ResponsiveContainer>
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#e2e8f0' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
                {trendData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#0ea5e9" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 2: SUBMISSION TYPES */}
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: '1 1 300px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155' }}>Report Breakdown</h3>
        <div style={{ height: 250 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name] || TYPE_COLORS["Unknown"]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LIST: SIGHTING HOTSPOTS */}
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', flex: '1 1 300px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={18} color="#f43f5e" /> Sighting Hotspots
        </h3>
        {topLocations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topLocations.map((loc, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500 }}>
                  <span style={{ color: '#94a3b8', marginRight: '8px' }}>#{idx + 1}</span> {loc.name}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0ea5e9', background: '#e0f2fe', padding: '2px 8px', borderRadius: '999px' }}>
                  {loc.count} {loc.count === 1 ? 'report' : 'reports'}
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