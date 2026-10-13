'use server';

import { redirect } from 'next/navigation';
import { guarded, optStr, paise, requireAdmin, requireStaff, str } from '@/lib/admin';
import { db } from '@/lib/db';
import type { OrderStatus } from '@/lib/generated/prisma/enums';
import { payments } from '@/lib/integrations/razorpay';
import { shipping } from '@/lib/integrations/shiprocket';
import { enqueueOrderNotification } from '@/lib/notifications';
import { canTransition, transitionOrder } from '@/lib/orders';

export async function changeStatus(fd: FormData) {
  const id = str(fd, 'orderId');
  await guarded(`/admin/orders/${id}`, async () => {
    const user = await requireStaff();
    const to = str(fd, 'status') as OrderStatus;
    await transitionOrder(id, to, user.id, optStr(fd, 'note') ?? undefined);
    redirect(`/admin/orders/${id}?saved=1`);
  });
}

export async function createShipment(fd: FormData) {
  const id = str(fd, 'orderId');
  await guarded(`/admin/orders/${id}`, async () => {
    const user = await requireStaff();
    const order = await db.order.findUniqueOrThrow({ where: { id }, include: { items: true, shipment: true } });
    if (order.shipment?.awb) throw new Error('A shipment already exists for this order.');
    if (!['CONFIRMED', 'PACKED'].includes(order.status)) throw new Error('Only confirmed or packed orders can be shipped.');
    const addr = order.shippingAddress as { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string };
    const res = await shipping.createShipment({
      orderNumber: order.number,
      orderDate: order.createdAt,
      paymentMethod: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      subTotalRupees: order.totalPaise / 100,
      customer: { name: addr.name, phone: order.contactPhone, email: order.contactEmail },
      address: addr,
      items: order.items.map((i) => ({ name: i.productName, sku: i.sku, units: i.qty, sellingPriceRupees: i.pricePaise / 100, hsn: i.hsnCode })),
    });
    await db.shipment.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        shiprocketOrderId: res.shiprocketOrderId,
        shipmentId: res.shipmentId,
        awb: res.awb,
        courier: res.courier,
        labelUrl: res.labelUrl,
        trackingUrl: res.trackingUrl,
        status: 'AWB_ASSIGNED',
      },
      update: {
        shiprocketOrderId: res.shiprocketOrderId,
        shipmentId: res.shipmentId,
        awb: res.awb,
        courier: res.courier,
        labelUrl: res.labelUrl,
        trackingUrl: res.trackingUrl,
        status: 'AWB_ASSIGNED',
      },
    });
    if (order.status === 'CONFIRMED') await transitionOrder(id, 'PACKED', user.id, `Shipment created · AWB ${res.awb ?? 'pending'}`);
    redirect(`/admin/orders/${id}?saved=1`);
  });
}

export async function markCodReceived(fd: FormData) {
  const id = str(fd, 'orderId');
  await guarded(`/admin/orders/${id}`, async () => {
    const user = await requireStaff();
    const order = await db.order.findUniqueOrThrow({ where: { id } });
    if (order.paymentMethod !== 'COD') throw new Error('Not a COD order.');
    await db.$transaction([
      db.order.update({ where: { id }, data: { paymentStatus: 'COD_RECEIVED' } }),
      db.orderEvent.create({ data: { orderId: id, status: order.status, actor: user.id, note: 'COD remittance received' } }),
    ]);
    redirect(`/admin/orders/${id}?saved=1`);
  });
}

/** Refund via the Razorpay Refunds API (prepaid) or record a manual refund (COD). ADMIN only. */
export async function refundOrder(fd: FormData) {
  const id = str(fd, 'orderId');
  await guarded(`/admin/orders/${id}`, async () => {
    const user = await requireAdmin();
    const order = await db.order.findUniqueOrThrow({ where: { id } });
    const amount = paise(fd, 'amount') ?? order.totalPaise;
    if (amount <= 0 || amount > order.totalPaise) throw new Error('Refund amount must be between ₹1 and the order total.');
    let note: string;
    if (order.paymentMethod !== 'COD' && order.razorpayPaymentId) {
      const r = await payments.refund({ paymentId: order.razorpayPaymentId, amountPaise: amount, notes: { order: order.number } });
      note = `Refund ${r.id} (${r.status}) for ₹${amount / 100}`;
    } else {
      note = `Manual refund recorded for ₹${amount / 100}${optStr(fd, 'reference') ? ` · ref ${optStr(fd, 'reference')}` : ''}`;
    }
    const full = amount >= order.totalPaise;
    await db.$transaction([
      db.order.update({ where: { id }, data: { paymentStatus: full ? 'REFUNDED' : order.paymentStatus } }),
      db.orderEvent.create({ data: { orderId: id, status: order.status, actor: user.id, note } }),
    ]);
    if (full && canTransition(order.status, 'REFUNDED')) await transitionOrder(id, 'REFUNDED', user.id, note);
    else await enqueueOrderNotification(id, 'refunded', note);
    redirect(`/admin/orders/${id}?saved=1`);
  });
}

export async function updateReturn(fd: FormData) {
  const id = str(fd, 'returnId');
  await guarded('/admin/returns', async () => {
    const user = await requireStaff();
    const action = str(fd, 'action');
    const ret = await db.returnRequest.findUniqueOrThrow({ where: { id }, include: { order: true, orderItem: true } });
    if (action === 'approve') {
      await db.returnRequest.update({ where: { id }, data: { status: 'APPROVED' } });
      await enqueueOrderNotification(ret.orderId, 'return_update', 'Your return has been approved. Our courier partner will contact you to schedule the pickup.');
    } else if (action === 'reject') {
      await db.returnRequest.update({ where: { id }, data: { status: 'REJECTED' } });
      if (ret.order.status === 'RETURN_REQUESTED') await transitionOrder(ret.orderId, 'DELIVERED', user.id, `Return rejected: ${optStr(fd, 'note') ?? ''}`);
      await enqueueOrderNotification(ret.orderId, 'return_update', `Your return request was not approved. ${optStr(fd, 'note') ?? 'Please contact us for details.'}`);
    } else if (action === 'picked_up') {
      await db.returnRequest.update({ where: { id }, data: { status: 'PICKED_UP' } });
      if (ret.orderItem.variantId) await db.variant.update({ where: { id: ret.orderItem.variantId }, data: { stock: { increment: ret.orderItem.qty } } });
      if (canTransition(ret.order.status, 'RETURNED')) await transitionOrder(ret.orderId, 'RETURNED', user.id, 'Return picked up and restocked');
    } else if (action === 'refund') {
      await requireAdmin();
      const amount = paise(fd, 'amount') ?? ret.orderItem.pricePaise * ret.orderItem.qty;
      const order = ret.order;
      let note = `Refund for return of ${ret.orderItem.productName}: ₹${amount / 100}`;
      if (order.paymentMethod !== 'COD' && order.razorpayPaymentId) {
        const r = await payments.refund({ paymentId: order.razorpayPaymentId, amountPaise: amount, notes: { order: order.number, return: id } });
        note += ` · Razorpay ${r.id}`;
      }
      await db.returnRequest.update({ where: { id }, data: { status: 'REFUNDED', refundPaise: amount } });
      await db.orderEvent.create({ data: { orderId: order.id, status: order.status, actor: user.id, note } });
      if (canTransition(order.status, 'REFUNDED')) await transitionOrder(order.id, 'REFUNDED', user.id, note);
    }
    redirect('/admin/returns?saved=1');
  });
}
