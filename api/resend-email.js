export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from, to, subject, html } = req.body;

  // Validate required fields
  if (!from || !to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: from, to, subject, html' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  // ─── OPTIMIZED: Serverless Timeout Protection ───
  // Force aborts the request after 8 seconds to prevent Vercel billing leaks if Resend hangs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // ─── OPTIMIZED: Defensive JSON Parsing ───
      // Prevents crashes if Resend is down and returns raw HTML instead of JSON
      const errorBody = await response.json().catch(() => ({}));
      console.error('Resend API error:', errorBody);
      return res.status(response.status).json({ 
        error: `Failed to send email: ${errorBody.message || response.statusText || 'Unknown Error'}` 
      });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, messageId: data.id });
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle the specific AbortController timeout error
    if (error.name === 'AbortError') {
      console.error('Email handler timeout: Resend API took too long');
      return res.status(504).json({ error: 'Email service timed out. Please try again.' });
    }

    console.error('Email handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}