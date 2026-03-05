import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/1/0

/** Generate a unique 6-char referral code for a user */
export function generateReferralCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/** Get or create a referral code for a user */
export async function getUserReferralCode(uid: string): Promise<string> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists() && userDoc.data().referralCode) {
    return userDoc.data().referralCode;
  }

  // Generate and save a new code
  const code = generateReferralCode();
  await updateDoc(doc(db, 'users', uid), { referralCode: code });

  // Also create a lookup doc for fast code→uid resolution
  await setDoc(doc(db, 'referralCodes', code), { uid });

  return code;
}

/** Look up who owns a referral code */
export async function resolveReferralCode(code: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'referralCodes', code.toUpperCase()));
  if (snap.exists()) return snap.data().uid;
  return null;
}

/** Record that a new user was referred by someone */
export async function recordReferral(newUserUid: string, referrerUid: string): Promise<void> {
  // Save referredBy on new user's doc
  await updateDoc(doc(db, 'users', newUserUid), {
    referredBy: referrerUid,
  });

  // Increment referral count on referrer's doc
  await updateDoc(doc(db, 'users', referrerUid), {
    referralCount: increment(1),
  });
}

/** Get referral stats for admin */
export async function getReferralCount(uid: string): Promise<number> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? (userDoc.data().referralCount || 0) : 0;
}
