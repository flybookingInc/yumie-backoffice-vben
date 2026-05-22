import type { Plan, PlanCreateInput, PlanUpdateInput } from './types';

import { requestClient } from '#/api/request';

export interface PlanListParams {
  hotelId?: string;
}

export const plansApi = {
  /** POST /v2/plans */
  create(data: PlanCreateInput) {
    return requestClient.post<Plan>('/plans', data);
  },
  /** DELETE /v2/plans/:id */
  delete(id: string) {
    return requestClient.delete<{ deleted: string }>(`/plans/${id}`);
  },
  /** GET /v2/plans/:id */
  get(id: string, params: PlanListParams = {}) {
    return requestClient.get<Plan>(`/plans/${id}`, { params });
  },
  /** GET /v2/plans */
  list(params: PlanListParams = {}) {
    return requestClient.get<Plan[]>('/plans', { params });
  },
  /** PUT /v2/plans/:id */
  update(id: string, data: PlanUpdateInput) {
    return requestClient.put<Plan>(`/plans/${id}`, data);
  },
  /** PUT /v2/plans/:id/availability — overwrite the HHmm→boolean map */
  updateAvailability(id: string, availability: Record<string, boolean>) {
    return requestClient.put<{
      availability: Record<string, boolean>;
      id: string;
    }>(`/plans/${id}/availability`, { availability });
  },
  /** PUT /v2/plans/:id/status — toggle enable/disable */
  updateStatus(id: string, enabled: boolean) {
    return requestClient.put<{ disable: boolean; id: string }>(
      `/plans/${id}/status`,
      { enabled },
    );
  },
};

/**
 * 依 `bookingInterval` (分鐘) 產生一天內的所有 HH:mm slot keys。
 * 預設 30 分鐘 → 48 個 slot。
 */
export function generateSlotKeys(bookingInterval = 30): string[] {
  const minutes = Math.max(1, Math.floor(bookingInterval));
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += minutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    out.push(`${hh}:${mm}`);
  }
  return out;
}

export type { Plan, PlanCreateInput, PlanUpdateInput };
export { QK_DURATION_OPTIONS, WEEKDAY_LABELS } from './types';
