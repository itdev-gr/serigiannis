import Image from 'next/image';
import type { TourImage as TImage } from '@/types/db';
import { imageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';

/** next/image wrapper for a tour image: fills its (positioned) parent, blur-up when a
 *  blurhash/LQIP data-URI is present, priority for above-the-fold/LCP. */
export function TourImage({
  image,
  alt,
  sizes = '(max-width: 768px) 100vw, 50vw',
  className,
  priority = false,
}: {
  image?: TImage | null;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  const src = imageUrl(image);
  if (!src) {
    return <div className={cn('h-full w-full bg-gradient-to-br from-primary/15 to-sea/15', className)} aria-hidden />;
  }
  const hasBlur = Boolean(image?.blurhash && image.blurhash.startsWith('data:'));
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn('object-cover', className)}
      placeholder={hasBlur ? 'blur' : 'empty'}
      blurDataURL={hasBlur ? (image!.blurhash as string) : undefined}
    />
  );
}
