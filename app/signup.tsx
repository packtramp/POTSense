import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { signUp, AccountRole } from '@/lib/auth';
import { Colors } from '@/constants/Colors';

export default function SignUpScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AccountRole>('member');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!displayName.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (role === 'partner' && !inviteCode.trim()) {
      setError('Invite code required for partner accounts.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim(), role, inviteCode.trim() || undefined);
      // Auth state listener handles navigation
    } catch (err: any) {
      setError(err.message?.includes('email-already') ? 'Email already in use.' : 'Sign up failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Create Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Display Name"
          placeholderTextColor={Colors.textMuted}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Role Selection */}
        <Text style={styles.roleLabel}>I am:</Text>
        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleBtn, role === 'member' && styles.roleBtnActive]}
            onPress={() => setRole('member')}
          >
            <Text style={[styles.roleBtnText, role === 'member' && styles.roleBtnTextActive]}>
              Tracking for me
            </Text>
          </Pressable>
          <Pressable
            style={[styles.roleBtn, role === 'partner' && styles.roleBtnActive]}
            onPress={() => setRole('partner')}
          >
            <Text style={[styles.roleBtnText, role === 'partner' && styles.roleBtnTextActive]}>
              Supporting someone
            </Text>
          </Pressable>
        </View>

        {role === 'partner' && (
          <TextInput
            style={styles.input}
            placeholder="Enter invite code"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={setInviteCode}
            maxLength={6}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
        </Pressable>

        <Text style={styles.terms}>
          By signing up you agree to our Terms and Privacy Policy
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 20 },
  backText: { color: Colors.primary, fontSize: 15 },
  title: { color: Colors.text, fontSize: 24, fontWeight: '700', marginBottom: 24 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleLabel: { color: Colors.text, fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 10 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  roleBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
  roleBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  roleBtnTextActive: { color: Colors.primary },
  error: { color: Colors.red, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  terms: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 16 },
});
