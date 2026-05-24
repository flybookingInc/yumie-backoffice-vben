import type {
  Customer,
  CustomerListParams,
  CustomerListResponse,
} from './types';

import { requestClient } from '#/api/request';

export const customersApi = {
  /** GET /v2/customers — 聚合該 hotel 指定日期範圍內 orders 出 unique 客戶名單 */
  list(params: CustomerListParams = {}) {
    return requestClient.get<CustomerListResponse>('/customers', { params });
  },
};

export type { Customer, CustomerListParams, CustomerListResponse };
