/**
 * Plan — 房價方案。對齊 plan §1.3 真實 Firestore schema + §1.4 v2 normalize。
 *
 * Firestore 真實儲存：所有價格/休息時數都是 string。v2 後端在 GET 回應時
 * 轉成 number；在 POST/PUT 時可接受 number 或 string（內部轉成 string 寫回 Firestore）。
 *
 * `availability` (HH:mm → boolean × 48 slots) 不在這個 module 的 CRUD 中
 * 直接改寫，由 P6.6 availability module 管理。
 */
export interface Plan {
  availability?: Record<string, boolean>;
  /** true = 停售 */
  disable: boolean;
  /** 0=Sun ... 6=Sat */
  disabledWeekdays: number[];
  flyKioskPlanId?: string;
  flyKioskRoomTypeId?: string;
  /** plan id (Firestore key under hotelDoc.plans) */
  id: string;
  imagePath?: string;
  planName: string;
  roomTypeId: string;
  /** Firestore stores string；前端排序時走 numeric:true localeCompare */
  sequence: string;
  weekendListPrice: number;
  weekendPrice: number;
  /** 分鐘 */
  weekendQkDuration: number;
  weekListPrice: number;
  weekPrice: number;
  /** 分鐘 */
  weekQkDuration: number;
}

export interface PlanCreateInput {
  disable?: boolean;
  disabledWeekdays?: number[];
  flyKioskPlanId?: string;
  flyKioskRoomTypeId?: string;
  imagePath?: string;
  planName: string;
  roomTypeId: string;
  sequence?: string;
  weekendListPrice?: number;
  weekendPrice?: number;
  weekendQkDuration?: number;
  weekListPrice?: number;
  weekPrice?: number;
  weekQkDuration?: number;
}

export type PlanUpdateInput = Partial<PlanCreateInput>;

/** 舊 backoffice 常見休息時長（分鐘） */
export const QK_DURATION_OPTIONS: ReadonlyArray<{ label: string; value: number }> = [
  { label: '2 小時', value: 120 },
  { label: '3 小時', value: 180 },
  { label: '4 小時', value: 240 },
  { label: '5 小時', value: 300 },
  { label: '6 小時', value: 360 },
  { label: '7 小時', value: 420 },
  { label: '8 小時', value: 480 },
  { label: '12 小時', value: 720 },
  { label: '24 小時', value: 1440 },
];

/** 0 = Sun, 1 = Mon, ..., 6 = Sat — 對應 Firestore `weekend` 與 plan.disabledWeekdays */
export const WEEKDAY_LABELS: ReadonlyArray<{ label: string; value: number }> = [
  { label: '日', value: 0 },
  { label: '一', value: 1 },
  { label: '二', value: 2 },
  { label: '三', value: 3 },
  { label: '四', value: 4 },
  { label: '五', value: 5 },
  { label: '六', value: 6 },
];
