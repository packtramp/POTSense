import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '@/lib/auth';
import { Colors } from '@/constants/Colors';

type FeedbackType = 'feature' | 'bug';

const PAGES = [
  'Home', 'Episode Log', 'History', 'Trends', 'Daily Trackers',
  'Triggers', 'Settings', 'PDF Export', 'News Feed', 'Other',
];

export default function FeedbackScreen() {
  const router = useRouter();
  const user = getCurrentUser();
  const [type, setType] = useState<FeedbackType>('feature');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Shared
  const [page, setPage] = useState('');
  const [title, setTitle] = useState('');

  // Bug fields
  const [whatHappened, setWhatHappened] = useState('');
  const [expected, setExpected] = useState('');
  const [steps, setSteps] = useState('');

  // Feature fields
  const [description, setDescription] = useState('');
  const [whyUseful, setWhyUseful] = useState('');

  const canSubmit = type === 'bug'
    ? title.trim() && whatHappened.trim()
    : title.trim() && description.trim();

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);

    try {
      const body = type === 'bug'
        ? {
            type: 'Bug Report',
            title: title.trim(),
            page: page || 'Not specified',
            whatHappened: whatHappened.trim(),
            expected: expected.trim(),
            steps: steps.trim(),
            email: user.email,
            displayName: user.displayName || 'Unknown',
            uid: user.uid,
          }
        : {
            type: 'Feature Request',
            title: title.trim(),
            page: page || 'Not specified',
            description: description.trim(),
            whyUseful: whyUseful.trim(),
            email: user.email,
            displayName: user.displayName || 'Unknown',
            uid: user.uid,
          };

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed');

      setSubmitted(true);
      setTimeout(() => router.back(), 2500);
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
          <Text style={styles.successDetail}>
            {type === 'bug' ? "We'll investigate this issue." : "We'll consider this for a future update."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Send Feedback</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Type Toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleButton, type === 'feature' && styles.toggleActive]}
            onPress={() => setType('feature')}
          >
            <Ionicons name="bulb-outline" size={18} color={type === 'feature' ? Colors.text : Colors.textMuted} />
            <Text style={[styles.toggleText, type === 'feature' && styles.toggleTextActive]}>Feature</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, type === 'bug' && styles.toggleActiveBug]}
            onPress={() => setType('bug')}
          >
            <Ionicons name="bug-outline" size={18} color={type === 'bug' ? Colors.text : Colors.textMuted} />
            <Text style={[styles.toggleText, type === 'bug' && styles.toggleTextActive]}>Bug</Text>
          </Pressable>
        </View>

        {/* From */}
        <Text style={styles.fromLabel}>From: {user?.email || 'Unknown'}</Text>

        {/* Title */}
        <View>
          <Text style={styles.fieldLabel}>
            {type === 'bug' ? 'Bug title *' : 'Feature title *'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={type === 'bug' ? 'Brief description of the issue' : 'What feature would you like?'}
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Page selector */}
        <View>
          <Text style={styles.fieldLabel}>Which page/screen?</Text>
          <View style={styles.chipRow}>
            {PAGES.map((p) => (
              <Pressable
                key={p}
                style={[styles.chip, page === p && styles.chipSelected]}
                onPress={() => setPage(page === p ? '' : p)}
              >
                <Text style={[styles.chipText, page === p && styles.chipTextSelected]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {type === 'bug' ? (
          <>
            <View>
              <Text style={styles.fieldLabel}>What's happening? *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe what you see going wrong..."
                placeholderTextColor={Colors.textMuted}
                value={whatHappened}
                onChangeText={setWhatHappened}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>What should happen instead?</Text>
              <TextInput
                style={styles.textArea}
                placeholder="What did you expect to see?"
                placeholderTextColor={Colors.textMuted}
                value={expected}
                onChangeText={setExpected}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Steps to reproduce</Text>
              <TextInput
                style={styles.textArea}
                placeholder="1. Go to...&#10;2. Tap on...&#10;3. See error..."
                placeholderTextColor={Colors.textMuted}
                value={steps}
                onChangeText={setSteps}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </>
        ) : (
          <>
            <View>
              <Text style={styles.fieldLabel}>Describe the feature *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="What would this feature do? How would it work?"
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Why would this be useful?</Text>
              <TextInput
                style={styles.textArea}
                placeholder="How would this help you manage your POTS?"
                placeholderTextColor={Colors.textMuted}
                value={whyUseful}
                onChangeText={setWhyUseful}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </>
        )}

        {/* Submit */}
        <Pressable
          style={[styles.submitButton, (!canSubmit || submitting) && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.card,
  },
  toggleActive: { borderColor: Colors.primary, backgroundColor: 'rgba(108,142,191,0.15)' },
  toggleActiveBug: { borderColor: Colors.red, backgroundColor: 'rgba(239,83,80,0.12)' },
  toggleText: { color: Colors.textMuted, fontSize: 14, fontWeight: '500' },
  toggleTextActive: { color: Colors.text },

  fromLabel: { color: Colors.textSecondary, fontSize: 13, marginLeft: 4 },

  fieldLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
  input: {
    backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    padding: 12, color: Colors.text, fontSize: 15,
  },
  textArea: {
    backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    padding: 12, color: Colors.text, fontSize: 15, minHeight: 80, lineHeight: 22,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  chipSelected: { backgroundColor: 'rgba(108,142,191,0.2)', borderColor: Colors.primary },
  chipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: Colors.primary },

  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: Colors.text, fontSize: 16, fontWeight: '600' },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  successText: { color: Colors.text, fontSize: 20, fontWeight: '600' },
  successDetail: { color: Colors.textSecondary, fontSize: 14 },
});
