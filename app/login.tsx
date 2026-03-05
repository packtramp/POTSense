import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { signIn } from '@/lib/auth';
import { Colors } from '@/constants/Colors';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Auth state listener in _layout.tsx handles navigation
    } catch (err: any) {
      setError(err.message?.includes('invalid') ? 'Invalid email or password.' : 'Sign in failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <Text style={styles.logo}>♥~ POTSense</Text>
        <Text style={styles.tagline}>Sense your triggers.</Text>

        {/* Form */}
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
        </Pressable>

        {/* Sign Up link */}
        <Pressable onPress={() => router.push('/signup')} style={styles.linkRow}>
          <Text style={styles.linkText}>Don't have an account? </Text>
          <Text style={styles.linkBold}>Sign Up</Text>
        </Pressable>

        {/* Footer */}
        <Text style={styles.footer}>
          Not medical advice.{'\n'}Built by a POTS family.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { color: Colors.primary, fontSize: 32, fontWeight: '700', textAlign: 'center' },
  tagline: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 32 },
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
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  linkText: { color: Colors.textSecondary, fontSize: 14 },
  linkBold: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  footer: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 40, lineHeight: 18 },
});
