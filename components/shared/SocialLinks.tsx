import type { ComponentType, SVGProps } from 'react';
import { cn } from '@/lib/utils';

/** Τα social του γραφείου (Ρυθμίσεις → social). Ίδια εικονίδια στο footer και
 *  στο κουτί κράτησης της εκδρομής, ώστε να μη ζωγραφίζονται δύο φορές. */
export type SocialLinksInput = { facebook?: string; instagram?: string; youtube?: string } | null | undefined;

// Brand icons — το lucide-react v1 αφαίρεσε τα brand marks, οπότε είναι inline.
function Facebook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}
function Instagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}
function Youtube(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M23.5 6.5a3 3 0 0 0-2.12-2.12C19.4 3.9 12 3.9 12 3.9s-7.4 0-9.38.48A3 3 0 0 0 .5 6.5 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.5 3 3 0 0 0 2.12 2.12C4.6 20.1 12 20.1 12 20.1s7.4 0 9.38-.48a3 3 0 0 0 2.12-2.12A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.5ZM9.6 15.6V8.4l6.4 3.6-6.4 3.6Z" />
    </svg>
  );
}

type Item = { href: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> };

/** Οι σύνδεσμοι που όντως υπάρχουν, με σταθερή σειρά. */
export function socialItems(social: SocialLinksInput): Item[] {
  if (!social) return [];
  return [
    social.facebook && { href: social.facebook, label: 'Facebook', Icon: Facebook },
    social.instagram && { href: social.instagram, label: 'Instagram', Icon: Instagram },
    social.youtube && { href: social.youtube, label: 'YouTube', Icon: Youtube },
  ].filter(Boolean) as Item[];
}

/** Σειρά στρογγυλών εικονιδίων. `tone="dark"` για σκούρο φόντο (footer),
 *  `tone="light"` για λευκές κάρτες. Δεν αποδίδει τίποτα χωρίς συνδέσμους. */
export function SocialLinks({
  social,
  tone = 'light',
  className,
}: {
  social: SocialLinksInput;
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const items = socialItems(social);
  if (items.length === 0) return null;
  return (
    <div data-testid="social-links" className={cn('flex gap-3', className)}>
      {items.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          aria-label={label}
          target="_blank"
          rel="noopener"
          className={cn(
            'grid place-items-center rounded-full transition-colors motion-reduce:transition-none',
            tone === 'dark'
              ? 'h-11 w-11 bg-surface/10 text-white hover:bg-cta'
              : 'h-10 w-10 bg-primary/10 text-primary hover:bg-cta hover:text-surface'
          )}
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}
