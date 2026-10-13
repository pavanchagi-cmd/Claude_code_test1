// All money is integer paise. ₹1 = 100 paise.

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "₹12,499" — rounds to whole rupees for display. */
export function formatPaise(paise: number): string {
  return `₹${inr.format(Math.round(paise / 100))}`;
}

/** "₹12,499.00" — exact, for invoices. */
export function formatPaiseExact(paise: number): string {
  return `₹${inrExact.format(paise / 100)}`;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Percentage off MRP, or null when there is no discount. */
export function percentOff(pricePaise: number, mrpPaise?: number | null): number | null {
  if (!mrpPaise || mrpPaise <= pricePaise) return null;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}
