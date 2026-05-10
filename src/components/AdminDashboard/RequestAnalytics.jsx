import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RequestAnalytics({ docRequests, facilityRequests, timeFilter = 'Month' }) {
  const chartData = useMemo(() => {
    if (!docRequests.length && !facilityRequests.length) return [];

    const dateMap = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const processItems = (items, typeKey) => {
      items.forEach(item => {
        const dateVal = item.createdAt || item.submittedAt || item.date;
        if (!dateVal) return;

        let dateObj;
        if (typeof dateVal.toDate === 'function') {
          dateObj = dateVal.toDate();
        } else {
          dateObj = new Date(dateVal);
        }

        if (isNaN(dateObj)) return;

        let timeKey, sortKey;

        if (timeFilter === 'Day') {
          // Group by Day (e.g., "May 9")
          timeKey = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
          // Sort key format: YYYYMMDD to keep chronological order
          sortKey = dateObj.getFullYear() * 10000 + dateObj.getMonth() * 100 + dateObj.getDate();
        } else {
          // Group by Month (e.g., "May 2026")
          timeKey = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
          // Sort key format: YYYYMM
          sortKey = dateObj.getFullYear() * 100 + dateObj.getMonth();
        }

        if (!dateMap[timeKey]) {
          dateMap[timeKey] = { 
            name: timeKey, 
            Documents: 0, 
            Facilities: 0, 
            sortKey: sortKey
          };
        }
        dateMap[timeKey][typeKey]++;
      });
    };

    processItems(docRequests, 'Documents');
    processItems(facilityRequests, 'Facilities');

    // Convert map to array and sort chronologically
    return Object.values(dateMap).sort((a, b) => a.sortKey - b.sortKey);
  }, [docRequests, facilityRequests, timeFilter]);

  if (chartData.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No request data available yet.</div>;
  }

  return (
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '0.9rem' }} />
          
          <Line type="monotone" dataKey="Documents" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="Facilities" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}