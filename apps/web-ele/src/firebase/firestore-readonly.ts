import type { DocumentData, Unsubscribe } from 'firebase/firestore';

/**
 * Firestore **只讀** wrappers — 整個前端禁止從 firebase/firestore import setDoc / updateDoc /
 * addDoc / deleteDoc / batch / runTransaction。寫入一律走 v2 REST，由後端統一處理權限與 trigger。
 *
 * 此檔只導出 onSnapshot helpers。新增訂閱點時，在此 export，view 層只 import 此檔。
 */
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';

import { firestore } from './init';

export function watchHotelDoc(
  hotelId: string,
  cb: (data: DocumentData | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firestore, 'qk-list', hotelId),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (err) => console.error('[firestore] watchHotelDoc error', err),
  );
}

/**
 * 只訂閱 `date`（YYYY-MM-DD, Asia/Taipei）當天的訂單，而非整個 orders 歷史。
 * raw doc 的日期欄位為 snake_case `check_in_date`（v2 後端轉成 camelCase `checkInDate`）。
 * 這份訂閱只當「當天有訂單異動」的即時訊號用，顯示資料仍以 v2 REST 為準。
 */
export function watchOrders(
  hotelId: string,
  date: string,
  cb: (orders: Array<DocumentData & { id: string }>) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(firestore, 'qk-list', hotelId, 'orders'),
      where('check_in_date', '==', date),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('watchOrders error', err),
  );
}
