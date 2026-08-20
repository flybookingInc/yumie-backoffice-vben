import type { Order } from '#/api/orders';

const CHECKED_OUT_FLY_KIOSK_STATUSES = new Set([
  'checked_out',
  'not_confirmed',
]);
const MINUTES_IN_MILLISECONDS = 60_000;

type RefundCancelOrder = Pick<
  Order,
  | 'checkInDate'
  | 'checkinDatetime'
  | 'checkInTime'
  | 'flyKioskPmsStatus'
  | 'reservedMinutes'
  | 'status'
>;

function isCheckedOutPmsStatus(status?: string): boolean {
  return CHECKED_OUT_FLY_KIOSK_STATUSES.has(status?.trim().toLowerCase() ?? '');
}

function checkinTimestamp(order: RefundCancelOrder): null | number {
  if (order.checkinDatetime) {
    const timestamp = Date.parse(order.checkinDatetime);
    if (Number.isFinite(timestamp)) return timestamp;
  }

  const checkInTime = order.checkInTime ?? '00:00';
  const isMidnightNextDay = checkInTime === '24:00';
  const normalizedTime = isMidnightNextDay ? '00:00' : checkInTime;
  const timestamp = Date.parse(
    `${order.checkInDate}T${normalizedTime}:00+08:00`,
  );
  if (!Number.isFinite(timestamp)) return null;
  return isMidnightNextDay
    ? timestamp + 24 * 60 * MINUTES_IN_MILLISECONDS
    : timestamp;
}

export function canRefundCancel(
  order: RefundCancelOrder,
  now: Date | number = Date.now(),
): boolean {
  if (order.status !== '抵達') return false;
  if (isCheckedOutPmsStatus(order.flyKioskPmsStatus)) return false;

  const checkinAt = checkinTimestamp(order);
  if (
    checkinAt === null ||
    !Number.isFinite(order.reservedMinutes) ||
    order.reservedMinutes <= 0
  ) {
    // Missing timing data must not remove an action that may still be needed.
    return true;
  }

  const nowTimestamp = typeof now === 'number' ? now : now.getTime();
  const checkoutAt =
    checkinAt + order.reservedMinutes * MINUTES_IN_MILLISECONDS;
  return nowTimestamp < checkoutAt;
}
