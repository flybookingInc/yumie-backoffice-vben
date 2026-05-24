<script lang="ts" setup>
import type { Customer } from '#/api/customers';

import { computed, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { customersApi } from '#/api/customers';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'ReportsCustomersPage' });

const hotelStore = useHotelStore();

const customers = ref<Customer[]>([]);
const loading = ref(false);
const search = ref('');
type DateRangeFilter = '30d' | '90d' | '365d';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const rangeFilter = ref<DateRangeFilter>('90d');
const rangeOptions = [
  { label: '30 天', value: '30d' },
  { label: '90 天', value: '90d' },
  { label: '一年', value: '365d' },
] as const satisfies { label: string; value: DateRangeFilter }[];

const currentHotelId = computed(() => hotelStore.currentHotelId);

function buildListParams(): { since: string; until: string } {
  const nowMs = Date.now();
  const until = new Date(nowMs).toISOString();

  const daysByRange = {
    '30d': 30,
    '90d': 90,
    '365d': 365,
  } as const satisfies Record<DateRangeFilter, number>;
  const since = new Date(
    nowMs - daysByRange[rangeFilter.value] * MS_PER_DAY,
  ).toISOString();
  return { since, until };
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  if (!hotelId) return;
  loading.value = true;
  try {
    const { customers: list } = await customersApi.list(buildListParams());
    if (currentHotelId.value !== hotelId) return;
    customers.value = list;
  } finally {
    loading.value = false;
  }
}

watch([currentHotelId, rangeFilter], () => void load(), { immediate: true });

const filteredRows = computed<Customer[]>(() => {
  const kw = search.value.trim();
  if (!kw) return customers.value;
  return customers.value.filter(
    (c) =>
      c.guestPhone.includes(kw) ||
      (c.customerId ?? '').includes(kw) ||
      (c.lastPlanName ?? '').includes(kw),
  );
});

const totalSpentSum = computed(() =>
  customers.value.reduce((acc, c) => acc + (c.totalSpent ?? 0), 0),
);

function formatDateTime(iso: string): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('zh-TW', {
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Taipei',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatPrice(n: number): string {
  return n > 0 ? `NT$ ${n.toLocaleString('zh-TW')}` : '-';
}

function statusTagType(
  status: string,
): 'danger' | 'info' | 'primary' | 'success' | 'warning' {
  if (status === '抵達') return 'success';
  if (status === 'NoShow') return 'warning';
  if (status === 'Canceled') return 'info';
  if (status === 'CanceledByAdmin') return 'danger';
  return 'primary';
}

function statusLabel(status: string): string {
  if (status === 'CanceledByAdmin') return '取消(業者)';
  if (status === 'NoShow') return 'No Show';
  if (status === 'Canceled') return '取消';
  return status || '-';
}

async function refresh(): Promise<void> {
  await load();
  ElMessage.success('已重新載入客戶資料');
}
</script>

<template>
  <div class="p-4">
    <ElCard v-loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            客戶列表 —
            {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}
            <ElTag size="small" type="info" style="margin-left: 8px">
              {{ customers.length }} 位客戶
            </ElTag>
            <ElTag size="small" type="success" style="margin-left: 4px">
              累計 {{ formatPrice(totalSpentSum) }}
            </ElTag>
          </span>
          <div class="flex items-center" style="gap: 8px">
            <ElSelect
              v-model="rangeFilter"
              aria-label="日期範圍"
              style="width: 120px"
            >
              <ElOption
                v-for="option in rangeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
            <ElInput
              v-model="search"
              placeholder="搜尋電話 / 客戶 ID / 方案名稱"
              clearable
              style="width: 280px"
            />
            <ElButton @click="refresh">重新整理</ElButton>
          </div>
        </div>
      </template>

      <ElTable
        :data="filteredRows"
        border
        row-key="guestPhone"
        size="small"
        :default-sort="{ prop: 'lastOrderAt', order: 'descending' }"
      >
        <ElTableColumn
          label="電話"
          prop="guestPhone"
          min-width="160"
          fixed="left"
        >
          <template #default="{ row }">
            <span style="font-variant-numeric: tabular-nums">
              {{ (row as Customer).guestPhone }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="總訂單"
          prop="orderCount"
          width="100"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <strong>{{ (row as Customer).orderCount }}</strong>
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="已抵達"
          prop="completedCount"
          width="100"
          align="center"
          sortable
        >
          <template #default="{ row }">
            <ElTag type="success" size="small">
              {{ (row as Customer).completedCount }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="取消"
          prop="canceledCount"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            <span
              v-if="(row as Customer).canceledCount === 0"
              style="color: #999"
            >
              -
            </span>
            <ElTag v-else type="info" size="small">
              {{ (row as Customer).canceledCount }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="No Show"
          prop="noShowCount"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <span
              v-if="(row as Customer).noShowCount === 0"
              style="color: #999"
            >
              -
            </span>
            <ElTag v-else type="warning" size="small">
              {{ (row as Customer).noShowCount }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="累計消費"
          prop="totalSpent"
          min-width="120"
          align="right"
          sortable
        >
          <template #default="{ row }">
            {{ formatPrice((row as Customer).totalSpent) }}
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="最近預約"
          prop="lastOrderAt"
          min-width="160"
          sortable
        >
          <template #default="{ row }">
            <div>{{ formatDateTime((row as Customer).lastOrderAt) }}</div>
            <div style="font-size: 11px; color: #909399">
              {{ (row as Customer).lastPlanName ?? '-' }}
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="最近狀態" width="120" align="center">
          <template #default="{ row }">
            <ElTag
              :type="statusTagType((row as Customer).lastStatus)"
              size="small"
            >
              {{ statusLabel((row as Customer).lastStatus) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="第一次預約"
          prop="firstOrderAt"
          min-width="160"
          sortable
        >
          <template #default="{ row }">
            {{ formatDateTime((row as Customer).firstOrderAt) }}
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
