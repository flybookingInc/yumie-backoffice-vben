/**
 * 房型 RoomType — 對齊 plan §1.3 真實 Firestore + §1.4 v2 normalize 規範。
 *
 * Field 命名沿用舊 backoffice（input id 對齊）：
 * - `RoomTypeName` 保留大寫 R
 * - 其他欄位 camelCase（pmsRoomTypeCode / flyKioskRoomTypeId / inventorySyncToHotelDocDays /
 *   interval / associatePlansId）
 */
export interface RoomType {
  RoomTypeName: string;
  associatePlansId: string[];
  flyKioskRoomTypeId?: string;
  /** Firestore doc id */
  id: string;
  /** 通常 30 (分鐘) */
  interval: number;
  /** 同步幾天份 inventory 到 hotel doc 的 plans.{planId}.inventory */
  inventorySyncToHotelDocDays: number;
  pmsRoomTypeCode?: string;
}

export interface RoomTypeCreateInput {
  RoomTypeName: string;
  associatePlansId: string[];
  flyKioskRoomTypeId?: string;
  interval: number;
  inventorySyncToHotelDocDays: number;
  pmsRoomTypeCode?: string;
}

export type RoomTypeUpdateInput = Partial<RoomTypeCreateInput>;
