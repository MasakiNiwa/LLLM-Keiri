import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookA,
  BookOpenText,
  CornerDownLeft,
  FileSpreadsheet,
  Network,
  PenLine,
  Search,
  Tags,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { ALL_FEATURES } from '@/app/navItems';
import { useAccountSheet } from '@/features/accounts/accountSheetStore';
import { useContentIndex } from '@/features/content/contentStore';
import { useSearch } from '@/features/learn/useSearch';
import { cn } from '@/lib/utils/cn';
import { useCommand } from './commandStore';
import { matchFeatures } from './matchFeatures';

interface Result {
  key: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  run: () => void;
}

const norm = (s: string) => s.normalize('NFKC').toLowerCase();

/**
 * コマンドパレット: すべての機能と、レッスン・問題・勘定科目・用語・演習・連結の事例を、1 つの検索欄から開く。
 * ヘッダーの検索ボタン、または ⌘K / Ctrl+K で開く。
 */
export function CommandPalette() {
  const open = useCommand((s) => s.open);
  const setOpen = useCommand((s) => s.setOpen);
  const ref = useRef<HTMLDialogElement>(null);

  // ⌘K / Ctrl+K で開く・閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useCommand.getState().open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      aria-label="機能と学習データを探す"
      className="mx-auto mt-[8dvh] w-[min(94vw,36rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-left text-slate-900 shadow-2xl backdrop:bg-slate-900/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      {open && <PaletteBody close={() => setOpen(false)} />}
    </dialog>
  );
}

function PaletteBody({ close }: { close: () => void }) {
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const [, navigate] = useLocation();
  const { index } = useContentIndex();
  const { hits } = useSearch(query, 120);
  const go = (to: string) => () => {
    close();
    navigate(to);
  };

  const results = useMemo<{ title: string; items: Result[] }[]>(() => {
    const features = matchFeatures(ALL_FEATURES, query).map<Result>((f) => ({
      key: `f:${f.to}`,
      label: f.label,
      sub: f.description ?? '',
      icon: <f.icon />,
      run: go(f.to),
    }));
    if (!query.trim()) return [{ title: 'すべての機能', items: features }];
    const q = norm(query.trim());
    const extra: Result[] = [
      ...(index?.exercises ?? [])
        .filter((e) => norm(e.title).includes(q))
        .map((e) => ({
          key: `e:${e.id}`,
          label: e.title,
          sub: '決算の総合演習',
          icon: <FileSpreadsheet />,
          run: go(`/exercise/${e.id}`),
        })),
      ...(index?.consolidations ?? [])
        .filter((c) => norm(c.title).includes(q))
        .map((c) => ({
          key: `c:${c.id}`,
          label: c.title,
          sub: '連結の事例',
          icon: <Network />,
          run: go(`/consolidation/${c.id}`),
        })),
    ];
    const content = (hits ?? []).slice(0, 8).map<Result>((h) => {
      const id = h.id.slice(h.id.indexOf(':') + 1);
      const open = () => {
        close();
        useAccountSheet.getState().open(id);
      };
      return {
        key: h.id,
        label: h.title,
        sub: { lesson: 'レッスン', drill: '練習問題', account: '勘定科目', term: '用語' }[h.kind],
        icon:
          h.kind === 'lesson' ? (
            <BookOpenText />
          ) : h.kind === 'drill' ? (
            <PenLine />
          ) : h.kind === 'term' ? (
            <BookA />
          ) : (
            <Tags />
          ),
        run:
          h.kind === 'lesson' ? go(`/learn/${id}`) : h.kind === 'drill' ? go(`/drill/${id}`) : open,
      };
    });
    return [
      { title: '機能', items: features },
      { title: '学習データ', items: [...extra, ...content] },
    ].filter((g) => g.items.length);
    // go は毎回作り直してよい（navigate と close は変わらない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, hits, index]);

  const flat = results.flatMap((g) => g.items);
  const current = Math.min(sel, Math.max(flat.length - 1, 0));
  let n = -1;
  return (
    <div className="flex max-h-[80dvh] flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
        <Search className="size-5 shrink-0 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSel(Math.min(current + 1, flat.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSel(Math.max(current - 1, 0));
            } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              flat[current]?.run();
            }
          }}
          placeholder="機能・レッスン・科目・用語を探す"
          aria-label="検索"
          enterKeyHint="go"
          className="h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-slate-400 sm:text-base"
        />
        <kbd className="hidden rounded border border-slate-300 px-1.5 text-xs text-slate-500 sm:block dark:border-slate-700">
          Esc
        </kbd>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {flat.length === 0 && (
          <p className="p-4 text-center text-sm text-slate-500">見つかりませんでした</p>
        )}
        {results.map((g) => (
          <div key={g.title} className="mb-2">
            <div className="px-2 py-1 text-xs font-semibold text-slate-500">{g.title}</div>
            <ul>
              {g.items.map((r) => {
                n++;
                const active = n === current;
                const idx = n;
                return (
                  <li key={r.key}>
                    <button
                      type="button"
                      onClick={r.run}
                      onMouseMove={() => setSel(idx)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left',
                        active && 'bg-accent-50 dark:bg-accent-900/30',
                      )}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-accent-700 dark:bg-slate-800 dark:text-accent-300 [&_svg]:size-4">
                        {r.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.label}</span>
                        <span className="block truncate text-xs text-slate-500">{r.sub}</span>
                      </span>
                      {active && <CornerDownLeft className="size-4 shrink-0 text-slate-400" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
