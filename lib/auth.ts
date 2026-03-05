import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export type AccountRole = 'member' | 'partner';

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: AccountRole,
  inviteCode?: string
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });

  // Create user doc in Firestore
  await setDoc(doc(db, 'users', cred.user.uid), {
    displayName,
    email,
    role,
    createdAt: serverTimestamp(),
    premiumStatus: 'free',
    linkedPartners: [],
    linkedMembers: [],
    settings: {
      units: { temperature: 'F', pressure: 'inHg' },
      notifications: {
        pressureAlerts: true,
        pressureThreshold: 5,
        checkInReminder: true,
        checkInTime: '20:00',
        weeklySummary: true,
      },
    },
  });

  return cred.user;
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}
