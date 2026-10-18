import type { CreditReport, CreditReportRow } from '#/api/yumie-credit';

export const sampleRow: CreditReportRow = {
  category: 'canceled',
  checkInDate: '2026-09-19',
  checkinAt: '2026-09-19T06:00:00Z',
  expectedAmount: 111,
  grossAmount: 111,
  guestPhone: '+886900000000',
  hotelId: 'other-hotel',
  hotelName: '另一間授權旅館',
  id: 'spend-1',
  lifetimeGrossAmount: 111,
  lifetimeRefundAmount: 111,
  netAmount: 0,
  orderId: 'order-77100',
  orderNumber: '77100',
  planName: '休息專案',
  redeemedAt: '2026-09-19T01:00:00Z',
  refundedAt: '2026-09-19T05:20:44Z',
  refundAmount: 111,
  refundStatus: 'refunded',
  reviewReasons: [],
  status: 'CanceledByAdmin',
  totalPrice: 790,
  unrefundedAmount: 0,
};

export function sampleReport(
  overrides: Partial<CreditReport> = {},
): CreditReport {
  const summary = {
    grossAmount: 111,
    refundAmount: 111,
    netAmount: 0,
    orderCount: 1,
    reviewCount: 0,
    reviewAmount: 0,
  };
  return {
    asOf: '2026-10-07T02:00:00Z',
    byHotel: [
      { ...summary, hotelId: 'other-hotel', hotelName: sampleRow.hotelName },
    ],
    byPeriod: [{ ...summary, period: '2026-09-19' }],
    categories: [{ ...summary, category: 'canceled' }],
    filters: {
      mode: 'stay',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      hotelIds: ['other-hotel'],
      groupBy: 'day',
      search: '',
    },
    hotelOptions: [
      { hotelId: 'current-hotel', hotelName: '目前旅館' },
      { hotelId: 'other-hotel', hotelName: sampleRow.hotelName },
    ],
    items: [{ ...sampleRow }],
    page: 1,
    pageSize: 50,
    snapshotId: 'frozen-result-1',
    summary,
    total: 1,
    ...overrides,
  };
}
