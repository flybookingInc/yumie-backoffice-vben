import { Workbook } from 'exceljs';
import { describe, expect, it } from 'vitest';

import {
  buildCreditWorkbook,
  downloadCreditWorkbook,
} from '../yumie-credit-export';
import { sampleReport, sampleRow } from './yumie-credit-fixture';

describe('credit report XLSX', () => {
  it('creates two real worksheets, full details, typed money and safe text', async () => {
    const report = sampleReport({
      items: [
        { ...sampleRow, orderNumber: '00131', hotelName: '=HYPERLINK("bad")' },
        {
          ...sampleRow,
          id: 'spend-2',
          orderNumber: '33391',
          grossAmount: 126,
          refundAmount: 0,
          netAmount: 126,
        },
      ],
      total: 2,
    });
    const workbook = await buildCreditWorkbook(report);
    const data = await workbook.xlsx.writeBuffer();
    const readback = new Workbook();
    await readback.xlsx.load(data);
    expect(readback.worksheets.map((sheet) => sheet.name)).toEqual([
      '統計',
      '扣抵／退還明細',
    ]);
    const sheet = readback.getWorksheet('扣抵／退還明細');
    if (!sheet) throw new Error('detail sheet not found');
    expect(sheet.rowCount).toBe(3);
    expect(sheet.getCell('U1').value).toBe('扣抵參考金額');
    expect(readback.getWorksheet('統計')?.getCell('B7').value).toContain(
      '仍待帳本核對，不代表已確認扣抵',
    );
    expect(sheet.getCell('A2').value).toBe('\'=HYPERLINK("bad")');
    expect(sheet.getCell('B2').value).toBe('00131');
    expect(sheet.getCell('K2').value).toBe(111);
    expect(sheet.getCell('K3').value).toBe(126);
    expect(sheet.getCell('E2').value).toBe('2026-09-19 14:00:00');
  });
  it('rejects a partial-page export instead of producing an incomplete workbook', async () => {
    await expect(
      downloadCreditWorkbook(sampleReport({ total: 51 })),
    ).rejects.toThrow('不完整');
  });
});
