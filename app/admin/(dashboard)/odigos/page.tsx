import { AdminPageHeader } from '@/components/admin/ui';
import { OdigosGuide } from '@/components/admin/OdigosGuide';
import { ODIGOS_SECTIONS, withValues } from '@/data/odigos-content';
import { getBookingSettings } from '@/lib/queries/ticketing';
import { refundPolicyText } from '@/lib/ticketing';

export default async function OdigosPage() {
  // Οι αριθμοί του οδηγού (δέσμευση, παράθυρο, πολιτική επιστροφών) έρχονται
  // ζωντανά από τις Ρυθμίσεις Κρατήσεων ώστε το κείμενο να μη μένει ποτέ πίσω.
  const bs = await getBookingSettings();
  const sections = withValues(ODIGOS_SECTIONS, {
    hold_minutes: String(bs.hold_minutes),
    sales_window_days: String(bs.sales_window_days),
    default_cutoff_min: String(bs.default_cutoff_min),
    refund_policy: refundPolicyText(bs),
  });

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="Οδηγός Χρήσης"
        subtitle="Πώς δουλεύει ο πίνακας ελέγχου, βήμα-βήμα. Χρησιμοποιήστε την αναζήτηση για να βρείτε γρήγορα ό,τι χρειάζεστε."
      />
      <OdigosGuide sections={sections} />
    </div>
  );
}
