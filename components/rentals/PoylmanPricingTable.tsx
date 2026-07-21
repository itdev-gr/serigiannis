import type { PoylmanPriceTable } from '@/data/poylman-page';

export function PoylmanPricingTable({ table }: { table: PoylmanPriceTable }) {
  return (
    <div className="mt-14 first:mt-0">
      <h2 className="font-display text-3xl font-semibold text-primary md:text-4xl">{table.title}</h2>
      {table.note && <p className="mt-4 text-[17px] leading-[1.75] text-body md:text-[18px]">{table.note}</p>}
      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
        <table className="w-full min-w-[880px] text-left text-[16px] md:text-[17px]">
          <thead>
            <tr className="border-b border-border bg-background/80">
              <th className="px-5 py-4 font-sans text-[14px] font-semibold uppercase tracking-[0.08em] text-body md:text-[15px]">
                Διαδρομή
              </th>
              {table.columns.map((col) => (
                <th
                  key={col}
                  className="px-5 py-4 font-sans text-[14px] font-semibold uppercase tracking-[0.06em] text-body md:text-[15px]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.destination} className="border-b border-border/70 align-top last:border-b-0">
                <td className="px-5 py-4 font-medium text-body">{row.destination}</td>
                {row.prices.map((price, i) => (
                  <td key={i} className="whitespace-nowrap px-5 py-4 text-[16px] font-semibold text-primary md:text-[17px]">
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
