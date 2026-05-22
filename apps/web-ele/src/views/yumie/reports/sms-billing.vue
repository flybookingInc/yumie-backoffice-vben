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

function todayTaipei(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}
function offsetTaipei(days: number): string {
  const d = new Date(`${todayTaipei()}T00:00:00+08:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

// 預設過去 6 個月（約 183 天）
const range = ref<[string, string]>([offsetTaipei(-183), todayTaipei()]);
const currentHotelId = computed(() => hotelStore.currentHotelId);

function summarizeByDate(byDate: Record<string, number>): string {
  const entries = Object.entries(byDate).toSorted(([a], [b]) =>
    a.localeCompare(b),
  );
  if (entries.length === 0) return '-';
  return entries
    .map(([date, count]) => `${date.slice(8)}日 ${count}`)
    .join('、');
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  stats.value = { months: [], totalCount: 0 };
  if (!hotelId) return;
  const [fromDate, toDate] = range.value;
  if (!fromDate || !toDate) return;
  loading.value = true;
  try {
    const result = await smsApi.billing({ fromDate, hotelId, toDate });
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
      <ElStatistic title="區間內總筆數" :value="stats.totalCount" />
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
              type="daterange"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="起始日期"
              end-placeholder="結束日期"
              :clearable="false"
              style="width: 280px"
            />
            <ElButton type="primary" :loading="loading" @click="load">
              查詢
            </ElButton>
          </ElSpace>
        </div>
      </template>
      <ElTable v-loading="loading" :data="stats.months" border row-key="period">
        <ElTableColumn label="月份" prop="period" width="140" align="center" />
        <ElTableColumn
          label="月總筆數"
          prop="count"
          width="140"
          align="right"
        />
        <ElTableColumn label="每日筆數">
          <template #default="{ row }">
            <span style="font-size: 13px; color: #aaa">
              {{ summarizeByDate((row as SmsBillingMonth).byDate) }}
            </span>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
