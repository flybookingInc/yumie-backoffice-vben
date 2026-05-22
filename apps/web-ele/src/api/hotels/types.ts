/**
 * Hotel — 飯店 doc 對應 type。對齊 plan §1.3 真實 Firestore + §1.4 normalize。
 *
 * Field 命名沿用舊 backoffice：hotelName / hotelPhone / notifyEmail 等。
 */

/** /v2/hotels list — 簡化 summary（不含 plans / extras / coverPhoto 等大欄位） */
export interface HotelSummary {
  disabled: boolean;
  hotelAddress?: string;
  hotelId: string;
  hotelName: string;
  hotelPhone?: string;
  loyaltyEnabled: boolean;
  notifyEmail?: string;
}

/** /v2/hotels/:id detail — 完整 hotel doc，extra fields 視 Firestore 而定 */
export interface HotelDoc {
  [key: string]: unknown;
  bookingInterval?: number;
  coverPhoto?: Array<{
    sequence: number;
    subtitle?: string;
    title?: string;
    url: string;
  }>;
  disabled?: boolean;
  hotelAddress?: string;
  hotelId: string;
  hotelName?: string;
  hotelPhone?: string;
  loyalty?: { enabled: boolean };
  notifyEmail?: string;
  timezone?: string;
  weekend?: number[];
}

export interface HotelCreateInput {
  hotelAddress?: string;
  hotelId: string;
  hotelName: string;
  hotelPhone?: string;
  notifyEmail?: string;
}

export type HotelUpdateInput = Partial<Omit<HotelCreateInput, 'hotelId'>>;
