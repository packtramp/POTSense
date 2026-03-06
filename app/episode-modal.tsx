import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { getLinkedPatient } from '@/lib/partners';
import { getWeatherForCurrentLocation, WeatherData } from '@/lib/weather';
import { checkPremiumStatus } from '@/lib/premium';
import { Colors } from '@/constants/Colors';
import SwipeQuestionnaire, { QuestionnaireResult } from '@/components/SwipeQuestionnaire';

const SEVERITY = [
  { value: 1, emoji: '😕', label: 'Mild' },
  { value: 2, emoji: '😐', label: '' },
  { value: 3, emoji: '😟', label: 'Moderate' },
  { value: 4, emoji: '😣', label: '' },
  { value: 5, emoji: '😵', label: 'Worst' },
];

const SYMPTOM_CHIPS = [
  'Dizzy', 'Nausea', 'Racing Heart', 'Brain Fog', 'Fainting',
  'Lightheaded', 'Shaking', 'Blurry Vision', 'Chest Pain', 'Fatigue',
  'Sweating', 'Headache', 'Shortness of Breath', 'Weakness', 'Noise Sensitivity',
];

type Phase = 'details' | 'swipe';

export default function EpisodeModal() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('details');
  const [questionnaireResult, setQuestionnaireResult] = useState<QuestionnaireResult | null>(null);
  const [severity, setSeverity] = useState(3);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [disabledCategories, setDisabledCategories] = useState<string[]>([]);
  const [disabledCards, setDisabledCards] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [linkedPatientUid, setLinkedPatientUid] = useState<string | null>(null);
  const [linkedPatientName, setLinkedPatientName] = useState<string | null>(null);

  // Auto-fetch weather + user question prefs when modal opens
  useEffect(() => {
    getWeatherForCurrentLocation().then((w) => {
      setWeather(w);
      setWeatherLoading(false);
    });

    // Load user's question preferences + check if partner
    const user = getCurrentUser();
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        const data = snap.data();
        if (data?.settings?.disabledCategories) {
          setDisabledCategories(data.settings.disabledCategories);
        }
        if (data?.settings?.disabledCards) {
          setDisabledCards(data.settings.disabledCards);
        }
      }).catch(() => {});
      checkPremiumStatus(user.uid).then(setIsPremium);

      // Check if this user is a partner — episodes save to patient's collection
      getLinkedPatient(user.uid).then((result) => {
        if (result) {
          setLinkedPatientUid(result.patientUid);
          setLinkedPatientName(result.displayName || result.email || 'patient');
        }
      }).catch(() => {});
    }
  }, []);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleQuestionnaireComplete = (result: QuestionnaireResult) => {
    setQuestionnaireResult(result);
    saveEpisode(result);
  };

  const saveEpisode = async (result: QuestionnaireResult | null) => {
    const user = getCurrentUser();
    if (!user) return;

    setSaving(true);
    try {
      // Flatten toggles + quantities into one map for easy querying
      const questionnaireMap: Record<string, string> = {};
      if (result) {
        for (const [key, val] of Object.entries(result.toggles)) {
          if (val) questionnaireMap[key] = 'yes';
        }
        for (const [key, val] of Object.entries(result.quantities)) {
          questionnaireMap[key] = val;
        }
        for (const [key, val] of Object.entries(result.notes)) {
          if (val.trim()) questionnaireMap[`${key}_note`] = val.trim();
        }
        for (const [key, val] of Object.entries(result.cyclingValues)) {
          questionnaireMap[key] = val;
        }
      }

      // If user is a partner, save to the patient's collection
      const targetUid = linkedPatientUid || user.uid;

      await addDoc(collection(db, 'patients', targetUid, 'episodes'), {
        timestamp: serverTimestamp(),
        localTime: new Date().toISOString(),
        severity,
        symptoms: selectedSymptoms,
        notes: notes.trim() || null,
        loggedBy: user.uid,
        loggedByEmail: user.email || null,
        questionnaire: questionnaireMap,
        weather: weather || null,
      });
      router.back();
    } catch (err) {
      console.error('Failed to save episode:', err);
      setSaving(false);
    }
  };

  const handleSkipQuestionnaire = () => {
    saveEpisode(null);
  };

  const handleNextToSwipe = () => {
    setPhase('swipe');
  };

  // Phase 2: Swipe questionnaire
  if (phase === 'swipe') {
    return (
      <SwipeQuestionnaire
        onComplete={handleQuestionnaireComplete}
        onClose={() => router.back()}
        disabledCategories={disabledCategories}
        disabledCards={disabledCards}
        isPremium={isPremium}
      />
    );
  }

  // Phase 1: Severity, symptoms, notes
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Log Episode</Text>
          {linkedPatientName && (
            <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '600' }}>
              Logging for {linkedPatientName}
            </Text>
          )}
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Severity */}
        <Text style={styles.sectionLabel}>How severe is this episode?</Text>
        <View style={styles.severityRow}>
          {SEVERITY.map((s) => (
            <Pressable
              key={s.value}
              style={[
                styles.severityItem,
                severity === s.value && {
                  backgroundColor: Colors.severity[s.value - 1] + '30',
                  borderColor: Colors.severity[s.value - 1],
                },
              ]}
              onPress={() => setSeverity(s.value)}
            >
              <Text style={styles.severityEmoji}>{s.emoji}</Text>
              <Text style={styles.severityValue}>{s.value}</Text>
              {s.label ? <Text style={styles.severityLabel}>{s.label}</Text> : null}
            </Pressable>
          ))}
        </View>

        {/* Symptom Chips */}
        <Text style={styles.sectionLabel}>Symptoms (tap all that apply)</Text>
        <View style={styles.chipContainer}>
          {SYMPTOM_CHIPS.map((symptom) => {
            const selected = selectedSymptoms.includes(symptom);
            return (
              <Pressable
                key={symptom}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleSymptom(symptom)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {symptom}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Notes */}
        <Text style={styles.sectionLabel}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="What happened? Any details to remember..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />

        {/* Weather info */}
        {weather && (
          <View style={styles.weatherBadge}>
            <Text style={styles.weatherBadgeText}>
              🌡️ {weather.surfacePressureInHg} inHg  •  {weather.temperatureF}°F  •  {weather.humidity}%
            </Text>
          </View>
        )}

        {/* Next: Go to questionnaire */}
        <Pressable
          style={styles.nextButton}
          onPress={handleNextToSwipe}
        >
          <Text style={styles.nextButtonText}>Next: Quick Check</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.text} />
        </Pressable>

        {/* Skip questionnaire and save immediately */}
        <Pressable
          style={[styles.skipSaveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSkipQuestionnaire}
          disabled={saving}
        >
          <Text style={styles.skipSaveText}>
            {saving ? 'Saving...' : 'Skip & Save'}
          </Text>
        </Pressable>
      </ScrollView>
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
  content: { padding: 16, paddingBottom: 60 },

  sectionLabel: { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 12, marginTop: 8 },

  // Severity
  severityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  severityItem: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  severityEmoji: { fontSize: 28 },
  severityValue: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  severityLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },

  // Chips
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.orangeBg,
    borderColor: Colors.orange,
  },
  chipText: { color: Colors.textSecondary, fontSize: 13 },
  chipTextSelected: { color: Colors.orange, fontWeight: '600' },

  // Notes
  notesInput: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },

  // Weather badge
  weatherBadge: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weatherBadgeText: { color: Colors.textSecondary, fontSize: 13 },

  // Next button (primary)
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nextButtonText: { color: Colors.text, fontSize: 17, fontWeight: '700' },

  // Skip & Save button (subtle)
  skipSaveButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipSaveText: { color: Colors.textMuted, fontSize: 14 },
  saveButtonDisabled: { opacity: 0.6 },
});
