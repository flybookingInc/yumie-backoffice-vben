/**
 * SMS 報表 — 對齊 plan §1.3 + 舊 qk-sms / qk-sms-billing。
 *
 * Firestore：`qk-list/{hotelId}/bigData/sms/smsRecords/{auto-id}` = { phone, timestamp }
 *
 * Endpoints:
 * - `/v2/sms/records`：單一飯店、依日期範圍列 SmsRecord，phone 後 3 碼遮罩
 * - `/v2/sms/billing`：**跨所有飯店**、依日期範圍計費（superAdmin only）
 *   公式：`totalAmount = smsCount × 2.5`、`beforeTaxAmount = totalAmount / 1.05`
 */

export interface SmsRecord {
  id: string;
  /** masked phone (last 3 digits → 'xxx') */
  phone: string;
  /** ISO string */
  sentAt: string;
}

export interface SmsBillingRow {
  beforeTaxAmount: number;
  hotelId: string;
  hotelName: string;
  smsCount: number;
  totalAmount: number;
}

export interface SmsBillingTotals {
  beforeTaxAmount: number;
  smsCount: number;
  totalAmount: number;
}

export interface SmsBillingStats {
  rows: SmsBillingRow[];
  totals: SmsBillingTotals;
}
