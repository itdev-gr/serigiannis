'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { CircleHelp, X } from 'lucide-react';
import { formatCents } from '@/lib/ticketing';
import type { OrderFare } from '@/types/ticketing';

/** «Τιμές εισιτηρίων» modal: fare categories, eligibility, one-way/round prices. */
export function FarePricesDialog({ fares }: { fares: OrderFare[] }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline">
          <CircleHelp className="h-4 w-4" /> Τιμές εισιτηρίων
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-deep-ink/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface p-6 shadow-card-hover">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-semibold text-primary">Τιμές εισιτηρίων</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Κλείσιμο" className="rounded p-1 text-muted hover:bg-background">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-border text-[13px] uppercase tracking-[0.06em] text-muted">
                  <th className="py-2 pr-4">Κατηγορία</th>
                  <th className="py-2 pr-4">Δικαιούχοι</th>
                  <th className="py-2 pr-4 text-right">Απλή μετάβαση</th>
                  <th className="py-2 text-right">Με επιστροφή</th>
                </tr>
              </thead>
              <tbody>
                {fares.map((f) => (
                  <tr key={f.id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-4 font-semibold text-body">{f.name}</td>
                    <td className="py-3 pr-4 text-muted">{f.description}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-body">{formatCents(f.price_oneway_cents)}</td>
                    <td className="py-3 text-right font-semibold text-body">{formatCents(f.price_round_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
