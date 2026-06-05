<script lang="ts" setup>
import type {
  RewardEntry,
  Settlement,
  SettlementPreviewGroup,
} from '#/api/partners';

import { computed, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDialog,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElSpace,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { partnerRewardsApi } from '#/api/partners';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'ReportsPartnerSettlementPage' });

const hotelStore = useHotelStore();
const currentHotelId = computed(() => hotelStore.currentHotelId);

function currentMonthTaipei(): string {
  return new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
    .slice(0, 7);
}

const month = ref<string>(currentMonthTaipei());

const preview = ref<SettlementPreviewGroup[]>([]);
const previewLoading = ref(false);
const settling = ref(false);

const settlements = ref<Settlement[]>([]);
const historyLoading = ref(false);

function formatAmount(n: number): string {
  return n.toLocaleString('zh-TW');
}

const previewTotal = computed(() =>
  preview.value.reduce((sum, g) => sum + g.totalAmount, 0),
);

async function loadHistory(): Promise<void> {
  const hotelId = currentHotelId.value;
  settlements.value = [];
  if (!hotelId || !month.value) return;
  historyLoading.value = true;
  try {
    settlements.value = await partnerRewardsApi.listSettlements({
      month: month.value,
    });
  } catch {
    // interceptor toasted
  } finally {
    historyLoading.value = false;
  }
}

async function runReconcile(): Promise<void> {
  if (!month.value) return;
  previewLoading.value = true;
  try {
    preview.value = await partnerRewardsApi.reconcile(month.value);
    if (preview.value.length === 0) ElMessage.info('本月沒有待結算的回饋');
  } catch {
    // interceptor toasted
  } finally {
    previewLoading.value = false;
  }
}

async function runSettlement(): Promise<void> {
  const ok = await ElMessageBox.confirm(
    `確定結算 ${month.value} 全部合作夥伴的待結算回饋？`,
    '結算確認',
    { cancelButtonText: '取消', confirmButtonText: '結算', type: 'warning' },
  ).catch(() => false);
  if (!ok) return;
  settling.value = true;
  try {
    const result = await partnerRewardsApi.runSettlement(month.value);
    ElMessage.success(
      `已產生 ${result.settlements.length} 張結算單${ 
        result.skippedStale > 0
          ? `，略過 ${result.skippedStale} 筆失效（已自動 void）`
          : ''}`,
    );
    preview.value = [];
    await loadHistory();
  } catch {
    // interceptor toasted
  } finally {
    settling.value = false;
  }
}

// ===== 標記已撥款 =====
const paidDialogOpen = ref(false);
const paidTarget = ref<null | Settlement>(null);
const payoutRef = ref('');
const marking = ref(false);

function openMarkPaid(row: Settlement): void {
  paidTarget.value = row;
  payoutRef.value = '';
  paidDialogOpen.value = true;
}

async function confirmMarkPaid(): Promise<void> {
  if (!paidTarget.value) return;
  marking.value = true;
  try {
    await partnerRewardsApi.markPaid(
      paidTarget.value.settlementId,
      payoutRef.value.trim(),
    );
    ElMessage.success('已標記撥款');
    paidDialogOpen.value = false;
    await loadHistory();
  } catch {
    // interceptor toasted（含已撥款 409）
  } finally {
    marking.value = false;
  }
}

// ===== 帳本明細 drill-down =====
const detailDialogOpen = ref(false);
const detailLoading = ref(false);
const detailRows = ref<RewardEntry[]>([]);
const detailTitle = ref('');

async function openDetail(referralCode: string): Promise<void> {
  detailTitle.value = `帳本明細 — ${referralCode}（${month.value}）`;
  detailDialogOpen.value = true;
  detailLoading.value = true;
  detailRows.value = [];
  try {
    detailRows.value = await partnerRewardsApi.listRewards({
      month: month.value,
      referralCode,
    });
  } catch {
    // interceptor toasted
  } finally {
    detailLoading.value = false;
  }
}

const statusTag = (s: string): 'danger' | 'info' | 'success' | 'warning' =>
  s === 'settled' ? 'success' : (s === 'pending' ? 'warning' : 'info');

watch(
  [currentHotelId, month],
  () => {
    preview.value = [];
    void loadHistory();
  },
  { immediate: true },
);
</script>

<template>
  <div class="p-4 grid gap-4">
    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>合作結算 —
            {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}</span>
          <ElSpace>
            <ElDatePicker
              v-model="month"
              type="month"
              value-format="YYYY-MM"
              placeholder="選擇月份"
              :clearable="false"
              style="width: 160px"
            />
            <ElButton :loading="previewLoading" @click="runReconcile">
              核算預覽
            </ElButton>
            <ElButton
              type="primary"
              :loading="settling"
              :disabled="preview.length === 0"
              @click="runSettlement"
            >
              一鍵結算
            </ElButton>
          </ElSpace>
        </div>
      </template>

      <ElTable
        v-loading="previewLoading"
        :data="preview"
        border
        row-key="referralCode"
        empty-text="按「核算預覽」查看本月待結算回饋"
      >
        <ElTableColumn label="推薦碼" prop="referralCode" width="140" />
        <ElTableColumn label="店家名稱" prop="partnerName" min-width="160" />
        <ElTableColumn
          label="待結算筆數"
          prop="entryCount"
          width="120"
          align="right"
        />
        <ElTableColumn label="待結算金額 (元)" width="160" align="right">
          <template #default="{ row }">
            {{ formatAmount((row as SettlementPreviewGroup).totalAmount) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" align="center">
          <template #default="{ row }">
            <ElButton
              size="small"
              @click="openDetail((row as SettlementPreviewGroup).referralCode)"
            >
              明細
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div v-if="preview.length > 0" class="mt-2 text-right">
        待結算合計：<b>{{ formatAmount(previewTotal) }}</b> 元
      </div>
    </ElCard>

    <ElCard>
      <template #header>
        <span>結算單歷史（{{ month }}）</span>
      </template>
      <ElTable
        v-loading="historyLoading"
        :data="settlements"
        border
        row-key="settlementId"
        empty-text="本月尚無結算單"
      >
        <ElTableColumn label="推薦碼" prop="referralCode" width="120" />
        <ElTableColumn label="店家名稱" prop="partnerName" min-width="140" />
        <ElTableColumn
          label="筆數"
          prop="entryCount"
          width="80"
          align="right"
        />
        <ElTableColumn label="金額 (元)" width="120" align="right">
          <template #default="{ row }">
            {{ formatAmount((row as Settlement).totalAmount) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="狀態" width="90" align="center">
          <template #default="{ row }">
            <ElTag
              :type="
                (row as Settlement).status === 'paid' ? 'success' : 'warning'
              "
            >
              {{ (row as Settlement).status === 'paid' ? '已撥款' : '已結算' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="結算時間" width="180">
          <template #default="{ row }">
            {{ (row as Settlement).createdAt?.slice(0, 19).replace('T', ' ') }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="撥款備註" prop="payoutRef" min-width="140" />
        <ElTableColumn label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton
              size="small"
              @click="openDetail((row as Settlement).referralCode)"
            >
              明細
            </ElButton>
            <ElButton
              v-if="(row as Settlement).status === 'settled'"
              size="small"
              type="primary"
              @click="openMarkPaid(row as Settlement)"
            >
              標記撥款
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDialog v-model="paidDialogOpen" title="標記已撥款" width="420">
      <p class="mb-2">
        {{ paidTarget?.partnerName }}（{{ paidTarget?.referralCode }}）—
        {{ formatAmount(paidTarget?.totalAmount ?? 0) }} 元
      </p>
      <ElInput
        v-model="payoutRef"
        type="textarea"
        :rows="2"
        maxlength="200"
        show-word-limit
        placeholder="撥款備註 / 轉帳編號（選填）"
      />
      <template #footer>
        <ElButton @click="paidDialogOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="marking" @click="confirmMarkPaid">
          確認撥款
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="detailDialogOpen" :title="detailTitle" width="640">
      <ElTable
        v-loading="detailLoading"
        :data="detailRows"
        border
        max-height="420"
        row-key="orderId"
      >
        <ElTableColumn label="訂單 ID" prop="orderId" min-width="180" />
        <ElTableColumn label="入住日" prop="checkInDate" width="120" />
        <ElTableColumn label="金額" width="90" align="right">
          <template #default="{ row }">
            {{ formatAmount((row as RewardEntry).amount) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="狀態" width="100" align="center">
          <template #default="{ row }">
            <ElTag :type="statusTag((row as RewardEntry).status)">
              {{ (row as RewardEntry).status }}
            </ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElDialog>
  </div>
</template>
