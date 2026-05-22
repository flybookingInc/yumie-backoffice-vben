import type {
  ExtrasItem,
  ExtrasItemCreateInput,
  ExtrasItemUpdateInput,
  ExtrasState,
} from './types';

import { requestClient } from '#/api/request';

export interface ExtrasListParams {
  hotelId?: string;
}

export const extrasApi = {
  /** POST /v2/extras */
  create(data: ExtrasItemCreateInput) {
    return requestClient.post<ExtrasItem>('/extras', data);
  },
  /** DELETE /v2/extras/:id */
  delete(id: string) {
    return requestClient.delete<{ deleted: string }>(`/extras/${id}`);
  },
  /** GET /v2/extras — list 7 items + enableExtras flag */
  list(params: ExtrasListParams = {}) {
    return requestClient.get<ExtrasState>('/extras', { params });
  },
  /** PUT /v2/extras/enable-toggle — superAdmin only */
  toggleEnable(enableExtras: boolean) {
    return requestClient.put<{ enableExtras: boolean }>(
      '/extras/enable-toggle',
      { enableExtras },
    );
  },
  /** PUT /v2/extras/:id */
  update(id: string, data: ExtrasItemUpdateInput) {
    return requestClient.put<ExtrasItem>(`/extras/${id}`, data);
  },
  /**
   * POST /v2/extras/items/:itemId/photo — upload extras image.
   * Path uses `items/:itemId` 而非 `:id/photo`，避免與 CRUD `:id` 衝突。
   */
  uploadPhoto(itemId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return requestClient.post<{ path: string; url: string }>(
      `/extras/items/${itemId}/photo`,
      formData,
    );
  },
};

export type {
  ExtrasItem,
  ExtrasItemCreateInput,
  ExtrasItemUpdateInput,
  ExtrasState,
};
