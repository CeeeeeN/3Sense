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

  const seen = new Set();
  const uniqueRecipients = recipients.filter(r => {
    if (!r.to || seen.has(r.to.toLowerCase())) return false;
    seen.add(r.to.toLowerCase());
    return true;
  });

  const settled = await Promise.allSettled(
    uniqueRecipients.map(async ({ to, subject, html }) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ from, to, subject, html }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || response.statusText);
      }

      const data = await response.json();
      return { email: to, status: 'sent', messageId: data.id };
    })
  );

  const results = settled.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      email: uniqueRecipients[idx].to,
      status: 'failed',
      error: result.reason?.message || 'Unknown error',
    };
  });

  return res.status(200).json({ results });
}
