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
