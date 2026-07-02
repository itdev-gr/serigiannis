import type { LeadStatus, LeadType } from '@/types/db';

const STATUS: Record<LeadStatus, { label: string; cls: string }> = {
  new:       { label: 'Νέο',            cls: 'bg-cta/15 text-cta' },
  contacted: { label: 'Επικοινωνία',    cls: 'bg-sea/15 text-primary' },
  booked:    { label: 'Κράτηση',        cls: 'bg-olive/15 text-olive' },
  completed: { label: 'Ολοκληρώθηκε',   cls: 'bg-muted/15 text-muted' },
  cancelled: { label: 'Ακυρώθηκε',      cls: 'bg-amber/15 text-[#a15c00]' },
};
const TYPE: Record<LeadType, string> = { contact: 'Επικοινωνία', quote: 'Προσφορά', booking: 'Κράτηση' };

export function StatusBadge({ status }: { status: LeadStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] ${s.cls}`}>{s.label}</span>;
}
export function TypeBadge({ type }: { type: LeadType }) {
  return <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">{TYPE[type]}</span>;
}
