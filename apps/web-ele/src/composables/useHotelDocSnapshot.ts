/**
 * 對齊 plan §6 — 整個 backoffice 唯一的 hotel doc 訂閱單點。
 *
 * 設計：HotelDocSubscriber.vue 在 BasicLayout 內 mount 一次，呼叫 onSnapshot
 * 把資料寫進 `hotelStore.currentHotelMeta`。此 composable 只是把 store
 * 的反應式 ref 包成 readonly 給 view 用，**不會**另起新的 subscription。
 *
 * 這個設計避免重複訂閱、並讓 Loyalty menu filter / route guard / view
 * 都看到同一份資料。
 */
import { computed } from 'vue';

import { useHotelStore } from '#/store/hotel';

export function useHotelDocSnapshot() {
  const hotelStore = useHotelStore();
  return {
    data: computed(() => hotelStore.currentHotelMeta),
    hotelId: computed(() => hotelStore.currentHotelId),
  };
}
