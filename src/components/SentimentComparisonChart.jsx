import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase'; 
import { calculateMoodCardData } from '../services/sentimentAggregator'; 
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export default function SentimentComparisonChart() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "Feedback"), (snapshot) => {
      const rawFeedbacks = snapshot.docs.map(doc => doc.data());

      // 2. Run the data through your single source of truth
      const aggregatedData = calculateMoodCardData(rawFeedbacks);

      // 3. Reshape the aggregator's output so Recharts can read it
      const formattedForChart = aggregatedData.map(card => ({
        name: card.categoryName,
        Positive: card.percentages.Positive,
        Neutral: card.percentages.Neutral,
        Negative: card.percentages.Negative,
        // Optional: Keep total around in case you want to use it in tooltips later!
        totalFeedbacks: card.totalFeedbacks 
      }));

      setChartData(formattedForChart);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontWeight: 500 }}>
        Loading AI Insights...
      </div>
    );
  }

  // Prevent rendering an empty grid if there's no data at all
  const hasData = chartData.some(d => d.totalFeedbacks > 0);
  if (!hasData) {
     return (
      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
        No feedback data available yet.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        {/* We removed stackOffset="expand" because your aggregator already does the percentage math! */}
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 14, fontWeight: 500 }} 
            dy={10}
          />
          {/* Lock the Y-Axis to 0-100 since we are feeding it exact percentages */}
          <YAxis 
            domain={[0, 100]}
            tickFormatter={(tick) => `${tick}%`} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 13 }}
          />
          <Tooltip 
            formatter={(value, name) => [`${value}%`, name]}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar dataKey="Positive" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
          <Bar dataKey="Neutral"  stackId="a" fill="#facc15" />
          <Bar dataKey="Negative" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}