/**
 * 後台 Email 驗證碼 API（`/v2/admin-auth/*`）。
 *
 * 用密碼登入後的 ID token 呼叫（這時 token 還沒有 mfaAt，一般 request client 的 401
 * 重試／登出邏輯不適用），所以直接用 fetch。
 */
import type { User } from 'firebase/auth';

import { useAppConfig } from '@vben/hooks';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

export type AdminCodeFailReason =
  | 'daily_limit'
  | 'expired'
  | 'no_code'
  | 'too_frequent'
  | 'too_many_attempts'
  | 'used'
  | 'wrong_code';

export class AdminCodeError extends Error {
  reason?: AdminCodeFailReason;
  status: number;
  constructor(message: string, status: number, reason?: AdminCodeFailReason) {
    super(message);
    this.name = 'AdminCodeError';
    this.status = status;
    this.reason = reason;
  }
}

async function post<T>(user: User, path: string, body: unknown): Promise<T> {
  const token = await user.getIdToken();
  const resp = await fetch(`${apiURL}/admin-auth${path}`, {
    body: JSON.stringify(body ?? {}),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const json = (await resp.json().catch(() => ({}))) as {
    code?: number;
    data?: any;
    message?: string;
  };
  if (!resp.ok || json.code !== 0) {
    throw new AdminCodeError(
      json.message || `HTTP ${resp.status}`,
      resp.status,
      json.data?.reason,
    );
  }
  return json.data as T;
}

/** 寄驗證碼到帳號 email，回傳遮罩後的信箱（例如 fr***@gmail.com）。 */
export function requestAdminEmailCode(user: User) {
  return post<{ sentTo: string }>(user, '/email-code', {});
}

/** 驗證成功回傳帶 mfaAt 的 custom token。 */
export function verifyAdminEmailCode(user: User, code: string) {
  return post<{ customToken: string; mfaAt: number }>(user, '/verify', {
    code,
  });
}
