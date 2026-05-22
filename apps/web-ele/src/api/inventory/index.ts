import type {
  InventoryBatchInput,
  InventoryListAllParams,
  InventoryListAllResponse,
  InventoryListParams,
  InventoryListResponse,
  InventorySyncToHotelDocInput,
  InventoryUpdateInput,
} from './types';

import { requestClient } from '#/api/request';

export const inventoryApi = {
  /** PUT /v2/inventory/batch */
  batch(data: InventoryBatchInput) {
    return requestClient.put<unknown>('/inventory/batch', data);
  },
  /** GET /v2/inventory — 單一 roomType */
  list(params: InventoryListParams) {
    return requestClient.get<InventoryListResponse>('/inventory', { params });
  },
  /** GET /v2/inventory/all — 一次取該 hotel 所有 roomType 的 inventory */
  listAll(params: InventoryListAllParams) {
    return requestClient.get<InventoryListAllResponse>('/inventory/all', {
      params,
    });
  },
  /** PUT /v2/inventory/sync-to-hotel-doc */
  syncToHotelDoc(data: InventorySyncToHotelDocInput = {}) {
    return requestClient.put<unknown>('/inventory/sync-to-hotel-doc', data);
  },
  /** PUT /v2/inventory */
  update(data: InventoryUpdateInput) {
    return requestClient.put<unknown>('/inventory', data);
  },
};

export type {
  InventoryBatchInput,
  InventoryListParams,
  InventoryListResponse,
  InventorySyncToHotelDocInput,
  InventoryUpdateInput,
  InventoryUpdateRoomTypeEntry,
} from './types';

/** 產生一天 48（或對應 interval）個時段的 `HHmm` keys */
export function generateTimeFragments(bookingInterval = 30): string[] {
  const minutes = Math.max(1, Math.floor(bookingInterval));
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += minutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    out.push(`${hh}${mm}`);
  }
  return out;
}

/** `HHmm` → `HH:mm`（顯示用） */
export function formatHHmm(key: string): string {
  return `${key.slice(0, 2)}:${key.slice(2, 4)}`;
}
