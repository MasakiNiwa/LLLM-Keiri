import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { backupCounts, exportBackup, importBackup, parseBackup } from './backup';
import { KeiriDB } from './db';

let n = 0;
const dbs: KeiriDB[] = [];
function fresh() {
  const db = new KeiriDB(`backup-test-${n++}`);
  dbs.push(db);
  return db;
}
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

async function seed(db: KeiriDB) {
  await db.lessonProgress.put({ lessonId: 'a', openedAt: 1, readAt: 2 });
  await db.drillAttempts.add({
    setId: 's',
    questionId: 'q1',
    correct: true,
    revealed: false,
    kind: 'exact',
    at: 10,
  });
  await db.journal.put({ id: 'j1', date: '2026-10-01', memo: 'm', lines: [], createdAt: 1 });
}

describe('バックアップと復元', () => {
  it('書き出して、別のデータベースに復元できる', async () => {
    const a = fresh();
    await seed(a);
    const b = await exportBackup(a, { settings: { theme: 'dark' }, appVersion: '0.19.0' });
    const parsed = parseBackup(JSON.stringify(b));
    expect(backupCounts(parsed)).toMatchObject({
      lessonProgress: 1,
      drillAttempts: 1,
      journal: 1,
      chat: 0,
    });
    expect(parsed.settings).toEqual({ theme: 'dark' });

    const c = fresh();
    await importBackup(c, parsed, 'replace');
    expect(await c.journal.get('j1')).toMatchObject({ memo: 'm' });
    expect(await c.drillAttempts.count()).toBe(1);
  });

  it('merge では、同じ答え合わせの記録を二重にしない', async () => {
    const a = fresh();
    await seed(a);
    const b = parseBackup(JSON.stringify(await exportBackup(a)));
    const counts = await importBackup(a, b, 'merge');
    expect(counts.drillAttempts).toBe(0);
    expect(await a.drillAttempts.count()).toBe(1);
    expect(await a.journal.count()).toBe(1);
  });

  it('replace では、今のデータを消してから入れる', async () => {
    const a = fresh();
    await seed(a);
    const empty = parseBackup(JSON.stringify(await exportBackup(fresh())));
    await importBackup(a, empty, 'replace');
    expect(await a.journal.count()).toBe(0);
  });

  it('ほかのファイルは読まない', () => {
    expect(() => parseBackup('{')).toThrow('JSON');
    expect(() => parseBackup('{"format":"x"}')).toThrow('バックアップのファイルではありません');
  });
});
