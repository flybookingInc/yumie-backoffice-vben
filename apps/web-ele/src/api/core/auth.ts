/**
 * 舊版 vben 的 `loginApi / refreshTokenApi / logoutApi / getAccessCodesApi`
 * 對應的後端 REST endpoint 不存在於 Yumie 後台。
 *
 * Auth 一律走 Firebase Web SDK，見 `src/firebase/auth-sync.ts` 與 `src/store/auth.ts`。
 * 此檔保留型別 namespace 供 vben framework 內既有 import；函式僅作 no-op 兜底。
 */
export namespace AuthApi {
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

function deprecated(name: string): never {
  throw new Error(
    `[yumie-backoffice] ${name} is deprecated — use Firebase Auth via #/firebase/auth-sync`,
  );
}

export async function loginApi(
  _data: AuthApi.LoginParams,
): Promise<AuthApi.LoginResult> {
  deprecated('loginApi');
}

export async function refreshTokenApi(): Promise<AuthApi.RefreshTokenResult> {
  deprecated('refreshTokenApi');
}

export async function logoutApi(): Promise<void> {
  deprecated('logoutApi');
}

export async function getAccessCodesApi(): Promise<string[]> {
  deprecated('getAccessCodesApi');
}
