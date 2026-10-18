import type { CreditReport, CreditReportQuery } from './types';

import { requestClient } from '#/api/request';

export const yumieCreditApi = {
  export(params: CreditReportQuery) {
    return requestClient.get<CreditReport>('/reports/yumie-credit/export', {
      params,
    });
  },
  report(params: CreditReportQuery) {
    return requestClient.get<CreditReport>('/reports/yumie-credit', { params });
  },
};

export type {
  CreditCategory,
  CreditHotelOption,
  CreditReport,
  CreditReportGroup,
  CreditReportMode,
  CreditReportQuery,
  CreditReportRow,
  CreditReportSummary,
} from './types';
