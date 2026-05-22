<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { HotelSummary } from '#/api/hotels';
import type {
  HotelUser,
  HotelUserCreateInput,
  HotelUserRule,
} from '#/api/users';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPopconfirm,
  ElSelect,
  ElSpace,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { hotelsApi } from '#/api/hotels';
import { usersApi } from '#/api/users';

defineOptions({ name: 'SettingsUsersPage' });

const rows = ref<HotelUser[]>([]);
const hotels = ref<HotelSummary[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editingId = ref('');

const formRef = ref<FormInstance>();
function blankForm() {
  return {
    email: '',
    enabled: true,
    hotelGroup: [] as string[],
    name: '',
    password: '',
    phone: '',
    rule: 'admin' as HotelUserRule,
  };
}
const form = reactive<ReturnType<typeof blankForm>>(blankForm());

const ruleOptions: { label: string; value: HotelUserRule }[] = [
  { label: '旅館管理者 (admin)', value: 'admin' },
  { label: '超級管理者 (superAdmin)', value: 'superAdmin' },
];

const baseRules: FormRules = {
  email: [
    { message: '請輸入 Email', required: true, trigger: 'blur' },
    { message: 'Email 格式錯誤', trigger: 'blur', type: 'email' },
  ],
  hotelGroup: [
    {
      message: '請至少選擇一個旅館',
      trigger: 'change',
      validator: (_r, v, cb) =>
        Array.isArray(v) && v.length > 0
          ? cb()
          : cb(new Error('請至少選擇一個旅館')),
    },
  ],
  name: [{ message: '請輸入姓名', required: true, trigger: 'blur' }],
  password: [
    {
      message: '請輸入密碼（至少 6 字）',
      required: true,
      trigger: 'blur',
      min: 6,
    },
  ],
  rule: [{ message: '請選擇角色', required: true, trigger: 'change' }],
};

const rules = computed<FormRules>(() => {
  if (editingId.value) {
    const { password: _pwd, email: _email, ...rest } = baseRules;
    return {
      ...rest,
      // password 編輯時可選；填了就要 ≥ 6 字
      password: [
        {
          min: 6,
          message: '密碼至少 6 字（不填則不修改）',
          trigger: 'blur',
        },
      ],
    } as FormRules;
  }
  return baseRules;
});

const hotelLabel = computed(() => {
  const map: Record<string, string> = {};
  for (const h of hotels.value) map[h.hotelId] = h.hotelName;
  return map;
});

function resetForm(): void {
  editingId.value = '';
  Object.assign(form, blankForm());
  formRef.value?.clearValidate();
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [u, h] = await Promise.all([usersApi.list(), hotelsApi.list()]);
    rows.value = u;
    hotels.value = h;
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HotelUser): void {
  editingId.value = row.id;
  Object.assign(form, {
    email: row.email,
    enabled: row.enabled,
    hotelGroup: [...row.hotelGroup],
    name: row.name,
    password: '',
    phone: row.phone ?? '',
    rule: row.rule,
  });
  dialogOpen.value = true;
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (editingId.value) {
      await usersApi.update(editingId.value, {
        enabled: form.enabled,
        hotelGroup: [...form.hotelGroup],
        name: form.name,
        phone: form.phone?.trim() || undefined,
        rule: form.rule,
        password: form.password?.trim() || undefined,
      });
      ElMessage.success('帳號已更新');
    } else {
      await usersApi.create({
        email: form.email.trim(),
        enabled: form.enabled,
        hotelGroup: [...form.hotelGroup],
        name: form.name,
        password: form.password,
        phone: form.phone?.trim() || undefined,
        rule: form.rule,
      } satisfies HotelUserCreateInput);
      ElMessage.success('帳號已新增');
    }
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: HotelUser): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `確定刪除帳號「${row.name}」 (${row.email})？\nFirebase Auth 帳號會同步移除。`,
      '刪除確認',
      { cancelButtonText: '取消', confirmButtonText: '刪除', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await usersApi.delete(row.id);
    ElMessage.success('帳號已刪除');
    await load();
  } catch {
    // interceptor toasted
  }
}

async function toggleEnabled(row: HotelUser, value: boolean): Promise<void> {
  try {
    await usersApi.update(row.id, { enabled: value });
    row.enabled = value;
    ElMessage.success(value ? '已啟用帳號' : '已停用帳號');
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
            帳號列表 ({{ rows.length }})
            <ElTag size="small" type="info" style="margin-left: 8px">
              superAdmin only
            </ElTag>
          </span>
          <ElButton type="primary" @click="openCreate">新增帳號</ElButton>
        </div>
      </template>
      <ElTable v-loading="loading" :data="rows" border row-key="id">
        <ElTableColumn label="姓名" prop="name" min-width="140" />
        <ElTableColumn label="Email" prop="email" min-width="240" />
        <ElTableColumn label="電話" prop="phone" width="160" />
        <ElTableColumn label="角色" width="160">
          <template #default="{ row }">
            <ElTag
              :type="
                (row as HotelUser).rule === 'superAdmin' ? 'danger' : 'success'
              "
              size="small"
            >
              {{
                (row as HotelUser).rule === 'superAdmin'
                  ? '超級管理者'
                  : '旅館管理者'
              }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="旅館別 hotelGroup" min-width="280">
          <template #default="{ row }">
            <ElSpace v-if="(row as HotelUser).hotelGroup.length > 0" wrap>
              <ElTag
                v-for="id in (row as HotelUser).hotelGroup"
                :key="id"
                type="info"
                size="small"
              >
                {{ hotelLabel[id] ?? id }}
              </ElTag>
            </ElSpace>
            <span v-else style="color: #888">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="啟用" width="120" align="center">
          <template #default="{ row }">
            <ElSwitch
              :model-value="(row as HotelUser).enabled"
              active-text="啟用"
              inactive-text="停用"
              inline-prompt
              @change="(v) => toggleEnabled(row as HotelUser, v as boolean)"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton size="small" @click="openEdit(row as HotelUser)">
              編輯
            </ElButton>
            <ElPopconfirm
              cancel-button-text="取消"
              confirm-button-text="刪除"
              title="確認刪除？"
              @confirm="remove(row as HotelUser)"
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
      :title="editingId ? '編輯帳號' : '新增帳號'"
      width="600"
    >
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="140"
        @submit.prevent
      >
        <ElFormItem label="姓名" prop="name">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="Email" prop="email">
          <ElInput
            v-model="form.email"
            type="email"
            :disabled="!!editingId"
            :placeholder="editingId ? '建立後不可修改' : ''"
          />
        </ElFormItem>
        <ElFormItem label="電話">
          <ElInput v-model="form.phone" placeholder="+886912345678 (含國碼)" />
        </ElFormItem>
        <ElFormItem label="密碼" prop="password">
          <ElInput
            v-model="form.password"
            type="password"
            show-password
            :placeholder="editingId ? '不填則不修改' : '至少 6 字'"
          />
        </ElFormItem>
        <ElFormItem label="角色" prop="rule">
          <ElSelect v-model="form.rule" style="width: 100%">
            <ElOption
              v-for="opt in ruleOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="旅館別 hotelGroup" prop="hotelGroup">
          <ElCheckboxGroup v-model="form.hotelGroup">
            <ElCheckbox
              v-for="h in hotels"
              :key="h.hotelId"
              :label="h.hotelName"
              :value="h.hotelId"
              border
              style="margin-right: 4px; margin-bottom: 4px"
            />
          </ElCheckboxGroup>
        </ElFormItem>
        <ElFormItem label="狀態">
          <ElSwitch
            v-model="form.enabled"
            active-text="啟用"
            inactive-text="停用"
            inline-prompt
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="save">儲存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
