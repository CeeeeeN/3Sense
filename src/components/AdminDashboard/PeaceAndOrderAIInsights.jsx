import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const HF_ACCESS_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN;
const MODEL_URL = "https://router.huggingface.co/v1/chat/completions";

export default function PeaceAndOrderAIInsights() {
  const [insight, setInsight] = useState("");
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const generateInsights = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch historical incident reports
        const querySnapshot = await getDocs(collection(db, "incidentReports"));
        const rawReports = querySnapshot.docs.map(doc => doc.data());

        if (rawReports.length < 5) {
          setInsight("Insufficient data to identify a reliable trend.");
          setLoading(false);
          return;
        }

        // 2. Strip PII and Sanitize Test Data
        const safeData = rawReports.map(r => {
          let loc = (r.location || "").trim();
          const isGibberish = loc.length <= 2 || /^[bcdfghjklmnpqrstvwxyz]{4,}$/i.test(loc.replace(/\s/g, '')) || /test/i.test(loc);
          
          return {
            type: r.incidentType || "Unspecified",
            location: isGibberish ? "Unspecified Zone" : loc,
            date: r.date,
            time: r.time,
            urgency: r.urgency
          };
        });

        // 3. Generate Chronological Data for Line Chart
        const timelineCounts = {};
        safeData.forEach(incident => {
          if (incident.date) {
            // Group by Month-Year (e.g., "Aug 2026")
            const d = new Date(incident.date);
            if (!isNaN(d)) {
              const monthYear = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              timelineCounts[monthYear] = (timelineCounts[monthYear] || 0) + 1;
            }
          }
        });

        const formattedTrendData = Object.keys(timelineCounts)
          .sort((a, b) => new Date(a) - new Date(b))
          .map(key => ({ date: key, incidents: timelineCounts[key] }));
        
        setTrendData(formattedTrendData);

        const typeCounts = {};
        safeData.forEach(inc => {
          typeCounts[inc.type] = (typeCounts[inc.type] || 0) + 1;
        });

        // 4. Cache Management
        const cacheKey = `po_insight_v2_${safeData.length}`;
        const localCache = sessionStorage.getItem(cacheKey);
        if (localCache) {
          setInsight(localCache);
          setLoading(false);
          return;
        }

        const insightRef = doc(db, "ai_insights", cacheKey);
        const insightSnap = await getDoc(insightRef);
        if (insightSnap.exists()) {
          const firestoreText = insightSnap.data().text;
          sessionStorage.setItem(cacheKey, firestoreText);
          setInsight(firestoreText);
          setLoading(false);
          return;
        }

        // 6. Call Gemini API with aggregated data and bypassed safety filters
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;
        
        const prompt = `You are an expert crime and incident analyst for a local Barangay. Based ONLY on the provided aggregated statistics, provide a concise summary identifying trends.
        
Monthly Incident Volume: ${JSON.stringify(formattedTrendData)}
Incident Type Breakdown: ${JSON.stringify(typeCounts)}

You MUST format your output exactly like this (do not use markdown asterisks):
Increasing Trend: [Your observation. You MUST include a calculated percentage or specific number of cases to prove the trend.]
Peak Period: [Your observation.]
Notable Pattern: [Your observation. You MUST include the specific number of incidents that fit this pattern.]`;

        const response = await fetch(GEMINI_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: {
                maxOutputTokens: 400,
                temperature: 0.2
            }
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || "Failed to fetch from Gemini API");
        }

        const generatedText = result.candidates[0].content.parts[0].text.trim();

        await setDoc(insightRef, { text: generatedText, createdAt: serverTimestamp() });
        sessionStorage.setItem(cacheKey, generatedText);

        setInsight(generatedText);
      } catch (err) {
        console.error("AI Generation Error:", err);
        setError("Failed to generate AI insights. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    generateInsights();
  }, []);

  const formatInsightText = (text) => {
    if (!text.includes("Increasing Trend:")) return <p>{text}</p>;
    
    const parts = text.split(/(Increasing Trend:|Peak Period:|Notable Pattern:)/).filter(Boolean);
    return parts.map((part, index) => {
      if (["Increasing Trend:", "Peak Period:", "Notable Pattern:"].includes(part)) {
        return <strong key={index} style={{ display: "block", marginTop: "16px", color: "#1e293b", fontSize: "0.95rem" }}>{part}</strong>;
      }
      return <span key={index} style={{ color: "#475569", display: "block", marginTop: "4px" }}>{part}</span>;
    });
  };

  return (
    <div style={{ background: "linear-gradient(to right, #f8fafc, #ffffff)", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", marginTop: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#3b82f6"/>
        </svg>
        <h3 style={{ margin: 0, color: "#1d4ed8", fontSize: "1.15rem", fontWeight: 600 }}>AI-Generated Insight</h3>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "0.9rem" }}>
          <span style={{ width: "16px", height: "16px", border: "2px solid #cbd5e1", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
          Analyzing incident patterns...
        </div>
      ) : error ? (
        <p style={{ color: "#ef4444", fontSize: "0.9rem", margin: 0 }}>{error}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* QA Requirement: Line Chart for Trend Visualization */}
          {trendData.length > 0 && (
            <div style={{ height: "200px", width: "100%", background: "#fff", padding: "16px 16px 0 0", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '0.85rem' }}
                    formatter={(value) => [`${value} incidents`, 'Volume']}
                  />
                  <Line type="monotone" dataKey="incidents" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
            {formatInsightText(insight)}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}