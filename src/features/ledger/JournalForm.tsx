import { useState } from 'react';
import { Eraser, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useContent } from '@/features/content/contentStore';
import { draftFromLines, draftProblems, draftToLines, emptyDraft } from '@/features/journal/draft';
import { JournalInput } from '@/features/journal/JournalInput';
import { today } from '@/lib/content/rules';
import type { JournalRecord } from '@/lib/db/db';
import { totals } from '@/lib/journal/balance';
import { errorMessage } from '@/lib/utils/format';
import { addJournal, updateJournal } from './journalRepo';

const inputClass =
  'h-10 rounded-lg border border-slate-300 bg-white px-2 text-[16px] sm:text-sm dark:border-slate-600 dark:bg-slate-900';

/** 帳簿に仕訳を追加する（editing を渡すと、その仕訳の修正） */
export function JournalForm({ editing, onDone }: { editing?: JournalRecord; onDone?: () => void }) {
  const book = useContent((s) => s.book);
  const [date, setDate] = useState(editing?.date ?? today());
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [draft, setDraft] = useState(() =>
    editing ? draftFromLines(editing.lines) : emptyDraft(),
  );
  const [problems, setProblems] = useState<string[]>([]);

  const clear = () => {
    setMemo('');
    setDraft(emptyDraft());
    setProblems([]);
  };

  const save = async () => {
    if (!book) return;
    const p = draftProblems(draft);
    const lines = draftToLines(draft);
    if (lines.length === 0) p.push('仕訳を入力してください');
    for (const l of lines) {
      if (l.account && !book.find(l.account))
        p.push(`「${l.account}」は勘定科目の一覧にありません`);
    }
    const t = totals(lines);
    if (p.length === 0 && t.dr !== t.cr)
      p.push(
        `借方の合計（${t.dr.toLocaleString()}）と貸方の合計（${t.cr.toLocaleString()}）が一致していません`,
      );
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) p.push('日付を入力してください');
    setProblems(p);
    if (p.length > 0) return;
    try {
      if (editing) {
        await updateJournal(editing.id, { date, memo: memo.trim(), lines }, book);
        toast.success('仕訳を直しました');
        onDone?.();
      } else {
        await addJournal({ date, memo: memo.trim(), lines }, book);
        toast.success('仕訳を追加しました');
        // 日付はそのまま残す（同じ日の取引を続けて入れやすいように）
        setMemo('');
        setDraft(emptyDraft());
      }
    } catch (e) {
      toast.error(`保存できませんでした: ${errorMessage(e)}`);
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <h2 className="font-semibold">{editing ? '仕訳を直す' : '仕訳を入力'}</h2>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="日付"
          className={inputClass}
        />
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="摘要（取引の説明）"
          aria-label="摘要"
          className={`${inputClass} min-w-0`}
        />
      </div>
      <JournalInput value={draft} onChange={setDraft} />
      {problems.length > 0 && (
        <ul className="text-sm text-rose-600 dark:text-rose-400">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void save()}>
          {editing ? <Save /> : <Plus />}
          {editing ? '保存' : '帳簿に追加'}
        </Button>
        {editing ? (
          <Button variant="ghost" onClick={onDone}>
            <X />
            やめる
          </Button>
        ) : (
          <Button variant="ghost" onClick={clear}>
            <Eraser />
            クリア
          </Button>
        )}
      </div>
    </Card>
  );
}
