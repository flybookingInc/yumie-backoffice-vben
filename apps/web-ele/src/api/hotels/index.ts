import type {
  HotelCreateInput,
  HotelDoc,
  HotelSummary,
  HotelUpdateInput,
} from './types';

import { requestClient } from '#/api/request';

export const hotelsApi = {
  /** POST /v2/hotels — superAdmin */
  create(data: HotelCreateInput) {
    return requestClient.post<HotelSummary>('/hotels', data);
  },
  /** DELETE /v2/hotels/:id — superAdmin */
  delete(id: string) {
    return requestClient.delete<{ deleted: string }>(`/hotels/${id}`);
  },
  /** GET /v2/hotels/:id — admin or superAdmin */
  get(id: string) {
    return requestClient.get<HotelDoc>(`/hotels/${id}`);
  },
  /** GET /v2/hotels — superAdmin only */
  list() {
    return requestClient.get<HotelSummary[]>('/hotels');
  },
  /** GET /v2/hotels/:id/loyalty/config — superAdmin only（cashbackCampaignId + hasRefreshToken） */
  getLoyaltyConfig(id: string) {
    return requestClient.get<{
      cashbackCampaignId: null | string;
      hasRefreshToken: boolean;
      hotelId: string;
    }>(`/hotels/${id}/loyalty/config`);
  },
  /** PUT /v2/hotels/:id/loyalty/toggle — superAdmin */
  toggleLoyalty(id: string, enabled: boolean) {
    return requestClient.put<{ hotelId: string; loyaltyEnabled: boolean }>(
      `/hotels/${id}/loyalty/toggle`,
      { enabled },
    );
  },
  /**
   * POST /v2/hotels/:id/loyalty/config/test — superAdmin only
   *
   * 強制叫一次 upstream /token/refresh/ 驗證目前儲存的 refresh token 仍有效。
   * 回應 ok=true/false 標示成敗（HTTP 一律 200，所以不會丟錯）。
   */
  testLoyaltyConfig(id: string) {
    return requestClient.post<{
      accessTokenExp?: number;
      message: string;
      ok: boolean;
    }>(`/hotels/${id}/loyalty/config/test`);
  },
  /**
   * PUT /v2/hotels/:id/loyalty/config — superAdmin only
   * - cashbackCampaignId 傳 null 清空、傳 string 設定
   * - refreshToken 是 write-only；傳空 / undefined 表示不變更，後端不會回明文
   */
  updateLoyaltyConfig(
    id: string,
    payload: { cashbackCampaignId?: null | string; refreshToken?: string },
  ) {
    return requestClient.put<{
      cashbackCampaignId: null | string;
      hasRefreshToken: boolean;
      hotelId: string;
    }>(`/hotels/${id}/loyalty/config`, payload);
  },
  /** PUT /v2/hotels/:id */
  update(id: string, data: HotelUpdateInput & { disabled?: boolean }) {
    return requestClient.put<HotelDoc>(`/hotels/${id}`, data);
  },
  /**
   * POST /v2/hotels/:id/photos — upload hotel image (logo / cover / favicon...).
   * 路徑前綴：`hotels/{hotelId}/covers/`，回 `{ url, path }`。
   */
  uploadPhoto(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return requestClient.post<{ path: string; url: string }>(
      `/hotels/${id}/photos`,
      formData,
    );
  },
};

export type { HotelCreateInput, HotelDoc, HotelSummary, HotelUpdateInput };
