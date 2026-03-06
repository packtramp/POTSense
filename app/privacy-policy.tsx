import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const SECTIONS = [
  {
    title: 'Data Collection',
    body: 'POTSense collects only the information you provide: your email address, display name, episode logs, daily tracker entries, and trigger responses. We do not collect data passively or use tracking cookies.',
  },
  {
    title: 'Location Data',
    body: 'Your device location is used solely to fetch local barometric pressure and weather data from the Open-Meteo API. Location data is not stored on our servers or shared with third parties. Pressure and weather readings are saved with your episode logs for correlation analysis.',
  },
  {
    title: 'Data Storage',
    body: 'Your data is stored securely in Google Firebase (Firestore) with authentication-based access controls. Only you (and any partners you explicitly link) can access your health data.',
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell, rent, or share your personal data with third parties. Your health information is yours. Partner accounts can only access your data if you explicitly grant them access via an invite code.',
  },
  {
    title: 'Data Export & Deletion',
    body: 'You can export all your data as JSON at any time from Settings > Export All Data. You can permanently delete your account and all associated data from Settings > Delete Account.',
  },
  {
    title: 'Analytics',
    body: 'We may collect anonymous, aggregated usage statistics (e.g., number of active users, feature usage counts) to improve the app. This data contains no personally identifiable information.',
  },
  {
    title: 'Changes to This Policy',
    body: 'We may update this privacy policy from time to time. Significant changes will be communicated through the app. Continued use of POTSense after changes constitutes acceptance of the updated policy.',
  },
  {
    title: 'Contact',
    body: 'If you have questions about this privacy policy or your data, please contact us through the feedback form in the app.',
  },
];

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.lastUpdated}>Last updated: March 2026</Text>

      <View style={styles.sectionCard}>
        {SECTIONS.map((s, i) => (
          <View key={s.title} style={[styles.block, i < SECTIONS.length - 1 && styles.blockBorder]}>
            <Text style={styles.blockTitle}>{s.title}</Text>
            <Text style={styles.blockBody}>{s.body}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  lastUpdated: { color: Colors.textMuted, fontSize: 12, marginBottom: 16, marginLeft: 4 },
  sectionCard: { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  block: { padding: 14 },
  blockBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  blockTitle: { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  blockBody: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
