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

/**
 * `/v2/sms/verification-code` 回應 — 櫃檯查客人當下簡訊驗證碼。
 *
 * `result`：not_found（查無）/ expired（過期，不回 code）/ revealed（有效，回明文 code）。
 * `expiresAt` 為 legacy 有效邊界（= sentAt + 16 分，對齊後端截斷分鐘的揭露/驗證邏輯）；
 * 前端倒數一律以此值為準，不自行用 15 分重算。
 */
export interface SmsVerificationLookup {
  /** 明文驗證碼；僅 result==='revealed' 時非 null。 */
  code: null | string;
  expired: boolean;
  /** ISO string；有效邊界（sentAt + 16 分）。 */
  expiresAt: null | string;
  found: boolean;
  result: 'expired' | 'not_found' | 'revealed';
  /** ISO string；發送時間。 */
  sentAt: null | string;
  status: string;
  verified: boolean;
}
