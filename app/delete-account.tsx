import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, deleteUser } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { Colors } from '@/constants/Colors';

function alert(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n${message}`);
  else require('react-native').Alert.alert(title, message);
}

export default function DeleteAccount() {
  const router = useRouter();
  const user = getCurrentUser();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!user || !canDelete) return;
    setDeleting(true);

    try {
      // 1. Delete all episodes subcollection
      const episodesSnap = await getDocs(collection(db, 'users', user.uid, 'episodes'));
      const deletePromises = episodesSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 2. Delete daily logs subcollection
      const logsSnap = await getDocs(collection(db, 'users', user.uid, 'dailyLogs'));
      const logDeletes = logsSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(logDeletes);

      // 3. Delete user document
      await deleteDoc(doc(db, 'users', user.uid));

      // 4. Delete Firebase Auth user
      await deleteUser(user);

      // 5. Redirect to login
      router.replace('/login');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        alert('Re-authentication Required', 'For security, please sign out, sign back in, and try again.');
      } else {
        alert('Error', err.message || 'Failed to delete account.');
      }
      setDeleting(false);
    }
  };

  if (!user) { router.replace('/login'); return null; }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Warning */}
      <View style={styles.warningCard}>
        <Ionicons name="warning" size={40} color={Colors.red} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <Text style={styles.warningTitle}>This action is permanent</Text>
        <Text style={styles.warningText}>
          Deleting your account will permanently remove:
        </Text>
        <View style={styles.warningList}>
          <Text style={styles.warningItem}>All your episode logs</Text>
          <Text style={styles.warningItem}>All daily tracker entries</Text>
          <Text style={styles.warningItem}>All trigger responses</Text>
          <Text style={styles.warningItem}>Your profile and settings</Text>
          <Text style={styles.warningItem}>Partner connections</Text>
          <Text style={styles.warningItem}>Your login credentials</Text>
        </View>
        <Text style={[styles.warningText, { marginTop: 10, fontWeight: '600' }]}>
          This cannot be undone. Export your data first if you want to keep a copy.
        </Text>
      </View>

      {/* Confirm Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TYPE "DELETE" TO CONFIRM</Text>
        <TextInput
          style={styles.input}
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder='Type "DELETE" to confirm'
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      {/* Delete Button */}
      <Pressable
        style={[styles.deleteButton, !canDelete && { opacity: 0.4 }]}
        onPress={handleDelete}
        disabled={!canDelete || deleting}
      >
        {deleting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.deleteText}>Permanently Delete Account</Text>
          </>
        )}
      </Pressable>

      {/* Back Option */}
      <Pressable style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel — Keep My Account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },

  warningCard: {
    backgroundColor: 'rgba(239,83,80,0.08)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,83,80,0.3)',
    padding: 20, marginBottom: 24,
  },
  warningTitle: { color: Colors.red, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  warningText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  warningList: { marginTop: 10, marginLeft: 8, gap: 4 },
  warningItem: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: Colors.red },

  section: { marginBottom: 24 },
  sectionTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 14, color: Colors.text, fontSize: 16, textAlign: 'center', letterSpacing: 2,
  },

  deleteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.red, borderRadius: 12, paddingVertical: 16, marginBottom: 12,
  },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  cancelButton: {
    alignItems: 'center', paddingVertical: 14,
    backgroundColor: Colors.surfaceLight, borderRadius: 12,
  },
  cancelText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
});
