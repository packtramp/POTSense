# POTSense - Design Specification

## App Identity
- **Name:** POTSense
- **Tagline:** "Sense your triggers."
- **Color scheme:** Dark mode default
- **Platform:** iOS + Android + Web (Expo, single codebase)
- **Backend:** Firebase (Auth + Firestore)
- **Subscriptions:** RevenueCat
- **Icon:** Heart + pulse line, dark background

---

## Pricing

| Plan | Price | Billing |
|------|-------|---------|
| Free | $0 | — |
| Premium Monthly | $4.99/mo | Monthly |
| Premium Annual | $39.99/yr | Annual (save 33%) |

No lifetime option. No free trial (generous free tier instead).

---

## Free vs Premium Feature Wall

### FREE
- Unlimited episode logging
- Swipe questionnaire (binary only, 10 core cards, right=green/left=orange)
- Exact value field visible but grayed out with upgrade nudge
- Follow-up branches visible but grayed out as teaser
- Symptom chips (tap common symptoms + free text notes)
- 5 default daily trackers (binary)
- 30-day visible history — **timeline view only** (data kept in Firebase, hidden after 30d)
- Current weather/barometric pressure on home screen
- Pressure drop alerts (push notification, default threshold)
- News feed (curated + RSS)
- Account creation + basic profile
- **Doctor PDF report (30-day rolling window)** — auto-emailed monthly so free users don't lose data
- Full JSON data export (GDPR compliance)

### PREMIUM ($4.99/mo or $39.99/yr)
- Everything in free PLUS:
- Exact value input on all swipe cards (oz, hours, cups, etc.)
- All 16+ question cards + follow-up branches
- User selects which cards to include/exclude
- "Suggest a question" button to developer
- Custom daily tracker selection (~15 options)
- Daily trackers with exact values
- Unlimited history (all hidden data reappears) + **calendar view**
- Partner accounts (invite via 6-digit code, push notifications)
- Full trends dashboard (charts, correlations, stats)
- Doctor PDF report with **custom date ranges** (last 30d, last month, last 90d, custom)
- CSV data export
- Questionnaire customization (reorder, enable/disable)

### Premium Scope
- Member pays → partner accounts inherit premium (free for partners)
- Partners on free-tier member accounts: no partner features at all

---

## Account System

### Member Account (primary)
- Signs up with email/password or Google/Apple sign-in
- Owns all episode data
- Can generate 6-digit invite codes for partners (premium)
- Can revoke partner access anytime
- Has final say on questionnaire answers (overrides partner)

### Partner Account (premium feature, free for partners)
- Signs up free, enters 6-digit invite code to link
- Can log episodes on behalf of member
- Can fill in swipe questionnaire for any episode
- Gets push notification when member logs an episode
- Can see member's history
- Cannot delete episodes or manage subscription
- One partner can link to multiple members (caregiver scenario)

### Conflict Resolution
When member and partner answer the same question differently:
- Episode detail shows BOTH answers with who said what
- Member taps to pick the final answer

### Firestore Structure
```
users/{uid}
  - role: "member" | "partner"
  - displayName
  - linkedMembers: [uid, ...] (for partners)
  - linkedPartners: [uid, ...] (for members)
  - inviteCode: "ABC123" (member generates, expires 24h)
  - premiumStatus: boolean (from RevenueCat webhook)

patients/{memberUid}/episodes/{episodeId}
  - timestamp, severity, notes, latitude, longitude
  - loggedBy: uid (member or partner)
  - weather: { pressure, temp, humidity, trend, pressureChange3h, ... }
  - questionnaire: { water: "low", salt: "high", ... }
  - questionnaire_exact: { water_oz: 64, sleep_hours: 6.5, ... }
  - questionnaire_partner: { water: "high", ... } (if partner answered differently)
  - questionnaire_final: { water: "low", ... } (member's final say)

patients/{memberUid}/dailyLogs/{date}
  - water: "high" | exact: 64
  - salt: "low" | exact: "2000mg"
  - sleep: "good" | exact: 7.5
  - meds: "yes"
  - exercise: "yes" | exact: "30 min"
  - bath_shower: "shower" | temp: "hot"
  - ... (all active trackers)

patients/{memberUid}/triggers/{triggerId}
  - episodeId, category, value, amount
```

---

## Screen Details

### 1. HOME SCREEN

**Top:** Current weather card
- Barometric pressure + trend arrow (↑↓→)
- Temperature, humidity
- Warning banner if pressure dropping fast

**Middle:** Daily trackers (running log)
- Free: 5 defaults (Water, Salt, Sleep, Meds, Exercise) — binary (high/low, yes/no)
- Premium: user picks from ~15 options, exact values enabled
- Tap to increment/toggle, resets daily
- Bath/Shower tracker included in full list
- Pre-fills episode swipe cards when episode is logged

**Center:** BIG "LOG EPISODE" button
- One tap = episode saved (timestamp + GPS + weather auto-captured)
- Launches Swipe Questionnaire
- Partners see this too — logs under linked member

**Below:** Quick stats
- Today / This week / Time since last episode
- Tap → Trends tab

**Bottom:** POTS News Feed
- Pinned/Featured (curated) at top
- Auto RSS: Dysautonomia International, Standing Up to POTS, POTS UK, Cleveland Clinic
- Tap → in-app browser

---

### 2. SWIPE QUESTIONNAIRE (full-screen modal after logging)

**Presentation:** Modal overlay (popup, not a new screen). Stays in context, dismisses back to Home when done.

**Swipe Convention:**
- **RIGHT = always positive/protective** (green glow as you drag)
- **LEFT = always concerning/risk** (orange glow as you drag)
- Labels on each card always show what each direction means
- Consistent muscle memory: right = good, left = watch out
- Cards are data-driven config (JSON array) — easy to A/B test wording

**Card Layout (each card):**
```
┌─────────────────────────────┐
│                             │
│  ◄ No (had some)  Yes ►     │   ← LEFT label    RIGHT label
│      🟠              🟢     │   ← color hints
│                             │
│      ☕ Caffeine-free        │
│         today?              │
│                             │
│   (swipe anywhere on        │
│    screen left or right)    │
│                             │
│  3 of 10        ━━━━━━━     │
│─────────────────────────────│
│  Exact: [____] cups  🔒     │  ← grayed for free, active for premium
│  (Upgrade for exact input)  │
│─────────────────────────────│
│      [Skip / N/A / Unknown] │
└─────────────────────────────┘

Swipe animation:
  Dragging RIGHT → card tilts right, green glow, "✅ Yes" fades in
  Dragging LEFT  → card tilts left, orange glow, "⚠️ No" fades in
```

**Smart Pre-fill:** If daily log has data, card leans toward that answer (e.g., 64oz water logged → card biases toward "Yes" on "Hydrated well?", but user can override).

**Core 10 Cards (Free) — RIGHT = green/positive:**

| # | Question | ◄ LEFT (🟠 risk) | RIGHT ► (🟢 good) |
|---|----------|-------------------|---------------------|
| 1 | Hydrated well today? | No (low water) | Yes (good water) |
| 2 | Good salt intake today? | No (low salt) | Yes |
| 3 | Slept well last night? | No (bad sleep) | Yes (rested) |
| 4 | Caffeine-free today? | No (had some) | Yes (none) |
| 5 | Alcohol-free today? | No (had some) | Yes (none) |
| 6 | Ate recently? | No (empty) | Yes (fueled) |
| 7 | Feeling calm? | No (stressed) | Yes (calm) |
| 8 | Stayed off your feet? | No (standing) | Yes (resting) |
| 9 | Got up slowly? | No (jumped up) | Yes (careful) |
| 10 | Cool bath/shower? | No (hot/none) | Yes (cool/none) |

**Additional Premium Cards:**

| # | Question | ◄ LEFT (🟠) | RIGHT ► (🟢) |
|---|----------|-------------|---------------|
| 11 | Took it easy today? | No (exercised) | Yes (rested) |
| 12 | Stayed cool today? | No (hot environ) | Yes (comfortable) |
| 13 | Menstrual period? | Yes (on period) | No |
| 14 | Took all meds today? | No (missed) | Yes (all taken) |
| 15 | Emotionally steady? | No (emotional) | Yes (steady) |
| 16 | Comfortable temperature? | No (extreme) | Yes (comfortable) |

**Note:** Card wording is A/B testable. Config-driven, change one line per card. Wife tests first version, we adjust any that feel forced.

**Branching Cards (premium, triggered by LEFT/concerning answers):**

| Main Card | If LEFT (risk) → Follow-up |
|-----------|---------------------------|
| Cool bath/shower? → No | Bath or Shower? → How hot? |
| Caffeine-free? → No | Coffee / Tea / Energy drink? |
| Took it easy? → No | Light / Moderate / Intense exercise? |
| Alcohol-free? → No | Amount: Small / Large (exact: type + glasses) |
| Took all meds? → No | Which ones missed? (exact: list) |

**Free tier:** 10 core cards, binary only. Follow-up branches visible but grayed out. Exact field grayed with upgrade nudge. After card 10: grayed list of 6 premium cards + upgrade CTA.
**Premium:** All 16+ cards + branches + exact values + customize which cards appear + suggest new questions.

**Symptom Chips (after questionnaire, before Save):**
Flow-wrap tappable chips for common POTS symptoms. Tap multiple. Plus free-text field.

Chips: Dizzy, Nausea, Elevated Heart Rate, Syncope, Pre-Syncope, Chest Pain, Noise Sensitivity, Touch Sensitivity, Weakness, Vision Issues, Brain Fog, Fatigued, Sweating, Shaky/Tremor, Anxious, Hot Flash

```
┌───────────────────────────────┐
│  Common symptoms (tap any):   │
│                               │
│  [😵 Dizzy] [🤢 Nausea]       │
│  [❤️ Racing Heart] [🧠 Fog]   │
│  [😩 Fatigued] [👁️ Vision]    │
│  [💦 Sweating] [🫨 Shaky]     │
│  [😰 Anxious] [🥵 Hot Flash]  │
│  [💔 Chest Pain] [🫠 Syncope] │
│  [🫠 Pre-Syncope]             │
│  [👂 Noise Sens] [✋ Touch]    │
│  [😫 Weakness]                │
│                               │
│  Other notes:                 │
│  ┌───────────────────────────┐│
│  │ was at grocery store...   ││
│  └───────────────────────────┘│
│                               │
│  [Save & Close]               │
└───────────────────────────────┘
```

---

### 3. DAILY TRACKERS

**Default 5 (Free, binary):**
1. 💧 Water (Low/High)
2. 🧂 Salt (Low/High)
3. 😴 Sleep (Bad/Good)
4. 💊 Meds (No/Yes)
5. 🏃 Exercise (No/Yes)

**Full Menu (~15, Premium picks which to show):**
6. ☕ Caffeine (No/Yes → cups)
7. 🍷 Alcohol (No/Yes → amount)
8. 🛁 Bath/Shower (No/Yes → Bath or Shower → Hot/Warm)
9. 😰 Stress (Low/High → 1-5)
10. 🌡️ Temperature exposure (No/Yes → type)
11. 🩸 Menstrual cycle (phase/day)
12. 😊 Mood/Energy (Low/High → 1-5)
13. 🧍 Standing time (Low/High → hours)
14. 😢 Emotional state (Calm/Stressed)
15. 🥗 Meal quality (Poor/Good)

Daily tracker data pre-fills episode swipe cards.

---

### 4. HISTORY SCREEN

**Toggle:** Calendar ↔ Timeline (button at top)

**Calendar View:**
- Monthly grid, swipe to change months
- Multiple dots per day (one dot per episode, color = severity)
- Tap day → shows that day's episodes below

**Timeline View:**
- Grouped by date headers
- Rich episode cards:
```
┌─────────────────────────────┐
│ 2:34 PM            😣 Sev 4 │
│ 29.72 inHg ↓  72°F         │
│ 💧❌ 🧂✅ 😴❌ ☕✅ 🏃❌  │
│ "felt really dizzy..."      │
│ Logged by: Sarah            │
└─────────────────────────────┘
```
- Tap card → Episode Detail

**Free:** Timeline view only, 30 days visible. Older data hidden (not deleted). Reappears on upgrade. Auto-emailed as PDF monthly.
**Premium:** Calendar + timeline toggle. Unlimited history.

---

### 5. EPISODE DETAIL SCREEN

- Who logged it (member or partner name)
- Timestamp (editable — can backdate, fetches historical weather)
- Severity emoji picker (😊😐😟😣😵) — editable
- Full weather: pressure, temp, humidity, wind, condition
- Pressure trend: 3h change visualization
- Questionnaire answers as icon grid (green/red/gray)
  - If member + partner answered differently: shows both, member picks final
  - Tap any answer to change it
- Notes (editable)
- Detailed triggers (premium): category + value, add/delete
- Delete button (member only, with confirmation)

---

### 6. TRENDS SCREEN (premium, blurred teaser for free)

**Percentage-based statistics (v1):**

1. **Episode Frequency** — bar chart by day/week/month (7d/30d/90d/all filters)
2. **Pressure Correlation** — "89% of episodes within 3h of pressure drop > 3 hPa"
3. **Questionnaire Insights** — sorted by correlation strength:
   - "Low Water: 72% of episodes"
   - "Caffeine YES: 2.3x more likely"
   - "Poor Sleep: 61% of episodes"
4. **Time of Day** — hour distribution. "Most episodes between 1-3 PM"
5. **Day of Week** — "Worst days: Monday, Tuesday"
6. **Top Triggers** — ranked by frequency + % of episodes

**v2: AI-powered insights (Claude API)** — plain-English pattern analysis

---

### 7. DOCTOR PDF REPORT (free + premium)

**Free tier:** 30-day rolling window PDF. Auto-emailed to user monthly (so data isn't "lost" when it rolls off the 30-day visible history). Manual generate anytime for current 30 days.

**Premium tier:** Custom date range picker — last 30 days, last month, last 90 days, all time, custom start/end. Same clinical report, unlimited data.

**Clinical-style report contents:**

**Main Report (episodes):**
- Header: name, date range, generated date
- Summary: episode count, avg severity, avg/week, worst day/time
- Top correlations bar chart (pressure, water, caffeine, etc.)
- Episode table: date, time, severity, pressure, trend, questionnaire answers, symptom chips, notes
- Pressure chart over time with episode markers

**Appendix (daily tracking data, optional checkbox):**
- Daily log table: date, water, salt, sleep, meds, exercise, bath/shower, etc.
- Only included if user checks "Include daily data" box

**Disclaimer footer:** "Generated by POTSense. Not medical advice. For informational purposes only. Consult your healthcare provider."

**Export options:**
- PDF (formatted clinical report) — free (30d) + premium (custom range)
- CSV (raw data) — premium only
- JSON (full data export) — free (GDPR compliance)

**GDPR:** Full data export (JSON) + account deletion button

### 8. PAYMENTS

**Web:** Stripe (Roby already has account). RevenueCat integrates Stripe for web subscriptions.
**iOS:** Apple In-App Purchase via RevenueCat
**Android:** Google Play Billing via RevenueCat

RevenueCat unifies all three — user pays on web via Stripe, recognized as premium on mobile and vice versa. Single subscription system across all platforms.

---

### 8. SETTINGS SCREEN

- **Profile:** Name, email
- **Partners:** (premium) View linked, generate invite code, revoke access
- **Daily Trackers:** (premium) Pick which trackers to show, reorder
- **Questionnaire:** (premium) Pick which cards appear, reorder, suggest new questions
- **Units:** Temp (F/C), Pressure (hPa/inHg/mmHg) — auto-detect, overridable
- **Notifications:** Pressure alerts (threshold, on/off), partner alerts (on/off)
- **Subscription:** Plan status, upgrade, restore purchases
- **Export:** PDF report, CSV export, full data export (JSON)
- **Delete Account:** GDPR-style wipe from Firebase
- **News:** Toggle RSS sources
- **About:** Version, privacy policy, contact/feedback, disclaimer

---

### 9. PAYWALL SCREEN (modal)

- Free vs Premium comparison table
- $4.99/mo or $39.99/yr (save 33%)
- No free trial (generous free tier instead)
- Restore purchases link
- [Subscribe Monthly] / [Subscribe Annual]

---

### 10. ONBOARDING (first launch)

1. "Track your POTS episodes with one tap" + icon
2. "We capture weather & barometric pressure automatically" → location permission
3. "Invite your partner to help track" → optional, skip-able
4. [Get Started] → account creation → guided tour

**Guided Tour (tooltip overlays):**
- Points to LOG button: "Tap here when an episode happens"
- Points to daily trackers: "Log your daily basics here"
- Points to History tab: "Your episodes show up here"
- Points to Settings: "Invite a partner or customize your experience"

---

## Navigation Flow

```
App Launch
  → Onboarding (first time only)
  → Sign Up / Sign In
  → Guided Tour (first time)
  → Tab Bar
      ├── Home
      │     ├── Daily Trackers (tap to log)
      │     ├── [LOG EPISODE] → Swipe Questionnaire
      │     │     ├── Binary swipe (free)
      │     │     ├── Follow-up branches (premium)
      │     │     ├── Exact values (premium)
      │     │     └── Skip / N/A / Unknown
      │     │     → Severity + Notes → Save
      │     ├── Stats → Trends tab
      │     └── News → In-app browser
      ├── History
      │     ├── Calendar / Timeline toggle
      │     └── Episode card → Episode Detail
      │           ├── View/edit questionnaire (both answers if conflict)
      │           ├── Edit severity / notes / timestamp
      │           ├── + Add Trigger (premium)
      │           └── Delete (member only)
      ├── Trends (premium, blurred teaser for free)
      │     └── [Upgrade] → Paywall
      └── Settings
            ├── Partners → Generate code / Manage (premium)
            ├── Daily Trackers → Customize (premium)
            ├── Questionnaire → Customize (premium)
            ├── Subscription → Paywall
            ├── Export → PDF / CSV / JSON
            ├── Delete Account
            └── Suggest a Question → Feedback form
```

---

## Push Notifications

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Member logs episode | Linked partners | "[Name] logged an episode. Tap to help fill in details." |
| Pressure drop > threshold | Member + partners | "Pressure dropping fast (↓5 hPa in 3h). Stay prepared." |
| Weekly summary (Sunday) | Member | "This week: X episodes. Top correlation: [trigger]." |
| 30-day history nag | Free members | "You have X episodes tracked. Unlock full history for $4.99/mo." |
| Evening check-in reminder | Member (if enabled) | "Don't forget your evening check-in!" |

---

## Language Rules
- **Never use "patient"** anywhere in the app — use "member" in code, "you"/"your" in UI
- **Disclaimer everywhere:** "Not medical advice. Built by a POTS spouse, not doctors."
- **No medical claims** — "track symptoms," "identify potential patterns," never "diagnose" or "treat"
- **Visual feedback only** — no sounds, no haptics

---

## Future Roadmap (v2/v3)
- Apple Watch / wearable companion (log from wrist, auto HR capture)
- AI-powered insights (Claude API) — plain-English pattern analysis
- Community features — anonymous aggregate data, "others in your area report..."
- Home screen widget (quick LOG button without opening app)
- HealthKit / Google Fit integration (auto HR, steps)
- Custom question creation by users
- Multiple language support
