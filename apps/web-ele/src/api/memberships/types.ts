export interface MembershipCustomer {
  customerId: string;
  levelExpiryDate?: null | string;
  levelName: null | string;
  levelSource: string;
  phoneNumber: string;
}

export interface MembershipLevel {
  isActive: boolean;
  levelId: string;
  levelRank: number;
  name: string;
}

export interface MembershipLevelListResponse {
  levels: MembershipLevel[];
}

export interface ManualMembershipUpgradeInput {
  phoneNumber: string;
  reason: string;
  targetLevelId: string;
}

export interface ManualMembershipUpgradeResult {
  customerId: string;
  expiresAt: string;
  phoneNumber: string;
  previousLevelId?: null | string;
  previousLevelName?: null | string;
  targetLevelId: string;
  targetLevelName: string;
}
