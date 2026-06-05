import type {
  Partner,
  PartnerInput,
  PartnerPerformanceRow,
  PartnerReportParams,
} from './types';

import { requestClient } from '#/api/request';

export const partnersApi = {
  /** POST /v2/partners — 建立（doc id = normalized code） */
  create(data: PartnerInput) {
    return requestClient.post<Partner>('/partners', data);
  },
  /** GET /v2/partners — 列出全部（含停用） */
  list() {
    return requestClient.get<Partner[]>('/partners');
  },
  /** DELETE /v2/partners/:code — 軟刪（active=false） */
  remove(code: string) {
    return requestClient.delete<{ active: boolean; code: string }>(
      `/partners/${code}`,
    );
  },
  /** GET /v2/partners/report — 成效報表（依 check_in_date 區間） */
  report(params: PartnerReportParams) {
    return requestClient.get<PartnerPerformanceRow[]>('/partners/report', {
      params,
    });
  },
  /** PUT /v2/partners/:code — 更新（不可改 code） */
  update(code: string, data: PartnerInput) {
    return requestClient.put<Partner>(`/partners/${code}`, data);
  },
};

export type {
  Partner,
  PartnerInput,
  PartnerPerformanceRow,
  PartnerReportParams,
} from './types';
