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
- **Logging flow:** One-tap → Tinder-style swipe questionnaire → severity emoji → notes → save
- **Swipe card layout:** Binary swipe top half, grayed exact field middle (premium), skip/NA bottom
- **Smart pre-fill:** Daily log data biases swipe cards toward likely answer
- **Branching cards:** YES on bath/shower → bath or shower? → hot or warm? (same for caffeine, exercise, alcohol, meds)
- **Free:** ~10 core binary cards. Premium: all cards + branches + exact values + customize
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
- **Free:** Unlimited logging, binary swipes (10 cards), 5 daily trackers (binary), 30-day visible history (data hidden not deleted), pressure alerts, news feed
- **Premium:** Exact values, all cards + branches, custom trackers (~15), unlimited history, partner accounts, trends/charts/correlations, clinical PDF + CSV export, questionnaire customization, "suggest a question" button

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

### Phase 3: Swipe Questionnaire
- Built 50+ swipe cards across 8 categories: hydration, diet, sleep, activity, environment, health, mental, lifestyle
- Deep branching: bath→type/temp/duration/chair, caffeine→type/amount, exercise→type/duration/position, illness→type/fever, etc.
- Removed premium gating per Roby's direction ("build them ALL, choose free later")
- Episode flow: Severity → Symptoms → Notes → "Next: Quick Check" → Swipe cards → Save. "Skip & Save" at bottom.
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
- Removed `premium: boolean` from swipe cards — all available for now

### Deployed
All changes live at potsense.org

### Status
Phases 1-5 COMPLETE. Next: Phase 6 (Partner accounts + invite codes).
