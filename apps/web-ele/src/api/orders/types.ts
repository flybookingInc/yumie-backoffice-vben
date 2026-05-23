/**
 * Order — 訂單。對齊 plan §1.3 真實 Firestore + §1.4 v2 normalize。
 *
 * v2 後端已處理：
 * - snake_case → camelCase（customer_id → customerId，check_in_date → checkInDate, etc.）
 * - phone_number AES 解密 → guestPhone（plain）
 * - 價格 / reservedMinutes string → number
 * - extraBuy '' → { items: [] }
 *
 * 前端拿到的就是這個 clean shape。
 */
/**
 * Order status enum (Firestore raw values)：
 * - `OK`: 正常
 * - `抵達`: 客人已到
 * - `Canceled`: 客戶端取消（yumie-frontend 客人自行取消）
 * - `CanceledByAdmin`: 業者後台取消（display: "取消(業者)"）
 * - `NoShow`: 客人未到（業者標記，display: "No Show"）
 */
export type OrderStatus =
  | 'Canceled'
  | 'CanceledByAdmin'
  | 'NoShow'
  | 'OK'
  | '抵達';

export interface ExtraBuyItem {
  itemAmt?: number;
  itemName?: string;
  itemPrice?: number | string;
}

export interface Order {
  associateRoomTypeId?: string;
  bookingDatetime?: string;
  channel?: string;
  checkInDate: string;
  checkInTime?: string;
  checkinDatetime?: string;
  customerId?: string;
  extraBuy: { items: ExtraBuyItem[] };
  flyKioskCode?: string;
  flyKioskPmsId?: string;
  flyKioskPmsStatus?: string;
  guestPhone: string;
  id: string;
  loyalty?: unknown;
  loyaltyPrivacyMode?: boolean;
  membershipBenefit?: unknown;
  notice?: string;
  note?: string;
  planId?: string;
  planName?: string;
  priceCommission: number;
  pricePrepaid: number;
  priceRemaining: number;
  qkNumber?: string;
  reservedMinutes: number;
  roomTypeId?: string;
  status: OrderStatus;
  totalPrice: number;
  verifyNumber?: string;
  wiseHotelCode?: string;
  wisePmsId?: string;
  wisePmsStatus?: string;
}
