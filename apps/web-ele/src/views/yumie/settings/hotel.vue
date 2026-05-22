<script lang="ts" setup>
import type { HotelDoc } from '#/api/hotels';

import { computed, reactive, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
  ElCol,
  ElForm,
  ElFormItem,
  ElImage,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElRow,
  ElSwitch,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

import { hotelsApi } from '#/api/hotels';
import ImageUpload from '#/components/ImageUpload.vue';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'SettingsHotelPage' });

const hotelStore = useHotelStore();
const userStore = useUserStore();

const loading = ref(false);
const saving = ref(false);
const activeTab = ref('basic');

const currentHotelId = computed(() => hotelStore.currentHotelId);
const isSuperAdmin = computed(
  () => userStore.userInfo?.roles?.includes('superAdmin') === true,
);

const WEEKDAYS = [
  { label: '日', value: 0 },
  { label: '一', value: 1 },
  { label: '二', value: 2 },
  { label: '三', value: 3 },
  { label: '四', value: 4 },
  { label: '五', value: 5 },
  { label: '六', value: 6 },
];

/** 平坦化 form — save 時再 serialize 回 Firestore nested shape */
function blankForm() {
  return {
    bookingInterval: 30,
    confirmScreenFooterMessage: '',
    coverPhoto: [] as Array<{
      sequence: number;
      subtitle?: string;
      title?: string;
      url: string;
    }>,
    disabled: false,
    flyKioskApiEnabled: false,
    flyKioskFailAlertEmail: '',
    flyKioskHotelCode: '',
    footerMessage: '',
    googleTagManagerEnable: false,
    googleTagManagerId: '',
    headerMessage: '',
    hotelAddress: '',
    hotelDescription: '',
    hotelDirection: '',
    hotelFaviconUrl: '',
    hotelLogoUrl: '',
    hotelMobileLogoUrl: '',
    hotelName: '',
    hotelPhone: '',
    hotelShortDescription: '',
    hotelWebsiteUrl: '',
    message: '',
    fullyBookShowingMessage: '',
    notifyEmail: '',
    parkingEmptyMessage: '',
    parkingEnable: false,
    parkingFullMessage: '',
    parkingHasEmpty: false,
    addressCountryCode: 'TW',
    addressLocality: '',
    addressRegion: '',
    streetAddress: '',
    postalCode: '',
    weekend: [0, 6] as number[],
    wisePmsEnable: false,
    wisePmsFailAlertEmail: '',
    wisePmsHotelCode: '',
  };
}

const form = reactive<ReturnType<typeof blankForm>>(blankForm());

function hydrate(doc: HotelDoc): void {
  const zhTwAddress = ((doc.address as Record<string, any>)?.['zh-TW'] ??
    {}) as {
    addressCountryCode?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    streetAddress?: string;
  };
  const parking = (doc.parking ?? {}) as {
    emptyMessage?: string;
    enable?: boolean;
    fullMessage?: string;
    hasEmptyParkingLot?: boolean;
  };
  const gtm = (doc.googleTagManager ?? {}) as {
    enable?: boolean;
    id?: string;
  };
  const wise = (doc.wisePmsApi ?? {}) as {
    enable?: boolean;
    failAlertEmail?: string;
    HotelCode?: string;
  };
  const fly = (doc.flyKioskApi ?? {}) as {
    enabled?: boolean;
    failAlertEmail?: string;
    hotelCode?: string;
  };
  Object.assign(form, {
    bookingInterval: (doc.bookingInterval as number) ?? 30,
    confirmScreenFooterMessage:
      (doc.confirmScreenFooterMessage as string) ?? '',
    coverPhoto: Array.isArray(doc.coverPhoto)
      ? (doc.coverPhoto as typeof form.coverPhoto)
      : [],
    disabled: doc.disabled === true,
    flyKioskApiEnabled: fly.enabled === true,
    flyKioskFailAlertEmail: fly.failAlertEmail ?? '',
    flyKioskHotelCode: fly.hotelCode ?? '',
    footerMessage: (doc.footerMessage as string) ?? '',
    fullyBookShowingMessage: (doc.fullyBookShowingMessage as string) ?? '',
    googleTagManagerEnable: gtm.enable === true,
    googleTagManagerId: gtm.id ?? '',
    headerMessage: (doc.headerMessage as string) ?? '',
    hotelAddress: (doc.hotelAddress as string) ?? '',
    hotelDescription: (doc.hotelDescription as string) ?? '',
    hotelDirection: (doc.hotelDirection as string) ?? '',
    hotelFaviconUrl: (doc.hotelFaviconUrl as string) ?? '',
    hotelLogoUrl: (doc.hotelLogoUrl as string) ?? '',
    hotelMobileLogoUrl: (doc.hotelMobileLogoUrl as string) ?? '',
    hotelName: doc.hotelName ?? '',
    hotelPhone: doc.hotelPhone ?? '',
    hotelShortDescription: (doc.hotelShortDescription as string) ?? '',
    hotelWebsiteUrl: (doc.hotelWebsiteUrl as string) ?? '',
    message: (doc.message as string) ?? '',
    notifyEmail: doc.notifyEmail ?? '',
    parkingEmptyMessage: parking.emptyMessage ?? '',
    parkingEnable: parking.enable === true,
    parkingFullMessage: parking.fullMessage ?? '',
    parkingHasEmpty: parking.hasEmptyParkingLot === true,
    addressCountryCode: zhTwAddress.addressCountryCode ?? 'TW',
    addressLocality: zhTwAddress.addressLocality ?? '',
    addressRegion: zhTwAddress.addressRegion ?? '',
    streetAddress: zhTwAddress.streetAddress ?? '',
    postalCode: zhTwAddress.postalCode ?? '',
    weekend: Array.isArray(doc.weekend) ? (doc.weekend as number[]) : [0, 6],
    wisePmsEnable: wise.enable === true,
    wisePmsFailAlertEmail: wise.failAlertEmail ?? '',
    wisePmsHotelCode: wise.HotelCode ?? '',
  });
}

function serialize(): Record<string, unknown> {
  return {
    address: {
      'zh-TW': {
        addressCountryCode: form.addressCountryCode,
        addressLocality: form.addressLocality,
        addressRegion: form.addressRegion,
        postalCode: form.postalCode,
        streetAddress: form.streetAddress,
      },
    },
    bookingInterval: form.bookingInterval,
    confirmScreenFooterMessage: form.confirmScreenFooterMessage,
    coverPhoto: form.coverPhoto,
    disabled: form.disabled,
    flyKioskApi: {
      enabled: form.flyKioskApiEnabled,
      failAlertEmail: form.flyKioskFailAlertEmail,
      hotelCode: form.flyKioskHotelCode,
    },
    footerMessage: form.footerMessage,
    fullyBookShowingMessage: form.fullyBookShowingMessage,
    googleTagManager: {
      enable: form.googleTagManagerEnable,
      id: form.googleTagManagerId,
    },
    headerMessage: form.headerMessage,
    hotelAddress: form.hotelAddress,
    hotelDescription: form.hotelDescription,
    hotelDirection: form.hotelDirection,
    hotelFaviconUrl: form.hotelFaviconUrl,
    hotelLogoUrl: form.hotelLogoUrl,
    hotelMobileLogoUrl: form.hotelMobileLogoUrl,
    hotelName: form.hotelName,
    hotelPhone: form.hotelPhone,
    hotelShortDescription: form.hotelShortDescription,
    hotelWebsiteUrl: form.hotelWebsiteUrl,
    message: form.message,
    notifyEmail: form.notifyEmail,
    parking: {
      emptyMessage: form.parkingEmptyMessage,
      enable: form.parkingEnable,
      fullMessage: form.parkingFullMessage,
      hasEmptyParkingLot: form.parkingHasEmpty,
    },
    weekend: form.weekend,
    wisePmsApi: {
      enable: form.wisePmsEnable,
      failAlertEmail: form.wisePmsFailAlertEmail,
      HotelCode: form.wisePmsHotelCode,
    },
  };
}

async function load(): Promise<void> {
  const hotelId = currentHotelId.value;
  if (!hotelId) return;
  loading.value = true;
  try {
    const doc = await hotelsApi.get(hotelId);
    if (currentHotelId.value !== hotelId) return;
    hydrate(doc);
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  const hotelId = currentHotelId.value;
  if (!hotelId) return;
  saving.value = true;
  try {
    await hotelsApi.update(hotelId, serialize());
    ElMessage.success('飯店設定已儲存');
    // 重新載入確保 UI 與 Firestore 一致
    await load();
  } finally {
    saving.value = false;
  }
}

watch(currentHotelId, () => void load(), { immediate: true });

/* ===== Cover photo helpers — 新增 / 刪除 / 上傳 ===== */
async function addCoverPhotoFromUpload(file: File): Promise<string> {
  const hotelId = currentHotelId.value;
  if (!hotelId) throw new Error('未選擇飯店');
  const { url } = await hotelsApi.uploadPhoto(hotelId, file);
  // sequence 取目前 max + 1，避免重覆
  let maxSeq = 0;
  for (const p of form.coverPhoto) {
    if ((p.sequence ?? 0) > maxSeq) maxSeq = p.sequence ?? 0;
  }
  form.coverPhoto.push({
    sequence: maxSeq + 1,
    subtitle: '',
    title: '',
    url,
  });
  return url;
}

function removeCoverPhoto(idx: number): void {
  form.coverPhoto.splice(idx, 1);
  resequenceCoverPhotos();
}

/** 拖完依視覺順序重編 sequence (1..N)，前端送 save 時順序與顯示一致 */
function resequenceCoverPhotos(): void {
  form.coverPhoto.forEach((p, i) => {
    p.sequence = i + 1;
  });
}

/* ===== HTML5 drag-and-drop reorder for coverPhoto cards ===== */
const dragFromIdx = ref<null | number>(null);
const dragOverIdx = ref<null | number>(null);

function onCoverDragStart(idx: number, e: DragEvent): void {
  dragFromIdx.value = idx;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    // Firefox 需要 setData 才會觸發 drag 事件
    e.dataTransfer.setData('text/plain', String(idx));
  }
}

function onCoverDragOver(idx: number, e: DragEvent): void {
  e.preventDefault(); // 必須 preventDefault 才能 drop
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  if (dragFromIdx.value !== null && dragFromIdx.value !== idx) {
    dragOverIdx.value = idx;
  }
}

function onCoverDragLeave(idx: number): void {
  if (dragOverIdx.value === idx) dragOverIdx.value = null;
}

function onCoverDrop(targetIdx: number, e: DragEvent): void {
  e.preventDefault();
  const from = dragFromIdx.value;
  dragFromIdx.value = null;
  dragOverIdx.value = null;
  if (from === null || from === targetIdx) return;
  const arr = form.coverPhoto;
  const [moved] = arr.splice(from, 1);
  if (!moved) return;
  arr.splice(targetIdx, 0, moved);
  resequenceCoverPhotos();
}

function onCoverDragEnd(): void {
  dragFromIdx.value = null;
  dragOverIdx.value = null;
}
</script>

<template>
  <div class="p-4">
    <ElCard v-loading="loading">
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            飯店設定 —
            {{ hotelStore.currentHotelMeta?.hotelName ?? currentHotelId }}
            <ElTag
              size="small"
              :type="form.disabled ? 'danger' : 'success'"
              style="margin-left: 8px"
            >
              {{ form.disabled ? '已停用' : '營運中' }}
            </ElTag>
          </span>
          <ElButton type="primary" :loading="saving" @click="save">
            儲存
          </ElButton>
        </div>
      </template>

      <ElTabs v-model="activeTab" tab-position="left" style="min-height: 480px">
        <ElTabPane label="基本資料" name="basic">
          <ElForm label-width="160" @submit.prevent>
            <ElFormItem label="旅館名稱">
              <ElInput v-model="form.hotelName" />
            </ElFormItem>
            <ElFormItem label="聯絡電話">
              <ElInput v-model="form.hotelPhone" />
            </ElFormItem>
            <ElFormItem label="訂單通知 Email">
              <ElInput v-model="form.notifyEmail" />
            </ElFormItem>
            <ElFormItem label="地址（純字串）">
              <ElInput v-model="form.hotelAddress" />
            </ElFormItem>
            <ElFormItem label="Google Map 連結">
              <ElInput
                v-model="form.hotelDirection"
                placeholder="https://maps.google.com/..."
              />
            </ElFormItem>
            <ElFormItem label="預訂時段間隔 (分鐘)">
              <ElInputNumber
                v-model="form.bookingInterval"
                :min="5"
                :max="120"
                :step="5"
              />
            </ElFormItem>
          </ElForm>
        </ElTabPane>

        <ElTabPane label="頁面訊息" name="messages">
          <ElForm label-width="160" @submit.prevent>
            <ElFormItem label="凸顯訊息 message">
              <ElInput
                v-model="form.message"
                type="textarea"
                :rows="2"
                placeholder="預訂頁顯眼提示"
              />
            </ElFormItem>
            <ElFormItem label="頁首訊息">
              <ElInput v-model="form.headerMessage" type="textarea" :rows="2" />
            </ElFormItem>
            <ElFormItem label="頁尾訊息">
              <ElInput v-model="form.footerMessage" type="textarea" :rows="2" />
            </ElFormItem>
            <ElFormItem label="全部關房訊息">
              <ElInput
                v-model="form.fullyBookShowingMessage"
                type="textarea"
                :rows="2"
              />
            </ElFormItem>
            <ElFormItem label="預訂完成頁尾">
              <ElInput
                v-model="form.confirmScreenFooterMessage"
                type="textarea"
                :rows="2"
              />
            </ElFormItem>
          </ElForm>
        </ElTabPane>

        <ElTabPane label="SEO" name="seo">
          <ElForm label-width="160" @submit.prevent>
            <ElFormItem label="Google 搜尋標題">
              <ElInput
                v-model="form.hotelShortDescription"
                placeholder="短描述 (meta title)"
              />
            </ElFormItem>
            <ElFormItem label="Google 搜尋內文">
              <ElInput
                v-model="form.hotelDescription"
                type="textarea"
                :rows="3"
                placeholder="完整說明 (meta description)"
              />
            </ElFormItem>
            <ElFormItem label="旅館官網網址">
              <ElInput v-model="form.hotelWebsiteUrl" placeholder="https://" />
            </ElFormItem>
          </ElForm>
        </ElTabPane>

        <ElTabPane label="結構化地址" name="address">
          <ElForm label-width="160" @submit.prevent>
            <ElFormItem label="國家代碼">
              <ElInput v-model="form.addressCountryCode" disabled />
            </ElFormItem>
            <ElRow :gutter="16">
              <ElCol :span="12">
                <ElFormItem label="郵遞區號">
                  <ElInput v-model="form.postalCode" />
                </ElFormItem>
              </ElCol>
              <ElCol :span="12">
                <ElFormItem label="縣 / 市">
                  <ElInput v-model="form.addressRegion" />
                </ElFormItem>
              </ElCol>
            </ElRow>
            <ElFormItem label="區 / 鄉 / 鎮">
              <ElInput v-model="form.addressLocality" />
            </ElFormItem>
            <ElFormItem label="街道 / 路 / 號">
              <ElInput v-model="form.streetAddress" />
            </ElFormItem>
          </ElForm>
        </ElTabPane>

        <ElTabPane label="營業日" name="weekend">
          <ElForm label-width="160" @submit.prevent>
            <ElFormItem label="設為週末日">
              <ElCheckboxGroup v-model="form.weekend">
                <ElCheckbox
                  v-for="d in WEEKDAYS"
                  :key="d.value"
                  :label="d.label"
                  :value="d.value"
                />
              </ElCheckboxGroup>
              <span style="margin-left: 12px; font-size: 13px; color: #888">
                週末日採用 plan.weekendPrice / weekendQkDuration
              </span>
            </ElFormItem>
          </ElForm>
        </ElTabPane>

        <ElTabPane label="停車位" name="parking">
          <ElForm label-width="160" @submit.prevent>
            <ElFormItem label="啟用停車位顯示">
              <ElSwitch v-model="form.parkingEnable" />
            </ElFormItem>
            <template v-if="form.parkingEnable">
              <ElFormItem label="目前有停車位">
                <ElSwitch v-model="form.parkingHasEmpty" />
              </ElFormItem>
              <ElFormItem label="有空位訊息">
                <ElInput
                  v-model="form.parkingEmptyMessage"
                  placeholder="例如：尚有空位可使用"
                />
              </ElFormItem>
              <ElFormItem label="客滿訊息">
                <ElInput
                  v-model="form.parkingFullMessage"
                  placeholder="例如：停車位已滿"
                />
              </ElFormItem>
            </template>
          </ElForm>
        </ElTabPane>

        <ElTabPane label="GTM" name="gtm">
          <ElForm label-width="160" @submit.prevent>
            <ElFormItem label="啟用 GTM">
              <ElSwitch v-model="form.googleTagManagerEnable" />
            </ElFormItem>
            <ElFormItem v-if="form.googleTagManagerEnable" label="GTM ID">
              <ElInput
                v-model="form.googleTagManagerId"
                placeholder="GTM-XXXXXXX"
              />
            </ElFormItem>
          </ElForm>
        </ElTabPane>

        <ElTabPane v-if="isSuperAdmin" label="第三方 PMS" name="pms">
          <ElTag size="small" type="info" style="margin-bottom: 16px">
            superAdmin only
          </ElTag>
          <ElCard shadow="never" style="margin-bottom: 16px">
            <template #header>靈知 PMS (Wise)</template>
            <ElForm label-width="160" @submit.prevent>
              <ElFormItem label="啟用">
                <ElSwitch v-model="form.wisePmsEnable" />
              </ElFormItem>
              <template v-if="form.wisePmsEnable">
                <ElFormItem label="Wise HotelCode">
                  <ElInput v-model="form.wisePmsHotelCode" />
                </ElFormItem>
                <ElFormItem label="失敗通知 Email">
                  <ElInput v-model="form.wisePmsFailAlertEmail" />
                </ElFormItem>
              </template>
            </ElForm>
          </ElCard>

          <ElCard shadow="never">
            <template #header>Fly Kiosk PMS</template>
            <ElForm label-width="160" @submit.prevent>
              <ElFormItem label="啟用">
                <ElSwitch v-model="form.flyKioskApiEnabled" />
              </ElFormItem>
              <template v-if="form.flyKioskApiEnabled">
                <ElFormItem label="HotelCode">
                  <ElInput v-model="form.flyKioskHotelCode" />
                </ElFormItem>
                <ElFormItem label="失敗通知 Email">
                  <ElInput v-model="form.flyKioskFailAlertEmail" />
                </ElFormItem>
              </template>
            </ElForm>
          </ElCard>
        </ElTabPane>

        <ElTabPane label="Logo / Favicon" name="logo">
          <ElCard shadow="never">
            <div class="logo-grid">
              <div class="logo-field">
                <div class="logo-field__label">桌面 Logo (hotelLogoUrl)</div>
                <ImageUpload
                  v-if="currentHotelId"
                  v-model="form.hotelLogoUrl"
                  :upload="
                    (file) =>
                      hotelsApi
                        .uploadPhoto(currentHotelId, file)
                        .then((r) => r.url)
                  "
                  :width="240"
                  :height="120"
                />
                <div class="form-hint">頁首顯示用。建議透明背景 PNG。</div>
              </div>

              <div class="logo-field">
                <div class="logo-field__label">
                  行動版 Logo (hotelMobileLogoUrl)
                </div>
                <ImageUpload
                  v-if="currentHotelId"
                  v-model="form.hotelMobileLogoUrl"
                  :upload="
                    (file) =>
                      hotelsApi
                        .uploadPhoto(currentHotelId, file)
                        .then((r) => r.url)
                  "
                  :width="180"
                  :height="120"
                />
                <div class="form-hint">手機 / 窄螢幕用。</div>
              </div>

              <div class="logo-field">
                <div class="logo-field__label">Favicon (hotelFaviconUrl)</div>
                <ImageUpload
                  v-if="currentHotelId"
                  v-model="form.hotelFaviconUrl"
                  :upload="
                    (file) =>
                      hotelsApi
                        .uploadPhoto(currentHotelId, file)
                        .then((r) => r.url)
                  "
                  :width="120"
                  :height="120"
                />
                <div class="form-hint">瀏覽器分頁圖示。建議方形 512×512。</div>
              </div>
            </div>
          </ElCard>
        </ElTabPane>

        <ElTabPane label="封面圖" name="cover">
          <div class="cover-add">
            <ImageUpload
              model-value=""
              :upload="addCoverPhotoFromUpload"
              :width="305"
              :height="175"
            />
            <span class="form-hint" style="margin-left: 12px">
              上傳後新增到下方列表，記得按右上「儲存」才會寫回飯店設定
            </span>
          </div>

          <div
            v-if="form.coverPhoto.length === 0"
            style="margin-top: 16px; color: #888"
          >
            尚無封面圖
          </div>

          <div v-else class="form-hint" style="margin-top: 16px">
            💡 拖曳卡片重新排序，sequence 會自動依視覺順序重編。
          </div>

          <ElRow
            v-if="form.coverPhoto.length > 0"
            :gutter="16"
            style="margin-top: 8px"
          >
            <ElCol
              v-for="(photo, idx) in form.coverPhoto"
              :key="`${photo.url}-${idx}`"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
            >
              <ElCard
                shadow="never"
                class="cover-card"
                :class="{
                  'cover-card--dragging': dragFromIdx === idx,
                  'cover-card--drop-target': dragOverIdx === idx,
                }"
                draggable="true"
                @dragstart="onCoverDragStart(idx, $event)"
                @dragover="onCoverDragOver(idx, $event)"
                @dragleave="onCoverDragLeave(idx)"
                @drop="onCoverDrop(idx, $event)"
                @dragend="onCoverDragEnd"
              >
                <div class="cover-card__handle">⋮⋮</div>
                <ElImage
                  :src="photo.url"
                  :preview-src-list="[photo.url]"
                  fit="cover"
                  style="width: 100%; height: 140px"
                />
                <div style="display: grid; gap: 6px; margin-top: 8px">
                  <div style="display: flex; gap: 6px; align-items: center">
                    <span style="width: 60px; font-size: 12px; color: #909399">
                      順序
                    </span>
                    <ElInputNumber
                      v-model="photo.sequence"
                      :min="1"
                      :controls="false"
                      size="small"
                      style="width: 90px"
                    />
                  </div>
                  <div style="display: flex; gap: 6px; align-items: center">
                    <span style="width: 60px; font-size: 12px; color: #909399">
                      標題
                    </span>
                    <ElInput v-model="photo.title" size="small" />
                  </div>
                  <div style="display: flex; gap: 6px; align-items: center">
                    <span style="width: 60px; font-size: 12px; color: #909399">
                      副標
                    </span>
                    <ElInput v-model="photo.subtitle" size="small" />
                  </div>
                  <ElButton
                    size="small"
                    type="danger"
                    plain
                    style="margin-top: 4px"
                    @click="removeCoverPhoto(idx)"
                  >
                    移除
                  </ElButton>
                </div>
              </ElCard>
            </ElCol>
          </ElRow>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<style scoped>
.cover-add {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.logo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
}

.logo-field {
  min-width: 200px;
}

.logo-field__label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.cover-card {
  position: relative;
  margin-bottom: 16px;
  cursor: grab;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.cover-card:active {
  cursor: grabbing;
}

.cover-card--dragging {
  opacity: 0.4;
}

.cover-card--drop-target {
  box-shadow:
    inset 0 0 0 2px var(--el-color-primary),
    0 4px 16px rgb(0 0 0 / 12%);
  transform: scale(1.02);
}

.cover-card__handle {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -1px;
  pointer-events: none;
  background-color: rgb(0 0 0 / 55%);
  border-radius: 4px;
}
</style>
