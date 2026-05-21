/**
 * Hotel store — 多飯店切換 + 當前飯店 meta 的單一資料源。
 *
 * - `hotelGroup`：使用者可進入的飯店 id 列表（來自 Firebase claims.hotelGroup）
 * - `currentHotelId`：使用者選的當前飯店，localStorage 持久化
 * - `currentHotelMeta`：當前飯店 qk-list/{hotelId} 的完整 snapshot（由 HotelDocSubscriber 推進）
 *
 * Loyalty menu filter / route guard 依 currentHotelMeta.loyalty?.enabled。
 */
import type { Ref } from 'vue';

import { ref } from 'vue';

import { useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

export interface HotelMeta {
  [key: string]: unknown;
  hotelId?: string;
  hotelName?: string;
  loyalty?: { enabled: boolean };
}

export const useHotelStore = defineStore('yumie-hotel', () => {
  const hotelGroup = ref<string[]>([]);
  const currentHotelId: Ref<string> = useStorage(
    'yumie-current-hotel',
    '',
  ) as Ref<string>;
  const currentHotelMeta = ref<HotelMeta | null>(null);

  function setHotelGroup(ids: string[]): void {
    hotelGroup.value = ids;
    if (!currentHotelId.value || !ids.includes(currentHotelId.value)) {
      currentHotelId.value = ids[0] ?? '';
    }
  }

  function setCurrentHotelMeta(meta: HotelMeta | null): void {
    currentHotelMeta.value = meta;
  }

  function switchHotel(id: string): void {
    if (!hotelGroup.value.includes(id)) return;
    currentHotelId.value = id;
    currentHotelMeta.value = null;
  }

  function $reset(): void {
    hotelGroup.value = [];
    currentHotelMeta.value = null;
  }

  return {
    $reset,
    currentHotelId,
    currentHotelMeta,
    hotelGroup,
    setCurrentHotelMeta,
    setHotelGroup,
    switchHotel,
  };
});
