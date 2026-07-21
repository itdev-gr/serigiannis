const STEPS = ['Ορίστε τον προορισμό σας', 'Διαλέξτε ώρα δρομολογίου', 'Επιλέξτε τις θέσεις σας', 'Ολοκλήρωση αγοράς'];

export function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="mb-10 grid gap-2 sm:grid-cols-4">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li
            key={label}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
              active ? 'border-gold bg-gold/10' : 'border-border bg-surface'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${
                active ? 'bg-gold text-white' : done ? 'bg-primary text-surface' : 'bg-background text-muted'
              }`}
            >
              {n}
            </span>
            <span className={`text-[13px] leading-tight ${active ? 'font-semibold text-body' : 'text-muted'}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
