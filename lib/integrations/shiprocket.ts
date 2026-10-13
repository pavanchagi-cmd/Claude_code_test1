import 'server-only';
import { cached } from '@/lib/cache';
import { configured } from '@/lib/env';

export type Serviceability = {
  serviceable: boolean;
  cod: boolean;
  etdDays: number | null;
  deliveryDate: string | null; // ISO date
  courier?: string;
};

export type ShipmentInput = {
  orderNumber: string;
  orderDate: Date;
  paymentMethod: 'Prepaid' | 'COD';
  subTotalRupees: number;
  customer: { name: string; phone: string; email?: string | null };
  address: { line1: string; line2?: string | null; city: string; state: string; pincode: string };
  items: { name: string; sku: string; units: number; sellingPriceRupees: number; hsn?: string }[];
  weightKg?: number;
};

export type ShipmentResult = {
  shiprocketOrderId: string;
  shipmentId: string;
  awb: string | null;
  courier: string | null;
  labelUrl: string | null;
  trackingUrl: string | null;
};

export type TrackingEvent = { date: string; status: string; location?: string; activity?: string };

export interface ShippingProvider {
  readonly mock: boolean;
  serviceability(pincode: string, opts?: { weightKg?: number }): Promise<Serviceability>;
  createShipment(input: ShipmentInput): Promise<ShipmentResult>;
  track(awb: string): Promise<TrackingEvent[]>;
}

const BASE = 'https://apiv2.shiprocket.in/v1/external';

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

class ShiprocketLive implements ShippingProvider {
  readonly mock = false;
  private token: { value: string; expires: number } | null = null;

  private async auth(): Promise<string> {
    // Tokens last ~10 days; refresh a day early.
    if (this.token && this.token.expires > Date.now()) return this.token.value;
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
    });
    if (!res.ok) throw new Error(`Shiprocket auth failed: ${res.status}`);
    const json = (await res.json()) as { token: string };
    this.token = { value: json.token, expires: Date.now() + 9 * 24 * 60 * 60 * 1000 };
    return json.token;
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.auth();
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
      cache: 'no-store',
    });
    if (res.status === 401) this.token = null;
    if (!res.ok) throw new Error(`Shiprocket ${path} failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  async serviceability(pincode: string, opts: { weightKg?: number } = {}): Promise<Serviceability> {
    const pickup = process.env.SHIPROCKET_PICKUP_PINCODE;
    if (!pickup) throw new Error('SHIPROCKET_PICKUP_PINCODE is not set');
    return cached(`sr:svc:${pickup}:${pincode}`, 6 * 60 * 60, async () => {
      type Resp = { data?: { available_courier_companies?: { cod: number; etd?: string; estimated_delivery_days?: string; courier_name: string }[] } };
      const q = new URLSearchParams({ pickup_postcode: pickup, delivery_postcode: pincode, weight: String(opts.weightKg ?? 0.5), cod: '1' });
      const json = await this.call<Resp>(`/courier/serviceability/?${q}`);
      const couriers = json.data?.available_courier_companies ?? [];
      if (!couriers.length) return { serviceable: false, cod: false, etdDays: null, deliveryDate: null };
      const best = couriers.reduce((a, b) => (Number(a.estimated_delivery_days ?? 99) <= Number(b.estimated_delivery_days ?? 99) ? a : b));
      const days = Number(best.estimated_delivery_days ?? 5);
      return {
        serviceable: true,
        cod: couriers.some((c) => c.cod === 1),
        etdDays: days,
        deliveryDate: addDays(days),
        courier: best.courier_name,
      };
    });
  }

  async createShipment(input: ShipmentInput): Promise<ShipmentResult> {
    type CreateResp = { order_id: number; shipment_id: number };
    const created = await this.call<CreateResp>('/orders/create/adhoc', {
      method: 'POST',
      body: JSON.stringify({
        order_id: input.orderNumber,
        order_date: input.orderDate.toISOString().slice(0, 16).replace('T', ' '),
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary',
        billing_customer_name: input.customer.name,
        billing_last_name: '',
        billing_address: input.address.line1,
        billing_address_2: input.address.line2 ?? '',
        billing_city: input.address.city,
        billing_pincode: input.address.pincode,
        billing_state: input.address.state,
        billing_country: 'India',
        billing_email: input.customer.email ?? '',
        billing_phone: input.customer.phone,
        shipping_is_billing: true,
        order_items: input.items.map((i) => ({ name: i.name, sku: i.sku, units: i.units, selling_price: i.sellingPriceRupees, hsn: i.hsn })),
        payment_method: input.paymentMethod,
        sub_total: input.subTotalRupees,
        length: 15,
        breadth: 12,
        height: 10,
        weight: input.weightKg ?? 0.5,
      }),
    });
    type AwbResp = { response?: { data?: { awb_code?: string; courier_name?: string } } };
    const awb = await this.call<AwbResp>('/courier/assign/awb', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: created.shipment_id }),
    });
    type LabelResp = { label_url?: string };
    const label = await this.call<LabelResp>('/courier/generate/label', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: [created.shipment_id] }),
    });
    const awbCode = awb.response?.data?.awb_code ?? null;
    return {
      shiprocketOrderId: String(created.order_id),
      shipmentId: String(created.shipment_id),
      awb: awbCode,
      courier: awb.response?.data?.courier_name ?? null,
      labelUrl: label.label_url ?? null,
      trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : null,
    };
  }

  async track(awb: string): Promise<TrackingEvent[]> {
    type Resp = { tracking_data?: { shipment_track_activities?: { date: string; 'sr-status-label'?: string; activity: string; location: string }[] } };
    const json = await this.call<Resp>(`/courier/track/awb/${encodeURIComponent(awb)}`);
    return (json.tracking_data?.shipment_track_activities ?? []).map((a) => ({
      date: a.date,
      status: a['sr-status-label'] ?? a.activity,
      activity: a.activity,
      location: a.location,
    }));
  }
}

/**
 * Mock: every valid pincode is serviceable in 4 days. Pincodes starting with
 * 79 (parts of the North East) are serviceable without COD, and 000000-style
 * pincodes are not serviceable, so all branches can be exercised.
 */
class ShiprocketMock implements ShippingProvider {
  readonly mock = true;
  async serviceability(pincode: string): Promise<Serviceability> {
    if (!/^[1-9]\d{5}$/.test(pincode)) return { serviceable: false, cod: false, etdDays: null, deliveryDate: null };
    const remote = pincode.startsWith('79') || pincode.startsWith('74') || pincode.startsWith('19');
    const days = remote ? 7 : 4;
    return { serviceable: true, cod: !pincode.startsWith('79'), etdDays: days, deliveryDate: addDays(days), courier: 'Mock Express' };
  }
  async createShipment(input: ShipmentInput): Promise<ShipmentResult> {
    const awb = `MOCK${Date.now().toString().slice(-9)}`;
    return {
      shiprocketOrderId: `sr_mock_${input.orderNumber}`,
      shipmentId: `shp_mock_${Date.now()}`,
      awb,
      courier: 'Mock Express',
      labelUrl: null,
      trackingUrl: `/track-order?order=${encodeURIComponent(input.orderNumber)}`,
    };
  }
  async track(): Promise<TrackingEvent[]> {
    return [];
  }
}

export const shipping: ShippingProvider = configured.shiprocket ? new ShiprocketLive() : new ShiprocketMock();

/** Map a Shiprocket status label to our order status. */
export function mapShiprocketStatus(label: string): 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED' | null {
  const s = label.toUpperCase();
  if (s.includes('RTO') && s.includes('DELIVERED')) return 'RETURNED';
  if (s.includes('OUT FOR DELIVERY')) return 'OUT_FOR_DELIVERY';
  if (s === 'DELIVERED' || s.includes(' DELIVERED') || s.startsWith('DELIVERED')) return 'DELIVERED';
  if (s.includes('SHIPPED') || s.includes('IN TRANSIT') || s.includes('PICKED UP')) return 'SHIPPED';
  return null;
}
