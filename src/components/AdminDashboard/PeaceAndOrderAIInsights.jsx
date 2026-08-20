import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";

const HF_ACCESS_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN;
const MODEL_URL = "https://router.huggingface.co/v1/chat/completions";

export default function PeaceAndOrderAIInsights() {
  const [insight, setInsight] = useState("");
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

        // 2. Acceptance Criteria: Handle insufficient data gracefully
        if (rawReports.length < 5) {
          setInsight("Insufficient data to identify a reliable trend. More incident reports are required.");
          setLoading(false);
          return;
        }

        // 3. Acceptance Criteria: Strip PII and anonymous reporter info
        // We only pass the exact fields the AI needs to find spatial/temporal patterns
        const safeData = rawReports.map(r => ({
          type: r.incidentType,
          location: r.location,
          date: r.date,
          time: r.time,
          urgency: r.urgency
        }));

        // 4. Acceptance Criteria: Analytics update when new reports are added
        const cacheKey = `po_insight_count_${safeData.length}`;

        // Check Tier 1 Cache (Browser Session)
        const localCache = sessionStorage.getItem(cacheKey);
        if (localCache) {
          setInsight(localCache);
          setLoading(false);
          return;
        }

        // Check Tier 2 Cache (Firestore Global)
        const insightRef = doc(db, "ai_insights", cacheKey);
        const insightSnap = await getDoc(insightRef);
        if (insightSnap.exists()) {
          const firestoreText = insightSnap.data().text;
          sessionStorage.setItem(cacheKey, firestoreText);
          setInsight(firestoreText);
          setLoading(false);
          return;
        }

        // 5. Call Hugging Face API
        const response = await fetch(MODEL_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-ai/DeepSeek-V3-0324",
            messages: [
              {
                role: "system",
                content: "You are an expert crime and incident analyst for a local Barangay. Based ONLY on the provided JSON data, provide a concise summary identifying trends. You MUST format your output exactly like this (do not use markdown asterisks or extra text):\n\nIncreasing Trend: [Your observation]\nPeak Period: [Your observation]\nNotable Pattern: [Your observation]"
              },
              {
                role: "user",
                content: `Analyze this data: ${JSON.stringify(safeData)}`
              }
            ],
            max_tokens: 200,
            temperature: 0.2
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || "Failed to fetch from Hugging Face API");
        }

        const generatedText = result.choices[0].message.content.trim();

        // Save to Caches
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

  // Simple parser to bold the specific ticket-requested headers
  const formatInsightText = (text) => {
    if (!text.includes("Increasing Trend:")) return <p>{text}</p>;
    
    const parts = text.split(/(Increasing Trend:|Peak Period:|Notable Pattern:)/).filter(Boolean);
    return parts.map((part, index) => {
      if (["Increasing Trend:", "Peak Period:", "Notable Pattern:"].includes(part)) {
        return <strong key={index} style={{ display: "block", marginTop: "12px", color: "#1e293b" }}>{part}</strong>;
      }
      return <span key={index} style={{ color: "#334155" }}>{part}</span>;
    });
  };

  return (
    <div style={{ background: "linear-gradient(to right, #f8fafc, #ffffff)", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", marginTop: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        {/* AI Sparkle Icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#3b82f6"/>
        </svg>
        <h3 style={{ margin: 0, color: "#1d4ed8", fontSize: "1.1rem" }}>AI-Generated Insight</h3>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "0.9rem" }}>
          <span style={{ width: "16px", height: "16px", border: "2px solid #cbd5e1", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
          Analyzing spatial and temporal incident patterns...
        </div>
      ) : error ? (
        <p style={{ color: "#ef4444", fontSize: "0.9rem", margin: 0 }}>{error}</p>
      ) : (
        <div style={{ fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
          {formatInsightText(insight)}
        </div>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}