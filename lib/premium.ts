import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Check if a user has premium access.
 * - If the user's own premiumStatus is 'premium', returns true.
 * - If the user is a partner (role === 'partner'), checks linked members' premium status.
 *   Partners inherit premium from any linked patient who is premium.
 */
export async function checkPremiumStatus(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return false;

  const data = snap.data();

  // User's own premium status
  if (data.premiumStatus === 'premium') return true;

  // Partner? Check linked members
  if (data.role === 'partner' && Array.isArray(data.linkedMembers) && data.linkedMembers.length > 0) {
    for (const memberUid of data.linkedMembers) {
      const memberSnap = await getDoc(doc(db, 'users', memberUid));
      if (memberSnap.exists() && memberSnap.data().premiumStatus === 'premium') {
        return true;
      }
    }
  }

  return false;
}
