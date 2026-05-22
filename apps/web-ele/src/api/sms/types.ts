/**
 * SMS 報表 — 對齊 plan §1.3。Firestore 真實 shape：
 *
 *   qk-list/{hotelId}/bigData/sms/smsRecords/{auto-id}
 *     { phone: string (E.164), timestamp: Timestamp }
 *   qk-list/{hotelId}/bigData/sms/smsCount/{YYYY-MM}
 *     { count: number, [date 'YYYY-MM-DD']: number }
 *
 * v2 normalize：phone 後 3 碼遮罩成 'xxx'（隱私）；timestamp → ISO 字串。
 */

export interface SmsRecord {
  id: string;
  /** masked phone (last 3 digits → 'xxx') */
  phone: string;
  /** ISO string */
  sentAt: string;
}

export interface SmsBillingMonth {
  /** YYYY-MM-DD → 當日筆數 */
  byDate: Record<string, number>;
  /** 月總筆數 */
  count: number;
  /** 'YYYY-MM' */
  period: string;
}

export interface SmsBillingStats {
  months: SmsBillingMonth[];
  totalCount: number;
}
