import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
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

export default function UnitsSettings() {
  const router = useRouter();
  const user = getCurrentUser();
  const [temperature, setTemperature] = useState<'F' | 'C'>('F');
  const [pressure, setPressure] = useState<'inHg' | 'hPa'>('inHg');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const units = snap.data().settings?.units;
        if (units?.temperature) setTemperature(units.temperature);
        if (units?.pressure) setPressure(units.pressure);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async (temp: 'F' | 'C', pres: 'inHg' | 'hPa') => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        settings: { units: { temperature: temp, pressure: pres } },
      }, { merge: true });
    } catch (err: any) {
      alert('Error', err.message || 'Failed to save.');
    }
    setSaving(false);
  };

  const pickTemp = (val: 'F' | 'C') => {
    setTemperature(val);
    save(val, pressure);
  };

  const pickPressure = (val: 'inHg' | 'hPa') => {
    setPressure(val);
    save(temperature, val);
  };

  if (!user) { router.replace('/login'); return null; }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Units</Text>
        <View style={{ width: 24 }}>
          {saving && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TEMPERATURE</Text>
            <View style={styles.sectionCard}>
              <Pressable style={[styles.row, styles.rowBorder]} onPress={() => pickTemp('F')}>
                <Text style={styles.rowLabel}>Fahrenheit (°F)</Text>
                {temperature === 'F' && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
              </Pressable>
              <Pressable style={styles.row} onPress={() => pickTemp('C')}>
                <Text style={styles.rowLabel}>Celsius (°C)</Text>
                {temperature === 'C' && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PRESSURE</Text>
            <View style={styles.sectionCard}>
              <Pressable style={[styles.row, styles.rowBorder]} onPress={() => pickPressure('inHg')}>
                <Text style={styles.rowLabel}>Inches of Mercury (inHg)</Text>
                {pressure === 'inHg' && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
              </Pressable>
              <Pressable style={styles.row} onPress={() => pickPressure('hPa')}>
                <Text style={styles.rowLabel}>Hectopascals (hPa)</Text>
                {pressure === 'hPa' && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
              </Pressable>
            </View>
          </View>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { color: Colors.text, fontSize: 15 },
});
