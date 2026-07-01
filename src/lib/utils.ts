// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Register our custom font-size class names so twMerge doesn't confuse them
// with text-color classes (both use the `text-*` prefix).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display-hero', 'display-section', 'display-editorial'] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEuro(amount: number): string {
  return `${amount}€`;
}
