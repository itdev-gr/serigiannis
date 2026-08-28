'use client';
import { useState, useTransition } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Category, SettingsData } from '@/types/db';
import { storageUrl } from '@/lib/images';
import { DEFAULT_HERO_IMAGES } from '@/data/hero-images';
import { categoryCoverImage } from '@/data/category-images';
import { UPLOAD_RULES } from '@/lib/upload';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { Pill } from '@/components/admin/ui';
import {
  addHomeHeroImages,
  moveHomeHeroImage,
  removeHomeHeroImage,
  resetHomeCategoryImage,
  setHomeCategoryImage,
} from '@/app/admin/(dashboard)/actions';

const smallBtn =
  'inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 font-sans text-[12px] font-medium text-body transition hover:border-primary hover:text-primary disabled:opacity-50';

/** Ρυθμίσεις › Εικόνες: hero slideshow και εξώφυλλα καρτών κατηγοριών της
 *  αρχικής. Κάθε ενέργεια αποθηκεύεται αμέσως (χωρίς κουμπί «Αποθήκευση»). */
export function HomeImagesManager({ settings, categories }: { settings: SettingsData; categories: Category[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const heroAdmin = (settings.homeImages?.hero ?? [])
    .map((h) => ({ path: h.path, src: storageUrl(h.path) }))
    .filter((h): h is { path: string; src: string } => !!h.src);
  const usingDefaultHero = heroAdmin.length === 0;

  const run = (fn: () => Promise<{ ok: boolean }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError('Κάτι πήγε στραβά. Η αλλαγή ΔΕΝ αποθηκεύτηκε.');
    });

  return (
    <div className="grid gap-10">
      {error && (
        <div className="rounded-md border border-cta/40 bg-cta/10 px-4 py-3 font-sans text-[14px] font-medium text-cta">{error}</div>
      )}

      <section className="grid gap-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-primary">Hero, εικόνες slideshow</h2>
          <p className="mt-1 text-[14px] text-muted">
            Εναλλάσσονται κάθε 5 δευτερόλεπτα στην κορυφή της αρχικής, με τη σειρά που φαίνονται εδώ. Κατά προτίμηση
            οριζόντιες, τουλάχιστον {UPLOAD_RULES.minWidth}px πλάτος. Αν διαγράψετε όλες, επανέρχονται οι
            προεπιλεγμένες.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {usingDefaultHero
            ? DEFAULT_HERO_IMAGES.map((img) => (
                <div key={img.src} className="relative overflow-hidden rounded-md border border-border bg-surface">
                  <img src={img.src} alt={img.alt} className="aspect-[4/3] w-full object-cover" />
                  <span className="absolute left-2 top-2">
                    <Pill tone="muted">Προεπιλογή</Pill>
                  </span>
                </div>
              ))
            : heroAdmin.map((img, i) => (
                <div key={img.path} className="overflow-hidden rounded-md border border-border bg-surface">
                  <div className="relative">
                    <img src={img.src} alt={`Εικόνα ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 font-sans text-[11px] font-semibold text-surface">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2">
                    <button
                      type="button"
                      className={smallBtn}
                      disabled={pending || i === 0}
                      aria-label="Μετακίνηση πριν"
                      onClick={() => run(() => moveHomeHeroImage(img.path, -1))}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className={smallBtn}
                      disabled={pending || i === heroAdmin.length - 1}
                      aria-label="Μετακίνηση μετά"
                      onClick={() => run(() => moveHomeHeroImage(img.path, 1))}
                    >
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <ConfirmForm
                      action={async () => {
                        const res = await removeHomeHeroImage(img.path);
                        if (!res.ok) setError('Η διαγραφή της φωτογραφίας απέτυχε. Η φωτογραφία παραμένει.');
                      }}
                      message="Διαγραφή εικόνας από το hero;"
                    >
                      <button type="button" className={`${smallBtn} ml-auto text-cta hover:border-cta hover:text-cta`}>
                        Διαγραφή
                      </button>
                    </ConfirmForm>
                  </div>
                </div>
              ))}
        </div>

        <ImageUploader upload={addHomeHeroImages} idleLabel="Προσθήκη εικόνων στο hero" />
      </section>

      <section className="grid gap-5 border-t border-border pt-8">
        <div>
          <h2 className="font-display text-2xl font-semibold text-primary">Κάρτες κατηγοριών</h2>
          <p className="mt-1 text-[14px] text-muted">
            Η φωτογραφία κάθε κάρτας στην ενότητα «Προορισμοί» της αρχικής (κάθετη 4:5). Χωρίς δική σας εικόνα
            χρησιμοποιείται η προεπιλεγμένη — ή, αν δεν υπάρχει, το εξώφυλλο μιας εκδρομής της κατηγορίας.
          </p>
        </div>

        <div className="grid gap-4">
          {categories.map((cat) => {
            const adminPath = settings.homeImages?.categories?.[cat.slug]?.path;
            const adminSrc = storageUrl(adminPath);
            const fallback = categoryCoverImage(cat.slug);
            const src = adminSrc ?? fallback?.src ?? null;
            return (
              <div key={cat.id} className="grid gap-4 rounded-md border border-border bg-surface p-3 sm:grid-cols-[96px_1fr] sm:items-start">
                <div className="relative">
                  {src ? (
                    <img src={src} alt={cat.name_el} className="aspect-[4/5] w-full rounded-md object-cover" />
                  ) : (
                    <div className="grid aspect-[4/5] w-full place-items-center rounded-md bg-primary/10 text-[12px] text-muted">—</div>
                  )}
                </div>
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-semibold text-primary">{cat.name_el}</span>
                    {adminSrc ? <Pill tone="ok">Δική σας εικόνα</Pill> : <Pill tone="muted">Προεπιλογή</Pill>}
                    {adminSrc && (
                      <ConfirmForm
                        action={async () => {
                          const res = await resetHomeCategoryImage(cat.slug);
                          if (!res.ok) setError('Η επαναφορά απέτυχε. Η εικόνα παραμένει.');
                        }}
                        title="Επαναφορά προεπιλογής"
                        confirmLabel="Επαναφορά"
                        variant="default"
                        message={`Να αφαιρεθεί η δική σας εικόνα για «${cat.name_el}» και να επανέλθει η προεπιλεγμένη;`}
                      >
                        <button type="button" className={`${smallBtn} ml-auto`}>Επαναφορά προεπιλογής</button>
                      </ConfirmForm>
                    )}
                  </div>
                  <ImageUploader
                    upload={setHomeCategoryImage.bind(null, cat.slug)}
                    multiple={false}
                    idleLabel={adminSrc ? 'Αντικατάσταση εικόνας' : 'Ανέβασμα εικόνας'}
                    rulesText={null}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
