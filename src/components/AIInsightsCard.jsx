import React, { useState, useEffect } from "react";
// Import Firebase functions and your db instance
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase"; 

// Using the VITE prefixed environment variable
const HF_ACCESS_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN; 
const MODEL_URL = "https://router.huggingface.co/v1/chat/completions";

export default function AIInsightsCard({ documentData, facilityData, dateRange }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentData?.length && !facilityData?.length) {
      setInsight("Insufficient data available for the selected date range to generate insights.");
      return;
    }

    const generateAIInsight = async () => {
      // Create a unique Dynamic Cache Key
      // If a new request is added, the length changes, and the cache invalidates automatically!
      const safeDateRange = dateRange.replace(/\s+/g, ''); // Removes spaces
      const cacheKey = `insight_${safeDateRange}_doc${documentData.length}_fac${facilityData.length}`;

      // ==========================================
      // TIER 1: Check Browser Session Storage
      // ==========================================
      const localCache = sessionStorage.getItem(cacheKey);
      if (localCache) {
        setInsight(localCache);
        return; // Stop here! Instant load.
      }

      setLoading(true);
      setError(null);

      try {
        // ==========================================
        // TIER 2: Check Firestore Global Cache
        // ==========================================
        const insightRef = doc(db, "ai_insights", cacheKey);
        const insightSnap = await getDoc(insightRef);

        if (insightSnap.exists()) {
          const firestoreInsight = insightSnap.data().text;
          
          // Save it locally so we don't query Firebase again this session
          sessionStorage.setItem(cacheKey, firestoreInsight); 
          setInsight(firestoreInsight);
          setLoading(false);
          return; // Stop here! Prevent AI API call.
        }

        // ==========================================
        // TIER 3: Call Hugging Face AI API
        // ==========================================
        const rawData = {
          dateRange: dateRange,
          totalDocumentRequests: documentData.reduce((acc, curr) => acc + curr.count, 0),
          totalFacilityRequests: facilityData.reduce((acc, curr) => acc + curr.count, 0),
          documentDailyBreakdown: documentData, 
          facilityDailyBreakdown: facilityData, 
        };

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
                content: "You are an expert data analyst for Barangay Malanday. Provide a concise, professional 3-sentence summary highlighting the overall request volume, peak dates, and a brief conclusion. Do not use bold text, asterisks, or markdown. Output plain text only."
              },
              {
                role: "user",
                content: `Here is the data: ${JSON.stringify(rawData)}`
              }
            ],
            max_tokens: 150,
            temperature: 0.2
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || "Failed to fetch from Hugging Face API");
        }

        const generatedText = result.choices[0].message.content.trim();

        // ==========================================
        // SAVE CACHE FOR FUTURE USERS
        // ==========================================
        
        // Save to Firebase (for other admins)
        await setDoc(insightRef, {
          text: generatedText,
          createdAt: serverTimestamp() // Tracks when the insight was generated
        });

        // Save to Session Storage (for this admin)
        sessionStorage.setItem(cacheKey, generatedText);

        setInsight(generatedText);

      } catch (err) {
        console.error("AI Generation Error:", err);
        setError("Failed to generate AI insights: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    generateAIInsight();
  }, [documentData, facilityData, dateRange]);

  return (
    <div style={{
      background: "linear-gradient(to right, #f0fdfa, #ffffff)",
      border: "1px solid #ccfbf1",
      borderRadius: "12px",
      padding: "20px",
      marginTop: "20px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        {/* ✨ AI Sparkle Icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#0d9488"/>
          <path d="M5 4L5.8 6.4L8 7L5.8 7.6L5 10L4.2 7.6L2 7L4.2 6.4L5 4Z" fill="#0d9488"/>
          <path d="M19 16L19.8 18.4L22 19L19.8 19.6L19 22L18.2 19.6L16 19L18.2 18.4L19 16Z" fill="#0d9488"/>
        </svg>
        <h3 style={{ margin: 0, color: "#0f766e", fontSize: "1.1rem" }}>
          AI-Generated Insights
        </h3>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "0.9rem" }}>
          <span className="loader" style={{ width: "16px", height: "16px", border: "2px solid #cbd5e1", borderTopColor: "#0d9488", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
          Analyzing trends and patterns...
        </div>
      ) : error ? (
        <p style={{ color: "#ef4444", fontSize: "0.9rem", margin: 0 }}>{error}</p>
      ) : (
        <p style={{ color: "#334155", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
          {insight}
        </p>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}