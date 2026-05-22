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
  /** PUT /v2/hotels/:id/loyalty/toggle — superAdmin */
  toggleLoyalty(id: string, enabled: boolean) {
    return requestClient.put<{ hotelId: string; loyaltyEnabled: boolean }>(
      `/hotels/${id}/loyalty/toggle`,
      { enabled },
    );
  },
  /** PUT /v2/hotels/:id */
  update(id: string, data: HotelUpdateInput & { disabled?: boolean }) {
    return requestClient.put<HotelDoc>(`/hotels/${id}`, data);
  },
};

export type { HotelCreateInput, HotelDoc, HotelSummary, HotelUpdateInput };
