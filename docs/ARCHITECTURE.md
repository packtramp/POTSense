# POTSense - Architecture Document

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Expo)                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │   iOS    │  │ Android  │  │   Web    │  │  (v2)   │ │
│  │   App    │  │   App    │  │   App    │  │  Watch  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       └──────────────┴──────────────┴──────────────┘     │
│                    Expo Router                           │
│              (shared codebase, TypeScript)               │
└──────────────┬──────────────┬───────────────┬───────────┘
               │              │               │
    ┌──────────▼──────┐ ┌─────▼─────┐ ┌───────▼──────┐
    │   Firebase      │ │ Open-Meteo│ │  RevenueCat  │
    │  Auth +         │ │  Weather  │ │  Subscriptions│
    │  Firestore      │ │  API      │ │  + IAP        │
    └──────────┬──────┘ └───────────┘ └──────────────┘
               │
    ┌──────────▼──────────────────────┐
    │   Vercel Serverless Functions   │
    │  ┌────────┐ ┌────────┐ ┌──────┐│
    │  │ Resend │ │Twilio  │ │ Cron ││
    │  │ Email  │ │ SMS    │ │ Jobs ││
    │  └────────┘ └────────┘ └──────┘│
    └─────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Expo SDK 52+ (React Native) | Cross-platform: iOS, Android, Web |
| **Navigation** | Expo Router v4 | File-based routing, tab navigation |
| **Language** | TypeScript | Type safety throughout |
| **Auth** | Firebase Auth | Email/password, Google, Apple sign-in |
| **Database** | Firebase Firestore | Cloud data + offline persistence |
| **Local Cache** | Firestore offline persistence | Built-in, no separate SQLite needed |
| **Weather** | Open-Meteo API | Barometric pressure, temp, humidity (free, no key) |
| **Subscriptions** | RevenueCat | IAP management, receipt validation, entitlements |
| **Email** | Resend | Transactional email (check-in reminders, reports) |
| **SMS** | Twilio | SMS notifications (pending A2P approval) |
| **Push** | expo-notifications + FCM/APNs | Native push notifications |
| **Hosting (Web)** | Vercel | Web app + serverless API routes |
| **PDF** | expo-print + expo-sharing | Doctor report generation |
| **Charts** | react-native-svg (custom SVG) | Pressure charts, trend visualizations |
| **Clipboard** | expo-clipboard | Social share copy-to-clipboard |
| **Deployment** | EAS Build + EAS Submit | iOS/Android builds + app store submission |

---

## Why Firestore Instead of SQLite

Original plan was SQLite (local-first). But partner accounts + cloud sync changed things:

| Concern | SQLite | Firestore |
|---------|--------|-----------|
| Partner accounts sharing data | Need separate sync layer | Built-in, real-time |
| Offline support | Native | Built-in offline persistence |
| Multi-device sync | Manual implementation | Automatic |
| Auth integration | Separate | Native Firebase Auth |
| Real-time partner updates | Not possible | Real-time listeners |
| Complexity | Simple locally, complex for sync | Simple everywhere |
| Cost | Free | Free tier: 50K reads, 20K writes/day |

**Decision:** Firestore with offline persistence enabled. Data syncs automatically when online. Works offline seamlessly. Partners see updates in real-time.

---

## Data Flow

### Episode Logging Flow
```
User taps LOG
  │
  ├─► Timestamp captured (or user picks past time)
  ├─► GPS coordinates fetched (expo-location)
  ├─► Open-Meteo API called with coords → weather data returned
  │     • surface_pressure (hPa)
  │     • temperature
  │     • humidity
  │     • wind_speed
  │     • weather_code
  │     • pressure_change_3h (calculated from hourly history)
  │
  ├─► Episode doc created in Firestore:
  │     patients/{memberUid}/episodes/{auto-id}
  │
  ├─► Swipe Questionnaire launches (14-16 cards)
  │     • Daily log data pre-fills card bias
  │     • Binary answers saved to episode.questionnaire
  │     • Exact values (premium) saved to episode.questionnaire_exact
  │
  ├─► Severity emoji picker (1-5)
  ├─► Optional notes text field
  │
  ├─► Episode doc updated with all data
  │
  └─► Push notification sent to linked partners
        (via Vercel API → expo-notifications)
```

### Daily Tracker Flow
```
User opens Home screen
  │
  ├─► Daily tracker cards visible (water, salt, sleep, etc.)
  ├─► Tap tracker → toggle binary (low/high, yes/no)
  │     or (premium) enter exact value
  │
  ├─► Data saved to Firestore:
  │     patients/{memberUid}/dailyLogs/{YYYY-MM-DD}
  │
  └─► When episode is logged later:
        • Swipe cards auto-bias based on daily log data
        • e.g., water = 64oz → Water card leans "HIGH"
```

### Partner Flow
```
Member generates invite code (Settings)
  │
  ├─► 6-digit code stored in Firestore:
  │     users/{memberUid}/inviteCode + expiry (24h)
  │
  ├─► Partner enters code during signup or in Settings
  │     • Partner's user doc updated: linkedMembers: [memberUid]
  │     • Member's user doc updated: linkedPartners: [partnerUid]
  │
  ├─► Partner's Home screen shows MEMBER's data:
  │     • Member's pressure, stats, daily trackers (read-only)
  │     • LOG button logs under member's account
  │
  ├─► When member logs episode:
  │     • Partner gets push notification
  │     • Partner can open episode → swipe questionnaire
  │     • Both answers stored: questionnaire + questionnaire_partner
  │     • Member sees both, picks final answer
  │
  └─► Premium inheritance:
        • Member has premium → partner gets premium features
        • Member on free → partner limited to free features
```

### Notification Flow
```
Cron job (cron-job.org) → Vercel API
  │
  ├─► Every hour: check for pending notifications
  │
  ├─► Evening check-in (default 8 PM, user-configurable):
  │     • Check if daily log exists for today
  │     • If not: send push + email reminder
  │     • Dedup: track lastCheckInSent date on user doc
  │
  ├─► Pressure alerts (every 30 min):
  │     • Fetch current pressure for user's location
  │     • Compare to reading from 3h ago
  │     • If drop > threshold (default 5 hPa): send push
  │     • Dedup: track lastPressureAlertSent on user doc
  │
  ├─► Weekly summary (Sunday 10 AM):
  │     • Count episodes, top triggers, worst day
  │     • Send push + email
  │
  └─► Channel priority:
        • Push (always, if enabled)
        • Email via Resend (check-ins, summaries, reports)
        • SMS via Twilio (when A2P approved, user opts in)
```

---

## API Integrations

### Open-Meteo (Weather)
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}
  &longitude={lon}
  &current=temperature_2m,surface_pressure,relative_humidity_2m,
           wind_speed_10m,weather_code
  &hourly=surface_pressure
  &past_hours=6
  &forecast_hours=1
  &timezone=auto
```
- **No API key required**
- **Free:** 10,000 calls/day (commercial use OK)
- **surface_pressure** = actual barometric (not sea-level adjusted)
- **Backdate support:** Use archive API for historical weather
- **Pressure trend:** Calculate from hourly data (current vs 3h ago)

### Open-Meteo Archive (Backdated Episodes)
```
GET https://archive-api.open-meteo.com/v1/archive
  ?latitude={lat}
  &longitude={lon}
  &start_date={YYYY-MM-DD}
  &end_date={YYYY-MM-DD}
  &hourly=surface_pressure,temperature_2m,relative_humidity_2m
```

### RevenueCat
- **Products:**
  - `potsense_monthly` — $4.99/mo
  - `potsense_annual` — $39.99/yr
- **Entitlement:** `premium`
- **SDK:** `react-native-purchases` + Expo config plugin
- **Webhook:** RevenueCat → Vercel API → update Firestore user doc `premiumStatus`
- **Client check:** `usePremium()` hook reads entitlement from RevenueCat SDK + Firestore fallback

### Resend (Email)
- **From:** `noreply@potsense.org` (requires domain verification)
- **Templates:** Check-in reminder, weekly summary, partner invite, welcome email
- **Pattern:** Copy from GCC Counseling → `/app/api/send-reminders.js`

### Expo Push Notifications
- **Setup:** `expo-notifications` + `expo-device`
- **Token storage:** Push token saved to Firestore user doc on app launch
- **Sending:** Vercel API → `https://exp.host/--/api/v2/push/send`
- **Types:** Episode alert (to partners), pressure alert, check-in reminder

---

## Vercel Serverless API Routes

```
/api/
  ├── send-push.js          — Send push notification to user(s)
  ├── send-reminders.js     — Cron: evening check-in + weekly summary
  ├── pressure-check.js     — Cron: fetch pressure, send alerts if threshold met
  ├── send-invite.js        — Email/SMS partner invitation
  ├── revenucat-webhook.js  — RevenueCat subscription status updates
  └── generate-report.js    — (optional) Server-side PDF generation
```

All routes authenticated via Firebase Admin JWT verification (same pattern as GCC Counseling).

---

## Offline Behavior

Firestore offline persistence is enabled by default on mobile. Behavior:

| Action | Online | Offline |
|--------|--------|---------|
| Log episode | Writes to Firestore | Writes to local cache, syncs when online |
| Swipe questionnaire | Saved immediately | Saved locally, syncs later |
| Daily trackers | Saved immediately | Saved locally, syncs later |
| View history | Real-time from Firestore | From local cache |
| Weather fetch | API call | **Fails silently** — episode logged without weather, backfilled when online |
| Partner notifications | Push sent | Queued until online |
| View trends | Live calculations | From cached data |

**Key:** Weather is the only thing that truly needs internet. Everything else works offline and syncs later.

---

## Security

### Firestore Rules (Summary)
```
patients/{memberUid}/episodes/{episodeId}
  - Read: member OR linked partners
  - Write: member OR linked partners (create/update only)
  - Delete: member only

patients/{memberUid}/dailyLogs/{date}
  - Read: member OR linked partners
  - Write: member only (partners don't edit daily logs)

users/{uid}
  - Read: own doc + linked partners/members (limited fields)
  - Write: own doc only
```

### Privacy
- Health data stored in Firestore (encrypted at rest by Google)
- No data sold or shared with third parties
- Location sent to Open-Meteo for weather (they don't log requests)
- RevenueCat receives anonymous user ID only
- GDPR: full data export (JSON) + account deletion
- Privacy policy hosted at potsense.org/privacy

---

## Build Phases (Revised)

| Phase | What | Dependencies |
|-------|------|-------------|
| 1 | Expo scaffold + tab nav + Firebase Auth + basic episode logging | Firebase project setup |
| 2 | Swipe questionnaire (Tinder-style cards) | Phase 1 |
| 3 | Weather + location auto-capture (Open-Meteo) | Phase 1 |
| 4 | Daily trackers (home screen running log) | Phase 1 |
| 5 | Firestore data model + partner accounts + invite codes | Phase 1 |
| 6 | RevenueCat + premium gating | Phase 5 |
| 7 | History screen (calendar + timeline + rich cards) | Phase 1 |
| 8 | Trends + charts + correlations | Phase 6, 7 |
| 9 | Doctor PDF report + CSV/JSON export | Phase 8 |
| 10 | Notifications (push + Resend + cron) | Phase 5 |
| 11 | News feed (RSS + curated) | Phase 1 |
| 12 | Onboarding + guided tour + polish | All phases |
| 13 | App store submission (iOS + Android) | All phases |

**Test as web (Vercel) throughout. Wrap for mobile stores at Phase 13.**
