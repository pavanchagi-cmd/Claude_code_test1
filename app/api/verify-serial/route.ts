import { z } from 'zod';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const schema = z.object({ serial: z.string().trim().toUpperCase().min(4).max(40) });

/** Genuine / not found only: never exposes who owns the watch. */
export async function POST(req: Request) {
  if (!(await rateLimit(`verify:${await clientIp()}`, 10, 600))) return error('Too many lookups. Please try again later.', 429);
  const [body, err] = await parseBody(req, schema);
  if (err) return err;
  const [unit, reg] = await Promise.all([
    db.productUnit.findUnique({ where: { serialNumber: body.serial } }),
    db.warrantyRegistration.findUnique({ where: { serialNumber: body.serial }, select: { endsAt: true } }),
  ]);
  if (!unit && !reg) return json({ genuine: false });
  return json({ genuine: true, warrantyActive: reg ? reg.endsAt > new Date() : null });
}
