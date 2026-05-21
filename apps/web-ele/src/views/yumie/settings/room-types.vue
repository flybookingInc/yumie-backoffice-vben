<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type {
  RoomType,
  RoomTypeCreateInput,
  RoomTypeUpdateInput,
} from '#/api/room-types';

import { computed, reactive, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
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
  ElSpace,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { roomTypesApi } from '#/api/room-types';
import { usePlansSnapshot } from '#/composables/usePlansSnapshot';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'SettingsRoomTypesPage' });

const hotelStore = useHotelStore();
const { plansList } = usePlansSnapshot();

const rows = ref<RoomType[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editingId = ref('');

const formRef = ref<FormInstance>();
const form = reactive<RoomTypeCreateInput>({
  RoomTypeName: '',
  associatePlansId: [],
  flyKioskRoomTypeId: '',
  interval: 30,
  inventorySyncToHotelDocDays: 3,
  pmsRoomTypeCode: '',
});

const rules: FormRules = {
  RoomTypeName: [
    { message: '請輸入房型名稱', required: true, trigger: 'blur' },
  ],
  interval: [{ message: '請輸入時間區間', required: true, trigger: 'blur' }],
  inventorySyncToHotelDocDays: [
    { message: '請輸入同步天數', required: true, trigger: 'blur' },
  ],
};

const currentHotelId = computed(() => hotelStore.currentHotelId);
const planOptions = computed(() =>
  plansList.value.map((p) => ({ label: p.planName ?? p.id, value: p.id })),
);

function resetForm(): void {
  editingId.value = '';
  Object.assign(form, {
    RoomTypeName: '',
    associatePlansId: [],
    flyKioskRoomTypeId: '',
    interval: 30,
    inventorySyncToHotelDocDays: 3,
    pmsRoomTypeCode: '',
  });
  formRef.value?.clearValidate();
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  rows.value = [];
  if (!hotelId) return;
  loading.value = true;
  try {
    const result = await roomTypesApi.list({ hotelId });
    if (currentHotelId.value !== hotelId) return;
    rows.value = result;
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: RoomType): void {
  editingId.value = row.id;
  Object.assign(form, {
    RoomTypeName: row.RoomTypeName,
    associatePlansId: row.associatePlansId ?? [],
    flyKioskRoomTypeId: row.flyKioskRoomTypeId ?? '',
    interval: row.interval,
    inventorySyncToHotelDocDays: row.inventorySyncToHotelDocDays,
    pmsRoomTypeCode: row.pmsRoomTypeCode ?? '',
  });
  dialogOpen.value = true;
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const payload: RoomTypeCreateInput = {
      RoomTypeName: form.RoomTypeName,
      associatePlansId: [...form.associatePlansId],
      flyKioskRoomTypeId: form.flyKioskRoomTypeId?.trim() || undefined,
      interval: form.interval,
      inventorySyncToHotelDocDays: form.inventorySyncToHotelDocDays,
      pmsRoomTypeCode: form.pmsRoomTypeCode?.trim() || undefined,
    };
    if (editingId.value) {
      await roomTypesApi.update(
        editingId.value,
        payload as RoomTypeUpdateInput,
      );
      ElMessage.success('房型已更新');
    } else {
      await roomTypesApi.create(payload);
      ElMessage.success('房型已新增');
    }
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: RoomType): Promise<void> {
  await ElMessageBox.confirm(
    `確定刪除房型「${row.RoomTypeName}」？相關 inventory 一併移除。`,
    '刪除確認',
    { confirmButtonText: '刪除', cancelButtonText: '取消', type: 'warning' },
  ).catch(() => 'cancel');
  // ElMessageBox.confirm throws on cancel; if we reach here without cancel value, proceed
  try {
    await roomTypesApi.delete(row.id);
    ElMessage.success('房型已刪除');
    await load();
  } catch {
    // request interceptor already toasts; swallow to avoid double notification
  }
}

function planLabel(id: string): string {
  return planOptions.value.find((p) => p.value === id)?.label ?? id;
}

watch(currentHotelId, () => void load(), { immediate: true });
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>房型 —
            {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}</span>
          <ElButton type="primary" @click="openCreate">新增房型</ElButton>
        </div>
      </template>
      <ElTable v-loading="loading" :data="rows" border row-key="id">
        <ElTableColumn label="房型名稱" prop="RoomTypeName" min-width="180" />
        <ElTableColumn
          label="同步天數"
          prop="inventorySyncToHotelDocDays"
          width="120"
          align="center"
        />
        <ElTableColumn
          label="時間區間"
          prop="interval"
          width="120"
          align="center"
        />
        <ElTableColumn label="PMS code" prop="pmsRoomTypeCode" width="140" />
        <ElTableColumn
          label="Fly Kiosk Room Type ID"
          prop="flyKioskRoomTypeId"
          width="200"
        />
        <ElTableColumn label="關聯方案" min-width="280">
          <template #default="{ row }">
            <ElSpace v-if="row.associatePlansId?.length" wrap>
              <ElTag
                v-for="planId in row.associatePlansId"
                :key="planId"
                type="info"
              >
                {{ planLabel(planId) }}
              </ElTag>
            </ElSpace>
            <span v-else style="color: #999">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton size="small" @click="openEdit(row as RoomType)">
              編輯
            </ElButton>
            <ElPopconfirm
              title="確認刪除？"
              confirm-button-text="刪除"
              cancel-button-text="取消"
              @confirm="remove(row as RoomType)"
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
      :title="editingId ? '編輯房型' : '新增房型'"
      width="520"
      :close-on-click-modal="false"
    >
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="140"
        @submit.prevent
      >
        <ElFormItem label="房型名稱" prop="RoomTypeName">
          <ElInput v-model="form.RoomTypeName" placeholder="例如：標準雙人房" />
        </ElFormItem>
        <ElFormItem label="同步天數" prop="inventorySyncToHotelDocDays">
          <ElInputNumber
            v-model="form.inventorySyncToHotelDocDays"
            :min="1"
            :max="30"
          />
        </ElFormItem>
        <ElFormItem label="時間區間（分鐘）" prop="interval">
          <ElInputNumber
            v-model="form.interval"
            :min="5"
            :max="120"
            :step="5"
          />
        </ElFormItem>
        <ElFormItem label="PMS code">
          <ElInput v-model="form.pmsRoomTypeCode" placeholder="例如：SDH" />
        </ElFormItem>
        <ElFormItem label="Fly Kiosk Room Type ID">
          <ElInput v-model="form.flyKioskRoomTypeId" placeholder="（選填）" />
        </ElFormItem>
        <ElFormItem label="關聯方案">
          <ElSelect
            v-model="form.associatePlansId"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="選擇要關聯的方案"
            style="width: 100%"
          >
            <ElOption
              v-for="opt in planOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="save">儲存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
