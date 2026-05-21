import type { DocumentData, Unsubscribe } from 'firebase/firestore';

/**
 * Firestore **只讀** wrappers — 整個前端禁止從 firebase/firestore import setDoc / updateDoc /
 * addDoc / deleteDoc / batch / runTransaction。寫入一律走 v2 REST，由後端統一處理權限與 trigger。
 *
 * 此檔只導出 onSnapshot helpers。新增訂閱點時，在此 export，view 層只 import 此檔。
 */
import { collection, doc, onSnapshot } from 'firebase/firestore';

import { firestore } from './init';

export function watchHotelDoc(
  hotelId: string,
  cb: (data: DocumentData | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firestore, 'qk-list', hotelId),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (err) => console.error('watchHotelDoc error', err),
  );
}

export function watchOrders(
  hotelId: string,
  cb: (orders: Array<DocumentData & { id: string }>) => void,
): Unsubscribe {
  return onSnapshot(
    collection(firestore, 'qk-list', hotelId, 'orders'),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('watchOrders error', err),
  );
}
