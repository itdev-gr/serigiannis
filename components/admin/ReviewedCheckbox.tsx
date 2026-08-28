'use client';
import { useOptimistic, useTransition } from 'react';
import { setVivaTransactionReviewed } from '@/app/admin/(dashboard)/payments/actions';

/** Checkbox «Το είδα» ανά συναλλαγή στη σελίδα «Πληρωμές». Αποθηκεύει
 *  αμέσως στο κλικ (χωρίς κουμπί) και δείχνει optimistic την αλλαγή. */
export function ReviewedCheckbox({ transactionId, reviewed }: { transactionId: string; reviewed: boolean }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(reviewed);

  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-1.5 text-[12px] ${optimistic ? 'text-olive' : 'text-muted'} ${pending ? 'opacity-60' : ''}`}
      title={optimistic ? 'Ελεγμένη — κλικ για αναίρεση' : 'Σήμανση ως ελεγμένη'}
    >
      <input
        type="checkbox"
        checked={optimistic}
        disabled={pending}
        aria-label="Το είδα"
        onChange={(e) => {
          const next = e.currentTarget.checked;
          startTransition(async () => {
            setOptimistic(next);
            await setVivaTransactionReviewed(transactionId, next);
          });
        }}
        className="h-4 w-4 cursor-pointer rounded border-border accent-olive"
      />
      {optimistic ? 'Το είδα' : 'Το είδα;'}
    </label>
  );
}
