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
  levels?: string[]; // If set, chip cycles through these values on tap instead of on/off
  colorScale?: 'severity' | 'inverse' | 'neutral' | 'blue'; // severity = green→yellow→orange, inverse = orange→yellow→green, neutral = always green, blue = brand blue throughout
  toggleColor?: 'good' | 'bad' | 'neutral'; // For binary chips: good=green, bad=orange, neutral=blue. Default=green (legacy)
  premium?: boolean; // true = requires premium subscription (grayed out for free users)
};

export type QuantityPicker = {
  id: string;
  label: string;
  emoji: string;
  category: string;
  options: string[];
  conditional?: string; // Group 1 chip ID that must be ON for this to appear
  hasTextInput?: boolean; // show a text input for notes/details
  textPlaceholder?: string;
};

// ═══════════════════════════════════════════════════════════════
// GROUP 1 — Toggle Chips (yes/no, tap to toggle)
// ═══════════════════════════════════════════════════════════════

export const TOGGLE_CHIPS: ToggleChip[] = [
  // Hydration — water & salt are FREE
  { id: 'salt', label: 'Extra Salt', emoji: '🧂', category: 'hydration', toggleColor: 'good' },
  { id: 'water', label: 'Water (cups)', emoji: '💧', category: 'hydration', levels: ['0', '1-2', '3-4', '5-6', '7+'], colorScale: 'inverse' },
  { id: 'electrolytes', label: 'Electrolytes', emoji: '⚡', category: 'hydration', levels: ['None', 'LMNT', 'Liquid IV', 'Nuun', 'Other'], colorScale: 'neutral', premium: true },

  // Diet — all PREMIUM
  { id: 'ate', label: 'Eaten Recently', emoji: '🍽️', category: 'diet', toggleColor: 'good', premium: true },
  { id: 'alcohol', label: 'Alcohol', emoji: '🍷', category: 'diet', levels: ['0', '1', '2', '3+'], premium: true },
  { id: 'caffeine_cups', label: 'Caffeine', emoji: '☕', category: 'diet', levels: ['0', '1', '2', '3+'], premium: true },
  { id: 'caffeine_type', label: 'Caffeine Type', emoji: '☕', category: 'diet', levels: ['Coffee', 'Tea', 'Energy Drink', 'Soda'], colorScale: 'blue', premium: true },
  { id: 'sugary_drinks', label: 'Sugary Drinks', emoji: '🧃', category: 'diet', levels: ['0', '1', '2', '3+'], premium: true },
  { id: 'carbs', label: 'Heavy Carbs', emoji: '🍞', category: 'diet', toggleColor: 'neutral', premium: true },
  { id: 'gluten', label: 'Gluten', emoji: '🌾', category: 'diet', toggleColor: 'neutral', premium: true },
  { id: 'dairy', label: 'Dairy', emoji: '🥛', category: 'diet', toggleColor: 'neutral', premium: true },
  { id: 'histamine', label: 'High-Histamine', emoji: '⚠️', category: 'diet', toggleColor: 'bad', premium: true },

  // Sleep — bad_sleep is FREE
  { id: 'bad_sleep', label: 'Bad Sleep', emoji: '😴', category: 'sleep', toggleColor: 'bad' },
  { id: 'nap', label: 'Napped', emoji: '💤', category: 'sleep', toggleColor: 'good', premium: true },

  // Activity — exercise is FREE
  { id: 'exercise', label: 'Exercise', emoji: '🏃', category: 'activity', levels: ['None', 'Light', 'Moderate', 'Intense'], colorScale: 'blue' },
  { id: 'gotup_fast', label: 'Got Up Fast', emoji: '⬆️', category: 'activity', toggleColor: 'neutral', premium: true },
  { id: 'position_change', label: 'Position Change', emoji: '🔄', category: 'activity', toggleColor: 'neutral', premium: true },
  { id: 'bending', label: 'Bending Over', emoji: '🏋️', category: 'activity', toggleColor: 'neutral', premium: true },
  { id: 'bath', label: 'Bath/Shower', emoji: '🛁', category: 'activity', toggleColor: 'neutral', premium: true },
  { id: 'stairs', label: 'Stairs', emoji: '🪜', category: 'activity', toggleColor: 'neutral', premium: true },
  { id: 'driving', label: 'Long Drive', emoji: '🚗', category: 'activity', toggleColor: 'neutral', premium: true },
  { id: 'sedentary', label: 'Sitting All Day', emoji: '🛋️', category: 'activity', toggleColor: 'bad', premium: true },
  { id: 'standing', label: 'Long Standing', emoji: '🧍', category: 'activity', toggleColor: 'neutral', premium: true },

  // Environment — all PREMIUM
  { id: 'hot', label: 'Been in Heat', emoji: '🔥', category: 'environment', toggleColor: 'neutral', premium: true },
  { id: 'temp_change', label: 'Temp Change', emoji: '🌡️', category: 'environment', toggleColor: 'neutral', premium: true },
  { id: 'humidity', label: 'High Humidity', emoji: '💦', category: 'environment', toggleColor: 'neutral', premium: true },
  { id: 'sun', label: 'Lots of Sun', emoji: '☀️', category: 'environment', toggleColor: 'neutral', premium: true },
  { id: 'altitude', label: 'Altitude Change', emoji: '⛰️', category: 'environment', toggleColor: 'neutral', premium: true },
  { id: 'crowded', label: 'Crowded Place', emoji: '👥', category: 'environment', toggleColor: 'neutral', premium: true },
  { id: 'air_quality', label: 'Bad Air Quality', emoji: '🌫️', category: 'environment', toggleColor: 'bad', premium: true },
  { id: 'loud_noise', label: 'Loud Noise', emoji: '🔊', category: 'environment', toggleColor: 'bad', premium: true },

  // Health — all PREMIUM
  { id: 'pain', label: 'Pain Level', emoji: '🩹', category: 'health', levels: ['Mild', 'Moderate', 'Severe'], premium: true },
  { id: 'new_med', label: 'New Medication', emoji: '🆕', category: 'health', toggleColor: 'neutral', premium: true },
  { id: 'compression', label: 'Compression', emoji: '🧦', category: 'health', toggleColor: 'good', premium: true },
  { id: 'menstrual', label: 'On Period', emoji: '🩸', category: 'health', toggleColor: 'bad', premium: true },
  { id: 'illness', label: 'Feeling Sick', emoji: '🤒', category: 'health', toggleColor: 'bad', premium: true },
  { id: 'blood_pooling', label: 'Blood Pooling', emoji: '🦵', category: 'health', toggleColor: 'bad', premium: true },
  { id: 'gi_issues', label: 'GI Issues', emoji: '🤢', category: 'health', toggleColor: 'bad', premium: true },
  { id: 'allergic_reaction', label: 'Allergic Reaction', emoji: '🤧', category: 'health', toggleColor: 'bad', premium: true },

  // Mental — stressed is FREE
  { id: 'stressed', label: 'Stressed', emoji: '😰', category: 'mental', levels: ['Mild', 'Moderate', 'High'] },
  { id: 'brain_fog', label: 'Brain Fog', emoji: '🧠', category: 'mental', levels: ['Mild', 'Moderate', 'Bad'], premium: true },

  // Lifestyle — all PREMIUM
  { id: 'screen_time', label: 'Screen Time', emoji: '📱', category: 'lifestyle', toggleColor: 'neutral', premium: true },
  { id: 'tight_clothing', label: 'Tight Clothing', emoji: '👔', category: 'lifestyle', toggleColor: 'bad', premium: true },
  { id: 'social_event', label: 'Social Event', emoji: '🎉', category: 'lifestyle', toggleColor: 'neutral', premium: true },
  { id: 'travel', label: 'Traveled', emoji: '✈️', category: 'lifestyle', toggleColor: 'neutral', premium: true },
  { id: 'shopping', label: 'Shopping/Errands', emoji: '🛒', category: 'lifestyle', toggleColor: 'neutral', premium: true },
  { id: 'cooking', label: 'Stood Cooking', emoji: '👨‍🍳', category: 'lifestyle', toggleColor: 'neutral', premium: true },
];

// ═══════════════════════════════════════════════════════════════
// GROUP 2 — Quantity Pickers (all conditional)
// Only appear if their Group 1 chip is ON.
// ═══════════════════════════════════════════════════════════════

export const QUANTITY_PICKERS: QuantityPicker[] = [
  // ---- All conditional (triggered by Group 1 toggles) ----
  { id: 'stress_notes', label: 'What\'s Causing Stress?', emoji: '😰', category: 'mental', options: ['Work', 'Health', 'Family', 'Other'], conditional: 'stressed', hasTextInput: true, textPlaceholder: 'Details...' },
  { id: 'sleep_hours', label: 'How Many Hours?', emoji: '🕐', category: 'sleep', options: ['< 4 hrs', '4-5 hrs', '6-7 hrs'], conditional: 'bad_sleep' },
  { id: 'head_elevated', label: 'Head Elevated?', emoji: '🛏️', category: 'sleep', options: ['Yes', 'No'], conditional: 'bad_sleep' },
  { id: 'restless_legs', label: 'Restless Legs?', emoji: '🦵', category: 'sleep', options: ['Yes', 'No'], conditional: 'bad_sleep' },
  { id: 'bath_type', label: 'Bath or Shower?', emoji: '🚿', category: 'activity', options: ['Bath', 'Shower'], conditional: 'bath' },
  { id: 'bath_temp', label: 'Water Temp', emoji: '🌡️', category: 'activity', options: ['Hot', 'Warm', 'Cool'], conditional: 'bath' },
  { id: 'period_day', label: 'Period Day', emoji: '🩸', category: 'health', options: ['Day 1-2', 'Day 3-4', 'Day 5+'], conditional: 'menstrual' },
  { id: 'illness_type', label: 'Illness Type', emoji: '🤒', category: 'health', options: ['Cold/Flu', 'GI', 'Other'], conditional: 'illness', hasTextInput: true, textPlaceholder: 'Details...' },
  { id: 'social_duration', label: 'How Long?', emoji: '🎉', category: 'lifestyle', options: ['< 1 hr', '1-2 hrs', '2+ hrs'], conditional: 'social_event' },
  { id: 'travel_type', label: 'Travel Type', emoji: '✈️', category: 'lifestyle', options: ['< 1 hr', '1-3 hrs', '3+ hrs', 'Flight'], conditional: 'travel' },
  { id: 'standing_duration', label: 'How Long?', emoji: '🧍', category: 'activity', options: ['10 min', '20 min', '30+ min'], conditional: 'standing' },
  { id: 'new_med_name', label: 'What Medication?', emoji: '💊', category: 'health', options: [], conditional: 'new_med', hasTextInput: true, textPlaceholder: 'Medication name...' },
  { id: 'histamine_food', label: 'What Did You Eat?', emoji: '⚠️', category: 'diet', options: ['Aged Cheese', 'Fermented Food', 'Cured Meat', 'Wine/Beer', 'Other'], conditional: 'histamine', hasTextInput: true, textPlaceholder: 'Details...' },
  { id: 'allergy_detail', label: 'What Happened?', emoji: '🤧', category: 'health', options: ['Food', 'Pollen', 'Pet', 'Medication', 'Other'], conditional: 'allergic_reaction', hasTextInput: true, textPlaceholder: 'Details...' },
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
export function getAllItemsInCategory(catKey: string): { id: string; label: string; emoji: string; premium?: boolean }[] {
  const toggles = TOGGLE_CHIPS.filter((c) => c.category === catKey)
    .map((c) => ({ id: c.id, label: c.label, emoji: c.emoji, premium: c.premium }));
  const pickers = QUANTITY_PICKERS.filter((p) => p.category === catKey && !p.conditional)
    .map((p) => ({ id: p.id, label: p.label, emoji: p.emoji, premium: p.premium }));
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
