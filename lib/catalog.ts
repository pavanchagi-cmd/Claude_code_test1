import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import {
  CASE_SIZE_OPTIONS,
  DIAL_OPTIONS,
  CASE_MATERIAL_OPTIONS,
  GENDER_OPTIONS,
  MOVEMENT_OPTIONS,
  PAGE_SIZE,
  PRICE_OPTIONS,
  STRAP_OPTIONS,
  WATER_OPTIONS,
  dialKey,
  materialKey,
  parseRange,
  type FilterKey,
  type ListOption,
  type ShopFilters,
} from '@/lib/filters';

export const cardInclude = {
  brand: true,
  variants: { orderBy: [{ isDefault: 'desc' as const }, { pricePaise: 'asc' as const }] },
  images: { orderBy: { sortOrder: 'asc' as const }, take: 2 },
} satisfies Prisma.ProductInclude;

export type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

/** Serializable shape passed to client components. */
export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  spec: string;
  badge: string | null;
  pricePaise: number;
  mrpPaise: number | null;
  ratingAvg: number;
  ratingCount: number;
  stockLeft: number;
  defaultVariantId: string | null;
  images: { url: string; alt: string; angle: string }[];
  art: { strap: string; case: string; dial: string } | null;
};

const MOVEMENT_LABEL: Record<string, string> = {
  AUTOMATIC: 'Automatic',
  QUARTZ: 'Quartz',
  MECHANICAL: 'Mechanical',
  SOLAR: 'Solar',
  SMART: 'Smart',
};

export function movementLabel(m: string | null | undefined) {
  return m ? (MOVEMENT_LABEL[m] ?? m) : '';
}

export function specLine(p: { movement: string | null; caseSizeMm: unknown; strapDetail: string | null; calibre?: string | null }) {
  const parts: string[] = [];
  if (p.movement) parts.push(p.calibre && /chrono/i.test(p.calibre) ? `${movementLabel(p.movement)} chrono` : movementLabel(p.movement));
  if (p.caseSizeMm) parts.push(`${Number(p.caseSizeMm)} mm`);
  if (p.strapDetail) parts.push(p.strapDetail);
  return parts.join(' · ');
}

export function toCard(p: CardProduct): ProductCardData {
  const v = p.variants[0];
  const stockLeft = p.variants.reduce((a, x) => a + Math.max(0, x.stock - x.reserved), 0);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brandName: p.brand.name,
    spec: specLine(p),
    badge: p.badge,
    pricePaise: v?.pricePaise ?? 0,
    mrpPaise: v?.mrpPaise ?? null,
    ratingAvg: Number(p.ratingAvg),
    ratingCount: p.ratingCount,
    stockLeft,
    defaultVariantId: v?.id ?? null,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt, angle: i.angle })),
    art: p.artDial ? { strap: p.artStrap ?? '#A9A59C', case: p.artCase ?? '#CFCBC2', dial: p.artDial } : null,
  };
}

// ───────────────────────── Shop listing ─────────────────────────

type Slim = {
  id: string;
  brandSlug: string;
  gender: string;
  movement: string | null;
  size: number | null;
  material: string | null;
  dial: string | null;
  water: number | null;
  straps: string[];
  price: number; // rupees, lowest variant
  createdAt: number;
  featuredRank: number;
  rating: number;
};

export type Scope = { categorySlug?: string; brandSlug?: string; gender?: 'MEN' | 'WOMEN'; accessories?: boolean; q?: string };

const slimSelect = {
  id: true,
  gender: true,
  movement: true,
  caseSizeMm: true,
  caseMaterial: true,
  dialColour: true,
  waterResistanceM: true,
  createdAt: true,
  featuredRank: true,
  ratingAvg: true,
  brand: { select: { slug: true } },
  variants: { select: { pricePaise: true, strapType: true } },
} satisfies Prisma.ProductSelect;

function scopeWhere(scope: Scope): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (scope.accessories) where.isAccessory = true;
  else if (!scope.categorySlug) where.isAccessory = false;
  if (scope.categorySlug) where.categories = { some: { slug: scope.categorySlug } };
  if (scope.brandSlug) where.brand = { slug: scope.brandSlug };
  if (scope.gender) where.gender = { in: [scope.gender, 'UNISEX'] };
  if (scope.q) {
    const words = scope.q.split(/\s+/).filter(Boolean).slice(0, 6);
    where.AND = words.map((w) => ({
      OR: [
        { name: { contains: w, mode: 'insensitive' as const } },
        { brand: { name: { contains: w, mode: 'insensitive' as const } } },
        { dialColour: { contains: w, mode: 'insensitive' as const } },
        { caseMaterial: { contains: w, mode: 'insensitive' as const } },
        { reference: { contains: w, mode: 'insensitive' as const } },
        { categories: { some: { name: { contains: w, mode: 'insensitive' as const } } } },
      ],
    }));
  }
  return where;
}

function toSlim(p: Prisma.ProductGetPayload<{ select: typeof slimSelect }>): Slim {
  return {
    id: p.id,
    brandSlug: p.brand.slug,
    gender: p.gender.toLowerCase(),
    movement: p.movement?.toLowerCase() ?? null,
    size: p.caseSizeMm ? Number(p.caseSizeMm) : null,
    material: materialKey(p.caseMaterial),
    dial: dialKey(p.dialColour),
    water: p.waterResistanceM,
    straps: Array.from(new Set(p.variants.map((v) => v.strapType.toLowerCase()))),
    price: p.variants.length ? Math.min(...p.variants.map((v) => v.pricePaise)) / 100 : 0,
    createdAt: p.createdAt.getTime(),
    featuredRank: p.featuredRank,
    rating: Number(p.ratingAvg),
  };
}

function inRange(n: number | null, min?: number, max?: number) {
  if (n === null) return false;
  if (min !== undefined && n < min) return false;
  if (max !== undefined && n >= max) return false;
  return true;
}

const matchers: Record<FilterKey, (s: Slim, v: string) => boolean> = {
  brand: (s, v) => s.brandSlug === v,
  price: (s, v) => {
    const { min, max } = parseRange(v);
    return inRange(s.price, min, max);
  },
  movement: (s, v) => s.movement === v,
  size: (s, v) => {
    const opt = CASE_SIZE_OPTIONS.find((o) => o.value === v);
    return opt ? inRange(s.size, opt.min, opt.max) : false;
  },
  material: (s, v) => s.material === v,
  strap: (s, v) => s.straps.includes(v),
  dial: (s, v) => s.dial === v,
  water: (s, v) => {
    const opt = WATER_OPTIONS.find((o) => o.value === v);
    return opt ? inRange(s.water, opt.min, opt.max === undefined ? undefined : opt.max + 1) : false;
  },
  gender: (s, v) => s.gender === v || (v !== 'unisex' && s.gender === 'unisex'),
};

function matches(s: Slim, f: ShopFilters, skip?: FilterKey) {
  return (Object.keys(matchers) as FilterKey[]).every((k) => {
    if (k === skip || !f[k].length) return true;
    return f[k].some((v) => matchers[k](s, v));
  });
}

export type Facet = { key: FilterKey; label: string; options: (ListOption & { count: number })[] };

export async function listProducts(scope: Scope, f: ShopFilters) {
  const [rows, brands] = await Promise.all([
    db.product.findMany({ where: scopeWhere(scope), select: slimSelect }),
    db.brand.findMany({ orderBy: { name: 'asc' }, select: { name: true, slug: true } }),
  ]);
  const all = rows.map(toSlim);
  const filtered = all.filter((s) => matches(s, f));

  const sorters: Record<string, (a: Slim, b: Slim) => number> = {
    featured: (a, b) => b.featuredRank - a.featuredRank || b.createdAt - a.createdAt,
    newest: (a, b) => b.createdAt - a.createdAt,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
  };
  filtered.sort(sorters[f.sort] ?? sorters.featured);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const ids = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => s.id);
  const pageRows = await db.product.findMany({ where: { id: { in: ids } }, include: cardInclude });
  const byId = new Map(pageRows.map((p) => [p.id, p]));
  const products = ids
    .map((id) => byId.get(id))
    .filter((p): p is CardProduct => Boolean(p))
    .map(toCard);

  // Facet counts: for each facet, count matches ignoring that facet's own selection.
  const brandOptions: ListOption[] = brands.filter((b) => all.some((s) => s.brandSlug === b.slug)).map((b) => ({ value: b.slug, label: b.name }));
  const facetDefs: { key: FilterKey; label: string; options: ListOption[] }[] = [
    { key: 'brand', label: 'Brand', options: brandOptions },
    { key: 'price', label: 'Price', options: PRICE_OPTIONS },
    { key: 'movement', label: 'Movement', options: MOVEMENT_OPTIONS },
    { key: 'size', label: 'Case size', options: CASE_SIZE_OPTIONS },
    { key: 'material', label: 'Case material', options: CASE_MATERIAL_OPTIONS },
    { key: 'strap', label: 'Strap', options: STRAP_OPTIONS },
    { key: 'dial', label: 'Dial colour', options: DIAL_OPTIONS },
    { key: 'water', label: 'Water resistance', options: WATER_OPTIONS },
  ];
  if (!scope.gender) facetDefs.push({ key: 'gender', label: 'Gender', options: GENDER_OPTIONS });
  const facets: Facet[] = facetDefs.map((d) => {
    const base = all.filter((s) => matches(s, f, d.key));
    return {
      key: d.key,
      label: d.label,
      options: d.options.map((o) => ({ ...o, count: base.filter((s) => matchers[d.key](s, o.value)).length })),
    };
  });

  return { products, total, page, pages, facets, brands: brandOptions };
}

// ───────────────────────── Product detail ─────────────────────────

export const getProductBySlug = cache(async (slug: string) => {
  return db.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      categories: true,
      variants: { orderBy: [{ isDefault: 'desc' }, { pricePaise: 'asc' }], include: { images: { orderBy: { sortOrder: 'asc' } } } },
      images: { orderBy: { sortOrder: 'asc' } },
      reviews: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 20 },
      questions: { where: { isPublic: true, answer: { not: null } }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export async function ratingBreakdown(productId: string) {
  const groups = await db.review.groupBy({ by: ['rating'], where: { productId, status: 'APPROVED' }, _count: true });
  const counts = [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: groups.find((g) => g.rating === r)?._count ?? 0 }));
  const total = counts.reduce((a, c) => a + c.count, 0);
  return { counts, total };
}

/** Same category, price within ±30%. */
export async function similarProducts(p: ProductDetail, take = 4) {
  const price = p.variants[0]?.pricePaise ?? 0;
  const rows = await db.product.findMany({
    where: {
      isActive: true,
      isAccessory: false,
      id: { not: p.id },
      categories: p.categories.length ? { some: { id: { in: p.categories.map((c) => c.id) } } } : undefined,
      variants: price ? { some: { pricePaise: { gte: Math.floor(price * 0.7), lte: Math.ceil(price * 1.3) } } } : undefined,
    },
    include: cardInclude,
    take,
    orderBy: { featuredRank: 'desc' },
  });
  if (rows.length >= take) return rows.map(toCard);
  const more = await db.product.findMany({
    where: { isActive: true, isAccessory: false, id: { notIn: [p.id, ...rows.map((r) => r.id)] } },
    include: cardInclude,
    take: take - rows.length,
    orderBy: { featuredRank: 'desc' },
  });
  return [...rows, ...more].map(toCard);
}

export async function productsBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const rows = await db.product.findMany({ where: { slug: { in: slugs }, isActive: true }, include: cardInclude });
  return rows.map(toCard);
}

export async function homeTabs() {
  const base = { isActive: true, isAccessory: false };
  const [newest, best, men, women] = await Promise.all([
    db.product.findMany({ where: base, include: cardInclude, orderBy: { createdAt: 'desc' }, take: 4 }),
    db.product.findMany({ where: { ...base }, include: cardInclude, orderBy: [{ ratingCount: 'desc' }, { featuredRank: 'desc' }], take: 4 }),
    db.product.findMany({ where: { ...base, gender: { in: ['MEN', 'UNISEX'] } }, include: cardInclude, orderBy: { featuredRank: 'desc' }, take: 4 }),
    db.product.findMany({ where: { ...base, gender: { in: ['WOMEN', 'UNISEX'] } }, include: cardInclude, orderBy: { featuredRank: 'desc' }, take: 4 }),
  ]);
  return { new: newest.map(toCard), bestsellers: best.map(toCard), men: men.map(toCard), women: women.map(toCard) };
}

export async function accessories(take = 4) {
  const rows = await db.product.findMany({ where: { isActive: true, isAccessory: true }, include: cardInclude, take, orderBy: { featuredRank: 'desc' } });
  return rows.map(toCard);
}

export const getNavData = cache(async () => {
  try {
    const [categories, brands] = await Promise.all([
      db.category.findMany({ where: { slug: { not: 'straps-accessories' } }, orderBy: { sortOrder: 'asc' }, select: { name: true, slug: true } }),
      db.brand.findMany({ orderBy: { name: 'asc' }, select: { name: true, slug: true } }),
    ]);
    return { categories, brands };
  } catch {
    return { categories: [], brands: [] };
  }
});
