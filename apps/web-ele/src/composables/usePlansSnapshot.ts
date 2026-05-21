/**
 * Plans 即時訂閱（衍生自 hotel doc 的 `plans` keyed object）。
 *
 * 對應舊 qk-plans / qk-availability 頁面用的 onSnapshot 即時更新。
 * 真實 Firestore shape 詳見 plan §1.3。
 */
import { computed } from 'vue';

import { useHotelStore } from '#/store/hotel';

export interface YumiePlan {
  [key: string]: unknown;
  availability?: Record<string, boolean>;
  disable?: boolean;
  disabledWeekdays?: number[];
  flyKioskPlanId?: string;
  flyKioskRoomTypeId?: string;
  imagePath?: string;
  inventory?: Record<string, number>;
  intervalQuantity?: Record<string, number>;
  planName?: string;
  roomTypeId?: string;
  sequence?: string;
  weekendListPrice?: string;
  weekendPrice?: string;
  weekendQkDuration?: string;
  weekListPrice?: string;
  weekPrice?: string;
  weekQkDuration?: string;
}

export function usePlansSnapshot() {
  const hotelStore = useHotelStore();
  const plansMap = computed<Record<string, YumiePlan>>(() => {
    const raw = hotelStore.currentHotelMeta?.plans;
    return (raw as Record<string, YumiePlan> | undefined) ?? {};
  });
  const plansList = computed(() =>
    Object.entries(plansMap.value)
      .map(([id, plan]) => ({ ...plan, id }))
      .toSorted((a, b) =>
        (a.sequence ?? '').localeCompare(b.sequence ?? '', undefined, {
          numeric: true,
        }),
      ),
  );
  return { plansList, plansMap };
}
