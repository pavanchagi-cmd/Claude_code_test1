import { z } from 'zod';
import { isValidGstin } from '@/lib/gst';

export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))
  .refine((s) => /^[6-9]\d{9}$/.test(s), 'Enter a valid 10-digit Indian mobile number.');

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pincode.');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(200);

export const addToCartSchema = z.object({ variantId: z.string().min(1).max(40), qty: z.number().int().min(1).max(10).default(1) });
export const updateCartSchema = z.object({ itemId: z.string().min(1).max(40), qty: z.number().int().min(0).max(10) });
export const cartOptionsSchema = z.object({
  giftWrap: z.boolean().optional(),
  giftNote: z.string().trim().max(250).optional().nullable(),
  couponCode: z.string().trim().toUpperCase().max(30).optional().nullable(),
});
export const productIdSchema = z.object({ productId: z.string().min(1).max(40) });
export const wishlistMergeSchema = z.object({ productIds: z.array(z.string().min(1).max(40)).max(200) });

export const addressSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name.').max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(3, 'Enter flat, house no. or building.').max(120),
  line2: z.string().trim().min(3, 'Enter area, street or locality.').max(120),
  landmark: z.string().trim().max(80).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'Enter the city.').max(60),
  state: z.string().trim().min(2, 'Enter the state.').max(60),
  pincode: pincodeSchema,
});

export const checkoutSchema = z
  .object({
    phone: phoneSchema,
    email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200).optional().or(z.literal('')),
    whatsappOptIn: z.boolean().default(true),
    address: addressSchema.omit({ phone: true }),
    savedAddressId: z.string().max(40).optional().nullable(),
    saveAddress: z.boolean().optional(),
    gstInvoice: z.boolean().default(false),
    gstin: z.string().trim().toUpperCase().optional().or(z.literal('')),
    businessName: z.string().trim().max(120).optional().or(z.literal('')),
    paymentMethod: z.enum(['UPI', 'CARD', 'EMI', 'NETBANKING', 'COD']),
    buyNowVariantId: z.string().max(40).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.gstInvoice) {
      if (!v.gstin || !isValidGstin(v.gstin)) ctx.addIssue({ code: 'custom', path: ['gstin'], message: 'Enter a valid 15-character GSTIN.' });
      if (!v.businessName || v.businessName.length < 2) ctx.addIssue({ code: 'custom', path: ['businessName'], message: 'Enter the registered business name.' });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  contact: z.string().trim().min(5, 'Enter your email or mobile number.').max(120),
  topic: z.enum(['Order status', 'Returns & refunds', 'Warranty claim', 'Product question', 'Payments & EMI', 'Other']),
  orderNumber: z.string().trim().max(40).optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Tell us a little more (at least 10 characters).').max(2000),
  website: z.string().max(200).optional(), // honeypot: must stay empty
});

export const reviewSchema = z.object({
  productId: z.string().min(1).max(40),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(2000),
  city: z.string().trim().max(60).optional().or(z.literal('')),
});

export const questionSchema = z.object({
  productId: z.string().min(1).max(40),
  text: z.string().trim().min(5, 'Please write your question.').max(500),
  name: z.string().trim().max(80).optional().or(z.literal('')),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal('')),
  wristSizeCm: z.union([z.number().min(10).max(30), z.nan(), z.null()]).optional(),
  marketingConsent: z.boolean(),
});
