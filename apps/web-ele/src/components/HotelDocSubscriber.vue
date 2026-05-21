<script lang="ts" setup>
/**
 * Mount 一次（在 BasicLayout 內），全域唯一的 `qk-list/{hotelId}` 訂閱點。
 *
 * 切換 hotelId 時：unsubscribe 舊的 → subscribe 新的 → 寫進 hotelStore.currentHotelMeta。
 * Loyalty menu filter / route guard / 所有 view 的 useHotelDocSnapshot 都從這份資料推導。
 *
 * 另外 watch currentHotelMeta — 若使用者正待在 requiresLoyalty 頁面，且切到的飯店
 * loyalty.enabled !== true，主動 `router.replace` 回首頁（superAdmin 例外）。
 * 這是 router beforeEach guard 補不到的場景（已經 mount 的 route 不會自己重跑）。
 */
import type { Unsubscribe } from 'firebase/firestore';

import { onScopeDispose, watch, watchEffect } from 'vue';
import { useRouter } from 'vue-router';

import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { ElNotification } from 'element-plus';

import { watchHotelDoc } from '#/firebase/firestore-readonly';
import { useHotelStore, type HotelMeta } from '#/store/hotel';

const hotelStore = useHotelStore();
const userStore = useUserStore();
const router = useRouter();
let unsub: undefined | Unsubscribe;

watchEffect((onCleanup) => {
  unsub?.();
  unsub = undefined;
  const hotelId = hotelStore.currentHotelId;
  if (!hotelId) {
    hotelStore.setCurrentHotelMeta(null);
    return;
  }
  unsub = watchHotelDoc(hotelId, (data) => {
    hotelStore.setCurrentHotelMeta((data as HotelMeta | null) ?? null);
  });
  onCleanup(() => {
    unsub?.();
    unsub = undefined;
  });
});

watch(
  () => hotelStore.currentHotelMeta?.loyalty?.enabled,
  (enabled) => {
    if (enabled === true) return;
    const isSuperAdmin = userStore.userInfo?.roles?.includes('superAdmin');
    if (isSuperAdmin) return;
    if (!router.currentRoute.value.meta.requiresLoyalty) return;
    ElNotification({
      message: '此飯店未啟用會員功能',
      title: '已自動切換頁面',
      type: 'warning',
    });
    router.replace(preferences.app.defaultHomePath);
  },
);

onScopeDispose(() => {
  unsub?.();
});
</script>

<template>
  <!-- render nothing — 只負責訂閱 -->
  <slot></slot>
</template>
