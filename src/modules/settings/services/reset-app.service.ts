import { db } from '@/db/database';

/**
 * Removes every store the app writes. The next page load bootstraps a fresh
 * default board, the same path as a first install.
 */
export async function deleteAllAppData(): Promise<void> {
  await db.delete();
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
}
