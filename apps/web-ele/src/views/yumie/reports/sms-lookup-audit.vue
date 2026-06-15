<script lang="ts" setup>
import type { SmsLookupLog } from '#/api/sms';

import { computed, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElSpace,
  ElStatistic,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { smsApi } from '#/api/sms';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'ReportsSmsLookupAudit' });

const hotelStore = useHotelStore();
const rows = ref<SmsLookupLog[]>([]);
const loading = ref(false);

function todayTaipei(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}
function offsetTaipei(days: number): string {
  const d = new Date(`${todayTaipei()}T00:00:00+08:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

const range = ref<[string, string]>([offsetTaipei(-6), todayTaipei()]);
const currentHotelId = computed(() => hotelStore.currentHotelId);

const RESULT_META: Record<
  SmsLookupLog['result'],
  { label: string; type: 'info' | 'success' | 'warning' }
> = {
  expired: { label: '已過期', type: 'warning' },
  not_found: { label: '查無', type: 'info' },
  revealed: { label: '揭露驗證碼', type: 'success' },
};

function formatTime(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-TW', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Taipei',
    year: 'numeric',
  });
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  rows.value = [];
  if (!hotelId) return;
  const [fromDate, toDate] = range.value;
  if (!fromDate || !toDate) return;
  loading.value = true;
  try {
    const result = await smsApi.lookupLogs({ fromDate, toDate });
    if (currentHotelId.value !== hotelId) return;
    rows.value = result;
  } finally {
    loading.value = false;
  }
}

watch([currentHotelId, range], () => void load(), { immediate: true });
</script>

<template>
  <div class="grid gap-4 p-4">
    <ElCard>
      <ElStatistic title="區間內查詢次數" :value="rows.length" />
    </ElCard>

    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            驗證碼查詢稽核 —
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
      <ElTable v-loading="loading" :data="rows" border row-key="id">
        <ElTableColumn label="時間" min-width="180">
          <template #default="{ row }">
            {{ formatTime((row as SmsLookupLog).loggedAt) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作者" min-width="200">
          <template #default="{ row }">
            {{
              (row as SmsLookupLog).operatorEmail ||
              (row as SmsLookupLog).operatorUid ||
              '—'
            }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="IP" min-width="140">
          <template #default="{ row }">
            {{ (row as SmsLookupLog).operatorIp || '—' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="查詢電話" width="150">
          <template #default="{ row }">
            {{ (row as SmsLookupLog).phone || '-' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="結果" width="140">
          <template #default="{ row }">
            <ElTag :type="RESULT_META[(row as SmsLookupLog).result].type">
              {{ RESULT_META[(row as SmsLookupLog).result].label }}
            </ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
