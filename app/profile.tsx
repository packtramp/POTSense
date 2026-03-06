import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { Colors } from '@/constants/Colors';

function alert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
}

function promptPassword(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.prompt('Enter your current password to confirm:'));
  }
  // For native, we'd need a modal — for now use a simple approach
  return Promise.resolve(null);
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = getCurrentUser();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<string>('member');
  const [joinDate, setJoinDate] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRole(data.role || 'member');
        if (data.createdAt?.toDate) {
          setJoinDate(data.createdAt.toDate().toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          }));
        }
        // Sync display name from Firestore if it differs
        if (data.displayName && !user.displayName) {
          setDisplayName(data.displayName);
        }
      }
    }).catch(() => {});
  }, []);

  if (!user) {
    router.replace('/login');
    return null;
  }

  const initials = (displayName || email || '?')
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      alert('Error', 'Display name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
      setEditingName(false);
      alert('Success', 'Display name updated!');
    } catch (err: any) {
      alert('Error', err.message || 'Failed to update name.');
    }
    setSaving(false);
  };

  const handleSaveEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      alert('Error', 'Please enter a valid email.');
      return;
    }
    const currentPassword = await promptPassword();
    if (!currentPassword) {
      alert('Cancelled', 'Password is required to change email.');
      return;
    }
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, email.trim());
      await updateDoc(doc(db, 'users', user.uid), { email: email.trim() });
      setEditingEmail(false);
      alert('Success', 'Email updated!');
    } catch (err: any) {
      alert('Error', err.message || 'Failed to update email.');
    }
    setSaving(false);
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Error', 'Passwords do not match.');
      return;
    }
    const currentPassword = await promptPassword();
    if (!currentPassword) {
      alert('Cancelled', 'Current password is required.');
      return;
    }
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setEditingPassword(false);
      alert('Success', 'Password updated!');
    } catch (err: any) {
      alert('Error', err.message || 'Failed to update password.');
    }
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.nameDisplay}>{displayName || 'No name set'}</Text>
        <Text style={styles.emailDisplay}>{user.email}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, role === 'partner' && styles.badgePartner]}>
            <Text style={[styles.badgeText, role === 'partner' && styles.badgeTextPartner]}>
              {role === 'partner' ? 'Partner' : 'Member'}
            </Text>
          </View>
          {joinDate ? (
            <Text style={styles.joinDate}>Joined {joinDate}</Text>
          ) : null}
        </View>
      </View>

      {/* Display Name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DISPLAY NAME</Text>
        <View style={styles.sectionCard}>
          {editingName ? (
            <View style={styles.editBlock}>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <View style={styles.editActions}>
                <Pressable style={styles.cancelBtn} onPress={() => {
                  setDisplayName(user.displayName || '');
                  setEditingName(false);
                }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSaveName} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> :
                    <Text style={styles.saveBtnText}>Save</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.row} onPress={() => setEditingName(true)}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{displayName || 'Not set'}</Text>
                <Text style={styles.rowDetail}>Tap to edit</Text>
              </View>
              <Ionicons name="pencil" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Email */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EMAIL</Text>
        <View style={styles.sectionCard}>
          {editingEmail ? (
            <View style={styles.editBlock}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              <Text style={styles.editHint}>You'll need to enter your current password to confirm.</Text>
              <View style={styles.editActions}>
                <Pressable style={styles.cancelBtn} onPress={() => {
                  setEmail(user.email || '');
                  setEditingEmail(false);
                }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSaveEmail} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> :
                    <Text style={styles.saveBtnText}>Update Email</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.row} onPress={() => setEditingEmail(true)}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{user.email}</Text>
                <Text style={styles.rowDetail}>Tap to change</Text>
              </View>
              <Ionicons name="pencil" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Password */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PASSWORD</Text>
        <View style={styles.sectionCard}>
          {editingPassword ? (
            <View style={styles.editBlock}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
              <Text style={styles.editHint}>You'll need to enter your current password to confirm.</Text>
              <View style={styles.editActions}>
                <Pressable style={styles.cancelBtn} onPress={() => {
                  setNewPassword('');
                  setConfirmPassword('');
                  setEditingPassword(false);
                }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSavePassword} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> :
                    <Text style={styles.saveBtnText}>Update Password</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.row} onPress={() => setEditingPassword(true)}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Change Password</Text>
                <Text style={styles.rowDetail}>••••••••</Text>
              </View>
              <Ionicons name="pencil" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT INFO</Text>
        <View style={styles.sectionCard}>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="finger-print-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>User ID</Text>
              <Text style={styles.rowDetail} numberOfLines={1}>{user.uid}</Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="shield-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Account Type</Text>
              <Text style={styles.rowDetail}>{role === 'partner' ? 'Partner' : 'Member (Patient)'}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Member Since</Text>
              <Text style={styles.rowDetail}>{joinDate || 'Unknown'}</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },

  // Avatar section
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  nameDisplay: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  emailDisplay: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  badgePartner: { backgroundColor: 'rgba(255,107,107,0.15)' },
  badgeText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  badgeTextPartner: { color: '#FF6B6B' },
  joinDate: { color: Colors.textMuted, fontSize: 12 },

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowText: { flex: 1 },
  rowLabel: { color: Colors.text, fontSize: 15 },
  rowDetail: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  // Edit blocks
  editBlock: { padding: 14 },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
  },
  editHint: { color: Colors.textMuted, fontSize: 12, marginTop: 8 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
