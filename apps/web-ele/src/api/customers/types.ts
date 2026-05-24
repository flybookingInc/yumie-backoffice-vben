/**
 * Customer (v3 新增) — 從 orders subcollection 聚合出每個獨特電話的訪客資料。
 *
 * Firestore 來源：`qk-list/{hotelId}/orders/*`
 * 聚合 key：`guestPhone`（解密後 E.164 電話）
 */
export interface Customer {
  /** 取消訂單次數（Canceled + CanceledByAdmin） */
  canceledCount: number;
  /** 已完成訂單次數（排除 cancel / no-show） */
  completedCount: number;
  /** Firebase Auth uid（若有）；guest 訂單可能為空 */
  customerId?: string;
  /** 第一次訂單時間（ISO bookingDatetime） */
  firstOrderAt: string;
  /** 解密後的 E.164 電話，作為唯一識別 */
  guestPhone: string;
  /** 最近一次訂單時間（ISO） */
  lastOrderAt: string;
  /** 最近一筆訂單的方案名稱 */
  lastPlanName?: string;
  /** 最近一筆訂單的狀態 */
  lastStatus: string;
  /** No Show 次數 */
  noShowCount: number;
  /** 總訂單數 */
  orderCount: number;
  /** 累積消費金額（totalPrice 加總） */
  totalSpent: number;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
}

export interface CustomerListParams {
  /** ISO datetime lower bound for order booking_datetime. */
  since?: string;
  /** ISO datetime upper bound for order booking_datetime. */
  until?: string;
}
