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
        'flex cursor-pointer items-center gap-2 py-1.5',
        disabled && 'cursor-default opacity-90'
      )}
    >
      <span
        className={cn(
          'grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors',
          checked ? 'border-gold bg-gold' : 'border-white/55 bg-transparent',
          disabled && checked && 'border-white/45 bg-white/25'
        )}
        aria-hidden
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-deep-ink" fill="none" stroke="currentColor" strokeWidth={2}>
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
      <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.05em] text-white">{label}</span>
    </label>
  );
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      className="fixed bottom-4 left-4 z-[100] w-[min(100%,22rem)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-sea via-primary to-deep-ink text-white shadow-2xl sm:bottom-5 sm:left-5"
    >
      <button
        type="button"
        onClick={() => closeWith(defaultOptional, 'declined')}
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
        aria-label="Κλείσιμο"
      >
        <X className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <div className="px-4 pb-4 pt-5">
        <h2 id="cookie-consent-title" className="pr-8 font-display text-[17px] font-semibold leading-snug text-white">
          Αυτός ο ιστότοπος χρησιμοποιεί cookies
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/85">
          Χρησιμοποιούμε cookies για λειτουργία, στατιστικά και marketing.{' '}
          <Link href="/politiki-aporritou" className="font-medium text-gold hover:text-gold-hover">
            Διαβάστε περισσότερα
          </Link>
        </p>

        {showDetails && (
          <div className="mt-3 max-h-40 overflow-y-auto border-t border-white/20 pt-3">
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

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => closeWith(allAccepted, 'accepted')}
            className="rounded-lg bg-gold px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.06em] text-deep-ink transition hover:bg-gold-hover"
          >
            Αποδοχή όλων
          </button>
          <button
            type="button"
            onClick={() => closeWith(defaultOptional, 'declined')}
            className="rounded-lg border border-white/40 bg-transparent px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.06em] text-white transition hover:border-white hover:bg-white/5"
          >
            Απόρριψη όλων
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-white/90 transition hover:text-white"
        >
          <Settings className="h-3.5 w-3.5" strokeWidth={1.75} />
          {showDetails ? 'Απόκρυψη λεπτομερειών' : 'Εμφάνιση λεπτομερειών'}
        </button>

        {showDetails && (
          <button
            type="button"
            onClick={() => closeWith(categories, 'custom')}
            className="mt-2 w-full rounded-lg border border-white/20 py-2 font-sans text-[11px] font-semibold text-white transition hover:bg-white/5"
          >
            Αποθήκευση επιλογών
          </button>
        )}
      </div>
    </div>
  );
}
