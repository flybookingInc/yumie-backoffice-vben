import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 項目配置文件
 * 只需要覆蓋項目中的一部分配置，不需要的配置不用覆蓋，會自動使用默認配置
 * !!! 更改配置後請清空緩存，否則可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  app: {
    // backend mode：Yumie menu / access routes are returned by yumie-backend /menu/all.
    accessMode: 'backend',
    defaultHomePath: '/orders/occupy',
    // 預設繁體中文（Yumie 主要市場為台灣）。使用者仍可在 preferences 面板切換 zh-CN / en-US
    locale: 'zh-TW',
    name: import.meta.env.VITE_APP_TITLE,
  },
  copyright: {
    enable: false,
  },
  logo: {
    source: '/assets/images/logo_black.png',
    sourceDark: '/assets/images/logo_white.png',
  },
  theme: {
    mode: 'light',
  },
  widget: {
    lockScreen: false,
  },
});
