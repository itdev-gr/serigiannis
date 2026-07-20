'use client';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

/** mm:ss countdown to the hold expiry; reloads the page when it hits zero. */
export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));

  useEffect(() => {
    const t = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) {
        clearInterval(t);
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const totalSec = Math.floor(left / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const urgent = totalSec < 300;

  return (
    <p
      className={`flex items-center gap-2 rounded-md px-4 py-3 text-[14px] font-semibold ${
        urgent ? 'bg-cta/10 text-cta' : 'bg-gold/15 text-deep-ink'
      }`}
      aria-live="polite"
    >
      <Clock className="h-4 w-4" />
      Οι θέσεις σας παραμένουν δεσμευμένες για {mm}:{ss}. Ολοκληρώστε την αγορά πριν λήξει ο χρόνος.
    </p>
  );
}
