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

const THRESHOLDS = [3, 5, 7, 10];

export default function PressureAlerts() {
  const router = useRouter();
  const user = getCurrentUser();
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState(5);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const notifs = snap.data().settings?.notifications;
        if (notifs?.pressureAlerts !== undefined) setEnabled(notifs.pressureAlerts);
        if (notifs?.pressureThreshold) setThreshold(notifs.pressureThreshold);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async (en: boolean, thresh: number) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        settings: { pressureAlerts: { enabled: en, threshold: thresh } },
      }, { merge: true });
    } catch (err: any) {
      alert('Error', err.message || 'Failed to save.');
    }
    setSaving(false);
  };

  const toggleEnabled = (val: boolean) => {
    setEnabled(val);
    save(val, threshold);
  };

  const pickThreshold = (val: number) => {
    setThreshold(val);
    save(enabled, val);
  };

  if (!user) { router.replace('/login'); return null; }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Pressure Alerts</Text>
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
                  <Text style={styles.rowLabel}>Pressure Alerts</Text>
                  <Text style={styles.rowDetail}>Get notified when barometric pressure changes rapidly</Text>
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
            <Text style={styles.sectionTitle}>THRESHOLD (hPa / 3 hours)</Text>
            <View style={styles.sectionCard}>
              {THRESHOLDS.map((val, i) => (
                <Pressable
                  key={val}
                  style={[styles.row, i < THRESHOLDS.length - 1 && styles.rowBorder]}
                  onPress={() => enabled && pickThreshold(val)}
                  disabled={!enabled}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{val} hPa</Text>
                    <Text style={styles.rowDetail}>
                      {val <= 3 ? 'Very sensitive' : val <= 5 ? 'Recommended' : val <= 7 ? 'Moderate' : 'Less sensitive'}
                    </Text>
                  </View>
                  {threshold === val && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.hint}>
            Alerts trigger when pressure changes by more than the threshold within a 3-hour window.
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
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { color: Colors.text, fontSize: 15 },
  rowDetail: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});
