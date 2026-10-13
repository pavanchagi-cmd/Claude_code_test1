import { error, json } from '@/lib/api';
import { lookupPincode, isValidPincode } from '@/lib/integrations/pincode';
import { shipping } from '@/lib/integrations/shiprocket';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/** Serviceability (Shiprocket, cached 6h) plus city/state for address auto-fill. */
export async function GET(req: Request) {
  const pin = new URL(req.url).searchParams.get('pin')?.trim() ?? '';
  if (!isValidPincode(pin)) return error('Enter a valid 6-digit pincode.', 422);
  if (!(await rateLimit(`pincode:${await clientIp()}`, 30, 60))) return error('Too many requests. Please wait a minute.', 429);
  const [svc, place] = await Promise.all([
    shipping.serviceability(pin).catch((e) => {
      console.error('[pincode] serviceability failed', e);
      return null;
    }),
    lookupPincode(pin),
  ]);
  return json({
    pincode: pin,
    serviceable: svc?.serviceable ?? true,
    cod: svc?.cod ?? false,
    deliveryDate: svc?.deliveryDate ?? null,
    etdDays: svc?.etdDays ?? null,
    city: place?.city ?? null,
    state: place?.state ?? null,
    checked: Boolean(svc),
  });
}
