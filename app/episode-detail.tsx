import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { trendArrow } from '@/lib/weather';
import { Colors } from '@/constants/Colors';

const SEVERITY = [
  { value: 1, emoji: '😕', label: 'Mild' },
  { value: 2, emoji: '😐', label: 'Low' },
  { value: 3, emoji: '😟', label: 'Moderate' },
  { value: 4, emoji: '😣', label: 'Severe' },
  { value: 5, emoji: '😵', label: 'Worst' },
];

type EpisodeData = {
  severity: number;
  symptoms: string[];
  notes: string | null;
  localTime: string;
  timestamp: { toDate: () => Date } | null;
  weather: {
    surfacePressureInHg: number;
    pressureTrend: 'rising' | 'falling' | 'steady';
    temperatureF: number;
    humidity: number;
  } | null;
  questionnaire: Record<string, string> | null;
};

export default function EpisodeDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [episode, setEpisode] = useState<EpisodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchEpisode = async () => {
      const user = getCurrentUser();
      if (!user || !id) return;

      try {
        const snap = await getDoc(doc(db, 'patients', user.uid, 'episodes', id));
        if (snap.exists()) {
          setEpisode(snap.data() as EpisodeData);
        }
      } catch (err) {
        console.error('Failed to fetch episode:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisode();
  }, [id]);

  const handleDelete = () => {
    const doDelete = async () => {
      const user = getCurrentUser();
      if (!user || !id) return;

      setDeleting(true);
      try {
        await deleteDoc(doc(db, 'patients', user.uid, 'episodes', id));
        router.back();
      } catch (err) {
        console.error('Failed to delete episode:', err);
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Delete this episode? This cannot be undone.');
      if (confirmed) doDelete();
    } else {
      Alert.alert(
        'Delete Episode',
        'Delete this episode? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const formatDate = (ep: EpisodeData): string => {
    try {
      const date = ep.timestamp?.toDate?.() ?? new Date(ep.localTime);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' at ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return ep.localTime || 'Unknown';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!episode) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Episode not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const sev = SEVERITY[episode.severity - 1] || SEVERITY[2];
  const sevColor = Colors.severity[episode.severity - 1] || Colors.severity[2];
  const questionnaireEntries = episode.questionnaire
    ? Object.entries(episode.questionnaire).filter(([, v]) => v)
    : [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Episode Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Severity Card */}
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: sevColor }]}>
          <Text style={styles.cardLabel}>Severity</Text>
          <View style={styles.severityDisplay}>
            <Text style={styles.severityEmoji}>{sev.emoji}</Text>
            <View>
              <Text style={[styles.severityValue, { color: sevColor }]}>
                {episode.severity} / 5
              </Text>
              <Text style={styles.severityLabel}>{sev.label}</Text>
            </View>
          </View>
        </View>

        {/* Date/Time Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Date & Time</Text>
          <Text style={styles.cardValue}>{formatDate(episode)}</Text>
        </View>

        {/* Weather Card */}
        {episode.weather && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Weather at Time of Episode</Text>
            <View style={styles.weatherRow}>
              <View style={styles.weatherItem}>
                <Text style={styles.weatherIcon}>🌡️</Text>
                <Text style={styles.weatherValue}>
                  {episode.weather.surfacePressureInHg} inHg
                </Text>
                <Text style={styles.weatherTrend}>
                  {trendArrow(episode.weather.pressureTrend)} {episode.weather.pressureTrend}
                </Text>
              </View>
              <View style={styles.weatherItem}>
                <Text style={styles.weatherIcon}>🌡</Text>
                <Text style={styles.weatherValue}>{episode.weather.temperatureF}°F</Text>
              </View>
              <View style={styles.weatherItem}>
                <Text style={styles.weatherIcon}>💧</Text>
                <Text style={styles.weatherValue}>{episode.weather.humidity}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Symptoms Card */}
        {episode.symptoms && episode.symptoms.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Symptoms</Text>
            <View style={styles.chipContainer}>
              {episode.symptoms.map((symptom) => (
                <View key={symptom} style={styles.chip}>
                  <Text style={styles.chipText}>{symptom}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes Card */}
        {episode.notes && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Notes</Text>
            <Text style={styles.notesText}>{episode.notes}</Text>
          </View>
        )}

        {/* Questionnaire Card */}
        {questionnaireEntries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Quick Check Answers</Text>
            {questionnaireEntries.map(([key, value]) => (
              <View key={key} style={styles.questionRow}>
                <Text style={styles.questionKey}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
                <Text style={styles.questionValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Delete Button */}
        <Pressable
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.red} />
          <Text style={styles.deleteButtonText}>
            {deleting ? 'Deleting...' : 'Delete Episode'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.textSecondary, fontSize: 16, marginBottom: 16 },
  backLink: { paddingVertical: 8, paddingHorizontal: 16 },
  backLinkText: { color: Colors.primary, fontSize: 15 },

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
    marginBottom: 8,
  },
  cardValue: { color: Colors.text, fontSize: 15 },

  // Severity
  severityDisplay: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  severityEmoji: { fontSize: 36 },
  severityValue: { fontSize: 20, fontWeight: '700' },
  severityLabel: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },

  // Weather
  weatherRow: { flexDirection: 'row', justifyContent: 'space-around' },
  weatherItem: { alignItems: 'center', gap: 4 },
  weatherIcon: { fontSize: 20 },
  weatherValue: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  weatherTrend: { color: Colors.textSecondary, fontSize: 12 },

  // Chips
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.orangeBg,
    borderWidth: 1,
    borderColor: Colors.orange,
  },
  chipText: { color: Colors.orange, fontSize: 13, fontWeight: '600' },

  // Notes
  notesText: { color: Colors.text, fontSize: 14, lineHeight: 20 },

  // Questionnaire
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  questionKey: { color: Colors.textSecondary, fontSize: 13, flex: 1 },
  questionValue: { color: Colors.text, fontSize: 13, fontWeight: '600' },

  // Delete
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.red,
    backgroundColor: 'rgba(239,83,80,0.1)',
  },
  deleteButtonText: { color: Colors.red, fontSize: 15, fontWeight: '600' },
  deleteButtonDisabled: { opacity: 0.5 },
});
