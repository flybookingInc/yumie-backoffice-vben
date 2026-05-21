/**
 * Orders 即時訂閱 — 監聽 `qk-list/{hotelId}/orders` subcollection。
 *
 * 對應舊 qk-occupy 頁面的 onSnapshot。隨 hotelStore.currentHotelId 變化
 * 自動重新訂閱；component unmount 時自動 unsubscribe。
 *
 * **資料原樣回傳**（snake_case + 加密電話）；解密 / normalize 由
 * v2 後端 GET /v2/orders 處理，view 用 v2 結果而非此 raw snapshot。
 * 此 composable 主要給「訂單即時新增/取消會立刻反映」的列表用。
 */
import type { Unsubscribe } from 'firebase/firestore';

import { onScopeDispose, ref, watchEffect } from 'vue';

import { watchOrders } from '#/firebase/firestore-readonly';
import { useHotelStore } from '#/store/hotel';

export interface YumieOrderRaw {
  [key: string]: unknown;
  id: string;
}

export function useOrdersSnapshot() {
  const hotelStore = useHotelStore();
  const orders = ref<YumieOrderRaw[]>([]);
  const loading = ref(true);
  let unsub: undefined | Unsubscribe;

  watchEffect((onCleanup) => {
    unsub?.();
    unsub = undefined;
    const hotelId = hotelStore.currentHotelId;
    if (!hotelId) {
      orders.value = [];
      loading.value = false;
      return;
    }
    loading.value = true;
    unsub = watchOrders(hotelId, (data) => {
      orders.value = data as YumieOrderRaw[];
      loading.value = false;
    });
    onCleanup(() => {
      unsub?.();
      unsub = undefined;
    });
  });

  onScopeDispose(() => {
    unsub?.();
  });

  return { loading, orders };
}
