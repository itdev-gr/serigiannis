import type { PoylmanPriceTable } from '@/data/poylman-page';

export function PoylmanPricingTable({ table }: { table: PoylmanPriceTable }) {
  return (
    <div className="mt-14 first:mt-0">
      <h2 className="font-display text-2xl font-semibold text-primary md:text-3xl">{table.title}</h2>
      {table.note && <p className="mt-4 text-[16px] leading-[1.7] text-body md:text-[17px]">{table.note}</p>}
      {/* Ο πίνακας ζει πλέον στην αριστερή στήλη (~700px σε desktop): μικρότερο
          ελάχιστο πλάτος και σφιχτότερα κελιά ώστε να μη χρειάζεται οριζόντιο
          scroll. Το overflow-x-auto μένει ως δίχτυ για πολύ στενές οθόνες. */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full min-w-[560px] text-left text-[15px] md:text-[16px]">
          <thead>
            <tr className="border-b border-border bg-background/80">
              <th className="px-3 py-3 font-sans text-[13px] font-semibold uppercase tracking-[0.06em] text-body sm:px-4 md:text-[14px]">
                Διαδρομή
              </th>
              {table.columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-3 font-sans text-[13px] font-semibold uppercase tracking-[0.06em] text-body sm:px-4 md:text-[14px]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.destination} className="border-b border-border/70 align-top last:border-b-0">
                <td className="px-3 py-3 font-medium text-body sm:px-4">{row.destination}</td>
                {row.prices.map((price, i) => (
                  <td key={i} className="whitespace-nowrap px-3 py-3 text-[15px] font-semibold text-primary sm:px-4 md:text-[16px]">
                    {price}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
