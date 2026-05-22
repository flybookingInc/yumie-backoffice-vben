<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type {
  ExtrasItem,
  ExtrasItemCreateInput,
  ExtrasItemUpdateInput,
} from '#/api/extras';

import { computed, reactive, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElImage,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElPopconfirm,
  ElSpace,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { extrasApi } from '#/api/extras';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'ExtrasIndexPage' });

const hotelStore = useHotelStore();
const userStore = useUserStore();

const items = ref<ExtrasItem[]>([]);
const enableExtras = ref(false);
const loading = ref(false);
const saving = ref(false);
const togglingEnable = ref(false);
const dialogOpen = ref(false);
const editingId = ref('');

const formRef = ref<FormInstance>();
const blankForm = (): ExtrasItemCreateInput & { enable: boolean } => ({
  enable: true,
  extraDescription: '',
  extraImagePath: '',
  extraName: '',
  extraPrice: 0,
  order: '',
});
const form = reactive<ReturnType<typeof blankForm>>(blankForm());

const rules: FormRules = {
  extraName: [{ message: '請輸入商品名稱', required: true, trigger: 'blur' }],
  extraPrice: [{ message: '請輸入價格', required: true, trigger: 'blur' }],
};

const currentHotelId = computed(() => hotelStore.currentHotelId);
const isSuperAdmin = computed(
  () => userStore.userInfo?.roles?.includes('superAdmin') === true,
);

function resetForm(): void {
  editingId.value = '';
  Object.assign(form, blankForm());
  formRef.value?.clearValidate();
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  items.value = [];
  enableExtras.value = false;
  if (!hotelId) return;
  loading.value = true;
  try {
    const result = await extrasApi.list({ hotelId });
    if (currentHotelId.value !== hotelId) return;
    items.value = result.items;
    enableExtras.value = result.enableExtras;
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: ExtrasItem): void {
  editingId.value = row.id;
  Object.assign(form, {
    enable: row.enable,
    extraDescription: row.extraDescription ?? '',
    extraImagePath: row.extraImagePath ?? '',
    extraName: row.extraName,
    extraPrice: row.extraPrice,
    order: row.order ?? '',
  });
  dialogOpen.value = true;
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    const payload: ExtrasItemCreateInput = {
      enable: form.enable,
      extraDescription: form.extraDescription?.trim() || undefined,
      extraImagePath: form.extraImagePath?.trim() || undefined,
      extraName: form.extraName,
      extraPrice: form.extraPrice,
      order: form.order?.trim() || undefined,
    };
    if (editingId.value) {
      await extrasApi.update(editingId.value, payload as ExtrasItemUpdateInput);
      ElMessage.success('加購商品已更新');
    } else {
      await extrasApi.create(payload);
      ElMessage.success('加購商品已新增');
    }
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: ExtrasItem): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `確定刪除商品「${row.extraName}」？`,
      '刪除確認',
      { cancelButtonText: '取消', confirmButtonText: '刪除', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await extrasApi.delete(row.id);
    ElMessage.success('商品已刪除');
    await load();
  } catch {
    // interceptor toasted
  }
}

async function toggleItemEnable(
  row: ExtrasItem,
  value: boolean,
): Promise<void> {
  try {
    await extrasApi.update(row.id, {
      enable: value,
      extraDescription: row.extraDescription,
      extraImagePath: row.extraImagePath,
      extraName: row.extraName,
      extraPrice: row.extraPrice,
      order: row.order,
    });
    row.enable = value;
    ElMessage.success(value ? '已上架' : '已下架');
  } catch {
    // interceptor toasted
  }
}

async function toggleAllEnable(value: boolean): Promise<void> {
  togglingEnable.value = true;
  try {
    await extrasApi.toggleEnable(value);
    enableExtras.value = value;
    ElMessage.success(value ? '已啟用加購功能' : '已關閉加購功能');
  } catch {
    enableExtras.value = !value;
  } finally {
    togglingEnable.value = false;
  }
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
          <ElSpace>
            <span>
              加購 —
              {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}
            </span>
            <template v-if="isSuperAdmin">
              <ElSwitch
                :model-value="enableExtras"
                :loading="togglingEnable"
                active-text="加購功能：開"
                inactive-text="加購功能：關"
                inline-prompt
                @change="(v) => toggleAllEnable(v as boolean)"
              />
              <ElTag size="small" type="info">superAdmin only</ElTag>
            </template>
            <template v-else>
              <ElTag size="small" :type="enableExtras ? 'success' : 'info'">
                加購功能：{{ enableExtras ? '已啟用' : '未啟用' }}
              </ElTag>
            </template>
          </ElSpace>
          <ElButton type="primary" @click="openCreate">新增商品</ElButton>
        </div>
      </template>

      <ElTable v-loading="loading" :data="items" border row-key="id">
        <ElTableColumn label="圖片" width="100" align="center">
          <template #default="{ row }">
            <ElImage
              v-if="(row as ExtrasItem).extraImagePath"
              :src="(row as ExtrasItem).extraImagePath"
              :preview-src-list="[(row as ExtrasItem).extraImagePath!]"
              fit="cover"
              style="width: 60px; height: 60px"
            />
            <span v-else style="color: #888">-</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="商品名稱" prop="extraName" min-width="160" />
        <ElTableColumn label="描述" prop="extraDescription" min-width="220">
          <template #default="{ row }">
            {{ (row as ExtrasItem).extraDescription || '-' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="價格" width="120" align="right">
          <template #default="{ row }">
            {{ formatPrice((row as ExtrasItem).extraPrice) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="排序" width="100" align="center">
          <template #default="{ row }">
            {{ (row as ExtrasItem).order || '-' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="狀態" width="100" align="center">
          <template #default="{ row }">
            <ElSwitch
              :model-value="(row as ExtrasItem).enable"
              active-text="販售中"
              inactive-text="停售"
              inline-prompt
              @change="(v) => toggleItemEnable(row as ExtrasItem, v as boolean)"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <ElButton size="small" @click="openEdit(row as ExtrasItem)">
              編輯
            </ElButton>
            <ElPopconfirm
              cancel-button-text="取消"
              confirm-button-text="刪除"
              title="確認刪除？"
              @confirm="remove(row as ExtrasItem)"
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
      :title="editingId ? '編輯加購商品' : '新增加購商品'"
      width="560"
    >
      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120"
        @submit.prevent
      >
        <ElFormItem label="商品名稱" prop="extraName">
          <ElInput v-model="form.extraName" placeholder="例如：迎賓飲品" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput
            v-model="form.extraDescription"
            type="textarea"
            :rows="2"
            placeholder="（選填）"
          />
        </ElFormItem>
        <ElFormItem label="價格" prop="extraPrice">
          <ElInputNumber
            v-model="form.extraPrice"
            :min="0"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="圖片 URL">
          <ElInput
            v-model="form.extraImagePath"
            placeholder="（選填，貼上 Storage 圖片連結）"
          />
        </ElFormItem>
        <ElFormItem label="排序 order">
          <ElInput
            v-model="form.order"
            placeholder="（選填，數字字串，影響列表排序）"
          />
        </ElFormItem>
        <ElFormItem label="狀態">
          <ElSwitch
            v-model="form.enable"
            active-text="販售中"
            inactive-text="停售"
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
