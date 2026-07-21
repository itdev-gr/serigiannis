import { PoylmanPricingTable } from '@/components/rentals/PoylmanPricingTable';
import {
  POYLMAN_CONTENT_BLOCKS,
  POYLMAN_TOUR_PRICES,
  POYLMAN_TRANSFER_PRICES,
} from '@/data/poylman-page';

const priceTables = [POYLMAN_TRANSFER_PRICES, POYLMAN_TOUR_PRICES];

export function PoylmanPageBody() {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container max-w-5xl">
        <div className="space-y-5 text-[17px] leading-[1.75] text-body md:text-[18px]">
          {POYLMAN_CONTENT_BLOCKS.map((block) =>
            block.type === 'subheading' ? (
              <h2
                key={block.text}
                className="!mt-12 font-display text-3xl font-semibold text-primary first:!mt-0 md:text-4xl"
              >
                {block.text}
              </h2>
            ) : (
              <p key={block.text.slice(0, 48)}>{block.text}</p>
            ),
          )}
        </div>

        <div className="mt-16 border-t border-border pt-16">
          {priceTables.map((table) => (
            <PoylmanPricingTable key={table.id} table={table} />
          ))}
        </div>
      </div>
    </section>
  );
}
