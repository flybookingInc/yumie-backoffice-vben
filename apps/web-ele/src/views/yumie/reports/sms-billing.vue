<script lang="ts" setup>
import type { SmsBillingMonth, SmsBillingStats } from '#/api/sms';

import { computed, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElSpace,
  ElStatistic,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { smsApi } from '#/api/sms';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'ReportsSmsBillingPage' });

const hotelStore = useHotelStore();
const stats = ref<SmsBillingStats>({ months: [], totalCount: 0 });
const loading = ref(false);

function currentMonth(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const range = ref<[string, string]>([currentMonth(-5), currentMonth(0)]);
const currentHotelId = computed(() => hotelStore.currentHotelId);

function summarizeByDate(byDate: Record<string, number>): string {
  const entries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return '-';
  return entries
    .map(([date, count]) => `${date.slice(8)}日 ${count}`)
    .join('、');
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  stats.value = { months: [], totalCount: 0 };
  if (!hotelId) return;
  const [fromMonth, toMonth] = range.value;
  loading.value = true;
  try {
    const result = await smsApi.billing({ fromMonth, hotelId, toMonth });
    if (currentHotelId.value !== hotelId) return;
    stats.value = result;
  } finally {
    loading.value = false;
  }
}

watch([currentHotelId, range], () => void load(), { immediate: true });
</script>

<template>
  <div class="p-4 grid gap-4">
    <ElCard>
      <ElStatistic
        title="區間內總筆數"
        :value="stats.totalCount"
      />
    </ElCard>

    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            費用統計 —
            {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}
          </span>
          <ElSpace>
            <ElDatePicker
              v-model="range"
              type="monthrange"
              value-format="YYYY-MM"
              range-separator="至"
              start-placeholder="起始月"
              end-placeholder="結束月"
              :clearable="false"
              style="width: 260px"
            />
            <ElButton type="primary" :loading="loading" @click="load">
              查詢
            </ElButton>
          </ElSpace>
        </div>
      </template>
      <ElTable
        v-loading="loading"
        :data="stats.months"
        border
        row-key="period"
      >
        <ElTableColumn label="月份" prop="period" width="140" align="center" />
        <ElTableColumn label="月總筆數" prop="count" width="140" align="right" />
        <ElTableColumn label="每日筆數">
          <template #default="{ row }">
            <span style="color: #aaa; font-size: 13px">
              {{ summarizeByDate((row as SmsBillingMonth).byDate) }}
            </span>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
