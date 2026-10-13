// Shop filter definitions. Filter state lives in URL search params so links
// are shareable and crawlable: ?brand=a,b&price=0-10000&movement=automatic&page=2

export type RangeOption = { value: string; label: string; min?: number; max?: number };
export type ListOption = { value: string; label: string };

export const PRICE_OPTIONS: RangeOption[] = [
  { value: '0-10000', label: 'Under ₹10,000', max: 10000 },
  { value: '10000-25000', label: '₹10,000 – ₹25,000', min: 10000, max: 25000 },
  { value: '25000-50000', label: '₹25,000 – ₹50,000', min: 25000, max: 50000 },
  { value: '50000-', label: '₹50,000+', min: 50000 },
];

export const MOVEMENT_OPTIONS: ListOption[] = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'quartz', label: 'Quartz' },
  { value: 'mechanical', label: 'Mechanical (hand-wound)' },
  { value: 'solar', label: 'Solar' },
  { value: 'smart', label: 'Smart / Hybrid' },
];

export const CASE_SIZE_OPTIONS: RangeOption[] = [
  { value: '0-36', label: 'Under 36 mm', max: 36 },
  { value: '36-38', label: '36–38 mm', min: 36, max: 38 },
  { value: '38-42', label: '38–42 mm', min: 38, max: 42 },
  { value: '42-', label: '42 mm+', min: 42 },
];

export const CASE_MATERIAL_OPTIONS: ListOption[] = [
  { value: 'stainless-steel', label: 'Stainless steel' },
  { value: 'titanium', label: 'Titanium' },
  { value: 'gold-tone', label: 'Gold-tone' },
  { value: 'ceramic', label: 'Ceramic' },
];

export const STRAP_OPTIONS: ListOption[] = [
  { value: 'steel', label: 'Steel bracelet' },
  { value: 'leather', label: 'Leather' },
  { value: 'rubber', label: 'Rubber' },
  { value: 'nato', label: 'NATO' },
  { value: 'mesh', label: 'Mesh' },
];

export const DIAL_OPTIONS: ListOption[] = [
  { value: 'black', label: 'Black' },
  { value: 'blue', label: 'Blue' },
  { value: 'white', label: 'White / Silver' },
  { value: 'green', label: 'Green' },
];

export const WATER_OPTIONS: RangeOption[] = [
  { value: '30', label: '30 m', min: 30, max: 49 },
  { value: '50', label: '50 m', min: 50, max: 99 },
  { value: '100', label: '100 m', min: 100, max: 199 },
  { value: '200', label: '200 m+', min: 200 },
];

export const GENDER_OPTIONS: ListOption[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
];

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export const PAGE_SIZE = 24;

export const FILTER_KEYS = ['brand', 'price', 'movement', 'size', 'material', 'strap', 'dial', 'water', 'gender'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export type ShopFilters = Record<FilterKey, string[]> & { sort: SortValue; page: number; q?: string };

type RawParams = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const s = Array.isArray(v) ? v.join(',') : v;
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function parseFilters(params: RawParams): ShopFilters {
  const sortRaw = typeof params.sort === 'string' ? params.sort : 'featured';
  const sort = (SORT_OPTIONS.some((o) => o.value === sortRaw) ? sortRaw : 'featured') as SortValue;
  const pageNum = Number(typeof params.page === 'string' ? params.page : 1);
  const page = Number.isFinite(pageNum) && pageNum >= 1 ? Math.floor(pageNum) : 1;
  const out = { sort, page } as ShopFilters;
  for (const key of FILTER_KEYS) out[key] = list(params[key]);
  // Allow free-form ranges from the "Shop by budget" tiles, e.g. price=25000-50000
  out.price = out.price.filter((p) => /^\d*-\d*$/.test(p));
  if (typeof params.q === 'string' && params.q.trim()) out.q = params.q.trim().slice(0, 100);
  return out;
}

export function parseRange(value: string): { min?: number; max?: number } {
  const [a, b] = value.split('-');
  return { min: a ? Number(a) : undefined, max: b ? Number(b) : undefined };
}

/** Number of active filter values (used for noindex on heavily filtered URLs). */
export function activeFilterCount(f: ShopFilters): number {
  return FILTER_KEYS.reduce((acc, k) => acc + f[k].length, 0);
}

export function serializeFilters(f: Partial<ShopFilters>): string {
  const sp = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const v = f[key];
    if (v && v.length) sp.set(key, v.join(','));
  }
  if (f.q) sp.set('q', f.q);
  if (f.sort && f.sort !== 'featured') sp.set('sort', f.sort);
  if (f.page && f.page > 1) sp.set('page', String(f.page));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function labelFor(key: FilterKey, value: string, brands: ListOption[] = []): string {
  const table: Record<FilterKey, ListOption[]> = {
    brand: brands,
    price: PRICE_OPTIONS,
    movement: MOVEMENT_OPTIONS,
    size: CASE_SIZE_OPTIONS,
    material: CASE_MATERIAL_OPTIONS,
    strap: STRAP_OPTIONS,
    dial: DIAL_OPTIONS,
    water: WATER_OPTIONS,
    gender: GENDER_OPTIONS,
  };
  const found = table[key].find((o) => o.value === value)?.label;
  if (found) return found;
  if (key === 'price') {
    const { min, max } = parseRange(value);
    if (min && max) return `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}`;
    if (max) return `Under ₹${max.toLocaleString('en-IN')}`;
    if (min) return `₹${min.toLocaleString('en-IN')}+`;
  }
  return value;
}

/** Map a free-text material string to its filter value. */
export function materialKey(material: string | null | undefined): string | null {
  if (!material) return null;
  const m = material.toLowerCase();
  if (m.includes('titan')) return 'titanium';
  if (m.includes('ceramic')) return 'ceramic';
  if (m.includes('gold')) return 'gold-tone';
  if (m.includes('steel')) return 'stainless-steel';
  return null;
}

/** Map a free-text dial colour to its filter value. */
export function dialKey(dial: string | null | undefined): string | null {
  if (!dial) return null;
  const d = dial.toLowerCase();
  if (d.includes('blue')) return 'blue';
  if (d.includes('green')) return 'green';
  if (d.includes('black') || d.includes('grey') || d.includes('gray')) return 'black';
  if (d.includes('white') || d.includes('silver') || d.includes('ivory') || d.includes('cream')) return 'white';
  return null;
}
