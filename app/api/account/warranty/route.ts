import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { enqueueEmailJob } from '@/lib/notifications';

const schema = z.object({
  orderItemId: z.string().min(1).max(40),
  serialNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{4,40}$/, 'Enter the serial number exactly as printed on your certificate.'),
});

/** Register a delivered watch: creates a WarrantyRegistration and emails the digital card. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return error('Please sign in.', 401);
  const [body, err] = await parseBody(req, schema);
  if (err) return err;
  const item = await db.orderItem.findFirst({
    where: { id: body.orderItemId, order: { userId: user.id, status: { in: ['DELIVERED', 'RETURN_REQUESTED'] } } },
    include: { order: { include: { events: true } }, warranty: true },
  });
  if (!item) return error('Choose a delivered watch from your orders.', 404);
  if (item.warranty) return error('This watch is already registered.', 409);
  const taken = await db.warrantyRegistration.findUnique({ where: { serialNumber: body.serialNumber } });
  if (taken) return error('This serial number is already registered. Contact us if you think this is a mistake.', 409);

  const delivered = [...item.order.events].reverse().find((e) => e.status === 'DELIVERED')?.createdAt ?? new Date();
  const endsAt = new Date(delivered);
  endsAt.setMonth(endsAt.getMonth() + (item.warrantyMonths || 24));
  const reg = await db.warrantyRegistration.create({ data: { userId: user.id, orderItemId: item.id, serialNumber: body.serialNumber, startsAt: delivered, endsAt } });
  await db.productUnit.upsert({ where: { serialNumber: body.serialNumber }, create: { serialNumber: body.serialNumber, productId: item.productId }, update: {} });

  const email = item.order.contactEmail ?? user.email;
  if (email) {
    await enqueueEmailJob({
      template: 'warranty',
      to: email,
      registrationId: reg.id,
      productName: item.productName,
      serialNumber: reg.serialNumber,
      endsAt: endsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    });
  }
  return json({ ok: true, id: reg.id });
}
