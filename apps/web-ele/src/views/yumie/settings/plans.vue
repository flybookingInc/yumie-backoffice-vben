<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { Plan, PlanCreateInput, PlanUpdateInput } from '#/api/plans';
import type { RoomType } from '#/api/room-types';

import { computed, reactive, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPopconfirm,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { plansApi, QK_DURATION_OPTIONS, WEEKDAY_LABELS } from '#/api/plans';
import { roomTypesApi } from '#/api/room-types';
import ImageUpload from '#/components/ImageUpload.vue';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'SettingsPlansPage' });

const hotelStore = useHotelStore();

const rows = ref<Plan[]>([]);
const roomTypes = ref<RoomType[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editingId = ref('');

const formRef = ref<FormInstance>();
const blankForm = (): PlanCreateInput & {
  disable: boolean;
  disabledWeekdays: number[];
} => ({
  disable: false,
  disabledWeekdays: [],
  flyKioskPlanId: '',
  flyKioskRoomTypeId: '',
  imagePath: '',
  planName: '',
  roomTypeId: '',
  sequence: '',
  weekendListPrice: 0,
  weekendPrice: 0,
  weekendQkDuration: 180,
  weekListPrice: 0,
  weekPrice: 0,
  weekQkDuration: 180,
});
const form = reactive<ReturnType<typeof blankForm>>(blankForm());

const rules: FormRules = {
  planName: [{ message: '請輸入方案名稱', required: true, trigger: 'blur' }],
  roomTypeId: [{ message: '請選擇房型', required: true, trigger: 'change' }],
  weekPrice: [{ message: '請輸入周間售價', required: true, trigger: 'blur' }],
  weekendPrice: [
    { message: '請輸入周末售價', required: true, trigger: 'blur' },
  ],
};

const currentHotelId = computed(() => hotelStore.currentHotelId);
const roomTypeMap = computed(() => {
  const map: Record<string, RoomType> = {};
  for (const rt of roomTypes.value) map[rt.id] = rt;
  return map;
});
const roomTypeOptions = computed(() =>
  roomTypes.value.map((rt) => ({ label: rt.RoomTypeName, value: rt.id })),
);

function resetForm(): void {
  editingId.value = '';
  Object.assign(form, blankForm());
  formRef.value?.clearValidate();
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  rows.value = [];
  roomTypes.value = [];
  if (!hotelId) return;
  loading.value = true;
  try {
    const [plans, rts] = await Promise.all([
      plansApi.list({ hotelId }),
      roomTypesApi.list({ hotelId }),
    ]);
    if (currentHotelId.value !== hotelId) return;
    rows.value = plans;
    roomTypes.value = rts;
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: Plan): void {
  editingId.value = row.id;
  Object.assign(form, {
    disable: row.disable,
    disabledWeekdays: [...(row.disabledWeekdays ?? [])],
    flyKioskPlanId: row.flyKioskPlanId ?? '',
    flyKioskRoomTypeId: row.flyKioskRoomTypeId ?? '',
    imagePath: row.imagePath ?? '',
    planName: row.planName,
    roomTypeId: row.roomTypeId ?? '',
    sequence: row.sequence ?? '',
    weekendListPrice: row.weekendListPrice,
    weekendPrice: row.weekendPrice,
    weekendQkDuration: row.weekendQkDuration || 180,
    weekListPrice: row.weekListPrice,
    weekPrice: row.weekPrice,
    weekQkDuration: row.weekQkDuration || 180,
  });
  dialogOpen.value = true;
}

/** 房型 select 變動時，從 roomType 抓 flyKioskRoomTypeId 自動填回 plan（對齊舊 onRoomTypeSelectChange） */
function onRoomTypeChange(roomTypeId: string): void {
  const rt = roomTypeMap.value[roomTypeId];
  form.flyKioskRoomTypeId = rt?.flyKioskRoomTypeId ?? '';
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const payload: PlanCreateInput = {
      disable: form.disable,
      disabledWeekdays: [...form.disabledWeekdays],
      flyKioskPlanId: form.flyKioskPlanId?.trim() || undefined,
      flyKioskRoomTypeId: form.flyKioskRoomTypeId?.trim() || undefined,
      imagePath: form.imagePath?.trim() || undefined,
      planName: form.planName,
      roomTypeId: form.roomTypeId,
      sequence: form.sequence?.trim() || undefined,
      weekendListPrice: form.weekendListPrice,
      weekendPrice: form.weekendPrice,
      weekendQkDuration: form.weekendQkDuration,
      weekListPrice: form.weekListPrice,
      weekPrice: form.weekPrice,
      weekQkDuration: form.weekQkDuration,
    };
    if (editingId.value) {
      await plansApi.update(editingId.value, payload as PlanUpdateInput);
      ElMessage.success('方案已更新');
    } else {
      await plansApi.create(payload);
      ElMessage.success('方案已新增');
    }
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: Plan): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `確定刪除方案「${row.planName}」？將同步從關聯房型移除。`,
      '刪除確認',
      { cancelButtonText: '取消', confirmButtonText: '刪除', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await plansApi.delete(row.id);
    ElMessage.success('方案已刪除');
    await load();
  } catch {
    // request interceptor toasts errors already
  }
}

async function toggleStatus(row: Plan, enabled: boolean): Promise<void> {
  try {
    await plansApi.updateStatus(row.id, enabled);
    ElMessage.success(enabled ? '已啟用' : '已停售');
    await load();
  } catch {
    // toast handled
  }
}

function durationLabel(minutes: number): string {
  const opt = QK_DURATION_OPTIONS.find((o) => o.value === minutes);
  return opt?.label ?? `${minutes} 分鐘`;
}

function roomTypeName(roomTypeId: string): string {
  return roomTypeMap.value[roomTypeId]?.RoomTypeName ?? roomTypeId;
}

function formatPrice(n: number): string {
  return n > 0 ? `NT$ ${n.toLocaleString('zh-TW')}` : '-';
}

watch(currentHotelId, () => void load(), { immediate: true });
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            專案 —
            {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}
          </span>
          <ElButton type="primary" @click="openCreate">新增方案</ElButton>
        </div>
      </template>
      <ElTable v-loading="loading" :data="rows" border row-key="id">
        <ElTableColumn label="方案名稱" prop="planName" min-width="220">
          <template #default="{ row }">
            <div>{{ (row as Plan).planName }}</div>
            <div
              v-if="(row as Plan).sequence"
              style="font-size: 12px; color: #888"
            >
              sequence: {{ (row as Plan).sequence }}
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="房型" width="120">
          <template #default="{ row }">
            {{ roomTypeName((row as Plan).roomTypeId) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="周間售價" width="140" align="right">
          <template #default="{ row }">
            {{ formatPrice((row as Plan).weekPrice) }}
            <div
              v-if="(row as Plan).weekListPrice > (row as Plan).weekPrice"
              style="
                font-size: 12px;
                color: #888;
                text-decoration: line-through;
              "
            >
              {{ formatPrice((row as Plan).weekListPrice) }}
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="周末售價" width="140" align="right">
          <template #default="{ row }">
            {{ formatPrice((row as Plan).weekendPrice) }}
            <div
              v-if="(row as Plan).weekendListPrice > (row as Plan).weekendPrice"
              style="
                font-size: 12px;
                color: #888;
                text-decoration: line-through;
              "
            >
              {{ formatPrice((row as Plan).weekendListPrice) }}
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="周間休息" width="120" align="center">
          <template #default="{ row }">
            {{ durationLabel((row as Plan).weekQkDuration) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="周末休息" width="120" align="center">
          <template #default="{ row }">
            {{ durationLabel((row as Plan).weekendQkDuration) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="狀態" width="100" align="center">
          <template #default="{ row }">
            <ElSwitch
              :model-value="!(row as Plan).disable"
              @change="(v) => toggleStatus(row as Plan, v as boolean)"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton size="small" @click="openEdit(row as Plan)">
              編輯
            </ElButton>
            <ElPopconfirm
              cancel-button-text="取消"
              confirm-button-text="刪除"
              title="確認刪除？"
              @confirm="remove(row as Plan)"
            >
              <template #reference>
                <ElButton size="small" type="danger">刪除</ElButton>
              </template>
            </ElPopconfirm>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDialog
      v-model="dialogOpen"
      :close-on-click-modal="false"
      :title="editingId ? '編輯方案' : '新增方案'"
      width="680"
    >
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="140"
        @submit.prevent
      >
        <ElFormItem label="方案名稱" prop="planName">
          <ElInput v-model="form.planName" placeholder="例如：休息 3 小時" />
        </ElFormItem>
        <ElFormItem label="房型" prop="roomTypeId">
          <ElSelect
            v-model="form.roomTypeId"
            placeholder="選擇房型"
            style="width: 100%"
            @change="onRoomTypeChange"
          >
            <ElOption
              v-for="opt in roomTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Fly Kiosk Room Type ID">
          <ElInput
            v-model="form.flyKioskRoomTypeId"
            placeholder="由房型自動帶入"
            readonly
          />
        </ElFormItem>
        <ElFormItem label="Fly Kiosk Plan ID">
          <ElInput
            v-model="form.flyKioskPlanId"
            placeholder="（選填，PMS 對應）"
          />
        </ElFormItem>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
          <ElFormItem label="周間售價" prop="weekPrice">
            <ElInputNumber
              v-model="form.weekPrice"
              :min="0"
              style="width: 100%"
            />
          </ElFormItem>
          <ElFormItem label="周間定價">
            <ElInputNumber
              v-model="form.weekListPrice"
              :min="0"
              style="width: 100%"
            />
          </ElFormItem>
          <ElFormItem label="周末售價" prop="weekendPrice">
            <ElInputNumber
              v-model="form.weekendPrice"
              :min="0"
              style="width: 100%"
            />
          </ElFormItem>
          <ElFormItem label="周末定價">
            <ElInputNumber
              v-model="form.weekendListPrice"
              :min="0"
              style="width: 100%"
            />
          </ElFormItem>
          <ElFormItem label="周間休息時間">
            <ElSelect v-model="form.weekQkDuration" style="width: 100%">
              <ElOption
                v-for="opt in QK_DURATION_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="周末休息時間">
            <ElSelect v-model="form.weekendQkDuration" style="width: 100%">
              <ElOption
                v-for="opt in QK_DURATION_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </ElSelect>
          </ElFormItem>
        </div>
        <ElFormItem label="此方案週幾不適用">
          <ElCheckboxGroup v-model="form.disabledWeekdays">
            <ElCheckbox
              v-for="d in WEEKDAY_LABELS"
              :key="d.value"
              :label="d.label"
              :value="d.value"
            />
          </ElCheckboxGroup>
        </ElFormItem>
        <ElFormItem label="排序 (sequence)">
          <ElInput
            v-model="form.sequence"
            placeholder="（選填，數字字串，影響列表排序）"
          />
        </ElFormItem>
        <ElFormItem label="圖片">
          <div v-if="editingId">
            <ImageUpload
              v-model="form.imagePath"
              :upload="
                (file) =>
                  plansApi.uploadPhoto(editingId, file).then((r) => r.url)
              "
              :width="305"
              :height="175"
            />
          </div>
          <div v-else class="form-hint">建立方案後即可上傳圖片</div>
        </ElFormItem>
        <ElFormItem label="狀態">
          <ElSwitch
            v-model="form.disable"
            active-text="停售"
            inactive-text="販售中"
            inline-prompt
            :active-value="true"
            :inactive-value="false"
          />
          <ElTag
            :type="form.disable ? 'info' : 'success'"
            size="small"
            style="margin-left: 8px"
          >
            {{ form.disable ? '停售' : '販售中' }}
          </ElTag>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="save">儲存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.form-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
