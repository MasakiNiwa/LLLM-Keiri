import { STORAGE_PREFIX } from '@/lib/constants';

/**
 * このアプリのデータ（localStorage・IndexedDB）を消す。
 *
 * 同じ github.io のほかのサイトと保存領域を共有しているので、
 * 接頭辞（STORAGE_PREFIX）の付いたものだけを消す。AI モデル（OPFS の shared-models/）には触れない。
 */
export async function clearAppData(): Promise<void> {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isAppKey(key)) keys.push(key);
  }
  keys.forEach((k) => localStorage.removeItem(k));

  const names = await listAppDatabases();
  await Promise.all(names.map(deleteDatabase));
}

export function isAppKey(key: string): boolean {
  return (
    key === STORAGE_PREFIX ||
    key.startsWith(`${STORAGE_PREFIX}:`) ||
    key.startsWith(`${STORAGE_PREFIX}-`)
  );
}

async function listAppDatabases(): Promise<string[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const dbs = await indexedDB.databases();
    return dbs.map((d) => d.name ?? '').filter(isAppKey);
  } catch {
    // databases() が無いブラウザでは、既知の DB 名だけ消す
    return [STORAGE_PREFIX];
  }
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
