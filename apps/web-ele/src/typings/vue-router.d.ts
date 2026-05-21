/**
 * vben 預設 RouteMeta 沒有 `requiresLoyalty`。此處擴充給 Loyalty
 * menu filter 與 route guard 用（見 router/access.ts、layouts/basic.vue）。
 */
import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    requiresLoyalty?: boolean;
  }
}


