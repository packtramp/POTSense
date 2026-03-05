import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { Colors } from '@/constants/Colors';
import PressureChart, { PressurePoint } from '@/components/PressureChart';
import { getCurrentLocation, fetchHistoricalPressure, HourlyPressure } from '@/lib/weather';

type RangeKey = '7d' | '30d' | '90d' | 'all';
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
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
  questionnaire: Record<string, string> | null;
};

const CARD_TITLES = [
  { icon: '🌡️', title: 'Pressure & Episodes' },
  { icon: '📊', title: 'Severity Breakdown' },
  { icon: '🔍', title: 'Top Triggers' },
  { icon: '⏰', title: 'Time of Day' },
  { icon: '📈', title: 'Episode Frequency' },
];

export default function TrendsScreen() {
  const { width: screenW } = useWindowDimensions();
  const [range, setRange] = useState<RangeKey>('30d');
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(0);
  const [hourlyPressure, setHourlyPressure] = useState<HourlyPressure[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const cardWidth = Math.min(screenW - 32, 600);
  const cardWithGap = cardWidth + 12;

  useFocusEffect(
    useCallback(() => {
      const user = getCurrentUser();
      if (!user) return;

      setLoading(true);
      const episodesRef = collection(db, 'patients', user.uid, 'episodes');

      // Fetch episodes
      const epPromise = getDocs(query(episodesRef, orderBy('timestamp', 'desc')))
        .then((snap) => {
          const eps: EpisodeData[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              timestamp: data.timestamp?.toDate?.() || new Date(),
              severity: data.severity || 3,
              weather: data.weather || null,
              questionnaire: data.questionnaire || null,
            };
          });
          setEpisodes(eps);
        })
        .catch(() => {});

      // Fetch continuous hourly pressure from Open-Meteo (last 92 days)
      const pressurePromise = getCurrentLocation()
        .then((coords) => {
          if (!coords) return;
          return fetchHistoricalPressure(coords.latitude, coords.longitude, 92);
        })
        .then((data) => { if (data) setHourlyPressure(data); })
        .catch(() => {});

      Promise.all([epPromise, pressurePromise]).finally(() => setLoading(false));
    }, [])
  );

  // Filter by range
  const cutoff = new Date();
  const rangeDays = RANGES.find((r) => r.key === range)?.days || 30;
  cutoff.setDate(cutoff.getDate() - rangeDays);
  const filtered = range === 'all' ? episodes : episodes.filter((e) => e.timestamp >= cutoff);

  // Pressure chart data
  const chartEpisodes: PressurePoint[] = filtered
    .filter((e) => e.weather?.surfacePressure)
    .map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      pressure: e.weather!.surfacePressure,
      pressureInHg: e.weather!.surfacePressureInHg,
      severity: e.severity,
      pressureChange3h: e.weather!.pressureChange3h,
    }));

  // Filter hourly pressure to match selected range
  const filteredHourly = range === 'all'
    ? hourlyPressure
    : hourlyPressure.filter((h) => h.timestamp >= cutoff);

  // Stats
  const avgSeverity = filtered.length > 0
    ? filtered.reduce((sum, e) => sum + e.severity, 0) / filtered.length : 0;

  const pressureDropEpisodes = filtered.filter((e) => e.weather && e.weather.pressureChange3h < -2);
  const pressureRiseEpisodes = filtered.filter((e) => e.weather && e.weather.pressureChange3h > 2);
  const pressureDropPct = filtered.length > 0
    ? Math.round((pressureDropEpisodes.length / filtered.length) * 100) : 0;
  const pressureRisePct = filtered.length > 0
    ? Math.round((pressureRiseEpisodes.length / filtered.length) * 100) : 0;
  const stablePct = 100 - pressureDropPct - pressureRisePct;

  // Severity distribution
  const severityDist = [0, 0, 0, 0, 0];
  filtered.forEach((e) => { severityDist[e.severity - 1]++; });
  const maxSev = Math.max(...severityDist, 1);

  // Trigger analysis
  const triggerCounts: Record<string, number> = {};
  const TRIGGER_LABELS: Record<string, string> = {
    stressed: '😰 Stressed', dehydrated: '💧 Dehydrated', poor_sleep: '😴 Poor Sleep',
    skipped_meds: '💊 Skipped Meds', caffeine: '☕ Caffeine', standing_long: '🧍 Standing Long',
    hot_environment: '🌡️ Hot Environment', alcohol: '🍷 Alcohol', large_meal: '🍔 Large Meal',
    got_up_quickly: '⚡ Got Up Quickly', exercise: '🏃 Exercise', bath_shower: '🛁 Bath/Shower',
    menstrual: '🩸 Menstrual', emotional: '😢 Emotional', allergy: '🤧 Allergic Reaction',
  };
  filtered.forEach((e) => {
    if (!e.questionnaire) return;
    for (const [key, val] of Object.entries(e.questionnaire)) {
      if (key.endsWith('_note')) continue;
      if (val === 'yes' || val === 'true') {
        triggerCounts[key] = (triggerCounts[key] || 0) + 1;
      }
    }
  });
  const topTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Time of day
  const hourBuckets = [0, 0, 0, 0];
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
  const hourRanges = ['6am–12pm', '12pm–5pm', '5pm–10pm', '10pm–6am'];

  // Episode frequency (episodes per day over last N days)
  const dayMap: Record<string, number> = {};
  filtered.forEach((e) => {
    const key = `${e.timestamp.getMonth() + 1}/${e.timestamp.getDate()}`;
    dayMap[key] = (dayMap[key] || 0) + 1;
  });
  const dayCounts = Object.entries(dayMap).slice(-14); // last 14 active days
  const maxDay = Math.max(...dayCounts.map(([, c]) => c), 1);

  // Teaser
  if (!loading && episodes.length < 3) {
    return (
      <View style={styles.container}>
        <View style={styles.teaser}>
          <Ionicons name="trending-up" size={48} color={Colors.primary} />
          <Text style={styles.title}>Your insights are waiting...</Text>
          <Text style={styles.subtitle}>
            Log a few episodes and your personal trends will appear here.
          </Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>After 3+ episodes you'll see:</Text>
            {CARD_TITLES.map((c) => (
              <Text key={c.title} style={styles.previewItem}>{c.icon} {c.title}</Text>
            ))}
          </View>
        </View>
      </View>
    );
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardWithGap);
    if (idx !== activeCard) setActiveCard(idx);
  };

  const goToCard = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * cardWithGap, animated: true });
    setActiveCard(idx);
  };

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
        <View style={{ flex: 1 }} />
        <Text style={styles.episodeCount}>{filtered.length} episodes</Text>
      </View>

      {/* Swipeable card carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWithGap}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ gap: 12 }}
      >
        {/* Card 1: Pressure & Episodes */}
        <View style={[styles.card, { width: cardWidth }]}>
          <Text style={styles.cardTitle}>{CARD_TITLES[0].icon} {CARD_TITLES[0].title}</Text>
          <Text style={styles.cardSubtitle}>
            Your barometric pressure when episodes occur
          </Text>
          <PressureChart hourlyData={filteredHourly} episodes={chartEpisodes} width={cardWidth - 32} />
          <View style={styles.pressureStats}>
            <View style={styles.pressureStat}>
              <Text style={[styles.pressureStatVal, { color: Colors.red }]}>📉 {pressureDropPct}%</Text>
              <Text style={styles.pressureStatLabel}>during drops</Text>
            </View>
            <View style={styles.pressureStat}>
              <Text style={[styles.pressureStatVal, { color: Colors.green }]}>📈 {pressureRisePct}%</Text>
              <Text style={styles.pressureStatLabel}>during rises</Text>
            </View>
            <View style={styles.pressureStat}>
              <Text style={[styles.pressureStatVal, { color: Colors.primary }]}>➡️ {stablePct}%</Text>
              <Text style={styles.pressureStatLabel}>stable</Text>
            </View>
          </View>
          {pressureDropPct > 40 && (
            <View style={styles.insightBanner}>
              <Text style={styles.insightText}>
                ⚡ {pressureDropPct}% of your episodes happen during pressure drops — weather changes may be a significant trigger.
              </Text>
            </View>
          )}
        </View>

        {/* Card 2: Severity */}
        <View style={[styles.card, { width: cardWidth }]}>
          <Text style={styles.cardTitle}>{CARD_TITLES[1].icon} {CARD_TITLES[1].title}</Text>
          <Text style={styles.cardSubtitle}>Average severity: {avgSeverity.toFixed(1)}/5</Text>
          <View style={styles.barChart}>
            {severityDist.map((count, i) => (
              <View key={i} style={styles.barGroup}>
                <Text style={styles.barCount}>{count}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, {
                      height: `${(count / maxSev) * 100}%`,
                      backgroundColor: SEVERITY_COLORS[i],
                    }]}
                  />
                </View>
                <Text style={styles.barLabel}>{SEVERITY_EMOJIS[i]}</Text>
                <Text style={styles.barSubLabel}>{i + 1}/5</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Card 3: Top Triggers */}
        <View style={[styles.card, { width: cardWidth }]}>
          <Text style={styles.cardTitle}>{CARD_TITLES[2].icon} {CARD_TITLES[2].title}</Text>
          <Text style={styles.cardSubtitle}>Most common factors during episodes</Text>
          {topTriggers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Complete the questionnaire when logging to see triggers</Text>
            </View>
          ) : (
            <View style={styles.triggerList}>
              {topTriggers.map(([key, count], i) => {
                const pct = Math.round((count / filtered.length) * 100);
                const label = TRIGGER_LABELS[key] || key;
                return (
                  <View key={key} style={styles.triggerRow}>
                    <Text style={styles.triggerRank}>#{i + 1}</Text>
                    <Text style={styles.triggerLabel}>{label}</Text>
                    <View style={styles.triggerBarTrack}>
                      <View style={[styles.triggerBarFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.triggerPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Card 4: Time of Day */}
        <View style={[styles.card, { width: cardWidth }]}>
          <Text style={styles.cardTitle}>{CARD_TITLES[3].icon} {CARD_TITLES[3].title}</Text>
          <Text style={styles.cardSubtitle}>When episodes happen most</Text>
          <View style={styles.barChart}>
            {hourBuckets.map((count, i) => (
              <View key={i} style={[styles.barGroup, { flex: 1 }]}>
                <Text style={styles.barCount}>{count}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, {
                      height: `${(count / maxHour) * 100}%`,
                      backgroundColor: count === Math.max(...hourBuckets) ? Colors.orange : Colors.primary,
                    }]}
                  />
                </View>
                <Text style={styles.barLabel}>{hourEmojis[i]}</Text>
                <Text style={styles.barSubLabel}>{hourLabels[i]}</Text>
                <Text style={[styles.barSubLabel, { fontSize: 9 }]}>{hourRanges[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Card 5: Episode Frequency */}
        <View style={[styles.card, { width: cardWidth }]}>
          <Text style={styles.cardTitle}>{CARD_TITLES[4].icon} {CARD_TITLES[4].title}</Text>
          <Text style={styles.cardSubtitle}>Episodes per day</Text>
          {dayCounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No episodes in this range</Text>
            </View>
          ) : (
            <View style={styles.freqChart}>
              {dayCounts.map(([day, count]) => (
                <View key={day} style={styles.freqBarGroup}>
                  <Text style={styles.freqCount}>{count}</Text>
                  <View style={styles.freqBarTrack}>
                    <View style={[styles.freqBarFill, {
                      height: `${(count / maxDay) * 100}%`,
                      backgroundColor: count >= 3 ? Colors.red : count >= 2 ? Colors.orange : Colors.primary,
                    }]} />
                  </View>
                  <Text style={styles.freqLabel}>{day}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Page dots */}
      <View style={styles.dots}>
        {CARD_TITLES.map((_, i) => (
          <Pressable key={i} onPress={() => goToCard(i)}>
            <View style={[styles.dot, activeCard === i && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      {/* Card label */}
      <Text style={styles.cardIndicator}>
        {CARD_TITLES[activeCard]?.icon} {CARD_TITLES[activeCard]?.title}
        {'  ·  '}Swipe for more
      </Text>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 80 },

  teaser: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  previewCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 16, width: '100%',
    borderWidth: 1, borderColor: Colors.border,
  },
  previewLabel: { color: Colors.textSecondary, fontSize: 13, marginBottom: 12 },
  previewItem: { color: Colors.text, fontSize: 14, paddingVertical: 6 },

  rangeRow: { flexDirection: 'row', gap: 6, marginBottom: 16, alignItems: 'center' },
  rangeBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  rangeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rangeBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  rangeBtnTextActive: { color: Colors.text },
  episodeCount: { color: Colors.textMuted, fontSize: 12 },

  card: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, minHeight: 340,
  },
  cardTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 2 },
  cardSubtitle: { color: Colors.textMuted, fontSize: 12, marginBottom: 16 },

  pressureStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  pressureStat: { alignItems: 'center' },
  pressureStatVal: { fontSize: 15, fontWeight: '700' },
  pressureStatLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },

  insightBanner: {
    backgroundColor: 'rgba(255,152,0,0.1)', borderRadius: 8, padding: 10, marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(255,152,0,0.2)',
  },
  insightText: { color: Colors.text, fontSize: 12, lineHeight: 18 },

  barChart: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
    height: 160, gap: 6, flex: 1,
  },
  barGroup: { alignItems: 'center', width: 44 },
  barCount: { color: Colors.textSecondary, fontSize: 11, marginBottom: 4 },
  barTrack: {
    width: 30, height: 100, backgroundColor: Colors.surfaceLight,
    borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { color: Colors.textSecondary, fontSize: 14, marginTop: 6 },
  barSubLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },

  triggerList: { gap: 8, flex: 1 },
  triggerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  triggerRank: { color: Colors.textMuted, fontSize: 12, width: 24, fontWeight: '600' },
  triggerLabel: { color: Colors.text, fontSize: 13, width: 130 },
  triggerBarTrack: {
    flex: 1, height: 14, backgroundColor: Colors.surfaceLight, borderRadius: 7, overflow: 'hidden',
  },
  triggerBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 7 },
  triggerPct: { color: Colors.textSecondary, fontSize: 12, width: 36, textAlign: 'right' },

  freqChart: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
    height: 160, gap: 2, flex: 1,
  },
  freqBarGroup: { alignItems: 'center', flex: 1 },
  freqCount: { color: Colors.textSecondary, fontSize: 9, marginBottom: 2 },
  freqBarTrack: {
    width: '70%', height: 100, backgroundColor: Colors.surfaceLight,
    borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden',
  },
  freqBarFill: { width: '100%', borderRadius: 3 },
  freqLabel: { color: Colors.textMuted, fontSize: 8, marginTop: 4, textAlign: 'center' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 120 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 20 },

  cardIndicator: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
