import { z } from 'zod';
import { error, json, parseBody } from '@/lib/api';
import { sendOtp } from '@/lib/otp';
import { clientIp } from '@/lib/rate-limit';
import { phoneSchema } from '@/lib/validation/schemas';

const schema = z.object({ phone: phoneSchema });

export async function POST(req: Request) {
  const [body, err] = await parseBody(req, schema);
  if (err) return err;
  const res = await sendOtp(body.phone, await clientIp());
  if (!res.ok) return error(res.error, 429);
  return json({ ok: true, resendAfter: 30 });
}
