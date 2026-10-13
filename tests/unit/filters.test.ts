import { describe, expect, it } from 'vitest';
import { activeFilterCount, dialKey, labelFor, materialKey, parseFilters, parseRange, serializeFilters } from '@/lib/filters';
import { parseCsv } from '@/lib/csv';
import { canRequestReturn } from '@/lib/returns';

describe('shop filters in the URL', () => {
  it('parses comma lists, sort and page', () => {
    const f = parseFilters({ brand: 'brand-a,brand-b', movement: 'automatic', sort: 'price-asc', page: '2', price: '0-25000' });
    expect(f.brand).toEqual(['brand-a', 'brand-b']);
    expect(f.sort).toBe('price-asc');
    expect(f.page).toBe(2);
    expect(f.price).toEqual(['0-25000']);
    expect(activeFilterCount(f)).toBe(4);
  });

  it('falls back on bad input', () => {
    const f = parseFilters({ sort: 'evil', page: '-3', price: 'drop table' });
    expect(f.sort).toBe('featured');
    expect(f.page).toBe(1);
    expect(f.price).toEqual([]);
  });

  it('round-trips through serializeFilters', () => {
    const f = parseFilters({ strap: 'leather', sort: 'newest' });
    expect(serializeFilters(f)).toBe('?strap=leather&sort=newest');
    expect(serializeFilters({ ...f, page: 1, sort: 'featured' })).toBe('?strap=leather');
  });

  it('labels free-form budget ranges', () => {
    expect(parseRange('25000-50000')).toEqual({ min: 25000, max: 50000 });
    expect(labelFor('price', '50000-')).toBe('₹50,000+');
    expect(labelFor('price', '12000-30000')).toBe('₹12,000 – ₹30,000');
  });

  it('normalises materials and dial colours', () => {
    expect(materialKey('Gold-tone steel')).toBe('gold-tone');
    expect(materialKey('316L Stainless Steel')).toBe('stainless-steel');
    expect(dialKey('Green sunburst')).toBe('green');
    expect(dialKey('Ivory')).toBe('white');
    expect(dialKey('Navy blue')).toBe('blue');
  });
});

describe('parseCsv', () => {
  it('handles quotes, commas and CRLF', () => {
    const rows = parseCsv('name,price,description\r\n"Diver, 40mm",24500,"He said ""hi"""\r\nGMT,38000,\r\n');
    expect(rows).toEqual([
      { name: 'Diver, 40mm', price: '24500', description: 'He said "hi"' },
      { name: 'GMT', price: '38000', description: '' },
    ]);
  });
});

describe('canRequestReturn', () => {
  const delivered = new Date('2026-10-01T10:00:00Z');
  const order = { status: 'DELIVERED' as const, events: [{ status: 'DELIVERED' as const, createdAt: delivered }] };
  it('allows returns inside the window only', () => {
    expect(canRequestReturn(order, 7, new Date('2026-10-05T10:00:00Z'))).toBe(true);
    expect(canRequestReturn(order, 7, new Date('2026-10-09T10:00:00Z'))).toBe(false);
  });
  it('requires delivery and allows any time while the window is unset', () => {
    expect(canRequestReturn({ ...order, status: 'SHIPPED' }, 7)).toBe(false);
    expect(canRequestReturn(order, 0, new Date('2027-10-01'))).toBe(true);
  });
});
