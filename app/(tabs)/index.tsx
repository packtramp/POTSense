import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs, where, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { getWeatherForCurrentLocation, WeatherData, trendArrow, weatherDescription } from '@/lib/weather';
import { getUserReferralCode } from '@/lib/referrals';
import { Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { getEnabledTrackers, DailyTracker } from '@/constants/dailyTrackers';

function getShareText(refCode: string | null) {
  const url = refCode ? `www.POTSense.org/?ref=${refCode}` : 'www.POTSense.org';
  return `Found this great POTS app to help track dysautonomia episodes and triggers! Check it out at ${url}`;
}

function getShareUrl(refCode: string | null) {
  return refCode ? `https://www.potsense.org/?ref=${refCode}` : 'https://www.potsense.org';
}

function getAllShareLinks(refCode: string | null) {
  const shareText = getShareText(refCode);
  const shareUrl = getShareUrl(refCode);

  return [
    {
      key: 'facebook',
      label: 'Facebook',
      icon: 'logo-facebook' as const,
      color: '#1877F2',
      onPress: async () => {
        try { await Clipboard.setStringAsync(shareText); } catch {}
        if (Platform.OS === 'web') {
          window.alert('Share text copied! Paste it in your Facebook post.');
        } else {
          Alert.alert('Copied!', 'Share text copied! Paste it in your Facebook post.');
        }
        Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
      },
    },
    {
      key: 'sms',
      label: 'Text',
      icon: 'chatbubble-outline' as const,
      color: '#448AFF',
      onPress: () => Linking.openURL(`sms:?body=${encodeURIComponent(shareText)}`),
    },
    {
      key: 'mail',
      label: 'Email',
      icon: 'mail' as const,
      color: '#4FC3F7',
      onPress: () => Linking.openURL(`mailto:?subject=${encodeURIComponent('Check out POTSense!')}&body=${encodeURIComponent(shareText)}`),
    },
    {
      key: 'x',
      label: 'X / Twitter',
      icon: 'logo-twitter' as const,
      color: '#fff',
      onPress: () => Linking.openURL(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`),
    },
    {
      key: 'instagram',
      label: 'Instagram',
      icon: 'logo-instagram' as const,
      color: '#E4405F',
      onPress: async () => {
        try { await Clipboard.setStringAsync(shareText); } catch {}
        if (Platform.OS === 'web') {
          window.alert('Share text copied to clipboard! Opening Instagram — paste it in your post or story.');
        } else {
          Alert.alert('Copied!', 'Share text copied to clipboard. Opening Instagram — paste it in your post or story.');
        }
        Linking.openURL('https://www.instagram.com/');
      },
    },
    {
      key: 'reddit',
      label: 'Reddit',
      icon: 'logo-reddit' as const,
      color: '#FF4500',
      onPress: () => Linking.openURL(`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`),
    },
    {
      key: 'copy',
      label: 'Copy Link',
      icon: 'copy' as const,
      color: '#A0A0A0',
      onPress: async () => {
        try { await Clipboard.setStringAsync(shareText); } catch {}
        if (Platform.OS === 'web') {
          window.alert('Share text copied to clipboard!');
        } else {
          Alert.alert('Copied!', 'Share text copied to clipboard.');
        }
      },
    },
  ];
}

const PRIMARY_SHARE_KEYS = ['facebook', 'sms', 'mail'];

// Daily trackers are now loaded from constants/dailyTrackers.ts
// Filtered by user settings (disabled keys) and premium status

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [lastEpisode, setLastEpisode] = useState<string>('--');
  const [trackerValues, setTrackerValues] = useState<Record<string, string>>({});
  const [refCode, setRefCode] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disabledTrackers, setDisabledTrackers] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [betaBannerDismissed, setBetaBannerDismissed] = useState(true); // default hidden until loaded

  const loadData = useCallback(() => {
    const user = getCurrentUser();
    if (!user) return;

    const episodesRef = collection(db, 'patients', user.uid, 'episodes');

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const weekTs = Timestamp.fromDate(startOfWeek);

    getDocs(query(episodesRef, where('timestamp', '>=', weekTs), orderBy('timestamp', 'desc')))
      .then((snap) => {
        setWeekCount(snap.size);
        const todayEps = snap.docs.filter((d) => {
          const ts = d.data().timestamp?.toDate?.();
          return ts && ts >= startOfToday;
        });
        setTodayCount(todayEps.length);
      })
      .catch(() => {});

    getDocs(query(episodesRef, orderBy('timestamp', 'desc'), limit(1)))
      .then((snap) => {
        if (snap.empty) { setLastEpisode('--'); return; }
        const ts = snap.docs[0].data().timestamp?.toDate?.();
        if (!ts) { setLastEpisode('--'); return; }
        const diff = Date.now() - ts.getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor(diff / 60000);
        if (mins < 2) setLastEpisode('Just now');
        else if (mins < 60) setLastEpisode(`${mins}m ago`);
        else if (hours < 24) setLastEpisode(`${hours}h ago`);
        else setLastEpisode(`${Math.floor(hours / 24)}d ago`);
      })
      .catch(() => {});

    const todayKey = getTodayKey();
    getDoc(doc(db, 'patients', user.uid, 'dailyLogs', todayKey))
      .then((snap) => {
        if (snap.exists()) {
          setTrackerValues(snap.data().trackers || {});
        } else {
          setTrackerValues({});
        }
      })
      .catch(() => {});

    // Load user settings (disabled trackers + premium)
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setDisabledTrackers(data.settings?.disabledTrackers || []);
          setIsPremium(data.premiumStatus === 'premium');
        }
      })
      .catch(() => {});
  }, []);

  // Fetch weather + referral code + beta banner state on mount
  useEffect(() => {
    getWeatherForCurrentLocation().then((w) => {
      setWeather(w);
      setWeatherLoading(false);
    });
    const user = getCurrentUser();
    if (user) {
      getUserReferralCode(user.uid).then(setRefCode).catch(() => {});
    }
    AsyncStorage.getItem('betaBannerDismissed').then((val) => {
      setBetaBannerDismissed(val === 'true');
    }).catch(() => setBetaBannerDismissed(false));
  }, []);

  // Refresh episode stats + daily log when tab is focused
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Refresh weather + data
    getWeatherForCurrentLocation().then((w) => {
      if (w) setWeather(w);
    });
    loadData();
    setTimeout(() => setRefreshing(false), 1000);
  }, [loadData]);

  const dismissBetaBanner = () => {
    setBetaBannerDismissed(true);
    AsyncStorage.setItem('betaBannerDismissed', 'true').catch(() => {});
  };

  const activeTrackers = getEnabledTrackers(disabledTrackers, isPremium);

  const cycleTracker = (tracker: DailyTracker) => {
    const currentVal = trackerValues[tracker.key] || '--';
    const currentIdx = tracker.levels.indexOf(currentVal);
    const nextIdx = (currentIdx + 1) % tracker.levels.length;
    const nextVal = tracker.levels[nextIdx];

    const newValues = { ...trackerValues, [tracker.key]: nextVal };
    setTrackerValues(newValues);

    // Save to Firestore
    const user = getCurrentUser();
    if (!user) return;
    const todayKey = getTodayKey();
    setDoc(
      doc(db, 'patients', user.uid, 'dailyLogs', todayKey),
      { trackers: newValues, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch(() => {});
  };

  const getTrackerColor = (value: string) => {
    if (value === '--') return Colors.textMuted;
    if (['Low', 'Bad', 'No', 'Poor', 'None', 'Short', '0'].includes(value)) return Colors.orange;
    if (['High', 'Good', 'Yes', 'Hard', 'Long', '3+', '2+'].includes(value)) return Colors.green;
    return Colors.primary; // Med, OK, Mild, Light, 1, 2, etc.
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
    >
      {/* Beta Banner */}
      {!betaBannerDismissed && (
        <View style={styles.betaBanner}>
          <View style={styles.betaBannerContent}>
            <Text style={styles.betaBannerBadge}>BETA</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.betaBannerTitle}>Early Access — Free During Beta</Text>
              <Text style={styles.betaBannerText}>
                All premium features are free during beta! Once we officially launch, premium features will require a subscription.
              </Text>
            </View>
            <Pressable onPress={dismissBetaBanner} hitSlop={12}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Weather Card */}
      <View style={styles.weatherCard}>
        <Text style={styles.weatherTitle}>🌡️ Current Conditions</Text>
        {weatherLoading ? (
          <Text style={styles.weatherPressure}>Loading...</Text>
        ) : weather ? (
          <>
            <Text style={styles.weatherPressure}>
              {weather.surfacePressureInHg} inHg {trendArrow(weather.pressureTrend)}
            </Text>
            <Text style={styles.weatherDetail}>
              {weather.temperatureF}°F   {weather.humidity}% humidity
            </Text>
            <Text style={styles.weatherDetail}>
              {weatherDescription(weather.weatherCode)}   Wind: {Math.round(weather.windSpeed)} km/h
            </Text>
            {weather.pressureTrend === 'falling' && weather.pressureChange3h < -3 && (
              <Text style={styles.weatherWarning}>
                ⚠️ Pressure falling fast ({weather.pressureChange3h} hPa in 3h)
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.weatherPressure}>-- inHg</Text>
            <Text style={styles.weatherNote}>Allow location access for weather data</Text>
          </>
        )}
      </View>

      {/* Share / Community */}
      <Text style={styles.shareLabel}>Share POTSense</Text>
      <View style={styles.socialRow}>
        {getAllShareLinks(refCode)
          .filter((s) => PRIMARY_SHARE_KEYS.includes(s.key))
          .map((s) => (
            <Pressable
              key={s.key}
              style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.7 }]}
              onPress={s.onPress}
            >
              <Ionicons name={s.icon} size={22} color={s.color} />
            </Pressable>
          ))}
        <Pressable
          style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.7 }]}
          onPress={() => setShareOpen(true)}
        >
          <Ionicons name="share-social-outline" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Share Modal */}
      <Modal visible={shareOpen} transparent animationType="fade" onRequestClose={() => setShareOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShareOpen(false)}>
          <View style={styles.shareSheet}>
            <Text style={styles.shareSheetTitle}>Share via</Text>
            {getAllShareLinks(refCode).map((s) => (
              <Pressable
                key={s.key}
                style={({ pressed }) => [styles.shareSheetRow, pressed && { backgroundColor: Colors.border }]}
                onPress={() => { setShareOpen(false); s.onPress(); }}
              >
                <Ionicons name={s.icon} size={22} color={s.color} />
                <Text style={styles.shareSheetLabel}>{s.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.shareSheetCancel} onPress={() => setShareOpen(false)}>
              <Text style={styles.shareSheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Daily Trackers */}
      <Text style={styles.sectionTitle}>Today's Tracking</Text>
      <View style={styles.trackerRow}>
        {activeTrackers.map((t) => {
          const val = trackerValues[t.key] || '--';
          const color = getTrackerColor(val);
          return (
            <Pressable
              key={t.key}
              style={[styles.trackerItem, val !== '--' && { borderColor: color }]}
              onPress={() => cycleTracker(t)}
            >
              <Text style={styles.trackerEmoji}>{t.emoji}</Text>
              <Text style={styles.trackerLabel}>{t.label}</Text>
              <Text style={[styles.trackerValue, { color }]}>{val}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* LOG EPISODE Button */}
      <Pressable
        style={({ pressed }) => [styles.logButton, pressed && styles.logButtonPressed]}
        onPress={() => router.push('/episode-modal')}
      >
        <Ionicons name="add-circle" size={28} color={Colors.text} />
        <Text style={styles.logButtonText}>LOG EPISODE</Text>
      </Pressable>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{todayCount}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{weekCount}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{lastEpisode}</Text>
          <Text style={styles.statLabel}>Last Episode</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 80 },

  weatherCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weatherTitle: { color: Colors.textSecondary, fontSize: 13, marginBottom: 8 },
  weatherPressure: { color: Colors.text, fontSize: 28, fontWeight: '700' },
  weatherDetail: { color: Colors.textSecondary, fontSize: 15, marginTop: 4 },
  weatherNote: { color: Colors.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  weatherWarning: { color: Colors.orange, fontSize: 13, fontWeight: '600', marginTop: 8 },

  shareLabel: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 8 },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  trackerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  trackerItem: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 10,
    flex: 1,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trackerEmoji: { fontSize: 24, marginBottom: 4 },
  trackerLabel: { color: Colors.textSecondary, fontSize: 11 },
  trackerValue: { color: Colors.textMuted, fontSize: 12, marginTop: 2, fontWeight: '600' },

  logButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  logButtonPressed: { opacity: 0.85 },
  logButtonText: { color: Colors.text, fontSize: 20, fontWeight: '700', letterSpacing: 1 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.border },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  shareSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  shareSheetTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  shareSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  shareSheetLabel: { color: Colors.text, fontSize: 15 },
  shareSheetCancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  shareSheetCancelText: { color: Colors.textMuted, fontSize: 15 },

  // Beta banner
  betaBanner: {
    backgroundColor: 'rgba(74,144,226,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,144,226,0.25)',
    padding: 14,
    marginBottom: 16,
  },
  betaBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  betaBannerBadge: {
    backgroundColor: Colors.primary,
    color: Colors.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  betaBannerTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  betaBannerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
