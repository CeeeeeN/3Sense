import { Client } from "@gradio/client";

// ─── OPTIMIZED: Global Cache for Serverless Cold Starts ───
// By defining this outside the handler, the server keeps the connection alive 
// for "warm" invocations. This drops response time from ~2000ms down to ~200ms 
// on subsequent requests by reusing the established Hugging Face connection.
let cachedClient = null;

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  // Extract text and rating from the frontend request
  const { text, rating } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Feedback text is required' });
  }

  try {
    // ─── OPTIMIZED: Use cached client if available ───
    if (!cachedClient) {
      cachedClient = await Client.connect("3Sense/3Sense");
    }

    // Send BOTH inputs to the AI model
    const result = await cachedClient.predict("/analyze_barangay_feedback", [
        text,
        rating ? parseInt(rating) : 3
    ]);

    // Extract the JSON dictionary returned
    const aiData = result.data[0]; 
    
    // Send all the metrics back to React
    return res.status(200).json({
      sentiment: aiData.sentiment,
      hybridScore: aiData.hybrid_score,
      textScore: aiData.text_contribution_score,
      confidence: aiData.ai_confidence,
      detectedIssue: aiData.detected_issue,
      issueConfidence: aiData.issue_confidence,
      severity: aiData.severity
    });

  } catch (error) {
    console.error("Vercel to HF Error:", error);
    
    // ─── OPTIMIZED: Self-Healing ───
    // If the Hugging Face space goes to sleep or errors out, destroy the cached 
    // client so the next user request forces a fresh reconnection.
    cachedClient = null;

    return res.status(500).json({ 
        message: 'AI Analysis Failed. The model may be sleeping or busy.',
        error: error.message 
    });
  }
}