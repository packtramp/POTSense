# POTSense Test List

## Manual Tests (User Verification)
Tests that require Roby to click through the app on potsense.org.

### Feedback Pipeline
- [ ] Submit bug report → GitHub Issue created with bug + user-feedback labels
- [ ] Submit bug report → Email received at robdorsett@gmail.com from onboarding@resend.dev
- [ ] Submit feature request → GitHub Issue created with enhancement + user-feedback labels
- [ ] Page chips wrap on mobile (don't scroll horizontally)

### Premium Gating
- [ ] Free user: JSON export redirects to subscription page
- [ ] Free user: Lock icons on premium trackers/triggers
- [ ] Premium user: All trackers/triggers unlocked
- [ ] Partner of premium patient: Sees all premium features (no locks)

### Daily Trackers
- [ ] Max 5 trackers per row on home screen
- [ ] Tracker grid wraps properly with many trackers enabled

### Reminder Settings
- [ ] Time picker shows hour/minute/AM-PM columns
- [ ] Selected time saves and persists on reload

### Episode Logging
- [ ] Log episode captures weather/pressure automatically
- [ ] Episode appears in history

## Automated Tests
Framework: TBD — need to set up Jest or Vitest

No test framework is currently installed. `package.json` has no test scripts or test dependencies (no jest, vitest, @testing-library, etc.). When ready to add automated tests, install a framework and update this section.

## Test Run Log
| Date | Tester | Tests Run | Pass | Fail | Notes |
|------|--------|-----------|------|------|-------|
