<script lang="ts" setup>
import type {
  LoyaltyLevelCode,
  MembershipBenefitLevel,
  MembershipBenefitRule,
  MembershipBenefitsState,
} from '#/api/membership-benefits';

import { computed, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
  ElEmpty,
  ElInputNumber,
  ElMessage,
  ElPopconfirm,
  ElSpace,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { membershipBenefitsApi } from '#/api/membership-benefits';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'SettingsMembershipBenefitsPage' });

const hotelStore = useHotelStore();

const state = ref<MembershipBenefitsState>({
  hotelId: '',
  maxRedeemRatio: 0,
  membershipBenefits: [],
});
const loading = ref(false);
const saving = ref(false);

const currentHotelId = computed(() => hotelStore.currentHotelId);
const loyaltyEnabled = computed(
  () => hotelStore.currentHotelMeta?.loyalty?.enabled === true,
);

const LEVELS: ReadonlyArray<{ code: LoyaltyLevelCode; label: string }> = [
  { code: 'GO', label: 'GO（入門）' },
  { code: 'PRO', label: 'PRO（進階）' },
  { code: 'ELITE', label: 'ELITE（菁英）' },
];

/** 確保三個等級都存在；缺的補空 rules 陣列。 */
function ensureLevels(
  benefits: MembershipBenefitLevel[],
): MembershipBenefitLevel[] {
  const byLevel = new Map(benefits.map((b) => [b.levelCode, b]));
  return LEVELS.map(({ code }) => {
    const existing = byLevel.get(code);
    return {
      levelCode: code,
      rules: existing ? [...existing.rules] : [],
    };
  });
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  if (!hotelId) return;
  loading.value = true;
  try {
    const result = await membershipBenefitsApi.get(hotelId);
    if (currentHotelId.value !== hotelId) return;
    state.value = {
      ...result,
      membershipBenefits: ensureLevels(result.membershipBenefits),
    };
  } finally {
    loading.value = false;
  }
}

function levelLabel(code: LoyaltyLevelCode): string {
  return LEVELS.find((l) => l.code === code)?.label ?? code;
}

function addRule(level: MembershipBenefitLevel): void {
  level.rules.push({ freeRestMinutes: 0, minReservedMinutes: 0 });
}

function removeRule(level: MembershipBenefitLevel, index: number): void {
  level.rules.splice(index, 1);
}

async function save(): Promise<void> {
  const hotelId = currentHotelId.value;
  if (!hotelId) return;
  saving.value = true;
  try {
    const result = await membershipBenefitsApi.update(hotelId, {
      maxRedeemRatio: state.value.maxRedeemRatio,
      membershipBenefits: state.value.membershipBenefits,
    });
    state.value = {
      ...result,
      membershipBenefits: ensureLevels(result.membershipBenefits),
    };
    ElMessage.success('已儲存會員福利設定');
  } finally {
    saving.value = false;
  }
}

watch(currentHotelId, () => void load(), { immediate: true });
</script>

<template>
  <div class="p-4 grid gap-4">
    <ElCard v-if="!loyaltyEnabled" shadow="never">
      <ElTag type="warning" size="large">
        此飯店尚未啟用 Loyalty（hotel.loyalty.enabled = false）—
        設定仍可編輯但不會影響訂單流程。
      </ElTag>
    </ElCard>

    <ElCard v-loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <ElSpace>
            <span>
              會員福利 —
              {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}
            </span>
            <ElTag size="small" :type="loyaltyEnabled ? 'success' : 'info'">
              Loyalty {{ loyaltyEnabled ? '啟用' : '停用' }}
            </ElTag>
          </ElSpace>
          <ElButton type="primary" :loading="saving" @click="save">
            儲存
          </ElButton>
        </div>
      </template>

      <div class="grid gap-4">
        <div>
          <div style="margin-bottom: 8px">
            <strong>每筆訂單最高可抵比例 maxRedeemRatio (%)</strong>
            <span style="margin-left: 8px; font-size: 13px; color: #888">
              整數 0-100，例如 50 = 最多可抵 50%
            </span>
          </div>
          <ElInputNumber
            v-model="state.maxRedeemRatio"
            :min="0"
            :max="100"
            :step="5"
            style="width: 180px"
          />
        </div>

        <ElCard
          v-for="level in state.membershipBenefits"
          :key="level.levelCode"
          shadow="never"
          style="background-color: rgb(255 255 255 / 3%)"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <span>{{ levelLabel(level.levelCode) }}</span>
              <ElButton size="small" @click="addRule(level)">
                + 新增規則
              </ElButton>
            </div>
          </template>
          <ElEmpty
            v-if="level.rules.length === 0"
            description="尚未設定規則"
            :image-size="60"
          />
          <ElTable
            v-else
            :data="level.rules"
            border
            row-key="$index"
            size="small"
          >
            <ElTableColumn
              label="最低預訂分鐘 minReservedMinutes"
              min-width="280"
            >
              <template #default="{ row }">
                <ElInputNumber
                  v-model="(row as MembershipBenefitRule).minReservedMinutes"
                  :min="0"
                  :step="30"
                  style="width: 180px"
                />
              </template>
            </ElTableColumn>
            <ElTableColumn label="贈送分鐘 freeRestMinutes" min-width="220">
              <template #default="{ row }">
                <ElInputNumber
                  v-model="(row as MembershipBenefitRule).freeRestMinutes"
                  :min="0"
                  :step="15"
                  style="width: 180px"
                />
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="100" align="center">
              <template #default="{ $index }">
                <ElPopconfirm
                  cancel-button-text="取消"
                  confirm-button-text="刪除"
                  title="確認刪除此規則？"
                  @confirm="removeRule(level, $index as number)"
                >
                  <template #reference>
                    <ElButton size="small" type="danger" link>刪除</ElButton>
                  </template>
                </ElPopconfirm>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElCard>
      </div>
    </ElCard>
  </div>
</template>
