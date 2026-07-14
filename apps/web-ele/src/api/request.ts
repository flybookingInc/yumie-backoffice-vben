/**
 * Yumie Backoffice request client — 對接 v2 REST API。
 *
 * 重點：
 * - 每個 request 前 `await authReady`（避免 Firebase auth state 還沒 restore 時就發請求）
 * - Authorization: Bearer <Firebase idToken>（每次 request 由 SDK 取，內部已 cache）
 * - X-Firebase-AppCheck: 預插 header（後端目前 bypass，未來啟用不用改前端）
 * - hotelId 注入：依 method 與 payload 型態自動補（GET/DELETE → params；FormData → append；
 *   object → spread；無 body → `{ hotelId }`）
 * - Response 統一 `{ code, data, message }`（vben defaultResponseInterceptor，successCode=0）
 * - 401 → 強制刷新 Firebase ID Token 後只重試一次；刷新失敗才登出
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';

import { ElMessage } from 'element-plus';
import { getToken as getAppCheckToken } from 'firebase/app-check';

import { authReady } from '#/firebase/auth-sync';
import { appCheck, firebaseAuth } from '#/firebase/init';
import { useAuthStore } from '#/store';
import { useHotelStore } from '#/store/hotel';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function formatToken(token: null | string): null | string {
  return token ? `Bearer ${token}` : null;
}

function injectHotelId(config: Record<string, any>, hotelId: string): void {
  const method = (config.method as string | undefined)?.toUpperCase();
  if (method === 'GET' || method === 'DELETE') {
    config.params = { hotelId, ...config.params };
    return;
  }
  if (config.data instanceof FormData) {
    if (!config.data.has('hotelId')) config.data.append('hotelId', hotelId);
    return;
  }
  if (
    config.data &&
    typeof config.data === 'object' &&
    !Array.isArray(config.data)
  ) {
    if (!('hotelId' in config.data)) {
      config.data = { hotelId, ...config.data };
    }
    return;
  }
  if (config.data === null || config.data === undefined) {
    config.data = { hotelId };
  }
}

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({ ...options, baseURL });

  client.addRequestInterceptor({
    fulfilled: async (config) => {
      await authReady;

      const user = firebaseAuth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = formatToken(token);
      }

      if (appCheck) {
        try {
          const appCheckToken = await getAppCheckToken(appCheck, false);
          config.headers['X-Firebase-AppCheck'] = appCheckToken.token;
        } catch (error) {
          console.warn('AppCheck token failed:', error);
        }
      }

      config.headers['Accept-Language'] = preferences.app.locale;

      const hotelId = useHotelStore().currentHotelId;
      if (hotelId) injectHotelId(config, hotelId);

      return config;
    },
  });

  // v2 統一 `{ code, data, message }`，successCode=0
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // 401 / token 失效 → 強制刷新 Firebase ID Token 後只重試一次；仍失敗才登出。
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate: async () => {
        await useAuthStore().logout();
      },
      doRefreshToken: async () => {
        const u = firebaseAuth.currentUser;
        return u ? await u.getIdToken(true) : '';
      },
      enableRefreshToken: true,
      formatToken,
    }),
  );

  // 兜底錯誤訊息
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      const responseData = error?.response?.data ?? {};
      const errorMessage = responseData?.error ?? responseData?.message ?? '';
      ElMessage.error(errorMessage || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
