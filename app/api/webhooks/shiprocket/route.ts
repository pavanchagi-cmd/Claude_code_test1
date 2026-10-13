import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { error, json } from '@/lib/api';
import { mapShiprocketStatus } from '@/lib/integrations/shiprocket';
import { canTransition, transitionOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

type Payload = {
  awb?: string | number;
  order_id?: string;
  current_status?: string;
  shipment_status?: string;
  courier_name?: string;
  scans?: { date: string; activity?: string; location?: string; 'sr-status-label'?: string }[];
};

function authorized(req: Request) {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const got = req.headers.get('x-api-key') ?? '';
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/** Updates Shipment events and moves the order through SHIPPED → OUT_FOR_DELIVERY → DELIVERED. */
export async function POST(req: Request) {
  if (!authorized(req)) return error('Unauthorized', 401);
  let p: Payload;
  try {
    p = await req.json();
  } catch {
    return error('Invalid JSON', 400);
  }
  const awb = p.awb ? String(p.awb) : null;
  const shipment = awb ? await db.shipment.findFirst({ where: { awb } }) : null;
  const order = shipment ? await db.order.findUnique({ where: { id: shipment.orderId } }) : p.order_id ? await db.order.findUnique({ where: { number: p.order_id } }) : null;
  if (!order) return json({ ok: true, ignored: 'unknown shipment' });

  const label = p.current_status ?? p.shipment_status ?? '';
  const events = (p.scans ?? []).map((s) => ({ date: s.date, status: s['sr-status-label'] ?? s.activity ?? '', activity: s.activity, location: s.location }));
  await db.shipment.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, awb, courier: p.courier_name ?? null, status: label || 'UPDATED', events },
    update: { status: label || undefined, courier: p.courier_name ?? undefined, ...(events.length ? { events } : {}) },
  });

  const target = mapShiprocketStatus(label);
  if (target && target !== order.status) {
    // Fill in skipped steps (e.g. CONFIRMED → DELIVERED when scans arrive late).
    const path: ('SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED')[] =
      target === 'DELIVERED' ? ['SHIPPED', 'DELIVERED'] : target === 'OUT_FOR_DELIVERY' ? ['SHIPPED', 'OUT_FOR_DELIVERY'] : [target];
    let current = order.status;
    for (const step of path) {
      if (current === step) continue;
      if (canTransition(current, step)) {
        await transitionOrder(order.id, step, 'webhook:shiprocket', label);
        current = step;
      }
    }
  }
  return json({ ok: true });
}
