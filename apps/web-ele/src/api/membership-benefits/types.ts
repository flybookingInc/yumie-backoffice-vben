/**
 * Membership benefits — 對齊 yumie_backend `loyalty/hotel_config.ts` 真實 schema。
 *
 * 資料位置：`qk-list/{hotelId}/integrations/loyalty` 文件
 *
 * Schema：
 * - `membershipBenefits`: 三個等級 (GO / PRO / ELITE) 各自 rules array
 * - `maxRedeemRatio`: **整數百分比 0-100**（不是 0-1 小數，與 plan §1.3 描述不一致；
 *   以實際後端為準）
 *
 * 每條 rule = "當 `reservedMinutes >= minReservedMinutes` 時，加送 freeRestMinutes 分鐘"
 */

export type LoyaltyLevelCode = 'ELITE' | 'GO' | 'PRO';

export interface MembershipBenefitRule {
  freeRestMinutes: number;
  minReservedMinutes: number;
}

export interface MembershipBenefitLevel {
  levelCode: LoyaltyLevelCode;
  rules: MembershipBenefitRule[];
}

export interface MembershipBenefitsState {
  hotelId: string;
  /** integer 0-100 */
  maxRedeemRatio: number;
  membershipBenefits: MembershipBenefitLevel[];
}

export interface MembershipBenefitsUpdateInput {
  maxRedeemRatio: number;
  membershipBenefits: MembershipBenefitLevel[];
}
