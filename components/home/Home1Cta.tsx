import Link from 'next/link';
import { Phone } from 'lucide-react';
import type { SettingsData } from '@/types/db';
import { telHref } from '@/lib/phone';
import { Button } from '@/components/ui/Button';
import { homeContent } from './content';
import type { CtaCopy } from './resolve-content';

export function Home1Cta({ settings, content = homeContent.cta }: { settings: SettingsData; content?: CtaCopy }) {
  const c = content;
  const phone = settings.phones[0] ?? '210 571 2451';

  return (
    <section
      className="bg-gradient-to-br from-[#f4f7fb] via-[#e8f1fa] to-[#d4e4f4] py-20 md:py-24"
      aria-label={c.title}
    >
      <div className="container">
        <div className="mx-auto grid max-w-6xl gap-10 rounded-2xl border border-primary/10 bg-white/75 px-6 py-10 shadow-sm backdrop-blur-sm sm:px-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12 md:py-12 lg:px-14">
          <div className="text-center md:text-left">
            <h2 className="font-display text-3xl font-semibold leading-tight text-deep-ink md:text-[2.25rem]">
              {c.title}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[17px] leading-relaxed text-deep-ink/90 md:mx-0">{c.body}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center md:justify-end">
            <Button
              asChild
              size="lg"
              variant="accent"
              className="h-12 min-w-[12rem] rounded-full px-6 text-[13px] font-semibold uppercase tracking-[0.12em]"
            >
              <Link href="/kratisi">Κλείστε Online Θέση</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="primary"
              className="h-12 min-w-[12rem] gap-2.5 rounded-full px-6 font-sans text-[15px] font-semibold normal-case tracking-normal"
            >
              <a href={telHref(phone)}>
                <Phone className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                {phone}
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 min-w-[12rem] rounded-full border-2 border-primary/40 bg-surface px-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-primary hover:border-primary hover:bg-primary hover:text-surface"
            >
              <Link href={c.messageHref}>{c.messageCta}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
