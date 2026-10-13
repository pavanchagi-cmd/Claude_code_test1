import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { profileSchema } from '@/lib/validation/schemas';

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return error('Please sign in.', 401);
  const [body, err] = await parseBody(req, profileSchema);
  if (err) return err;
  if (body.email) {
    const clash = await db.user.findFirst({ where: { email: body.email, NOT: { id: user.id } } });
    if (clash) return error('This email is linked to another account.', 409);
  }
  const existing = await db.user.findUnique({ where: { id: user.id } });
  await db.user.update({
    where: { id: user.id },
    data: {
      name: body.name,
      email: body.email || null,
      wristSizeCm: typeof body.wristSizeCm === 'number' && !Number.isNaN(body.wristSizeCm) ? body.wristSizeCm : null,
      marketingConsent: body.marketingConsent,
      marketingConsentAt: body.marketingConsent && !existing?.marketingConsent ? new Date() : body.marketingConsent ? existing?.marketingConsentAt : null,
    },
  });
  return json({ ok: true });
}
