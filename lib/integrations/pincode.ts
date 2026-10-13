import 'server-only';
import data from '@/data/pincodes.json';
import { cached } from '@/lib/cache';

export type PincodeInfo = { pincode: string; city: string | null; state: string | null };

const dataset = data as { prefixes: Record<string, string>; cities: Record<string, string> };

export function isValidPincode(pin: string) {
  return /^[1-9]\d{5}$/.test(pin);
}

/** Pincode → city/state using the bundled dataset, with the public India Post API for the city. */
export async function lookupPincode(pin: string): Promise<PincodeInfo | null> {
  if (!isValidPincode(pin)) return null;
  const state = dataset.prefixes[pin.slice(0, 3)] ?? null;
  const city = dataset.cities[pin] ?? null;
  if (city && state) return { pincode: pin, city, state };

  try {
    const remote = await cached(`pin:${pin}`, 7 * 24 * 60 * 60, async () => {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(2500) });
      if (!res.ok) return null;
      const json = (await res.json()) as { Status: string; PostOffice?: { District: string; State: string }[] }[];
      const office = json[0]?.Status === 'Success' ? json[0].PostOffice?.[0] : undefined;
      return office ? { city: office.District, state: office.State } : null;
    });
    if (remote) return { pincode: pin, city: remote.city, state: remote.state ?? state };
  } catch {
    // network unavailable: fall back to state only
  }
  return state ? { pincode: pin, city, state } : null;
}

export const INDIAN_STATES = Array.from(new Set(Object.values(dataset.prefixes))).sort();
