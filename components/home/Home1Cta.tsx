import Link from 'next/link';
import { Phone } from 'lucide-react';
import type { SettingsData } from '@/types/db';
import { telHref } from '@/lib/phone';
import { homeContent } from './content';
import type { CtaCopy } from './resolve-content';

export function Home1Cta({ settings, content = homeContent.cta }: { settings: SettingsData; content?: CtaCopy }) {
  const c = content;
  const phone = settings.phones[0] ?? '210 571 2451';
  return (
    <section className="bg-gold py-16 text-[#00296b]" aria-label={c.title}>
      <div className="container flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <div>
          <h2 className="font-display text-3xl font-semibold md:text-4xl">{c.title}</h2>
          <p className="mt-2 text-[17px] text-[#00296b]/80">{c.body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={telHref(phone)}
            className="inline-flex items-center gap-3 rounded-full bg-[#00296b] px-6 py-3 font-display text-2xl font-semibold text-surface transition hover:bg-primary"
          >
            <Phone className="h-5 w-5" strokeWidth={1.75} /> {phone}
          </a>
          <Link
            href={c.messageHref}
            className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em] underline underline-offset-4 hover:text-[#00296b]/70"
          >
            {c.messageCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
