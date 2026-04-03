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

    console.log("RAW HUGGING FACE OUTPUT:", JSON.stringify(result.data));

    // Grab the raw output from Python
    let aiDataRaw = result.data[0]; 
    let aiObject = {};

    // Transform the Python string into a real JavaScript JSON object
    if (typeof aiDataRaw === 'string') {
      // Replace Python's single quotes with JSON's double quotes
      const validJsonString = aiDataRaw.replace(/'/g, '"');
      aiObject = JSON.parse(validJsonString);
    } else {
      aiObject = aiDataRaw; 
    }
    
    // Send the properly parsed data back to React
    return res.status(200).json({
      Sentiment: aiObject.sentiment || null,
      Confidence: aiObject.confidence || null
    });

  } catch (error) {
    console.error("Vercel to HF Error:", error);
    return res.status(500).json({ message: 'AI Analysis Failed' });
  }
}