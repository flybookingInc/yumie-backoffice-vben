import type { Order, OrderStatus } from './types';

import { requestClient } from '#/api/request';

export interface OrderListParams {
  /** YYYY-MM-DD（Asia/Taipei）— 省略時回該飯店所有訂單，量大、謹慎使用 */
  date?: string;
  hotelId?: string;
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
  /** GET /v2/orders */
  list(params: OrderListParams = {}) {
    return requestClient.get<Order[]>('/orders', { params });
  },
  /** PUT /v2/orders/:id/status */
  updateStatus(id: string, status: OrderStatus) {
    return requestClient.put<Order>(`/orders/${id}/status`, { status });
  },
};

export type { ExtraBuyItem, Order, OrderStatus } from './types';
