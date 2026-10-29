<script lang="ts" setup>
import type { DatePreset } from './yumie-credit-utils';

import type {
  CreditReport,
  CreditReportGroup,
  CreditReportMode,
  CreditReportQuery,
  CreditReportRow,
} from '#/api/yumie-credit';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElPagination,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { yumieCreditApi } from '#/api/yumie-credit';
import { useHotelStore } from '#/store/hotel';
import { taipeiDateTime } from '#/utils/datetime';

import {
  creditCategoryLabels,
  creditDateRange,
  creditRangeError,
  creditRefundLabel,
  creditStatusLabel,
} from './yumie-credit-utils';

defineOptions({ name: 'ReportsYumieCreditPage' });

const hotelStore = useHotelStore();
const userStore = useUserStore();
const isSuperAdmin = computed(
  () => userStore.userInfo?.roles?.includes('superAdmin') === true,
);
const hotelIds = ref<string[]>(
  hotelStore.currentHotelId ? [hotelStore.currentHotelId] : [],
);
const allHotels = ref(false);
const mode = ref<CreditReportMode>('stay');
const groupBy = ref<CreditReportGroup>('day');
const dateRange = ref<null | string[]>(creditDateRange('currentMonth'));
const search = ref('');
const report = ref<CreditReport | null>(null);
const hotelOptions = ref<CreditReport['hotelOptions']>([]);
const appliedQuery = ref<CreditReportQuery | null>(null);
const loading = ref(false);
const exporting = ref(false);
const failure = ref('');
const orderDetail = ref<CreditReportRow | null>(null);
const detailOpen = ref(false);
let requestSequence = 0;
let exportSequence = 0;

const availableHotels = computed(() => {
  const options = [...hotelOptions.value];
  const currentId = hotelStore.currentHotelId;
  if (currentId && !options.some((hotel) => hotel.hotelId === currentId)) {
    options.push({
      hotelId: currentId,
      hotelName: hotelStore.currentHotelMeta?.hotelName ?? currentId,
    });
  }
  return options;
});
const modeDescription = computed(() =>
  mode.value === 'stay'
    ? '依預約入住日期選取訂單，顯示截至查詢時的累計扣抵與退還。'
    : '依實際扣抵與退還時間計入期間；跨期退款會列在退款當期。',
);
const metrics = computed(() => {
  const summary = report.value?.summary;
  return summary
    ? [
        { label: '扣抵總額', value: money(summary.grossAmount) },
        { label: '已退還總額', value: money(summary.refundAmount) },
        { label: '淨扣抵額', value: money(summary.netAmount) },
        {
          label: '使用訂單數',
          value: summary.orderCount.toLocaleString('zh-TW'),
        },
        {
          label: '待核對筆數',
          value: summary.reviewCount.toLocaleString('zh-TW'),
        },
      ]
    : [];
});
const aggregateColumns = [
  { label: '扣抵', prop: 'grossAmount' },
  { label: '已退還', prop: 'refundAmount' },
  { label: '淨扣抵', prop: 'netAmount' },
] as const;

function money(value: number): string {
  return `NT$ ${value.toLocaleString('zh-TW', { maximumFractionDigits: 2 })}`;
}
function setPreset(preset: DatePreset): void {
  dateRange.value = creditDateRange(preset);
}
function errorText(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  return status === 409
    ? '這份查詢結果已到期，請重新查詢後再操作。'
    : '報表載入失敗，請稍後重新查詢。';
}

async function loadReport(query: CreditReportQuery): Promise<void> {
  const sequence = ++requestSequence;
  exportSequence++;
  exporting.value = false;
  loading.value = true;
  failure.value = '';
  orderDetail.value = null;
  detailOpen.value = false;
  report.value = null;
  try {
    const result = await yumieCreditApi.report(query);
    if (sequence !== requestSequence) return;
    report.value = result;
    hotelOptions.value = result.hotelOptions;
    appliedQuery.value = {
      ...query,
      page: result.page,
      pageSize: result.pageSize,
      snapshotId: result.snapshotId,
    };
  } catch (error) {
    if (sequence !== requestSequence) return;
    appliedQuery.value = null;
    failure.value = errorText(error);
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

async function submit(): Promise<void> {
  const validation = creditRangeError(dateRange.value);
  if (validation) {
    ElMessage.warning(validation);
    return;
  }
  if (!allHotels.value && hotelIds.value.length === 0) {
    ElMessage.warning('請選擇至少一間旅館');
    return;
  }
  const [startDate, endDate] = dateRange.value ?? [];
  if (!startDate || !endDate) return;
  await loadReport({
    endDate,
    groupBy: groupBy.value,
    hotelIds:
      allHotels.value && isSuperAdmin.value ? 'all' : hotelIds.value.join(','),
    mode: mode.value,
    page: 1,
    pageSize: 50,
    search: search.value.trim(),
    startDate,
  });
}
async function changePage(page: number): Promise<void> {
  if (appliedQuery.value) await loadReport({ ...appliedQuery.value, page });
}
async function exportReport(): Promise<void> {
  const query = appliedQuery.value;
  if (!query || !report.value) return;
  const sequence = ++exportSequence;
  exporting.value = true;
  try {
    const result = await yumieCreditApi.export(query);
    if (sequence !== exportSequence) return;
    const { downloadCreditWorkbook } = await import('./yumie-credit-export');
    if (sequence !== exportSequence) return;
    await downloadCreditWorkbook(result, () => sequence === exportSequence);
  } catch (error) {
    if (sequence === exportSequence)
      ElMessage.error(errorText(error).replace('報表載入', 'Excel 匯出'));
  } finally {
    if (sequence === exportSequence) exporting.value = false;
  }
}
function openOrder(row: CreditReportRow): void {
  orderDetail.value = row;
  detailOpen.value = true;
}

watch(
  () => hotelStore.currentHotelId,
  (id) => {
    hotelIds.value = id ? [id] : [];
    allHotels.value = false;
    requestSequence++;
    exportSequence++;
    report.value = null;
    appliedQuery.value = null;
    orderDetail.value = null;
    detailOpen.value = false;
    failure.value = '';
    loading.value = false;
    exporting.value = false;
    if (id) void submit();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  requestSequence++;
  exportSequence++;
});
</script>

<template>
  <div class="grid gap-4 p-4">
    <ElCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-lg font-semibold">Yumie 金扣抵報表</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              查詢扣抵、退還及未退還金額，所有日期採台灣時間。
            </p>
          </div>
          <ElButton
            data-testid="export"
            :disabled="!report || loading"
            :loading="exporting"
            @click="exportReport"
          >
            匯出 Excel
          </ElButton>
        </div>
      </template>
      <ElForm label-position="top" @submit.prevent="submit">
        <div class="grid gap-x-4 md:grid-cols-2 xl:grid-cols-4">
          <ElFormItem label="日期口徑">
            <ElRadioGroup v-model="mode" data-testid="mode">
              <ElRadioButton value="stay">入住訂單統計</ElRadioButton>
              <ElRadioButton value="ledger">扣退流水</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="旅館">
            <div class="w-full">
              <ElRadioGroup
                v-if="isSuperAdmin"
                v-model="allHotels"
                class="mb-2"
                data-testid="hotel-scope"
              >
                <ElRadioButton :value="false">指定旅館</ElRadioButton>
                <ElRadioButton :value="true">全部旅館</ElRadioButton>
              </ElRadioGroup>
              <ElSelect
                v-if="!allHotels"
                v-model="hotelIds"
                multiple
                filterable
                collapse-tags
                collapse-tags-tooltip
                class="w-full"
                placeholder="選擇旅館"
                data-testid="hotels"
              >
                <ElOption
                  v-for="hotel in availableHotels"
                  :key="hotel.hotelId"
                  :value="hotel.hotelId"
                  :label="hotel.hotelName"
                />
              </ElSelect>
            </div>
          </ElFormItem>
          <ElFormItem label="查詢期間（最多 12 個月）">
            <ElDatePicker
              v-model="dateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              start-placeholder="開始日期"
              end-placeholder="結束日期"
              range-separator="至"
              class="!w-full"
              data-testid="dates"
            />
            <div class="mt-1 flex flex-wrap gap-2">
              <ElButton size="small" @click="setPreset('today')">今天</ElButton>
              <ElButton size="small" @click="setPreset('yesterday')">
                昨天
              </ElButton>
              <ElButton size="small" @click="setPreset('currentMonth')">
                本月
              </ElButton>
              <ElButton size="small" @click="setPreset('lastMonth')">
                上月
              </ElButton>
            </div>
          </ElFormItem>
          <ElFormItem label="訂單編號或會員電話">
            <ElInput
              v-model="search"
              clearable
              maxlength="100"
              placeholder="輸入訂單編號或電話"
              data-testid="search"
              @keyup.enter="submit"
            />
          </ElFormItem>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted-foreground">{{ modeDescription }}</p>
          <div class="flex items-center gap-3">
            <ElRadioGroup v-model="groupBy" size="small" data-testid="group-by">
              <ElRadioButton value="day">按日</ElRadioButton>
              <ElRadioButton value="month">按月</ElRadioButton>
            </ElRadioGroup>
            <ElButton
              type="primary"
              :loading="loading"
              data-testid="query"
              @click="submit"
            >
              查詢
            </ElButton>
          </div>
        </div>
      </ElForm>
    </ElCard>

    <ElAlert
      v-if="failure"
      :title="failure"
      type="error"
      :closable="false"
      show-icon
    />
    <ElCard v-if="loading">
      <p role="status" class="py-6 text-center">正在核對扣抵與退款紀錄…</p>
    </ElCard>

    <template v-if="report">
      <div
        class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
      >
        <span data-testid="applied-filter">{{
            report.filters.mode === 'stay' ? '入住訂單統計' : '扣退流水'
          }}：{{ report.filters.startDate }} 至 {{ report.filters.endDate
          }}<span v-if="report.filters.search">
            · 搜尋「{{ report.filters.search }}」</span></span>
        <span>資料截至
          {{ taipeiDateTime(report.asOf) }}；匯出與分頁沿用本次查詢結果</span>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ElCard v-for="metric in metrics" :key="metric.label" shadow="never">
          <p class="text-sm text-muted-foreground">{{ metric.label }}</p>
          <p class="mt-2 text-2xl font-semibold tabular-nums">
            {{ metric.value }}
          </p>
        </ElCard>
      </div>
      <ElAlert
        v-if="report.summary.reviewCount"
        type="warning"
        :closable="false"
        show-icon
        :title="`有 ${report.summary.reviewCount} 筆待核對，涉及 ${money(report.summary.reviewAmount)}`"
        description="包含退款未完成、日期缺漏或無法對應訂單等紀錄。退款總額只計入帳本確認成功的退還；請查看明細中的待核對原因。"
      />
      <ElAlert
        type="info"
        :closable="false"
        title="淨扣抵額不等同業者應收結算款"
        description="已抵達、NoShow、尚未入住及取消訂單分別列示；贈點、到期、轉贈與人工調帳不計入本報表。"
      />

      <ElCard>
        <template #header>依訂單狀態統計</template>
        <ElTable
          :data="report.categories"
          border
          empty-text="此期間沒有扣抵或退還紀錄"
        >
          <ElTableColumn label="狀態" min-width="180">
            <template #default="{ row }">
              {{
                creditCategoryLabels[
                  row.category as keyof typeof creditCategoryLabels
                ]
              }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            v-for="column in aggregateColumns"
            :key="column.prop"
            :label="column.label"
            min-width="130"
            align="right"
          >
            <template #default="{ row }">
              {{ money(row[column.prop]) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            label="訂單數"
            prop="orderCount"
            width="100"
            align="right"
          />
          <ElTableColumn
            label="待核對"
            prop="reviewCount"
            width="100"
            align="right"
          />
        </ElTable>
      </ElCard>
      <div class="grid min-w-0 gap-4 xl:grid-cols-2">
        <ElCard class="min-w-0">
          <template #header>依旅館統計</template>
          <ElTable
            :data="report.byHotel"
            border
            empty-text="沒有符合條件的旅館紀錄"
          >
            <ElTableColumn prop="hotelName" label="旅館" min-width="180" />
            <ElTableColumn
              v-for="column in aggregateColumns"
              :key="column.prop"
              :label="column.label"
              min-width="120"
              align="right"
            >
              <template #default="{ row }">
                {{ money(row[column.prop]) }}
              </template>
            </ElTableColumn>
            <ElTableColumn
              prop="orderCount"
              label="訂單數"
              width="90"
              align="right"
            />
            <ElTableColumn
              prop="reviewCount"
              label="待核對"
              width="90"
              align="right"
            />
          </ElTable>
        </ElCard>
        <ElCard class="min-w-0">
          <template #header>
            {{ report.filters.groupBy === 'day' ? '按日' : '按月' }}統計
          </template>
          <ElTable
            :data="report.byPeriod"
            border
            max-height="360"
            empty-text="沒有符合條件的期間紀錄"
          >
            <ElTableColumn prop="period" label="期間" min-width="120" />
            <ElTableColumn
              v-for="column in aggregateColumns"
              :key="column.prop"
              :label="column.label"
              min-width="120"
              align="right"
            >
              <template #default="{ row }">
                {{ money(row[column.prop]) }}
              </template>
            </ElTableColumn>
            <ElTableColumn
              prop="orderCount"
              label="訂單數"
              width="90"
              align="right"
            />
            <ElTableColumn
              prop="reviewCount"
              label="待核對"
              width="90"
              align="right"
            />
          </ElTable>
        </ElCard>
      </div>
      <ElCard>
        <template #header>
          <div class="flex flex-wrap justify-between gap-2">
            <span>扣抵／退還明細（共 {{ report.total }} 筆）</span>
            <span class="text-sm text-muted-foreground">每筆扣抵一列，退還列於原扣抵紀錄；統計涵蓋全部查詢結果。</span>
          </div>
        </template>
        <ElTable
          :data="report.items"
          row-key="id"
          border
          empty-text="此期間沒有符合條件的扣抵或退還紀錄"
          data-testid="details"
        >
          <ElTableColumn prop="hotelName" label="旅館" min-width="180" />
          <ElTableColumn label="訂單編號" min-width="120">
            <template #default="{ row }">
              <ElButton
                v-if="row.orderId"
                link
                type="primary"
                @click="openOrder(row)"
              >
                {{ row.orderNumber || row.orderId }}
              </ElButton>
              <span v-else>無法對應訂單</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="guestPhone" label="會員電話" min-width="155" />
          <ElTableColumn label="預約入住時間" min-width="175">
            <template #default="{ row }">
              {{ taipeiDateTime(row.checkinAt) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="訂單狀態" min-width="125">
            <template #default="{ row }">
              {{ creditStatusLabel(row.status) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="扣抵時間" min-width="175">
            <template #default="{ row }">
              {{ taipeiDateTime(row.redeemedAt) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="扣抵金額" min-width="110" align="right">
            <template #default="{ row }">{{ money(row.grossAmount) }}</template>
          </ElTableColumn>
          <ElTableColumn label="退還時間" min-width="175">
            <template #default="{ row }">
              {{ taipeiDateTime(row.refundedAt) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="退還金額" min-width="110" align="right">
            <template #default="{ row }">
              {{ money(row.refundAmount) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            :label="report.filters.mode === 'ledger' ? '本筆淨扣抵' : '淨扣抵'"
            min-width="115"
            align="right"
          >
            <template #default="{ row }">{{ money(row.netAmount) }}</template>
          </ElTableColumn>
          <ElTableColumn label="本筆未退還" min-width="115" align="right">
            <template #default="{ row }">
              {{ money(row.unrefundedAmount) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="退款處理" min-width="110">
            <template #default="{ row }">
              <ElTag
                :type="
                  row.refundStatus === 'pending_review'
                    ? 'warning'
                    : row.refundStatus === 'refunded'
                      ? 'success'
                      : 'info'
                "
              >
                {{ creditRefundLabel(row.refundStatus) }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="待核對原因" min-width="220">
            <template #default="{ row }">
              {{ row.reviewReasons.join('、') || '—' }}
            </template>
          </ElTableColumn>
        </ElTable>
        <div class="mt-4 flex justify-end overflow-x-auto">
          <ElPagination
            :current-page="report.page"
            :page-size="report.pageSize"
            :total="report.total"
            layout="total, prev, pager, next"
            data-testid="pagination"
            @current-change="changePage"
          />
        </div>
      </ElCard>
    </template>
    <ElDialog
      v-model="detailOpen"
      title="訂單明細"
      width="min(720px, 95vw)"
      destroy-on-close
    >
      <ElDescriptions v-if="orderDetail" :column="2" border>
        <ElDescriptionsItem label="旅館" :span="2">
          {{ orderDetail.hotelName }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="訂單編號">
          {{ orderDetail.orderNumber || orderDetail.orderId }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="訂單狀態">
          {{ creditStatusLabel(orderDetail.status) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="會員電話">
          {{ orderDetail.guestPhone || '—' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="預約入住">
          {{ taipeiDateTime(orderDetail.checkinAt) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="專案" :span="2">
          {{ orderDetail.planName || '—' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="訂單金額">
          {{
            orderDetail.totalPrice === null
              ? '—'
              : money(orderDetail.totalPrice)
          }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="扣抵參考金額">
          {{ money(orderDetail.expectedAmount) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="本筆原始扣抵">
          {{ money(orderDetail.lifetimeGrossAmount) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="本筆累計退還">
          {{ money(orderDetail.lifetimeRefundAmount) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="本筆未退還">
          {{ money(orderDetail.unrefundedAmount) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="退款處理">
          {{ creditRefundLabel(orderDetail.refundStatus) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="待核對原因" :span="2">
          {{ orderDetail.reviewReasons.join('、') || '—' }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <p class="mt-3 text-sm text-muted-foreground">
        扣抵參考金額來自訂單預計扣抵或舊版活動扣抵紀錄，仍待帳本核對，不代表已確認扣抵。
        此明細與報表同為本次查詢時間的資料。
      </p>
    </ElDialog>
  </div>
</template>
