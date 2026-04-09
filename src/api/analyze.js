import { Client } from "@gradio/client";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  // 1. Extract BOTH text and rating from the frontend request
  const { text, rating } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Feedback text is required' });
  }

  try {
    // Connect to Hugging Face Space
    const client = await Client.connect("3Sense/3Sense"); // Make sure this matches your HF space name
    
    // 2. Send BOTH inputs to the AI model
    // We use a fallback of 3 (Neutral) just in case the rating somehow didn't send
    const result = await client.predict("/analyze_barangay_feedback", {
        user_input: text,
        star_rating: rating ? parseInt(rating) : 3, 
    });

    // 3. Extract the new JSON dictionary returned by your updated Gradio app
    const aiData = result.data[0]; 
    
    // 4. Send all the new hybrid metrics back to your React app
    return res.status(200).json({
      sentiment: aiData.sentiment,
      hybridScore: aiData.hybrid_score,
      textScore: aiData.text_contribution_score,
      confidence: aiData.ai_confidence
    });

  } catch (error) {
    console.error("Vercel to HF Error:", error);
    return res.status(500).json({ message: 'AI Analysis Failed' });
  }
}