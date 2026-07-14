import { Banknote, CreditCard, Smartphone, Nfc } from 'lucide-react';

const METHODS = [
  { Icon: Banknote, label: 'Μετρητά' },
  { Icon: Nfc, label: 'POS' },
  { Icon: Smartphone, label: 'IRIS' },
  { Icon: CreditCard, label: 'Πιστωτικές & Χρεωστικές Κάρτες' },
];

/** Accepted payment methods (client feedback item 5). Light backgrounds only. */
export function PaymentMethods({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Τρόποι πληρωμής</div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {METHODS.map(({ Icon, label }) => (
          <li key={label} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 font-sans text-[13px] text-body">
            <Icon className="h-4 w-4 text-primary/70" strokeWidth={1.75} /> {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
