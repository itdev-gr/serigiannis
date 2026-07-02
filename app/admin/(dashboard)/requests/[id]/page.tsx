import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLeadById } from '@/lib/queries/leads';
import { StatusBadge, TypeBadge } from '@/components/admin/StatusBadge';
import { setLeadStatus, saveLeadNotes, deleteLead } from '../../actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';

const STATUSES = ['new', 'contacted', 'booked', 'completed', 'cancelled'] as const;
const STATUS_LABEL: Record<string, string> = { new: 'Νέο', contacted: 'Επικοινωνία', booked: 'Κράτηση', completed: 'Ολοκληρώθηκε', cancelled: 'Ακυρώθηκε' };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/requests" className="text-[13px] text-muted hover:text-primary">← Αιτήματα</Link>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-primary">{lead.name}</h1>
        <TypeBadge type={lead.type} /> <StatusBadge status={lead.status} />
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-y-3 rounded-lg border border-border bg-surface p-6 text-[15px]">
        {lead.phone && (<><dt className="text-muted">Τηλέφωνο</dt><dd className="col-span-2"><a href={`tel:${lead.phone.replace(/\s+/g,'')}`} className="text-primary hover:text-cta">{lead.phone}</a></dd></>)}
        {lead.email && (<><dt className="text-muted">Email</dt><dd className="col-span-2"><a href={`mailto:${lead.email}`} className="text-primary hover:text-cta">{lead.email}</a></dd></>)}
        {lead.tour_title && (<><dt className="text-muted">Εκδρομή</dt><dd className="col-span-2">{lead.tour_title}</dd></>)}
        {lead.preferred_date && (<><dt className="text-muted">Ημερομηνία</dt><dd className="col-span-2">{lead.preferred_date}</dd></>)}
        {lead.party_size != null && (<><dt className="text-muted">Άτομα</dt><dd className="col-span-2">{lead.party_size}</dd></>)}
        {lead.subject && (<><dt className="text-muted">Θέμα</dt><dd className="col-span-2">{lead.subject}</dd></>)}
        {lead.message && (<><dt className="text-muted">Μήνυμα</dt><dd className="col-span-2 whitespace-pre-wrap">{lead.message}</dd></>)}
        <dt className="text-muted">Ημ/νία</dt><dd className="col-span-2">{new Date(lead.created_at).toLocaleString('el-GR')}</dd>
      </dl>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">Κατάσταση</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <form key={s} action={setLeadStatus.bind(null, lead.id, s)}>
              <button type="submit" className={`rounded-full border px-3 py-1.5 text-[13px] ${lead.status === s ? 'border-primary bg-primary text-surface' : 'border-border text-body hover:border-primary'}`}>{STATUS_LABEL[s]}</button>
            </form>
          ))}
        </div>
      </div>

      <form action={async (fd: FormData) => { 'use server'; await saveLeadNotes(lead.id, String(fd.get('notes') || '')); }} className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">Σημειώσεις</h2>
        <textarea name="notes" rows={4} defaultValue={lead.admin_notes ?? ''} className="mt-3 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" />
        <div className="mt-3 flex items-center justify-between">
          <Button type="submit" size="sm">Αποθήκευση σημειώσεων</Button>
          <ConfirmForm action={deleteLead.bind(null, lead.id)} message="Διαγραφή αιτήματος;"><span className="text-[13px] text-cta hover:underline">Διαγραφή</span></ConfirmForm>
        </div>
      </form>
    </div>
  );
}
