import { CalendarDays, MapPin, Users } from 'lucide-react';
import { formatCents } from '@/lib/booking';
import type { TourOrder } from '@/types/db';

/** Read-only recap of a tour booking — shared by checkout, confirmation and email copy. */
export function TourOrderSummary({ order }: { order: TourOrder }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
      <h2 className="font-display text-2xl font-semibold text-primary">{order.tour_title}</h2>
      <ul className="mt-4 space-y-2.5 text-[15px] text-body">
        {order.departure_date && (
          <li className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 shrink-0 text-primary/60" strokeWidth={1.75} />
            <span>
              Αναχώρηση:{' '}
              {new Date(`${order.departure_date}T12:00:00`).toLocaleDateString('el-GR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </li>
        )}
        <li className="flex items-center gap-3">
          <MapPin className="h-5 w-5 shrink-0 text-primary/60" strokeWidth={1.75} />
          <span>Κωδικός κράτησης: <strong className="font-mono tracking-[0.15em] text-primary">{order.public_code}</strong></span>
        </li>
        {order.meeting_point && (
          <li className="flex items-center gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-primary/60" strokeWidth={1.75} />
            <span>Σημείο συνάντησης: <strong className="text-primary">{order.meeting_point}</strong></span>
          </li>
        )}
      </ul>

      <table className="mt-5 w-full border-t border-border text-[15px]">
        <tbody>
          {order.items.map((item) => (
            <tr key={item.tier_id} className="border-b border-border/60">
              <td className="py-2.5 pr-3 text-body">
                {item.label}
                <span className="block text-[13px] text-muted">
                  {item.qty} × {formatCents(item.unit_cents)}
                </span>
              </td>
              <td className="py-2.5 text-right font-semibold text-body">{formatCents(item.line_cents)}</td>
            </tr>
          ))}
          <tr>
            <td className="pt-4 font-sans font-semibold text-primary">Σύνολο</td>
            <td className="pt-4 text-right font-display text-2xl font-bold text-primary">
              {formatCents(order.amount_total_cents)}
            </td>
          </tr>
        </tbody>
      </table>
      {/* Ο πελάτης πληκτρολογεί τα ονόματα στο checkout· χωρίς αυτά εδώ δεν έχει
          πουθενά να ελέγξει ότι τα έγραψε σωστά. Παλιές κρατήσεις (πριν το 0024)
          δεν έχουν καθόλου το πεδίο — εξ ου το `?? []`. */}
      {(order.passengers ?? []).length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">Ταξιδιώτες</h3>
          <ul className="mt-2.5 space-y-1.5 text-[15px] text-body">
            {(order.passengers ?? []).map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0 text-primary/60" strokeWidth={1.75} />
                <span>{p.name}</span>
                {p.phone && <span className="text-[13px] text-muted">· {p.phone}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {order.notes && <p className="mt-4 text-[14px] text-muted">Σημειώσεις: {order.notes}</p>}
    </div>
  );
}
