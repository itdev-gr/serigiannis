import type { TourImage } from '@/types/db';
import { imageUrl } from '@/lib/images';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { deleteTourImage, setCoverImage } from '@/app/admin/(dashboard)/actions';
import { ImageUploader } from '@/components/admin/ImageUploader';

export function GalleryManager({
  tourId,
  images,
  coverImageId,
}: {
  tourId: string;
  images: TourImage[];
  coverImageId: string | null;
}) {
  const sorted = [...images].sort((a, b) => a.position - b.position);

  return (
    <div className="mt-10 max-w-3xl">
      <h2 className="mb-1 font-display text-2xl font-semibold text-primary">Πολυμέσα</h2>
      <p className="mb-5 text-[13px] text-muted">{sorted.length} {sorted.length === 1 ? 'εικόνα' : 'εικόνες'}</p>

      {sorted.length === 0 ? (
        <p className="mb-6 text-[14px] text-muted">Δεν υπάρχουν ακόμη εικόνες για αυτή την εκδρομή.</p>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {sorted.map((img) => {
            const isCover = img.id === coverImageId;
            return (
              <div key={img.id} className="group relative overflow-hidden rounded-md border border-border bg-surface">
                <img src={imageUrl(img)!} alt={img.alt_el ?? ''} className="aspect-[4/3] w-full rounded-md object-cover" />
                {isCover && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-surface">
                    Εξώφυλλο
                  </span>
                )}
                <div className="flex flex-col gap-1.5 p-2">
                  {!isCover && (
                    <form action={setCoverImage.bind(null, tourId, img.id)}>
                      <button type="button" className="w-full rounded-md border border-border px-2 py-1.5 font-sans text-[12px] font-medium text-body transition hover:border-primary hover:text-primary">
                        Ορισμός εξωφύλλου
                      </button>
                    </form>
                  )}
                  <ConfirmForm action={deleteTourImage.bind(null, img.id, tourId)} message="Διαγραφή εικόνας;">
                    <button type="button" className="w-full rounded-md border border-border px-2 py-1.5 font-sans text-[12px] font-medium text-cta transition hover:border-cta">
                      Διαγραφή
                    </button>
                  </ConfirmForm>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ImageUploader tourId={tourId} />
    </div>
  );
}
