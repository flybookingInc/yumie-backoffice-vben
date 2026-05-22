<script lang="ts" setup>
import type { SmsRecord } from '#/api/sms';

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

defineOptions({ name: 'ReportsSmsPage' });

const hotelStore = useHotelStore();
const rows = ref<SmsRecord[]>([]);
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

const columns = [
  { label: '時間', minWidth: 180 },
  { label: '電話', width: 180 },
];

function formatSentAt(iso: string): string {
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
    const result = await smsApi.records({ fromDate, hotelId, toDate });
    if (currentHotelId.value !== hotelId) return;
    rows.value = result;
  } finally {
    loading.value = false;
  }
}

watch([currentHotelId, range], () => void load(), { immediate: true });
</script>

<template>
  <div class="p-4 grid gap-4">
    <ElCard>
      <ElStatistic title="區間內簡訊筆數" :value="rows.length" />
    </ElCard>

    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            簡訊明細 —
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
        <ElTableColumn
          v-for="col in columns"
          :key="col.label"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
        >
          <template v-if="col.label === '時間'" #default="{ row }">
            {{ formatSentAt((row as SmsRecord).sentAt) }}
          </template>
          <template v-else-if="col.label === '電話'" #default="{ row }">
            {{ (row as SmsRecord).phone || '-' }}
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
