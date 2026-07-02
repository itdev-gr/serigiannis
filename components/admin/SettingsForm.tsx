import type { SettingsData } from '@/types/db';
import { homeContent } from '@/components/home/content';
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

      <div className="flex items-center gap-4">
        <Button type="submit">Αποθήκευση</Button>
      </div>
    </form>
  );
}
