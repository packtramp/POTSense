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

      // Build summary stats
      const count = episodes.length;
      const avgSeverity = (episodes.reduce((s, e) => s + (e.severity || 3), 0) / count).toFixed(1);
      const maxSeverity = Math.max(...episodes.map((e) => e.severity || 3));

      // Top triggers (from questionnaire toggles)
      const triggerCounts = {};
      for (const ep of episodes) {
        if (ep.questionnaire?.toggles) {
          for (const [key, val] of Object.entries(ep.questionnaire.toggles)) {
            if (val === true) triggerCounts[key] = (triggerCounts[key] || 0) + 1;
          }
        }
      }
      const topTriggers = Object.entries(triggerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, ct]) => ({ name: formatTriggerName(key), count: ct }));

      // Pressure stats
      const pressureEpisodes = episodes.filter((e) => e.weather?.pressure);
      const avgPressure = pressureEpisodes.length > 0
        ? (pressureEpisodes.reduce((s, e) => s + e.weather.pressure, 0) / pressureEpisodes.length).toFixed(1)
        : null;
      const pressureDropCount = pressureEpisodes.filter(
        (e) => e.weather?.pressureChange3h && e.weather.pressureChange3h < -2
      ).length;
      const pressureCorrelation = pressureEpisodes.length > 0
        ? Math.round((pressureDropCount / pressureEpisodes.length) * 100)
        : null;

      // Severity distribution
      const severityDist = [0, 0, 0, 0, 0];
      for (const ep of episodes) severityDist[(ep.severity || 3) - 1]++;

      // Top symptoms
      const symptomCounts = {};
      for (const ep of episodes) {
        if (ep.symptoms) {
          for (const s of ep.symptoms) symptomCounts[s] = (symptomCounts[s] || 0) + 1;
        }
      }
      const topSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, ct]) => ({ name, count: ct }));

      // Build email HTML
      const html = buildEmailHtml({
        displayName: userData.displayName || 'there',
        count,
        avgSeverity,
        maxSeverity,
        topTriggers,
        topSymptoms,
        avgPressure,
        pressureCorrelation,
        severityDist,
        weekStart: weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weekEnd: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      });

      try {
        await resend.emails.send({
          from: 'POTSense <summary@potsense.org>',
          to: userData.email,
          subject: `Your Weekly POTS Summary — ${count} episode${count !== 1 ? 's' : ''} this week`,
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

function severityEmoji(sev) {
  return ['😕', '😐', '😟', '😣', '😵'][Math.min(Math.max(sev, 1), 5) - 1];
}

function severityBar(dist) {
  const max = Math.max(...dist, 1);
  const colors = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#EF5350'];
  return dist
    .map((ct, i) => {
      const pct = Math.round((ct / max) * 100);
      return `<div style="display:flex;align-items:center;gap:8px;margin:2px 0">
        <span style="width:20px;text-align:center">${i + 1}</span>
        <div style="flex:1;background:#2a2a3a;border-radius:4px;height:18px;overflow:hidden">
          <div style="width:${pct}%;background:${colors[i]};height:100%;border-radius:4px"></div>
        </div>
        <span style="width:24px;text-align:right;color:#999;font-size:12px">${ct}</span>
      </div>`;
    })
    .join('');
}

function buildEmailHtml({ displayName, count, avgSeverity, maxSeverity, topTriggers, topSymptoms, avgPressure, pressureCorrelation, severityDist, weekStart, weekEnd }) {
  const triggersHtml = topTriggers.length > 0
    ? topTriggers.map((t) => `<li style="padding:4px 0">${t.name} <span style="color:#6C8EBF">(${t.count}x)</span></li>`).join('')
    : '<li style="color:#666">No triggers recorded</li>';

  const symptomsHtml = topSymptoms.length > 0
    ? topSymptoms.map((s) => `<li style="padding:4px 0">${s.name} <span style="color:#6C8EBF">(${s.count}x)</span></li>`).join('')
    : '<li style="color:#666">No symptoms recorded</li>';

  const pressureSection = avgPressure
    ? `<div style="background:#1e1e2e;border:1px solid #333;border-radius:10px;padding:16px;margin-bottom:16px">
        <h3 style="color:#6C8EBF;margin:0 0 8px">🌡️ Pressure Insights</h3>
        <p style="color:#ccc;margin:4px 0">Average pressure: <strong>${avgPressure} hPa</strong> (${(avgPressure * 0.02953).toFixed(2)} inHg)</p>
        ${pressureCorrelation !== null ? `<p style="color:#ccc;margin:4px 0"><strong style="color:#FF9800">${pressureCorrelation}%</strong> of your episodes occurred during pressure drops (>2 hPa/3h)</p>` : ''}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#121218;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px">
      <h1 style="color:#6C8EBF;margin:0;font-size:24px">POTSense</h1>
      <p style="color:#888;margin:4px 0;font-size:13px">Weekly Summary · ${weekStart} – ${weekEnd}</p>
    </div>

    <!-- Greeting -->
    <p style="color:#e0e0e0;font-size:15px">Hi ${displayName},</p>
    <p style="color:#ccc;font-size:14px">Here's your POTS tracking summary for the past week.</p>

    <!-- Stats Row -->
    <div style="display:flex;gap:10px;margin-bottom:16px">
      <div style="flex:1;background:#1e1e2e;border:1px solid #333;border-radius:10px;padding:14px;text-align:center">
        <div style="color:#6C8EBF;font-size:28px;font-weight:700">${count}</div>
        <div style="color:#888;font-size:11px">EPISODES</div>
      </div>
      <div style="flex:1;background:#1e1e2e;border:1px solid #333;border-radius:10px;padding:14px;text-align:center">
        <div style="color:#FFC107;font-size:28px;font-weight:700">${avgSeverity}</div>
        <div style="color:#888;font-size:11px">AVG SEVERITY</div>
      </div>
      <div style="flex:1;background:#1e1e2e;border:1px solid #333;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:28px">${severityEmoji(maxSeverity)}</div>
        <div style="color:#888;font-size:11px">WORST: ${maxSeverity}/5</div>
      </div>
    </div>

    <!-- Severity Distribution -->
    <div style="background:#1e1e2e;border:1px solid #333;border-radius:10px;padding:16px;margin-bottom:16px">
      <h3 style="color:#e0e0e0;margin:0 0 8px;font-size:14px">Severity Distribution</h3>
      ${severityBar(severityDist)}
    </div>

    <!-- Top Symptoms -->
    <div style="background:#1e1e2e;border:1px solid #333;border-radius:10px;padding:16px;margin-bottom:16px">
      <h3 style="color:#e0e0e0;margin:0 0 8px;font-size:14px">Top Symptoms</h3>
      <ul style="color:#ccc;margin:0;padding-left:20px;font-size:14px">${symptomsHtml}</ul>
    </div>

    <!-- Top Triggers -->
    <div style="background:#1e1e2e;border:1px solid #333;border-radius:10px;padding:16px;margin-bottom:16px">
      <h3 style="color:#e0e0e0;margin:0 0 8px;font-size:14px">Top Triggers</h3>
      <ul style="color:#ccc;margin:0;padding-left:20px;font-size:14px">${triggersHtml}</ul>
    </div>

    <!-- Pressure -->
    ${pressureSection}

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #333">
      <p style="color:#888;font-size:12px;margin:4px 0">Keep tracking — patterns become visible over time.</p>
      <p style="color:#666;font-size:11px;margin:12px 0">
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
