import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { Colors } from '@/constants/Colors';

type RangeOption = '7' | '30' | '90' | 'all';

type EpisodeDoc = {
  id: string;
  timestamp: Timestamp | null;
  localTime?: string;
  severity: number;
  symptoms: string[];
  notes: string | null;
  weather: {
    surfacePressureInHg: number;
    pressureTrend: 'rising' | 'falling' | 'steady';
    temperatureF: number;
    humidity: number;
  } | null;
  questionnaire: Record<string, string> | null;
};

type Stats = {
  total: number;
  avgSeverity: number;
  topTriggers: { label: string; count: number }[];
  pressureFalling: number;
  pressureRising: number;
  pressureSteady: number;
  episodesWithWeather: number;
};

const RANGE_OPTIONS: { key: RangeOption; label: string }[] = [
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
];

const SEVERITY_LABELS = ['Mild', 'Low', 'Moderate', 'Severe', 'Worst'];

function getDateFromEpisode(ep: EpisodeDoc): Date {
  try {
    if (ep.timestamp && typeof (ep.timestamp as any).toDate === 'function') {
      return (ep.timestamp as any).toDate();
    }
    if (ep.localTime) return new Date(ep.localTime);
  } catch { /* fallback */ }
  return new Date();
}

function computeStats(episodes: EpisodeDoc[]): Stats {
  const total = episodes.length;
  const avgSeverity = total > 0
    ? Math.round((episodes.reduce((s, e) => s + e.severity, 0) / total) * 10) / 10
    : 0;

  // Top triggers from questionnaire answers
  const triggerCounts: Record<string, number> = {};
  episodes.forEach((ep) => {
    if (!ep.questionnaire) return;
    Object.entries(ep.questionnaire).forEach(([key, value]) => {
      if (!value) return;
      const label = `${key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}: ${value}`;
      triggerCounts[label] = (triggerCounts[label] || 0) + 1;
    });
  });
  const topTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }));

  // Weather correlation
  let pressureFalling = 0;
  let pressureRising = 0;
  let pressureSteady = 0;
  let episodesWithWeather = 0;
  episodes.forEach((ep) => {
    if (!ep.weather) return;
    episodesWithWeather++;
    if (ep.weather.pressureTrend === 'falling') pressureFalling++;
    else if (ep.weather.pressureTrend === 'rising') pressureRising++;
    else pressureSteady++;
  });

  return { total, avgSeverity, topTriggers, pressureFalling, pressureRising, pressureSteady, episodesWithWeather };
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function generateHTML(episodes: EpisodeDoc[], stats: Stats, rangeLabel: string): string {
  const now = new Date();

  const severityColor = (sev: number) => {
    const colors = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#EF5350'];
    return colors[sev - 1] || '#999';
  };

  const episodeRows = episodes.map((ep) => {
    const d = getDateFromEpisode(ep);
    const symptoms = ep.symptoms?.join(', ') || '--';
    const pressure = ep.weather ? `${ep.weather.surfacePressureInHg} inHg` : '--';
    const trend = ep.weather?.pressureTrend || '--';
    const trendArrow = trend === 'falling' ? '&#8595;' : trend === 'rising' ? '&#8593;' : '&#8594;';
    const notes = ep.notes || '--';
    return `
      <tr>
        <td>${formatDateShort(d)}</td>
        <td>${formatTime(d)}</td>
        <td style="text-align:center;font-weight:700;color:${severityColor(ep.severity)}">${ep.severity}/5</td>
        <td>${symptoms}</td>
        <td>${pressure}</td>
        <td style="text-align:center">${trend !== '--' ? `${trendArrow} ${trend}` : '--'}</td>
        <td style="font-size:11px">${notes}</td>
      </tr>`;
  }).join('');

  const triggerRows = stats.topTriggers.map((t) => `
    <tr>
      <td>${t.label}</td>
      <td style="text-align:center;font-weight:600">${t.count}</td>
      <td style="text-align:center">${stats.total > 0 ? Math.round((t.count / stats.total) * 100) : 0}%</td>
    </tr>`
  ).join('');

  const pctFalling = stats.episodesWithWeather > 0 ? Math.round((stats.pressureFalling / stats.episodesWithWeather) * 100) : 0;
  const pctRising = stats.episodesWithWeather > 0 ? Math.round((stats.pressureRising / stats.episodesWithWeather) * 100) : 0;
  const pctSteady = stats.episodesWithWeather > 0 ? Math.round((stats.pressureSteady / stats.episodesWithWeather) * 100) : 0;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 32px; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 22px; color: #6C8EBF; margin-bottom: 4px; }
  h2 { font-size: 16px; color: #333; margin: 24px 0 10px; border-bottom: 2px solid #6C8EBF; padding-bottom: 4px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
  .summary-grid { display: flex; gap: 16px; margin-bottom: 8px; }
  .summary-box { flex: 1; background: #f5f7fa; border-radius: 8px; padding: 14px; text-align: center; border: 1px solid #e0e4ea; }
  .summary-box .value { font-size: 28px; font-weight: 700; color: #6C8EBF; }
  .summary-box .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #6C8EBF; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 6px; text-align: left; }
  td { padding: 7px 6px; border-bottom: 1px solid #e8e8e8; font-size: 12px; vertical-align: top; }
  tr:nth-child(even) { background: #fafafa; }
  .weather-grid { display: flex; gap: 12px; }
  .weather-box { flex: 1; background: #f5f7fa; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid #e0e4ea; }
  .weather-box .pct { font-size: 24px; font-weight: 700; }
  .weather-box .wlabel { font-size: 11px; color: #666; margin-top: 2px; }
  .falling { color: #EF5350; }
  .rising { color: #4CAF50; }
  .steady { color: #FFC107; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; color: #999; font-size: 11px; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>POTSense Episode Report</h1>
  <div class="subtitle">${rangeLabel} &mdash; Generated ${formatDateShort(now)}</div>

  <h2>Patient Summary</h2>
  <div class="summary-grid">
    <div class="summary-box">
      <div class="value">${stats.total}</div>
      <div class="label">Total Episodes</div>
    </div>
    <div class="summary-box">
      <div class="value">${stats.avgSeverity}</div>
      <div class="label">Avg Severity (1-5)</div>
    </div>
    <div class="summary-box">
      <div class="value">${stats.total > 0 && episodes.length > 1
        ? (Math.round((stats.total / ((getDateFromEpisode(episodes[0]).getTime() - getDateFromEpisode(episodes[episodes.length - 1]).getTime()) / (1000 * 60 * 60 * 24) || 1)) * 10) / 10)
        : stats.total}</div>
      <div class="label">Episodes / Day</div>
    </div>
  </div>

  <h2>Episode Log</h2>
  ${episodes.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Time</th>
        <th>Severity</th>
        <th>Symptoms</th>
        <th>Pressure</th>
        <th>Trend</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>${episodeRows}</tbody>
  </table>` : '<p style="color:#999">No episodes in this period.</p>'}

  ${stats.topTriggers.length > 0 ? `
  <h2>Top Triggers (Questionnaire Answers)</h2>
  <table>
    <thead>
      <tr><th>Trigger</th><th style="text-align:center">Count</th><th style="text-align:center">% of Episodes</th></tr>
    </thead>
    <tbody>${triggerRows}</tbody>
  </table>` : ''}

  ${stats.episodesWithWeather > 0 ? `
  <h2>Weather Correlation</h2>
  <p style="color:#666;font-size:12px;margin-bottom:10px">${stats.episodesWithWeather} of ${stats.total} episodes had weather data captured.</p>
  <div class="weather-grid">
    <div class="weather-box">
      <div class="pct falling">${pctFalling}%</div>
      <div class="wlabel">Pressure Falling</div>
    </div>
    <div class="weather-box">
      <div class="pct steady">${pctSteady}%</div>
      <div class="wlabel">Pressure Stable</div>
    </div>
    <div class="weather-box">
      <div class="pct rising">${pctRising}%</div>
      <div class="wlabel">Pressure Rising</div>
    </div>
  </div>` : ''}

  <div class="footer">Generated by POTSense &mdash; potsense.org</div>
</body>
</html>`;
}

export default function PDFExport() {
  const router = useRouter();
  const [range, setRange] = useState<RangeOption>('30');
  const [episodes, setEpisodes] = useState<EpisodeDoc[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchEpisodes = useCallback(async () => {
    const user = getCurrentUser();
    if (!user) return;

    setLoading(true);
    try {
      const ref = collection(db, 'patients', user.uid, 'episodes');
      let q;

      if (range !== 'all') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(range, 10));
        q = query(ref, where('timestamp', '>=', Timestamp.fromDate(cutoff)), orderBy('timestamp', 'desc'));
      } else {
        q = query(ref, orderBy('timestamp', 'desc'));
      }

      const snap = await getDocs(q);
      const docs: EpisodeDoc[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EpisodeDoc));
      setEpisodes(docs);
      setStats(computeStats(docs));
    } catch (err) {
      console.error('Failed to fetch episodes for PDF:', err);
      setEpisodes([]);
      setStats(computeStats([]));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const handleGenerate = async () => {
    if (!stats || episodes.length === 0) return;

    setGenerating(true);
    try {
      const rangeLabel = RANGE_OPTIONS.find((o) => o.key === range)?.label || 'Custom';
      const html = generateHTML(episodes, stats, rangeLabel);

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (Platform.OS === 'web') {
        // On web, open the PDF in a new tab
        await Print.printAsync({ html });
      } else {
        // On native, open share sheet
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share POTSense Report',
            UTI: 'com.adobe.pdf',
          });
        }
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
      if (Platform.OS === 'web') {
        window.alert('Failed to generate PDF. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const rangeLabel = RANGE_OPTIONS.find((o) => o.key === range)?.label || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Export Report</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Date Range Selector */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Date Range</Text>
          <View style={styles.rangeRow}>
            {RANGE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={[styles.rangeButton, range === opt.key && styles.rangeButtonActive]}
                onPress={() => setRange(opt.key)}
              >
                <Text style={[styles.rangeButtonText, range === opt.key && styles.rangeButtonTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Preview Stats */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading episodes...</Text>
          </View>
        ) : stats ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Summary Preview</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Episodes</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.avgSeverity}</Text>
                  <Text style={styles.statLabel}>Avg Severity</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {stats.total > 0 && episodes.length > 1
                      ? (Math.round((stats.total / ((getDateFromEpisode(episodes[0]).getTime() - getDateFromEpisode(episodes[episodes.length - 1]).getTime()) / (1000 * 60 * 60 * 24) || 1)) * 10) / 10)
                      : stats.total}
                  </Text>
                  <Text style={styles.statLabel}>Per Day</Text>
                </View>
              </View>
            </View>

            {/* Top Triggers Preview */}
            {stats.topTriggers.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Top Triggers</Text>
                {stats.topTriggers.slice(0, 5).map((t, i) => (
                  <View key={i} style={[styles.triggerRow, i < Math.min(stats.topTriggers.length, 5) - 1 && styles.triggerBorder]}>
                    <Text style={styles.triggerLabel} numberOfLines={1}>{t.label}</Text>
                    <Text style={styles.triggerCount}>{t.count}x</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Weather Correlation Preview */}
            {stats.episodesWithWeather > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Weather Correlation</Text>
                <Text style={styles.weatherNote}>
                  {stats.episodesWithWeather} of {stats.total} episodes with weather data
                </Text>
                <View style={styles.weatherRow}>
                  <View style={styles.weatherBox}>
                    <Text style={[styles.weatherPct, { color: Colors.red }]}>
                      {Math.round((stats.pressureFalling / stats.episodesWithWeather) * 100)}%
                    </Text>
                    <Text style={styles.weatherLabel}>Falling</Text>
                  </View>
                  <View style={styles.weatherBox}>
                    <Text style={[styles.weatherPct, { color: Colors.orange }]}>
                      {Math.round((stats.pressureSteady / stats.episodesWithWeather) * 100)}%
                    </Text>
                    <Text style={styles.weatherLabel}>Stable</Text>
                  </View>
                  <View style={styles.weatherBox}>
                    <Text style={[styles.weatherPct, { color: Colors.green }]}>
                      {Math.round((stats.pressureRising / stats.episodesWithWeather) * 100)}%
                    </Text>
                    <Text style={styles.weatherLabel}>Rising</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        ) : null}

        {/* Generate Button */}
        <Pressable
          style={[styles.generateButton, (loading || generating || !stats || stats.total === 0) && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={loading || generating || !stats || stats.total === 0}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="document-text" size={20} color="#fff" />
          )}
          <Text style={styles.generateButtonText}>
            {generating ? 'Generating PDF...' : stats?.total === 0 ? 'No Episodes to Export' : 'Generate PDF Report'}
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          This report is intended as supplemental information for your healthcare provider.
          POTSense is not a medical device and does not provide medical advice.
        </Text>
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
  content: { padding: 16, paddingBottom: 60 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Range selector
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
  },
  rangeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(108,142,191,0.15)',
  },
  rangeButtonText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  rangeButtonTextActive: { color: Colors.primary, fontWeight: '600' },

  // Loading
  loadingContainer: { alignItems: 'center', padding: 32 },
  loadingText: { color: Colors.textMuted, fontSize: 14, marginTop: 12 },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statValue: { color: Colors.primary, fontSize: 28, fontWeight: '700' },
  statLabel: { color: Colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  // Triggers
  triggerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  triggerBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  triggerLabel: { color: Colors.text, fontSize: 13, flex: 1, marginRight: 8 },
  triggerCount: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

  // Weather
  weatherNote: { color: Colors.textMuted, fontSize: 12, marginBottom: 10 },
  weatherRow: { flexDirection: 'row', justifyContent: 'space-around' },
  weatherBox: { alignItems: 'center' },
  weatherPct: { fontSize: 22, fontWeight: '700' },
  weatherLabel: { color: Colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  // Generate
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  generateButtonDisabled: { opacity: 0.5 },
  generateButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  disclaimer: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
});
