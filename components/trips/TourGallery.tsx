'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { LayoutGrid, X } from 'lucide-react';
import { galleryLayout, type GalleryImage } from '@/lib/gallery';
import { cn } from '@/lib/utils';

const CELL =
  'group relative block w-full overflow-hidden rounded-lg bg-primary/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25';
const PHOTO =
  'object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100';

/** The tour photo gallery: a desktop grid whose shape follows the photo count,
 *  and a lightbox that shows every photo whole. Ported from findtourin. */
export function TourGallery({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drive the native dialog from state so Esc, focus trapping and the backdrop
  // come for free while React stays the source of truth.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Scroll the lightbox to the photo that was clicked.
  useEffect(() => {
    if (!open) return;
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-photo="${current}"]`)
      ?.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (images.length === 0) return null;

  const layout = galleryLayout(images.length);
  const visible = images.slice(0, layout.visibleCount);

  const openAt = (index: number) => { setCurrent(index); setOpen(true); };

  const cell = (image: GalleryImage, index: number, sizes: string, className: string) => (
    <button
      key={`${image.url}-${index}`}
      type="button"
      data-testid="gallery-cell"
      onClick={() => openAt(index)}
      aria-label={`Φωτογραφία ${index + 1} από ${images.length}`}
      className={cn(CELL, className)}
    >
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={index === 0}
        className={PHOTO}
      />
      {layout.showSeeAll && index === layout.visibleCount - 1 && (
        <span className="pointer-events-none absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 rounded-full bg-surface/95 px-4 py-2 font-sans text-[13px] font-semibold text-primary shadow-card">
          <LayoutGrid className="h-4 w-4" strokeWidth={2} />
          Δείτε και τις {images.length}
        </span>
      )}
    </button>
  );

  return (
    <>
      <div className="hidden md:block">
        {layout.variant === 'hero' ? (
          <div className="grid grid-cols-4 grid-rows-2 gap-2">
            {cell(visible[0], 0, '(max-width: 768px) 0px, 50vw', 'col-span-2 row-span-2 h-full')}
            {visible.slice(1).map((image, i) => cell(image, i + 1, '(max-width: 768px) 0px, 25vw', 'aspect-[4/3]'))}
          </div>
        ) : layout.variant === 'single' ? (
          <div className="mx-auto max-w-3xl">
            {cell(visible[0], 0, '(max-width: 768px) 0px, 768px', 'aspect-[4/3]')}
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-2',
              layout.variant === 'duo' && 'grid-cols-2',
              layout.variant === 'trio' && 'grid-cols-3',
              layout.variant === 'quad' && 'grid-cols-4'
            )}
          >
            {visible.map((image, i) =>
              cell(image, i, layout.variant === 'duo' ? '(max-width: 768px) 0px, 50vw' : '(max-width: 768px) 0px, 33vw', 'aspect-[4/3]')
            )}
          </div>
        )}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === dialogRef.current) setOpen(false); }}
        aria-label="Φωτογραφίες εκδρομής"
        className="m-0 h-full max-h-[100dvh] w-full max-w-[100vw] bg-deep-ink/95 p-0 backdrop:bg-deep-ink/95"
      >
        <div className="flex h-full w-full flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between bg-deep-ink/70 px-5 py-3 text-surface backdrop-blur">
            <span className="font-sans text-[14px] font-semibold">
              {images.length} {images.length === 1 ? 'φωτογραφία' : 'φωτογραφίες'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Κλείσιμο"
              className="rounded-full p-2 transition hover:bg-surface/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-surface motion-reduce:transition-none"
            >
              <X className="h-6 w-6" strokeWidth={2} />
            </button>
          </header>
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
              {images.map((image, i) => (
                <figure
                  key={`${image.url}-full-${i}`}
                  data-photo={i}
                  data-testid="lightbox-photo"
                  className="relative h-[70vh] w-full"
                >
                  <Image src={image.url} alt={image.alt} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-contain" />
                </figure>
              ))}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
