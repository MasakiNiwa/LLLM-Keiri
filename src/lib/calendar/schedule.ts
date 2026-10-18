/**
 * 経理の年間スケジュール（主な期限をプログラムが計算する）。
 * 期限が土曜・日曜・祝日・年末年始（12 月 29 日〜1 月 3 日）にあたるときは、次の平日にずらす
 * （国税・地方税・社会保険の期限は、休日なら翌日）。祝日は holiday-jp/holiday_jp のデータを使う。
 */
import type { HolidayLookup } from './holidays.ts';

export type ScheduleCategory = 'closing' | 'tax' | 'payroll' | 'social' | 'monthly';

export const SCHEDULE_CATEGORIES: Record<ScheduleCategory, string> = {
  closing: '決算',
  tax: '税金',
  payroll: '給与・年末調整',
  social: '社会保険・労働保険',
  monthly: '毎月の仕事',
};

export interface ScheduleItem {
  /** YYYY-MM-DD（土日なら翌月曜） */
  date: string;
  /** 本来の期限（土日でずらす前） */
  dueDate: string;
  title: string;
  category: ScheduleCategory;
  description: string;
  /** 詳しく学べるレッスン */
  lesson?: string;
  /** 期間で行うものの開始日 */
  from?: string;
  /** 期限をずらした理由（土日・祝日の名前・年末年始） */
  shiftedBecause?: string;
}

export interface ScheduleOptions {
  /** 決算月（1〜12） */
  closingMonth: number;
  /** 表示する期間の最初の月（YYYY-MM） */
  start: string;
  /** 何か月分を出すか */
  months?: number;
  /** 源泉所得税の納期の特例を受けている（給与の支払いを受ける人が常時 10 人未満） */
  specialWithholding?: boolean;
  /** 祝日（無ければ土日だけで判断する） */
  holidays?: HolidayLookup;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** 月末の日 */
const endOfMonth = (y: number, m: number) => new Date(y, m, 0);

/** 休みの日なら、その理由（平日なら null） */
export function closedReason(d: Date, holidays?: HolidayLookup): string | null {
  const name = holidays?.nameOf(ymd(d));
  if (name) return name;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 12 && day >= 29) || (m === 1 && day <= 3)) return '年末年始';
  if (d.getDay() === 0) return '日曜日';
  if (d.getDay() === 6) return '土曜日';
  return null;
}

/** 休みの日なら、次の平日にする */
export function nextBusinessDay(d: Date, holidays?: HolidayLookup): Date {
  const r = new Date(d);
  while (closedReason(r, holidays)) r.setDate(r.getDate() + 1);
  return r;
}

/** 期限の項目を作る関数（休日なら次の平日にずらす） */
const itemMaker =
  (holidays?: HolidayLookup) =>
  (
    due: Date,
    title: string,
    category: ScheduleCategory,
    description: string,
    lesson?: string,
    from?: Date,
  ): ScheduleItem => ({
    date: ymd(nextBusinessDay(due, holidays)),
    dueDate: ymd(due),
    shiftedBecause: closedReason(due, holidays) ?? undefined,
    title,
    category,
    description,
    lesson,
    from: from ? ymd(from) : undefined,
  });

/** 期間の主な期限を、日付の順に返す */
export function buildSchedule(opts: ScheduleOptions): ScheduleItem[] {
  const months = opts.months ?? 12;
  const item = itemMaker(opts.holidays);
  const [sy, sm] = opts.start.split('-').map(Number);
  const items: ScheduleItem[] = [];
  for (let i = 0; i < months; i++) {
    const y = sy + Math.floor((sm - 1 + i) / 12);
    const m = ((sm - 1 + i) % 12) + 1;
    const prev = m === 1 ? 12 : m - 1;

    // ---- 毎月 ----
    items.push(
      item(
        new Date(y, m - 1, 5),
        '月次決算（前月分）の締め',
        'monthly',
        `${prev} 月分の仕訳の入力漏れ・預金と売掛金・買掛金の残高を確かめ、試算表を作る（目安は月初の 5 営業日ほど。会社が決める）`,
        'practice-monthly-closing',
      ),
    );
    if (!opts.specialWithholding)
      items.push(
        item(
          new Date(y, m - 1, 10),
          `源泉所得税の納付（${prev} 月支払分）`,
          'tax',
          '前月に支払った給料・報酬から差し引いた源泉所得税を納める',
          'practice-payroll',
        ),
      );
    items.push(
      item(
        new Date(y, m - 1, 10),
        `住民税（特別徴収）の納付（${prev} 月支払分）`,
        'tax',
        '前月の給料から差し引いた住民税を、市区町村に納める（常時 10 人未満で特例を受けていれば年 2 回）',
        'practice-payroll',
      ),
      item(
        endOfMonth(y, m),
        `社会保険料の納付（${prev} 月分）`,
        'social',
        '前月分の健康保険料・厚生年金保険料（従業員と会社の負担分）が口座から引き落とされる',
        'practice-payroll',
      ),
      item(
        endOfMonth(y, m),
        '請求書の発行・支払いの締め',
        'monthly',
        '当月の売上の請求書を出し、仕入先・経費の支払いを済ませる（締め日・支払日は取引先との取り決めによる）',
        'practice-billing-collection',
      ),
    );

    // ---- 源泉所得税の納期の特例 ----
    if (opts.specialWithholding && m === 7)
      items.push(
        item(
          new Date(y, 6, 10),
          '源泉所得税の納付（1〜6 月支払分・納期の特例）',
          'tax',
          '納期の特例を受けている場合、1〜6 月に差し引いた源泉所得税をまとめて納める',
          'practice-payroll',
        ),
      );
    if (opts.specialWithholding && m === 1)
      items.push(
        item(
          new Date(y, 0, 20),
          '源泉所得税の納付（前年 7〜12 月支払分・納期の特例）',
          'tax',
          '納期の特例を受けている場合、7〜12 月に差し引いた源泉所得税をまとめて納める',
          'practice-payroll',
        ),
      );

    // ---- 年末・年始 ----
    if (m === 12)
      items.push(
        item(
          endOfMonth(y, 12),
          '年末調整',
          'payroll',
          '1 年間の給料から差し引いた源泉所得税と、本当の年税額との差を精算する（ふつう 12 月の最後の給料で）',
          'practice-payroll',
          new Date(y, 10, 1),
        ),
      );
    if (m === 1)
      items.push(
        item(
          new Date(y, 0, 31),
          '法定調書合計表・源泉徴収票の提出',
          'tax',
          '前年に支払った給料・報酬などの法定調書と合計表を税務署に出す',
          'tax-withholding',
        ),
        item(
          new Date(y, 0, 31),
          '給与支払報告書の提出',
          'tax',
          '前年の給料の支払いを、従業員の住む市区町村に報告する（翌年度の住民税の計算に使われる）',
          'practice-payroll',
        ),
        item(
          new Date(y, 0, 31),
          '償却資産の申告',
          'tax',
          '1 月 1 日に持っている事業用の償却資産（備品・機械など）を、市区町村に申告する（固定資産税）',
          'closing-depreciation',
        ),
      );

    // ---- 社会保険・労働保険 ----
    if (m === 7)
      items.push(
        item(
          new Date(y, 6, 10),
          '労働保険の年度更新',
          'social',
          '前年度の確定保険料と、今年度の概算保険料を申告・納付する（6 月 1 日から）',
          'practice-payroll',
          new Date(y, 5, 1),
        ),
        item(
          new Date(y, 6, 10),
          '社会保険の算定基礎届',
          'social',
          '4〜6 月の給料をもとに、9 月からの標準報酬月額（社会保険料のもと）を届け出る（7 月 1 日から）',
          'practice-payroll',
          new Date(y, 6, 1),
        ),
      );

    // ---- 決算・申告（期限がくる月に出す） ----
    const after = (k: number) => ((opts.closingMonth - 1 + k) % 12) + 1;
    if (m === opts.closingMonth)
      items.push(
        item(
          endOfMonth(y, m),
          '決算日',
          'closing',
          '事業年度の最終日。実地棚卸・残高の確認などを行い、決算整理に入る',
          'closing-overview',
        ),
      );
    if (m === after(2))
      items.push(
        item(
          endOfMonth(y, m),
          '法人税・消費税などの確定申告と納付',
          'tax',
          '決算日の翌日から 2 か月以内。法人税・地方法人税・住民税・事業税・消費税を申告・納付する（申告期限の延長の特例を受ければ申告は 1 か月延びるが、納付が遅れた分は利子税がかかる）',
          'tax-corporate-tax',
        ),
      );
    if (m === after(3))
      items.push(
        item(
          endOfMonth(y, m),
          '定時株主総会（目安）',
          'closing',
          '決算日から 3 か月以内に開くことが多い（基準日から 3 か月以内に権利を行使させるため）。計算書類の承認・配当の決議など',
          'closing-overview',
        ),
      );
    // 中間申告: 事業年度開始から 6 か月を過ぎた日から 2 か月以内（期首から 8 か月目の末日）
    const startMonth = (opts.closingMonth % 12) + 1;
    const midMonth = ((startMonth - 1 + 7) % 12) + 1;
    if (m === midMonth)
      items.push(
        item(
          endOfMonth(y, m),
          '法人税・消費税の中間申告と納付',
          'tax',
          '前期の税額が一定以上の会社は、事業年度の開始から 6 か月を過ぎた日から 2 か月以内に中間申告・納付をする（消費税は前期の税額によって年 1・3・11 回）',
          'tax-corporate-tax',
        ),
      );
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.category.localeCompare(b.category));
}
