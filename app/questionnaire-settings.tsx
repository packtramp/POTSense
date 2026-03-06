import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { CARD_CATEGORIES, getAllItemsInCategory, getTotalEnabledCount } from '@/constants/swipeCards';
import { Colors } from '@/constants/Colors';

export default function QuestionnaireSettings() {
  const router = useRouter();
  const [disabledCategories, setDisabledCategories] = useState<string[]>([]);
  const [disabledCards, setDisabledCards] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      const data = snap.data();
      if (data?.settings?.disabledCategories) setDisabledCategories(data.settings.disabledCategories);
      if (data?.settings?.disabledCards) setDisabledCards(data.settings.disabledCards);
      if (data?.premiumStatus === 'premium') setIsPremium(true);
    }).catch(() => {});
  }, []);

  const saveSettings = async (newCategories: string[], newCards: string[]) => {
    const user = getCurrentUser();
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'settings.disabledCategories': newCategories,
        'settings.disabledCards': newCards,
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
    setSaving(false);
  };

  const toggleCategory = (key: string) => {
    // Don't allow toggling fully-premium categories for free users
    const items = getAllItemsInCategory(key);
    if (!isPremium && items.length > 0 && items.every((i) => i.premium)) return;
    const newList = disabledCategories.includes(key)
      ? disabledCategories.filter((c) => c !== key)
      : [...disabledCategories, key];
    setDisabledCategories(newList);
    saveSettings(newList, disabledCards);
  };

  const toggleCard = (id: string) => {
    const newList = disabledCards.includes(id)
      ? disabledCards.filter((c) => c !== id)
      : [...disabledCards, id];
    setDisabledCards(newList);
    saveSettings(disabledCategories, newList);
  };

  const enabledCount = getTotalEnabledCount(disabledCategories, disabledCards);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Questionnaire</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>{enabledCount} questions enabled</Text>
        <Text style={styles.hint}>
          Toggle entire categories or expand to control individual questions.
        </Text>

        {CARD_CATEGORIES.map((cat) => {
          const items = getAllItemsInCategory(cat.key);
          const catDisabled = disabledCategories.includes(cat.key);
          const isExpanded = expandedCategory === cat.key;
          // Category is fully premium if ALL items in it are premium
          const allPremium = items.length > 0 && items.every((i) => i.premium);
          const catLocked = allPremium && !isPremium;

          return (
            <View key={cat.key} style={[styles.categoryBlock, catLocked && styles.lockedBlock]}>
              <View style={styles.categoryHeader}>
                <Pressable
                  style={styles.categoryTap}
                  onPress={() => !catLocked && setExpandedCategory(isExpanded ? null : cat.key)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryLabel, (catDisabled || catLocked) && styles.disabledText]}>
                      {cat.label}
                    </Text>
                    <Text style={styles.categoryCount}>
                      {items.length} items{catLocked ? ' · 🔒 Premium' : ''}
                    </Text>
                  </View>
                  {!catLocked && (
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  )}
                </Pressable>
                {catLocked ? (
                  <Ionicons name="lock-closed" size={18} color={Colors.textMuted} />
                ) : (
                  <Switch
                    value={!catDisabled}
                    onValueChange={() => toggleCategory(cat.key)}
                    trackColor={{ false: Colors.surfaceLight, true: Colors.green }}
                    thumbColor={Colors.text}
                  />
                )}
              </View>

              {isExpanded && !catDisabled && !catLocked && (
                <View style={styles.cardList}>
                  {items.map((item) => {
                    const itemLocked = item.premium && !isPremium;
                    const itemDisabled = disabledCards.includes(item.id);
                    return (
                      <View key={item.id} style={[styles.cardRow, itemLocked && styles.lockedRow]}>
                        <Text style={[styles.cardEmoji, itemLocked && { opacity: 0.4 }]}>{item.emoji}</Text>
                        <Text
                          style={[styles.cardQuestion, (itemDisabled || itemLocked) && styles.disabledText]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                        {itemLocked ? (
                          <Ionicons name="lock-closed" size={14} color={Colors.textMuted} style={{ marginRight: 8 }} />
                        ) : (
                          <Switch
                            value={!itemDisabled}
                            onValueChange={() => toggleCard(item.id)}
                            trackColor={{ false: Colors.surfaceLight, true: Colors.green }}
                            thumbColor={Colors.text}
                            style={styles.cardSwitch}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {saving && <Text style={styles.savingText}>Saving...</Text>}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { color: Colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  hint: { color: Colors.textMuted, fontSize: 13, marginBottom: 20 },

  categoryBlock: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  categoryTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryEmoji: { fontSize: 22 },
  categoryInfo: { flex: 1 },
  categoryLabel: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  categoryCount: { color: Colors.textMuted, fontSize: 12 },

  cardList: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  cardEmoji: { fontSize: 18 },
  cardQuestion: { flex: 1, color: Colors.textSecondary, fontSize: 14 },
  cardSwitch: { transform: [{ scale: 0.8 }] },

  disabledText: { color: Colors.textMuted },
  lockedBlock: { opacity: 0.5 },
  lockedRow: { opacity: 0.45 },
  savingText: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
