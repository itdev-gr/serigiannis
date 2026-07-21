'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'cookie-consent';

type CategoryId = 'necessary' | 'performance' | 'targeting' | 'functionality' | 'unclassified';

const CATEGORIES: { id: CategoryId; label: string; required?: boolean }[] = [
  { id: 'necessary', label: 'Απολύτως απαραίτητα', required: true },
  { id: 'performance', label: 'Απόδοσης' },
  { id: 'targeting', label: 'Στόχευσης' },
  { id: 'functionality', label: 'Λειτουργικότητας' },
  { id: 'unclassified', label: 'Αταξινόμητα' },
];

type ConsentState = Record<CategoryId, boolean>;

const defaultOptional: ConsentState = {
  necessary: true,
  performance: false,
  targeting: false,
  functionality: false,
  unclassified: false,
};

const allAccepted: ConsentState = {
  necessary: true,
  performance: true,
  targeting: true,
  functionality: true,
  unclassified: true,
};

function loadStored(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  if (raw === 'accepted' || raw === 'declined') return true;
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

function saveConsent(categories: ConsentState, choice: 'accepted' | 'declined' | 'custom') {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, categories, at: new Date().toISOString() }));
}

function CategoryRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 py-2.5',
        disabled && 'cursor-default opacity-90'
      )}
    >
      <span
        className={cn(
          'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
          checked ? 'border-gold bg-gold' : 'border-white/55 bg-transparent',
          disabled && checked && 'border-white/45 bg-white/25'
        )}
        aria-hidden
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.06em] text-white">{label}</span>
    </label>
  );
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [categories, setCategories] = useState<ConsentState>(defaultOptional);

  useEffect(() => {
    if (!loadStored()) setVisible(true);
  }, []);

  if (!visible) return null;

  function closeWith(cats: ConsentState, choice: 'accepted' | 'declined' | 'custom') {
    saveConsent(cats, choice);
    setVisible(false);
  }

  function toggle(id: CategoryId) {
    if (id === 'necessary') return;
    setCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-deep-ink/50 backdrop-blur-[2px]" aria-hidden onClick={() => closeWith(defaultOptional, 'declined')} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-sea via-primary to-deep-ink text-white shadow-2xl"
      >
        <button
          type="button"
          onClick={() => closeWith(defaultOptional, 'declined')}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Κλείσιμο"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <div className="px-6 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
          <h2 id="cookie-consent-title" className="pr-10 font-display text-2xl font-semibold leading-tight text-white">
            Αυτός ο ιστότοπος χρησιμοποιεί cookies
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85">
            Χρησιμοποιούμε cookies για την εξατομίκευση περιεχομένου και διαφημίσεων και για την ανάλυση της
            επισκεψιμότητάς μας. Μοιραζόμαστε επίσης πληροφορίες σχετικά με τη χρήση του ιστότοπού μας με συνεργάτες
            διαφήμισης και αναλυτικών στοιχείων.{' '}
            <Link href="/politiki-aporritou" className="font-medium text-gold hover:text-gold-hover">
              Διαβάστε περισσότερα
            </Link>
          </p>

          {showDetails && (
            <div className="mt-5 border-t border-white/20 pt-4">
              {CATEGORIES.map(({ id, label, required }) => (
                <CategoryRow
                  key={id}
                  label={label}
                  checked={categories[id]}
                  disabled={required}
                  onChange={required ? undefined : () => toggle(id)}
                />
              ))}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => closeWith(allAccepted, 'accepted')}
              className="rounded-xl bg-gold px-4 py-3.5 font-sans text-[13px] font-bold uppercase tracking-[0.08em] text-deep-ink transition hover:bg-gold-hover"
            >
              Αποδοχή όλων
            </button>
            <button
              type="button"
              onClick={() => closeWith(defaultOptional, 'declined')}
              className="rounded-xl border-2 border-white/40 bg-transparent px-4 py-3.5 font-sans text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:border-white hover:bg-white/5"
            >
              Απόρριψη όλων
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="mt-5 flex w-full items-center justify-center gap-2 font-sans text-[12px] font-semibold uppercase tracking-[0.12em] text-white/90 transition hover:text-white"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
            {showDetails ? 'Απόκρυψη λεπτομερειών' : 'Εμφάνιση λεπτομερειών'}
          </button>

          {showDetails && (
            <button
              type="button"
              onClick={() => closeWith(categories, 'custom')}
              className="mt-3 w-full rounded-xl border border-white/20 py-3 font-sans text-[13px] font-semibold text-white transition hover:bg-white/5"
            >
              Αποθήκευση επιλογών
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
