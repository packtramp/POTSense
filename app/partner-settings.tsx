import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getCurrentUser } from '@/lib/auth';
import {
  generateInviteCode,
  redeemInviteCode,
  getLinkedPartners,
  getLinkedPatient,
  unlinkPartner,
  getUserRole,
} from '@/lib/partners';
import { Colors } from '@/constants/Colors';

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirm },
    ]);
  }
}

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function PartnerSettings() {
  const router = useRouter();
  const user = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'member' | 'partner'>('member');

  // Patient mode state
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [partners, setPartners] = useState<
    { uid: string; email?: string; displayName?: string }[]
  >([]);
  const [copied, setCopied] = useState(false);

  // Partner mode state
  const [linkedPatient, setLinkedPatient] = useState<{
    patientUid: string;
    email?: string;
    displayName?: string;
  } | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRole = await getUserRole(user.uid);
      setRole(userRole);

      if (userRole === 'partner') {
        const patient = await getLinkedPatient(user.uid);
        setLinkedPatient(patient);
      } else {
        const linked = await getLinkedPartners(user.uid);
        setPartners(linked);
      }
    } catch (err) {
      console.error('Failed to load partner data:', err);
    }
    setLoading(false);
  };

  const handleGenerateCode = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const code = await generateInviteCode(user.uid);
      setInviteCode(code);
    } catch (err) {
      console.error('Failed to generate code:', err);
      showAlert('Error', 'Failed to generate invite code. Try again.');
    }
    setGenerating(false);
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await Clipboard.setStringAsync(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for web
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleRedeemCode = async () => {
    if (!user || !codeInput.trim()) return;
    setRedeeming(true);
    try {
      const result = await redeemInviteCode(
        codeInput.trim(),
        user.uid,
        user.email || ''
      );
      if (result.success) {
        showAlert('Linked!', 'You are now linked as a caregiver/partner.');
        setCodeInput('');
        await loadData();
      } else {
        showAlert('Error', result.error || 'Failed to redeem code.');
      }
    } catch (err) {
      console.error('Failed to redeem code:', err);
      showAlert('Error', 'Something went wrong. Try again.');
    }
    setRedeeming(false);
  };

  const handleUnlinkPartner = (partnerUid: string, partnerName: string) => {
    if (!user) return;
    confirmAction(
      'Unlink Partner',
      `Remove ${partnerName || 'this partner'}? They will no longer be able to log episodes for you.`,
      async () => {
        try {
          await unlinkPartner(user.uid, partnerUid);
          await loadData();
        } catch (err) {
          console.error('Failed to unlink:', err);
        }
      }
    );
  };

  const handleUnlinkSelf = () => {
    if (!user || !linkedPatient) return;
    confirmAction(
      'Unlink',
      `Disconnect from ${linkedPatient.displayName || linkedPatient.email || 'this patient'}?`,
      async () => {
        try {
          await unlinkPartner(linkedPatient.patientUid, user.uid);
          await loadData();
        } catch (err) {
          console.error('Failed to unlink:', err);
        }
      }
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
        <Text style={styles.headerTitle}>Partner / Caregiver</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {role === 'partner' ? (
          /* ── PARTNER MODE ── */
          <>
            {linkedPatient ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>LINKED TO PATIENT</Text>
                  <View style={styles.linkedRow}>
                    <Ionicons
                      name="person-circle"
                      size={40}
                      color={Colors.primary}
                    />
                    <View style={styles.linkedInfo}>
                      <Text style={styles.linkedName}>
                        {linkedPatient.displayName || 'Patient'}
                      </Text>
                      <Text style={styles.linkedEmail}>
                        {linkedPatient.email || linkedPatient.patientUid}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.linkedHint}>
                    Episodes you log will be saved to their account.
                  </Text>
                </View>

                <Pressable style={styles.unlinkButton} onPress={handleUnlinkSelf}>
                  <Ionicons name="link-outline" size={18} color={Colors.red} />
                  <Text style={styles.unlinkText}>Unlink</Text>
                </Pressable>
              </>
            ) : (
              /* Partner not yet linked — show code input */
              <View style={styles.card}>
                <Text style={styles.cardLabel}>ENTER INVITE CODE</Text>
                <Text style={styles.hint}>
                  Ask the patient for their 6-digit invite code.
                </Text>
                <TextInput
                  style={styles.codeInput}
                  placeholder="ABC123"
                  placeholderTextColor={Colors.textMuted}
                  value={codeInput}
                  onChangeText={(t) => setCodeInput(t.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <Pressable
                  style={[
                    styles.primaryButton,
                    (!codeInput.trim() || redeeming) && styles.buttonDisabled,
                  ]}
                  onPress={handleRedeemCode}
                  disabled={!codeInput.trim() || redeeming}
                >
                  <Text style={styles.primaryButtonText}>
                    {redeeming ? 'Linking...' : 'Link Account'}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          /* ── PATIENT MODE ── */
          <>
            {/* Generate Invite Code */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>INVITE A CAREGIVER</Text>
              <Text style={styles.hint}>
                Generate a code and share it with your partner or caregiver. They
                can use it to link their account and log episodes for you.
              </Text>

              {inviteCode ? (
                <View style={styles.codeDisplay}>
                  <Text style={styles.codeText}>{inviteCode}</Text>
                  <Pressable style={styles.copyButton} onPress={handleCopyCode}>
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color={copied ? Colors.green : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.copyText,
                        copied && { color: Colors.green },
                      ]}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>
                  <Text style={styles.codeExpiry}>Expires in 24 hours</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.primaryButton, generating && styles.buttonDisabled]}
                  onPress={handleGenerateCode}
                  disabled={generating}
                >
                  <Ionicons name="key-outline" size={18} color={Colors.text} />
                  <Text style={styles.primaryButtonText}>
                    {generating ? 'Generating...' : 'Generate Invite Code'}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Linked Partners List */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>LINKED PARTNERS</Text>
              {partners.length === 0 ? (
                <Text style={styles.emptyText}>
                  No partners linked yet. Generate an invite code above.
                </Text>
              ) : (
                partners.map((p) => (
                  <View key={p.uid} style={styles.partnerRow}>
                    <Ionicons
                      name="person-circle-outline"
                      size={32}
                      color={Colors.textSecondary}
                    />
                    <View style={styles.partnerInfo}>
                      <Text style={styles.partnerName}>
                        {p.displayName || 'Partner'}
                      </Text>
                      <Text style={styles.partnerEmail}>
                        {p.email || p.uid.slice(0, 12) + '...'}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.unlinkSmall}
                      onPress={() =>
                        handleUnlinkPartner(p.uid, p.displayName || p.email || '')
                      }
                    >
                      <Ionicons name="close-circle" size={22} color={Colors.red} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {/* Invite code entry for patients who want to become a partner too */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>ARE YOU A CAREGIVER?</Text>
              <Text style={styles.hint}>
                If someone shared an invite code with you, enter it here to link
                as their partner.
              </Text>
              <TextInput
                style={styles.codeInput}
                placeholder="ABC123"
                placeholderTextColor={Colors.textMuted}
                value={codeInput}
                onChangeText={(t) => setCodeInput(t.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Pressable
                style={[
                  styles.secondaryButton,
                  (!codeInput.trim() || redeeming) && styles.buttonDisabled,
                ]}
                onPress={handleRedeemCode}
                disabled={!codeInput.trim() || redeeming}
              >
                <Text style={styles.secondaryButtonText}>
                  {redeeming ? 'Linking...' : 'Link as Partner'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
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

  // Cards
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },

  // Code display
  codeDisplay: { alignItems: 'center', paddingVertical: 12 },
  codeText: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  copyText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  codeExpiry: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },

  // Code input
  codeInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Buttons
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: { opacity: 0.5 },

  // Linked patient display (partner mode)
  linkedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  linkedInfo: { flex: 1 },
  linkedName: { color: Colors.text, fontSize: 17, fontWeight: '600' },
  linkedEmail: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  linkedHint: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Partner list (patient mode)
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  partnerInfo: { flex: 1 },
  partnerName: { color: Colors.text, fontSize: 15 },
  partnerEmail: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  unlinkSmall: { padding: 4 },

  // Unlink button
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.red,
    backgroundColor: 'rgba(239,83,80,0.1)',
  },
  unlinkText: { color: Colors.red, fontSize: 15, fontWeight: '600' },
  emptyText: { color: Colors.textMuted, fontSize: 13, fontStyle: 'italic' },
});
