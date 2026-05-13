import React, { useMemo, useState, useEffect, useRef } from 'react';
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
        maxWidth: '220px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', wordBreak: 'break-word' }}>
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

// How many items to show per "page" on narrow screens
const MOBILE_PAGE_SIZE = 8;
const MOBILE_BREAKPOINT = 480;

// Custom Y-axis tick that wraps long labels onto two lines instead of truncating
const WrappingTick = ({ x, y, payload, isMobile, maxWidth }) => {
  const fontSize = isMobile ? 10 : 12;
  const lineHeight = fontSize + 3;
  const label = payload.value || '';

  // Estimate chars that fit on one line based on pixel width
  // ~6.5px per char at 12px font, ~5.5px at 10px font
  const charWidth = isMobile ? 5.5 : 6.5;
  const charsPerLine = Math.floor(maxWidth / charWidth);

  let line1 = label;
  let line2 = '';

  if (label.length > charsPerLine) {
    // Try to break at a word boundary
    const breakAt = label.lastIndexOf(' ', charsPerLine);
    if (breakAt > 0) {
      line1 = label.substring(0, breakAt);
      const rest = label.substring(breakAt + 1);
      // If second line is still too long, truncate it
      line2 = rest.length > charsPerLine ? `${rest.substring(0, charsPerLine - 1)}…` : rest;
    } else {
      line1 = label.substring(0, charsPerLine - 1) + '–';
      line2 = label.substring(charsPerLine - 1);
    }
  }

  const totalHeight = line2 ? lineHeight * 2 : lineHeight;
  const startY = line2 ? y - lineHeight / 2 : y;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={line2 ? -lineHeight / 2 + fontSize / 3 : fontSize / 3}
        textAnchor="end"
        fill="#475569"
        fontSize={fontSize}
        fontWeight={500}
      >
        {line1}
      </text>
      {line2 && (
        <text
          x={0}
          y={lineHeight / 2 + fontSize / 3}
          textAnchor="end"
          fill="#475569"
          fontSize={fontSize}
          fontWeight={500}
        >
          {line2}
        </text>
      )}
    </g>
  );
};

export default function ProgramAnalytics({ data }) {
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [page, setPage] = useState(0);

  // Detect narrow viewport
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

  // Reset page when data or viewport changes
  useEffect(() => { setPage(0); }, [isMobile, data]);

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
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        No program data available yet.
      </div>
    );
  }

  // On mobile: paginate. On desktop: show all with a sensible min-height per bar.
  const totalPages = Math.ceil(chartData.length / MOBILE_PAGE_SIZE);
  const visibleData = isMobile
    ? chartData.slice(page * MOBILE_PAGE_SIZE, (page + 1) * MOBILE_PAGE_SIZE)
    : chartData;

  // Dynamic chart height: taller slot to accommodate two-line labels
  const barSize = isMobile ? 20 : 24;
  const barSlot = barSize + (isMobile ? 20 : 24); // extra room for 2-line labels
  const chartHeight = Math.min(
    Math.max(visibleData.length * barSlot + 60, 200),
    isMobile ? 400 : 600
  );

  // Wider YAxis so long labels have room — wrapping tick handles the rest
  const yAxisWidth = isMobile ? 110 : 180;
  // Characters that fit per line (used by WrappingTick)
  const labelMaxWidth = yAxisWidth - 8;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Pagination info pill — mobile only */}
      {isMobile && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', borderRadius: '999px', padding: '3px 10px' }}>
            Showing {page * MOBILE_PAGE_SIZE + 1}–{Math.min((page + 1) * MOBILE_PAGE_SIZE, chartData.length)} of {chartData.length} programs
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: page === 0 ? '#f8fafc' : '#fff', color: page === 0 ? '#94a3b8' : '#334155', cursor: page === 0 ? 'default' : 'pointer' }}
            >← Prev</button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: page === totalPages - 1 ? '#f8fafc' : '#fff', color: page === totalPages - 1 ? '#94a3b8' : '#334155', cursor: page === totalPages - 1 ? 'default' : 'pointer' }}
            >Next →</button>
          </div>
        </div>
      )}

      <div style={{ width: '100%', height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleData}
            layout="vertical"
            margin={{ top: 8, right: isMobile ? 16 : 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis
              type="number"
              tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={yAxisWidth}
              tick={(props) => <WrappingTick {...props} isMobile={isMobile} maxWidth={labelMaxWidth} />}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
            <Bar dataKey="attendees" radius={[0, 4, 4, 0]} barSize={barSize}>
              {visibleData.map((_, index) => (
                <Cell key={`cell-${index}`} fill="#8b5cf6" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Dot indicators for pages — mobile only */}
      {isMobile && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              style={{
                width: i === page ? '18px' : '8px',
                height: '8px',
                borderRadius: '999px',
                border: 'none',
                background: i === page ? '#8b5cf6' : '#cbd5e1',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.2s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}