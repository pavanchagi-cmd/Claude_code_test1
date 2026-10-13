import { describe, expect, it } from 'vitest';
import { computeGst, financialYear, formatInvoiceNumber, isValidGstin, splitInclusive } from '@/lib/gst';

describe('splitInclusive', () => {
  it('backs GST out of an inclusive price', () => {
    expect(splitInclusive(2450000, 18)).toEqual({ taxablePaise: 2076271, taxPaise: 373729 });
    expect(splitInclusive(11800, 18)).toEqual({ taxablePaise: 10000, taxPaise: 1800 });
    expect(splitInclusive(10000, 0)).toEqual({ taxablePaise: 10000, taxPaise: 0 });
  });
});

describe('computeGst', () => {
  const lines = [
    { description: 'Watch', hsnCode: '9102', qty: 1, unitPricePaise: 11800, gstRate: 18 },
    { description: 'Strap', hsnCode: '9113', qty: 2, unitPricePaise: 1180, gstRate: 18 },
  ];

  it('uses CGST + SGST within the same state', () => {
    const g = computeGst(lines, 'Karnataka', ' karnataka ');
    expect(g.intraState).toBe(true);
    expect(g.igstPaise).toBe(0);
    expect(g.cgstPaise + g.sgstPaise).toBe(1800 + 360);
    expect(g.taxablePaise + g.cgstPaise + g.sgstPaise).toBe(g.totalPaise);
  });

  it('uses IGST across states', () => {
    const g = computeGst(lines, 'Karnataka', 'Maharashtra');
    expect(g.intraState).toBe(false);
    expect(g.cgstPaise).toBe(0);
    expect(g.igstPaise).toBe(2160);
    expect(g.totalPaise).toBe(14160);
  });

  it('splits odd tax amounts without losing a paisa', () => {
    const g = computeGst([{ description: 'x', hsnCode: '1', qty: 1, unitPricePaise: 101, gstRate: 18 }], 'Goa', 'Goa');
    expect(g.lines[0].cgstPaise + g.lines[0].sgstPaise).toBe(g.lines[0].taxPaise);
  });
});

describe('financial year and invoice numbers', () => {
  it('runs April to March in IST', () => {
    expect(financialYear(new Date('2026-04-01T00:00:00+05:30'))).toBe('2026-27');
    expect(financialYear(new Date('2026-03-31T23:59:00+05:30'))).toBe('2025-26');
    // 31 March 19:00 UTC is already 1 April in India.
    expect(financialYear(new Date('2027-03-31T19:00:00Z'))).toBe('2027-28');
    expect(financialYear(new Date('2099-12-31T00:00:00Z'))).toBe('2099-00');
  });

  it('formats sequential invoice numbers', () => {
    expect(formatInvoiceNumber('2026-27', 1)).toBe('INV/2026-27/00001');
    expect(formatInvoiceNumber('2026-27', 123456)).toBe('INV/2026-27/123456');
  });
});

describe('isValidGstin', () => {
  it('accepts well-formed GSTINs with a valid checksum', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true);
    expect(isValidGstin('27aapfu0939f1zv')).toBe(true);
  });

  it('rejects bad format or checksum', () => {
    expect(isValidGstin('27AAPFU0939F1ZX')).toBe(false);
    expect(isValidGstin('27AAPFU0939F1Z')).toBe(false);
    expect(isValidGstin('ABCDEFGHIJKLMNO')).toBe(false);
    expect(isValidGstin('')).toBe(false);
  });
});
