import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { Colors } from '@/constants/Colors';

const FREE_FEATURES = [
  'Unlimited episode logging',
  'Trigger tracking (core triggers)',
  '5 daily trackers',
  '30-day history',
  'News feed',
  '30-day episode PDF report',
  'JSON data export',
];

const PREMIUM_FEATURES = [
  'All triggers + follow-up questions',
  'Custom daily trackers',
  'Unlimited history + calendar view',
  'Partner accounts (share with caregivers)',
  'Barometric pressure alerts',
  'Trends & correlation analysis',
  'Custom PDF reports',
  'CSV data export',
  'Trigger customization',
  'Weekly email summary',
  'Priority support',
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const user = getCurrentUser();
  const [plan, setPlan] = useState<'free' | 'premium'>('free');

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists() && snap.data().premiumStatus === 'premium') {
        setPlan('premium');
      }
    }).catch(() => {});
  }, []);

  if (!user) { router.replace('/login'); return null; }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Current Plan */}
      <View style={styles.planCard}>
        <View style={[styles.planBadge, plan === 'premium' && styles.planBadgePremium]}>
          <Text style={[styles.planBadgeText, plan === 'premium' && styles.planBadgeTextPremium]}>
            {plan === 'premium' ? 'PREMIUM' : 'FREE'}
          </Text>
        </View>
        <Text style={styles.planTitle}>
          {plan === 'premium' ? 'POTSense Premium' : 'POTSense Free'}
        </Text>
        <Text style={styles.planDesc}>
          {plan === 'premium'
            ? 'You have full access to all features.'
            : 'Upgrade to unlock all features and support development.'}
        </Text>
      </View>

      {/* Free Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FREE INCLUDES</Text>
        <View style={styles.sectionCard}>
          {FREE_FEATURES.map((f, i) => (
            <View key={f} style={[styles.featureRow, i < FREE_FEATURES.length - 1 && styles.rowBorder]}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Premium Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PREMIUM ADDS</Text>
        <View style={styles.sectionCard}>
          {PREMIUM_FEATURES.map((f, i) => (
            <View key={f} style={[styles.featureRow, i < PREMIUM_FEATURES.length - 1 && styles.rowBorder]}>
              <Ionicons name="star" size={18} color={Colors.premium} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Pricing */}
      <View style={styles.pricingCard}>
        <Text style={styles.pricingTitle}>Premium Pricing</Text>
        <View style={styles.pricingRow}>
          <View style={styles.priceBox}>
            <Text style={styles.priceAmount}>$4.99</Text>
            <Text style={styles.pricePeriod}>/ month</Text>
          </View>
          <View style={[styles.priceBox, styles.priceBoxHighlight]}>
            <Text style={styles.priceAmount}>$39.99</Text>
            <Text style={styles.pricePeriod}>/ year</Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 33%</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Coming Soon Button */}
      <View style={styles.comingSoonButton}>
        <Ionicons name="time-outline" size={20} color={Colors.textMuted} />
        <Text style={styles.comingSoonText}>Subscriptions Coming Soon</Text>
      </View>

      <Text style={styles.hint}>
        Premium subscriptions will be available soon. All premium features are free during beta! Your support helps us keep building for the POTS community.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },

  planCard: {
    backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 20, alignItems: 'center', marginBottom: 24,
  },
  planBadge: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8,
    backgroundColor: Colors.surfaceLight, marginBottom: 10,
  },
  planBadgePremium: { backgroundColor: 'rgba(255,215,0,0.15)' },
  planBadgeText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  planBadgeTextPremium: { color: Colors.premium },
  planTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  planDesc: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },

  section: { marginBottom: 24 },
  sectionTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  featureText: { color: Colors.text, fontSize: 14, flex: 1 },

  pricingCard: {
    backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 16,
  },
  pricingTitle: { color: Colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  pricingRow: { flexDirection: 'row', gap: 10 },
  priceBox: {
    flex: 1, alignItems: 'center', padding: 14, borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
  },
  priceBoxHighlight: {
    borderWidth: 1, borderColor: Colors.premium,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  priceAmount: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  pricePeriod: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  saveBadge: {
    marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  saveBadgeText: { color: Colors.premium, fontSize: 11, fontWeight: '600' },

  comingSoonButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.surfaceLight, borderRadius: 12, paddingVertical: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  comingSoonText: { color: Colors.textMuted, fontSize: 15, fontWeight: '500' },

  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
});
