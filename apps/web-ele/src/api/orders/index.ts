import type { Order, OrderStatus } from './types';

import { requestClient } from '#/api/request';

export interface OrderListParams {
  /** YYYY-MM-DD（Asia/Taipei）— 省略時回該飯店所有訂單，量大、謹慎使用 */
  date?: string;
  hotelId?: string;
}

export const ordersApi = {
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
