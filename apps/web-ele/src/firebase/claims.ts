/**
 * Firebase custom claims 解析 — 對齊 plan §1.3 真實 schema：
 * - `rule`: 'admin' | 'superAdmin'（**不是** `role`）
 * - `hotelGroup`: string[]（**不是** `accessibleHotels`）
 *
 * 嚴格驗證 — 缺欄位 / 型別錯誤都 throw InvalidClaimsError，
 * 確保半殘登入不會通過。
 */
import type { ParsedToken } from 'firebase/auth';

export type YumieRule = 'admin' | 'superAdmin';

export interface ParsedClaims {
  hotelGroup: string[];
  rule: YumieRule;
}

export class InvalidClaimsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidClaimsError';
  }
}

export function parseClaims(raw: ParsedToken): ParsedClaims {
  const rule = raw.rule;
  if (rule !== 'admin' && rule !== 'superAdmin') {
    throw new InvalidClaimsError(
      `Invalid or missing rule claim: ${JSON.stringify(rule)}`,
    );
  }
  const hotelGroup = raw.hotelGroup;
  if (!Array.isArray(hotelGroup) || hotelGroup.length === 0) {
    throw new InvalidClaimsError('Missing or empty hotelGroup claim');
  }
  if (hotelGroup.some((id) => typeof id !== 'string' || !id)) {
    throw new InvalidClaimsError('hotelGroup contains non-string members');
  }
  return { hotelGroup: hotelGroup as string[], rule };
}

/**
 * 後台 Email 驗證碼：admin / superAdmin 的 token 要帶 30 天內的 `mfaAt`（驗證時間，epoch 秒），
 * 由後端 `POST /v2/admin-auth/verify` 發的 custom token 加上。規則與後端
 * functions/src/auth/adminMfa.ts、Firestore rules 相同（30 天、容許 5 分鐘時鐘誤差）。
 */
export const ADMIN_MFA_VALID_SECONDS = 30 * 24 * 60 * 60;
const CLOCK_SKEW_SECONDS = 300;

export class AdminMfaRequiredError extends Error {
  constructor() {
    super('需要 Email 驗證碼');
    this.name = 'AdminMfaRequiredError';
  }
}

export function isAdminMfaFresh(
  raw: ParsedToken,
  nowSec: number = Date.now() / 1000,
): boolean {
  if (raw.rule !== 'admin' && raw.rule !== 'superAdmin') return true;
  const mfaAt = raw.mfaAt;
  return (
    typeof mfaAt === 'number' &&
    mfaAt <= nowSec + CLOCK_SKEW_SECONDS &&
    nowSec - mfaAt < ADMIN_MFA_VALID_SECONDS
  );
}
