<script lang="ts" setup>
import type { PartnerPerformanceRow } from '#/api/partners';

import { computed, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElSpace,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { partnersApi } from '#/api/partners';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'ReportsPartnerPerformancePage' });

const hotelStore = useHotelStore();
const rows = ref<PartnerPerformanceRow[]>([]);
const loading = ref(false);

function todayTaipei(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}
function startOfMonthTaipei(): string {
  return `${todayTaipei().slice(0, 7)}-01`;
}

// 預設帶當月（月結對帳語意）
const range = ref<[string, string]>([startOfMonthTaipei(), todayTaipei()]);

const currentHotelId = computed(() => hotelStore.currentHotelId);

function formatAmount(n: number): string {
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
}

const totals = computed(() => {
  const total = {
    arrivedCount: 0,
    arrivedRevenue: 0,
    bookingCount: 0,
    rewardCost: 0,
  };

  for (const row of rows.value) {
    total.bookingCount += row.bookingCount;
    total.arrivedCount += row.arrivedCount;
    total.arrivedRevenue += row.arrivedRevenue;
    total.rewardCost += row.rewardCost;
  }

  return total;
});

/** ElTable show-summary 合計列。 */
function summaryMethod(): string[] {
  const t = totals.value;
  return [
    '合計',
    '',
    t.bookingCount.toLocaleString('zh-TW'),
    t.arrivedCount.toLocaleString('zh-TW'),
    formatAmount(t.arrivedRevenue),
    '',
    formatAmount(t.rewardCost),
  ];
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  const [startDate, endDate] = range.value;
  rows.value = [];
  if (!hotelId || !startDate || !endDate) return;
  loading.value = true;
  try {
    const result = await partnersApi.report({ endDate, startDate });
    if (currentHotelId.value !== hotelId) return;
    rows.value = result;
  } catch {
    // request interceptor 已 toast
  } finally {
    loading.value = false;
  }
}

watch([currentHotelId, range], () => void load(), { immediate: true });
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>合作成效 —
            {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}</span>
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
      <ElTable
        v-loading="loading"
        :data="rows"
        border
        row-key="referralCode"
        show-summary
        :summary-method="summaryMethod"
      >
        <ElTableColumn label="推薦碼" prop="referralCode" width="140" />
        <ElTableColumn label="店家名稱" prop="partnerName" min-width="160" />
        <ElTableColumn label="轉換數" width="110" align="right">
          <template #default="{ row }">
            {{
              (row as PartnerPerformanceRow).bookingCount.toLocaleString(
                'zh-TW',
              )
            }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="抵達數" width="110" align="right">
          <template #default="{ row }">
            {{
              (row as PartnerPerformanceRow).arrivedCount.toLocaleString(
                'zh-TW',
              )
            }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="抵達成交金額 (元)" width="170" align="right">
          <template #default="{ row }">
            {{ formatAmount((row as PartnerPerformanceRow).arrivedRevenue) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="平均客單價 (元)" width="160" align="right">
          <template #default="{ row }">
            {{ formatAmount((row as PartnerPerformanceRow).avgOrderValue) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="回饋金成本 (元)" width="160" align="right">
          <template #default="{ row }">
            {{ formatAmount((row as PartnerPerformanceRow).rewardCost) }}
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
