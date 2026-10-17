import type { Account } from './schema.ts';

/** 比べるための正規化（全角英数・空白の違いをなくす） */
export function normalizeName(s: string): string {
  return s.normalize('NFKC').replace(/\s+/g, '').trim();
}

/**
 * 勘定科目を名前・別名から引く。
 * 例: 「売掛」「売掛け」を売掛金の別名にしておけば、どれでも売掛金になる。
 */
export class AccountBook {
  private byName = new Map<string, Account>();
  readonly accounts: Account[];

  constructor(accounts: Account[]) {
    this.accounts = accounts;
    for (const a of accounts) {
      this.byName.set(normalizeName(a.name), a);
    }
    for (const a of accounts) {
      for (const alias of a.aliases) {
        const key = normalizeName(alias);
        if (!this.byName.has(key)) this.byName.set(key, a);
      }
    }
  }

  find(name: string): Account | undefined {
    return this.byName.get(normalizeName(name));
  }

  /** 正式な科目名にする（知らない科目はそのまま） */
  canonical(name: string): string {
    return this.find(name)?.name ?? name.trim();
  }
}
