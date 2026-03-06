## PRIME DIRECTIVE
**Lean and mean.** Keep under 250 lines. Move detail to sub-files. Don't ask Roby — try first. Never blame cache. No code output.

# POTSense

## What
POTS episode tracker with auto barometric pressure capture, trigger checklist, partner accounts, daily trackers, and trend analysis. App #1 in a small portfolio strategy.

## Stack
- Expo SDK 55 (React Native) → iOS + Android + Web
- Expo Router v4 (file-based nav)
- Firebase Auth + Firestore (accounts, shared data)
- Open-Meteo API (free barometric pressure, no key needed)
- RevenueCat + Stripe (web) + Apple IAP + Google Play Billing
- Resend (email) + Twilio (SMS, pending A2P) + expo-notifications (push)
- Vercel (web hosting + serverless API routes)
- TypeScript

## Pricing ($4.99/mo or $39.99/yr, save 33%)
- **Free:** Unlimited logging, trigger tracking, 5 daily trackers, 30-day history, pressure alerts, news feed, 30-day PDF report, JSON export
- **Premium:** All cards + branches, custom trackers, unlimited history + calendar, partner accounts, trends/correlations, custom PDF, CSV export, questionnaire customization

## Key Design Decisions
- **Dark mode default** (#0F0F0F bg), emoji severity (😕😐😟😣😵 — no smiley, even mild isn't happy)
- **5 bottom tabs:** Home, Log, Trends, News, Settings
- **Trigger convention:** RIGHT = always positive/green, LEFT = always concerning/orange
- **Episode flow:** Severity → Symptoms → Notes → "Next: Quick Check" → Triggers → Save. "Skip & Save" at bottom.
- **50+ triggers** across 8 categories (hydration, diet, sleep, activity, environment, health, mental, lifestyle)
- **Branching triggers:** LEFT triggers drill-down (bath → type/temp/duration/chair, caffeine → type/amount, exercise → type/duration/position, etc.)
- **Settings toggles:** Users enable/disable entire categories or individual triggers
- **Daily trackers:** Tap to cycle (--→Low→Med→High or --→No→Yes), saves to Firestore dailyLogs
- **Partner accounts (premium):** 6-digit invite code, push notifs, can log/swipe
- **Super Admin:** robdorsett@gmail.com gets admin panel in Settings
- **Domain:** potsense.org (Vercel, deployed as PWA)
- **Alert.alert doesn't work on web** — use window.confirm wrapper

## Docs
| File | Content |
|------|---------|
| `docs/DESIGN-SPEC.md` | Full feature spec, triggers, free/premium wall, payments |
| `docs/SCREENS.md` | 15 screen wireframes, tab bar, user journey maps |
| `docs/ARCHITECTURE.md` | System diagram, data flows, API integrations, build phases |
| `docs/FIRESTORE-MODEL.md` | Document schemas, security rules, indexes, cost estimation |
| `docs/PREMIUM-LOGIC.md` | RevenueCat setup, feature gating matrix, paywall triggers |
| `docs/NOTIFICATIONS.md` | Push/email/SMS setup, cron jobs, notification types |
| `docs/DEPLOY-CONFIG.md` | **READ BEFORE EVERY PUSH.** Vercel, GitHub, Firebase, troubleshooting |
| `docs/SESSION-NOTES.md` | Session work log |

## Build Phases
See **ROADMAP.md** for detailed phase tracking (linked to GitHub milestones/issues).
Phases 1-6, 8-10 DONE. Premium gating partially done (JSON export, tracker/trigger settings have CTAs).
Remaining: RevenueCat/Stripe integration, notifications, onboarding, app store submission.

## Firebase
- Project: `potsense-app`
- Auth: Email/Password enabled
- Firestore: nam5 region
- Admin email: robdorsett@gmail.com
- Security rules deployed with admin override + partner access

## Key Files
- `lib/firebase.ts` — Simple init (no persistence APIs — causes Symbol error on web)
- `lib/auth.ts` — Auth helpers (signUp creates user doc with role/settings)
- `lib/weather.ts` — Open-Meteo client (pressure, temp, humidity, 3h trend, historical hourly)
- `lib/admin.ts` — Admin email check
- `lib/partners.ts` — Partner invite codes, link/unlink, role detection
- `lib/premium.ts` — `checkPremiumStatus()` — checks user + linked partner/member premium
- `constants/swipeCards.ts` — 50+ config-driven triggers, 8 categories, branching
- `constants/Colors.ts` — Dark theme palette
- `components/SwipeQuestionnaire.tsx` — Trigger UI with progress, branching, skip
- `components/PressureChart.tsx` — SVG pressure chart with episode dots overlay
- `app/episode-detail.tsx` — Full episode view with delete
- `app/pdf-export.tsx` — Doctor PDF report generation
- `app/partner-settings.tsx` — Partner invite/link management
- `app/questionnaire-settings.tsx` — Toggle categories/individual triggers
- `app/feedback.tsx` — Feedback form → GitHub Issues (bug/enhancement labels)
- `api/feedback.ts` — Creates GH issues + optional Resend email

## Vercel Env Vars
- `GITHUB_TOKEN` — fine-grained PAT, Issues R/W, 3 repos, no expiration
- `FIREBASE_PROJECT_ID`, `CRON_SECRET` — set
- `RESEND_API_KEY` — set (using free onboarding@resend.dev domain)

## GitHub
- Issues + Milestones active: v1.0 Release (#1), v0.x Polish (#2), Partner Accounts (#3), App Store Launch (#4)
- Feedback form auto-creates issues with `bug`/`enhancement` + `user-feedback` labels

## Testing Workflow (EVERY feature/bug)
1. Show Roby manual test steps to verify the change
2. Add tests to TESTS.md (manual + automated)
3. Write automated test for the feature/bug
4. Run full test suite before pushing

## Issue Tracking Rule
- **Quick fixes done this session** → just implement, no GitHub issue needed
- **Deferred work / multi-session tasks** → create GitHub issue + add to ROADMAP.md
- **User-submitted feedback** → auto-creates issues via in-app form

## Current Status
**Version:** v0.33+
**Phase:** Phases 1-6, 8-10 DONE. Premium gating partial (JSON export gated, upgrade CTAs in tracker/trigger settings). Home redesigned (tracker grid + floating FAB).
**Pending:** RESEND_API_KEY on Vercel, Firebase service account for weekly email (GH #3), test partner premium inheritance on potsense.org.
**Next:** RevenueCat/Stripe integration, then notifications.
