/**
 * AI が使えるツール（関数呼び出し）。
 *
 * AI は判断の材料が必要なときにこれらを呼び、アプリ（プログラム）が調べた・計算した結果を返す。
 * 仕訳の検証・税額の計算・集計はプログラムが正確に行い、AI はその結果をもとに話す。
 */
import { fetchContentIndex } from '@/lib/content/load';
import { loadLesson } from '@/features/studio/userContentRepo';
import { sectionText } from '@/lib/content/sections';
import { AccountBook } from '@/lib/content/accounts';
import { findTerm } from '@/lib/content/glossary';
import { ruleValueAt, today } from '@/lib/content/rules';
import { ELEMENT_LABELS, increaseSide } from '@/lib/content/schema';
import { db } from '@/lib/db/db';
import { totals } from '@/lib/journal/balance';
import { formatShiwake, parseShiwake } from '@/lib/journal/parse';
import { SIDE_LABELS } from '@/lib/journal/types';
import { buildLedger, buildStatements, trialBalance } from '@/lib/ledger/ledger';
import type { JsonValue, ToolCallInfo, ToolDeclaration } from '@/lib/llm/types';
import { searchContent } from '@/lib/search/client';
import { calcConsumptionTax, ROUNDING_LABELS, type Rounding } from '@/lib/tax/consumptionTax';
import { rewardEntries } from '@/lib/tax/withholding';
import { summarize } from '@/features/drill/records';
import { searchHelp } from '@/features/help/helpTopics';

export const TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: 'search_help',
    description:
      'アプリ LLLM 経理の使い方（画面の場所・設定・機能の使い方）をヘルプから調べる。ユーザーがアプリの操作や機能について質問したときに使う',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: '調べたいこと（例: 帳簿のクリア）' } },
      required: ['query'],
    },
  },
  {
    name: 'search_content',
    description:
      'このサイトのレッスン・仕訳問題・勘定科目を全文検索する。関係するレッスンを紹介するときに使う',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: '探す言葉（例: 消費税 決算）' } },
      required: ['query'],
    },
  },
  {
    name: 'get_lesson',
    description: 'レッスンの本文を読む（id は search_content や app_state で分かる）',
    parameters: {
      type: 'object',
      properties: {
        lesson_id: { type: 'string', description: 'レッスンの id' },
        section: { type: 'string', description: '読みたい見出し（任意。無ければ冒頭から）' },
      },
      required: ['lesson_id'],
    },
  },
  {
    name: 'lookup_account',
    description:
      '勘定科目または会計・税務の用語を調べる（科目は区分・増える側・説明・仕訳の例、用語は説明・関連するレッスン）。意味や使い分けを説明するときに使う',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '勘定科目または用語の名前（例: 売掛金、履行義務）' },
      },
      required: ['name'],
    },
  },
  {
    name: 'check_journal',
    description:
      '仕訳が形式として正しいかをプログラムで確かめる（貸借の一致・勘定科目の存在・各行が何の増減か）。仕訳を示す前や、ユーザーの仕訳を確認するときに使う',
    parameters: {
      type: 'object',
      properties: {
        entry: {
          type: 'string',
          description:
            '仕訳。1 行に「借方科目 金額 / 貸方科目 金額」。片側だけの行も書ける。複数行は改行で区切る',
        },
      },
      required: ['entry'],
    },
  },
  {
    name: 'calc_consumption_tax',
    description:
      '消費税を計算する（税抜→税込、税込→税抜）。税率は日付と標準・軽減からアプリが決める',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'integer', description: '金額（円）' },
        mode: {
          type: 'string',
          enum: ['excluded', 'included'],
          description: 'amount が税抜なら "excluded"、税込なら "included"',
        },
        reduced: { type: 'boolean', description: '軽減税率（飲食料品など）なら true' },
        date: { type: 'string', description: '取引の日付 YYYY-MM-DD（任意。無ければ今日）' },
      },
      required: ['amount', 'mode'],
    },
  },
  {
    name: 'calc_withholding',
    description:
      '個人への報酬（原稿料・講演料・税理士などの報酬）から源泉徴収する所得税（復興特別所得税を含む）と、支払時の仕訳を計算する',
    parameters: {
      type: 'object',
      properties: {
        fee: { type: 'integer', description: '報酬の額（円。消費税が区分されていれば税抜）' },
        consumption_tax: {
          type: 'integer',
          description: '請求書で区分された消費税の額（円。任意）',
        },
      },
      required: ['fee'],
    },
  },
  {
    name: 'get_progress',
    description: '学習の進み具合（読んだレッスン・問題セットの成績・最近間違えた問題）を調べる',
  },
  {
    name: 'get_ledger',
    description:
      'ユーザーの帳簿（自分で入れた仕訳）の集計を調べる（勘定科目ごとの残高・試算表の一致・当期純利益・最近の仕訳）',
  },
];

function str(v: JsonValue | undefined): string {
  return typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v);
}

let bookPromise: Promise<AccountBook> | null = null;
function getBook(): Promise<AccountBook> {
  bookPromise ??= fetchContentIndex().then((i) => new AccountBook(i.accounts));
  return bookPromise;
}

async function lookupAccount(name: string): Promise<JsonValue> {
  const book = await getBook();
  const a = book.find(name);
  if (!a) {
    const index = await fetchContentIndex();
    const t = findTerm(index.glossary, name);
    if (t)
      return {
        term: t.term,
        kind: '用語',
        description: t.description,
        aliases: t.aliases.length ? t.aliases : undefined,
        lessons: t.lessons.map((id) => index.lessons.find((l) => l.id === id)?.title ?? id),
        related: t.related.length ? t.related : undefined,
      };
    return {
      error: `「${name}」は勘定科目の一覧にも用語集にもありません`,
      hint: 'search_content で探せます',
    };
  }
  const side = increaseSide(a);
  return {
    name: a.name,
    kana: a.kana,
    element: ELEMENT_LABELS[a.element],
    group: a.group,
    contra: a.contra || undefined,
    increase_side: side ? SIDE_LABELS[side] : undefined,
    description: a.description,
    usage: a.usage,
    aliases: a.aliases.length ? a.aliases : undefined,
    examples: a.examples.length ? a.examples : undefined,
    related: a.related.length ? a.related : undefined,
  };
}

async function checkJournal(text: string): Promise<JsonValue> {
  const book = await getBook();
  const { entries, issues } = parseShiwake(text.replace(/\\n/g, '\n'));
  if (entries.length === 0) {
    return {
      ok: false,
      problems: issues.length ? issues.map((i) => i.message) : ['仕訳が読み取れません'],
      format: '1 行に「借方科目 金額 / 貸方科目 金額」',
    };
  }
  return {
    ok: issues.length === 0 && entries.every((e) => totals(e.lines).dr === totals(e.lines).cr),
    problems: issues.map((i) => i.message),
    entries: entries.map((e) => {
      const t = totals(e.lines);
      return {
        balanced: t.dr === t.cr,
        debit_total: t.dr,
        credit_total: t.cr,
        lines: e.lines.map((l) => {
          const a = book.find(l.account);
          if (!a)
            return {
              side: SIDE_LABELS[l.side],
              account: l.account,
              amount: l.amount,
              known: false,
            };
          const inc = increaseSide(a);
          const meaning =
            inc === null
              ? undefined
              : `${ELEMENT_LABELS[a.element]}${a.contra ? '（評価勘定）' : ''}の${inc === l.side ? '増加' : '減少'}`;
          return { side: SIDE_LABELS[l.side], account: a.name, amount: l.amount, meaning };
        }),
      };
    }),
    note: '形式（貸借の一致・科目の存在）だけの確認です。取引に合った科目かどうかは内容で判断してください',
  };
}

async function consumptionTax(args: Record<string, JsonValue>): Promise<JsonValue> {
  const amount = Math.round(Number(args.amount));
  if (!Number.isFinite(amount) || amount < 0)
    return { error: 'amount は 0 以上の整数で指定してください' };
  const mode = args.mode === 'included' ? 'included' : 'excluded';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str(args.date)) ? str(args.date) : today();
  const index = await fetchContentIndex();
  const ruleId = args.reduced === true ? 'consumption-tax-reduced' : 'consumption-tax-standard';
  const rule = index.rules.find((r) => r.id === ruleId);
  const rate = rule ? ruleValueAt(rule, date) : undefined;
  if (rate === undefined) return { error: `${date} に適用される税率が見つかりません` };
  const rounding: Rounding = 'floor';
  const r = calcConsumptionTax(amount, rate, mode, rounding);
  return {
    date,
    rate_percent: rate,
    rate_type: args.reduced === true ? '軽減税率' : '標準税率',
    net: r.net,
    tax: r.tax,
    gross: r.gross,
    rounding: ROUNDING_LABELS[rounding],
    note: '1 円未満は切り捨てで計算（端数処理は事業者が選べます）',
  };
}

function withholding(args: Record<string, JsonValue>): JsonValue {
  const fee = Math.round(Number(args.fee));
  const ct = Math.round(Number(args.consumption_tax ?? 0));
  if (!Number.isFinite(fee) || fee <= 0 || !Number.isFinite(ct) || ct < 0)
    return { error: 'fee は 1 以上、consumption_tax は 0 以上の整数で指定してください' };
  const r = rewardEntries({ fee, consumptionTax: ct, account: '支払手数料' });
  return {
    withholding_tax: r.tax,
    payment: r.payment,
    rule: '100 万円以下の部分は 10.21%、超える部分は 20.42%（1 円未満切り捨て）。司法書士など計算方法が違う報酬は対象外',
    entry: formatShiwake(r.entry),
  };
}

async function getProgress(): Promise<JsonValue> {
  const [index, progress, attempts] = await Promise.all([
    fetchContentIndex(),
    db.lessonProgress.toArray(),
    db.drillAttempts.toArray(),
  ]);
  const read = new Set(progress.filter((p) => p.readAt).map((p) => p.lessonId));
  const stats = summarize(attempts);
  const recentWrong = attempts
    .filter((a) => !a.correct)
    .sort((a, b) => b.at - a.at)
    .slice(0, 5)
    .map((a) => ({
      set: index.drills.find((d) => d.id === a.setId)?.title ?? a.setId,
      question_id: a.questionId,
      result: a.kind,
    }));
  return {
    tracks: index.tracks.map((t) => {
      const lessons = index.lessons.filter((l) => l.track === t.id);
      return {
        title: t.title,
        lessons_read: lessons.filter((l) => read.has(l.id)).length,
        lessons_total: lessons.length,
        unread: lessons
          .filter((l) => !read.has(l.id))
          .slice(0, 3)
          .map((l) => ({ id: l.id, title: l.title })),
      };
    }),
    drills: index.drills.map((d) => ({
      title: d.title,
      correct: stats.get(d.id)?.correct ?? 0,
      tried: stats.get(d.id)?.tried ?? 0,
      total: d.questionCount,
    })),
    recent_wrong: recentWrong,
  };
}

async function getLedger(): Promise<JsonValue> {
  const [book, records] = await Promise.all([getBook(), db.journal.toArray()]);
  if (records.length === 0) return { entries: 0, note: '帳簿にはまだ仕訳がありません' };
  const ledger = buildLedger(records, book);
  const tb = trialBalance(ledger);
  const s = buildStatements(ledger);
  const recent = [...records]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .slice(0, 5)
    .map((r) => ({
      date: r.date,
      memo: r.memo,
      lines: r.lines.map((l) => `${SIDE_LABELS[l.side]} ${l.account} ${l.amount}`),
    }));
  return {
    entries: records.length,
    balances: ledger.map((l) => ({
      account: l.account,
      element: ELEMENT_LABELS[l.element],
      balance: Math.abs(l.balance),
      side: l.balance >= 0 ? '借方' : '貸方',
    })),
    trial_balance_ok: tb.drTotal === tb.crTotal,
    total_assets: s.totalAssets,
    total_liabilities: s.totalLiabilities,
    total_equity: s.totalEquity,
    revenues: s.totalRevenues,
    expenses: s.totalExpenses,
    net_income: s.netIncome,
    unsettled: s.unsettled.map((u) => u.account),
    recent_entries: recent,
  };
}

async function getLesson(args: Record<string, JsonValue>): Promise<JsonValue> {
  const id = str(args.lesson_id).trim();
  try {
    const lesson = await loadLesson(id);
    const section = str(args.section).trim();
    const body = section ? (sectionText(lesson.body, section) ?? lesson.body) : lesson.body;
    return {
      id,
      title: lesson.meta.title,
      as_of: lesson.meta.asOf,
      basis: lesson.meta.basis.map((b) => b.name),
      headings: lesson.meta.headings.map((h) => h.text),
      text: body.replace(/```quiz[\s\S]*?```/g, '').slice(0, 1500),
    };
  } catch {
    return { error: `レッスン「${id}」が見つかりません`, hint: 'search_content で探せます' };
  }
}

export async function executeTool(call: ToolCallInfo): Promise<JsonValue> {
  const args = call.arguments;
  switch (call.name) {
    case 'search_help': {
      const topics = searchHelp(str(args.query));
      return topics.length > 0
        ? { topics: topics.map((t) => ({ title: t.title, body: t.body })) }
        : { topics: [], note: 'ヘルプに見当たりませんでした。推測で答えず、そう伝えてください' };
    }
    case 'search_content': {
      const hits = await searchContent(str(args.query), 6);
      return {
        results: hits.map((h) => ({
          kind: h.kind,
          id: h.id.slice(h.id.indexOf(':') + 1),
          title: h.title,
          snippet: h.snippet,
        })),
      };
    }
    case 'get_lesson':
      return getLesson(args);
    case 'lookup_account':
      return lookupAccount(str(args.name));
    case 'check_journal':
      return checkJournal(str(args.entry));
    case 'calc_consumption_tax':
      return consumptionTax(args);
    case 'calc_withholding':
      return withholding(args);
    case 'get_progress':
      return getProgress();
    case 'get_ledger':
      return getLedger();
    default:
      return { error: `ツール ${call.name} はありません` };
  }
}

export const TOOL_LABELS: Record<string, string> = {
  search_help: 'ヘルプを確認',
  search_content: 'レッスンを検索',
  get_lesson: 'レッスンを確認',
  lookup_account: '勘定科目を確認',
  check_journal: '仕訳を検証',
  calc_consumption_tax: '消費税を計算',
  calc_withholding: '源泉徴収を計算',
  get_progress: '学習記録を確認',
  get_ledger: '帳簿を集計',
};
