import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '@/lib/auth';
import { Colors } from '@/constants/Colors';

type FeedbackType = 'Feature Request' | 'Bug Report';

export default function FeedbackModal() {
  const router = useRouter();
  const user = getCurrentUser();
  const [type, setType] = useState<FeedbackType>('Feature Request');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: user.email,
          displayName: user.displayName || 'Unknown',
          uid: user.uid,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      setSubmitted(true);
      setTimeout(() => router.back(), 2000);
    } catch (err) {
      console.error('Feedback submit failed:', err);
      if (Platform.OS === 'web') {
        window.alert('Failed to send feedback. Please try again.');
      } else {
        const { Alert } = require('react-native');
        Alert.alert('Error', 'Failed to send feedback. Please try again.');
      }
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.green} />
          <Text style={styles.successText}>Thanks for your feedback!</Text>
          <Text style={styles.successDetail}>We'll review it shortly.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Send Feedback</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {/* Type Toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleButton, type === 'Feature Request' && styles.toggleActive]}
            onPress={() => setType('Feature Request')}
          >
            <Ionicons
              name="bulb-outline"
              size={18}
              color={type === 'Feature Request' ? Colors.text : Colors.textMuted}
            />
            <Text style={[styles.toggleText, type === 'Feature Request' && styles.toggleTextActive]}>
              Feature Request
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, type === 'Bug Report' && styles.toggleActive]}
            onPress={() => setType('Bug Report')}
          >
            <Ionicons
              name="bug-outline"
              size={18}
              color={type === 'Bug Report' ? Colors.text : Colors.textMuted}
            />
            <Text style={[styles.toggleText, type === 'Bug Report' && styles.toggleTextActive]}>
              Bug Report
            </Text>
          </Pressable>
        </View>

        {/* From */}
        <Text style={styles.fromLabel}>From: {user?.email || 'Unknown'}</Text>

        {/* Message Input */}
        <TextInput
          style={styles.textArea}
          placeholder="Describe your idea or issue..."
          placeholderTextColor={Colors.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, (!message.trim() || submitting) && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!message.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={Colors.text} />
              <Text style={styles.submitText}>Submit</Text>
            </>
          )}
        </Pressable>
      </View>
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

  content: { padding: 16, gap: 16 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  toggleActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(108,142,191,0.15)',
  },
  toggleText: { color: Colors.textMuted, fontSize: 14, fontWeight: '500' },
  toggleTextActive: { color: Colors.text },

  fromLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginLeft: 4,
  },

  textArea: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    minHeight: 180,
    lineHeight: 22,
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: Colors.text, fontSize: 16, fontWeight: '600' },

  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  successText: { color: Colors.text, fontSize: 20, fontWeight: '600' },
  successDetail: { color: Colors.textSecondary, fontSize: 14 },
});
