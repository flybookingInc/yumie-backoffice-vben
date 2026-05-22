<script lang="ts" setup>
import type { YumiePlan } from '#/composables/usePlansSnapshot';

import { computed, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElEmpty,
  ElMessage,
  ElSpace,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

import { generateSlotKeys, plansApi } from '#/api/plans';
import { usePlansSnapshot } from '#/composables/usePlansSnapshot';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'RoomsAvailabilityPage' });

const hotelStore = useHotelStore();
const { plansList } = usePlansSnapshot();

const activePlanId = ref('');
const saving = ref(false);

/** Per-plan local draft 的 availability，從 hotel doc snapshot 同步進來，但允許未存檔的編輯 */
const drafts = ref<Record<string, Record<string, boolean>>>({});

const bookingInterval = computed(
  () => (hotelStore.currentHotelMeta?.bookingInterval as number) || 30,
);
const slotKeys = computed(() => generateSlotKeys(bookingInterval.value));

/** 將 snapshot 的 availability 同步進 draft（**不**覆蓋使用者正在編輯的 plan） */
function syncDraftsFromSnapshot(): void {
  const next: Record<string, Record<string, boolean>> = {};
  for (const plan of plansList.value) {
    const fromSnapshot = plan.availability ?? {};
    const existingDraft = drafts.value[plan.id];
    if (
      activePlanId.value === plan.id &&
      existingDraft &&
      isDirty(plan)
    ) {
      // 使用者正在編輯這個 plan，保留 draft 不覆蓋
      next[plan.id] = existingDraft;
    } else {
      // 補齊缺漏的 slot keys（snapshot 可能不含某些 slot）
      const filled: Record<string, boolean> = {};
      for (const k of slotKeys.value) {
        filled[k] = fromSnapshot[k] === true;
      }
      next[plan.id] = filled;
    }
  }
  drafts.value = next;
}

watch(
  [() => plansList.value.map((p) => p.id).join(','), slotKeys],
  () => {
    syncDraftsFromSnapshot();
    if (!activePlanId.value && plansList.value[0]) {
      activePlanId.value = plansList.value[0].id;
    }
  },
  { immediate: true },
);

function isDirty(plan: YumiePlan): boolean {
  const draft = drafts.value[plan.id];
  if (!draft) return false;
  const original = plan.availability ?? {};
  for (const k of slotKeys.value) {
    const fromOriginal = original[k] === true;
    const fromDraft = draft[k] === true;
    if (fromOriginal !== fromDraft) return true;
  }
  return false;
}

const activePlan = computed<null | YumiePlan>(() => {
  if (!activePlanId.value) return null;
  return plansList.value.find((p) => p.id === activePlanId.value) ?? null;
});
const activeDraft = computed<Record<string, boolean>>(() => {
  return drafts.value[activePlanId.value] ?? {};
});
const activeDirty = computed(() =>
  activePlan.value ? isDirty(activePlan.value) : false,
);
const activeEnabledCount = computed(
  () => Object.values(activeDraft.value).filter((v) => v === true).length,
);

function toggleSlot(planId: string, slot: string): void {
  const draft = drafts.value[planId];
  if (!draft) return;
  draft[slot] = !draft[slot];
}

function setAll(planId: string, value: boolean): void {
  const draft = drafts.value[planId];
  if (!draft) return;
  for (const k of slotKeys.value) draft[k] = value;
}

function resetToSnapshot(planId: string): void {
  const plan = plansList.value.find((p) => p.id === planId);
  if (!plan) return;
  const filled: Record<string, boolean> = {};
  for (const k of slotKeys.value) {
    filled[k] = plan.availability?.[k] === true;
  }
  drafts.value[planId] = filled;
}

async function save(planId: string): Promise<void> {
  const draft = drafts.value[planId];
  if (!draft) return;
  saving.value = true;
  try {
    await plansApi.updateAvailability(planId, { ...draft });
    ElMessage.success('時段已儲存');
    // hotel doc onSnapshot 會自動把更新推回 currentHotelMeta；無需手動 reload
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            時段管理 —
            {{
              hotelStore.currentHotelMeta?.hotelName ??
              hotelStore.currentHotelId
            }}
            <ElTag size="small" type="info" style="margin-left: 8px">
              {{ bookingInterval }} 分鐘間隔 / {{ slotKeys.length }} 時段
            </ElTag>
          </span>
        </div>
      </template>

      <ElEmpty v-if="plansList.length === 0" description="尚未建立任何方案" />

      <ElTabs v-else v-model="activePlanId" tab-position="left">
        <ElTabPane v-for="plan in plansList" :key="plan.id" :name="plan.id">
          <template #label>
            <span :style="{ color: plan.disable ? '#999' : undefined }">
              {{ plan.planName ?? plan.id }}
              <ElTag
                v-if="
                  drafts[plan.id] && plan === activePlan && activeDirty
                "
                type="warning"
                size="small"
                style="margin-left: 4px"
              >
                未存
              </ElTag>
            </span>
          </template>

          <div v-if="plan === activePlan" class="grid gap-3">
            <ElSpace wrap>
              <ElTag :type="plan.disable ? 'info' : 'success'" size="large">
                {{ plan.disable ? '方案停售中' : '方案販售中' }}
              </ElTag>
              <ElTag size="large">
                開放時段：{{ activeEnabledCount }} / {{ slotKeys.length }}
              </ElTag>
              <ElButton size="small" @click="setAll(plan.id, true)">
                全部開啟
              </ElButton>
              <ElButton size="small" @click="setAll(plan.id, false)">
                全部關閉
              </ElButton>
              <ElButton
                size="small"
                :disabled="!activeDirty"
                @click="resetToSnapshot(plan.id)"
              >
                還原
              </ElButton>
              <ElButton
                type="primary"
                size="small"
                :loading="saving"
                :disabled="!activeDirty"
                @click="save(plan.id)"
              >
                儲存
              </ElButton>
            </ElSpace>

            <div class="slot-grid">
              <ElCheckbox
                v-for="slot in slotKeys"
                :key="slot"
                :model-value="activeDraft[slot] === true"
                :label="slot"
                border
                size="small"
                class="slot-checkbox"
                @change="toggleSlot(plan.id, slot)"
              />
            </div>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<style scoped>
.slot-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 6px;
}

.slot-checkbox {
  margin-right: 0;
}
</style>
