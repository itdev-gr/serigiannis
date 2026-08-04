import { CalendarDays, MapPin } from 'lucide-react';
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
      {order.notes && <p className="mt-4 text-[14px] text-muted">Σημειώσεις: {order.notes}</p>}
    </div>
  );
}
