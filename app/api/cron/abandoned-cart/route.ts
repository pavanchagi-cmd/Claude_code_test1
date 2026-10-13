import { error, json } from '@/lib/api';
import { isCronAuthorized } from '@/lib/cron';
import { db } from '@/lib/db';
import { siteUrl } from '@/lib/env';
import { formatPaise } from '@/lib/money';
import { enqueueEmailJob } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/** Hourly: abandoned-cart reminders plus wishlist price-drop and back-in-stock alerts. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return error('Unauthorized', 401);
  const now = Date.now();

  const carts = await db.cart.findMany({
    where: {
      reminderSentAt: null,
      updatedAt: { lt: new Date(now - 3 * 60 * 60 * 1000), gt: new Date(now - 48 * 60 * 60 * 1000) },
      items: { some: {} },
      user: { email: { not: null }, marketingConsent: true },
    },
    include: { user: true, items: { include: { variant: { include: { product: true } } } } },
    take: 100,
  });
  for (const c of carts) {
    await enqueueEmailJob({
      template: 'alert',
      to: c.user!.email,
      subject: 'You left something in your cart',
      title: 'Still thinking it over?',
      body: `${c.items.map((i) => i.variant.product.name).join(', ')} ${c.items.length === 1 ? 'is' : 'are'} waiting in your cart.`,
      url: `${siteUrl()}/cart`,
      cta: 'Return to cart',
    });
    await db.cart.update({ where: { id: c.id }, data: { reminderSentAt: new Date() } });
  }

  const watches = await db.wishlistItem.findMany({
    where: { userId: { not: null }, OR: [{ notifyPriceDrop: true }, { notifyRestock: true }], user: { email: { not: null } } },
    include: { user: true, product: { include: { variants: true } } },
    take: 500,
  });
  let alerts = 0;
  for (const w of watches) {
    const price = Math.min(...w.product.variants.map((v) => v.pricePaise));
    const inStock = w.product.variants.some((v) => v.stock - v.reserved > 0);
    const url = `${siteUrl()}/watch/${w.product.slug}`;
    if (w.notifyPriceDrop && w.lastPricePaise && price < w.lastPricePaise) {
      await enqueueEmailJob({
        template: 'alert',
        to: w.user!.email,
        subject: `Price drop: ${w.product.name}`,
        title: `${w.product.name} is now ${formatPaise(price)}`,
        body: `Down from ${formatPaise(w.lastPricePaise)}.`,
        url,
        cta: 'View watch',
      });
      alerts++;
    }
    if (w.notifyRestock && inStock && w.lastPricePaise !== null && w.lastPricePaise < 0) {
      await enqueueEmailJob({
        template: 'alert',
        to: w.user!.email,
        subject: `Back in stock: ${w.product.name}`,
        title: `${w.product.name} is back`,
        body: 'It is back in stock. Popular pieces sell out quickly.',
        url,
        cta: 'View watch',
      });
      alerts++;
    }
    // lastPricePaise < 0 marks "was out of stock at last check".
    await db.wishlistItem.update({ where: { id: w.id }, data: { lastPricePaise: inStock ? price : -1 } });
  }
  return json({ cartReminders: carts.length, wishlistAlerts: alerts });
}
