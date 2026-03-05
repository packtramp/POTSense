import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { Colors } from '@/constants/Colors';
import PressureChart, { PressurePoint } from '@/components/PressureChart';

type RangeKey = '7d' | '30d' | '90d' | 'all';
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
  { key: 'all', label: 'All', days: 9999 },
];

const SEVERITY_EMOJIS = ['😕', '😐', '😟', '😣', '😵'];
const SEVERITY_COLORS = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#EF5350'];

type EpisodeData = {
  id: string;
  timestamp: Date;
  severity: number;
  weather: {
    surfacePressure: number;
    surfacePressureInHg: number;
    pressureChange3h: number;
    pressureTrend: string;
  } | null;
};

export default function TrendsScreen() {
  const { width: screenW } = useWindowDimensions();
  const [range, setRange] = useState<RangeKey>('30d');
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const user = getCurrentUser();
      if (!user) return;

      setLoading(true);
      const episodesRef = collection(db, 'patients', user.uid, 'episodes');

      getDocs(query(episodesRef, orderBy('timestamp', 'desc')))
        .then((snap) => {
          const eps: EpisodeData[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              timestamp: data.timestamp?.toDate?.() || new Date(),
              severity: data.severity || 3,
              weather: data.weather || null,
            };
          });
          setEpisodes(eps);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  // Filter by range
  const cutoff = new Date();
  const rangeDays = RANGES.find((r) => r.key === range)?.days || 30;
  cutoff.setDate(cutoff.getDate() - rangeDays);
  const filtered = range === 'all' ? episodes : episodes.filter((e) => e.timestamp >= cutoff);

  // Episodes with pressure data for the chart
  const chartData: PressurePoint[] = filtered
    .filter((e) => e.weather?.surfacePressure)
    .map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      pressure: e.weather!.surfacePressure,
      pressureInHg: e.weather!.surfacePressureInHg,
      severity: e.severity,
      pressureTrend: e.weather!.pressureTrend,
    }));

  // Stats
  const avgSeverity = filtered.length > 0
    ? filtered.reduce((sum, e) => sum + e.severity, 0) / filtered.length
    : 0;

  const pressureDropEpisodes = filtered.filter((e) => e.weather && e.weather.pressureChange3h < -2);
  const pressureDropPct = filtered.length > 0
    ? Math.round((pressureDropEpisodes.length / filtered.length) * 100)
    : 0;

  // Severity distribution
  const severityDist = [0, 0, 0, 0, 0];
  filtered.forEach((e) => { severityDist[e.severity - 1]++; });
  const maxSev = Math.max(...severityDist, 1);

  // Time of day distribution
  const hourBuckets = [0, 0, 0, 0]; // Morning, Afternoon, Evening, Night
  filtered.forEach((e) => {
    const h = e.timestamp.getHours();
    if (h >= 6 && h < 12) hourBuckets[0]++;
    else if (h >= 12 && h < 17) hourBuckets[1]++;
    else if (h >= 17 && h < 22) hourBuckets[2]++;
    else hourBuckets[3]++;
  });
  const maxHour = Math.max(...hourBuckets, 1);
  const hourLabels = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const hourEmojis = ['🌅', '☀️', '🌆', '🌙'];

  // Teaser if not enough data
  if (!loading && episodes.length < 3) {
    return (
      <View style={styles.container}>
        <View style={styles.teaser}>
          <Ionicons name="trending-up" size={48} color={Colors.primary} />
          <Text style={styles.title}>Your insights are waiting...</Text>
          <Text style={styles.subtitle}>
            Log a few episodes and your personal pressure trends will appear here.
          </Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>After 3+ episodes you'll see:</Text>
            <Text style={styles.previewItem}>📈 Pressure timeline with episode overlay</Text>
            <Text style={styles.previewItem}>🌡️ Pressure drop correlation %</Text>
            <Text style={styles.previewItem}>📊 Severity distribution</Text>
            <Text style={styles.previewItem}>⏰ Time-of-day patterns</Text>
          </View>
        </View>
      </View>
    );
  }

  const chartWidth = Math.min(screenW - 32, 600);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Range selector */}
      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r.key}
            style={[styles.rangeBtn, range === r.key && styles.rangeBtnActive]}
            onPress={() => setRange(r.key)}
          >
            <Text style={[styles.rangeBtnText, range === r.key && styles.rangeBtnTextActive]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Pressure Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌡️ Pressure Timeline</Text>
        <Text style={styles.sectionSubtitle}>
          Barometric pressure at each episode · tap dots for details
        </Text>
        <PressureChart data={chartData} width={chartWidth} />
      </View>

      {/* Key stat: pressure correlation */}
      <View style={styles.statCard}>
        <View style={styles.statRow}>
          <View style={styles.statBlock}>
            <Text style={styles.bigStat}>{pressureDropPct}%</Text>
            <Text style={styles.statLabel}>of episodes during{'\n'}pressure drops</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.bigStat}>{filtered.length}</Text>
            <Text style={styles.statLabel}>total episodes{'\n'}in range</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.bigStat}>{avgSeverity.toFixed(1)}</Text>
            <Text style={styles.statLabel}>avg severity</Text>
          </View>
        </View>
      </View>

      {/* Severity Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Severity Distribution</Text>
        <View style={styles.barChart}>
          {severityDist.map((count, i) => (
            <View key={i} style={styles.barGroup}>
              <Text style={styles.barCount}>{count}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${(count / maxSev) * 100}%`,
                      backgroundColor: SEVERITY_COLORS[i],
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{SEVERITY_EMOJIS[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Time of Day */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Time of Day</Text>
        <View style={styles.barChart}>
          {hourBuckets.map((count, i) => (
            <View key={i} style={[styles.barGroup, { flex: 1 }]}>
              <Text style={styles.barCount}>{count}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${(count / maxHour) * 100}%`,
                      backgroundColor: Colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{hourEmojis[i]}</Text>
              <Text style={[styles.barLabel, { fontSize: 9 }]}>{hourLabels[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Pressure drop insight */}
      {pressureDropPct > 40 && (
        <View style={styles.insightCard}>
          <Ionicons name="bulb" size={20} color={Colors.orange} />
          <Text style={styles.insightText}>
            {pressureDropPct}% of your episodes happen during pressure drops.
            Weather changes may be a significant trigger for you.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 80 },

  teaser: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  title: { color: Colors.text, fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  previewCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 16, width: '100%',
    borderWidth: 1, borderColor: Colors.border,
  },
  previewLabel: { color: Colors.textSecondary, fontSize: 13, marginBottom: 12 },
  previewItem: { color: Colors.text, fontSize: 14, paddingVertical: 6 },

  rangeRow: {
    flexDirection: 'row', gap: 8, marginBottom: 20,
  },
  rangeBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  rangeBtnActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  rangeBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  rangeBtnTextActive: { color: Colors.text },

  section: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sectionSubtitle: { color: Colors.textMuted, fontSize: 12, marginBottom: 12 },

  statCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center' },
  bigStat: { color: Colors.text, fontSize: 28, fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },

  barChart: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
    height: 120, gap: 8,
  },
  barGroup: { alignItems: 'center', width: 40 },
  barCount: { color: Colors.textSecondary, fontSize: 11, marginBottom: 4 },
  barTrack: {
    width: 28, height: 80, backgroundColor: Colors.surfaceLight,
    borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },

  insightCard: {
    backgroundColor: 'rgba(255,152,0,0.1)', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,152,0,0.3)',
  },
  insightText: { color: Colors.text, fontSize: 13, flex: 1, lineHeight: 20 },
});
