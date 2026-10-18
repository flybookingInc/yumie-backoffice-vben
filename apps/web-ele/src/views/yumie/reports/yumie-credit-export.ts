import type { CreditReport, CreditReportSummary } from '#/api/yumie-credit';

import { taipeiDateTime } from '#/utils/datetime';

import {
  creditCategoryLabels,
  creditRefundLabel,
  creditStatusLabel,
  safeCreditCell,
} from './yumie-credit-utils';

/** The whole filtered snapshot is exported; page data is never used as a substitute. */
export async function buildCreditWorkbook(report: CreditReport) {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'Yumie';
  workbook.created = new Date(report.asOf);
  const summary = workbook.addWorksheet('統計');
  const details = workbook.addWorksheet('扣抵／退還明細');
  const add = (values: (null | number | string | undefined)[]) =>
    summary.addRow(values.map((value) => safeCreditCell(value)));
  add(['Yumie 金扣抵報表']);
  add(['資料截至（台灣時間）', taipeiDateTime(report.asOf)]);
  add([
    '日期口徑',
    report.filters.mode === 'stay' ? '入住訂單統計' : '扣退流水',
  ]);
  add(['查詢期間', report.filters.startDate, report.filters.endDate]);
  add([
    '旅館範圍',
    report.filters.hotelIds
      .map(
        (id) =>
          report.hotelOptions.find((h) => h.hotelId === id)?.hotelName ?? id,
      )
      .join('、'),
  ]);
  add(['搜尋', report.filters.search]);
  add([
    '注意',
    '淨扣抵不等同業者應收結算款；贈點、到期、轉贈及人工調帳不列入。扣抵參考金額來自訂單預計扣抵或舊版活動扣抵紀錄，仍待帳本核對，不代表已確認扣抵。',
  ]);
  add([
    '金額口徑',
    report.filters.mode === 'ledger'
      ? '扣抵與退還按實際異動日期；本筆未退還為截至查詢時的餘額。'
      : '按預約入住日期選訂單，顯示截至查詢時間的累計扣退。',
  ]);
  add([]);
  add([
    '分組',
    '項目',
    '扣抵金額',
    '已退還金額',
    '淨扣抵額',
    '使用訂單數',
    '待核對筆數',
    '待核對金額',
  ]);
  const aggregate = (
    group: string,
    label: string,
    value: CreditReportSummary,
  ) =>
    add([
      group,
      label,
      value.grossAmount,
      value.refundAmount,
      value.netAmount,
      value.orderCount,
      value.reviewCount,
      value.reviewAmount,
    ]);
  aggregate('總覽', '全部查詢結果', report.summary);
  for (const value of report.categories)
    aggregate('訂單狀態', creditCategoryLabels[value.category], value);
  for (const value of report.byHotel) aggregate('旅館', value.hotelName, value);
  for (const value of report.byPeriod)
    aggregate(
      report.filters.groupBy === 'day' ? '按日' : '按月',
      value.period,
      value,
    );
  summary.columns = [
    { width: 25 },
    { width: 55 },
    ...Array.from({ length: 6 }, () => ({ width: 20 })),
  ];
  summary.getRow(1).font = { bold: true, size: 16 };
  summary.getRow(10).font = { bold: true };
  summary.views = [{ state: 'frozen', ySplit: 10 }];

  details.addRow([
    '旅館',
    '訂單編號',
    '訂單 ID',
    '會員電話',
    '預約入住時間（台灣）',
    '訂單狀態',
    '分類',
    '專案',
    '訂單金額',
    '扣抵時間（台灣）',
    '扣抵金額',
    '退還時間（台灣）',
    '退還金額',
    '本列淨扣抵',
    '本筆原始扣抵',
    '本筆累計退還',
    '本筆未退還金額',
    '退款處理',
    '待核對原因',
    '紀錄 ID',
    '扣抵參考金額',
  ]);
  for (const row of report.items) {
    details.addRow(
      [
        row.hotelName,
        row.orderNumber,
        row.orderId,
        row.guestPhone,
        taipeiDateTime(row.checkinAt),
        creditStatusLabel(row.status),
        creditCategoryLabels[row.category],
        row.planName,
        row.totalPrice,
        taipeiDateTime(row.redeemedAt),
        row.grossAmount,
        taipeiDateTime(row.refundedAt),
        row.refundAmount,
        row.netAmount,
        row.lifetimeGrossAmount,
        row.lifetimeRefundAmount,
        row.unrefundedAmount,
        creditRefundLabel(row.refundStatus),
        row.reviewReasons.join('、'),
        row.id,
        row.expectedAmount,
      ].map((value) => safeCreditCell(value)),
    );
  }
  details.columns.forEach((column, index) => {
    column.width = [0, 2, 7, 18, 19].includes(index) ? 30 : 23;
    column.numFmt = [8, 10, 12, 13, 14, 15, 16, 20].includes(index)
      ? '#,##0.00'
      : '@';
  });
  details.getRow(1).font = { bold: true };
  details.views = [{ state: 'frozen', ySplit: 1 }];
  details.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, details.rowCount), column: 21 },
  };
  return workbook;
}

export async function downloadCreditWorkbook(
  report: CreditReport,
  stillCurrent: () => boolean = () => true,
): Promise<void> {
  if (report.items.length !== report.total)
    throw new Error('匯出資料不完整，請重新查詢');
  const workbook = await buildCreditWorkbook(report);
  const buffer = await workbook.xlsx.writeBuffer();
  if (!stillCurrent()) return;
  const blob = new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Yumie金扣抵_${report.filters.mode}_${report.filters.startDate}_${report.filters.endDate}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
