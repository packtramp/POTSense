# POTSense - Premium Logic & RevenueCat Integration

## Products

| Product ID | Price | Billing | Entitlement |
|-----------|-------|---------|-------------|
| `potsense_monthly` | $4.99/mo | Monthly auto-renew | `premium` |
| `potsense_annual` | $39.99/yr | Annual auto-renew | `premium` |

No free trial. No lifetime. Generous free tier instead.

---

## Feature Gating Matrix

| Feature | Free | Premium | Gate Method |
|---------|------|---------|------------|
| **Episode logging** | ✅ Unlimited | ✅ Unlimited | None |
| **Swipe cards (binary)** | ✅ 10 cards | ✅ All 16+ | Card count check |
| **Swipe branches** | ❌ Grayed | ✅ Active | `PremiumGate` |
| **Exact values on swipes** | ❌ Grayed | ✅ Active | `PremiumGate` |
| **Daily trackers** | ✅ 5 defaults (binary) | ✅ 15+ (exact values) | Tracker count + `PremiumGate` |
| **Tracker customization** | ❌ | ✅ | Settings gate |
| **Question customization** | ❌ | ✅ Reorder/toggle | Settings gate |
| **History** | ✅ 30 days | ✅ Unlimited | Query filter |
| **Partner accounts** | ❌ | ✅ | Invite code gate |
| **Trends/charts** | ❌ Blurred teaser | ✅ Full | Tab overlay |
| **Doctor PDF report** | ❌ | ✅ | Settings gate |
| **CSV export** | ❌ | ✅ | Settings gate |
| **JSON export** | ✅ | ✅ | None (GDPR) |
| **Pressure alerts** | ✅ Default threshold | ✅ Custom threshold | None / Settings gate |
| **News feed** | ✅ | ✅ | None |
| **Suggest a question** | ❌ | ✅ | Settings gate |
| **Account deletion** | ✅ | ✅ | None (GDPR) |

---

## Implementation Pattern

### RevenueCat Setup
```
1. Create RevenueCat project
2. Configure App Store Connect product (potsense_monthly)
3. Configure Google Play Console product (potsense_annual)
4. Set up entitlement: "premium"
5. Add products to offering: "default"
6. Install: react-native-purchases + expo config plugin
7. Set up webhook: RevenueCat → Vercel API → update Firestore
```

### Client-Side Hook: usePremium()
```
Location: hooks/usePremium.ts

Returns:
  isPremium: boolean     — Does user have active premium entitlement?
  isLoading: boolean     — Still checking?
  plan: string | null    — "monthly" | "annual" | null
  expiry: Date | null    — When does it expire?

Sources (checked in order):
  1. RevenueCat SDK (primary, real-time)
  2. Firestore user doc premiumStatus (fallback, for offline)

On app launch:
  - Check RevenueCat entitlements
  - Sync to Firestore user doc (premiumStatus, premiumPlan, premiumExpiry)
  - If offline: use cached Firestore value
```

### PremiumGate Component
```
Location: components/PremiumGate.tsx

Usage:
  <PremiumGate
    fallback={<UpgradeTeaser />}   // What free users see
  >
    <PremiumContent />              // What premium users see
  </PremiumGate>

Behavior:
  - isPremium? → render children
  - !isPremium? → render fallback (grayed out content + upgrade button)
  - Upgrade button → opens Paywall modal
```

### History Query Filter
```
Free: query episodes WHERE timestamp > (now - 30 days)
Premium: query all episodes (no date filter)

Note: ALL data stays in Firestore regardless of plan.
Free users just can't SEE past 30 days.
If they upgrade, all history appears instantly.
```

### Partner Premium Inheritance
```
When partner opens app:
  1. Check own premiumStatus → if true, premium
  2. If not, check linked member's premiumStatus
  3. If member is premium → partner inherits premium
  4. Cached on partner's user doc as: inheritedPremium: true

RevenueCat webhook updates member doc →
  Cloud function propagates to partner docs
```

---

## Paywall Triggers (where upgrade prompts appear)

| Location | Trigger | UX |
|----------|---------|-----|
| Swipe card 11+ | Free user finishes card 10 | Grayed card list + upgrade button |
| Exact value field | Free user taps grayed field | Bottom sheet: "Upgrade for exact tracking" |
| Branch follow-up | Free user sees grayed branch | Same card, grayed area |
| History > 30 days | Free user scrolls past 30 days | "Upgrade for full history" banner |
| Trends tab | Free user taps Trends | Blurred overlay + upgrade CTA |
| Settings → Partners | Free user taps Partners | Lock icon → paywall modal |
| Settings → PDF | Free user taps Export PDF | Lock icon → paywall modal |
| Settings → CSV | Free user taps Export CSV | Lock icon → paywall modal |
| Settings → Trackers | Free user taps customize | Lock icon → paywall modal |
| Settings → Questions | Free user taps customize | Lock icon → paywall modal |
| Settings → Suggest Q | Free user taps suggest | Lock icon → paywall modal |

**Rule:** Never block core functionality. Always show WHAT they're missing (teaser) before asking them to pay.

---

## RevenueCat Webhook → Vercel API

```
POST /api/revenucat-webhook

RevenueCat sends events:
  - INITIAL_PURCHASE → set premiumStatus: true
  - RENEWAL → update premiumExpiry
  - CANCELLATION → set premiumStatus: false (at period end)
  - EXPIRATION → set premiumStatus: false
  - BILLING_ISSUE → flag for retry

Webhook handler:
  1. Verify webhook signature
  2. Extract app_user_id (= Firebase UID)
  3. Update Firestore user doc
  4. If member: propagate to linked partner docs
```

---

## Analytics (via RevenueCat dashboard)

Track:
- Conversion rate (free → premium)
- Which paywall trigger converts best
- Churn rate by plan type
- Revenue per user (ARPU)
- Trial-to-paid conversion (if we add trials later)
