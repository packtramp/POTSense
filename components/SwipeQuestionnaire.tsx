import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ToggleChip,
  QuantityPicker,
  getFilteredToggles,
  getFilteredPickers,
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
};

const PICKERS_PER_PAGE = 4;

export default function SwipeQuestionnaire({
  onComplete,
  onClose,
  disabledCategories = [],
  disabledCards = [],
}: Props) {
  const [phase, setPhase] = useState<'toggles' | 'quantities'>('toggles');
  const [activeToggles, setActiveToggles] = useState<Set<string>>(new Set());
  const [cyclingValues, setCyclingValues] = useState<Record<string, number>>({}); // index into levels[]
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [textNotes, setTextNotes] = useState<Record<string, string>>({});
  const [quantityPage, setQuantityPage] = useState(0);

  const toggleChips = useMemo(
    () => getFilteredToggles(disabledCategories, disabledCards),
    [disabledCategories, disabledCards]
  );

  const quantityPickers = useMemo(
    () => getFilteredPickers(disabledCategories, disabledCards, activeToggles),
    [disabledCategories, disabledCards, activeToggles]
  );

  const totalPages = Math.ceil(quantityPickers.length / PICKERS_PER_PAGE);
  const currentPagePickers = quantityPickers.slice(
    quantityPage * PICKERS_PER_PAGE,
    (quantityPage + 1) * PICKERS_PER_PAGE
  );

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

  const handleToggle = (chip: ToggleChip) => {
    if (chip.levels) {
      // Cycling chip: advance to next level, wrap to 0 (off)
      setCyclingValues((prev) => {
        const currentIdx = prev[chip.id] ?? -1; // -1 = unset (show first level on first tap)
        const nextIdx = currentIdx + 1;
        if (nextIdx >= chip.levels!.length) {
          // Wrapped past last level → reset to off
          const next = { ...prev };
          delete next[chip.id];
          // Also remove from activeToggles
          setActiveToggles((at) => { const n = new Set(at); n.delete(chip.id); return n; });
          return next;
        }
        // Set active once past index 0 (or always for non-"None"/"0" first levels)
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
      setActiveToggles((prev) => {
        const next = new Set(prev);
        if (next.has(chip.id)) next.delete(chip.id);
        else next.add(chip.id);
        return next;
      });
    }
  };

  const handleQuantitySelect = (pickerId: string, value: string) => {
    setQuantities((prev) => {
      // Toggle off if same value selected
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
        // Mark as "active" toggle if not the zero/none value
        toggleResult[chip.id] = val !== '0' && val !== 'None';
      } else {
        toggleResult[chip.id] = activeToggles.has(chip.id);
      }
    }
    onComplete({ toggles: toggleResult, quantities, notes: textNotes, cyclingValues: cyclingResult });
  };

  const handleNextToQuantities = () => {
    if (quantityPickers.length === 0) {
      handleFinish();
      return;
    }
    setQuantityPage(0);
    setPhase('quantities');
  };

  const handleNextPage = () => {
    if (quantityPage + 1 >= totalPages) {
      handleFinish();
    } else {
      setQuantityPage(quantityPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (quantityPage > 0) {
      setQuantityPage(quantityPage - 1);
    } else {
      setPhase('toggles');
    }
  };

  // ═══════════════════════════════════════
  // PHASE 1: Toggle Chips
  // ═══════════════════════════════════════
  if (phase === 'toggles') {
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

        {/* Progress */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '50%' }]} />
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
                  const isActive = activeToggles.has(chip.id);
                  const isCycling = !!chip.levels;
                  const cycleIdx = cyclingValues[chip.id];
                  const cycleVal = isCycling && cycleIdx != null ? chip.levels![cycleIdx] : null;

                  // Cycling chip colors: severity = green→yellow→orange, neutral = always green
                  const SEVERITY_COLORS = [Colors.green, '#FFC107', Colors.orange, Colors.orange];
                  const cycleColor = isCycling && cycleIdx != null
                    ? (chip.colorScale === 'neutral' ? Colors.green : SEVERITY_COLORS[Math.min(cycleIdx, 3)])
                    : null;

                  return (
                    <Pressable
                      key={chip.id}
                      style={[
                        styles.toggleChip,
                        // Regular toggles: green when active
                        !isCycling && isActive && styles.toggleChipActive,
                        // Cycling chips: colored border + tinted bg based on level
                        isCycling && cycleColor ? {
                          borderColor: cycleColor,
                          backgroundColor: cycleColor + '20',
                          borderStyle: 'solid' as any,
                        } : isCycling ? styles.cyclingChip : null,
                      ]}
                      onPress={() => handleToggle(chip)}
                    >
                      <Text style={styles.chipEmoji}>{chip.emoji}</Text>
                      <Text
                        style={[
                          styles.chipLabel,
                          !isCycling && isActive && styles.chipLabelActive,
                          isCycling && cycleColor ? { color: cycleColor, fontWeight: '600' as any } : null,
                        ]}
                        numberOfLines={1}
                      >
                        {isCycling && cycleVal ? `${chip.label}: ${cycleVal}` : chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom button */}
        <View style={styles.bottomBar}>
          <Pressable style={styles.primaryButton} onPress={handleNextToQuantities}>
            <Text style={styles.primaryButtonText}>Next: Details</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.text} />
          </Pressable>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════
  // PHASE 2: Quantity Pickers (paginated)
  // ═══════════════════════════════════════
  const progressPct = totalPages > 0
    ? 50 + ((quantityPage + 1) / totalPages) * 50
    : 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handlePrevPage} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Details</Text>
        <Pressable onPress={handleFinish} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(progressPct, 100)}%` }]} />
      </View>

      <Text style={styles.pageCounter}>
        Page {quantityPage + 1} of {totalPages}
      </Text>

      <View style={styles.pickersArea}>
        {currentPagePickers.map((picker) => (
          <View key={picker.id} style={styles.pickerBlock}>
            <Text style={styles.pickerLabel}>
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
                onChangeText={(text) => setTextNotes((prev) => ({ ...prev, [picker.id]: text }))}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            )}
          </View>
        ))}
      </View>

      {/* Bottom navigation */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.primaryButton} onPress={handleNextPage}>
          <Text style={styles.primaryButtonText}>
            {quantityPage + 1 >= totalPages ? 'Done' : 'Next'}
          </Text>
          <Ionicons
            name={quantityPage + 1 >= totalPages ? 'checkmark' : 'arrow-forward'}
            size={20}
            color={Colors.text}
          />
        </Pressable>
      </View>
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

  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },

  phaseLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
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
  chipEmoji: { fontSize: 16 },
  chipLabel: { color: Colors.textSecondary, fontSize: 13 },
  chipLabelActive: { color: Colors.green, fontWeight: '600' },

  // Quantity pickers
  pageCounter: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  pickersArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 28,
  },
  pickerBlock: { gap: 10 },
  pickerLabel: {
    color: Colors.text,
    fontSize: 17,
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
