import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { MapPin, AlertTriangle } from 'lucide-react';

// 👇 1. Import the new AI component (adjust the path if it is in a different folder)
import PeaceAndOrderAIInsights from './PeaceAndOrderAIInsights'; 

const URGENCY_COLORS = {
  "emergency": "#ef4444",
  "urgent": "#f59e0b",
  "docs": "#3b82f6",
  "Unknown": "#94a3b8"
};

const MOBILE_BREAKPOINT = 480;

// Custom Y-axis tick that wraps long labels onto two lines instead of truncating
const WrappingTick = ({ x, y, payload, isMobile, maxWidth }) => {
  const fontSize = isMobile ? 10 : 11;
  const lineHeight = fontSize + 3;
  const label = payload.value || '';

  const charWidth = isMobile ? 5.5 : 6.2;
  const charsPerLine = Math.floor(maxWidth / charWidth);

  let line1 = label;
  let line2 = '';

  if (label.length > charsPerLine) {
    const breakAt = label.lastIndexOf(' ', charsPerLine);
    if (breakAt > 0) {
      line1 = label.substring(0, breakAt);
      const rest = label.substring(breakAt + 1);
      line2 = rest.length > charsPerLine ? `${rest.substring(0, charsPerLine - 1)}…` : rest;
    } else {
      line1 = label.substring(0, charsPerLine - 1) + '–';
      line2 = label.substring(charsPerLine - 1);
    }
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={line2 ? -lineHeight / 2 + fontSize / 3 : fontSize / 3} textAnchor="end" fill="#475569" fontSize={fontSize}>
        {line1}
      </text>
      {line2 && (
        <text x={0} y={lineHeight / 2 + fontSize / 3} textAnchor="end" fill="#475569" fontSize={fontSize}>
          {line2}
        </text>
      )}
    </g>
  );
};

// Custom pie legend that wraps nicely at any width
const CustomPieLegend = ({ payload, isMobile }) => (
  <div style={{
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: isMobile ? '4px 8px' : '4px 14px',
    marginTop: '8px',
    padding: '0 4px'
  }}>
    {payload.map((entry, i) => (
      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '0.68rem' : '0.82rem', color: '#475569' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0, display: 'inline-block' }} />
        {entry.value}
      </span>
    ))}
  </div>
);

export default function PeaceAndOrderAnalytics({ data }) {
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const width = containerRef.current?.offsetWidth ?? window.innerWidth;
      setIsMobile(width <= MOBILE_BREAKPOINT);
    };
    check();
    const ro = new ResizeObserver(check);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { typeData, urgencyData, topLocations } = useMemo(() => {
    if (!data || data.length === 0) return { typeData: [], urgencyData: [], topLocations: [] };

    const typeCounts = {};
    const urgencyCounts = {};
    const locCounts = {};

    data.forEach(incident => {
      const type = incident.incidentType || incident.type || "Other";
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      const urgency = incident.urgencyLevel || incident.urgency || "Unknown";
      urgencyCounts[urgency] = (urgencyCounts[urgency] || 0) + 1;

      if (incident.location) {
        const rawLoc = incident.location.trim();
        const noSpaceLoc = rawLoc.replace(/\s/g, '');
        
        // Identify gibberish: <= 2 chars, consecutive consonants, or the word "test"
        const isGibberish = 
          noSpaceLoc.length <= 2 || 
          /^[bcdfghjklmnpqrstvwxyz]{4,}$/i.test(noSpaceLoc) ||
          /test/i.test(noSpaceLoc);

        // Only tally the location if it is a real word
        if (!isGibberish) {
          const cleanLoc = rawLoc.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
          locCounts[cleanLoc] = (locCounts[cleanLoc] || 0) + 1;
        }
      }
    });

    const formattedTypes = Object.keys(typeCounts)
      .map(key => ({ name: key, count: typeCounts[key] }))
      .sort((a, b) => b.count - a.count);

    const formattedUrgency = Object.keys(urgencyCounts)
      .map(key => ({ name: key, value: urgencyCounts[key] }))
      .sort((a, b) => b.value - a.value);

    const formattedLocs = Object.keys(locCounts)
      .map(key => ({ name: key, count: locCounts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { typeData: formattedTypes, urgencyData: formattedUrgency, topLocations: formattedLocs };
  }, [data]);

  if (!data || data.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No Peace & Order data available yet.</div>;
  }

  // Wider YAxis — wrapping tick handles long labels
  const yAxisWidth = isMobile ? 100 : 150;
  const labelMaxWidth = yAxisWidth - 8;
  const barSize = isMobile ? 16 : 20;
  const barChartHeight = Math.min(Math.max(typeData.length * (barSize + 20) + 50, 180), isMobile ? 340 : 420);
  const pieInner = isMobile ? 36 : 50;
  const pieOuter = isMobile ? 60 : 80;
  const pieChartHeight = isMobile ? 200 : 250;

  return (
    // Wrapped the entire return inside a flex-column container
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Existing Grid Container */}
      <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>

        {/* CHART 1: INCIDENT TYPES */}
        <div style={{ background: '#f8fafc', padding: isMobile ? '12px' : '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: isMobile ? '0.9rem' : '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={isMobile ? 15 : 18} color="#ef4444" /> Incidents by Type
          </h3>
          {typeData.length > 0 ? (
            <div style={{ height: barChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: isMobile ? 12 : 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
                  <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={yAxisWidth} tick={(props) => <WrappingTick {...props} isMobile={isMobile} maxWidth={labelMaxWidth} />} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#e2e8f0' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '0.8rem', maxWidth: '180px' }} formatter={(value, name, props) => [value, props.payload.name]} labelFormatter={() => ''} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={barSize}>
                    {typeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#ef4444" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', paddingTop: '30px' }}>No incident type data.</p>
          )}
        </div>

        {/* CHART 2: URGENCY LEVELS */}
        <div style={{ background: '#f8fafc', padding: isMobile ? '12px' : '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: isMobile ? '0.9rem' : '1rem', color: '#334155' }}>Urgency Breakdown</h3>
          {urgencyData.length > 0 ? (
            <div style={{ height: pieChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={urgencyData} cx="50%" cy={isMobile ? '45%' : '50%'} innerRadius={pieInner} outerRadius={pieOuter} paddingAngle={4} dataKey="value">
                    {urgencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={URGENCY_COLORS[entry.name] || URGENCY_COLORS["Unknown"]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '0.8rem' }} />
                  <Legend content={(props) => <CustomPieLegend {...props} isMobile={isMobile} />} verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', paddingTop: '30px' }}>No urgency data.</p>
          )}
        </div>

        {/* LIST: TOP HOTSPOTS */}
        <div style={{ background: '#f8fafc', padding: isMobile ? '12px' : '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: isMobile ? '0.9rem' : '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={isMobile ? 15 : 18} color="#f59e0b" /> Top Incident Hotspots
          </h3>
          {topLocations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topLocations.map((loc, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '8px 10px' : '10px 12px', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', gap: '8px' }}>
                  <span style={{ fontSize: isMobile ? '0.8rem' : '0.9rem', color: '#1e293b', fontWeight: 500, minWidth: 0, wordBreak: 'break-word' }}>
                    <span style={{ color: '#94a3b8', marginRight: '6px' }}>#{idx + 1}</span>{loc.name}
                  </span>
                  <span style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 'bold', color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap', flexShrink: 0 }}>
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

      {/* Render the AI Insights Card below the graphs */}
      <PeaceAndOrderAIInsights />

    </div>
  );
}