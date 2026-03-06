import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { APP_VERSION } from '@/constants/version';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* App Info */}
      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <Ionicons name="pulse" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.appName}>POTSense</Text>
        <Text style={styles.version}>Version {APP_VERSION}</Text>
        <Text style={styles.tagline}>Built for the POTS community</Text>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <View style={styles.descBlock}>
            <Text style={styles.descText}>
              POTSense helps people with Postural Orthostatic Tachycardia Syndrome track episodes, identify triggers, and share data with their healthcare providers.
            </Text>
            <Text style={[styles.descText, { marginTop: 10 }]}>
              Track barometric pressure changes, log symptoms with our swipe questionnaire, and discover patterns in your condition over time.
            </Text>
          </View>
        </View>
      </View>

      {/* Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LINKS</Text>
        <View style={styles.sectionCard}>
          <Pressable
            style={[styles.row, styles.rowBorder]}
            onPress={() => Linking.openURL('https://potsense.org')}
          >
            <Ionicons name="globe-outline" size={20} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1 }]}>potsense.org</Text>
            <Ionicons name="open-outline" size={16} color={Colors.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.row, styles.rowBorder]}
            onPress={() => router.push('/privacy-policy')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1 }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
          <Pressable
            style={styles.row}
            onPress={() => router.push('/terms')}
          >
            <Ionicons name="document-outline" size={20} color={Colors.textSecondary} />
            <Text style={[styles.rowLabel, { flex: 1 }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        POTSense is not a medical device and does not provide medical advice. Always consult your healthcare provider for medical decisions.
      </Text>
      <Text style={styles.copyright}>
        {'\u00A9'} {new Date().getFullYear()} POTSense. All rights reserved.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },

  logoSection: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(108,142,191,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  appName: { color: Colors.text, fontSize: 24, fontWeight: '700' },
  version: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  tagline: { color: Colors.primary, fontSize: 14, marginTop: 6, fontWeight: '500' },

  section: { marginBottom: 24 },
  sectionTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  descBlock: { padding: 14 },
  descText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },

  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { color: Colors.text, fontSize: 15 },

  disclaimer: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 8 },
  copyright: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12 },
});
