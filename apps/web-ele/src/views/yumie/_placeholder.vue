<script lang="ts" setup>
/**
 * 共用 placeholder view — 14 個 Yumie 模組在 Phase 6 各自實作前都先指向這頁，
 * 顯示路由 meta.title + 提示「待實作」。
 *
 * Phase 1 開發期同時兼任 Firebase 連線診斷頁：顯示 user / claims / hotelMeta
 * 是否有正確載入，方便用瀏覽器查狀態（不用切 DevTools console）。
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useUserStore } from '@vben/stores';

import {
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElTag,
} from 'element-plus';

import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'YumiePlaceholder' });

const route = useRoute();
const hotelStore = useHotelStore();
const userStore = useUserStore();

const title = computed(() => (route.meta.title as string | undefined) ?? '');
const userInfo = computed(() => userStore.userInfo);
const metaLoaded = computed(() => hotelStore.currentHotelMeta !== null);
const hotelName = computed(
  () => hotelStore.currentHotelMeta?.hotelName as string | undefined,
);
const loyaltyEnabled = computed(
  () => hotelStore.currentHotelMeta?.loyalty?.enabled === true,
);
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>{{ title }}</template>
      <ElDescriptions :column="1" border>
        <ElDescriptionsItem label="模組路徑">
          {{ route.path }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="登入身分">
          {{ userInfo?.realName ?? '-' }}
          <ElTag size="small" type="info" style="margin-left: 8px">
            {{ userInfo?.roles?.[0] ?? '-' }}
          </ElTag>
          <span style="margin-left: 8px; color: #888">
            ({{ userInfo?.username }})
          </span>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="當前 hotelId">
          {{ hotelStore.currentHotelId || '（未選）' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="hotelGroup (claims)">
          <ElTag
            v-for="id in hotelStore.hotelGroup"
            :key="id"
            size="small"
            style="margin-right: 4px"
          >
            {{ id }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="hotelDoc 載入狀態">
          <ElTag :type="metaLoaded ? 'success' : 'warning'" size="small">
            {{
              metaLoaded ? '已載入' : '尚未載入（Firestore onSnapshot 未回）'
            }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="metaLoaded" label="hotelName">
          {{ hotelName ?? '（doc 無此欄位）' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="metaLoaded" label="loyalty.enabled">
          <ElTag :type="loyaltyEnabled ? 'success' : 'info'" size="small">
            {{ loyaltyEnabled ? 'true' : 'false / undefined' }}
          </ElTag>
        </ElDescriptionsItem>
      </ElDescriptions>
      <div style="margin-top: 16px; color: #999">此模組待 Phase 6 實作。</div>
    </ElCard>
  </div>
</template>
