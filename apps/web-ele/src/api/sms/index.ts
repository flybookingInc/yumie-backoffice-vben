import type { SmsBillingStats, SmsRecord } from './types';

import { requestClient } from '#/api/request';

export interface SmsRecordsParams {
  /** YYYY-MM-DD */
  fromDate: string;
  hotelId?: string;
  /** YYYY-MM-DD */
  toDate: string;
}

export interface SmsBillingParams {
  /** YYYY-MM-DD */
  fromDate: string;
  /** YYYY-MM-DD */
  toDate: string;
}

export const smsApi = {
  /** GET /v2/sms/billing — superAdmin only */
  billing(params: SmsBillingParams) {
    return requestClient.get<SmsBillingStats>('/sms/billing', { params });
  },
  /** GET /v2/sms/records */
  records(params: SmsRecordsParams) {
    return requestClient.get<SmsRecord[]>('/sms/records', { params });
  },
};

export type {
  SmsBillingRow,
  SmsBillingStats,
  SmsBillingTotals,
  SmsRecord,
} from './types';
