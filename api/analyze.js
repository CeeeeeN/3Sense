import { Client } from "@gradio/client";

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
    // Connect to Hugging Face Space
    const client = await Client.connect("3Sense/3Sense");
    // Send BOTH inputs to the AI model
    const result = await client.predict("/analyze_barangay_feedback", [
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
      issueConfidence: aiData.issue_confidence
    });

  } catch (error) {
    console.error("Vercel to HF Error:", error);
    return res.status(500).json({ message: 'AI Analysis Failed' });
  }
}
