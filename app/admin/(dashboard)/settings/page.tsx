import { getSettings } from '@/lib/queries/settings';
import { getAdminBookingSettings } from '@/lib/queries/ticketing';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { BookingSettingsForm } from '@/components/admin/BookingSettingsForm';
import { saveSettings } from '../actions';

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [settings, bookingSettings, sp] = await Promise.all([getSettings(), getAdminBookingSettings(), searchParams]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-semibold text-primary">Ρυθμίσεις</h1>
        <p className="mt-1 text-muted">Στοιχεία επικοινωνίας και κείμενα της αρχικής σελίδας.</p>
      </div>

      {sp.saved && (
        <div className="mb-6 rounded-md border border-olive/30 bg-olive/10 px-4 py-3 font-sans text-[14px] font-medium text-olive">
          Οι ρυθμίσεις αποθηκεύτηκαν.
        </div>
      )}

      <SettingsForm settings={settings} action={saveSettings} />
      <BookingSettingsForm settings={bookingSettings} />
    </div>
  );
}
