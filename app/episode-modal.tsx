import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { getLinkedPatient } from '@/lib/partners';
import { getWeatherForCurrentLocation, fetchWeatherForDate, getCurrentLocation, WeatherData } from '@/lib/weather';
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

// Format Date to local datetime-local input value (YYYY-MM-DDTHH:MM)
function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function EpisodeModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string; editData?: string }>();
  const isEdit = !!params.editId;
  const editData = params.editData ? JSON.parse(params.editData) : null;

  const [phase, setPhase] = useState<Phase>('details');
  const [questionnaireResult, setQuestionnaireResult] = useState<QuestionnaireResult | null>(null);
  const [severity, setSeverity] = useState(editData?.severity ?? 3);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(editData?.symptoms ?? []);
  const [notes, setNotes] = useState(editData?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [disabledCategories, setDisabledCategories] = useState<string[]>([]);
  const [disabledCards, setDisabledCards] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [linkedPatientUid, setLinkedPatientUid] = useState<string | null>(null);
  const [linkedPatientName, setLinkedPatientName] = useState<string | null>(null);

  // Date/time state — default to now, or edit date
  const [episodeDate, setEpisodeDate] = useState<Date>(() => {
    if (editData?.timestamp) return new Date(editData.timestamp);
    if (editData?.localTime) return new Date(editData.localTime);
    return new Date();
  });
  const [isHistoric, setIsHistoric] = useState(isEdit);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fetchingHistoricWeather, setFetchingHistoricWeather] = useState(false);
  const dateInputRef = useRef<any>(null);

  // Auto-fetch weather + user question prefs when modal opens
  useEffect(() => {
    if (isEdit && editData?.weather) {
      // Start with existing weather for edits
      setWeather(editData.weather);
      setWeatherLoading(false);
    } else if (!isHistoric) {
      getWeatherForCurrentLocation().then((w) => {
        setWeather(w);
        setWeatherLoading(false);
      });
    } else {
      // Historic mode — fetch weather for the selected date
      fetchHistoricWeather(episodeDate);
    }

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

  const fetchHistoricWeather = async (date: Date) => {
    setFetchingHistoricWeather(true);
    setWeatherLoading(true);
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        const w = await fetchWeatherForDate(coords.latitude, coords.longitude, date);
        setWeather(w);
      } else {
        setWeather(null);
      }
    } catch {
      setWeather(null);
    } finally {
      setFetchingHistoricWeather(false);
      setWeatherLoading(false);
    }
  };

  const handleDateChange = (newDate: Date) => {
    setEpisodeDate(newDate);
    setIsHistoric(true);
    // Re-fetch weather for the new date
    fetchHistoricWeather(newDate);
  };

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

      if (isEdit && params.editId) {
        // Update existing episode
        const updateData: Record<string, any> = {
          severity,
          symptoms: selectedSymptoms,
          notes: notes.trim() || null,
          weather: weather || null,
          updatedAt: serverTimestamp(),
        };
        // If date was changed, update timestamp
        if (isHistoric) {
          updateData.timestamp = Timestamp.fromDate(episodeDate);
          updateData.localTime = episodeDate.toISOString();
        }
        // Only update questionnaire if user went through it
        if (result) {
          updateData.questionnaire = questionnaireMap;
        }
        await updateDoc(doc(db, 'patients', targetUid, 'episodes', params.editId), updateData);
      } else {
        // Create new episode
        const ts = isHistoric
          ? Timestamp.fromDate(episodeDate)
          : serverTimestamp();
        const lt = isHistoric
          ? episodeDate.toISOString()
          : new Date().toISOString();

        await addDoc(collection(db, 'patients', targetUid, 'episodes'), {
          timestamp: ts,
          localTime: lt,
          severity,
          symptoms: selectedSymptoms,
          notes: notes.trim() || null,
          loggedBy: user.uid,
          loggedByEmail: user.email || null,
          questionnaire: questionnaireMap,
          weather: weather || null,
        });
      }
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

  // Max date = now (no future episodes)
  const maxDate = toLocalDatetimeString(new Date());
  // Min date = 92 days ago (Open-Meteo limit)
  const minDate = toLocalDatetimeString(new Date(Date.now() - 92 * 24 * 60 * 60 * 1000));

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
          <Text style={styles.headerTitle}>
            {isEdit ? 'Edit Episode' : 'Log Episode'}
          </Text>
          {linkedPatientName && (
            <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '600' }}>
              Logging for {linkedPatientName}
            </Text>
          )}
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Date/Time Picker */}
        <Text style={styles.sectionLabel}>When did this happen?</Text>
        <Pressable
          style={styles.datePickerButton}
          onPress={() => {
            if (Platform.OS === 'web' && dateInputRef.current) {
              dateInputRef.current.showPicker?.();
              dateInputRef.current.focus();
            } else {
              setShowDatePicker(!showDatePicker);
            }
          }}
        >
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.datePickerText}>
            {isHistoric ? formatDisplayDate(episodeDate) : 'Right now'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
        </Pressable>
        {!isHistoric && (
          <Pressable
            style={styles.historicLink}
            onPress={() => {
              setShowDatePicker(true);
              setIsHistoric(true);
              if (Platform.OS === 'web' && dateInputRef.current) {
                setTimeout(() => dateInputRef.current?.showPicker?.(), 100);
              }
            }}
          >
            <Ionicons name="time-outline" size={14} color={Colors.primary} />
            <Text style={styles.historicLinkText}>Log a past episode</Text>
          </Pressable>
        )}
        {isHistoric && !isEdit && (
          <Pressable
            style={styles.historicLink}
            onPress={() => {
              setIsHistoric(false);
              setShowDatePicker(false);
              setEpisodeDate(new Date());
              // Re-fetch current weather
              setWeatherLoading(true);
              getWeatherForCurrentLocation().then((w) => {
                setWeather(w);
                setWeatherLoading(false);
              });
            }}
          >
            <Ionicons name="arrow-back" size={14} color={Colors.primary} />
            <Text style={styles.historicLinkText}>Use current time instead</Text>
          </Pressable>
        )}

        {/* Hidden HTML date input for web */}
        {Platform.OS === 'web' && (
          <input
            ref={dateInputRef}
            type="datetime-local"
            value={toLocalDatetimeString(episodeDate)}
            max={maxDate}
            min={minDate}
            onChange={(e: any) => {
              const val = e.target.value;
              if (val) handleDateChange(new Date(val));
            }}
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              width: 0,
              height: 0,
            }}
          />
        )}

        {/* Native date picker fallback */}
        {Platform.OS !== 'web' && showDatePicker && (
          <View style={styles.nativeDatePicker}>
            <TextInput
              style={styles.nativeDateInput}
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor={Colors.textMuted}
              defaultValue={episodeDate.toLocaleString('en-US', {
                month: '2-digit', day: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true,
              })}
              onSubmitEditing={(e) => {
                const parsed = new Date(e.nativeEvent.text);
                if (!isNaN(parsed.getTime()) && parsed <= new Date()) {
                  handleDateChange(parsed);
                }
              }}
              returnKeyType="done"
            />
            <Text style={styles.nativeDateHint}>
              Enter date and press Done (up to 92 days back)
            </Text>
          </View>
        )}

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
        {fetchingHistoricWeather ? (
          <View style={styles.weatherBadge}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={[styles.weatherBadgeText, { marginLeft: 8 }]}>
              Fetching weather for {episodeDate.toLocaleDateString()}...
            </Text>
          </View>
        ) : weather ? (
          <View style={styles.weatherBadge}>
            <Text style={styles.weatherBadgeText}>
              🌡️ {weather.surfacePressureInHg} inHg  •  {weather.temperatureF}°F  •  {weather.humidity}%
              {isHistoric ? '  (historical)' : ''}
            </Text>
          </View>
        ) : !weatherLoading ? (
          <View style={styles.weatherBadge}>
            <Text style={styles.weatherBadgeText}>
              Weather data unavailable {isHistoric ? '(location needed or date too far back)' : ''}
            </Text>
          </View>
        ) : null}

        {/* Next: Go to questionnaire */}
        {!isEdit && (
          <Pressable
            style={styles.nextButton}
            onPress={handleNextToSwipe}
          >
            <Text style={styles.nextButtonText}>Next: Quick Check</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.text} />
          </Pressable>
        )}

        {/* Save / Skip button */}
        <Pressable
          style={[
            isEdit ? styles.nextButton : styles.skipSaveButton,
            saving && styles.saveButtonDisabled,
          ]}
          onPress={isEdit ? () => saveEpisode(null) : handleSkipQuestionnaire}
          disabled={saving}
        >
          {isEdit ? (
            <Text style={styles.nextButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          ) : (
            <Text style={styles.skipSaveText}>
              {saving ? 'Saving...' : 'Skip & Save'}
            </Text>
          )}
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

  // Date picker
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  datePickerText: { color: Colors.text, fontSize: 15, flex: 1 },
  historicLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  historicLinkText: { color: Colors.primary, fontSize: 13 },

  // Native date picker
  nativeDatePicker: { marginBottom: 12 },
  nativeDateInput: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  nativeDateHint: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },

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
    flexDirection: 'row',
    justifyContent: 'center',
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
