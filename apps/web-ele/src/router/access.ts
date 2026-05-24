import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { getAllMenusApi } from '#/api/core/menu';
import { BasicLayout, IFrameView } from '#/layouts';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

/**
 * Backend access mode（見 preferences.ts）— Yumie menu / access routes
 * are returned by yumie-backend /menu/all.
 */
async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: getAllMenusApi,
    forbiddenComponent,
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
