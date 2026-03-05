import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { trendArrow } from '@/lib/weather';
import { Colors } from '@/constants/Colors';

const SEVERITY_EMOJI = ['', '😕', '😐', '😟', '😣', '😵'];

type Episode = {
  id: string;
  timestamp: Date;
  severity: number;
  symptoms: string[];
  notes: string | null;
  weather: any;
  loggedBy: string;
};

export default function LogScreen() {
  const router = useRouter();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const user = getCurrentUser();
      if (!user) return;

      const episodesRef = collection(db, 'patients', user.uid, 'episodes');
      getDocs(query(episodesRef, orderBy('timestamp', 'desc')))
        .then((snap) => {
          setEpisodes(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                timestamp: data.timestamp?.toDate?.() || new Date(data.localTime),
                severity: data.severity,
                symptoms: data.symptoms || [],
                notes: data.notes,
                weather: data.weather,
                loggedBy: data.loggedBy,
              };
            })
          );
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, [])
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Group episodes by date
  const grouped: { date: string; episodes: Episode[] }[] = [];
  let currentDate = '';
  for (const ep of episodes) {
    const dateStr = formatDate(ep.timestamp);
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      grouped.push({ date: dateStr, episodes: [] });
    }
    grouped[grouped.length - 1].episodes.push(ep);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading episodes...</Text>
      </View>
    );
  }

  if (episodes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyTitle}>No episodes yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap LOG EPISODE on the Home tab to record your first episode.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={grouped}
      keyExtractor={(item) => item.date}
      renderItem={({ item: group }) => (
        <View>
          <Text style={styles.dateHeader}>{group.date}</Text>
          {group.episodes.map((ep) => (
            <Pressable
              key={ep.id}
              style={({ pressed }) => [styles.episodeCard, pressed && { opacity: 0.7 }]}
              onPress={() => router.push({ pathname: '/episode-detail', params: { id: ep.id } })}
            >
              <View style={styles.episodeHeader}>
                <Text style={styles.episodeTime}>{formatTime(ep.timestamp)}</Text>
                <View style={styles.severityBadge}>
                  <Text style={styles.episodeSeverity}>
                    {SEVERITY_EMOJI[ep.severity]} Sev {ep.severity}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                </View>
              </View>
              {ep.weather && (
                <Text style={styles.episodeWeather}>
                  {ep.weather.surfacePressureInHg} inHg {trendArrow(ep.weather.pressureTrend)}  {ep.weather.temperatureF}°F
                </Text>
              )}
              {ep.symptoms.length > 0 && (
                <Text style={styles.episodeSymptoms}>
                  {ep.symptoms.join(' • ')}
                </Text>
              )}
              {ep.notes && (
                <Text style={styles.episodeNotes}>"{ep.notes}"</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 80 },
  loadingText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  dateHeader: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  episodeCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  episodeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  severityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  episodeTime: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  episodeSeverity: { color: Colors.textSecondary, fontSize: 14 },
  episodeWeather: { color: Colors.textMuted, fontSize: 13, marginBottom: 4 },
  episodeSymptoms: { color: Colors.orange, fontSize: 12, marginBottom: 4 },
  episodeNotes: { color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic' },
});
