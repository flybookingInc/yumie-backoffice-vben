/**
 * 後端訂單的 `checkinDatetime` 是 UTC ISO 字串（例：2026-07-31T06:00:00.000Z
 * 代表台灣時間 14:00）。直接 slice 字串顯示會固定少 8 小時，
 * 一律用這裡的 helper 換算成 Asia/Taipei 再顯示。
 *
 * 注意：`checkInTime` / `check_in_date` 欄位本身已是台灣時間字串，可直接顯示。
 */

const TAIPEI = 'Asia/Taipei';

function toDate(iso?: null | string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** UTC ISO → Asia/Taipei 的 `YYYY-MM-DD HH:mm:ss`；無效輸入回 `-` */
export function taipeiDateTime(iso?: null | string): string {
  const d = toDate(iso);
  if (!d) return '-';
  const date = d.toLocaleDateString('en-CA', { timeZone: TAIPEI });
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
    timeZone: TAIPEI,
  });
  return `${date} ${time}`;
}

/** UTC ISO → Asia/Taipei 的 `HH:mm`；無效輸入回 `-` */
export function taipeiTime(iso?: null | string): string {
  const d = toDate(iso);
  if (!d) return '-';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: TAIPEI,
  });
}
