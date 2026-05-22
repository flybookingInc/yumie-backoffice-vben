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
  /** PUT /v2/plans/:id/status — toggle enable/disable */
  updateStatus(id: string, enabled: boolean) {
    return requestClient.put<{ disable: boolean; id: string }>(
      `/plans/${id}/status`,
      { enabled },
    );
  },
};

export type { Plan, PlanCreateInput, PlanUpdateInput };
export { QK_DURATION_OPTIONS, WEEKDAY_LABELS } from './types';
