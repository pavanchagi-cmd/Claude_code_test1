// Placeholder watch illustration from the mockup, used until real product
// photography is uploaded. Colours come from the product record.

type Props = { strap: string; caseColor: string; dial: string; variant?: 'card' | 'hero' | 'side' | 'dot'; className?: string; title?: string };

const HAND = 'var(--color-on-dark)';
const ACCENT = 'var(--color-brass-light)';

function isLight(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

export function WatchArt({ strap, caseColor, dial, variant = 'card', className, title }: Props) {
  const hand = isLight(dial) ? 'var(--color-ink)' : HAND;
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };

  if (variant === 'dot') {
    return (
      <svg viewBox="0 0 40 40" className={className} {...a11y}>
        <circle cx="20" cy="20" r="14" fill={caseColor} />
        <circle cx="20" cy="20" r="12" fill={dial} />
      </svg>
    );
  }

  if (variant === 'hero') {
    return (
      <svg viewBox="0 0 200 260" className={className} {...a11y}>
        <rect x="74" y="0" width="52" height="80" rx="10" fill={strap} />
        <rect x="74" y="180" width="52" height="80" rx="10" fill={strap} />
        <circle cx="100" cy="130" r="70" fill={caseColor} />
        <circle cx="100" cy="130" r="61" fill={dial} />
        <rect x="168" y="122" width="12" height="16" rx="3" fill={caseColor} />
        <rect x="98" y="74" width="4" height="12" fill={hand} />
        <rect x="98" y="174" width="4" height="12" fill={hand} />
        <rect x="44" y="128" width="12" height="4" fill={hand} />
        <rect x="144" y="128" width="12" height="4" fill={hand} />
        <line x1="100" y1="130" x2="100" y2="88" stroke={hand} strokeWidth="4" strokeLinecap="round" />
        <line x1="100" y1="130" x2="132" y2="144" stroke={hand} strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="130" r="5" fill={ACCENT} />
      </svg>
    );
  }

  if (variant === 'side') {
    // Three-quarter view used as the hover image on product cards.
    return (
      <svg viewBox="0 0 200 240" className={className} {...a11y}>
        <g transform="rotate(-18 100 120)">
          <rect x="80" y="0" width="40" height="70" rx="8" fill={strap} />
          <rect x="80" y="170" width="40" height="70" rx="8" fill={strap} />
          <ellipse cx="100" cy="120" rx="50" ry="62" fill={caseColor} />
          <ellipse cx="100" cy="120" rx="43" ry="54" fill={dial} />
          <rect x="148" y="113" width="10" height="14" rx="3" fill={caseColor} />
          <line x1="100" y1="120" x2="100" y2="84" stroke={hand} strokeWidth="4" strokeLinecap="round" />
          <line x1="100" y1="120" x2="122" y2="132" stroke={hand} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="120" r="4" fill={ACCENT} />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 240" className={className} {...a11y}>
      <rect x="78" y="0" width="44" height="70" rx="8" fill={strap} />
      <rect x="78" y="170" width="44" height="70" rx="8" fill={strap} />
      <circle cx="100" cy="120" r="62" fill={caseColor} />
      <circle cx="100" cy="120" r="54" fill={dial} />
      <rect x="160" y="113" width="12" height="14" rx="3" fill={caseColor} />
      <line x1="100" y1="120" x2="100" y2="82" stroke={hand} strokeWidth="4" strokeLinecap="round" />
      <line x1="100" y1="120" x2="128" y2="132" stroke={hand} strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="120" r="4" fill={ACCENT} />
    </svg>
  );
}
