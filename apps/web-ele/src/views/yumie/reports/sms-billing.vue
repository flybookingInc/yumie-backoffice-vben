<script lang="ts" setup>
import type { SmsBillingRow, SmsBillingStats } from '#/api/sms';

import { ref, watch } from 'vue';

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

defineOptions({ name: 'ReportsSmsBillingPage' });

const stats = ref<SmsBillingStats>({
  rows: [],
  totals: { beforeTaxAmount: 0, smsCount: 0, totalAmount: 0 },
});
const loading = ref(false);

function todayTaipei(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}
function offsetTaipei(days: number): string {
  const d = new Date(`${todayTaipei()}T00:00:00+08:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

// 預設過去 30 天（與舊版常見的月計費週期一致）
const range = ref<[string, string]>([offsetTaipei(-29), todayTaipei()]);

function formatAmount(n: number): string {
  return n.toLocaleString('zh-TW', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

/** ElTable show-summary 客製合計列（對齊舊 qk-sms-billing.html 的 tfoot 合計） */
function summaryMethod(): string[] {
  const { totals } = stats.value;
  return [
    '合計',
    totals.smsCount.toLocaleString('zh-TW'),
    formatAmount(totals.totalAmount),
    formatAmount(totals.beforeTaxAmount),
  ];
}

async function load(): Promise<void> {
  const [fromDate, toDate] = range.value;
  if (!fromDate || !toDate) return;
  loading.value = true;
  try {
    const result = await smsApi.billing({ fromDate, toDate });
    stats.value = result;
  } finally {
    loading.value = false;
  }
}

watch(range, () => void load(), { immediate: true });
</script>

<template>
  <div class="p-4 grid gap-4">
    <div class="grid gap-4 md:grid-cols-3">
      <ElCard>
        <ElStatistic title="總簡訊則數" :value="stats.totals.smsCount" />
      </ElCard>
      <ElCard>
        <ElStatistic
          title="總金額 (元)"
          :precision="2"
          :value="stats.totals.totalAmount"
        />
      </ElCard>
      <ElCard>
        <ElStatistic
          title="稅前發票金額 (元)"
          :precision="2"
          :value="stats.totals.beforeTaxAmount"
        />
      </ElCard>
    </div>

    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>費用統計（跨所有飯店，superAdmin only）</span>
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
        :data="stats.rows"
        border
        row-key="hotelId"
        show-summary
        :summary-method="summaryMethod"
      >
        <ElTableColumn label="旅館名稱" prop="hotelName" min-width="220" />
        <ElTableColumn label="簡訊則數" width="160" align="right">
          <template #default="{ row }">
            {{ (row as SmsBillingRow).smsCount.toLocaleString('zh-TW') }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="總金額 (元)" width="180" align="right">
          <template #default="{ row }">
            {{ formatAmount((row as SmsBillingRow).totalAmount) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="稅前發票金額 (元)" width="200" align="right">
          <template #default="{ row }">
            {{ formatAmount((row as SmsBillingRow).beforeTaxAmount) }}
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
