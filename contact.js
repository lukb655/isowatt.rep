// Vercel Serverless Function — /api/contact
// Receives form submissions from contact.html and sends email via Resend API.
//
// SETUP:
//   1. Create a free account at resend.com
//   2. Verify your domain (isowatt.shop) in Resend → Domains
//   3. Create an API key at Resend → API Keys
//   4. In Vercel dashboard → your project → Settings → Environment Variables:
//      Add: RESEND_API_KEY = re_xxxxxxxxxxxx
//      Add: CONTACT_TO_EMAIL = your@email.com   (where you want leads delivered)
//      Add: CONTACT_FROM_EMAIL = hello@isowatt.shop
//   5. Redeploy once to pick up the env vars.

export default async function handler(req, res) {
  // CORS — allow requests from your own domain only
  const origin = req.headers.origin || '';
  const allowed = ['https://isowatt.shop', 'https://www.isowatt.shop'];
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', allowed.includes(origin) ? origin : allowed[0]);
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_KEY    = process.env.RESEND_API_KEY;
  const TO_EMAIL      = process.env.CONTACT_TO_EMAIL    || 'lukeb655@icloud.com';
  const FROM_EMAIL    = process.env.CONTACT_FROM_EMAIL  || 'hello@isowatt.shop';

  if (!RESEND_KEY) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured.' });
  }

  // Parse body (Vercel parses JSON automatically)
  const { name, email, subject, message, type } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  // Simple email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Honeypot check (bot trap)
  if (req.body?.website) {
    return res.status(200).json({ ok: true }); // silently accept bots
  }

  const subjectLine = subject
    ? `[IsoWatt] ${subject}`
    : `[IsoWatt] New ${type || 'inquiry'} from ${name}`;

  const htmlBody = `
<div style="font-family:sans-serif;max-width:600px;color:#333;">
  <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0;">
    <span style="font-family:monospace;font-size:20px;font-weight:900;letter-spacing:0.1em;color:#f0a500;">ISOWATT</span>
    <span style="font-size:12px;color:#777;margin-left:12px;text-transform:uppercase;letter-spacing:0.1em;">New Inquiry</span>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:8px 0;color:#777;font-size:13px;width:100px;">From</td>
          <td style="padding:8px 0;font-weight:600;">${escHtml(name)}</td></tr>
      <tr><td style="padding:8px 0;color:#777;font-size:13px;">Email</td>
          <td style="padding:8px 0;"><a href="mailto:${escHtml(email)}" style="color:#f0a500;">${escHtml(email)}</a></td></tr>
      <tr><td style="padding:8px 0;color:#777;font-size:13px;">Type</td>
          <td style="padding:8px 0;">${escHtml(type || 'General Inquiry')}</td></tr>
    </table>
    <div style="background:#f9f9f9;border-left:3px solid #f0a500;padding:16px;border-radius:0 4px 4px 0;white-space:pre-wrap;font-size:14px;line-height:1.7;">${escHtml(message)}</div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
      <a href="mailto:${escHtml(email)}" style="display:inline-block;padding:10px 20px;background:#f0a500;color:#000;text-decoration:none;border-radius:5px;font-weight:700;font-size:13px;letter-spacing:0.05em;">Reply to ${escHtml(name)} →</a>
    </div>
  </div>
  <p style="font-size:11px;color:#aaa;margin-top:12px;">Sent from isowatt.shop/contact · ${new Date().toUTCString()}</p>
</div>`;

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `IsoWatt Contact <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        reply_to: email,
        subject: subjectLine,
        html: htmlBody,
        text: `New inquiry from ${name} (${email})\nType: ${type || 'General'}\n\n${message}`
      })
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email. Try again or email us directly.' });
    }

    // Send auto-reply to customer
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `IsoWatt <${FROM_EMAIL}>`,
        to: [email],
        subject: `Got your message — IsoWatt`,
        html: `<div style="font-family:sans-serif;max-width:500px;color:#333;">
  <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0;">
    <span style="font-family:monospace;font-size:20px;font-weight:900;letter-spacing:0.1em;color:#f0a500;">ISOWATT</span>
  </div>
  <div style="padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px;">
    <p style="font-size:16px;font-weight:600;margin:0 0 12px;">Hey ${escHtml(name)},</p>
    <p style="line-height:1.7;color:#555;">Thanks for reaching out. I got your message and will get back to you within 24 hours (usually sooner).</p>
    <p style="line-height:1.7;color:#555;margin-top:12px;">In the meantime, feel free to browse the <a href="https://isowatt.shop/products.html" style="color:#f0a500;">prebuilt options</a> or use the <a href="https://isowatt.shop/configurator.html" style="color:#f0a500;">configurator</a> to spec out a custom build.</p>
    <p style="margin-top:24px;color:#555;">— Luke<br><span style="font-size:12px;color:#aaa;">IsoWatt LLC · Bellefonte, PA</span></p>
  </div>
</div>`
      })
    }).catch(() => {}); // auto-reply failure is non-critical

    return res.status(200).json({ ok: true, message: 'Message sent! You\'ll hear back within 24 hours.' });
  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: 'Server error. Please email us directly.' });
  }
}
