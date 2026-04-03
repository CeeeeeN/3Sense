import { Client } from "@gradio/client";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Feedback text is required' });
  }

  try {
    // Connect to Hugging Face Space
    const client = await Client.connect("3Sense/3Sense");
    
    // Send the feedback text to the AI model
    const result = await client.predict("/analyze_barangay_feedback", {
        user_input: text,
    });

    // Grab the raw string from Python
    let aiDataRaw = result.data[0]; 
    console.log("RAW HUGGING FACE OUTPUT:", aiDataRaw);

    let finalSentiment = null;
    let finalConfidence = null;

    // This scans the string and forcibly gets the exact values, regardless of quotes/formatting
    if (typeof aiDataRaw === 'string') {
      
      // Look for the word after 'sentiment': 
      // It matches Positive, Negative, or Neutral
      const sentimentMatch = aiDataRaw.match(/'sentiment':\s*'([^']+)'/);
      if (sentimentMatch && sentimentMatch[1]) {
        finalSentiment = sentimentMatch[1];
      }

      // Look for the number after 'confidence':
      const confidenceMatch = aiDataRaw.match(/'confidence':\s*([\d.]+)/);
      if (confidenceMatch && confidenceMatch[1]) {
        finalConfidence = parseFloat(confidenceMatch[1]);
      }
      
    } else if (typeof aiDataRaw === 'object') {
      // Fallback just in case Python never sends real JSON natively
      finalSentiment = aiDataRaw.sentiment;
      finalConfidence = aiDataRaw.confidence;
    }
    
    console.log("EXTRACTED DATA:", finalSentiment, finalConfidence);

    // Send the data back to the system
    return res.status(200).json({
      sentiment: finalSentiment,
      confidence: finalConfidence
    });

  } catch (error) {
    console.error("Vercel to HF Error:", error);
    return res.status(500).json({ message: 'AI Analysis Failed' });
  }
}