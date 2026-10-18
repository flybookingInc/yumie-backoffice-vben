export type CreditReportMode = 'ledger' | 'stay';
export type CreditReportGroup = 'day' | 'month';
export type CreditCategory =
  | 'arrived'
  | 'canceled'
  | 'noshow'
  | 'unknown'
  | 'upcoming';

export interface CreditReportQuery {
  endDate: string;
  groupBy: CreditReportGroup;
  hotelIds: string;
  mode: CreditReportMode;
  page?: number;
  pageSize?: number;
  search: string;
  snapshotId?: string;
  startDate: string;
}
export interface CreditReportSummary {
  grossAmount: number;
  netAmount: number;
  orderCount: number;
  refundAmount: number;
  reviewAmount: number;
  reviewCount: number;
}
export interface CreditHotelOption {
  hotelId: string;
  hotelName: string;
}
export interface CreditReportRow {
  expectedAmount: number;
  grossAmount: number;
  netAmount: number;
  refundAmount: number;
  category: CreditCategory;
  checkInDate: null | string;
  checkinAt: null | string;
  guestPhone: string;
  hotelId: null | string;
  hotelName: string;
  id: string;
  lifetimeGrossAmount: number;
  lifetimeRefundAmount: number;
  orderId: null | string;
  orderNumber: string;
  planName: string;
  redeemedAt: null | string;
  refundedAt: null | string;
  refundStatus: 'none' | 'pending_review' | 'refunded';
  reviewReasons: string[];
  status: string;
  totalPrice: null | number;
  unrefundedAmount: number;
}
export interface CreditReport {
  asOf: string;
  byHotel: (CreditReportSummary & {
    hotelId: null | string;
    hotelName: string;
  })[];
  byPeriod: (CreditReportSummary & { period: string })[];
  categories: (CreditReportSummary & { category: CreditCategory })[];
  filters: {
    endDate: string;
    groupBy: CreditReportGroup;
    hotelIds: string[];
    mode: CreditReportMode;
    search: string;
    startDate: string;
  };
  hotelOptions: CreditHotelOption[];
  items: CreditReportRow[];
  page: number;
  pageSize: number;
  snapshotId: string;
  summary: CreditReportSummary;
  total: number;
}
