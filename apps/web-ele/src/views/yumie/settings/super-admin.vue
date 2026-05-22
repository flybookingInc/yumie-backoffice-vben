<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { HotelCreateInput, HotelSummary } from '#/api/hotels';

import { onMounted, reactive, ref } from 'vue';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { hotelsApi } from '#/api/hotels';

defineOptions({ name: 'SettingsSuperAdminPage' });

const rows = ref<HotelSummary[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);

const formRef = ref<FormInstance>();
const blankForm = (): HotelCreateInput => ({
  hotelAddress: '',
  hotelId: '',
  hotelName: '',
  hotelPhone: '',
  notifyEmail: '',
});
const form = reactive<HotelCreateInput>(blankForm());

const rules: FormRules = {
  hotelId: [
    { message: '請輸入 Hotel ID', required: true, trigger: 'blur' },
    {
      message: '只接受小寫字母 / 數字 / - 與 _，且第一個字必須是字母或數字',
      pattern: /^[\da-z][\d_a-z-]*$/,
      trigger: 'blur',
    },
  ],
  hotelName: [{ message: '請輸入旅館名稱', required: true, trigger: 'blur' }],
};

async function load(): Promise<void> {
  loading.value = true;
  try {
    rows.value = await hotelsApi.list();
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  Object.assign(form, blankForm());
  formRef.value?.clearValidate();
  dialogOpen.value = true;
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    await hotelsApi.create({
      hotelAddress: form.hotelAddress?.trim() || undefined,
      hotelId: form.hotelId.trim(),
      hotelName: form.hotelName.trim(),
      hotelPhone: form.hotelPhone?.trim() || undefined,
      notifyEmail: form.notifyEmail?.trim() || undefined,
    });
    ElMessage.success('旅館已新增');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: HotelSummary): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `確定刪除旅館「${row.hotelName}」 (${row.hotelId})？\n此操作無法復原。`,
      '刪除確認',
      { cancelButtonText: '取消', confirmButtonText: '刪除', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await hotelsApi.delete(row.hotelId);
    ElMessage.success('旅館已刪除');
    await load();
  } catch {
    // interceptor toasted
  }
}

async function toggleLoyalty(row: HotelSummary, value: boolean): Promise<void> {
  try {
    await hotelsApi.toggleLoyalty(row.hotelId, value);
    row.loyaltyEnabled = value;
    ElMessage.success(value ? '已啟用 Loyalty' : '已停用 Loyalty');
  } catch {
    // interceptor toasted
  }
}

async function toggleDisabled(
  row: HotelSummary,
  value: boolean,
): Promise<void> {
  try {
    await hotelsApi.update(row.hotelId, { disabled: value });
    row.disabled = value;
    ElMessage.success(value ? '已停用旅館' : '已啟用旅館');
  } catch {
    // interceptor toasted
  }
}

onMounted(load);
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            旅館列表 ({{ rows.length }})
            <ElTag size="small" type="info" style="margin-left: 8px">
              superAdmin only
            </ElTag>
          </span>
          <ElButton type="primary" @click="openCreate">新增旅館</ElButton>
        </div>
      </template>
      <ElTable v-loading="loading" :data="rows" border row-key="hotelId">
        <ElTableColumn label="旅館名稱" prop="hotelName" min-width="240" />
        <ElTableColumn label="Hotel ID" prop="hotelId" width="200" />
        <ElTableColumn label="電話" prop="hotelPhone" width="140" />
        <ElTableColumn label="通知 Email" prop="notifyEmail" min-width="200" />
        <ElTableColumn label="啟用" width="120" align="center">
          <template #default="{ row }">
            <ElSwitch
              :model-value="!(row as HotelSummary).disabled"
              active-text="啟用"
              inactive-text="停用"
              inline-prompt
              @change="
                (v) => toggleDisabled(row as HotelSummary, !(v as boolean))
              "
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="Loyalty" width="120" align="center">
          <template #default="{ row }">
            <ElSwitch
              :model-value="(row as HotelSummary).loyaltyEnabled"
              active-text="開"
              inactive-text="關"
              inline-prompt
              @change="(v) => toggleLoyalty(row as HotelSummary, v as boolean)"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <ElPopconfirm
              cancel-button-text="取消"
              confirm-button-text="刪除"
              title="確認刪除？"
              @confirm="remove(row as HotelSummary)"
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
      title="新增旅館"
      width="520"
    >
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120"
        @submit.prevent
      >
        <ElFormItem label="Hotel ID" prop="hotelId">
          <ElInput v-model="form.hotelId" placeholder="例如：my-new-hotel" />
          <span style="font-size: 12px; color: #888">
            建立後不可修改；只接受小寫字母 / 數字 / 連字號 / 底線
          </span>
        </ElFormItem>
        <ElFormItem label="旅館名稱" prop="hotelName">
          <ElInput
            v-model="form.hotelName"
            placeholder="例如：浮逸飯店永和館"
          />
        </ElFormItem>
        <ElFormItem label="電話">
          <ElInput v-model="form.hotelPhone" placeholder="（選填）" />
        </ElFormItem>
        <ElFormItem label="通知 Email">
          <ElInput v-model="form.notifyEmail" placeholder="（選填）" />
        </ElFormItem>
        <ElFormItem label="地址">
          <ElInput v-model="form.hotelAddress" placeholder="（選填）" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="save">
          建立
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>
