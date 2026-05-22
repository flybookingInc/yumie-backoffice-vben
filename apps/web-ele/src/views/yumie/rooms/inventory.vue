<script lang="ts" setup>
import type { RoomType } from '#/api/room-types';

import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElDialog,
  ElEmpty,
  ElInputNumber,
  ElMessage,
  ElSpace,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import {
  formatHHmm,
  generateTimeFragments,
  inventoryApi,
} from '#/api/inventory';
import { roomTypesApi } from '#/api/room-types';
import { useHotelStore } from '#/store/hotel';

defineOptions({ name: 'RoomsInventoryPage' });

const hotelStore = useHotelStore();

const bookingInterval = computed(
  () => (hotelStore.currentHotelMeta?.bookingInterval as number) || 30,
);
const timeFragments = computed(() =>
  generateTimeFragments(bookingInterval.value),
);

const roomTypes = ref<RoomType[]>([]);
const selectedDate = ref<Date>(new Date());
const loading = ref(false);
const saving = ref(false);

/** roomTypeId → timeKey(`YYYYMMDDHHmm`) → number. snapshot of server state */
const original = reactive<Record<string, Record<string, number>>>({});
/** roomTypeId → timeKey → number. local edits (mirror original, mutated by table cell edits) */
const drafts = reactive<Record<string, Record<string, number>>>({});

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function buildTimeKey(d: Date, frag: string): string {
  return `${ymd(d)}${frag}`;
}

async function loadRoomTypes(): Promise<void> {
  roomTypes.value = await roomTypesApi.list();
  // 預先建立每個 roomType 的 draft 容器，避免 v-model 綁定到 undefined
  for (const rt of roomTypes.value) {
    if (!original[rt.id]) original[rt.id] = {};
    if (!drafts[rt.id]) drafts[rt.id] = {};
  }
}

async function loadInventory(): Promise<void> {
  if (roomTypes.value.length === 0) return;
  loading.value = true;
  try {
    const startIso = new Date(
      selectedDate.value.getFullYear(),
      selectedDate.value.getMonth(),
      selectedDate.value.getDate(),
    ).toISOString();
    // 一支 GET 取全部 roomType，避免並行 CORS preflight 在 emulator 觸發 EPIPE
    const { byRoomType } = await inventoryApi.listAll({
      bookingInterval: bookingInterval.value,
      dayLength: 1,
      startDate: startIso,
    });
    for (const rt of roomTypes.value) {
      const inv = byRoomType[rt.id] ?? {};
      original[rt.id] = { ...inv };
      drafts[rt.id] = { ...inv };
    }
  } finally {
    loading.value = false;
  }
}

const rows = computed(() =>
  roomTypes.value.map((rt) => ({
    associatePlansId: rt.associatePlansId,
    id: rt.id,
    interval: rt.interval || bookingInterval.value,
    inventorySyncToHotelDocDays: rt.inventorySyncToHotelDocDays,
    roomTypeName: rt.RoomTypeName,
  })),
);

const dirtyCount = computed(() => {
  let n = 0;
  for (const rt of roomTypes.value) {
    const orig = original[rt.id] ?? {};
    const draft = drafts[rt.id] ?? {};
    for (const key of Object.keys(draft)) {
      if ((orig[key] ?? 0) !== (draft[key] ?? 0)) n++;
    }
  }
  return n;
});

function setRowAll(roomTypeId: string, value: number): void {
  const draft = drafts[roomTypeId];
  if (!draft) return;
  for (const frag of timeFragments.value) {
    draft[buildTimeKey(selectedDate.value, frag)] = value;
  }
}

function cellValue(roomTypeId: string, frag: string): number {
  const draft = drafts[roomTypeId];
  if (!draft) return 0;
  return draft[buildTimeKey(selectedDate.value, frag)] ?? 0;
}

function setCellValue(
  roomTypeId: string,
  frag: string,
  v: number | string | undefined,
): void {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return;
  let draft = drafts[roomTypeId];
  if (!draft) {
    drafts[roomTypeId] = {};
    draft = drafts[roomTypeId];
  }
  draft[buildTimeKey(selectedDate.value, frag)] = n;
}

function resetAll(): void {
  for (const rt of roomTypes.value) {
    drafts[rt.id] = { ...original[rt.id] };
  }
}

async function save(): Promise<void> {
  const inventoryData = roomTypes.value
    .map((rt) => {
      const orig = original[rt.id] ?? {};
      const draft = drafts[rt.id] ?? {};
      const changed: Record<string, number> = {};
      for (const [k, v] of Object.entries(draft)) {
        if ((orig[k] ?? 0) !== (v ?? 0)) changed[k] = v;
      }
      return {
        DT_RowId: rt.id,
        associatePlansId: rt.associatePlansId,
        inventory: changed,
        roomTypeName: rt.RoomTypeName,
      };
    })
    .filter((entry) => Object.keys(entry.inventory).length > 0);

  if (inventoryData.length === 0) {
    ElMessage.warning('沒有任何變更');
    return;
  }

  saving.value = true;
  try {
    const startOfDay = new Date(
      selectedDate.value.getFullYear(),
      selectedDate.value.getMonth(),
      selectedDate.value.getDate(),
    );
    await inventoryApi.update({
      endOfDay: startOfDay.toISOString(),
      inventoryData,
      startOfDay: startOfDay.toISOString(),
    });
    ElMessage.success(`已更新 ${dirtyCount.value} 格`);
    await loadInventory();
  } finally {
    saving.value = false;
  }
}

watch(selectedDate, () => {
  loadInventory();
});

watch(
  () => hotelStore.currentHotelId,
  async () => {
    await loadRoomTypes();
    await loadInventory();
  },
);

onMounted(async () => {
  await loadRoomTypes();
  await loadInventory();
});

/* ============================ Shift-Click 範圍選取 + 批次填入 ============================ */
type Anchor = { col: number; rt: string };

const anchor = ref<Anchor | null>(null);
const selectedCells = ref<Set<string>>(new Set());
const rangeFillValue = ref<null | number>(0);

function cellKey(rtId: string, frag: string): string {
  return `${rtId}|${frag}`;
}

function isCellSelected(rtId: string, frag: string): boolean {
  return selectedCells.value.has(cellKey(rtId, frag));
}

function onCellMouseDown(rtId: string, frag: string, e: MouseEvent): void {
  const col = timeFragments.value.indexOf(frag);
  if (col === -1) return;

  if (e.shiftKey && anchor.value) {
    // 阻止 input focus 跳到 shift-click 那一格，保留現有焦點
    e.preventDefault();
    const rtIds = roomTypes.value.map((r) => r.id);
    const rtA = rtIds.indexOf(anchor.value.rt);
    const rtB = rtIds.indexOf(rtId);
    if (rtA === -1 || rtB === -1) return;
    const minRt = Math.min(rtA, rtB);
    const maxRt = Math.max(rtA, rtB);
    const minCol = Math.min(anchor.value.col, col);
    const maxCol = Math.max(anchor.value.col, col);
    const next = new Set<string>();
    for (let r = minRt; r <= maxRt; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        next.add(cellKey(rtIds[r] as string, timeFragments.value[c] as string));
      }
    }
    selectedCells.value = next;
  } else {
    // 一般點擊：設新 anchor + 單格選取（讓 input 正常 focus）
    anchor.value = { col, rt: rtId };
    selectedCells.value = new Set([cellKey(rtId, frag)]);
  }
}

function clearSelection(): void {
  anchor.value = null;
  selectedCells.value = new Set();
}

function applyRangeFill(): void {
  if (selectedCells.value.size < 2) return;
  if (rangeFillValue.value === null || !Number.isFinite(rangeFillValue.value)) {
    ElMessage.warning('請輸入數值');
    return;
  }
  const v = rangeFillValue.value;
  for (const key of selectedCells.value) {
    const [rtId, frag] = key.split('|') as [string, string];
    setCellValue(rtId, frag, v);
  }
  ElMessage.success(`已填入 ${selectedCells.value.size} 格`);
  clearSelection();
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && selectedCells.value.size > 0) {
    clearSelection();
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown);
});
onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown);
});

/* ============================ 同步調整 batch modal ============================ */
const batchOpen = ref(false);
const batchSaving = ref(false);
const batchDateRange = ref<[Date, Date] | null>(null);
const batchRoomTypesId = ref<string[]>([]);
const batchWeekdays = ref<number[]>([0, 1, 2, 3, 4, 5, 6]);
const batchSlotValues = reactive<Record<string, null | number>>({});

const weekdayOptions = [
  { label: '週日', value: 0 },
  { label: '週一', value: 1 },
  { label: '週二', value: 2 },
  { label: '週三', value: 3 },
  { label: '週四', value: 4 },
  { label: '週五', value: 5 },
  { label: '週六', value: 6 },
];

function openBatch(): void {
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const end = new Date(start.getTime() + 6 * 86_400_000);
  batchDateRange.value = [start, end];
  batchRoomTypesId.value = roomTypes.value.map((rt) => rt.id);
  batchWeekdays.value = [0, 1, 2, 3, 4, 5, 6];
  for (const frag of timeFragments.value) batchSlotValues[frag] = null;
  batchOpen.value = true;
}

const batchSlotChangeCount = computed(() => {
  let n = 0;
  for (const frag of timeFragments.value) {
    if (
      batchSlotValues[frag] !== null &&
      batchSlotValues[frag] !== undefined &&
      Number.isFinite(batchSlotValues[frag] as number)
    ) {
      n++;
    }
  }
  return n;
});

function batchSetAll(value: null | number): void {
  for (const frag of timeFragments.value) batchSlotValues[frag] = value;
}

async function applyBatch(): Promise<void> {
  if (!batchDateRange.value) {
    ElMessage.warning('請選擇日期範圍');
    return;
  }
  if (batchRoomTypesId.value.length === 0) {
    ElMessage.warning('請至少選擇一個房型');
    return;
  }
  if (batchWeekdays.value.length === 0) {
    ElMessage.warning('請至少選擇一個星期');
    return;
  }
  const applyTimeAndInventory: Record<string, number> = {};
  for (const frag of timeFragments.value) {
    const v = batchSlotValues[frag];
    if (v !== null && v !== undefined && Number.isFinite(v)) {
      applyTimeAndInventory[frag] = v;
    }
  }
  if (Object.keys(applyTimeAndInventory).length === 0) {
    ElMessage.warning('請至少設定一個時段的房數');
    return;
  }

  batchSaving.value = true;
  try {
    const [start, end] = batchDateRange.value;
    await inventoryApi.batch({
      applyDayofWeek: batchWeekdays.value,
      applyTimeAndInventory,
      bookingInterval: bookingInterval.value,
      endDate: end.toISOString(),
      roomTypesId: batchRoomTypesId.value,
      startDate: start.toISOString(),
    });

    // sync-to-hotel-doc：若批次範圍含 today + (inventorySyncToHotelDocDays - 1) 之前的日子，
    // 對應 roomType 需要把 inventory 寫回 hotel doc plans.{planId}.inventory
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const reSync: string[] = [];
    for (const rtId of batchRoomTypesId.value) {
      const rt = roomTypes.value.find((r) => r.id === rtId);
      if (!rt) continue;
      const days = rt.inventorySyncToHotelDocDays ?? 0;
      const cutoff = new Date(todayStart.getTime() + (days - 1) * 86_400_000);
      if (cutoff.getTime() - start.getTime() > 0) reSync.push(rtId);
    }
    if (reSync.length > 0) {
      await inventoryApi.syncToHotelDoc({ sourceRoomTypes: reSync });
    }

    ElMessage.success('同步調整完成');
    batchOpen.value = false;
    await loadInventory();
  } finally {
    batchSaving.value = false;
  }
}
</script>

<template>
  <div class="p-4">
    <ElCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span>
            房量管理 —
            {{
              hotelStore.currentHotelMeta?.hotelName ??
              hotelStore.currentHotelId
            }}
            <ElTag size="small" type="info" style="margin-left: 8px">
              {{ bookingInterval }} 分鐘間隔 / {{ timeFragments.length }} 時段
            </ElTag>
          </span>
          <ElSpace>
            <ElDatePicker
              v-model="selectedDate"
              type="date"
              placeholder="選擇日期"
              :clearable="false"
              format="YYYY-MM-DD"
              style="width: 200px"
            />
            <ElButton @click="openBatch">同步調整</ElButton>
            <ElButton :disabled="dirtyCount === 0" @click="resetAll">
              還原 {{ dirtyCount > 0 ? `(${dirtyCount})` : '' }}
            </ElButton>
            <ElButton
              type="primary"
              :loading="saving"
              :disabled="dirtyCount === 0"
              @click="save"
            >
              儲存 {{ dirtyCount > 0 ? `(${dirtyCount})` : '' }}
            </ElButton>
          </ElSpace>
        </div>
      </template>

      <ElEmpty v-if="rows.length === 0" description="尚未建立任何房型" />

      <template v-else>
        <ElTable
          v-loading="loading"
          :data="rows"
          border
          size="small"
          scrollbar-always-on
          style="width: 100%"
        >
          <ElTableColumn
            fixed="left"
            label="房型"
            prop="roomTypeName"
            width="180"
          >
            <template #default="{ row }">
              <div>
                <div style="font-weight: 600">{{ row.roomTypeName }}</div>
                <div style="font-size: 11px; color: #909399">
                  {{ row.associatePlansId.length }} 個關聯方案
                </div>
                <div style="margin-top: 4px">
                  <ElButton size="small" link @click="setRowAll(row.id, 0)">
                    整列歸 0
                  </ElButton>
                </div>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn
            v-for="frag in timeFragments"
            :key="frag"
            :label="formatHHmm(frag)"
            :prop="frag"
            width="78"
            align="center"
          >
            <template #default="{ row }">
              <div
                class="inv-cell"
                :class="{ 'inv-cell--selected': isCellSelected(row.id, frag) }"
                @mousedown.capture="onCellMouseDown(row.id, frag, $event)"
              >
                <ElInputNumber
                  :model-value="cellValue(row.id, frag)"
                  :min="0"
                  :max="999"
                  :controls="false"
                  size="small"
                  style="width: 64px"
                  @update:model-value="(v) => setCellValue(row.id, frag, v)"
                />
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <div class="inv-tip">
          💡 批次填入：點一格設為起點 →
          <kbd>Shift</kbd> + 點另一格選取矩形範圍 → 底部工具列輸入數值套用。
          <kbd>Esc</kbd> 取消選取。
        </div>
      </template>
    </ElCard>

    <!-- 範圍填入浮動工具列：選 2 格以上才出現 -->
    <Teleport to="body">
      <div v-if="selectedCells.size > 1" class="inv-range-bar">
        <span class="inv-range-bar__count">
          已選 <strong>{{ selectedCells.size }}</strong> 格
        </span>
        <span class="inv-range-bar__label">數值</span>
        <ElInputNumber
          v-model="rangeFillValue"
          :min="0"
          :max="999"
          :controls="false"
          size="small"
          style="width: 90px"
          @keyup.enter="applyRangeFill"
        />
        <ElButton type="primary" size="small" @click="applyRangeFill">
          填入
        </ElButton>
        <ElButton size="small" @click="clearSelection">清除</ElButton>
        <span class="inv-range-bar__hint">Esc 取消</span>
      </div>
    </Teleport>

    <ElDialog
      v-model="batchOpen"
      title="同步調整房量"
      width="860"
      :close-on-click-modal="false"
    >
      <div class="grid gap-4">
        <div>
          <div class="batch-section-title">更新日期區間</div>
          <ElDatePicker
            v-model="batchDateRange"
            type="daterange"
            range-separator="～"
            start-placeholder="起始日"
            end-placeholder="結束日"
            format="YYYY-MM-DD"
            :clearable="false"
            style="width: 360px"
          />
        </div>

        <div>
          <div class="batch-section-title">
            房型
            <span class="batch-hint">※ 僅勾選的房型會被更新</span>
          </div>
          <ElCheckboxGroup v-model="batchRoomTypesId">
            <ElCheckbox
              v-for="rt in roomTypes"
              :key="rt.id"
              :value="rt.id"
              :label="rt.RoomTypeName"
              border
              size="small"
              style="margin: 4px 6px 4px 0"
            />
          </ElCheckboxGroup>
        </div>

        <div>
          <div class="batch-section-title">星期</div>
          <ElCheckboxGroup v-model="batchWeekdays">
            <ElCheckbox
              v-for="w in weekdayOptions"
              :key="w.value"
              :value="w.value"
              :label="w.label"
              border
              size="small"
              style="margin: 4px 6px 4px 0"
            />
          </ElCheckboxGroup>
        </div>

        <div>
          <div class="batch-section-title">
            時段房數
            <span class="batch-hint">
              ※ 空白代表「不更新」；已設定 {{ batchSlotChangeCount }} /
              {{ timeFragments.length }} 時段
            </span>
          </div>
          <ElSpace wrap style="margin-bottom: 8px">
            <ElButton size="small" @click="batchSetAll(0)">全部歸 0</ElButton>
            <ElButton size="small" @click="batchSetAll(null)">
              全部清空（不更新）
            </ElButton>
          </ElSpace>
          <div class="batch-slot-grid">
            <div
              v-for="frag in timeFragments"
              :key="frag"
              class="batch-slot-row"
            >
              <div class="batch-slot-label">{{ formatHHmm(frag) }}</div>
              <ElInputNumber
                v-model="batchSlotValues[frag]"
                :min="0"
                :max="999"
                :controls="false"
                size="small"
                placeholder="不更新"
                style="width: 90px"
              />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <ElButton @click="batchOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="batchSaving" @click="applyBatch">
          套用
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.batch-section-title {
  margin-bottom: 6px;
  font-weight: 600;
}

.batch-hint {
  margin-left: 8px;
  font-size: 12px;
  font-weight: normal;
  color: #909399;
}

.batch-slot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px 16px;
  max-height: 420px;
  padding: 6px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.batch-slot-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.batch-slot-label {
  width: 48px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #606266;
}

.inv-tip {
  padding: 6px 10px;
  margin-top: 20px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-light);
  border-left: 3px solid var(--el-color-primary);
  border-radius: 4px;
}

.inv-tip :deep(kbd),
.inv-tip kbd {
  display: inline-block;
  padding: 1px 6px;
  margin: 0 2px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  color: var(--el-text-color-primary);
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-bottom-width: 2px;
  border-radius: 3px;
}

.inv-cell {
  display: flex;
  justify-content: center;
  padding: 1px;
  user-select: none;
  border-radius: 4px;
  transition: box-shadow 0.12s ease;
}

.inv-cell--selected {
  background-color: var(--el-color-primary-light-9);
  box-shadow: inset 0 0 0 2px var(--el-color-primary);
}
</style>

<style>
.inv-range-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  z-index: 2000;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 16px;
  font-size: 13px;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgb(0 0 0 / 15%);
  transform: translateX(-50%);
}

.inv-range-bar__count {
  color: var(--el-text-color-primary);
}

.inv-range-bar__label {
  margin-left: 8px;
  color: var(--el-text-color-regular);
}

.inv-range-bar__hint {
  margin-left: 4px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
