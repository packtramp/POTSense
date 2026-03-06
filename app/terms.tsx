import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: 'By using POTSense, you agree to these Terms of Service. If you do not agree, please do not use the app.',
  },
  {
    title: 'Not Medical Advice',
    body: 'POTSense is a health tracking tool, NOT a medical device. It does not provide medical advice, diagnosis, or treatment recommendations. The information displayed (including barometric pressure data, symptom patterns, and trend analysis) is for informational and personal tracking purposes only. Always consult a qualified healthcare provider for medical decisions.',
  },
  {
    title: 'Use at Your Own Risk',
    body: 'You use POTSense at your own risk. We make no guarantees about the accuracy of barometric pressure data, weather information, or any correlations displayed. Do not make medical decisions based solely on information from this app.',
  },
  {
    title: 'Account Responsibility',
    body: 'You are responsible for maintaining the security of your account credentials. You are responsible for all activity that occurs under your account. Notify us immediately if you suspect unauthorized access.',
  },
  {
    title: 'Partner Accounts',
    body: 'When you invite a partner to access your data, you grant them permission to view your episode logs, daily tracker entries, and trigger responses. You can revoke partner access at any time from your settings.',
  },
  {
    title: 'Data Accuracy',
    body: 'While we strive for accuracy, POTSense relies on third-party APIs for weather and pressure data. We are not responsible for inaccuracies in this data. Episode logs and trigger responses reflect what you enter and are only as accurate as the information you provide.',
  },
  {
    title: 'Service Availability',
    body: 'We aim to keep POTSense available at all times but cannot guarantee uninterrupted service. We may perform maintenance, updates, or changes that temporarily affect availability.',
  },
  {
    title: 'Termination',
    body: 'We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior. You may delete your account at any time from the app settings.',
  },
  {
    title: 'Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of POTSense after changes constitutes acceptance of the updated terms.',
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
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
