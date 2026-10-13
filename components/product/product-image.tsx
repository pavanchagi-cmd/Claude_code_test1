import Image from 'next/image';
import { WatchArt } from './watch-art';

// Image sources: a real URL (Vercel Blob / uploads), "art:front|side" for the
// placeholder illustration, or "placeholder:<label>" for an empty slot.

export type Art = { strap: string; case: string; dial: string } | null;

type Props = {
  url: string | undefined;
  alt: string;
  art: Art;
  sizes: string;
  priority?: boolean;
  className?: string;
  artClassName?: string;
  labelClassName?: string;
};

export function ProductImage({ url, alt, art, sizes, priority, className = '', artClassName = 'w-[52%]', labelClassName = '' }: Props) {
  if (!url || url.startsWith('placeholder:')) {
    const label = url?.slice('placeholder:'.length) || 'Photo';
    return (
      <div className={`flex h-full w-full items-center justify-center text-[13px] text-muted ${labelClassName} ${className}`}>
        <span className="tracking-[0.1em] uppercase">[{label}]</span>
      </div>
    );
  }
  if (url.startsWith('art:')) {
    if (!art) return <div className={`h-full w-full ${className}`} />;
    const variant = url === 'art:side' ? 'side' : 'card';
    return (
      <div className={`flex h-full w-full items-center justify-center ${className}`}>
        <WatchArt strap={art.strap} caseColor={art.case} dial={art.dial} variant={variant} className={artClassName} title={alt} />
      </div>
    );
  }
  return <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
}
