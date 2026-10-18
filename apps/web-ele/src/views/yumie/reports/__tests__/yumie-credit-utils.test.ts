import { describe, expect, it } from 'vitest';

import {
  creditDateRange,
  creditRangeError,
  safeCreditCell,
} from '../yumie-credit-utils';

describe('credit report dates and exported text', () => {
  it('uses Taipei date across UTC month boundaries', () => {
    const now = new Date('2026-09-30T16:30:00Z');
    expect(creditDateRange('currentMonth', now)).toEqual([
      '2026-10-01',
      '2026-10-01',
    ]);
    expect(creditDateRange('yesterday', now)).toEqual([
      '2026-09-30',
      '2026-09-30',
    ]);
    expect(creditDateRange('lastMonth', now)).toEqual([
      '2026-09-01',
      '2026-09-30',
    ]);
    expect(creditDateRange('today', now)).toEqual(['2026-10-01', '2026-10-01']);
  });
  it('validates actual dates, order and the inclusive 12-month limit', () => {
    expect(creditRangeError(['2025-10-07', '2026-10-06'])).toBe('');
    expect(creditRangeError(['2025-10-07', '2026-10-07'])).toContain('12');
    expect(creditRangeError(['2024-02-29', '2025-02-27'])).toBe('');
    expect(creditRangeError(['2024-02-29', '2025-02-28'])).toContain('12');
    expect(creditRangeError(['2026-02-30', '2026-03-01'])).not.toBe('');
    expect(creditRangeError(['2026-10-07', '2026-09-30'])).not.toBe('');
    expect(creditRangeError(null)).not.toBe('');
  });
  it('preserves numbers and protects spreadsheet formula prefixes', () => {
    expect(safeCreditCell(111)).toBe(111);
    expect(safeCreditCell('00131')).toBe('00131');
    for (const text of [
      '=HYPERLINK("bad")',
      '+886900000000',
      '-cmd',
      '@SUM(A1)',
      '  =1',
      '\t+1',
    ]) {
      expect(safeCreditCell(text)).toBe(`'${text}`);
    }
  });
});
