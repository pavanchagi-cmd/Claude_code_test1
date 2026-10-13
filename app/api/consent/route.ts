import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { db } from '@/lib/db';
import { json, parseBody } from '@/lib/api';

const schema = z.object({ analytics: z.boolean(), marketing: z.boolean() });

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, schema);
  if (err) return err;
  const jar = await cookies();
  let visitorId = jar.get('vid')?.value;
  if (!visitorId) {
    visitorId = crypto.randomBytes(12).toString('hex');
    jar.set('vid', visitorId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  }
  await db.cookieConsent.create({ data: { visitorId, analytics: body.analytics, marketing: body.marketing } });
  return json({ ok: true });
}
