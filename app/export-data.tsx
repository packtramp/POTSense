import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, doc, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { Colors } from '@/constants/Colors';

function alert(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n${message}`);
  else require('react-native').Alert.alert(title, message);
}

export default function ExportData() {
  const router = useRouter();
  const user = getCurrentUser();
  const [episodeCount, setEpisodeCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDocs(collection(db, 'users', user.uid, 'episodes')),
      getDoc(doc(db, 'users', user.uid)),
    ]).then(([episodesSnap, userSnap]) => {
      setEpisodeCount(episodesSnap.size);
      if (userSnap.exists() && userSnap.data()?.premiumStatus === 'premium') setIsPremium(true);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);

    try {
      // Fetch user profile
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};

      // Fetch episodes (free: last 30 days only)
      const episodesRef = collection(db, 'users', user.uid, 'episodes');
      let episodesSnap;
      if (isPremium) {
        episodesSnap = await getDocs(episodesRef);
      } else {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        episodesSnap = await getDocs(query(episodesRef, where('timestamp', '>=', thirtyDaysAgo)));
      }
      const episodes = episodesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Fetch daily logs (free: last 30 days only)
      const logsRef = collection(db, 'users', user.uid, 'dailyLogs');
      let logsSnap;
      if (isPremium) {
        logsSnap = await getDocs(logsRef);
      } else {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        logsSnap = await getDocs(query(logsRef, where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0])));
      }
      const dailyLogs = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: {
          displayName: userData.displayName,
          email: userData.email,
          role: userData.role,
          createdAt: userData.createdAt,
          settings: userData.settings,
        },
        episodes,
        dailyLogs,
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      if (Platform.OS === 'web') {
        // Web: download as file
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `potsense-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Success', 'Data exported successfully!');
      } else {
        // Native: use expo-file-system + expo-sharing
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        const fileUri = FileSystem.documentDirectory + `potsense-export-${new Date().toISOString().split('T')[0]}.json`;
        await FileSystem.writeAsStringAsync(fileUri, jsonString);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
        } else {
          alert('Success', 'Data saved to: ' + fileUri);
        }
      }
    } catch (err: any) {
      alert('Error', err.message || 'Failed to export data.');
    }
    setExporting(false);
  };

  if (!user) { router.replace('/login'); return null; }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Export Data</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Info */}
      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <View style={styles.infoBlock}>
            <Ionicons name="download-outline" size={40} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.infoTitle}>{isPremium ? 'Export All Your Data' : 'Export Recent Data'}</Text>
            <Text style={styles.infoText}>
              {isPremium
                ? 'Download a complete copy of your POTSense data as a JSON file. This includes your profile, all episode logs, trigger responses, and daily tracker entries.'
                : 'Download your last 30 days of POTSense data as a JSON file. Upgrade to Premium for unlimited history export.'}
            </Text>
          </View>
        </View>
      </View>

      {/* Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA SUMMARY</Text>
        <View style={styles.sectionCard}>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="pulse-outline" size={20} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1 }]}>Episodes</Text>
            <Text style={styles.rowValue}>
              {loading ? '...' : episodeCount ?? 0}
            </Text>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1 }]}>Profile Data</Text>
            <Text style={styles.rowValue}>Included</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1 }]}>Daily Logs</Text>
            <Text style={styles.rowValue}>Included</Text>
          </View>
        </View>
      </View>

      {/* Export Button */}
      <Pressable
        style={[styles.exportButton, exporting && { opacity: 0.6 }]}
        onPress={handleExport}
        disabled={exporting}
      >
        {exporting ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : (
          <>
            <Ionicons name="download" size={20} color={Colors.text} />
            <Text style={styles.exportText}>Export as JSON</Text>
          </>
        )}
      </Pressable>

      {!isPremium && (
        <Pressable style={styles.upgradeRow} onPress={() => router.push('/subscription')}>
          <Ionicons name="lock-closed" size={16} color={Colors.primary} />
          <Text style={styles.upgradeText}>Upgrade to export all history</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </Pressable>
      )}

      <Text style={styles.hint}>
        Your data will be exported as a .json file that you can save, share, or provide to your healthcare team.
        {!isPremium ? ' Free accounts are limited to the last 30 days.' : ''}
      </Text>
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
  infoBlock: { padding: 20 },
  infoTitle: { color: Colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  infoText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { color: Colors.text, fontSize: 15 },
  rowValue: { color: Colors.textSecondary, fontSize: 15 },
  exportButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, marginBottom: 12,
  },
  exportText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  upgradeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 12, marginBottom: 12,
  },
  upgradeText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});
