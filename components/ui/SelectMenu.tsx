'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectMenuOption = { value: string; label: string };

/** Custom dropdown που δείχνει ίδιος σε desktop και κινητό. Το native <select>
 *  στο iOS/Android ανοίγει τον picker του λειτουργικού (ρόδα/sheet) αντί για
 *  λίστα κάτω από το πεδίο — εδώ η λίστα είναι δική μας παντού. */
export function SelectMenu({
  id,
  value,
  onChange,
  options,
  className,
  buttonClassName,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      const el = listRef.current?.children[activeIndex];
      if (el instanceof HTMLElement && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [open, activeIndex]);

  function openList() {
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function commit(index: number) {
    const opt = options[index];
    if (opt) onChange(opt.value);
    setOpen(false);
  }

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) return openList();
    }
    if (!open) return;
    if (e.key === 'ArrowDown') setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    else if (e.key === 'ArrowUp') setActiveIndex((i) => Math.max(0, i - 1));
    else if (e.key === 'Enter' || e.key === ' ') commit(activeIndex);
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKeyDown}
        className={cn(
          'flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 text-left font-sans text-[15px] text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary',
          buttonClassName
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-body/60 transition-transform duration-200', open && 'rotate-180')}
          strokeWidth={2}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface py-1.5 text-left shadow-card-hover"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => commit(i)}
                  onPointerEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-2.5 font-sans text-[15px] text-body transition-colors',
                    i === activeIndex && 'bg-background',
                    isSelected && 'font-semibold text-primary'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
