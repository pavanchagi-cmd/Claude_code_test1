export function Stars({ rating, size = 18, className = '' }: { rating: number; size?: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span className={`inline-flex gap-[3px] text-brass ${className}`} role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= full ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
        </svg>
      ))}
    </span>
  );
}
