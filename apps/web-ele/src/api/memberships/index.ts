import type {
  ManualMembershipUpgradeInput,
  ManualMembershipUpgradeResult,
  MembershipCustomer,
  MembershipLevelListResponse,
} from './types';

import { requestClient } from '#/api/request';

import { normalizePhoneToCanonicalE164 } from './phone';

export const membershipsApi = {
  customer(phoneNumber: string) {
    const canonicalPhone = normalizePhoneToCanonicalE164(phoneNumber);
    return requestClient.get<MembershipCustomer>('/memberships/customer', {
      params: { phoneNumber: canonicalPhone },
    });
  },
  levels() {
    return requestClient.get<MembershipLevelListResponse>(
      '/memberships/levels',
    );
  },
  manualUpgrade(data: ManualMembershipUpgradeInput) {
    return requestClient.post<ManualMembershipUpgradeResult>(
      '/memberships/manual-upgrade',
      {
        ...data,
        phoneNumber: normalizePhoneToCanonicalE164(data.phoneNumber),
      },
    );
  },
};

export { normalizePhoneToCanonicalE164 } from './phone';

export type {
  ManualMembershipUpgradeInput,
  ManualMembershipUpgradeResult,
  MembershipCustomer,
  MembershipLevel,
  MembershipLevelListResponse,
} from './types';
