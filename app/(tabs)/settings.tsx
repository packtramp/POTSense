import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, TextInput } from 'react-native';
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
      { icon: 'person-outline', label: 'Profile', detail: 'Name, email, password', onPress: () => router.push('/profile') },
      { icon: 'people-outline', label: 'Partners', detail: 'Manage linked partners', premium: true, onPress: () => router.push('/partner-settings') },
      { icon: 'star-outline', label: 'Subscription', detail: 'Free Plan', onPress: comingSoon },
    ],
  },
  {
    title: 'TRACKING',
    rows: [
      { icon: 'list-outline', label: 'Daily Trackers', detail: 'Customize which to show', onPress: () => router.push('/tracker-settings') },
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
      { icon: 'chatbubble-outline', label: 'Send Feedback', detail: 'Feature requests & bug reports', onPress: () => router.push('/feedback') },
      { icon: 'shield-checkmark-outline', label: 'Privacy Policy' },
      { icon: 'document-outline', label: 'Terms of Service' },
      { icon: 'information-circle-outline', label: 'About POTSense v1.0' },
    ],
  },
]; }

// ── Admin Panel (only visible to ADMIN_EMAILS) ──
const PAGE_SIZE = 20;

function AdminPanel() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load users:', err);
    }
    setLoading(false);
  };

  // Build referral count map: referrerUID → count
  const referralMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of allUsers) {
      if (u.referredBy) {
        map[u.referredBy] = (map[u.referredBy] || 0) + 1;
      }
    }
    return map;
  }, [allUsers]);

  // Summary stats
  const stats = useMemo(() => {
    const total = allUsers.length;
    const premium = allUsers.filter((u) => u.premiumStatus === 'premium').length;
    const totalReferrals = allUsers.filter((u) => !!u.referredBy).length;
    return { total, premium, totalReferrals };
  }, [allUsers]);

  // Filtered users
  const filtered = useMemo(() => {
    if (!search.trim()) return allUsers;
    const q = search.toLowerCase();
    return allUsers.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageUsers = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

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

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

      {/* Summary Stats */}
      <View style={styles.adminStatsRow}>
        <View style={styles.adminStatBox}>
          <Text style={styles.adminStatNum}>{stats.total}</Text>
          <Text style={styles.adminStatLabel}>Users</Text>
        </View>
        <View style={styles.adminStatBox}>
          <Text style={[styles.adminStatNum, { color: Colors.premium }]}>{stats.premium}</Text>
          <Text style={styles.adminStatLabel}>Premium</Text>
        </View>
        <View style={styles.adminStatBox}>
          <Text style={[styles.adminStatNum, { color: Colors.primary }]}>{stats.totalReferrals}</Text>
          <Text style={styles.adminStatLabel}>Referrals</Text>
        </View>
      </View>

      {/* Search */}
      <TextInput
        style={styles.adminSearch}
        placeholder="Search by name or email..."
        placeholderTextColor={Colors.textMuted}
        value={search}
        onChangeText={(t) => { setSearch(t); setPage(0); }}
      />

      <View style={styles.sectionCard}>
        {loading ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Loading users...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>No users found</Text>
          </View>
        ) : (
          <>
            {pageUsers.map((user, i) => {
              const role = user.role || 'member';
              const premium = user.premiumStatus === 'premium';
              const refCount = referralMap[user.id] || 0;
              return (
                <View key={user.id} style={[styles.adminUserRow, i < pageUsers.length - 1 && styles.rowBorder]}>
                  <View style={styles.adminUserInfo}>
                    <Text style={styles.rowLabel}>{user.displayName || 'No name'}</Text>
                    <Text style={styles.rowDetail}>{user.email}</Text>
                    <View style={styles.adminBadgeRow}>
                      <Text style={[styles.adminBadge, { backgroundColor: Colors.surfaceLight, color: Colors.textSecondary }]}>
                        {role}
                      </Text>
                      <Text style={[styles.adminBadge, premium
                        ? { backgroundColor: 'rgba(255,215,0,0.2)', color: Colors.premium }
                        : { backgroundColor: Colors.surfaceLight, color: Colors.textMuted }
                      ]}>
                        {premium ? 'premium' : 'free'}
                      </Text>
                      {refCount > 0 && (
                        <Text style={[styles.adminBadge, { backgroundColor: 'rgba(108,142,191,0.2)', color: Colors.primary }]}>
                          {refCount} referral{refCount !== 1 ? 's' : ''}
                        </Text>
                      )}
                      <Text style={[styles.rowDetail, { marginLeft: 4, marginTop: 0 }]}>
                        Joined {formatDate(user.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.adminActions}>
                    <Pressable
                      style={[styles.adminBtn, { backgroundColor: Colors.greenBg, borderColor: Colors.green }]}
                      onPress={() => togglePremium(user.id, user.premiumStatus)}
                    >
                      <Text style={[styles.adminBtnText, { color: Colors.green }]}>
                        {premium ? '⭐→Free' : 'Free→⭐'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.adminBtn, { backgroundColor: Colors.orangeBg, borderColor: Colors.orange }]}
                      onPress={() => changeRole(user.id, role)}
                    >
                      <Text style={[styles.adminBtnText, { color: Colors.orange }]}>
                        {role === 'member' ? '→Partner' : '→Member'}
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
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.adminPaginationRow}>
                <Pressable
                  style={[styles.adminPageBtn, safePage === 0 && styles.adminPageBtnDisabled]}
                  onPress={() => safePage > 0 && setPage(safePage - 1)}
                >
                  <Text style={[styles.adminPageBtnText, safePage === 0 && { color: Colors.textMuted }]}>Previous</Text>
                </Pressable>
                <Text style={styles.adminPageInfo}>
                  {safePage + 1} / {totalPages} ({filtered.length} users)
                </Text>
                <Pressable
                  style={[styles.adminPageBtn, safePage >= totalPages - 1 && styles.adminPageBtnDisabled]}
                  onPress={() => safePage < totalPages - 1 && setPage(safePage + 1)}
                >
                  <Text style={[styles.adminPageBtnText, safePage >= totalPages - 1 && { color: Colors.textMuted }]}>Next</Text>
                </Pressable>
              </View>
            )}
          </>
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

  // Admin — Stats & Search
  adminStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  adminStatBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
  },
  adminStatNum: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  adminStatLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  adminSearch: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    color: Colors.text,
    fontSize: 14,
    marginBottom: 10,
  },
  // Admin — Badges
  adminBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  adminBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Admin — Pagination
  adminPaginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  adminPageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  adminPageBtnDisabled: {
    opacity: 0.4,
  },
  adminPageBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  adminPageInfo: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  // Admin — Toggle & Users
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
