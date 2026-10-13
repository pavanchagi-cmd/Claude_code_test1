import { Button, Column, Row, Text } from '@react-email/components';
import { EmailLayout, emailColors } from './layout';

export type OrderEmailProps = {
  brandName: string;
  kind: 'confirmed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'return_update' | 'refunded';
  customerName: string;
  orderNumber: string;
  orderUrl: string;
  totalLabel: string;
  items: { name: string; qty: number; priceLabel: string }[];
  trackingUrl?: string | null;
  note?: string | null;
};

const headline: Record<OrderEmailProps['kind'], string> = {
  confirmed: 'Thank you, your order is confirmed',
  shipped: 'Your order is on its way',
  out_for_delivery: 'Your order is out for delivery',
  delivered: 'Your order has been delivered',
  cancelled: 'Your order was cancelled',
  return_update: 'An update on your return',
  refunded: 'Your refund has been processed',
};

export default function OrderUpdateEmail(p: OrderEmailProps) {
  return (
    <EmailLayout preview={`${headline[p.kind]} · #${p.orderNumber}`} brandName={p.brandName}>
      <Text style={{ fontFamily: 'Georgia, serif', fontSize: 26, margin: '0 0 8px' }}>{headline[p.kind]}</Text>
      <Text style={{ fontSize: 15, color: emailColors.muted }}>
        Hi {p.customerName || 'there'}, order <strong>#{p.orderNumber}</strong>
        {p.kind === 'confirmed' ? ' has been placed. Your GST invoice is attached.' : '.'}
      </Text>
      {p.note ? <Text style={{ fontSize: 15 }}>{p.note}</Text> : null}
      {p.items.map((i) => (
        <Row key={i.name} style={{ borderBottom: `1px solid ${emailColors.line}` }}>
          <Column style={{ padding: '10px 0', fontSize: 15 }}>
            {i.name} × {i.qty}
          </Column>
          <Column align="right" style={{ fontSize: 15 }}>
            {i.priceLabel}
          </Column>
        </Row>
      ))}
      <Text style={{ fontSize: 16, fontWeight: 700, textAlign: 'right' }}>Total {p.totalLabel}</Text>
      {p.trackingUrl ? (
        <Button href={p.trackingUrl} style={{ background: emailColors.ink, color: '#F7F6F3', padding: '14px 24px', fontWeight: 700, marginRight: 12 }}>
          Track order
        </Button>
      ) : null}
      <Button href={p.orderUrl} style={{ border: `1px solid ${emailColors.ink}`, color: emailColors.ink, padding: '13px 24px', fontWeight: 700 }}>
        View order
      </Button>
    </EmailLayout>
  );
}
