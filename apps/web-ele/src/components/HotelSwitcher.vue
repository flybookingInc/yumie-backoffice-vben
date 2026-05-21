<script lang="ts" setup>
/**
 * Header 右上方的飯店切換器。
 *
 * - hotelGroup 來自 Firebase claims.hotelGroup（透過 hotelStore）
 * - 切換時 ElMessage.info 提示，currentHotelMeta 會被 HotelDocSubscriber 重訂閱推進
 * - 只有一個 hotel 時呈現 readonly badge
 */
import { computed } from 'vue';

import { ElMessage, ElOption, ElSelect, ElTag } from 'element-plus';

import { useHotelStore } from '#/store/hotel';

const hotelStore = useHotelStore();

const options = computed(() =>
  hotelStore.hotelGroup.map((id) => ({
    label: hotelStore.currentHotelMeta?.hotelName ?? id,
    value: id,
  })),
);

const currentLabel = computed(
  () => hotelStore.currentHotelMeta?.hotelName ?? hotelStore.currentHotelId,
);

function handleChange(value: string): void {
  if (!value || value === hotelStore.currentHotelId) return;
  hotelStore.switchHotel(value);
  ElMessage.info(`已切換到 ${value}`);
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
    style="width: 180px"
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
