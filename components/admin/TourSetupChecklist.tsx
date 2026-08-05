import { AdminCard, Pill } from '@/components/admin/ui';
import { setupChecklist, type TourSetupInput } from '@/lib/tour-setup';

/** Read-only card at the top of the tour edit page: what still needs to be
 *  set up before the tour sells online, in plain terms for a non-technical
 *  clerk. Pure rules live in `lib/tour-setup.ts` — this only renders them. */
export function TourSetupChecklist(input: TourSetupInput) {
  const items = setupChecklist(input);
  const doneCount = items.filter((i) => i.done).length;

  return (
    <AdminCard className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-primary">Τι χρειάζεται η εκδρομή</h2>
        <span className="text-[13px] text-muted">{doneCount} από {items.length} έτοιμα</span>
      </div>
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <span
              className={
                item.done
                  ? 'mt-0.5 shrink-0 text-olive'
                  : 'mt-0.5 shrink-0 text-muted'
              }
              aria-hidden
            >
              {item.done ? '✓' : '○'}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] text-body">{item.label}</p>
                {item.warning && <Pill tone="warn">Προσοχή</Pill>}
              </div>
              {item.hint && <p className="mt-0.5 text-[12px] text-muted">{item.hint}</p>}
            </div>
          </li>
        ))}
      </ul>
    </AdminCard>
  );
}
