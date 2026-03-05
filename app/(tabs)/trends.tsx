import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function TrendsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.teaser}>
        <Ionicons name="trending-up" size={48} color={Colors.primary} />
        <Text style={styles.title}>Your insights are waiting...</Text>
        <Text style={styles.subtitle}>
          Log a few episodes and your personal trigger analysis will appear here.
        </Text>
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>After 5+ episodes you'll see:</Text>
          <Text style={styles.previewItem}>📊 Episode frequency charts</Text>
          <Text style={styles.previewItem}>🌡️ Pressure correlation stats</Text>
          <Text style={styles.previewItem}>📋 Top trigger analysis</Text>
          <Text style={styles.previewItem}>⏰ Time-of-day patterns</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  teaser: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: { color: Colors.text, fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  previewCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewLabel: { color: Colors.textSecondary, fontSize: 13, marginBottom: 12 },
  previewItem: { color: Colors.text, fontSize: 14, paddingVertical: 6 },
});
