import type { App } from 'vue';

import type { CreditReport, CreditReportQuery } from '#/api/yumie-credit';

import { createApp, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReportPage from '../yumie-credit.vue';
import { sampleReport, sampleRow } from './yumie-credit-fixture';

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  export: vi.fn(),
  report: vi.fn(),
  hotel: {
    currentHotelId: 'current-hotel',
    currentHotelMeta: { hotelName: '目前旅館' },
  },
}));
vi.mock('#/api/yumie-credit', () => ({
  yumieCreditApi: { report: mocks.report, export: mocks.export },
}));
vi.mock('#/store/hotel', async () => {
  const { reactive } = await import('vue');
  mocks.hotel = reactive(mocks.hotel);
  return { useHotelStore: () => mocks.hotel };
});
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { roles: ['superAdmin'] } }),
}));
vi.mock('../yumie-credit-export', () => ({
  downloadCreditWorkbook: mocks.download,
}));

let app: App | undefined;
let container: HTMLDivElement;
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
function mountPage() {
  container = document.createElement('div');
  document.body.append(container);
  app = createApp(ReportPage);
  app.directive('loading', {});
  app.mount(container);
}
function click(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  expect(element).not.toBeNull();
  element?.click();
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.hotel.currentHotelId = 'current-hotel';
  mocks.report.mockImplementation(async (query: CreditReportQuery) =>
    sampleReport({
      page: query.page ?? 1,
      total: 51,
      filters: {
        ...sampleReport().filters,
        mode: query.mode,
        search: query.search,
      },
    }),
  );
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  document.body.innerHTML = '';
});

describe('credit report page', () => {
  it('loads current hotel, switches mode/search and preserves the snapshot on paging', async () => {
    mountPage();
    await settle();
    expect(mocks.report).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelIds: 'current-hotel',
        mode: 'stay',
        page: 1,
      }),
    );
    click('[data-testid="mode"] input[value="ledger"]');
    const search = container.querySelector<HTMLInputElement>(
      'input[data-testid="search"], [data-testid="search"] input',
    );
    if (!search) throw new Error('search input not found');
    search.value = '77100';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    click('[data-testid="query"]');
    await settle();
    expect(mocks.report).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'ledger', search: '77100', page: 1 }),
    );
    const pageTwo = [
      ...container.querySelectorAll<HTMLElement>('.el-pager li'),
    ].find((el) => el.textContent?.trim() === '2');
    expect(pageTwo).toBeDefined();
    pageTwo?.click();
    await settle();
    expect(mocks.report).toHaveBeenLastCalledWith(
      expect.objectContaining({
        snapshotId: 'frozen-result-1',
        page: 2,
        mode: 'ledger',
        search: '77100',
      }),
    );
  });

  it('does not replace a newer hotel result with a slow older response', async () => {
    let resolveOld: ((value: CreditReport) => void) | undefined;
    mocks.report.mockImplementationOnce(
      () =>
        new Promise<CreditReport>((resolve) => {
          resolveOld = resolve;
        }),
    );
    mountPage();
    await settle();
    mocks.hotel.currentHotelId = 'other-hotel';
    await settle();
    expect(container.textContent).toContain('77100');
    resolveOld?.(
      sampleReport({
        items: [{ ...sampleRow, orderNumber: 'STALE-ORDER' }],
      }),
    );
    await settle();
    expect(container.textContent).not.toContain('STALE-ORDER');
  });

  it('opens the clicked cross-hotel order and does not download after export failure', async () => {
    mountPage();
    await settle();
    const orderButton = [
      ...container.querySelectorAll<HTMLElement>('button'),
    ].find((button) => button.textContent?.trim() === '77100');
    orderButton?.click();
    await settle();
    expect(document.querySelector('.el-dialog')?.textContent).toContain(
      '另一間授權旅館',
    );
    expect(document.querySelector('.el-dialog')?.textContent).toContain(
      '休息專案',
    );
    expect(document.querySelector('.el-dialog')?.textContent).toContain(
      '扣抵參考金額',
    );
    expect(document.querySelector('.el-dialog')?.textContent).toContain(
      '仍待帳本核對，不代表已確認扣抵',
    );
    mocks.export.mockRejectedValueOnce({ response: { status: 409 } });
    click('[data-testid="export"]');
    await settle();
    expect(mocks.export).toHaveBeenCalledWith(
      expect.objectContaining({ snapshotId: 'frozen-result-1' }),
    );
    expect(mocks.download).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('重新查詢');
  });
});
