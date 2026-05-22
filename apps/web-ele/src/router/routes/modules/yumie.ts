import type { RouteRecordRaw } from 'vue-router';

/**
 * Yumie Backoffice routes — 1:1 對齊舊版 navbar 樹（plan §5.1）。
 *
 * 結構：
 * ```
 * 訂單   /orders/{occupy, booking}
 * 房況   /rooms/{inventory, availability}
 * 加購   /extras
 * 數據   /reports/{sms, sms-billing}   [sms-billing → superAdmin]
 * 設定   /settings/{room-types, plans, hotel, membership-benefits, users, super-admin}
 *                                       [users, super-admin → superAdmin]
 *                                       [membership-benefits → requiresLoyalty]
 * ```
 *
 * Phase 6 把每個 leaf 的 `component` 從 `_placeholder.vue` 換成真實 view。
 */
const placeholder = () => import('#/views/yumie/_placeholder.vue');

const routes: RouteRecordRaw[] = [
  // 訂單
  {
    children: [
      {
        component: () => import('#/views/yumie/orders/occupy.vue'),
        meta: { icon: 'lucide:clipboard-list', title: '列表' },
        name: 'OrdersOccupy',
        path: '/orders/occupy',
      },
      {
        component: placeholder,
        meta: { icon: 'lucide:calendar-plus', title: '預約' },
        name: 'OrdersBooking',
        path: '/orders/booking',
      },
    ],
    meta: { icon: 'lucide:calendar-check', order: 1, title: '訂單' },
    name: 'Orders',
    path: '/orders',
  },

  // 房況
  {
    children: [
      {
        component: placeholder,
        meta: { icon: 'lucide:warehouse', title: '房量' },
        name: 'RoomsInventory',
        path: '/rooms/inventory',
      },
      {
        component: placeholder,
        meta: { icon: 'lucide:clock', title: '時段' },
        name: 'RoomsAvailability',
        path: '/rooms/availability',
      },
    ],
    meta: { icon: 'lucide:hotel', order: 2, title: '房況' },
    name: 'Rooms',
    path: '/rooms',
  },

  // 加購 — 舊版是 direct link，新版仍保留為單一子 route 以對齊 vben group structure
  {
    children: [
      {
        component: () => import('#/views/yumie/extras/index.vue'),
        meta: { icon: 'lucide:package-plus', title: '加購' },
        name: 'ExtrasIndex',
        path: '/extras',
      },
    ],
    meta: { icon: 'lucide:package-plus', order: 3, title: '加購' },
    name: 'Extras',
    path: '/extras-group',
  },

  // 數據
  {
    children: [
      {
        component: () => import('#/views/yumie/reports/sms.vue'),
        meta: { icon: 'lucide:message-square', title: '簡訊統計' },
        name: 'ReportsSms',
        path: '/reports/sms',
      },
      {
        component: () => import('#/views/yumie/reports/sms-billing.vue'),
        meta: {
          authority: ['superAdmin'],
          icon: 'lucide:wallet',
          title: '費用統計',
        },
        name: 'ReportsSmsBilling',
        path: '/reports/sms-billing',
      },
    ],
    meta: { icon: 'lucide:bar-chart-3', order: 4, title: '數據' },
    name: 'Reports',
    path: '/reports',
  },

  // 設定
  {
    children: [
      {
        component: () => import('#/views/yumie/settings/room-types.vue'),
        meta: { icon: 'lucide:bed-double', title: '房型' },
        name: 'SettingsRoomTypes',
        path: '/settings/room-types',
      },
      {
        component: () => import('#/views/yumie/settings/plans.vue'),
        meta: { icon: 'lucide:tag', title: '專案' },
        name: 'SettingsPlans',
        path: '/settings/plans',
      },
      {
        component: placeholder,
        meta: { icon: 'lucide:building', title: '系統' },
        name: 'SettingsHotel',
        path: '/settings/hotel',
      },
      {
        component: placeholder,
        meta: {
          icon: 'lucide:gift',
          requiresLoyalty: true,
          title: '會員等級福利',
        },
        name: 'SettingsMembershipBenefits',
        path: '/settings/membership-benefits',
      },
      {
        component: placeholder,
        meta: {
          authority: ['superAdmin'],
          icon: 'lucide:users',
          title: '帳號',
        },
        name: 'SettingsUsers',
        path: '/settings/users',
      },
      {
        component: placeholder,
        meta: {
          authority: ['superAdmin'],
          icon: 'lucide:shield',
          title: '旅館',
        },
        name: 'SettingsSuperAdmin',
        path: '/settings/super-admin',
      },
    ],
    meta: { icon: 'lucide:cog', order: 5, title: '設定' },
    name: 'Settings',
    path: '/settings',
  },
];

export default routes;
