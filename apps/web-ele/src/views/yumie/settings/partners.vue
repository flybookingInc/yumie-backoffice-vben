<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { Partner, PartnerInput } from '#/api/partners';

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
  ElPopconfirm,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { partnersApi } from '#/api/partners';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'SettingsPartnersPage' });

const hotelStore = useHotelStore();

const rows = ref<Partner[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
// 編輯時鎖定 code（不可改 code；改碼 = 新建 + 停用舊碼）。
const editingCode = ref('');

const formRef = ref<FormInstance>();
const form = reactive<Required<PartnerInput>>({
  active: true,
  code: '',
  contact: '',
  freeRestMinutes: 30,
  minReservedMinutes: 0,
  partnerName: '',
  rewardPerBooking: 50,
});

const CODE_RE = /^[A-Za-z0-9_-]{1,32}$/;
const rules: FormRules = {
  code: [
    { message: '請輸入推薦碼', required: true, trigger: 'blur' },
    {
      message: '推薦碼僅限英數、_、-，長度 1–32',
      pattern: CODE_RE,
      trigger: 'blur',
    },
  ],
  partnerName: [{ message: '請輸入店家名稱', required: true, trigger: 'blur' }],
};

const currentHotelId = computed(() => hotelStore.currentHotelId);

function resetForm(): void {
  editingCode.value = '';
  Object.assign(form, {
    active: true,
    code: '',
    contact: '',
    freeRestMinutes: 30,
    minReservedMinutes: 0,
    partnerName: '',
    rewardPerBooking: 50,
  });
  formRef.value?.clearValidate();
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  rows.value = [];
  if (!hotelId) return;
  loading.value = true;
  try {
    const result = await partnersApi.list();
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

function openEdit(row: Partner): void {
  editingCode.value = row.code;
  Object.assign(form, {
    active: row.active,
    code: row.code,
    contact: row.contact ?? '',
    freeRestMinutes: row.freeRestMinutes,
    minReservedMinutes: row.minReservedMinutes,
    partnerName: row.partnerName,
    rewardPerBooking: row.rewardPerBooking,
  });
  dialogOpen.value = true;
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const payload: PartnerInput = {
      active: form.active,
      contact: form.contact.trim(),
      freeRestMinutes: form.freeRestMinutes,
      minReservedMinutes: form.minReservedMinutes,
      partnerName: form.partnerName.trim(),
      rewardPerBooking: form.rewardPerBooking,
    };
    if (editingCode.value) {
      await partnersApi.update(editingCode.value, payload);
      ElMessage.success('合作夥伴已更新');
    } else {
      await partnersApi.create({
        ...payload,
        code: form.code.trim().toUpperCase(),
      });
      ElMessage.success('合作夥伴已新增');
    }
    dialogOpen.value = false;
    await load();
  } catch {
    // request interceptor 已 toast，避免重複通知
  } finally {
    saving.value = false;
  }
}

async function deactivate(row: Partner): Promise<void> {
  try {
    await partnersApi.remove(row.code);
    ElMessage.success('合作夥伴已停用');
    await load();
  } catch {
    // request interceptor 已 toast
  }
}

watch(currentHotelId, () => void load(), { immediate: true });
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>異業合作夥伴 —
            {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}</span>
          <ElButton type="primary" @click="openCreate">新增夥伴</ElButton>
        </div>
      </template>
      <ElTable v-loading="loading" :data="rows" border row-key="code">
        <ElTableColumn label="推薦碼" prop="code" width="140" />
        <ElTableColumn label="店家名稱" prop="partnerName" min-width="160" />
        <ElTableColumn label="聯絡資訊" prop="contact" min-width="160" />
        <ElTableColumn
          label="加贈(分)"
          prop="freeRestMinutes"
          width="100"
          align="center"
        />
        <ElTableColumn
          label="門檻(分)"
          prop="minReservedMinutes"
          width="100"
          align="center"
        />
        <ElTableColumn
          label="回饋(元/筆)"
          prop="rewardPerBooking"
          width="120"
          align="center"
        />
        <ElTableColumn label="狀態" width="90" align="center">
          <template #default="{ row }">
            <ElTag :type="(row as Partner).active ? 'success' : 'info'">
              {{ (row as Partner).active ? '啟用' : '停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton size="small" @click="openEdit(row as Partner)">
              編輯
            </ElButton>
            <ElPopconfirm
              v-if="(row as Partner).active"
              title="確認停用此推薦碼？"
              confirm-button-text="停用"
              cancel-button-text="取消"
              @confirm="deactivate(row as Partner)"
            >
              <template #reference>
                <ElButton size="small" type="danger">停用</ElButton>
              </template>
            </ElPopconfirm>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <ElDialog
      v-model="dialogOpen"
      :title="editingCode ? '編輯合作夥伴' : '新增合作夥伴'"
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
        <ElFormItem label="推薦碼" prop="code">
          <ElInput
            v-model="form.code"
            :disabled="!!editingCode"
            placeholder="例如：A001（不可重複，建立後不可改）"
          />
        </ElFormItem>
        <ElFormItem label="店家名稱" prop="partnerName">
          <ElInput
            v-model="form.partnerName"
            placeholder="例如：XX 汽車保養廠"
          />
        </ElFormItem>
        <ElFormItem label="聯絡資訊">
          <ElInput v-model="form.contact" placeholder="（選填）電話 / 聯絡人" />
        </ElFormItem>
        <ElFormItem label="休息加贈（分鐘）">
          <ElInputNumber
            v-model="form.freeRestMinutes"
            :min="0"
            :max="240"
            :step="5"
          />
        </ElFormItem>
        <ElFormItem label="加時門檻（分鐘）">
          <ElInputNumber
            v-model="form.minReservedMinutes"
            :min="0"
            :max="1440"
            :step="30"
          />
        </ElFormItem>
        <ElFormItem label="每筆回饋（元）">
          <ElInputNumber
            v-model="form.rewardPerBooking"
            :min="0"
            :max="10000"
            :step="10"
          />
        </ElFormItem>
        <ElFormItem label="啟用">
          <ElSwitch v-model="form.active" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="save">儲存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
