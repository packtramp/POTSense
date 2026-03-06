import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ToggleChip,
  QuantityPicker,
  getFilteredToggles,
  QUANTITY_PICKERS,
  CARD_CATEGORIES,
} from '@/constants/swipeCards';
import { Colors } from '@/constants/Colors';

export type QuestionnaireResult = {
  toggles: Record<string, boolean>;
  quantities: Record<string, string>;
  notes: Record<string, string>; // text input values keyed by picker id
  cyclingValues: Record<string, string>; // cycling chip values (e.g. alcohol: "2", brain_fog: "Moderate")
};

type Props = {
  onComplete: (result: QuestionnaireResult) => void;
  onClose: () => void;
  disabledCategories?: string[];
  disabledCards?: string[];
  isPremium?: boolean;
};

export default function SwipeQuestionnaire({
  onComplete,
  onClose,
  disabledCategories = [],
  disabledCards = [],
  isPremium = false,
}: Props) {
  const [activeToggles, setActiveToggles] = useState<Set<string>>(new Set());
  const [cyclingValues, setCyclingValues] = useState<Record<string, number>>({}); // index into levels[]
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [textNotes, setTextNotes] = useState<Record<string, string>>({});
  const [popupChipId, setPopupChipId] = useState<string | null>(null); // which chip's follow-ups are showing

  const toggleChips = useMemo(
    () => getFilteredToggles(disabledCategories, disabledCards),
    [disabledCategories, disabledCards]
  );

  // Build lookup: chipId → its conditional pickers
  const conditionalPickersMap = useMemo(() => {
    const map = new Map<string, QuantityPicker[]>();
    for (const p of QUANTITY_PICKERS) {
      if (p.conditional) {
        if (!map.has(p.conditional)) map.set(p.conditional, []);
        map.get(p.conditional)!.push(p);
      }
    }
    return map;
  }, []);

  // Group toggles by category for display
  const togglesByCategory = useMemo(() => {
    const grouped: { category: string; label: string; emoji: string; chips: ToggleChip[] }[] = [];
    const catMap = new Map<string, ToggleChip[]>();
    for (const chip of toggleChips) {
      if (!catMap.has(chip.category)) catMap.set(chip.category, []);
      catMap.get(chip.category)!.push(chip);
    }
    for (const cat of CARD_CATEGORIES) {
      const chips = catMap.get(cat.key);
      if (chips && chips.length > 0) {
        grouped.push({ category: cat.key, label: cat.label, emoji: cat.emoji, chips });
      }
    }
    return grouped;
  }, [toggleChips]);

  // Get the pickers for the currently open popup
  const popupPickers = popupChipId ? (conditionalPickersMap.get(popupChipId) || []) : [];

  const handleToggle = (chip: ToggleChip) => {
    if (chip.levels) {
      // Cycling chip: advance to next level, wrap to 0 (off)
      setCyclingValues((prev) => {
        const currentIdx = prev[chip.id] ?? -1;
        const nextIdx = currentIdx + 1;
        if (nextIdx >= chip.levels!.length) {
          const next = { ...prev };
          delete next[chip.id];
          setActiveToggles((at) => { const n = new Set(at); n.delete(chip.id); return n; });
          return next;
        }
        setActiveToggles((at) => {
          const n = new Set(at);
          const val = chip.levels![nextIdx];
          if (val === '0' || val === 'None') n.delete(chip.id);
          else n.add(chip.id);
          return n;
        });
        return { ...prev, [chip.id]: nextIdx };
      });
    } else {
      // Simple on/off toggle
      const wasActive = activeToggles.has(chip.id);
      setActiveToggles((prev) => {
        const next = new Set(prev);
        if (next.has(chip.id)) next.delete(chip.id);
        else next.add(chip.id);
        return next;
      });

      // If toggling ON and this chip has conditional follow-ups, show popup
      if (!wasActive && conditionalPickersMap.has(chip.id)) {
        setPopupChipId(chip.id);
      }
    }
  };

  // Dismiss popup — if no selections were made, untoggle the chip
  const dismissPopup = () => {
    if (popupChipId) {
      const pickers = conditionalPickersMap.get(popupChipId) || [];
      const hasAnySelection = pickers.some(
        (p) => quantities[p.id] || (textNotes[p.id] && textNotes[p.id].trim().length > 0)
      );
      if (!hasAnySelection) {
        // No selections made — untoggle the chip
        setActiveToggles((prev) => {
          const next = new Set(prev);
          next.delete(popupChipId);
          return next;
        });
      }
    }
    setPopupChipId(null);
  };

  const handleQuantitySelect = (pickerId: string, value: string) => {
    setQuantities((prev) => {
      if (prev[pickerId] === value) {
        const next = { ...prev };
        delete next[pickerId];
        return next;
      }
      return { ...prev, [pickerId]: value };
    });
  };

  const handleFinish = () => {
    const toggleResult: Record<string, boolean> = {};
    const cyclingResult: Record<string, string> = {};
    for (const chip of toggleChips) {
      if (chip.levels && cyclingValues[chip.id] != null) {
        const val = chip.levels[cyclingValues[chip.id]];
        cyclingResult[chip.id] = val;
        toggleResult[chip.id] = val !== '0' && val !== 'None';
      } else {
        toggleResult[chip.id] = activeToggles.has(chip.id);
      }
    }
    onComplete({ toggles: toggleResult, quantities, notes: textNotes, cyclingValues: cyclingResult });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Quick Check</Text>
        <Pressable onPress={handleFinish} hitSlop={12}>
          <Text style={styles.skipText}>Skip All</Text>
        </Pressable>
      </View>

      <Text style={styles.phaseLabel}>Tap anything that applies today</Text>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {togglesByCategory.map((group) => (
          <View key={group.category} style={styles.categorySection}>
            <Text style={styles.categorySectionLabel}>
              {group.emoji} {group.label}
            </Text>
            <View style={styles.chipGrid}>
              {group.chips.map((chip) => {
                const isLocked = chip.premium && !isPremium;
                const isActive = activeToggles.has(chip.id);
                const isCycling = !!chip.levels;
                const cycleIdx = cyclingValues[chip.id];
                const cycleVal = isCycling && cycleIdx != null ? chip.levels![cycleIdx] : null;
                const hasFollowUp = conditionalPickersMap.has(chip.id);

                // Cycling chip colors by scale type
                const SEVERITY_COLORS = [Colors.green, '#FFC107', Colors.orange, Colors.orange];
                const INVERSE_COLORS = [Colors.orange, Colors.orange, '#FFC107', Colors.green];
                const cycleColor = isCycling && cycleIdx != null
                  ? (chip.colorScale === 'neutral' ? Colors.green
                    : chip.colorScale === 'blue' ? Colors.primary
                    : chip.colorScale === 'inverse' ? INVERSE_COLORS[Math.min(cycleIdx, 3)]
                    : SEVERITY_COLORS[Math.min(cycleIdx, 3)])
                  : null;

                return (
                  <Pressable
                    key={chip.id}
                    style={[
                      styles.toggleChip,
                      // Premium locked chips: grayed out
                      isLocked && styles.lockedChip,
                      // Regular toggles: colored by toggleColor
                      !isLocked && !isCycling && isActive && (
                        chip.toggleColor === 'bad' ? {
                          backgroundColor: Colors.orangeBg,
                          borderColor: Colors.orange,
                        } : chip.toggleColor === 'neutral' ? {
                          backgroundColor: Colors.primary + '20',
                          borderColor: Colors.primary,
                        } : styles.toggleChipActive
                      ),
                      // Cycling chips: colored border + tinted bg based on level
                      !isLocked && isCycling && cycleColor ? {
                        borderColor: cycleColor,
                        backgroundColor: cycleColor + '20',
                        borderStyle: 'solid' as any,
                      } : !isLocked && isCycling ? styles.cyclingChip : null,
                    ]}
                    onPress={() => !isLocked && handleToggle(chip)}
                    disabled={isLocked}
                  >
                    {isLocked && (
                      <Ionicons name="lock-closed" size={12} color={Colors.textMuted} style={{ marginRight: -2 }} />
                    )}
                    <Text style={[styles.chipEmoji, isLocked && { opacity: 0.4 }]}>{chip.emoji}</Text>
                    <Text
                      style={[
                        styles.chipLabel,
                        isLocked && styles.lockedChipLabel,
                        !isLocked && !isCycling && isActive && (
                          chip.toggleColor === 'bad' ? { color: Colors.orange, fontWeight: '600' as any }
                          : chip.toggleColor === 'neutral' ? { color: Colors.primary, fontWeight: '600' as any }
                          : styles.chipLabelActive
                        ),
                        !isLocked && isCycling && cycleColor ? { color: cycleColor, fontWeight: '600' as any } : null,
                      ]}
                      numberOfLines={1}
                    >
                      {isLocked
                      ? chip.label
                      : isCycling && cycleVal
                      ? `${chip.label}: ${cycleVal}`
                      : hasFollowUp && isActive && (() => {
                          const pickers = conditionalPickersMap.get(chip.id) || [];
                          const vals = pickers
                            .map((p) => quantities[p.id])
                            .filter(Boolean);
                          return vals.length > 0
                            ? `${chip.label}: ${vals.join(', ')}`
                            : chip.label;
                        })()
                      || chip.label}
                    </Text>
                    {/* Small dot indicator for chips with follow-ups */}
                    {!isLocked && hasFollowUp && isActive && (
                      <View style={styles.followUpDot} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.primaryButton} onPress={handleFinish}>
          <Text style={styles.primaryButtonText}>Done</Text>
          <Ionicons name="checkmark" size={20} color={Colors.text} />
        </Pressable>
      </View>

      {/* ═══════════════════════════════════════ */}
      {/* Follow-up popup (centered modal)       */}
      {/* ═══════════════════════════════════════ */}
      <Modal
        visible={popupChipId !== null}
        transparent
        animationType="fade"
        onRequestClose={dismissPopup}
      >
        <Pressable style={styles.modalOverlay} onPress={dismissPopup}>
          <Pressable style={styles.popupCard} onPress={(e) => e.stopPropagation()}>
            {/* Popup header */}
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Quick follow-up</Text>
              <Pressable onPress={dismissPopup} hitSlop={12}>
                <Ionicons name="close-circle" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>

            {/* Picker questions */}
            {popupPickers.map((picker) => (
              <View key={picker.id} style={styles.popupPickerBlock}>
                <Text style={styles.popupPickerLabel}>
                  {picker.emoji} {picker.label}
                </Text>
                <View style={styles.optionRow}>
                  {picker.options.map((opt) => {
                    const isSelected = quantities[picker.id] === opt;
                    return (
                      <Pressable
                        key={opt}
                        style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                        onPress={() => handleQuantitySelect(picker.id, opt)}
                      >
                        <Text
                          style={[styles.optionText, isSelected && styles.optionTextSelected]}
                          numberOfLines={1}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {picker.hasTextInput && (
                  <TextInput
                    style={styles.pickerTextInput}
                    placeholder={picker.textPlaceholder || 'Add details...'}
                    placeholderTextColor={Colors.textMuted}
                    value={textNotes[picker.id] || ''}
                    onChangeText={(text) => {
                      setTextNotes((prev) => ({ ...prev, [picker.id]: text }));
                      // Auto-select "Other" when user starts typing
                      if (text.length > 0 && picker.options.includes('Other')) {
                        setQuantities((prev) => ({ ...prev, [picker.id]: 'Other' }));
                      }
                    }}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                )}
              </View>
            ))}

            {/* Done button */}
            <Pressable
              style={styles.popupDoneButton}
              onPress={dismissPopup}
            >
              <Text style={styles.popupDoneText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  skipText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },

  phaseLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },

  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },

  categorySection: { marginTop: 16 },
  categorySectionLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  toggleChipActive: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green,
  },
  cyclingChip: {
    borderStyle: 'dashed' as any,
  },
  lockedChip: {
    opacity: 0.45,
    borderStyle: 'dashed' as any,
  },
  lockedChipLabel: { color: Colors.textMuted, fontSize: 13 },
  chipEmoji: { fontSize: 16 },
  chipLabel: { color: Colors.textSecondary, fontSize: 13 },
  chipLabelActive: { color: Colors.green, fontWeight: '600' },
  followUpDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginLeft: 2,
  },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  popupTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  popupPickerBlock: {
    marginBottom: 16,
    gap: 8,
  },
  popupPickerLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minWidth: 60,
    alignItems: 'center',
  },
  optionChipSelected: {
    backgroundColor: Colors.primaryLight + '25',
    borderColor: Colors.primary,
  },
  optionText: { color: Colors.textSecondary, fontSize: 14 },
  optionTextSelected: { color: Colors.primary, fontWeight: '700' },

  pickerTextInput: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    color: Colors.text,
    fontSize: 14,
    minHeight: 50,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  popupDoneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  popupDoneText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  // Bottom
  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: { color: Colors.text, fontSize: 17, fontWeight: '700' },
});
