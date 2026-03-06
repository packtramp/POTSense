const { Resend } = require('resend');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, title, page, email, displayName, uid } = req.body;

  if (!type || !title || !email || !uid) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const isBug = type === 'Bug Report';
  const label = isBug ? 'bug' : 'enhancement';

  // Build GitHub Issue body
  let body = `**Submitted by:** ${displayName} (${email})\n`;
  body += `**Page/Screen:** ${page || 'Not specified'}\n\n`;

  if (isBug) {
    body += `## What's happening\n${req.body.whatHappened || 'Not provided'}\n\n`;
    if (req.body.expected) body += `## Expected behavior\n${req.body.expected}\n\n`;
    if (req.body.steps) body += `## Steps to reproduce\n${req.body.steps}\n\n`;
  } else {
    body += `## Description\n${req.body.description || 'Not provided'}\n\n`;
    if (req.body.whyUseful) body += `## Why this would be useful\n${req.body.whyUseful}\n\n`;
  }

  body += `---\n*Submitted via POTSense app feedback form*`;

  try {
    // Create GitHub Issue
    const ghToken = process.env.GITHUB_TOKEN;
    if (ghToken) {
      const ghRes = await fetch('https://api.github.com/repos/packtramp/POTSense/issues', {
        method: 'POST',
        headers: {
          'Authorization': `token ${ghToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `[${isBug ? 'Bug' : 'Feature'}] ${title}`,
          body,
          labels: [label, 'user-feedback'],
        }),
      });
      if (!ghRes.ok) console.error('GitHub Issue creation failed:', await ghRes.text());
    }

    // Also send email notification (optional — skip if no API key)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'POTSense Feedback <onboarding@resend.dev>',
          to: 'robdorsett@gmail.com',
          subject: `[POTSense ${type}] ${title}`,
          html: body.replace(/\n/g, '<br/>').replace(/## /g, '<h3>').replace(/<h3>(.*?)<br\/>/g, '<h3>$1</h3>'),
        });
      } catch (emailErr) {
        console.error('Email notification failed (non-fatal):', emailErr);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Feedback failed:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};
