const { Resend } = require('resend');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, message, email, displayName, uid } = req.body;

  if (!type || !message || !email || !uid) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'POTSense Feedback <feedback@potsense.org>',
      to: 'robdorsett@gmail.com',
      subject: `[POTSense ${type}] from ${displayName || 'Unknown'}`,
      html: `<p><strong>From:</strong> ${displayName} (${email})</p>
             <p><strong>Type:</strong> ${type}</p>
             <p><strong>UID:</strong> ${uid}</p>
             <hr/>
             <p>${message.replace(/\n/g, '<br/>')}</p>`,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Feedback email failed:', err);
    res.status(500).json({ error: 'Failed to send feedback' });
  }
};
