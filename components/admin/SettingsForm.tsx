import type { SettingsData } from '@/types/db';
import { homeContent } from '@/components/home/content';
import { stats as defaultStats, testimonials as defaultTestimonials } from '@/data/site';
import { Button } from '@/components/ui/Button';

const inputCls =
  'w-full rounded-md border border-border bg-surface px-4 py-2.5 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';
const labelCls = 'mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary';

function Field({ label, name, defaultValue, placeholder, textarea }: {
  label: string; name: string; defaultValue?: string; placeholder?: string; textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {textarea ? (
        <textarea name={name} rows={3} defaultValue={defaultValue} placeholder={placeholder} className={inputCls} />
      ) : (
        <input name={name} defaultValue={defaultValue} placeholder={placeholder} className={inputCls} />
      )}
    </label>
  );
}

export function SettingsForm({
  settings,
  action,
}: {
  settings: SettingsData;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const h = homeContent.hero;
  const a = homeContent.about;
  const statsSrc = settings.stats?.length ? settings.stats : defaultStats;
  const testimonialsSrc = settings.testimonials?.length ? settings.testimonials : defaultTestimonials;
  const trustSrc = settings.trust?.length ? settings.trust : homeContent.about.trust;
  const pageHeroDefaults: Record<string, { label: string; eyebrow: string; title: string; subtitle: string }> = {
    ekdromes: {
      label: 'Εκδρομές',
      eyebrow: '2026',
      title: 'Εκδρομές από την Αθήνα',
      subtitle: 'Επιλέξτε προορισμό — μονοήμερες αποδράσεις, πολυήμερα ταξίδια, κρουαζιέρες και πολλά ακόμη.',
    },
    kroyazieres: {
      label: 'Κρουαζιέρες',
      eyebrow: 'Σαρωνικός · Αργοσαρωνικός',
      title: 'Κρουαζιέρες από τον Πειραιά',
      subtitle: 'Μια μέρα, πολλά νησιά, χίλιες φωτογραφίες. Οργανωμένες κρουαζιέρες με άνετα πλοία και γεύμα εν πλω.',
    },
    poylman: {
      label: 'Πούλμαν',
      eyebrow: 'Εκδρομές · Μεταφορές · Εταιρικά',
      title: 'Ενοικιάσεις Πούλμαν',
      subtitle: 'Ιδιωτικές μεταφορές με σύγχρονα πούλμαν, έμπειρους οδηγούς και ξεκάθαρες τιμές. Από την Αθήνα σε όλη την Ελλάδα.',
    },
    epikoinonia: {
      label: 'Επικοινωνία',
      eyebrow: 'Είμαστε εδώ για εσάς',
      title: 'Επικοινωνήστε μαζί μας',
      subtitle: `${settings.address} · Απαντάμε την ίδια μέρα.`,
    },
    istoriko: {
      label: 'Ιστορικό',
      eyebrow: 'Από το 1995',
      title: 'Ιστορικό Εκδρομών',
      subtitle: 'Τριάντα χρόνια ταξιδιών — ένα δείγμα από τους προορισμούς που έχουμε μοιραστεί με τους ταξιδιώτες μας.',
    },
  };
  return (
    <form action={action} className="grid max-w-2xl gap-8">
      <fieldset className="grid gap-5">
        <legend className="mb-2 font-display text-2xl font-semibold text-primary">Επικοινωνία</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Τηλέφωνο 1" name="phone1" defaultValue={settings.phones[0] ?? ''} />
          <Field label="Τηλέφωνο 2" name="phone2" defaultValue={settings.phones[1] ?? ''} />
          <Field label="Τηλέφωνο 3" name="phone3" defaultValue={settings.phones[2] ?? ''} />
        </div>
        <Field label="Διεύθυνση" name="address" defaultValue={settings.address} />
        <Field label="Email" name="email" defaultValue={settings.email} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ώρες Δευ–Παρ" name="hours_weekdays" defaultValue={settings.hours.weekdays} />
          <Field label="Ώρες Σάββατο" name="hours_saturday" defaultValue={settings.hours.saturday} />
        </div>
        <Field label="Facebook URL" name="social_facebook" defaultValue={settings.social?.facebook ?? ''} />
        <Field label="Instagram URL" name="social_instagram" defaultValue={settings.social?.instagram ?? ''} />
        <Field label="YouTube URL" name="social_youtube" defaultValue={settings.social?.youtube ?? ''} />
      </fieldset>

      <fieldset className="grid gap-5 border-t border-border pt-8">
        <legend className="mb-2 font-display text-2xl font-semibold text-primary">Περιεχόμενο Αρχικής</legend>
        <p className="-mt-1 text-[14px] text-muted">Αφήστε ένα πεδίο κενό για να χρησιμοποιηθεί το προεπιλεγμένο κείμενο.</p>
        <Field label="Hero — Eyebrow" name="hero_eyebrow" defaultValue={settings.hero?.eyebrow ?? ''} placeholder={h.eyebrow} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Hero — Τίτλος (πάνω)" name="hero_titleTop" defaultValue={settings.hero?.titleTop ?? ''} placeholder={h.titleTop} />
          <Field label="Hero — Τίτλος (έμφαση)" name="hero_titleEmph" defaultValue={settings.hero?.titleEmph ?? ''} placeholder={h.titleEmph} />
        </div>
        <Field label="Hero — Υπότιτλος" name="hero_subtitle" defaultValue={settings.hero?.subtitle ?? ''} placeholder={h.subtitle} textarea />
        <Field label="Σχετικά — Eyebrow" name="about_eyebrow" defaultValue={settings.about?.eyebrow ?? ''} placeholder={a.eyebrow} />
        <Field label="Σχετικά — Τίτλος" name="about_title" defaultValue={settings.about?.title ?? ''} placeholder={a.title} />
        <Field label="Σχετικά — Κείμενο" name="about_body" defaultValue={settings.about?.body ?? ''} placeholder={a.body} textarea />
      </fieldset>

      <fieldset className="grid gap-5 border-t border-border pt-8">
        <legend className="mb-2 font-display text-2xl font-semibold text-primary">Αριθμοί</legend>
        <p className="-mt-1 text-[14px] text-muted">Αφήστε κενή την «Ετικέτα» για να μην εμφανιστεί ο αριθμός.</p>
        <div className="grid gap-5">
          {Array.from({ length: 6 }).map((_, i) => {
            const s = statsSrc[i];
            return (
              <div key={i} className="grid gap-5 sm:grid-cols-3">
                <Field label={`Τιμή #${i + 1}`} name={`stat_value_${i}`} defaultValue={s?.value != null ? String(s.value) : ''} />
                <Field label={`Σύμβολο #${i + 1}`} name={`stat_suffix_${i}`} defaultValue={s?.suffix ?? ''} />
                <Field label={`Ετικέτα #${i + 1}`} name={`stat_label_${i}`} defaultValue={s?.label ?? ''} />
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-border pt-8">
        <legend className="mb-2 font-display text-2xl font-semibold text-primary">Αξιολογήσεις</legend>
        <p className="-mt-1 text-[14px] text-muted">Αφήστε κενά τα «Όνομα» και «Κείμενο» για να μην εμφανιστεί η αξιολόγηση.</p>
        <div className="grid gap-5">
          {Array.from({ length: 4 }).map((_, i) => {
            const t = testimonialsSrc[i];
            return (
              <div key={i} className="grid gap-3 rounded-md border border-border p-4">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={`Όνομα #${i + 1}`} name={`testi_name_${i}`} defaultValue={t?.name ?? ''} />
                  <Field label={`Πόλη #${i + 1}`} name={`testi_city_${i}`} defaultValue={t?.city ?? ''} />
                </div>
                <Field label={`Κείμενο #${i + 1}`} name={`testi_quote_${i}`} defaultValue={t?.quote ?? ''} textarea />
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-border pt-8">
        <legend className="mb-2 font-display text-2xl font-semibold text-primary">Γιατί να μας Εμπιστευτείτε</legend>
        <p className="-mt-1 text-[14px] text-muted">Αφήστε κενό τον «Τίτλο» για να μην εμφανιστεί το σημείο.</p>
        <div className="grid gap-5">
          {Array.from({ length: 4 }).map((_, i) => {
            const t = trustSrc[i];
            return (
              <div key={i} className="grid gap-3 rounded-md border border-border p-4">
                <Field label={`Τίτλος #${i + 1}`} name={`trust_title_${i}`} defaultValue={t?.title ?? ''} />
                <Field label={`Κείμενο #${i + 1}`} name={`trust_text_${i}`} defaultValue={t?.text ?? ''} textarea />
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-border pt-8">
        <legend className="mb-2 font-display text-2xl font-semibold text-primary">Επικεφαλίδες Σελίδων</legend>
        <p className="-mt-1 text-[14px] text-muted">Αφήστε ένα πεδίο κενό για να χρησιμοποιηθεί το προεπιλεγμένο κείμενο.</p>
        <div className="grid gap-6">
          {Object.entries(pageHeroDefaults).map(([key, d]) => {
            const o = settings.pageHeros?.[key];
            return (
              <div key={key} className="grid gap-5 rounded-md border border-border p-4">
                <div className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">{d.label}</div>
                <Field label="Eyebrow" name={`pagehero_${key}_eyebrow`} defaultValue={o?.eyebrow ?? ''} placeholder={d.eyebrow} />
                <Field label="Τίτλος" name={`pagehero_${key}_title`} defaultValue={o?.title ?? ''} placeholder={d.title} />
                <Field label="Υπότιτλος" name={`pagehero_${key}_subtitle`} defaultValue={o?.subtitle ?? ''} placeholder={d.subtitle} textarea />
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <Button type="submit">Αποθήκευση</Button>
      </div>
    </form>
  );
}
