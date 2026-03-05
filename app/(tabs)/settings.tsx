import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { signOut, getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { isAdmin } from '@/lib/admin';
import { Colors } from '@/constants/Colors';

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirm },
    ]);
  }
}

type SettingsRow = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  detail?: string;
  premium?: boolean;
  onPress?: () => void;
};

type SettingsSection = {
  title: string;
  rows: SettingsRow[];
};

const comingSoon = () => {
  if (Platform.OS === 'web') window.alert('Coming soon!');
};

function getSections(router: any): SettingsSection[] { return [
  {
    title: 'ACCOUNT',
    rows: [
      { icon: 'person-outline', label: 'Profile', onPress: comingSoon },
      { icon: 'people-outline', label: 'Partners', detail: 'Manage linked partners', premium: true, onPress: () => router.push('/partner-settings') },
      { icon: 'star-outline', label: 'Subscription', detail: 'Free Plan', onPress: comingSoon },
    ],
  },
  {
    title: 'TRACKING',
    rows: [
      { icon: 'list-outline', label: 'Daily Trackers', detail: 'Customize which to show', onPress: comingSoon },
      { icon: 'albums-outline', label: 'Questionnaire', detail: 'Choose your cards', onPress: () => router.push('/questionnaire-settings') },
      { icon: 'resize-outline', label: 'Units', detail: '°F • inHg' },
    ],
  },
  {
    title: 'NOTIFICATIONS',
    rows: [
      { icon: 'thermometer-outline', label: 'Pressure Alerts', detail: 'ON • 5 hPa/3h' },
      { icon: 'notifications-outline', label: 'Check-in Reminder', detail: 'ON • 8:00 PM' },
      { icon: 'mail-outline', label: 'Email Notifications', detail: 'Weekly summary: ON' },
    ],
  },
  {
    title: 'DATA',
    rows: [
      { icon: 'document-text-outline', label: 'Export PDF Report', onPress: () => router.push('/pdf-export') },
      { icon: 'download-outline', label: 'Export All Data (JSON)' },
      { icon: 'trash-outline', label: 'Delete Account' },
    ],
  },
  {
    title: 'INFO',
    rows: [
      { icon: 'shield-checkmark-outline', label: 'Privacy Policy' },
      { icon: 'document-outline', label: 'Terms of Service' },
      { icon: 'information-circle-outline', label: 'About POTSense v1.0' },
    ],
  },
]; }

// ── Admin Panel (only visible to ADMIN_EMAILS) ──
function AdminPanel() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load users:', err);
    }
    setLoading(false);
  };

  const togglePremium = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'premium' ? 'free' : 'premium';
    await updateDoc(doc(db, 'users', uid), { premiumStatus: newStatus });
    loadUsers();
  };

  const changeRole = (uid: string, currentRole: string) => {
    const newRole = currentRole === 'member' ? 'partner' : 'member';
    confirm('Change Role', `Switch to ${newRole}?`, async () => {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      loadUsers();
    });
  };

  const deleteUserDoc = (uid: string, email: string) => {
    confirm('Delete User', `Delete ${email}? Removes Firestore data.`, async () => {
      await deleteDoc(doc(db, 'users', uid));
      loadUsers();
    });
  };

  if (!showAdmin) {
    return (
      <View style={styles.section}>
        <Pressable
          style={styles.adminToggle}
          onPress={() => { setShowAdmin(true); loadUsers(); }}
        >
          <Ionicons name="shield" size={18} color={Colors.red} />
          <Text style={styles.adminToggleText}>Super Admin</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: Colors.red }]}>SUPER ADMIN</Text>
      <View style={styles.sectionCard}>
        {loading ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Loading users...</Text>
          </View>
        ) : (
          users.map((user, i) => (
            <View key={user.id} style={[styles.adminUserRow, i < users.length - 1 && styles.rowBorder]}>
              <View style={styles.adminUserInfo}>
                <Text style={styles.rowLabel}>{user.displayName || 'No name'}</Text>
                <Text style={styles.rowDetail}>{user.email}</Text>
                <Text style={styles.rowDetail}>
                  {user.role || 'member'} • {user.premiumStatus || 'free'} • UID: {user.id.slice(0, 8)}...
                </Text>
              </View>
              <View style={styles.adminActions}>
                <Pressable
                  style={[styles.adminBtn, { backgroundColor: Colors.greenBg, borderColor: Colors.green }]}
                  onPress={() => togglePremium(user.id, user.premiumStatus)}
                >
                  <Text style={[styles.adminBtnText, { color: Colors.green }]}>
                    {user.premiumStatus === 'premium' ? '⭐→Free' : 'Free→⭐'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.adminBtn, { backgroundColor: Colors.orangeBg, borderColor: Colors.orange }]}
                  onPress={() => changeRole(user.id, user.role)}
                >
                  <Text style={[styles.adminBtnText, { color: Colors.orange }]}>
                    {user.role === 'member' ? '→Partner' : '→Member'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.adminBtn, { backgroundColor: 'rgba(239,83,80,0.15)', borderColor: Colors.red }]}
                  onPress={() => deleteUserDoc(user.id, user.email)}
                >
                  <Text style={[styles.adminBtnText, { color: Colors.red }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
        <Pressable style={[styles.row, styles.rowBorder]} onPress={loadUsers}>
          <Ionicons name="refresh" size={18} color={Colors.primary} />
          <Text style={[styles.rowLabel, { color: Colors.primary, marginLeft: 8 }]}>Refresh Users</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => setShowAdmin(false)}>
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          <Text style={[styles.rowLabel, { color: Colors.textMuted, marginLeft: 8 }]}>Close Admin</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main Settings Screen ──
export default function SettingsScreen() {
  const router = useRouter();
  const user = getCurrentUser();
  const showAdminPanel = isAdmin(user?.uid, user?.email);

  const handleSignOut = () => {
    confirm('Sign Out', 'Are you sure?', () => signOut());
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {getSections(router).map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.rows.map((row, i) => (
              <Pressable
                key={row.label}
                style={[styles.row, i < section.rows.length - 1 && styles.rowBorder]}
                onPress={row.onPress}
              >
                <Ionicons name={row.icon} size={20} color={Colors.textSecondary} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.detail && <Text style={styles.rowDetail}>{row.detail}</Text>}
                </View>
                {row.premium && <Text style={styles.premiumBadge}>🔒</Text>}
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {showAdminPanel && <AdminPanel />}

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        POTSense is not medical advice. Always consult your healthcare provider.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
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
  premiumBadge: { fontSize: 14, marginRight: 4 },
  signOutButton: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  signOutText: { color: Colors.red, fontSize: 15, fontWeight: '600' },
  disclaimer: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },

  // Admin
  adminToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,83,80,0.1)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.3)',
  },
  adminToggleText: { color: Colors.red, fontSize: 15, fontWeight: '600' },
  adminUserRow: { padding: 14 },
  adminUserInfo: { marginBottom: 8 },
  adminActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  adminBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  adminBtnText: { fontSize: 12, fontWeight: '600' },
});
