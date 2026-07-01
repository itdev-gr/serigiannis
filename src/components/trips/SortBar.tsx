// src/components/trips/SortBar.tsx
export type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'date';

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Δημοφιλή' },
  { key: 'price-asc', label: 'Τιμή ↑' },
  { key: 'price-desc', label: 'Τιμή ↓' },
  { key: 'date', label: 'Ημερομηνία' },
];

export function SortBar({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div className="sticky top-20 z-20 -mx-4 mb-10 flex items-center gap-4 border-y border-border bg-background/95 px-4 py-4 backdrop-blur">
      <span className="font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">Ταξινόμηση</span>
      <div className="scrollbar-hide flex gap-1 overflow-x-auto">
        {OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 font-sans text-[13px] font-medium transition-colors ${
              value === key ? 'bg-primary text-surface' : 'text-primary hover:bg-primary/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
