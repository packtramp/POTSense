import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Platform, FlatList } from 'react-native';
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

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10...55

function parse24to12(time24: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  const [h, m] = time24.split(':').map(Number);
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  // Round minute to nearest 5
  const minute = Math.round(m / 5) * 5 % 60;
  return { hour, minute, period };
}

function to24(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour;
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function formatDisplay(hour: number, minute: number, period: 'AM' | 'PM'): string {
  return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
}

export default function ReminderSettings() {
  const router = useRouter();
  const user = getCurrentUser();
  const [enabled, setEnabled] = useState(true);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const notifs = snap.data().settings?.notifications;
        if (notifs?.checkInReminder !== undefined) setEnabled(notifs.checkInReminder);
        // Also check the newer flat path
        const reminder = snap.data().settings?.reminder;
        if (reminder?.enabled !== undefined) setEnabled(reminder.enabled);
        const timeStr = reminder?.time || notifs?.checkInTime || '20:00';
        const parsed = parse24to12(timeStr);
        setHour(parsed.hour);
        setMinute(parsed.minute);
        setPeriod(parsed.period);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async (en: boolean, h: number, m: number, p: 'AM' | 'PM') => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        settings: { reminder: { enabled: en, time: to24(h, m, p) } },
      }, { merge: true });
    } catch (err: any) {
      alert('Error', err.message || 'Failed to save.');
    }
    setSaving(false);
  };

  const toggleEnabled = (val: boolean) => {
    setEnabled(val);
    save(val, hour, minute, period);
  };

  const pickHour = (h: number) => {
    setHour(h);
    save(enabled, h, minute, period);
  };

  const pickMinute = (m: number) => {
    setMinute(m);
    save(enabled, hour, m, period);
  };

  const togglePeriod = () => {
    const newP = period === 'AM' ? 'PM' : 'AM';
    setPeriod(newP);
    save(enabled, hour, minute, newP);
  };

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

          {/* Time Display */}
          <View style={[styles.section, !enabled && { opacity: 0.4 }]}>
            <Text style={styles.sectionTitle}>REMINDER TIME</Text>
            <View style={styles.timeDisplay}>
              <Ionicons name="time-outline" size={22} color={Colors.primary} />
              <Text style={styles.timeText}>{formatDisplay(hour, minute, period)}</Text>
            </View>

            {/* Time Picker */}
            <View style={styles.pickerContainer}>
              {/* Hour column */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>HOUR</Text>
                <View style={styles.pickerCard}>
                  {HOURS.map((h) => (
                    <Pressable
                      key={h}
                      style={[styles.pickerItem, hour === h && styles.pickerItemSelected]}
                      onPress={() => enabled && pickHour(h)}
                      disabled={!enabled}
                    >
                      <Text style={[styles.pickerItemText, hour === h && styles.pickerItemTextSelected]}>
                        {h}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Minute column */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>MIN</Text>
                <View style={styles.pickerCard}>
                  {MINUTES.map((m) => (
                    <Pressable
                      key={m}
                      style={[styles.pickerItem, minute === m && styles.pickerItemSelected]}
                      onPress={() => enabled && pickMinute(m)}
                      disabled={!enabled}
                    >
                      <Text style={[styles.pickerItemText, minute === m && styles.pickerItemTextSelected]}>
                        {m.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* AM/PM column */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>AM/PM</Text>
                <View style={styles.pickerCard}>
                  <Pressable
                    style={[styles.pickerItem, period === 'AM' && styles.pickerItemSelected]}
                    onPress={() => enabled && period !== 'AM' && togglePeriod()}
                    disabled={!enabled}
                  >
                    <Text style={[styles.pickerItemText, period === 'AM' && styles.pickerItemTextSelected]}>AM</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.pickerItem, period === 'PM' && styles.pickerItemSelected]}
                    onPress={() => enabled && period !== 'PM' && togglePeriod()}
                    disabled={!enabled}
                  >
                    <Text style={[styles.pickerItemText, period === 'PM' && styles.pickerItemTextSelected]}>PM</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.hint}>
            You'll receive a push notification at {formatDisplay(hour, minute, period)} each day reminding you to complete your check-in.
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
  rowLabel: { color: Colors.text, fontSize: 15 },
  rowDetail: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  // Time display
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  timeText: { color: Colors.text, fontSize: 28, fontWeight: '700', letterSpacing: 1 },

  // Picker
  pickerContainer: { flexDirection: 'row', gap: 10 },
  pickerColumn: { flex: 1 },
  pickerLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1, textAlign: 'center', marginBottom: 6 },
  pickerCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primary,
  },
  pickerItemText: { color: Colors.text, fontSize: 15, fontWeight: '500' },
  pickerItemTextSelected: { color: '#fff', fontWeight: '700' },

  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});
