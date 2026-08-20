import { describe, expect, it } from 'vitest';

import { canRefundCancel } from '../refund-cancel';

describe('canRefundCancel', () => {
  it('ignores a checked-out PMS status before the scheduled checkout time', () => {
    const order = {
      checkInDate: '2026-08-20',
      checkinDatetime: '2026-08-19T16:00:00.000Z',
      flyKioskPmsStatus: 'checked_out',
      reservedMinutes: 360,
      status: '抵達',
    } as const;

    expect(
      canRefundCancel(order, Date.parse('2026-08-20T05:59:59+08:00')),
    ).toBe(true);
  });

  it('keeps the refund-cancel action before checkout', () => {
    expect(
      canRefundCancel(
        {
          checkInDate: '2026-08-20',
          checkinDatetime: '2026-08-19T16:00:00.000Z',
          reservedMinutes: 360,
          status: '抵達',
        },
        Date.parse('2026-08-20T05:59:59+08:00'),
      ),
    ).toBe(true);
  });

  it('hides the refund-cancel action when the scheduled rest time has elapsed', () => {
    expect(
      canRefundCancel(
        {
          checkInDate: '2026-08-20',
          checkinDatetime: '2026-08-19T16:00:00.000Z',
          reservedMinutes: 360,
          status: '抵達',
        },
        Date.parse('2026-08-20T06:00:01+08:00'),
      ),
    ).toBe(false);
  });

  it('ignores an hourly not-confirmed PMS status before the scheduled checkout time', () => {
    const order = {
      checkInDate: '2026-08-20',
      checkinDatetime: '2026-08-19T16:00:00.000Z',
      flyKioskPmsStatus: 'not_confirmed',
      reservedMinutes: 360,
      status: '抵達',
    } as const;

    expect(
      canRefundCancel(order, Date.parse('2026-08-20T05:59:59+08:00')),
    ).toBe(true);
  });
});
