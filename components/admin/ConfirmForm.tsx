'use client';
import type { ReactNode } from 'react';

/** Wraps a server-action form with a native confirm() guard. */
export function ConfirmForm({
  action,
  message,
  children,
}: {
  action: () => void | Promise<void>;
  message: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
