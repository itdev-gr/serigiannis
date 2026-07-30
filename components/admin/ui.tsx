import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The admin form-input class. Compact 14px — the admin norm. */
export const adminInput =
  'w-full rounded-md border border-border bg-surface px-3 py-2 font-sans text-[14px] text-body focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

/** The admin field-label class. */
export const adminLabel = 'block text-[13px] text-muted';

/** Standard admin page header: optional back link, title, subtitle and a right-aligned actions slot. */
export function AdminPageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {backHref && (
        <p className="mb-2 text-[13px]">
          <Link href={backHref} className="text-muted hover:text-primary">← {backLabel}</Link>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold text-primary">{title}</h1>
          {subtitle && <p className="mt-2 text-[14px] text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/** A bordered surface card. */
export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-lg border border-border bg-surface p-6', className)}>{children}</div>;
}

export type PillTone = 'ok' | 'warn' | 'danger' | 'muted' | 'info';

const PILL_TONE: Record<PillTone, string> = {
  ok: 'bg-olive/15 text-olive',
  warn: 'bg-gold/20 text-deep-ink',
  danger: 'bg-cta/10 text-cta',
  muted: 'bg-background text-muted',
  info: 'bg-primary/10 text-primary',
};

/** A rounded status chip. */
export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold', PILL_TONE[tone])}>
      {children}
    </span>
  );
}
