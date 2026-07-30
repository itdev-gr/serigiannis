import { ADMIN_ERROR_TEXT } from '@/lib/admin-flash';

/** Renders the saved/error flash for an admin page from its searchParams. Nothing if neither is set. */
export function FlashBanner({ saved, error }: { saved?: string; error?: string }) {
  if (error) {
    return (
      <div className="mb-6 rounded-md border border-cta/40 bg-cta/10 px-4 py-3 font-sans text-[14px] font-medium text-cta">
        {ADMIN_ERROR_TEXT[error] ?? ADMIN_ERROR_TEXT.db}
      </div>
    );
  }
  if (saved) {
    return (
      <div className="mb-6 rounded-md border border-olive/40 bg-olive/10 px-4 py-3 font-sans text-[14px] font-medium text-olive">
        Αποθηκεύτηκε.
      </div>
    );
  }
  return null;
}
