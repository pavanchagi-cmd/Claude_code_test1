import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';
import type { Badge, Gender, ImageAngle, Movement, StrapType } from '../lib/generated/prisma/enums';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });

// Names, specs and colours come from the approved mockup. Anything the mockup
// shows as a [PLACEHOLDER] stays a placeholder (null field or bracketed text).
//
// SAMPLE PRICES: the mockup shows "₹ [PRICE]". Cart, filters and payments need
// numbers, so these are clearly-fake sample values for testing only. The owner
// must replace every price in /admin/products before launch.
const SAMPLE = (rupees: number) => rupees * 100;

const brands = [
  { name: '[Brand A]', slug: 'brand-a' },
  { name: '[Brand B]', slug: 'brand-b' },
  { name: '[Brand C]', slug: 'brand-c' },
  { name: '[Brand D]', slug: 'brand-d' },
];

const categories = [
  { name: 'Dress', slug: 'dress', featured: true, sortOrder: 1, tileColor: '#15171A' },
  { name: 'Diver', slug: 'diver', featured: true, sortOrder: 2, tileColor: '#0F2A3A' },
  { name: 'Chronograph', slug: 'chronograph', featured: true, sortOrder: 3, tileColor: '#E6E2D9' },
  { name: 'Field', slug: 'field', featured: true, sortOrder: 4, tileColor: '#3A4031' },
  { name: 'Smart', slug: 'smart', featured: true, sortOrder: 5, tileColor: '#D8CBB0' },
  { name: 'Pilot', slug: 'pilot', featured: false, sortOrder: 6, tileColor: '#1E2125' },
  { name: 'GMT', slug: 'gmt', featured: false, sortOrder: 7, tileColor: '#15171A' },
  { name: 'Straps & Accessories', slug: 'straps-accessories', featured: false, sortOrder: 99, tileColor: '#EDE6D8' },
];

type SeedVariant = { sku: string; label: string; strapType: StrapType; strapColour?: string; price: number; mrp?: number; stock: number; isDefault?: boolean };
type SeedProduct = {
  name: string;
  slug: string;
  brand: string;
  categories: string[];
  gender: Gender;
  movement: Movement;
  caseSizeMm: number;
  lugWidthMm?: number;
  caseMaterial: string;
  dialColour: string;
  dialDetail?: string;
  strapDetail: string;
  badge?: Badge;
  featuredRank: number;
  art: { strap: string; case: string; dial: string };
  variants: SeedVariant[];
  calibre?: string;
};

const watches: SeedProduct[] = [
  {
    name: 'Automatic Diver',
    slug: 'automatic-diver-40mm-blue',
    brand: 'brand-a',
    categories: ['diver'],
    gender: 'MEN',
    movement: 'AUTOMATIC',
    caseSizeMm: 40,
    lugWidthMm: 20,
    caseMaterial: 'Stainless steel',
    dialColour: 'Blue',
    dialDetail: 'Blue, luminous indices',
    strapDetail: 'Steel',
    badge: 'NEW',
    featuredRank: 90,
    art: { strap: '#A9A59C', case: '#CFCBC2', dial: '#0F2A3A' },
    variants: [
      { sku: 'AD-40-BLU-STL', label: 'Steel bracelet', strapType: 'STEEL', strapColour: 'Steel', price: 24500, stock: 8, isDefault: true },
      { sku: 'AD-40-BLU-RUB', label: 'Black rubber', strapType: 'RUBBER', strapColour: 'Black', price: 23500, stock: 6 },
      { sku: 'AD-40-BLU-LTH', label: 'Brown leather', strapType: 'LEATHER', strapColour: 'Brown', price: 23900, stock: 5 },
    ],
  },
  {
    name: 'Classic Dress',
    slug: 'classic-dress-38mm-ivory',
    brand: 'brand-b',
    categories: ['dress'],
    gender: 'UNISEX',
    movement: 'QUARTZ',
    caseSizeMm: 38,
    lugWidthMm: 18,
    caseMaterial: 'Gold-tone steel',
    dialColour: 'Ivory',
    strapDetail: 'Leather',
    featuredRank: 80,
    art: { strap: '#5A3A22', case: '#C9A86A', dial: '#F2EFE8' },
    variants: [{ sku: 'CD-38-IVO-LTH', label: 'Brown leather', strapType: 'LEATHER', strapColour: 'Brown', price: 8900, stock: 2, isDefault: true }],
  },
  {
    name: 'Field Chronograph',
    slug: 'field-chronograph-42mm-olive',
    brand: 'brand-c',
    categories: ['field', 'chronograph'],
    gender: 'MEN',
    movement: 'QUARTZ',
    calibre: 'Quartz chronograph',
    caseSizeMm: 42,
    lugWidthMm: 22,
    caseMaterial: 'Stainless steel',
    dialColour: 'Green',
    strapDetail: 'NATO',
    badge: 'BESTSELLER',
    featuredRank: 85,
    art: { strap: '#55603F', case: '#CFCBC2', dial: '#3A4031' },
    variants: [{ sku: 'FC-42-OLV-NATO', label: 'Olive NATO', strapType: 'NATO', strapColour: 'Olive', price: 14500, stock: 10, isDefault: true }],
  },
  {
    name: 'Steel GMT',
    slug: 'steel-gmt-41mm-black',
    brand: 'brand-a',
    categories: ['gmt'],
    gender: 'MEN',
    movement: 'AUTOMATIC',
    caseSizeMm: 41,
    lugWidthMm: 20,
    caseMaterial: 'Stainless steel',
    dialColour: 'Black',
    strapDetail: 'Steel',
    badge: 'LIMITED',
    featuredRank: 70,
    art: { strap: '#A9A59C', case: '#CFCBC2', dial: '#15171A' },
    variants: [{ sku: 'GMT-41-BLK-JUB', label: 'Jubilee bracelet', strapType: 'STEEL', strapColour: 'Steel', price: 38000, stock: 4, isDefault: true }],
  },
  {
    name: 'Pilot Automatic',
    slug: 'pilot-automatic-42mm-black',
    brand: 'brand-d',
    categories: ['pilot'],
    gender: 'MEN',
    movement: 'AUTOMATIC',
    caseSizeMm: 42,
    lugWidthMm: 21,
    caseMaterial: 'Stainless steel',
    dialColour: 'Black',
    strapDetail: 'Leather',
    featuredRank: 60,
    art: { strap: '#6B4A2E', case: '#CFCBC2', dial: '#1E2125' },
    variants: [{ sku: 'PA-42-BLK-LTH', label: 'Brown leather', strapType: 'LEATHER', strapColour: 'Brown', price: 21000, stock: 7, isDefault: true }],
  },
  {
    name: 'Minimal Quartz',
    slug: 'minimal-quartz-39mm-silver',
    brand: 'brand-b',
    categories: ['dress'],
    gender: 'UNISEX',
    movement: 'QUARTZ',
    caseSizeMm: 39,
    lugWidthMm: 20,
    caseMaterial: 'Stainless steel',
    dialColour: 'Silver',
    strapDetail: 'Mesh',
    badge: 'SALE',
    featuredRank: 50,
    art: { strap: '#B8B4AA', case: '#CFCBC2', dial: '#E6E2D9' },
    variants: [{ sku: 'MQ-39-SLV-MSH', label: 'Steel mesh', strapType: 'MESH', strapColour: 'Steel', price: 6500, mrp: 8000, stock: 12, isDefault: true }],
  },
  {
    name: 'Solar Sport',
    slug: 'solar-sport-43mm-navy',
    brand: 'brand-c',
    categories: ['diver'],
    gender: 'MEN',
    movement: 'SOLAR',
    caseSizeMm: 43,
    lugWidthMm: 22,
    caseMaterial: 'Stainless steel',
    dialColour: 'Navy blue',
    strapDetail: 'Rubber',
    featuredRank: 40,
    art: { strap: '#2C2F33', case: '#2C2F33', dial: '#22303A' },
    variants: [{ sku: 'SS-43-NVY-RUB', label: 'Black rubber', strapType: 'RUBBER', strapColour: 'Black', price: 11500, stock: 2, isDefault: true }],
  },
  {
    name: 'Heritage Hand-wound',
    slug: 'heritage-hand-wound-37mm-cream',
    brand: 'brand-d',
    categories: ['dress'],
    gender: 'UNISEX',
    movement: 'MECHANICAL',
    caseSizeMm: 37,
    lugWidthMm: 18,
    caseMaterial: 'Gold-tone steel',
    dialColour: 'Cream',
    strapDetail: 'Leather',
    featuredRank: 30,
    art: { strap: '#3E2A1B', case: '#C9A86A', dial: '#EFE6D2' },
    variants: [{ sku: 'HH-37-CRM-LTH', label: 'Dark brown leather', strapType: 'LEATHER', strapColour: 'Dark brown', price: 32000, stock: 5, isDefault: true }],
  },
  {
    name: 'Green Sunburst',
    slug: 'green-sunburst-39mm',
    brand: 'brand-a',
    categories: ['dress'],
    gender: 'MEN',
    movement: 'AUTOMATIC',
    caseSizeMm: 39,
    lugWidthMm: 20,
    caseMaterial: 'Stainless steel',
    dialColour: 'Green sunburst',
    strapDetail: 'Steel',
    badge: 'LIMITED',
    featuredRank: 75,
    art: { strap: '#A9A59C', case: '#CFCBC2', dial: '#2F4A3A' },
    variants: [{ sku: 'GS-39-GRN-STL', label: 'Steel bracelet', strapType: 'STEEL', strapColour: 'Steel', price: 27500, stock: 9, isDefault: true }],
  },
];

const accessories = [
  { name: 'Spare leather strap', slug: 'spare-leather-strap-20mm', price: 1800, strapType: 'LEATHER' as StrapType },
  { name: 'Quick-release NATO', slug: 'quick-release-nato-strap', price: 900, strapType: 'NATO' as StrapType },
  { name: 'Single watch winder', slug: 'single-watch-winder', price: 6500, strapType: 'OTHER' as StrapType },
  { name: 'Travel watch roll', slug: 'travel-watch-roll', price: 2400, strapType: 'OTHER' as StrapType },
];

const angles: { angle: ImageAngle; label: string; url: (slug: string) => string }[] = [
  { angle: 'FRONT', label: 'Front view', url: () => 'art:front' },
  { angle: 'SIDE', label: 'Side view', url: () => 'art:side' },
  { angle: 'CROWN', label: 'Crown', url: () => 'placeholder:Crown' },
  { angle: 'CASEBACK', label: 'Caseback', url: () => 'placeholder:Caseback' },
  { angle: 'CLASP', label: 'Clasp', url: () => 'placeholder:Clasp' },
  { angle: 'WRIST', label: 'On wrist', url: () => 'placeholder:On wrist' },
];

const policies = [
  {
    slug: 'returns',
    title: 'Returns & refunds',
    body: `## Return window
[X] days from delivery for unworn watches with all tags, protective films, box and papers.

## Non-returnable items
[Engraved or customised pieces, resized bracelets, items marked final sale.]

## How to request a return
Go to My orders and choose Return / exchange, or contact us on WhatsApp. We arrange a free pickup.

## Inspection
Returned watches are inspected within [X] business days of reaching us.

## Refunds
Prepaid orders are refunded to the original payment method within [X] days. COD orders are refunded to your bank account or UPI ID.`,
  },
  {
    slug: 'shipping',
    title: 'Shipping policy',
    body: `## Where we ship
We ship across India. [List any pincodes or regions you cannot serve.]

## Dispatch time
Orders are dispatched within [X] business days. You will receive a tracking link by SMS, email and WhatsApp.

## Shipping charges
Free insured shipping on orders above ₹[AMOUNT]. [Charges below that amount.]

## Cash on delivery
Available on orders up to ₹[LIMIT] where our courier partner supports it. A COD fee of ₹[AMOUNT] applies.`,
  },
  {
    slug: 'warranty',
    title: 'Warranty & service',
    body: `## Coverage
Every watch comes with a [X]-year [brand / seller] warranty covering manufacturing defects in the movement.

## What is not covered
[Damage from accidents, water ingress beyond rated resistance, unauthorised repairs, normal wear of straps and crystals.]

## How to claim
Register your watch in My account → Warranty, then contact us with your order number and serial number.`,
  },
  {
    slug: 'cancellation',
    title: 'Cancellation policy',
    body: `## Before dispatch
You can cancel an order any time before it is shipped from My orders or by contacting us. Prepaid orders are refunded in full.

## After dispatch
Once shipped, an order cannot be cancelled. You can request a return after delivery under our returns policy.`,
  },
  {
    slug: 'privacy',
    title: 'Privacy policy',
    body: `## What we collect
[Contact details, delivery addresses, order history, and device data for analytics with your consent.]

## How we use it
[To process orders, provide support, send order updates, and, only with your consent, marketing.]

## Your rights
Under India's Digital Personal Data Protection Act, 2023 you can request a copy of your data, correction, or deletion of your account by writing to [support@yourbrand.in].

## Cookies
Analytics and marketing cookies are only set after you accept them in the cookie banner.`,
  },
  {
    slug: 'terms',
    title: 'Terms & conditions',
    body: `## About these terms
[These terms govern your use of this website and purchases from [LEGAL ENTITY NAME].]

## Pricing
All prices are in Indian rupees and inclusive of GST.

## Governing law
[Courts of [CITY] have exclusive jurisdiction.]`,
  },
  {
    slug: 'grievance-officer',
    title: 'Grievance officer',
    body: `## Grievance redressal
In accordance with the Consumer Protection (E-Commerce) Rules, 2020, the details of our Grievance Officer are listed below.`,
  },
];

const faqs = [
  ['Are your watches 100% genuine?', 'Yes. [Explain your sourcing.] Every watch ships with an authenticity certificate and serial number.'],
  ['How long does delivery take?', '[Typical delivery time by region.] You will get a tracking link as soon as your order ships.'],
  [
    'Can I pay with Cash on Delivery or EMI?',
    'Yes. COD is available on orders up to ₹[LIMIT] where our courier supports it. No-cost EMI is available on select cards via [PAYMENT GATEWAY].',
  ],
  ['What is your return policy?', '[X]-day returns on unworn watches with all tags, box and papers. See our Returns & refunds policy.'],
  ['What does the warranty cover?', '[X]-year warranty covering the movement. See Warranty & service for details.'],
  ['Can you resize my bracelet?', '[Yes, free of charge before dispatch if you share your wrist size.]'],
  ['Do you offer gift wrapping?', 'Yes. Add gift wrapping and a handwritten note in your cart for ₹[AMOUNT].'],
  ['Do I get a GST invoice?', 'Yes. Every order comes with a GST invoice. Add your GSTIN at checkout to claim input tax credit.'],
];

const posts = [
  {
    title: 'Your first automatic watch: a complete buying guide',
    slug: 'first-automatic-watch-buying-guide',
    category: 'Guides',
    featured: true,
    coverColor: '#1F2125',
    readingMin: 8,
  },
  { title: 'Automatic vs quartz: which movement suits you?', slug: 'automatic-vs-quartz', category: 'Guides', coverColor: '#E5E1DA', readingMin: 6 },
  { title: 'How to choose the right case size for your wrist', slug: 'choose-case-size-for-your-wrist', category: 'Buying advice', coverColor: '#D8CBB0', readingMin: 5 },
  { title: 'Caring for leather straps in humid weather', slug: 'caring-for-leather-straps-humid-weather', category: 'Care', coverColor: '#E5E1DA', readingMin: 4 },
  { title: '[Brand story title]', slug: 'brand-story-placeholder', category: 'Brand stories', coverColor: '#D8CBB0', readingMin: 5 },
  { title: '[Care guide title]', slug: 'care-guide-placeholder', category: 'Care', coverColor: '#E5E1DA', readingMin: 4 },
  { title: '[Buying advice title]', slug: 'buying-advice-placeholder', category: 'Buying advice', coverColor: '#D8CBB0', readingMin: 6 },
];

async function main() {
  console.log('Seeding…');

  await db.siteSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      trustItems: [
        { title: 'Authenticity guaranteed', subtitle: 'Every watch verified' },
        { title: '[X]-year warranty', subtitle: 'Included with every piece' },
        { title: 'Free insured shipping', subtitle: 'Across India' },
        { title: '[X]-day easy returns', subtitle: 'No questions asked' },
        { title: 'UPI, EMI & COD', subtitle: 'Pay the way you like' },
      ],
      grievanceOfficer: {
        name: '[Grievance officer name]',
        designation: '[Designation]',
        email: '[grievance@yourbrand.in]',
        phone: '[+91 NUMBER]',
        address: '[Registered address]',
        responseTime: 'We acknowledge complaints within 48 hours and resolve them within one month of receipt.',
      },
      hero: {
        eyebrow: 'New collection · [Season year]',
        headline: 'Time, well made.',
        body: '[One-line promise: what makes your watches worth wearing, e.g. curated automatics and everyday classics, every piece authenticated and under warranty.]',
        primaryCta: { label: 'Shop the collection', href: '/watches' },
        secondaryCta: { label: 'Our story', href: '/about' },
      },
    },
    update: {},
  });

  for (const b of brands) {
    await db.brand.upsert({ where: { slug: b.slug }, create: { ...b, description: '[Short brand description]' }, update: {} });
  }
  for (const c of categories) {
    await db.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
  }

  const brandIds = Object.fromEntries((await db.brand.findMany()).map((b) => [b.slug, b.id]));

  for (const w of watches) {
    const exists = await db.product.findUnique({ where: { slug: w.slug } });
    if (exists) continue;
    await db.product.create({
      data: {
        name: w.name,
        slug: w.slug,
        brandId: brandIds[w.brand],
        reference: null,
        gender: w.gender,
        movement: w.movement,
        calibre: w.calibre ?? null,
        caseSizeMm: w.caseSizeMm,
        lugWidthMm: w.lugWidthMm,
        caseMaterial: w.caseMaterial,
        dialColour: w.dialColour,
        dialDetail: w.dialDetail ?? null,
        strapDetail: w.strapDetail,
        description: '[Product story: design inspiration, who it’s for, how it wears day to day. Keep it to 2 short paragraphs.]',
        inTheBox: 'watch, presentation box, warranty card, user manual, [extra links / strap tool]',
        warrantyMonths: 24,
        gstRate: 18,
        hsnCode: '9102',
        badge: w.badge ?? null,
        featuredRank: w.featuredRank,
        artStrap: w.art.strap,
        artCase: w.art.case,
        artDial: w.art.dial,
        seoDescription: `${w.name} by [BRAND]: ${w.movement.toLowerCase()} ${w.caseSizeMm} mm watch. Genuine, under warranty, free insured shipping across India.`,
        categories: { connect: w.categories.map((slug) => ({ slug })) },
        variants: {
          create: w.variants.map((v) => ({
            sku: v.sku,
            label: v.label,
            strapType: v.strapType,
            strapColour: v.strapColour,
            pricePaise: SAMPLE(v.price),
            mrpPaise: v.mrp ? SAMPLE(v.mrp) : null,
            stock: v.stock,
            isDefault: Boolean(v.isDefault),
          })),
        },
        images: {
          create: angles.map((a, i) => ({ url: a.url(w.slug), alt: `${w.name}, ${a.label.toLowerCase()}`, angle: a.angle, sortOrder: i })),
        },
      },
    });
  }

  for (const a of accessories) {
    const exists = await db.product.findUnique({ where: { slug: a.slug } });
    if (exists) continue;
    await db.product.create({
      data: {
        name: a.name,
        slug: a.slug,
        brandId: brandIds['brand-a'],
        gender: 'UNISEX',
        isAccessory: true,
        description: '[Accessory description]',
        warrantyMonths: 0,
        gstRate: 18,
        hsnCode: a.strapType === 'OTHER' ? '4202' : '9113',
        categories: { connect: [{ slug: 'straps-accessories' }] },
        variants: {
          create: [{ sku: `ACC-${a.slug.toUpperCase().slice(0, 20)}`, label: 'Standard', strapType: a.strapType, pricePaise: SAMPLE(a.price), stock: 20, isDefault: true }],
        },
        images: { create: [{ url: 'placeholder:Photo', alt: a.name, angle: 'OTHER', sortOrder: 0 }] },
      },
    });
  }

  // Placeholder reviews: text stays bracketed until real reviews come in.
  const diver = await db.product.findUnique({ where: { slug: 'automatic-diver-40mm-blue' } });
  if (diver && (await db.review.count()) === 0) {
    const featuredOn = await db.product.findMany({ where: { isAccessory: false }, take: 3, orderBy: { featuredRank: 'desc' } });
    for (const p of featuredOn) {
      await db.review.create({
        data: {
          productId: p.id,
          authorName: '[Customer name]',
          city: '[City]',
          rating: 5,
          title: '[Review headline]',
          body: '[Real customer review]',
          status: 'APPROVED',
          verifiedBuyer: true,
          featured: true,
        },
      });
    }
    await db.question.create({
      data: { productId: diver.id, text: '[Is the bracelet adjustable at home?]', answer: '[Your answer]', answeredAt: new Date(), isPublic: true },
    });
    const agg = await db.review.groupBy({ by: ['productId'], where: { status: 'APPROVED' }, _avg: { rating: true }, _count: true });
    for (const g of agg) {
      await db.product.update({ where: { id: g.productId }, data: { ratingAvg: g._avg.rating ?? 0, ratingCount: g._count } });
    }
  }

  for (const [i, p] of policies.entries()) {
    await db.policy.upsert({ where: { slug: p.slug }, create: { ...p, sortOrder: i }, update: {} });
  }

  if ((await db.faq.count()) === 0) {
    await db.faq.createMany({ data: faqs.map(([question, answer], i) => ({ question, answer, sortOrder: i })) });
  }

  for (const [i, p] of posts.entries()) {
    await db.post.upsert({
      where: { slug: p.slug },
      create: {
        ...p,
        featured: Boolean(p.featured),
        excerpt: '[Two-line summary of the article.]',
        body: '[Article introduction.]\n\n## [Section heading]\n\n[Article body. Replace this placeholder with the full article in admin.]',
        publishedAt: new Date(Date.now() - i * 86400000 * 7),
        relatedProductSlugs: ['automatic-diver-40mm-blue', 'classic-dress-38mm-ivory', 'field-chronograph-42mm-olive'],
      },
      update: {},
    });
  }

  if ((await db.instagramImage.count()) === 0) {
    await db.instagramImage.createMany({ data: Array.from({ length: 6 }, (_, i) => ({ url: '', alt: '[Customer photo]', sortOrder: i })) });
  }

  if ((await db.productUnit.count()) === 0) {
    await db.productUnit.create({ data: { serialNumber: 'DEMO-SERIAL-0001', notes: 'Sample unit for testing "Verify your watch". Delete before launch.' } });
  }

  // Example coupon from the mockup placeholder ("e.g. WELCOME10"). Sample value; edit or disable in admin.
  await db.coupon.upsert({
    where: { code: 'WELCOME10' },
    create: { code: 'WELCOME10', type: 'PERCENT', value: 10, minOrderPaise: 0, maxDiscountPaise: SAMPLE(2500), usageLimit: 1000 },
    update: {},
  });

  const adminPhone = process.env.SEED_ADMIN_PHONE?.replace(/\D/g, '').slice(-10);
  if (adminPhone) {
    await db.user.upsert({
      where: { phone: adminPhone },
      create: { phone: adminPhone, name: 'Store admin', role: 'ADMIN', phoneVerified: new Date() },
      update: { role: 'ADMIN' },
    });
    console.log(`Admin user: +91 ${adminPhone}`);
  } else {
    console.warn('SEED_ADMIN_PHONE not set; no admin user created.');
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
