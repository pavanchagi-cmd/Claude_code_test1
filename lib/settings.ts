import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { formatPaise } from '@/lib/money';

export type TrustItem = { title: string; subtitle: string };
export type GrievanceOfficer = {
  name: string;
  designation: string;
  email: string;
  phone: string;
  address: string;
  responseTime: string;
};
export type HeroContent = {
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  imageUrl?: string | null;
  videoUrl?: string | null;
};

export type Settings = {
  brandName: string;
  brandDescription: string;
  announcement: string;
  trustItems: TrustItem[];
  supportPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  supportHours: string;
  instagramHandle: string;
  freeShippingThresholdPaise: number;
  shippingFeePaise: number;
  codLimitPaise: number;
  codFeePaise: number;
  giftWrapPaise: number;
  returnWindowDays: number;
  warrantyYears: string;
  legalEntityName: string;
  gstin: string;
  registeredAddress: string;
  sellerState: string;
  grievanceOfficer: GrievanceOfficer;
  hero: HeroContent;
};

export const DEFAULT_TRUST_ITEMS: TrustItem[] = [
  { title: 'Authenticity guaranteed', subtitle: 'Every watch verified' },
  { title: '[X]-year warranty', subtitle: 'Included with every piece' },
  { title: 'Free insured shipping', subtitle: 'Across India' },
  { title: '[X]-day easy returns', subtitle: 'No questions asked' },
  { title: 'UPI, EMI & COD', subtitle: 'Pay the way you like' },
];

export const DEFAULT_GRIEVANCE: GrievanceOfficer = {
  name: '[Grievance officer name]',
  designation: '[Designation]',
  email: '[grievance@yourbrand.in]',
  phone: '[+91 NUMBER]',
  address: '[Registered address]',
  responseTime: 'We acknowledge complaints within 48 hours and resolve them within one month of receipt.',
};

export const DEFAULT_HERO: HeroContent = {
  eyebrow: 'New collection · [Season year]',
  headline: 'Time, well made.',
  body: '[One-line promise: what makes your watches worth wearing, e.g. curated automatics and everyday classics, every piece authenticated and under warranty.]',
  primaryCta: { label: 'Shop the collection', href: '/watches' },
  secondaryCta: { label: 'Our story', href: '/about' },
  imageUrl: null,
  videoUrl: null,
};

export const DEFAULT_SETTINGS: Settings = {
  brandName: '[BRAND]',
  brandDescription: '[One-line brand description]',
  announcement: 'Free insured shipping above ₹[AMOUNT] · Authenticity guaranteed · [X]-day returns',
  trustItems: DEFAULT_TRUST_ITEMS,
  supportPhone: '[+91 NUMBER]',
  whatsappNumber: '[+91 NUMBER]',
  supportEmail: '[support@yourbrand.in]',
  supportHours: '[Days], [hours] IST. We usually reply within [X] hours.',
  instagramHandle: '[yourhandle]',
  freeShippingThresholdPaise: 0,
  shippingFeePaise: 0,
  codLimitPaise: 0,
  codFeePaise: 0,
  giftWrapPaise: 0,
  returnWindowDays: 0,
  warrantyYears: '[X]',
  legalEntityName: '[LEGAL ENTITY NAME]',
  gstin: '[GSTIN]',
  registeredAddress: '[Registered address]',
  sellerState: '[STATE]',
  grievanceOfficer: DEFAULT_GRIEVANCE,
  hero: DEFAULT_HERO,
};

export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const row = await db.siteSettings.findUnique({ where: { id: 'default' } });
    if (!row) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...row,
      trustItems: (row.trustItems as TrustItem[] | null) ?? DEFAULT_TRUST_ITEMS,
      grievanceOfficer: { ...DEFAULT_GRIEVANCE, ...((row.grievanceOfficer as Partial<GrievanceOfficer>) ?? {}) },
      hero: { ...DEFAULT_HERO, ...((row.hero as Partial<HeroContent>) ?? {}) },
    };
  } catch (err) {
    console.error('[settings] falling back to defaults', err);
    return DEFAULT_SETTINGS;
  }
});

/** Show a configured amount, or keep the placeholder visible until the owner sets it. */
export function amountOr(paise: number, placeholder = '[AMOUNT]'): string {
  return paise > 0 ? formatPaise(paise) : `₹${placeholder}`;
}

export function daysOr(days: number, placeholder = '[X]'): string {
  return days > 0 ? String(days) : placeholder;
}

/** Digits-only WhatsApp number for wa.me links, or null while it is a placeholder. */
export function whatsappDigits(s: Settings): string | null {
  const digits = s.whatsappNumber.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}
