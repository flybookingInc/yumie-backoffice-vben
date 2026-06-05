<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { Partner, PartnerInput } from '#/api/partners';

import { computed, reactive, ref, watch } from 'vue';

import {
  ElAlert,
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
import { toDataURL } from 'qrcode';

import { partnerAccountApi, partnersApi } from '#/api/partners';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'SettingsPartnersPage' });

const hotelStore = useHotelStore();

const rows = ref<Partner[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
// 編輯時鎖定 code（不可改 code；改碼 = 新建 + 停用舊碼）。
const editingCode = ref('');

// 預約 QR Code（給合作夥伴的客人掃描）
const qrDialogOpen = ref(false);
const qrLoading = ref(false);
const qrDataUrl = ref('');
const qrPartner = ref<null | Partner>(null);

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

// 顧客端訂房站 base URL（去尾斜線）；預設正式站，可由 .env 覆寫。
const bookingBaseUrl = (
  (import.meta.env.VITE_GLOB_BOOKING_BASE_URL as string | undefined) ||
  'https://yumie.flybooking.io'
).replace(/\/+$/, '');

function buildBookingUrl(code: string): string {
  return `${bookingBaseUrl}/${currentHotelId.value}?ref=${encodeURIComponent(code)}`;
}

const qrBookingUrl = computed(() =>
  qrPartner.value ? buildBookingUrl(qrPartner.value.code) : '',
);

async function openQr(row: Partner): Promise<void> {
  qrPartner.value = row;
  qrDataUrl.value = '';
  qrDialogOpen.value = true;
  qrLoading.value = true;
  try {
    qrDataUrl.value = await toDataURL(buildBookingUrl(row.code), {
      margin: 2,
      width: 320,
    });
  } catch {
    ElMessage.error('QR Code 產生失敗');
  } finally {
    qrLoading.value = false;
  }
}

function downloadQr(): void {
  if (!qrDataUrl.value || !qrPartner.value) return;
  const a = document.createElement('a');
  a.href = qrDataUrl.value;
  a.download = `referral-${qrPartner.value.code}.png`;
  a.click();
}

async function copyBookingUrl(): Promise<void> {
  try {
    await navigator.clipboard.writeText(qrBookingUrl.value);
    ElMessage.success('連結已複製');
  } catch {
    ElMessage.error('複製失敗，請手動複製');
  }
}

// ===== 夥伴登入帳號（門戶對帳）=====
const accountDialogOpen = ref(false);
const accountTarget = ref<null | Partner>(null);
const accountEmail = ref('');
const accountPassword = ref('');
const accountSaving = ref(false);
const accountLink = ref('');
const accountLinkLabel = ref('');

function accountStatusText(s?: string): string {
  switch (s) {
    case 'active': {
      return '已啟用';
    }
    case 'authReadyDisabled': {
      return '建立中（待啟用）';
    }
    case 'disabled': {
      return '已停用';
    }
    case 'provisioning': {
      return '建立中';
    }
    default: {
      return '未建立';
    }
  }
}

function openAccount(row: Partner): void {
  accountTarget.value = row;
  accountEmail.value = row.accountEmail ?? '';
  accountPassword.value = '';
  accountLink.value = '';
  accountLinkLabel.value = '';
  accountDialogOpen.value = true;
}

async function createAccount(): Promise<void> {
  const target = accountTarget.value;
  if (!target || !accountEmail.value.trim()) {
    ElMessage.warning('請輸入 Email');
    return;
  }
  accountSaving.value = true;
  try {
    const result = await partnerAccountApi.create(target.code, {
      email: accountEmail.value.trim(),
      password: accountPassword.value || undefined,
    });
    if (result.linkError) {
      ElMessage.warning('帳號已建立，但設定連結產生失敗，請改用「重設密碼」');
    } else if (result.setupLink) {
      accountLink.value = result.setupLink;
      accountLinkLabel.value = '密碼設定連結（轉交夥伴）';
      ElMessage.success('帳號已建立');
    } else {
      ElMessage.success('帳號已建立');
    }
    await load();
  } catch {
    // interceptor toasted（email 重複/已存在等）
  } finally {
    accountSaving.value = false;
  }
}

async function resetAccountPassword(): Promise<void> {
  const target = accountTarget.value;
  if (!target) return;
  accountSaving.value = true;
  try {
    const result = await partnerAccountApi.reset(target.code);
    accountLink.value = result.resetLink ?? '';
    accountLinkLabel.value = '密碼重設連結（轉交夥伴）';
    ElMessage.success('已產生重設連結');
  } catch {
    // interceptor toasted
  } finally {
    accountSaving.value = false;
  }
}

async function disableAccount(): Promise<void> {
  const target = accountTarget.value;
  if (!target) return;
  accountSaving.value = true;
  try {
    await partnerAccountApi.disable(target.code);
    ElMessage.success('登入帳號已停用');
    await load();
    accountDialogOpen.value = false;
  } catch {
    // interceptor toasted
  } finally {
    accountSaving.value = false;
  }
}

async function enableAccount(): Promise<void> {
  const target = accountTarget.value;
  if (!target) return;
  accountSaving.value = true;
  try {
    await partnerAccountApi.enable(target.code);
    ElMessage.success('登入帳號已啟用');
    await load();
    accountDialogOpen.value = false;
  } catch {
    // interceptor toasted
  } finally {
    accountSaving.value = false;
  }
}

async function copyAccountLink(): Promise<void> {
  if (!accountLink.value) return;
  try {
    await navigator.clipboard.writeText(accountLink.value);
    ElMessage.success('連結已複製');
  } catch {
    ElMessage.error('複製失敗，請手動複製');
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
        <ElTableColumn label="登入帳號" width="110" align="center">
          <template #default="{ row }">
            <ElTag
              :type="
                (row as Partner).accountStatus === 'active'
                  ? 'success'
                  : (row as Partner).accountStatus
                    ? 'warning'
                    : 'info'
              "
            >
              {{ accountStatusText((row as Partner).accountStatus) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="320" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton
              size="small"
              type="primary"
              @click="openQr(row as Partner)"
            >
              QR
            </ElButton>
            <ElButton size="small" @click="openAccount(row as Partner)">
              帳號
            </ElButton>
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

    <ElDialog
      v-model="qrDialogOpen"
      :title="`預約 QR Code — ${qrPartner?.partnerName ?? ''}`"
      width="420"
    >
      <div v-loading="qrLoading" class="flex flex-col items-center gap-3">
        <ElAlert
          v-if="qrPartner && !qrPartner.active"
          type="warning"
          :closable="false"
          show-icon
          title="此推薦碼目前停用，掃描不會加時與歸因"
        />
        <img
          v-if="qrDataUrl"
          :src="qrDataUrl"
          alt="預約 QR Code"
          width="280"
          height="280"
        />
        <p class="text-sm" style="text-align: center; word-break: break-all">
          {{ qrBookingUrl }}
        </p>
        <p class="text-xs" style="color: #999; text-align: center">
          給合作夥伴張貼，讓等待中的車主掃描即可帶推薦碼進入訂房頁。
        </p>
      </div>
      <template #footer>
        <ElButton @click="copyBookingUrl">複製連結</ElButton>
        <ElButton type="primary" :disabled="!qrDataUrl" @click="downloadQr">
          下載 PNG
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="accountDialogOpen"
      :title="`登入帳號 — ${accountTarget?.partnerName ?? ''}`"
      width="460"
    >
      <p class="mb-2">
        狀態：
        <ElTag
          :type="
            accountTarget?.accountStatus === 'active'
              ? 'success'
              : accountTarget?.accountStatus
                ? 'warning'
                : 'info'
          "
        >
          {{ accountStatusText(accountTarget?.accountStatus) }}
        </ElTag>
      </p>

      <ElForm label-width="80" @submit.prevent>
        <ElFormItem label="Email">
          <ElInput
            v-model="accountEmail"
            :disabled="!!accountTarget?.accountStatus"
            placeholder="夥伴登入 Email"
          />
        </ElFormItem>
        <ElFormItem v-if="!accountTarget?.accountStatus" label="密碼">
          <ElInput
            v-model="accountPassword"
            type="password"
            show-password
            placeholder="（選填，留空則寄設定連結）"
          />
        </ElFormItem>
      </ElForm>

      <ElAlert
        v-if="accountLink"
        type="success"
        :closable="false"
        show-icon
        :title="accountLinkLabel"
        class="mb-2"
      >
        <div style="word-break: break-all">{{ accountLink }}</div>
        <ElButton size="small" class="mt-1" @click="copyAccountLink">
          複製連結
        </ElButton>
      </ElAlert>

      <template #footer>
        <ElButton @click="accountDialogOpen = false">關閉</ElButton>
        <ElButton
          v-if="!accountTarget?.accountStatus"
          type="primary"
          :loading="accountSaving"
          @click="createAccount"
        >
          建立帳號
        </ElButton>
        <template v-else>
          <ElButton
            v-if="accountTarget?.accountStatus !== 'disabled'"
            :loading="accountSaving"
            @click="resetAccountPassword"
          >
            重設密碼
          </ElButton>
          <ElButton
            v-if="accountTarget?.accountStatus === 'disabled'"
            type="primary"
            :loading="accountSaving"
            @click="enableAccount"
          >
            重新啟用
          </ElButton>
          <ElPopconfirm
            v-else
            title="確認停用此登入帳號？夥伴將立即無法登入對帳門戶。"
            confirm-button-text="停用"
            cancel-button-text="取消"
            @confirm="disableAccount"
          >
            <template #reference>
              <ElButton type="danger" :loading="accountSaving">
                停用帳號
              </ElButton>
            </template>
          </ElPopconfirm>
        </template>
      </template>
    </ElDialog>
  </div>
</template>
