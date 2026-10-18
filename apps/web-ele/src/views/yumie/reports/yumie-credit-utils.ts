import type { CreditCategory } from '#/api/yumie-credit';

export type DatePreset = 'currentMonth' | 'lastMonth' | 'today' | 'yesterday';

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function taipeiToday(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

export function creditDateRange(
  preset: DatePreset,
  now = new Date(),
): [string, string] {
  const today = taipeiToday(now);
  const day = new Date(`${today}T00:00:00Z`);
  switch (preset) {
    case 'lastMonth': {
      day.setUTCDate(0);
      const end = isoDate(day);
      day.setUTCDate(1);
      return [isoDate(day), end];
    }
    case 'today': {
      return [today, today];
    }
    case 'yesterday': {
      day.setUTCDate(day.getUTCDate() - 1);
      return [isoDate(day), isoDate(day)];
    }
    default: {
      return [`${today.slice(0, 7)}-01`, today];
    }
  }
}

export function creditRangeError(range: null | string[]): string {
  if (!range || range.length !== 2) return '請選擇完整查詢期間';
  const [start, end] = range;
  if (
    !start ||
    !end ||
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end)
  ) {
    return '日期格式有誤';
  }
  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (
    !Number.isFinite(first.getTime()) ||
    !Number.isFinite(last.getTime()) ||
    isoDate(first) !== start ||
    isoDate(last) !== end ||
    start > end
  )
    return '請確認起訖日期';
  const max = new Date(first);
  max.setUTCFullYear(max.getUTCFullYear() + 1);
  if (max.getUTCMonth() !== first.getUTCMonth()) max.setUTCDate(0);
  if (last >= max) return '單次查詢最多 12 個月';
  return '';
}

export const creditCategoryLabels: Record<CreditCategory, string> = {
  arrived: '已抵達',
  canceled: '取消',
  noshow: 'NoShow 保留扣抵',
  unknown: '待核對分類',
  upcoming: '尚未入住',
};

export function creditStatusLabel(status: string): string {
  return (
    {
      Canceled: '取消（客人）',
      CanceledByAdmin: '取消（業者）',
      NoShow: 'NoShow',
      OK: '尚未入住',
      抵達: '已抵達',
    }[status] ??
    (status || '未能對應訂單')
  );
}

export function creditRefundLabel(status: string): string {
  return (
    { none: '未退還', pending_review: '待核對', refunded: '已退還' }[status] ??
    status
  );
}

/** Keep imported text as text even when spreadsheets recognize formula prefixes. */
export function safeCreditCell(
  value: null | number | string | undefined,
): number | string {
  if (typeof value === 'number') return value;
  const text = value ?? '';
  // Leading control characters must match so disguised formulas are caught.
  // eslint-disable-next-line no-control-regex
  return /^[\s\u0000-\u001F]*[=+@-]/u.test(text) ? `'${text}` : text;
}
