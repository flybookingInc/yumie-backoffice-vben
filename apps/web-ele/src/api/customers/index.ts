import type { Customer, CustomerListResponse } from './types';

import { requestClient } from '#/api/request';

export const customersApi = {
  /** GET /v2/customers — 聚合該 hotel 全部 orders 出 unique 客戶名單 */
  list() {
    return requestClient.get<CustomerListResponse>('/customers');
  },
};

export type { Customer, CustomerListResponse };
