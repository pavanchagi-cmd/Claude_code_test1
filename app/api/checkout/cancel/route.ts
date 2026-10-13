import { z } from 'zod';
import { error, json, parseBody } from '@/lib/api';
import { failOrder, getOrderForViewer } from '@/lib/orders';

const schema = z.object({ orderId: z.string().min(1).max(40), token: z.string().min(10).max(100) });

/** Buyer closed the payment window: release the stock reservation now. */
export async function POST(req: Request) {
  const [body, err] = await parseBody(req, schema);
  if (err) return err;
  const order = await getOrderForViewer(body.orderId, { token: body.token });
  if (!order) return error('Order not found.', 404);
  if (order.status === 'PENDING_PAYMENT') await failOrder(order.id, 'customer', 'Payment window closed before paying');
  return json({ ok: true });
}
