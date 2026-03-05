# POTSense - Screen Wireframes & Flow

## Screen Index
1. [Landing / Login](#1-landing--login)
2. [Sign Up](#2-sign-up)
3. [Onboarding (first launch)](#3-onboarding)
4. [Guided Tour](#4-guided-tour)
5. [Home Tab](#5-home-tab)
6. [Swipe Questionnaire](#6-swipe-questionnaire)
7. [Episode Logged Confirmation](#7-episode-logged-confirmation)
8. [History Tab](#8-history-tab)
9. [Episode Detail](#9-episode-detail)
10. [Trends Tab](#10-trends-tab)
11. [Settings Tab](#11-settings-tab)
12. [Partner Management](#12-partner-management)
13. [Paywall](#13-paywall)
14. [News Article (WebView)](#14-news-article-webview)
15. [PDF Report Preview](#15-pdf-report-preview)

---

## Tab Bar (5 tabs, bottom of screen)

```
┌──────┬──────┬──────┬──────┬──────┐
│ 🏠   │ 📅   │ 📈   │ 📰   │ ⚙️   │
│ Home │ Log  │Trend │ News │ Set  │
└──────┴──────┴──────┴──────┴──────┘
```

1. **Home** — Weather card + BIG LOG button + daily trackers
2. **Log** — Episode history (calendar/timeline toggle)
3. **Trends** — Charts, correlations, PDF reports (premium, blurred teaser for free)
4. **News** — POTS news feed (curated + RSS)
5. **Settings** — Profile, partners, subscription, export, customization

---

## 1. LANDING / LOGIN

```
┌─────────────────────────────────┐
│                                 │
│         ♥~ POTSense             │
│      "Sense your triggers."    │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Email                    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Password                 │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │        Sign In            │  │
│  └───────────────────────────┘  │
│                                 │
│  ── or continue with ──         │
│                                 │
│  [G Google]  [🍎 Apple]         │
│                                 │
│  Don't have an account?         │
│  Sign Up                        │
│                                 │
│  ──────────────────────────     │
│  Not medical advice.            │
│  Built by a POTS family.       │
│  Privacy Policy | Terms         │
└─────────────────────────────────┘
```

**Notes:**
- Dark background, heart+pulse logo at top
- potsense.org loads this page (web)
- iOS/Android app opens to this screen (unless already logged in)
- "Forgot password?" link under password field
- Disclaimer footer always visible

---

## 2. SIGN UP

```
┌─────────────────────────────────┐
│  ← Back                        │
│                                 │
│        Create Account           │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Display Name             │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Email                    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Password                 │  │
│  └───────────────────────────┘  │
│                                 │
│  I am:                          │
│  ┌──────────┐  ┌──────────────┐ │
│  │ Tracking │  │ Supporting   │ │
│  │ for me   │  │ someone      │ │
│  └──────────┘  └──────────────┘ │
│                                 │
│  (if "Supporting someone":)     │
│  ┌───────────────────────────┐  │
│  │  Enter invite code: _____ │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │      Create Account       │  │
│  └───────────────────────────┘  │
│                                 │
│  ── or continue with ──         │
│  [G Google]  [🍎 Apple]         │
│                                 │
│  By signing up you agree to     │
│  our Terms and Privacy Policy   │
└─────────────────────────────────┘
```

**Notes:**
- Role selection determines account type (member vs partner)
- Partner path shows invite code field immediately
- Google/Apple sign-in still asks for role after OAuth
- Partner cannot create account without valid invite code

---

## 3. ONBOARDING (first launch, 4 screens — swipeable)

```
SCREEN 1:                         SCREEN 2:
┌─────────────────────┐           ┌─────────────────────┐
│                     │           │                     │
│    ♥~ POTSense      │           │    📍               │
│                     │           │                     │
│  Track your POTS    │           │  We'll grab the     │
│  episodes with      │           │  weather and        │
│  one tap.           │           │  barometric          │
│                     │           │  pressure            │
│  [illustration:     │           │  automatically.      │
│   finger tapping    │           │                     │
│   big button]       │           │  [Allow Location]   │
│                     │           │  [Maybe Later]      │
│                     │           │                     │
│  ● ○ ○ ○            │           │  ○ ● ○ ○            │
│  [Next →]           │           │  [Next →]           │
└─────────────────────┘           └─────────────────────┘

SCREEN 3:                         SCREEN 4:
┌─────────────────────┐           ┌─────────────────────┐
│                     │           │                     │
│    👥               │           │    📊               │
│                     │           │                     │
│  Invite your        │           │  Discover your      │
│  partner or         │           │  patterns over      │
│  caregiver to       │           │  time.              │
│  help you track.    │           │                     │
│                     │           │  [illustration:     │
│  (Premium feature)  │           │   chart showing     │
│                     │           │   trigger insights] │
│  [Invite Partner]   │           │                     │
│  [Skip for Now]     │           │  [Get Started! →]   │
│                     │           │                     │
│  ○ ○ ● ○            │           │  ○ ○ ○ ●            │
└─────────────────────┘           └─────────────────────┘
```

---

## 4. GUIDED TOUR (tooltip overlays on Home screen)

```
┌─────────────────────────────────┐
│  POTSense                       │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 29.92 inHg ↓  72°F  58%  │  │
│  │ Pressure dropping         │  │
│  └───────────────────────────┘  │
│         ┌──────────────────┐    │
│         │ ℹ️ This shows     │    │
│         │ your current      │    │
│         │ barometric        │    │
│         │ pressure.     1/4 │    │
│         │           [Next]  │    │
│         └────────┬─────────┘    │
│                  ▼              │
│  ┌───────────────────────────┐  │
│  │     💧  🧂  😴  💊  🏃   │  │
│  └───────────────────────────┘  │
│                                 │
│       ╔═══════════════╗         │
│       ║   LOG EPISODE ║         │
│       ╚═══════════════╝         │
│                                 │
│  Today: 0 | Week: 0 | Last: -- │
│                                 │
│ ┌────┐┌────┐┌────┐┌────┐       │
│ │Home││Hist││Trnd││ ⚙️ │       │
│ └────┘└────┘└────┘└────┘       │
└─────────────────────────────────┘

Tooltips cycle through (1/4, 2/4, 3/4, 4/4):
1. Weather card: "Current barometric pressure and conditions"
2. Daily trackers: "Log your daily basics — water, salt, sleep, meds, exercise"
3. LOG button: "Tap here when an episode happens"
4. Tab bar: "History, Trends, and Settings live here"
```

---

## 5. HOME TAB (main screen)

```
┌─────────────────────────────────┐
│  POTSense                  👤   │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🌡️ Current Conditions    │  │
│  │  29.92 inHg  ↓ dropping   │  │
│  │  72°F   58% humidity      │  │
│  │  ⚠️ Pressure falling fast │  │
│  └───────────────────────────┘  │
│                                 │
│  Today's Tracking               │
│  ┌─────┬─────┬─────┬─────┬────┐│
│  │ 💧  │ 🧂  │ 😴  │ 💊  │ 🏃 ││
│  │ --  │ --  │ --  │ --  │ -- ││
│  │     │     │     │     │    ││
│  └─────┴─────┴─────┴─────┴────┘│
│  (tap any to log: Low/High)     │
│                                 │
│       ╔═══════════════════╗     │
│       ║                   ║     │
│       ║    LOG EPISODE    ║     │
│       ║                   ║     │
│       ╚═══════════════════╝     │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Today: 0  Week: 3  Last: │  │
│  │                    14h ago│  │
│  └───────────────────────────┘  │
│                                 │
│  📰 POTS News                   │
│  ┌───────────────────────────┐  │
│  │ ★ New research on IV      │  │
│  │   saline for POTS         │  │
│  │   Dysautonomia Intl • 2d  │  │
│  ├───────────────────────────┤  │
│  │ Standing Up to POTS:      │  │
│  │ 5 Tips for Summer Heat    │  │
│  │   SUTP • 4d               │  │
│  ├───────────────────────────┤  │
│  │ Cleveland Clinic: New     │  │
│  │ diagnostic guidelines...  │  │
│  │   CC Blog • 1w            │  │
│  └───────────────────────────┘  │
│                                 │
│ ┌────┐┌────┐┌────┐┌────┐       │
│ │Home││Hist││Trnd││ ⚙️ │       │
│ └────┘└────┘└────┘└────┘       │
└─────────────────────────────────┘

PARTNER VIEW (same screen, slight differences):
- Header shows: "Tracking for: [Member Name]"
- LOG button says: "LOG FOR [NAME]"
- Daily trackers are read-only (shows member's data)
- Stats show member's episode counts
```

**Daily Tracker Interaction:**
```
Tap 💧 Water:
┌───────────────────────────┐
│  💧 Water intake today?   │
│                           │
│  [LOW]        [HIGH]      │
│                           │
│  Exact: [____] oz  🔒    │
│  (Upgrade to enter exact) │
│                           │
│  [Cancel]                 │
└───────────────────────────┘
(shows as bottom sheet / modal)
```

---

## 6. SWIPE QUESTIONNAIRE (full-screen modal)

**Launches immediately after LOG EPISODE tap.**

```
CARD VIEW (1 question at a time):
┌─────────────────────────────────┐
│  ✕ Close                  Done  │
│                                 │
│                                 │
│                                 │
│  ◄ LOW               HIGH ►    │
│                                 │
│         💧 Water                │
│         intake                  │
│         today?                  │
│                                 │
│    (swipe anywhere              │
│     left or right)              │
│                                 │
│                                 │
│  3 of 10        ━━━━━━━━━━━━   │
│─────────────────────────────────│
│  Exact: [____] oz        🔒    │
│  Upgrade for exact values       │
│─────────────────────────────────│
│     [Skip]  [N/A]  [Unknown]   │
└─────────────────────────────────┘

SWIPE LEFT ANIMATION:
┌─────────────────────────────────┐
│                                 │
│   ┌─────────────────┐          │
│   │                 │ ←←←      │
│   │   ❌ LOW        │          │
│   │                 │          │
│   └─────────────────┘          │
│                                 │
│  (card slides off left,         │
│   next card slides in           │
│   from right)                   │
└─────────────────────────────────┘

SWIPE RIGHT ANIMATION:
┌─────────────────────────────────┐
│                                 │
│          ┌─────────────────┐   │
│    →→→   │                 │   │
│          │   ✅ HIGH       │   │
│          │                 │   │
│          └─────────────────┘   │
│                                 │
└─────────────────────────────────┘

BRANCHING EXAMPLE (Bath/Shower):
Card 10: "Bath or shower today?"
  ◄ NO                    YES ►
  │                        │
  │                        ▼
  │               Card 10a: "Bath or Shower?"
  │               ◄ BATH         SHOWER ►
  │                        │
  │                        ▼
  │               Card 10b: "Temperature?"
  │               ◄ WARM           HOT ►
  │                        │
  ▼                        ▼
Card 11 ◄──────────────────┘

PRE-FILL BEHAVIOR (daily log has data):
┌─────────────────────────────────┐
│                                 │
│  ◄ LOW               HIGH ►    │
│                                 │
│        💧 Water                 │
│        intake                   │
│        today?                   │
│                                 │
│   ───────────────●──────        │
│   (slider visual leans HIGH     │
│    based on 64oz daily log)     │
│                                 │
│  📋 From your daily log: 64oz  │
│                                 │
│  3 of 10                        │
│─────────────────────────────────│
│  Exact: [_64_] oz        🔒    │
└─────────────────────────────────┘
```

**Free vs Premium Card List:**

FREE (10 cards):
| # | Question | Left | Right |
|---|----------|------|-------|
| 1 | Water intake today? | Low | High |
| 2 | Salt intake today? | Low | High |
| 3 | Sleep last night? | Bad | Good |
| 4 | Caffeine today? | No | Yes |
| 5 | Alcohol today? | No | Yes |
| 6 | Ate recently? | No | Yes |
| 7 | Stress level? | Low | High |
| 8 | Standing for long period? | No | Yes |
| 9 | Got up quickly? | No | Yes |
| 10 | Bath or shower today? | No | Yes → Bath/Shower? → Hot/Warm? |

PREMIUM (additional cards, user picks which to show):
| # | Question | Left | Right | Branch |
|---|----------|------|-------|--------|
| 11 | Exercise today? | No | Yes | → Light/Moderate/Intense |
| 12 | Hot environment? | No | Yes | |
| 13 | Menstrual period? | No | Yes | |
| 14 | Took meds today? | No | Yes | Exact: which ones |
| 15 | Feeling emotional? | No | Yes | |
| 16 | Temperature exposure? | No | Yes | |

**Grayed-out premium teaser at end of free questionnaire:**
```
┌─────────────────────────────────┐
│                                 │
│  🔒 6 more questions available  │
│                                 │
│  Exercise, Hot environment,     │
│  Menstrual cycle, Medications,  │
│  Emotional state, Temperature   │
│                                 │
│  Plus: exact values on all      │
│  questions and custom cards.    │
│                                 │
│  [Upgrade to Premium - $4.99/mo]│
│  [Done]                         │
└─────────────────────────────────┘
```

---

## 7. EPISODE LOGGED CONFIRMATION

```
┌─────────────────────────────────┐
│                                 │
│         ✅ Episode Logged       │
│                                 │
│  How severe was this episode?   │
│                                 │
│  😊    😐    😟    😣    😵    │
│  1     2     3     4     5     │
│  Mild       Moderate    Worst  │
│                                 │
│  Notes (optional):              │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │       Save & Close        │  │
│  └───────────────────────────┘  │
│                                 │
│  [Undo — Delete this episode]  │
└─────────────────────────────────┘
```

**Shows after swipe questionnaire completes (or skips).**

---

## 8. HISTORY TAB

```
CALENDAR VIEW (default):
┌─────────────────────────────────┐
│  History         [📅] [≡]      │
│                  cal   list     │
│                                 │
│  ◄  March 2026  ►              │
│  Su Mo Tu We Th Fr Sa          │
│   1  2  3  4  5  6  7          │
│   8  9 10 11 12 13 14          │
│  15 16 17 18 19 20 21          │
│  22 23 24●25 26●27 28          │
│  29 30●31                      │
│                                 │
│  ● = episodes (multi-dot for   │
│      multiple, color=severity)  │
│                                 │
│  March 31 (2 episodes)          │
│  ┌───────────────────────────┐  │
│  │ 2:34 PM       😣 Sev 4   │  │
│  │ 29.72 inHg ↓  72°F       │  │
│  │ 💧❌ 🧂✅ 😴❌ ☕✅ 🏃❌ │  │
│  │ "felt really dizzy..."    │  │
│  │ Logged by: Sarah          │  │
│  ├───────────────────────────┤  │
│  │ 6:12 PM       😐 Sev 2   │  │
│  │ 29.85 inHg →  70°F       │  │
│  │ 💧✅ 🧂✅ 😴❌ ☕❌ 🏃❌ │  │
│  │ "mild, after dinner"      │  │
│  └───────────────────────────┘  │
│                                 │
│ ┌────┐┌────┐┌────┐┌────┐       │
│ │Home││Hist││Trnd││ ⚙️ │       │
│ └────┘└────┘└────┘└────┘       │
└─────────────────────────────────┘

TIMELINE VIEW (toggle):
┌─────────────────────────────────┐
│  History         [📅] [≡]      │
│                  cal   list     │
│                                 │
│  Today, March 31                │
│  ┌───────────────────────────┐  │
│  │ 2:34 PM       😣 Sev 4   │  │
│  │ 29.72 inHg ↓  72°F       │  │
│  │ 💧❌ 🧂✅ 😴❌ ☕✅ 🏃❌ │  │
│  │ "felt really dizzy..."    │  │
│  │ Logged by: Sarah          │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 6:12 PM       😐 Sev 2   │  │
│  │ 29.85 inHg →  70°F       │  │
│  │ "mild, after dinner"      │  │
│  └───────────────────────────┘  │
│                                 │
│  Yesterday, March 30            │
│  ┌───────────────────────────┐  │
│  │ 9:15 AM       😟 Sev 3   │  │
│  │ 30.01 inHg ↑  68°F       │  │
│  │ "woke up feeling off"     │  │
│  └───────────────────────────┘  │
│                                 │
│  ─── Older than 30 days ───     │
│  🔒 Upgrade for full history    │
│  [Upgrade to Premium]           │
│                                 │
│ ┌────┐┌────┐┌────┐┌────┐       │
│ │Home││Hist││Trnd││ ⚙️ │       │
│ └────┘└────┘└────┘└────┘       │
└─────────────────────────────────┘
```

---

## 9. EPISODE DETAIL (tap episode card)

```
┌─────────────────────────────────┐
│  ← Back              🗑️ Delete │
│                                 │
│  March 31, 2:34 PM     😣 4/5  │
│  Logged by: Sarah (partner)     │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🌡️ Weather at episode    │  │
│  │  29.72 inHg ↓  (-0.38/3h)│  │
│  │  72°F  58% humidity       │  │
│  │  Wind: 8 mph  Partly ☁️  │  │
│  │                           │  │
│  │  Pressure (last 6 hours): │  │
│  │  ──────╲                  │  │
│  │         ╲────             │  │
│  │              ╲── ● NOW    │  │
│  └───────────────────────────┘  │
│                                 │
│  📋 Questionnaire Answers       │
│  ┌───────────────────────────┐  │
│  │ 💧 Water     ❌ Low       │  │
│  │ 🧂 Salt      ✅ High      │  │
│  │ 😴 Sleep     ❌ Bad       │  │
│  │ ☕ Caffeine   ✅ Yes       │  │
│  │ 🍷 Alcohol   ❌ No        │  │
│  │ 🍽️ Ate       ✅ Yes       │  │
│  │ 😰 Stress    ✅ High      │  │
│  │ 🧍 Standing  ❌ No        │  │
│  │ ⬆️ Got up    ✅ Yes       │  │
│  │ 🛁 Shower    ✅ Yes → 🚿  │  │
│  │              Hot          │  │
│  └───────────────────────────┘  │
│  (tap any row to change)        │
│                                 │
│  ⚠️ Partner answered differently:│
│  ┌───────────────────────────┐  │
│  │ 💧 Water: You said LOW    │  │
│  │          Sarah said HIGH  │  │
│  │   [Keep LOW] [Change]     │  │
│  └───────────────────────────┘  │
│                                 │
│  📝 Notes                       │
│  ┌───────────────────────────┐  │
│  │ felt really dizzy after   │  │
│  │ getting up from couch     │  │
│  └───────────────────────────┘  │
│                                 │
│  🏷️ Detailed Triggers  🔒      │
│  [Upgrade to add triggers]      │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Edit Timestamp            │  │
│  │ Mar 31, 2026  2:34 PM  ✏️ │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## 10. TRENDS TAB

```
FREE VIEW (blurred teaser):
┌─────────────────────────────────┐
│  Trends                         │
│                                 │
│  ┌───────────────────────────┐  │
│  │  ░░░░░░░░░░░░░░░░░░░░░░  │  │
│  │  ░░ Your insights are ░░  │  │
│  │  ░░ waiting... ░░░░░░░░  │  │
│  │  ░░░░░░░░░░░░░░░░░░░░░░  │  │
│  │                           │  │
│  │  You have 23 episodes     │  │
│  │  tracked. Unlock your     │  │
│  │  personal trigger         │  │
│  │  analysis.                │  │
│  │                           │  │
│  │  [Upgrade - $4.99/mo]     │  │
│  └───────────────────────────┘  │
│                                 │
│ ┌────┐┌────┐┌────┐┌────┐       │
│ │Home││Hist││Trnd││ ⚙️ │       │
│ └────┘└────┘└────┘└────┘       │
└─────────────────────────────────┘

PREMIUM VIEW:
┌─────────────────────────────────┐
│  Trends     [7d][30d][90d][All] │
│                                 │
│  📊 Episode Frequency           │
│  ┌───────────────────────────┐  │
│  │  █                        │  │
│  │  █ █     █                │  │
│  │  █ █ █   █ █              │  │
│  │  █ █ █ █ █ █ █            │  │
│  │  M T W T F S S            │  │
│  │  This week: 12 episodes   │  │
│  └───────────────────────────┘  │
│                                 │
│  🌡️ Pressure Correlation       │
│  ┌───────────────────────────┐  │
│  │  ──╲    ╱──╲              │  │
│  │    ╲──╱    ╲──── pressure │  │
│  │  ●  ●●  ●     ● episodes │  │
│  │                           │  │
│  │  ⚠️ 89% of your episodes  │  │
│  │  occur within 3h of a     │  │
│  │  pressure drop > 3 hPa   │  │
│  └───────────────────────────┘  │
│                                 │
│  📋 Questionnaire Insights      │
│  ┌───────────────────────────┐  │
│  │  ⚠️ Low Water   ████ 72% │  │
│  │  ⚠️ Caffeine    ████ 61% │  │
│  │  ⚠️ Bad Sleep   ███  58% │  │
│  │  ⚠️ High Stress ███  54% │  │
│  │  ⚠️ Hot Shower  ██   41% │  │
│  │  ✅ High Salt   █    12% │  │
│  │                           │  │
│  │  "Episodes 2.3x more     │  │
│  │   likely with caffeine"  │  │
│  └───────────────────────────┘  │
│                                 │
│  ⏰ Time of Day                 │
│  ┌───────────────────────────┐  │
│  │     █ █                   │  │
│  │   █ █ █ █                 │  │
│  │ █ █ █ █ █ █               │  │
│  │ 6a 9a 12 3p 6p 9p        │  │
│  │  Most episodes: 1-3 PM   │  │
│  └───────────────────────────┘  │
│                                 │
│  📅 Day of Week                 │
│  ┌───────────────────────────┐  │
│  │  Worst: Monday, Tuesday   │  │
│  │  Best: Saturday           │  │
│  └───────────────────────────┘  │
│                                 │
│  [📄 Generate Doctor Report]    │
│                                 │
│ ┌────┐┌────┐┌────┐┌────┐       │
│ │Home││Hist││Trnd││ ⚙️ │       │
│ └────┘└────┘└────┘└────┘       │
└─────────────────────────────────┘
```

---

## 11. SETTINGS TAB

```
┌─────────────────────────────────┐
│  Settings                       │
│                                 │
│  ACCOUNT                        │
│  ┌───────────────────────────┐  │
│  │ 👤 Profile                │  │
│  │    Roby D. • roby@...     │  │
│  ├───────────────────────────┤  │
│  │ 👥 Partners         🔒   │  │
│  │    Manage linked partners │  │
│  ├───────────────────────────┤  │
│  │ ⭐ Subscription           │  │
│  │    Free Plan              │  │
│  │    [Upgrade to Premium]   │  │
│  └───────────────────────────┘  │
│                                 │
│  TRACKING                       │
│  ┌───────────────────────────┐  │
│  │ 📋 Daily Trackers    🔒   │  │
│  │    Customize which to show│  │
│  ├───────────────────────────┤  │
│  │ 🃏 Questionnaire     🔒   │  │
│  │    Choose your cards      │  │
│  ├───────────────────────────┤  │
│  │ 📏 Units                  │  │
│  │    °F • inHg              │  │
│  └───────────────────────────┘  │
│                                 │
│  NOTIFICATIONS                  │
│  ┌───────────────────────────┐  │
│  │ 🌡️ Pressure Alerts   ON  │  │
│  │    Threshold: 5 hPa/3h   │  │
│  ├───────────────────────────┤  │
│  │ 🔔 Check-in Reminder ON  │  │
│  │    Daily at 8:00 PM       │  │
│  ├───────────────────────────┤  │
│  │ 📧 Email Notifications   │  │
│  │    Weekly summary: ON     │  │
│  └───────────────────────────┘  │
│                                 │
│  DATA                           │
│  ┌───────────────────────────┐  │
│  │ 📄 Export PDF Report  🔒  │  │
│  ├───────────────────────────┤  │
│  │ 📊 Export CSV         🔒  │  │
│  ├───────────────────────────┤  │
│  │ 💾 Export All Data (JSON) │  │
│  ├───────────────────────────┤  │
│  │ 🗑️ Delete Account         │  │
│  └───────────────────────────┘  │
│                                 │
│  INFO                           │
│  ┌───────────────────────────┐  │
│  │ 📰 News Sources           │  │
│  ├───────────────────────────┤  │
│  │ 📜 Privacy Policy         │  │
│  ├───────────────────────────┤  │
│  │ 📜 Terms of Service       │  │
│  ├───────────────────────────┤  │
│  │ 💡 Suggest a Feature      │  │
│  ├───────────────────────────┤  │
│  │ ℹ️ About POTSense v1.0    │  │
│  └───────────────────────────┘  │
│                                 │
│  ⚕️ POTSense is not medical     │
│  advice. Always consult your   │
│  healthcare provider.          │
│                                 │
│ ┌────┐┌────┐┌────┐┌────┐       │
│ │Home││Hist││Trnd││ ⚙️ │       │
│ └────┘└────┘└────┘└────┘       │
└─────────────────────────────────┘
```

🔒 = tapping shows paywall if not premium

---

## 12. PARTNER MANAGEMENT (Settings → Partners)

```
MEMBER VIEW:
┌─────────────────────────────────┐
│  ← Partners                    │
│                                 │
│  Your Partners                  │
│  ┌───────────────────────────┐  │
│  │ 👤 Sarah D.               │  │
│  │    Linked since Mar 4     │  │
│  │    Last active: 2h ago    │  │
│  │              [Remove]     │  │
│  └───────────────────────────┘  │
│                                 │
│  Invite a Partner               │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │   Your invite code:       │  │
│  │                           │  │
│  │     A 7 K 9 M 2           │  │
│  │                           │  │
│  │   Expires in 23h 41m      │  │
│  │                           │  │
│  │   [Copy Code]             │  │
│  │   [Share via Text]        │  │
│  │   [Generate New Code]     │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  Partners can:                  │
│  ✅ Log episodes for you        │
│  ✅ Fill in questionnaire       │
│  ✅ View your history           │
│  ❌ Delete your episodes        │
│  ❌ Change your settings        │
│                                 │
└─────────────────────────────────┘

PARTNER VIEW (after linking):
┌─────────────────────────────────┐
│  ← Partners                    │
│                                 │
│  Tracking For                   │
│  ┌───────────────────────────┐  │
│  │ 👤 Roby D.                │  │
│  │    Linked since Mar 4     │  │
│  │              [Unlink]     │  │
│  └───────────────────────────┘  │
│                                 │
│  Link Another Person            │
│  ┌───────────────────────────┐  │
│  │  Enter invite code:       │  │
│  │  [______]  [Link]         │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## 13. PAYWALL

```
┌─────────────────────────────────┐
│  ✕ Close                        │
│                                 │
│       ♥~ POTSense Premium       │
│                                 │
│  ┌───────────────────────────┐  │
│  │           FREE    PREMIUM │  │
│  │                           │  │
│  │ Episodes   ✅ ∞    ✅ ∞   │  │
│  │ Swipe Q    ✅ 10   ✅ All │  │
│  │ Exact vals ❌       ✅    │  │
│  │ Branches   ❌       ✅    │  │
│  │ Trackers   5 basic  15+   │  │
│  │ History    30 days  ∞     │  │
│  │ Partners   ❌       ✅    │  │
│  │ Trends     ❌       ✅    │  │
│  │ Dr Report  ❌       ✅    │  │
│  │ Export     ❌       ✅    │  │
│  │ Pressure   ✅       ✅    │  │
│  │ alerts                    │  │
│  │ Custom Q's  ❌      ✅    │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  $4.99 / month            │  │
│  │  [Subscribe Monthly]      │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  $39.99 / year (save 33%) │  │
│  │  [Subscribe Annual] ★     │  │
│  └───────────────────────────┘  │
│                                 │
│  Restore Purchases              │
│                                 │
│  Cancel anytime. Your data      │
│  stays even if you downgrade.  │
└─────────────────────────────────┘
```

---

## 14. NEWS ARTICLE (WebView)

```
┌─────────────────────────────────┐
│  ← Back    dysautonomia-intl.org│
│  ━━━━━━━━━━━━━━━━━━━━ loading  │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  [Article content loads   │  │
│  │   in WebView]             │  │
│  │                           │  │
│  │                           │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  [Open in Browser] [Share]      │
└─────────────────────────────────┘
```

---

## 15. PDF REPORT PREVIEW

```
┌─────────────────────────────────┐
│  ← Back           [Share] [📧] │
│                                 │
│  Generate Report                │
│                                 │
│  Date Range:                    │
│  [Feb 1, 2026] → [Mar 4, 2026] │
│                                 │
│  ☑️ Include questionnaire data  │
│  ☐ Include daily tracking data  │
│     (appendix)                  │
│                                 │
│  [Generate PDF]                 │
│                                 │
│  ── Preview ──                  │
│  ┌───────────────────────────┐  │
│  │ ╔═══════════════════════╗ │  │
│  │ ║ POTSense Report       ║ │  │
│  │ ║ Jane Doe              ║ │  │
│  │ ║ Feb 1 - Mar 4, 2026   ║ │  │
│  │ ╚═══════════════════════╝ │  │
│  │                           │  │
│  │ SUMMARY                   │  │
│  │ Episodes: 23              │  │
│  │ Avg Severity: 3.2/5       │  │
│  │ Avg/Week: 5.8             │  │
│  │ Worst Day: Monday         │  │
│  │ Worst Time: 1-3 PM        │  │
│  │                           │  │
│  │ TOP CORRELATIONS          │  │
│  │ ⚠️ Press Drop  ████ 89%  │  │
│  │ ⚠️ Low Water   ████ 72%  │  │
│  │ ⚠️ Caffeine    ███  61%  │  │
│  │ ...                       │  │
│  │                           │  │
│  │ ⚕️ Not medical advice.    │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## Complete User Journey Map

```
FIRST TIME USER:
  Download/visit → Login screen → Sign Up
    → "Tracking for me" or "Supporting someone"
    → Onboarding (4 swipe screens, location permission)
    → Guided Tour (4 tooltips)
    → Home screen (empty state)
    → Logs first episode → Swipe questionnaire → "Welcome to POTSense!"
    → Uses daily trackers throughout day
    → Evening check-in reminder (push)
    → Next episode → swipe cards pre-fill from daily log
    → After 7+ episodes → Trends teaser appears
    → Hits 30 day limit or wants trends → Paywall → Subscribes

RETURNING USER (daily):
  Open app → Home screen
    → Check pressure (glance)
    → Update daily trackers (water, salt, etc.)
    → If episode: LOG → swipe → severity → done
    → If partner logs: push notification → open episode → review answers
    → Scroll news feed
    → Evening: check-in reminder (if enabled)

DOCTOR VISIT:
  Settings → Export PDF Report
    → Pick date range
    → Check "include daily data"
    → Generate → Share via email or AirDrop
    → Doctor reviews: episodes, pressure correlations, trigger patterns

PARTNER DAILY:
  Gets push: "[Name] logged an episode"
    → Open app → Episode detail
    → Swipe through questionnaire (fill in what they know)
    → Check history
    → Log own observations via daily trackers (read-only)
```
