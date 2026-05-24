<script lang="ts" setup>
/**
 * Header 右上方的飯店切換器。
 *
 * 來源：
 * - 一般 admin：使用 Firebase claims.hotelGroup（hotelStore.hotelGroup）
 * - superAdmin：載入 hotelsApi.list() 全部飯店（claims 通常只列 1 個 demo hotel，
 *   不足以代表 superAdmin 實際可進的飯店範圍），蓋掉 hotelGroup + 建立 name map
 *
 * 切換時 ElMessage.info 提示，currentHotelMeta 會被 HotelDocSubscriber 重訂閱推進。
 * 只有 1 個 hotel 時呈現 readonly badge（admin 通常如此）。
 */
import type { HotelSummary } from '#/api/hotels';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { ElMessage, ElOption, ElSelect, ElTag } from 'element-plus';

import { hotelsApi } from '#/api/hotels';
import { useHotelStore } from '#/store/hotel';

const hotelStore = useHotelStore();
const accessStore = useAccessStore();
const userStore = useUserStore();
const router = useRouter();

const isSuperAdmin = computed(
  () => userStore.userInfo?.roles?.includes('superAdmin') === true,
);

/** superAdmin 載入後的全部飯店清單（含 hotelName），給 label 用 */
const allHotels = ref<HotelSummary[]>([]);

async function loadAllHotelsIfSuperAdmin(): Promise<void> {
  if (!isSuperAdmin.value) return;
  try {
    const list = await hotelsApi.list();
    allHotels.value = list;
    // 用全部飯店蓋過 claims.hotelGroup（superAdmin 不受 claims 限制）
    hotelStore.setHotelGroup(list.map((h) => h.hotelId));
  } catch {
    // request interceptor toasted；保持 claims.hotelGroup
  }
}

onMounted(loadAllHotelsIfSuperAdmin);

// 登出再登入會把 roles reset，重新評估
watch(isSuperAdmin, (next, prev) => {
  if (next && !prev) loadAllHotelsIfSuperAdmin();
});

/** hotelId → hotelName 映射；superAdmin 用 allHotels，admin fallback 用 currentHotelMeta */
const hotelNameMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const h of allHotels.value) map[h.hotelId] = h.hotelName;
  // 當前飯店 meta 若已載入，也補進 map（涵蓋 admin 至少看得到自己當前飯店名）
  const meta = hotelStore.currentHotelMeta;
  if (
    hotelStore.currentHotelId &&
    typeof meta?.hotelName === 'string' &&
    !map[hotelStore.currentHotelId]
  ) {
    map[hotelStore.currentHotelId] = meta.hotelName;
  }
  return map;
});

const options = computed(() =>
  hotelStore.hotelGroup.map((id) => ({
    label: hotelNameMap.value[id] ?? id,
    value: id,
  })),
);

const currentLabel = computed(
  () =>
    hotelNameMap.value[hotelStore.currentHotelId] ?? hotelStore.currentHotelId,
);

function handleChange(value: string): void {
  if (!value || value === hotelStore.currentHotelId) return;
  hotelStore.switchHotel(value);
  accessStore.setAccessMenus([]);
  accessStore.setAccessRoutes([]);
  accessStore.setIsAccessChecked(false);
  ElMessage.info(`已切換到 ${hotelNameMap.value[value] ?? value}`);
  router.replace({
    path: preferences.app.defaultHomePath,
    query: { hotel: value },
  });
}
</script>

<template>
  <ElTag
    v-if="hotelStore.hotelGroup.length <= 1"
    :type="hotelStore.currentHotelId ? 'success' : 'info'"
    round
  >
    {{ currentLabel || '未選飯店' }}
  </ElTag>
  <ElSelect
    v-else
    :model-value="hotelStore.currentHotelId"
    filterable
    style="width: 200px"
    @change="handleChange"
  >
    <ElOption
      v-for="opt in options"
      :key="opt.value"
      :label="opt.label"
      :value="opt.value"
    />
  </ElSelect>
</template>
