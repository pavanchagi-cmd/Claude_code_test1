import type { OrderStatus } from '@/lib/generated/prisma/enums';

const STEPS: { key: OrderStatus; label: string; hint: string }[] = [
  { key: 'CONFIRMED', label: 'Confirmed', hint: 'Today' },
  { key: 'PACKED', label: 'Packed', hint: 'Within 24 hrs' },
  { key: 'SHIPPED', label: 'Shipped', hint: 'Tracking link by SMS' },
  { key: 'DELIVERED', label: 'Delivered', hint: '[DATE]' },
];

const RANK: Partial<Record<OrderStatus, number>> = { CONFIRMED: 0, PACKED: 1, SHIPPED: 2, OUT_FOR_DELIVERY: 2, DELIVERED: 3, RETURN_REQUESTED: 3, RETURNED: 3, REFUNDED: 3 };

export function OrderTimeline({ status, events, expected }: { status: OrderStatus; events: { status: OrderStatus; createdAt: Date }[]; expected?: string | null }) {
  const rank = RANK[status] ?? -1;
  const when = (k: OrderStatus) => events.find((e) => e.status === k)?.createdAt;
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <ol className="mt-6 grid grid-cols-2 gap-x-2 gap-y-5 md:grid-cols-4" aria-label="Delivery status">
      {STEPS.map((s, i) => {
        const done = i <= rank;
        const at = when(s.key) ?? (s.key === 'SHIPPED' ? when('OUT_FOR_DELIVERY') : undefined);
        return (
          <li key={s.key} aria-current={i === rank ? 'step' : undefined}>
            <span className={`block h-[5px] ${done ? 'bg-success' : 'bg-line'}`} aria-hidden="true" />
            <span className="mt-4 block text-[15px] font-semibold">
              {s.label}
              <span className="sr-only">{done ? ' (done)' : ' (pending)'}</span>
            </span>
            <span className="mt-1 block text-[14px] text-muted">
              {at ? fmt(at) : s.key === 'DELIVERED' && expected ? expected : s.key === 'CONFIRMED' && done ? 'Today' : s.hint}
              {s.key === 'SHIPPED' && status === 'OUT_FOR_DELIVERY' ? ' · Out for delivery' : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return requested',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};
