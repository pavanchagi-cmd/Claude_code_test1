import { db } from '@/lib/db';
import { error, json, parseBody } from '@/lib/api';
import { enqueueEmailJob } from '@/lib/notifications';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getSettings } from '@/lib/settings';
import { contactSchema } from '@/lib/validation/schemas';

export async function POST(req: Request) {
  if (!(await rateLimit(`contact:${await clientIp()}`, 5, 3600))) return error('Too many messages. Please try again later or WhatsApp us.', 429);
  const [body, err] = await parseBody(req, contactSchema);
  if (err) return err;
  if (body.website) return json({ ok: true, ticket: 'received' }); // honeypot: pretend success
  const ticket = await db.supportTicket.create({
    data: { name: body.name, contact: body.contact, topic: body.topic, orderNumber: body.orderNumber || null, message: body.message },
  });
  const s = await getSettings();
  if (s.supportEmail.includes('@') && !s.supportEmail.includes('[')) {
    await enqueueEmailJob({
      template: 'support',
      to: s.supportEmail,
      subject: `New support ticket: ${body.topic}`,
      title: `${body.name} (${body.contact})`,
      body: `${body.orderNumber ? `Order ${body.orderNumber}. ` : ''}${body.message}`,
    });
  }
  return json({ ok: true, ticket: ticket.id.slice(-6).toUpperCase() });
}
