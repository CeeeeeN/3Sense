import React, { useState, useEffect } from "react";

// Hugging Face Access Token
const HF_ACCESS_TOKEN = import.meta.env.HuggingFaceToken;

// Using Mistral because it doesn't require a gated license like Llama-3 does
const MODEL_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3";

export default function AIInsightsCard({ documentData, facilityData, dateRange }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to handle Hugging Face's "503 Model is Loading" error
  const fetchWithRetry = async (url, options, retries = 6, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
      const response = await fetch(url, options);
      const result = await response.json();

      // If the model is sleeping, it returns a 503 or an "estimated_time" error
      if (response.status === 503 || result.error?.includes("currently loading")) {
        console.log(`Model is sleeping. Waking it up... Retrying in ${delay / 1000}s`);
        await new Promise(res => setTimeout(res, delay));
        continue; // Try the loop again
      }

      if (!response.ok) throw new Error(result.error || "Failed to fetch from Hugging Face");
      return result;
    }
    throw new Error("The AI model took too long to wake up. Please try again.");
  };

  useEffect(() => {
    // 1. Check for insufficient data
    if (!documentData?.length && !facilityData?.length) {
      setInsight("Insufficient data available for the selected date range to generate insights.");
      return;
    }

    const generateAIInsight = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 2. Aggregate the data securely (Numbers only, NO PII/Names)
        const rawData = {
          dateRange: dateRange,
          totalDocumentRequests: documentData.reduce((acc, curr) => acc + curr.count, 0),
          totalFacilityRequests: facilityData.reduce((acc, curr) => acc + curr.count, 0),
          documentDailyBreakdown: documentData, 
          facilityDailyBreakdown: facilityData, 
        };

        // 3. Format the Prompt for Mistral (Using [INST] tags)
        const prompt = `[INST] You are an expert data analyst for Barangay Malanday. Analyze the following aggregated JSON data representing Document and Facility requests.
        
        Data: ${JSON.stringify(rawData)}
        
        Provide a concise, professional 3-sentence summary highlighting:
        1. The overall request volume and notable trends.
        2. The peak request dates.
        3. A brief conclusion on service engagement.
        
        Do not use bold text, asterisks, or markdown formatting. Output plain text only. Do not include introductory phrases like 'Here is the summary'. [/INST]`;

        // 4. Send the request to Hugging Face
        const response = await fetchWithRetry(MODEL_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 150, // Limits the output length
              return_full_text: false, // Prevents returning our original prompt
              temperature: 0.2 // Keeps the AI factual and less "creative"
            }
          })
        });

        // 5. Clean up the response
        let generatedText = response[0].generated_text.trim();
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
          Waking up AI model and analyzing trends...
        </div>
      ) : error ? (
        <p style={{ color: "#ef4444", fontSize: "0.9rem", margin: 0 }}>{error}</p>
      ) : (
        <p style={{ color: "#334155", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
          {insight}
        </p>
      )}
      
      {/* CSS for the spinning loader */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}