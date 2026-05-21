<script lang="ts" setup>
/**
 * 共用 placeholder view — 14 個 Yumie 模組在 Phase 6 各自實作前都先指向這頁，
 * 顯示路由 meta.title + 提示「待實作」。
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { ElCard, ElEmpty } from 'element-plus';

import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'YumiePlaceholder' });

const route = useRoute();
const hotelStore = useHotelStore();

const title = computed(() => (route.meta.title as string | undefined) ?? '');
const hotelLabel = computed(
  () =>
    hotelStore.currentHotelMeta?.hotelName ??
    hotelStore.currentHotelId ??
    '（未選飯店）',
);
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>
        {{ title }} <span style="color: #999">— {{ hotelLabel }}</span>
      </template>
      <ElEmpty description="此模組待 Phase 6 實作" />
    </ElCard>
  </div>
</template>
