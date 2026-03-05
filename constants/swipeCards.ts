// ═══════════════════════════════════════════════════════════════
// POTSense Questionnaire Data
// Group 1: Toggle Chips (tap = yes, default = no)
// Group 2: Quantity Pickers (always-show + conditional)
// ═══════════════════════════════════════════════════════════════

export type ToggleChip = {
  id: string;
  label: string;
  emoji: string;
  category: string;
};

export type QuantityPicker = {
  id: string;
  label: string;
  emoji: string;
  category: string;
  options: string[];
  conditional?: string; // Group 1 chip ID that must be ON for this to appear
};

// ═══════════════════════════════════════════════════════════════
// GROUP 1 — Toggle Chips (yes/no, tap to toggle)
// ═══════════════════════════════════════════════════════════════

export const TOGGLE_CHIPS: ToggleChip[] = [
  // Hydration
  { id: 'salt', label: 'Extra Salt', emoji: '🧂', category: 'hydration' },

  // Diet
  { id: 'ate', label: 'Eaten Recently', emoji: '🍽️', category: 'diet' },
  { id: 'alcohol', label: 'Alcohol', emoji: '🍷', category: 'diet' },
  { id: 'carbs', label: 'Heavy Carbs', emoji: '🍞', category: 'diet' },
  { id: 'gluten', label: 'Gluten', emoji: '🌾', category: 'diet' },
  { id: 'dairy', label: 'Dairy', emoji: '🥛', category: 'diet' },
  { id: 'histamine', label: 'High-Histamine', emoji: '⚠️', category: 'diet' },

  // Sleep
  { id: 'nap', label: 'Napped', emoji: '💤', category: 'sleep' },
  { id: 'head_elevated', label: 'Head Elevated', emoji: '🛏️', category: 'sleep' },

  // Activity
  { id: 'gotup_fast', label: 'Got Up Fast', emoji: '⬆️', category: 'activity' },
  { id: 'position_change', label: 'Position Change', emoji: '🔄', category: 'activity' },
  { id: 'bending', label: 'Bending Over', emoji: '🏋️', category: 'activity' },
  { id: 'bath', label: 'Bath/Shower', emoji: '🛁', category: 'activity' },
  { id: 'stairs', label: 'Stairs', emoji: '🪜', category: 'activity' },
  { id: 'driving', label: 'Long Drive', emoji: '🚗', category: 'activity' },
  { id: 'sedentary', label: 'Sitting All Day', emoji: '🛋️', category: 'activity' },
  { id: 'standing', label: 'Long Standing', emoji: '🧍', category: 'activity' },

  // Environment
  { id: 'hot', label: 'Been in Heat', emoji: '🔥', category: 'environment' },
  { id: 'temp_change', label: 'Temp Change', emoji: '🌡️', category: 'environment' },
  { id: 'humidity', label: 'High Humidity', emoji: '💦', category: 'environment' },
  { id: 'sun', label: 'Lots of Sun', emoji: '☀️', category: 'environment' },
  { id: 'altitude', label: 'Altitude Change', emoji: '⛰️', category: 'environment' },
  { id: 'crowded', label: 'Crowded Place', emoji: '👥', category: 'environment' },
  { id: 'air_quality', label: 'Bad Air Quality', emoji: '🌫️', category: 'environment' },

  // Health
  { id: 'new_med', label: 'New Medication', emoji: '🆕', category: 'health' },
  { id: 'compression', label: 'Compression', emoji: '🧦', category: 'health' },
  { id: 'menstrual', label: 'On Period', emoji: '🩸', category: 'health' },
  { id: 'illness', label: 'Feeling Sick', emoji: '🤒', category: 'health' },
  { id: 'blood_pooling', label: 'Blood Pooling', emoji: '🦵', category: 'health' },
  { id: 'gi_issues', label: 'GI Issues', emoji: '🤢', category: 'health' },
  { id: 'allergic_reaction', label: 'Allergic Reaction', emoji: '🤧', category: 'health' },

  // Lifestyle
  { id: 'screen_time', label: 'Screen Time', emoji: '📱', category: 'lifestyle' },
  { id: 'tight_clothing', label: 'Tight Clothing', emoji: '👔', category: 'lifestyle' },
  { id: 'social_event', label: 'Social Event', emoji: '🎉', category: 'lifestyle' },
  { id: 'travel', label: 'Traveled', emoji: '✈️', category: 'lifestyle' },
  { id: 'shopping', label: 'Shopping/Errands', emoji: '🛒', category: 'lifestyle' },
  { id: 'cooking', label: 'Stood Cooking', emoji: '👨‍🍳', category: 'lifestyle' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP 2 — Quantity Pickers
// Always-show pickers appear for everyone.
// Conditional pickers only appear if their Group 1 chip is ON.
// ═══════════════════════════════════════════════════════════════

export const QUANTITY_PICKERS: QuantityPicker[] = [
  // ---- Always Show ----
  { id: 'water', label: 'Water (cups)', emoji: '💧', category: 'hydration', options: ['0', '1-2', '3-4', '5-6', '7+'] },
  { id: 'electrolytes', label: 'Electrolytes', emoji: '⚡', category: 'hydration', options: ['None', 'LMNT', 'Liquid IV', 'Nuun', 'Other'] },
  { id: 'caffeine_cups', label: 'Caffeine (cups)', emoji: '☕', category: 'diet', options: ['0', '1', '2', '3', '4+'] },
  { id: 'caffeine_type', label: 'Caffeine Type', emoji: '☕', category: 'diet', options: ['Coffee', 'Tea', 'Energy Drink', 'Soda'] },
  { id: 'sugary_drinks', label: 'Sugary Drinks', emoji: '🧃', category: 'diet', options: ['0', '1', '2', '3', '4+'] },
  { id: 'sleep_quality', label: 'Sleep Quality', emoji: '😴', category: 'sleep', options: ['Bad', 'OK', 'Good'] },
  { id: 'sleep_hours', label: 'Sleep Hours', emoji: '🕐', category: 'sleep', options: ['< 4 hrs', '4-5 hrs', '6-7 hrs', '8+ hrs'] },
  { id: 'exercise', label: 'Exercise', emoji: '🏃', category: 'activity', options: ['None', 'Light', 'Moderate', 'Intense'] },
  { id: 'stress', label: 'Stress Level', emoji: '😰', category: 'mental', options: ['None', 'A little', 'Moderate', 'Very'] },
  { id: 'brain_fog', label: 'Brain Fog', emoji: '🧠', category: 'mental', options: ['None', 'Mild', 'Moderate', 'Bad'] },
  { id: 'pain', label: 'Pain Level', emoji: '🩹', category: 'health', options: ['None', 'Mild', 'Moderate', 'Severe'] },

  // ---- Conditional (triggered by Group 1 toggles) ----
  { id: 'alcohol_qty', label: 'Drinks', emoji: '🍷', category: 'diet', options: ['1', '2', '3+'], conditional: 'alcohol' },
  { id: 'bath_type', label: 'Bath or Shower?', emoji: '🚿', category: 'activity', options: ['Bath', 'Shower'], conditional: 'bath' },
  { id: 'bath_temp', label: 'Water Temp', emoji: '🌡️', category: 'activity', options: ['Hot', 'Warm', 'Cool'], conditional: 'bath' },
  { id: 'period_day', label: 'Period Day', emoji: '🩸', category: 'health', options: ['Day 1-2', 'Day 3-4', 'Day 5+'], conditional: 'menstrual' },
  { id: 'illness_type', label: 'Illness Type', emoji: '🤒', category: 'health', options: ['Cold/Flu', 'GI', 'Other'], conditional: 'illness' },
  { id: 'social_duration', label: 'How Long?', emoji: '🎉', category: 'lifestyle', options: ['< 1 hr', '1-2 hrs', '2+ hrs'], conditional: 'social_event' },
  { id: 'travel_type', label: 'Travel Type', emoji: '✈️', category: 'lifestyle', options: ['Short', 'Long drive', 'Flight'], conditional: 'travel' },
  { id: 'standing_duration', label: 'How Long?', emoji: '🧍', category: 'activity', options: ['10 min', '20 min', '30+ min'], conditional: 'standing' },
];

// ═══════════════════════════════════════════════════════════════
// Categories for settings
// ═══════════════════════════════════════════════════════════════

export const CARD_CATEGORIES = [
  { key: 'hydration', label: 'Hydration & Electrolytes', emoji: '💧' },
  { key: 'diet', label: 'Diet & Food', emoji: '🍽️' },
  { key: 'sleep', label: 'Sleep', emoji: '😴' },
  { key: 'activity', label: 'Activity & Position', emoji: '🏃' },
  { key: 'environment', label: 'Environment', emoji: '🌡️' },
  { key: 'health', label: 'Health & Medications', emoji: '💊' },
  { key: 'mental', label: 'Mental & Emotional', emoji: '🧠' },
  { key: 'lifestyle', label: 'Lifestyle & Timing', emoji: '📱' },
];

// ═══════════════════════════════════════════════════════════════
// Filtering helpers
// ═══════════════════════════════════════════════════════════════

export function getFilteredToggles(
  disabledCategories: string[] = [],
  disabledCards: string[] = [],
): ToggleChip[] {
  return TOGGLE_CHIPS.filter(
    (c) => !disabledCategories.includes(c.category) && !disabledCards.includes(c.id)
  );
}

export function getFilteredPickers(
  disabledCategories: string[] = [],
  disabledCards: string[] = [],
  activeToggles: Set<string> = new Set(),
): QuantityPicker[] {
  return QUANTITY_PICKERS.filter((p) => {
    if (disabledCategories.includes(p.category)) return false;
    if (disabledCards.includes(p.id)) return false;
    // Conditional pickers only show if their trigger is active
    if (p.conditional && !activeToggles.has(p.conditional)) return false;
    return true;
  });
}

// For settings page — get all items (toggles + pickers) in a category
export function getAllItemsInCategory(catKey: string): { id: string; label: string; emoji: string }[] {
  const toggles = TOGGLE_CHIPS.filter((c) => c.category === catKey)
    .map((c) => ({ id: c.id, label: c.label, emoji: c.emoji }));
  const pickers = QUANTITY_PICKERS.filter((p) => p.category === catKey && !p.conditional)
    .map((p) => ({ id: p.id, label: p.label, emoji: p.emoji }));
  return [...toggles, ...pickers];
}

export function getTotalEnabledCount(
  disabledCategories: string[] = [],
  disabledCards: string[] = [],
): number {
  const toggleCount = TOGGLE_CHIPS.filter(
    (c) => !disabledCategories.includes(c.category) && !disabledCards.includes(c.id)
  ).length;
  const pickerCount = QUANTITY_PICKERS.filter(
    (p) => !p.conditional && !disabledCategories.includes(p.category) && !disabledCards.includes(p.id)
  ).length;
  return toggleCount + pickerCount;
}
