'use client';

import { useState } from 'react';

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[14.5px] text-muted">Share:</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="chip min-h-10 text-[14px]">
          {l.label}
        </a>
      ))}
      <button
        type="button"
        className="chip min-h-10 text-[14px]"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* ignore */
          }
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
