import React, { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import SentimentHeatmap from './SentimentHeatmap';
import { db } from '../../firebase/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query'; // <-- Added React Query

export default function SummaryDashboard({ feedbacks = [] }) {
  const [timeframe, setTimeframe] = useState('30'); // Default to Last 30 Days

  // ─── OPTIMIZED: Fetch lightweight metadata for accurate lifetime dashboard stats ───
  const { data: dashboardData = [], isLoading } = useQuery({
    queryKey: ['adminManage_feedbackStats_all'],
    queryFn: async () => {
      // We don't limit this query because we need the real totals, 
      // but we do let it cache heavily to prevent huge read spikes.
      // NOTE: In a massive production system with 10k+ reviews, you would 
      // transition this to a Firebase Cloud Function that updates a 
      // "metadata" document every night. For typical barangay volumes (<2k), 
      // this is extremely fast and cost-effective.
      const snap = await getDocs(query(collection(db, "feedback")));
      return snap.docs.map(doc => {
        const data = doc.data();
        let rawDate = 0;
        if (data.createdAt?.toDate) {
          rawDate = data.createdAt.toDate().getTime();
        } else if (typeof data.createdAt === 'string') {
          rawDate = new Date(data.createdAt).getTime() || 0;
        }

        return {
          id: doc.id,
          rating: Number(data.rating || data.Rating || 0),
          sentiment: data.sentiment || data.Sentiment || "Pending AI",
          status: data.status || data.Status || "pending",
          facilityName: data.facilityName || data.FacilityName || "General",
          rawDate,
        };
      });
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 full hour
  });

  // Filter the lightweight data based on the selected timeframe
  const filteredFeedbacks = useMemo(() => {
    if (timeframe === 'all') return dashboardData;
    
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const limitMs = parseInt(timeframe) * msPerDay;

    return dashboardData.filter(fb => {
      if (!fb.rawDate) return true; // Keep if date is unknown
      return (now - fb.rawDate) <= limitMs;
    });
  }, [dashboardData, timeframe]);

  // Compute Top Stats dynamically based on filtered data
  const stats = useMemo(() => {
    let totalRating = 0;
    let negativeCount = 0;
    let pendingCount = 0;

    filteredFeedbacks.forEach(fb => {
      totalRating += fb.rating;
      if (String(fb.sentiment).toLowerCase() === 'negative') negativeCount++;
      if (['pending', 'analyzed', 'under review'].includes(String(fb.status).toLowerCase())) pendingCount++;
    });

    return {
      total: filteredFeedbacks.length,
      avgRating: filteredFeedbacks.length ? (totalRating / filteredFeedbacks.length).toFixed(1) : "0.0",
      negative: negativeCount,
      pending: pendingCount
    };
  }, [filteredFeedbacks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* Header & Timeframe Dropdown */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Overview</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <Calendar size={16} color="#64748b" />
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', color: '#334155', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="365">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #317D89', position: 'relative' }}>
          {isLoading && <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.7rem', color: '#94a3b8' }}>Loading...</div>}
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Total Feedback</p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: '#1e293b' }}>{stats.total}</h2>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #e8a020', position: 'relative' }}>
          {isLoading && <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.7rem', color: '#94a3b8' }}>Loading...</div>}
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Average Rating</p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: '#1e293b' }}>{stats.avgRating} <span style={{fontSize:'1.2rem', color:'#e8a020'}}>★</span></h2>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #e11d48', position: 'relative' }}>
          {isLoading && <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.7rem', color: '#94a3b8' }}>Loading...</div>}
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Negative Feedback</p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: '#e11d48' }}>{stats.negative}</h2>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', position: 'relative' }}>
          {isLoading && <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.7rem', color: '#94a3b8' }}>Loading...</div>}
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Pending Resolution</p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', color: '#3b82f6' }}>{stats.pending}</h2>
        </div>
      </div>

      {/* Heatmap Section (Full Width) */}
      <SentimentHeatmap feedbacks={filteredFeedbacks} />
      
    </div>
  );
}