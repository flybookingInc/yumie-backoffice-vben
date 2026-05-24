<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type {
  CreateAdminOrderInput,
  CreateAdminOrderResult,
} from '#/api/orders';
import type { Plan } from '#/api/plans';

import { computed, reactive, ref, watch } from 'vue';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElNotification,
  ElOption,
  ElSelect,
  ElTag,
} from 'element-plus';

import { ordersApi } from '#/api/orders';
import { plansApi } from '#/api/plans';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'OrdersBookingPage' });

const hotelStore = useHotelStore();

const plans = ref<Plan[]>([]);
const plansLoading = ref(false);
const saving = ref(false);
const lastResult = ref<CreateAdminOrderResult | null>(null);

const formRef = ref<FormInstance>();

function todayTaipei(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

/**
 * 回傳「嚴格大於現在時間」的最小 slot（HH:mm，依 interval 對齊）。
 * 例：interval=30，現在 09:53 → 10:00；現在 10:00 → 10:30。
 * 已過今天最後一格時，回傳隔天 00:00（使用者通常會自行改日期）。
 */
function nextSlotAfterNow(interval: number): string {
  const taipeiTimeStr = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: 'Asia/Taipei',
  });
  const [hStr, mStr] = taipeiTimeStr.split(':');
  const nowMinutes = Number(hStr) * 60 + Number(mStr);
  const step = Math.max(1, Math.floor(interval));
  const nextStep = Math.floor(nowMinutes / step) * step + step;
  if (nextStep >= 24 * 60) return '00:00';
  const hh = String(Math.floor(nextStep / 60)).padStart(2, '0');
  const mm = String(nextStep % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function blankForm(): CreateAdminOrderInput {
  return {
    checkInDate: todayTaipei(),
    // checkInTime 在 hotel meta 載入後由 watcher 補上（要先知道 bookingInterval 才能算對齊的 slot）
    checkInTime: '',
    guestPhone: '',
    planId: '',
  };
}
const form = reactive<CreateAdminOrderInput>(blankForm());

const rules: FormRules = {
  checkInDate: [{ message: '請選擇日期', required: true, trigger: 'change' }],
  checkInTime: [{ message: '請選擇時段', required: true, trigger: 'change' }],
  guestPhone: [{ message: '請輸入電話', required: true, trigger: 'blur' }],
  planId: [{ message: '請選擇方案', required: true, trigger: 'change' }],
};

const currentHotelId = computed(() => hotelStore.currentHotelId);
const currentHotelMeta = computed(() => hotelStore.currentHotelMeta);

const planOptions = computed(() =>
  plans.value.map((p) => ({
    label: `${p.planName} (${p.weekPrice ? `平日 NT$ ${p.weekPrice}` : ''}${p.weekendPrice ? `／假日 NT$ ${p.weekendPrice}` : ''})`,
    plan: p,
    value: p.id,
  })),
);

const selectedPlan = computed<null | Plan>(() => {
  if (!form.planId) return null;
  return plans.value.find((p) => p.id === form.planId) ?? null;
});

/** 依日期 + hotel.weekend 判斷是否為平日 / 周末 */
const isWeekend = computed(() => {
  if (!form.checkInDate) return false;
  // 直接把 'YYYY-MM-DD' 當 calendar date 處理：用 Date.UTC 建出 UTC 午夜，再
  // 讀 getUTCDay() 取到該日期當天（不論時區）的 day-of-week。
  // 之前用 new Date('YYYY-MM-DDT00:00:00+08:00') + getUTCDay()，會被換算成
  // UTC 前一天（例：2026-05-25 00:00+08 = 2026-05-24 16:00 UTC），getUTCDay
  // 回前一天的星期 → 平日週一被誤判為週末。
  const [y, m, d] = form.checkInDate.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const weekend = (currentHotelMeta.value?.weekend as number[] | undefined) ?? [
    0, 6,
  ];
  return weekend.includes(dayOfWeek);
});

const effectivePrice = computed(() => {
  const plan = selectedPlan.value;
  if (!plan) return 0;
  return isWeekend.value ? plan.weekendPrice : plan.weekPrice;
});
const effectiveDuration = computed(() => {
  const plan = selectedPlan.value;
  if (!plan) return 0;
  return isWeekend.value ? plan.weekendQkDuration : plan.weekQkDuration;
});

/** 產生 48 個 HH:mm 時段（依 hotel.bookingInterval 為間隔，預設 30 分鐘） */
const timeSlots = computed(() => {
  const interval = (currentHotelMeta.value?.bookingInterval as number) || 30;
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += interval) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    out.push(`${hh}:${mm}`);
  }
  return out;
});

/** 時段口語化前綴：凌晨 / 早上 / 下午 / 晚上 — 4 桶減少使用者誤選 */
function timeBucket(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  if (h < 6) return '凌晨';
  if (h < 12) return '早上';
  if (h < 18) return '下午';
  return '晚上';
}

function timeSlotLabel(hhmm: string): string {
  return `${timeBucket(hhmm)} ${hhmm}`;
}

async function loadPlans(): Promise<void> {
  const hotelId = currentHotelId.value;
  if (!hotelId) return;
  plansLoading.value = true;
  try {
    const list = await plansApi.list({ hotelId });
    if (currentHotelId.value !== hotelId) return;
    // 業者預約頁列出全部方案（含停售）— admin 可能臨時想用已停售方案補單。
    // 排序：販售中優先（disable=false），停售中排後面。
    plans.value = [...list].toSorted((a, b) => {
      if (!!a.disable === !!b.disable) return 0;
      return a.disable ? 1 : -1;
    });
  } finally {
    plansLoading.value = false;
  }
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const result = await ordersApi.createByAdmin({ ...form });
    lastResult.value = result;
    ElNotification({
      duration: 8000,
      message: `${result.plan_name ?? ''}｜代碼 ${result.qkNumber ?? '-'}`,
      title: '預約成功',
      type: 'success',
    });
    ElMessage.success('已建立訂單');
    // 表單保留電話以便連續建單，但重設方案。
    // resetFields 會原子化把欄位重設回初始值（blankForm 的 '')並清掉驗證狀態，
    // 比 `form.planId=''` + `clearValidate` 可靠（後者會被 EP 的 async-validator
    // 在 nextTick 之後 race condition 再寫回錯誤）。
    formRef.value?.resetFields(['planId']);
  } finally {
    saving.value = false;
  }
}

watch(currentHotelId, () => void loadPlans(), { immediate: true });

// 等 hotel meta 載入後，把 checkInTime 預設為「大於現在的最小 slot」。
// 只在使用者尚未自行選過時段時填入，避免覆寫使用者的選擇。
watch(
  () => currentHotelMeta.value?.bookingInterval as number | undefined,
  (interval) => {
    if (interval && !form.checkInTime) {
      form.checkInTime = nextSlotAfterNow(interval);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="p-4 grid gap-4">
    <ElCard>
      <template #header>
        <span>
          預約 — {{ currentHotelMeta?.hotelName ?? currentHotelId }}
          <ElTag
            size="small"
            :type="isWeekend ? 'warning' : 'info'"
            style="margin-left: 8px"
          >
            {{ isWeekend ? '週末' : '平日' }}價格
          </ElTag>
        </span>
      </template>
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120"
        @submit.prevent
      >
        <ElFormItem label="入住日期" prop="checkInDate">
          <ElDatePicker
            v-model="form.checkInDate"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
            style="width: 200px"
          />
        </ElFormItem>
        <ElFormItem label="時段" prop="checkInTime">
          <ElSelect
            v-model="form.checkInTime"
            placeholder="選擇時段"
            filterable
            style="width: 200px"
          >
            <ElOption
              v-for="t in timeSlots"
              :key="t"
              :label="timeSlotLabel(t)"
              :value="t"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="方案" prop="planId">
          <ElSelect
            v-model="form.planId"
            :loading="plansLoading"
            placeholder="選擇方案"
            filterable
            style="width: 480px"
          >
            <ElOption
              v-for="opt in planOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="selectedPlan" label="售價 / 時數">
          <ElTag type="success" size="large">
            NT$ {{ effectivePrice.toLocaleString('zh-TW') }}
          </ElTag>
          <ElTag size="large" style="margin-left: 8px">
            {{ effectiveDuration }} 分鐘 ({{
              (effectiveDuration / 60).toFixed(1)
            }}
            小時)
          </ElTag>
          <span style="margin-left: 8px; font-size: 13px; color: #888">
            （依 {{ isWeekend ? '週末' : '平日' }}價）
          </span>
        </ElFormItem>
        <ElFormItem label="客人電話" prop="guestPhone">
          <ElInput
            v-model="form.guestPhone"
            placeholder="例如：0912345678 或 +886912345678"
            style="width: 280px"
          />
          <span style="margin-left: 8px; font-size: 13px; color: #888">
            預設台灣號碼；後端會自動格式化為 E.164
          </span>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :loading="saving" @click="submit">
            建立預約
          </ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard v-if="lastResult" shadow="never">
      <template #header>
        <span style="color: #67c23a">✅ 最後建單結果</span>
      </template>
      <ElDescriptions :column="2" border>
        <ElDescriptionsItem label="QK 代碼">
          {{ lastResult.qkNumber ?? '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="驗證碼">
          {{ lastResult.verifyNumber ?? '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="預約時間">
          {{
            lastResult.checkinDatetime?.slice(0, 19).replace('T', ' ') ?? '-'
          }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="方案">
          {{ lastResult.plan_name ?? '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="價格">
          NT$ {{ lastResult.price ?? '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem
          v-if="lastResult.membershipBenefit?.applied"
          label="會員優惠"
        >
          <ElAlert type="success" :closable="false" show-icon>
            {{ lastResult.membershipBenefit.levelCode }} — 贈送
            {{ lastResult.membershipBenefit.freeRestMinutes }} 分鐘
          </ElAlert>
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElCard>
  </div>
</template>
