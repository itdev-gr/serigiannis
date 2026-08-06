'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, LayoutGrid, X } from 'lucide-react';
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
  const [slide, setSlide] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const swiped = useRef(false);

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

  const go = (to: number) => setSlide((to + images.length) % images.length);

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
      <div
        data-testid="gallery-carousel"
        className="relative aspect-[4/3] w-full touch-pan-y overflow-hidden rounded-lg bg-primary/5 md:hidden"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; swiped.current = false; }}
        onTouchMove={(e) => { if (Math.abs(e.touches[0].clientX - touchStartX.current) > 10) swiped.current = true; }}
        onTouchEnd={(e) => {
          const dx = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(dx) > 40) go(dx > 0 ? slide + 1 : slide - 1);
        }}
      >
        <div
          data-testid="carousel-track"
          className="flex h-full w-full transition-transform duration-300 ease-editorial motion-reduce:transition-none"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {images.map((image, i) => (
            <button
              key={`${image.url}-slide-${i}`}
              type="button"
              data-testid="carousel-slide"
              onClick={() => { if (!swiped.current) openAt(i); }}
              aria-label={`Φωτογραφία ${i + 1} από ${images.length}`}
              tabIndex={i === slide ? 0 : -1}
              aria-hidden={i !== slide}
              className="relative h-full w-full shrink-0"
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(max-width: 768px) 100vw, 0px"
                priority={i === 0}
                className="object-cover"
              />
            </button>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(slide - 1)}
              aria-label="Προηγούμενη φωτογραφία"
              className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-surface/95 text-primary shadow-card"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => go(slide + 1)}
              aria-label="Επόμενη φωτογραφία"
              className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-surface/95 text-primary shadow-card"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {images.slice(0, 8).map((_, i) => (
                <span
                  key={`dot-${i}`}
                  data-testid="carousel-dot"
                  className={cn(
                    'h-1.5 w-1.5 rounded-full bg-surface transition-all motion-reduce:transition-none',
                    i === slide ? 'opacity-100' : 'scale-75 opacity-50'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="hidden md:block">
        {layout.variant === 'hero' ? (
          <div className="grid grid-cols-4 grid-rows-2 gap-2">
            {cell(visible[0], 0, '(max-width: 768px) 0px, 50vw', 'col-span-2 row-span-2 h-full')}
            {visible.slice(1).map((image, i) => cell(image, i + 1, '(max-width: 768px) 0px, 25vw', 'aspect-[4/3]'))}
          </div>
        ) : layout.variant === 'single' ? (
          cell(visible[0], 0, '(max-width: 768px) 0px, min(100vw, 1280px)', 'aspect-[4/3]')
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visible.map((image, i) => cell(image, i, '(max-width: 768px) 0px, 50vw', 'aspect-[4/3]'))}
          </div>
        )}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
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
          <div
            ref={scrollRef}
            data-testid="lightbox-scroll"
            className="flex-1 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
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
