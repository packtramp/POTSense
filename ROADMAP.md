# POTSense Roadmap

## Completed (Phases 1-5)

- Auth (email/password, Google, Apple)
- Episode logging with severity, symptoms, triggers, notes
- Auto weather/barometric pressure capture (Open-Meteo)
- 50+ swipe questionnaire cards (8 categories, branching logic)
- Daily trackers (hydration, sleep, diet, mood, activity, etc.)
- News feed (curated POTS articles)
- Tracker & trigger settings with premium gating
- Premium subscription flow (RevenueCat — $4.99/mo or $39.99/yr)
- PDF doctor export (free), JSON export (premium)
- Reminder settings with custom time picker (GH #2 — closed)
- Structured feedback form → GitHub Issues
- Super admin panel
- Partner premium inheritance (partners get premium from linked patient)
- Live at potsense.org (v0.33)

---

## Phase 6: Partner Accounts
**GitHub Milestone:** [Partner Accounts (#3)](https://github.com/packtramp/POTSense/milestone/3) | **GH Issue:** [#1](https://github.com/packtramp/POTSense/issues/1)

| # | Task | Status |
|---|------|--------|
| 1 | Partner invite flow (patient generates invite code) | Pending |
| 2 | Partner links to patient account via code | Pending |
| 3 | Partner dashboard — read-only view of patient's episodes | Pending |
| 4 | Partner sees patient's daily tracker status | Pending |
| 5 | Partner receives notifications on new episodes (optional) | Pending |
| 6 | Unlink partner flow | Pending |

---

## v0.x Polish
**GitHub Milestone:** [v0.x Polish (#2)](https://github.com/packtramp/POTSense/milestone/2)

| GH# | Task | Status |
|-----|------|--------|
| [#4](https://github.com/packtramp/POTSense/issues/4) | Integrate RevenueCat for subscription management | Pending |
| [#7](https://github.com/packtramp/POTSense/issues/7) | Pressure-change correlation stat on trends dashboard | Pending |
| — | Test feedback → GitHub Issues pipeline (GITHUB_TOKEN on Vercel) | Pending |

---

## v1.0 Release
**GitHub Milestone:** [v1.0 release (#1)](https://github.com/packtramp/POTSense/milestone/1)

| GH# | Task | Status |
|-----|------|--------|
| [#3](https://github.com/packtramp/POTSense/issues/3) | Firebase service account + cron for weekly email summary | Pending |
| [#5](https://github.com/packtramp/POTSense/issues/5) | Background pressure monitoring + push notifications | Pending |
| — | App icon + splash screen | Pending |
| — | Privacy policy page (host on Vercel) | Pending |
| — | EAS Build setup (native modules for RevenueCat + notifications) | Pending |

---

## App Store Launch
**GitHub Milestone:** [App Store Launch (#4)](https://github.com/packtramp/POTSense/milestone/4)

| GH# | Task | Status |
|-----|------|--------|
| [#6](https://github.com/packtramp/POTSense/issues/6) | App Store + Google Play submission prep | Pending |
| [#8](https://github.com/packtramp/POTSense/issues/8) | 2-3 screen onboarding flow for new users | Pending |
| — | App store screenshots + descriptions | Pending |

---

## Backlog (Post-v1.0)

- Cloud sync / account data backup
- CSV export (premium)
- Custom triggers (user-defined)
- Wearable integration (Apple Watch HR, Fitbit)
- Community features (anonymous pattern sharing)
- Multi-language support
- Widgets (iOS/Android home screen)

---

## Notes

- **Source of truth:** This file. GitHub Issues + milestones mirror it.
- **User feedback** auto-creates GitHub Issues via in-app feedback form (labeled `user-feedback`).
- **Premium model:** Free = episode logging, weather, 30-day history, PDF export. Premium = unlimited history, all trackers/triggers, JSON export, trends, alerts.
