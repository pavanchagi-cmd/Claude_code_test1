import type { OrderStatus } from '@/lib/generated/prisma/enums';

/** Returns are allowed after delivery, within the configured window (no limit while it is unset). */
export function canRequestReturn(order: { status: OrderStatus; events: { status: OrderStatus; createdAt: Date }[] }, windowDays: number, now = new Date()) {
  if (order.status !== 'DELIVERED') return false;
  if (windowDays <= 0) return true;
  const delivered = [...order.events].reverse().find((e) => e.status === 'DELIVERED')?.createdAt;
  if (!delivered) return true;
  return now.getTime() - delivered.getTime() <= windowDays * 24 * 60 * 60 * 1000;
}
