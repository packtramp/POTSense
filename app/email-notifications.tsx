import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { Colors } from '@/constants/Colors';

export default function EmailNotifications() {
  const router = useRouter();
  const user = getCurrentUser();
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const en = snap.data().settings?.emailNotifications?.enabled;
        if (en !== undefined) setEnabled(en);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async (val: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        settings: { emailNotifications: { enabled: val } },
      }, { merge: true });
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert('Failed to save.');
    }
    setSaving(false);
  };

  const toggle = (val: boolean) => {
    setEnabled(val);
    save(val);
  };

  if (!user) { router.replace('/login'); return null; }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Email Notifications</Text>
        <View style={{ width: 24 }}>
          {saving && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Weekly Summary</Text>
                  <Text style={styles.rowDetail}>
                    Receive a weekly email with your episode count, severity trends, top triggers, and pressure insights
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={toggle}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>What's included:</Text>
            {[
              ['📋', 'Episode log with dates & severity'],
              ['🌡️', 'Barometric pressure at each episode'],
              ['📊', 'Pressure trends (3-hour changes)'],
              ['🎯', 'Symptoms & triggers summary'],
            ].map(([emoji, text]) => (
              <View key={text} style={styles.previewRow}>
                <Text style={styles.previewEmoji}>{emoji}</Text>
                <Text style={styles.previewText}>{text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.hint}>
            Sent every Sunday morning to {user.email || 'your email'}.
            {'\n'}You can unsubscribe at any time.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  section: { marginBottom: 24 },
  sectionCard: { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowLabel: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  rowDetail: { color: Colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  previewCard: {
    backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 16,
  },
  previewTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  previewEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  previewText: { color: Colors.text, fontSize: 14 },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});
