<script lang="ts" setup>
import type { MembershipCustomer, MembershipLevel } from '#/api/memberships';

import { computed, ref, watch } from 'vue';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElSpace,
  ElTag,
} from 'element-plus';

import {
  membershipsApi,
  normalizePhoneToCanonicalE164,
} from '#/api/memberships';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'MembershipManualUpgradePage' });

const DEFAULT_REASON = 'Yumie backoffice 手動升級';

const hotelStore = useHotelStore();
const phoneNumber = ref('');
const reason = ref(DEFAULT_REASON);
const selectedLevelId = ref('');
const customer = ref<MembershipCustomer | null>(null);
const levels = ref<MembershipLevel[]>([]);
const loadingCustomer = ref(false);
const loadingLevels = ref(false);
const upgrading = ref(false);

const currentHotelId = computed(() => hotelStore.currentHotelId);
const loyaltyEnabled = computed(
  () => hotelStore.currentHotelMeta?.loyalty?.enabled === true,
);

const currentLevel = computed(() => {
  const levelName = customer.value?.levelName;
  if (!levelName) return null;
  return levels.value.find((level) => level.name === levelName) ?? null;
});

const availableLevels = computed(() => {
  if (!customer.value) return [];
  const baseLevel = currentLevel.value;
  if (!baseLevel) return levels.value;
  return levels.value.filter((level) => level.levelRank > baseLevel.levelRank);
});

const selectedLevel = computed(
  () =>
    levels.value.find((level) => level.levelId === selectedLevelId.value) ??
    null,
);

function formatDateTime(iso?: null | string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-TW', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Taipei',
    year: 'numeric',
  });
}

async function loadLevels(): Promise<void> {
  const hotelId = currentHotelId.value;
  levels.value = [];
  selectedLevelId.value = '';
  if (!hotelId) return;
  loadingLevels.value = true;
  try {
    const result = await membershipsApi.levels();
    if (currentHotelId.value !== hotelId) return;
    levels.value = Array.isArray(result.levels) ? result.levels : [];
  } finally {
    loadingLevels.value = false;
  }
}

async function lookupCustomer(): Promise<void> {
  let canonicalPhone = '';
  try {
    canonicalPhone = normalizePhoneToCanonicalE164(phoneNumber.value);
  } catch (error) {
    ElMessage.warning(
      error instanceof Error ? error.message : '請輸入有效電話號碼',
    );
    return;
  }
  phoneNumber.value = canonicalPhone;

  const hotelId = currentHotelId.value;
  if (!hotelId) return;
  loadingCustomer.value = true;
  selectedLevelId.value = '';
  customer.value = null;
  try {
    const result = await membershipsApi.customer(canonicalPhone);
    if (currentHotelId.value !== hotelId) return;
    customer.value = result;
  } finally {
    loadingCustomer.value = false;
  }
}

async function submitUpgrade(): Promise<void> {
  if (!customer.value) {
    ElMessage.warning('請先查詢會員');
    return;
  }
  if (!selectedLevelId.value) {
    ElMessage.warning('請選擇目標等級');
    return;
  }
  const trimmedReason = reason.value.trim();
  if (!trimmedReason) {
    ElMessage.warning('請輸入升級原因');
    return;
  }

  upgrading.value = true;
  try {
    const result = await membershipsApi.manualUpgrade({
      phoneNumber: customer.value.phoneNumber,
      reason: trimmedReason,
      targetLevelId: selectedLevelId.value,
    });
    ElMessage.success(
      `已升級為 ${result.targetLevelName}，效期至 ${formatDateTime(
        result.expiresAt,
      )}`,
    );
    selectedLevelId.value = '';
    await lookupCustomer();
  } finally {
    upgrading.value = false;
  }
}

watch(currentHotelId, () => void loadLevels(), { immediate: true });
</script>

<template>
  <div class="p-4 grid gap-4">
    <ElCard v-if="!loyaltyEnabled" shadow="never">
      <ElAlert
        type="warning"
        :closable="false"
        title="此飯店尚未啟用會員功能"
        description="非 superAdmin 會被導回首頁；若需要使用，請先啟用 hotel.loyalty.enabled。"
      />
    </ElCard>

    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <ElSpace>
            <span>
              手動會員升級 —
              {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}
            </span>
            <ElTag size="small" :type="loyaltyEnabled ? 'success' : 'info'">
              Loyalty {{ loyaltyEnabled ? '啟用' : '停用' }}
            </ElTag>
          </ElSpace>
        </div>
      </template>

      <ElForm label-width="120" @submit.prevent>
        <ElFormItem label="會員電話">
          <ElSpace>
            <ElInput
              v-model="phoneNumber"
              clearable
              placeholder="+886912345678 或 0912345678"
              style="width: 260px"
              @keyup.enter="lookupCustomer"
            />
            <ElButton
              type="primary"
              :loading="loadingCustomer"
              @click="lookupCustomer"
            >
              查詢會員
            </ElButton>
          </ElSpace>
        </ElFormItem>

        <ElFormItem label="升級原因">
          <ElInput
            v-model="reason"
            maxlength="500"
            show-word-limit
            style="max-width: 520px"
          />
        </ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard v-loading="loadingCustomer || loadingLevels">
      <template #header>
        <div class="flex items-center justify-between">
          <span>會員資訊</span>
          <ElButton
            type="success"
            :disabled="!customer || !selectedLevelId"
            :loading="upgrading"
            @click="submitUpgrade"
          >
            確認升級
          </ElButton>
        </div>
      </template>

      <ElEmpty v-if="!customer" description="請先輸入電話並查詢會員" />
      <div v-else class="grid gap-4">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="Customer ID">
            <span style="font-variant-numeric: tabular-nums">
              {{ customer.customerId }}
            </span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="電話">
            {{ customer.phoneNumber }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="目前等級">
            <ElTag size="small" type="info">
              {{ customer.levelName ?? '無' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="等級來源">
            {{ customer.levelSource }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="到期時間">
            {{ formatDateTime(customer.levelExpiryDate) }}
          </ElDescriptionsItem>
        </ElDescriptions>

        <ElAlert
          v-if="customer.levelName && !currentLevel"
          type="warning"
          :closable="false"
          title="目前等級無法對應等級清單"
          description="仍可送出，由後端做最終檢查；若被拒絕請確認 Loyalty 等級設定。"
        />

        <ElForm label-width="120" @submit.prevent>
          <ElFormItem label="目標等級">
            <ElSelect
              v-model="selectedLevelId"
              :disabled="availableLevels.length === 0"
              placeholder="選擇要升級到的等級"
              style="width: 360px"
            >
              <ElOption
                v-for="level in availableLevels"
                :key="level.levelId"
                :label="`${level.name}（rank ${level.levelRank}）`"
                :value="level.levelId"
              />
            </ElSelect>
          </ElFormItem>
        </ElForm>

        <ElAlert
          v-if="customer && availableLevels.length === 0"
          type="info"
          :closable="false"
          title="沒有可升級的等級"
          description="此會員可能已經是最高等級，或等級清單尚未設定。"
        />

        <ElAlert
          v-if="selectedLevel"
          type="success"
          :closable="false"
          :title="`將升級為 ${selectedLevel.name}`"
          description="升級成功後，手動會員等級效期固定為一年。"
        />
      </div>
    </ElCard>
  </div>
</template>
