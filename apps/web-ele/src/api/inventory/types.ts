/**
 * Inventory v2 API shapes（對應 `/v2/inventory/*` 與舊 qk-inventory.html 使用的 payload）。
 *
 * Firestore raw：
 *   qk-list/{hotelId}/roomType/{roomTypeId}/inventory/{YYYYMMDD}.availability = {
 *     'YYYYMMDDHHmm': number   // 剩餘房數
 *   }
 *
 * 對齊舊 backoffice：
 * - cell key = `YYYYMMDDHHmm`（例：`202605220030`）
 * - 房型欄位以 `DT_RowId`（roomTypeId）+ `roomTypeName` + `associatePlansId` 表達
 */

/** GET /v2/inventory query params */
export interface InventoryListParams {
  bookingInterval: number;
  /** 連續多少天 */
  dayLength: number;
  /** ISO 8601 — 當日 00:00 起算 */
  startDate: string;
  roomTypeId: string;
}

export interface InventoryListResponse {
  /** key = `YYYYMMDDHHmm`，value = 剩餘房數 */
  inventory: Record<string, number>;
}

/** GET /v2/inventory/all query params（不需要 roomTypeId） */
export interface InventoryListAllParams {
  bookingInterval: number;
  dayLength: number;
  startDate: string;
}

export interface InventoryListAllResponse {
  /** roomTypeId → { 'YYYYMMDDHHmm': number } */
  byRoomType: Record<string, Record<string, number>>;
  roomTypeIds: string[];
}

/** PUT /v2/inventory body — 單格／多格更新（多 roomType × 多 timekey）*/
export interface InventoryUpdateRoomTypeEntry {
  associatePlansId: string[];
  /** roomTypeId（沿用舊版 DataTable 欄位命名） */
  DT_RowId: string;
  /** key = `YYYYMMDDHHmm`，value = 新的剩餘房數 */
  inventory: Record<string, number>;
  roomTypeName: string;
}

export interface InventoryUpdateInput {
  /** ISO 8601 — 結束日 00:00（含當日） */
  endOfDay: string;
  inventoryData: InventoryUpdateRoomTypeEntry[];
  /** ISO 8601 — 起始日 00:00 */
  startOfDay: string;
}

/** PUT /v2/inventory/batch body */
export interface InventoryBatchInput {
  /** 應用於哪幾天（0=週日, 1=週一, ..., 6=週六） */
  applyDayofWeek: number[];
  /** key = `HHmm`（不含日期），value = 應用後的房數；缺鍵代表該時段不更新 */
  applyTimeAndInventory: Record<string, number>;
  bookingInterval: number;
  endDate: string;
  roomTypesId: string[];
  startDate: string;
}

/** PUT /v2/inventory/sync-to-hotel-doc body */
export interface InventorySyncToHotelDocInput {
  /** 起算日（ISO 8601）— 從這天起的 inventory 寫回 hotel doc plans.*.inventory */
  startDate?: string;
  /** 要同步哪些 roomType；空陣列 / 不傳代表全部 */
  sourceRoomTypes?: string[];
}
