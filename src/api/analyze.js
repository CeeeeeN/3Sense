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

    // Extract the results
    const aiData = result.data[0]; 
    
    // Send the successful sentiment back to React app
    return res.status(200).json({
      sentiment: aiData.sentiment,
      confidence: aiData.confidence
    });

  } catch (error) {
    console.error("Vercel to HF Error:", error);
    return res.status(500).json({ message: 'AI Analysis Failed' });
  }
}