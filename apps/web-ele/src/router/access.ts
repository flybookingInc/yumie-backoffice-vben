import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { BasicLayout, IFrameView } from '#/layouts';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

/**
 * Frontend access mode（見 preferences.ts）— menu / routes 由 routes/modules/*.ts
 * 推導，不打後端 /menu/all。Firebase claims.rule 已寫進 userStore.userInfo.roles。
 */
async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => [],
    forbiddenComponent,
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
