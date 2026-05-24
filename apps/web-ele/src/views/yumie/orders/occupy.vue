<script lang="ts" setup>
import type { ExtraBuyItem, Order } from '#/api/orders';

import { computed, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElMessage,
  ElPopconfirm,
  ElSpace,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
} from 'element-plus';

import { ordersApi } from '#/api/orders';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'OrdersOccupyPage' });

interface TimeGroupRow {
  __type: 'time-group';
  count: number;
  id: string;
  time: string;
}

type TableRow = Order | TimeGroupRow;

interface OrderLoyaltyDisplayState {
  intent?: null | {
    redeemAmount?: null | number | string;
  };
}

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
const tableColumnCount = computed(() => (showLoyaltyColumns.value ? 11 : 8));

const groupedRows = computed<TableRow[]>(() => {
  const sortedRows = [...rows.value].toSorted((a, b) => {
    const timeCompare = orderTime(a).localeCompare(orderTime(b));
    if (timeCompare !== 0) return timeCompare;
    return (a.qkNumber ?? '').localeCompare(b.qkNumber ?? '');
  });
  const counts = new Map<string, number>();
  for (const row of sortedRows) {
    const time = orderTime(row);
    counts.set(time, (counts.get(time) ?? 0) + 1);
  }

  const result: TableRow[] = [];
  let previousTime = '';
  for (const row of sortedRows) {
    const time = orderTime(row);
    if (time !== previousTime) {
      result.push({
        __type: 'time-group',
        count: counts.get(time) ?? 0,
        id: `time-group-${time}`,
        time,
      });
      previousTime = time;
    }
    result.push(row);
  }
  return result;
});

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

async function markArrived(row: Order): Promise<void> {
  try {
    await ordersApi.updateStatus(row.id, '抵達');
    row.status = '抵達';
    ElMessage.success('已標記為抵達');
  } catch {
    // request interceptor toasted
  }
}

async function cancel(row: Order): Promise<void> {
  try {
    // 業者後台取消 → CanceledByAdmin（與客戶端取消 'Canceled' 區分，列表顯示「取消(業者)」）
    await ordersApi.updateStatus(row.id, 'CanceledByAdmin');
    row.status = 'CanceledByAdmin';
    ElMessage.success('訂單已取消');
  } catch {
    // interceptor toasted
  }
}

async function markNoShow(row: Order): Promise<void> {
  try {
    await ordersApi.updateStatus(row.id, 'NoShow');
    row.status = 'NoShow';
    ElMessage.success('已標記為 No Show');
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

function formatDiscount(row: Order): string {
  const loyalty = row.loyalty as null | OrderLoyaltyDisplayState | undefined;
  const raw = loyalty?.intent?.redeemAmount;
  const amount =
    typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : 0);
  return Number.isFinite(amount) && amount > 0
    ? `NT$ ${amount.toLocaleString('zh-TW')}`
    : '-';
}

function extraBuyDisplay(items: ExtraBuyItem[]): string {
  if (!items?.length) return '-';
  return items
    .map(
      (it) => `${it.itemName ?? ''} $${it.itemPrice ?? 0} × ${it.itemAmt ?? 0}`,
    )
    .join('\n');
}

function isTimeGroupRow(row: TableRow): row is TimeGroupRow {
  return (row as TimeGroupRow).__type === 'time-group';
}

function orderTime(row: Order): string {
  return row.checkInTime || row.checkinDatetime?.slice(11, 16) || '-';
}

function rowKey(row: TableRow): string {
  return row.id;
}

function tableRowClassName({ row }: { row: TableRow }): string {
  return isTimeGroupRow(row) ? 'order-time-group-row' : '';
}

function spanMethod({
  columnIndex,
  row,
}: {
  columnIndex: number;
  row: TableRow;
}): [number, number] | undefined {
  if (!isTimeGroupRow(row)) return undefined;
  return columnIndex === 0 ? [1, tableColumnCount.value] : [0, 0];
}

watch([currentHotelId, selectedDate], () => void load(), { immediate: true });
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            列表 —
            {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}
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

      <div class="order-table-scroll">
        <ElTable
          v-loading="loading"
          class="order-table"
          :data="groupedRows"
          border
          :row-key="rowKey"
          :row-class-name="tableRowClassName"
          :span-method="spanMethod"
        >
          <ElTableColumn
            label="時段"
            prop="checkInTime"
            width="80"
            align="center"
          >
            <template #default="{ row }">
              <span v-if="isTimeGroupRow(row as TableRow)" class="time-group">
                {{ (row as TimeGroupRow).time }} ({{
                  (row as TimeGroupRow).count
                }})
              </span>
              <span v-else>{{ orderTime(row as Order) }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="號碼" width="120" align="center">
            <template #default="{ row }">
              <template v-if="!isTimeGroupRow(row as TableRow)">
                <span>{{ (row as Order).qkNumber ?? '-' }}</span>
              </template>
              <ElTag
                v-if="
                  !isTimeGroupRow(row as TableRow) &&
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
          <ElTableColumn label="方案" prop="planName" min-width="200">
            <template #default="{ row }">
              <span v-if="!isTimeGroupRow(row as TableRow)">
                {{ (row as Order).planName ?? '-' }}
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="時間" width="100" align="center">
            <template #default="{ row }">
              <span v-if="!isTimeGroupRow(row as TableRow)">
                {{ hoursLabel((row as Order).reservedMinutes) }}
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="到付" width="120" align="right">
            <template #default="{ row }">
              <span v-if="!isTimeGroupRow(row as TableRow)">
                {{ formatPrice((row as Order).priceRemaining) }}
              </span>
            </template>
          </ElTableColumn>

          <template v-if="showLoyaltyColumns">
            <ElTableColumn label="等級" width="80" align="center">
              <template #default="{ row }">
                <span v-if="!isTimeGroupRow(row as TableRow)">
                  {{
                    (
                      (row as Order).membershipBenefit as
                        | { levelCode?: string }
                        | undefined
                    )?.levelCode ?? '-'
                  }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="加贈" width="80" align="center">
              <template #default="{ row }">
                <span v-if="!isTimeGroupRow(row as TableRow)">
                  {{
                    (
                      (row as Order).membershipBenefit as
                        | { freeRestMinutes?: number }
                        | undefined
                    )?.freeRestMinutes ?? 0
                  }}
                  分
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="折抵" width="55" align="center">
              <template #default="{ row }">
                <span v-if="!isTimeGroupRow(row as TableRow)">
                  {{ formatDiscount(row as Order) }}
                </span>
              </template>
            </ElTableColumn>
          </template>

          <ElTableColumn
            label="電話"
            prop="guestPhone"
            width="160"
            align="center"
          >
            <template #default="{ row }">
              <template v-if="!isTimeGroupRow(row as TableRow)">
                <span>{{ (row as Order).guestPhone || '-' }}</span>
              </template>
              <ElTag
                v-if="
                  !isTimeGroupRow(row as TableRow) &&
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
          <ElTableColumn label="加購" width="100" align="center">
            <template #default="{ row }">
              <ElTooltip
                v-if="
                  !isTimeGroupRow(row as TableRow) &&
                  (row as Order).extraBuy.items.length > 0
                "
                :content="extraBuyDisplay((row as Order).extraBuy.items)"
                placement="top"
              >
                <ElTag size="small" type="info">
                  {{ (row as Order).extraBuy.items.length }} 件
                </ElTag>
              </ElTooltip>
              <span
                v-else-if="!isTimeGroupRow(row as TableRow)"
                style="color: #888"
              >
                -
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="狀態" width="240" align="center">
            <template #default="{ row }">
              <template v-if="isTimeGroupRow(row as TableRow)"></template>
              <template v-else-if="(row as Order).status === 'Canceled'">
                <ElTag type="info" size="small">取消</ElTag>
              </template>
              <template v-else-if="(row as Order).status === 'CanceledByAdmin'">
                <ElTag type="danger" size="small">取消(業者)</ElTag>
              </template>
              <template v-else-if="(row as Order).status === 'NoShow'">
                <ElTag type="warning" size="small">No Show</ElTag>
              </template>
              <template v-else-if="(row as Order).status === '抵達'">
                <ElTag type="success" size="small">抵達</ElTag>
              </template>
              <template v-else>
                <ElPopconfirm
                  title="確定標記為抵達？"
                  confirm-button-text="標記"
                  cancel-button-text="返回"
                  @confirm="markArrived(row as Order)"
                >
                  <template #reference>
                    <ElButton size="small" type="primary" link>抵達</ElButton>
                  </template>
                </ElPopconfirm>
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
                <ElPopconfirm
                  title="確定標記為 No Show？"
                  confirm-button-text="標記"
                  cancel-button-text="返回"
                  @confirm="markNoShow(row as Order)"
                >
                  <template #reference>
                    <ElButton size="small" type="warning" link>
No Show
</ElButton>
                  </template>
                </ElPopconfirm>
              </template>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.order-table-scroll {
  overflow-x: auto;
}

.order-table {
  min-width: 1335px;
}

:deep(.order-time-group-row) {
  --el-table-tr-bg-color: #e7e7e7;

  font-weight: 700;
}

:deep(.order-time-group-row:hover > td.el-table__cell) {
  background-color: #cfcfcf !important;
}

:deep(.order-time-group-row .cell) {
  justify-content: flex-start;
  padding: 6px 16px;
  text-align: left;
}

.time-group {
  display: inline-flex;
  font-size: 14px;
  line-height: 24px;
  color: var(--el-text-color-primary);
}
</style>
