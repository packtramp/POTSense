## PRIME DIRECTIVE
**Lean and mean.** Keep under 250 lines. Move detail to sub-files. Don't ask Roby — try first. Never blame cache. No code output.

# POTSense

## What
POTS episode tracker with auto barometric pressure capture, Tinder-style swipe questionnaire, partner accounts, daily trackers, and trend analysis. App #1 in a small portfolio strategy.

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
- **Free:** Unlimited logging, swipe questionnaire, 5 daily trackers, 30-day history, pressure alerts, news feed, 30-day PDF report, JSON export
- **Premium:** All cards + branches, custom trackers, unlimited history + calendar, partner accounts, trends/correlations, custom PDF, CSV export, questionnaire customization

## Key Design Decisions
- **Dark mode default** (#0F0F0F bg), emoji severity (😕😐😟😣😵 — no smiley, even mild isn't happy)
- **5 bottom tabs:** Home, Log, Trends, News, Settings
- **Swipe convention:** RIGHT = always positive/green, LEFT = always concerning/orange
- **Episode flow:** Severity → Symptoms → Notes → "Next: Quick Check" → Swipe cards → Save. "Skip & Save" at bottom.
- **50+ swipe cards** across 8 categories (hydration, diet, sleep, activity, environment, health, mental, lifestyle)
- **Branching cards:** LEFT triggers drill-down (bath → type/temp/duration/chair, caffeine → type/amount, exercise → type/duration/position, etc.)
- **Settings toggles:** Users enable/disable entire categories or individual cards
- **Daily trackers:** Tap to cycle (--→Low→Med→High or --→No→Yes), saves to Firestore dailyLogs
- **Partner accounts (premium):** 6-digit invite code, push notifs, can log/swipe
- **Super Admin:** robdorsett@gmail.com gets admin panel in Settings
- **Domain:** potsense.org (Vercel, deployed as PWA)
- **Alert.alert doesn't work on web** — use window.confirm wrapper

## Docs
| File | Content |
|------|---------|
| `docs/DESIGN-SPEC.md` | Full feature spec, swipe cards, free/premium wall, payments |
| `docs/SCREENS.md` | 15 screen wireframes, tab bar, user journey maps |
| `docs/ARCHITECTURE.md` | System diagram, data flows, API integrations, build phases |
| `docs/FIRESTORE-MODEL.md` | Document schemas, security rules, indexes, cost estimation |
| `docs/PREMIUM-LOGIC.md` | RevenueCat setup, feature gating matrix, paywall triggers |
| `docs/NOTIFICATIONS.md` | Push/email/SMS setup, cron jobs, notification types |
| `docs/DEPLOY-CONFIG.md` | **READ BEFORE EVERY PUSH.** Vercel, GitHub, Firebase, troubleshooting |
| `docs/SESSION-NOTES.md` | Session work log |

## Build Phases
1. ~~Scaffold + 5-tab nav + Firebase Auth + basic episode logging (modal)~~ DONE
2. ~~Weather + Location auto-capture (Open-Meteo)~~ DONE
3. ~~Swipe Questionnaire (50+ cards, 8 categories, branching, settings toggles)~~ DONE
4. ~~Daily Trackers (tap-to-cycle on Home, Firestore dailyLogs)~~ DONE
5. ~~News Feed (4 RSS sources — Dysautonomia Intl, Dysautonomia Project, PoTS UK, Cleveland Clinic)~~ DONE
6. ~~Partner accounts + invite codes~~ DONE
7. Premium + RevenueCat + Stripe + feature gating
8. ~~History screen (tappable cards → episode detail modal with delete)~~ DONE
9. ~~Trends + charts (5 swipeable cards: pressure/episodes, severity, triggers, time-of-day, frequency)~~ DONE
10. ~~Doctor PDF report (date range selector, episode table, trigger analysis, pressure correlation)~~ DONE
11. Notifications (push + Resend email + cron jobs)
12. Onboarding + guided tour + polish
13. App store submission (iOS + Android)

**Test as web (Vercel) throughout. Wrap for mobile stores at Phase 13.**

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
- `constants/swipeCards.ts` — 50+ config-driven cards, 8 categories, branching
- `constants/Colors.ts` — Dark theme palette
- `components/SwipeQuestionnaire.tsx` — Card UI with progress, branching, skip
- `components/PressureChart.tsx` — SVG pressure chart with episode dots overlay
- `app/episode-detail.tsx` — Full episode view with delete
- `app/pdf-export.tsx` — Doctor PDF report generation
- `app/partner-settings.tsx` — Partner invite/link management
- `app/questionnaire-settings.tsx` — Toggle categories/individual cards

## Current Status
**Phase:** Phases 1-10 COMPLETE (except 7: Premium/RevenueCat). Next: Phase 7 (Premium + RevenueCat) or Phase 11 (Notifications).
