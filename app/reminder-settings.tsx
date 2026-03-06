import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { Colors } from '@/constants/Colors';

function alert(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n${message}`);
  else require('react-native').Alert.alert(title, message);
}

const TIME_OPTIONS = [
  { label: '8:00 AM', value: '08:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '4:00 PM', value: '16:00' },
  { label: '8:00 PM', value: '20:00' },
  { label: '10:00 PM', value: '22:00' },
];

export default function ReminderSettings() {
  const router = useRouter();
  const user = getCurrentUser();
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState('20:00');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const notifs = snap.data().settings?.notifications;
        if (notifs?.checkInReminder !== undefined) setEnabled(notifs.checkInReminder);
        if (notifs?.checkInTime) setTime(notifs.checkInTime);
        // Also check the newer flat path
        const reminder = snap.data().settings?.reminder;
        if (reminder?.enabled !== undefined) setEnabled(reminder.enabled);
        if (reminder?.time) setTime(reminder.time);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async (en: boolean, t: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        settings: { reminder: { enabled: en, time: t } },
      }, { merge: true });
    } catch (err: any) {
      alert('Error', err.message || 'Failed to save.');
    }
    setSaving(false);
  };

  const toggleEnabled = (val: boolean) => {
    setEnabled(val);
    save(val, time);
  };

  const pickTime = (val: string) => {
    setTime(val);
    save(enabled, val);
  };

  const getTimeLabel = (val: string) => TIME_OPTIONS.find((t) => t.value === val)?.label || val;

  if (!user) { router.replace('/login'); return null; }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Check-in Reminder</Text>
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
                  <Text style={styles.rowLabel}>Daily Reminder</Text>
                  <Text style={styles.rowDetail}>Get a reminder to log your daily check-in</Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={toggleEnabled}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>

          <View style={[styles.section, !enabled && { opacity: 0.4 }]}>
            <Text style={styles.sectionTitle}>REMINDER TIME</Text>
            <View style={styles.sectionCard}>
              {TIME_OPTIONS.map((opt, i) => (
                <Pressable
                  key={opt.value}
                  style={[styles.row, i < TIME_OPTIONS.length - 1 && styles.rowBorder]}
                  onPress={() => enabled && pickTime(opt.value)}
                  disabled={!enabled}
                >
                  <Text style={styles.rowLabel}>{opt.label}</Text>
                  {time === opt.value && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.hint}>
            You'll receive a push notification at {getTimeLabel(time)} each day reminding you to complete your check-in.
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
  sectionTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { color: Colors.text, fontSize: 15 },
  rowDetail: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});
