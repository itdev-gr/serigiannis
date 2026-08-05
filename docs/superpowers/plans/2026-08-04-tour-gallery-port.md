# Tour Gallery (port from findtourin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every tour page the findtourin photo gallery — one big photo with four beside it, a «Δείτε και τις N» pill, a swipeable carousel on phones and a lightbox that shows each photo whole — with the cover photo no longer duplicated in the page hero.

**Architecture:** A pure helper (`lib/gallery.ts`) turns a photo count into a desktop layout variant and orders a tour's images cover-first, so that logic is unit-testable without React. One client component (`components/trips/TourGallery.tsx`) renders three things off that helper: a `md:hidden` mobile carousel, a `hidden md:block` desktop grid, and a native `<dialog>` lightbox they both open. The tour page drops the photo from its hero (layout option Γ), renders the gallery full-width beneath it, and deletes the old «Φωτογραφίες» grid at the bottom.

**Tech Stack:** Next.js 16 App Router, React 19 client component, Tailwind 3 utility classes, `next/image`, `lucide-react` icons, vitest + @testing-library/react.

## Global Constraints

- **No new npm dependencies.** Everything needed is already in `package.json`.
- **Images through `next/image` only** — never a bare `<img>`. Supabase hosts are already whitelisted in `next.config.mjs` (`*.supabase.co`, `*.supabase.in`).
- **URLs come from `imageUrl(image)`** in `lib/images.ts`. It returns `string | null`; skip any image whose URL is null.
- **All user-facing copy in Greek**, matching the tone of the existing pages («Δείτε και τις 7 φωτογραφίες», «Κλείσιμο», «Επόμενη φωτογραφία»).
- **Tailwind utility classes inline** — no CSS modules, no `<style>` blocks. Colors come from the theme tokens only: `primary`, `cta`, `gold`, `surface`, `background`, `body`, `muted`, `border`, `deep-ink`.
- **Respect reduced motion**: every transition also carries `motion-reduce:transition-none`.
- **Commits authored as `marioskifokeris@hotmail.com`** — Vercel attributes deploys by commit author email. `git config user.email` is already set to it in this clone.
- **Node is not installed system-wide on this machine.** A portable Node 22 lives at
  `/private/tmp/claude-501/-Users-marios-Desktop-Projects-serigiannis-main/7dd49705-4a6a-426d-837c-352b391a5f07/scratchpad/node-v22.14.0-darwin-arm64/bin`.
  Put it on `PATH` before any npm command:
  ```bash
  export PATH="/private/tmp/claude-501/-Users-marios-Desktop-Projects-serigiannis-main/7dd49705-4a6a-426d-837c-352b391a5f07/scratchpad/node-v22.14.0-darwin-arm64/bin:$PATH"
  ```
  If that directory is gone, re-download it:
  ```bash
  curl -sL https://nodejs.org/dist/v22.14.0/node-v22.14.0-darwin-arm64.tar.xz | tar -xJ -C /tmp
  export PATH="/tmp/node-v22.14.0-darwin-arm64/bin:$PATH"
  ```
- **Verification per task:** `npm run test:run`, then `npx tsc --noEmit`. The final task also runs `npm run build`.

## Decisions (assumptions — flag to the user if any is wrong)

1. **Layout option Γ** (chosen by the user): the tour hero loses its cover photo. `PageHero` already falls back to the `bg-mesh-blue` gradient when `photo` is omitted, so the hero keeps the site's identity, just shorter (`h-[38vh] min-h-[300px]`).
2. **Cells are 4:3, not square.** findtourin uses square cells because its uploads are square; Sergiani's photos are landscape, and the existing `TourCard` / gallery already use `aspect-[4/3]`. Square cells would crop them top and bottom.
3. **Five photos inline, the rest in the lightbox** — exactly findtourin's rule. 1–4 photos degrade to a single / duo / trio / quad row.
4. **The gallery shows every photo, cover first.** The old bottom grid excluded the cover; now the cover is the big cell, so it must be included.
5. **Breakpoint `md` (768px):** carousel below, grid at and above — same as findtourin.
6. **Mobile dots capped at 8** for large galleries; swiping still cycles through all photos.
7. **The pill is decorative** — clicking *any* cell opens the lightbox at that photo.

---

## File Structure

- **Create** `lib/gallery.ts` — `galleryLayout(count)` + `galleryImages(tour)`. Framework-free, unit-tested.
- **Create** `tests/gallery.test.ts` — vitest unit tests for both helpers.
- **Create** `components/trips/TourGallery.tsx` — the client component (desktop grid, mobile carousel, lightbox).
- **Create** `tests/tour-gallery.test.tsx` — render tests for the component's variants.
- **Modify** `app/(site)/tour/[slug]/page.tsx` — photo-less hero, gallery below it, old «Φωτογραφίες» section removed.

---

## Task 1: Gallery helpers + unit tests

**Files:**
- Create: `lib/gallery.ts`
- Test: `tests/gallery.test.ts`

**Interfaces:**
- Consumes: `TourImage` from `@/types/db`, `imageUrl` from `@/lib/images`.
- Produces:
  - `galleryLayout(count: number): GalleryLayout` where
    `GalleryLayout = { variant: 'single' | 'duo' | 'trio' | 'quad' | 'hero'; visibleCount: number; showSeeAll: boolean }`
  - `galleryImages(tour: { images?: TourImage[] | null; cover_image_id?: string | null; title: string }): GalleryImage[]`
    where `GalleryImage = { url: string; alt: string }`
  - Task 2 imports `galleryLayout` and the `GalleryImage` type; Task 4 imports `galleryImages`.

- [ ] **Step 1: Write the failing test**

Create `tests/gallery.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { galleryImages, galleryLayout } from '@/lib/gallery';
import type { TourImage } from '@/types/db';

const img = (id: string, position: number, alt: string | null = null): TourImage => ({
  id,
  tour_id: 't1',
  storage_path: `https://cdn.example.com/${id}.jpg`,
  alt_el: alt,
  width: null,
  height: null,
  blurhash: null,
  position,
});

describe('galleryLayout', () => {
  it('0 or 1 photo → single variant, no See-all', () => {
    expect(galleryLayout(0)).toEqual({ variant: 'single', visibleCount: 0, showSeeAll: false });
    expect(galleryLayout(1)).toEqual({ variant: 'single', visibleCount: 1, showSeeAll: false });
  });

  it('2–4 photos → duo/trio/quad, all visible, no See-all', () => {
    expect(galleryLayout(2)).toEqual({ variant: 'duo', visibleCount: 2, showSeeAll: false });
    expect(galleryLayout(3)).toEqual({ variant: 'trio', visibleCount: 3, showSeeAll: false });
    expect(galleryLayout(4)).toEqual({ variant: 'quad', visibleCount: 4, showSeeAll: false });
  });

  it('5+ photos → hero grid (1 big + 4 small) with the See-all pill', () => {
    expect(galleryLayout(5)).toEqual({ variant: 'hero', visibleCount: 5, showSeeAll: true });
    expect(galleryLayout(20)).toEqual({ variant: 'hero', visibleCount: 5, showSeeAll: true });
  });
});

describe('galleryImages', () => {
  it('puts the cover first, then the rest by position', () => {
    const list = galleryImages({
      title: 'Μάνη',
      cover_image_id: 'c',
      images: [img('a', 2), img('b', 0), img('c', 1)],
    });
    expect(list.map((i) => i.url)).toEqual([
      'https://cdn.example.com/c.jpg',
      'https://cdn.example.com/b.jpg',
      'https://cdn.example.com/a.jpg',
    ]);
  });

  it('falls back to position order when no cover is set', () => {
    const list = galleryImages({ title: 'Μάνη', cover_image_id: null, images: [img('a', 1), img('b', 0)] });
    expect(list.map((i) => i.url)).toEqual(['https://cdn.example.com/b.jpg', 'https://cdn.example.com/a.jpg']);
  });

  it('uses alt_el when present and the tour title otherwise', () => {
    const list = galleryImages({ title: 'Μάνη', cover_image_id: null, images: [img('a', 0, 'Λιμένι'), img('b', 1)] });
    expect(list[0].alt).toBe('Λιμένι');
    expect(list[1].alt).toBe('Μάνη');
  });

  it('is empty when the tour has no images', () => {
    expect(galleryImages({ title: 'Μάνη', images: [], cover_image_id: null })).toEqual([]);
    expect(galleryImages({ title: 'Μάνη' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
export PATH="/private/tmp/claude-501/-Users-marios-Desktop-Projects-serigiannis-main/7dd49705-4a6a-426d-837c-352b391a5f07/scratchpad/node-v22.14.0-darwin-arm64/bin:$PATH"
npx vitest run tests/gallery.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/gallery"`.

- [ ] **Step 3: Write the implementation**

Create `lib/gallery.ts`:

```ts
// Pure layout logic for the tour gallery — ported from findtourin's
// src/lib/gallery.ts. Decides, from the photo count, which desktop layout
// variant to render and whether the «Δείτε και τις N» pill appears.
// Framework-free so it stays unit-testable and TourGallery can stay thin.
import { imageUrl } from '@/lib/images';
import type { TourImage } from '@/types/db';

export type GalleryVariant = 'single' | 'duo' | 'trio' | 'quad' | 'hero';

export type GalleryLayout = {
  /** Desktop layout variant, chosen by photo count. */
  variant: GalleryVariant;
  /** How many photos the desktop layout renders inline; the rest live only in the lightbox. */
  visibleCount: number;
  /** Overlay the «Δείτε και τις N» pill (only meaningful in the hero variant). */
  showSeeAll: boolean;
};

/** Map a photo count (assumed ≥ 0) to its desktop gallery layout. */
export function galleryLayout(count: number): GalleryLayout {
  if (count <= 1) return { variant: 'single', visibleCount: count <= 0 ? 0 : 1, showSeeAll: false };
  if (count === 2) return { variant: 'duo', visibleCount: 2, showSeeAll: false };
  if (count === 3) return { variant: 'trio', visibleCount: 3, showSeeAll: false };
  if (count === 4) return { variant: 'quad', visibleCount: 4, showSeeAll: false };
  // 5+ → signature hero grid; extras are reachable through the lightbox.
  return { variant: 'hero', visibleCount: 5, showSeeAll: true };
}

export type GalleryImage = { url: string; alt: string };

/** A tour's photos ready for the gallery: cover first, then the rest by
 *  position, unresolvable URLs dropped. */
export function galleryImages(tour: {
  images?: TourImage[] | null;
  cover_image_id?: string | null;
  title: string;
}): GalleryImage[] {
  const all = (tour.images ?? []).slice().sort((a, b) => a.position - b.position);
  const cover = all.find((i) => i.id === tour.cover_image_id);
  const ordered = cover ? [cover, ...all.filter((i) => i.id !== cover.id)] : all;
  return ordered
    .map((image) => ({ url: imageUrl(image), alt: image.alt_el ?? tour.title }))
    .filter((i): i is GalleryImage => i.url !== null);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/gallery.test.ts
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add lib/gallery.ts tests/gallery.test.ts
git commit -m "feat(gallery): helpers για διάταξη και σειρά φωτογραφιών εκδρομής"
```

---

## Task 2: TourGallery — desktop grid + lightbox

**Files:**
- Create: `components/trips/TourGallery.tsx`
- Test: `tests/tour-gallery.test.tsx`

**Interfaces:**
- Consumes: `galleryLayout`, `GalleryImage` from `@/lib/gallery`.
- Produces: `<TourGallery images={GalleryImage[]} />` — renders `null` for an empty list. Task 3 adds the mobile carousel to this same file; Task 4 mounts it in the tour page.

**Note on the hero grid:** it is ONE `grid-cols-4 grid-rows-2` grid — the big cell spans `col-span-2 row-span-2` so its height is defined by the two rows of 4:3 small cells and the bottom edges line up exactly. Do not nest a second grid; nesting leaves a 1–2px ragged edge.

- [ ] **Step 1: Write the failing test**

Create `tests/tour-gallery.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TourGallery } from '@/components/trips/TourGallery';
import type { GalleryImage } from '@/lib/gallery';

// jsdom implements <dialog> without showModal/close.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

const photos = (n: number): GalleryImage[] =>
  Array.from({ length: n }, (_, i) => ({ url: `https://cdn.example.com/${i}.jpg`, alt: `Φωτογραφία ${i + 1}` }));

describe('TourGallery', () => {
  it('renders nothing without photos', () => {
    const { container } = render(<TourGallery images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows five cells and the See-all pill for a 7-photo tour', () => {
    render(<TourGallery images={photos(7)} />);
    expect(screen.getAllByTestId('gallery-cell')).toHaveLength(5);
    expect(screen.getByText('Δείτε και τις 7')).toBeInTheDocument();
  });

  it('shows every photo and no pill when there are three', () => {
    render(<TourGallery images={photos(3)} />);
    expect(screen.getAllByTestId('gallery-cell')).toHaveLength(3);
    expect(screen.queryByText(/Δείτε και τις/)).not.toBeInTheDocument();
  });

  it('lists every photo in the lightbox, including the ones not shown inline', () => {
    render(<TourGallery images={photos(7)} />);
    expect(screen.getAllByTestId('lightbox-photo')).toHaveLength(7);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/tour-gallery.test.tsx
```

Expected: FAIL — `Failed to resolve import "@/components/trips/TourGallery"`.

- [ ] **Step 3: Write the implementation**

Create `components/trips/TourGallery.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run tests/tour-gallery.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Typecheck, lint and commit**

```bash
npx tsc --noEmit && npm run lint
git add components/trips/TourGallery.tsx tests/tour-gallery.test.tsx
git commit -m "feat(gallery): πλέγμα φωτογραφιών εκδρομής με lightbox"
```

---

## Task 3: Mobile carousel

**Files:**
- Modify: `components/trips/TourGallery.tsx`
- Test: `tests/tour-gallery.test.tsx`

**Interfaces:**
- Consumes: the `TourGallery` component from Task 2 — same props, no API change.
- Produces: a `md:hidden` carousel with `data-testid="gallery-carousel"`, prev/next buttons labelled «Προηγούμενη φωτογραφία» / «Επόμενη φωτογραφία», and at most 8 dots.

- [ ] **Step 1: Write the failing test**

Append to `tests/tour-gallery.test.tsx` (inside the existing `describe('TourGallery', …)` block):

```tsx
  it('renders a mobile carousel slide per photo, with dots capped at eight', () => {
    render(<TourGallery images={photos(12)} />);
    expect(screen.getByTestId('gallery-carousel')).toBeInTheDocument();
    expect(screen.getAllByTestId('carousel-slide')).toHaveLength(12);
    expect(screen.getAllByTestId('carousel-dot')).toHaveLength(8);
  });

  it('advances the carousel when the next button is clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<TourGallery images={photos(3)} />);
    const track = screen.getByTestId('carousel-track');
    expect(track).toHaveStyle({ transform: 'translateX(-0%)' });
    await userEvent.click(screen.getByRole('button', { name: 'Επόμενη φωτογραφία' }));
    expect(track).toHaveStyle({ transform: 'translateX(-100%)' });
  });

  it('hides the arrows for a single photo', () => {
    render(<TourGallery images={photos(1)} />);
    expect(screen.queryByRole('button', { name: 'Επόμενη φωτογραφία' })).not.toBeInTheDocument();
  });
```

> `@testing-library/user-event` is NOT in `package.json`. If the import fails, replace the click line with `fireEvent.click(...)` and add `fireEvent` to the `@testing-library/react` import — do not install a package.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run tests/tour-gallery.test.tsx
```

Expected: FAIL — `Unable to find an element by: [data-testid="gallery-carousel"]`.

- [ ] **Step 3: Write the implementation**

In `components/trips/TourGallery.tsx`, add `ChevronLeft, ChevronRight` to the lucide import:

```tsx
import { ChevronLeft, ChevronRight, LayoutGrid, X } from 'lucide-react';
```

Add carousel state next to the existing state declarations:

```tsx
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(0);
  const swiped = useRef(false);
```

Add the carousel helper just below `openAt`:

```tsx
  const go = (to: number) => setSlide((to + images.length) % images.length);
```

Insert this block immediately before the `<div className="hidden md:block">` desktop grid:

```tsx
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
              className="absolute left-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-surface/95 text-primary shadow-card"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => go(slide + 1)}
              aria-label="Επόμενη φωτογραφία"
              className="absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-surface/95 text-primary shadow-card"
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run tests/tour-gallery.test.tsx
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Typecheck, lint and commit**

```bash
npx tsc --noEmit && npm run lint
git add components/trips/TourGallery.tsx tests/tour-gallery.test.tsx
git commit -m "feat(gallery): carousel φωτογραφιών για κινητά"
```

---

## Task 4: Mount it on the tour page (layout Γ)

**Files:**
- Modify: `app/(site)/tour/[slug]/page.tsx`

**Interfaces:**
- Consumes: `<TourGallery images={…} />` from Task 2/3 and `galleryImages(tour)` from Task 1.
- Produces: the finished page — no other file depends on it.

What changes, in order:
1. The hero loses `photo` / `photoAlt` and shrinks to `h-[38vh] min-h-[300px]` (`PageHero` falls back to the `bg-mesh-blue` gradient on its own).
2. A new full-width gallery section sits between the hero and the description/booking grid.
3. The old «Φωτογραφίες» IIFE section near the bottom is deleted.
4. `coverImage` / `imageUrl` stay — metadata and JSON-LD still need the cover URL.

- [ ] **Step 1: Add the imports**

In `app/(site)/tour/[slug]/page.tsx`, add next to the other component imports:

```tsx
import { TourGallery } from '@/components/trips/TourGallery';
```

and extend the booking-helper import line:

```tsx
import { bookableDepartures, headlinePrice } from '@/lib/booking';
import { galleryImages } from '@/lib/gallery';
```

- [ ] **Step 2: Build the image list next to the other derived values**

Directly below the existing `const bookable = tiers.length > 0;` line, add:

```tsx
  const photos = galleryImages(tour);
```

- [ ] **Step 3: Drop the photo from the hero**

Replace the `<PageHero … />` call with:

```tsx
      <PageHero
        eyebrow={primaryCat?.name_el}
        title={tour.title}
        subtitle={tour.summary ?? undefined}
        breadcrumbs={[
          { label: 'Αρχική', href: '/' },
          { label: 'Εκδρομές', href: '/ekdromes' },
          { label: tour.title },
        ]}
        heightClass="h-[38vh] min-h-[300px]"
        breadcrumbsPosition="bottom"
      />
```

- [ ] **Step 4: Render the gallery under the hero**

Immediately after the `</PageHero>` call (before `<section className="py-16 md:py-24">`), add:

```tsx
      {photos.length > 0 && (
        <section className="pt-10 md:pt-14">
          <div className="container">
            <TourGallery images={photos} />
          </div>
        </section>
      )}
```

- [ ] **Step 5: Delete the old «Φωτογραφίες» section**

Remove the whole IIFE block that starts with `{(() => {` and `const gallery = (tour.images ?? []).filter((im) => im.id !== tour.cover_image_id);` and ends with `})()}` — the gallery above replaces it. Leave the «Παρόμοιες εκδρομές» section untouched.

- [ ] **Step 6: Verify the whole suite, types and build**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```

Expected: 112+ tests pass, no type errors, no lint errors, build completes with `/tour/[slug]` prerendered.

- [ ] **Step 7: Check it in a browser**

```bash
npm run dev
```

Open `http://localhost:3000/tour/monoimeri-ekdromi-stin-mani-limeni-areopoli-sergiani-travel` and confirm:
- the hero is the short gradient band with title and breadcrumbs, no cover photo;
- the gallery below shows one big photo and four small, with the «Δείτε και τις N» pill on the last;
- clicking any cell opens the lightbox scrolled to that photo, Esc and the ✕ close it;
- at a narrow window the carousel replaces the grid, arrows and dots work, a tap opens the lightbox;
- the bottom of the page no longer has a separate «Φωτογραφίες» grid.

- [ ] **Step 8: Commit**

```bash
git add "app/(site)/tour/[slug]/page.tsx"
git commit -m "feat(tour): gallery φωτογραφιών κάτω από λιτό hero, χωρίς διπλή φωτογραφία"
```

---

## Manual QA checklist (after Task 4)

Run through a tour of each size — the seed data and the live DB have all of them:

| Φωτογραφίες | Αναμενόμενο desktop | Pill |
|---|---|---|
| 0 | καμία gallery, η σελίδα ξεκινά από την περιγραφή | — |
| 1 | μία φωτογραφία, κεντραρισμένη, max-w-3xl | όχι |
| 2 / 3 / 4 | 2 / 3 / 4 φωτογραφίες σε σειρά | όχι |
| 5+ | 1 μεγάλη + 4 μικρές | «Δείτε και τις N» |

Also confirm the tour page still passes its structured data: the JSON-LD `image` array keeps using the cover URL, which Task 4 does not touch.
