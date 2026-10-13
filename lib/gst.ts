// GST helpers. Prices are stored GST-inclusive; the rate is per product.
// Have the owner's CA confirm rates, HSN codes and the invoice format.

export type GstLine = {
  description: string;
  hsnCode: string;
  qty: number;
  unitPricePaise: number; // inclusive of GST
  gstRate: number; // percent, e.g. 18
};

export type GstLineBreakdown = GstLine & {
  grossPaise: number;
  taxablePaise: number;
  taxPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
};

export type GstBreakdown = {
  intraState: boolean;
  lines: GstLineBreakdown[];
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
};

/** Split a GST-inclusive amount into taxable value and tax. */
export function splitInclusive(grossPaise: number, ratePercent: number) {
  const taxablePaise = Math.round((grossPaise * 100) / (100 + ratePercent));
  return { taxablePaise, taxPaise: grossPaise - taxablePaise };
}

export function normaliseState(state: string) {
  return state.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** CGST + SGST when seller and buyer are in the same state, otherwise IGST. */
export function computeGst(lines: GstLine[], sellerState: string, buyerState: string): GstBreakdown {
  const intraState = normaliseState(sellerState) === normaliseState(buyerState);
  const out: GstLineBreakdown[] = lines.map((line) => {
    const grossPaise = line.unitPricePaise * line.qty;
    const { taxablePaise, taxPaise } = splitInclusive(grossPaise, line.gstRate);
    const cgstPaise = intraState ? Math.floor(taxPaise / 2) : 0;
    const sgstPaise = intraState ? taxPaise - cgstPaise : 0;
    const igstPaise = intraState ? 0 : taxPaise;
    return { ...line, grossPaise, taxablePaise, taxPaise, cgstPaise, sgstPaise, igstPaise };
  });
  const sum = (k: keyof Pick<GstLineBreakdown, 'taxablePaise' | 'cgstPaise' | 'sgstPaise' | 'igstPaise' | 'grossPaise'>) => out.reduce((acc, l) => acc + l[k], 0);
  return {
    intraState,
    lines: out,
    taxablePaise: sum('taxablePaise'),
    cgstPaise: sum('cgstPaise'),
    sgstPaise: sum('sgstPaise'),
    igstPaise: sum('igstPaise'),
    totalPaise: sum('grossPaise'),
  };
}

/** Indian financial year (April–March), e.g. "2026-27". Uses IST. */
export function financialYear(date: Date = new Date()): string {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export function formatInvoiceNumber(fy: string, sequence: number): string {
  return `INV/${fy}/${String(sequence).padStart(5, '0')}`;
}

// GSTIN: 2-digit state code, 10-char PAN, entity number, 'Z', checksum.
const GSTIN_RE = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isValidGstin(input: string): boolean {
  const gstin = input.trim().toUpperCase();
  if (!GSTIN_RE.test(gstin)) return false;
  // Mod-36 checksum on the first 14 characters.
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = GSTIN_CHARS.indexOf(gstin[i]);
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  const check = GSTIN_CHARS[(36 - (sum % 36)) % 36];
  return check === gstin[14];
}
