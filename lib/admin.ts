// Super admin UIDs — only these accounts see the admin panel
export const ADMIN_UIDS: string[] = [];

// We'll populate this after Roby's UID is known.
// For now, match by email as fallback.
export const ADMIN_EMAILS = ['robdorsett@gmail.com'];

export function isAdmin(uid: string | undefined, email: string | null | undefined): boolean {
  if (!uid && !email) return false;
  if (uid && ADMIN_UIDS.includes(uid)) return true;
  if (email && ADMIN_EMAILS.includes(email)) return true;
  return false;
}
