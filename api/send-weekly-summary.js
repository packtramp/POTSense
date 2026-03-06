// Vercel serverless function — sends weekly summary emails to opted-in users
// Triggered by cron-job.org (weekly, Sunday morning)
// Auth: Bearer token via CRON_SECRET env var

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { Resend } = require('resend');

// Firebase Admin init (singleton)
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = getFirestore();

module.exports = async (req, res) => {
  // Auth check
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all users with email notifications enabled
    const usersSnap = await db.collection('users').get();
    let sent = 0;
    let skipped = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;

      // Skip if no email or notifications disabled
      if (!userData.email) { skipped++; continue; }
      const emailEnabled = userData.settings?.emailNotifications?.enabled;
      if (emailEnabled === false) { skipped++; continue; }

      // Fetch this week's episodes
      const episodesSnap = await db
        .collection('users').doc(uid)
        .collection('episodes')
        .where('timestamp', '>=', weekAgo)
        .orderBy('timestamp', 'desc')
        .get();

      const episodes = episodesSnap.docs.map((d) => d.data());

      // Skip if no episodes this week
      if (episodes.length === 0) { skipped++; continue; }

      // Collect symptoms and triggers
      const symptomCounts = {};
      const triggerCounts = {};
      for (const ep of episodes) {
        if (ep.symptoms) {
          for (const s of ep.symptoms) symptomCounts[s] = (symptomCounts[s] || 0) + 1;
        }
        if (ep.questionnaire?.toggles) {
          for (const [key, val] of Object.entries(ep.questionnaire.toggles)) {
            if (val === true) triggerCounts[key] = (triggerCounts[key] || 0) + 1;
          }
        }
      }
      const symptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, ct]) => ({ name, count: ct }));
      const triggers = Object.entries(triggerCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([key, ct]) => ({ name: formatTriggerName(key), count: ct }));

      // Build email HTML
      const html = buildEmailHtml({
        displayName: userData.displayName || 'there',
        episodes,
        symptoms,
        triggers,
        weekStart: weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weekEnd: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      });

      try {
        await resend.emails.send({
          from: 'POTSense <summary@potsense.org>',
          to: userData.email,
          subject: `Weekly POTS Report — ${episodes.length} episode${episodes.length !== 1 ? 's' : ''} (${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
          html,
        });
        sent++;
      } catch (emailErr) {
        console.error(`Failed to send to ${userData.email}:`, emailErr.message);
      }
    }

    res.status(200).json({ sent, skipped, total: usersSnap.size });
  } catch (err) {
    console.error('Weekly summary failed:', err);
    res.status(500).json({ error: err.message });
  }
};

function formatTriggerName(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(ts) {
  if (!ts) return 'Unknown';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function buildEmailHtml({ displayName, episodes, symptoms, triggers, weekStart, weekEnd }) {
  // Episode log table rows
  const episodeRows = episodes.map((ep) => {
    const date = formatDateTime(ep.timestamp);
    const severity = ep.severity || '—';
    const pressure = ep.weather?.pressure
      ? `${ep.weather.pressure.toFixed(1)} hPa (${(ep.weather.pressure * 0.02953).toFixed(2)} inHg)`
      : '—';
    const trend = ep.weather?.pressureChange3h
      ? `${ep.weather.pressureChange3h > 0 ? '+' : ''}${ep.weather.pressureChange3h.toFixed(1)} hPa/3h`
      : '';
    const epSymptoms = (ep.symptoms || []).join(', ') || '—';
    return `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #333;color:#ccc;font-size:13px;white-space:nowrap">${date}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #333;color:#FFC107;font-size:13px;text-align:center">${severity}/5</td>
      <td style="padding:8px 10px;border-bottom:1px solid #333;color:#ccc;font-size:12px">${pressure}${trend ? `<br/><span style="color:#888;font-size:11px">${trend}</span>` : ''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #333;color:#ccc;font-size:12px">${epSymptoms}</td>
    </tr>`;
  }).join('');

  // Symptoms summary
  const symptomsHtml = symptoms.length > 0
    ? symptoms.map((s) => `<span style="display:inline-block;background:#2a2a3a;border-radius:4px;padding:3px 8px;margin:2px;font-size:12px;color:#ccc">${s.name} <span style="color:#6C8EBF">(${s.count})</span></span>`).join('')
    : '<span style="color:#666;font-size:12px">None recorded</span>';

  // Triggers summary
  const triggersHtml = triggers.length > 0
    ? triggers.map((t) => `<span style="display:inline-block;background:#2a2a3a;border-radius:4px;padding:3px 8px;margin:2px;font-size:12px;color:#ccc">${t.name} <span style="color:#6C8EBF">(${t.count})</span></span>`).join('')
    : '<span style="color:#666;font-size:12px">None recorded</span>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#121218;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:20px">
      <h1 style="color:#6C8EBF;margin:0;font-size:22px">POTSense — Weekly Report</h1>
      <p style="color:#888;margin:4px 0;font-size:13px">${weekStart} – ${weekEnd}</p>
    </div>

    <p style="color:#e0e0e0;font-size:14px;margin-bottom:16px">Hi ${displayName}, here is your episode summary for the past week. You can share this with your healthcare provider.</p>

    <!-- Episode Log -->
    <div style="background:#1e1e2e;border:1px solid #333;border-radius:10px;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 14px;border-bottom:1px solid #333">
        <h3 style="color:#e0e0e0;margin:0;font-size:14px">Episode Log (${episodes.length} total)</h3>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#252535">
            <th style="padding:8px 10px;text-align:left;color:#888;font-size:11px;font-weight:600">DATE/TIME</th>
            <th style="padding:8px 10px;text-align:center;color:#888;font-size:11px;font-weight:600">SEV.</th>
            <th style="padding:8px 10px;text-align:left;color:#888;font-size:11px;font-weight:600">PRESSURE</th>
            <th style="padding:8px 10px;text-align:left;color:#888;font-size:11px;font-weight:600">SYMPTOMS</th>
          </tr>
        </thead>
        <tbody>${episodeRows}</tbody>
      </table>
    </div>

    <!-- Symptoms Summary -->
    <div style="background:#1e1e2e;border:1px solid #333;border-radius:10px;padding:14px;margin-bottom:12px">
      <h3 style="color:#e0e0e0;margin:0 0 8px;font-size:13px">Symptoms This Week</h3>
      <div>${symptomsHtml}</div>
    </div>

    <!-- Triggers Summary -->
    <div style="background:#1e1e2e;border:1px solid #333;border-radius:10px;padding:14px;margin-bottom:16px">
      <h3 style="color:#e0e0e0;margin:0 0 8px;font-size:13px">Triggers This Week</h3>
      <div>${triggersHtml}</div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:20px;padding-top:14px;border-top:1px solid #333">
      <p style="color:#666;font-size:11px;margin:8px 0">
        <a href="https://potsense.org" style="color:#6C8EBF;text-decoration:none">Open POTSense</a>
      </p>
      <p style="color:#555;font-size:10px;margin:8px 0">
        You're receiving this because you have weekly summaries enabled.
        <br/>To unsubscribe, go to Settings → Email Notifications in the app.
      </p>
      <p style="color:#555;font-size:10px">POTSense is not medical advice. Always consult your healthcare provider.</p>
    </div>
  </div>
</body>
</html>`;
}
