import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  app: {
    // frontend mode：menu / routes 由 router/routes/modules/*.ts 推導，不打後端 /menu/all
    accessMode: 'frontend',
    defaultHomePath: '/orders/occupy',
    name: import.meta.env.VITE_APP_TITLE,
  },
});
