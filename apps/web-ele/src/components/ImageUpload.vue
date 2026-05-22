<script lang="ts" setup>
/**
 * 共用單圖上傳元件，給 plans / extras / hotel 三頁的 single-image 欄位使用。
 *
 * - v-model = 圖片 URL string（空字串代表「無圖」）
 * - 由呼叫端透過 `upload` prop 提供實際上傳函式（return Promise<string url>），
 *   元件本身與 v2 endpoint 解耦
 * - UI：無圖時顯示拖曳上傳框；有圖時顯示縮圖 + 「更換 / 移除」按鈕
 * - 客戶端限制：accept jpg/png、預設 1 MB（與後端 filesUpload busboy 一致）
 */
import { computed, ref } from 'vue';

import { ElButton, ElIcon, ElImage, ElMessage, ElUpload } from 'element-plus';

defineOptions({ name: 'ImageUpload' });

const props = withDefaults(
  defineProps<{
    /** Accept MIME types（逗號分隔），預設 jpg + png */
    accept?: string;
    /** 預覽尺寸 px，方／寬高比由 cover 處理 */
    height?: number;
    /** 最大檔案大小（MB） */
    maxSizeMB?: number;
    /** 目前 URL（v-model） */
    modelValue?: string;
    /** 上傳函式，回傳新 URL */
    upload: (file: File) => Promise<string>;
    width?: number;
  }>(),
  {
    accept: 'image/jpeg,image/png',
    height: 175,
    maxSizeMB: 1,
    modelValue: '',
    width: 305,
  },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const uploading = ref(false);

const hasImage = computed(() => Boolean(props.modelValue));

async function doUpload(file: File): Promise<void> {
  if (!props.accept.split(',').includes(file.type)) {
    ElMessage.warning('僅支援 jpg / png');
    return;
  }
  if (file.size > props.maxSizeMB * 1024 * 1024) {
    ElMessage.warning(`檔案大小不能超過 ${props.maxSizeMB} MB`);
    return;
  }
  uploading.value = true;
  try {
    const url = await props.upload(file);
    emit('update:modelValue', url);
    ElMessage.success('上傳成功');
  } catch (error) {
    const msg = error instanceof Error ? error.message : '上傳失敗';
    ElMessage.error(msg);
  } finally {
    uploading.value = false;
  }
}

/** ElUpload `http-request` 攔截：自己處理 upload，不讓內建 XHR 走（需回 Promise） */
function onHttpRequest(opts: { file: File }): Promise<void> {
  return doUpload(opts.file);
}

function onPickReplacement(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) doUpload(file);
  input.value = ''; // 重置才能連續選同一檔
}

function remove(): void {
  emit('update:modelValue', '');
}

const replaceInputRef = ref<HTMLInputElement | null>(null);
function triggerReplace(): void {
  replaceInputRef.value?.click();
}
</script>

<template>
  <div class="image-upload" :style="{ width: `${width}px` }">
    <!-- 無圖：拖曳上傳區 -->
    <ElUpload
      v-if="!hasImage"
      drag
      :accept="accept"
      :show-file-list="false"
      :http-request="onHttpRequest"
      :disabled="uploading"
      class="image-upload__drop"
      :style="{ height: `${height}px` }"
    >
      <div class="image-upload__drop-inner">
        <ElIcon :size="32" color="var(--el-text-color-secondary)">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
        </ElIcon>
        <div class="image-upload__hint">
          {{ uploading ? '上傳中…' : '點擊或拖曳檔案至此' }}
        </div>
        <div class="image-upload__hint-sub">
          jpg / png，最大 {{ maxSizeMB }} MB
        </div>
      </div>
    </ElUpload>

    <!-- 有圖：預覽 + 動作 -->
    <div v-else class="image-upload__preview">
      <ElImage
        :src="modelValue"
        :style="{ width: `${width}px`, height: `${height}px` }"
        fit="cover"
        class="image-upload__img"
      />
      <div class="image-upload__actions">
        <ElButton size="small" :loading="uploading" @click="triggerReplace">
          更換
        </ElButton>
        <ElButton size="small" type="danger" plain @click="remove">
          移除
        </ElButton>
      </div>
      <input
        ref="replaceInputRef"
        type="file"
        :accept="accept"
        style="display: none"
        @change="onPickReplacement"
      />
    </div>
  </div>
</template>

<style scoped>
.image-upload {
  display: inline-block;
}

.image-upload__drop {
  display: block;
}

.image-upload__drop :deep(.el-upload-dragger) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0;
}

.image-upload__drop-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.image-upload__hint {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.image-upload__hint-sub {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.image-upload__preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-upload__img {
  background-color: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.image-upload__actions {
  display: flex;
  gap: 8px;
}
</style>
