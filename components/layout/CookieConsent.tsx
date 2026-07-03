'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cookie-consent');
    if (stored !== 'accepted' && stored !== 'declined') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function accept() {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Συγκατάθεση cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur px-5 py-4 shadow-lg"
    >
      <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14px] text-body">
          Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία σας. Διαβάστε την{' '}
          <Link href="/politiki-aporritou" className="underline hover:text-cta">
            Πολιτική Απορρήτου
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-4">
          <button type="button" onClick={decline} className="text-[14px] text-muted underline-offset-4 hover:underline">
            Απόρριψη
          </button>
          <Button type="button" onClick={accept}>
            Αποδοχή
          </Button>
        </div>
      </div>
    </div>
  );
}
