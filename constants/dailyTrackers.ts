// ═══════════════════════════════════════════════════════════════
// POTSense Daily Trackers
// Tap-to-cycle cards on Home screen
// Free tier: 5 core trackers. Premium: 10+ additional.
// ═══════════════════════════════════════════════════════════════

export type DailyTracker = {
  key: string;
  emoji: string;
  label: string;
  levels: string[];       // First level is always '--' (unset)
  premium: boolean;       // true = requires premium subscription
  category: 'essentials' | 'intake' | 'body' | 'activity' | 'mental';
};

// ── Free Tier (always available) ──
const FREE_TRACKERS: DailyTracker[] = [
  { key: 'water', emoji: '💧', label: 'Water', levels: ['--', 'Low', 'Med', 'High'], premium: false, category: 'essentials' },
  { key: 'salt', emoji: '🧂', label: 'Salt', levels: ['--', 'Low', 'Med', 'High'], premium: false, category: 'essentials' },
  { key: 'sleep', emoji: '😴', label: 'Sleep', levels: ['--', 'Bad', 'OK', 'Good'], premium: false, category: 'essentials' },
  { key: 'stress', emoji: '😰', label: 'Stress', levels: ['--', 'Low', 'Med', 'High'], premium: false, category: 'essentials' },
  { key: 'exercise', emoji: '🏃', label: 'Exercise', levels: ['--', 'No', 'Light', 'Hard'], premium: false, category: 'essentials' },
];

// ── Premium Tier (subscription required) ──
const PREMIUM_TRACKERS: DailyTracker[] = [
  // Intake
  { key: 'electrolytes', emoji: '⚡', label: 'Electrolytes', levels: ['--', 'No', 'Yes'], premium: true, category: 'intake' },
  { key: 'caffeine', emoji: '☕', label: 'Caffeine', levels: ['--', '0', '1', '2', '3+'], premium: true, category: 'intake' },
  { key: 'alcohol', emoji: '🍷', label: 'Alcohol', levels: ['--', '0', '1', '2+'], premium: true, category: 'intake' },
  { key: 'meal_quality', emoji: '🥗', label: 'Meals', levels: ['--', 'Poor', 'OK', 'Good'], premium: true, category: 'intake' },

  // Body
  { key: 'compression', emoji: '🧦', label: 'Compression', levels: ['--', 'No', 'Yes'], premium: true, category: 'body' },
  { key: 'menstrual', emoji: '🩸', label: 'Period', levels: ['--', 'No', 'Yes'], premium: true, category: 'body' },
  { key: 'energy', emoji: '🔋', label: 'Energy', levels: ['--', 'Low', 'Med', 'High'], premium: true, category: 'body' },
  { key: 'pain', emoji: '🩹', label: 'Pain', levels: ['--', 'None', 'Mild', 'Bad'], premium: true, category: 'body' },

  // Activity
  { key: 'steps', emoji: '👟', label: 'Steps', levels: ['--', 'Low', 'Med', 'High'], premium: true, category: 'activity' },
  { key: 'standing_time', emoji: '🧍', label: 'Standing', levels: ['--', 'Short', 'Med', 'Long'], premium: true, category: 'activity' },

  // Mental
  { key: 'mood', emoji: '😊', label: 'Mood', levels: ['--', 'Bad', 'OK', 'Good'], premium: true, category: 'mental' },
  { key: 'brain_fog', emoji: '🧠', label: 'Brain Fog', levels: ['--', 'None', 'Mild', 'Bad'], premium: true, category: 'mental' },
  { key: 'meds', emoji: '💊', label: 'Meds', levels: ['--', 'No', 'Yes'], premium: true, category: 'body' },
];

// ── All trackers combined ──
export const ALL_DAILY_TRACKERS: DailyTracker[] = [...FREE_TRACKERS, ...PREMIUM_TRACKERS];

// ── Category labels for settings grouping ──
export const TRACKER_CATEGORIES = [
  { key: 'essentials', label: 'Essentials', emoji: '⭐' },
  { key: 'intake', label: 'Intake & Diet', emoji: '🍽️' },
  { key: 'body', label: 'Body & Health', emoji: '💪' },
  { key: 'activity', label: 'Activity', emoji: '🏃' },
  { key: 'mental', label: 'Mental & Mood', emoji: '🧠' },
];

// ── Helpers ──

/** Get only enabled trackers based on user's disabled list + premium status */
export function getEnabledTrackers(
  disabledKeys: string[] = [],
  isPremium: boolean = false,
): DailyTracker[] {
  return ALL_DAILY_TRACKERS.filter((t) => {
    if (t.premium && !isPremium) return false;
    if (disabledKeys.includes(t.key)) return false;
    return true;
  });
}

/** Get all trackers in a category */
export function getTrackersInCategory(category: string): DailyTracker[] {
  return ALL_DAILY_TRACKERS.filter((t) => t.category === category);
}

/** Default enabled keys (free tier) */
export const DEFAULT_TRACKER_KEYS = FREE_TRACKERS.map((t) => t.key);
