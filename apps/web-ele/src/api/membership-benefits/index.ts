import type {
  MembershipBenefitsState,
  MembershipBenefitsUpdateInput,
} from './types';

import { requestClient } from '#/api/request';

export const membershipBenefitsApi = {
  /** GET /v2/hotels/:hotelId/membership-benefits */
  get(hotelId: string) {
    return requestClient.get<MembershipBenefitsState>(
      `/hotels/${hotelId}/membership-benefits`,
    );
  },
  /** PUT /v2/hotels/:hotelId/membership-benefits */
  update(hotelId: string, data: MembershipBenefitsUpdateInput) {
    return requestClient.put<MembershipBenefitsState>(
      `/hotels/${hotelId}/membership-benefits`,
      data,
    );
  },
};

export type {
  LoyaltyLevelCode,
  MembershipBenefitLevel,
  MembershipBenefitRule,
  MembershipBenefitsState,
  MembershipBenefitsUpdateInput,
} from './types';
