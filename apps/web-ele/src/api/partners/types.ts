/**
 * 異業合作夥伴（保養廠推薦）— 對齊後端 /v2/partners。
 * hotelId 由 requestClient 自動注入，不必手動帶。
 */
export interface Partner {
  code: string;
  partnerName: string;
  contact: string;
  freeRestMinutes: number;
  rewardPerBooking: number;
  minReservedMinutes: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
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
