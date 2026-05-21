/**
 * Availability 即時訂閱 — 取 hotel doc 的 plans[*].availability 表。
 *
 * 對應舊 qk-availability 頁面：以 plan 為單位的 30-min slot 開關矩陣
 * （`{ 'HH:mm': boolean }`，48 keys per plan）。
 */
import { computed } from 'vue';

import { usePlansSnapshot } from './usePlansSnapshot';

export interface PlanAvailabilityRow {
  availability: Record<string, boolean>;
  planId: string;
  planName: string;
}

export function useAvailabilitySnapshot() {
  const { plansList } = usePlansSnapshot();
  const availabilityList = computed<PlanAvailabilityRow[]>(() =>
    plansList.value.map((plan) => ({
      availability: plan.availability ?? {},
      planId: plan.id,
      planName: plan.planName ?? plan.id,
    })),
  );
  return { availabilityList, plansList };
}
