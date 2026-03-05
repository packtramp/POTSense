# POTSense - Firestore Data Model & Security Rules

## Collection Structure

```
firestore/
├── users/{uid}                          — User profile + settings
├── patients/{memberUid}/
│   ├── episodes/{episodeId}             — Episode data + weather + questionnaire
│   └── dailyLogs/{YYYY-MM-DD}          — Daily tracker entries
└── inviteCodes/{code}                   — Active invite codes (TTL: 24h)
```

---

## Document Schemas

### users/{uid}
```typescript
{
  // Identity
  uid: string,                    // Firebase Auth UID
  displayName: string,
  email: string,
  role: "member" | "partner",
  createdAt: Timestamp,
  lastActive: Timestamp,

  // Linking
  linkedPartners: string[],       // UIDs (member only)
  linkedMembers: string[],        // UIDs (partner only)

  // Premium
  premiumStatus: boolean,         // Updated by RevenueCat webhook
  premiumPlan: "monthly" | "annual" | null,
  premiumExpiry: Timestamp | null,

  // Settings
  settings: {
    units: {
      temperature: "F" | "C",      // Auto-detected, overridable
      pressure: "inHg" | "hPa" | "mmHg",
    },
    notifications: {
      pressureAlerts: boolean,      // Default: true
      pressureThreshold: number,    // Default: 5 (hPa change in 3h)
      checkInReminder: boolean,     // Default: true
      checkInTime: string,          // Default: "20:00" (8 PM)
      weeklyEmail: boolean,         // Default: true
      partnerAlerts: boolean,       // Default: true (partner only)
    },
    activeTrackers: string[],       // Default: ["water","salt","sleep","meds","exercise"]
    activeQuestionCards: string[],   // Default: all 10 free cards
    newsSourcesEnabled: string[],   // Default: all RSS sources
  },

  // Push token
  pushToken: string | null,         // Expo push token
  pushTokenUpdatedAt: Timestamp | null,

  // Location (cached for pressure alerts)
  lastKnownLocation: {
    latitude: number,
    longitude: number,
    updatedAt: Timestamp,
  } | null,

  // Notification dedup
  lastCheckInSent: string | null,        // "YYYY-MM-DD"
  lastPressureAlertSent: string | null,  // "YYYY-MM-DD HH:mm"
  lastWeeklySummarySent: string | null,  // "YYYY-MM-DD"
}
```

### patients/{memberUid}/episodes/{episodeId}
```typescript
{
  // Core
  id: string,                     // Auto-generated
  timestamp: Timestamp,           // When episode occurred (editable for backdating)
  createdAt: Timestamp,           // When record was created
  updatedAt: Timestamp,
  loggedBy: string,               // UID of person who logged it
  loggedByName: string,           // Display name of logger
  severity: number,               // 1-5 (emoji scale)
  notes: string,                  // Free-text notes

  // Location
  latitude: number | null,
  longitude: number | null,
  locationName: string | null,    // Reverse geocoded city/area (optional)

  // Weather (auto-captured)
  weather: {
    surfacePressure: number,      // hPa (actual barometric)
    surfacePressureInHg: number,  // Converted for US display
    temperature: number,          // Celsius (converted for display)
    humidity: number,             // Percent
    windSpeed: number,            // km/h
    weatherCode: number,          // WMO weather code
    pressureChange3h: number,     // hPa change over 3 hours
    pressureTrend: "rising" | "falling" | "stable",
    fetchedAt: Timestamp,
  } | null,                       // null if offline when logged

  // Questionnaire answers (binary)
  questionnaire: {
    water: "low" | "high" | "skip" | null,
    salt: "low" | "high" | "skip" | null,
    sleep: "bad" | "good" | "skip" | null,
    caffeine: "no" | "yes" | "skip" | null,
    alcohol: "no" | "yes" | "skip" | null,
    ate_recently: "no" | "yes" | "skip" | null,
    stress: "low" | "high" | "skip" | null,
    standing_long: "no" | "yes" | "skip" | null,
    got_up_quickly: "no" | "yes" | "skip" | null,
    bath_shower: "no" | "yes" | "skip" | null,
    // Premium cards:
    exercise: "no" | "yes" | "skip" | null,
    hot_environment: "no" | "yes" | "skip" | null,
    menstrual: "no" | "yes" | "skip" | null,
    took_meds: "no" | "yes" | "skip" | null,
    feeling_emotional: "no" | "yes" | "skip" | null,
    temperature_exposure: "no" | "yes" | "skip" | null,
  },

  // Branching follow-ups
  questionnaire_branches: {
    bath_shower_type: "bath" | "shower" | null,
    bath_shower_temp: "warm" | "hot" | null,
    caffeine_type: "coffee" | "tea" | "energy_drink" | null,
    exercise_intensity: "light" | "moderate" | "intense" | null,
    alcohol_amount: "small" | "large" | null,
  } | null,

  // Exact values (premium)
  questionnaire_exact: {
    water_oz: number | null,
    salt_mg: number | null,
    sleep_hours: number | null,
    caffeine_cups: number | null,
    alcohol_type: string | null,    // "beer", "wine", "liquor"
    alcohol_glasses: number | null,
    meds_list: string | null,       // "midodrine, fludrocortisone"
    exercise_minutes: number | null,
  } | null,

  // Partner conflict tracking
  questionnaire_partner: {
    answeredBy: string,             // Partner UID
    answeredByName: string,
    answers: { [key: string]: string }, // Same keys as questionnaire
  } | null,

  // Member's final say (only exists if conflict was resolved)
  questionnaire_final: { [key: string]: string } | null,

  // Pre-fill source
  dailyLogUsed: boolean,           // Whether daily log pre-filled swipe cards
}
```

### patients/{memberUid}/dailyLogs/{YYYY-MM-DD}
```typescript
{
  date: string,                   // "YYYY-MM-DD"
  updatedAt: Timestamp,

  // Binary values (free tier)
  water: "low" | "high" | null,
  salt: "low" | "high" | null,
  sleep: "bad" | "good" | null,
  meds: "no" | "yes" | null,
  exercise: "no" | "yes" | null,

  // Additional trackers (premium, user selects which to show)
  caffeine: "no" | "yes" | null,
  alcohol: "no" | "yes" | null,
  bath_shower: "no" | "yes" | null,
  bath_shower_type: "bath" | "shower" | null,
  bath_shower_temp: "warm" | "hot" | null,
  stress: "low" | "high" | null,
  temperature_exposure: "no" | "yes" | null,
  menstrual: "no" | "yes" | null,
  mood_energy: "low" | "high" | null,
  standing_time: "low" | "high" | null,
  emotional_state: "calm" | "stressed" | null,
  meal_quality: "poor" | "good" | null,

  // Exact values (premium)
  water_oz: number | null,
  salt_mg: number | null,
  sleep_hours: number | null,
  caffeine_cups: number | null,
  exercise_minutes: number | null,
  mood_energy_rating: number | null,   // 1-5
  stress_rating: number | null,        // 1-5
}
```

### inviteCodes/{code}
```typescript
{
  code: string,                   // 6-char alphanumeric (e.g., "A7K9M2")
  memberUid: string,              // Who generated it
  memberName: string,
  createdAt: Timestamp,
  expiresAt: Timestamp,           // 24 hours from creation
  used: boolean,
  usedBy: string | null,          // Partner UID who redeemed it
}
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: is the user authenticated?
    function isAuth() {
      return request.auth != null;
    }

    // Helper: is this the document owner?
    function isOwner(uid) {
      return isAuth() && request.auth.uid == uid;
    }

    // Helper: is user a linked partner of this member?
    function isLinkedPartner(memberUid) {
      return isAuth()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && request.auth.uid in
           get(/databases/$(database)/documents/users/$(memberUid)).data.linkedPartners;
    }

    // Helper: is user the member OR a linked partner?
    function isMemberOrPartner(memberUid) {
      return isOwner(memberUid) || isLinkedPartner(memberUid);
    }

    // --- USERS ---
    match /users/{uid} {
      // Users can read their own doc
      allow read: if isOwner(uid);

      // Partners can read limited fields of linked members
      allow read: if isAuth()
        && uid in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.linkedMembers;

      // Members can read limited fields of linked partners
      allow read: if isAuth()
        && uid in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.linkedPartners;

      // Users can write their own doc
      allow write: if isOwner(uid);
    }

    // --- EPISODES ---
    match /patients/{memberUid}/episodes/{episodeId} {
      // Member or linked partner can read
      allow read: if isMemberOrPartner(memberUid);

      // Member or linked partner can create/update
      allow create, update: if isMemberOrPartner(memberUid);

      // Only member can delete
      allow delete: if isOwner(memberUid);
    }

    // --- DAILY LOGS ---
    match /patients/{memberUid}/dailyLogs/{date} {
      // Member or linked partner can read
      allow read: if isMemberOrPartner(memberUid);

      // Only member can write daily logs
      allow write: if isOwner(memberUid);
    }

    // --- INVITE CODES ---
    match /inviteCodes/{code} {
      // Anyone authenticated can read (to validate codes)
      allow read: if isAuth();

      // Only the member who owns it can create
      allow create: if isAuth()
        && request.resource.data.memberUid == request.auth.uid;

      // Anyone authenticated can update (to mark as used)
      allow update: if isAuth();

      // Only creator can delete
      allow delete: if isAuth()
        && resource.data.memberUid == request.auth.uid;
    }
  }
}
```

---

## Indexes Required

```
# Composite indexes for common queries:

# Episodes by timestamp (descending) for history view
patients/{memberUid}/episodes
  - timestamp DESC

# Episodes by timestamp for date range queries (PDF report)
patients/{memberUid}/episodes
  - timestamp ASC

# Daily logs by date (descending) for home screen
patients/{memberUid}/dailyLogs
  - date DESC

# Invite codes by expiry (for cleanup)
inviteCodes
  - expiresAt ASC
  - used ASC
```

---

## Firestore Cost Estimation

**Free tier:** 50K reads, 20K writes, 1 GiB storage/day

**Typical user usage per day:**
- Open app: ~5 reads (user doc, today's daily log, latest episodes, current episode count)
- Log episode: 1 write (episode) + 1 read (daily log for pre-fill) + 1 write (episode update with questionnaire)
- Update daily trackers: 1 write (daily log doc)
- View history: ~5 reads (episode list)
- Partner interaction: ~3 reads + 1 write

**Per user per day: ~12 reads, ~4 writes**

**Break-even on free tier:**
- 50K reads / 12 = ~4,000 daily active users
- 20K writes / 4 = ~5,000 daily active users

**Comfortable up to ~3,000 DAU on free tier.** Well beyond MVP needs.

---

## Data Cleanup / TTL

- **Invite codes:** Cloud Function or cron to delete expired codes (>24h old)
- **Push tokens:** Re-register on each app launch, remove stale tokens (>30 days)
- **Account deletion:** Delete user doc + all subcollections under patients/{uid} + unlink from partners
