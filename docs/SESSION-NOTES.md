# POTSense Session Notes

## Session 1 — 2026-03-03/04

### Research Phase
- Researched profitable app categories, micro-SaaS, portfolio strategy
- POTS tracker idea emerged from Roby's wife having POTS
- Validated market: 60K+ r/POTS members, no good competitor with barometric pressure focus
- Decided: POTSense = app #1 in a small portfolio strategy

### Design Decisions Made
- **Platform:** Expo SDK 52+ → iOS + Android + Web (one codebase)
- **Name:** POTSense ("POTS Tracker" taken on App Store)
- **Pricing:** $4.99/mo or $39.99/yr (no lifetime, no free trial — generous free tier instead)
- **Backend:** Firebase (Auth + Firestore) — needed for partner accounts + cloud sync
- **Weather:** Open-Meteo (free, no API key, has surface_pressure)
- **Subscriptions:** RevenueCat
- **Dark mode default** (light sensitivity is a POTS symptom)
- **Icon:** Heart + pulse line, dark background
- **No sounds/haptics** — visual feedback only

### UX Decisions
- **Logging flow:** One-tap → trigger checklist → severity emoji → notes → save
- **Trigger layout:** Binary swipe top half, grayed exact field middle (premium), skip/NA bottom
- **Smart pre-fill:** Daily log data biases triggers toward likely answer
- **Branching triggers:** YES on bath/shower → bath or shower? → hot or warm? (same for caffeine, exercise, alcohol, meds)
- **Free:** ~10 core triggers. Premium: all triggers + branches + exact values + customize
- **Daily trackers:** Running log on home screen + evening check-in reminder. 5 free (binary), ~15 premium (exact values, customizable)
- **Bath/shower/temp** added as daily tracker + episode card
- **History:** Calendar (multiple dots per day per episode) + timeline toggle. Rich cards with questionnaire icons.
- **Backdate episodes:** Yes, with historical weather fetch
- **Offline:** Full offline support, syncs to Firebase when back online
- **Severity:** Emoji faces (😊😐😟😣😵)

### Account System
- **Member** (primary) + **Partner** (free, linked via 6-digit invite code)
- Partner features = premium only (no partner features on free tier)
- Member pays → partners inherit premium for free
- Both can log/swipe, member has final say on conflicts (shows both answers)
- Partner gets push notification when member logs episode

### Free vs Premium Wall
- **Free:** Unlimited logging, trigger tracking (10 triggers), 5 daily trackers (binary), 30-day visible history (data hidden not deleted), pressure alerts, news feed
- **Premium:** Exact values, all triggers + branches, custom trackers (~15), unlimited history, partner accounts, trends/charts/correlations, clinical PDF + CSV export, questionnaire customization, "suggest a question" button

### Statistics (v1)
- Percentage-based correlations: "72% of episodes had LOW water"
- Pressure correlation: "89% within 3h of pressure drop"
- Time of day + day of week patterns
- Top triggers ranked by frequency
- v2: AI-powered insights via Claude API

### Doctor PDF Report
- Clinical-style, date-range picker
- Main report: summary + correlations + episode table + pressure chart
- Appendix (optional): daily tracking data
- Disclaimer footer on every page
- GDPR: full JSON export + account deletion

### Future (v2/v3)
- Apple Watch / wearables
- AI insights (Claude API)
- Community aggregate data
- Home screen widget
- HealthKit / Google Fit
- Custom user-created questions

### Status
Design spec comprehensive and complete. Ready to build Phase 1 next session.

## Session 2 — 2026-03-05

### Phase 1 Build + Deploy
- Phase 1 complete: 5-tab nav, Home screen, episode modal (severity + symptom chips + notes), login/signup, Settings with admin panel
- Firebase project created (potsense-app), Auth enabled (email/password), Firestore deployed with security rules including admin access for robdorsett@gmail.com
- PWA support added (manifest.json, icons generated via sharp)
- Deployed to potsense.org via Vercel
- Super Admin panel added to Settings (visible only to robdorsett@gmail.com) — toggle premium, change role, delete users
- Firestore rules updated with admin override

### Design Updates
- Notification #8 added: Partner-logged episode summary email to member next morning (not immediate — member may be wiped out)
- Facebook + Google + Apple sign-in deferred to Phase 6
- "Share & earn free month" referral system planned for Phase 6-7
- Roby's account = partner role long-term

### Known Issues
- Weather card blank (Phase 2)
- No onboarding walkthrough (Phase 12)

### Status
Phase 1 COMPLETE — deployed to potsense.org. Phase 2 (Weather + Location) next.

## Session 3 — 2026-03-05 (cont)

### Phase 2: Weather + Location
- Built `lib/weather.ts` — Open-Meteo client (surface_pressure, temp, humidity, wind, 3h pressure trend)
- Auto-fetch weather on episode log and Home screen
- Pressure warning on Home when falling fast (>3 hPa in 3h)
- Episode cards in Log tab show weather data
- Weather badge on details screen during episode logging

### Phase 3: Trigger Checklist
- Built 50+ triggers across 8 categories: hydration, diet, sleep, activity, environment, health, mental, lifestyle
- Deep branching: bath→type/temp/duration/chair, caffeine→type/amount, exercise→type/duration/position, illness→type/fever, etc.
- Removed premium gating per Roby's direction ("build them ALL, choose free later")
- Episode flow: Severity → Symptoms → Notes → "Next: Quick Check" → Triggers → Save. "Skip & Save" at bottom.
- Category label shown above each card during swipe
- "Skip All" button in header to finish questionnaire early
- Questionnaire answers saved as map in Firestore episode doc

### Phase 4: Question Settings
- New `questionnaire-settings.tsx` modal — toggle categories on/off via Switch, expand to toggle individual cards
- Settings loads from `users/{uid}/settings.disabledCategories` + `settings.disabledCards`
- Episode modal loads user prefs and passes to SwipeQuestionnaire
- Settings > Tracking > Questionnaire row navigates to the modal

### Phase 5: Daily Trackers + News
- Daily trackers on Home are now tappable — tap to cycle through levels (--→Low→Med→High, --→No→Yes, etc.)
- Color-coded: orange for bad/low/no, green for good/high/yes, blue for medium
- Saves to `patients/{uid}/dailyLogs/{YYYY-MM-DD}` with merge
- Loads today's values on tab focus
- News feed: 4 real RSS sources (Dysautonomia Intl, Dysautonomia Project, PoTS UK, Cleveland Clinic) via rss2json proxy
- Pull-to-refresh, relative dates, opens in browser

### Design Updates
- Severity emoji changed: mild = 😕 (not 😊 — "no episode is smiley")
- `getSections()` function in settings instead of static const (needed router access)
- Removed `premium: boolean` from triggers — all available for now

### Deployed
All changes live at potsense.org

### Status
Phases 1-5 COMPLETE. Next: Phase 6 (Partner accounts + invite codes).

## Session 4 — 2026-03-05 (cont)

### Social Share Buttons (Home Screen)
- Added row of social share icons above daily trackers: Facebook, X, Instagram, Reddit, Mail, Copy
- Instagram/Facebook: copy share text to clipboard + alert + open platform (no text pre-fill API)
- X: intent/tweet URL with pre-filled text + URL
- Reddit: submit URL with pre-filled title
- Removed TikTok per Roby
- Share text: "Found this great POTS app to help track dysautonomia episodes and triggers! Check it out at www.POTSense.org"

### Open Graph / Twitter Cards
- Added og:title, og:description, og:image, og:url to `+html.tsx`
- Added twitter:card summary_large_image tags
- Generated 1200x630 og-image.png via sharp (Facebook rejects SVG)

### Trends Screen (5 Swipeable Cards)
- Card 1: Pressure & Episodes — continuous hourly pressure line (Open-Meteo historical, up to 92 days) with episode dots overlaid by severity color
- Card 2: Severity Breakdown — distribution bars (1-5 scale)
- Card 3: Top Triggers — questionnaire answer frequency analysis
- Card 4: Time of Day — episode distribution chart
- Card 5: Episode Frequency — daily/weekly bar chart
- Range selector: 7D / 30D / 90D / All
- Pressure correlation insight: "X% of episodes during pressure drops"
- Built `components/PressureChart.tsx` (SVG, Catmull-Rom curves, severity-colored dots, tap tooltip)
- Built `lib/weather.ts:fetchHistoricalPressure()` — on-demand historical hourly data

### Episode Detail Screen
- New `app/episode-detail.tsx` — full episode view modal
- Shows severity (emoji + color bar), date/time, weather (pressure/trend/temp/humidity), symptom chips, notes, questionnaire key-value pairs
- Delete with confirmation (window.confirm on web, Alert.alert on native)
- History tab cards now tappable → navigate to detail with chevron indicator

### Doctor PDF Export
- New `app/pdf-export.tsx` — date range selector (7/30/90/All), live preview stats, generate PDF
- PDF includes: header, patient summary, full episode table, top triggers with percentages, weather correlation breakdown, footer
- Uses expo-print (HTML→PDF) + expo-sharing (share dialog)
- Wired from Settings → Data → "Export PDF Report"

### Partner Accounts (Phase 6)
- New `lib/partners.ts` — generateInviteCode, redeemInviteCode, getLinkedPartners, getLinkedPatient, unlinkPartner, getUserRole
- 6-digit alphanumeric codes (no ambiguous chars I/O/1/0), stored at `inviteCodes/{code}`, 24h expiry
- New `app/partner-settings.tsx` — patient mode (generate code, list partners, unlink) + partner mode (enter code, show linked patient, unlink)
- Episode modal updated: partners log to patient's Firestore collection with loggedBy/loggedByEmail fields
- Wired from Settings → Account → Partners

### Deploy Config
- Created `docs/DEPLOY-CONFIG.md` — quick deploy reference, project links, troubleshooting

### Packages Added
- react-native-svg, expo-clipboard, expo-print, expo-sharing

### Status
Phases 1-6, 8-10 COMPLETE. Next: Phase 7 (Premium + RevenueCat) or Phase 11 (Notifications).

## Session 5 — 2026-03-05/06

### GitHub Issues Pipeline
- Feedback form (`app/feedback.tsx`) submits create GitHub Issues automatically
- Issues get `bug` or `enhancement` label + `user-feedback` label
- API route (`api/feedback.ts`): Resend email now optional (won't crash without RESEND_API_KEY), from address changed to `onboarding@resend.dev` (free domain)

### GitHub Milestones & Issue Organization
- Created 4 milestones: v1.0 Release (#1), v0.x Polish (#2), Partner Accounts (#3), App Store Launch (#4)
- All 8 open issues assigned to appropriate milestones
- Issue #2 closed (time picker already done), #9 closed (duplicate), #10 closed (page chips wrap fix)
- **ROADMAP.md created** — source of truth for project phases, linked to GitHub milestones/issues

### Page Chips Wrap Fix
- Feedback form page chips changed from horizontal scroll to `flexWrap` grid layout

### Partner Premium Inheritance
- New `lib/premium.ts` with `checkPremiumStatus()` — checks user's own premium status + linked partner/member premium
- All 10 screens updated to use shared premium check
- Partners inherit premium when their linked member has premium (and vice versa)

### Home Screen Redesign
- Tracker grid: max 5 items per row with `flexWrap` (was single row horizontal scroll)
- Floating round FAB for "Log Episode" (replaced rectangular button)

### Premium Gating (Partial)
- JSON export fully gated behind premium
- Tracker settings and trigger settings show upgrade CTAs for premium features
- RevenueCat/Stripe integration still pending

### Env Vars on Vercel
- `GITHUB_TOKEN` — fine-grained PAT, Issues R/W, 3 repos (POTSense, ttrpg-character-sheets, dorsett-group-website), no expiration
- `FIREBASE_PROJECT_ID`, `CRON_SECRET` — set
- `RESEND_API_KEY` — NOT YET SET (Roby getting key from resend.com)

### Commits
4 commits: premium gating, home redesign, partner premium inheritance, feedback fixes + roadmap

### Pending
- RESEND_API_KEY needs to be added to Vercel
- Firebase service account key needed for weekly email (GH #3)
- Test partner premium inheritance on potsense.org

### Status
v0.33+. Phases 1-6, 8-10 DONE. Premium gating partial. Next: RevenueCat/Stripe, then notifications.
