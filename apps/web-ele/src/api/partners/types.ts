/**
 * 異業合作夥伴（保養廠推薦）— 對齊後端 /v2/partners。
 * hotelId 由 requestClient 自動注入，不必手動帶。
 */
export type PartnerAccountStatus =
  | 'active'
  | 'authReadyDisabled'
  | 'disabled'
  | 'provisioning';

export interface Partner {
  code: string;
  partnerName: string;
  contact: string;
  freeRestMinutes: number;
  rewardPerBooking: number;
  minReservedMinutes: number;
  active: boolean;
  /** 夥伴登入帳號（門戶用）。未建立則為 undefined。 */
  accountEmail?: string;
  accountStatus?: PartnerAccountStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartnerAccountResult {
  accountEmail?: string;
  accountStatus?: PartnerAccountStatus;
  code: string;
  /** 建立時未帶密碼 → 後端產生的設定連結（linkError 時為 null）。 */
  linkError?: boolean;
  resetLink?: string;
  setupLink?: null | string;
}

/** 建立/更新輸入。建立時須帶 code（不可後續修改）。 */
export interface PartnerInput {
  active?: boolean;
  code?: string;
  contact?: string;
  freeRestMinutes?: number;
  minReservedMinutes?: number;
  partnerName: string;
  rewardPerBooking?: number;
}

export interface PartnerPerformanceRow {
  /** 抵達筆數 */
  arrivedCount: number;
  /** 抵達成交金額 */
  arrivedRevenue: number;
  /** 平均客單價（抵達） */
  avgOrderValue: number;
  /** 轉換數（歸因訂單） */
  bookingCount: number;
  partnerName: string;
  referralCode: string;
  /** 回饋金成本（Σ 抵達訂單 rewardPerBooking 快照） */
  rewardCost: number;
}

export interface PartnerReportParams {
  /** YYYY-MM-DD */
  endDate: string;
  hotelId?: string;
  /** YYYY-MM-DD */
  startDate: string;
}

// ===== 回饋帳本 / 結算 =====

export type RewardEntryStatus = 'pending' | 'settled' | 'void';
export type SettlementStatus = 'paid' | 'settled';

export interface AuditActor {
  email?: string;
  uid: string;
}

export interface RewardEntry {
  amount: number;
  bookingDatetime: string;
  checkInDate: string;
  checkinDatetime: string;
  createdAt: string;
  customerId: string;
  orderId: string;
  partnerName: string;
  referralCode: string;
  settledAt?: string;
  settlementId: null | string;
  status: RewardEntryStatus;
  updatedAt: string;
}

/** reconcile 預覽：per-夥伴 pending 摘要 */
export interface SettlementPreviewGroup {
  entryCount: number;
  partnerName: string;
  referralCode: string;
  totalAmount: number;
}

export interface Settlement {
  createdAt: string;
  createdBy: AuditActor;
  entryCount: number;
  month: string;
  paidAt?: string;
  paidBy?: AuditActor;
  partnerName: string;
  payoutRef?: string;
  periodEnd: string;
  periodStart: string;
  referralCode: string;
  settlementId: string;
  status: SettlementStatus;
  totalAmount: number;
  updatedAt: string;
}

export interface SettleRunResult {
  settlements: Settlement[];
  skippedStale: number;
}
