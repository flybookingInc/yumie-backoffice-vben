<script lang="ts" setup>
import type { SmsVerificationLookup } from '#/api/sms';

import { computed, onUnmounted, ref } from 'vue';

import { ElAlert, ElButton, ElCard, ElInput, ElMessage } from 'element-plus';

import { smsApi } from '#/api/sms';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'ReportsSmsCodeLookup' });

const hotelStore = useHotelStore();
const currentHotelId = computed(() => hotelStore.currentHotelId);

const phone = ref('');
const loading = ref(false);
const result = ref<null | SmsVerificationLookup>(null);
const queriedPhone = ref('');

const phoneValid = computed(() => /^09\d{8}$/.test(phone.value.trim()));

// 每秒更新的時鐘，用於倒數（一律以 backend 回傳的 expiresAt 為準）。
const nowMs = ref(Date.now());
let timer: null | ReturnType<typeof setInterval> = null;
function startTimer(): void {
  if (timer) return;
  timer = setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
}
function stopTimer(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
onUnmounted(stopTimer);

const remainingMs = computed(() => {
  const exp = result.value?.expiresAt;
  return exp ? new Date(exp).getTime() - nowMs.value : 0;
});
const countdownText = computed(() => {
  const total = Math.max(0, Math.floor(remainingMs.value / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});
// 後端回 revealed，但倒數已歸零時視同過期，避免念出剛失效的驗證碼。
const liveExpired = computed(
  () => result.value?.result === 'revealed' && remainingMs.value <= 0,
);
const showCode = computed(
  () => result.value?.result === 'revealed' && !liveExpired.value,
);

function formatTime(iso: null | string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Taipei',
  });
}

async function lookup(): Promise<void> {
  if (!phoneValid.value) {
    ElMessage.warning('請輸入正確的 10 碼手機號碼（09 開頭）');
    return;
  }
  loading.value = true;
  result.value = null;
  stopTimer();
  try {
    const data = await smsApi.verificationCode(phone.value.trim());
    queriedPhone.value = phone.value.trim();
    nowMs.value = Date.now();
    result.value = data;
    if (data.result === 'revealed') startTimer();
  } finally {
    loading.value = false;
  }
}

async function copyCode(): Promise<void> {
  const code = result.value?.code;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    ElMessage.success('已複製驗證碼');
  } catch {
    ElMessage.error('複製失敗，請手動選取');
  }
}
</script>

<template>
  <div class="grid gap-4 p-4">
    <ElCard>
      <template #header>
        <span>
          簡訊驗證碼查詢 —
          {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}
        </span>
      </template>

      <div class="grid gap-3" style="max-width: 460px">
        <p class="text-sm text-gray-500">
          客人收不到登入簡訊時，請客人先在訂房頁點「發送驗證碼」，再於此輸入其手機號碼查詢當下驗證碼，口頭告知客人輸入。
        </p>
        <div class="flex gap-2">
          <ElInput
            v-model="phone"
            maxlength="10"
            clearable
            placeholder="09xxxxxxxx"
            @keyup.enter="lookup"
          />
          <ElButton
            type="primary"
            :loading="loading"
            :disabled="!phoneValid"
            @click="lookup"
          >
            查詢
          </ElButton>
        </div>
      </div>
    </ElCard>

    <ElCard v-if="result">
      <ElAlert
        v-if="result.result === 'not_found'"
        type="info"
        :closable="false"
        show-icon
        title="查無近期驗證碼"
        description="請確認客人已在訂房頁點選「發送驗證碼」後再查詢。"
      />

      <ElAlert
        v-else-if="result.result === 'expired' || liveExpired"
        type="warning"
        :closable="false"
        show-icon
        :title="`驗證碼已過期（發送於 ${formatTime(result.sentAt)}）`"
        description="請客人於訂房頁重新發送驗證碼。"
      />

      <div v-else-if="showCode" class="grid gap-3 text-center">
        <div class="text-sm text-gray-500">
          {{ queriedPhone }} 的當下驗證碼（發送於 {{ formatTime(result.sentAt) }}）
        </div>
        <div
          class="font-mono tracking-widest"
          style="font-size: 44px; font-weight: 700"
        >
          {{ result.code }}
        </div>
        <div
          class="text-sm"
          :class="remainingMs <= 60_000 ? 'text-red-500' : 'text-gray-500'"
        >
          有效剩餘 {{ countdownText }}
        </div>
        <div v-if="result.verified" class="text-sm text-amber-600">
          （此驗證碼已完成驗證，客人可能已登入）
        </div>
        <div>
          <ElButton @click="copyCode">複製驗證碼</ElButton>
        </div>
      </div>
    </ElCard>
  </div>
</template>
