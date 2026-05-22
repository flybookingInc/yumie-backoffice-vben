/**
 * Hotel user — Yumie 後台管理員/staff 帳號（**不**是顧客）。對齊 plan §1.3 真實
 * Firestore `users/` schema。
 *
 * Field 命名沿用舊 backoffice：
 *   - `rule` （不是 role）
 *   - `hotelGroup` （不是 accessibleHotels）
 *
 * Password 不在 GET 回應裡（v2 後端只在 POST/PUT 寫入時收）。
 */
export type HotelUserRule = 'admin' | 'superAdmin';

export interface HotelUser {
  /** Firebase Auth uid */
  authUid: string;
  email: string;
  enabled: boolean;
  hotelGroup: string[];
  /** Firestore doc id（與 authUid 獨立） */
  id: string;
  name: string;
  phone?: string;
  rule: HotelUserRule;
}

export interface HotelUserCreateInput {
  email: string;
  enabled?: boolean;
  hotelGroup: string[];
  name: string;
  password: string;
  phone?: string;
  rule: HotelUserRule;
}

/** 編輯時 password 可留空表示不變；email 後端視同 immutable */
export type HotelUserUpdateInput = Partial<
  Omit<HotelUserCreateInput, 'email' | 'password'>
> & {
  password?: string;
};
