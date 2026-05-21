/**
 * Extras（加購商品）即時訂閱 — 衍生自 hotel doc 的 `extras.items` keyed object。
 *
 * 對應舊 qk-extras 頁面用的 onSnapshot 即時更新。
 * 真實 Firestore shape 詳見 plan §1.3：`enable: boolean`、`order: string`、
 * `extraName/extraDescription/extraImagePath/extraPrice` 等。
 */
import { computed } from 'vue';

import { useHotelStore } from '#/store/hotel';

export interface YumieExtrasItem {
  enable?: boolean;
  extraDescription?: string;
  extraImagePath?: string;
  extraName?: string;
  extraPrice?: string;
  order?: string;
}

export interface YumieExtrasConfig {
  enableExtras?: boolean;
  items?: Record<string, YumieExtrasItem>;
}

export function useExtrasSnapshot() {
  const hotelStore = useHotelStore();
  const config = computed<YumieExtrasConfig>(() => {
    const raw = hotelStore.currentHotelMeta?.extras;
    return (raw as YumieExtrasConfig | undefined) ?? {};
  });
  const itemsMap = computed<Record<string, YumieExtrasItem>>(
    () => config.value.items ?? {},
  );
  const itemsList = computed(() =>
    Object.entries(itemsMap.value)
      .map(([id, item]) => ({ ...item, id }))
      .toSorted((a, b) =>
        (a.order ?? '').localeCompare(b.order ?? '', undefined, {
          numeric: true,
        }),
      ),
  );
  const enableExtras = computed(() => config.value.enableExtras === true);
  return { enableExtras, itemsList, itemsMap };
}
