'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, ZoomIn } from 'lucide-react';
import { useState } from 'react';
import { ProductImage, type Art } from './product-image';

export type GalleryImage = { url: string; alt: string; angle: string };

const ANGLE_LABEL: Record<string, string> = {
  FRONT: 'Front',
  SIDE: 'Side',
  CROWN: 'Crown',
  CASEBACK: 'Caseback',
  CLASP: 'Clasp',
  WRIST: 'On wrist',
  OTHER: 'Detail',
};

export function Gallery({ images, art, name, hasMedia }: { images: GalleryImage[]; art: Art; name: string; hasMedia?: boolean }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = images[index] ?? images[0];
  const label = (img: GalleryImage | undefined) => (img ? (ANGLE_LABEL[img.angle] ?? 'Detail') : '');

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
    if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
  };

  return (
    <div>
      <div className="relative aspect-square bg-stone">
        <ProductImage url={current?.url} alt={current?.alt ?? name} art={art} priority sizes="(min-width:1024px) 592px, 100vw" artClassName="w-[60%]" />
        <span className="absolute top-5 left-4 text-[12.5px] tracking-[0.14em] text-body-2 uppercase">{label(current)} view</span>
        <Dialog.Root open={zoom} onOpenChange={setZoom}>
          <Dialog.Trigger className="absolute top-2 right-2 inline-flex h-11 w-11 items-center justify-center border border-line bg-surface" aria-label="Zoom image">
            <ZoomIn size={18} strokeWidth={1.6} aria-hidden="true" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/90" />
            <Dialog.Content className="fixed inset-4 z-50 flex items-center justify-center bg-stone focus:outline-none md:inset-10" onKeyDown={onKey}>
              <Dialog.Title className="sr-only">
                {name}, {label(current)} view
              </Dialog.Title>
              <Dialog.Description className="sr-only">Use the arrow keys to see other angles.</Dialog.Description>
              <div className="relative h-full w-full">
                <ProductImage url={current?.url} alt={current?.alt ?? name} art={art} sizes="100vw" artClassName="h-[90%]" />
              </div>
              <Dialog.Close className="absolute top-3 right-3 inline-flex h-11 w-11 items-center justify-center bg-surface" aria-label="Close zoom">
                <X size={20} strokeWidth={1.6} aria-hidden="true" />
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        {hasMedia && <span className="absolute right-4 bottom-4 border border-line bg-surface px-2.5 py-1 text-[13px]">360° spin · Video</span>}
      </div>
      <div role="listbox" aria-label="Product images" className="mt-3 grid grid-cols-6 gap-2" onKeyDown={onKey}>
        {images.map((img, i) => (
          <button
            key={`${img.url}-${i}`}
            type="button"
            role="option"
            aria-selected={i === index}
            aria-label={`${label(img)} view`}
            onClick={() => setIndex(i)}
            tabIndex={i === index ? 0 : -1}
            className={`relative aspect-square overflow-hidden bg-stone text-[12.5px] text-body-2 ${i === index ? 'outline-2 -outline-offset-2 outline-ink' : 'border border-line'}`}
          >
            {img.url.startsWith('placeholder:') ? (
              <span className="flex h-full items-center justify-center">{label(img)}</span>
            ) : (
              <ProductImage url={img.url} alt="" art={art} sizes="96px" artClassName="w-[70%]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
