import 'server-only';
import { createElement } from 'react';
import { db } from '@/lib/db';
import { siteUrl } from '@/lib/env';
import { email } from '@/lib/integrations/resend';
import { sms } from '@/lib/integrations/msg91';
import { whatsapp } from '@/lib/integrations/whatsapp';
import { formatPaise } from '@/lib/money';
import { getSettings } from '@/lib/settings';
import OrderUpdateEmail, { type OrderEmailProps } from '@/emails/order-update';

export type OrderNotificationKind = OrderEmailProps['kind'];

type JobPayload = { orderId: string; kind: OrderNotificationKind; channel: 'email' | 'sms' | 'whatsapp'; note?: string };

const SMS_KINDS: OrderNotificationKind[] = ['confirmed', 'shipped', 'out_for_delivery', 'delivered'];

/** Queue order notifications so checkout never waits on email/SMS providers. */
export async function enqueueOrderNotification(orderId: string, kind: OrderNotificationKind, note?: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { contactEmail: true, whatsappOptIn: true } });
  if (!order) return;
  const jobs: JobPayload[] = [];
  if (order.contactEmail) jobs.push({ orderId, kind, channel: 'email', note });
  if (SMS_KINDS.includes(kind)) {
    jobs.push({ orderId, kind, channel: 'sms' });
    if (order.whatsappOptIn) jobs.push({ orderId, kind, channel: 'whatsapp' });
  }
  if (jobs.length) await db.job.createMany({ data: jobs.map((payload) => ({ type: payload.channel, payload })) });
}

export async function enqueueEmailJob(payload: Record<string, unknown>) {
  await db.job.create({ data: { type: 'email-generic', payload: payload as object } });
}

function orderUrl(number: string, token: string) {
  return `${siteUrl()}/order/${encodeURIComponent(number)}/confirmed?t=${token}`;
}

async function runOrderJob(p: JobPayload) {
  const order = await db.order.findUnique({ where: { id: p.orderId }, include: { items: true, shipment: true, invoice: true } });
  if (!order) return;
  const s = await getSettings();
  const address = order.shippingAddress as { name?: string };
  const url = orderUrl(order.number, order.accessToken);
  const trackingUrl = order.shipment?.trackingUrl ?? `${siteUrl()}/track-order?order=${order.number}`;

  if (p.channel === 'email' && order.contactEmail) {
    const attachments = [];
    if (p.kind === 'confirmed' && order.invoice) {
      const { renderInvoicePdf } = await import('@/lib/pdf/invoice');
      attachments.push({ filename: `${order.invoice.number.replace(/\//g, '-')}.pdf`, content: await renderInvoicePdf(order.id) });
    }
    await email.send({
      to: order.contactEmail,
      subject:
        {
          confirmed: `Order #${order.number} confirmed`,
          shipped: `Order #${order.number} has shipped`,
          out_for_delivery: `Order #${order.number} is out for delivery`,
          delivered: `Order #${order.number} delivered`,
          cancelled: `Order #${order.number} cancelled`,
          return_update: `Return update for order #${order.number}`,
          refunded: `Refund processed for order #${order.number}`,
        }[p.kind] ?? `Update on order #${order.number}`,
      react: createElement(OrderUpdateEmail, {
        brandName: s.brandName,
        kind: p.kind,
        customerName: address.name ?? '',
        orderNumber: order.number,
        orderUrl: url,
        totalLabel: formatPaise(order.totalPaise),
        items: order.items.map((i) => ({ name: i.productName, qty: i.qty, priceLabel: formatPaise(i.pricePaise * i.qty) })),
        trackingUrl: ['shipped', 'out_for_delivery'].includes(p.kind) ? trackingUrl : null,
        note: p.note,
      }),
      attachments,
    });
  }

  if (p.channel === 'sms') {
    // DLT-registered template ids per event, e.g. MSG91_TEMPLATE_SHIPPED.
    const template = process.env[`MSG91_TEMPLATE_${p.kind.toUpperCase()}`];
    if (!template && !sms.mock) {
      console.warn(`[notify] no MSG91 template for ${p.kind}; skipping SMS`);
      return;
    }
    await sms.sendTemplate(order.contactPhone, template ?? `mock-${p.kind}`, { order: order.number, link: ['shipped', 'out_for_delivery'].includes(p.kind) ? trackingUrl : url });
  }

  if (p.channel === 'whatsapp' && order.whatsappOptIn) {
    await whatsapp.sendTemplate(order.contactPhone, `order_${p.kind}`, [
      address.name ?? 'there',
      order.number,
      ['shipped', 'out_for_delivery'].includes(p.kind) ? trackingUrl : url,
    ]);
  }
}

/** Drain the job queue (called by Vercel Cron every minute). */
export async function processJobs(limit = 25) {
  const jobs = await db.job.findMany({ where: { status: 'PENDING', runAt: { lte: new Date() } }, orderBy: { runAt: 'asc' }, take: limit });
  let done = 0;
  for (const job of jobs) {
    // Claim the job so overlapping cron runs do not double-send.
    const claimed = await db.job.updateMany({ where: { id: job.id, status: 'PENDING', attempts: job.attempts }, data: { attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try {
      if (job.type === 'email' || job.type === 'sms' || job.type === 'whatsapp') await runOrderJob(job.payload as unknown as JobPayload);
      else if (job.type === 'email-generic') await runGenericEmail(job.payload as Record<string, unknown>);
      await db.job.update({ where: { id: job.id }, data: { status: 'DONE', lastError: null } });
      done++;
    } catch (err) {
      const attempts = job.attempts + 1;
      await db.job.update({
        where: { id: job.id },
        data: {
          status: attempts >= 5 ? 'FAILED' : 'PENDING',
          lastError: String(err).slice(0, 500),
          runAt: new Date(Date.now() + 2 ** attempts * 60 * 1000),
        },
      });
    }
  }
  return { processed: jobs.length, done };
}

async function runGenericEmail(p: Record<string, unknown>) {
  const s = await getSettings();
  if (p.template === 'warranty') {
    const { default: WarrantyCardEmail } = await import('@/emails/warranty-card');
    const { renderWarrantyPdf } = await import('@/lib/pdf/warranty');
    const pdf = await renderWarrantyPdf(String(p.registrationId));
    await email.send({
      to: String(p.to),
      subject: 'Your digital warranty card',
      react: createElement(WarrantyCardEmail, { brandName: s.brandName, productName: String(p.productName), serialNumber: String(p.serialNumber), endsAt: String(p.endsAt) }),
      attachments: [{ filename: `warranty-${p.serialNumber}.pdf`, content: pdf }],
    });
  } else if (p.template === 'alert') {
    const { default: AlertEmail } = await import('@/emails/alert');
    await email.send({
      to: String(p.to),
      subject: String(p.subject),
      react: createElement(AlertEmail, { brandName: s.brandName, title: String(p.title), body: String(p.body), url: String(p.url), cta: String(p.cta ?? 'View') }),
    });
  } else if (p.template === 'support') {
    const { default: AlertEmail } = await import('@/emails/alert');
    await email.send({
      to: String(p.to),
      subject: String(p.subject),
      react: createElement(AlertEmail, { brandName: s.brandName, title: String(p.title), body: String(p.body), url: `${siteUrl()}/admin/tickets`, cta: 'Open admin' }),
    });
  }
}
