import type { Order, OrderStatus } from './types';

import { requestClient } from '#/api/request';

export interface OrderListParams {
  /** YYYY-MM-DD（Asia/Taipei）。必填（或改用 from＋to，最多 31 天） */
  date?: string;
  from?: string;
  hotelId?: string;
  /** 完整電話：只回這支電話的訂單（伺服器端比對，回傳的電話仍是遮罩） */
  phone?: string;
  to?: string;
}

/** POST /v2/orders/:id/guest-phone 回傳 */
export interface RevealGuestPhoneResult {
  phone: string;
  reason: string;
  /** admin 今天還能看幾次；superAdmin 為 null */
  remaining: null | number;
}

export interface CreateAdminOrderInput {
  /** YYYY-MM-DD */
  checkInDate: string;
  /** HH:mm */
  checkInTime: string;
  /** 任何輸入會由後端 libphonenumber 解析（預設 TW）格式化為 E.164 */
  guestPhone: string;
  hotelId?: string;
  planId: string;
}

/** v1 makeOrderByAdmin 透傳回來的訊息（取常用欄位） */
export interface CreateAdminOrderResult {
  check_in_time?: string;
  checkinDatetime?: string;
  membershipBenefit?: {
    applied?: boolean;
    freeRestMinutes?: number;
    levelCode?: string;
  };
  msg?: string;
  plan_name?: string;
  price?: number | string;
  qkNumber?: string;
  statusCode: number;
  verifyNumber?: string;
}

export const ordersApi = {
  /** POST /v2/orders/admin — backoffice 手動建單 */
  createByAdmin(data: CreateAdminOrderInput) {
    return requestClient.post<CreateAdminOrderResult>('/orders/admin', data);
  },
  /** GET /v2/orders（一定要帶 date 或 from＋to） */
  list(params: OrderListParams) {
    return requestClient.get<Order[]>('/orders', { params });
  },
  /** POST /v2/orders/:id/guest-phone — 單筆完整電話（admin 每天 30 次、入住超過 30 天不給看） */
  revealGuestPhone(id: string) {
    return requestClient.post<RevealGuestPhoneResult>(
      `/orders/${id}/guest-phone`,
      {},
    );
  },
  /** PUT /v2/orders/:id/status */
  updateStatus(id: string, status: OrderStatus) {
    return requestClient.put<Order>(`/orders/${id}/status`, { status });
  },
};

export type { ExtraBuyItem, Order, OrderStatus } from './types';
