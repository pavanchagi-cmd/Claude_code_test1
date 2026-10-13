'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { waLink } from '@/lib/links';

export function WhatsAppButton({ number, brandName }: { number: string | null; brandName: string }) {
  const pathname = usePathname();
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- needs window.location
    if (number) setHref(waLink(number, `Hi ${brandName}, I have a question about ${window.location.href}`));
  }, [number, brandName, pathname]);
  if (!number || pathname.startsWith('/checkout')) return null;
  return (
    <a
      href={href ?? `https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-5 bottom-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success text-on-dark shadow-lg hover:brightness-110"
      aria-label="Chat with us on WhatsApp"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z" />
        <path d="M9 8.8c0 3 2.2 5.6 5.4 6.2l1.2-1.4-1.8-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-1.8z" />
      </svg>
    </a>
  );
}
