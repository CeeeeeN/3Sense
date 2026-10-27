export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from, recipients } = req.body;

  if (!from || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      error: 'Missing required fields: from, recipients (array)',
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  // Deduplicate recipients
  const seen = new Set();
  const uniqueRecipients = recipients.filter(r => {
    if (!r.to || seen.has(r.to.toLowerCase())) return false;
    seen.add(r.to.toLowerCase());
    return true;
  });

  const finalResults = [];
  const BATCH_LIMIT = 100; // Resend's maximum allowed emails per batch request

  // ─── OPTIMIZED: Chunked Batch Processing ───
  // Bypasses the 2 req/sec rate limit by grouping up to 100 emails into a single HTTP payload
  for (let i = 0; i < uniqueRecipients.length; i += BATCH_LIMIT) {
    const chunk = uniqueRecipients.slice(i, i + BATCH_LIMIT);
    
    // Format the payload exactly how Resend's Batch API expects it
    const batchPayload = chunk.map(r => ({
      from,
      to: [r.to],
      subject: r.subject,
      html: r.html
    }));

    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(batchPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        // If the entire HTTP request failed (e.g. invalid API key)
        chunk.forEach(r => {
          finalResults.push({ 
            email: r.to, 
            status: 'failed', 
            error: data.message || response.statusText 
          });
        });
        continue;
      }

      // Resend Batch API returns an array of results inside `data.data`
      const batchResults = data.data || [];
      
      chunk.forEach((r, idx) => {
        const resendResult = batchResults[idx];
        if (resendResult && resendResult.id) {
          finalResults.push({ 
            email: r.to, 
            status: 'sent', 
            messageId: resendResult.id 
          });
        } else {
          finalResults.push({ 
            email: r.to, 
            status: 'failed', 
            error: resendResult?.error?.message || 'Failed to send' 
          });
        }
      });
      
    } catch (err) {
      // Catch network-level errors
      chunk.forEach(r => {
        finalResults.push({ email: r.to, status: 'failed', error: err.message });
      });
    }
  }

  return res.status(200).json({ results: finalResults });
}