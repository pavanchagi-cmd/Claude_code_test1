import { z } from 'zod';
import { createSessionFor } from '@/lib/auth';
import { mergeGuestCart } from '@/lib/cart';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { verifyOtp } from '@/lib/otp';
import { phoneSchema } from '@/lib/validation/schemas';

const schema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit OTP.'),
});

/** Verify the OTP, create the account on first verify, start a 30-day database session. */
export async function POST(req: Request) {
  const [body, err] = await parseBody(req, schema);
  if (err) return err;
  const res = await verifyOtp(body.phone, body.code);
  if (!res.ok) return error(res.error, 401);

  const user = await db.user.upsert({
    where: { phone: body.phone },
    create: { phone: body.phone, phoneVerified: new Date() },
    update: { phoneVerified: new Date() },
  });
  await createSessionFor(user.id);
  await mergeGuestCart(user.id);
  // Link past guest orders placed with this number.
  await db.order.updateMany({ where: { userId: null, contactPhone: body.phone }, data: { userId: user.id } });
  return json({ ok: true, isNew: !user.name });
}
