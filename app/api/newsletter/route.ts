import { z } from 'zod';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { emailSchema } from '@/lib/validation/schemas';

const schema = z.object({
  email: emailSchema,
  consent: z.literal(true, { message: 'Please agree to receive emails.' }),
  source: z.string().max(40).default('home'),
  website: z.string().max(200).optional().nullable(), // honeypot
});

export async function POST(req: Request) {
  if (!(await rateLimit(`newsletter:${await clientIp()}`, 5, 600))) return error('Too many requests. Please try again later.', 429);
  const [body, err] = await parseBody(req, schema);
  if (err) return err;
  if (body.website) return json({ ok: true }); // bot
  await db.newsletterSubscriber.upsert({
    where: { email: body.email },
    create: { email: body.email, consentAt: new Date(), source: body.source },
    update: { consentAt: new Date() },
  });
  return json({ ok: true });
}
