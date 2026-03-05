# POTSense - Notification System

## Channels

| Channel | Library | Status | Use Case |
|---------|---------|--------|----------|
| **Push** | expo-notifications + FCM/APNs | Build in v1 | Real-time alerts (episodes, pressure) |
| **Email** | Resend | Build in v1 | Check-in reminders, weekly summary, reports |
| **SMS** | Twilio | When A2P approved | Critical alerts (optional opt-in) |

---

## Notification Types

### 1. Episode Alert (to partners)
- **Channel:** Push
- **Trigger:** Member (or another partner) logs an episode
- **Recipient:** All linked partners
- **Message:** "[Name] logged a POTS episode. Tap to help fill in details."
- **Action:** Opens episode detail screen
- **Dedup:** None needed (one per episode)

### 2. Pressure Drop Alert
- **Channel:** Push
- **Trigger:** Barometric pressure drops > threshold in 3h window
- **Recipient:** Member + linked partners
- **Message:** "Pressure dropping fast (↓5 hPa in 3h). Stay prepared."
- **Threshold:** Default 5 hPa, configurable in settings
- **Dedup:** Max 1 per 6 hours (`lastPressureAlertSent` on user doc)
- **Implementation:** Cron job every 30 min → fetch pressure → compare to 3h ago

### 3. Evening Check-in Reminder
- **Channel:** Push + Email (Resend)
- **Trigger:** Daily at user-set time (default 8 PM)
- **Recipient:** Member only
- **Push:** "Time for your evening check-in! How was your day?"
- **Email:** Summary of today's tracking + "Anything to add?" link
- **Dedup:** `lastCheckInSent` date on user doc
- **Skip if:** User already logged daily trackers today

### 4. Weekly Summary
- **Channel:** Push + Email (Resend)
- **Trigger:** Sunday 10 AM (user's timezone)
- **Recipient:** Member only
- **Content:**
  - Episode count this week
  - Average severity
  - Top trigger correlation
  - Pressure correlation stat
  - "View full trends →" link
- **Dedup:** `lastWeeklySummarySent` date on user doc

### 5. 30-Day History Nag (free users only)
- **Channel:** Push
- **Trigger:** When free user's oldest visible episode is about to age out
- **Recipient:** Free-tier members only
- **Message:** "You have [X] episodes tracked. Unlock full history for $4.99/mo."
- **Frequency:** Max once per week
- **Dedup:** `lastHistoryNagSent` date on user doc

### 6. Welcome Email
- **Channel:** Email (Resend)
- **Trigger:** Account creation
- **Content:** Welcome message, quick start tips, link to app
- **From:** noreply@potsense.org

### 8. Partner-Logged Episode Summary (to member, next morning)
- **Channel:** Email (Resend)
- **Trigger:** Partner logs an episode for the member
- **Recipient:** Member only
- **Timing:** Next morning at 9 AM (member's timezone), NOT immediately
- **Rationale:** Member may be wiped out from the episode — don't pile on notifications same day
- **Content:** "[Partner] logged an episode for you yesterday at [time]. Severity: [X/5]. Tap to review and confirm details."
- **Action:** Link opens episode detail screen
- **Dedup:** `lastPartnerEpisodeSummary` date on user doc
- **Batch:** If partner logged multiple episodes, combine into single email summary

### 9. Partner Invite
- **Channel:** Push + Email + SMS (when available)
- **Trigger:** Member generates invite code and shares
- **Content:** "[Name] invited you to help track their POTS symptoms with POTSense. Code: [A7K9M2]"

---

## Architecture

### Push Notifications (expo-notifications)

**Client setup (app launch):**
```
1. Register for push notifications (expo-notifications)
2. Get Expo push token
3. Save token to Firestore: users/{uid}/pushToken
4. Re-register on every app launch (token can change)
```

**Server sending (Vercel API):**
```
POST /api/send-push
Body: { targetUids: string[], title: string, body: string, data: object }

1. Look up push tokens from Firestore
2. POST to https://exp.host/--/api/v2/push/send
3. Handle ticket responses (check for errors)
```

### Email (Resend — reused from GCC Counseling)

**Env vars:**
- `RESEND_API_KEY`
- Verified domain: potsense.org
- From: `noreply@potsense.org`

**Pattern (copied from counseling project):**
```javascript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'POTSense <noreply@potsense.org>',
  to: userEmail,
  subject: 'Your Weekly POTSense Summary',
  html: buildEmailTemplate(data),
});
```

### SMS (Twilio — when A2P approved)

**Same dynamic import pattern as counseling project:**
```javascript
const twilioClient = (await import('twilio')).default;
const client = twilioClient(accountSid, authToken);
await client.messages.create({
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  to: phone,
  body: message,
});
```

**Status:** A2P 10DLC campaign pending (Attempt #5, submitted 2026-02-20). Can reuse same Twilio account as counseling project or create separate campaign for POTSense.

---

## Cron Jobs (via cron-job.org)

| Job | URL | Schedule | Auth |
|-----|-----|----------|------|
| Check-in reminders | `/api/send-reminders?type=checkin` | Every hour | Bearer token |
| Pressure checks | `/api/send-reminders?type=pressure` | Every 30 min | Bearer token |
| Weekly summary | `/api/send-reminders?type=weekly` | Sunday 10 AM | Bearer token |
| Invite code cleanup | `/api/send-reminders?type=cleanup` | Daily midnight | Bearer token |

**Auth:** `REMINDER_SECRET` env var, same pattern as counseling project.

---

## Vercel API Routes

### /api/send-push.js
- Called internally by other API routes
- Accepts target UIDs, looks up push tokens, sends via Expo push service
- Handles batch sending (up to 100 per request)

### /api/send-reminders.js
- Single endpoint, `type` query param determines behavior
- `type=checkin`: Loop all users with checkInReminder enabled, check timezone, send if time matches
- `type=pressure`: Loop all users with pressureAlerts enabled, fetch pressure, compare, alert if threshold met
- `type=weekly`: Loop all users, calculate weekly stats, send summary
- `type=cleanup`: Delete expired invite codes

### /api/send-invite.js
- Called when member shares invite code
- Sends email + SMS (if phone provided) with code

### /api/episode-alert.js
- Called by client after episode is created
- Looks up linked partners, sends push notification to each

---

## User Settings (notification preferences)

```
Settings → Notifications:
  🌡️ Pressure Alerts      [ON/OFF]
     Threshold: [5] hPa in 3h
  🔔 Check-in Reminder    [ON/OFF]
     Time: [8:00 PM]
  📧 Weekly Email Summary  [ON/OFF]
  📱 Partner Episode Alerts [ON/OFF]  (partner accounts only)
  📱 SMS Notifications     [ON/OFF]  (when available)
     Phone: [___-___-____]
```

All stored on Firestore `users/{uid}/settings/notifications`.
