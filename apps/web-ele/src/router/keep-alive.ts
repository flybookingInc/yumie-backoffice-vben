import type { RouteRecordRaw, RouteRecordStringComponent } from '@vben/types';

import { mapTree } from '@vben/utils';

/** Set defaults before Vben wraps lazy views with names matching their routes. */
export function withDefaultKeepAlive<
  T extends RouteRecordRaw | RouteRecordStringComponent,
>(routes: T[]): T[] {
  return mapTree(routes, (route) => ({
    ...route,
    meta: {
      ...route.meta,
      keepAlive: route.meta?.keepAlive ?? true,
    },
  }));
}
