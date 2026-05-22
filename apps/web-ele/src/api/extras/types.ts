/**
 * Extras 加購商品 — 對齊 plan §1.3 真實 Firestore + §1.4 v2 normalize。
 *
 * Firestore 真實儲存：`extras.items.{itemId} = { extraName, extraDescription,
 * extraImagePath, extraPrice (string), enable: boolean, order: string }`。
 *
 * v2 後端 normalize：extraPrice string → number。order 保留 string 作 sort key。
 */
export interface ExtrasItem {
  enable: boolean;
  extraDescription?: string;
  extraImagePath?: string;
  extraName: string;
  extraPrice: number;
  id: string;
  /** sort key (string, numeric:true localeCompare) */
  order: string;
}

export interface ExtrasState {
  enableExtras: boolean;
  items: ExtrasItem[];
}

export interface ExtrasItemCreateInput {
  enable?: boolean;
  extraDescription?: string;
  extraImagePath?: string;
  extraName: string;
  extraPrice?: number;
  order?: string;
}

export type ExtrasItemUpdateInput = Partial<ExtrasItemCreateInput>;
