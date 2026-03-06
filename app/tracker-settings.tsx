import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { Colors } from '@/constants/Colors';
import {
  ALL_DAILY_TRACKERS,
  TRACKER_CATEGORIES,
  DailyTracker,
} from '@/constants/dailyTrackers';

export default function TrackerSettingsScreen() {
  const router = useRouter();
  const user = getCurrentUser();
  const [disabledKeys, setDisabledKeys] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDisabledKeys(data.settings?.disabledTrackers || []);
        setIsPremium(data.premiumStatus === 'premium');
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const toggleTracker = async (key: string, enabled: boolean) => {
    if (!user) return;
    const newDisabled = enabled
      ? disabledKeys.filter((k) => k !== key)
      : [...disabledKeys, key];
    setDisabledKeys(newDisabled);

    // Save to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      settings: { disabledTrackers: newDisabled },
    }, { merge: true }).catch(() => {});
  };

  const enabledCount = ALL_DAILY_TRACKERS.filter(
    (t) => !disabledKeys.includes(t.key) && (!t.premium || isPremium)
  ).length;

  const freeCount = ALL_DAILY_TRACKERS.filter((t) => !t.premium).length;
  const premiumCount = ALL_DAILY_TRACKERS.filter((t) => t.premium).length;

  if (!user) {
    router.replace('/login');
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Daily Trackers</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>
        Choose which trackers appear on your Home screen. Tap to cycle values throughout the day.
      </Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{enabledCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Colors.green }]}>{freeCount}</Text>
          <Text style={styles.statLabel}>Free</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Colors.premium }]}>{premiumCount}</Text>
          <Text style={styles.statLabel}>Premium</Text>
        </View>
      </View>

      {/* Tracker categories */}
      {TRACKER_CATEGORIES.map((cat) => {
        const trackers = ALL_DAILY_TRACKERS.filter((t) => t.category === cat.key);
        if (trackers.length === 0) return null;

        return (
          <View key={cat.key} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {cat.emoji} {cat.label}
            </Text>
            <View style={styles.sectionCard}>
              {trackers.map((tracker, i) => {
                const isEnabled = !disabledKeys.includes(tracker.key);
                const locked = tracker.premium && !isPremium;

                return (
                  <View
                    key={tracker.key}
                    style={[
                      styles.row,
                      i < trackers.length - 1 && styles.rowBorder,
                      locked && styles.rowLocked,
                    ]}
                  >
                    <Text style={styles.trackerEmoji}>{tracker.emoji}</Text>
                    <View style={styles.rowText}>
                      <View style={styles.labelRow}>
                        <Text style={[styles.rowLabel, locked && styles.rowLabelLocked]}>
                          {tracker.label}
                        </Text>
                        {tracker.premium && (
                          <View style={[styles.tierBadge, isPremium ? styles.tierBadgePremium : styles.tierBadgeLocked]}>
                            <Text style={[styles.tierBadgeText, isPremium ? styles.tierTextPremium : styles.tierTextLocked]}>
                              {isPremium ? 'PRO' : '🔒 PRO'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.rowDetail}>
                        {tracker.levels.filter((l) => l !== '--').join(' → ')}
                      </Text>
                    </View>
                    {locked ? (
                      <Ionicons name="lock-closed" size={18} color={Colors.textMuted} />
                    ) : (
                      <Switch
                        value={isEnabled}
                        onValueChange={(val) => toggleTracker(tracker.key, val)}
                        trackColor={{ false: Colors.surfaceLight, true: Colors.green + '60' }}
                        thumbColor={isEnabled ? Colors.green : Colors.textMuted}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Upgrade CTA for non-premium */}
      {!isPremium && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Unlock All Trackers</Text>
          <Text style={styles.upgradeText}>
            Premium includes {premiumCount} additional trackers for diet, body, activity, and mood tracking.
          </Text>
          <Pressable style={styles.upgradeButton} onPress={() => {
            if (Platform.OS === 'web') window.alert('Coming soon!');
          }}>
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 18 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
  },
  statNum: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLocked: { opacity: 0.5 },
  trackerEmoji: { fontSize: 22 },
  rowText: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { color: Colors.text, fontSize: 15 },
  rowLabelLocked: { color: Colors.textMuted },
  rowDetail: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  // Tier badges
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierBadgePremium: { backgroundColor: 'rgba(255,215,0,0.15)' },
  tierBadgeLocked: { backgroundColor: Colors.surfaceLight },
  tierBadgeText: { fontSize: 10, fontWeight: '700' },
  tierTextPremium: { color: Colors.premium },
  tierTextLocked: { color: Colors.textMuted },

  // Upgrade card
  upgradeCard: {
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeTitle: { color: Colors.premium, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  upgradeText: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  upgradeButton: {
    backgroundColor: Colors.premium,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  upgradeButtonText: { color: '#000', fontSize: 14, fontWeight: '700' },
});
