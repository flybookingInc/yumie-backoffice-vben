<script lang="ts" setup>
/**
 * Mount 一次（在 BasicLayout 內），全域唯一的 `qk-list/{hotelId}` 訂閱點。
 *
 * 切換 hotelId 時：unsubscribe 舊的 → subscribe 新的 → 寫進 hotelStore.currentHotelMeta。
 * Loyalty menu filter / route guard / 所有 view 的 useHotelDocSnapshot 都從這份資料推導。
 */
import type { Unsubscribe } from 'firebase/firestore';

import { onScopeDispose, watchEffect } from 'vue';

import { watchHotelDoc } from '#/firebase/firestore-readonly';
import { useHotelStore, type HotelMeta } from '#/store/hotel';

const hotelStore = useHotelStore();
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

onScopeDispose(() => {
  unsub?.();
});
</script>

<template>
  <!-- render nothing — 只負責訂閱 -->
  <slot></slot>
</template>
