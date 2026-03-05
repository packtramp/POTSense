import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Generate a 6-digit alphanumeric invite code ──
export async function generateInviteCode(patientUid: string): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/1/0 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  const now = Timestamp.now();
  const expiresAt = new Timestamp(now.seconds + 86400, now.nanoseconds); // 24h

  await setDoc(doc(db, 'inviteCodes', code), {
    patientUid,
    createdAt: now,
    expiresAt,
    used: false,
  });

  return code;
}

// ── Redeem an invite code to link partner → patient ──
export async function redeemInviteCode(
  code: string,
  partnerUid: string,
  partnerEmail: string
): Promise<{ success: boolean; error?: string; patientUid?: string }> {
  const codeRef = doc(db, 'inviteCodes', code.toUpperCase().trim());
  const codeSnap = await getDoc(codeRef);

  if (!codeSnap.exists()) {
    return { success: false, error: 'Invalid invite code.' };
  }

  const data = codeSnap.data();

  if (data.used) {
    return { success: false, error: 'This code has already been used.' };
  }

  const now = Timestamp.now();
  if (data.expiresAt.seconds < now.seconds) {
    return { success: false, error: 'This code has expired. Ask the patient for a new one.' };
  }

  if (data.patientUid === partnerUid) {
    return { success: false, error: "You can't link to your own account." };
  }

  const patientUid = data.patientUid;

  // Mark code as used
  await updateDoc(codeRef, { used: true, usedBy: partnerUid, usedAt: now });

  // Add partner to patient's user doc (merge in case doc doesn't exist yet)
  await setDoc(doc(db, 'users', patientUid), {
    linkedPartners: arrayUnion(partnerUid),
    role: 'member',
  }, { merge: true });

  // Update partner's user doc (merge in case doc doesn't exist yet)
  await setDoc(doc(db, 'users', partnerUid), {
    linkedPatient: patientUid,
    role: 'partner',
  }, { merge: true });

  return { success: true, patientUid };
}

// ── Get list of partner UIDs linked to a patient ──
export async function getLinkedPartners(
  patientUid: string
): Promise<{ uid: string; email?: string; displayName?: string }[]> {
  const userSnap = await getDoc(doc(db, 'users', patientUid));
  if (!userSnap.exists()) return [];

  const data = userSnap.data();
  const partnerUids: string[] = data.linkedPartners || [];

  // Fetch each partner's basic info
  const partners = await Promise.all(
    partnerUids.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        const d = snap.data();
        return { uid, email: d?.email, displayName: d?.displayName };
      } catch {
        return { uid };
      }
    })
  );

  return partners;
}

// ── Get the patient UID this partner is linked to (or null) ──
export async function getLinkedPatient(
  partnerUid: string
): Promise<{ patientUid: string; email?: string; displayName?: string } | null> {
  const userSnap = await getDoc(doc(db, 'users', partnerUid));
  if (!userSnap.exists()) return null;

  const data = userSnap.data();
  if (!data.linkedPatient) return null;

  // Fetch patient info
  try {
    const patientSnap = await getDoc(doc(db, 'users', data.linkedPatient));
    const pd = patientSnap.data();
    return {
      patientUid: data.linkedPatient,
      email: pd?.email,
      displayName: pd?.displayName,
    };
  } catch {
    return { patientUid: data.linkedPatient };
  }
}

// ── Unlink a partner from a patient ──
export async function unlinkPartner(
  patientUid: string,
  partnerUid: string
): Promise<void> {
  // Remove partner from patient's list
  await updateDoc(doc(db, 'users', patientUid), {
    linkedPartners: arrayRemove(partnerUid),
  });

  // Clear partner's linked patient + reset role
  await updateDoc(doc(db, 'users', partnerUid), {
    linkedPatient: null,
    role: 'member',
  });
}

// ── Get current user's role from Firestore ──
export async function getUserRole(
  uid: string
): Promise<'member' | 'partner'> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return 'member';
  return snap.data().role || 'member';
}
