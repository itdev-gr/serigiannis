'use client';
import { useState, useTransition, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Wraps a server-action trigger with a confirmation modal. */
export function ConfirmForm({
  action,
  message,
  children,
  title = 'Επιβεβαίωση διαγραφής',
  confirmLabel = 'Διαγραφή',
  variant = 'danger',
}: {
  action: () => void | Promise<void>;
  message: string;
  children: ReactNode;
  title?: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Ελεγχόμενο dialog: όταν η ενέργεια αποτύχει (π.χ. λεωφορείο σε χρήση,
  // εκδρομή με δρομολόγια) ο server κάνει redirect με ?error= αντί να
  // αφαιρέσει τη γραμμή, οπότε ένα uncontrolled modal έμενε ανοιχτό και το
  // overlay του έκρυβε το μήνυμα λάθους. Κλείνουμε μόλις τελειώσει η ενέργεια.
  const run = () => {
    startTransition(async () => {
      try {
        await action();
      } finally {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!pending) setOpen(v); }}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-deep-ink/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-6 shadow-card-hover">
          <div className="flex items-start gap-4">
            {variant === 'danger' && (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cta/10 text-cta">
                <TriangleAlert className="h-5 w-5" strokeWidth={1.75} />
              </span>
            )}
            <div>
              <Dialog.Title className="font-display text-xl font-semibold text-primary">{title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-[14px] leading-relaxed text-body">{message}</Dialog.Description>
              {variant === 'danger' && (
                <p className="mt-2 text-[13px] font-medium text-cta">Η ενέργεια είναι οριστική και δεν αναιρείται.</p>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button type="button" size="sm" variant="outline" disabled={pending}>Άκυρο</Button>
            </Dialog.Close>
            <Button
              type="button"
              size="sm"
              variant={variant === 'danger' ? 'primary' : 'dark'}
              disabled={pending}
              onClick={run}
            >
              {pending ? `${confirmLabel}…` : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
