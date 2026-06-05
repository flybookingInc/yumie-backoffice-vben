import type {
  Partner,
  PartnerInput,
  PartnerPerformanceRow,
  PartnerReportParams,
  RewardEntry,
  RewardEntryStatus,
  Settlement,
  SettlementPreviewGroup,
  SettleRunResult,
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

export const partnerRewardsApi = {
  /** GET /v2/partners/rewards — 帳本明細 drill-down */
  listRewards(params: {
    limit?: number;
    month: string;
    referralCode?: string;
    status?: RewardEntryStatus;
  }) {
    return requestClient.get<RewardEntry[]>('/partners/rewards', { params });
  },
  /** GET /v2/partners/settlements — 結算單歷史 */
  listSettlements(params: { limit?: number; month?: string }) {
    return requestClient.get<Settlement[]>('/partners/settlements', { params });
  },
  /** PUT /v2/partners/settlements/:id/paid — 標記已撥款 */
  markPaid(id: string, payoutRef: string) {
    return requestClient.put<Settlement>(`/partners/settlements/${id}/paid`, {
      payoutRef,
    });
  },
  /** POST /v2/partners/rewards/reconcile — 核算 + 回 per-夥伴 pending 預覽 */
  reconcile(month: string) {
    return requestClient.post<SettlementPreviewGroup[]>(
      '/partners/rewards/reconcile',
      { month },
    );
  },
  /** POST /v2/partners/settlements/run — 一鍵月結 */
  runSettlement(month: string) {
    return requestClient.post<SettleRunResult>('/partners/settlements/run', {
      month,
    });
  },
};

export type {
  Partner,
  PartnerInput,
  PartnerPerformanceRow,
  PartnerReportParams,
  RewardEntry,
  RewardEntryStatus,
  Settlement,
  SettlementPreviewGroup,
  SettleRunResult,
} from './types';
