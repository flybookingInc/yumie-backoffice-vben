<script lang="ts" setup>
import type { ExtraBuyItem, Order, OrderStatus } from '#/api/orders';

import { computed, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElMessage,
  ElPopconfirm,
  ElSpace,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { ordersApi } from '#/api/orders';
import { useHotelStore } from '#/store/hotel';
import { useUserStore } from '@vben/stores';

defineOptions({ name: 'OrdersOccupyPage' });

const hotelStore = useHotelStore();
const userStore = useUserStore();

const rows = ref<Order[]>([]);
const loading = ref(false);

function todayTaipei(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

const selectedDate = ref<string>(todayTaipei());

const currentHotelId = computed(() => hotelStore.currentHotelId);
const loyaltyEnabled = computed(
  () => hotelStore.currentHotelMeta?.loyalty?.enabled === true,
);
const isSuperAdmin = computed(
  () => userStore.userInfo?.roles?.includes('superAdmin') === true,
);
const showLoyaltyColumns = computed(
  () => loyaltyEnabled.value || isSuperAdmin.value,
);

/** 偵測重複的 qkNumber / phone — 對齊舊版警告 icon 邏輯 */
const duplicateQkNumbers = computed(() => {
  const seen = new Map<string, number>();
  for (const r of rows.value) {
    if (!r.qkNumber) continue;
    seen.set(r.qkNumber, (seen.get(r.qkNumber) ?? 0) + 1);
  }
  return new Set([...seen.entries()].filter(([, c]) => c > 1).map(([k]) => k));
});
const duplicatePhones = computed(() => {
  const seen = new Map<string, number>();
  for (const r of rows.value) {
    if (!r.guestPhone) continue;
    seen.set(r.guestPhone, (seen.get(r.guestPhone) ?? 0) + 1);
  }
  return new Set([...seen.entries()].filter(([, c]) => c > 1).map(([k]) => k));
});

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  rows.value = [];
  if (!hotelId) return;
  loading.value = true;
  try {
    const result = await ordersApi.list({
      date: selectedDate.value,
      hotelId,
    });
    if (currentHotelId.value !== hotelId) return;
    rows.value = result;
  } finally {
    loading.value = false;
  }
}

async function toggleArrival(row: Order, arrived: boolean): Promise<void> {
  const nextStatus: OrderStatus = arrived ? '抵達' : 'OK';
  try {
    await ordersApi.updateStatus(row.id, nextStatus);
    row.status = nextStatus;
    ElMessage.success(arrived ? '已標記為抵達' : '已恢復為 OK');
  } catch {
    // request interceptor toasted
  }
}

async function cancel(row: Order): Promise<void> {
  try {
    await ordersApi.updateStatus(row.id, 'Canceled');
    row.status = 'Canceled';
    ElMessage.success('訂單已取消');
  } catch {
    // interceptor toasted
  }
}

function hoursLabel(minutes: number): string {
  if (!minutes) return '-';
  if (minutes % 60 === 0) return `${minutes / 60} hr`;
  return `${(minutes / 60).toFixed(1)} hr`;
}

function formatPrice(n: number): string {
  return n > 0 ? `NT$ ${n.toLocaleString('zh-TW')}` : '-';
}

function extraBuyDisplay(items: ExtraBuyItem[]): string {
  if (!items?.length) return '-';
  return items
    .map(
      (it) => `${it.itemName ?? ''} $${it.itemPrice ?? 0} × ${it.itemAmt ?? 0}`,
    )
    .join('\n');
}

watch([currentHotelId, selectedDate], () => void load(), { immediate: true });
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            列表 — {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}
          </span>
          <ElSpace>
            <ElDatePicker
              v-model="selectedDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="選擇日期"
              :clearable="false"
              style="width: 160px"
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
        row-key="id"
        :scroll="{ x: 1400 }"
      >
        <ElTableColumn label="時段" prop="checkInTime" width="80" align="center" />
        <ElTableColumn label="號碼" width="120" align="center">
          <template #default="{ row }">
            <span>{{ (row as Order).qkNumber ?? '-' }}</span>
            <ElTag
              v-if="
                (row as Order).qkNumber &&
                duplicateQkNumbers.has((row as Order).qkNumber!)
              "
              size="small"
              type="warning"
              style="margin-left: 4px"
              title="重複號碼"
            >
              重複
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="方案" prop="planName" min-width="200" />
        <ElTableColumn label="時間" width="100" align="center">
          <template #default="{ row }">
            {{ hoursLabel((row as Order).reservedMinutes) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="到付" width="120" align="right">
          <template #default="{ row }">
            {{ formatPrice((row as Order).priceRemaining) }}
          </template>
        </ElTableColumn>

        <template v-if="showLoyaltyColumns">
          <ElTableColumn label="等級" width="80" align="center">
            <template #default="{ row }">
              {{ ((row as Order).membershipBenefit as { levelCode?: string } | undefined)?.levelCode ?? '-' }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="加贈" width="80" align="center">
            <template #default="{ row }">
              {{ ((row as Order).membershipBenefit as { freeRestMinutes?: number } | undefined)?.freeRestMinutes ?? 0 }}
              分
            </template>
          </ElTableColumn>
        </template>

        <ElTableColumn label="加購" min-width="200">
          <template #default="{ row }">
            <span style="white-space: pre-line">
              {{ extraBuyDisplay((row as Order).extraBuy.items) }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="電話" width="140" align="center">
          <template #default="{ row }">
            <span>{{ (row as Order).guestPhone || '-' }}</span>
            <ElTag
              v-if="
                (row as Order).guestPhone &&
                duplicatePhones.has((row as Order).guestPhone)
              "
              size="small"
              type="warning"
              style="margin-left: 4px"
              title="重複電話"
            >
              重複
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="狀態" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <template v-if="(row as Order).status === 'Canceled'">
              <ElTag type="info" size="small">取消</ElTag>
            </template>
            <template v-else>
              <ElSwitch
                :model-value="(row as Order).status === '抵達'"
                active-text="抵達"
                inactive-text="OK"
                inline-prompt
                @change="(v) => toggleArrival(row as Order, v as boolean)"
              />
              <ElPopconfirm
                title="確定取消此訂單？"
                confirm-button-text="取消訂單"
                cancel-button-text="返回"
                @confirm="cancel(row as Order)"
              >
                <template #reference>
                  <ElButton size="small" type="danger" link>取消</ElButton>
                </template>
              </ElPopconfirm>
            </template>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
</template>
